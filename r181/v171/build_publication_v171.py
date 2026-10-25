import os
"""Same-draw addendum. Carries every predecessor value and CI; only placements move."""
import pathlib,json,hashlib,copy,re,shutil
J=pathlib.Path(__file__).resolve().parent
W=pathlib.Path(os.environ.get('WT',str(J.parents[1])));V=W/'data/raw/benchmarks/jevbench/v1.7'
REV='v1.7.1';PREV='v1.7.0'
L=lambda p:json.loads(pathlib.Path(p).read_text())
put=lambda p,d:pathlib.Path(p).write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
cp=copy.deepcopy
old={n:L(V/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','carry','proof','publication']}
assert old['publication']['review']['verdict']=='PASS'
inputs=L(J/'src/inputs.json');texts=L(J/'src/public-text.json');cells=L(J/'src/cells.json')
res=cp(old['results']);out={s['key']:s for s in res['systems']};prev=cp(out)
new={};spec={}
for k,d in inputs.items():
 assert k not in out
 s=cp(d['v17-share']);e=d['entry'];f=d['frozen'];off=d['v17-off']
 for field in ['axes','scores','views','composite_ci95','intelligence','calibration','validity','cost','status','support']:
  assert f[field]==off[field],(k,field)
 assert s['v16']['ci95']['B']==1000 and s['v16']['ci95']['composite']==s['composite_ci95']
 assert s['cost']==off['cost'] and s['decision_limit']['n_over_limit']==0
 s.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on=d['measured_on'],measurement_date_status='measured',repo=e['repo'],model_pin=e['repo'].replace('https://huggingface.co/','')+'@'+e['revision'],paid_fast_lane=False)
 for field in ['author','licence']:s[field]=e[field]
 s.update(underlying=texts[k]['underlying'],endpoint_condition=texts[k]['endpoint_condition'])
 s['cost']['basis']=texts[k]['cost_basis']+f" Cost on the common basis: USD {s['cost']['usd_per_1000']:.12f} per 1000 decisions; official cap USD 0.06459465517241379."
 s['noul_decisive']={f:cells[k]['noul_share'][f] for f in ['acc_among_decisive','decisive','decisive_rate','n','supported','valid']}
 sib=next(s for s in prev.values() if s.get('draw',{}).get('id')=='v1.6-regular-20261012')
 s['draw']={**cp(sib['draw']),'release':REV,'measured_on':d['measured_on'],'results_sha256':L(J/'receipts/INPUTS.json')[k]['v17-share']['sha256']}
 assert s['draw']['g_med']==s['v16']['g_med_used']
 # Retain the field scorer's ranked_over_cap treatment without inventing a cap exception.
 assert s['ranked'] and (s['cost']['usd_per_1000']>0.06459465517241379)==(k=='turion-jev-31b')
 if k=='turion-jev-31b':s['listing']='ranked_over_cap'
 public=json.dumps(s)
 assert not re.search(r'/home/|workers/|#\d{4,}|\bPREREG\b|\br181\b|\br168\b|task_id|opaque_id|prediction',public),k
 out[k]=s;new[k]=s
 spec[k]={'raw_sha256':d['raw_sha256'],'source_sha256':L(J/'receipts/INPUTS.json')[k],'frozen':f,'off':off}
for metric in ['A','B','C','capability']:
 order=list(old['results']['board'][metric]['order']) if metric!='capability' else [s['key'] for s in sorted(prev.values(),key=lambda s:s.get('ranks',{}).get('capability') or 999999) if s['ranked']]
 val=lambda k:out[k]['capability'] if metric=='capability' else out[k]['scores'][metric]
 for k in sorted(new,key=lambda k:(-val(k),k)):
  idx=next((i for i,x in enumerate(order) if val(x)<val(k)),len(order));order.insert(idx,k)
 assert all(val(a)>=val(b) for a,b in zip(order,order[1:]))
 res['board'].setdefault(metric,{})['order']=order
 for i,k in enumerate(order):out[k]['ranks'][metric]=i+1
for k,s in out.items():
 if s['ranked']:s['rank']=s['ranks']['A']
for k,s in prev.items():
 assert {f:v for f,v in s.items() if f not in ['rank','ranks']}=={f:v for f,v in out[k].items() if f not in ['rank','ranks']},k
note='Three new rows on v1.6-regular-20261012: Amazon Strands Decider 26B-A4B, Turion JEV 31B and Chon-1.0-12B-Fast. No method change. All 285 carried rows retain every score, confidence interval and diagnostic; only placements move. New rows use their already-scored full-field B=1000 intervals and the 10-second share rule.'
res.update(revision=REV,label='JevBench v1.7.1: three same-draw additions',systems=sorted(out.values(),key=lambda s:s['key']),n_ranked=sum(bool(s['ranked']) for s in out.values()),roster_count=len(out),run_kind='same-draw-addendum',source_sha256=sha(J/'src/inputs.json'),source_note=note)
res['measurement_notes']=old['results']['measurement_notes']+[note]
res['addendum']={'predecessor':PREV,'new_keys':sorted(new),'method_change':False}
put(V/f'jevbench-{REV}-results.json',res)
cat=cp(old['categories'])
for k in new:
 cat['systems'][k]=cells[k]['cells_share'];cat['lanes'][k]=inputs[k]['registry']['lane']
cat.update(revision=REV,results_sha256=sha(V/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256'],results_sha256_note='Bound to v1.7.1 results; carried cells retained, new rows computed with the same frozen tools.')
put(V/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(V/f'jevbench-{PREV}-{n}.json',V/f'jevbench-{REV}-{n}.json')
# Proof is an explicit addendum, not a claim that the new rows were in the v1.7.0 rebuild.
proof={'schema_version':1,'revision':REV,'predecessor':{'revision':PREV,'publication_sha256':sha(V/f'jevbench-{PREV}-publication.json')},'method':res['method'],'pricing_module_sha256':old['proof']['pricing_module_sha256'],'scorers':old['proof']['scorers'],'carried_rows':len(prev),'carried_rows_equal_except':['rank','ranks'],'new_rows':{k:{'raw_sha256':inputs[k]['raw_sha256'],'pre_score_review_sha256':L(J/'receipts/INPUTS.json')[k].get('pre_score_review_sha256'),'scored_input_sha256':spec[k]['source_sha256']['v17-share']['sha256'],'model_pin':s['model_pin'],'axes':s['axes'],'composite_ci95':s['composite_ci95'],'decision_limit':s['decision_limit'],'treatment':s['listing']} for k,s in new.items()},'publication_approval':{'status':'PENDING','top_five_effect':'PENDING','fresh_baseline':PREV}}
tf=J/'receipts/topfive-diff.json'
if tf.exists():proof['publication_approval']['top_five_effect']='changes' if L(tf)['changed'] else 'unchanged';proof['topfive_diff_sha256']=sha(tf)
put(V/f'jevbench-{REV}-proof.json',proof)
pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None})
pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json','sha256':sha(V/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']}
put(V/f'jevbench-{REV}-publication.json',pub)
put(J/'receipts/NEW-ROW-SPEC.json',new)
put(J/'receipts/BUILD.json',{'revision':REV,'base':PREV,'carried_equal_except_ranks':len(prev),'new_keys':sorted(new),'roster_count':len(out),'n_ranked':res['n_ranked'],'files':pub['files']})
print('Built PENDING',REV,len(out),'rows;',len(prev),'carried equal except ranks')
