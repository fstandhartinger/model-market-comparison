"""Measured cost requires the predecessor's measured-bill allowlist; v1.7.8 allows none."""
import copy,json,pathlib
J=pathlib.Path(__file__).resolve().parent;V=J.parents[1]/'data/raw/benchmarks/jevbench/v1.7';L=lambda p:json.loads(p.read_text())
# Explicit v1.7.8 measured-bill allowed set: empty. No newly claimed bill is admitted here.
ALLOWED_MEASURED_BILLS=set()
old=L(V/'jevbench-v1.7.8-results.json')
assert {r['key'] for r in old['systems'] if r.get('cost',{}).get('kind')=='measured'}==ALLOWED_MEASURED_BILLS

def check(rows):
 for r in rows:
  assert r.get('cost',{}).get('kind')!='measured' or r['key'] in ALLOWED_MEASURED_BILLS, 'measured cost without an allowed measured bill: '+r['key']
rows=L(V/'jevbench-v1.7.9-results.json')['systems'];check(rows);k='launchables-myles-g-12b';r=next(r for r in rows if r['key']==k);assert r['cost']['kind']=='estimate'
e=L(J/'inputs/MYLESG12-REGISTRY.json')[k];assert e['cost_kind']==e['price_kind']=='estimate'
for mode in ['share','off']:
 check(L(J/f'scoring/{mode}/jevbench-v1.6.0-results.json')['systems']);assert L(J/f'scoring/{mode}/{k}.json')['cost']['kind']=='estimate'
bad=copy.deepcopy(r);bad['cost']['kind']='measured'
try:check([bad])
except AssertionError as ex:assert 'without an allowed measured bill' in str(ex)
else:raise AssertionError('negative measured-without-bill fixture accepted')
board=(J.parents[1]/'components/JevBenchV16Board.tsx').read_text()
assert "cost?.kind === 'estimate'" in board and 'data-bh-jev14-est>est.</span>' in board
assert "new Set(['estimate', 'estimated', 'mixed'])" in board and 'ESTIMATE_KINDS.has(r.cost?.kind' in board
assert r in [x for x in rows if x.get('cost',{}).get('kind') in {'estimate','estimated','mixed'} and x['cost'].get('basis')]
out={'status':'PASS','allowed_measured_bill_keys_v178':sorted(ALLOWED_MEASURED_BILLS),'myles_cost_kind':'estimate','estimated_rows_list_includes_myles':True,'board_est_tag_condition_verified':True,'negative_measured_without_bill':'REFUSED_AS_REQUIRED'}
(J/'receipts/COST-KIND.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('PASS estimate throughout; v1.7.8 measured-bill allowed set []; negative measured-without-bill fixture refused')
