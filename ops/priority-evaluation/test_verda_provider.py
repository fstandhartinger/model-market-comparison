"""Synthetic first-party tests for the Verda provider and dead-man; no network, no API call, no VM."""
import subprocess
import unittest
from unittest.mock import patch

import measurement_dispatch
import pod_runner
import verda_deadman as D
import verda_provider as V

ID = '12345678-1234-1234-1234-123456789abc'
VOL = '87654321-4321-4321-4321-cba987654321'


class FakeApi:
    """A tiny in-memory Verda: one instance at most, with one OS volume."""

    def __init__(self, create=None, available=True, running=True, delete_status=202, list_fails=False):
        self.calls, self.available, self.running = [], available, running
        self.create, self.delete_status, self.list_fails = create, delete_status, list_fails
        self.instance = None  # status string once created
        self.volume_deleted = False

    def __call__(self, method, path, body=None):
        self.calls.append((method, path, body))
        if path == '/instance-types':
            return 200, [{'instance_type': '1RTX6000ADA.10V', 'price_per_hour': 1.342},
                         {'instance_type': '1H100.80S.30V', 'price_per_hour': 4.296}]
        if path == '/instance-availability':
            return 200, [{'location_code': 'FIN-01', 'availabilities': ['1RTX6000ADA.10V'] if self.available else []}]
        if method == 'POST' and path == '/instances':
            self.instance = 'running' if self.running else 'provisioning'
            self.hostname = body['hostname']
            return self.create or (202, ID)
        if method == 'GET' and path == '/instances/' + ID:
            if self.instance is None:
                return 404, 'not found'
            return 200, {'id': ID, 'status': self.instance, 'ip': '203.0.113.7', 'os_volume_id': VOL, 'volume_ids': []}
        if method == 'GET' and path == '/volumes/' + VOL:
            return 200, {'id': VOL, 'is_permanently_deleted': self.volume_deleted}
        if method == 'PUT' and path == '/instances':
            if 200 <= self.delete_status < 300:
                self.instance, self.volume_deleted = 'discontinued', True
            return self.delete_status, ''
        if method == 'GET' and path == '/instances':
            if self.list_fails:
                return 0, 'no answer'
            rows = [{'id': 'f' * 8 + ID[8:], 'status': 'discontinued', 'hostname': 'old'}]
            if self.instance:
                rows.append({'id': ID, 'status': self.instance, 'hostname': getattr(self, 'hostname', '')})
            return 200, rows
        return 404, 'unexpected'


def done(stdout='', rc=0):
    return subprocess.CompletedProcess([], rc, stdout, '')


class Tests(unittest.TestCase):
    def provider(self, fake, exec_out='NVIDIA RTX 6000 Ada, 49140 MiB\n{"nvidia":{},"runc":{}}', systemd_rc=0):
        provider = V.VerdaProvider('8a93f2a0-bf48-4ae3-b747-357380797391', 'fastlane-8a93f2a0')
        self.systemd = []

        def run(argv, **kwargs):
            self.systemd.append(argv)
            return done(rc=systemd_rc if argv[0] == 'systemd-run' else 0)
        patches = [patch.object(D, 'api', fake), patch.object(V, 'api', fake),
                   patch.object(D.time, 'sleep', lambda s: None), patch.object(V.time, 'sleep', lambda s: None),
                   patch.object(V.subprocess, 'run', run),
                   patch.object(provider, 'exec', lambda pod, cmd, timeout=600: done(exec_out))]
        for item in patches:
            item.start()
            self.addCleanup(item.stop)
        return provider

    def deletes(self, fake):
        return [c for c in fake.calls if c[0] == 'PUT']

    def test_create_uses_exact_type_key_image_arms_deadman_and_returns_pod(self):
        fake = FakeApi()
        pod = self.provider(fake).create('RTX6000', 2.0, 10.0)
        self.assertEqual((pod['pod_id'], pod['hourly_usd'], pod['gpu'], pod['gpu_count']), (ID, 1.342, 'RTX6000', 1))
        body = [c[2] for c in fake.calls if c[0] == 'POST'][0]
        self.assertEqual((body['instance_type'], body['ssh_key_ids'], body['image'], body['is_spot'], body['location_code']),
                         ('1RTX6000ADA.10V', [V.SSH_KEY_ID], V.IMAGE, False, 'FIN-01'))
        timer = [a for a in self.systemd if a[0] == 'systemd-run'][0]
        self.assertIn('--on-active=%d' % (2 * 3600 + V.DEADMAN_GRACE_S), timer)
        self.assertEqual(timer[-2:], ['delete', ID])
        self.assertTrue(timer[-3].endswith('verda_deadman.py'))
        self.assertFalse(self.deletes(fake))

    def test_unavailable_unknown_or_over_cap_is_capacity_without_create(self):
        for gpu, fake, ceiling in (('RTX6000', FakeApi(available=False), 5.0), ('RTXPRO6000', FakeApi(), 5.0),
                                   ('H100', FakeApi(), 4.0)):
            with self.assertRaises(pod_runner.PodCapacityError):
                self.provider(fake).create(gpu, 2.0, 10.0, max_hourly=ceiling)
            self.assertFalse([c for c in fake.calls if c[0] == 'POST'])
        with self.assertRaises(pod_runner.PodRunError):
            self.provider(FakeApi()).create('RTX6000', 2.0, 10.0, max_hourly=None)

    def test_refused_create_is_capacity(self):
        fake = FakeApi(create=(503, 'not enough resources'))
        fake.instance = None
        with self.assertRaises(pod_runner.PodCapacityError):
            self.provider(fake).create('RTX6000', 2.0, 10.0)

    def test_unclear_create_finds_instance_by_hostname_and_deletes_it(self):
        fake = FakeApi(create=(0, 'no answer'))
        with self.assertRaises(pod_runner.PodCapacityError):
            self.provider(fake).create('RTX6000', 2.0, 10.0)
        self.assertEqual(self.deletes(fake)[0][2]['id'], ID)
        self.assertEqual(self.deletes(fake)[0][2]['volume_ids'], [VOL])
        self.assertEqual(fake.instance, 'discontinued')

    def test_unclear_create_without_listing_is_a_hold(self):
        fake = FakeApi(create=(0, 'no answer'), list_fails=True)
        with self.assertRaises(measurement_dispatch.OperationalHold) as raised:
            self.provider(fake).create('RTX6000', 2.0, 10.0)
        self.assertEqual(str(raised.exception), 'gpu_pod_cleanup_uncertain')

    def test_deadman_arm_failure_deletes_at_once(self):
        fake = FakeApi()
        with self.assertRaises(pod_runner.PodCapacityError):
            self.provider(fake, systemd_rc=1).create('RTX6000', 2.0, 10.0)
        self.assertEqual(len(self.deletes(fake)), 1)
        self.assertTrue(fake.volume_deleted)

    def test_unusable_instance_is_deleted_with_volume_then_capacity(self):
        fake = FakeApi()
        with self.assertRaises(pod_runner.PodCapacityError):
            self.provider(fake, exec_out='no gpu').create('RTX6000', 2.0, 10.0)
        self.assertEqual(self.deletes(fake), [('PUT', '/instances', {'action': 'delete', 'id': ID,
                                                                     'delete_permanently': True, 'volume_ids': [VOL]})])

    def test_failed_cleanup_after_create_is_a_hold(self):
        provider = self.provider(FakeApi(delete_status=500), exec_out='no gpu')
        with patch.object(D.time, 'time', side_effect=[0, 0, 10 ** 6] + [10 ** 6] * 50):
            with self.assertRaises(measurement_dispatch.OperationalHold) as raised:
                provider.create('RTX6000', 2.0, 10.0)
        self.assertEqual(str(raised.exception), 'gpu_pod_cleanup_uncertain')

    def test_rm_confirms_gone_and_accepts_already_deleted(self):
        fake = FakeApi()
        provider = self.provider(fake)
        provider.create('RTX6000', 2.0, 10.0)
        self.assertEqual(provider.ps_ids(), {ID})
        provider.rm(ID)
        self.assertEqual(provider.ps_ids(), set())
        provider.rm(ID)  # dead-man already removed it: still success, no second delete call
        self.assertEqual(len(self.deletes(fake)), 1)
        gone = FakeApi()
        self.provider(gone).rm(ID)  # 404: never existed / already purged
        self.assertFalse(self.deletes(gone))

    def test_rm_failure_raises(self):
        fake = FakeApi(delete_status=500)
        fake.instance = 'running'
        provider = self.provider(fake)
        with patch.object(D.time, 'time', side_effect=[0, 10 ** 6] + [10 ** 6] * 50), self.assertRaises(pod_runner.PodRunError):
            provider.rm(ID)

    def test_deadman_cli_rejects_non_uuid_and_alerts_on_failure(self):
        self.assertEqual(D.main(['x', 'delete', 'not-a-uuid']), 2)
        alerts = []
        with patch.object(D, 'delete_and_confirm', lambda i: False), patch.object(D.time, 'sleep', lambda s: None), \
                patch.object(D.subprocess, 'run', lambda argv, **k: alerts.append(argv)):
            self.assertEqual(D.main(['x', 'delete', ID]), 1)
        self.assertEqual(alerts[0][1], 'urgent')
        self.assertIn(ID, alerts[0][2])

    def test_ssh_options_pin_key_and_disable_forwarding(self):
        provider = V.VerdaProvider('8a93f2a0-bf48-4ae3-b747-357380797391', 'x')
        base = provider._ssh_base(ID)
        for option in ('BatchMode=yes', 'ForwardAgent=no', 'ClearAllForwardings=yes', 'IdentitiesOnly=yes',
                       'PasswordAuthentication=no'):
            self.assertIn(option, base)
        self.assertEqual(base[:2], ['-F', '/dev/null'])
        self.assertTrue([o for o in base if o.startswith('UserKnownHostsFile=') and o.endswith(ID + '.known_hosts')])

    def test_instance_types_are_pod_runner_gpu_names(self):
        self.assertTrue(set(V.INSTANCE_TYPES) <= {name for name, _ in pod_runner.GPU_PREFERENCE})


if __name__ == '__main__':
    unittest.main()
