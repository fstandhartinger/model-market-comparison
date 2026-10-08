import json,sys,hashlib,collections,argparse
from pathlib import Path
H=Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness');sys.path.insert(0,str(H));import score_v15 as S
parser=argparse.ArgumentParser();parser.add_argument('--inventory',type=Path,required=True);parser.add_argument('--held-dir',type=Path,required=True);args=parser.parse_args();R=Path(__file__).resolve().parents[2]; D=R/'data/raw/benchmarks/jevbench/v1.5'; V=Path('/home/flori/jevbench-sealed/v1.5');SRC=Path('/home/flori/jobs/jevbench-add-requests-20260919')
parentb=(D/'jevbench-v1.5.7-results.json').read_bytes();parent=json.loads(parentb);hashb=lambda b:hashlib.sha256(b).hexdigest()
inventory=json.loads(args.inventory.read_text()); records={r['key']:r for r in inventory['rows'] if 'historical' in r['pool_compatibility'] and r['ranked_in_source'] and not r.get('alias_of_current_key') and r['key']!='exaone-4.0-1.2b-jev'}; keys=list(records)
labels=json.load(open(V/'radars-20261001/labels-final.json'));gold=S.load_gold(V/'frozen/all-1624.jsonl'); catbase=json.loads((D/'jevbench-v1.5.7-categories.json').read_text());out=[];report={};sources={}
for k in keys:
 rec=records[k];f=Path(rec['latest_scored_artifact_path']);run=int(f.parent.parent.name[1:]);d=json.loads(f.read_text());assert d['G_med_frozen']==parent['G_med'] and d['base_results_sha256']==parent['base_results_sha256'];r=d['rows'][k];raw=Path(rec['raw_path']);rs=[json.loads(l) for l in raw.open() if l.strip()];by={r.get('task_id') or r.get('id'):r for r in rs};assert len(by)==1624
 scored=[(g,S.score_item(g,by.get(oid),False)) for oid,g in gold.items()];comp=S.competence(scored,r['support']);n=0
 for cell,v in r['per_type_split'].items():
  split,typ=cell.split('|');mine=comp['per'][(split,typ)]
  for tier,x in v['tiers'].items():assert (x is None and mine['tiers'][tier] is None) or (x is not None and abs(x-mine['tiers'][tier])<1e-6),(k,cell,tier);assert v['n'][tier]==mine['n'][tier];n+=1
 cats={}
 for dim in ['topics','usecases']:
  groups=collections.defaultdict(list)
  for oid,g in gold.items():
   sc=S.score_item(g,by.get(oid),False)
   for c in ([labels[oid]['topic']] if dim=='topics' else labels[oid]['usecases']):groups[c].append((g,sc))
  def cc(v):
   types=collections.defaultdict(list)
   for g,sc in v:types[g.type].append((g,sc))
   return sum(len(vv)*S.cc_cell(vv) for vv in types.values())/len(v)
  cats[dim]={c:{'n':len(v),'competence':round(cc(v),2)} for c,v in groups.items()}
 entry=d['registry_entries'][k];row={'key':k,'name':r['display'],'axes':r['axes'],'scores':r['scores'],'capability':(r['axes']['intelligence']+r['axes']['calibration'])/2,'cost_usd_per_1000':r['cost']['usd_per_1000'],'cost_kind':'estimate','cost_basis':r['cost']['basis'],'latency':r['latency'],'status':r['status'],'categories':cats,'base_model':entry.get('base_model'),'source':{'measurement_run':run,'scorer_sha256':hashb(f.read_bytes()),'raw_sha256':hashb(raw.read_bytes())}}
 if k in ['xor-26b-a4b-nvfp4','wald-q4b-v11']:
  held='XOR' if k.startswith('xor-') else 'WALD'
  (args.held_dir/('HISTORICAL-'+held+'-HELD.json')).write_text(json.dumps(row,indent=2)+'\n')
 else:out.append(row)
 report[k]={'verified_per_type_tier_cells':n,'raw_sha256':row['source']['raw_sha256']};sources[str(run)]=row['source']['scorer_sha256']
# Immutable historical top-five check: adding these rows must not change any A/B/C order.
ranked=[r for r in parent['systems'] if r.get('ranked') and r.get('scores',{}).get('A') is not None]
check={}
for opt in 'ABC':
 old=parent['board'][opt]['order'][:5];combined=sorted(ranked+out,key=lambda r:(-r['scores'][opt],r['key']));new=[r['key'] for r in combined[:5]];assert old==new,(opt,old,new);check[opt]={'before':old,'after':new}
artifact={'schema_version':1,'benchmark':'JevBench','revision':'v1.5-supplement','published_on':'2026-10-08','measurement_basis':'Historical v1.5 pool: 1,624 decisions per model; scored with the frozen headline-A method and original G_med. These results are independent of v1.6.1 and do not enter its rankings.','parent':{'revision':'v1.5.7','sha256':hashb(parentb)},'G_med':parent['G_med'],'sample':parent['sample'],'category_method':catbase['metric'],'category_min_n':catbase['min_n'],'category_dimensions':catbase['dimensions'] if 'dimensions' in catbase else {k:catbase[k] for k in ['topics','usecases'] if k in catbase},'sources_sha256':sources,'systems':sorted(out,key=lambda r:-r['scores']['A']),'ranking_gate':check}
(D/'jevbench-v1.5-supplement.json').write_text(json.dumps(artifact,indent=2)+'\n');(R/'ops/jevbench-history-cr337/VERIFICATION.json').write_text(json.dumps({'rows':report,'topfive':check,'parent_sha256':artifact['parent']['sha256']},indent=2)+'\n');print('built',len(out),'systems; category cells verified, historic topfive unchanged');print('category metadata',catbase.keys());print('latency schema',out[0]['latency'])
