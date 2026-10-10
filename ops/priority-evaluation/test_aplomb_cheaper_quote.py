"""Inert fixtures for the original Aplomb order's cheaper-quote exception.

No provider request, pod, mail, database or customer code: pod_capacity.quote is patched and the
recipe is the public metadata of the original paid order (no input bodies, no secrets)."""
import ast
import copy
from datetime import datetime, timezone
import inspect
import json
from pathlib import Path
import unittest
import uuid
from unittest.mock import patch

import pod_capacity as pc
import pod_runner as pr

RID = 'acad951a-1b9d-4f3c-a449-350d1c04bd23'
BENCHES = ('jevbench', 'imagejevbench')
FIXTURE = Path(__file__).with_name('test-fixtures') / 'aplomb-original-recipe.json'


def original_recipe():
    return json.loads(FIXTURE.read_text())


def quote(rate, gpu='RTX5090', count=1):
    return {'gpu': gpu, 'gpu_count': count, 'hourly_usd': rate, 'node_id': str(uuid.uuid4()),
            'quoted_at': datetime.now(timezone.utc).isoformat()}


class HelperTests(unittest.TestCase):
    def test_original_recipe_accepts_cheaper_and_equal_rate(self):
        for rate in (.63, .65, .5):
            with self.subTest(rate=rate):
                self.assertTrue(pr._original_aplomb_cheaper_quote(RID, 'RTX5090', 1, original_recipe(), BENCHES, rate))
        self.assertTrue(pr._original_aplomb_cheaper_quote(RID, 'RTX5090', 1, original_recipe(), list(BENCHES), .63))

    def test_rate_must_be_finite_positive_number_within_ceiling(self):
        for rate in (True, False, float('nan'), float('inf'), -float('inf'), 0, 0.0, -.1, .6500001, .66, 1, 5,
                     '0.63', None, [.63]):
            with self.subTest(rate=rate):
                self.assertFalse(pr._original_aplomb_cheaper_quote(RID, 'RTX5090', 1, original_recipe(), BENCHES, rate))

    def test_order_gpu_count_and_benchmarks_are_exact(self):
        cases = [
            (str(uuid.uuid4()), 'RTX5090', 1, BENCHES),
            (None, 'RTX5090', 1, BENCHES),
            (RID.upper(), 'RTX5090', 1, BENCHES),
            (RID, 'RTXPRO6000', 1, BENCHES),
            (RID, 'RTX4090', 1, BENCHES),
            (RID, 'RTX5090', 2, BENCHES),
            (RID, 'RTX5090', True, BENCHES),
            (RID, 'RTX5090', 1.0, BENCHES),
            (RID, 'RTX5090', 1, ('jevbench',)),
            (RID, 'RTX5090', 1, ('imagejevbench',)),
            (RID, 'RTX5090', 1, ('imagejevbench', 'jevbench')),
            (RID, 'RTX5090', 1, BENCHES + ('jevbench',)),
        ]
        for rid, gpu, count, benches in cases:
            with self.subTest(rid=rid, gpu=gpu, count=count, benches=benches):
                self.assertFalse(pr._original_aplomb_cheaper_quote(rid, gpu, count, original_recipe(), benches, .63))

    def test_any_recipe_change_breaks_fingerprint(self):
        def mutate(fn):
            recipe = original_recipe()
            fn(recipe)
            return recipe
        altered = [
            mutate(lambda r: r.update(hourly_usd=.63)),
            mutate(lambda r: r.update(min_vram_gb=24)),
            mutate(lambda r: r.update(image=r['image'].replace('db80', 'db81'))),
            mutate(lambda r: r['code'].update(commit='0' * 40)),
            mutate(lambda r: r['host_staging'].update(weights_manifest_sha256='0' * 64)),
            mutate(lambda r: r['host_staging']['weights_manifest'].pop()),
            mutate(lambda r: r['weights'][0]['sha256'].update({'run_aplomb.py': '0' * 64})),
            mutate(lambda r: r.update(extra=None)),
            mutate(lambda r: r.pop('schema_version')),
            mutate(lambda r: r.update(hourly_usd=float('nan'))),
            mutate(lambda r: r.update(unserializable=object())),
            {},
        ]
        for recipe in altered:
            with self.subTest(keys=sorted(recipe)):
                self.assertFalse(pr._original_aplomb_cheaper_quote(RID, 'RTX5090', 1, recipe, BENCHES, .63))

    def test_fingerprint_ignores_key_order_only(self):
        recipe = original_recipe()
        reordered = json.loads(json.dumps(dict(reversed(list(recipe.items())))))
        self.assertTrue(pr._original_aplomb_cheaper_quote(RID, 'RTX5090', 1, reordered, BENCHES, .63))


class PreflightTests(unittest.TestCase):
    def preflight(self, rate, *, order_id=RID, recipe=None, gpu='RTX5090', benches=BENCHES):
        recipe = original_recipe() if recipe is None else recipe
        q = quote(rate, gpu)
        with patch.object(pc, 'quote', return_value=q) as called:
            provider = pr.LiumProvider(order_id=order_id)
            result = provider.preflight(gpu, recipe, benches)
        return provider, result, called, q

    def test_original_order_accepts_cheaper_and_exact_quote(self):
        for rate in (.63, .65):
            with self.subTest(rate=rate):
                provider, result, called, q = self.preflight(rate)
                self.assertEqual(result, {'quote': q, 'refusals': [], 'quote_count': 1})
                self.assertIs(provider._placement, q)
                # Accounting/cap stays at the conservative recipe rate, not the cheaper live quote.
                self.assertEqual(called.call_args.args[0:2], ('RTX5090', 1))
                self.assertEqual(called.call_args.args[4], .65)

    def hold(self, rate, **kwargs):
        with self.assertRaisesRegex(pr.measurement_dispatch.OperationalHold, 'gpu_pod_quote_changed'):
            self.preflight(rate, **kwargs)

    def test_original_order_refuses_bad_rates(self):
        for rate in (True, float('nan'), float('inf'), 0, -.1, .66, 1.3):
            with self.subTest(rate=rate):
                self.hold(rate)

    def test_other_orders_and_altered_recipes_keep_exact_price(self):
        altered = original_recipe()
        altered['min_vram_gb'] = 24
        for kwargs in ({'order_id': str(uuid.uuid4())}, {'order_id': None}, {'recipe': altered},
                       {'gpu': 'RTXPRO6000'}, {'benches': ('jevbench',)}):
            with self.subTest(kwargs=kwargs):
                self.hold(.63, **kwargs)
        with patch.object(pc, 'quote', return_value=quote(.63)), \
                self.assertRaisesRegex(pr.measurement_dispatch.OperationalHold, 'gpu_pod_quote_changed'):
            pr.LiumProvider().preflight('RTX5090', original_recipe(), BENCHES)

    def test_other_orders_exact_price_still_accepted(self):
        rid = str(uuid.uuid4())
        _, result, _, q = self.preflight(.65, order_id=rid)
        self.assertIs(result['quote'], q)
        recipe = {'kind': 'aplomb_native', 'min_vram_gb': 96, 'hourly_usd': 1.3}
        with patch.object(pc, 'quote', return_value=quote(1.3, 'RTXPRO6000')):
            self.assertEqual(pr.LiumProvider(order_id=rid).preflight('RTXPRO6000', recipe, ('jevbench',))['quote']['hourly_usd'], 1.3)
        with patch.object(pc, 'quote', return_value=quote(1.2, 'RTXPRO6000')), \
                self.assertRaisesRegex(pr.measurement_dispatch.OperationalHold, 'gpu_pod_quote_changed'):
            pr.LiumProvider(order_id=rid).preflight('RTXPRO6000', recipe, ('jevbench',))

    def test_unpinned_routes_unchanged(self):
        recipe = {'kind': 'http_typesafe', 'min_vram_gb': 96}
        for order_id in (None, RID):
            with patch.object(pc, 'quote', return_value=quote(2.1, 'RTXPRO6000')):
                result = pr.LiumProvider(order_id=order_id).preflight('RTXPRO6000', recipe, ('jevbench',))
            self.assertEqual(result['quote']['hourly_usd'], 2.1)

    def test_refusal_and_evidence_errors_unchanged(self):
        refusal = {'refused': True, 'phase': 'read_only_preflight'}
        with patch.object(pc, 'quote', return_value=refusal):
            result = pr.LiumProvider(order_id=RID).preflight('RTX5090', original_recipe(), BENCHES)
        self.assertEqual(result, {'quote': None, 'refusals': [refusal], 'quote_count': 1})
        with patch.object(pc, 'quote', side_effect=pc.CapacityEvidenceError('cap')), \
                self.assertRaisesRegex(pr.measurement_dispatch.OperationalHold, 'gpu_pod_quote_changed'):
            pr.LiumProvider(order_id=RID).preflight('RTX5090', original_recipe(), BENCHES)

    def test_recipe_rate_stays_conservative(self):
        recipe = original_recipe()
        self.assertEqual(recipe['hourly_usd'], .65)
        self.assertEqual(pr._attempt_rate(recipe), .65)
        before = copy.deepcopy(recipe)
        self.preflight(.63, recipe=recipe)
        self.assertEqual(recipe, before)

    def test_run_binds_default_provider_to_order(self):
        tree = ast.parse(inspect.getsource(pr.run))
        calls = [n for n in ast.walk(tree) if isinstance(n, ast.Call) and getattr(n.func, 'id', None) == 'LiumProvider']
        self.assertEqual(len(calls), 1)
        self.assertEqual([(k.arg, k.value.id) for k in calls[0].keywords], [('order_id', 'rid')])
        self.assertEqual(calls[0].args, [])


if __name__ == '__main__':
    unittest.main()
