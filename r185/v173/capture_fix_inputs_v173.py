"""Capture local corrected prose and ScaleDown aggregates; never modify score workers."""
import copy, hashlib, json, pathlib, collections
J=pathlib.Path(__file__).resolve().parent
L=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
k='chon-1.0-e4b';p=J/'inputs/ENTRY-CHON-E4B.json'
if not p.exists():
 d=L(J/'inputs/ENTRIES-CHONE4B-R185.json');e=d[k]['entry']
 e['disclosure']=e['disclosure'].replace("--no-think is the author's documented CPU mode, a different serving configuration from the GPU default: the think pass that fires on up to 45 % of questions never runs.","This uses the author's documented --no-think mode; the author's GPU default thinks first on up to 45 % of questions, while that think pass never runs here.")
 e['disclosure']+=" Scores AND times both come from this GPU run, replacing the CPU measurement in full (scores and times). CPU and GPU probabilities differ on 1,049 of 1,500 items (9 top answers changed), attributed to device numerics; Intelligence and Calibration therefore moved slightly."
 e['endpoint_condition']=e['endpoint_condition'].replace('PyTorch 2.9.1+cu128, transformers 5.19.0, peft 0.18.1.',"Runtime pinned by the build: Python 3.11 container (author documents Python 3.12), PyTorch 2.9.1+cu128, transformers 5.19.0, peft 0.18.1 and huggingface-hub 1.33.0; no runtime version readback was collected.").replace('unchanged listed inference tariff','unchanged base-model inference cost estimate')
 # Only the display kind changes; value, basis, axes and all calculations stay fixed.
 e['cost_kind']=e['price_kind']='estimate';put(p,d)
S=pathlib.Path('/home/flori/jobs/scaledown-eval-neal-20261023/official');k='scaledown-classify-1';d=L(S/'ENTRIES-SD.json');e=d[k]['entry']
e['endpoint_condition']=e['endpoint_condition'].replace(' (custody #25026/#25102)','')
# Preserve supplied scores, while disclosing the mismatch between handoff usage-only diagnostics and scored cost.
e['cost_basis']=("ScaleDown vendor list price, USD 0.05/M input tokens; output is free. Explicit vendor reference scaledown:classify-1 (vendor list price), with no base-model price. The frozen pricing module has no key for this API, so this row uses an explicit reference at that price. The scored cost includes the frozen scorer's usage fallback for four HTTP 504 rows: USD 0.04369407407407409 per 1,000 decisions on the common 1,485-item basis (0.67643x the USD 0.06459465517241379 cap); USD 0.082679 per 1,000 over all 1,500. Provider-reported usage alone gives USD 0.035613266 per 1,000 common items and USD 0.074679 over all items, excluding usage estimates for those failures. Cost kind mixed: four rows have estimated usage. Not a bill or quote.")
put(J/'inputs/ENTRY-SCALEDOWN.json',d)
raw=pathlib.Path(d[k]['raw']);assert sha(raw)=='900652c68a38db3d51e00567b2dd45b2cdc771646a611058a1701441e3d10fbb'
inputs=L(J/'src/inputs.json');pins=L(J/'receipts/INPUTS.json');reg=L(S/'field-sd/REGISTRY.json')[k]
inputs[k]={'entry':copy.deepcopy(e),'registry':{f:v for f,v in reg.items() if f not in ['disclosure','cost_basis','code_revision','endpoint_condition']},'measured_on':'2026-10-24','raw_sha256':sha(raw)}
pins[k]={'entry_path':str(S/'ENTRIES-SD.json'),'entry_sha256':sha(S/'ENTRIES-SD.json'),'registry_sha256':sha(S/'field-sd/REGISTRY.json'),'raw_sha256':sha(raw),'raw_verified_in_place':True,'raw_hash_source':'in-place verification; raw not copied','handoff_sha256':sha(S/'HANDOFF-SD.md'),'explicit_ref':d[k]['explicit_ref']}
for mode in ['frozen','v17-off','v17-share']:
 p=S/f'field-sd/out-{mode}/jevbench-v1.6.0-results.json';inputs[k][mode]=copy.deepcopy(next(r for r in L(p)['systems'] if r['key']==k));pins[k][mode]={'path':str(p),'sha256':sha(p)}
put(J/'src/inputs.json',inputs);put(J/'receipts/INPUTS.json',pins)
a=L(J/'inputs/APPROVAL.json');p=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r185-e4b-prescore/RESULT.json');assert sha(p)=='846c0dca823e93b085c58fac600b0ebc862155e4288d0b7f41e67fc846784122'
a['fairness_check']={'path':'workers/r185-e4b-prescore/RESULT.json','sha256':sha(p),'verdict':'FAIR','engine':L(p)['engine']}
a['asks']=[x for x in a['asks'] if x['key']!=k]+[{'key':k,'admission':'custody #25026/#25102','handoff':'board #25894 (HANDOFF-SD.md)','relay':'regular queue'}];put(J/'inputs/APPROVAL.json',a)
# Aggregate-only independent raw arithmetic, no IDs or predictions written.
rows=[json.loads(line) for line in raw.open() if line.strip()];ex=set(L(pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r154/v1636/batch/cost-basis-v1630.json'))['exclude_opaque_ids']);common=[r for r in rows if r['task_id'] not in ex]
def totals(rs):
 i=sum((r.get('usage') or {}).get('input_tokens',0) or 0 for r in rs);o=sum((r.get('usage') or {}).get('output_tokens',0) or 0 for r in rs);usd=i*0.05/1e6/len(rs)*1000
 return {'rows':len(rs),'input_tokens':i,'output_tokens':o,'usd_per_1000_reported_usage':usd,'cap_ratio_reported_usage':usd/0.06459465517241379}
fallback=[]
for r in rows:
 c=copy.deepcopy(r);u=dict(c.get('usage') or {});ce=c.get('cost_estimate')
 if (u.get('input_tokens') is None or u.get('output_tokens') is None) and isinstance(ce,dict):
  u.update(input_tokens=ce.get('input_tokens',u.get('input_tokens')),output_tokens=ce.get('output_tokens',u.get('output_tokens')));c['usage']=u
 fallback.append(c)
fallback_common=[r for r in fallback if r['task_id'] not in ex]
assert abs(totals(fallback_common)['usd_per_1000_reported_usage']-inputs[k]['v17-share']['cost']['usd_per_1000'])<1e-14
assert abs(totals(fallback)['usd_per_1000_reported_usage']-inputs[k]['v17-share']['cost']['common_basis']['usd_per_1000_all_items'])<1e-14
out={'raw_sha256':sha(raw),'rows':len(rows),'answered':sum(r['ok'] for r in rows),'status_counts':dict(collections.Counter(str(r['status_code']) for r in rows)),'all':totals(rows),'common':totals(common),'all_including_raw_cost_estimates':totals(fallback),'common_including_raw_cost_estimates':totals(fallback_common),'scored_cost':inputs[k]['v17-share']['cost'],'scored_cap_ratio':inputs[k]['v17-share']['cost']['usd_per_1000']/0.06459465517241379,'note':'Handoff prose omits frozen fallback charges on four failed rows; numeric scored cost and all scores carried exactly. Public cost basis discloses both.'}
put(J/'receipts/SD-RECOMPUTE.json',out)
print(json.dumps({f:out[f] for f in ['rows','answered','status_counts','all','common','scored_cap_ratio']},indent=1))
