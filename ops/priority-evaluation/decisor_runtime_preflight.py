"""Fixed first-party Decisor metadata preflight. No customer code or weights loaded."""
import hashlib
import json
import math
import os
import decisor_runtime_inspector as inspector
from pathlib import Path

import measurement_dispatch
import pod_runner

ORDER = '3687485f-5a51-4964-bd9a-73973f3494d7'
IMAGE_DIGEST = '60aee212ef25b0d303213b1c144b32f01403191b923d93d09a610770f8a6ad60'
# First-party metadata inspector; source review and runtime acceptance are separate.
IMAGE = 'docker.io/underlabsai/decisor-sglang@sha256:' + IMAGE_DIGEST
INSPECTOR = Path(__file__).parent / 'decisor_runtime_inspector.py'


def sha(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file(): raise ValueError('unsafe Decisor preflight pin')
    return hashlib.sha256(path.read_bytes()).hexdigest()


SHIM = Path(__file__).parent / 'decisor_shim.py'
SHIM_SHA256 = 'd03b641dd47d9fe44f3c19ec8bc14ad7b83ab0e766101e547f1f120edacb8378'
EXPECTED_SERVICES = [{'argv': ['python3', '-m', 'sglang.launch_server', '--model-path', '/models/decisor-4b', '--host', '127.0.0.1', '--port', '30000', '--mem-fraction-static', '0.80', '--cuda-graph-backend-prefill=disabled', '--disable-radix-cache'], 'env': {'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1', 'HF_HOME': '/tmp/hf', 'TRITON_CACHE_DIR': '/tmp/triton', 'SGLANG_DISABLE_USAGE_STATS': '1', 'DO_NOT_TRACK': '1'}, 'ready_url': 'http://127.0.0.1:30000/health'}, {'argv': ['python3', '/driver/decisor_shim.py'], 'env': {'DECISOR_ENGINE': 'http://127.0.0.1:30000', 'SHIM_PORT': '8090'}, 'ready_url': 'http://127.0.0.1:8090/health'}]

def shim_bytes():
    if sha(SHIM) != SHIM_SHA256:
        raise ValueError('unchanged reviewed Decisor shim differs')
    return SHIM.read_bytes()

def recipe_shape(recipe):
    weights = recipe.get('weights', [])
    if (recipe.get('image') != IMAGE or recipe.get('kind') != 'http_typesafe'
            or recipe.get('model') != 'decisor-4b' or recipe.get('min_vram_gb') != 80
            or recipe.get('endpoint') != 'http://127.0.0.1:8090' or recipe.get('services') != EXPECTED_SERVICES
            or recipe.get('code') != {'commit': '3fd3d9312bff8ec6eade08ba16ce8a6da793e99a', 'tree': '1f300dede1f6a215f4b8db1982841891947c3180'}
            or len(weights) != 1 or weights[0].get('repo') != 'underlabs/decisor-4b'
            or weights[0].get('revision') != '1e7f195c2c41bbedec7d36b034001ef46476914f'
            or weights[0].get('dir') != 'decisor-4b'):
        raise ValueError('Decisor native recipe shape changed')
    shim_bytes()

def shape(job, recipe):
    recipe_shape(recipe)
    runtime = json.loads((Path(job)/'trusted-runner/RUNTIME.json').read_text())
    if (set(runtime) != {'jevbench'} or runtime['jevbench'].get('backend') != 'gpu_pod'
            or runtime['jevbench'].get('model') != 'decisor-4b' or runtime['jevbench'].get('credential') != 'none'
            or runtime['jevbench'].get('price_input_per_m') != .08 or runtime['jevbench'].get('price_output_per_m') != .13):
        raise ValueError('Decisor actual runtime differs')

def metadata_matches(value):
    keys = {'schema_version', 'kind', 'expected_image', 'packages', 'package_origin', 'patches',
            'failures', 'matching', 'customer_source_imported', 'inputs_or_weights_read',
            'native_kernels_proven', 'runtime_admitted'}
    return (isinstance(value, dict) and set(value) == keys and type(value['schema_version']) is int
            and value['schema_version'] == 1 and value['kind'] == 'decisor_metadata_and_patch_bytes_only'
            and value['expected_image'] == IMAGE and value['failures'] == [] and value['matching'] is True
            and value['package_origin'] == inspector.ROOT + '/__init__.py'
            and value['patches'] == inspector.PATCHES and isinstance(value['packages'], dict)
            and set(value['packages']) == set(inspector.REQUIRED)
            and all(isinstance(v, str) and bool(v) for v in value['packages'].values())
            and value['packages']['sglang'] == '0.5.20'
            and all(value[k] is False for k in ['customer_source_imported', 'inputs_or_weights_read',
                                             'native_kernels_proven', 'runtime_admitted']))

def recipe_pin(job, recipe):
    path = Path(job) / 'trusted-runner/POD-RECIPE.json'
    pin = sha(path)
    if json.loads(path.read_text()) != recipe:
        raise ValueError('Decisor actual recipe differs from its admitted file')
    return pin


def retain(destination, report):
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    except FileExistsError:
        raise measurement_dispatch.OperationalHold('decisor_runtime_preflight_receipt_exists')
    with os.fdopen(fd, 'w') as stream:
        stream.write(json.dumps(report, indent=2) + '\n')
        stream.flush()
        os.fsync(stream.fileno())


def callback(job, admission, recipe, recheck, output):
    if Path(job).name != ORDER:
        if admission.get('runtime_preflight') is not None:
            raise ValueError('Decisor preflight cannot select another order')
        return None
    shape(job, recipe)
    binding = admission.get('runtime_preflight')
    import decisor_native_preinput as N
    expected = {'inspector_sha256': sha(INSPECTOR), 'handler_sha256': sha(__file__), 'image': recipe['image'], 'recipe_sha256': recipe_pin(job, recipe), 'native_preinput': N.binding()}
    if binding != expected or recipe['image'].split('@sha256:', 1)[-1] != IMAGE_DIGEST:
        raise ValueError('Decisor runtime preflight needs exact accepted source/image pins')

    frozen_recipe = json.dumps(recipe, sort_keys=True)

    def inspect(provider, pod_id):
        recheck()
        shape(job, recipe)
        if recipe_pin(job, recipe) != expected['recipe_sha256'] or json.dumps(recipe, sort_keys=True) != frozen_recipe or admission.get('runtime_preflight') != expected or sha(INSPECTOR) != expected['inspector_sha256'] \
                or sha(__file__) != expected['handler_sha256']:
            raise ValueError('Decisor runtime preflight pins changed')
        identity = {'image': recipe['image'], 'binding': expected, 'pod_id': pod_id}
        identity_sha = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
        pod_sha = hashlib.sha256(pod_id.encode()).hexdigest()[:16]
        destination = Path(output) / f'runtime-preflight-{pod_sha}-{identity_sha}.json'
        if destination.exists() or destination.is_symlink():
            raise measurement_dispatch.OperationalHold('decisor_runtime_preflight_receipt_exists')
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
                       'underlabsai/decisor-sglang@sha256:' + IMAGE_DIGEST in digests
            report.update(gpu_inventory=inventory.stdout, gpu_inventory_stderr=inventory.stderr,
                          gpu_inventory_exit_code=inventory.returncode,
                          image_inspect_stdout=image_result.stdout, image_inspect_stderr=image_result.stderr,
                          image_inspect_exit_code=image_result.returncode, image_identity_matches=image_ok)

            driver_ok = inventory.returncode == 0 and bool(inventory.stdout.strip())
            for line in inventory.stdout.strip().splitlines():
                try:
                    _, memory, driver = [field.strip() for field in line.split(',')]
                    driver_ok = driver_ok and bool(_) and math.isfinite(float(memory)) and float(memory) >= 79000 and int(driver.split('.')[0]) >= 580
                except (ValueError, TypeError):
                    driver_ok = False
            if not image_ok or not driver_ok:
                raise measurement_dispatch.OperationalHold('decisor_runtime_preflight_mismatch')
            pod_runner._exec(provider, pod_id, ['mkdir', '-p', '/runtime-preflight'])
            provider.scp_to(pod_id, str(INSPECTOR), '/runtime-preflight/inspector.py')
            remote_hash = pod_runner._exec(provider, pod_id, ['sha256sum', '/runtime-preflight/inspector.py'])
            if expected['inspector_sha256'] not in remote_hash.stdout.split():
                raise measurement_dispatch.OperationalHold('decisor_runtime_preflight_pin_changed')
            command = ['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
                       '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp',
                       '-v', '/runtime-preflight/inspector.py:/inspector.py:ro',
                       '--entrypoint', '/usr/bin/env', recipe['image'], '-i',
                       'PATH=/opt/sglang/bin:/usr/local/bin:/usr/bin:/bin', 'HF_TOKEN=', 'OPENAI_API_KEY=',
                       'python3', '-I', '/inspector.py']
            # Preserve output even on a metadata mismatch (exit 2).
            result = provider.exec(pod_id, command, timeout=600)
            report.update(stdout=result.stdout, stderr=result.stderr, exit_code=result.returncode, driver_ok=driver_ok)
            try: metadata = json.loads(result.stdout)
            except (ValueError, TypeError): metadata = {}
            report['metadata'] = metadata
            if not image_ok or result.returncode != 0 or not metadata_matches(metadata) or not driver_ok:
                raise measurement_dispatch.OperationalHold('decisor_runtime_preflight_mismatch')
        except Exception as error:
            report['collection_error_type'] = type(error).__name__
            raise
        finally:
            retain(destination, report)
        recheck()
        shape(job, recipe)
        if json.dumps(recipe, sort_keys=True) != frozen_recipe:
            raise ValueError('Decisor recipe changed after metadata inspection')
        return report
    def after_weights(provider, pod_id, report, code_tar):
        recheck()
        shape(job, recipe)
        if admission.get('runtime_preflight') != expected or sha(__file__) != expected['handler_sha256'] or N.binding() != expected['native_preinput']:
            raise ValueError('Decisor native pre-input accepted pins changed')
        N.identity(job, pod_id, recipe, report)
        destination = Path(report['receipt_path']).with_name(Path(report['receipt_path']).stem + '-native.json')
        # Durable exclusive claim precedes any native service start; a crash is not a retry grant.
        retain(destination.with_suffix('.claim.json'), {'pod_id': pod_id, 'binding': expected, 'native_proof_started': True})
        native = dict(report)
        try:
            N.prove(provider, pod_id, job, recipe, native, code_tar, recheck)
        except Exception as error:
            native['native_collection_error_type'] = type(error).__name__
            raise
        finally:
            retain(destination, native)
        return native
    inspect.after_weights = after_weights
    return inspect
