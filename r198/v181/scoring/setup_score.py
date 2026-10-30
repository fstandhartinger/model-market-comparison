import pathlib,json,hashlib,importlib.util,collections,copy,shutil,re
S=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r201-v181-build/score');W=pathlib.Path('/home/flori/wt/jevbench-v181-20261030');J=W/'r198/v181';D=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027')
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
put=lambda p,x:pathlib.Path(p).write_text(json.dumps(x,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
pricing=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py');assert sha(pricing)=='455ee38b7070f2f076eec65d55c7bb2a69030c26c343c662ade2826f8afd6eaa'
sp=importlib.util.spec_from_file_location('pricing',pricing);pr=importlib.util.module_from_spec(sp);sp.loader.exec_module(pr)
files=[(f'/home/flori/jobs/jevbench-auto-intake/workers/entries-{a}/ENTRIES-{b}.json',c) for a,b,c in [('wemm','WEMM','967f2e32'),('dking11','DKING11','d27a251f'),('saif4b','SAIF4B','e155b9c9'),('joey1','JOEY1','00e1e560'),('cribl2','CRIBL2','a41f3481'),('sors2b','SORS2B','e551e440')]]+[(f'/home/flori/jobs/fastlane-native-{a}/score/ENTRIES-{b}.json',c) for a,b,c in [('04680d1a','IOTA-V04','e1296828'),('acd8eac6','DECIDE-1-1','95652a2b')]]
for p in [S/'runs',S/'private']:p.mkdir(parents=True,exist_ok=True,mode=0o700)
cb=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r197/v1716/score/private/cost-basis-v1716.json');shutil.copyfile(cb,S/'private/cost-basis.json');(S/'private/cost-basis.json').chmod(0o600)
ex=set(json.loads(cb.read_text())['exclude_opaque_ids']);inp=D/'inputs/input-selfhosted-1500.jsonl';assert sha(inp)=='9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426'
ids={json.loads(l)['task_id'] for l in inp.read_text().splitlines()};assert len(ids-ex)==1489 and hashlib.sha256(json.dumps(sorted(ids-ex),separators=(',',':')).encode()).hexdigest()=='4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537'
rawprefix={'wemm-jev':'53e6c817','decision-king-v1.1':'101f416e','saif-4b':'1a7b04e1','joey-1':'e275672c','cribl-decision-2':'a40e9fc8','cribl-decision-2-mini':'b863a81f','iota-decide-4b-v0.4':'b9f4f3b6','decide-1.1':'8a96dc58','sors-2b':'2ec336db'}
reg={};entries={};summ={};pins={};excluded={}
for fn,prefix in files:
 assert sha(fn).startswith(prefix), 'STOP entry changed: '+fn
 pins[fn]=sha(fn)
 for k,spec in json.loads(pathlib.Path(fn).read_text()).items():
  raw=pathlib.Path(spec['raw']);rh=sha(raw);assert rh.startswith(rawprefix[k]) and rh in json.dumps(spec),'raw hash mismatch '+k
  if spec.get('raw_sha256'):assert rh==spec['raw_sha256']
  rows=[json.loads(l) for l in raw.read_text().splitlines() if l.strip()];assert len(rows)==1500 and {r['task_id'] for r in rows}==ids
  assert len({r['task_id'] for r in rows})==1500
  ok=[r for r in rows if r.get('ok') and not r.get('error')];tin=sum((r.get('usage') or {}).get('input_tokens',0) or 0 for r in rows);tout=sum((r.get('usage') or {}).get('output_tokens',0) or 0 for r in rows)
  e=spec['expect']
  actual={'ok':len(ok),'failed':1500-len(ok),'status_counts':dict(collections.Counter(str(r['status_code']) for r in rows)),'input_tokens':tin,'output_tokens':tout}
  if any(actual[f]!=e[f] for f in ['ok','failed','status_counts','input_tokens']):
   excluded[k]={'reason':'ENTRY_EXPECT_MISMATCH','expected':e,'actual':actual,'raw_sha256':rh,'entry_sha256':sha(fn)}
   continue
  if k!='sors-2b':assert tout==e['output_tokens'],'output expect '+k
  else:assert tout in [0,1495] and e['output_tokens']==0
  for r in rows:
   if spec.get('zero_output'):
    if r.get('usage'):r['usage']['output_tokens']=0
  tout=sum((r.get('usage') or {}).get('output_tokens',0) or 0 for r in rows)
  en=copy.deepcopy(spec['entry']);en.update(ranked=True,measured_on='2026-10-30' if k in ['sors-2b','decide-1.1'] else '2026-10-29',provider='decide.sh' if k=='decide-1.1' else 'self-hosted')
  if k=='decide-1.1':
   assert spec['pricing_tariff']['in_per_m']==.03 and spec['pricing_tariff']['out_per_m']==0
   en.update(source='api',price_in_per_m=.03,price_out_per_m=0.,base_model=None);en.pop('usd_per_1000_override',None);ref={'listing':'decide-1.1','in':.03,'out':0.,'kind':'measured','rule':'I-1 launch list price; https://decide.sh/pricing; applied since 2026-10-29; input-only billing'}
   rs=pr.resolve(k,en,rows,pr.catalog_rates());assert rs['counting_list_price'] and rs['rankable']
  else:
   rr=pr.reference(k,{'base_model':spec['pricing_base']},pr.catalog_rates());assert rr
   ref={'listing':rr[0],'in':rr[1][0],'out':0. if spec.get('zero_output') else rr[1][1],'kind':'estimate'};en.update(price_in_per_m=ref['in'],price_out_per_m=ref['out'])
  en.update(cost_kind=ref['kind'],price_kind=ref['kind'],cost_basis='API launch list price (I-1): https://decide.sh/pricing, applied since 2026-10-29. USD 0.03 per million input tokens; output free (input-only billing), no base model declared and no override.' if k=='decide-1.1' else 'draft, replaced in release builder')
  sub=[r for r in rows if r['task_id'] not in ex];assert len(sub)==1489
  tc=sum((r.get('usage') or {}).get('input_tokens',0) or 0 for r in sub);oc=sum((r.get('usage') or {}).get('output_tokens',0) or 0 for r in sub)
  cost=lambda ti,to,n:1000*(ti*ref['in']+to*ref['out'])/1e6/n
  v={'raw_sha256':rh,'expect':e,'input_tokens_all':tin,'output_tokens_all':tout,'native_output_tokens_all':e['output_tokens'] if k!='sors-2b' else 1495,'input_tokens_common':tc,'output_tokens_common':oc,'estimate_common':cost(tc,oc,1489),'estimate_all':cost(tin,tout,1500),'ref':ref,'latency_max':max(r['latency_s'] for r in rows),'over10':sum(r['latency_s']>10 for r in rows),'answered_not_in_common':sum(r['task_id'] in ex for r in ok),'raw_order_matches_input': [r['task_id'] for r in rows]==[json.loads(l)['task_id'] for l in inp.read_text().splitlines()]}
  if k!='decide-1.1':
   active={'wemm-jev':27,'decision-king-v1.1':27,'saif-4b':4,'joey-1':2,'cribl-decision-2':4,'cribl-decision-2-mini':.8,'iota-decide-4b-v0.4':4,'sors-2b':2}[k]
   cls='dense' if active==27 else 'small';ts=min(100000,(317601 if cls=='dense' else 246100)/active)
   rate=1.5235*1e6/(3600*ts*.70);gc=1000*(tc+oc)*rate/1e6/1489;ga=1000*(tin+tout)*rate/1e6/1500
   v.update(active_b=active,architecture_class=cls,family='qwen',throughput=ts,gpu_common=gc,gpu_all=ga,cost_common=min(gc,v['estimate_common']),cost_all=min(ga,v['estimate_all']),cost_basis_kind='gpu-time-min')
   assert (gc<v['estimate_common'])==(ga<v['estimate_all']), 'common/all min branch differs'
   if gc<v['estimate_common']:en.update(price_in_per_m=rate,price_out_per_m=rate)
  else:v.update(cost_common=v['estimate_common'],cost_all=v['estimate_all'],cost_basis_kind='api-launch-list-I-1')
  # Only reviewed first-party accounting transformation; source sealed records remain unchanged.
  p=S/'runs'/f'{k}.jsonl';p.write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows));p.chmod(0o600);v['scoring_raw_sha256']=sha(p)
  reg[k]=en;entries[k]=spec;summ[k]=v
put(J/'receipts/EXCLUDED-ROWS.json',excluded);put(S/'REGISTRY.json',reg);put(J/'inputs/ENTRIES.json',{k:{'entry':v['entry'],'expect':v['expect']} for k,v in entries.items()});put(J/'inputs/ENTRY-PINS.json',pins);put(J/'src/usage.json',summ);put(J/'scoring/REGISTRY.json',reg)
print('PASS',len(reg),'entry/raw/expect bindings; EXCLUDED',list(excluded),'; common basis 1489; private scoring copies created')
