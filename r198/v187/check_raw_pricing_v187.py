"""Sandy-only raw-to-cost validation for the hosted Nemotron row; writes aggregates only (run before the private copies are removed)."""
from pathlib import Path
import collections, hashlib, importlib.util, json, math

J = Path(__file__).resolve().parent
W = J.parents[1]
S = Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r251-v187-build/score')
JOB = Path('/home/flori/jobs/jevbench-add-requests-20260919')
DRAW = Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027')
RAW = DRAW / 'runs-addreq-r241/nemotron-3.5-super-vl.jsonl'
GUARD = DRAW / 'runs-addreq-r241/nemotron-3.5-super-vl.guard.jsonl'
COMMON = JOB / 'r197/v1716/score/private/cost-basis-v1716.json'
PRICING = Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
INSTALL = JOB / 'r227/receipts/INSTALL-R227.json'
KEY = 'nvidia/nemotron-3.5-super-vl'
RAW_SHA = '5b54e44b0340746d759d9433858b69f7c8c3b931cb901421ac03933bfb39ddbb'
COMMON_SHA = '4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537'
PRICING_SHA = '2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
load = lambda p: json.loads(Path(p).read_text())
assert sha(RAW) == RAW_SHA, 'sealed raw hash mismatch'
assert sha(PRICING) == PRICING_SHA, 'installed pricing_v15 is not 2f52370f'
assert load(INSTALL)['new_source_sha256'] == PRICING_SHA
assert sha(COMMON) == load(W / 'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.6-proof.json')['cost_basis']['cost_basis_sha256']

rows = [json.loads(line) for line in RAW.read_text().splitlines() if line.strip()]
assert len(rows) == 1500 and len({r['task_id'] for r in rows}) == 1500
assert all(r.get('ok') and not r.get('error') and r.get('status_code') == 200 and r.get('provider_model_id') == KEY for r in rows)
assert collections.Counter(str(r['status_code']) for r in rows) == {'200': 1500}
tin = sum(int(r['usage']['input_tokens']) for r in rows)
tout = sum(int(r['usage']['output_tokens']) for r in rows)
assert (tin, tout) == (1015566, 62716)
guard = [json.loads(line) for line in GUARD.read_text().splitlines() if line.strip()]
assert collections.Counter((g['event'], g['status'], g['provider'], g['model']) for g in guard) == {
    ('response', 200, 'Crusoe', KEY): 1500, ('response', 429, None, None): 56}
input_path = DRAW / 'inputs/input-selfhosted-1500.jsonl'
input_ids = [json.loads(line)['task_id'] for line in input_path.read_text().splitlines() if line.strip()]
assert [r['task_id'] for r in rows] == input_ids

cb = load(COMMON)
excluded = set(cb['exclude_opaque_ids'])
common = [r for r in rows if r['task_id'] not in excluded]
assert len(common) == 1489
common_sha = hashlib.sha256(json.dumps(sorted(r['task_id'] for r in common), separators=(',', ':')).encode()).hexdigest()
assert common_sha == COMMON_SHA
tin_c = sum(int(r['usage']['input_tokens']) for r in common)
tout_c = sum(int(r['usage']['output_tokens']) for r in common)

spec = importlib.util.spec_from_file_location('frozen_pricing_v187', PRICING)
pricing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pricing)
assert KEY in pricing.LAUNCH_LIST_PRICE_API
res = pricing.resolve(KEY, {'source': 'api', 'price_in_per_m': 0.1, 'price_out_per_m': 0.4}, rows, pricing.catalog_rates())
assert res['rankable'] and res['counting_list_price'] is True and res['floor_binds'] is False and res['market_reference'] is None
assert res['note'].startswith('operator standard launch list price (interpretation I-1)'), res['note']
cost = lambda ti, to, n: 1000 * (ti * 0.1 + to * 0.4) / 1e6 / n
cost_all, cost_common = cost(tin, tout, 1500), cost(tin_c, tout_c, 1489)
assert math.isclose(res['usd_per_1000'], cost_all, rel_tol=1e-12) and abs(cost_all * 1.5 - 0.126643) < 1e-6

usage = load(J / 'src/usage.json')[KEY]
assert usage['raw_sha256'] == RAW_SHA and usage['scoring_raw_sha256'] == sha(S / 'runs/nemotron-3.5-super-vl.jsonl')
assert usage['input_tokens_all'] == tin and usage['output_tokens_all'] == tout
assert usage['input_tokens_common'] == tin_c and usage['output_tokens_common'] == tout_c
assert usage['cost_common'] == cost_common == usage['list_common'] and usage['cost_all'] == cost_all == usage['list_all']
# The scorer's own cost, in all three views, must equal the independent arithmetic.
for out in ('out-frozen', 'out-v17-off', 'out-v17-share'):
    s = load(S / out / 'jevbench-v1.6.0-results.json')['systems'][0]
    assert s['key'] == KEY and math.isclose(s['cost']['usd_per_1000'], cost_common, rel_tol=1e-12)
    assert math.isclose(s['cost']['common_basis']['usd_per_1000_all_items'], cost_all, rel_tol=1e-12) and s['cost']['kind'] == 'tariff'
assert (S / 'runs/nemotron-3.5-super-vl.jsonl').stat().st_mode & 0o777 == 0o600
assert (S / 'private/cost-basis.json').stat().st_mode & 0o777 == 0o600

receipt = {
    'status': 'PASS', 'rows': {KEY: {
        'raw_sha256': RAW_SHA, 'rows': 1500, 'all_http_200': True, 'guard_responses_200_crusoe_exact_model': 1500, 'rate_limited_429_resent': 56,
        'input_tokens': tin, 'output_tokens': tout, 'usage_estimated_rows': 0, 'raw_order_matches_frozen_input': True,
        'common_n': 1489, 'common_set_sha256': common_sha, 'rate_in_per_m': 0.1, 'rate_out_per_m': 0.4,
        'pricing_resolve_note': res['note'], 'pricing_resolve_usd_per_1000_all': res['usd_per_1000'],
        'common_usd_per_1000': cost_common, 'all_items_usd_per_1000': cost_all,
        'scorer_cost_equal_in_three_views': True, 'private_scoring_copy_mode': '0600', 'no_item_identifiers_exported': True,
    }},
    'pricing_module_sha256': PRICING_SHA, 'common_set_sha256': COMMON_SHA,
}
(J / 'receipts/RAW-PRICING.json').write_text(json.dumps(receipt, indent=1, sort_keys=True) + '\n')
print(f'PASS 1500 raw rows, 1500 guarded Crusoe responses, 1489 common items, pricing 2f52370f; common USD {cost_common:.9f}, all USD {cost_all:.9f}')
