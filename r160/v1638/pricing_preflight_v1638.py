#!/usr/bin/env python3
"""Read-only v1.6.38 pricing admission check; emits aggregates and hashes only.

No scorer, registry, sealed input, or publication is modified. Run against the
re-frozen pricing module (a8a05890; one additive key, drex-max, in
LAUNCH_LIST_PRICE_API). Exit 0 means Drex Max resolves as a rankable list price
and Myles-G 12B / iota resolve exactly as before (estimate rows).
"""
import hashlib
import importlib.util
import json
import pathlib
import sys
sys.dont_write_bytecode = True
ROOT = pathlib.Path(__file__).resolve().parent
P = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
H = pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py')
RECEIPTS = pathlib.Path('/home/flori/jobs/fastlane-holds-20261021/receipts')
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
assert sha(P) == 'a8a05890ddab2d39d1a1bd543f2b5c83842bdc70aa54766788bc89b7a8a448d7'
assert sha(H) == '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'
spec = importlib.util.spec_from_file_location('pricing_v15', P)
pr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pr)
cat = pr.catalog_rates()
COST_BASIS = pathlib.Path(__file__).resolve().parent / 'batch/cost-basis-v1630.json'
EX = set(json.loads(COST_BASIS.read_text())['exclude_opaque_ids'])
report = {'pricing_module_sha256': sha(P), 'scorer_sha256': sha(H),
          'base_revision': '50c8b2c4f41f58cb9781f205ca678f58998e58c1',
          'ten_second_rule_applied': False, 'rows': {}}
entries = {
 'drex-max': {'base_model': None, 'source': 'api', 'price_in_per_m': 0.06, 'price_out_per_m': 0.0},
 'launchables-myles-g-12b': {'base_model': 'google/gemma-4-12B-it', 'source': 'api',
                          'price_in_per_m': 0.0015 * 1.33468, 'price_out_per_m': 0.0},
}
expected = {'drex-max': 'c0de81123e846e3a583aef52534e15f6ca9ba1b9c515209dbed002d8e7277fe1',
            'launchables-myles-g-12b': '3f0929728f39bd41cfff6c404d6ed8793e8202f393b68264d3b1fc449d6a54ab'}
for key, entry in entries.items():
 receipt = json.loads((RECEIPTS / f'RUN-RECEIPT-{key}.json').read_text())
 raw = pathlib.Path(receipt['raw'])
 assert sha(raw) == receipt['raw_sha256'] == expected[key], key
 rows = [json.loads(line) for line in raw.read_text().splitlines() if line.strip()]
 assert len(rows) == len({r['task_id'] for r in rows}) == 1500
 statuses = {str(status): sum(r['status_code'] == status for r in rows)
             for status in sorted({r['status_code'] for r in rows})}
 assert statuses == receipt['status_counts']
 assert sum(bool(r['ok']) for r in rows) == receipt['ok_rows']
 # These are the exact frozen-module calls, not a replacement price rule.
 reference = pr.reference(key, entry, cat)
 resolved = pr.resolve(key, entry, rows, cat)
 assert reference is None
 assert pr.token_totals(rows) == (receipt['input_tokens'], receipt['output_tokens'])
 common = [r for r in rows if r['task_id'] not in EX]
 assert len(common) == 1485
 ci = sum((r.get('usage') or {}).get('input_tokens', 0) or 0 for r in common)
 co = sum((r.get('usage') or {}).get('output_tokens', 0) or 0 for r in common)
 usd_common = 1000 * (ci * entry['price_in_per_m'] + co * entry['price_out_per_m']) / 1e6 / 1485
 if key == 'drex-max':
  assert key in pr.LAUNCH_LIST_PRICE_API and key not in pr.AGE_QUALIFIED_API
  assert resolved['counting_list_price'] is True and resolved['rankable'] is True
  assert round(usd_common, 12) == 0.030815878788, usd_common
  verdict = 'list price (I-1), rankable'
  usd_drex = usd_common
 else:
  assert resolved['rankable'] is False and resolved['usd_per_1000'] is None
  assert resolved['counting_list_price'] is False
  assert key not in pr.AGE_QUALIFIED_API and key not in pr.LAUNCH_LIST_PRICE_API
  verdict = 'unlisted base: unrankable under the module itself; build uses the published same-base sibling estimate'
 report['rows'][key] = {'raw_sha256': sha(raw), 'raw_path': str(raw),
  'rows': len(rows), 'status_counts': statuses, 'ok_rows': receipt['ok_rows'],
  'input_tokens': receipt['input_tokens'], 'output_tokens': receipt['output_tokens'],
  'common_input_tokens': ci, 'common_output_tokens': co,   'handoff_latency_s': receipt['latency_s'], 'entry_for_frozen_pricing': entry,
  'reference_call': f'reference({key!r}, {entry!r}, catalog_rates())',
  'reference_result': reference, 'resolve_result': resolved, 'verdict': verdict,
  **({'usd_per_1000_common_basis': usd_common} if key == 'drex-max' else {}),
  'base_explicitly_unlisted': entry['base_model'] in pr.UNLISTED_BASE_MODELS}
# iota: frozen Qwen3.5-4B reference, as in all Qwen 4B precedents
rf = pr.reference('iota-decide-4b', {'base_model': 'Qwen/Qwen3.5-4B'}, cat)
assert rf[0] == 'deepinfra:Qwen/Qwen3.5-4B' and round(rf[1][0], 8) == 0.03 and rf[1][1] == 0.15
report['rows']['iota-decide-4b'] = {'reference_call': "reference('iota-decide-4b', {'base_model': 'Qwen/Qwen3.5-4B'}, catalog_rates())",
  'reference_result': rf, 'verdict': 'frozen Qwen3.5-4B reference 0.03/0.15 (estimate)'}
report['status'] = 'PASS: drex-max resolves as a rankable launch list price; Myles-G 12B and iota resolve as before'
(ROOT / 'receipts/PRICING-PREFLIGHT.json').write_text(json.dumps(report, indent=2, sort_keys=True) + '\n')
for k, r in report['rows'].items():
 print(k, r['verdict'], r.get('usd_per_1000_common_basis', ''))
print(report['status'])
