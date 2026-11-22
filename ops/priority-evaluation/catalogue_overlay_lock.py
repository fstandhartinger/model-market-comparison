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


# -------------------------------------------------------------------------------------------------------------- markers

_TOKEN = re.compile(r"\s*(?:(?P<str>'[^']*'|\"[^\"]*\")|(?P<op>===|==|!=|<=|>=|~=|<|>|not\s+in\b|in\b)|"
                    r"(?P<bool>and\b|or\b)|(?P<paren>[()])|(?P<var>[A-Za-z_][A-Za-z0-9_.]*))")


def _vtuple(text: str) -> tuple[int, ...] | None:
    parts = re.findall(r'\d+', text.split('+')[0])
    return tuple(int(p) for p in parts[:4]) if parts and re.fullmatch(r'[0-9][0-9.]*(\*)?', text) else None


def marker_applies(marker: str, env: dict[str, str]) -> bool:
    """Evaluate a PEP 508 marker for the image. Anything this small evaluator does not understand counts as True
    (the dependency is then required), except `extra` comparisons, which are False (extras are never installed)."""
    tokens: list[tuple[str, str]] = []
    position = 0
    while position < len(marker):
        match = _TOKEN.match(marker, position)
        if not match or match.end() == position:
            return True
        kind = match.lastgroup
        tokens.append((kind, re.sub(r'\s+', ' ', match[kind])))
        position = match.end()
        if not marker[position:].strip():
            break
    index = 0

    def value(token: tuple[str, str]) -> tuple[str, str | None]:
        kind, text = token
        if kind == 'str':
            return 'str', text[1:-1]
        if kind == 'var':
            return text, env.get(text)
        raise ValueError

    def compare() -> bool:
        nonlocal index
        if index < len(tokens) and tokens[index] == ('paren', '('):
            index += 1
            result = disjunction()
            if index >= len(tokens) or tokens[index] != ('paren', ')'):
                raise ValueError
            index += 1
            return result
        left, op, right = tokens[index], tokens[index + 1], tokens[index + 2]
        index += 3
        if op[0] != 'op':
            raise ValueError
        lname, lval = value(left)
        rname, rval = value(right)
        if 'extra' in (lname, rname):
            return False
        if lval is None or rval is None:
            raise ValueError
        operator = op[1]
        if operator in ('in', 'not in'):
            return (lval in rval) == (operator == 'in')
        if lname in ('python_version', 'python_full_version', 'platform_release') or \
                rname in ('python_version', 'python_full_version', 'platform_release'):
            lv, rv = _vtuple(lval.rstrip('*')), _vtuple(rval.rstrip('*'))
            if lv is None or rv is None:
                raise ValueError
            width = max(len(lv), len(rv))
            lv, rv = lv + (0,) * (width - len(lv)), rv + (0,) * (width - len(rv))
            return {'==': lv == rv, '===': lv == rv, '!=': lv != rv, '<': lv < rv, '<=': lv <= rv,
                    '>': lv > rv, '>=': lv >= rv, '~=': lv >= rv}[operator]
        if operator in ('==', '==='):
            return lval == rval
        if operator == '!=':
            return lval != rval
        raise ValueError

    def conjunction() -> bool:
        nonlocal index
        result = compare()
        while index < len(tokens) and tokens[index] == ('bool', 'and'):
            index += 1
            result = compare() and result
        return result

    def disjunction() -> bool:
        nonlocal index
        result = conjunction()
        while index < len(tokens) and tokens[index] == ('bool', 'or'):
            index += 1
            result = conjunction() or result
        return result

    try:
        result = disjunction()
        return result if index == len(tokens) else True
    except (ValueError, IndexError, KeyError):
        return True


def marker_env(image: dict[str, Any]) -> dict[str, str]:
    return {'python_version': image['python'], 'python_full_version': image['python'] + '.0',
            'sys_platform': 'linux', 'platform_system': 'Linux', 'platform_machine': 'x86_64', 'os_name': 'posix',
            'implementation_name': 'cpython', 'platform_python_implementation': 'CPython'}


def dependency_specs(requires_dist: object, env: dict[str, str]) -> dict[str, list[str]]:
    """{normalized dependency name: [specifier strings]} for the dependencies that apply to the image (no extras)."""
    specs: dict[str, list[str]] = {}
    for line in requires_dist or []:
        if not isinstance(line, str):
            continue
        requirement, _, marker = line.partition(';')
        match = re.match(r'\s*([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[[^\]]*\])?\s*\(?([^()]*)\)?\s*$', requirement)
        if not match:
            match = re.match(r'\s*([A-Za-z0-9][A-Za-z0-9._-]*)', requirement)
            if not match:
                continue
            spec = '<unparsed>'
        else:
            spec = match[2].strip() if match.lastindex and match.lastindex >= 2 and match[2] else ''
        if not marker.strip() or marker_applies(marker.strip(), env):
            specs.setdefault(cat.normalize(match[1]), []).append(spec)
    return specs


# ------------------------------------------------------------------------------------------------------------- versions

_VERSION = re.compile(r'v?(\d+(?:\.\d+)*)(?:[-_.]?(a|b|rc|alpha|beta|c|pre|preview)[-_.]?(\d*))?'
                      r'(?:(?:[-_.]?(?:post|rev|r)[-_.]?(\d*))|-(\d+))?(?:[-_.]?dev[-_.]?(\d*))?(?:\+([a-z0-9.]+))?')
_PRE = {'a': 0, 'alpha': 0, 'b': 1, 'beta': 1, 'rc': 2, 'c': 2, 'pre': 2, 'preview': 2}


def parse_version(text: str):
    """PEP 440 sort key (release padded, pre, post, dev) + flags; None for anything unparseable."""
    match = _VERSION.fullmatch(text.strip().lower())
    if not match:
        return None
    release = tuple(int(x) for x in match[1].split('.'))
    pre = (_PRE[match[2]], int(match[3] or 0)) if match[2] else None
    post_text = match[4] if match[4] is not None else match[5]
    post = int(post_text or 0) if (match[4] is not None or match[5] is not None) else None
    dev = int(match[6] or 0) if match[6] is not None else None
    pre_key = pre if pre else ((-1, 0) if dev is not None and post is None else (9, 0))
    key = (release + (0,) * (8 - len(release)), pre_key, -1 if post is None else post, 10 ** 9 if dev is None else dev)
    return {'key': key, 'release': release, 'prerelease': pre is not None or dev is not None, 'local': match[7]}


def satisfies(version: str, spec: str) -> bool | None:
    """True/False for a comma-separated PEP 440 specifier; None when the specifier cannot be evaluated."""
    parsed = parse_version(version)
    if parsed is None:
        return None
    for clause in [c.strip() for c in spec.split(',') if c.strip()]:
        match = re.fullmatch(r'(===|==|!=|~=|<=|>=|<|>)\s*([A-Za-z0-9.*+!_-]+)', clause)
        if not match:
            return None
        op, target = match[1], match[2]
        if op == '===':
            if version != target:
                return False
            continue
        if op in ('==', '!=') and target.endswith('.*'):
            prefix = parse_version(target[:-2])
            if prefix is None:
                return None
            width = len(prefix['release'])
            hit = parsed['release'][:width] + (0,) * max(0, width - len(parsed['release'])) == prefix['release']
            if hit != (op == '=='):
                return False
            continue
        other = parse_version(target)
        if other is None:
            return None
        mine = parsed['key'] if other['local'] or not parsed['local'] else parse_version(version.split('+')[0])['key']
        if op == '~=':
            if len(other['release']) < 2:
                return None
            width = len(other['release']) - 1
            if not (mine >= other['key'] and parsed['release'][:width] == other['release'][:width]):
                return False
            continue
        result = {'==': mine == other['key'], '!=': mine != other['key'], '<=': mine <= other['key'],
                  '>=': mine >= other['key'], '<': mine < other['key'], '>': mine > other['key']}[op]
        if not result:
            return False
    return True


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
ROUNDS = 6


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


def _newest(name: str, specs: list[str], document: dict[str, Any], image: dict[str, Any]) -> str:
    """Newest stable, non-yanked release with a fitting wheel that satisfies every specifier."""
    releases = document.get('releases')
    if not isinstance(releases, dict):
        raise cat.CatalogueError(f'{name}: no release list')
    ranked = []
    for version, files in releases.items():
        parsed = parse_version(version) if isinstance(version, str) else None
        if parsed is None or parsed['prerelease'] or parsed['local'] or not isinstance(files, list):
            continue
        if not any(isinstance(f, dict) and f.get('packagetype') == 'bdist_wheel' and not f.get('yanked')
                   and isinstance(f.get('filename'), str)
                   and cat.wheel_compatible(f['filename'], image['python'], image['glibc']) for f in files):
            continue
        if all(satisfies(version, spec) is True for spec in specs):
            ranked.append((parsed['key'], version))
    if not ranked:
        raise cat.CatalogueError(f'{name}: no stable wheel release satisfies {" and ".join(s or "any" for s in specs)}')
    return max(ranked)[1]


def _closure(chosen: dict[str, str], preinstalled: dict[str, str], image: dict[str, Any],
             catalogue: dict[str, Any], env: dict[str, str], fetch: Fetch, cache: dict[str, dict[str, Any]]):
    constraints: dict[str, list[tuple[str, str]]] = {}
    documents: dict[str, dict[str, Any]] = {}
    queue = sorted(chosen)
    while queue:
        name = queue.pop(0)
        url = PYPI.format(name=name, version=chosen[name])
        if url not in cache:
            if len(cache) > MAX_FETCHES:
                raise cat.CatalogueError('dependency closure too large')
            cache[url] = _json(fetch, url, f'{name}=={chosen[name]}')
        documents[name] = cache[url]
        for dep, specs in sorted(dependency_specs((cache[url].get('info') or {}).get('requires_dist'), env).items()):
            for spec in specs:
                constraints.setdefault(dep, []).append((name, spec))
            if dep in chosen or dep in preinstalled:
                continue
            if cat.denied(dep, catalogue):
                raise cat.CatalogueError(f'{dep} (needed by {name}) is not in the image and may not come from an overlay')
            dep_specs = [s for _, s in constraints[dep]]
            if '<unparsed>' in dep_specs:
                raise cat.CatalogueError(f'{dep} (needed by {name}): unparsed requirement, pin it explicitly')
            chosen[dep] = _newest(dep, dep_specs, _all(fetch, dep, cache), image)
            queue.append(dep)
            if len(chosen) > catalogue['overlay']['max_wheels']:
                raise cat.CatalogueError('dependency closure exceeds the wheel limit')
    return constraints, documents


def _all(fetch: Fetch, name: str, cache: dict[str, dict[str, Any]]) -> dict[str, Any]:
    url = PYPI_ALL.format(name=name)
    if url not in cache:
        if len(cache) > MAX_FETCHES:
            raise cat.CatalogueError('dependency closure too large')
        cache[url] = _json(fetch, url, name)
    return cache[url]


def resolve(request: object, *, catalogue: dict[str, Any] | None = None, fetch: Fetch = default_fetch) -> dict[str, Any]:
    """The validated overlay lock for a generator request; CatalogueError with an operator-facing reason otherwise.

    Requested pins are taken exactly and never changed. Every applicable dependency that is neither requested nor
    preinstalled is completed with the newest stable release (fitting wheel) satisfying all known constraints. A
    preinstalled or completed distribution whose version violates a constraint is re-picked (a preinstalled one is then
    upgraded by the overlay, unless the deny list protects it) and the closure is recomputed, at most ROUNDS times.
    No backtracking beyond that: a remaining conflict is a refusal that names it."""
    catalogue = cat.load_catalogue() if catalogue is None else catalogue
    image_id, pins, lines = parse_request(request, catalogue)
    image = cat.image_entry(catalogue, image_id)
    env = marker_env(image)
    preinstalled = {cat.normalize(n): str(v).split('|')[-1] for n, v in image['preinstalled'].items()}
    explicit = dict(pins)
    repick: set[str] = set()
    cache: dict[str, dict[str, Any]] = {}
    chosen: dict[str, str] = {}
    last_constraints: dict[str, list[tuple[str, str]]] = {}
    problems: list[str] = []
    for _round in range(ROUNDS):
        previous = chosen
        chosen = dict(explicit)
        if previous:
            # Carry forward completions; re-pick the conflicting ones against every constraint seen last round.
            for dep in repick:
                specs = [s for _, s in last_constraints.get(dep, []) if s and s != '<unparsed>']
                chosen[dep] = _newest(dep, specs, _all(fetch, dep, cache), image)
            for dep, version in previous.items():
                chosen.setdefault(dep, version)
        constraints, documents = _closure(chosen, preinstalled, image, catalogue, env, fetch, cache)
        last_constraints = constraints
        problems, repick, fixed = [], set(), []
        for dep, items in sorted(constraints.items()):
            version = chosen.get(dep, preinstalled.get(dep))
            for by, spec in items:
                if version is None or not spec or spec == '<unparsed>' or satisfies(version, spec) is not False:
                    continue
                where = 'the request' if dep in explicit else ('the completion' if dep in chosen else 'the image')
                problems.append(f'{by} needs {dep}{spec}, {where} has {version}')
                if dep in explicit or cat.denied(dep, catalogue):
                    fixed.append(problems[-1])
                else:
                    repick.add(dep)
        if not problems:
            break
        if fixed:
            raise cat.CatalogueError('version conflicts with exact or protected versions: ' + '; '.join(fixed[:12]))
    else:
        raise cat.CatalogueError('version conflicts remain after re-picking: ' + '; '.join(problems[:12]))
    wheels = [pick_wheel(name, chosen[name], documents[name], image, catalogue) for name in sorted(chosen)]
    lock = {'schema': cat.SCHEMA, 'image_id': image_id, 'image': image['image'], 'wheels': wheels, 'requested': lines,
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
    entry = {'order_id': order_id, 'image_id': lock['image_id'], 'image': lock['image'],
             'lock_sha256': hashlib.sha256(lock_bytes).hexdigest(), 'module_sha256': cat.module_sha256(),
             'catalogue_sha256': cat.CATALOGUE_SHA256, 'admitted_at': _utc(), 'admitted_by': by, 'basis': basis}
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
