"""One same-draw self-hosted addition; every predecessor row is immutable except ranks."""
import os,pathlib,json,hashlib,copy,shutil,re
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])));V=W/'data/raw/benchmarks/jevbench/v1.7'
REV='v1.7.6';PREV='v1.7.5';K='decisio-gemma-4-12b-tuned-commit'
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
put=lambda p,d:pathlib.Path(p).write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n');cp=copy.deepcopy
old={n:L(V/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','carry','proof','publication']}
assert old['publication']['review']['verdict']=='PASS'
inputs=L(J/'src/inputs.json');pins=L(J/'receipts/INPUTS.json');cells=L(J/'src/cells.json');d=inputs[K];e=L(J/'inputs/ENTRY-DECISIO.json')[K]['entry']
assert pins[K]['raw_verified_in_place'] is True
source_inputs={n:sha(J/p) for n,p in {'scored_rows_sha256':'src/inputs.json','entry_sha256':'inputs/ENTRY-DECISIO.json','cells_sha256':'src/cells.json'}.items()}
source_sha=hashlib.sha256(json.dumps(source_inputs,sort_keys=True).encode()).hexdigest()
res=cp(old['results']);out={s['key']:s for s in res['systems']};prev=cp(out);assert K not in out
ns=cp(d['v17-share']);ns.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on=d['measured_on'],measurement_date_status='measured',paid_fast_lane=False)
for fld in ['display','author','repo','licence','endpoint_kind','endpoint_condition','base_model','disclosure','code_revision']:ns[fld]=e[fld]
ns['model_pin']='sthanika-ai/Decisio 12B tuned commit@'+e['revision']+' + google/gemma-4-31B-it@842da3794eaa0b77d5f08bae87a17459d91ff475'
ns['cost']['basis']=e['cost_basis']
ns['draw']={'id':'v1.6-regular-20261012','release':REV,'measured_on':d['measured_on'],'results_sha256':pins[K]['v17-share']['sha256']}
ns['noul_decisive']={f:cells[K]['noul_share'][f] for f in ['acc_among_decisive','decisive','decisive_rate','n','supported','valid']}
assert not re.search(r'/home/|workers/|J/r\d|#\d{4,}|\bPREREG\b|Florian|b7099b77|53a5052f|\brank(?:ed|ing)?\b|top[- ]five|top[- ]5',json.dumps({f:ns.get(f) for f in ['display','author','licence','disclosure','code_revision','endpoint_condition','cost']}),re.I), 'internal/public rank text'
assert ns['endpoint_kind']=='gpu' and ns['ranked'] and ns['cost']['kind']=='estimate'
# All numeric scores and diagnostics are copied, not recomputed.
for f in ['axes','scores','views','jevbench_score','capability','composite_ci95','intelligence','calibration','validity','status','support','speed','v16','decision_limit']:assert ns[f]==d['v17-share'][f],f
out[K]=ns
for metric in ['A','B','C','capability']:
 order=list(old['results']['board'][metric]['order']) if metric!='capability' else [x['key'] for x in sorted(prev.values(),key=lambda x:x.get('ranks',{}).get('capability') or 999999) if x['ranked']]
 val=lambda k:out[k]['capability'] if metric=='capability' else out[k]['scores'][metric]
 idx=next((i for i,x in enumerate(order) if val(x)<val(K)),len(order));order.insert(idx,K)
 assert all(val(a)>=val(b) for a,b in zip(order,order[1:]));res['board'].setdefault(metric,{})['order']=order
 for i,k in enumerate(order):out[k]['ranks'][metric]=i+1
for k,row in out.items():
 if row['ranked']:row['rank']=row['ranks']['A']
for k,row in prev.items():assert {f:v for f,v in row.items() if f not in ['rank','ranks']}=={f:v for f,v in out[k].items() if f not in ['rank','ranks']},k
note='One new self-hosted row Decisio 12B tuned commit (variant of the Decisio family); no method change. All 292 carried rows retain every score, confidence interval and diagnostic; only placements move.'
res.update(revision=REV,label='JevBench v1.7.6: one same-draw self-hosted addition',systems=sorted(out.values(),key=lambda s:s['key']),n_ranked=sum(bool(s['ranked']) for s in out.values()),roster_count=len(out),run_kind='same-draw-addendum',source_sha256=source_sha,source_note=note)
res['measurement_notes']=old['results']['measurement_notes']+[note];res['addendum']={'predecessor':PREV,'new_keys':[K],'remeasured_keys':[],'method_change':False}
put(V/f'jevbench-{REV}-results.json',res)
cat=cp(old['categories']);cat['systems'][K]=cells[K]['cells_share'];cat['lanes'][K]=d['registry']['lane']
cat.update(revision=REV,results_sha256=sha(V/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256'],results_sha256_note='Bound to v1.7.6 results; 292 carried cells retained; new cells computed with unchanged frozen tools.')
put(V/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(V/f'jevbench-{PREV}-{n}.json',V/f'jevbench-{REV}-{n}.json')
tf=J/'receipts/topfive-diff.json';a=L(J/'inputs/APPROVAL.json')
assert L(tf)['changed'] is True and L(tf)['lists']==580 and not L(tf).get('bootstrap')
assert a['top_five_effect']=='changed' and a['status']=='GO (fair top-five change, Florian rule 25 Oct 2026)'
assert a['top_five_preview']=={'path':'r190/v176/receipts/topfive-diff.json','sha256':sha(tf)}
fair=a['fairness_check'];assert fair['verdict']=='FAIR' and fair['sha256']=='09696d53206ede9d4fcb3b0a5af2061498a0d0f08a6ba4121135bee9d9d4d199'
if fair['verdict']=='FAIR':
 from approval_v176 import check_approval
 check_approval(W,{'publication_approval':a,'topfive_diff_sha256':sha(tf)})
proof={'source_inputs':source_inputs,'schema_version':1,'revision':REV,'predecessor':{'revision':PREV,'publication_sha256':sha(V/f'jevbench-{PREV}-publication.json')},'method':res['method'],'pricing_module_sha256':old['proof']['pricing_module_sha256'],'scorers':old['proof']['scorers'],'carried_rows':292,'carried_rows_equal_except':['rank','ranks'],'new_rows':{K:{'raw_sha256':d['raw_sha256'],'scored_input_sha256':pins[K]['v17-share']['sha256'],'source_sha256':pins[K],'model_pin':ns['model_pin'],'base_model':ns['base_model'],'price_reference':{'base':None,'listing':'google/gemma-3-12b-it','in':0.05,'out':0.15,'output_usage':1485},'axes':ns['axes'],'composite_ci95':ns['composite_ci95'],'decision_limit':ns['decision_limit'],'treatment':ns['listing']}},'remeasured_rows':{},'publication_approval':a,'topfive_diff_sha256':sha(tf)}
put(V/f'jevbench-{REV}-proof.json',proof)
pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None})
pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json','sha256':sha(V/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']}
put(V/f'jevbench-{REV}-publication.json',pub);put(J/'receipts/REMEASURED-ROW-SPEC.json',{});put(J/'receipts/NEW-ROW-SPEC.json',{K:ns})
put(J/'receipts/BUILD.json',{'revision':REV,'base':PREV,'carried_equal_except_ranks':292,'new_keys':[K],'remeasured_keys':[],'roster_count':len(out),'n_ranked':res['n_ranked'],'files':pub['files']})
print('Built PENDING',REV,len(out),'rows; 292 carried equal except ranks; 1 self-hosted addition')
