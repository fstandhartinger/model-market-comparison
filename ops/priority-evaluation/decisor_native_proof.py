"""Owned-pod-only synthetic proof through unchanged Decisor services; stdlib only.
Importing this module does not start services or read model/source files.
"""
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import time
import urllib.request

CASES = [
    ('choice', {'A': 'Circle', 'B': 'Square'}),
    ('noul', {'true': 'Present', 'false': 'Absent'}),
    ('score', ['Low', 'Medium', 'High']),
]
STATE = 'Synthetic shape inventory: one blue circle. No benchmark item.'
INSTRUCTION = 'Select the level or option that describes the stated shape inventory.'
MAX_TRACE_BYTES = 64 * 1024 * 1024


def digest(path):
    p = Path(path)
    if p.is_symlink() or not p.is_file():
        raise ValueError('unsafe proof file')
    h = hashlib.sha256()
    with p.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def verify_answer(value, qtype):
    if (not isinstance(value, dict) or set(value) != {'model', 'answers', 'usage'}
            or value['model'] != 'decisor-4b' or set(value['answers']) != {'decision'}):
        raise ValueError('native answer envelope')
    usage = value['usage']
    if (set(usage) != {'prompt_tokens', 'completion_tokens'}
            or type(usage['prompt_tokens']) is not int or usage['prompt_tokens'] <= 0
            or type(usage['completion_tokens']) is not int or usage['completion_tokens'] != 1):
        raise ValueError('native usage')
    a = value['answers']['decision']
    if a.get('type') != qtype:
        raise ValueError('native answer type')
    if qtype == 'noul':
        if set(a) != {'type', 'noul'} or type(a['noul']) not in (float, int) or not math.isfinite(a['noul']) or not 0 <= a['noul'] <= 1:
            raise ValueError('native noul probability')
    else:
        keys = {'A', 'B'} if qtype == 'choice' else {'0', '1', '2'}
        readout = 'choice' if qtype == 'choice' else 'score'
        if set(a) != {'type', 'probabilities', readout} or not isinstance(a['probabilities'], dict) or set(a['probabilities']) != keys:
            raise ValueError('native probability vector')
        vals = list(a['probabilities'].values())
        if any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 1 for v in vals) or not math.isclose(sum(vals), 1, abs_tol=1e-5):
            raise ValueError('native normalized probability vector')
        if qtype == 'choice' and a[readout] not in keys:
            raise ValueError('native choice readout')
        if qtype == 'score' and (type(a[readout]) is not int or str(a[readout]) not in keys):
            raise ValueError('native score readout')
    return True


def kernel_summary(events):
    kernels = [e for e in events if isinstance(e, dict) and e.get('cat') == 'kernel'
               and type(e.get('dur')) in (int, float) and math.isfinite(e['dur']) and e['dur'] > 0
               and type(e.get('args', {}).get('device')) is int and e['args']['device'] >= 0
               and isinstance(e.get('name'), str) and 0 < len(e['name']) <= 500]
    if not kernels:
        raise ValueError('no actual CUDA kernel events')
    return {'cuda_kernel_events': len(kernels), 'cuda_kernel_names': sorted({e['name'] for e in kernels})[:512]}


def trace_summary(directory):
    paths = sorted(p for p in directory.rglob('*') if p.is_file())
    if not 1 <= len(paths) <= 16:
        raise ValueError('bounded fresh profiler output missing')
    events, hashes = [], {}
    total = 0
    for p in paths:
        if p.is_symlink() or not (p.name.endswith('.json') or p.name.endswith('.json.gz')):
            raise ValueError('unexpected profiler file')
        opener = gzip.open if p.name.endswith('.gz') else open
        with opener(p, 'rb') as stream:
            raw = stream.read(MAX_TRACE_BYTES + 1 - total)
        total += len(raw)
        if total > MAX_TRACE_BYTES:
            raise ValueError('profiler output too large')
        document = json.loads(raw)
        if not isinstance(document, dict) or not isinstance(document.get('traceEvents'), list):
            raise ValueError('CUDA trace schema')
        events.extend(document['traceEvents'])
        hashes[str(p.relative_to(directory))] = digest(p)
    return dict(kernel_summary(events), trace_sha256=hashes)


def request(url, payload=None, timeout=120, *, expect_json=True):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        raw = response.read(1024 * 1024 + 1)
    if len(raw) > 1024 * 1024:
        raise ValueError('native HTTP response too large')
    return (json.loads(raw) if raw else {}) if expect_json else None


def wait_ready(url, children):
    until = time.monotonic() + 480
    while time.monotonic() < until:
        if any(child.poll() is not None for child in children):
            raise ValueError('native service exited')
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status != 200:
                    raise ValueError('native service health')
            return
        except (OSError, ValueError):
            time.sleep(1)
    raise ValueError('native service startup timeout')


def main():
    config = json.loads(Path('/proof-config.json').read_text())
    identity = config['identity']
    if digest('/proof.py') != identity['native_binding']['proof_sha256'] or digest('/driver/decisor_shim.py') != identity['native_binding']['shim_sha256']:
        raise ValueError('actual proof/shim pin')
    if digest('/code/sdks/python/decisor.py') != '72e70b147ec06b1abca4ce2bf75b644621e8dd58e3db0a700b0e72f1a52230b6':
        raise ValueError('actual native SDK pin')
    for relative, expected in config['weights'].items():
        if digest(Path('/models/decisor-4b') / relative) != expected:
            raise ValueError('actual native checkpoint bytes')
    children, results = [], []
    # Image environment retains its CUDA linker paths; every admitted service env is unchanged.
    try:
        for number, service in enumerate(config['services']):
            env = dict(os.environ, **service['env'], OPENAI_API_KEY='', HF_TOKEN='')
            log = open('/tmp/native-service-%d.log' % number, 'wb')
            try:
                children.append(subprocess.Popen(service['argv'], env=env, stdout=log, stderr=subprocess.STDOUT))
            finally:
                log.close()
            wait_ready(service['ready_url'], children)
        for qtype, criteria in CASES:
            directory = Path('/tmp/decisor-proof') / qtype
            directory.mkdir(parents=True, exist_ok=False)
            request('http://127.0.0.1:30000/start_profile', {'output_dir': str(directory), 'activities': ['CPU', 'GPU'], 'with_stack': False, 'record_shapes': False}, expect_json=False)
            try:
                answer = request('http://127.0.0.1:8090/v1/systemone', {'state': STATE, 'questions': {'decision': {'type': qtype, 'instructions': INSTRUCTION, 'criteria': criteria}}})
                verify_answer(answer, qtype)
            finally:
                request('http://127.0.0.1:30000/stop_profile', {}, expect_json=False)
            # SGLang stop_profile exports synchronously; empty traces refuse rather than retry.
            results.append(dict(type=qtype, response_sha256=hashlib.sha256(json.dumps(answer, sort_keys=True).encode()).hexdigest(), schema_and_probabilities_accepted=True, **trace_summary(directory)))
        print(json.dumps({'schema_version': 1, 'kind': 'decisor_native_synthetic_preinput', 'identity': identity,
                          'model': 'decisor-4b', 'revision': '1e7f195c2c41bbedec7d36b034001ef46476914f',
                          'checkpoint_sha256': config['weights'], 'unchanged_service_argv': [s['argv'] for s in config['services']],
                          'tested_types': ['choice', 'noul', 'score'], 'results': results,
                          'input_dispatched': False, 'scored': False, 'inference_requests': 3}))
    finally:
        for child in reversed(children):
            if child.poll() is None:
                child.terminate()
                try: child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    child.kill(); child.wait(timeout=10)


if __name__ == '__main__':
    main()
