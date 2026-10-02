import json,sys,hashlib,copy,importlib.util
from pathlib import Path
R=Path('/home/flori/wt/jevbench-v155-release-20261002'); J=Path('/home/flori/jobs/jevbench-add-requests-20260919/r39'); D=R/'data/raw/benchmarks/jevbench/v1.5'
hash=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source=json.load(open(J/'outputs/RESULTS-r39-A3-candidates-headlineA.json'))
spec=importlib.util.spec_from_file_location('convert','/home/flori/jobs/jevbench-v15-measure-20260925/site-preview/convert_v15.py'); C=importlib.util.module_from_spec(spec);spec.loader.exec_module(C)
a=json.load(open(D/'jevbench-v1.5.4-results.json'));a['revision']='v1.5.5';a['parent_release']={'revision':'v1.5.4','sha256':hash(D/'jevbench-v1.5.4-results.json')}
new=[]
for k,author,repo in [('clef','Cloudflare','Cloudflare/clef'),('clef-flash','Cloudflare','Cloudflare/clef-flash'),('lev','Interfaze','interfaze-ai/lev')]:
 p=source['pin_records'][k];raw=Path(p['raw']);assert hash(raw)==p['raw_sha256'];assert hash(J/'outputs/meta'/f'{k}.json')==source['meta_sha256'][k]['sha256'];assert sum(1 for l in raw.open() if l.strip())==1624
 s=copy.deepcopy(source['rows'][k]);s['addendum']='A6'
 hf=json.load(open(J/'receipts'/f'hf-{repo.replace("/","_")}.json'))
 row=C.project_row(k,s,{'author':author,'repo':f'https://huggingface.co/{repo}','class':'Jev-compatible decision model','licence':(hf.get('cardData') or {}).get('license','see model card'),'open':'open weights','underlying':p['base_model']})
 row.update(ranked=True,listing='ranked',ranks={},rank=None,last_measured_on='2026-10-02',model_pin=json.load(open(J/'outputs/meta'/f'{k}.json'))['model_string'])
 row['endpoint_condition']=json.load(open(J/'outputs/meta'/f'{k}.json'))['endpoint_condition']
 row['cost']['basis']+='; self-hosted estimate, not measured hosted billing'
 if k.startswith('clef'):
  m=s['cost']['m2'];cand=m['candidate_usd_per_1000'];base=m['usd_per_1000'];cost_axis=min(100,max(0,s['axes']['cost']+30*__import__('math').log10(base/cand)))
  row['alt']={'label':'Workers AI price scenario (latency unmeasured)','note':'Cloudflare standard launch input price; same self-hosted accuracy and adjusted H100 latency held fixed for this price-only scenario. No Workers AI latency was measured; this is not a hosted API result and does not set official Capability eligibility. Official self-hosted row uses the base-model reference price.','usd_per_1000':cand,'axes':dict(row['axes'],cost=cost_axis),'pricing_only':True}
 new.append(row)
a['systems'].extend(new);by={s['key']:s for s in a['systems']}
for o in ['A','B','C']:
 old=a['board'][o]['order'];pos={k:i for i,k in enumerate(old)}
 order=sorted([s['key'] for s in a['systems'] if s['listing']=='ranked'],key=lambda k:(-by[k]['scores'][o],pos.get(k,100000),k));assert old[:5]==order[:5]
 for i,k in enumerate(order):
  by[k]['ranks'][o]=i+1
  if o=='A':by[k]['rank']=i+1
 adj=set(zip(order,order[1:]));a['board'][o]['order']=order;a['board'][o]['markers']=[m for m in a['board'][o]['markers'] if (m['upper'],m['lower']) in adj]
a['n_ranked']=sum(s['listing']=='ranked' for s in a['systems']);a['roster_count']=len(a['systems'])+len(a['not_measured'])
a['addendum_sources_sha256']['A6_run39']=hash(J/'outputs/RESULTS-r39-A3-candidates-headlineA.json')
a['revision_note']='Clef, Clef Flash and Interfaze Lev join after complete 1,624-decision runs on our own H100. All existing scores, method and frozen G_med remain unchanged. Cloudflare hosted list prices are shown as price-only scenarios with self-hosted latency held fixed, not measured Workers AI results; official self-hosted rows retain the base-model price reference. Rene-1 remains held pending attribution.'
a['paired_comparison_note']='No new paired-bootstrap comparisons for A6. Prior markers remain only for still-adjacent pairs; missing markers imply neither tie nor separation.'
(D/'jevbench-v1.5.5-results.json').write_text(json.dumps(a,indent=2)+'\n')
print(json.dumps({k:by[k]['ranks'] for k in ['clef','clef-flash','lev']}))
