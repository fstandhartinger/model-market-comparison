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
CATALOGUE_SHA256 = 'f6f8943c7400aba9a24f47e6ce4ba3120785ba80c744e7ccec8ebe43e3aa47bb'
LOCK = 'CATALOGUE-OVERLAY.json'
REQUEST = 'CATALOGUE-REQUEST.json'
SCHEMA = 1
FAMILY = 'catalogue'
REMOTE_ROOT = '/runtime-supplement/catalogue'
BUILD_TIMEOUT_S = 1800
FETCH_TIMEOUT_S = 900
JSON_LIMIT = 1024 * 1024
MODULE_LIMIT = 4 * 1024 * 1024
HOLD = 'runtime_catalogue_unaccepted'

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
LOCK_KEYS = {'schema', 'image_id', 'image', 'wheels', 'resolved_at', 'resolved_by', 'requested'}
WHEEL_KEYS = {'name', 'version', 'filename', 'url', 'sha256', 'size'}
ENTRY_KEYS = ('order_id', 'image_id', 'image', 'lock_sha256', 'module_sha256', 'catalogue_sha256',
              'admitted_at', 'admitted_by', 'basis')
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
                or not re.fullmatch(r'2\.[0-9]{2}', str(image.get('glibc'))):
            raise CatalogueError('catalogue image entry')
    return value


def image_entry(catalogue: dict[str, Any], image_id: object) -> dict[str, Any]:
    if not isinstance(image_id, str) or image_id not in catalogue['images']:
        raise CatalogueError('unknown catalogue image')
    return catalogue['images'][image_id]


def denied(name: str, catalogue: dict[str, Any]) -> bool:
    return any(fnmatch.fnmatchcase(name, pattern) for pattern in catalogue['overlay']['deny'])


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
        total += size
    if total > limits['max_total_bytes']:
        raise CatalogueError('overlay total size')
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
            and all(HEX64_RE.fullmatch(entry[k]) for k in ('lock_sha256', 'module_sha256', 'catalogue_sha256'))
            and pod_runner.IMAGE_RE.fullmatch(entry['image']) is not None)


def load_registry(path: Path | str | None = None) -> dict[str, Any]:
    value = json.loads(read_regular(REGISTRY if path is None else path, JSON_LIMIT, host_owned=True).decode('utf-8'))
    if not isinstance(value, dict) or set(value) != {'schema', 'entries'} or value['schema'] != SCHEMA \
            or not isinstance(value['entries'], list) or not all(valid_entry(e) for e in value['entries']):
        raise CatalogueError('registry schema')
    return value


def admitted(order_id: str, image_id: str, image: str, lock_sha256: str, *, registry: Path | str | None = None) -> bool:
    """True only for a registry entry binding exactly this order, image, lock, module (as first read) and catalogue."""
    try:
        digest = module_sha256()
        return any(e['order_id'] == order_id and e['image_id'] == image_id and e['image'] == image
                   and e['lock_sha256'] == lock_sha256 and e['module_sha256'] == digest
                   and e['catalogue_sha256'] == CATALOGUE_SHA256
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
    if not admitted(order_id, lock['image_id'], image['image'], lock_sha, registry=registry):
        raise CatalogueError('no host admission for this order, lock, module and catalogue')
    return {'lock': lock, 'image': image, 'lock_sha256': lock_sha}


def preflight(job: Path | str, recipe: object) -> dict[str, Any] | None:
    """Called before any reservation or pod: None when not selected, else the accepted record or an OperationalHold."""
    if not selected(job):
        return None
    try:
        return accept(job, recipe)
    except (OSError, ValueError, KeyError, TypeError):
        raise measurement_dispatch.OperationalHold(HOLD) from None


def binding(accepted: dict[str, Any]) -> dict[str, Any]:
    return {'family': FAMILY, 'module_sha256': module_sha256(), 'catalogue_sha256': CATALOGUE_SHA256,
            'image_id': accepted['lock']['image_id'], 'base_image': accepted['image']['image'],
            'lock_sha256': accepted['lock_sha256'], 'wheels': len(accepted['lock']['wheels'])}


def build(provider, pod_id, job, recipe):
    """Fetch the locked wheels on the owned pod (before weights/inputs), build the derived image offline, return evidence.

    Host-side acceptance problems are an OperationalHold (no retry); pod-side failures raise PodRunError via
    pod_runner._exec and are eligible for the ordinary single fresh-pod retry."""
    try:
        accepted = accept(job, recipe)
        evidence = binding(accepted)
        context = context_tar(accepted['lock'])
    except (OSError, ValueError, KeyError, TypeError):
        raise measurement_dispatch.OperationalHold(HOLD) from None
    lock = accepted['lock']
    if not lock['wheels']:
        return dict(evidence, effective_image=accepted['image']['image'])
    context_sha = hashlib.sha256(context).hexdigest()
    pod_runner._exec(provider, pod_id, ['rm', '-rf', REMOTE_ROOT])
    pod_runner._exec(provider, pod_id, ['mkdir', '-p', REMOTE_ROOT + '/wheels'])
    with tempfile.TemporaryDirectory(prefix='catalogue-context-') as tmp:
        local = Path(tmp) / 'context.tar'
        local.write_bytes(context)
        provider.scp_to(pod_id, str(local), REMOTE_ROOT + '/context.tar')
    transferred = pod_runner._exec(provider, pod_id, ['sha256sum', REMOTE_ROOT + '/context.tar'])
    if context_sha not in transferred.stdout.split():
        raise pod_runner.PodRunError('catalogue context changed in transfer')
    pod_runner._exec(provider, pod_id, ['tar', '-xf', REMOTE_ROOT + '/context.tar', '-C', REMOTE_ROOT])
    for wheel in lock['wheels']:
        target = f"{REMOTE_ROOT}/wheels/{wheel['filename']}"
        pod_runner._exec(provider, pod_id, ['curl', '--fail', '--silent', '--show-error', '--proto', '=https',
                                            '--max-redirs', '0', '--max-filesize', str(wheel['size']),
                                            '--max-time', str(FETCH_TIMEOUT_S), '-o', target, wheel['url']],
                         timeout=FETCH_TIMEOUT_S + 60)
        check = pod_runner._exec(provider, pod_id, ['sha256sum', target])
        if wheel['sha256'] not in check.stdout.split():
            raise pod_runner.PodRunError(f"catalogue wheel {wheel['name']} sha256 mismatch")
    listing = pod_runner._exec(provider, pod_id, ['find', REMOTE_ROOT + '/wheels', '-mindepth', '1', '-printf', '%f\\n'])
    if sorted(listing.stdout.split()) != sorted(w['filename'] for w in lock['wheels']):
        raise pod_runner.PodRunError('catalogue wheel directory differs from the lock')
    pod_runner._exec(provider, pod_id, ['docker', 'build', '--network', 'none', '--pull=false',
                                        '--iidfile', REMOTE_ROOT + '/image.iid',
                                        '-f', REMOTE_ROOT + '/Dockerfile.catalogue', REMOTE_ROOT],
                     timeout=BUILD_TIMEOUT_S)
    image = pod_runner._exec(provider, pod_id, ['cat', REMOTE_ROOT + '/image.iid']).stdout.strip()
    if not re.fullmatch(r'sha256:[0-9a-f]{64}', image):
        raise pod_runner.PodRunError('catalogue build has no immutable image id')
    inspected = pod_runner._exec(provider, pod_id, ['docker', 'image', 'inspect', image, '--format', '{{.Id}}'])
    if inspected.stdout.strip() != image:
        raise pod_runner.PodRunError('catalogue image identity differs')
    # Evidence only (base images may carry their own pip-check findings): offline, no GPU, removed afterwards.
    check = provider.exec(pod_id, ['docker', 'run', '--rm', '--network', 'none', '--entrypoint', 'python3', image,
                                   '-m', 'pip', 'check'], timeout=300)
    pip_check = {'returncode': check.returncode, 'tail': ((check.stdout or '') + (check.stderr or ''))[-2000:]}
    return dict(evidence, effective_image=image, context_sha256=context_sha, pip_check=pip_check)
