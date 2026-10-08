"""Proposed native ImageJev record adapter; not an official method admission.

Request contract requiring custodian approval: state is {'image': {'type':
'image', 'data': exact-byte base64, 'mime': MIME}};
questions is {'decision': {'type': 'choice', 'instructions': ..., 'criteria':
{letter: label plus description}}}. Letters preserve official option ordering.
The exact image bytes are base64 encoded, without image decoding or conversion.
This helper does not load models, inspect environment keys, or provide transport.
The caller must enforce empty environment, network isolation, immutable pinned
inputs, model ownership, count/denominator, stop rules and approved method gates.
"""
from __future__ import annotations

import base64
import math
import os
from pathlib import Path
import stat
import time

LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'}
USAGE_KEYS = {'input_tokens', 'output_tokens', 'prompt_tokens', 'completion_tokens', 'cost'}


def _image_bytes(root, relative):
    """Open from / using directory descriptors; refuse every symlink component.

    O_NOFOLLOW + dir_fd also prevents a checked component being swapped for a
    symlink between inspection and open. The caller pins content separately.
    """
    root = Path(root)
    if not root.is_absolute() or '..' in root.parts:
        raise ValueError('invalid root')
    if not isinstance(relative, str) or not relative or '\\' in relative:
        raise ValueError('invalid image path')
    components = relative.split('/')
    if any(p in ('', '.', '..') for p in components):
        raise ValueError('invalid image path')
    suffix = Path(relative).suffix.lower()
    if suffix not in MIME:
        raise ValueError('unsupported image')
    directory = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    fd = os.open('/', directory)
    try:
        for part in (*root.parts[1:], *components[:-1]):
            child = os.open(part, directory, dir_fd=fd)
            os.close(fd)
            fd = child
        image_fd = os.open(components[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
        with os.fdopen(image_fd, 'rb') as image:
            if not stat.S_ISREG(os.fstat(image.fileno()).st_mode):
                raise ValueError('image is not regular file')
            data = image.read()
        if not data:
            raise ValueError('empty image')
        return MIME[suffix], data
    finally:
        os.close(fd)


def _question(task):
    if not isinstance(task, dict) or set(task) != {'token', 'question', 'options', 'image'}:
        raise ValueError('invalid schema')
    if not isinstance(task['token'], str) or not task['token']:
        raise ValueError('invalid token')
    if not isinstance(task['question'], str) or not task['question'].strip():
        raise ValueError('invalid question')
    options = task['options']
    if not isinstance(options, list) or not 2 <= len(options) <= len(LETTERS):
        raise ValueError('invalid options')
    criteria = {}
    for letter, option in zip(LETTERS, options):
        if not isinstance(option, dict) or not {'label'} <= set(option) <= {'label', 'description'}:
            raise ValueError('invalid option schema')
        label, description = option['label'], option.get('description', '')
        if not isinstance(label, str) or not label or not isinstance(description, str):
            raise ValueError('invalid option text')
        criteria[letter] = label + (': ' + description if description else '')
    return {'type': 'choice', 'instructions': (
        'Choose the one option that best answers the question using the attached image.\n\n'
        'Question:\n' + task['question']), 'criteria': criteria}


def _parse(out, letters):
    if not isinstance(out, dict) or not isinstance(out.get('answers'), dict):
        return None, None, 'invalid_answer'
    answer = out['answers'].get('decision')
    if not isinstance(answer, dict) or answer.get('type') != 'choice' or answer.get('choice') not in letters:
        return None, None, 'invalid_answer'
    probs = answer.get('probabilities')
    if not isinstance(probs, dict) or set(probs) != set(letters):
        return None, None, 'invalid_probability_keys'
    values = [probs[letter] for letter in letters]
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) for v in values):
        return None, None, 'invalid_probability_values'
    try:
        values = [float(v) for v in values]
    except (OverflowError, ValueError):
        return None, None, 'invalid_probability_values'
    if any(not math.isfinite(v) or not 0 <= v <= 1 for v in values):
        return None, None, 'invalid_probability_values'
    total = math.fsum(values)
    if total <= 0 or abs(total - 1) > .005:
        return None, None, 'invalid_probability_sum'
    # Match pinned official decimal-drift normalization and first-argmax tie rule.
    # Compare the returned distribution without additional rounding. If the model
    # serializes a near tie as a tie but chooses a later option from unrounded
    # internal values, reject it: the unrounded distribution is unavailable here.
    # Custodian resolution is required; never repair the probabilities or choice.
    values = [v / total for v in values]
    index = letters.index(answer['choice'])
    if index != max(range(len(values)), key=values.__getitem__):
        return None, None, 'answer_not_probability_argmax'
    return index, values, 'ok'


def _usage(out):
    usage = out.get('usage') if isinstance(out, dict) else None
    if not isinstance(usage, dict):
        return None
    safe = {}
    for key in USAGE_KEYS:
        value = usage.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            continue
        try:
            if math.isfinite(value) and value >= 0:
                safe[key] = value
        except OverflowError:
            pass
    return safe or None


def native_image_record(model, task, pinned_root):
    """One invocation, one scorer-shaped row, including failures; no retries.

    Invalid/missing tokens produce token=None and require caller admission failure,
    since they cannot be joined to a denominator item. Valid tokens are retained
    for malformed inputs, refusal, model errors and invalid answers alike.
    No exceptions, response text, prompt text or arbitrary usage fields are logged.
    """
    started = time.perf_counter()
    token = task.get('token') if isinstance(task, dict) else None
    row = {'token': token if isinstance(token, str) else None,
           'latency_s': 0.0, 'status': 'invalid_input_schema', 'http_status': None,
           'answer_index': None, 'probabilities': None, 'usage': None,
           'response_id': None, 'model_returned': None, 'provider': None}
    try:
        question = _question(task)
    except (TypeError, ValueError):
        row['latency_s'] = time.perf_counter() - started
        return row
    try:
        mime, data = _image_bytes(pinned_root, task['image'])
    except (TypeError, ValueError, OSError):
        row['status'] = 'invalid_image_path'
        row['latency_s'] = time.perf_counter() - started
        return row
    state = {'image': {'type': 'image', 'data': base64.b64encode(data).decode('ascii'), 'mime': mime}}
    inference_started = time.perf_counter()
    try:
        out = model.predict(state, {'decision': question})
    except Exception as exc:  # Error class only; never retain exception text.
        status = 422 if type(exc).__name__ in {'QuestionError', 'RequestError'} else 500
        row.update(status=f'http_{status}', http_status=status,
                   latency_s=time.perf_counter() - inference_started)
        return row
    row['latency_s'] = time.perf_counter() - inference_started
    row['http_status'] = 200
    row['usage'] = _usage(out)
    index, probs, status = _parse(out, list(question['criteria']))
    row.update(answer_index=index, probabilities=probs, status=status)
    return row
