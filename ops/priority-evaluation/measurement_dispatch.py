"""Host-only, pinned API measurement. Unsupported backends never become customer holds."""
from __future__ import annotations
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import urllib.parse
import official_scoring

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / 'measurement-profiles.json'
# Florian's hash-frozen JevBench v1.5 price rules (30-day rule; INTERPRETATION-1: day-1 launch list prices).
PRICING_METHOD_DOCS = {
    'METHOD-v1.5-ADDENDUM-PRICING.md': '2fc44459ef801d0627062f7eefd973df40772e8ac117727479748e4be4c220cc',
    'METHOD-v1.5-ADDENDUM-PRICING-INTERPRETATION-1.md': '5905a93cecf510623f1e9a08f1e71bec5cf423dd3a2b896f72092ae1fb7017a9',
}


class OperationalHold(RuntimeError):
    pass


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def checked(pin):
    p = Path(pin['path'])
    if p.is_symlink() or not p.is_file() or sha(p) != pin['sha256']:
        raise OperationalHold('official_measurement_pin_changed')
    return p


def pins():
    value = json.loads(MANIFEST.read_text())
    if value.get('schema_version') != 1:
        raise OperationalHold('official_measurement_manifest_invalid')
    for pin in value['code'].values():
        checked(pin)
    return {'manifest_sha256': sha(MANIFEST), 'driver_sha256': sha(ROOT / 'measurement_driver.py'), 'profile': value}


def runtime_spec(value, benchmark):
    if not isinstance(value, dict) or set(value) - {'backend', 'model', 'endpoint', 'credential', 'reasoning', 'price_input_per_m', 'price_output_per_m'}:
        raise OperationalHold('unsupported_measurement_runtime')
    if value.get('backend') not in ('typesafe', 'openrouter') or (benchmark == 'imagejevbench' and value['backend'] != 'openrouter'):
        raise OperationalHold('unsupported_measurement_backend')
    if not isinstance(value.get('model'), str) or not re.fullmatch(r'[A-Za-z0-9_.:/-]{1,160}', value['model']):
        raise OperationalHold('unsupported_measurement_model')
    if value.get('reasoning') not in (None, 'low', 'medium', 'high'):
        raise OperationalHold('unsupported_measurement_reasoning')
    credential = value.get('credential')
    if credential not in ('none', 'request', 'openrouter'):
        raise OperationalHold('unsupported_measurement_credential')
    if value['backend'] == 'openrouter':
        if value.get('endpoint', 'https://openrouter.ai/api/v1') != 'https://openrouter.ai/api/v1' or credential != 'openrouter':
            raise OperationalHold('unsupported_openrouter_route')
    else:
        url = urllib.parse.urlsplit(value.get('endpoint', ''))
        if url.scheme != 'https' or not url.hostname or url.username or url.password or url.query or url.fragment or url.path not in ('', '/') or credential == 'openrouter':
            raise OperationalHold('unsupported_native_api_route')
    for key in ('price_input_per_m', 'price_output_per_m'):
        price = value.get(key)
        if not isinstance(price, (int, float)) or isinstance(price, bool) or not math.isfinite(price) or not 0 <= price <= 1000:
            raise OperationalHold('missing_public_api_tariff')
    return value


def validate_api_meta(benchmark, meta, runtime):
    runtime_spec(runtime, benchmark)
    official_scoring.validate_meta(benchmark, meta)
    system = meta['system']
    if benchmark == 'imagejevbench':
        if system != {'kind': 'api'}:
            raise ValueError('Image API metadata cannot override GPU or receipt pricing')
        return
    allowed = {'support', 'endpoint_kind', 'price_in_per_m', 'price_out_per_m', 'price_kind', 'cost_basis'}
    if set(system) - allowed or system.get('endpoint_kind') != 'api':
        raise ValueError('API scorer metadata contains unsupported fields')
    for meta_key, runtime_key in (('price_in_per_m', 'price_input_per_m'), ('price_out_per_m', 'price_output_per_m')):
        price = system.get(meta_key)
        if not isinstance(price, (int, float)) or isinstance(price, bool) or not math.isfinite(price) or price < 0 or price != runtime[runtime_key]:
            raise ValueError('scoring and dispatch public API tariffs must agree')
    if system.get('price_kind', 'public') not in ('public', 'estimate'):
        raise ValueError('invalid public API price kind')
    if 'cost_basis' in system and (not isinstance(system['cost_basis'], str) or len(system['cost_basis']) > 2000):
        raise ValueError('invalid API price basis')


def input_mounts(profile, benchmark):
    spec = profile['inputs'][benchmark]
    if benchmark == 'jevbench':
        p = checked(spec['items'])
        return [(p, '/inputs/text/items.jsonl')], ['/inputs/text'], spec['count']
    root = Path(spec['root'])
    manifest = json.loads(checked(spec['manifest']).read_text())
    mounts = []
    for part in ('public', 'sealed'):
        data = manifest['parts'][part]
        path = root / part
        if path.is_symlink() or not path.is_dir():
            raise OperationalHold('official_image_input_unavailable')
        checked({'path': str(path / 'items.jsonl'), 'sha256': data['items_jsonl_sha256']})
        expected = {'items.jsonl'}
        for item in data['images']:
            relative = item['path']
            if not re.fullmatch(r'images/[A-Za-z0-9_.-]+', relative):
                raise OperationalHold('official_image_manifest_invalid')
            p = checked({'path': str(path / relative), 'sha256': item['sha256']})
            if p.stat().st_size != item['bytes']:
                raise OperationalHold('official_image_length_changed')
            expected.add(relative)
        actual = {p.relative_to(path).as_posix() for p in path.rglob('*') if p.is_file()}
        if actual != expected or any(p.is_symlink() for p in path.rglob('*')):
            raise OperationalHold('official_image_input_tree_changed')
        mounts.append((path, '/inputs/' + part))
    return mounts, ['/inputs/public', '/inputs/sealed'], spec['count']


def command(code, config, credential_fd, output, mounts):
    argv = ['/usr/bin/bwrap', '--die-with-parent', '--new-session', '--unshare-all', '--share-net',
            '--tmpfs', '/', '--ro-bind', '/usr', '/usr', '--symlink', 'usr/bin', '/bin',
            '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64',
            '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp', '--dir', '/etc',
            '--ro-bind', '/etc/ssl', '/etc/ssl', '--ro-bind', '/etc/resolv.conf', '/etc/resolv.conf',
            '--ro-bind', str(code), '/code', '--ro-bind', str(config), '/input/runtime.json',
            '--ro-bind-data', str(credential_fd), '/input/credential',
            '--bind', str(output), '/output']
    for source, dest in mounts:
        argv += ['--ro-bind', str(source), dest]
    return argv + ['--clearenv', '--setenv', 'OPENAI_API_KEY', '', '--setenv', 'LANG', 'C.UTF-8',
                   '--', '/usr/bin/python3', '-I', '-S', '/code/measurement_driver.py']


def run(benchmark, runtime, credential, output, expected_pins, max_usd):
    runtime_spec(runtime, benchmark)
    current = pins()
    if current != expected_pins:
        raise OperationalHold('measurement_pins_differ_from_review')
    output = Path(output)
    if output.is_symlink():
        raise OperationalHold('measurement_output_unsafe')
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    receipt_file = output / 'receipt.json'
    if receipt_file.is_file():
        prior = json.loads(receipt_file.read_text())
        if prior.get('pins') != current or prior.get('runtime') != runtime or sha(output / 'raw.jsonl') != prior.get('raw_sha256'):
            raise OperationalHold('existing_measurement_receipt_changed')
        return prior
    # A partial attempt requires explicit host reconciliation; no automatic repeated API bill.
    if (output / 'raw.jsonl').exists():
        raise OperationalHold('partial_measurement_requires_reconciliation')
    mounts, roots, count = input_mounts(current['profile'], benchmark)
    with tempfile.TemporaryDirectory(prefix='fastlane-api-') as directory:
        scratch = Path(directory)
        code = scratch / 'code'
        code.mkdir()
        for dest, pin in current['profile']['code'].items():
            if not re.fullmatch(r'[a-zA-Z0-9_/.-]+', dest) or '..' in Path(dest).parts:
                raise OperationalHold('measurement_code_manifest_invalid')
            path = code / dest
            path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(checked(pin), path)
        # Only the reviewed adapters are importable. Do not execute upstream package __init__.
        for relative in ('jevbench/__init__.py', 'jevbench/adapters/__init__.py'):
            (code / relative).write_text('')
        shutil.copyfile(ROOT / 'measurement_driver.py', code / 'measurement_driver.py')
        config = scratch / 'runtime.json'
        config.write_text(json.dumps({'benchmark': benchmark, 'runtime': runtime, 'roots': roots,
                                     'count': count, 'max_usd': max_usd}))
        fd = os.memfd_create('fastlane-request-api', os.MFD_CLOEXEC)
        try:
            os.write(fd, credential.encode())
            os.lseek(fd, 0, 0)
            proc = subprocess.run(command(code, config, fd, output, mounts), pass_fds=(fd,),
                                  env={'PATH': '/usr/bin:/bin'}, capture_output=True, timeout=40*3600, check=False)
        finally:
            os.close(fd)
        if proc.returncode:
            raise OperationalHold('official_api_measurement_incomplete')
    receipt = json.loads(receipt_file.read_text())
    if receipt.get('rows') != count or pins() != current:
        raise OperationalHold('official_measurement_changed_or_incomplete')
    receipt.update(pins=current, runtime=runtime, raw_sha256=sha(output / 'raw.jsonl'))
    receipt_file.write_text(json.dumps(receipt, indent=2) + '\n')
    return receipt
