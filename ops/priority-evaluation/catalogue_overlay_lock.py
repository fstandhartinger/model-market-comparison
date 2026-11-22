"""Host-side resolution of a runtime-catalogue overlay lock + its admission entry (job fastlane-runtime-catalogue-20261122).

Flow (no agent judgement, no customer code):

1. The runner generator (sandboxed) may write `trusted-runner/CATALOGUE-REQUEST.json` next to its POD-RECIPE.json:
   `{"schema": 1, "image_id": "<catalogue id>", "requirements": ["name==version", ...]}` -- exact pins only, no extras,
   no URLs, no markers. It is customer-derived DATA and is validated as such.
2. Before the bundle is frozen, the host (`write_receipt`, called from autopickup next to supplement_admission) removes any
   generator-written CATALOGUE-OVERLAY.json, resolves every pin through the public PyPI JSON API (`pypi.org/pypi/<name>/
   <version>/json`; read-only metadata, nothing is downloaded or installed here), picks the one wheel that fits the image's
   python/glibc, and checks that every non-extra dependency of every locked wheel (`requires_dist`, markers evaluated for
   the image) is either locked or preinstalled in the image. Sdist-only releases, yanked files, URLs outside
   files.pythonhosted.org, denied names and oversized wheels are refused by catalogue_runtime_supplement.validate_lock.
3. It writes `CATALOGUE-OVERLAY.json` (canonical JSON) and appends one audited entry to the host admission registry that
   binds order id, image, lock SHA-256, the installed supplement module SHA-256 and the catalogue SHA-256.

If anything fails, no lock is written; the request alone still selects the catalogue path, so the order stops with a hold
(and the pickup hands it to the native owner) instead of running the bare base image. Stdlib only.
"""
from __future__ import annotations

import fcntl
import hashlib
import json
import os
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

import catalogue_runtime_supplement as cat

PYPI = 'https://pypi.org/pypi/{name}/{version}/json'
PYPI_ALL = 'https://pypi.org/pypi/{name}/json'
PYPI_LIMIT = 32 * 1024 * 1024
REQUIREMENT_RE = re.compile(r'([A-Za-z0-9][A-Za-z0-9._-]{0,99})==([0-9][0-9A-Za-z.+!]{0,63})')
REQUEST_KEYS = {'schema', 'image_id', 'requirements'}
MAX_REQUIREMENTS = 120
AUDIT = 'catalogue-admissions.log'

Fetch = Callable[[str], bytes]


def _utc() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def default_fetch(url: str) -> bytes:
    """GET a PyPI JSON document over https (no redirects to other hosts, bounded size)."""
    if not url.startswith('https://pypi.org/pypi/'):
        raise cat.CatalogueError('metadata url')
    request = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'fastlane-catalogue/1'})
    with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310 - fixed https host checked above
        if response.geturl().split('/')[2] != 'pypi.org':
            raise cat.CatalogueError('metadata redirect')
        data = response.read(PYPI_LIMIT + 1)
    if len(data) > PYPI_LIMIT:
        raise cat.CatalogueError('metadata too large')
    return data


# ------------------------------------------------------------------------------------------------------------- request

def parse_request(value: object, catalogue: dict[str, Any]) -> tuple[str, list[tuple[str, str]], list[str]]:
    """(image_id, [(normalized name, version)], original lines) from a generator request; CatalogueError otherwise."""
    if not isinstance(value, dict) or set(value) != REQUEST_KEYS or value.get('schema') != cat.SCHEMA:
        raise cat.CatalogueError('request schema')
    cat.image_entry(catalogue, value['image_id'])
    lines = value['requirements']
    if not isinstance(lines, list) or len(lines) > MAX_REQUIREMENTS:
        raise cat.CatalogueError('request requirement list')
    pins: list[tuple[str, str]] = []
    for line in lines:
        match = REQUIREMENT_RE.fullmatch(line) if isinstance(line, str) else None
        if not match:
            raise cat.CatalogueError('request requirement is not an exact name==version pin')
        name = cat.normalize(match[1])
        if any(name == other for other, _ in pins):
            raise cat.CatalogueError(f'{name} requested twice')
        if cat.denied(name, catalogue):
            raise cat.CatalogueError(f'{name} may not be replaced by an overlay')
        pins.append((name, match[2]))
    return value['image_id'], pins, list(lines)


# Version, marker and dependency logic is shared with the run-time gate (catalogue_runtime_supplement).
marker_applies = cat.marker_applies
marker_env = cat.marker_env
dependency_specs = cat.dependency_specs
parse_version = cat.parse_version
satisfies = cat.satisfies


# ------------------------------------------------------------------------------------------------------------ resolving

def _score(filename: str, minor: int) -> tuple[int, int]:
    """Deterministic preference: exact cp3N binary, then abi3, then pure python; newer manylinux first."""
    match = cat.WHEEL_RE.fullmatch(filename)
    glibc = max([int(m[2]) for m in re.finditer(r'manylinux_(\d+)_(\d+)', match['plat'])] +
                [cat.LEGACY_MANYLINUX.get(p, (0, 0))[1] for p in match['plat'].split('.')], default=0)
    if f'cp3{minor}' in match['abi'].split('.'):
        return 3, glibc
    if 'abi3' in match['abi'].split('.'):
        return 2, glibc
    return 1, glibc


def pick_wheel(name: str, version: str, document: dict[str, Any], image: dict[str, Any],
               catalogue: dict[str, Any]) -> dict[str, Any]:
    info = document.get('info') if isinstance(document, dict) else None
    if not isinstance(info, dict) or cat.normalize(str(info.get('name', ''))) != name or info.get('version') != version:
        raise cat.CatalogueError(f'{name}=={version} not found on PyPI')
    files = document.get('urls')
    if not isinstance(files, list):
        raise cat.CatalogueError(f'{name}=={version} has no file list')
    minor = int(image['python'].split('.')[1])
    candidates = []
    for entry in files:
        if not isinstance(entry, dict) or entry.get('packagetype') != 'bdist_wheel' or entry.get('yanked'):
            continue
        filename = entry.get('filename')
        if not isinstance(filename, str) or not cat.wheel_compatible(filename, image['python'], image['glibc']):
            continue
        record = {'name': name, 'version': version, 'filename': filename, 'url': entry.get('url'),
                  'sha256': (entry.get('digests') or {}).get('sha256'), 'size': entry.get('size')}
        candidates.append((_score(filename, minor), filename, record))
    if not candidates:
        raise cat.CatalogueError(f'{name}=={version} has no wheel for python {image["python"]} x86_64 (sdist-only or '
                                 'platform mismatch)')
    return max(candidates, key=lambda c: (c[0], c[1]))[2]


MAX_FETCHES = 400
ROUNDS = 8
CANDIDATES = 25


def _json(fetch: Fetch, url: str, label: str) -> dict[str, Any]:
    try:
        value = json.loads(fetch(url).decode('utf-8'))
    except cat.CatalogueError:
        raise
    except Exception as exc:  # noqa: BLE001 - network/JSON problems are a refusal, never a partial lock
        raise cat.CatalogueError(f'{label}: PyPI metadata unavailable ({type(exc).__name__})') from None
    if not isinstance(value, dict):
        raise cat.CatalogueError(f'{label}: PyPI metadata shape')
    return value


class _Session:
    """One resolution: cached PyPI documents, bounded fetches."""

    def __init__(self, fetch: Fetch, image: dict[str, Any], env: dict[str, str]):
        self.fetch, self.image, self.env, self.cache = fetch, image, env, {}

    def get(self, url: str, label: str) -> dict[str, Any]:
        if url not in self.cache:
            if len(self.cache) >= MAX_FETCHES:
                raise cat.CatalogueError('dependency closure too large')
            self.cache[url] = _json(self.fetch, url, label)
        return self.cache[url]

    def version_doc(self, name: str, version: str) -> dict[str, Any]:
        return self.get(PYPI.format(name=name, version=version), f'{name}=={version}')

    def requires(self, name: str, version: str) -> list[str]:
        value = (self.version_doc(name, version).get('info') or {}).get('requires_dist') or []
        return [r for r in value if isinstance(r, str)] if isinstance(value, list) else []

    def candidates(self, name: str, specs: list[str]) -> list[str]:
        """Stable, non-yanked releases with a fitting wheel that satisfy every specifier, newest first."""
        releases = self.get(PYPI_ALL.format(name=name), name).get('releases')
        if not isinstance(releases, dict):
            raise cat.CatalogueError(f'{name}: no release list')
        ranked = []
        for version, files in releases.items():
            parsed = parse_version(version) if isinstance(version, str) else None
            if parsed is None or parsed['prerelease'] or parsed['local'] or not isinstance(files, list):
                continue
            if not any(isinstance(f, dict) and f.get('packagetype') == 'bdist_wheel' and not f.get('yanked')
                       and isinstance(f.get('filename'), str)
                       and cat.wheel_compatible(f['filename'], self.image['python'], self.image['glibc']) for f in files):
                continue
            if all(satisfies(version, spec) is not False for spec in specs if spec and spec != '<unparsed>'):
                ranked.append((parsed['key'], version))
        return [version for _, version in sorted(ranked, reverse=True)]


def _constraints(dep: str, versions: dict[str, str], requires: dict[str, list[str]], env: dict[str, str],
                 ignore: list[str]) -> list[str]:
    specs = []
    for dist, lines in requires.items():
        if dist in versions and dist != dep and dist not in ignore:
            specs += dependency_specs(lines, env).get(dep, [])
    return specs


def _fits(lines: list[str], versions: dict[str, str], env: dict[str, str], skip: str) -> bool:
    """A candidate's own requirements are met by what is installed now (names not installed yet are fine)."""
    for dep, specs in dependency_specs(lines, env).items():
        if dep != skip and dep in versions and any(
                spec and spec != '<unparsed>' and satisfies(versions[dep], spec) is False for spec in specs):
            return False
    return True


def resolve(request: object, *, catalogue: dict[str, Any] | None = None, fetch: Fetch = default_fetch) -> dict[str, Any]:
    """The validated overlay lock for a generator request; CatalogueError with an operator-facing reason otherwise.

    The goal is the owner's gate (#77152/#77174): the overlay may add no `pip check` problem to the base image's own
    package set, simulated from metadata (versions + Requires-Dist of every installed distribution, read from the pinned
    image layers). Requested pins are exact and never changed. Each round simulates `pip check` on base + overlay; every
    dependency that is missing or violated (and is neither requested nor protected by the deny list) is (re)picked: the
    newest stable fitting release that satisfies all constraints the installed set puts on it, preferring a release whose
    own requirements need no change to what is installed (so the base stays as it is). Bounded rounds; a remaining
    problem is a refusal that names it."""
    catalogue = cat.load_catalogue() if catalogue is None else catalogue
    image_id, pins, lines = parse_request(request, catalogue)
    image = cat.image_entry(catalogue, image_id)
    env = marker_env(image)
    session = _Session(fetch, image, env)
    base_versions, base_requires = cat.installed_set(image)
    ignore = image['pip_check_ignore']
    baseline = cat.simulate_pip_check(base_versions, base_requires, env, ignore)
    explicit = dict(pins)
    chosen = dict(explicit)
    for name, version in explicit.items():
        session.version_doc(name, version)
    problems: set[tuple[str, str, str]] = set()
    for _round in range(ROUNDS):
        versions = dict(base_versions, **chosen)
        requires = dict(base_requires, **{n: session.requires(n, v) for n, v in chosen.items()})
        problems = cat.simulate_pip_check(versions, requires, env, ignore) - baseline
        if not problems:
            break
        fixed = sorted(p for p in problems if p[1] in explicit or cat.denied(p[1], catalogue))
        if fixed:
            raise cat.CatalogueError('the request conflicts with the image or a protected package: '
                                     + '; '.join(f'{d} requires {dep} {spec}' for d, dep, spec in fixed[:10]))
        for dep in sorted({p[1] for p in problems}):
            specs = _constraints(dep, versions, requires, env, ignore)
            options = session.candidates(dep, specs)
            if not options:
                raise cat.CatalogueError(f'{dep}: no stable wheel release satisfies '
                                         + (' and '.join(s for s in specs if s) or 'any'))
            pick = next((v for v in options[:CANDIDATES] if _fits(session.requires(dep, v), versions, env, dep)), options[0])
            chosen[dep] = pick
            if len(chosen) > catalogue['overlay']['max_wheels']:
                raise cat.CatalogueError('dependency closure exceeds the wheel limit')
    else:
        raise cat.CatalogueError('pip-check problems remain: ' + '; '.join(f'{d} requires {dep} {spec}'
                                                                          for d, dep, spec in sorted(problems)[:10]))
    wheels = []
    for name in sorted(chosen):
        record = pick_wheel(name, chosen[name], session.version_doc(name, chosen[name]), image, catalogue)
        record['requires'] = session.requires(name, chosen[name])
        wheels.append(record)
    lock = {'schema': cat.SCHEMA, 'image_id': image_id, 'image': image['image'], 'wheels': wheels, 'requested': lines,
            'base': {'inventory_sha256': cat.inventory_sha256(image), 'baseline_problems': len(baseline)},
            'resolved_at': _utc(), 'resolved_by': 'host pypi json api'}
    cat.validate_lock(lock, catalogue)
    return lock


# ----------------------------------------------------------------------------------------------------------- admission

def append_admission(order_id: str, lock_bytes: bytes, lock: dict[str, Any], *, by: str, basis: str,
                     registry: Path | None = None) -> dict[str, Any]:
    """Append one entry under an exclusive lock; the registry stays 0600 and is replaced atomically."""
    path = Path(registry or cat.REGISTRY)
    if not cat.ORDER_ID_RE.fullmatch(order_id) or not by or not basis or len(by) > 200 or len(basis) > 500:
        raise cat.CatalogueError('admission arguments')
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    image = cat.image_entry(cat.load_catalogue(), lock['image_id'])
    entry = {'order_id': order_id, 'image_id': lock['image_id'], 'image': lock['image'],
             'lock_sha256': hashlib.sha256(lock_bytes).hexdigest(), 'module_sha256': cat.module_sha256(),
             'catalogue_sha256': cat.CATALOGUE_SHA256, 'base_inventory_sha256': cat.inventory_sha256(image),
             'admitted_at': _utc(), 'admitted_by': by, 'basis': basis}
    guard = os.open(os.fspath(path) + '.lock', os.O_WRONLY | os.O_CREAT | getattr(os, 'O_NOFOLLOW', 0), 0o600)
    try:
        fcntl.flock(guard, fcntl.LOCK_EX)
        if path.exists() or path.is_symlink():
            value = cat.load_registry(path)
        else:
            value = {'schema': cat.SCHEMA, 'entries': []}
        value['entries'].append(entry)
        tmp = path.with_name(path.name + '.tmp')
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | getattr(os, 'O_NOFOLLOW', 0), 0o600)
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            handle.write(json.dumps(value, indent=1, sort_keys=True) + '\n')
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
        with open(path.with_name(AUDIT), 'a', encoding='utf-8') as audit:
            audit.write(json.dumps(entry, sort_keys=True) + '\n')
    finally:
        fcntl.flock(guard, fcntl.LOCK_UN)
        os.close(guard)
    return entry


def write_receipt(job_dir: Path | str, prep_trusted: Path | str, *, fetch: Fetch = default_fetch,
                  registry: Path | None = None, by: str = 'fastlane-autopickup',
                  basis: str = 'host catalogue resolution before freeze') -> dict[str, Any] | None:
    """Host step before the freeze. Removes any generator-written lock; for a request, writes the host lock + admission.

    Returns the admission entry, None when there is no request, or {'refused': reason} when the request was refused
    (no lock is written then; the request alone keeps the order on the catalogue path, which holds)."""
    job_dir, prep_trusted = Path(job_dir), Path(prep_trusted)
    lock_path, request_path = prep_trusted / cat.LOCK, prep_trusted / cat.REQUEST
    if lock_path.is_symlink() or lock_path.exists():
        if lock_path.is_dir() and not lock_path.is_symlink():
            raise cat.CatalogueError('lock path is a directory')
        lock_path.unlink()
    if not (request_path.is_symlink() or request_path.exists()):
        return None
    try:
        request = json.loads(cat.read_regular(request_path, cat.JSON_LIMIT).decode('utf-8'))
        lock = resolve(request, fetch=fetch)
        data = cat.canonical_json(lock)
        fd = os.open(lock_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), 0o644)
        with os.fdopen(fd, 'wb') as handle:
            handle.write(data)
        return append_admission(job_dir.name, data, lock, by=by, basis=basis, registry=registry)
    except (OSError, ValueError) as exc:
        if lock_path.is_file() and not lock_path.is_symlink():
            lock_path.unlink()
        return {'refused': str(exc)[:500] if isinstance(exc, cat.CatalogueError) else type(exc).__name__}


def request_without_lock(trusted: Path | str) -> bool:
    """True after the freeze when the generator asked for the catalogue but the host wrote no lock (refused)."""
    trusted = Path(trusted)
    request = trusted / cat.REQUEST
    lock = trusted / cat.LOCK
    return (request.is_symlink() or request.exists()) and not (lock.is_file() and not lock.is_symlink())


# ------------------------------------------------------------------------------------------------------ generator hint

def generator_hint() -> str:
    """Prompt text for the runner generator (host data, not customer text)."""
    try:
        catalogue = cat.load_catalogue()
    except (OSError, ValueError):
        return ''
    rows = []
    for image_id, image in sorted(catalogue['images'].items()):
        keys = ('torch', 'transformers', 'vllm', 'accelerate', 'peft', 'safetensors', 'tokenizers', 'numpy')
        pre = ', '.join(f'{k} {image["preinstalled"][k]}' for k in keys if k in image['preinstalled'])
        rows.append(f"- `{image_id}`: image `{image['image']}` (python {image['python']}, CUDA {image['cuda']}; "
                    f"kinds {', '.join(image['kinds'])}; preinstalled {pre})")
    return ("\nStandard runtime catalogue (host registry, not customer text). When no image the author pins carries the "
            "documented stack, but the stack is one of these reviewed base images plus ordinary PyPI packages, do NOT write "
            "{\"backend\":\"unsupported\"}. Instead use the catalogue image string verbatim as POD-RECIPE.json `image` "
            "(everything else in the recipe as usual) and write `trusted-runner/CATALOGUE-REQUEST.json` = "
            "{\"schema\":1,\"image_id\":\"<id>\",\"requirements\":[\"name==version\", ...]}:\n" + '\n'.join(rows) + "\n"
            "Rules: choose the image whose torch/CUDA/python matches the author's documented torch (a documented "
            "`torch>=X` is satisfied by a newer torch; a different exact torch pin, a custom CUDA build, flash-attn or "
            "other compiled extensions, an author container, or sglang do not fit -> write the blocker as before). List "
            "every package the author documents that the image does not already have at that version, with the exact "
            "version the author pins (or, for a range, the newest release satisfying it as shown in the fetched docs), "
            "AND their dependencies that the image lacks; the host refuses an incomplete list and names what is missing. "
            "Exact `name==version` lines only: no extras, URLs, markers, local files, the author's own package or "
            "torch/vllm/triton/nvidia-* packages. The host resolves them to hash-pinned wheels and freezes the lock; "
            "the author's code is still mounted read-only from /code. If a host registry note above names a reviewed "
            "supplement for this repository, follow that note instead.\n")
