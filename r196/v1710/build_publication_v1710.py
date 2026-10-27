"""Three same-draw self-hosted additions; every predecessor score is immutable."""
import os,pathlib,json,hashlib,copy,shutil,re,argparse
ap=argparse.ArgumentParser();ap.add_argument('--comparison-only',action='store_true');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])));V=W/'data/raw/benchmarks/jevbench/v1.7';REV='v1.7.10';PREV='v1.7.9'
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();cp=copy.deepcopy
put=lambda p,d:pathlib.Path(p).write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
old={n:L(V/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','carry','proof','publication']};assert old['publication']['review']['verdict']=='PASS'
inputs=L(J/'src/inputs.json');pins=L(J/'receipts/INPUTS.json');cells=L(J/'src/cells.json');entries=L(J/'inputs/ENTRIES.json');keys=sorted(inputs)
source_inputs={n:sha(J/p) for n,p in {'scored_rows_sha256':'src/inputs.json','entry_sha256':'inputs/ENTRIES.json','cells_sha256':'src/cells.json'}.items()};source_sha=hashlib.sha256(json.dumps(source_inputs,sort_keys=True).encode()).hexdigest()
res=cp(old['results']);out={s['key']:s for s in res['systems']};prev=cp(out);new={}
for k in keys:
 assert k not in out and pins[k]['raw_verified_in_place'];d=inputs[k];e=entries[k]['entry'];ns=cp(d['v17-share']);ns.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on=d['measured_on'],measurement_date_status='measured',paid_fast_lane=k=='iota-decide-4b-v0.3')
 for fld in ['display','author','repo','licence','endpoint_kind','endpoint_condition','disclosure','code_revision']:ns[fld]=e[fld]
 ns['base_model']=e['base_model']
 ns['model_pin']=d['model_pin'];assert '@'+e['revision'] in ns['model_pin']
 ns['cost']['basis']=e['cost_basis'];ns['draw']={'id':'v1.6-regular-20261012','release':REV,'measured_on':d['measured_on'],'results_sha256':pins[k]['v17-share']['sha256']}
 ns['noul_decisive']={f:cells[k]['noul_share'][f] for f in ['acc_among_decisive','decisive','decisive_rate','n','supported','valid']}
 assert not re.search(r'/home/|workers/|#\d{4,}|\bPREREG\b|Florian|\brank(?:ed|ing)?\b(?! 256)|top[- ]five|top[- ]5|release.owner|\blead\b|\{[A-Za-z_][A-Za-z0-9_]*\}',json.dumps({f:ns.get(f) for f in ['display','author','licence','disclosure','code_revision','endpoint_condition','cost']}),re.I),'internal public text'
 for f in ['axes','scores','views','jevbench_score','capability','composite_ci95','intelligence','calibration','validity','status','support','speed','v16','decision_limit']:assert ns[f]==d['v17-share'][f],f
 out[k]=ns;new[k]=ns
for metric in ['A','B','C','capability']:
 order=list(old['results']['board'][metric]['order']) if metric!='capability' else [x['key'] for x in sorted(prev.values(),key=lambda x:x.get('ranks',{}).get('capability') or 999999) if x['ranked']]
 val=lambda k:out[k]['capability'] if metric=='capability' else out[k]['scores'][metric]
 # Stable sort retains every predecessor tie and inserts the new row after existing ties.
 order=sorted(order+keys,key=lambda k:-val(k))
 assert all(val(a)>=val(b) for a,b in zip(order,order[1:]));res['board'].setdefault(metric,{})['order']=order
 for i,k in enumerate(order):out[k]['ranks'][metric]=i+1
for k,row in out.items():
 if row['ranked']:row['rank']=row['ranks']['A']
for k,row in prev.items():
 assert {f:v for f,v in row.items() if f not in ['rank','ranks']}=={f:v for f,v in out[k].items() if f not in ['rank','ranks']},k
note='Three new self-hosted rows Philly Decider v2, iota-decide-4b-v0.3 and Decisio 0.9.0 (Qwen3.6-35B-A3B); no method change.'
res.update(revision=REV,label='JevBench v1.7.10: three same-draw self-hosted additions',systems=sorted(out.values(),key=lambda s:s['key']),n_ranked=sum(bool(s['ranked']) for s in out.values()),roster_count=len(out),run_kind='same-draw-addendum',source_sha256=source_sha,source_note=note)
res['measurement_notes']=old['results']['measurement_notes']+[note+' Philly and iota v0.3 answered all 1,500 requests with disclosed truncation. Decisio answered 1,485; 15 HTTP 500 over-length refusals count as misses. All three costs are ESTIMATE base-model prices; Decisio uses disclosed offline engine-input billing and exceeds the cost cap.'];res['addendum']={'predecessor':PREV,'new_keys':keys,'remeasured_keys':[],'repriced_keys':[],'link_fixed_keys':[],'method_change':False};put(V/f'jevbench-{REV}-results.json',res)
cat=cp(old['categories'])
for k in keys:cat['systems'][k]=cells[k]['cells_share'];cat['lanes'][k]=inputs[k]['registry']['lane']
cat.update(revision=REV,results_sha256=sha(V/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256'],results_sha256_note='Bound to v1.7.10 results; 297 carried cells retained; new cells computed with unchanged frozen tools.');put(V/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(V/f'jevbench-{PREV}-{n}.json',V/f'jevbench-{REV}-{n}.json')
tf=J/'receipts/topfive-diff.json';a=L(J/'inputs/APPROVAL.json')
if tf.exists() and not A.comparison_only:assert L(tf)['lists']==580 and not L(tf).get('bootstrap')
if A.comparison_only and not tf.exists():a['top_five_preview']['sha256']=hashlib.sha256(b'comparison bootstrap').hexdigest()
proof={'source_inputs':source_inputs,'schema_version':1,'revision':REV,'predecessor':{'revision':PREV,'publication_sha256':sha(V/f'jevbench-{PREV}-publication.json')},'method':res['method'],'pricing_module_sha256':'645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4','scorers':old['proof']['scorers'],'carried_rows':len(prev),'carried_rows_equal_except':['rank','ranks'],'exceptions':{},'new_rows':{k:{'raw_sha256':inputs[k]['raw_sha256'],'scored_input_sha256':pins[k]['v17-share']['sha256'],'source_sha256':pins[k],'model_pin':new[k]['model_pin'],'price_reference':{'base':entries[k]['entry']['base_model'],'listing':entries[k]['entry']['base_model'].lower(),'in':0.15 if k.startswith('decisio') else 0.03,'out':1.0 if k.startswith('decisio') else 0.15},'axes':new[k]['axes'],'composite_ci95':new[k]['composite_ci95'],'decision_limit':new[k]['decision_limit'],'treatment':new[k]['listing']} for k in keys},'remeasured_rows':{},'repriced_rows':{},'link_fixed_rows':[],'publication_approval':a,'topfive_diff_sha256':sha(tf) if tf.exists() else a['top_five_preview']['sha256']}
put(V/f'jevbench-{REV}-proof.json',proof);pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json','sha256':sha(V/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']}
put(V/f'jevbench-{REV}-publication.json',pub);put(J/'receipts/REMEASURED-ROW-SPEC.json',{});put(J/'receipts/NEW-ROW-SPEC.json',new);put(J/'receipts/BUILD.json',{'revision':REV,'base':PREV,'carried_equal_except_ranks':len(prev),'new_keys':keys,'roster_count':len(out),'n_ranked':res['n_ranked'],'files':pub['files']})
print('Built PENDING',REV,len(out),'rows;',len(prev),'carried equal except ranks; comparison_only',A.comparison_only)
