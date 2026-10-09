"""Fixed first-party Jeff metadata preflight. No customer code or weights loaded."""
import hashlib
import json
from pathlib import Path

import measurement_dispatch
import pod_runner

ORDER = '263849ac-16c4-4a89-97d6-91355529c9b3'
IMAGE_DIGEST = '8a69ffad015f138d7170c4ddc429e230a3bc1c1719f67e14324749df200a4b90'
# The final independent delta review covers the inspector including Python.h.
INSPECTOR = Path(__file__).parent / 'jeff_runtime_inspector.py'


def sha(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file(): raise ValueError('unsafe Jeff preflight pin')
    return hashlib.sha256(path.read_bytes()).hexdigest()


def callback(job, admission, recipe, recheck, output):
    if Path(job).name != ORDER:
        if admission.get('runtime_preflight') is not None:
            raise ValueError('Jeff preflight cannot select another order')
        return None
    binding = admission.get('runtime_preflight')
    expected = {'inspector_sha256': sha(INSPECTOR), 'handler_sha256': sha(__file__), 'image': recipe['image']}
    if binding != expected or recipe['image'].split('@sha256:', 1)[-1] != IMAGE_DIGEST:
        raise ValueError('Jeff runtime preflight needs exact accepted source/image pins')

    def inspect(provider, pod_id):
        recheck()
        if admission.get('runtime_preflight') != expected or sha(INSPECTOR) != expected['inspector_sha256'] \
                or sha(__file__) != expected['handler_sha256']:
            raise ValueError('Jeff runtime preflight pins changed')
        identity = {'image': recipe['image'], 'binding': expected, 'pod_id': pod_id}
        identity_sha = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
        pod_sha = hashlib.sha256(pod_id.encode()).hexdigest()[:16]
        destination = Path(output) / f'runtime-preflight-{pod_sha}-{identity_sha}.json'
        if destination.exists() or destination.is_symlink():
            raise measurement_dispatch.OperationalHold('jeff_runtime_preflight_receipt_exists')
        report = dict(identity, host_metadata_sha256=identity_sha, receipt_path=str(destination))
        inventory = provider.exec(pod_id, ['nvidia-smi', '--query-gpu=name,memory.total,driver_version',
                                                       '--format=csv,noheader,nounits'], timeout=60)
        report['gpu_inventory'] = inventory.stdout
        driver_ok = inventory.returncode == 0 and bool(inventory.stdout.strip())
        for line in inventory.stdout.strip().splitlines():
            try:
                _, memory, driver = [field.strip() for field in line.split(',')]
                driver_ok = driver_ok and float(memory) >= 79000 and int(driver.split('.')[0]) >= 580
            except (ValueError, TypeError):
                driver_ok = False
        pod_runner._exec(provider, pod_id, ['mkdir', '-p', '/runtime-preflight'])
        provider.scp_to(pod_id, str(INSPECTOR), '/runtime-preflight/inspector.py')
        remote_hash = pod_runner._exec(provider, pod_id, ['sha256sum', '/runtime-preflight/inspector.py'])
        if expected['inspector_sha256'] not in remote_hash.stdout.split():
            raise measurement_dispatch.OperationalHold('jeff_runtime_preflight_pin_changed')
        command = ['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
                   '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp',
                   '-v', '/runtime-preflight/inspector.py:/inspector.py:ro',
                   '--entrypoint', '/usr/bin/env', recipe['image'], '-i',
                   'PATH=/opt/venv/bin:/usr/local/bin:/usr/bin:/bin', 'HF_TOKEN=', 'OPENAI_API_KEY=',
                   'python3', '-I', '/inspector.py']
        # Preserve output even on a metadata mismatch (exit 2).
        result = provider.exec(pod_id, command, timeout=600)
        report.update(stdout=result.stdout, stderr=result.stderr, exit_code=result.returncode, driver_ok=driver_ok)
        try: metadata = json.loads(result.stdout)
        except (ValueError, TypeError): metadata = {}
        report['metadata'] = metadata
        destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        # Exclusive creation retains every pod's mismatch output and refuses
        # replacing evidence if the same attempt is invoked twice.
        with destination.open('x') as stream:
            stream.write(json.dumps(report, indent=2) + '\n')
        if result.returncode != 0 or metadata.get('matching') is not True or not driver_ok:
            raise measurement_dispatch.OperationalHold('jeff_runtime_preflight_mismatch')
        recheck()
        return report
    return inspect
