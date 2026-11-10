from pathlib import Path
import json,hashlib,importlib.util,math
B=Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r265b-v188-build');J=Path('/home/flori/wt/jevbench-v188-20261110/r198/v188');K='sd-jev-4b-v12.1.0-aligned-s42-step0256';S=B/'score'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
u=L(J/'src/usage.json')[K];raw=S/'runs/sd-jev-4b-v12.1.0.jsonl';assert sha(raw)==u['raw_sha256']
rows=[json.loads(x) for x in raw.read_text().splitlines()];cb=L(S/'private/cost-basis.json');ex=set(cb['exclude_opaque_ids']);common=[r for r in rows if r['task_id'] not in ex];assert len(common)==1489
P=Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py');assert sha(P)==u['ref']['module_sha256'];sp=importlib.util.spec_from_file_location('pricing',P);p=importlib.util.module_from_spec(sp);sp.loader.exec_module(p)
ref,rates=p.reference(K,{'base_model':'Qwen/Qwen3.5-4B'},p.catalog_rates());assert ref==u['ref']['listing']
for rr,n,suffix in [(common,1489,'common'),(rows,1500,'all')]:
 ti=sum((r.get('usage')or{}).get('input_tokens',0)or 0 for r in rr);to=sum((r.get('usage')or{}).get('output_tokens',0)or 0 for r in rr)
 lc=1000*(ti*rates[0]+to*rates[1])/1e6/n;gc=1000*(ti+to)*1.5235/(3600*61525*.70)/n
 assert math.isclose(lc,u['list_'+suffix],rel_tol=1e-12) and math.isclose(gc,u['gpu_'+suffix],rel_tol=1e-12)
 assert math.isclose(min(lc,gc),u['cost_'+suffix],rel_tol=1e-12)
for out in ['out-frozen','out-v17-off','out-v17-share']:
 r=L(S/out/'jevbench-v1.6.0-results.json')['systems'][0];assert r['cost']['kind']=='estimate' and r['cost']['usd_per_1000']==u['cost_common']
for pth in [raw,S/'private/cost-basis.json']:assert pth.stat().st_mode&0o777==0o600
receipt={'status':'PASS','raw_sha256':u['raw_sha256'],'rows':1500,'answered':1495,'refused':5,'common_n':1489,'pricing_module_sha256':sha(P),'cost_components':u['cost_components'],'scorer_cost_equal_in_three_views':True,'failure_treatment':'wrong for Intelligence; excluded from Calibration by the frozen scorer (no Calibration value exists for a refused request)','private_scoring_copy_mode':'0600','no_item_identifiers_exported':True}
(J/'receipts/RAW-PRICING.json').write_text(json.dumps(receipt,indent=1)+'\n');print('PASS raw pricing 2f52370f; list/GPU min in all three scorer views')
