"""CR-283 (combined): topic and use-case aggregates for the six fast-lane rows, same method as categories.py.
Run after categories.py and build_fastlane.py. Verifies all 24 split/type/tier cells per row before writing."""
import json,sys,hashlib,collections
from pathlib import Path
H=Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness');sys.path.insert(0,str(H));import score_v15 as S
R=Path(__file__).resolve().parents[2];D=R/'data/raw/benchmarks/jevbench/v1.5';V=Path('/home/flori/jevbench-sealed/v1.5');F=Path('/home/flori/jobs/fastlane-sla-20261004/results')
a=json.load(open(D/'jevbench-v1.5.8-results.json'));cat=json.load(open(D/'jevbench-v1.5.8-categories.json'));prior=json.loads(json.dumps(cat['systems']))
labels=json.load(open(V/'radars-20261001/labels-final.json'));gold=S.load_gold(V/'frozen/all-1624.jsonl')
SRC={'torchcast-decision-12b':F/'torchcast/raw.jsonl',**{'quyet-1-0-'+n.lower():F/f'quyet/Quyet-1.0-{n}/raw.jsonl' for n in ['Large','Medium','Small','Small-EN','Tiny']}}
report=json.load(open(Path(__file__).parent/'CATEGORY-VERIFICATION.json'))
for k,raw in SRC.items():
 assert k not in cat['systems'],k
 row=next(s for s in a['systems'] if s['key']==k);assert hashlib.sha256(raw.read_bytes()).hexdigest()==row['provenance']['raw_sha256']
 by={r['task_id']:r for r in (json.loads(l) for l in raw.open() if l.strip())};assert len(by)==1624
 scored=[(g,S.score_item(g,by.get(oid),False)) for oid,g in gold.items()];comp=S.competence(scored,row['support'])
 assert sum(len(v['tiers']) for v in row['intelligence']['per_type_split'].values())==24
 for cell,v in row['intelligence']['per_type_split'].items():
  split,typ=cell.split('|');mine=comp['per'][(split,typ)]
  for tier,x in v['tiers'].items():assert abs(x-mine['tiers'][tier])<1e-6 and v['n'][tier]==mine['n'][tier],(k,cell,tier)
 out={}
 for dim in ['topics','usecases']:
  groups=collections.defaultdict(list)
  for oid,g in gold.items():
   sc=S.score_item(g,by.get(oid),False)
   for c in ([labels[oid]['topic']] if dim=='topics' else labels[oid]['usecases']):groups[c].append((g,sc))
  def cc(v):
   types=collections.defaultdict(list)
   for g,sc in v:types[g.type].append((g,sc))
   return sum(len(vv)*S.cc_cell(vv) for vv in types.values())/len(v)
  out[dim]={c:{'n':len(v),'competence':round(cc(v),2)} for c,v in groups.items()}
 cat['systems'][k]=out;report[k]={'verified_per_type_cells':24,'raw_sha256':row['provenance']['raw_sha256']}
assert all(cat['systems'][k]==v for k,v in prior.items())
cat['source_results_sha256']=hashlib.sha256((D/'jevbench-v1.5.8-results.json').read_bytes()).hexdigest()
(D/'jevbench-v1.5.8-categories.json').write_text(json.dumps(cat,indent=1)+'\n');(Path(__file__).parent/'CATEGORY-VERIFICATION.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in SRC}))
