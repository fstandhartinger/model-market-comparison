"""Synthetic first-party tests for the Verda provider and dead-man; no network, no API call, no VM."""
import calendar as calendar_module
import json
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
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
        calendar = [a for a in timer if a.startswith('--on-calendar=')][0].removeprefix('--on-calendar=')
        delay = calendar_module.timegm(time.strptime(calendar, '%Y-%m-%d %H:%M:%S UTC')) - time.time()
        self.assertAlmostEqual(delay, 2 * 3600 + V.DEADMAN_GRACE_S, delta=5)
        self.assertFalse([a for a in timer if a.startswith('--on-active')])
        self.assertEqual(timer[-4:], ['delete', ID, '--volume-id', VOL])
        self.assertTrue(timer[-5].endswith('verda_deadman.py'))
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

    def test_rm_of_absent_instance_with_unknown_volumes_is_not_success(self):
        gone = FakeApi()  # 404 and this process never saw its volumes: storage is unknown, not gone
        with self.assertRaises(pod_runner.PodRunError):
            self.provider(gone).rm(ID)
        self.assertFalse(self.deletes(gone))

    def test_late_volume_ids_rearm_the_timer_for_the_same_time(self):
        fake = FakeApi()
        answers = iter([None])  # the row has no volume ids at the first read after the create

        def instance(pod_id):
            row = next(answers, 'row')
            return {'id': ID, 'status': 'provisioning'} if row is None else {
                'id': ID, 'status': 'running', 'ip': '203.0.113.7', 'os_volume_id': VOL}
        provider = self.provider(fake)
        with patch.object(D, 'instance', instance):
            provider.create('RTX6000', 2.0, 10.0)
        arms = [a for a in self.systemd if a[0] == 'systemd-run']
        self.assertEqual(len(arms), 2)
        self.assertEqual(arms[0][-2:], ['delete', ID])
        self.assertEqual(arms[1][-4:], ['delete', ID, '--volume-id', VOL])
        self.assertEqual([a for a in arms[0] if a.startswith('--on-calendar')], [a for a in arms[1] if a.startswith('--on-calendar')])
        self.assertEqual(arms[1][arms[1].index('--unit') + 1], 'verda-deadman-12345678-2')
        stops = [a for a in self.systemd if a[:3] == ['systemctl', '--user', 'stop']]
        self.assertEqual(stops[0][3], 'verda-deadman-12345678.timer')
        self.assertLess(self.systemd.index(arms[1]), self.systemd.index(stops[0]))
        self.assertIn('--property=TimeoutStopSec=300', arms[1])

    def test_rearm_failure_keeps_the_old_timer_and_cleans_up(self):
        fake = FakeApi()
        answers = iter([None])

        def instance(pod_id):
            return {'id': ID, 'status': 'provisioning'} if next(answers, 'row') is None else {
                'id': ID, 'status': 'discontinued', 'os_volume_id': VOL}
        provider = self.provider(fake)
        arms = []

        def run(argv, **kwargs):
            self.systemd.append(argv)
            if argv[0] == 'systemd-run':
                arms.append(argv)
            return done(rc=1 if argv[0] == 'systemd-run' and len(arms) == 2 else 0)
        with patch.object(V.subprocess, 'run', run), patch.object(D, 'instance', instance), patch.object(D, 'cleanup', lambda *a: {'confirmed': False}):
            with self.assertRaises(measurement_dispatch.OperationalHold):
                provider.create('RTX6000', 2.0, 10.0)
        self.assertFalse([a for a in self.systemd if a[:3] == ['systemctl', '--user', 'stop']])

    def test_rm_failure_raises(self):
        fake = FakeApi(delete_status=500)
        fake.instance = 'running'
        provider = self.provider(fake)
        with self.assertRaises(pod_runner.PodRunError):
            provider.rm(ID)

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


class Clock:
    """Virtual time: sleep moves it; every API call costs a second."""

    def __init__(self):
        self.now = 1000.0

    def time(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


class ScriptedVerda:
    """One instance, its volumes and every outcome the dead-man has to survive."""

    def __init__(self, clock, row=None, volumes=None, instance_status=None, on_call=None):
        self.clock, self.row, self.volumes = clock, row, dict(volumes or {})
        self.instance_status, self.on_call = instance_status, on_call
        self.calls = []

    def __call__(self, method, path, body=None):
        self.clock.now += 1
        self.calls.append((method, path, body))
        if self.on_call:
            forced = self.on_call(method, path, body)
            if forced:
                return forced
        if method == 'GET' and path == '/instances/' + ID:
            if self.instance_status:
                return self.instance_status, ''
            return (404, '') if self.row is None else (200, self.row)
        if method == 'PUT' and path == '/instances':
            self.row = dict(self.row, status='discontinued')
            return 202, ''
        if method == 'GET' and path.startswith('/volumes/'):
            volume = self.volumes.get(path.rsplit('/', 1)[1])
            return (404, '') if volume is None else (200, volume)
        if method == 'PUT' and path == '/volumes':
            self.volumes.pop(body['id'][0], None)
            return 202, ''
        return 500, ''

    def puts(self, path):
        return [c for c in self.calls if c[0] == 'PUT' and c[1] == path]


def row(status='running', **extra):
    return {'id': ID, 'status': status, 'os_volume_id': VOL, 'volume_ids': [], **extra}


class DeadmanCli(unittest.TestCase):
    def setUp(self):
        self.clock = Clock()
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.notify_calls = []
        self.notify_out = ['card:4242']
        self.log = Path(self.tmp.name) / 'log.jsonl'
        for item in (patch.object(D.time, 'time', self.clock.time), patch.object(D.time, 'sleep', self.clock.sleep),
                     patch.object(D, 'RECEIPTS', Path(self.tmp.name) / 'receipts'),
                     patch.object(D.signal, 'signal', lambda *a: None), patch.object(D.signal, 'alarm', lambda s: None),
                     patch.dict(D._DEADLINE, {'at': None}), patch.dict(D._SIGNALS, {'armed': False}),
                     patch.object(D, 'NOTIFY_LOG', self.log), patch.object(D, '_run_notify', self.notify)):
            item.start()
            self.addCleanup(item.stop)

    def notify(self, argv):
        """Like the real notify on a plain send: no card id on stdout, the proof is its log line with its own pid."""
        self.notify_calls.append(argv)
        pid = 1000 + len(self.notify_calls)
        out = self.notify_out.pop(0) if len(self.notify_out) > 1 else self.notify_out[0]
        if isinstance(out, BaseException):
            raise out
        if out.startswith('card:'):
            with self.log.open('a') as handle:
                handle.write('not json\n' + json.dumps({'pid': 999, 'sent': True, 'level': 'urgent', 'message_id': 1}) + '\n')
                handle.write(json.dumps({'pid': pid, 'sent': True, 'level': 'urgent', 'message_id': int(out[5:])}) + '\n')
            return pid, '', 0
        if out.startswith('merged:'):
            with self.log.open('a') as handle:
                handle.write(json.dumps({'pid': pid, 'sent': True, 'level': 'urgent', 'merged_into': int(out[7:])}) + '\n')
            return pid, 'UPDATED open card #%s (same problem, seen 2x; no new message)\n' % out[7:], 0
        if out.startswith('duplicate:'):
            with self.log.open('a') as handle:
                handle.write(json.dumps({'pid': pid, 'sent': False, 'level': 'urgent', 'note': 'duplicate urgent alert: card 5 still open'}) + '\n')
            return pid, '', 0
        return pid, out, 75 if out.startswith(('NOT SENT', 'QUEUED')) else 0

    def run_with(self, fake, *args):
        with patch.object(D, 'api', fake):
            return D.main(['verda_deadman.py', 'delete', *args])

    def receipt(self):
        files = sorted((Path(self.tmp.name) / 'receipts').glob('*.json'))
        self.assertEqual(len(files), 1)
        return json.loads(files[0].read_text())

    def test_usage_errors_exit_2_before_credentials_or_network(self):
        boom = patch.object(D, '_env', side_effect=AssertionError('credentials read'))
        net = patch.object(D, '_request', side_effect=AssertionError('network used'))
        for args in (['x'], ['x', 'delete'], ['x', 'delete', 'not-a-uuid'], ['x', 'remove', ID],
                     ['x', 'delete', ID, '--volume-id'], ['x', 'delete', ID, '--volume-id', 'bad'],
                     ['x', 'delete', ID, '--volume-id', VOL, '--volume-id'], ['x', 'delete', ID, VOL],
                     ['x', 'delete', ID, '--volume-id=' + VOL], ['x', 'delete', ID, '--other', VOL]):
            with boom, net:
                self.assertEqual(D.main(args), 2, args)

    def test_absent_instance_with_given_volume_deletes_it_and_confirms(self):
        fake = ScriptedVerda(self.clock, row=None, volumes={VOL: {'id': VOL, 'is_permanently_deleted': False}})
        self.assertEqual(self.run_with(fake, ID, '--volume-id', VOL), 0)
        self.assertEqual(fake.puts('/volumes'), [('PUT', '/volumes', {'action': 'delete', 'id': [VOL], 'is_permanent': True})])
        self.assertFalse(self.notify_calls)
        self.assertTrue(self.receipt()['report']['confirmed'])

    def test_absent_instance_with_a_volume_that_stays_alerts_and_keeps_liability(self):
        fake = ScriptedVerda(self.clock, row=None, volumes={VOL: {'id': VOL}})
        fake.on_call = lambda method, path, body: (500, '') if method == 'PUT' else None
        self.assertEqual(self.run_with(fake, ID, '--volume-id', VOL), 1)
        receipt = self.receipt()
        self.assertEqual(receipt['report']['volumes_left'], [VOL])
        self.assertEqual((receipt['alert']['state'], receipt['alert']['card']), ('delivered', '4242'))

    def test_bare_form_on_absent_instance_reports_unknown_storage_not_gone(self):
        fake = ScriptedVerda(self.clock, row=None)
        self.assertEqual(self.run_with(fake, ID), 3)
        receipt = self.receipt()
        self.assertTrue(receipt['report']['instance_gone'] and receipt['report']['storage_unknown'])
        self.assertIn(ID, self.notify_calls[0][-1])
        self.assertLess(self.clock.now, 1100)  # nothing to wait for

    def test_bare_form_with_live_instance_still_deletes_it_with_its_volume(self):
        fake = ScriptedVerda(self.clock, row=row(), volumes={})
        self.assertEqual(self.run_with(fake, ID), 0)
        self.assertEqual(fake.puts('/instances')[0][2]['volume_ids'], [VOL])

    def test_tombstone_without_ids_cannot_lose_the_set_seen_earlier(self):
        rows = [row(), {'id': ID, 'status': 'discontinued'}]
        fake = ScriptedVerda(self.clock, row=None, volumes={VOL: {'id': VOL}})

        def on_call(method, path, body):
            if method == 'GET' and path == '/instances/' + ID:
                return 200, rows.pop(0) if len(rows) > 1 else rows[0]
            if method == 'PUT' and path == '/instances':
                return 202, ''
            return None
        fake.on_call = on_call
        self.assertEqual(self.run_with(fake, ID), 0)
        self.assertEqual(self.receipt()['report']['volumes'], [VOL])
        self.assertEqual(fake.puts('/volumes')[0][2]['id'], [VOL])

    def test_later_404_cannot_lose_the_given_set_across_rounds(self):
        fake = ScriptedVerda(self.clock, row=None, volumes={VOL: {'id': VOL}}, instance_status=500)
        fake.on_call = lambda method, path, body: (500, '') if method == 'PUT' else None
        self.assertEqual(self.run_with(fake, ID, '--volume-id', VOL), 1)
        self.assertEqual(self.receipt()['report']['volumes'], [VOL])

    def test_volume_attached_to_another_instance_is_never_deleted(self):
        other = 'f' * 8 + ID[8:]
        fake = ScriptedVerda(self.clock, row=None, volumes={VOL: {'id': VOL, 'instance_id': other}})
        self.assertEqual(self.run_with(fake, ID, '--volume-id', VOL), 1)
        self.assertFalse(fake.puts('/volumes'))
        self.assertEqual(self.receipt()['report']['foreign_volumes'], [VOL])

    def test_total_time_is_bounded_when_the_api_never_answers(self):
        fake = ScriptedVerda(self.clock, row=row(), instance_status=503)
        self.assertEqual(self.run_with(fake, ID, '--volume-id', VOL), 1)
        self.assertLessEqual(self.clock.now - 1000, D.CLEANUP_DEADLINE_S + 120)
        self.assertEqual(len(self.notify_calls), 1)

    def test_any_exception_still_alerts(self):
        for error in (OSError('disk'), KeyError('x'), ValueError('expires_in'), RuntimeError('y')):
            self.notify_calls.clear()
            with patch.object(D, 'cleanup', side_effect=error):
                self.assertEqual(D.main(['x', 'delete', ID, '--volume-id', VOL]), 1)
            self.assertEqual(len(self.notify_calls), 1, error)

    def test_abort_signal_still_alerts(self):
        with patch.object(D, 'cleanup', side_effect=D._Abort('SIGALRM')):
            self.assertEqual(D.main(['x', 'delete', ID, '--volume-id', VOL]), 1)
        self.assertEqual(len(self.notify_calls), 1)
        self.assertIn('SIGALRM', self.receipt()['error'])

    def test_env_and_token_failures_are_no_answer_not_a_crash(self):
        with patch.object(D, '_TOKEN', {'value': None, 'expires': 0.0}):
            with patch.object(D, 'ENV_FILE', Path(self.tmp.name) / 'missing'):
                self.assertEqual(D.api('GET', '/instances'), (0, 'auth failed'))
            env = Path(self.tmp.name) / 'env'
            env.write_text('NOTHING=1\n')
            with patch.object(D, 'ENV_FILE', env):
                self.assertEqual(D.api('GET', '/instances'), (0, 'auth failed'))
            env.write_text('VERDA_CLIENT_ID=a\nVERDA_CLIENT_SECRET=b\n')
            answers = [(200, {'access_token': 't', 'expires_in': 'soon'}), (200, [])]
            with patch.object(D, 'ENV_FILE', env), patch.object(D, '_request', lambda *a: answers.pop(0)):
                self.assertEqual(D.api('GET', '/instances'), (200, []))

    def test_alert_outcomes(self):
        cases = {'held': 'HELD: urgent gate abc123. A triage agent is on it\n', 'queued': 'QUEUED: outbox abc (cap)\n'}
        for state, out in cases.items():
            self.notify_calls.clear()
            self.notify_out = [out]
            self.assertEqual(self.run_with(ScriptedVerda(self.clock, row=None, volumes={VOL: {'id': VOL, 'instance_id': 'other'}}),
                                           ID, '--volume-id', VOL), 4, state)
            self.assertEqual(len(self.notify_calls), 1, 'a held or queued alert is never resent')
            for path in (Path(self.tmp.name) / 'receipts').glob('*.json'):
                self.assertEqual(json.loads(path.read_text())['alert']['state'], state)
                path.unlink()

    def test_alert_refused_once_is_retried_and_exit_0_without_card_is_not_delivered(self):
        self.notify_out = ['agent-board inbox has unread entries\n', 'card:7']
        self.assertEqual(self.run_with(ScriptedVerda(self.clock, row=None), ID), 3)
        self.assertEqual(len(self.notify_calls), 2)
        self.assertEqual(self.receipt()['alert']['card'], '7')
        (next((Path(self.tmp.name) / 'receipts').glob('*.json'))).unlink()
        self.notify_calls.clear()
        self.notify_out = ['']  # exit 0 and nothing logged is not delivery
        self.assertEqual(self.run_with(ScriptedVerda(self.clock, row=None), ID), 4)
        self.assertEqual(len(self.notify_calls), D.ALERT_TRIES)
        self.assertFalse(self.receipt()['alert']['delivered'])

    def test_alert_kinds_are_recorded(self):
        self.notify_out = ['merged:88']
        self.assertEqual(self.run_with(ScriptedVerda(self.clock, row=None), ID), 3)
        alert = self.receipt()['alert']
        self.assertEqual((alert['delivered'], alert['card'], alert['kind']), (True, '88', 'updated'))
        self.assertEqual(len(self.notify_calls), 1)

    def test_duplicate_suppressed_alert_is_not_delivered_and_keeps_the_note(self):
        self.notify_out = ['duplicate:x']
        self.assertEqual(self.run_with(ScriptedVerda(self.clock, row=None), ID), 4)
        self.assertIn('still open', self.receipt()['alert']['attempts'][0]['note'])

    def test_repeat_held_form_is_held(self):
        self.notify_out = ['HELD: repeat of urgent gate abc (the triage agent already works on it)\n']
        self.assertEqual(self.run_with(ScriptedVerda(self.clock, row=None), ID), 4)
        self.assertEqual(self.receipt()['alert']['state'], 'held')
        self.assertEqual(len(self.notify_calls), 1)

    def test_volumes_read_in_one_round_survive_into_the_next(self):
        answers = [(200, row()), (500, ''), (404, '')]
        fake = ScriptedVerda(self.clock, row=None, volumes={VOL: {'id': VOL}})

        def on_call(method, path, body):
            if method == 'GET' and path == '/instances/' + ID:
                return answers.pop(0) if len(answers) > 1 else answers[0]
            if method == 'PUT' and path == '/instances':
                return 500, ''
            return None
        fake.on_call = on_call
        self.assertEqual(self.run_with(fake, ID), 0)
        self.assertEqual(self.receipt()['report']['volumes'], [VOL])

    def test_uppercase_instance_id_is_normalised(self):
        self.assertEqual(D.parse_args(['x', 'delete', ID.upper()]), (ID, []))

    def test_deleted_status_counts_as_gone(self):
        self.assertTrue(D._gone_status({'status': 'deleted'}))

    def test_alert_rings_past_the_gate(self):
        self.run_with(ScriptedVerda(self.clock, row=None), ID)
        self.assertEqual(self.notify_calls[0][1:4], ['urgent', '--bypass-gate', 'money-loss'])

    def test_notify_timeout_is_not_a_crash(self):
        self.notify_out = [subprocess.TimeoutExpired('notify', 45)]  # Popen itself failing, as OSError would
        self.assertEqual(self.run_with(ScriptedVerda(self.clock, row=None), ID), 4)
        self.assertEqual(self.receipt()['alert']['state'], 'not-sent')


class RealProcess(unittest.TestCase):
    """The real signal path in a real process; HOME has no credentials, so no request ever leaves."""

    def start(self, home, deadline, setup=''):
        code = ('import sys, pathlib, time; sys.path.insert(0, %r); import verda_deadman as D; D.CLEANUP_DEADLINE_S = %d; '
                'D.ALERT_BOUND_S = 5; %s; sys.exit(D.main(["verda_deadman.py", "delete", %r, "--volume-id", %r]))'
                % (str(Path(D.__file__).parent), deadline, setup or 'pass', ID, VOL))
        return subprocess.Popen([sys.executable, '-c', code], env={'HOME': home, 'PATH': '/usr/bin:/bin'},
                                stdout=subprocess.PIPE, text=True)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        bin_dir = Path(self.tmp.name) / 'bin'
        bin_dir.mkdir()
        self.log = Path(self.tmp.name) / 'notify.log'
        (Path(self.tmp.name) / '.notify').mkdir()
        (bin_dir / 'notify').write_text(
            '#!/bin/sh\necho "$@" >> %s\necho "{\\"pid\\": $$, \\"sent\\": true, \\"level\\": \\"urgent\\", \\"message_id\\": 99}" >> %s/.notify/log.jsonl\n'
            % (self.log, self.tmp.name))
        (bin_dir / 'notify').chmod(0o755)

    def receipt(self):
        files = list(Path(self.tmp.name).glob('.local/state/priority-evaluation/verda-deadman/*.json'))
        self.assertEqual(len(files), 1)
        return json.loads(files[0].read_text())

    def test_sigterm_mid_cleanup_still_alerts_and_writes_a_receipt(self):
        process = self.start(self.tmp.name, 600)
        time.sleep(1)
        process.terminate()
        out, _ = process.communicate(timeout=30)
        self.assertEqual(process.returncode, 1, out)
        self.assertIn(ID, self.log.read_text())
        receipt = self.receipt()
        self.assertIn('SIGTERM', receipt['error'])
        self.assertEqual(receipt['alert']['card'], '99')

    def test_a_call_that_hangs_past_the_deadline_is_cut_by_the_alarm(self):
        process = self.start(self.tmp.name, 1, 'D.HANG_MARGIN_S = 1; D.cleanup = lambda *a: time.sleep(300)')
        started = time.time()
        out, _ = process.communicate(timeout=30)
        self.assertLess(time.time() - started, 15)
        self.assertEqual(process.returncode, 1, out)
        self.assertIn('SIGALRM', self.receipt()['error'])

    def test_no_credentials_ends_at_the_deadline_with_alert(self):
        process = self.start(self.tmp.name, 2)
        out, _ = process.communicate(timeout=30)
        self.assertEqual(process.returncode, 1, out)
        self.assertEqual(self.receipt()['report']['volumes_left'], [VOL])


class Transport(unittest.TestCase):
    def test_redirect_is_refused_and_error_body_never_returned(self):
        import http.server
        import threading

        class Handler(http.server.BaseHTTPRequestHandler):
            hits = []

            def do_GET(self):
                Handler.hits.append(self.path)
                if self.path.endswith('/redirect'):
                    self.send_response(302)
                    self.send_header('Location', '/stolen')
                else:
                    self.send_response(500)
                self.end_headers()
                self.wfile.write(b'client_secret=shhh')

            def log_message(self, *args):
                pass
        server = http.server.HTTPServer(('127.0.0.1', 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.shutdown)
        with patch.object(D, 'API', 'http://127.0.0.1:%d' % server.server_port):
            status, body = D._request('GET', '/redirect', token='t')
            self.assertEqual((status, body), (302, 'provider error'))
            self.assertEqual(D._request('GET', '/boom'), (500, 'provider error'))
        self.assertEqual(Handler.hits, ['/redirect', '/boom'])

    def test_no_proxy_handler_from_environment(self):
        with patch.dict('os.environ', {'https_proxy': 'http://127.0.0.1:9', 'HTTPS_PROXY': 'http://127.0.0.1:9'}):
            self.assertFalse([h for h in D._OPENER.handlers if getattr(h, 'proxies', None)])

    def test_transport_error_is_no_answer(self):
        with patch.object(D, '_OPENER') as opener:
            opener.open.side_effect = ValueError('bad url')
            self.assertEqual(D._request('GET', '/x'), (0, 'no answer'))

    def test_past_deadline_sends_nothing(self):
        with patch.dict(D._DEADLINE, {'at': 1.0}), patch.object(D, '_OPENER') as opener:
            self.assertEqual(D._request('GET', '/x'), (0, 'no answer'))
            opener.open.assert_not_called()


if __name__ == '__main__':
    unittest.main()
