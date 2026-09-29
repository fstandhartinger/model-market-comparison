#!/usr/bin/env python3
"""Fixed first-party API driver. No customer Python, model tools or gold in this process."""
from __future__ import annotations
import contextlib
import http.client
import importlib.util
import io
import ipaddress
import json
import math
from pathlib import Path
import socket
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


class Response(io.BytesIO):
    def __init__(self, body, status):
        super().__init__(body)
        self.status = status


def restricted_urlopen(allowed_url):
    """No redirects/proxies, no local addresses, TLS to the validated address and host."""
    def call(request, timeout=120):
        if not isinstance(request, urllib.request.Request) or request.full_url != allowed_url:
            raise ValueError('API destination differs from reviewed runtime')
        parsed = urllib.parse.urlsplit(allowed_url)
        if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.fragment or parsed.query:
            raise ValueError('unsupported API URL')
        records = socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)
        if not records or any(not ipaddress.ip_address(row[4][0]).is_global for row in records):
            raise ValueError('API destination is not a public address')
        conn = http.client.HTTPSConnection(parsed.hostname, parsed.port or 443, timeout=timeout,
                                            context=ssl.create_default_context())
        # Bind the validated address; preserve the hostname for certificate verification.
        address = records[0][4][0]
        conn._create_connection = lambda address_arg, timeout_arg, source_address=None: socket.create_connection(
            (address, parsed.port or 443), timeout_arg, source_address)
        try:
            conn.request('POST', parsed.path, body=request.data, headers=dict(request.header_items()))
            response = conn.getresponse()
            data = response.read(16 * 1024 * 1024 + 1)
            if len(data) > 16 * 1024 * 1024:
                raise ValueError('API response exceeds limit')
            if response.status != 200:
                # Never retain provider error bodies (they can echo request credentials).
                raise urllib.error.HTTPError(allowed_url, response.status, 'API rejected request', {}, io.BytesIO(b''))
            return Response(data, response.status)
        finally:
            conn.close()
    return call


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    sys.modules[name] = result
    spec.loader.exec_module(result)
    return result


def main():
    import os
    config = json.loads(Path('/input/runtime.json').read_text())
    credential = Path('/input/credential').read_text()
    # The only credential available to the fixed adapters is this request's API credential.
    os.environ['FASTLANE_API_CREDENTIAL'] = credential
    runtime, benchmark = config['runtime'], config['benchmark']
    backend = runtime['backend']
    endpoint = runtime.get('endpoint', 'https://openrouter.ai/api/v1')
    url = endpoint.rstrip('/') + ('/v1/systemone' if backend == 'typesafe' else '/chat/completions')
    urllib.request.urlopen = restricted_urlopen(url)
    sys.path.insert(0, '/code')
    text_driver = module('official_text_driver', '/code/run_v15.py')
    image_driver = module('official_image_driver', '/code/evaluate_api.py')
    if benchmark == 'jevbench':
        if backend == 'typesafe':
            from jevbench.adapters.typesafe import TypeSafeAdapter
            adapter = TypeSafeAdapter(endpoint=endpoint, model=runtime['model'], key_env='FASTLANE_API_CREDENTIAL' if credential else None)
        else:
            from jevbench.adapters.openai_compat import OpenAICompatAdapter
            adapter = OpenAICompatAdapter(endpoint=endpoint, model=runtime['model'], key_env='FASTLANE_API_CREDENTIAL')
            adapter.request_options = {'provider': {'data_collection': 'deny', 'zdr': True, 'allow_fallbacks': False}}
            if runtime.get('reasoning'):
                adapter.request_options['reasoning'] = {'effort': runtime['reasoning'], 'exclude': True}
    inputs = []
    for root in config['roots']:
        for line in (Path(root) / 'items.jsonl').read_text().splitlines():
            task = json.loads(line)
            expected = {'task_id', 'state', 'question', 'labels'} if benchmark == 'jevbench' else {'token', 'question', 'options', 'image'}
            if set(task) != expected:
                raise ValueError('label-free input schema changed')
            inputs.append((Path(root), task))
    if len(inputs) != config['count']:
        raise ValueError('input count mismatch')
    spend = 0.0
    consecutive = 0
    out = Path('/output/raw.jsonl')
    if out.exists():
        raise ValueError('raw output already exists')
    with out.open('x') as stream:
        for root, task in inputs:
            # Conservative reservation from the reviewed public tariff, checked before each call.
            reserve = (100_000 * runtime['price_input_per_m'] + 4096 * runtime['price_output_per_m']) / 1e6
            if spend + reserve > config['max_usd']:
                raise ValueError('request API budget exhausted')
            if benchmark == 'jevbench':
                model_task = text_driver.ModelTask(task['state'], task['question'], task['labels'])
                started = time.perf_counter()
                answer = adapter.run(model_task)
                row = text_driver.record(task['task_id'], answer, time.perf_counter() - started)
                row['error'] = 'provider_or_format_error' if row.get('error') else None
                failed = not row['ok']
                status = row['status_code']
            else:
                image = root / task['image']
                if image.is_symlink() or not image.resolve().is_relative_to(root.resolve()):
                    raise ValueError('image path leaves pinned input')
                answer = image_driver.api_request(credential, runtime['model'], runtime.get('reasoning'), task, root)
                row = {'token': task['token'], **answer}
                failed = row['status'] != 'ok'
                status = row.get('http_status')
            usage = row.get('usage') or {}
            cost = usage.get('cost')
            if not isinstance(cost, (float, int)) or isinstance(cost, bool) or not math.isfinite(cost) or cost < 0:
                tin, tout = usage.get('input_tokens', usage.get('prompt_tokens')), usage.get('output_tokens', usage.get('completion_tokens'))
                if all(isinstance(n, (int, float)) and not isinstance(n, bool) and math.isfinite(n) and n >= 0 for n in (tin, tout)):
                    cost = (tin * runtime['price_input_per_m'] + tout * runtime['price_output_per_m']) / 1e6
                else:
                    cost = reserve  # never turn missing usage into free budget
            spend += cost
            stream.write(json.dumps(row, allow_nan=False) + '\n')
            stream.flush()
            consecutive = consecutive + 1 if failed and status != 422 else 0
            if status in (401, 402, 403, 429) or consecutive >= 3 or spend > config['max_usd']:
                raise ValueError('official API stop rule')
    Path('/output/receipt.json').write_text(json.dumps({'rows': len(inputs), 'charged_or_reserved_usd': spend}))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('official measurement did not complete', file=sys.stderr)
        raise SystemExit(1) from None
