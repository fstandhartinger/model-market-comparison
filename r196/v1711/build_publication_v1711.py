"""Four cost corrections only; all measurements, non-cost axes and cells stay exact."""
import os,pathlib,json,hashlib,copy,shutil,argparse
from pricing_reference_v1711 import reference
ap=argparse.ArgumentParser();ap.add_argument('--comparison-only',action='store_true');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])));V=W/'data/raw/benchmarks/jevbench/v1.7';REV='v1.7.11';PREV='v1.7.10'
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();cp=copy.deepcopy
put=lambda p,d:pathlib.Path(p).write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
old={n:L(V/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','proof','publication']};assert old['publication']['review']['verdict']=='PASS'
inputs=L(J/'src/inputs.json');pins=L(J/'receipts/INPUTS.json');entries=L(J/'inputs/ENTRIES.json');keys=sorted(inputs);assert len(keys)==4
for k,p in pins.items():assert sha(p['audit_path'])==p['audit_sha256'],'recount binding changed '+k
source_inputs={n:sha(J/p) for n,p in {'scored_rows_sha256':'src/inputs.json','entry_sha256':'inputs/ENTRIES.json','recount_bindings_sha256':'receipts/INPUTS.json'}.items()};source_sha=hashlib.sha256(json.dumps(source_inputs,sort_keys=True).encode()).hexdigest()
res=cp(old['results']);out={s['key']:s for s in res['systems']};prev=cp(out)
for k in keys:
 row=out[k];s=inputs[k]['v17-share'];en=entries[k]['entry']
 for f in ['intelligence','calibration','speed','capability','decision_limit','status','support','validity']:assert row[f]==s[f],f
 row['cost']=cp(s['cost']);row['cost']['basis']=en['cost_basis'];assert row['cost']['kind']==prev[k]['cost']['kind']=='estimate'
 for f in ['scores','views','jevbench_score','composite_ci95']:row[f]=cp(s[f])
 row['axes']['cost']=s['axes']['cost'];row['v16']['ci95']['composite']=cp(s['composite_ci95'])
 for f in ['cost_basis','price_basis']:
  if f in row:row[f]=en['cost_basis']
for metric in ['A','B','C','capability']:
 order=list(old['results']['board'][metric]['order']);val=lambda k:out[k]['capability'] if metric=='capability' else out[k]['scores'][metric]
 order=sorted(order,key=lambda k:-val(k));res['board'][metric]['order']=order
 for i,k in enumerate(order):out[k]['ranks'][metric]=i+1
for k,s in out.items():
 if s['ranked']:s['rank']=s['ranks']['A']
for k,row in prev.items():
 if k in keys:continue
 assert {f:v for f,v in row.items() if f not in ['rank','ranks']}=={f:v for f,v in out[k].items() if f not in ['rank','ranks']},k
note='Cost correction for four Decisio Gemma rows (engine-processed input); no new measurement, no method change.'
res.update(revision=REV,label='JevBench v1.7.11: Decisio Gemma cost correction',systems=sorted(out.values(),key=lambda s:s['key']),source_sha256=source_sha,source_note=note)
res['measurement_notes']=old['results']['measurement_notes']+[note];res['addendum']={'predecessor':PREV,'new_keys':[],'remeasured_keys':[],'repriced_keys':keys,'link_fixed_keys':[],'method_change':False};put(V/f'jevbench-{REV}-results.json',res)
cat=cp(old['categories']);cat.update(revision=REV,results_sha256=sha(V/f'jevbench-{REV}-results.json'),source_results_sha256=source_sha,results_sha256_note='Bound to v1.7.11 results; all existing category cells and lanes retained exactly.');put(V/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(V/f'jevbench-{PREV}-{n}.json',V/f'jevbench-{REV}-{n}.json')
tf=J/'receipts/topfive-diff.json';a=L(J/'inputs/APPROVAL.json')
if A.comparison_only and not tf.exists():a['top_five_preview']['sha256']=hashlib.sha256(b'comparison bootstrap').hexdigest()
if tf.exists() and not A.comparison_only:assert L(tf)['lists']==580 and not L(tf).get('bootstrap')
proof={'source_inputs':source_inputs,'schema_version':1,'revision':REV,'predecessor':{'revision':PREV,'publication_sha256':sha(V/f'jevbench-{PREV}-publication.json')},'method':res['method'],'pricing_module_sha256':'645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4','scorers':old['proof']['scorers'],'carried_rows':len(prev)-4,'carried_rows_equal_except':['rank','ranks'],'exceptions':{k:'cost, composites, composite CIs, ranks and price fields only' for k in keys},'new_rows':{},'remeasured_rows':{},'repriced_rows':{k:{**pins[k],'price_reference':reference(k,entries[k]['entry']),'scored_sha256':sha(J/f'scoring/{k}-share.json'),'measurement_changed':False} for k in keys},'link_fixed_rows':[],'publication_approval':a,'topfive_diff_sha256':sha(tf) if tf.exists() else a['top_five_preview']['sha256']}
put(V/f'jevbench-{REV}-proof.json',proof);pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json','sha256':sha(V/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']}
put(V/f'jevbench-{REV}-publication.json',pub);put(J/'receipts/REMEASURED-ROW-SPEC.json',{k:out[k] for k in keys});put(J/'receipts/NEW-ROW-SPEC.json',{});put(J/'receipts/BUILD.json',{'revision':REV,'base':PREV,'carried_equal_except_ranks':len(prev)-4,'repriced_keys':keys,'new_keys':[],'roster_count':len(out),'n_ranked':res['n_ranked'],'files':pub['files']})
put(J/'receipts/ROWS-BEFORE-AFTER.json',{k:{'before':{f:prev[k][f] for f in ['cost','axes','scores','rank','ranks','composite_ci95']},'after':{f:out[k][f] for f in ['cost','axes','scores','rank','ranks','composite_ci95']}} for k in keys})
print('Built PENDING',REV,len(out),'rows; four cost corrections only')
