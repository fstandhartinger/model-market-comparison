"""Deterministic nine-row addition from pinned aggregate scoring. No sealed reads or publication."""
import pathlib,json,copy,hashlib,shutil,re,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';REV='v1.8.1';PREV='v1.8.0'
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();cp=copy.deepcopy
put=lambda p,v:pathlib.Path(p).write_text(json.dumps(v,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
NOTE='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.'
entries=L(J/'inputs/ENTRIES.json');usage=L(J/'src/usage.json');scored=L(J/'src/scored.json');cells=L(J/'src/cells.json');old={n:L(D/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','proof','publication']}
keys=sorted(entries);assert len(keys)==9 and 'joey-1' in keys
names=', '.join(entries[k]['entry']['display'] for k in ['wemm-jev','decision-king-v1.1','saif-4b','joey-1','cribl-decision-2','cribl-decision-2-mini','iota-decide-4b-v0.4','decide-1.1','sors-2b'])
HIST=f'Added nine rows measured on the 27 Oct regular draw ({names}), shown unranked until that draw is equated to the reference scale.'
CAP=.06459465517241379;LCAP=1.2329566404223442
# Remove operational references from public prose, preserving measurement/limitation statements.
def public(t):
 t=re.sub(r', instance id [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '', t, flags=re.I)
 t=t.replace('Sandy (Germany)', 'the measurement client')
 t=re.sub(r'custody\s*#\d+(?:,?\s*(?:deputy\s*)?#\d+)*','pre-registration review',t,flags=re.I)
 t=re.sub(r'\b(?:custody|deputy|release[- ]owner(?:\'s)?|lead[- ]verified|lead|PREREG)\b','measurement review',t,flags=re.I)
 t=re.sub(r'#[0-9]{4,}','the recorded ruling',t)
 t=re.sub(r'/home/[^\s;,()]+|workers/[^\s;,()]+','archived measurement artifact',t)
 t=re.sub(r'\b(?:run_api_full_v161\.py|jevbench\.adapters\.typesafe)\b','measurement harness',t)
 t=re.sub(r'\b(?:v16-[A-Za-z0-9_-]+|d1027-[A-Za-z0-9_-]+)\b','27 Oct draw',t)
 return t
res=cp(old['results']);cat=cp(old['categories']);new={};bounds={};proofrows={}
baseby={r['key']:r for r in res['systems']};draw=next(r['draw'] for r in res['systems'] if (r.get('draw')or{}).get('id')=='v1.6-regular-20261027')
for k in keys:
 en=entries[k]['entry'];u=usage[k];s=cp(scored[k]['v17-share']);assert s['v16']['n_items']==1500 and s['v16']['g_med_used']==2.573387642438244
 assert abs(s['cost']['usd_per_1000']-u['cost_common'])<1e-12 and s['cost']['common_basis']['n_items']==1489
 for f in ['display','author','repo','licence','endpoint_condition','disclosure']:s[f]=public(en.get(f)) if isinstance(en.get(f),str) else en.get(f)
 # The row note carries the draw hold; generic release-level composition/ranking claims stay on the release page.
 disc=s['disclosure'];start=disc.find('FIRST MEASUREMENT')
 if disc.startswith('DRAW ') and start>=0:disc=disc[start:]
 disc=re.sub(r'[,]?\s*(?:and )?changes no top-five list','',disc,flags=re.I)
 disc=re.sub(r'The v1\.7 share view uses the common self-hosted latency estimate \(.*?\);.*?here\.', 'Displayed self-hosted latency is an estimate under the shared method, not a measured hosted endpoint.', disc)
 disc=re.sub(r'The v1\.7 share view uses the common self-hosted latency estimate \([^)]*\);[^.]*\.', 'Displayed self-hosted latency is an estimate under the shared method, not a measured hosted endpoint.', disc)
 s['disclosure']=disc
 s['model_pin']=en.get('revision');s.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on='2026-10-30' if k=='sors-2b' else '2026-10-29',measurement_date_status='measured',paid_fast_lane=k in ['iota-decide-4b-v0.4','decide-1.1'],ranked=False,rank=None,ranks={'A':None,'B':None,'C':None,'capability':None},listing='unranked',not_ranked_because=NOTE)
 s['draw']={**{f:draw[f] for f in ['id','label','drawn_on','status','offset','offset_ci95']},'release':REV,'measured_on':s['last_measured_on'],'g_med':2.573387642438244,'results_sha256':scored[k]['pins']['v17-share']}
 nd=cells[k]['noul_share'];s['noul_decisive']={f:nd[f] for f in ['acc_among_decisive','decisive','decisive_rate','n','supported','valid']}
 # Replace pending aggregate placeholders by the scored latency without inventing a separate hosted endpoint.
 s['disclosure']=re.sub(r'Scored per-request p50, p95 and maximum latency are not supplied in the permitted aggregate receipts and remain pending; public synthetic probe timings are not substituted\.',f"Scored latency: p50 {s['speed']['p50_s_raw']:.6g} s, p95 {s['speed']['p95_s_raw']:.6g} s, maximum {u['latency_max']:.6g} s.",s['disclosure'])
 s['disclosure']=s['disclosure'].replace('and its numeric value remains pending here',f"and is {s['speed']['p50_s_adjusted']:.6g} s here")
 latency_text=f"Scored latency: p50 {s['speed']['p50_s_raw']:.6g} s, p95 {s['speed']['p95_s_raw']:.6g} s, maximum {u['latency_max']:.6g} s; {u['over10']} decisions over 10 s."
 s['disclosure']=re.sub(r'Scored per-request p50[^.]*remain pending(?:;[^.]*)?\.',latency_text,s['disclosure'])
 s['endpoint_condition']=re.sub(r"; (?:the )?release(?:'s)? GPU-time cost(?: component)? remains pending\.",'.',s['endpoint_condition'])
 if k=='decide-1.1':basis='API launch list price (I-1): https://decide.sh/pricing, applied since 2026-10-29. USD 0.03 per million input tokens; output free (input-only billing), no base model declared and no override. Frozen pricing module validates the operator standard launch list price. Native server usage; 19,926 reported output tokens are unbilled.'
 else:
  basis=(f"GPU-time estimate from v1.8.0: one monthly-rented RTX PRO 6000 96 GB, EUR 999/month / 730 hours, ECB USD 1.1133/EUR dated 28 Oct 2026, USD 1.5235/hour; average load 70%. Architecture: {u['architecture_class']} qwen, {u['active_b']:g}B active parameters; throughput {u['throughput']:.12g} tokens/s (architecture-class calibration, 29 Oct 2026, efficient-engine prefill; capped at 100,000 tokens/s). The row's own scored cost basis: {u['input_tokens_common']:,} input + {u['output_tokens_common']:,} output tokens over 1,489 decisions. Generated tokens are counted at the same throughput as prefill. GPU-time cost USD {u['gpu_common']:.15g}/1,000; old list-price estimate USD {u['estimate_common']:.15g}/1,000 ({u['ref']['listing']} at USD {u['ref']['in']:g}/M input and USD {u['ref']['out']:g}/M output). Applied min(old list-price estimate, GPU-time cost) = USD {u['cost_common']:.15g}/1,000. Estimated, not a bill.")
 basis+=f" COST FIGURES: USD {u['cost_common']:.9g} per 1,000 decisions, {u['cost_common']/CAP:.6g}x the official cost cap USD 0.064595. Cost on the 1,489 items every row on this draw answered (same-items rule); all-items cost USD {u['cost_all']:.9g} per 1,000 decisions ({u['cost_all']/CAP:.6g}x cap)."
 s['cost']['basis']=basis;s['cost']['common_basis']['usd_per_1000_all_items']=u['cost_all']
 s['cost']['kind']='tariff' if k=='decide-1.1' else 'estimate'
 if k=='sors-2b':s['disclosure']+=' OUTPUT ACCOUNTING: native one-per-question output counters are not generated text and are costed at zero output tokens, per the native-probability convention.'
 new[k]=s;cat['systems'][k]=cells[k]['cells_share'];cat['lanes'][k]=en['lane'];bounds[k]={**{dim:cells[k]['pool_share'][dim] for dim in ['usecases','languages']},'topics':{}}
 proofrows[k]={'raw_sha256':u['raw_sha256'],'scored_input_sha256':scored[k]['pins']['v17-share'],'model_pin':s['model_pin'],'axes':s['axes'],'composite_ci95':s['composite_ci95'],'decision_limit':s['decision_limit'],'treatment':'unranked','cost':u,'price_reference':u['ref'],'category_pool_bounds':bounds[k]}
assert not set(keys)&set(baseby)
res.update(revision=REV,label='JevBench v1.8.1: nine unranked rows on the 27 Oct draw',systems=sorted(res['systems']+list(new.values()),key=lambda r:r['key']),roster_count=len(baseby)+len(keys),run_kind='same-draw-addendum',source_note=HIST,source_sha256=sha(J/'src/scored.json'))
res['measurement_notes']=old['results']['measurement_notes']+[HIST]
res['addendum']={'predecessor':PREV,'new_keys':keys,'remeasured_keys':[],'repriced_keys':[],'link_fixed_keys':[],'text_fixed_keys':[],'method_change':False,'same_draw':'v1.6-regular-20261027','cost_basis':{'n_items':1489,'set_sha256':'4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537'}}
put(D/f'jevbench-{REV}-results.json',res)
cat.update(revision=REV,results_sha256=sha(D/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256']);put(D/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(D/f'jevbench-{PREV}-{n}.json',D/f'jevbench-{REV}-{n}.json')
proof={'schema_version':1,'revision':REV,'method':res['method'],'predecessor':{'revision':PREV,'publication_sha256':sha(D/f'jevbench-{PREV}-publication.json')},'carried_rows':len(baseby),'carried_rows_equal_except':[],'exceptions':{},'new_rows':proofrows,'remeasured_rows':{},'repriced_rows':{},'scorers':old['proof']['scorers'],'pricing_module_sha256':'455ee38b7070f2f076eec65d55c7bb2a69030c26c343c662ade2826f8afd6eaa','cost_basis':{**res['addendum']['cost_basis'],'frozen_at':'v1.7.16','cost_basis_sha256':scored[keys[0]]['cost_basis_sha256']},'publication_approval':{'status':'GO (standing; no top-five change)','fresh_baseline':PREV,'top_five_effect':'unchanged'},'source_inputs':{f:sha(J/f) for f in ['src/scored.json','src/usage.json','src/cells.json','inputs/ENTRIES.json','inputs/ENTRY-PINS.json']}}
tf=J/'receipts/topfive-diff.json'
if tf.exists():proof['topfive_diff_sha256']=sha(tf)
put(D/f'jevbench-{REV}-proof.json',proof)
pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.8/jevbench-{REV}-{n}.json','sha256':sha(D/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']};put(D/f'jevbench-{REV}-publication.json',pub)
put(J/'receipts/NEW-ROWS.json',new);put(J/'receipts/BOUNDS.json',bounds);put(J/'inputs/history.json',HIST)
subprocess.run(['python3','-B',str(J/'make_lib_v181.py')],check=True)
print('Built PENDING v1.8.1: nine UNRANKED new rows;',len(baseby),'carried rows and all order lists unchanged')
