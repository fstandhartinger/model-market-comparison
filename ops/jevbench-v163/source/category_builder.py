#!/usr/bin/env python3
"""ROOT-only fresh category aggregates. No inference, network, or publication."""
import collections,hashlib,json,math,os,sys
from pathlib import Path
sys.dont_write_bytecode=True
os.environ['PYTHONDONTWRITEBYTECODE']='1'
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from cohort import completed_shape
def digest(b):return hashlib.sha256(b).hexdigest()
def read(p,pin,cap=30000000):
 p=Path(p)
 if p.is_symlink()or not p.is_file()or p.stat().st_size>cap:raise ValueError('file boundary')
 b=p.read_bytes()
 if len(b)>cap or digest(b)!=pin:raise ValueError('file pin')
 return b

def labels_join(transform,raw,ruled,gold_rows):
 transform.validate_labels(raw,gold_rows)
 if transform.apply_rules(raw,gold_rows)!=ruled:raise ValueError('frozen rule/probability preservation')
 result={'topic':{},'usecase':{}}
 for r in ruled:
  oid,q=r['id'].rsplit('::',1)
  if oid in result[q]:raise ValueError('duplicate label')
  result[q][oid]=r['choice']
 if any(set(v)!={g['opaque_id']for g in gold_rows}for v in result.values()):raise ValueError('label join')
 return result

def aggregate(V,transform,taxonomy,public,gold_rows,raws,registry,raw_labels,ruled):
 gold=V.load_gold_rows(gold_rows)
 if len(gold)!=1500 or collections.Counter(g.split for g in gold.values())!={'sealed':1200,'open':300}:raise ValueError('full draw')
 keys=set(registry)
 if keys!=set(raws)or keys!={r['key']for r in public['systems']}:raise ValueError('completed cohort')
 completed_shape(keys)
 for rows in raws.values():
  ids=[r.get('task_id')or r.get('id')for r in rows]
  if len(rows)!=1500 or len(set(ids))!=1500 or set(ids)!=set(gold)or any(r.get('cost_estimate')for r in rows):raise ValueError('exact native raw join')
 labels=labels_join(transform,raw_labels,ruled,gold_rows)
 systems,status=V.build_systems(gold,registry,raws)
 if set(systems)!=keys or any(s['status']!='complete'or s['rows']!=1500 or s['missing']!=0 for s in status.values()):raise ValueError('actual full coverage')
 names={'topics':{k:(l,c)for k,l,c in taxonomy.TOPICS},'usecases':{k:(l,c)for k,l,c in taxonomy.USE_CASES}}
 groups={d:collections.defaultdict(list)for d in ('topics','usecases','languages','families','types')}
 for oid,g in gold.items():
  for d,k in (('topics',labels['topic'][oid]),('usecases',labels['usecase'][oid]),('languages',g.lang),('families',g.family),('types',g.type)):
   if not isinstance(k,str)or not k:raise ValueError('missing authoring category')
   groups[d][k].append(oid)
 art={'benchmark':'JevBench','revision':'v1.6.3','kind':'category-aggregates','provisional':False,'min_n':1,'systems':{},'lanes':{k:'selfhosted'for k in sorted(keys)},'lane_note':'All completed measurements cover the same fresh 1,500-item draw (1,200 sealed and 300 public); pending candidates are outside this completed category artifact.',
 'metric':'O1S chance-corrected competence: equal mean over request types present, clipped to 0–100, using the pinned official group_stats function. Recorded failures remain in the denominator. Category scores are descriptive and do not alter headline Intelligence, Calibration, composite score or G_med.',
 'labelling':'Subject topics and TypeSafe use cases use the actual shared local reference labels, with frozen T1/T2/T3/U1/U2 authoring rules. The original probabilities and model choice remain preserved in protected custody. The genuine 75-public-item handcheck is required. Family, type and language are frozen authoring metadata; non-English machine-authored items are not native-reviewed.',
 'rules':['Every nonempty category has a measured cell; zero-count taxonomy categories have no cell.','Categories below 30 items are indicative only; radar display retains its 30-item minimum.','No historic overlays, estimated cells, outcome exclusions or private item-level data are included.']}
 for d,gs in groups.items():
  descriptors=[]
  for k,ids in sorted(gs.items()):
   label,covers=names.get(d,{}).get(k,(k.replace('_',' ').capitalize(),'Frozen '+d+' authoring category'))
   n=len(ids);op=sum(gold[i].split=='open'for i in ids)
   descriptors.append(dict(key=k,label=label,covers=covers,n=n,open=op,sealed=n-op,low_n=n<30))
  # Full public taxonomy includes real zero-count categories, never fake cells.
  for k,(label,covers)in names.get(d,{}).items():
   if k not in gs:descriptors.append(dict(key=k,label=label,covers=covers,n=0,open=0,sealed=0,low_n=True))
  art[d]=sorted(descriptors,key=lambda x:(-x['n'],x['key']))
 for key,s in systems.items():
  published=next(r for r in public['systems']if r['key']==key)
  if published.get('status')!=status[key]:raise ValueError('actual completion/error status reproduction')
  answered={r.get('task_id')or r.get('id') for r in raws[key]if r.get('ok',True)and not r.get('error')}
  if len(answered)!=status[key]['answered_ok']:raise ValueError('actual answered join')
  scored={g.oid:(g,x)for g,x in s.scored}
  if len(scored)!=1500 or set(scored)!=set(gold):raise ValueError('scored denominator')
  cells={}
  for d,gs in groups.items():
   cells[d]={}
   for k,ids in gs.items():
    st=V.group_stats([scored[i]for i in ids]);v=st['score']
    if st['n']!=len(ids)or isinstance(v,bool)or not isinstance(v,(float,int))or not math.isfinite(v):raise ValueError('genuine category cell')
    cells[d][k]={'n':len(ids),'competence':round(float(v),2),'coverage_n':sum(i in answered for i in ids)}
    if d in ('families','languages','types'):
     source={'families':'family','languages':'lang','types':'type'}[d]
     original=next(r for r in public['systems']if r['key']==key)['v16']['breakdowns'][source][k]
     if original['n']!=len(ids)or original['score']!=v:raise ValueError('official stored breakdown reproduction')
  art['systems'][key]=cells
 return art

def main():
 try:
  c=json.loads((HERE/'CATEGORY-CONTRACT.json').read_text());cs=digest((HERE/'CATEGORY-CONTRACT.json').read_bytes());ss=digest(Path(__file__).read_bytes())
  if digest((HERE/'cohort.py').read_bytes())!=c['cohort_source_sha256']:raise ValueError('cohort source pin')
  peer=json.loads(Path(sys.argv[1]).read_text());root=json.loads(Path(sys.argv[2]).read_text())
  if peer!={'schema_version':1,'verdict':'ACCEPTED_SOURCE_CATEGORY_AGGREGATOR','reviewer_engine':'claude','source_sha256':ss,'contract_sha256':cs,'scope':'fixed_six_completed_addendum_full1500_official_categories_no_publication'}:raise ValueError('source peer')
  if root.get('owner')!='fastlane-v16-finish-20261009'or root.get('source_sha256')!=ss or root.get('contract_sha256')!=cs or root.get('scope')!='BUILD_ACTUAL_COMPLETED_CATEGORIES'or root.get('public_handcheck_count')!=75 or root.get('public_handcheck_verdict')!='PASS':raise ValueError('root handcheck/authority')
  for p in c['source_files'].values():read(p['path'],p['sha256'],500000)
  sys.path[:0]=['/score','/label'];os.environ['JEV_NOUL_METHOD']='O1S'
  import score_v16 as V
  import protected_transform as T
  import taxonomy
  public=json.loads(read('/custody/public-results.json',c['public_results_sha256']))
  if public['revision']!='v1.6.3'or public['source_sha256']!=c['source_results_sha256']or public['G_med']!=c['G_med']or public['not_measured']!=[]or public['v16']['draw_release']!=c['draw_release']:raise ValueError('adopted result binding')
  rows=lambda b:[json.loads(x)for x in b.splitlines()if x.strip()]
  gold=rows(read('/custody/gold.jsonl',c['gold_sha256']))
  for k in ('raw_labels_sha256','ruled_labels_sha256','validation_sha256','handcheck_receipt_sha256'):
   if not isinstance(root.get(k),str)or len(root[k])!=64:raise ValueError('actual label proof pin')
  raw=rows(read('/custody/raw-labels.jsonl',root['raw_labels_sha256']));ruled=rows(read('/custody/ruled-labels.jsonl',root['ruled_labels_sha256']))
  validation=json.loads(read('/custody/validation.json',root['validation_sha256'],200000));hand=json.loads(read('/custody/handcheck.json',root['handcheck_receipt_sha256'],200000))
  if validation.get('valid')!=3000 or validation.get('raw_sha256')!=root['raw_labels_sha256']or validation.get('ruled_sha256')!=root['ruled_labels_sha256']:raise ValueError('genuine validation')
  if hand!={'owner':'fastlane-v16-finish-20261009','verdict':'PASS','public_items_checked':75,'raw_labels_sha256':root['raw_labels_sha256'],'ruled_labels_sha256':root['ruled_labels_sha256'],'input_sha256':c['input_sha256'],'gold_sha256':c['gold_sha256'],'only_public_items':True}:raise ValueError('genuine public handcheck')
  raws={r['key']:rows(read('/custody/'+r['key']+'.jsonl',r['raw_sha256']))for r in c['completed']}
  registry={r['key']:r['system']for r in c['completed']}
  art=aggregate(V,T,taxonomy,public,gold,raws,registry,raw,ruled)
  art.update(results_sha256=c['public_results_sha256'],source_results_sha256=c['source_results_sha256'],draw_release=c['draw_release'],labels_sha256=root['ruled_labels_sha256'],G_med=c['G_med'])
  out=Path('/output/categories.json')
  with os.fdopen(os.open(out,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600),'w')as f:json.dump(art,f,sort_keys=True,allow_nan=False);f.write('\n')
  print('ACTUAL_CATEGORIES_PROTECTED_OUTPUT_READY');return 0
 except Exception:
  print('CATEGORY_AGGREGATOR_HELD',file=sys.stderr);return 2
if __name__=='__main__':raise SystemExit(main())
