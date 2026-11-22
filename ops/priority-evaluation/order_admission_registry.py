"""Host-side exact-order admission registry for ALREADY-REVIEWED runtime supplements (job fastlane-sla-rootcause-20261122).

Why: a repeat paid order for a reviewed supplement used to need a code PR whose only change was one more order UUID in the
supplement's `ORDERS` set. That PR waited in the merge queue for hours (order 2be2698b: PR #659, 30 h, refunded). The
supplement code, its digest-pinned base image and its public build context were already reviewed and unchanged.

This module lets the host admit such an order with a DATA write instead (`fastlane-admit`, audited), and every supplement's
`active()` asks `admitted(...)` next to its code-listed orders. Exception: chon and minimodels_hard_candy carry order-specific
deputy exceptions in pod_runner (TTL cap / rate / long run wait) that stay exact-order on `active()`; their registry check lives
in a separate `supplement_active()` that only the pod_runner BUILD site uses. The entry binds the order to what was reviewed:

* the supplement module file (its SHA-256 as installed, so any code change invalidates every entry),
* the digest-pinned base image and the SHA-256 of the pinned public build context (the module's own constants).

Nothing else is loosened: per-order source review of customer code, the freeze, the custody word, the sealed GO rules, the
recipe check in `active()` and the pod caps all run as before. The registry lives in host state outside the bubblewrap
sandbox, which masks /home. Stdlib only; nothing here imports a model stack or runs customer code. This module only READS;
the writer is the host CLI `fastlane-admit`.

Registry file (JSON, mode 0600, owned by the host user)::

    {"schema": 1, "entries": [{"order_id": "<uuid>", "family": "<native_owner family>", "module": "<file name>",
      "module_sha256": "<64 hex>", "base_image": "<image@sha256:...>", "context_sha256": "<64 hex>",
      "admitted_at": "<iso Z>", "admitted_by": "<job>", "basis": "<board id / DECISIONS key>"}]}

`admitted()` fails closed: any problem (missing, symlink, not a regular file, foreign owner, group/world-writable,
oversized, bad JSON, wrong schema, malformed entry, hash mismatch) is False and never raises into the caller.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import stat
from pathlib import Path
from typing import Any

SCHEMA = 1
REGISTRY_LIMIT = 1024 * 1024
MODULE_LIMIT = 4 * 1024 * 1024
ORDER_ID_RE = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
HEX64_RE = re.compile(r'[0-9a-f]{64}')
ENTRY_KEYS = ('order_id', 'family', 'module', 'module_sha256', 'base_image', 'context_sha256',
              'admitted_at', 'admitted_by', 'basis')
_OPEN_FLAGS = os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_CLOEXEC', 0) | getattr(os, 'O_NONBLOCK', 0)


def _default_registry() -> Path:
    try:
        home = Path.home()
    except (RuntimeError, KeyError):
        home = Path('/nonexistent')
    return home / '.local' / 'state' / 'fastlane-autopickup' / 'order-admissions.json'


REGISTRY = Path(os.environ.get('FASTLANE_ORDER_ADMISSIONS') or _default_registry())

# SHA-256 of each supplement module file, taken on the FIRST admitted() call for that path in this process and kept for
# the life of the process (first call wins). pod_runner asks active() more than once per attempt (build site, run wait);
# a reinstall in between must not flip the answer, and a long-running process keeps judging the module it started with.
_MODULE_DIGESTS: dict[str, str] = {}


def is_order_id(value: object) -> bool:
    """Canonical lower-case UUID text only (no braces, no urn prefix, no upper case, no padding)."""
    return isinstance(value, str) and ORDER_ID_RE.fullmatch(value) is not None


def read_regular(path: Path | str, limit: int, *, host_owned: bool) -> bytes:
    """Bytes of a regular file opened without following a final symlink; ValueError/OSError on anything else.

    The checks run on the open descriptor (fstat), so a swap after the open cannot change what was verified."""
    fd = os.open(os.fspath(path), _OPEN_FLAGS)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode):
            raise ValueError('not a regular file')
        if info.st_size > limit:
            raise ValueError('file too large')
        if host_owned and (info.st_uid != os.geteuid() or info.st_mode & 0o022):
            raise ValueError('file not exclusively writable by the host user')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            data = stream.read(limit + 1)
    finally:
        os.close(fd)
    if len(data) > limit:
        raise ValueError('file too large')
    return data


def file_sha256(path: Path | str) -> str:
    """SHA-256 of a regular (non-symlink) module file as it is right now."""
    return hashlib.sha256(read_regular(path, MODULE_LIMIT, host_owned=False)).hexdigest()


def module_digest(module_file: Path | str) -> str:
    """`file_sha256` cached per path for the life of the process (first successful call wins; failures are not cached)."""
    key = os.fspath(module_file)
    digest = _MODULE_DIGESTS.get(key)
    if digest is None:
        digest = _MODULE_DIGESTS.setdefault(key, file_sha256(key))
    return digest


def valid_entry(entry: object) -> bool:
    """Structure check shared with the writer: every required key is present with a plausible string value."""
    if not isinstance(entry, dict) or any(not isinstance(entry.get(key), str) or not entry[key] for key in ENTRY_KEYS):
        return False
    return (is_order_id(entry['order_id']) and HEX64_RE.fullmatch(entry['module_sha256']) is not None
            and HEX64_RE.fullmatch(entry['context_sha256']) is not None and '/' not in entry['module']
            and entry['module'].endswith('.py') and '@sha256:' in entry['base_image'])


def load(path: Path | str | None = None) -> dict[str, Any]:
    """The parsed registry; ValueError/OSError when it is missing or in any way unsafe (callers decide what that means)."""
    data = read_regular(REGISTRY if path is None else path, REGISTRY_LIMIT, host_owned=True)
    value = json.loads(data.decode('utf-8'))
    if not isinstance(value, dict) or type(value.get('schema')) is not int or value['schema'] != SCHEMA \
            or not isinstance(value.get('entries'), list) or not all(valid_entry(entry) for entry in value['entries']):
        raise ValueError('registry schema')
    return value


def admitted(order_id: str, module_file: str, base_image: str, context_sha256: str) -> bool:
    """True only when the registry holds an entry for exactly this order, this module as first read in this process, this base and context.

    Called from a supplement's `active()` as `admitted(Path(job).name, __file__, BASE_IMAGE, CONTEXT_SHA)`. Fails closed.
    The module digest is computed once per process and path (`module_digest`), so all calls in one attempt agree."""
    try:
        if not (is_order_id(order_id) and isinstance(module_file, (str, os.PathLike))
                and isinstance(base_image, str) and base_image and isinstance(context_sha256, str)
                and HEX64_RE.fullmatch(context_sha256)):
            return False
        module_name = os.path.basename(os.fspath(module_file))
        candidates = [entry for entry in load()['entries']
                      if entry['order_id'] == order_id and entry['module'] == module_name
                      and entry['base_image'] == base_image and entry['context_sha256'] == context_sha256]
        if not candidates:
            return False
        digest = module_digest(module_file)
        return any(entry['module_sha256'] == digest for entry in candidates)
    except Exception:  # noqa: BLE001 - fail closed; a registry problem must never break or widen a run
        return False
