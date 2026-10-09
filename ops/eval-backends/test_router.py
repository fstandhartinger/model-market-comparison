import copy
import unittest
from router import choose_backend


class RouterTests(unittest.TestCase):
    def setUp(self):
        self.now = '2026-10-09T10:00:00Z'
        self.recipe = dict(gpu_count=1, gpu_vram_gb=96, required_vram_gb=90,
                           image_digest='sha256:' + 'a' * 64, cuda_version='12.8',
                           torch_version='2.7.0', sm120=True, docker_in_docker=False,
                           requested_max_liability_usd=2, methodology_version='v1', model_revision='abc')
        self.allowance = dict(org='system1models-org', monthly_limit_usd=30,
                              payg=False, observed_at=self.now, cycle='2026-10', used_usd=0, reserved_usd=0)
        self.equivalence = {key: self.recipe[key] for key in ('methodology_version', 'model_revision', 'image_digest')}
        self.equivalence.update(passed=True, measured=True, receipt='measured-run-123')

    def route(self, state=None):
        return choose_backend(self.recipe, {} if state is None else state, self.allowance, self.equivalence, self.now)

    def test_eligible_and_no_input_mutation(self):
        original = copy.deepcopy((self.recipe, self.allowance, self.equivalence))
        self.assertEqual(self.route()['backend'], 'coreweave')
        self.assertEqual(original, (self.recipe, self.allowance, self.equivalence))

    def test_every_required_gate_missing_fails_closed(self):
        for mapping in (self.recipe, self.allowance, self.equivalence):
            for key in list(mapping):
                with self.subTest(key=key):
                    value = mapping.pop(key)
                    self.assertEqual(self.route()['backend'], 'lium')
                    mapping[key] = value

    def test_costs_are_finite_nonnegative_and_strict(self):
        for field, mapping in [('requested_max_liability_usd', self.recipe), ('used_usd', self.allowance), ('reserved_usd', self.allowance), ('monthly_limit_usd', self.allowance)]:
            old = mapping[field]
            for value in (True, False, float('nan'), float('inf'), -1, '0', None):
                with self.subTest(field=field, value=value):
                    mapping[field] = value
                    self.assertEqual(self.route()['backend'], 'lium')
            mapping[field] = old
        self.allowance.update(used_usd=20, reserved_usd=5)
        self.assertEqual(self.route()['backend'], 'lium')
        self.recipe['requested_max_liability_usd'] = 1.99
        self.assertEqual(self.route()['backend'], 'coreweave')

    def test_freshness_cycle_and_payg(self):
        for timestamp in ('2026-10-09T09:54:59Z', '2026-10-09T10:00:01Z', '2026-10-09T10:00:00', 'bad'):
            self.allowance['observed_at'] = timestamp
            self.assertEqual(self.route()['backend'], 'lium')
        self.allowance['observed_at'] = '2026-10-09T09:55:00Z'
        self.assertEqual(self.route()['backend'], 'coreweave')
        self.allowance['cycle'] = '2026-09'
        self.assertEqual(self.route()['backend'], 'lium')
        self.allowance['cycle'] = '2026-10'
        self.allowance['payg'] = True
        self.assertEqual(self.route()['backend'], 'lium')

    def test_month_boundary_requires_current_cycle_receipt(self):
        self.now = '2026-11-01T00:01:00Z'
        self.allowance.update(cycle='2026-11', observed_at='2026-10-31T23:59:00Z')
        self.assertEqual(self.route()['reason']['code'], 'allowance_cycle_invalid')

    def test_active_orders_preserve_pin_even_without_new_gates(self):
        self.allowance = None
        for flag in ('started', 'dispatched', 'attempted'):
            for provider in ('lium', 'runpod', 'coreweave'):
                self.assertEqual(self.route({flag: True, 'provider': provider})['backend'], provider)
        self.assertEqual(self.route({'attempted': True})['reason']['code'], 'provider_pin_unknown')
        self.assertEqual(self.route({'attempted': 'false'})['reason']['code'], 'state_invalid')
        self.assertEqual(self.route({'status': 'unknown'})['backend'], 'lium')

    def test_today_and_expired_deadlines_use_legacy(self):
        for deadline in ('2026-10-09T23:59:59Z', '2026-10-08T12:00:00Z', 'bad'):
            self.recipe['deadline'] = deadline
            self.assertEqual(self.route()['backend'], 'lium')
        self.recipe['deadline'] = '2026-10-10T00:00:00Z'
        self.assertEqual(self.route()['backend'], 'coreweave')

    def test_diagnostic_bypasses_only_equivalence(self):
        self.recipe['diagnostic'] = True
        self.equivalence = None
        self.assertEqual(self.route()['backend'], 'coreweave')
        self.recipe['docker_in_docker'] = True
        self.assertEqual(self.route()['backend'], 'lium')
        self.recipe['docker_in_docker'] = False
        self.allowance['used_usd'] = 30
        self.assertEqual(self.route()['backend'], 'lium')

    def test_runtime_and_memory_edges(self):
        for key, values in {'gpu_count': [True, 1.0, 2], 'gpu_vram_gb': [97, True, float('nan')], 'required_vram_gb': [97, 0, None], 'cuda_version': ['12.7', 'unknown'], 'torch_version': ['2.6', 2.7], 'sm120': [False, 1], 'docker_in_docker': [True, None], 'image_digest': ['latest', 'sha256:abc']}.items():
            old = self.recipe[key]
            for value in values:
                self.recipe[key] = value
                self.assertEqual(self.route()['backend'], 'lium', (key, value))
            self.recipe[key] = old

    def test_equivalence_is_exact_and_measured(self):
        for key in ('methodology_version', 'model_revision', 'image_digest'):
            old = self.equivalence[key]
            self.equivalence[key] = old + '-different'
            self.assertEqual(self.route()['backend'], 'lium')
            self.equivalence[key] = old
        self.equivalence['measured'] = False
        self.assertEqual(self.route()['backend'], 'lium')


if __name__ == '__main__':
    unittest.main()
