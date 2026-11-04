"""Deterministic one-row addition from pinned aggregate scoring. No sealed reads or publication."""
import pathlib,json,copy,hashlib,shutil,re,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';REV='v1.8.7';PREV='v1.8.6'
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();cp=copy.deepcopy
put=lambda p,v:pathlib.Path(p).write_text(json.dumps(v,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
NOTE='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.'
entries=L(J/'inputs/ENTRIES.json');usage=L(J/'src/usage.json');scored=L(J/'src/scored.json');cells=L(J/'src/cells.json');old={n:L(D/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','proof','publication']}
keys=sorted(entries);assert keys==['nvidia/nemotron-3.5-super-vl']
HIST='One more row on the 27 Oct regular draw (NVIDIA Nemotron 3.5 Super VL, hosted, reasoning off), shown unranked until the draw is equated to the reference scale.'
# Literal, individually reviewed public fields; never map internal words into public prose.
public_rows=L(J/'inputs/PUBLIC-ROWS.json')
cleaned=L(J/'inputs/CLEANED-ROWS.json');exceptions=L(J/'inputs/TEXT-EXCEPTIONS.json')
res=cp(old['results']);res['systems']=[cp(cleaned.get(r['key'],r)) for r in res['systems']];cat=cp(old['categories']);new={};bounds={};proofrows={}
baseby={r['key']:r for r in res['systems']};draw=next(r['draw'] for r in res['systems'] if (r.get('draw')or{}).get('id')=='v1.6-regular-20261027')
for k in keys:
 en=entries[k]['entry'];u=usage[k];s=cp(scored[k]['v17-share']);assert s['v16']['n_items']==(1125 if k in ['allec-oavg'] else 1500) and s['v16']['g_med_used']==2.573387642438244
 assert abs(s['cost']['usd_per_1000']-u['cost_common'])<1e-12 and s['cost']['common_basis']['n_items']==1489
 for f in ['display','author','repo','licence','endpoint_condition','disclosure']:s[f]=public_rows[k][f]
 s['underlying']=public_rows[k]['disclosure']
 assert en['revision'] is None and en['repo']=='https://openrouter.ai/nvidia/nemotron-3.5-super-vl';s['model_pin']=en['repo'];s.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on='2026-11-03',measurement_date_status='measured',paid_fast_lane=False,ranked=False,rank=None,ranks={'A':None,'B':None,'C':None,'capability':None},listing='unranked',not_ranked_because=NOTE)
 s['draw']={**{f:draw[f] for f in ['id','label','drawn_on','status','offset','offset_ci95']},'release':REV,'measured_on':s['last_measured_on'],'g_med':2.573387642438244,'results_sha256':scored[k]['pins']['v17-share']}
 nd=cells[k]['noul_share'];s['noul_decisive']={f:nd[f] for f in ['acc_among_decisive','decisive','decisive_rate','n','supported','valid']}
 tpd=(u['input_tokens_common']+u['output_tokens_common'])/1489
 basis=(f"Published OpenRouter tariff for the Crusoe bf16 endpoint of nvidia/nemotron-3.5-super-vl: USD {u['ref']['in']:.2f} per million input tokens and USD {u['ref']['out']:.2f} per million output tokens (fetched {u['ref']['fetched_at'][:19]}Z; frozen pricing module sha256 {u['ref']['module_sha256']}), counted from day 1 as the operator launch list price under the standing launch-list-price interpretation (I-1; the authority is recorded in the release proof). Hosted list price, so no GPU-time estimate applies. Cost = tariff x the engine-reported usage on the frozen 1,489-item common set of this draw: {u['input_tokens_common']:,} input and {u['output_tokens_common']:,} output tokens = {tpd:.11g} tokens/decision. "
  f"COST FIGURES: USD {u['cost_common']:.6f} per 1,000 decisions. Cost on the 1,489 items every row on this draw answered (same-items rule); all-items cost USD {u['cost_all']:.6f} per 1,000 decisions over all 1,500 decisions ({u['input_tokens_all']:,} input and {u['output_tokens_all']:,} output tokens, reasoning disabled so no reasoning tokens). Tariff-based figure from engine-reported usage, not a bill.")
 s['cost']['basis']=basis;s['cost']['common_basis']['usd_per_1000_all_items']=u['cost_all']
 s['cost']['kind']='tariff'
 assert s['speed']['adjustment']=='none (API)' and s['api_flag'] is True and s['endpoint_kind']=='api'
 new[k]=s;cat['systems'][k]=cells[k]['cells_share'];cat['lanes'][k]=en['lane'];bounds[k]={**{dim:cells[k]['pool_share'][dim] for dim in ['usecases','languages']},'topics':{}}
 proofrows[k]={'raw_sha256':u['raw_sha256'],'scored_input_sha256':scored[k]['pins']['v17-share'],'model_pin':s['model_pin'],'axes':s['axes'],'composite_ci95':s['composite_ci95'],'decision_limit':s['decision_limit'],'treatment':'unranked','cost':u,'price_reference':u['ref'],'category_pool_bounds':bounds[k]}
assert not set(keys)&set(baseby)
res.update(revision=REV,label='JevBench v1.8.7: one unranked row on the 27 Oct draw',systems=sorted(res['systems']+list(new.values()),key=lambda r:r['key']),roster_count=len(baseby)+len(keys),run_kind='same-draw-addendum',source_note=HIST,source_sha256=sha(J/'src/scored.json'))
res['measurement_notes']=old['results']['measurement_notes']+[HIST]
res['addendum']={'predecessor':PREV,'new_keys':keys,'remeasured_keys':[],'repriced_keys':[],'link_fixed_keys':[],'text_fixed_keys':sorted(cleaned),'method_change':False,'same_draw':'v1.6-regular-20261027','cost_basis':{'rule':old['results']['addendum']['cost_basis']['rule'],'n_items':1489,'set_sha256':'4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537'}}
put(D/f'jevbench-{REV}-results.json',res)
cat.update(revision=REV,results_sha256=sha(D/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256']);put(D/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(D/f'jevbench-{PREV}-{n}.json',D/f'jevbench-{REV}-{n}.json')
proof={'schema_version':1,'revision':REV,'method':res['method'],'predecessor':{'revision':PREV,'publication_sha256':sha(D/f'jevbench-{PREV}-publication.json')},'carried_rows':len(baseby),'carried_rows_equal_except':exceptions,'exceptions':{'text_only_sha256':sha(J/'inputs/TEXT-EXCEPTIONS.json')},'new_rows':proofrows,'remeasured_rows':{},'repriced_rows':{},'scorers':old['proof']['scorers'],'pricing_module_sha256':'2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b','pricing_authority':u['ref']['authority'],'cost_basis':{**res['addendum']['cost_basis'],'frozen_at':'v1.7.16','cost_basis_sha256':scored[keys[0]]['cost_basis_sha256']},'publication_approval':{'status':'GO (standing; no top-five change; Florian work order #20965)','fresh_baseline':PREV,'top_five_effect':'unchanged'},'source_inputs':{f:sha(J/f) for f in ['src/scored.json','src/usage.json','src/cells.json','inputs/ENTRIES.json','inputs/ENTRY-PINS.json','inputs/PUBLIC-ROWS.json','inputs/CLEANED-ROWS.json','inputs/TEXT-EXCEPTIONS.json','inputs/ARCHITECTURE.json','inputs/PROVENANCE.json']}}
tf=J/'receipts/topfive-diff.json'
if tf.exists():proof['topfive_diff_sha256']=sha(tf)
put(D/f'jevbench-{REV}-proof.json',proof)
pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.8/jevbench-{REV}-{n}.json','sha256':sha(D/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']};put(D/f'jevbench-{REV}-publication.json',pub)
put(J/'receipts/NEW-ROWS.json',new);put(J/'receipts/BOUNDS.json',bounds);put(J/'inputs/history.json',HIST)
subprocess.run(['python3','-B',str(J/'make_lib_v187.py')],check=True)
print('Built PENDING v1.8.7: one UNRANKED new row;',len(baseby),'carried rows and all order lists unchanged')
