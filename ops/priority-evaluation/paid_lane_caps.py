"""Paid fast-lane money caps from validated config (CR-858; the shipped values are the previous source constants).

Florian 24 Nov 2026: price caps and limits are config, not hashed constants. The caps that used to be literals in
pod_runner.py and autopickup.py live in one small JSON file:

    max_hourly_usd       was pod_runner.MAX_HOURLY_USD      5.0   USD per GPU pod hour
    per_order_cap_usd    was pod_runner.PER_ORDER_CAP_USD   50.0  USD per order (all pod attempts together)
    ttl_cap_hours        was pod_runner.TTL_CAP_HOURS       3.0   hours per pod attempt
    api_order_cap_usd    was autopickup.API_ORDER_CAP_USD   5.0   USD per order for endpoint (API) measurements
    max_pod_allocations  was a bare use of pod_capacity.MAX_ALLOCATIONS   3   pods per order (first + two retries)

Where the values come from (the first that exists is used, never both):

    1. <STATE_ROOT>/config/paid-lane-caps.json   operator override (STATE_ROOT = $FASTLANE_STATE_ROOT, default
                                                  ~/.local/state/fastlane-autopickup)
    2. paid-lane-caps.json next to this module   shipped default; install-autopickup.sh copies it to the runtime directory

CHANGING A CAP IS A CONFIG EDIT, NO CODE PR: write the override file (same schema; copy the shipped default and edit
it), save it as a regular file owned by the service user with mode 0600/0644, and check it first with
`python3 paid_lane_caps.py` (prints the effective caps and where they came from, or the reason it is invalid). The next
dispatch reads it; a running pod attempt keeps the caps it started with. Deleting the override returns to the default.

Validation is strict and FAILS CLOSED. The file must be a regular file (no symlink) owned by our uid, not
group/other-writable (the shipped default may be group-writable: it sits in a git checkout under umask 002 and is
installed 0600; it is never other-writable), at most 64 KiB, strict JSON (no NaN/Infinity, no duplicate keys), with
exactly these keys, schema_version the int 1, and every other value a finite number > 0 (bool and strings rejected; the
allocation count is an int). One pod attempt must fit in the order cap: per_order_cap_usd >= max_hourly_usd * ttl_cap_hours.
An override that exists but is invalid is NEVER replaced by the default or by any other value: the callers raise the
operational hold `paid_lane_caps_invalid` (a transient reason) before any pod or endpoint spend starts.

What is deliberately NOT here: ORIGINAL_ORDER_CAP_USD / ORIGINAL_MAX_ATTEMPTS and the original 5.0 USD/h and 3 h accounting
that order-specific authorities (v16_allocation.FreshAllocation, ScopedTopUp, the Strands and Chon supplements) are
written against stay literals in pod_runner.py: a config edit never changes those paths. The research-pod guards
(gpu-pod-guard: daily stop, pod counts, lane USD) live outside this repository.
"""
from __future__ import annotations

import contextlib
import contextvars
import dataclasses
import json
import math
import os
import stat
import sys
from pathlib import Path

import pod_capacity

HOLD_REASON = 'paid_lane_caps_invalid'
ROOT = Path(__file__).resolve().parent
DEFAULT_PATH = ROOT / 'paid-lane-caps.json'
OVERRIDE_RELATIVE = Path('config') / 'paid-lane-caps.json'
MAX_FILE_BYTES = 64 * 1024
SCHEMA_VERSION = 1
KEYS = frozenset({'schema_version', 'max_hourly_usd', 'per_order_cap_usd', 'ttl_cap_hours', 'api_order_cap_usd',
                  'max_pod_allocations'})

# Sane absolute bounds. These are TYPO GUARDS ONLY (a stray extra zero, a USD/EUR mix-up), not policy: the real limits are the
# values in the file, and nothing here may be read as a decision about how high a cap may go.
TYPO_GUARD_MAX = {'max_hourly_usd': 50.0, 'per_order_cap_usd': 1000.0, 'ttl_cap_hours': 24.0, 'api_order_cap_usd': 100.0}
# max_pod_allocations is different: it is a structural ceiling, not a typo guard. The ledger counters (pod_capacity.allocation_count),
# the fresh-generation / top-up authorities and the retry loop are all written against pod_capacity.MAX_ALLOCATIONS, so the
# config can lower the number of pods per order but only a code change can raise it.
ALLOCATIONS_CEILING = pod_capacity.MAX_ALLOCATIONS


class CapsInvalid(ValueError):
    """The paid-lane caps config is missing, unreadable or invalid (the message names the file and the first problem)."""


@dataclasses.dataclass(frozen=True)
class Caps:
    max_hourly_usd: float
    per_order_cap_usd: float
    ttl_cap_hours: float
    api_order_cap_usd: float
    max_pod_allocations: int
    source: str = 'default'


def _reject_constant(name):
    raise ValueError(f'non-finite number {name}')


def _no_duplicates(pairs):
    seen = {}
    for key, value in pairs:
        if key in seen:
            raise ValueError(f'duplicate key {key!r}')
        seen[key] = value
    return seen


def _read_checked(path: Path, *, allow_group_write: bool) -> bytes:
    """Read the file through one descriptor opened without following symlinks; every check runs on that descriptor."""
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK)
    except OSError as exc:
        raise CapsInvalid(f'{path}: cannot open ({exc.strerror or type(exc).__name__}); a symlink is refused') from None
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode):
            raise CapsInvalid(f'{path}: not a regular file')
        if info.st_uid != os.getuid():
            raise CapsInvalid(f'{path}: not owned by uid {os.getuid()}')
        bad_bits = stat.S_IWOTH if allow_group_write else stat.S_IWGRP | stat.S_IWOTH
        if info.st_mode & bad_bits:
            raise CapsInvalid(f'{path}: writable by {"others" if allow_group_write else "group or others"} (mode {stat.S_IMODE(info.st_mode):04o})')
        if info.st_size > MAX_FILE_BYTES:
            raise CapsInvalid(f'{path}: larger than {MAX_FILE_BYTES} bytes')
        chunks, total = [], 0
        while True:  # a read may return less than the file holds; stop at EOF or one byte past the limit
            chunk = os.read(fd, MAX_FILE_BYTES + 1 - total)
            if not chunk:
                return b''.join(chunks)
            chunks.append(chunk)
            total += len(chunk)
            if total > MAX_FILE_BYTES:
                raise CapsInvalid(f'{path}: larger than {MAX_FILE_BYTES} bytes')
    except OSError as exc:
        raise CapsInvalid(f'{path}: cannot read ({exc.strerror or type(exc).__name__})') from None
    finally:
        os.close(fd)


def _number(value, name, path):
    if type(value) not in (int, float) or not math.isfinite(value) or not value > 0:
        raise CapsInvalid(f'{path}: {name} must be a finite number > 0 (got {value!r})')
    return float(value)


def parse(data: bytes, path: Path, source: str) -> Caps:
    try:
        raw = json.loads(data.decode('utf-8'), parse_constant=_reject_constant, object_pairs_hook=_no_duplicates)
    except (UnicodeDecodeError, ValueError, RecursionError) as exc:
        raise CapsInvalid(f'{path}: not strict JSON ({exc})') from None
    if not isinstance(raw, dict) or set(raw) != KEYS:
        got = sorted(raw) if isinstance(raw, dict) else type(raw).__name__
        raise CapsInvalid(f'{path}: keys must be exactly {sorted(KEYS)} (got {got})')
    if type(raw['schema_version']) is not int or raw['schema_version'] != SCHEMA_VERSION:
        raise CapsInvalid(f'{path}: schema_version must be the int {SCHEMA_VERSION}')
    values = {name: _number(raw[name], name, path) for name in TYPO_GUARD_MAX}
    for name, limit in TYPO_GUARD_MAX.items():
        if values[name] > limit:
            raise CapsInvalid(f'{path}: {name} {values[name]} is above the typo guard {limit}')
    allocations = raw['max_pod_allocations']
    if type(allocations) is not int or not 1 <= allocations <= ALLOCATIONS_CEILING:
        raise CapsInvalid(f'{path}: max_pod_allocations must be an int from 1 to {ALLOCATIONS_CEILING} (the code ceiling)')
    if values['per_order_cap_usd'] + 1e-9 < values['max_hourly_usd'] * values['ttl_cap_hours']:
        raise CapsInvalid(f'{path}: per_order_cap_usd {values["per_order_cap_usd"]} cannot hold one pod attempt '
                          f'(max_hourly_usd * ttl_cap_hours = {values["max_hourly_usd"] * values["ttl_cap_hours"]})')
    return Caps(max_pod_allocations=allocations, source=source, **values)


def load_default() -> Caps:
    """Only the shipped default (the installer verifies this one; it ignores any override)."""
    return parse(_read_checked(DEFAULT_PATH, allow_group_write=True), DEFAULT_PATH, 'default')


def load(state_root) -> Caps:
    """The validated caps now in force. The override wins when anything exists at its path (a dangling symlink counts), and
    is then the only candidate; raises CapsInvalid, never returns a guess."""
    override = Path(state_root) / OVERRIDE_RELATIVE
    try:
        os.lstat(override)
    except (FileNotFoundError, NotADirectoryError):
        return load_default()
    except OSError as exc:
        raise CapsInvalid(f'{override}: cannot inspect ({exc.strerror or type(exc).__name__})') from None
    return parse(_read_checked(override, allow_group_write=False), override, 'override')


_PINNED: contextvars.ContextVar = contextvars.ContextVar('paid_lane_caps_pinned', default=None)


@contextlib.contextmanager
def pinned(caps: Caps):
    """Make `caps` the answer of current() inside the block: one dispatch uses one set of caps from reserve to teardown."""
    token = _PINNED.set(caps)
    try:
        yield caps
    finally:
        _PINNED.reset(token)


def current(state_root) -> Caps:
    active = _PINNED.get()
    return active if active is not None else load(state_root)


def main(argv):
    root = argv[1] if len(argv) > 1 else os.environ.get('FASTLANE_STATE_ROOT') or Path.home() / '.local/state/fastlane-autopickup'
    try:
        caps = load(root)
    except CapsInvalid as exc:
        print(f'INVALID ({HOLD_REASON}): {exc}', file=sys.stderr)
        return 1
    print(json.dumps(dataclasses.asdict(caps), indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
