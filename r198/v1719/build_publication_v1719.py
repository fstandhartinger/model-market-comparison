"""Two unpriced, unranked hosted rows; every carried value, cell and order is immutable."""
import pathlib,json,hashlib,copy,shutil,argparse
from rows_v1719 import *
ap=argparse.ArgumentParser();ap.add_argument('--comparison-only',action='store_true');args=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';REV='v1.7.19';PREV='v1.7.18'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();cp=copy.deepcopy;put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
old={n:L(V/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','proof','publication']};r=cp(old['results']);by={s['key']:s for s in r['systems']};prior=cp(by);cat=cp(old['categories']);inputs=L(J/'src/inputs.json');cells=L(J/'src/cells.json');entries=L(J/'inputs/ENTRIES.json');pins=L(J/'receipts/INPUTS.json');new={};bounds={}
draw=next(s['draw'] for s in by.values() if s.get('draw',{}).get('id')==DRAW_ID)
for k in KEYS:
 d=inputs[k];e=entries[k]['entry'];s=cp(d['v17-share']);assert k not in by and s['endpoint_kind']=='api' and s['api_flag'] is True
 for f in ['display','author','repo','provider','endpoint_condition','disclosure','model_pin','licence']:s[f]=cp(e[f])
 s.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on=d['measured_on'],measurement_date_status='measured',paid_fast_lane=False,ranked=False,rank=None,ranks={m:None for m in ['A','B','C','capability']},listing='unranked',not_ranked_because=NOTE)
 s['cost']['basis']=e['cost_basis'];assert s['cost']['kind']=='unpriced' and s['cost']['usd_per_1000'] is None and s['cost']['common_basis'] is None
 s['noul_decisive']={f:cells[k]['noul_share'][f] for f in ['acc_among_decisive','decisive','decisive_rate','n','supported','valid']};s['draw']={**{f:cp(draw[f]) for f in ['id','label','drawn_on','status','offset','offset_ci95']},'release':REV,'measured_on':d['measured_on'],'g_med':r['G_med'],'results_sha256':pins[k]['v17-share']['sha256']}
 assert s['v16']['g_med_used']==s['draw']['g_med']==2.573387642438244
 cat['systems'][k]=cells[k]['cells_share'];cat['lanes'][k]='api';bounds[k]={**cells[k]['pool_share'],'topics':{}}
 by[k]=s;new[k]={'raw_sha256':d['raw_sha256'],'source_sha256':pins[k],'scored_input_sha256':pins[k]['v17-share']['sha256'],'model_pin':s['model_pin'],'price_reference':d['price_reference'],'axes':s['axes'],'composite_ci95':s['composite_ci95'],'decision_limit':s['decision_limit'],'treatment':'unranked','n_items':1500,'n_answered':1495,'n_refused_over_limit':5,'cost':{'priced':False,'kind':'unpriced','usd_per_1000':None,'input_tokens_common':d['input_tokens_common'],'input_tokens_all':d['input_tokens_all'],'output_tokens':0,'basis_items':1489},'category_pool_bounds':bounds[k]}
assert all(by[k]==s for k,s in prior.items())
source_inputs={f:sha(J/p) for f,p in {'scored_rows_sha256':'src/inputs.json','entry_sha256':'inputs/ENTRIES.json','cells_sha256':'src/cells.json','recost_sha256':'src/recost.json'}.items()}
r.update(revision=REV,label='JevBench v1.7.19: DecisionNode and DecisionNode Flash (unranked, not priced)',systems=sorted(by.values(),key=lambda s:s['key']),n_ranked=old['results']['n_ranked'],roster_count=len(by),run_kind='same-draw-addendum',source_sha256=hashlib.sha256(json.dumps(source_inputs,sort_keys=True).encode()).hexdigest(),source_note=HIST)
r['measurement_notes']=old['results']['measurement_notes']+[HIST]+[by[k]['disclosure'] for k in KEYS]
cb={**pins['common_set'],'n_items':1489,'scorer_flag':'--cost-basis'}
r['addendum']={'predecessor':PREV,'new_keys':KEYS,'remeasured_keys':[],'repriced_keys':[],'link_fixed_keys':[],'text_fixed_keys':[],'method_change':False,'same_draw':DRAW_ID,'cost_basis':cb}
put(V/f'jevbench-{REV}-results.json',r);cat.update(revision=REV,results_sha256=sha(V/f'jevbench-{REV}-results.json'),source_results_sha256=r['source_sha256'],results_sha256_note='Carried cells unchanged; new family, use-case and language cells measured on the full 27 Oct draw. No subject-topic labels.');put(V/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(V/f'jevbench-{PREV}-{n}.json',V/f'jevbench-{REV}-{n}.json')
a=L(J/'inputs/APPROVAL.json');tf=J/'receipts/topfive-diff.json'
if tf.exists() and not args.comparison_only:
 diff=L(tf);assert not diff['changed'] and diff['lists']==580 and diff['changed_lists']==0 and diff['slider_changed_states']==0 and diff['explicit_slider_grid_changed']==0 and not diff['custom_changed_labels'],'STOP top-five change'
proof={'schema_version':1,'revision':REV,'predecessor':{'revision':PREV,'publication_sha256':sha(V/f'jevbench-{PREV}-publication.json')},'source_inputs':source_inputs,'method':r['method'],'pricing_module_sha256':PIN,'scorers':old['proof']['scorers'],'carried_rows':len(prior),'carried_rows_equal_except':[],'exceptions':{},'cost_basis':cb,'same_draw':{**by[KEYS[0]]['draw'],'manifest_sha256':pins[KEYS[0]]['manifest_sha256']},'new_rows':new,'remeasured_rows':{},'repriced_rows':{},'link_fixed_rows':[],'text_fixed_rows':[],'publication_approval':a,'topfive_diff_sha256':sha(tf) if tf.exists() else a['top_five_preview']['sha256']}
put(V/f'jevbench-{REV}-proof.json',proof);pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json','sha256':sha(V/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']};put(V/f'jevbench-{REV}-publication.json',pub)
put(J/'receipts/NEW-ROW-SPEC.json',{k:by[k] for k in KEYS});put(J/'receipts/NEW-ROW-BOUNDS.json',bounds);put(J/'candidate-rows.json',{k:by[k] for k in KEYS})
print('PENDING candidate built;',len(prior),'carried rows/cells/orders unchanged; two unranked, unpriced additions')
