"""Verda (DataCrunch) provider for pod_runner.run: sealed fast-lane runs off marketplace GPUs.

DECISIONS 17 Oct 2026 19:00Z (lium-sealed-data-ban) and custody #21023(3): sealed JevBench inputs never go to Lium or
another marketplace GPU; Verda is an allowed tier-1 host. This class implements the pod_runner Provider interface
for one pay-as-you-go Verda VM per attempt, so the unchanged pod_runner lifecycle (pinned image, offline supplement
build, sha-verified weights, `--network none` run container, receipts, exact-ID teardown) applies as on Lium.

- Accounting: gpu-pod-guard reserve/attach/release with `--provider verda` (same fields as Lium).
- Create: exact instance type per GPU name, first location that lists it, the documented Docker image, our
  registered ssh key only; waits for `running` + ssh, then checks the GPU and the docker nvidia runtime.
- Dead-man: right after create a transient user timer deletes this exact instance id at TTL + 15 min, in case the
  host process dies; `rm` deletes by exact id and stops that timer.
- No credential reaches the VM: the API secret stays host-side (~/.config/verda.env); the VM only has our public key.
"""
import json
import shlex
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import pod_runner

API = 'https://api.verda.com/v1'
ENV_FILE = Path.home() / '.config/verda.env'
SSH_KEY = Path.home() / '.ssh/reax_node_ed25519'
SSH_KEY_ID = 'e1097703-a557-408c-9061-ae2904817d88'  # "reax-node", registered on the Verda account
IMAGE = '24.04.cuda12.9.docker'
OS_VOLUME_GB = 200
INSTANCE_TYPES = {'H100': '1H100.80S.30V', 'A100': '1A100.22V', 'L40S': '1L40S.20V', 'RTX6000': '1RTX6000ADA.10V'}
DEADMAN_GRACE_S = 900
CREATE_WAIT_S = 900


def _env():
    values = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip().removeprefix('export ')
        if '=' in line and not line.startswith('#'):
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"\'')
    return values


def _request(method, path, body=None, token=None):
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'jevbench-fastlane/1.0'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(API + path, method=method, headers=headers, data=data)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            text = response.read().decode()
            try:
                return response.status, json.loads(text)
            except ValueError:
                return response.status, text
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode()[:500]


def api(method, path, body=None):
    env = _env()
    status, token = _request('POST', '/oauth2/token', {'grant_type': 'client_credentials',
                                                        'client_id': env['VERDA_CLIENT_ID'],
                                                        'client_secret': env['VERDA_CLIENT_SECRET']})
    if status != 200 or not isinstance(token, dict):
        raise pod_runner.PodRunError('verda auth failed')
    return _request(method, path, body, token['access_token'])


def delete_instance(instance_id):
    status, _ = api('PUT', '/instances', {'action': 'delete', 'id': instance_id, 'delete_permanently': True})
    return 200 <= status < 300


class VerdaProvider(pod_runner.Provider):
    name = 'verda'

    def __init__(self, order_id, label):
        self._order_id = order_id
        self._label = label  # hostname prefix, e.g. fastlane-8a93f2a0
        self._hosts = {}
        self._known_hosts = Path.home() / '.local/state/priority-evaluation/verda_known_hosts'

    # -- accounting (identical fields to LiumProvider, provider verda) --
    def reserve(self, job, name, hourly, cost_cap, hours):
        result = pod_runner._run_cli([str(pod_runner.GUARD), 'reserve', '--job', job, '--provider', 'verda',
                                      '--name', name, '--hourly-price', str(pod_runner.MAX_HOURLY_USD),
                                      '--max-hourly-price', str(pod_runner.MAX_HOURLY_USD), '--cost-cap', str(cost_cap),
                                      '--runtime-hours', str(hours)], timeout=60)
        if result.returncode:
            raise pod_runner.PodCapacityError('guard reserve failed: ' + result.stderr.strip()[-200:])
        import re
        match = re.search(r'gpu-[0-9a-f]{24}', result.stdout)
        if not match:
            raise pod_runner.PodCapacityError('guard reserve returned no reservation id')
        return match.group(0)

    def attach(self, reservation, job, pod_id, hourly):
        result = pod_runner._run_cli([str(pod_runner.GUARD), 'attach', '--reservation-id', reservation, '--job', job,
                                      '--provider', 'verda', '--pod-id', pod_id, '--hourly-price', str(hourly)], timeout=60)
        if result.returncode:
            raise pod_runner.PodRunError('guard attach failed: ' + result.stderr.strip()[-200:])

    def release(self, job, pod_id, reservation):
        argv = [str(pod_runner.GUARD), 'release', '--job', job, '--reason', 'measurement finished']
        if reservation:
            argv += ['--reservation-id', reservation]
        if pod_id:
            argv += ['--pod-id', pod_id]
        if pod_runner._run_cli(argv, timeout=60).returncode:
            raise pod_runner.PodRunError('guard release failed')

    # -- lifecycle --
    def _price(self, instance_type):
        status, body = api('GET', '/instance-types')
        if status != 200 or not isinstance(body, list):
            raise pod_runner.PodRunError('verda instance-types unavailable')
        for item in body:
            if item.get('instance_type') == instance_type:
                return float(item['price_per_hour'])
        raise pod_runner.PodCapacityError('verda instance type not listed')

    def _location(self, instance_type):
        status, body = api('GET', '/instance-availability')
        if status != 200 or not isinstance(body, list):
            raise pod_runner.PodRunError('verda availability unavailable')
        for item in body:
            if instance_type in item.get('availabilities', []):
                return item['location_code']
        return None

    def create(self, gpu, ttl_hours, budget, max_hourly=pod_runner.MAX_HOURLY_USD):
        instance_type = INSTANCE_TYPES.get(gpu)
        if instance_type is None:
            raise pod_runner.PodCapacityError('no Verda instance type for ' + gpu)
        hourly = self._price(instance_type)
        if not 0 < hourly <= min(max_hourly, pod_runner.MAX_HOURLY_USD):
            raise pod_runner.PodCapacityError('Verda price above the cap')
        location = self._location(instance_type)
        if location is None:
            raise pod_runner.PodCapacityError('Verda has no ' + instance_type + ' now')
        hostname = f'{self._label}-{int(time.time())}'
        status, body = api('POST', '/instances', {
            'instance_type': instance_type, 'image': IMAGE, 'ssh_key_ids': [SSH_KEY_ID], 'location_code': location,
            'hostname': hostname, 'description': f'JevBench fast-lane {self._order_id[:8]} measurement (sealed-capable host, keyless)',
            'os_volume': {'name': hostname + '-os', 'size': OS_VOLUME_GB}, 'is_spot': False, 'contract': 'PAY_AS_YOU_GO'})
        if status not in (200, 201, 202) or not isinstance(body, str) or len(body) != 36:
            if status in (400, 409, 503):
                raise pod_runner.PodCapacityError(f'Verda create refused ({status})')
            raise pod_runner.PodRunError(f'Verda create failed ({status})')
        instance_id = body
        self._deadman(instance_id, ttl_hours)
        try:
            ip = self._ready(instance_id)
        except Exception as exc:
            # pod_runner only learns the id from a successful create: remove this exact instance here. Nothing was
            # uploaded yet, so a confirmed delete makes this an ordinary capacity miss (reservation released).
            if not delete_instance(instance_id):
                import measurement_dispatch
                raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain') from None
            subprocess.run(['systemctl', '--user', 'stop', 'verda-deadman-' + instance_id[:8] + '.timer'],
                           capture_output=True, text=True, timeout=60)
            raise pod_runner.PodCapacityError(f'Verda instance unusable ({exc}); deleted by exact id') from exc
        return {'pod_id': instance_id, 'huid': hostname, 'gpu': gpu, 'gpu_count': 1, 'hourly_usd': hourly,
                'host_ip': ip, 'location': location, 'instance_type': instance_type, 'metadata_invalid': False}

    def _ready(self, instance_id):
        deadline = time.time() + CREATE_WAIT_S
        ip = None
        while time.time() < deadline:
            status, info = api('GET', '/instances/' + instance_id)
            if status == 200 and isinstance(info, dict) and info.get('status') == 'running' and info.get('ip'):
                ip = info['ip']
                break
            time.sleep(15)
        if ip is None:
            raise pod_runner.PodRunError('Verda instance not running in time')
        self._hosts[instance_id] = ip
        for _ in range(40):
            if self.exec(instance_id, ['true'], timeout=30).returncode == 0:
                break
            time.sleep(10)
        else:
            raise pod_runner.PodRunError('Verda instance ssh not reachable')
        check = self.exec(instance_id, ['sh', '-c', 'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader '
                                        '&& docker info --format "{{json .Runtimes}}"'], timeout=120)
        if check.returncode or 'nvidia' not in check.stdout:
            raise pod_runner.PodRunError('Verda instance lacks GPU or docker nvidia runtime')
        return ip

    def _deadman(self, instance_id, ttl_hours):
        seconds = int(ttl_hours * 3600) + DEADMAN_GRACE_S
        subprocess.run(['systemd-run', '--user', '--unit', 'verda-deadman-' + instance_id[:8],
                        f'--on-active={seconds}', sys.executable, str(Path(__file__).resolve()), 'delete', instance_id],
                       capture_output=True, text=True, timeout=60)

    def _ip(self, pod_id):
        if pod_id not in self._hosts:
            status, info = api('GET', '/instances/' + pod_id)
            if status != 200 or not isinstance(info, dict) or not info.get('ip'):
                raise pod_runner.PodRunError('Verda instance unknown')
            self._hosts[pod_id] = info['ip']
        return self._hosts[pod_id]

    def _ssh_base(self):
        self._known_hosts.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        return ['-i', str(SSH_KEY), '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
                '-o', 'StrictHostKeyChecking=accept-new', '-o', f'UserKnownHostsFile={self._known_hosts}',
                '-o', 'ConnectTimeout=20', '-o', 'ServerAliveInterval=30']

    def exec(self, pod_id, command, timeout=600):
        argv = ['ssh', *self._ssh_base(), 'root@' + self._ip(pod_id), shlex.join(command)]
        try:
            return subprocess.run(argv, capture_output=True, text=True, timeout=timeout + 60)
        except subprocess.TimeoutExpired:
            return subprocess.CompletedProcess(argv, 124, '', 'ssh exec timeout')

    def scp_to(self, pod_id, local, remote, timeout=900):
        argv = ['scp', '-q', *self._ssh_base(), local, f'root@{self._ip(pod_id)}:{remote}']
        if subprocess.run(argv, capture_output=True, text=True, timeout=timeout).returncode:
            raise pod_runner.PodRunError('scp upload failed')

    def scp_from(self, pod_id, remote, local):
        argv = ['scp', '-q', '-r', *self._ssh_base(), f'root@{self._ip(pod_id)}:{remote}', local]
        if subprocess.run(argv, capture_output=True, text=True, timeout=900).returncode:
            raise pod_runner.PodRunError('scp download failed')

    def rm(self, pod_id):
        if not delete_instance(pod_id):
            raise pod_runner.PodRunError('provider removal failed')
        subprocess.run(['systemctl', '--user', 'stop', 'verda-deadman-' + pod_id[:8] + '.timer'],
                       capture_output=True, text=True, timeout=60)

    def ps_ids(self):
        status, body = api('GET', '/instances')
        if status != 200 or not isinstance(body, list):
            raise pod_runner.PodRunError('provider listing failed')
        return {str(item['id']) for item in body if item.get('status') not in ('deleted', 'deleting', 'discontinued')}


if __name__ == '__main__':
    # Dead-man entry point: delete exactly the given instance id.
    if len(sys.argv) == 3 and sys.argv[1] == 'delete' and len(sys.argv[2]) == 36:
        print('verda dead-man delete', sys.argv[2], 'ok' if delete_instance(sys.argv[2]) else 'FAILED', flush=True)
