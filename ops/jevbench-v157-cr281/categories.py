import json,sys,hashlib,collections
from pathlib import Path
H=Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness');sys.path.insert(0,str(H));import score_v15 as S
R=Path(__file__).resolve().parents[2];D=R/'data/raw/benchmarks/jevbench/v1.5';V=Path('/home/flori/jevbench-sealed/v1.5')
a=json.load(open(D/'jevbench-v1.5.7-results.json'));cat=json.load(open(D/'jevbench-v1.5.6-categories.json'));labels=json.load(open(V/'radars-20261001/labels-final.json'));gold=S.load_gold(V/'frozen/all-1624.jsonl')
report={}
for k,raw in [('open-jev-zefan-27b-v1.1', V/'runs/gpu/addreq-r45/open-jev-zefan-27b-v1.1-1624.jsonl')]:
 row=next(s for s in a['systems'] if s['key']==k);assert hashlib.sha256(raw.read_bytes()).hexdigest()==row['provenance']['raw_sha256'];rs=[json.loads(l) for l in raw.open() if l.strip()];by={r.get('task_id') or r.get('id'):r for r in rs};assert len(by)==1624
 scored=[(g,S.score_item(g,by.get(oid),False)) for oid,g in gold.items()];comp=S.competence(scored,row['support'])
 assert sum(len(v['tiers']) for v in row['intelligence']['per_type_split'].values()) == 24
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
 cat['systems'][k]=out;report[k]={'verified_per_type_cells':24,'raw_sha256':hashlib.sha256(raw.read_bytes()).hexdigest()}
prior=json.load(open(D/'jevbench-v1.5.6-categories.json'))
assert all(cat['systems'][k] == v for k,v in prior['systems'].items())
cat.update(revision='v1.5.7',built_utc='2026-10-03',source_results_sha256=hashlib.sha256((D/'jevbench-v1.5.7-results.json').read_bytes()).hexdigest())
(D/'jevbench-v1.5.7-categories.json').write_text(json.dumps(cat,indent=1)+'\n');(Path(__file__).parent/'CATEGORY-VERIFICATION.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
