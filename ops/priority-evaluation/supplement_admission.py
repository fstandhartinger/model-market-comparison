"""Repeat-order admission for reviewed runtime supplements (INCIDENTS #25 Part 2).

A repeat order from the same model repository used to need a hand-made allow-list change before its reviewed
supplement could run, although the author's documented stack had not changed. This module lets the host admit
such an order deterministically, with no agent judgement:

* the host-written fetch receipt(s) name a repository registered for the family (native_owner.repo_key);
* every stack-defining file of the family in the fetched source is byte-identical to the reviewed precedent
  (torchcast: the normalized `pip install` lines of code/README.md plus the serving entry files);
* the recipe still has to be the family's exact http_typesafe recipe on the digest-pinned base (checked by the
  supplement's own `active()`), and the supplement's CONTEXT_SHA/FILES pins stay the real gate.

The host writes trusted-runner/SUPPLEMENT-ADMISSION.json before the bundle is frozen, so the independent source
review pins it. `admitted()` re-derives everything from the source tree and the frozen manifest at run time; the
receipt is evidence, never trusted input. Stdlib only; nothing here imports a model stack or runs customer code.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

import native_owner

RECEIPT = 'SUPPLEMENT-ADMISSION.json'
FILE_LIMIT = 4 * 1024 * 1024
JSON_LIMIT = 200_000
PIP_DIGEST = 'pip-install-lines'

# Stack files relative to the order's source/ directory, with the reviewed precedent's SHA-256. Model behaviour
# files (model.py, weights, configs) are deliberately not listed: they may change between versions.
FAMILIES: dict[str, dict[str, Any]] = {
    'standardone': {
        'module': 'standardone_runtime_supplement',
        'precedent': 'a8731403-9731-4d57-98b4-0c5d93952ad2',
        'receipts': ('model',),
        'files': {
            'model/code/requirements.txt': '41685ab5516b7bf5eef3431b1fbcff43b35ed83bc957b88ffa4a4e23bf8ec855',
            'model/code/head.py': '5f3d6035ca36885c9be04b7cfa88b5ba532c87d5b26fa3525c94327fb1b4348b',
            'model/code/model.py': '88e3e1c200ff0d37f2a9fcb864ebf06b864e4883dcd71f2297d83bdf96a73120',
            'model/code/render.py': '72ad6b7d1989105b8425c5d79e347fda2e9d3f2b429a5935c6d660983be412d1',
            'model/code/scoring.py': '9f18b699a0917d51b916e8ed96af87eb086af06fb9e6a723767032c107a50d15',
            'model/code/serve_head.py': '1b31b60dc0273ef671e230b3b1db79efd2a7de1410feef380757fc4cb2a316d9',
        },
    },
    'lychee': {
        'module': 'lychee_runtime_supplement',
        'precedent': 'a5d49ab5-d91f-4545-9f23-6fbce4a33021',
        'receipts': ('model',),
        'files': {
            'model/requirements.txt': '823733e4297083be898c76f18a0c742dbb03e676aeaa351a6e55006c7cb043bd',
        },
    },
    'torchcast': {
        'module': 'torchcast_runtime_supplement',
        'precedent': '9494e9ea-eeea-46e0-8fb1-41a045f41354',
        'receipts': ('model', 'code'),
        'files': {
            'model/torchcast_decision/server.py': '919e9bc0b0907e8162ffd2f2d67d7d795943400c43436766ffafdf4374b4255c',
            'model/torchcast_decision/__init__.py': '3296692f8951103238532f66080d9ea0be3829d4db27b1f91602e8d9a1670505',
            'model/torchcast_decision/_pin_triton.py': 'f4abc4447988eba412339da3eba1dc37cd284fc7e07abb1da6a77a50c2afe23d',
        },
        # README prose changes every version; only the documented install commands define the stack.
        'pip_lines': ('code/README.md', '4703c95409b574a955a7c31e9a96ac2087b4277b509f7e349a4d79cc21bb94e7'),
    },
}

_REGISTRY = {entry['family']: entry for entry in native_owner.SUPPLEMENTS}


def _regular(path: Path, root: Path) -> Path:
    """A regular file inside root with no symlink anywhere on the way."""
    current = root
    if root.is_symlink() or not root.is_dir():
        raise ValueError('source root is missing or a symlink')
    for part in path.relative_to(root).parts:
        current = current / part
        if current.is_symlink():
            raise ValueError('stack file path contains a symlink')
    if not current.is_file() or current.stat().st_size > FILE_LIMIT:
        raise ValueError('stack file is missing, not regular or too large')
    return current


def file_sha256(source: Path, relative: str) -> str:
    return hashlib.sha256(_regular(source / relative, source).read_bytes()).hexdigest()


def pip_lines(text: str) -> list[str]:
    """`pip install` commands (with backslash continuations), whitespace-normalized, in document order."""
    lines, current = [], None
    for raw in text.splitlines():
        line = raw.strip()
        if current is not None:
            current += ' ' + line.rstrip('\\').strip()
            if not line.endswith('\\'):
                lines.append(current)
                current = None
            continue
        if re.match(r'(?:\$\s*)?(?:python3?\s+-m\s+)?pip\s+install\b', line):
            line = re.sub(r'^\$\s*', '', line)
            if line.endswith('\\'):
                current = line.rstrip('\\').strip()
            else:
                lines.append(line)
    if current is not None:
        lines.append(current)
    return [' '.join(item.split()) for item in lines]


def pip_digest(source: Path, relative: str) -> str:
    text = _regular(source / relative, source).read_text(encoding='utf-8', errors='strict')
    lines = pip_lines(text)
    if not lines:
        raise ValueError('no documented pip install lines')
    return hashlib.sha256(('\n'.join(lines) + '\n').encode()).hexdigest()


def _load_json(path: Path) -> Any:
    if path.is_symlink() or not path.is_file() or path.stat().st_size > JSON_LIMIT:
        raise ValueError('json file missing or unsafe')
    return json.loads(path.read_text(encoding='utf-8'))


def repo_keys(source: Path, which: tuple[str, ...]) -> dict[str, str]:
    """Repository keys from the host-written fetch receipts (never from customer free text)."""
    keys = {}
    for name in which:
        value = _load_json(source / f'FETCH-RECEIPT-{name}.json')
        key = native_owner.repo_key(value.get('url') if isinstance(value, dict) else None)
        if key is None or not isinstance(value, dict) or value.get('which') != name:
            raise ValueError('fetch receipt has no valid repository')
        keys[name] = key
    return keys


def evaluate(job_dir: Path | str, family: str) -> dict[str, Any] | None:
    """The admission record when the order's fetched source repeats the family's reviewed stack, else None."""
    spec = FAMILIES.get(family)
    job_dir = Path(job_dir)
    if spec is None or family not in _REGISTRY:
        return None
    source = job_dir / 'source'
    try:
        keys = repo_keys(source, spec['receipts'])
        if not set(keys.values()) <= set(_REGISTRY[family]['repos']):
            return None
        hashes = {relative: file_sha256(source, relative) for relative in spec['files']}
        if hashes != spec['files']:
            return None
        if 'pip_lines' in spec:
            relative, expected = spec['pip_lines']
            digest = pip_digest(source, relative)
            if digest != expected:
                return None
            hashes[f'{relative}#{PIP_DIGEST}'] = digest
    except (OSError, ValueError, UnicodeError):
        return None
    return {'schema_version': 1, 'order': job_dir.name, 'family': family, 'module': spec['module'],
            'precedent_order': spec['precedent'], 'repositories': keys, 'stack_sha256': hashes}


def find(job_dir: Path | str) -> dict[str, Any] | None:
    for family in FAMILIES:
        record = evaluate(job_dir, family)
        if record is not None:
            return record
    return None


def write_receipt(job_dir: Path | str, bundle_dir: Path | str) -> dict[str, Any] | None:
    """Host step before the bundle is frozen: write the receipt for an admitted order, remove any other copy."""
    target = Path(bundle_dir) / RECEIPT
    if target.is_symlink() or (target.exists() and not target.is_file()):
        raise ValueError('admission receipt path is unsafe')
    record = find(job_dir)
    if record is None:
        if target.exists():
            target.unlink()
        return None
    tmp = target.with_name(RECEIPT + '.tmp')
    tmp.write_text(json.dumps(record, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    tmp.replace(target)
    return record


def admitted(job: Path | str, family: str) -> bool:
    """Run-time check used by the supplement's active(): frozen, review-pinned receipt + live re-derivation."""
    job_dir = Path(job)
    try:
        trusted = job_dir / 'trusted-runner'
        receipt_path = trusted / RECEIPT
        receipt = _load_json(receipt_path)
        manifest = _load_json(trusted / 'UPSTREAM-MANIFEST.json')
        pinned = manifest.get('files', {}).get(RECEIPT) if isinstance(manifest, dict) else None
        if not isinstance(pinned, dict) \
                or pinned.get('sha256') != hashlib.sha256(receipt_path.read_bytes()).hexdigest():
            return False
    except (OSError, ValueError, AttributeError):
        return False
    return evaluate(job_dir, family) == receipt


def generator_hint(job_dir: Path | str) -> str:
    """Prompt text for the runner generator when the host admitted this order to a reviewed supplement."""
    record = find(job_dir)
    if record is None:
        return ''
    precedent = Path(job_dir).parent / record['precedent_order'] / 'trusted-runner'
    shapes = []
    for name in ('POD-RECIPE.json', 'RUNTIME.json'):
        try:
            shapes.append(f'Precedent `{name}` (host data from order {record["precedent_order"][:8]}):\n```json\n'
                          + json.dumps(_load_json(precedent / name), indent=2, sort_keys=True) + '\n```\n')
        except (OSError, ValueError):
            return ''
    return (f"\nRuntime supplement admission (host check, not customer text): this order repeats the reviewed "
            f"`{record['family']}` stack byte for byte (same repository, identical stack files). The host runtime "
            f"supplement `{record['module']}.py` serves it automatically; do NOT write {{\"backend\":\"unsupported\"}}. "
            "Write POD-RECIPE.json with exactly the precedent's constant fields (schema_version, kind, image, "
            "min_vram_gb, code.source, services argv/env/ready_url, endpoint) and take every order-specific value "
            "(weights revision and sha256 map, code commit/tree, served model name) from this order's host "
            "MODEL-WEIGHT-PINS.json and fetch receipts. Never copy a precedent revision or hash. RUNTIME.json and "
            "MEASUREMENT-META.json follow the precedent shape with this order's model id and prices.\n"
            + ''.join(shapes))
