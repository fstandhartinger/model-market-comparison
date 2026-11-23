"""Generic runtime supplement: a reviewed catalogue base image + a per-order hash-locked wheel overlay, admitted as DATA.

Why (job fastlane-runtime-catalogue-20261122, DECISIONS fastlane-zero-wait-1122 proposal 4): the 16 order-scoped
`*_runtime_supplement.py` modules differ only in their digest-pinned base image (two bases carry 10 of them), their list of
SHA-256-pinned public wheels and the order ids allowed to use them. Every new model family therefore cost a new module, its
own PR, review and install. This module is that pattern once, with the per-order parts moved into reviewed data:

* `runtime_catalogue.json` (in this directory, pinned below by `CATALOGUE_SHA256`): the 2-3 base images, each pinned by
  digest, with its python version, the recipe kinds it serves, its preinstalled distributions, and the overlay limits/deny list.
* `trusted-runner/CATALOGUE-OVERLAY.json` per order: the catalogue image id plus an exact wheel lock (name, version, file name,
  files.pythonhosted.org URL, sha256, size). The HOST writes it (catalogue_overlay_lock.py / `fastlane-catalogue`) before the
  bundle is frozen, so UPSTREAM-MANIFEST.json and the independent source review pin it as data.
* the host admission registry (~/.local/state/fastlane-autopickup/catalogue-admissions.json, 0600, outside the bubblewrap
  sandbox which masks /home): one audited entry per order binding order id, image id, lock SHA-256, this module's SHA-256 and
  the catalogue SHA-256. The generator (sandboxed) cannot write it, so a generator-made lock can never admit itself.

Isolation is unchanged: the host imports and executes nothing from the order; the pod fetches only the locked wheels (https,
index host only, sha256 checked) BEFORE any weights or inputs, builds the derived image with `docker build --network none
--pull=false` and `pip install --no-index --no-deps --require-hashes --only-binary=:all:`, and the measurement container keeps
`--network none`, read-only /code and /models, no credentials (pod_runner). The overlay can only contain wheels: sdists (build
scripts), VCS/direct URLs, other indexes, torch/CUDA/vLLM replacements and installer tooling are refused. Stdlib only.

`selected()` is cheap and decides whether the catalogue path applies (the lock file exists). Once selected, every problem is an
OperationalHold('runtime_catalogue_unaccepted') -- never a silent fallback to the bare base image.
"""
from __future__ import annotations

import fnmatch
import hashlib
import io
import json
import os
import re
import stat
import tarfile
import tempfile
import urllib.parse
from pathlib import Path
from typing import Any

import measurement_dispatch
import pod_runner

HERE = Path(__file__).resolve().parent
CATALOGUE = HERE / 'runtime_catalogue.json'
CATALOGUE_SHA256 = '357b018e8cedcf14fe21d3a9c3e4bb0955d38c2af8bfec35f4f78c3a8270898f'
LOCK = 'CATALOGUE-OVERLAY.json'
REQUEST = 'CATALOGUE-REQUEST.json'
SCHEMA = 1
FAMILY = 'catalogue'
REMOTE_ROOT = '/runtime-supplement/catalogue'
BUILD_TIMEOUT_S = 1800
FETCH_TIMEOUT_S = 900
JSON_LIMIT = 1024 * 1024
REGISTRY_LIMIT = 16 * 1024 * 1024
REGISTRY_KEEP_DAYS = 45
MODULE_LIMIT = 4 * 1024 * 1024
HOLD = 'runtime_catalogue_unaccepted'
PIP_HOLD = 'runtime_catalogue_pip_check_failed'
MAX_REQUIRES = 300

ISO_RE = re.compile(r'20[0-9]{2}-[01][0-9]-[0-3][0-9]T[0-9:.]{8,15}Z')
ORDER_ID_RE = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
HEX64_RE = re.compile(r'[0-9a-f]{64}')
IMAGE_ID_RE = re.compile(r'[a-z0-9][a-z0-9.-]{0,40}')
NAME_RE = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*')
VERSION_RE = re.compile(r'[0-9][0-9A-Za-z.+!]{0,63}')
# PEP 427 file name: {dist}-{version}(-{build})?-{python}-{abi}-{platform}.whl, each part free of '-' and of path syntax.
WHEEL_RE = re.compile(r'(?P<dist>[A-Za-z0-9_.]+)-(?P<version>[A-Za-z0-9_.+!]+)(?:-(?P<build>[0-9][A-Za-z0-9_]*))?'
                      r'-(?P<py>[a-z0-9_.]+)-(?P<abi>[a-z0-9_.]+)-(?P<plat>[a-z0-9_.]+)\.whl')
PYPI_PATH_RE = re.compile(r'/packages/[0-9a-f]{2}/[0-9a-f]{2}/[0-9a-f]{60}/[^/]+')
MANYLINUX_RE = re.compile(r'manylinux_(\d+)_(\d+)_x86_64')
LEGACY_MANYLINUX = {'manylinux1_x86_64': (2, 5), 'manylinux2010_x86_64': (2, 12), 'manylinux2014_x86_64': (2, 17)}
LOCK_KEYS = {'schema', 'image_id', 'image', 'wheels', 'resolved_at', 'resolved_by', 'requested', 'base'}
WHEEL_KEYS = {'name', 'version', 'filename', 'url', 'sha256', 'size', 'requires', 'uploaded', 'project_since'}
ENTRY_KEYS = ('order_id', 'image_id', 'image', 'lock_sha256', 'module_sha256', 'catalogue_sha256',
              'base_inventory_sha256', 'admitted_at', 'admitted_by', 'basis')
_OPEN_FLAGS = os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_CLOEXEC', 0) | getattr(os, 'O_NONBLOCK', 0)


class CatalogueError(ValueError):
    """A catalogue, lock or admission problem (message is operator-facing, never customer text)."""


def _default_registry() -> Path:
    try:
        home = Path.home()
    except (RuntimeError, KeyError):
        home = Path('/nonexistent')
    return home / '.local' / 'state' / 'fastlane-autopickup' / 'catalogue-admissions.json'


REGISTRY = Path(os.environ.get('FASTLANE_CATALOGUE_ADMISSIONS') or _default_registry())


# ---------------------------------------------------------------------------------------------------------------- files

def read_regular(path: Path | str, limit: int, *, host_owned: bool = False) -> bytes:
    """Bytes of a regular file opened without following a final symlink; checks run on the open descriptor."""
    fd = os.open(os.fspath(path), _OPEN_FLAGS)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode):
            raise CatalogueError('not a regular file')
        if info.st_size > limit:
            raise CatalogueError('file too large')
        if host_owned and (info.st_uid != os.geteuid() or info.st_mode & 0o022):
            raise CatalogueError('file not exclusively writable by the host user')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            data = stream.read(limit + 1)
    finally:
        os.close(fd)
    if len(data) > limit:
        raise CatalogueError('file too large')
    return data


def _no_symlink_dirs(path: Path) -> None:
    for parent in reversed(path.parents):
        if parent.is_symlink():
            raise CatalogueError('symlink on the path')


_MODULE_DIGEST: dict[str, str] = {}


def module_sha256() -> str:
    """SHA-256 of this module file, taken once per process (a reinstall mid-attempt must not flip the answer)."""
    key = os.fspath(Path(__file__).resolve())
    if key not in _MODULE_DIGEST:
        _MODULE_DIGEST[key] = hashlib.sha256(read_regular(key, MODULE_LIMIT)).hexdigest()
    return _MODULE_DIGEST[key]


def canonical_json(value: Any) -> bytes:
    return (json.dumps(value, indent=1, sort_keys=True) + '\n').encode('utf-8')


def normalize(name: str) -> str:
    """PEP 503 normalized distribution name."""
    return re.sub(r'[-_.]+', '-', name).lower()


# ------------------------------------------------------------------------------------------------------------ catalogue

def load_catalogue(path: Path | str = CATALOGUE, expected_sha256: str | None = None) -> dict[str, Any]:
    """The reviewed catalogue; CatalogueError unless its bytes match the pinned SHA-256 and its shape is exact."""
    raw = read_regular(path, JSON_LIMIT)
    if hashlib.sha256(raw).hexdigest() != (CATALOGUE_SHA256 if expected_sha256 is None else expected_sha256):
        raise CatalogueError('catalogue pin')
    value = json.loads(raw.decode('utf-8'))
    if not isinstance(value, dict) or value.get('schema') != SCHEMA or not isinstance(value.get('images'), dict) \
            or not isinstance(value.get('overlay'), dict) or not value['images']:
        raise CatalogueError('catalogue schema')
    overlay = value['overlay']
    for key in ('max_wheels', 'max_wheel_bytes', 'max_total_bytes'):
        if type(overlay.get(key)) is not int or overlay[key] <= 0:
            raise CatalogueError('catalogue overlay limits')
    if not isinstance(overlay.get('deny'), list) or not all(isinstance(d, str) and d for d in overlay['deny']) \
            or overlay.get('index_hosts') != ['files.pythonhosted.org']:
        raise CatalogueError('catalogue overlay policy')
    for image_id, image in value['images'].items():
        if not IMAGE_ID_RE.fullmatch(image_id) or not isinstance(image, dict) \
                or not isinstance(image.get('image'), str) or not pod_runner.IMAGE_RE.fullmatch(image['image']) \
                or not re.fullmatch(r'3\.(1[0-9])', str(image.get('python'))) \
                or not isinstance(image.get('kinds'), list) or not image['kinds'] \
                or set(image['kinds']) - {'http_typesafe', 'python_inprocess'} \
                or not isinstance(image.get('preinstalled'), dict) \
                or not isinstance(image.get('requires'), dict) \
                or not isinstance(image.get('pip_check_ignore'), list) \
                or not isinstance(image.get('downloader'), dict) or set(image['downloader']) != {'requested', 'wheels'} \
                or not isinstance(image['downloader']['wheels'], list) \
                or not all(isinstance(n, str) and NAME_RE.fullmatch(n) for n in image['pip_check_ignore']) \
                or any(not isinstance(v, list) or not all(isinstance(x, str) for x in v) for v in image['requires'].values()) \
                or not re.fullmatch(r'2\.[0-9]{2}', str(image.get('glibc'))):
            raise CatalogueError('catalogue image entry')
    return value


def image_entry(catalogue: dict[str, Any], image_id: object) -> dict[str, Any]:
    if not isinstance(image_id, str) or image_id not in catalogue['images']:
        raise CatalogueError('unknown catalogue image')
    return catalogue['images'][image_id]


def denied(name: str, catalogue: dict[str, Any]) -> bool:
    return any(fnmatch.fnmatchcase(name, pattern) for pattern in catalogue['overlay']['deny'])


# -------------------------------------------------------------------------------------------------------------- markers

_TOKEN = re.compile(r"\s*(?:(?P<str>'[^']*'|\"[^\"]*\")|(?P<op>===|==|!=|<=|>=|~=|<|>|not\s+in\b|in\b)|"
                    r"(?P<bool>and\b|or\b)|(?P<paren>[()])|(?P<var>[A-Za-z_][A-Za-z0-9_.]*))")


def marker_applies(marker: str, env: dict[str, str]) -> bool:
    """Evaluate a PEP 508 marker for the image. Anything this small evaluator does not understand counts as True
    (the dependency is then required). `extra` is '' (extras are never installed), as pip check evaluates it."""
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
        if lval is None or rval is None:
            raise ValueError
        operator = op[1]
        if operator in ('in', 'not in'):
            return (lval in rval) == (operator == 'in')
        versions = ('python_version', 'python_full_version', 'platform_release')
        if lname in versions or rname in versions:
            if lname in versions:
                verdict = satisfies(lval, operator + rval)
            else:  # 'literal' op variable: flip the operator
                flipped = {'<': '>', '<=': '>=', '>': '<', '>=': '<=', '==': '==', '!=': '!=', '===': '==='}.get(operator)
                if flipped is None:
                    raise ValueError
                verdict = satisfies(rval, flipped + lval)
            if verdict is None:
                raise ValueError
            return verdict
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
            'implementation_name': 'cpython', 'platform_python_implementation': 'CPython', 'extra': ''}


def dependency_specs(requires_dist: object, env: dict[str, str]) -> dict[str, list[str]]:
    """{normalized dependency name: [specifier strings]} for the dependencies that apply to the image (no extras)."""
    specs: dict[str, list[str]] = {}
    for line in requires_dist or []:
        if not isinstance(line, str):
            continue
        name, spec = _split_requirement(line[:MAX_REQUIREMENT_CHARS])
        if name is None:
            continue
        marker = line.partition(';')[2].strip()
        if len(line) > MAX_REQUIREMENT_CHARS:
            spec = '<unparsed>'  # an oversized line is never judged; the dependency still counts as required
        elif not marker or marker_applies(marker, env):
            pass
        else:
            continue
        specs.setdefault(normalize(name), []).append(spec)
    return specs


MAX_REQUIREMENT_CHARS = 1000
_NAME_START = re.compile(r'[A-Za-z0-9][A-Za-z0-9._-]*')


def _split_requirement(line: str) -> tuple[str | None, str]:
    """(name, specifier) of a PEP 508 line without backtracking regexes: name, optional [extras], optional
    parenthesised or bare specifier up to ';'. '<unparsed>' when the rest is not a plain specifier."""
    requirement = line.partition(';')[0].strip()
    match = _NAME_START.match(requirement)
    if not match:
        return None, ''
    rest = requirement[match.end():].strip()
    if rest.startswith('['):
        close = rest.find(']')
        if close < 0:
            return match[0], '<unparsed>'
        rest = rest[close + 1:].strip()
    if rest.startswith('(') and rest.endswith(')'):
        rest = rest[1:-1].strip()
    if '@' in rest or '(' in rest or ')' in rest or (rest and rest[0] not in '<>=!~'):
        return match[0], '<unparsed>'
    return match[0], rest


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


# --------------------------------------------------------------------------------------------------- pip check simulation

def installed_set(image: dict[str, Any], lock: dict[str, Any] | None = None) -> tuple[dict[str, str], dict[str, list[str]]]:
    """({name: version}, {name: [Requires-Dist]}) of the base image, with the lock's wheels replacing/adding entries."""
    versions = {normalize(n): str(v) for n, v in image['preinstalled'].items()}
    requires = {normalize(n): list(r) for n, r in image['requires'].items()}
    for wheel in (lock or {}).get('wheels', []):
        versions[wheel['name']] = wheel['version']
        requires[wheel['name']] = list(wheel['requires'])
    return versions, requires


def simulate_pip_check(versions: dict[str, str], requires: dict[str, list[str]], env: dict[str, str],
                       ignore: tuple[str, ...] | list[str] = ()) -> set[tuple[str, str, str]]:
    """What `pip check` would report, from metadata only: (dist, dependency, 'missing' | violated specifier).
    Extras are not installed, markers are evaluated for the image, unparseable specifiers are not judged. `ignore` names
    reviewed base tool distributions (catalogue `pip_check_ignore`) whose own requirements are not checked."""
    problems: set[tuple[str, str, str]] = set()
    for dist, lines in requires.items():
        if dist not in versions or dist in ignore:
            continue
        for dep, specs in dependency_specs(lines, env).items():
            if dep == dist:
                continue
            if dep not in versions:
                problems.add((dist, dep, 'missing'))
                continue
            for spec in specs:
                if spec and spec != '<unparsed>' and satisfies(versions[dep], spec) is False:
                    problems.add((dist, dep, spec))
    return problems


def new_pip_problems(image: dict[str, Any], lock: dict[str, Any]) -> list[str]:
    """Problems the overlay ADDS to the base image's own `pip check` result (the base may have its own, e.g. vLLM's nccl pin)."""
    env, ignore = marker_env(image), image['pip_check_ignore']
    base = simulate_pip_check(*installed_set(image), env, ignore)
    versions, requires = installed_set(image, lock)
    return [f'{dist} {versions.get(dist, "?")} requires {dep}{"" if spec == "missing" else spec}'
            f'{" (not installed)" if spec == "missing" else ", has " + versions[dep]}'
            for dist, dep, spec in sorted(simulate_pip_check(versions, requires, env, ignore) - base)]


def inventory_sha256(image: dict[str, Any]) -> str:
    """Identity of the base package set a lock was checked against (versions + Requires-Dist, canonical JSON)."""
    return hashlib.sha256(json.dumps({'preinstalled': image['preinstalled'], 'requires': image['requires']},
                                     sort_keys=True, separators=(',', ':')).encode()).hexdigest()


# ------------------------------------------------------------------------------------------------------------------ lock

def wheel_compatible(filename: str, python: str, glibc: str) -> bool:
    """True when a PEP 427 wheel name installs on CPython `python` (e.g. '3.11'), glibc `glibc`, x86_64 Linux.

    Some (python, abi, platform) triple of the compressed tag set must be supported: python py3/py2.py3/py3N (N <= minor)
    with abi none, or cp3N with abi cp3N/none (N == minor) or abi3 (N <= minor); platform any, manylinux1/2010/2014 or
    manylinux_X_Y_x86_64 with (X, Y) <= the image glibc. musllinux, linux_x86_64, macOS, Windows and other CPUs never fit."""
    match = WHEEL_RE.fullmatch(filename)
    if not match:
        return False
    minor = int(python.split('.')[1])
    glibc_v = tuple(int(x) for x in glibc.split('.'))

    def plat_ok(plat: str) -> bool:
        if plat == 'any':
            return True
        if plat in LEGACY_MANYLINUX:
            return LEGACY_MANYLINUX[plat] <= glibc_v
        m = MANYLINUX_RE.fullmatch(plat)
        return bool(m) and (int(m[1]), int(m[2])) <= glibc_v

    def py_abi_ok(py: str, abi: str) -> bool:
        if py == 'py3':
            return abi == 'none'
        pure = re.fullmatch(r'py3(\d+)', py)
        if pure:
            return abi == 'none' and int(pure[1]) <= minor
        cp = re.fullmatch(r'cp3(\d+)', py)
        if not cp:
            return False
        version = int(cp[1])
        return (abi in (f'cp3{version}', 'none') and version == minor) or (abi == 'abi3' and version <= minor)

    return any(py_abi_ok(py, abi) and plat_ok(plat)
               for py in match['py'].split('.') for abi in match['abi'].split('.') for plat in match['plat'].split('.'))


def validate_url(url: object, filename: str, catalogue: dict[str, Any]) -> None:
    if not isinstance(url, str) or len(url) > 400:
        raise CatalogueError('wheel url')
    parts = urllib.parse.urlsplit(url)
    if parts.scheme != 'https' or parts.hostname not in catalogue['overlay']['index_hosts'] or parts.port is not None \
            or parts.username or parts.password or parts.query or parts.fragment or parts.netloc != parts.hostname \
            or not PYPI_PATH_RE.fullmatch(parts.path) or urllib.parse.unquote(parts.path.rsplit('/', 1)[1]) != filename \
            or '%' in parts.path:
        raise CatalogueError('wheel url outside the index')


def validate_lock(lock: object, catalogue: dict[str, Any]) -> dict[str, Any]:
    """Structural + policy check of an overlay lock; returns the image entry. CatalogueError on any problem."""
    if not isinstance(lock, dict) or set(lock) != LOCK_KEYS or lock.get('schema') != SCHEMA:
        raise CatalogueError('lock schema')
    image = image_entry(catalogue, lock['image_id'])
    if lock['image'] != image['image']:
        raise CatalogueError('lock image differs from the catalogue')
    if not isinstance(lock['resolved_at'], str) or not isinstance(lock['resolved_by'], str) \
            or not isinstance(lock['requested'], list) or not all(isinstance(r, str) and len(r) <= 200 for r in lock['requested']):
        raise CatalogueError('lock provenance')
    wheels = lock['wheels']
    limits = catalogue['overlay']
    if not isinstance(wheels, list) or len(wheels) > limits['max_wheels']:
        raise CatalogueError('lock wheel count')
    seen: set[str] = set()
    total = 0
    for wheel in wheels:
        if not isinstance(wheel, dict) or set(wheel) != WHEEL_KEYS:
            raise CatalogueError('lock wheel entry')
        name, version, filename = wheel['name'], wheel['version'], wheel['filename']
        if not isinstance(name, str) or not NAME_RE.fullmatch(name) or len(name) > 100 \
                or not isinstance(version, str) or not VERSION_RE.fullmatch(version) \
                or not isinstance(filename, str) or len(filename) > 255:
            raise CatalogueError('lock wheel identity')
        match = WHEEL_RE.fullmatch(filename)
        if not match or normalize(match['dist']) != name or match['version'].replace('_', '-') != version.replace('_', '-'):
            raise CatalogueError(f'wheel file name does not match {name}=={version}')
        if not wheel_compatible(filename, image['python'], image['glibc']):
            raise CatalogueError(f'wheel {filename} does not fit python {image["python"]} / x86_64 manylinux')
        if denied(name, catalogue):
            raise CatalogueError(f'{name} may not be replaced by an overlay')
        if name in seen:
            raise CatalogueError(f'{name} listed twice')
        seen.add(name)
        validate_url(wheel['url'], filename, catalogue)
        if not isinstance(wheel['sha256'], str) or not HEX64_RE.fullmatch(wheel['sha256']):
            raise CatalogueError('wheel sha256')
        size = wheel['size']
        if type(size) is not int or not 0 < size <= limits['max_wheel_bytes']:
            raise CatalogueError('wheel size')
        requires = wheel['requires']
        if not isinstance(requires, list) or len(requires) > MAX_REQUIRES \
                or not all(isinstance(r, str) and len(r) <= 500 for r in requires):
            raise CatalogueError('wheel requires metadata')
        if not all(isinstance(wheel[k], str) and ISO_RE.fullmatch(wheel[k]) for k in ('uploaded', 'project_since')):
            raise CatalogueError('wheel upload dates')
        total += size
    if total > limits['max_total_bytes']:
        raise CatalogueError('overlay total size')
    base = lock['base']
    if not isinstance(base, dict) or set(base) != {'inventory_sha256', 'baseline_problems'} \
            or base['inventory_sha256'] != inventory_sha256(image) or type(base['baseline_problems']) is not int:
        raise CatalogueError('lock was not checked against this base package set')
    problems = new_pip_problems(image, lock)
    if problems:
        raise CatalogueError('overlay adds pip-check problems: ' + '; '.join(problems[:10]))
    return image


def requirements_lock(lock: dict[str, Any]) -> str:
    """pip --require-hashes file: one exact pin + hash per wheel (every value already validated)."""
    return ''.join(f"{w['name']}=={w['version']} --hash=sha256:{w['sha256']}\n" for w in lock['wheels'])


def dockerfile(lock: dict[str, Any]) -> str:
    """Fixed text; only the validated digest-pinned image enters it."""
    lines = [f"FROM {lock['image']}\n"]
    if lock['wheels']:
        lines += ["COPY wheels /tmp/catalogue-wheels\n",
                  "COPY requirements.lock /tmp/catalogue-requirements.lock\n",
                  "RUN PIP_BREAK_SYSTEM_PACKAGES=1 python3 -m pip install --no-index --no-deps --require-hashes --only-binary=:all: --no-compile "
                  "--disable-pip-version-check --no-cache-dir --find-links /tmp/catalogue-wheels "
                  "-r /tmp/catalogue-requirements.lock && rm -rf /tmp/catalogue-wheels /tmp/catalogue-requirements.lock\n"]
    return ''.join(lines)


def context_tar(lock: dict[str, Any]) -> bytes:
    """Deterministic tar of Dockerfile + requirements.lock (wheels are fetched on the pod, by hash)."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w', format=tarfile.USTAR_FORMAT) as archive:
        for name, text in (('Dockerfile.catalogue', dockerfile(lock)), ('requirements.lock', requirements_lock(lock))):
            data = text.encode('utf-8')
            info = tarfile.TarInfo(name)
            info.size, info.mode, info.mtime, info.uid, info.gid = len(data), 0o644, 0, 0, 0
            archive.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


# ------------------------------------------------------------------------------------------------------------- admission

def valid_entry(entry: object) -> bool:
    if not isinstance(entry, dict) or set(entry) != set(ENTRY_KEYS) \
            or any(not isinstance(entry[key], str) or not entry[key] for key in ENTRY_KEYS):
        return False
    return (ORDER_ID_RE.fullmatch(entry['order_id']) is not None and IMAGE_ID_RE.fullmatch(entry['image_id']) is not None
            and all(HEX64_RE.fullmatch(entry[k]) for k in ('lock_sha256', 'module_sha256', 'catalogue_sha256',
                                                            'base_inventory_sha256'))
            and pod_runner.IMAGE_RE.fullmatch(entry['image']) is not None)


def load_registry(path: Path | str | None = None) -> dict[str, Any]:
    value = json.loads(read_regular(REGISTRY if path is None else path, REGISTRY_LIMIT, host_owned=True).decode('utf-8'))
    if not isinstance(value, dict) or set(value) != {'schema', 'entries'} or value['schema'] != SCHEMA \
            or not isinstance(value['entries'], list) or not all(valid_entry(e) for e in value['entries']):
        raise CatalogueError('registry schema')
    return value


def admitted(order_id: str, image_id: str, image: str, lock_sha256: str, base_inventory: str, *,
             registry: Path | str | None = None) -> bool:
    """True only for a registry entry binding exactly this order, image, lock, base package set, module (as first read)
    and catalogue."""
    try:
        digest = module_sha256()
        return any(e['order_id'] == order_id and e['image_id'] == image_id and e['image'] == image
                   and e['lock_sha256'] == lock_sha256 and e['module_sha256'] == digest
                   and e['catalogue_sha256'] == CATALOGUE_SHA256 and e['base_inventory_sha256'] == base_inventory
                   for e in load_registry(registry)['entries'])
    except Exception:  # noqa: BLE001 - fail closed
        return False


# ------------------------------------------------------------------------------------------------------- run-time gates

def selected(job: Path | str) -> bool:
    """The catalogue path applies when the order's trusted runner carries a lock or a generator request (of any kind: a
    symlink or directory there is selected too, so it fails at acceptance instead of being ignored)."""
    trusted = Path(job) / 'trusted-runner'
    return any(p.is_symlink() or p.exists() for p in (trusted / LOCK, trusted / REQUEST))


def accept(job: Path | str, recipe: object, *, registry: Path | str | None = None) -> dict[str, Any]:
    """Full host-side acceptance; returns {lock, image, lock_sha256}. CatalogueError on any problem."""
    job = Path(job)
    order_id = job.name
    if not ORDER_ID_RE.fullmatch(order_id):
        raise CatalogueError('job folder is not an order id')
    trusted = job / 'trusted-runner'
    _no_symlink_dirs(trusted / LOCK)
    raw = read_regular(trusted / LOCK, JSON_LIMIT)
    lock_sha = hashlib.sha256(raw).hexdigest()
    manifest = json.loads(read_regular(trusted / 'UPSTREAM-MANIFEST.json', JSON_LIMIT).decode('utf-8'))
    pinned = manifest.get('files', {}).get(LOCK) if isinstance(manifest, dict) and isinstance(manifest.get('files'), dict) else None
    if not isinstance(pinned, dict) or pinned.get('sha256') != lock_sha or pinned.get('bytes') != len(raw):
        raise CatalogueError('lock is not the frozen, review-pinned copy')
    catalogue = load_catalogue()
    lock = json.loads(raw.decode('utf-8'))
    image = validate_lock(lock, catalogue)
    if not isinstance(recipe, dict) or recipe.get('kind') not in image['kinds'] or recipe.get('image') != image['image']:
        raise CatalogueError('recipe kind/image do not match the catalogue image')
    if not admitted(order_id, lock['image_id'], image['image'], lock_sha, inventory_sha256(image), registry=registry):
        raise CatalogueError('no host admission for this order, lock, module and catalogue')
    return {'lock': lock, 'image': image, 'lock_sha256': lock_sha}


def preflight(job: Path | str, recipe: object) -> dict[str, Any] | None:
    """Called before any reservation or pod: None when not selected, else the accepted record or an OperationalHold."""
    if not selected(job):
        return None
    try:
        return accept(job, recipe)
    except Exception:  # noqa: BLE001 - incl. RecursionError from planted JSON; once selected, every problem holds
        raise measurement_dispatch.OperationalHold(HOLD) from None


def downloader_lock(image_id: str, image: dict[str, Any]) -> dict[str, Any]:
    """The fixed, reviewed downloader overlay of a catalogue image as a lock (validated like an order lock)."""
    return {'schema': SCHEMA, 'image_id': image_id, 'image': image['image'], 'wheels': image['downloader']['wheels'],
            'requested': image['downloader']['requested'], 'resolved_at': 'catalogue', 'resolved_by': 'catalogue',
            'base': {'inventory_sha256': inventory_sha256(image), 'baseline_problems': 0}}


def binding(accepted: dict[str, Any]) -> dict[str, Any]:
    return {'family': FAMILY, 'module_sha256': module_sha256(), 'catalogue_sha256': CATALOGUE_SHA256,
            'image_id': accepted['lock']['image_id'], 'base_image': accepted['image']['image'],
            'lock_sha256': accepted['lock_sha256'], 'wheels': len(accepted['lock']['wheels']),
            'base_inventory_sha256': inventory_sha256(accepted['image'])}


def build(provider, pod_id, job, recipe, state=None):
    """On the owned pod, before weights/inputs: build the order image (base + locked wheels) and the download image
    (base + the catalogue's fixed downloader wheels), both offline; return evidence with `effective_image` (the run) and
    `download_image` (pod_runner fetches the pinned weights with it, network on). Order-lock wheels therefore never run
    with network: the download image holds only reviewed catalogue wheels.

    Host-side acceptance problems are an OperationalHold (no retry); pod-side failures raise PodRunError via
    pod_runner._exec and are eligible for the ordinary single fresh-pod retry; a new pip-check problem is a hold."""
    try:
        accepted = accept(job, recipe)
        evidence = binding(accepted)
        catalogue = load_catalogue()
        downloader = downloader_lock(accepted['lock']['image_id'], accepted['image'])
        validate_lock(downloader, catalogue)
    except Exception:  # noqa: BLE001 - every host-side problem is a hold before any pod effect
        raise measurement_dispatch.OperationalHold(HOLD) from None
    base = accepted['image']['image']
    ignored = tuple(f'{name} ' for name in accepted['image']['pip_check_ignore'])
    base_check = None
    results = {}
    for label, lock in (('order', accepted['lock']), ('download', downloader)):
        if not lock['wheels']:
            results[label] = {'image': base}
            continue
        image, context_sha = _build_image(provider, pod_id, lock, f'{REMOTE_ROOT}/{label}')
        if base_check is None:
            base_check = _pip_check(provider, pod_id, base)
        derived = _pip_check(provider, pod_id, image)
        added = sorted(line for line in set(derived) - set(base_check) if not normalize(line).startswith(ignored))
        results[label] = {'image': image, 'context_sha256': context_sha,
                          'pip_check': {'base_problems': len(base_check), 'derived_problems': len(derived),
                                        'added': added[:20]}}
        if added:
            if isinstance(state, dict):  # persisted by pod_runner's teardown path, so the owner sees what broke
                state['runtime_supplement_refused'] = dict(evidence, stage=label, pip_check=results[label]['pip_check'])
            raise measurement_dispatch.OperationalHold(PIP_HOLD)
    order = results['order']
    return dict(evidence, effective_image=order['image'], download_image=results['download']['image'],
                context_sha256=order.get('context_sha256'), pip_check=order.get('pip_check'),
                download=results['download'])


def _build_image(provider, pod_id, lock: dict[str, Any], root: str) -> tuple[str, str]:
    """Fetch the lock's wheels by hash into `root` on the pod and build FROM the pinned base offline; (image id, ctx sha)."""
    context = context_tar(lock)
    context_sha = hashlib.sha256(context).hexdigest()
    pod_runner._exec(provider, pod_id, ['rm', '-rf', root])
    pod_runner._exec(provider, pod_id, ['mkdir', '-p', root + '/wheels'])
    with tempfile.TemporaryDirectory(prefix='catalogue-context-') as tmp:
        local = Path(tmp) / 'context.tar'
        local.write_bytes(context)
        provider.scp_to(pod_id, str(local), root + '/context.tar')
    transferred = pod_runner._exec(provider, pod_id, ['sha256sum', root + '/context.tar'])
    if context_sha not in transferred.stdout.split():
        raise pod_runner.PodRunError('catalogue context changed in transfer')
    pod_runner._exec(provider, pod_id, ['tar', '-xf', root + '/context.tar', '-C', root])
    for wheel in lock['wheels']:
        target = f"{root}/wheels/{wheel['filename']}"
        pod_runner._exec(provider, pod_id, ['curl', '--fail', '--silent', '--show-error', '--proto', '=https',
                                            '--max-redirs', '0', '--max-filesize', str(wheel['size']),
                                            '--max-time', str(FETCH_TIMEOUT_S), '-o', target, wheel['url']],
                         timeout=FETCH_TIMEOUT_S + 60)
        check = pod_runner._exec(provider, pod_id, ['sha256sum', target])
        if wheel['sha256'] not in check.stdout.split():
            raise pod_runner.PodRunError(f"catalogue wheel {wheel['name']} sha256 mismatch")
    listing = pod_runner._exec(provider, pod_id, ['find', root + '/wheels', '-mindepth', '1', '-printf', '%f\\n'])
    if sorted(listing.stdout.split()) != sorted(w['filename'] for w in lock['wheels']):
        raise pod_runner.PodRunError('catalogue wheel directory differs from the lock')
    pod_runner._exec(provider, pod_id, ['docker', 'build', '--network', 'none', '--pull=false',
                                        '--iidfile', root + '/image.iid', '-f', root + '/Dockerfile.catalogue', root],
                     timeout=BUILD_TIMEOUT_S)
    image = pod_runner._exec(provider, pod_id, ['cat', root + '/image.iid']).stdout.strip()
    if not re.fullmatch(r'sha256:[0-9a-f]{64}', image):
        raise pod_runner.PodRunError('catalogue build has no immutable image id')
    inspected = pod_runner._exec(provider, pod_id, ['docker', 'image', 'inspect', image, '--format', '{{.Id}}'])
    if inspected.stdout.strip() != image:
        raise pod_runner.PodRunError('catalogue image identity differs')
    return image, context_sha


def _pip_check(provider, pod_id, ref) -> list[str]:
    """`pip check` inside `ref`, offline, isolated mode (-I: no sitecustomize, user site or cwd on the path). This is a
    BACKSTOP, not the control: code from an overlay `.pth` could still influence its output. The control is the host
    simulation over reviewed metadata (validate_lock / new_pip_problems), which runs before any pod exists."""
    result = provider.exec(pod_id, ['docker', 'run', '--rm', '--network', 'none', '--entrypoint', 'python3', ref,
                                    '-I', '-m', 'pip', 'check', '--disable-pip-version-check'], timeout=300)
    lines = [line.strip() for line in (result.stdout or '').splitlines() if line.strip()]
    if result.returncode not in (0, 1) or (result.returncode == 1 and not lines) \
            or (result.returncode == 0 and lines != ['No broken requirements found.']):
        raise pod_runner.PodRunError('catalogue pip check did not run')
    return [] if result.returncode == 0 else lines
