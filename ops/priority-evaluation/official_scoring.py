"""Host-owned scoring provenance and offline execution; never imported in an agent sandbox."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / 'official-profiles.json'


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def profile(benchmark):
    manifest = json.loads(MANIFEST.read_text())
    if manifest.get('schema_version') != 1 or benchmark not in manifest.get('profiles', {}):
        raise ValueError('official scoring profile unavailable')
    result = manifest['profiles'][benchmark]
    for name, pin in result['files'].items():
        if not re.fullmatch(r'[a-z0-9.-]+', name) or set(pin) != {'path', 'sha256'}:
            raise ValueError('invalid official reference manifest')
        path = Path(pin['path'])
        if path.is_symlink() or not path.is_file() or digest(path) != pin['sha256']:
            raise ValueError('official reference pin changed')
    return result


def pins(benchmarks):
    return {'manifest_sha256': digest(MANIFEST), 'adapter_sha256': digest(ROOT / 'official_score.py'),
            'profiles': {benchmark: profile(benchmark) for benchmark in benchmarks}}


def validate_meta(benchmark, meta):
    if not isinstance(meta, dict) or set(meta) != {'system_key', 'system'} or not isinstance(meta['system'], dict):
        raise ValueError('invalid official system metadata')
    system = meta['system']
    if benchmark == 'jevbench':
        support = system.get('support')
        if not isinstance(support, dict) or set(support) != {'choice', 'noul', 'score'} or any(
                value not in ('native', 'label', 'unsupported') for value in support.values()):
            raise ValueError('official support enum must be native, label or unsupported')
    elif benchmark == 'imagejevbench' and system.get('kind') not in ('api', 'local'):
        raise ValueError('invalid official image endpoint kind')


def run(benchmark, raw, meta, expected_pins):
    validate_meta(benchmark, meta)
    current = pins(list(expected_pins['profiles']))
    if current != expected_pins:
        raise ValueError('official scoring pins differ from source review')
    item = current['profiles'][benchmark]
    with tempfile.TemporaryDirectory(prefix='fastlane-official-') as tmp:
        scratch = Path(tmp)
        # Snapshot evaluator-writable raw bytes. The scorer sees no sibling files or RESULT.
        shutil.copyfile(raw, scratch / 'raw.jsonl')
        (scratch / 'meta.json').write_text(json.dumps(meta, allow_nan=False))
        argv = ['/usr/bin/bwrap', '--die-with-parent', '--new-session', '--unshare-all',
                '--tmpfs', '/', '--ro-bind', '/usr', '/usr', '--symlink', 'usr/bin', '/bin',
                '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64',
                '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp', '--dir', '/refs', '--dir', '/input',
                '--ro-bind', str(ROOT / 'official_score.py'), '/scorer.py',
                '--ro-bind', str(scratch / 'raw.jsonl'), '/input/raw.jsonl',
                '--ro-bind', str(scratch / 'meta.json'), '/input/meta.json']
        for name, pin in item['files'].items():
            argv += ['--ro-bind', pin['path'], '/refs/' + name]
        argv += ['--clearenv', '--setenv', 'OPENAI_API_KEY', '', '--setenv', 'LANG', 'C.UTF-8',
                 '--', '/usr/bin/python3', '-I', '-S', '/scorer.py', benchmark]
        outputs = []
        for _ in range(2):
            proc = subprocess.run(argv, env={'PATH': '/usr/bin:/bin'}, capture_output=True,
                                  timeout=600, check=False)
            if proc.returncode or len(proc.stdout) > 1_000_000:
                raise ValueError('isolated official scoring failed')
            outputs.append(json.loads(proc.stdout))
        if outputs[0] != outputs[1] or digest(raw) != digest(scratch / 'raw.jsonl'):
            raise ValueError('official scorer passes or raw pins changed')
        # Recheck references after execution as well, before trusting any aggregate.
        if pins(list(expected_pins['profiles'])) != expected_pins:
            raise ValueError('official reference changed during scoring')
        return outputs[0]
