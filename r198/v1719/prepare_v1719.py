"""Read only the two pinned complete raws and frozen scorer aggregates. Never render sealed string values."""
import pathlib,json,hashlib,copy,importlib.util
from rows_v1719 import *
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];B=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919');S=B/'r198/v1719/score';F=S/'field';D=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run')/DRAW_ID
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
tools=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.18-proof.json')['scorers'];H=pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness');S17=B/'r160/scorer'
paths={n:(S17/('PINS-v17.json' if n=='pins_v17' else n+'.py') if n in ['pins_v17','run_under_v17','score_v17'] else H/(n+'.py')) for n in tools}
assert all(sha(p)==tools[n] for n,p in paths.items()),'frozen scorer or cell tool changed'
CB=B/'r197/v1716/score/private/cost-basis-v1716.json';CS=L(B/'r197/v1716/score/private/COMMON-SET.json');assert CS['common_n']==1489 and CS['common_set_sha256']==COMMON_SHA and sha(CB)==CS['cost_basis_sha256']
assert sha(D/'inputs/input-selfhosted-1500.jsonl')=='9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426'
ids=[json.loads(l)['task_id'] for l in (D/'inputs/input-selfhosted-1500.jsonl').read_text().splitlines()];excl=set(L(CB)['exclude_opaque_ids']);common=set(ids)-excl;assert len(common)==1489 and hashlib.sha256(json.dumps(sorted(common),separators=(',',':')).encode()).hexdigest()==COMMON_SHA
kit=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r67-decisionnode');assert sha(D/'inputs/manifest.json')==L(kit/'state/draw-pins.json')['manifest_sha256'];kitpins={p.name:sha(p) for p in kit.glob('PREREG*')};prices=L(S/'PRICING.json');reg=L(F/'REGISTRY.json');inputs={};cells={};entries={};pins={'common_set':{'n':1489,'set_sha256':COMMON_SHA,'cost_basis_sha256':sha(CB),'frozen_at':'v1.7.16','rule':'fixed-common-cost-basis-d1027'}};raw_receipt={}
for k in KEYS:
 p=D/'runs-auto-intake'/k/('attempt2/decisionnode.raw.jsonl' if 'main' in k else 'decisionnode.raw.jsonl');assert sha(p)==PINS[k];rows=[json.loads(l) for l in p.read_text().splitlines()];assert len(rows)==1500 and [r['task_id'] for r in rows]==ids
 ok=[r for r in rows if r['ok'] and r['status_code']==200 and not r.get('error')];bad=[r for r in rows if r['status_code']==400];assert len(ok)==1495 and len(bad)==5
 assert all(r['served_model']==k and r['x-decisionnode-model']==k and r['provider_model_id']==k and r['usage']['output_tokens']==0 and r['probs_source']=='native' for r in ok)
 assert all(not r['ok'] and r['error_code']=='max_tokens_exceeded' and r['probs_as_returned'] is None for r in bad)
 # Check preregistered ids without disclosing them. Different historical set serialisations have different hashes.
 pr=L(kit/'state/prereg-ids.json');assert set(r['task_id'] for r in bad)==set(pr['task_ids']) and len(pr['task_ids'])==5
 refused_set_sha=hashlib.sha256('\n'.join(sorted(r['task_id'] for r in bad)).encode()).hexdigest();assert refused_set_sha=='3a0cbf0c2979a0c618ddc205042fd894547e5acfb3edae9282edcfe8c781c193'
 assert hashlib.sha256(json.dumps(sorted(pr['task_ids']),separators=(',',':')).encode()).hexdigest()=='8d7957c3ee9da390b38a249dc2bc72db04fa26b185ce600beb1ffcb1aa47b543'
 assert common<=set(r['task_id'] for r in ok),'frozen set must be answered; never shrink'
 tc=sum(r['usage']['input_tokens'] for r in ok if r['task_id'] in common);ta=sum(r['usage']['input_tokens'] for r in ok);lat=sorted(r['latency_s'] for r in rows)
 d={};pp={'raw_sha256':PINS[k],'raw_verified_in_place':True,'registry_sha256':sha(F/'REGISTRY.json'),'gold_sha256':sha(D/'frozen/gold.jsonl'),'input_sha256':sha(D/'inputs/input-selfhosted-1500.jsonl'),'manifest_sha256':sha(D/'inputs/manifest.json'),'kit_documents':kitpins,'preregistered_ids_file_sha256':sha(kit/'state/prereg-ids.json'),'attempt':2 if 'main' in k else 1}
 for mode in ['frozen','v17-off','v17-share']:
  q=F/f'out-{mode}/jevbench-v1.6.0-results.json';r=L(q);assert r['G_med']==2.573387642438244 and r['bootstrap']['B']==1000 and r['bootstrap']['bootstrap_seed']==16 and r['v16']['cost_basis']['file_sha256']==sha(CB)
  s=next(s for s in r['systems'] if s['key']==k);assert s['status']=={'answered_ok':1495,'missing':0,'rows':1500,'status':'complete'} and s['v16']['n_items']==1500
  assert s['axes']['cost'] is None and s['cost']['usd_per_1000'] is None and s['cost']['kind']=='unpriced' and all(x is None for x in s['scores'].values())
  d[mode]=copy.deepcopy(s);pp[mode]={'sha256':sha(q),'path':str(q)}
 sh=d['v17-share'];dis=DISCLOSURE+(MAIN_DISCLOSURE if 'main' in k else '')+f" Latency: p50 {sh['speed']['p50_s_raw']:.3f} s, p95 {sh['speed']['p95_s_raw']:.3f} s, maximum {lat[-1]:.3f} s."
 en={'display':reg[k]['display'],'author':'Bynn','provider':'bynn','repo':'https://decisionnode.com','endpoint_condition':'Hosted API by Bynn; direct synchronous vendor endpoint https://api.decisionnode.com/v1/systemone.','disclosure':dis,'model_pin':{'model':k,'served_model':k},'licence':'proprietary hosted API','cost_basis':COST_BASIS.format(n=f'{tc:,}')}
 for mode in ['frozen','v17-off','v17-share']:
  for f in ['display','author','endpoint_condition','disclosure']:d[mode][f]=en[f]
  d[mode]['cost']['basis']=en['cost_basis']
 d.update(registry=reg[k],measured_on='2026-10-28',raw_sha256=PINS[k],price_reference=prices[k],input_tokens_common=tc,input_tokens_all=ta,output_tokens=0,n_items=1500,n_answered=1495,n_refused=5,latency_max_s=lat[-1]);inputs[k]=d;pins[k]=pp;entries[k]={'entry':en};cc={}
 for mode in ['off','share']:
  q=F/f'cells/{mode}/categories.json';dp=F/f'cells/{mode}/decisive.json';cj=L(q);assert cj['source_results_sha256']==pp['v17-'+mode]['sha256'] and 'topics' not in cj['systems'][k]
  cc['cells_'+mode]=cj['systems'][k];cc['noul_'+mode]=L(dp)[k];cc['pool_'+mode]={dim:{x['key']:x['n'] for x in cj[dim]} for dim in ['families','languages','usecases']};pp['cells_'+mode]={'categories_sha256':sha(q),'decisive_sha256':sha(dp)}
 cells[k]=cc;raw_receipt[k]={'sha256':PINS[k],'rows':1500,'answered':1495,'over_limit_misses':5,'preregistered_ids_file_sha256':sha(kit/'state/prereg-ids.json'),'refused_set_sha256':refused_set_sha,'refused_set_hash_rule':'sha256 of sorted ids joined by newline, no trailing newline','frozen_common_n':1489,'common_input_tokens':tc,'all_input_tokens':ta,'output_tokens':0,'latency_max_s':lat[-1],'over_10_s':sum(x>10 for x in lat),'served_identity_matches':True,'complete_attempt':pp['attempt']}
co=L(W/'r198/v1718/src/carried-off.json')
for k,v in L(W/'r198/v1718/src/inputs.json').items():co[k]={f:v['v17-off'][f] for f in ['axes','capability','jevbench_score','scores','speed','views']}
for f,v in [('src/inputs.json',inputs),('src/cells.json',cells),('inputs/ENTRIES.json',entries),('receipts/INPUTS.json',pins),('src/recost.json',{}),('src/carried-off.json',co),('receipts/RAW-BINDING.json',raw_receipt),('receipts/PRICING.json',prices)]:put(J/f,v)
print('PASS both pinned complete raws, 1500 denominators, 1495 answered and 5 preregistered misses; frozen set 1489; no cost computed')
