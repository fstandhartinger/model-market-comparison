#!/usr/bin/env python3
"""Read-only v1.6.40 pricing check for h2o-lightning-31b; emits aggregates and hashes only.
Runs the frozen pricing_v15 module's reference() and resolve() for the declared base spelling that the live 31B rows use
(google/gemma-4-31B-it) and for the lowercase spelling, and records both."""
import hashlib, importlib.util, json, pathlib, sys
sys.dont_write_bytecode = True
ROOT = pathlib.Path(__file__).resolve().parent
P = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
H = pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py')
RAW = pathlib.Path('/home/flori/jobs/fastlane-holds-20261021/h2o31b-run/out/raw.jsonl')
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
assert sha(P) == 'a8a05890ddab2d39d1a1bd543f2b5c83842bdc70aa54766788bc89b7a8a448d7'
assert sha(H) == '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'
assert sha(RAW) == '93f00824bdadcbab56d4eb03c6f03df3dd97e749a80f375135e737b0eaf7b24a'
spec = importlib.util.spec_from_file_location('pricing_v15', P)
pr = importlib.util.module_from_spec(spec); spec.loader.exec_module(pr)
cat = pr.catalog_rates()
rows = [json.loads(l) for l in RAW.read_text().splitlines() if l.strip()]
assert len(rows) == len({r['task_id'] for r in rows}) == 1500
EX = set(json.loads((ROOT / 'batch/cost-basis-v1630.json').read_text())['exclude_opaque_ids'])
common = [r for r in rows if r['task_id'] not in EX]
assert len(common) == 1485
ci = sum((r.get('usage') or {}).get('input_tokens', 0) or 0 for r in common)
co = sum((r.get('usage') or {}).get('output_tokens', 0) or 0 for r in common)
report = {'pricing_module_sha256': sha(P), 'scorer_sha256': sha(H), 'raw_sha256': sha(RAW), 'calls': {}}
for spelling in ('google/gemma-4-31B-it', 'google/gemma-4-31b-it'):
    entry = {'base_model': spelling, 'source': 'selfhosted', 'price_in_per_m': None, 'price_out_per_m': None}
    try:
        ref = pr.reference('h2o-lightning-31b', entry, cat)
    except ValueError as exc:
        ref = f'raises ValueError: {exc}'
    try:
        res = pr.resolve('h2o-lightning-31b', entry, rows, cat)
    except ValueError as exc:
        res = f'raises ValueError: {exc}'
    report['calls'][spelling] = {
        'reference_call': f"reference('h2o-lightning-31b', {entry!r}, catalog_rates())",
        'reference_result': ref, 'resolve_result': res,
        'base_explicitly_unlisted': spelling in pr.UNLISTED_BASE_MODELS}
ref = report['calls']['google/gemma-4-31B-it']['reference_result']
assert ref is not None and ref[0] == 'google/gemma-4-31b-it' and round(ref[1][0], 8) == 0.09 and round(ref[1][1], 8) == 0.34, ref
report['usd_per_1000_common'] = 1000 * (ci * ref[1][0] + co * ref[1][1]) / 1e6 / 1485
report['usd_per_1000_all_items'] = 1000 * (sum(r['usage']['input_tokens'] for r in rows) * ref[1][0] + sum(r['usage']['output_tokens'] for r in rows) * ref[1][1]) / 1e6 / 1500
report['common_input_tokens'], report['common_output_tokens'] = ci, co
report['over_official_cap_ratio'] = report['usd_per_1000_common'] / 0.06459465517241379
(ROOT / 'receipts/PRICING-PREFLIGHT.json').write_text(json.dumps(report, indent=2, sort_keys=True, default=str) + '\n')
print(json.dumps(report, indent=1, default=str))
