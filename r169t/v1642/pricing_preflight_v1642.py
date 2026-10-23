#!/usr/bin/env python3
"""Read-only v1.6.42 pricing check for torchcast-decision-4b-v1.3; emits aggregates and hashes only.
Runs the frozen pricing_v15 module's reference() and resolve() for the declared base Qwen/Qwen3.5-4B (the same base as the live v1.2 row)
and records both."""
import hashlib, importlib.util, json, pathlib, sys
sys.dont_write_bytecode = True
ROOT = pathlib.Path(__file__).resolve().parent
P = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
H = pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py')
RAW = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/runs-fastlane/torchcast-decision-4b-v1.3.raw.jsonl')
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
assert sha(P) == 'aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7'
assert sha(H) == '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'
assert sha(RAW) == '057cae292bed0489d85af357e9aa4589b979677deb273b806b35f16180b8f478'
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
KEY = 'torchcast-decision-4b-v1.3'
for spelling in ('Qwen/Qwen3.5-4B',):
    entry = {'base_model': spelling, 'source': 'selfhosted', 'price_in_per_m': None, 'price_out_per_m': None}
    try:
        ref = pr.reference(KEY, entry, cat)
    except ValueError as exc:
        ref = f'raises ValueError: {exc}'
    try:
        res = pr.resolve(KEY, entry, rows, cat)
    except ValueError as exc:
        res = f'raises ValueError: {exc}'
    report['calls'][spelling] = {
        'reference_call': f"reference({KEY!r}, {entry!r}, catalog_rates())",
        'reference_result': ref, 'resolve_result': res,
        'base_explicitly_unlisted': spelling in pr.UNLISTED_BASE_MODELS}
ref = report['calls']['Qwen/Qwen3.5-4B']['reference_result']
assert ref is not None and round(ref[1][0], 8) == 0.03 and round(ref[1][1], 8) == 0.15, ref
report['usd_per_1000_common'] = 1000 * (ci * ref[1][0] + co * ref[1][1]) / 1e6 / 1485
report['usd_per_1000_all_items'] = 1000 * (sum(r['usage']['input_tokens'] for r in rows) * ref[1][0] + sum(r['usage']['output_tokens'] for r in rows) * ref[1][1]) / 1e6 / 1500
report['common_input_tokens'], report['common_output_tokens'] = ci, co
report['over_official_cap_ratio'] = report['usd_per_1000_common'] / 0.06459465517241379
(ROOT / 'receipts/PRICING-PREFLIGHT.json').write_text(json.dumps(report, indent=2, sort_keys=True, default=str) + '\n')
print(json.dumps(report, indent=1, default=str))
