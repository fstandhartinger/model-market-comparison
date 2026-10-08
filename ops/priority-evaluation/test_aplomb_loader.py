"""Synthetic checks only: no customer imports, torch, weights or network."""
import base64
import importlib.util
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

MODULE_PATH = Path(__file__).parent / 'pod_drivers' / 'aplomb_loader.py'
spec = importlib.util.spec_from_file_location('first_party_aplomb_loader', MODULE_PATH)
loader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(loader)


class Tensor:
    def __init__(self, rows):
        self.rows = rows
        self.shape = (len(rows), len(rows[0]))

    def tolist(self):
        return self.rows


class Adapter:
    def __init__(self):
        self.calls = 0

    def encode(self, pairs):
        self.calls += 1
        return SimpleNamespace(batch={
            'input_ids': Tensor([[0, 10, 11], [12, 13, 14]]),
            'attention_mask': Tensor([[0, 1, 1], [1, 1, 1]]),
        })


class LoaderTests(unittest.TestCase):
    def test_actual_encodes_are_counted_and_native_response_preserved(self):
        adapter = Adapter()
        answers = {'decision': {'type': 'choice', 'choice': 'a',
                                'probabilities': {'a': .6, 'b': .4}, 'confidence': .2}}
        native = {'model': None, 'answers': answers}
        config = {'temperatures': {'choice': 1.2}, 'abstain': True, 'abstain_bias': .3}
        def decide(ad, body, temps, **kwargs):
            self.assertEqual(body, {'state': 'text', 'questions': {'decision': {'type': 'choice'}}})
            self.assertIs(temps, config['temperatures'])
            self.assertEqual(kwargs, {'debias': True, 'batch': 8, 'abstain_bias': .3, 'notes': None})
            # Stand-ins for an original and reversed-choice actual encode call.
            ad.encode(['original'])
            ad.encode(['reversed'])
            return native
        model = loader.AplombLoader(adapter, decide, config)
        result = model.predict('text', {'decision': {'type': 'choice'}})
        self.assertIs(result['answers'], answers)
        self.assertEqual(result['usage'], {'input_tokens': 10, 'output_tokens': 0,
                                          'padded_input_positions': 12})
        self.assertNotIn('usage', native)
        self.assertEqual(adapter.calls, 2)
        self.assertEqual(model.predict('text', {'decision': {'type': 'choice'}})['usage']['input_tokens'], 10)

    def test_media_rejections_precede_inference(self):
        def forbidden(*args, **kwargs):
            self.fail('inference called for rejected state')
        model = loader.AplombLoader(Adapter(), forbidden, {})
        for state in ({'type': 'audio'}, {'nested': [{'type': 'video', 'path': '/inputs/a'}]},
                      {'type': 'image', 'url': 'https://example.invalid/a.png'},
                      {'type': 'image', 'path': 'https://example.invalid/a.png'},
                      {'type': 'image', 'data': 'broken', 'mime': 'image/png'},
                      {'type': 'image', 'data': 'YQ==', 'mime': 'audio/wav'},
                      {'type': 'image', 'data': 'YQ==', 'path': '/inputs/a'}):
            with self.subTest(state=state), self.assertRaises((ValueError, FileNotFoundError)):
                model.predict(state, {})

    def test_base64_image_and_local_file_validation(self):
        loader._validate_state({'type': 'image', 'data': base64.b64encode(b'synthetic').decode(), 'mime': 'image/png'})
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            image = root / 'image.png'
            image.write_bytes(b'synthetic')
            with patch.object(loader, '_INPUT_ROOT', root):
                loader._validate_state({'type': 'image', 'path': str(image)})
                escape = root / 'escape.png'
                escape.symlink_to('/etc/hosts')
                with self.assertRaises(ValueError):
                    loader._validate_state({'type': 'image', 'path': str(escape)})

    def test_missing_or_nonbinary_mask_fails_without_estimation(self):
        with self.assertRaises(KeyError):
            loader._encoded_usage(SimpleNamespace(batch={'input_ids': Tensor([[1]])}))
        with self.assertRaises(ValueError):
            loader._encoded_usage(SimpleNamespace(batch={'input_ids': Tensor([[1]]),
                                                        'attention_mask': Tensor([[2]])}))

    def test_abstain_rejection(self):
        with self.assertRaises(ValueError):
            loader.AplombLoader(Adapter(), None, {}).predict('text', {'decision': {'abstain': True}})

    def test_load_rejects_repository_ids_without_importing(self):
        with patch.object(loader.importlib, 'import_module') as imported:
            for value in ('organization/model', 'https://example.invalid/model', '../model'):
                with self.assertRaises(ValueError):
                    loader.load(value)
            imported.assert_not_called()

    def test_non_audio_initialization_retains_defaults_and_offline_loading(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            models = root / 'models'
            model = models / 'synthetic'
            model.mkdir(parents=True)
            (model / 'edm_config.json').write_text(json.dumps({'abstain': True}))
            code = root / 'code'
            code.mkdir()
            (code / 'run_aplomb.py').write_text('# synthetic placeholder; never executed')
            constructed = []
            def factory(*args, **kwargs):
                constructed.append((args, kwargs))
                return Adapter()
            reference = SimpleNamespace(DecisionAdapter=factory, decide=lambda *a, **k: {})
            with patch.object(loader, '_MODEL_ROOT', models), patch.object(loader, '_CODE_ROOT', code), \
                 patch.dict(os.environ, {'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1'}), \
                 patch.object(loader.importlib, 'import_module', return_value=reference) as imported:
                result = loader.load(str(model))
            self.assertIsInstance(result, loader.AplombLoader)
            imported.assert_called_once_with('run_aplomb')
            self.assertEqual(constructed, [((str(model),), {'model_kwargs': {'local_files_only': True},
                                                         'processor_kwargs': {'local_files_only': True}})])

    def test_offline_precondition_precedes_customer_import(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            model = root / 'model'
            model.mkdir()
            with patch.object(loader, '_MODEL_ROOT', root), patch.dict(os.environ, {}, clear=True), \
                 patch.object(loader.importlib, 'import_module') as imported:
                with self.assertRaises(RuntimeError):
                    loader.load(str(model))
                imported.assert_not_called()

    def test_audio_sidecar_initialization_attaches_cli_head(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            model = root / 'models' / 'synthetic'
            model.mkdir(parents=True)
            (model / 'edm_config.json').write_text('{}')
            (model / 'audio_config.json').write_text('{}')
            code = root / 'code'
            code.mkdir()
            (code / 'run_aplomb.py').write_text('# never imported')
            events = []
            class Movable:
                def to(self, *args, **kwargs):
                    events.append(('to', args, kwargs))
                    return self
                def eval(self):
                    events.append(('eval',))
                    return self
            audio = Movable()
            audio.encoder = Movable()
            adapter = Adapter()
            adapter.model = Movable()
            adapter.noul_ids, adapter.digit_ids, adapter.option_ids = [1], [2], [3]
            head = Movable()
            head.attach = lambda value: events.append(('attach', value))
            def attachment(*args):
                events.append(('audio_from', args))
                return audio
            def adapter_factory(*args, **kwargs):
                events.append(('adapter', args, kwargs))
                return adapter
            def head_factory(*args):
                events.append(('head', args))
                return head
            modules = {
                'run_aplomb': SimpleNamespace(torch=SimpleNamespace(
                    bfloat16='fake-bfloat16', cuda=SimpleNamespace(is_available=lambda: True)), decide=None),
                'aplomb.audio_attach': SimpleNamespace(AudioAttach=SimpleNamespace(from_pretrained=attachment),
                                                      AudioDecisionAdapter=adapter_factory),
                'aplomb.decision_head': SimpleNamespace(DecisionHead=SimpleNamespace(for_model=head_factory)),
            }
            with patch.object(loader, '_MODEL_ROOT', root / 'models'), patch.object(loader, '_CODE_ROOT', code), \
                 patch.dict(os.environ, {'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1'}), \
                 patch.object(loader.importlib, 'import_module', side_effect=modules.__getitem__):
                result = loader.load(str(model))
            self.assertIs(result._adapter, adapter)
            self.assertIs(adapter.head, head)
            self.assertIn(('audio_from', (str(model), model / 'audio_encoder')), events)
            self.assertIn(('to', (), {'dtype': 'fake-bfloat16'}), events)
            self.assertIn(('adapter', (str(model),), {'audio_attach': audio, 'device': 'cuda',
                'model_kwargs': {'local_files_only': True}, 'processor_kwargs': {'local_files_only': True}}), events)
            self.assertIn(('head', (adapter.model, [1], [2], [3])), events)
            self.assertIn(('attach', adapter.model), events)
            self.assertEqual(events[-1], ('eval',))


if __name__ == '__main__':
    unittest.main()
