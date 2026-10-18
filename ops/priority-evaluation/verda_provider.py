"""Verda (DataCrunch) provider for pod_runner.run: sealed fast-lane runs off marketplace GPUs.

DECISIONS 17 Oct 2026 19:00Z (lium-sealed-data-ban) and custody #21023(3): sealed JevBench inputs never go to Lium or
another marketplace GPU; Verda is an allowed tier-1 host. This class implements the pod_runner Provider interface
for one pay-as-you-go Verda VM per attempt, so the unchanged pod_runner lifecycle (pinned image, offline supplement
build, sha-verified weights, `--network none` run container, receipts, exact-ID teardown) applies as on Lium.

- Accounting: gpu-pod-guard reserve/attach/release with `--provider verda` (same fields as Lium).
- Create: exact instance type per GPU name (1-GPU types with the memory pod_runner.GPU_PREFERENCE assumes), the
  first location that lists it, the documented Docker image, our registered ssh key only, a unique hostname. A create
  without a definitive answer is resolved by hostname and deleted. Right after the id is known a transient user timer
  (verda_deadman.py, standalone) is armed to delete exactly that instance and its OS volume at TTL + 15 min; if it
  cannot be armed, the instance is deleted at once. An instance that never becomes usable is deleted and confirmed gone
  before create raises.
- Teardown deletes the instance with its OS volume permanently and only counts once Verda shows both gone.
- No credential reaches the VM: the API secret stays host-side (~/.config/verda.env); the VM only has our public key.
"""
import shlex
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import measurement_dispatch
import pod_runner
import verda_deadman
from verda_deadman import api, delete_and_confirm, valid_id

SSH_KEY = Path.home() / '.ssh/reax_node_ed25519'
SSH_KEY_ID = 'e1097703-a557-408c-9061-ae2904817d88'  # "reax-node", registered on the Verda account
IMAGE = '24.04.cuda12.9.docker'
OS_VOLUME_GB = 200
# Verda instance-types listing (18 Oct 2026): H100 SXM5 80 GB, A100 SXM4 80 GB, L40S 48 GB, RTX 6000 Ada 48 GB.
INSTANCE_TYPES = {'H100': '1H100.80S.30V', 'A100': '1A100.22V', 'L40S': '1L40S.20V', 'RTX6000': '1RTX6000ADA.10V'}
DEADMAN_GRACE_S = 900
CREATE_WAIT_S = 900


def _stop_deadman(instance_id):
    subprocess.run(['systemctl', '--user', 'stop', 'verda-deadman-' + instance_id[:8] + '.timer'],
                   capture_output=True, text=True, timeout=60)


class VerdaProvider(pod_runner.Provider):
    name = 'verda'

    def __init__(self, order_id, label):
        self._order_id = order_id
        self._label = label  # hostname prefix, e.g. fastlane-8a93f2a0
        self._hosts = {}
        self._known = {}
        self._tmp = tempfile.TemporaryDirectory(prefix='verda-known-hosts-')

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
    def _quote(self, instance_type):
        """(hourly USD, location or None). Nothing exists yet, so any API trouble is a capacity miss."""
        status, types = api('GET', '/instance-types')
        if status != 200 or not isinstance(types, list):
            raise pod_runner.PodCapacityError('verda instance-types unavailable')
        price = next((item.get('price_per_hour') for item in types
                      if isinstance(item, dict) and item.get('instance_type') == instance_type), None)
        try:
            hourly = float(price)
        except (TypeError, ValueError):
            raise pod_runner.PodCapacityError('verda price unavailable') from None
        status, places = api('GET', '/instance-availability')
        if status != 200 or not isinstance(places, list):
            raise pod_runner.PodCapacityError('verda availability unavailable')
        location = next((item.get('location_code') for item in places
                         if isinstance(item, dict) and instance_type in (item.get('availabilities') or [])), None)
        return hourly, location

    def _cleanup_or_hold(self, instance_id, reason):
        if not delete_and_confirm(instance_id):
            raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain') from None
        _stop_deadman(instance_id)
        raise pod_runner.PodCapacityError(f'{reason}; deleted by exact id and confirmed gone')

    def create(self, gpu, ttl_hours, budget, max_hourly=pod_runner.MAX_HOURLY_USD):
        if type(max_hourly) not in (int, float) or not 0 < max_hourly <= pod_runner.MAX_HOURLY_USD:
            raise pod_runner.PodRunError('invalid provider price ceiling')
        instance_type = INSTANCE_TYPES.get(gpu)
        if instance_type is None:
            raise pod_runner.PodCapacityError('no Verda instance type for ' + gpu)
        hourly, location = self._quote(instance_type)
        if not 0 < hourly <= max_hourly:
            raise pod_runner.PodCapacityError('Verda price above the cap')
        if location is None:
            raise pod_runner.PodCapacityError('Verda has no ' + instance_type + ' now')
        hostname = f'{self._label}-{int(time.time())}'
        status, body = api('POST', '/instances', {
            'instance_type': instance_type, 'image': IMAGE, 'ssh_key_ids': [SSH_KEY_ID], 'location_code': location,
            'hostname': hostname, 'description': f'JevBench fast-lane {self._order_id[:8]} measurement (sealed-capable host, keyless)',
            'os_volume': {'name': hostname + '-os', 'size': OS_VOLUME_GB}, 'is_spot': False, 'contract': 'PAY_AS_YOU_GO'})
        if 200 <= status < 300 and isinstance(body, str) and valid_id(body):
            instance_id = body
        elif status in (400, 409, 503):
            raise pod_runner.PodCapacityError(f'Verda create refused ({status})')
        else:
            # No definitive answer: an instance may exist anyway. Find it by its unique hostname and remove it.
            for _ in range(6):
                try:
                    rows = verda_deadman.find_by_hostname(hostname)
                    break
                except RuntimeError:
                    time.sleep(20)
            else:
                raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain')
            for row in rows:
                if not delete_and_confirm(row['id']):
                    raise measurement_dispatch.OperationalHold('gpu_pod_cleanup_uncertain')
            raise pod_runner.PodCapacityError(f'Verda create unclear ({status}); {len(rows)} instance(s) removed')
        if not self._arm_deadman(instance_id, ttl_hours):
            self._cleanup_or_hold(instance_id, 'dead-man timer could not be armed')
        try:
            ip = self._ready(instance_id)
        except Exception as exc:  # noqa: BLE001  nothing was uploaded yet
            self._cleanup_or_hold(instance_id, f'Verda instance unusable ({type(exc).__name__}: {str(exc)[:120]})')
        return {'pod_id': instance_id, 'huid': hostname, 'gpu': gpu, 'gpu_count': 1, 'hourly_usd': hourly,
                'host_ip': ip, 'location': location, 'instance_type': instance_type, 'metadata_invalid': False}

    def _ready(self, instance_id):
        deadline = time.time() + CREATE_WAIT_S
        ip = None
        while time.time() < deadline:
            try:
                row = verda_deadman.instance(instance_id)
            except RuntimeError:
                row = None
            if row and row.get('status') == 'running' and row.get('ip'):
                ip = row['ip']
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

    def _arm_deadman(self, instance_id, ttl_hours):
        seconds = int(ttl_hours * 3600) + DEADMAN_GRACE_S
        try:
            result = subprocess.run(['systemd-run', '--user', '--unit', 'verda-deadman-' + instance_id[:8],
                                     f'--on-active={seconds}', sys.executable, '-I',
                                     str(Path(verda_deadman.__file__).resolve()), 'delete', instance_id],
                                    capture_output=True, text=True, timeout=60)
        except (OSError, subprocess.TimeoutExpired):
            return False
        return result.returncode == 0

    def _ip(self, pod_id):
        if pod_id not in self._hosts:
            try:
                row = verda_deadman.instance(pod_id)
            except RuntimeError:
                row = None
            if not row or not row.get('ip'):
                raise pod_runner.PodRunError('Verda instance unknown')
            self._hosts[pod_id] = row['ip']
        return self._hosts[pod_id]

    def _ssh_base(self, pod_id):
        # A fresh known_hosts per instance: trust on first use for this VM only; a reused IP never collides.
        known = self._known.setdefault(pod_id, str(Path(self._tmp.name) / (pod_id + '.known_hosts')))
        return ['-F', '/dev/null', '-i', str(SSH_KEY), '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
                '-o', 'PasswordAuthentication=no', '-o', 'ForwardAgent=no', '-o', 'ForwardX11=no',
                '-o', 'ClearAllForwardings=yes', '-o', 'StrictHostKeyChecking=accept-new',
                '-o', f'UserKnownHostsFile={known}', '-o', 'ConnectTimeout=20', '-o', 'ServerAliveInterval=30']

    def exec(self, pod_id, command, timeout=600):
        argv = ['ssh', *self._ssh_base(pod_id), 'root@' + self._ip(pod_id), shlex.join(command)]
        try:
            return subprocess.run(argv, capture_output=True, text=True, timeout=timeout + 60)
        except subprocess.TimeoutExpired:
            return subprocess.CompletedProcess(argv, 124, '', 'ssh exec timeout')

    def _scp(self, argv, timeout):
        try:
            return subprocess.run(argv, capture_output=True, text=True, timeout=timeout).returncode == 0
        except subprocess.TimeoutExpired:
            return False

    def scp_to(self, pod_id, local, remote, timeout=900):
        if not self._scp(['scp', '-q', *self._ssh_base(pod_id), '--', local, f'root@{self._ip(pod_id)}:{remote}'], timeout):
            raise pod_runner.PodRunError('scp upload failed')

    def scp_from(self, pod_id, remote, local):
        if not self._scp(['scp', '-q', *self._ssh_base(pod_id), '--', f'root@{self._ip(pod_id)}:{remote}', local], 900):
            raise pod_runner.PodRunError('scp download failed')

    def rm(self, pod_id):
        # Also succeeds when the dead-man already removed it: success means confirmed gone.
        if not delete_and_confirm(pod_id):
            raise pod_runner.PodRunError('provider removal failed')
        _stop_deadman(pod_id)

    def ps_ids(self):
        status, body = api('GET', '/instances')
        if status != 200 or not isinstance(body, list):
            raise pod_runner.PodRunError('provider listing failed')
        return {str(item.get('id')) for item in body
                if isinstance(item, dict) and str(item.get('status')).lower() not in ('discontinued', 'notfound')}
