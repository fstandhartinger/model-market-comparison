"""Deterministic one-row addition from pinned aggregate scoring. No sealed reads or publication."""
import pathlib,json,copy,hashlib,shutil,re,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';REV='v1.8.4';PREV='v1.8.3'
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();cp=copy.deepcopy
put=lambda p,v:pathlib.Path(p).write_text(json.dumps(v,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
NOTE='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.'
entries=L(J/'inputs/ENTRIES.json');usage=L(J/'src/usage.json');scored=L(J/'src/scored.json');cells=L(J/'src/cells.json');old={n:L(D/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','proof','publication']}
keys=sorted(entries);assert keys==['granite-switch-4.1-8b']
names='Granite Switch 4.1 8B (revision 4.1.1, decision adapter)'
HIST=f'Added one row measured on the 27 Oct regular draw ({names}), shown unranked until that draw is equated to the reference scale.'
CAP=.06459465517241379;LCAP=1.2329566404223442
# Literal, individually reviewed public fields; never map internal words into public prose.
public_rows=L(J/'inputs/PUBLIC-ROWS.json')
cleaned=L(J/'inputs/CLEANED-ROWS.json');exceptions=L(J/'inputs/TEXT-EXCEPTIONS.json')
res=cp(old['results']);res['systems']=[cp(cleaned.get(r['key'],r)) for r in res['systems']];cat=cp(old['categories']);new={};bounds={};proofrows={}
baseby={r['key']:r for r in res['systems']};draw=next(r['draw'] for r in res['systems'] if (r.get('draw')or{}).get('id')=='v1.6-regular-20261027')
for k in keys:
 en=entries[k]['entry'];u=usage[k];s=cp(scored[k]['v17-share']);assert s['v16']['n_items']==(1125 if k in ['allec-oavg'] else 1500) and s['v16']['g_med_used']==2.573387642438244
 assert abs(s['cost']['usd_per_1000']-u['cost_common'])<1e-12 and s['cost']['common_basis']['n_items']==1489
 for f in ['display','author','repo','licence','endpoint_condition','disclosure']:s[f]=public_rows[k][f]
 s['model_pin']=en['repo'].removeprefix('https://huggingface.co/')+'@'+en['revision'];s.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on='2026-10-31',measurement_date_status='measured',paid_fast_lane=False,ranked=False,rank=None,ranks={'A':None,'B':None,'C':None,'capability':None},listing='unranked',not_ranked_because=NOTE)
 s['draw']={**{f:draw[f] for f in ['id','label','drawn_on','status','offset','offset_ci95']},'release':REV,'measured_on':s['last_measured_on'],'g_med':2.573387642438244,'results_sha256':scored[k]['pins']['v17-share']}
 nd=cells[k]['noul_share'];s['noul_decisive']={f:nd[f] for f in ['acc_among_decisive','decisive','decisive_rate','n','supported','valid']}
 basis=(f"Sibling estimate (*est.): the declared measured base is ibm-granite/granite-4.1-8b; granite-4.2-8b is the sibling reference at USD 0.06 per million input tokens and USD 0.25 per million output tokens. This is not a listing or tariff for the measured base and not an author API quote. The frozen price catalog has no exact 4.1-8b listing. Native server usage includes every full-prompt chunk and every generated label-read token. On the frozen 1,489-decision common set: {u['input_tokens_common']:,} input + {u['output_tokens_common']:,} output tokens, yielding USD {u['estimate_common']:.15g} per 1,000 decisions. Across all 1,500 decisions: {u['input_tokens_all']:,} input + {u['output_tokens_all']:,} output tokens, yielding USD {u['estimate_all']:.15g} per 1,000. Granite is outside the six calibrated Gemma/Qwen throughput classes; under the existing v1.8 method the sibling estimate is retained and the GPU-time component is unavailable. No cross-family throughput mapping, observed-loop extrapolation or pod bill is used. Estimated, not a bill.")
 basis+=f" USD {u['cost_common']:.9g} per 1,000 decisions on the frozen 1,489-item common set of this draw (USD {u['cost_all']:.9g} over all 1,500 items)."
 s['cost']['basis']=basis;s['cost']['common_basis']['usd_per_1000_all_items']=u['cost_all']
 s['cost']['kind']='estimate'
 s['speed']['adjustment']='Self-hosted latency estimate under the shared method (assumption, not measured)'
 new[k]=s;cat['systems'][k]=cells[k]['cells_share'];cat['lanes'][k]=en['lane'];bounds[k]={**{dim:cells[k]['pool_share'][dim] for dim in ['usecases','languages']},'topics':{}}
 proofrows[k]={'raw_sha256':u['raw_sha256'],'scored_input_sha256':scored[k]['pins']['v17-share'],'model_pin':s['model_pin'],'axes':s['axes'],'composite_ci95':s['composite_ci95'],'decision_limit':s['decision_limit'],'treatment':'unranked','cost':u,'price_reference':u['ref'],'category_pool_bounds':bounds[k]}
assert not set(keys)&set(baseby)
res.update(revision=REV,label='JevBench v1.8.4: one unranked row on the 27 Oct draw',systems=sorted(res['systems']+list(new.values()),key=lambda r:r['key']),roster_count=len(baseby)+len(keys),run_kind='same-draw-addendum',source_note=HIST,source_sha256=sha(J/'src/scored.json'))
res['measurement_notes']=old['results']['measurement_notes']+[HIST]
res['addendum']={'predecessor':PREV,'new_keys':keys,'remeasured_keys':[],'repriced_keys':[],'link_fixed_keys':[],'text_fixed_keys':sorted(cleaned),'method_change':False,'same_draw':'v1.6-regular-20261027','cost_basis':{'rule':old['results']['addendum']['cost_basis']['rule'],'n_items':1489,'set_sha256':'4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537'}}
put(D/f'jevbench-{REV}-results.json',res)
cat.update(revision=REV,results_sha256=sha(D/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256']);put(D/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(D/f'jevbench-{PREV}-{n}.json',D/f'jevbench-{REV}-{n}.json')
proof={'schema_version':1,'revision':REV,'method':res['method'],'predecessor':{'revision':PREV,'publication_sha256':sha(D/f'jevbench-{PREV}-publication.json')},'carried_rows':len(baseby),'carried_rows_equal_except':exceptions,'exceptions':{'text_only_sha256':sha(J/'inputs/TEXT-EXCEPTIONS.json')},'new_rows':proofrows,'remeasured_rows':{},'repriced_rows':{},'scorers':old['proof']['scorers'],'pricing_module_sha256':'455ee38b7070f2f076eec65d55c7bb2a69030c26c343c662ade2826f8afd6eaa','cost_basis':{**res['addendum']['cost_basis'],'frozen_at':'v1.7.16','cost_basis_sha256':scored[keys[0]]['cost_basis_sha256']},'publication_approval':{'status':'GO (standing; no top-five change)','fresh_baseline':PREV,'top_five_effect':'unchanged'},'source_inputs':{f:sha(J/f) for f in ['src/scored.json','src/usage.json','src/cells.json','inputs/ENTRIES.json','inputs/ENTRY-PINS.json','inputs/PUBLIC-ROWS.json','inputs/CLEANED-ROWS.json','inputs/TEXT-EXCEPTIONS.json','inputs/ARCHITECTURE.json','inputs/ENTRY-COST-SUPPLEMENT.json','inputs/ENTRY-COST-DELTA.json']}}
tf=J/'receipts/topfive-diff.json'
if tf.exists():proof['topfive_diff_sha256']=sha(tf)
put(D/f'jevbench-{REV}-proof.json',proof)
pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.8/jevbench-{REV}-{n}.json','sha256':sha(D/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']};put(D/f'jevbench-{REV}-publication.json',pub)
put(J/'receipts/NEW-ROWS.json',new);put(J/'receipts/BOUNDS.json',bounds);put(J/'inputs/history.json',HIST)
subprocess.run(['python3','-B',str(J/'make_lib_v184.py')],check=True)
print('Built PENDING v1.8.4: one UNRANKED new rows;',len(baseby),'carried rows and all order lists unchanged')
