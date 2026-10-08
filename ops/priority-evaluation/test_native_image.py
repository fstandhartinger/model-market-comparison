"""Synthetic-only checks of the proposed native image mapping; no model loading."""
import base64
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock
import sys
from types import SimpleNamespace

MARKER_SPEC = importlib.util.spec_from_file_location('scored_marker', Path(__file__).parent / 'pod_drivers/scored_marker.py')
marker_module = importlib.util.module_from_spec(MARKER_SPEC)
sys.modules['scored_marker'] = marker_module
MARKER_SPEC.loader.exec_module(marker_module)

SPEC = importlib.util.spec_from_file_location('native_image', Path(__file__).parent / 'pod_drivers/native_image.py')
native = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(native)
sys.modules['native_image'] = native
DRIVER_SPEC = importlib.util.spec_from_file_location('pod_driver', Path(__file__).parent / 'pod_drivers/pod_driver.py')
driver = importlib.util.module_from_spec(DRIVER_SPEC)
sys.modules['pod_driver'] = driver
DRIVER_SPEC.loader.exec_module(driver)
ORDER_SPEC = importlib.util.spec_from_file_location('pod_order_driver', Path(__file__).parent / 'pod_drivers/pod_order_driver.py')
order = importlib.util.module_from_spec(ORDER_SPEC)
sys.modules['pod_order_driver'] = order
ORDER_SPEC.loader.exec_module(order)


class SyntheticModel:
    def __init__(self, answer=None, error=None):
        self.answer = answer
        self.error = error
        self.calls = []

    def predict(self, state, questions):
        self.calls.append((state, questions))
        if self.error:
            raise self.error
        return self.answer


class NativeImageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'pinned-part'
        (self.root / 'images').mkdir(parents=True)
        self.data = b'\x89PNG\r\n\x1a\nsynthetic exact bytes\x00\xff'
        (self.root / 'images/example.png').write_bytes(self.data)
        self.task = {'token': 'synthetic-token', 'question': 'Which synthetic option?',
                     'options': [{'label': 'first', 'description': '  exact first text  '},
                                 {'label': 'second', 'description': 'exact second text'}],
                     'image': 'images/example.png'}
        self.out = {'answers': {'decision': {'type': 'choice', 'choice': 'B',
                    'probabilities': {'B': .8, 'A': .2}}},
                    'usage': {'input_tokens': 3, 'output_tokens': 1, 'cost': .001,
                              'echo': 'secret prompt', 'nan': float('nan')}}

    def record(self, out=None, task=None):
        model = SyntheticModel(self.out if out is None else out)
        return native.native_image_record(model, self.task if task is None else task, self.root), model

    def test_native_mapping_exact_bytes_and_token(self):
        row, model = self.record()
        self.assertEqual(row['token'], self.task['token'])
        self.assertEqual(row['status'], 'ok')
        self.assertEqual(row['answer_index'], 1)
        self.assertEqual(row['probabilities'], [.2, .8])
        self.assertEqual(row['http_status'], 200)
        self.assertGreaterEqual(row['latency_s'], 0)
        state, questions = model.calls[0]
        self.assertEqual(state['image']['type'], 'image')
        self.assertEqual(state['image']['mime'], 'image/png')
        self.assertEqual(base64.b64decode(state['image']['data']), self.data)
        self.assertEqual(questions['decision']['criteria'], {
            'A': 'first:   exact first text  ', 'B': 'second: exact second text'})
        self.assertIn(self.task['question'], questions['decision']['instructions'])
        self.assertNotIn(self.task['token'], json.dumps(questions))
        self.assertEqual(row['usage'], {'input_tokens': 3, 'output_tokens': 1, 'cost': .001})
        self.assertNotIn('secret prompt', json.dumps(row, allow_nan=False))

    def test_invalid_answers_keep_denominator_record(self):
        variants = [
            ({'answers': {}}, 'invalid_answer'),
            ({'choice': 'C'}, 'invalid_answer'),
            ({'type': 'noul'}, 'invalid_answer'),
            ({'probabilities': {'A': .2}}, 'invalid_probability_keys'),
            ({'probabilities': {'A': .2, 'B': .8, 'C': 0}}, 'invalid_probability_keys'),
            ({'probabilities': {'A': True, 'B': 0}}, 'invalid_probability_values'),
            ({'probabilities': {'A': '0.2', 'B': .8}}, 'invalid_probability_values'),
            ({'probabilities': {'A': float('nan'), 'B': .8}}, 'invalid_probability_values'),
            ({'probabilities': {'A': float('inf'), 'B': .8}}, 'invalid_probability_values'),
            ({'probabilities': {'A': -.2, 'B': 1.2}}, 'invalid_probability_values'),
            ({'probabilities': {'A': .2, 'B': .7}}, 'invalid_probability_sum'),
            ({'probabilities': {'A': 0, 'B': 0}}, 'invalid_probability_sum'),
            ({'choice': 'A'}, 'answer_not_probability_argmax'),
            ({'choice': 'B', 'probabilities': {'A': .5, 'B': .5}}, 'answer_not_probability_argmax'),
        ]
        rows = []
        for patch, expected in variants:
            with self.subTest(patch=patch):
                out = copy.deepcopy(self.out)
                if 'answers' in patch:
                    out.update(patch)
                else:
                    out['answers']['decision'].update(patch)
                row, model = self.record(out)
                rows.append(row)
                self.assertEqual(row['status'], expected)
                self.assertEqual(row['token'], self.task['token'])
                self.assertIsNone(row['answer_index'])
                self.assertIsNone(row['probabilities'])
                self.assertEqual(len(model.calls), 1)
                json.dumps(row, allow_nan=False)
        self.assertEqual(len(rows), len(variants))

    def test_official_drift_normalization_only(self):
        out = copy.deepcopy(self.out)
        out['answers']['decision']['probabilities'] = {'A': .2, 'B': .804}
        row, _ = self.record(out)
        self.assertEqual(row['status'], 'ok')
        self.assertAlmostEqual(sum(row['probabilities']), 1)
        self.assertEqual(row['probabilities'], [.2 / 1.004, .804 / 1.004])

    def test_near_tie_preserves_precision_and_rounded_tie_is_held(self):
        out = copy.deepcopy(self.out)
        out['answers']['decision']['probabilities'] = {'A': .499999999, 'B': .500000001}
        row, _ = self.record(out)
        self.assertEqual(row['status'], 'ok')
        self.assertEqual(row['probabilities'], [.499999999, .500000001])
        out['answers']['decision']['probabilities'] = {'A': .5, 'B': .5}
        row, _ = self.record(out)
        self.assertEqual(row['status'], 'answer_not_probability_argmax')
        self.assertIsNone(row['probabilities'])

    def test_refusal_and_errors_have_safe_denominator_records(self):
        for name, expected in [('QuestionError', 422), ('RequestError', 422), ('RuntimeError', 500)]:
            with self.subTest(name=name):
                error_type = type(name, (Exception,), {})
                model = SyntheticModel(error=error_type('private prompt and path'))
                row = native.native_image_record(model, self.task, self.root)
                self.assertEqual(row['token'], self.task['token'])
                self.assertEqual(row['status'], f'http_{expected}')
                self.assertEqual(row['http_status'], expected)
                self.assertIsNone(row['probabilities'])
                self.assertEqual(len(model.calls), 1)
                self.assertNotIn('private', json.dumps(row))

    def test_traversal_absolute_and_symlinks_never_invoke_model(self):
        outside = Path(self.tmp.name) / 'outside.png'
        outside.write_bytes(b'outside synthetic')
        (self.root / 'linked.png').symlink_to(outside)
        (self.root / 'linked-dir').symlink_to(outside.parent, target_is_directory=True)
        for path in ['../outside.png', str(outside), 'images/../images/example.png',
                     'images//example.png', 'linked.png', 'linked-dir/outside.png',
                     'missing.png', 'images/example.gif', 'images\\example.png']:
            with self.subTest(path=path):
                task = dict(self.task, image=path)
                row, model = self.record(task=task)
                self.assertEqual(row['status'], 'invalid_image_path')
                self.assertEqual(row['token'], self.task['token'])
                self.assertEqual(model.calls, [])
        linked_root = Path(self.tmp.name) / 'root-link'
        linked_root.symlink_to(self.root, target_is_directory=True)
        model = SyntheticModel(self.out)
        row = native.native_image_record(model, self.task, linked_root)
        self.assertEqual(row['status'], 'invalid_image_path')
        self.assertEqual(model.calls, [])

    def test_invalid_input_schema_preserves_valid_token(self):
        for patch in [{'gold': 'forbidden extra'}, {'options': []}, {'question': None},
                      {'options': [{'label': 'a', 'score': 1}, {'label': 'b'}]}]:
            row, model = self.record(task=dict(self.task, **patch))
            self.assertEqual(row['token'], self.task['token'])
            self.assertEqual(row['status'], 'invalid_input_schema')
            self.assertEqual(model.calls, [])


class ScoredMarkerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def test_marker_is_durable_and_prior_attempt_cannot_overwrite(self):
        marker = order.ScoredDispatchMarker(self.root / 'out')
        real_fsync = order.os.fsync
        with mock.patch.object(order.os, 'fsync', wraps=real_fsync) as synced:
            marker()
            marker()
        self.assertEqual(synced.call_count, 2)  # file plus directory; once only
        self.assertEqual(json.loads(marker.path.read_text()), {'scored_loop_started': True})
        with self.assertRaisesRegex(ValueError, 'reconciliation'):
            order.ScoredDispatchMarker(self.root / 'out')

    def test_text_marker_after_warmup_before_dispatch_and_partial_stays(self):
        items = self.root / 'synthetic-items.jsonl'
        tasks = [{'task_id': f'synthetic-{i}', 'state': 'synthetic',
                  'question': {'type': 'choice', 'instructions': 'synthetic'},
                  'labels': ['A', 'B']} for i in range(3)]
        items.write_text(''.join(json.dumps(task) + '\n' for task in tasks))
        output = self.root / 'out'
        marker = order.ScoredDispatchMarker(output)
        class ModelTask:
            def __init__(self, state, question, labels):
                self.state = state
        calls = []
        def run(task):
            calls.append(task.state)
            if task.state == 'warm-up':
                self.assertFalse(marker.path.exists())
                return SimpleNamespace(ok=True)
            self.assertTrue(marker.path.exists())
            return SimpleNamespace(ok=False)
        harness = SimpleNamespace(ModelTask=ModelTask, record=lambda token, answer, elapsed: {
            'task_id': token, 'ok': False, 'status_code': 500, 'error': None})
        with self.assertRaisesRegex(ValueError, 'official stop rule'):
            driver.run_text(run, harness, items, output, 3, marker)
        self.assertEqual(len(calls), 4)
        self.assertTrue(marker.path.exists())
        self.assertEqual(len((output / 'raw.jsonl').read_text().splitlines()), 3)
        self.assertFalse((output / 'receipt.json').exists())

    def test_image_marker_precedes_dispatch_and_survives_stop(self):
        public, sealed = self.root / 'public', self.root / 'sealed'
        public.mkdir()
        sealed.mkdir()
        tasks = [{'token': f'synthetic-{i}', 'question': 'synthetic',
                  'options': [{'label': 'a'}, {'label': 'b'}], 'image': 'synthetic.png'}
                 for i in range(3)]
        (public / 'items.jsonl').write_text(''.join(json.dumps(task) + '\n' for task in tasks))
        (sealed / 'items.jsonl').write_text('')
        output = self.root / 'out' / 'imagejevbench'
        marker = order.ScoredDispatchMarker(output.parent)
        def record(model, task, root):
            self.assertTrue(marker.path.exists())
            return {'token': task['token'], 'latency_s': .01, 'status': 'http_500',
                    'http_status': 500, 'answer_index': None, 'probabilities': None}
        def path(value):
            return {'/inputs/public': public, '/inputs/sealed': sealed}.get(str(value), Path(value))
        with mock.patch.object(order, 'Path', side_effect=path), mock.patch.object(order, 'native_image_record', side_effect=record):
            with self.assertRaisesRegex(ValueError, 'official image stop rule'):
                order.run_images(object(), [public, sealed], output, 3, marker)
        self.assertTrue(marker.path.exists())
        self.assertEqual(len((output / 'raw.jsonl').read_text().splitlines()), 3)
        self.assertFalse((output / 'receipt.json').exists())

    def test_image_non_aplomb_refused_before_loader(self):
        responses = [json.dumps({'benchmarks': ['imagejevbench']}), json.dumps({'kind': 'python_inprocess'})]
        with mock.patch.object(Path, 'read_text', side_effect=responses), mock.patch.object(driver, 'inprocess_runner') as loader:
            with self.assertRaisesRegex(ValueError, 'Aplomb native loader'):
                order.main()
        loader.assert_not_called()


if __name__ == '__main__':
    unittest.main()
