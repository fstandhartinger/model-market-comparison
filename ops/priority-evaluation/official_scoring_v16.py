"""Host-owned scoring provenance and offline execution; never imported in an agent sandbox."""
from __future__ import annotations
import hashlib
import json
import os
import math
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / 'official-profiles.json'


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _validate_profile(result):
    baseline_bytes = None
    for name, pin in result['files'].items():
        if not re.fullmatch(r'[A-Za-z0-9_.-]+', name) or set(pin) != {'path', 'sha256'}:
            raise ValueError('invalid official reference manifest')
        path = Path(pin['path'])
        if path.is_symlink() or not path.is_file():
            raise ValueError('official reference pin changed')
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != pin['sha256']:
            raise ValueError('official reference pin changed')
        if name == 'baseline.json':
            baseline_bytes = data
    if baseline_bytes is None:
        raise ValueError('official baseline missing')
    baseline = json.loads(baseline_bytes)
    phase, gm = baseline.get('phase'), baseline.get('G_med')
    if phase == 'measurement_plan':
        if gm is not None:
            raise ValueError('measurement-only v16 baseline must not invent a cohort gap')
    elif phase != 'completed_cohort' or isinstance(gm, bool) or not isinstance(gm, (int, float)) or not math.isfinite(gm):
        raise ValueError('invalid completed v16 cohort baseline')


def profile(benchmark, manifest_path=None):
    return pins([benchmark], manifest_path)['profiles'][benchmark]


def pins(benchmarks, manifest=None, *, expected_pins=None):
    manifest = Path(manifest) if manifest is not None else MANIFEST
    if expected_pins is not None and (manifest.is_symlink() or not manifest.is_file()):
        raise ValueError('official scoring manifest changed')
    data = manifest.read_bytes()
    manifest_digest = hashlib.sha256(data).hexdigest()
    if expected_pins is not None and expected_pins.get('manifest_sha256') != manifest_digest:
        raise ValueError('official scoring manifest changed')
    value = json.loads(data)
    if not isinstance(value, dict) or value.get('schema_version') != 1:
        raise ValueError('official scoring profile unavailable')
    profiles = value.get('profiles', {})
    benchmarks = tuple(benchmarks)
    if not isinstance(profiles, dict) or any(benchmark not in profiles for benchmark in benchmarks):
        raise ValueError('official scoring profile unavailable')
    selected = {benchmark: profiles[benchmark] for benchmark in benchmarks}
    current = {'manifest_sha256': manifest_digest, 'adapter_sha256': digest(ROOT / 'official_score_v16.py'),
               'profiles': selected}
    if expected_pins is not None and current != expected_pins:
        raise ValueError('official scoring pins differ from source review')
    for result in selected.values():
        _validate_profile(result)
    return current


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


def run(benchmark, raw, meta, expected_pins, *, manifest=None):
    validate_meta(benchmark, meta)
    current = pins(list(expected_pins['profiles']), manifest, expected_pins=expected_pins)
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
                '--ro-bind', str(ROOT / 'official_score_v16.py'), '/scorer.py',
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
        pins(list(expected_pins['profiles']), manifest, expected_pins=expected_pins)
        return outputs[0]
