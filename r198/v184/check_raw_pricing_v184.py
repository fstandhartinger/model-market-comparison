"""Sandy-only, read-in-place raw/expect/accounting/price binding; exports aggregates only."""
import pathlib,json,hashlib,collections,importlib.util
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();L=lambda p:json.loads(pathlib.Path(p).read_text())
proof=L(W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.4-proof.json');usage=L(J/'src/usage.json');pins=L(J/'inputs/ENTRY-PINS.json')
H=pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness');S17=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r160/scorer')
paths={'a2_cells_v16':H/'a2_cells_v16.py','build_categories_v16':H/'build_categories_v16.py','build_topics_v16':H/'build_topics_v16.py','decisive_v16':H/'decisive_v16.py','noul_method_v16':H/'noul_method_v16.py','pins_v17':S17/'PINS-v17.json','run_under_v17':S17/'run_under_v17.py','score_v15':H/'score_v15.py','score_v15_headlineA':H/'score_v15_headlineA.py','score_v16':H/'score_v16.py','score_v17':S17/'score_v17.py'}
assert set(paths)==set(proof['scorers'])
for k,p in paths.items():assert sha(p)==proof['scorers'][k],k
pm=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py');assert sha(pm)==proof['pricing_module_sha256']=='455ee38b7070f2f076eec65d55c7bb2a69030c26c343c662ade2826f8afd6eaa'
spec=importlib.util.spec_from_file_location('frozen_pricing_v184',pm);pr=importlib.util.module_from_spec(spec);spec.loader.exec_module(pr)
cb=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r197/v1716/score/private/cost-basis-v1716.json');assert sha(cb)==proof['cost_basis']['cost_basis_sha256'];ex=set(L(cb)['exclude_opaque_ids'])
inp=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027/inputs/input-selfhosted-1500.jsonl');assert sha(inp)=='9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426'
ids={json.loads(l)['task_id'] for l in inp.read_text().splitlines()};assert len(ids-ex)==1489 and hashlib.sha256(json.dumps(sorted(ids-ex),separators=(',',':')).encode()).hexdigest()==proof['cost_basis']['set_sha256']
seen={};excluded=L(J/'receipts/EXCLUDED-ROWS.json');changed_excluded={}
for fp,sp in pins.items():
 current_sha=sha(fp)
 if current_sha!=sp:
  current=L(fp)
  assert set(current)<=set(excluded) and not set(current)&set(usage),'included entry changed after build'
  changed_excluded[fp]={'pinned_sha256':sp,'current_sha256':current_sha,'keys':list(current),'current_expect':{k:v.get('expect') for k,v in current.items()},'treatment':'STOP row; changed excluded source is not integrated'}
  continue
 for k,s in L(fp).items():
  raw=pathlib.Path(s['raw']);rh=sha(raw);assert rh in json.dumps(s),'raw not fully bound in pinned draft'
  rows=[json.loads(l) for l in raw.read_text().splitlines() if l.strip()];assert len(rows)==1500 and {r['task_id'] for r in rows}==ids
  tin=sum((r.get('usage')or{}).get('input_tokens',0)or 0 for r in rows);tout=sum((r.get('usage')or{}).get('output_tokens',0)or 0 for r in rows);ok=sum(bool(r.get('ok')) and not bool(r.get('error')) for r in rows)
  actual={'ok':ok,'failed':1500-ok,'input_tokens':tin,'output_tokens':tout,'status_counts':dict(collections.Counter(str(r['status_code']) for r in rows))}
  if k in excluded:assert actual==excluded[k]['actual'];continue
  expect=s['expect'];assert all(actual[f]==expect[f] for f in ['ok','failed','input_tokens','status_counts'])
  if k=='sors-2b':assert tout==1495 and expect['output_tokens']==0 and s['zero_output'] is True
  else:assert tout==expect['output_tokens']
  u=usage[k];assert rh==u['raw_sha256'] and tin==u['input_tokens_all']
  assert k=='granite-switch-4.1-8b' and s['pricing_base']=='ibm-granite/granite-4.1-8b'
  rates=pr.catalog_rates()
  exact=next((v for key,v in rates.items() if key=='ibm-granite/granite-4.1-8b'),None);assert exact is None
  sibling=rates['ibm-granite/granite-4.2-8b'];assert sibling==(.06,.25) or sibling==[.06,.25]
  assert u['ref']['listing']=='granite-4.2-8b' and u['ref']['in']==.06 and u['ref']['out']==.25 and u['ref']['reference_kind']=='sibling'
  assert u['gpu_common'] is None and u['cost_common']==u['estimate_common']
  seen[k]={'raw_sha256':rh,'expect_verified':True,'output_accounting':'native counter excluded (no generated tokens)' if k=='sors-2b' else 'native usage','pricing_reference_verified':True}
assert set(seen)==set(usage)
(J/'receipts/RAW-PRICING.json').write_text(json.dumps({'status':'PASS' if not excluded and not changed_excluded else 'PASS_WITH_EXCLUDED_ROW','rows':seen,'excluded':excluded,'changed_excluded_sources':changed_excluded,'all_11_scorer_pins_verified':True,'pricing_module_sha256':sha(pm),'common_n':1489,'common_set_sha256':proof['cost_basis']['set_sha256'],'no_item_identifiers_exported':True},indent=1,sort_keys=True)+'\n')
print('PASS',len(seen),'raw/expect/price bindings; all 11 tool pins; common set1489')
