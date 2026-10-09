"""Literal Decisor-only native proof coordinator. No host model/customer imports."""
import hashlib
import io
import json
import re
import tarfile
import tempfile
from pathlib import Path, PurePosixPath
import pod_runner

ORDER = '3687485f-5a51-4964-bd9a-73973f3494d7'
HERE = Path(__file__).parent
CODE_SHA = '4e173fbad381c853eec43537124cda8dfabc230b4fa37ed0c2593d2d6e0b7000'


def sha(path):
    p = Path(path)
    if p.is_symlink() or not p.is_file() or p.stat().st_size > 1024 * 1024:
        raise ValueError('native source pin')
    return hashlib.sha256(p.read_bytes()).hexdigest()


def binding():
    return {'module_sha256': sha(__file__), 'proof_sha256': sha(HERE / 'decisor_native_proof.py'),
            'shim_sha256': sha(HERE / 'decisor_shim.py'), 'code_archive_sha256': CODE_SHA}


def identity(job, pod_id, recipe, report):
    import decisor_runtime_preflight as P
    P.recipe_shape(recipe)
    if (Path(job).name != ORDER or not isinstance(pod_id, str) or not pod_id
            or report.get('pod_id') != pod_id or report.get('image') != P.IMAGE
            or report.get('image_identity_matches') is not True or report.get('driver_ok') is not True
            or not P.metadata_matches(report.get('metadata')) or report.get('binding', {}).get('native_preinput') != binding()):
        raise ValueError('native proof requires exact same-pod metadata binding')
    return {'order': ORDER, 'pod_id': pod_id, 'image': P.IMAGE, 'native_binding': binding(),
            'recipe_sha256': P.recipe_pin(job, recipe), 'code': recipe['code'],
            'model_revision': recipe['weights'][0]['revision'], 'metadata_identity_sha256': report['host_metadata_sha256']}


def validate_archive(data):
    if type(data) is not bytes or len(data) > 1024 * 1024 or hashlib.sha256(data).hexdigest() != CODE_SHA:
        raise ValueError('exact original source archive required')
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:') as archive:
        members = archive.getmembers()
        if not 1 <= len(members) <= 100:
            raise ValueError('source-only archive inventory')
        for member in members:
            p = PurePosixPath(member.name)
            if p.is_absolute() or '..' in p.parts or not (member.isfile() or member.isdir()):
                raise ValueError('unsafe source-only archive')


def proof_matches(value, expected, recipe):
    if not isinstance(value, dict) or set(value) != {'schema_version', 'kind', 'identity', 'model', 'revision', 'checkpoint_sha256', 'unchanged_service_argv', 'tested_types', 'results', 'input_dispatched', 'scored', 'inference_requests'}:
        return False
    if (type(value['schema_version']) is not int or value['schema_version'] != 1 or value['kind'] != 'decisor_native_synthetic_preinput'
            or value['identity'] != expected or value['model'] != 'decisor-4b' or value['revision'] != recipe['weights'][0]['revision']
            or value['checkpoint_sha256'] != recipe['weights'][0]['sha256']
            or value['unchanged_service_argv'] != [s['argv'] for s in recipe['services']]
            or value['tested_types'] != ['choice', 'noul', 'score'] or value['input_dispatched'] is not False or value['scored'] is not False
            or type(value['inference_requests']) is not int or value['inference_requests'] != 3
            or not isinstance(value['results'], list) or len(value['results']) != 3):
        return False
    for result, qtype in zip(value['results'], value['tested_types']):
        if (not isinstance(result, dict) or set(result) != {'type', 'response_sha256', 'schema_and_probabilities_accepted', 'cuda_kernel_events', 'cuda_kernel_names', 'trace_sha256'}
                or result['type'] != qtype or result['schema_and_probabilities_accepted'] is not True
                or type(result['cuda_kernel_events']) is not int or result['cuda_kernel_events'] <= 0
                or not isinstance(result['cuda_kernel_names'], list) or not 1 <= len(result['cuda_kernel_names']) <= 512
                or any(not isinstance(n, str) or not 1 <= len(n) <= 500 for n in result['cuda_kernel_names'])
                or not isinstance(result['trace_sha256'], dict) or not 1 <= len(result['trace_sha256']) <= 16
                or any(not isinstance(h, str) or re.fullmatch('[a-f0-9]{64}', h) is None for h in [result['response_sha256'], *result['trace_sha256'].values()])):
            return False
    return True


def accepted(job, pod_id, recipe, report):
    expected = identity(job, pod_id, recipe, report)
    if report.get('native_proof_accepted') is not True or type(report.get('native_proof_exit_code')) is not int or report['native_proof_exit_code'] != 0 or not proof_matches(report.get('native_proof'), expected, recipe):
        raise ValueError('Decisor actual native pre-input proof missing')
    return True


def prove(provider, pod_id, job, recipe, report, code_tar, recheck):
    recheck()
    expected = identity(job, pod_id, recipe, report)
    validate_archive(code_tar)
    root = '/runtime-preflight/decisor-native'
    pod_runner._exec(provider, pod_id, ['mkdir', root])  # exact path must be new; no repeated proof
    pod_runner._exec(provider, pod_id, ['mkdir', root + '/code'])
    config = {'identity': expected, 'services': recipe['services'], 'weights': recipe['weights'][0]['sha256']}
    with tempfile.TemporaryDirectory(prefix='decisor-public-proof-') as temporary:
        paths = {'code.tar': code_tar, 'proof-config.json': (json.dumps(config, sort_keys=True) + '\n').encode()}
        for name, data in paths.items():
            path = Path(temporary) / name; path.write_bytes(data)
            provider.scp_to(pod_id, str(path), root + '/' + name)
            if hashlib.sha256(data).hexdigest() not in pod_runner._exec(provider, pod_id, ['sha256sum', root + '/' + name]).stdout.split():
                raise ValueError('native proof data transfer hash')
    pod_runner._exec(provider, pod_id, ['tar', '-xf', root + '/code.tar', '-C', root + '/code'])
    for name, remote in [('decisor_native_proof.py', 'proof.py'), ('decisor_shim.py', 'shim.py')]:
        source = HERE / name
        provider.scp_to(pod_id, str(source), root + '/' + remote)
        if sha(source) not in pod_runner._exec(provider, pod_id, ['sha256sum', root + '/' + remote]).stdout.split():
            raise ValueError('native proof source transfer hash')
    recheck()
    if identity(job, pod_id, recipe, report) != expected:
        raise ValueError('native proof identity drift')
    command = ['docker', 'run', '--rm', '--gpus', 'all', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
               '--security-opt', 'no-new-privileges', '--shm-size', '16g', '--tmpfs', '/tmp:exec,size=16g',
               '-v', root + '/code:/code:ro', '-v', '/models/decisor-4b:/models/decisor-4b:ro',
               '-v', root + '/proof.py:/proof.py:ro', '-v', root + '/shim.py:/driver/decisor_shim.py:ro',
               '-v', root + '/proof-config.json:/proof-config.json:ro', '--entrypoint', '/usr/bin/env', expected['image'],
               'OPENAI_API_KEY=', 'HF_TOKEN=', 'HOME=/tmp', 'HF_HUB_OFFLINE=1', 'TRANSFORMERS_OFFLINE=1', 'python3', '-I', '/proof.py']
    # Keep image-owned CUDA environment like the unchanged scored services; no host environment is forwarded.
    result = provider.exec(pod_id, command, timeout=1200)
    report.update(native_proof_exit_code=result.returncode, native_proof_stderr=result.stderr)
    try: value = json.loads(result.stdout)
    except (ValueError, TypeError): value = None
    report['native_proof'] = value
    if result.returncode != 0 or not proof_matches(value, expected, recipe):
        raise ValueError('Decisor native synthetic CUDA proof failed')
    recheck()
    if identity(job, pod_id, recipe, report) != expected:
        raise ValueError('native proof identity changed after execution')
    report['native_proof_accepted'] = True
    return report
