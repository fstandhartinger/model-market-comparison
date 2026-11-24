"""CR-858: paid-lane money caps come from validated config, values unchanged, invalid config fails closed.

Everything runs on tmp fixtures: a throw-away state root, no provider, no pod, no endpoint, no sealed data."""
import ast
import json
import os
import shutil
import stat
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import autopickup as ap
import measurement_dispatch
import paid_lane_caps as plc
import pod_capacity
import pod_runner
import v16_allocation
import verda_provider

HERE = Path(__file__).resolve().parent
REASON = 'paid_lane_caps_invalid'

# The source constants exactly as they stood on origin/main e31b8a007 before CR-858.
OLD_MAX_HOURLY_USD = 5.00            # pod_runner.MAX_HOURLY_USD
OLD_PER_ORDER_CAP_USD = 50.0         # pod_runner.PER_ORDER_CAP_USD
OLD_TTL_CAP_HOURS = 3.0              # pod_runner.TTL_CAP_HOURS
OLD_API_ORDER_CAP_USD = 5.0          # autopickup.API_ORDER_CAP_USD
OLD_MAX_ALLOCATIONS = 3              # pod_capacity.MAX_ALLOCATIONS (first pod + two fresh-pod retries)

VALID = {'schema_version': 1, 'max_hourly_usd': 4.0, 'per_order_cap_usd': 40.0, 'ttl_cap_hours': 2.0,
         'api_order_cap_usd': 2.5, 'max_pod_allocations': 2}


class Forbidden:
    """A provider that fails the test on any call: invalid config must stop before a pod is even considered."""
    sealed_custody_ok = True
    name = 'forbidden'

    def __getattr__(self, name):
        raise AssertionError(f'provider.{name} touched')


class CapsTestCase(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix='paid-lane-caps-'))
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        for module in (pod_runner, ap):
            patch = mock.patch.object(module, 'STATE_ROOT', self.root)
            patch.start()
            self.addCleanup(patch.stop)
        self.path = self.root / 'config' / 'paid-lane-caps.json'

    def write(self, body, mode=0o600):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_bytes(json.dumps(body).encode() if isinstance(body, dict) else body)
        os.chmod(self.path, mode)
        return self.path

    def run_pod_runner(self, **kwargs):
        return pod_runner.run('00000000-0000-4000-8000-000000000001', self.root / 'job', {}, self.root / 'out', {}, 50.0,
                              provider=Forbidden(), **kwargs)


class ShippedDefaultTests(CapsTestCase):
    def test_shipped_default_file_equals_the_old_constants_exactly(self):
        shipped = json.loads((HERE / 'paid-lane-caps.json').read_text())
        self.assertEqual(shipped, {'schema_version': 1, 'max_hourly_usd': OLD_MAX_HOURLY_USD,
                                   'per_order_cap_usd': OLD_PER_ORDER_CAP_USD, 'ttl_cap_hours': OLD_TTL_CAP_HOURS,
                                   'api_order_cap_usd': OLD_API_ORDER_CAP_USD, 'max_pod_allocations': OLD_MAX_ALLOCATIONS})
        for key, value in shipped.items():
            self.assertIs(type(value), int if key in ('schema_version', 'max_pod_allocations') else float, key)

    def test_valid_default_loads_when_there_is_no_override(self):
        caps = plc.load(self.root)
        self.assertEqual((caps.max_hourly_usd, caps.per_order_cap_usd, caps.ttl_cap_hours, caps.api_order_cap_usd,
                          caps.max_pod_allocations, caps.source),
                         (OLD_MAX_HOURLY_USD, OLD_PER_ORDER_CAP_USD, OLD_TTL_CAP_HOURS, OLD_API_ORDER_CAP_USD,
                          OLD_MAX_ALLOCATIONS, 'default'))
        self.assertEqual(plc.load_default(), caps)

    def test_module_attributes_still_resolve_to_the_old_values(self):
        self.assertEqual((pod_runner.MAX_HOURLY_USD, pod_runner.PER_ORDER_CAP_USD, pod_runner.TTL_CAP_HOURS),
                         (OLD_MAX_HOURLY_USD, OLD_PER_ORDER_CAP_USD, OLD_TTL_CAP_HOURS))
        self.assertEqual(ap.API_ORDER_CAP_USD, OLD_API_ORDER_CAP_USD)
        self.assertEqual(pod_runner._attempt_rate({}), OLD_MAX_HOURLY_USD)
        self.assertEqual(pod_runner._order_ttl_cap('/jobs/other-order', {'kind': 'http_typesafe'}), OLD_TTL_CAP_HOURS)
        with self.assertRaises(AttributeError):
            pod_runner.NO_SUCH_CAP
        with self.assertRaises(AttributeError):
            ap.NO_SUCH_CAP

    def test_the_literals_are_gone_from_source_and_the_original_accounting_stays_literal(self):
        def assigned(path):
            return {target.id for node in ast.parse((HERE / path).read_text()).body if isinstance(node, ast.Assign)
                    for target in node.targets if isinstance(target, ast.Name)}
        self.assertFalse(assigned('pod_runner.py') & {'MAX_HOURLY_USD', 'PER_ORDER_CAP_USD', 'TTL_CAP_HOURS'})
        self.assertNotIn('API_ORDER_CAP_USD', assigned('autopickup.py'))
        self.assertEqual((pod_runner.ORIGINAL_ORDER_CAP_USD, pod_runner.ORIGINAL_MAX_ATTEMPTS, pod_runner.ORIGINAL_MAX_HOURLY_USD,
                          pod_runner.ORIGINAL_TTL_CAP_HOURS), (20.0, 2, 5.0, 3.0))
        self.assertEqual(pod_capacity.MAX_ALLOCATIONS, OLD_MAX_ALLOCATIONS)

    def test_fresh_allocation_reads_only_the_original_accounting(self):
        source = (HERE / 'v16_allocation.py').read_text()
        for name in ('pod_runner.MAX_HOURLY_USD', 'pod_runner.TTL_CAP_HOURS', 'pod_runner.PER_ORDER_CAP_USD'):
            self.assertNotIn(name, source)
        self.assertEqual(source.count('pod_runner.ORIGINAL_MAX_HOURLY_USD'), 2)
        self.assertEqual(source.count('pod_runner.ORIGINAL_TTL_CAP_HOURS'), 2)
        self.assertTrue(hasattr(v16_allocation.FreshAllocation, '__call__'))


class OverrideTests(CapsTestCase):
    def test_override_is_used_instead_of_the_default(self):
        self.write(VALID)
        caps = plc.load(self.root)
        self.assertEqual((caps.max_hourly_usd, caps.per_order_cap_usd, caps.ttl_cap_hours, caps.api_order_cap_usd,
                          caps.max_pod_allocations, caps.source), (4.0, 40.0, 2.0, 2.5, 2, 'override'))
        self.assertEqual((pod_runner.MAX_HOURLY_USD, pod_runner.PER_ORDER_CAP_USD, pod_runner.TTL_CAP_HOURS), (4.0, 40.0, 2.0))
        self.assertEqual(ap.API_ORDER_CAP_USD, 2.5)
        self.assertEqual(pod_runner._attempt_rate({}), 4.0)
        self.assertEqual(pod_runner._order_ttl_cap('/jobs/other-order', {'kind': 'http_typesafe'}), 2.0)

    def test_override_may_raise_a_cap_it_is_a_config_edit(self):
        self.write(dict(VALID, max_hourly_usd=6.0, per_order_cap_usd=60.0, ttl_cap_hours=3.0, max_pod_allocations=3))
        self.assertEqual((pod_runner.MAX_HOURLY_USD, pod_runner.PER_ORDER_CAP_USD), (6.0, 60.0))

    def test_caps_are_read_at_use_time_and_the_override_can_be_removed(self):
        self.assertEqual(pod_runner.MAX_HOURLY_USD, 5.0)
        self.write(VALID)
        self.assertEqual(pod_runner.MAX_HOURLY_USD, 4.0)
        self.write(dict(VALID, max_hourly_usd=3.5))
        self.assertEqual(pod_runner.MAX_HOURLY_USD, 3.5)
        self.path.unlink()
        self.assertEqual(pod_runner.MAX_HOURLY_USD, 5.0)

    def test_group_writable_default_is_accepted_but_never_other_writable(self):
        copy = self.root / 'shipped-copy.json'
        shutil.copyfile(plc.DEFAULT_PATH, copy)
        with mock.patch.object(plc, 'DEFAULT_PATH', copy):
            os.chmod(copy, 0o664)  # a git checkout under umask 002
            self.assertEqual(plc.load_default().source, 'default')
            os.chmod(copy, 0o666)
            with self.assertRaisesRegex(plc.CapsInvalid, 'others'):
                plc.load_default()

    def test_a_default_that_is_a_symlink_is_refused(self):
        link = self.root / 'default-link.json'
        link.symlink_to(plc.DEFAULT_PATH)
        with mock.patch.object(plc, 'DEFAULT_PATH', link):
            with self.assertRaises(plc.CapsInvalid):
                plc.load_default()


def invalid_bodies():
    base = dict(VALID)
    cases = {
        'not json': b'{nope',
        'empty file': b'',
        'json array': b'[1, 2]',
        'json string': b'"caps"',
        'not utf-8': b'\xff\xfe{}',
        'extra key': dict(base, daily_usd=300.0),
        'missing key': {k: v for k, v in base.items() if k != 'ttl_cap_hours'},
        'missing api key': {k: v for k, v in base.items() if k != 'api_order_cap_usd'},
        'NaN literal': json.dumps(base).replace('4.0', 'NaN').encode(),
        'Infinity literal': json.dumps(base).replace('40.0', 'Infinity').encode(),
        '-Infinity literal': json.dumps(base).replace('40.0', '-Infinity').encode(),
        'overflow to inf': json.dumps(base).replace('40.0', '1e999').encode(),
        'duplicate key': json.dumps(base).replace('}', ', "max_hourly_usd": 49.0}').encode(),
        'schema_version 2': dict(base, schema_version=2),
        'schema_version string': dict(base, schema_version='1'),
        'schema_version float': dict(base, schema_version=1.0),
        'schema_version bool': dict(base, schema_version=True),
        'schema_version missing 0': dict(base, schema_version=0),
        'hourly zero': dict(base, max_hourly_usd=0),
        'order zero': dict(base, per_order_cap_usd=0.0),
        'ttl zero': dict(base, ttl_cap_hours=0),
        'api zero': dict(base, api_order_cap_usd=0),
        'hourly negative': dict(base, max_hourly_usd=-1.0),
        'order negative': dict(base, per_order_cap_usd=-50),
        'hourly bool': dict(base, max_hourly_usd=True),
        'order bool': dict(base, per_order_cap_usd=True),
        'api bool': dict(base, api_order_cap_usd=False),
        'hourly string': dict(base, max_hourly_usd='5'),
        'ttl null': dict(base, ttl_cap_hours=None),
        'api list': dict(base, api_order_cap_usd=[5.0]),
        'invariant broken': dict(base, per_order_cap_usd=7.0),  # 4.0 * 2.0 = 8 does not fit
        'invariant broken by hourly': dict(base, max_hourly_usd=21.0),  # 21 * 2 = 42 > 40
        'hourly above typo guard': dict(base, max_hourly_usd=50.5, per_order_cap_usd=999.0),
        'order above typo guard': dict(base, per_order_cap_usd=1000.5),
        'ttl above typo guard': dict(base, ttl_cap_hours=24.5, per_order_cap_usd=900.0, max_hourly_usd=1.0),
        'api above typo guard': dict(base, api_order_cap_usd=100.5),
        'allocations zero': dict(base, max_pod_allocations=0),
        'allocations above the code ceiling': dict(base, max_pod_allocations=pod_capacity.MAX_ALLOCATIONS + 1),
        'allocations float': dict(base, max_pod_allocations=2.0),
        'allocations bool': dict(base, max_pod_allocations=True),
        'allocations negative': dict(base, max_pod_allocations=-1),
    }
    return cases


class InvalidOverrideTests(CapsTestCase):
    def assert_fails_closed(self, label):
        with self.assertRaises(plc.CapsInvalid, msg=label):
            plc.load(self.root)  # and never the shipped default instead
        with mock.patch.object(pod_runner, '_run') as inner:
            with self.assertRaises(measurement_dispatch.OperationalHold, msg=label) as ctx:
                self.run_pod_runner()
            inner.assert_not_called()
        self.assertEqual(str(ctx.exception), REASON, label)
        with self.assertRaises(measurement_dispatch.OperationalHold, msg=label):
            pod_runner.MAX_HOURLY_USD
        with self.assertRaises(measurement_dispatch.OperationalHold, msg=label):
            ap.API_ORDER_CAP_USD
        with self.assertRaises(measurement_dispatch.OperationalHold, msg=label):
            ap.paid_lane_caps_in_force()
        self.assertLessEqual({entry.name for entry in self.root.iterdir()}, {'config'}, label)  # nothing was reserved or recorded

    def test_every_invalid_body_holds_before_any_pod_or_endpoint_spend(self):
        for label, body in invalid_bodies().items():
            with self.subTest(label):
                self.write(body)
                self.assert_fails_closed(label)

    def test_symlink_override_is_refused_even_when_the_target_is_valid(self):
        outside = Path(tempfile.mkdtemp(prefix='paid-lane-caps-target-'))
        self.addCleanup(shutil.rmtree, outside, ignore_errors=True)
        target = outside / 'elsewhere.json'
        target.write_text(json.dumps(VALID))
        os.chmod(target, 0o600)
        self.path.parent.mkdir(parents=True)
        self.path.symlink_to(target)
        self.assert_fails_closed('symlink')

    def test_dangling_symlink_override_is_refused_not_ignored(self):
        self.path.parent.mkdir(parents=True)
        self.path.symlink_to(self.root / 'missing.json')
        self.assert_fails_closed('dangling symlink')

    def test_group_writable_override_is_refused(self):
        self.write(VALID, mode=0o660)
        self.assert_fails_closed('group-writable')

    def test_other_writable_override_is_refused(self):
        self.write(VALID, mode=0o606)
        self.assert_fails_closed('other-writable')

    def test_override_owned_by_someone_else_is_refused(self):
        self.write(VALID)
        with mock.patch.object(plc.os, 'getuid', return_value=os.getuid() + 1):
            with self.assertRaisesRegex(plc.CapsInvalid, 'owned by'):
                plc.load(self.root)

    def test_directory_or_fifo_in_place_of_the_override_is_refused(self):
        self.path.mkdir(parents=True)
        self.assert_fails_closed('directory')
        self.path.rmdir()
        os.mkfifo(self.path)
        self.assert_fails_closed('fifo')

    def test_oversized_override_is_refused(self):
        body = json.dumps(VALID).encode() + b' ' * (plc.MAX_FILE_BYTES + 1)
        self.write(body)
        self.assert_fails_closed('oversized')
        self.write(json.dumps(VALID).encode() + b' ' * 1000)  # a slightly padded file is fine
        self.assertEqual(plc.load(self.root).source, 'override')

    @unittest.skipIf(os.geteuid() == 0, 'root can read a mode 000 directory')
    def test_unreadable_config_directory_is_refused_not_ignored(self):
        self.write(VALID)
        os.chmod(self.path.parent, 0)
        self.addCleanup(os.chmod, self.path.parent, 0o700)
        self.assert_fails_closed('unreadable directory')

    def test_a_fixed_override_resumes_the_next_dispatch(self):
        self.write(b'{nope')
        with self.assertRaises(measurement_dispatch.OperationalHold):
            pod_runner.caps()
        self.write(VALID)
        self.assertEqual(pod_runner.caps().max_hourly_usd, 4.0)


class HoldReasonTests(unittest.TestCase):
    def test_reason_is_transient_and_has_customer_and_operator_text(self):
        self.assertEqual(plc.HOLD_REASON, REASON)
        self.assertIn(REASON, ap.TRANSIENT_HOLD_REASONS)
        self.assertNotIn(REASON, ap.IMMEDIATE_RETRY_HOLD_REASONS)
        english, german = ap.HOLD_REASON_LABELS[REASON]
        self.assertEqual(ap.hold_reason_label(REASON), english)
        self.assertEqual(ap.hold_reason_label(REASON, language='de'), german)
        self.assertIn(REASON, ap.SHORT_HOLD_LABELS)
        for text in (english, german, ap.SHORT_HOLD_LABELS[REASON]):
            self.assertNotIn(REASON, text)
            self.assertNotIn('json', text.lower())
            self.assertNotIn('/', text)


class SnapshotTests(CapsTestCase):
    def test_one_dispatch_uses_one_snapshot_even_if_the_file_changes_mid_run(self):
        self.write(VALID)
        seen = []

        def inner(*args, **kwargs):
            seen.append(pod_runner.caps())
            self.write(b'{broken mid-run')
            seen.append(pod_runner.caps())      # still the pinned snapshot: no hold in the middle of an attempt
            seen.append(pod_runner.MAX_HOURLY_USD)
            return {'ok': True}
        with mock.patch.object(pod_runner, '_run', side_effect=inner):
            self.assertEqual(self.run_pod_runner(), {'ok': True})
        self.assertEqual((seen[0].max_hourly_usd, seen[0].source), (4.0, 'override'))
        self.assertIs(seen[0], seen[1])
        self.assertEqual(seen[2], 4.0)
        with self.assertRaises(measurement_dispatch.OperationalHold):  # the next dispatch fails closed
            self.run_pod_runner()

    def test_allocation_gated_orders_run_on_the_original_accounting_whatever_the_config_says(self):
        self.write(dict(VALID, max_hourly_usd=9.0, per_order_cap_usd=900.0, ttl_cap_hours=8.0, max_pod_allocations=3))
        seen = []
        with mock.patch.object(pod_runner, '_run', side_effect=lambda *a, **k: seen.append(pod_runner.caps())):
            self.run_pod_runner(allocation_gate=object())
            self.run_pod_runner()
        gated, ordinary = seen
        self.assertEqual((gated.max_hourly_usd, gated.per_order_cap_usd, gated.ttl_cap_hours, gated.max_pod_allocations,
                          gated.source), (5.0, 20.0, 3.0, 3, 'original-accounting'))
        self.assertEqual((ordinary.max_hourly_usd, ordinary.per_order_cap_usd, ordinary.ttl_cap_hours), (9.0, 900.0, 8.0))

    def test_gated_orders_still_fail_closed_on_an_invalid_config(self):
        self.write(b'{nope')
        with mock.patch.object(pod_runner, '_run') as inner:
            with self.assertRaises(measurement_dispatch.OperationalHold):
                self.run_pod_runner(allocation_gate=object())
            inner.assert_not_called()

    def test_run_keeps_the_signature_of_the_function_it_wraps(self):
        import inspect
        self.assertIn('allocation_gate', inspect.signature(pod_runner.run).parameters)
        self.assertEqual(pod_runner.run.__name__, 'run')


class ProviderCeilingTests(CapsTestCase):
    def test_lium_create_ceiling_is_the_configured_hourly_cap(self):
        self.write(VALID)
        provider = pod_runner.LiumProvider()
        with mock.patch.object(pod_runner.LiumProvider, 'ps_ids', side_effect=AssertionError('create went on')):
            for bad in (4.5, 5.0, None, True, '4'):
                with self.subTest(bad), self.assertRaises(pod_runner.PodRunError):
                    provider.create('H100', 1.0, 4.0, max_hourly=bad)

    def test_verda_create_ceiling_is_the_configured_hourly_cap(self):
        self.write(VALID)
        provider = verda_provider.VerdaProvider('order', 'fastlane-test')
        with mock.patch.object(verda_provider.VerdaProvider, '_quote', side_effect=AssertionError('create went on')):
            for bad in (4.5, None, True):
                with self.subTest(bad), self.assertRaises(pod_runner.PodRunError):
                    provider.create('H100', 1.0, 4.0, max_hourly=bad)

    def test_an_invalid_config_stops_a_provider_create_too(self):
        self.write(b'{nope')
        with mock.patch.object(pod_runner.LiumProvider, 'ps_ids', side_effect=AssertionError('create went on')):
            with self.assertRaises(measurement_dispatch.OperationalHold):
                pod_runner.LiumProvider().create('H100', 1.0, 4.0)


class DispatchTests(CapsTestCase):
    """autopickup.dispatch_measurement reads the caps once, before any pod or endpoint spend."""

    class Stop(Exception):
        pass

    def dispatch(self, endpoint_run):
        runtime = {'backend': 'openrouter', 'credential': 'none'}
        order = {'benchmarks': ['imagejevbench']}
        patches = [
            mock.patch.object(ap, 'validate_review_gate', return_value={'source_pins': {'official_measurement': {}}}),
            mock.patch.object(ap, 'load_row', return_value=order),
            mock.patch.object(ap, 'auto_admit_hook', return_value=None),
            mock.patch.object(ap, 'load_state', return_value={}),
            mock.patch.object(ap, 'load_json_file', side_effect=[{'imagejevbench': runtime}, {'imagejevbench': {}}]),
            mock.patch.object(ap.measurement_dispatch, 'runtime_spec'),
            mock.patch.object(ap.measurement_dispatch, 'validate_api_meta'),
            mock.patch.object(ap.measurement_dispatch, 'run', side_effect=endpoint_run),
            mock.patch.object(ap.pod_runner, 'run', side_effect=AssertionError('pod_runner.run reached')),
        ]
        with mock.patch.object(ap.native_owner, 'is_strands_e2b_order', return_value=False):
            for patch in patches:
                patch.start()
                self.addCleanup(patch.stop)
            return ap.dispatch_measurement('00000000-0000-4000-8000-000000000002', self.root / 'job')

    def test_invalid_config_holds_before_the_endpoint_measurement(self):
        calls = []
        self.write(b'{"schema_version": 1,')  # truncated JSON
        with self.assertRaises(measurement_dispatch.OperationalHold) as ctx:
            self.dispatch(lambda *a, **k: calls.append(a))
        self.assertEqual(str(ctx.exception), REASON)
        self.assertEqual(calls, [])

    def test_the_configured_api_cap_is_the_endpoint_budget(self):
        seen = []

        def endpoint(*args, **kwargs):
            seen.append(args[-1])
            raise self.Stop

        for body, expected in ((None, OLD_API_ORDER_CAP_USD), (VALID, 2.5), (dict(VALID, api_order_cap_usd=7.0), 7.0)):
            if body is not None:
                self.write(body)
            with self.subTest(expected), self.assertRaises(self.Stop):
                self.dispatch(endpoint)
        self.assertEqual(seen, [5.0, 2.5, 7.0])

    def test_dispatch_reads_the_caps_before_anything_that_spends(self):
        tree = ast.parse((HERE / 'autopickup.py').read_text())
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'dispatch_measurement')
        lines = {}
        for node in ast.walk(function):
            if isinstance(node, ast.Call):
                name = ast.unparse(node.func)
                if name in ('paid_lane_caps_in_force', 'pod_runner.run', 'measurement_dispatch.run'):
                    lines.setdefault(name, []).append(node.lineno)
        self.assertEqual(len(lines['paid_lane_caps_in_force']), 1)
        self.assertLess(lines['paid_lane_caps_in_force'][0], min(lines['pod_runner.run'] + lines['measurement_dispatch.run']))
        source = ast.unparse(function)
        for stale in ('pod_runner.PER_ORDER_CAP_USD', 'API_ORDER_CAP_USD -'):
            self.assertNotIn(stale, source)


class InstallerTests(unittest.TestCase):
    def test_installer_ships_the_loader_and_the_default_and_keeps_the_override(self):
        text = (HERE / 'install-autopickup.sh').read_text()
        listed = next(line for line in text.splitlines() if line.startswith('for f in '))
        self.assertIn(' paid_lane_caps.py ', listed)
        self.assertIn(' paid-lane-caps.json ', listed)
        self.assertNotIn('config/paid-lane-caps.json', text)  # an install never writes or replaces the operator override

    def test_loader_cli_reports_the_effective_caps_and_the_reason_when_invalid(self):
        import contextlib
        import io
        root = Path(tempfile.mkdtemp(prefix='paid-lane-caps-cli-'))
        self.addCleanup(shutil.rmtree, root, ignore_errors=True)
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(plc.main(['x', str(root)]), 0)
        self.assertEqual(json.loads(out.getvalue())['max_hourly_usd'], 5.0)
        (root / 'config').mkdir()
        (root / 'config' / 'paid-lane-caps.json').write_text('{}')
        os.chmod(root / 'config' / 'paid-lane-caps.json', 0o600)
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            self.assertEqual(plc.main(['x', str(root)]), 1)
        self.assertIn(REASON, err.getvalue())


if __name__ == '__main__':
    unittest.main()
