"""Deferred, offline glue for the separately reviewed Aplomb reference CLI.

This module is first-party preparation, not an execution/admission grant. The
caller must independently admit the exact /code tree, /models tree and runtime
before importing customer code on a disposable network-none GPU. Initialization
and inference follow run_aplomb --debias --batch 8 --no-audio-notes. No benchmark
question rendering, probabilities, media budgets or model defaults are replaced.

Usage counts non-padding positions in every *actual* encoded batch, including
reversed-choice debias passes. padded_input_positions also records the physical
batch positions: those can cost compute although masked from attention. Vision
encoder work is not a separate tokenizer count. output_tokens=0 means restricted
logit readout, not the length of the serialized answer. Native answer fields stay
unchanged. Timing/synchronization and admission are the caller's responsibility.
"""
from __future__ import annotations

import base64
import binascii
import importlib
import json
import os
from pathlib import Path
import sys
import threading

_MODEL_ROOT = Path('/models')
_CODE_ROOT = Path('/code')
_INPUT_ROOT = Path('/inputs')


def _local_path(value, root: Path, *, directory=False) -> Path:
    if not isinstance(value, (str, Path)) or not Path(value).is_absolute():
        raise ValueError('an absolute mounted local path is required')
    path = Path(value).resolve(strict=True)
    mounted = root.resolve(strict=True)
    if path == mounted or not path.is_relative_to(mounted):
        raise ValueError('path must stay inside its mounted directory')
    if directory and not path.is_dir():
        raise ValueError('model path must be a directory')
    if not directory and not path.is_file():
        raise ValueError('media path must be a file')
    return path


def _validate_state(node):
    if isinstance(node, dict):
        kind = node.get('type')
        if kind in ('audio', 'video'):
            raise ValueError('this benchmark loader accepts text and images only')
        if kind == 'image':
            if 'url' in node or ('path' in node) == ('data' in node):
                raise ValueError('image requires exactly one local path or base64 data; URLs are forbidden')
            if 'path' in node:
                _local_path(node['path'], _INPUT_ROOT)
            else:
                data = node['data']
                mime = node.get('mime')
                if not isinstance(mime, str) or not mime.startswith('image/'):
                    raise ValueError('base64 image requires an image MIME type')
                if not isinstance(data, str) or not data:
                    raise ValueError('image data must be nonempty base64')
                try:
                    raw = base64.b64decode(data, validate=True)
                except (ValueError, binascii.Error) as exc:
                    raise ValueError('image data must be raw base64') from exc
                if not raw:
                    raise ValueError('image data must be nonempty')
        for value in node.values():
            _validate_state(value)
    elif isinstance(node, list):
        for value in node:
            _validate_state(value)
    elif node is not None and not isinstance(node, (str, bool, int, float)):
        raise ValueError('state must contain JSON values only')


def _check_code_modules():
    for name, module in tuple(sys.modules.items()):
        if name == 'run_aplomb' or name == 'aplomb' or name.startswith('aplomb.'):
            origin = getattr(module, '__file__', None)
            if not origin or not Path(origin).resolve().is_relative_to(_CODE_ROOT.resolve(strict=True)):
                raise RuntimeError('Aplomb module did not originate in the reviewed /code mount')


def _encoded_usage(encoded):
    ids = encoded.batch['input_ids']
    mask = encoded.batch['attention_mask']
    if len(ids.shape) != 2 or tuple(mask.shape) != tuple(ids.shape):
        raise ValueError('input accounting requires a matching two-dimensional attention mask')
    rows = mask.tolist()
    if any(value not in (0, 1) for row in rows for value in row):
        raise ValueError('input accounting requires a binary attention mask')
    return sum(sum(row) for row in rows), int(ids.shape[0]) * int(ids.shape[1])


class _CountedAdapter:
    def __init__(self, adapter):
        self.adapter = adapter
        self.input_tokens = 0
        self.padded_input_positions = 0

    def encode(self, *args, **kwargs):
        encoded = self.adapter.encode(*args, **kwargs)
        count, positions = _encoded_usage(encoded)
        self.input_tokens += count
        self.padded_input_positions += positions
        return encoded

    def __getattr__(self, name):
        return getattr(self.adapter, name)


class AplombLoader:
    def __init__(self, adapter, decide, config):
        self._adapter = adapter
        self._decide = decide
        self._config = config
        self._lock = threading.Lock()

    def predict(self, state, questions):
        _validate_state(state)
        if not isinstance(questions, dict):
            raise ValueError('questions must be the native request mapping')
        if not self._config.get('abstain') and any(
            isinstance(question, dict) and question.get('abstain') is True
            for question in questions.values()
        ):
            raise ValueError('this model was not trained with abstain')
        with self._lock:
            counted = _CountedAdapter(self._adapter)
            native = self._decide(
                counted, {'state': state, 'questions': questions},
                self._config.get('temperatures', {}), debias=True, batch=8,
                abstain_bias=float(self._config.get('abstain_bias', 0.0) or 0.0), notes=None,
            )
            if not isinstance(native, dict) or 'usage' in native:
                raise ValueError('unexpected native response shape')
            return {**native, 'usage': {
                'input_tokens': counted.input_tokens, 'output_tokens': 0,
                'padded_input_positions': counted.padded_input_positions,
            }}


def load(model_path):
    """Import admitted local source only when explicitly invoked in the GPU runtime."""
    model_dir = _local_path(model_path, _MODEL_ROOT, directory=True)
    if os.environ.get('HF_HUB_OFFLINE') != '1' or os.environ.get('TRANSFORMERS_OFFLINE') != '1':
        raise RuntimeError('the runtime must enable both Hugging Face offline modes')
    code = _CODE_ROOT.resolve(strict=True)
    if not code.is_dir() or not (code / 'run_aplomb.py').is_file():
        raise ValueError('reviewed /code source mount is required')
    _check_code_modules()
    config = json.loads((model_dir / 'edm_config.json').read_text(encoding='utf-8'))
    sys.path.insert(0, str(code))
    try:
        reference = importlib.import_module('run_aplomb')
        _check_code_modules()
        offline = {'model_kwargs': {'local_files_only': True},
                   'processor_kwargs': {'local_files_only': True}}
        if (model_dir / 'audio_config.json').exists():
            audio_module = importlib.import_module('aplomb.audio_attach')
            head_module = importlib.import_module('aplomb.decision_head')
            _check_code_modules()
            torch = reference.torch
            audio = audio_module.AudioAttach.from_pretrained(str(model_dir), model_dir / 'audio_encoder')
            audio.encoder.to(dtype=torch.bfloat16)
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            audio.to(device).eval()
            adapter = audio_module.AudioDecisionAdapter(
                str(model_dir), audio_attach=audio, device=device, **offline,
            )
            adapter.head = head_module.DecisionHead.for_model(
                adapter.model, adapter.noul_ids, adapter.digit_ids, adapter.option_ids,
            ).to(device)
            adapter.head.attach(adapter.model)
            adapter.model.eval()
        else:
            adapter = reference.DecisionAdapter(str(model_dir), **offline)
        return AplombLoader(adapter, reference.decide, config)
    finally:
        sys.path.remove(str(code))
