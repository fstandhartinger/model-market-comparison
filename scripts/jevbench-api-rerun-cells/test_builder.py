"""Offline integrity checks with synthetic frozen pools; no API calls."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('builder', Path(__file__).with_name('build_api_rerun_cells.py'))
B = importlib.util.module_from_spec(spec)
spec.loader.exec_module(B)


class UnionChecks(unittest.TestCase):
    def test_stable_union_original_public_wins_and_later_pools_work(self):
        p = SimpleNamespace(item_id='public', split='open')
        l = SimpleNamespace(item_id='new', split='sealed')
        c = SimpleNamespace(item_id='c1', split='sealed')
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            pools = []
            for name in ('L1', 'L3', 'C1'):
                rd = root / name
                run = rd / 'runs/api/x.jsonl'
                run.parent.mkdir(parents=True)
                run.write_text('{"task_id": "t1"}\n')
                Path(str(run) + '.exposure.json').write_text('{}')
                pools.append((name, rd, {'t1': None}))
            with patch.object(B, 'answered', side_effect=[[(p, 9), (l, 2)], [(l, 3)], [(c, 4)]]):
                items, tags, receipts = B.category_union('x', {}, 'A4', [(p, 1)], pools,
                                                        {'public': ('x', 'u'), 'new': ('x', 'u'), 'c1': ('x', 'u')})
            self.assertEqual([(g.item_id, s) for g, s in items], [('public', 1), ('new', 2), ('c1', 4)])
            self.assertEqual(tags, 'A4+P+L1+L3+C1')
            self.assertEqual(len(receipts), 3)

    def test_incomplete_supplement_run_is_skipped(self):
        p = SimpleNamespace(item_id='public', split='open')
        with tempfile.TemporaryDirectory() as tmp:
            rd = Path(tmp) / 'L1'
            run = rd / 'runs/api/x.jsonl'
            run.parent.mkdir(parents=True)
            run.write_text('{"task_id": "t1"}\n')
            Path(str(run) + '.exposure.json').write_text('{}')
            with patch.object(B, 'answered', side_effect=AssertionError('must not score an incomplete run')):
                items, tags, receipts = B.category_union('x', {}, 'A4', [(p, 1)], [('L1', rd, {'t1': None, 't2': None})],
                                                        {'public': ('x', 'u')})
            self.assertEqual(tags, 'A4+P')
            self.assertEqual(receipts, [])

    def test_missing_receipt_refuses_existing_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            rd = Path(tmp)
            run = rd / 'runs/api/x.jsonl'
            run.parent.mkdir(parents=True)
            run.write_text('{}\n')
            with self.assertRaisesRegex(AssertionError, 'receipt'):
                B.category_union('x', {}, 'A4', [], [('L1', rd, {})], {})

    def test_answered_does_not_impute_absent_response(self):
        present = SimpleNamespace(oid='seen')
        absent = SimpleNamespace(oid='absent')
        with patch.object(B.V, 'read_rows', return_value=[{'task_id': 'seen'}]), patch.object(
                B.V, 'build_systems', return_value=({'x': SimpleNamespace(scored=[(present, 1), (absent, 0)])}, {})):
            self.assertEqual(B.answered({'seen': present, 'absent': absent}, 'x', {}, Path('unused')), [(present, 1)])

    def test_unknown_or_duplicate_response_refused(self):
        for rows in ([{'task_id': 'bad'}], [{'task_id': 'a'}, {'task_id': 'a'}]):
            with patch.object(B.V, 'read_rows', return_value=rows), self.assertRaisesRegex(AssertionError, 'unjoined'):
                B.answered({'a': None}, 'x', {}, Path('unused'))

    def test_frozen_map_mismatch_refused(self):
        g = SimpleNamespace(item_id='stable', split='open')
        with tempfile.TemporaryDirectory() as tmp:
            rd = Path(tmp)
            (rd / 'frozen').mkdir()
            (rd / 'frozen/id-map.json').write_text(json.dumps({'a': {'item_id': 'wrong', 'split': 'open'}}))
            with patch.object(B.V, 'load_gold', return_value={'a': g}), self.assertRaisesRegex(AssertionError, 'identity'):
                B.load_pool(rd)

    def test_authoring_usecase_precedence(self):
        g = SimpleNamespace(item_id='stable', usecase='ecommerce')
        labels = B.stable_labels([{'a': g}], {'topic': {'a': 'coding'}, 'usecase': {'a': 'other'}})
        self.assertEqual(labels['stable'], ('coding', 'ecommerce_marketplaces'))
