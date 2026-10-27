"""Frozen v1.7 cost/composite path on existing raws; aggregate engine recount replaces only cost.
Bootstrap fixes speed and cost (score_v16._boot); per-item token allocation never enters its resampling.
Original raw and gold are read in place and never copied or rendered.
"""
import os,sys,pathlib,json,hashlib,copy
os.environ['JEV_NOUL_METHOD']='O1S'
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
sys.path.insert(0,'/home/flori/jobs/jevbench-add-requests-20260919/r160/scorer')
import score_v17 as S
L=lambda p:json.loads(p.read_text());put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert S._sha(S.HARNESS/'score_v16.py')==S.FROZEN_SHA
entries=L(J/'inputs/ENTRIES.json');pins=L(J/'receipts/INPUTS.json');old={s['key']:s for s in L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.10-results.json')['systems']}
inputs={};checks={}
orig=S.V.build_systems
ACTIVE=None
ENGINE=False
def build(*args,**kwargs):
 systems,status=orig(*args,**kwargs)
 for k,s in systems.items():
  e=entries[k];p=pins[k]
  assert status[k]['rows']==1500 and status[k]['answered_ok']==e['common_n']
  # Native total is checked independently from the existing usage before applying the accepted recount.
  s.usd_per_1000=e['common_cost'] if ENGINE else old[k]['cost']['usd_per_1000']
  s.meta['_cost_basis']={'rule':'common','n_items':e['common_n'],'usd_per_1000_all_items':e['all_cost'] if ENGINE else old[k]['cost']['common_basis']['usd_per_1000_all_items']}
 return systems,status
S.V.build_systems=build
for k,e in entries.items():
 raw=pathlib.Path(e['raw']);assert sha(raw)==pins[k]['raw_sha256'];rows=S.V.read_rows(raw)
 ok=[r for r in rows if r.get('ok',True) and not r.get('error')]
 assert sum(r['usage']['input_tokens'] for r in ok)==pins[k]['native_input']
 assert sum(r['usage']['output_tokens'] for r in ok)==e['output']
 gold=S.V.load_gold(pathlib.Path(e['release_dir'])/'frozen/gold.jsonl')
 inputs[k]={};checks[k]={}
 for mode in ['off','share']:
  S.CONFIG.update(limit=10 if mode=='share' else None,treatment='share' if mode=='share' else None);S.STATS.clear();ENGINE=False
  args=dict(B=0,seed=e['seed'],workers=1,g_med_fixed=e['g_med'])
  base=S.score_release(gold,{k:e['entry']},{k:rows},**args)['systems'][0]
  if mode=='share':
   for f in ['intelligence','calibration','speed','capability','decision_limit','status','support','validity','axes','scores','views','jevbench_score']:
    assert base[f]==old[k][f],f'{k}: native score does not reproduce live {f}'
  ENGINE=True;S.STATS.clear();args['B']=1000
  new=S.score_release(gold,{k:e['entry']},{k:rows},**args)['systems'][0]
  for f in ['intelligence','calibration','speed','capability','status','support','validity']:
   assert base[f]==new[f],f'{k}: cost correction changed {f}'
  for f in ['intelligence','calibration','speed']:assert base['axes'][f]==new['axes'][f]
  put(J/f'scoring/{k}-{mode}.json',new)
  inputs[k]['v17-'+mode]=new
  if mode=='off':inputs[k]['frozen']=new
  checks[k][mode]={'noncost_equal':True,'native_reproduces_live':mode=='share','B':1000,'seed':e['seed'],'raw_sha256':sha(raw),'common_cost':new['cost']['usd_per_1000'],'cost_axis':new['axes']['cost']}
  print('PASS',k,mode,'cost',new['cost']['usd_per_1000'],flush=True)
put(J/'src/inputs.json',inputs);put(J/'receipts/SCORING.json',{'status':'PASS','method':'frozen v1.7; native live reproduction; aggregate cost replacement before fixed-cost bootstrap; no item mutation','rows':checks})
