"""Same-draw GPU replacement; the other 288 rows and immutable historical bytes are carried."""
import os,pathlib,json,hashlib,copy,shutil,re
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])));V=W/'data/raw/benchmarks/jevbench/v1.7'
REV='v1.7.3';PREV='v1.7.2';K='chon-1.0-e4b'
L=lambda p:json.loads(pathlib.Path(p).read_text())
put=lambda p,d:pathlib.Path(p).write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
cp=copy.deepcopy
old={n:L(V/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','carry','proof','publication']}
assert old['publication']['review']['verdict']=='PASS'
inputs=L(J/'src/inputs.json');pins=L(J/'receipts/INPUTS.json');cells=L(J/'src/cells.json');d=inputs[K];e=L(J/'inputs/ENTRY-CHON-E4B.json')[K]['entry']
assert pins[K]['raw_verified_in_place'] is True
source_inputs={n:sha(J/p) for n,p in {'scored_rows_sha256':'src/inputs.json','entry_sha256':'inputs/ENTRY-CHON-E4B.json','cells_sha256':'src/cells.json','sd_entry_sha256':'inputs/ENTRY-SCALEDOWN.json'}.items()}
source_sha=hashlib.sha256(json.dumps(source_inputs,sort_keys=True).encode()).hexdigest()
res=cp(old['results']);out={s['key']:s for s in res['systems']};prev=cp(out);cpu=prev[K];f=d['frozen'];off=d['v17-off'];sh=d['v17-share'];rmt=e['remeasure']
assert rmt['supersedes_base_row']['key']==K and rmt['supersedes_base_row']['endpoint_kind']==cpu['endpoint_kind']=='cpu'
assert rmt['draw']==cpu['draw']['id'] and rmt['new_raw_sha256']==d['raw_sha256']!=rmt['supersedes_base_row']['raw_sha256']
assert cpu['listing']=='remeasure-pending' and not cpu['ranked'] and e['endpoint_kind']=='gpu'
for fld in ['display','author','repo','licence']:assert e[fld]==cpu[fld],fld
assert cpu['model_pin'].endswith('@'+e['revision'])
for fld in ['axes','scores','views','jevbench_score','capability','composite_ci95','intelligence','calibration','validity','cost','status','support']:assert f[fld]==off[fld],fld
assert e['cost_basis']==cpu['cost']['basis']
assert sh['cost']==off['cost']==cpu['cost'] and sh['axes']['cost']==cpu['axes']['cost']
assert sh['status']==cpu['status'] and sh['support']==cpu['support']
assert sh['v16']['ci95']['seed']==cpu['v16']['ci95']['seed']==26 and sh['v16']['ci95']['B']==1000
assert sh['decision_limit']['n_over_limit']==0 and sh['v16']['ci95']['composite']==sh['composite_ci95']
s=cp(cpu)
for fld in ['axes','scores','views','jevbench_score','capability','speed','v16','intelligence','calibration','validity','composite_ci95','decision_limit','ranked','listing']:s[fld]=cp(sh[fld])
s.pop('not_ranked_because',None)
s.update(method='v1.7',remeasured_in=REV,measured_in=REV,last_measured_on=d['measured_on'],measurement_date_status='measured',endpoint_kind='gpu',endpoint_condition=e['endpoint_condition'])
# Keep the preceding CPU measurement in the same row's public history; do not recursively duplicate older history.
s['previous']={f:cp(v) for f,v in cpu.items() if f!='previous'};s['previous']['board_release']=PREV
s['remeasure']={'kind':'re-measure on the same items','draw':rmt['draw'],'supersedes_base_row':cp(rmt['supersedes_base_row']),'replaces':{'board_release':PREV,'endpoint_kind':'cpu','in_full':'scores and times'},'disclosure':e['disclosure']}
s['draw']={**cp(cpu['draw']),'release':REV,'measured_on':d['measured_on'],'results_sha256':pins[K]['v17-share']['sha256']}
s['noul_decisive']={f:cells[K]['noul_share'][f] for f in ['acc_among_decisive','decisive','decisive_rate','n','supported','valid']}
assert not re.search(r'/home/|workers/|#\d{4,}|\bPREREG\b|task_id|opaque_id|prediction',json.dumps(s))
assert s['ranked'] and s['listing']=='ranked' and s['cost']['usd_per_1000']<0.06459465517241379
s['cost']['kind']=e['cost_kind']
# New vendor-hosted row: numeric fields are copied exactly from the supplied score output.
SD='scaledown-classify-1';sd=inputs[SD];se=L(J/'inputs/ENTRY-SCALEDOWN.json')[SD]['entry'];ns=cp(sd['v17-share'])
ns.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on=sd['measured_on'],measurement_date_status='measured',paid_fast_lane=False,endpoint_condition=se['endpoint_condition'])
for fld in ['display','author','repo','licence','endpoint_kind']:ns[fld]=se[fld]
ns['base_model']=None;ns['model_pin']='classify-1 (vendor-hosted API; weights not public)'
ns['disclosure']=se['disclosure'];ns['code_revision']=se['code_revision'];ns['cost']['basis']=se['cost_basis']
ns['draw']={'id':'v1.6-regular-20261012','release':REV,'measured_on':sd['measured_on'],'results_sha256':pins[SD]['v17-share']['sha256']}
ns['noul_decisive']={f:cells[SD]['noul_share'][f] for f in ['acc_among_decisive','decisive','decisive_rate','n','supported','valid']}
assert not re.search(r'/home/|workers/|#\d{4,}|\bPREREG\b|Florian',json.dumps(ns))
assert ns['endpoint_kind']=='api' and ns['ranked'] and ns['cost']['kind']=='mixed'
out[K]=s;out[SD]=ns
for metric in ['A','B','C','capability']:
 order=list(old['results']['board'][metric]['order']) if metric!='capability' else [x['key'] for x in sorted(prev.values(),key=lambda x:x.get('ranks',{}).get('capability') or 999999) if x['ranked']]
 assert K not in order
 val=lambda k:out[k]['capability'] if metric=='capability' else out[k]['scores'][metric]
 for inserted in [K,SD]:
  idx=next((i for i,x in enumerate(order) if val(x)<val(inserted)),len(order));order.insert(idx,inserted)
 assert all(val(a)>=val(b) for a,b in zip(order,order[1:]))
 res['board'].setdefault(metric,{})['order']=order
 for i,k in enumerate(order):out[k]['ranks'][metric]=i+1
for k,row in out.items():
 if row['ranked']:row['rank']=row['ranks']['A']
for k,row in prev.items():
 if k!=K:assert {f:v for f,v in row.items() if f not in ['rank','ranks']}=={f:v for f,v in out[k].items() if f not in ['rank','ranks']},k
note='Chon-1.0-E4B GPU scores and times replace its CPU measurement in full; classify-1 (ScaleDown) added as one new hosted API row; no method change. All 288 other rows retain every score, confidence interval and diagnostic; only placements move.'
res.update(revision=REV,label='JevBench v1.7.3: GPU replacement and hosted addition',systems=sorted(out.values(),key=lambda s:s['key']),n_ranked=sum(bool(s['ranked']) for s in out.values()),roster_count=len(out),run_kind='same-draw-addendum',source_sha256=source_sha,source_note=note)
res['measurement_notes']=old['results']['measurement_notes']+[note]
res['addendum']={'predecessor':PREV,'new_keys':[SD],'remeasured_keys':[K],'method_change':False}
put(V/f'jevbench-{REV}-results.json',res)
cat=cp(old['categories']);cat['systems'][K]=cells[K]['cells_share'];cat['lanes'][K]=d['registry']['lane'];cat['systems'][SD]=cells[SD]['cells_share'];cat['lanes'][SD]=sd['registry']['lane']
cat.update(revision=REV,results_sha256=sha(V/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256'],results_sha256_note='Bound to v1.7.3 results; 288 carried cells retained, GPU replacement cells computed with the same frozen tools.')
put(V/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(V/f'jevbench-{PREV}-{n}.json',V/f'jevbench-{REV}-{n}.json')
assert K not in [r['key'] for r in old['carry']['rows']], 'GPU replacement must not remain in dated carry'
tf=J/'receipts/topfive-diff.json';a=L(J/'inputs/APPROVAL.json')
assert L(tf)['changed'] is True and L(tf)['lists']==40
assert a['top_five_effect']=='changed' and a['status']=='GO (fair top-five change, Florian rule 25 Oct 2026)'
assert a['top_five_preview']=={'path':'r185/v173/receipts/topfive-diff.json','sha256':sha(tf)}
# PENDING is allowed only for a review candidate; release readers and flip/freeze reject it.
fair=a['fairness_check'];assert fair['verdict']=='PENDING' or (fair['verdict']=='FAIR' and re.fullmatch('[a-f0-9]{64}',fair.get('sha256','')))
if fair['verdict']=='FAIR':
 from approval_v173 import check_approval
 check_approval(W,{'publication_approval':a,'topfive_diff_sha256':sha(tf)})
proof={'source_inputs':source_inputs,'schema_version':1,'revision':REV,'predecessor':{'revision':PREV,'publication_sha256':sha(V/f'jevbench-{PREV}-publication.json')},'method':res['method'],'pricing_module_sha256':old['proof']['pricing_module_sha256'],'scorers':old['proof']['scorers'],'carried_rows':288,'carried_rows_equal_except':['rank','ranks'],'new_rows':{SD:{'raw_sha256':sd['raw_sha256'],'scored_input_sha256':pins[SD]['v17-share']['sha256'],'source_sha256':pins[SD],'explicit_ref':pins[SD]['explicit_ref'],'axes':ns['axes'],'composite_ci95':ns['composite_ci95'],'decision_limit':ns['decision_limit'],'treatment':ns['listing']}},'remeasured_rows':{K:{'kind':'remeasured','raw_sha256':d['raw_sha256'],'replaces_raw_sha256':rmt['supersedes_base_row']['raw_sha256'],'supersedes_base_row':rmt['supersedes_base_row'],'source_sha256':pins[K],'scored_input_sha256':pins[K]['v17-share']['sha256'],'model_pin':s['model_pin'],'axes':s['axes'],'composite_ci95':s['composite_ci95'],'decision_limit':s['decision_limit'],'treatment':s['listing']}},'publication_approval':a,'topfive_diff_sha256':sha(tf)}
put(V/f'jevbench-{REV}-proof.json',proof)
pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None})
pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json','sha256':sha(V/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']}
put(V/f'jevbench-{REV}-publication.json',pub);put(J/'receipts/REMEASURED-ROW-SPEC.json',{K:s});put(J/'receipts/NEW-ROW-SPEC.json',{SD:ns})
put(J/'receipts/BUILD.json',{'revision':REV,'base':PREV,'carried_equal_except_ranks':288,'new_keys':[SD],'remeasured_keys':[K],'roster_count':len(out),'n_ranked':res['n_ranked'],'files':pub['files']})
print('Built PENDING',REV,len(out),'rows; 288 carried equal except ranks; 1 GPU replacement; 1 hosted addition')
