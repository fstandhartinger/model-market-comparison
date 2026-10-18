"""Synthetic first-party tests for the Verda provider; no network, no API call, no VM."""
import ast
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

import measurement_dispatch
import pod_runner
import verda_provider as V

ID = '12345678-1234-1234-1234-123456789abc'


class FakeApi:
    def __init__(self, create=(202, ID), available=True, running=True, deleted=True):
        self.calls, self.create, self.available, self.running, self.deleted = [], create, available, running, deleted

    def __call__(self, method, path, body=None):
        self.calls.append((method, path, body))
        if path == '/instance-types':
            return 200, [{'instance_type': '1RTX6000ADA.10V', 'price_per_hour': 1.342},
                         {'instance_type': '1H100.80S.30V', 'price_per_hour': 4.296}]
        if path == '/instance-availability':
            return 200, [{'location_code': 'FIN-01', 'availabilities': ['1RTX6000ADA.10V'] if self.available else []}]
        if method == 'POST' and path == '/instances':
            return self.create
        if method == 'GET' and path == '/instances/' + ID:
            return 200, {'id': ID, 'status': 'running' if self.running else 'provisioning', 'ip': '203.0.113.7'}
        if method == 'PUT' and path == '/instances':
            return (202, '') if self.deleted else (500, 'no')
        if method == 'GET' and path == '/instances':
            return 200, [{'id': ID, 'status': 'running'}, {'id': 'gone', 'status': 'deleted'}]
        return 404, 'unexpected'


def ok(stdout=''):
    return subprocess.CompletedProcess([], 0, stdout, '')


class Tests(unittest.TestCase):
    def provider(self, fake, exec_out='NVIDIA RTX 6000 Ada, 49140 MiB\n{"nvidia":{},"runc":{}}'):
        provider = V.VerdaProvider('8a93f2a0-bf48-4ae3-b747-357380797391', 'fastlane-8a93f2a0')
        patches = [patch.object(V, 'api', fake), patch.object(V.time, 'sleep', lambda s: None),
                   patch.object(V.subprocess, 'run', lambda *a, **k: ok()),
                   patch.object(provider, 'exec', lambda pod, cmd, timeout=600: ok(exec_out))]
        for item in patches:
            item.start()
            self.addCleanup(item.stop)
        return provider

    def test_create_uses_exact_type_key_image_and_returns_pod(self):
        fake = FakeApi()
        pod = self.provider(fake).create('RTX6000', 2.0, 10.0)
        self.assertEqual(pod['pod_id'], ID)
        self.assertEqual(pod['hourly_usd'], 1.342)
        self.assertEqual(pod['gpu'], 'RTX6000')
        body = [c[2] for c in fake.calls if c[0] == 'POST'][0]
        self.assertEqual(body['instance_type'], '1RTX6000ADA.10V')
        self.assertEqual(body['ssh_key_ids'], [V.SSH_KEY_ID])
        self.assertEqual(body['image'], V.IMAGE)
        self.assertFalse(body['is_spot'])
        self.assertEqual(body['location_code'], 'FIN-01')

    def test_unavailable_or_unknown_or_over_cap_is_capacity_without_create(self):
        for gpu, fake in (('RTX6000', FakeApi(available=False)), ('RTXPRO6000', FakeApi())):
            with self.assertRaises(pod_runner.PodCapacityError):
                self.provider(fake).create(gpu, 2.0, 10.0)
            self.assertFalse([c for c in fake.calls if c[0] == 'POST'])
        fake = FakeApi()
        with self.assertRaises(pod_runner.PodCapacityError):
            self.provider(fake).create('H100', 2.0, 10.0, max_hourly=4.0)
        self.assertFalse([c for c in fake.calls if c[0] == 'POST'])

    def test_refused_create_is_capacity(self):
        with self.assertRaises(pod_runner.PodCapacityError):
            self.provider(FakeApi(create=(503, 'not enough resources'))).create('RTX6000', 2.0, 10.0)

    def test_unusable_instance_is_deleted_by_exact_id_then_capacity(self):
        fake = FakeApi()
        provider = self.provider(fake, exec_out='no gpu')
        with self.assertRaises(pod_runner.PodCapacityError):
            provider.create('RTX6000', 2.0, 10.0)
        deletes = [c for c in fake.calls if c[0] == 'PUT']
        self.assertEqual(deletes, [('PUT', '/instances', {'action': 'delete', 'id': ID, 'delete_permanently': True})])

    def test_failed_cleanup_after_create_is_a_hold(self):
        provider = self.provider(FakeApi(deleted=False), exec_out='no gpu')
        with self.assertRaises(measurement_dispatch.OperationalHold) as raised:
            provider.create('RTX6000', 2.0, 10.0)
        self.assertEqual(str(raised.exception), 'gpu_pod_cleanup_uncertain')

    def test_rm_and_ps_ids(self):
        fake = FakeApi()
        provider = self.provider(fake)
        provider.rm(ID)
        self.assertIn(('PUT', '/instances', {'action': 'delete', 'id': ID, 'delete_permanently': True}), fake.calls)
        self.assertEqual(provider.ps_ids(), {ID})
        with self.assertRaises(pod_runner.PodRunError):
            self.provider(FakeApi(deleted=False)).rm(ID)

    def test_instance_types_stay_under_the_hourly_cap_names(self):
        self.assertTrue(set(V.INSTANCE_TYPES) <= {name for name, _ in pod_runner.GPU_PREFERENCE})

    def test_module_sends_no_secret_to_the_vm(self):
        source = Path(V.__file__).read_text()
        tree = ast.parse(source)
        self.assertNotIn('VERDA_CLIENT_SECRET', ''.join(
            node.value for node in ast.walk(tree) if isinstance(node, ast.Constant) and isinstance(node.value, str)
            and 'ssh' in node.value))
        self.assertIn("'BatchMode=yes'", source)


if __name__ == '__main__':
    unittest.main()
