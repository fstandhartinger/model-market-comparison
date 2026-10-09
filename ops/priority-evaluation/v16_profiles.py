"""Explicit host-only v1.6 generation route. Never selected by customer metadata.

Custodian admission and independent Claude acceptance must already exist in host
state. This module verifies their binding; it does not grant admissions or reset
spent budgets. Default autopickup and historic Aplomb remain on their old profiles.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import re
import uuid
import fcntl
from contextlib import contextmanager

import measurement_dispatch
import official_scoring_v16 as official_scoring
import pod_runner

STATE_ROOT = pod_runner.STATE_ROOT
ROTATION_TOOL = Path('/home/flori/jevbench-sealed/rotation/rotation.py')


def _sha(path):
    p = Path(path)
    if p.is_symlink() or not p.is_file():
        raise ValueError('unsafe v16 reference')
    return hashlib.sha256(p.read_bytes()).hexdigest()


def measurement_pins(manifest):
    value = json.loads(Path(manifest).read_text())
    if value.get('schema_version') != 1:
        raise ValueError('invalid v16 measurement profile')
    for name, pin in value['code'].items():
        if '..' in Path(name).parts or not re.fullmatch(r'[A-Za-z0-9_/.-]+', name):
            raise ValueError('invalid v16 code inventory')
        measurement_dispatch.checked(pin)
    return {'manifest_sha256': _sha(manifest),
            'driver_sha256': _sha(Path(measurement_dispatch.__file__).parent / 'measurement_driver.py'),
            'profile': value}


def accepted(job_dir):
    """Return host-admitted package and fresh pins, refusing stale source gates."""
    job = Path(job_dir)
    rid = str(uuid.UUID(job.name))
    state = json.loads((STATE_ROOT / 'requests' / (rid + '.json')).read_text())
    path = job / 'review/V16-PROFILE-ADMISSION.json'
    record = state.get('v16_profile_admission', {})
    if record.get('verdict') != 'ACCEPTED' or record.get('receipt_sha256') != _sha(path):
        raise ValueError('v16 admission is not accepted by host')
    admission = json.loads(path.read_text())
    if admission.get('schema_version') != 1 or admission.get('verdict') != 'ACCEPTED' \
            or admission.get('order_id') != rid or admission.get('rotation_tool_sha256') != _sha(ROTATION_TOOL) \
            or not re.fullmatch(r'[a-z0-9-]{1,80}', admission.get('generation', '')):
        raise ValueError('invalid v16 admission')
    independent_path = job / 'review/V16-PROFILE-REVIEW.json'
    independent = json.loads(independent_path.read_text())
    if record.get('independent_review_sha256') != _sha(independent_path) \
            or independent.get('verdict') != 'ACCEPTED' or independent.get('reviewer_engine') != 'claude' \
            or independent.get('admission_sha256') != _sha(path):
        raise ValueError('v16 independent acceptance missing')
    references = admission['references']
    if set(references) != {'measurement', 'scoring', 'freeze', 'id_map'}:
        raise ValueError('invalid v16 reference inventory')
    for ref in references.values():
        if set(ref) != {'path', 'sha256'} or not Path(ref['path']).is_absolute() \
                or _sha(ref['path']) != ref['sha256']:
            raise ValueError('v16 reference changed')
    measured = measurement_pins(references['measurement']['path'])
    scored = official_scoring.pins(['jevbench'], references['scoring']['path'])
    if measured['profile']['code']['pod_drivers/pod_driver.py']['sha256'] != _sha(Path(__file__).parent / 'pod_drivers/pod_driver_v16.py'):
        raise ValueError('v16 profile requires the installed first-party v16 driver')
    if measured['profile'].get('method') != 'jevbench-v16' \
            or measured['profile']['inputs']['jevbench']['count'] != 1500 \
            or scored['profiles']['jevbench'].get('version_prefix') != 'v1.6.':
        raise ValueError('mixed v16 method profiles')
    freeze = json.loads(Path(references['freeze']['path']).read_text())
    input_pin = measured['profile']['inputs']['jevbench']['items']
    if freeze.get('release') != admission.get('draw_release') \
            or freeze['counts']['selfhosted_input'] != 1500 \
            or freeze['input_sha256']['selfhosted'] != input_pin['sha256'] \
            or freeze['file_sha256']['frozen/gold.jsonl'] != scored['profiles']['jevbench']['files']['gold.jsonl']['sha256'] \
            or freeze['file_sha256']['frozen/id-map.json'] != references['id_map']['sha256']:
        raise ValueError('v16 freeze differs from measurement/scoring')
    measurement_dispatch.checked(input_pin)
    gate_path = job / 'review/GATE.json'
    gate = json.loads(gate_path.read_text())
    pins = gate.get('source_pins', {})
    if gate != state.get('source_review_gate') or gate.get('verdict') != 'PASS' \
            or gate.get('review_sha256') != _sha(job / 'review/CODE-REVIEW.md') \
            or pins.get('official_measurement') != measured or pins.get('official_methods') != scored:
        raise ValueError('v16 source gate has stale method pins')
    for name in ('model', 'code'):
        if pins.get(name) != admission.get('source_pins', {}).get(name) \
                or pins[name]['receipt_sha256'] != _sha(job / ('source/FETCH-RECEIPT-' + name + '.json')):
            raise ValueError('v16 source pair changed')
    trusted = pins.get('trusted_runner', {})
    if trusted.get('manifest_sha256') != _sha(job / 'trusted-runner/UPSTREAM-MANIFEST.json'):
        raise ValueError('v16 runner manifest changed')
    for name, digest in trusted.get('files', {}).items():
        if Path(name).name != name or _sha(job / 'trusted-runner' / name) != digest:
            raise ValueError('v16 reviewed runner file changed')
    if not {'RUNTIME.json', 'MEASUREMENT-META.json', 'POD-RECIPE.json'}.issubset(trusted.get('files', {})):
        raise ValueError('v16 runner pins missing')
    if admission.get('recipe_sha256') != _sha(job / 'trusted-runner/POD-RECIPE.json'):
        raise ValueError('v16 recipe changed')
    return admission, measured, scored


@contextmanager
def retirement_lock(admission):
    """The canonical writer lock remains held through the sealed upload."""
    lock = ROTATION_TOOL.parent / '.lock'
    if lock.is_symlink():
        raise ValueError('unsafe canonical rotation lock')
    with lock.open('a') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            _retirement_unlocked(admission)
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def retirement(admission):
    with retirement_lock(admission):
        pass


def _retirement_unlocked(admission):
    """Current metadata-only check immediately before upload; no cohort exemption."""
    if _sha(ROTATION_TOOL) != admission.get('rotation_tool_sha256'):
        raise ValueError('official rotation source changed')
    spec = importlib.util.spec_from_file_location('official_rotation', ROTATION_TOOL)
    rotation = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(rotation)
    # Explicit production paths: environment cannot redirect this check to a test ledger.
    state = rotation.State({'root': str(ROTATION_TOOL.parent),
                            'reserve': str(ROTATION_TOOL.parent / 'reserve-index.jsonl'),
                            'ledger': str(ROTATION_TOOL.parent / 'ledger.jsonl'),
                            'seeds': str(ROTATION_TOOL.parent / 'seeds'),
                            'draws': str(ROTATION_TOOL.parent / 'draws')})
    draw = state.draws[admission['draw_release']]
    if len(draw['S']) != 1200 or len(draw['P']) != 300 \
            or any(state.retired(i) for i in draw['S']):
        raise ValueError('v16 draw currently retired or invalid')
    ids = json.loads(Path(admission['references']['id_map']['path']).read_text())
    selected = {row['item_id'] for row in ids.values()}
    if selected != set(draw['S']) | set(draw['P']):
        raise ValueError('v16 id map differs from admitted draw')


def measure(job_dir):
    """Guarded first-party native run, with original per-order pod budget intact."""
    job = Path(job_dir)
    admission, measured, scored = accepted(job)
    recipe = json.loads((job / 'trusted-runner/POD-RECIPE.json').read_text())
    if recipe.get('kind') not in ('http_typesafe', 'python_inprocess'):
        raise ValueError('v16 route requires reviewed native text recipe')
    retirement(admission)
    output = STATE_ROOT / 'measurements' / job.name / admission['generation'] / 'jevbench'
    @contextmanager
    def pre_upload():
        with retirement_lock(admission):
            if accepted(job) != (admission, measured, scored):
                raise ValueError('v16 admission changed before upload')
            yield
    allocation_gate = None
    state = json.loads((STATE_ROOT / 'requests' / (job.name + '.json')).read_text())
    if state.get('v16_generation_allocation') is not None:
        from v16_allocation import FreshAllocation
        def allocation_recheck():
            if accepted(job) != (admission, measured, scored):
                raise ValueError('v16 allocation admission changed')
            retirement(admission)
        allocation_gate = FreshAllocation(job, admission, allocation_recheck)
    import jeff_runtime_preflight
    def runtime_recheck():
        if accepted(job) != (admission, measured, scored):
            raise ValueError('v16 runtime admission changed')
        retirement(admission)
    if job.name == '81e785ad-081b-4592-99df-1c3d709fd6c8':
        import ryotide_runtime_preflight
        runtime_preflight = ryotide_runtime_preflight.callback(job, admission, recipe, runtime_recheck, output)
    else:
        runtime_preflight = jeff_runtime_preflight.callback(job, admission, recipe, runtime_recheck, output)
    record = pod_runner.run(job.name, job, recipe, output, measured, pod_runner.PER_ORDER_CAP_USD,
                            measurement_pins_factory=lambda: accepted(job)[1], pre_upload_gate=pre_upload, allocation_gate=allocation_gate, runtime_preflight=runtime_preflight)
    retirement(admission)
    accepted(job)
    return record


def score(job_dir, raw):
    """Offline scoring after accepted cohort G_med/common-cost reference exists."""
    admission, measured, scored = accepted(job_dir)
    expected = STATE_ROOT / 'measurements' / Path(job_dir).name / admission['generation'] / 'jevbench'
    if Path(raw).resolve() != (expected / 'raw.jsonl').resolve():
        raise ValueError('v16 raw is not the admitted host generation')
    receipt = json.loads((expected / 'receipt.json').read_text())
    if receipt.get('pins') != measured or receipt.get('raw_sha256') != _sha(raw) or receipt.get('rows') != 1500:
        raise ValueError('v16 raw lacks the admitted host receipt')
    meta = json.loads((Path(job_dir) / 'trusted-runner/MEASUREMENT-META.json').read_text())['jevbench']
    return official_scoring.run('jevbench', raw, meta, scored,
                                manifest=admission['references']['scoring']['path'])


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('inspect', 'measure', 'score'))
    parser.add_argument('job_dir', type=Path)
    args = parser.parse_args()
    if args.action == 'inspect':
        admission, _, _ = accepted(args.job_dir)
        retirement(admission)
        result = {'order_id': admission['order_id'], 'generation': admission['generation'], 'verdict': 'ACCEPTED'}
    elif args.action == 'measure':
        result = measure(args.job_dir)
    else:
        admission, _, _ = accepted(args.job_dir)
        raw = STATE_ROOT / 'measurements' / args.job_dir.name / admission['generation'] / 'jevbench/raw.jsonl'
        result = score(args.job_dir, raw)
    print(json.dumps(result, sort_keys=True, allow_nan=False))
