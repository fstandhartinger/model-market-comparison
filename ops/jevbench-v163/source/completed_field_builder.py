#!/usr/bin/env python3
"""ROOT-only official full1500 completed-field baseline and score builder."""
import hashlib,importlib.util,json,math,os,stat,sys
from pathlib import Path
sys.dont_write_bytecode=True
os.environ['PYTHONDONTWRITEBYTECODE']='1'
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from cohort import FIXED, completed_shape, disposition
def sha(b):return hashlib.sha256(b).hexdigest()
def bounded(p,cap):
 p=Path(p)
 for x in(*reversed(p.absolute().parents),p.absolute()):
  mode=x.lstat().st_mode
  if not(stat.S_ISREG(mode)if x==p.absolute()else stat.S_ISDIR(mode)):raise ValueError('custody path')
 if p.stat().st_size>cap:raise ValueError('cap')
 b=p.read_bytes()
 if len(b)>cap:raise ValueError('changed cap')
 return b
def prepare(roster,prereg,gold,raws,cost):
 ids={r['order_id']for r in prereg['mandatory_candidates']}
 if len(ids)!=6 or len(roster)!=6 or {r['order_id']for r in roster}!=ids:raise ValueError('fixed six roster')
 if len(gold)!=1500 or sum(g.split=='sealed'for g in gold.values())!=1200 or sum(g.split=='open'for g in gold.values())!=300:raise ValueError('full draw')
 excluded=cost.get('exclude_opaque_ids')
 if cost.get('phase')!='accepted_common_cost_basis' or cost.get('final_cost_basis_accepted')is not True or not isinstance(excluded,list) or len(excluded)>=150 or len(set(excluded))!=len(excluded)or not set(excluded)<=set(gold):raise ValueError('adopted cost basis')
 if {r['key'] for r in roster} != FIXED:raise ValueError('frozen six public keys')
 completed_shape({r['key'] for r in roster if r['status']=='complete'})
 registry={};eligible=[];pending=[]
 for r in roster:
  if r['status']!='complete':
   if r['status']not in('pending','HOLD','not_measured','runtime_preflight_hold','fresh_measurement_pending')or not isinstance(r.get('reason'),str)or not r['reason']or r['key']in raws:raise ValueError('pending status')
   pending.append(dict(order_id=r['order_id'],key=r['key'],name=r['name'],status=r['status'],reason=r['reason']));continue
  if r['disposition'] != disposition(r['key']):raise ValueError('frozen source disposition')
  rows=raws.get(r['key']);m=dict(r['system'])
  if m.get('endpoint_kind')!='gpu'or m.get('lane')!='selfhosted'or m.get('ranked')is not(r['disposition']=='native_nonwrapper')or not all(m['support'].get(t)in('native','confidence','label')for t in('choice','noul','score')):raise ValueError('native source disposition')
  if not isinstance(rows,list)or len(rows)!=1500:raise ValueError('raw coverage')
  seen=[x.get('task_id')or x.get('id')for x in rows]
  if len(set(seen))!=1500 or set(seen)!=set(gold):raise ValueError('raw draw join')
  for x in rows:
   if x.get('ok',True)and not x.get('error'):
    for n in('input_tokens','output_tokens'):
     v=(x.get('usage')or{}).get(n)
     if isinstance(v,bool)or not isinstance(v,(int,float))or not math.isfinite(v)or v<0:raise ValueError('actual native usage required')
   if x.get('cost_estimate'):raise ValueError('no fallback estimate')
  for n in('price_in_per_m','price_out_per_m'):
   v=m.get(n)
   if isinstance(v,bool)or not isinstance(v,(int,float))or not math.isfinite(v)or v<0:raise ValueError('frozen prices')
  m['cost_kind']=m['price_kind'];registry[r['key']]=m
  if r['disposition']=='native_nonwrapper':eligible.append(r['key'])
  elif r['disposition']!='wrapper_unranked':raise ValueError('unknown disposition')
 if set(raws)!=set(registry)or len(set(eligible))<3:raise ValueError('minimum THREE complete whole eligible field')
 return registry,sorted(eligible),pending
def score(official,prereg,roster,gold,raws,cost):
 registry,eligible,pending=prepare(roster,prereg,gold,raws,cost)
 official.COST_BASIS=dict(exclude=set(cost['exclude_opaque_ids']),rule=cost['rule'],reference=cost['reference'])
 result=official.score_release(gold,registry,raws,B=1000,seed=16,workers=1)
 result['revision']='v1.6.3';gm=result.get('G_med')
 if isinstance(gm,bool)or not isinstance(gm,(int,float))or not math.isfinite(gm):raise ValueError('finite baseline')
 if len(result['systems'])!=len(registry):raise ValueError('result join')
 for row in result['systems']:
  if row['key']not in registry or row['status']['status']!='complete'or not row['full_coverage']or row['v16']['n_items']!=1500 or row['v16']['n_sealed_side']!=1200 or row['v16']['n_public']!=300 or row['cost']['common_basis']['n_items']!=1500-len(cost['exclude_opaque_ids']):raise ValueError('complete actual result')
  if not registry[row['key']]['ranked']and row['ranked']:raise ValueError('wrapper rank')
 baseline=dict(method='jevbench-v16',phase='completed_cohort',protocol='jevbench::v1.6',count=1500,B=1000,bootstrap_seed=16,noul_method='O1S',G_med=gm,eligible_complete_field=eligible,field_size=len(eligible),minimum_complete_field=3,all_intelligence_calibration_rows=1500,fixed_roster=roster,pending_roster=pending,whole_eligible_field_no_outcome_exclusion=True,historical_rows_in_field=False,cost_normalizer_usd_per_1000=0.001,cost_per_decade=30,later_completion_rule='Retain all six fixed candidates/statuses; a genuinely completed eligible member requires an addendum recomputing the whole eligible field and all completed scores. No outcome-based drops.')
 return baseline,result
def write_new(p,v):
 with os.fdopen(os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600),'w')as f:json.dump(v,f,sort_keys=True,allow_nan=False);f.write('\n')
def main():
 try:
  if len(sys.argv)!=3:raise ValueError('approvals')
  cr=bounded(HERE/'COMPLETED-FIELD-CONTRACT.json',200000);c=json.loads(cr);ss=sha(bounded(__file__,100000));cs=sha(cr)
  peer=json.loads(bounded(sys.argv[1],10000));root=json.loads(bounded(sys.argv[2],10000))
  if sha(bounded(HERE/'cohort.py',100000))!=c['cohort_source_sha256']:raise ValueError('cohort source pin')
  if peer!={'schema_version':1,'verdict':'ACCEPTED_SOURCE_COMPLETED_FIELD_BUILDER','reviewer_engine':'claude','source_sha256':ss,'contract_sha256':cs,'scope':'whole_fixed_roster_minTHREE_complete_official_Gmed_all1500_O1S'}:raise ValueError('peer')
  if not isinstance(root.get('cost_basis_sha256'),str)or len(root['cost_basis_sha256'])!=64:raise ValueError('root cost pin')
  if root!={'cost_basis_sha256':root['cost_basis_sha256'],'schema_version':1,'owner':'fastlane-v16-finish-20261009','scope':'BUILD_COMPLETED_FIELD_OFFICIAL_BASELINE_AND_SCORES','source_sha256':ss,'contract_sha256':cs,'per_file_kernel_no_network_sandbox':True,'all1500_scored':True,'no_outcome_field_exclusions':True}:raise ValueError('root')
  for pin in c['source_files'].values():
   if sha(bounded(pin['path'],500000))!=pin['sha256']:raise ValueError('source hash')
  pr=bounded(Path(c['preregistration_host']),100000)
  if sha(pr)!=c['preregistration_sha256']:raise ValueError('preregistration')
  os.environ['JEV_NOUL_METHOD']='O1S';sys.path.insert(0,c['scorer_directory'])
  import score_v16 as official
  if official.S.COST_BEST_USD!=0.001 or official.S.COST_PER_DECADE!=30:raise ValueError('frozen C0')
  gr=bounded('/custody/gold.jsonl',20*1024*1024)
  if sha(gr)!=c['gold_sha256']:raise ValueError('gold pin')
  gold=official.load_gold_rows([json.loads(x)for x in gr.splitlines()])
  costraw=bounded('/custody/cost-basis.json',100000)
  if sha(costraw)!=root['cost_basis_sha256']:raise ValueError('cost pin')
  cost=json.loads(costraw)
  if any(cost.get(k)!=v for k,v in c['cost_producer_binding'].items()):raise ValueError('cost producer binding')
  raws={}
  for r in c['roster']:
   if r['status']=='complete':
    raw=bounded('/custody/'+r['key']+'.jsonl',30*1024*1024)
    if sha(raw)!=r['raw_sha256']:raise ValueError('raw pin')
    raws[r['key']]=[json.loads(x)for x in raw.splitlines()]
  baseline,result=score(official,json.loads(pr),c['roster'],gold,raws,json.loads(costraw))
  baseline.update(source_sha256=ss,contract_sha256=cs,input_sha256=c['input_sha256'],gold_sha256=c['gold_sha256'],cost_basis_sha256=root['cost_basis_sha256'],preregistration_sha256=c['preregistration_sha256'])
  result.update(actual_completed_field_baseline=baseline)
  out=Path('/output')
  if not stat.S_ISDIR(out.lstat().st_mode)or stat.S_IMODE(out.stat().st_mode)!=0o700 or any(out.iterdir()):raise ValueError('output')
  write_new(out/'baseline.json',baseline);write_new(out/'completed-native-official-results.json',result)
  print('COMPLETED_FIELD_OFFICIAL_RESULTS_PROTECTED_OUTPUT_ONLY');return 0
 except Exception:
  print('COMPLETED_FIELD_BUILDER_HELD',file=sys.stderr);return 2
if __name__=='__main__':raise SystemExit(main())
