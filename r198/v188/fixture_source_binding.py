#!/usr/bin/env python3
"""Run on LeChonk while the isolated synthetic PASS build fixture still exists."""
from pathlib import Path
import datetime, hashlib, json, sys

W = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
J = W / 'r198/v188'
P = J / '.pass'
paths = json.loads((J / 'receipts/SOURCE-BINDING-PATHS.json').read_text())['paths']
extra = ['app/jev-models/[system]/page.tsx', 'components/JevBenchV16Board.tsx',
         'data/jevbench-breakdown-exceptions.json']
rows = {}
delta = []
for path in sorted(set(paths + extra)):
    root_file, fixture_file = W / path, P / path
    assert root_file.is_file() and fixture_file.is_file(), path
    root_bytes, fixture_bytes = root_file.read_bytes(), fixture_file.read_bytes()
    row = {'root_sha256': hashlib.sha256(root_bytes).hexdigest(),
           'actual_fixture_sha256': hashlib.sha256(fixture_bytes).hexdigest(),
           'byte_equal': root_bytes == fixture_bytes}
    if root_bytes != fixture_bytes:
        root_json, fixture_json = json.loads(root_bytes), json.loads(fixture_bytes)
        publication = 'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.8-publication.json'
        if path == publication:
            assert root_json['review'] == {'engine': 'PENDING', 'verdict': 'PENDING', 'receipt_sha256': None}
            assert fixture_json['review'] == {'engine': 'synthetic-preview-only', 'verdict': 'PASS', 'receipt_sha256': 'a' * 64}
            changed = fixture_json['review']
            fixture_json['review'] = root_json['review']
            assert root_json == fixture_json
            row['allowed_difference'] = {'field': 'review', 'root': root_json['review'],
                                         'actual_fixture': changed, 'scope': 'isolated synthetic review fixture only'}
        elif path == 'data/jevbench-breakdown-exceptions.json':
            key = 'sd-jev-4b-v12.1.0-aligned-s42-step0256'
            additions = [e for e in fixture_json['entries'] if e.get('key') == key]
            assert len(additions) == 1 and additions[0]['dims'] == ['topics'] and 'release v1.8.8' in additions[0]['reason']
            assert not any(e.get('key') == key for e in root_json['entries'])
            fixture_json['entries'] = [e for e in fixture_json['entries'] if e.get('key') != key]
            assert root_json == fixture_json
            row['allowed_difference'] = {'field': 'entries', 'actual_fixture_addition': additions[0],
                                         'scope': 'only the synthetic row topic exception'}
        else:
            raise AssertionError(('unplanned synthetic fixture difference', path))
        delta.append(path)
    rows[path] = row
expected = ['data/jevbench-breakdown-exceptions.json',
            'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.8-publication.json']
assert delta == expected, delta
receipt = {'status': 'PASS',
           'scope': 'read-only binding of the actual synthetic production-build fixture before cleanup',
           'captured_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
           'paths': rows, 'count': len(rows), 'behavior_source_count': len(paths),
           'additional_unchanged_renderers': extra,
           'sole_allowed_fixture_semantic_differences': delta}
(J / 'receipts/ACTUAL-FIXTURE-SOURCE-BINDING.json').write_text(json.dumps(receipt, indent=1, sort_keys=True) + '\n')
print('PASS actual fixture binding:', len(rows), 'files; only synthetic publication review and topic exception differ')
