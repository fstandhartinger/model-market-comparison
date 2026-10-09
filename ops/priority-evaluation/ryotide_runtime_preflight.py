"""Fixed first-party RYOTIDE metadata preflight. No customer code or weights loaded."""
import hashlib
import json
import math
import os
import ryotide_runtime_inspector as inspector
from pathlib import Path

import measurement_dispatch
import pod_runner

ORDER = '81e785ad-081b-4592-99df-1c3d709fd6c8'
IMAGE_DIGEST = '8a69ffad015f138d7170c4ddc429e230a3bc1c1719f67e14324749df200a4b90'
# First-party metadata inspector; source review and runtime acceptance are separate.
IMAGE = 'vllm/vllm-openai:v0.30.0@sha256:' + IMAGE_DIGEST
INSPECTOR = Path(__file__).parent / 'ryotide_runtime_inspector.py'


def sha(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file(): raise ValueError('unsafe RYOTIDE preflight pin')
    return hashlib.sha256(path.read_bytes()).hexdigest()


def shape(job, recipe):
    expected_service = {'argv': ['python3', '-m', 'ryotide.server', '--preset', 'ryotide-qwen9',
                                '--model', '/models/Qwen3.5-9B', '--device', 'cuda',
                                '--host', '127.0.0.1', '--port', '8778'],
                        'env': {'PYTHONPATH': '/code/src:/code/vendor/jevbench',
                                'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1',
                                'HF_HUB_DISABLE_TELEMETRY': '1', 'TOKENIZERS_PARALLELISM': 'false'},
                        'ready_url': 'http://127.0.0.1:8778/health'}
    runtime = json.loads((Path(job) / 'trusted-runner/RUNTIME.json').read_text())
    expected_runtime = {'jevbench': {'backend': 'gpu_pod', 'model': 'RYOTIDE-Qwen9',
                                    'credential': 'none', 'price_input_per_m': .08,
                                    'price_output_per_m': .13}}
    weights = recipe.get('weights', [])
    if runtime != expected_runtime or recipe.get('image') != IMAGE or recipe.get('kind') != 'http_typesafe' \
            or recipe.get('model') != 'RYOTIDE-Qwen9' or recipe.get('min_vram_gb') != 24 \
            or recipe.get('endpoint') != 'http://127.0.0.1:8778' or recipe.get('services') != [expected_service] \
            or len(weights) != 1 or weights[0].get('repo') != 'Qwen/Qwen3.5-9B' \
            or weights[0].get('revision') != 'c202236235762e1c871ad0ccb60c8ee5ba337b9a' \
            or weights[0].get('dir') != 'Qwen3.5-9B':
        raise ValueError('RYOTIDE preflight runtime/recipe shape changed')


def metadata_matches(value):
    keys = {'schema_version', 'kind', 'expected_image_identity', 'image_identity_proven',
            'python', 'packages', 'gcc_path', 'standard_c_headers', 'python_headers',
            'credential_variable_names_present', 'metadata_requirements_satisfied', 'failures',
            'customer_source_imported', 'model_loaded', 'native_kernels_proven',
            'runtime_admitted', 'next_gate'}
    if not isinstance(value, dict) or set(value) != keys or type(value['schema_version']) is not int \
            or value['schema_version'] != 1 or value['kind'] != 'upstream_metadata_only' \
            or value['expected_image_identity'] != IMAGE or value['failures'] != [] \
            or value['credential_variable_names_present'] != [] \
            or value['metadata_requirements_satisfied'] is not True \
            or value['python_headers'] is not True or not value['gcc_path'] \
            or value['standard_c_headers'] not in [['/usr/include/stdio.h'], ['/usr/local/include/stdio.h'],
                                                 ['/usr/include/stdio.h', '/usr/local/include/stdio.h']] \
            or inspector.version_pair(value['python']) != (3, 12):
        return False
    if any(value[key] is not False for key in ['image_identity_proven', 'customer_source_imported',
                                              'model_loaded', 'native_kernels_proven', 'runtime_admitted']):
        return False
    packages = value['packages']
    if not isinstance(packages, dict) or set(packages) != set(inspector.REQUIRED):
        return False
    for name, item in packages.items():
        if not isinstance(item, dict) or set(item) != {'version', 'requires_dist'} \
                or not isinstance(item['version'], str) or not item['version'] \
                or not isinstance(item['requires_dist'], list) \
                or any(not isinstance(dep, str) for dep in item['requires_dist']):
            return False
        if name in inspector.MINIMUM:
            pair = inspector.version_pair(item['version'])
            if pair is None or pair < inspector.MINIMUM[name]:
                return False
    return packages['flash-linear-attention']['version'] == packages['fla-core']['version']


def recipe_pin(job, recipe):
    path = Path(job) / 'trusted-runner/POD-RECIPE.json'
    pin = sha(path)
    if json.loads(path.read_text()) != recipe:
        raise ValueError('RYOTIDE actual recipe differs from its admitted file')
    return pin


def retain(destination, report):
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    except FileExistsError:
        raise measurement_dispatch.OperationalHold('ryotide_runtime_preflight_receipt_exists')
    with os.fdopen(fd, 'w') as stream:
        stream.write(json.dumps(report, indent=2) + '\n')
        stream.flush()
        os.fsync(stream.fileno())


def callback(job, admission, recipe, recheck, output):
    if Path(job).name != ORDER:
        if admission.get('runtime_preflight') is not None:
            raise ValueError('RYOTIDE preflight cannot select another order')
        return None
    shape(job, recipe)
    binding = admission.get('runtime_preflight')
    expected = {'inspector_sha256': sha(INSPECTOR), 'handler_sha256': sha(__file__), 'image': recipe['image'], 'recipe_sha256': recipe_pin(job, recipe)}
    supplemented = isinstance(binding, dict) and 'supplement' in binding
    if supplemented:
        import ryotide_runtime_supplement as supplement
        supplement.check_context()
        expected['supplement'] = supplement.binding()
    if binding != expected or recipe['image'].split('@sha256:', 1)[-1] != IMAGE_DIGEST:
        raise ValueError('RYOTIDE runtime preflight needs exact accepted source/image pins')

    frozen_recipe = json.dumps(recipe, sort_keys=True)

    def inspect(provider, pod_id):
        recheck()
        shape(job, recipe)
        if recipe_pin(job, recipe) != expected['recipe_sha256'] or json.dumps(recipe, sort_keys=True) != frozen_recipe or admission.get('runtime_preflight') != expected or sha(INSPECTOR) != expected['inspector_sha256'] \
                or sha(__file__) != expected['handler_sha256']:
            raise ValueError('RYOTIDE runtime preflight pins changed')
        identity = {'image': recipe['image'], 'binding': expected, 'pod_id': pod_id}
        identity_sha = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
        pod_sha = hashlib.sha256(pod_id.encode()).hexdigest()[:16]
        destination = Path(output) / f'runtime-preflight-{pod_sha}-{identity_sha}.json'
        if destination.exists() or destination.is_symlink():
            raise measurement_dispatch.OperationalHold('ryotide_runtime_preflight_receipt_exists')
        report = dict(identity, host_metadata_sha256=identity_sha, receipt_path=str(destination))
        try:
            inventory = provider.exec(pod_id, ['nvidia-smi', '--query-gpu=name,memory.total,driver_version',
                                                           '--format=csv,noheader,nounits'], timeout=60)
            image_result = provider.exec(pod_id, ['docker', 'image', 'inspect', IMAGE,
                                                 '--format', '{{json .RepoDigests}}'], timeout=60)
            try:
                digests = json.loads(image_result.stdout)
            except (ValueError, TypeError):
                digests = None
            image_ok = image_result.returncode == 0 and isinstance(digests, list) and \
                       'vllm/vllm-openai@sha256:' + IMAGE_DIGEST in digests
            report.update(gpu_inventory=inventory.stdout, gpu_inventory_stderr=inventory.stderr,
                          gpu_inventory_exit_code=inventory.returncode,
                          image_inspect_stdout=image_result.stdout, image_inspect_stderr=image_result.stderr,
                          image_inspect_exit_code=image_result.returncode, image_identity_matches=image_ok)
    
            driver_ok = inventory.returncode == 0 and bool(inventory.stdout.strip())
            for line in inventory.stdout.strip().splitlines():
                try:
                    _, memory, driver = [field.strip() for field in line.split(',')]
                    driver_ok = driver_ok and bool(_) and math.isfinite(float(memory)) and float(memory) >= 23000 and int(driver.split('.')[0]) >= 580
                except (ValueError, TypeError):
                    driver_ok = False
            if not image_ok or not driver_ok:
                raise measurement_dispatch.OperationalHold('ryotide_runtime_preflight_mismatch')
            effective = supplement.build(provider, pod_id, recheck, report) if supplemented else recipe['image']
            pod_runner._exec(provider, pod_id, ['mkdir', '-p', '/runtime-preflight'])
            provider.scp_to(pod_id, str(INSPECTOR), '/runtime-preflight/inspector.py')
            remote_hash = pod_runner._exec(provider, pod_id, ['sha256sum', '/runtime-preflight/inspector.py'])
            if expected['inspector_sha256'] not in remote_hash.stdout.split():
                raise measurement_dispatch.OperationalHold('ryotide_runtime_preflight_pin_changed')
            command = ['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
                       '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp',
                       '-v', '/runtime-preflight/inspector.py:/inspector.py:ro',
                       '--entrypoint', '/usr/bin/env', effective, '-i',
                       'PATH=/opt/venv/bin:/usr/local/bin:/usr/bin:/bin', 'HF_TOKEN=', 'OPENAI_API_KEY=',
                       'python3', '-I', '/inspector.py']
            # Preserve output even on a metadata mismatch (exit 2).
            result = provider.exec(pod_id, command, timeout=600)
            report.update(stdout=result.stdout, stderr=result.stderr, exit_code=result.returncode, driver_ok=driver_ok)
            try: metadata = json.loads(result.stdout)
            except (ValueError, TypeError): metadata = {}
            report['metadata'] = metadata
            if not image_ok or result.returncode != 0 or not metadata_matches(metadata) or not driver_ok:
                raise measurement_dispatch.OperationalHold('ryotide_runtime_preflight_mismatch')
        except Exception as error:
            report['collection_error_type'] = type(error).__name__
            raise
        finally:
            retain(destination, report)
        recheck()
        shape(job, recipe)
        if json.dumps(recipe, sort_keys=True) != frozen_recipe:
            raise ValueError('RYOTIDE recipe changed after metadata inspection')
        return report
    if supplemented:
        def after_weights(provider, pod_id, report, code_tar):
            recheck()
            shape(job, recipe)
            if admission.get('runtime_preflight') != expected or supplement.binding() != expected['supplement']:
                raise ValueError('RYOTIDE supplement binding drift')
            destination = Path(report['receipt_path']).with_name(Path(report['receipt_path']).stem + '-native.json')
            if destination.exists() or destination.is_symlink():
                raise measurement_dispatch.OperationalHold('ryotide_native_proof_receipt_exists')
            native = dict(report)
            try:
                supplement.prove(provider, pod_id, job, recipe, native, code_tar, recheck)
            except Exception as error:
                native['native_proof_error_type'] = type(error).__name__
                raise
            finally:
                retain(destination, native)
            return native
        inspect.after_weights = after_weights
        inspect.supplemented = True
    return inspect
