# usage: rescore-boot.py <price_in> <price_out> <out.json>   (aggregates only; no item-level output)
# Bootstrap: B=1000, release seed 16. The official scorer seeds each system's bootstrap with seed+index in the roster
# (registry order jeff, wald, metask-4b, metask-12b, ryotide, decisor_4b -> decisor index 5), so a one-system run
# passes seed 16+5=21 to reproduce the published composite_ci95 exactly.
import json, os, sys, math
sys.path.insert(0, '/tmp/sf-scripts/official')
os.environ['JEV_NOUL_METHOD'] = 'O1S'
import score_v16 as v
ROSTER_INDEX = 5   # decisor_4b position in the v1.6.4 completed-field roster (see baseline.json fixed_roster)
pin, pout, out = float(sys.argv[1]), float(sys.argv[2]), sys.argv[3]
FROZEN = '/home/flori/jevbench-sealed/v1.6-run/v1.6-fastlane-20261009/frozen'
RAW = '/home/flori/jobs/fastlane-evaluations/3687485f-5a51-4964-bd9a-73973f3494d7/results/raw/native-v16-paid-20261009/jevbench.jsonl'
gold = v.load_gold(__import__('pathlib').Path(FROZEN + '/gold.jsonl'))
rows = [json.loads(l) for l in open(RAW) if l.strip()]
cb = json.load(open(FROZEN + '/cost-basis-reconstruction-adopted-v2/cost-basis.json'))
gm = json.load(open(FROZEN + '/completed-field-v164-six-ACTUAL/baseline.json'))['G_med']
v.COST_BASIS = {'exclude': set(cb['exclude_opaque_ids']), 'rule': cb['rule'], 'reference': cb['reference']}
system = {'endpoint_kind': 'gpu', 'lane': 'selfhosted', 'price_in_per_m': pin, 'price_kind': 'estimate',
          'price_out_per_m': pout, 'ranked': True, 'support': {'choice': 'native', 'noul': 'native', 'score': 'native'},
          'cost_basis': 'x'}
res = v.score_release(gold, {'decisor_4b': system}, {'decisor_4b': rows}, B=1000, seed=16 + ROSTER_INDEX, workers=1, g_med_fixed=gm)
r = res['systems'][0]
sub = [x for x in rows if (x.get('task_id') or x.get('id')) not in v.COST_BASIS['exclude']]
tin = sum(int((x.get('usage') or {}).get('input_tokens') or 0) for x in sub)
tout = sum(int((x.get('usage') or {}).get('output_tokens') or 0) for x in sub)
allin = sum(int((x.get('usage') or {}).get('input_tokens') or 0) for x in rows)
allout = sum(int((x.get('usage') or {}).get('output_tokens') or 0) for x in rows)
summary = {'bootstrap': {'B': 1000, 'release_seed': 16, 'roster_index': ROSTER_INDEX, 'system_seed': 16 + ROSTER_INDEX}, 'prices': [pin, pout], 'G_med': gm, 'A': r['scores']['A'], 'B': r['scores']['B'], 'C': r['scores']['C'],
           'axes': r['axes'], 'cost': r['cost'], 'capability': r.get('capability'), 'composite_ci95': r.get('composite_ci95'), 'ranked': r.get('ranked'),
           'common_basis_items': len(sub), 'common_in_tokens': tin, 'common_out_tokens': tout,
           'all_in_tokens': allin, 'all_out_tokens': allout, 'n_rows': len(rows), 'status': r['status']}
json.dump(summary, open(out, 'w'), indent=1)
print(json.dumps({k: summary[k] for k in ('A','B','C','composite_ci95','axes','cost','common_basis_items','common_in_tokens','common_out_tokens')}, indent=1))
