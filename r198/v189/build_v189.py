"""Deterministic one-row addition from pinned aggregate scoring. No sealed reads or publication."""
import pathlib,json,copy,hashlib,shutil,re,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';REV='v1.8.9';PREV='v1.8.8'
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();cp=copy.deepcopy
put=lambda p,v:pathlib.Path(p).write_text(json.dumps(v,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
NOTE='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.'
entries=L(J/'inputs/ENTRIES.json');usage=L(J/'src/usage.json');scored=L(J/'src/scored.json');cells=L(J/'src/cells.json');old={n:L(D/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','proof','publication']}
keys=sorted(entries);assert keys==['karpo_decision_31b']
HIST='One more row on the 27 Oct regular draw (Karpo-Decision-31B, self-hosted), shown unranked until the draw is equated to the reference scale.'
# Literal, individually reviewed public fields; never map internal words into public prose.
public_rows=L(J/'inputs/PUBLIC-ROWS.json')
cleaned=L(J/'inputs/CLEANED-ROWS.json');exceptions=L(J/'inputs/TEXT-EXCEPTIONS.json')
res=cp(old['results']);res['systems']=[cp(cleaned.get(r['key'],r)) for r in res['systems']];cat=cp(old['categories']);new={};bounds={};proofrows={}
baseby={r['key']:r for r in res['systems']};draw=next(r['draw'] for r in res['systems'] if (r.get('draw')or{}).get('id')=='v1.6-regular-20261027')
for k in keys:
 en=entries[k]['entry'];u=usage[k];s=cp(scored[k]['v17-share']);assert s['v16']['g_med_used']==2.573387642438244
 assert abs(s['cost']['usd_per_1000']-u['cost_common'])<1e-12
 for f in ['display','author','repo','licence','endpoint_condition','disclosure']:s[f]=public_rows[k][f]
 s['underlying']=public_rows[k]['disclosure']
 s['model_pin']='MachinePulseAI/karpo-decision-31B@'+en['revision'];s['publication_scope']='standard-axes-only';s.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on='2026-11-10',measurement_date_status='measured',paid_fast_lane=True,ranked=False,rank=None,ranks={'A':None,'B':None,'C':None,'capability':None},listing='unranked',not_ranked_because=NOTE)
 s['draw']={**{f:draw[f] for f in ['id','label','drawn_on','status','offset','offset_ci95']},'release':REV,'measured_on':s['last_measured_on'],'g_med':2.573387642438244,'results_sha256':scored[k]['pins']['v17-share']}
 basis=(f"GPU-time estimate from v1.8.0: one monthly-rented RTX PRO 6000 96 GB, USD 1.5235/hour; average load 70%. Architecture: dense gemma, 31B active parameters; throughput {u['throughput']:.12g} tokens/s (architecture-class calibration, efficient-engine prefill). GPU-time cost USD {u['gpu_common']:.15g}/1,000; old list-price estimate USD {u['list_common']:.15g}/1,000 (google/gemma-4-31b-it at USD 0.09/M input and USD 0.34/M output). Applied min(old list-price estimate, GPU-time cost) = USD {u['cost_common']:.15g}/1,000. Estimated, not a bill.")
 s['cost']['basis']=basis
 assert s['speed']['adjustment']=='x2 + 0.15 s (assumption, not measured)' and s['api_flag'] is False and s['endpoint_kind']=='gpu'
 new[k]=s;cat['systems'][k]=cells[k];cat['lanes'][k]=en['lane'];bounds[k]={dim:{category:cell['n'] for category,cell in rows.items()} for dim,rows in cells[k].items()}
 proofrows[k]={'scored_input_sha256':scored[k]['pins']['v17-share'],'model_pin':s['model_pin'],'axes':s['axes'],'composite_ci95':s['composite_ci95'],'decision_limit':s['decision_limit'],'treatment':'unranked','cost':u,'failure_treatment':'Failed or unanswered requests count as wrong answers.', 'code_commit':'25c38826','price_reference':u['ref']}
assert not set(keys)&set(baseby)
res.update(revision=REV,label='JevBench v1.8.9: one unranked row on the 27 Oct draw',systems=sorted(res['systems']+list(new.values()),key=lambda r:r['key']),roster_count=len(baseby)+len(keys),run_kind='same-draw-addendum',source_note=HIST,source_sha256=sha(J/'src/scored.json'))
res['measurement_notes']=old['results']['measurement_notes']+[HIST]
res['addendum']={'predecessor':PREV,'new_keys':keys,'remeasured_keys':[],'repriced_keys':[],'link_fixed_keys':[],'text_fixed_keys':sorted(cleaned),'method_change':False,'same_draw':'v1.6-regular-20261027','cost_basis':{'rule':old['results']['addendum']['cost_basis']['rule'],'n_items':1489,'set_sha256':'4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537'}}
put(D/f'jevbench-{REV}-results.json',res)
cat.update(revision=REV,results_sha256=sha(D/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256']);put(D/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(D/f'jevbench-{PREV}-{n}.json',D/f'jevbench-{REV}-{n}.json')
proof={'schema_version':1,'revision':REV,'method':res['method'],'predecessor':{'revision':PREV,'publication_sha256':sha(D/f'jevbench-{PREV}-publication.json')},'carried_rows':len(baseby),'carried_rows_equal_except':exceptions,'exceptions':{'text_only_sha256':sha(J/'inputs/TEXT-EXCEPTIONS.json')},'new_rows':proofrows,'remeasured_rows':{},'repriced_rows':{},'scorers':old['proof']['scorers'],'pricing_module_sha256':'2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b','pricing_authority':u['ref']['authority'],'cost_basis':{**res['addendum']['cost_basis'],'frozen_at':'v1.7.16','cost_basis_sha256':scored[keys[0]]['cost_basis_sha256']},'publication_approval':{'status':"GO (standing; no top-five change; paid evaluation published with the author's written consent)",'fresh_baseline':PREV,'top_five_effect':'unchanged'},'source_inputs':{f:sha(J/f) for f in ['src/scored.json','src/usage.json','src/cells.json','inputs/ENTRIES.json','inputs/ENTRY-PINS.json','inputs/PUBLIC-ROWS.json','inputs/CLEANED-ROWS.json','inputs/TEXT-EXCEPTIONS.json','inputs/ARCHITECTURE.json','inputs/PROVENANCE.json','inputs/BREAKDOWN-POLICY.json']}}
tf=J/'receipts/topfive-diff.json'
if tf.exists():proof['topfive_diff_sha256']=sha(tf)
put(D/f'jevbench-{REV}-proof.json',proof)
pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.8/jevbench-{REV}-{n}.json','sha256':sha(D/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']};put(D/f'jevbench-{REV}-publication.json',pub)
put(J/'receipts/NEW-ROWS.json',new);put(J/'receipts/BOUNDS.json',bounds);put(J/'inputs/history.json',HIST)
subprocess.run(['python3','-B',str(J/'make_lib_v189.py')],check=True)
print('Built PENDING v1.8.9: one UNRANKED new row;',len(baseby),'carried rows and all order lists unchanged')
