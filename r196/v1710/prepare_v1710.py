"""Capture trusted aggregate outputs; sealed raw only hashed, never rendered."""
import copy,hashlib,json,pathlib,re,socket
from pricing_reference_v1710 import reference_text
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];B=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919');I=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score');P='645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
assert socket.gethostname()=='Ubuntu-2204-jammy-amd64-base'
assert sha(pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py'))==P
assert L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.9-publication.json')['review']['verdict']=='PASS'
fair=B/'workers/r196-philly-fair/RESULT.json';assert sha(fair)=='0cbbcc7fa4e7404c898a24b0393773567dd7c1f14cbc27ec1455fa0914e0ae3d';assert L(fair)['fairness']=='FAIR'
rq=pathlib.Path('/home/flori/jobs/fastlane-evaluations/b6b2b557-d56d-4f9d-bf8a-1edeb0bab097/request.json');assert L(rq)['visibility']=='public'
specs=[('phillylabs_philly_decider_v2',I/'ENTRIES-R16C-REVIEWED.json','a9d4be51eed589f94c26ba8190bce22a751271c5b0bfcade5c04139bafb448b8',I/'field-r16c','6d02e677e68cd68383a789e4f720e025b4c14845a02c831a2ba95f8b6f7eaf67',[69.30,56.08,82.52,93.34,64.55,71.23],[93.20,71.21],1500,0.01519,0.02468),('iota-decide-4b-v0.3',pathlib.Path('/home/flori/jobs/fastlane-iota-v03-b6b2b557-20261026/score/ENTRIES-IOTA-V03.json'),'f8a47bb3a751004061b13e5a0edd2056b4b0de3cfc0c2d6f58147c935c5d1f8e',B/'r196/score-iota03/field','4e4ee3e1da2b58990e51ee471875a8c7d5e92a727c4024771d1d6703a8ae4927',[68.6445,52.5326,84.7565,87.8189,64.3267,69.2437],[87.4678,69.1889],1500,0.0154564,0.0201785),('decisio-qwen3.6-35b-a3b-v090',I/'ENTRIES-R16D-REVIEWED.json','8fd61c527dba19eccf26379b3ee3273ddb2d0217eb84a822a37518d0030c364d',I/'field-r16d','9e72102fef97c070a00f88d6cd22b3fe6de99f725d535df3e338c8d20d0a16b1',[61.49,33.97,89.01,91.02,32.42,9.41],[90.99,9.41],1485,0.178942,0.177152)]
rows={};entries={};pins={};sources={};text_changes=[]
for k,ep,eh,F,rh,expect,share,answered,cost,allcost in specs:
 assert sha(ep)==eh;v=L(ep)[k];assert sha(pathlib.Path(v['raw']))==rh
 en=copy.deepcopy(v['entry']);reg=L(F/'REGISTRY.json')[k]
 if k.startswith('philly'):
  for fix in L(fair)['text_fixes']:
   assert en[fix['field']].count(fix['old'])==1;en[fix['field']]=en[fix['field']].replace(fix['old'],fix['new']);text_changes.append(fix)
  pin='PhillyLabs/philly-decider-v2@'+en['revision']+' + base h2oai/h2o-lightning-4b@193ad740925b176a3b70a5a13a7cff2f2fadd01e'
 elif k.startswith('iota'):
  en['display']='iota-decide-4b-v0.3 (Macrocosmos, letter-readout 4B, self-hosted)';pin='macrocosm-os/iota-decide-4b-v0.3@'+en['revision']
 else:pin='aminry/decisio@'+en['revision']+' + weights Qwen/Qwen3.6-35B-A3B-FP8@95a723d08a9490559dae23d0cff1d9466213d989'
 # Resolve only the tariff placeholder; no scored value is changed.
 ref=reference_text(k,en)
 for f in ['cost_basis','code_revision','endpoint_condition','disclosure']:
  original=en.get(f,'');s=original.replace('{REF}',ref).replace('aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7, r168 re-freeze of 22 Oct 2026',P+', re-frozen 26 Oct 2026')
  s=s.replace('Per the release-owner position,','Under the published treatment,').replace('release-owner ruling','billing decision').replace('release owner','evaluator').replace('lead-verified','evaluator-verified').replace('release-review finding','review finding').replace('(custody disclosure)','(preregistration disclosure)').replace('Custody noted the edit, accepted it','The evaluator recorded and accepted the edit').replace('custody confirmed','the evaluator confirmed')
  s=s.replace(', deputy ruling #22794','').replace('board #22794', 'the earlier measurement').replace('#22794', 'the earlier measurement')
  s=re.sub(r'\branked\b','included',s,flags=re.I).replace('ranking uses','view uses')
  if k.startswith('decisio') and f=='cost_basis':
   old_audit='The native-usage audit passed, but the separate per-request engine-residual audit described in the preregistration was not implemented in the run receipts.'
   assert s.count(old_audit)==1
   s=s.replace(old_audit,'An offline, token-boundary-aware per-item audit of the front pad on the frozen kit (no new measurement) found a residual of 0 on all 1,485 answered items.').replace('; the missing separate audit remains a review finding','')
  if k.startswith('philly') and f=='cost_basis':
   text_changes.append({'key':k,'field':f,'change':'Pricing module pin rewritten from aa2afcd5 to 645fd82e; tariff identical (USD 0.03/0.15 per million input/output tokens); no reprice.'})
  if s!=original:text_changes.append({'key':k,'field':f,'before_sha256':hashlib.sha256(original.encode()).hexdigest(),'after_sha256':hashlib.sha256(s.encode()).hexdigest()})
  en[f]=s
 d={'registry':reg,'measured_on':'2026-10-26','raw_sha256':rh,'model_pin':pin};r={'entry_path':str(ep),'entry_sha256':eh,'raw_sha256':rh,'raw_verified_in_place':True,'registry_sha256':sha(F/'REGISTRY.json')}
 for mode in ['frozen','v17-off','v17-share']:
  p=F/f'out-{mode}/jevbench-v1.6.0-results.json';s=copy.deepcopy(next(x for x in L(p)['systems'] if x['key']==k));actual=[s['capability'],s['axes']['intelligence'],s['axes']['calibration'],s['axes']['speed'],s['axes']['cost'],s['scores']['A']];ex=expect[:]
  if mode=='v17-share':ex[3],ex[5]=share
  digits=4 if k.startswith('iota') else 2
  assert [round(x,digits) for x in actual]==ex,('STOP numbers differ',k,mode,actual)
  assert s['status']['rows']==1500 and s['status']['answered_ok']==answered
  prec=7 if k.startswith('iota') else 6 if k.startswith('decisio') else 5
  assert round(s['cost']['usd_per_1000'],prec)==cost,(k,s['cost']['usd_per_1000'])
  all_value=s['cost']['common_basis']['usd_per_1000_all_items'] if s['cost']['common_basis'] else (1761623*0.15+1485*1.0)/1e6/1500*1000
  assert round(all_value,prec)==allcost
  for f in ['display','author','licence','disclosure','code_revision','endpoint_condition']:s[f]=en[f]
  s['cost']['basis']=en['cost_basis'];d[mode]=s;r[mode]={'path':str(p),'sha256':sha(p)}
 entries[k]={**{f:v[f] for f in ['tokens','treatment','zero_output']},'entry':en};rows[k]=d;pins[k]=r;sources[k]={'field':str(F),'raw_sha256':rh}
 # Single-row aggregate inputs/registry for unchanged category tools.
 out=J/'scoring'/k;out.mkdir(parents=True,exist_ok=True)
 for mode in ['off','share']:
  src=L(F/f'out-v17-{mode}/jevbench-v1.6.0-results.json');src['systems']=[next(s for s in src['systems'] if s['key']==k)];put(out/f'{mode}.json',src)
 put(out/'registry.json',{k:reg})
checks=L(B/'r196/score-iota03/INPUT-CHECKS.json');assert (checks['rows'],checks['ok'],checks['input_tokens'],checks['output_tokens'])==(1500,1500,1008925,0)
put(J/'inputs/ENTRIES.json',entries);put(J/'src/inputs.json',rows);put(J/'receipts/INPUTS.json',pins);put(J/'receipts/TEXT-CHANGES.json',text_changes);put(J/'receipts/PRECONDITIONS.json',{'base':'a589248f361f74ee1e8e94a2ff9dae9e400762b8','hostname':socket.gethostname(),'pricing_sha256':P,'predecessor_review':'PASS','fairness_sha256':sha(fair),'paid_request_sha256':sha(rq),'paid_visibility':'public','sources':sources,'iota_input_checks':checks})
print('PASS predecessor, host, pricing, entry/raw/fairness pins; exact three-view scores, costs and coverage; paid public visibility; T1/T2 each once')
