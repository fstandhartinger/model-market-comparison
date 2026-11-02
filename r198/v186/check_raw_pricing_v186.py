"""Sandy-only raw-to-cost validation; writes aggregates only."""
from pathlib import Path
import collections, hashlib, importlib.util, json, math

J = Path(__file__).resolve().parent
W = J.parents[1]
S = Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r227-v186-delta/score')
RAW = Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027/runs-fastlane/metadecision-31b-rain.raw.jsonl')
HOST = Path('/home/flori/jobs/fastlane-native-580d6afe/receipts/HOST-RECEIPT-sealed.json')
DRAW = Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027')
COMMON = Path('/home/flori/jobs/jevbench-add-requests-20260919/r197/v1716/score/private/cost-basis-v1716.json')
PRICING = Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
KEY = 'metadecision-31b-rain'
RAW_SHA = '468550e45a233ea1182e61c564bc3d60a92e05b6545a392db0283739ff15477a'
COMMON_SHA = '4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537'
PRICING_SHA = '455ee38b7070f2f076eec65d55c7bb2a69030c26c343c662ade2826f8afd6eaa'
THROUGHPUT = 10106.516129
HOURLY_USD = 1.5235
LOAD = 0.70
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
load = lambda p: json.loads(Path(p).read_text())
assert sha(RAW) == RAW_SHA, 'sealed raw hash mismatch'
assert sha(PRICING) == PRICING_SHA, 'pricing_v15 pin mismatch'
assert sha(COMMON) == load(W / 'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.5-proof.json')['cost_basis']['cost_basis_sha256']
host = load(HOST)
assert host['raw']['sha256'] == RAW_SHA and host['raw_rows'] == host['n_items'] == 1500 and host['complete']
assert host['usage']['reported_input_tokens'] == 753547
assert host['usage']['reported_output_tokens'] == 72602
assert host['usage']['usage_estimated_rows'] == 0
assert host['usage']['initial_prompt_mismatches'] == host['usage']['engine_identity_mismatches'] == 0
assert host['lead_count']['processed_input_tokens'] == 597680
assert host['lead_count']['untrimmed_input_tokens'] == 964173 and host['lead_count']['trimmed'] == 5
assert abs(host['scored_elapsed_s'] - 2422) < 1

rows = [json.loads(line) for line in RAW.read_text().splitlines() if line.strip()]
assert len(rows) == 1500 and len({r['task_id'] for r in rows}) == 1500
assert all(r.get('ok') and not r.get('error') and r.get('status_code') == 200 for r in rows)
assert collections.Counter(str(r['status_code']) for r in rows) == {'200': 1500}
assert all(r.get('usage', {}).get('input_tokens') is not None and r.get('usage', {}).get('output_tokens') is not None for r in rows)
tin = sum(int(r['usage']['input_tokens']) for r in rows)
tout = sum(int(r['usage']['output_tokens']) for r in rows)
assert (tin, tout) == (753547, 72602)
input_path = DRAW / 'inputs/input-selfhosted-1500.jsonl'
input_ids = [json.loads(line)['task_id'] for line in input_path.read_text().splitlines() if line.strip()]
assert sha(input_path) == host['input_sha256'] and [r['task_id'] for r in rows] == input_ids

cb = load(COMMON)
excluded = set(cb['exclude_opaque_ids'])
common = [r for r in rows if r['task_id'] not in excluded]
assert len(common) == 1489
common_sha = hashlib.sha256(json.dumps(sorted(r['task_id'] for r in common), separators=(',', ':')).encode()).hexdigest()
assert common_sha == COMMON_SHA
tin_common = sum(int(r['usage']['input_tokens']) for r in common)
tout_common = sum(int(r['usage']['output_tokens']) for r in common)

spec = importlib.util.spec_from_file_location('frozen_pricing_v186', PRICING)
pricing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pricing)
base = 'google/gemma-4-31B-it'
reference = pricing.reference(KEY, {'base_model': base}, pricing.catalog_rates())
assert reference is not None and reference[0] == 'google/gemma-4-31b-it'
rates = tuple(round(float(x), 12) for x in reference[1])
assert all(math.isclose(x, y, abs_tol=1e-12) for x, y in zip(rates, (0.09, 0.34)))
gpu_rate = HOURLY_USD / (3600 * LOAD * THROUGHPUT) * 1e6
cost = lambda ti, to, n, ri, ro: 1000 * (ti * ri + to * ro) / 1e6 / n
list_common = cost(tin_common, tout_common, 1489, *rates)
list_all = cost(tin, tout, 1500, *rates)
gpu_common = cost(tin_common, tout_common, 1489, gpu_rate, gpu_rate)
gpu_all = cost(tin, tout, 1500, gpu_rate, gpu_rate)
assert abs(gpu_common - 0.033) <= 0.033 * 0.05, f'GPU-time component {gpu_common:.9f} differs from expected 0.033 by >5%'
assert math.isclose(gpu_common, 0.031721961700337906, abs_tol=1e-12)
assert list_common > gpu_common and min(list_common, gpu_common) == gpu_common
assert math.isclose(list_common, 0.059822309614, abs_tol=1e-9)

usage = load(J / 'src/usage.json')[KEY]
assert usage['raw_sha256'] == RAW_SHA and usage['scoring_raw_sha256'] == sha(S / 'runs' / f'{KEY}.jsonl')
assert usage['input_tokens_all'] == tin and usage['output_tokens_all'] == tout
assert usage['input_tokens_common'] == tin_common and usage['output_tokens_common'] == tout_common
assert usage['common_n'] == 1489 and usage['common_set_sha256'] == common_sha
assert usage['cost_common'] == gpu_common and usage['cost_all'] == gpu_all
assert usage['list_common'] == list_common and usage['list_all'] == list_all
assert (S / 'runs' / f'{KEY}.jsonl').stat().st_mode & 0o777 == 0o600
assert (S / 'private/cost-basis.json').stat().st_mode & 0o777 == 0o600

receipt = {
    'status': 'PASS', 'rows': {KEY: {
        'raw_sha256': RAW_SHA, 'rows': 1500, 'all_http_200': True,
        'input_tokens': tin, 'output_tokens': tout, 'usage_estimated_rows': 0,
        'raw_order_matches_frozen_input': True, 'common_n': 1489,
        'common_set_sha256': common_sha, 'pricing_base': base,
        'frozen_pricing_reference': reference[0], 'list_rate_in_per_m': rates[0], 'list_rate_out_per_m': rates[1],
        'list_price_common_usd_per_1000': list_common, 'gpu_time_common_usd_per_1000': gpu_common,
        'min_selected_usd_per_1000': min(list_common, gpu_common),
        'gpu_time_all_rows_usd_per_1000': gpu_all,
        'private_scoring_copy_mode': '0600', 'no_item_identifiers_exported': True,
    }},
    'pricing_module_sha256': PRICING_SHA, 'common_set_sha256': COMMON_SHA,
    'all_frozen_scorer_pins_verified_by_score_script': True,
}
(J / 'receipts/RAW-PRICING.json').write_text(json.dumps(receipt, indent=1, sort_keys=True) + '\n')
print(f'PASS 1500 raw rows, 1489 common items, frozen Gemma pricing reference; list USD {list_common:.9f}, GPU-time USD {gpu_common:.9f}, min selected')
