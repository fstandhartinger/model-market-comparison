"""Same-draw addition, existing-measurement reprice and vendor link corrections."""
import os,pathlib,json,hashlib,copy,shutil,re,argparse
ap=argparse.ArgumentParser();ap.add_argument('--comparison-only',action='store_true');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])));V=W/'data/raw/benchmarks/jevbench/v1.7';REV='v1.7.9';PREV='v1.7.8'
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();cp=copy.deepcopy
put=lambda p,d:pathlib.Path(p).write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
old={n:L(V/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','carry','proof','publication']};assert old['publication']['review']['verdict']=='PASS'
inputs=L(J/'src/inputs.json');pins=L(J/'receipts/INPUTS.json');cells=L(J/'src/cells.json');entries=L(J/'inputs/ENTRY-GLICLASS9B.json');keys=sorted(inputs)
source_inputs={n:sha(J/p) for n,p in {'scored_rows_sha256':'src/inputs.json','entry_sha256':'inputs/ENTRY-GLICLASS9B.json','cells_sha256':'src/cells.json','reprice_registry_sha256':'inputs/MYLESG12-REGISTRY.json','reprice_share_sha256':'scoring/share/jevbench-v1.6.0-results.json','reprice_off_sha256':'scoring/off/jevbench-v1.6.0-results.json'}.items()};source_sha=hashlib.sha256(json.dumps(source_inputs,sort_keys=True).encode()).hexdigest()
res=cp(old['results']);out={s['key']:s for s in res['systems']};prev=cp(out);new={}
for k in keys:
 assert k not in out and pins[k]['raw_verified_in_place'];d=inputs[k];e=entries[k]['entry'];ns=cp(d['v17-share']);ns.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on=d['measured_on'],measurement_date_status='measured',paid_fast_lane=False)
 for fld in ['display','author','repo','licence','endpoint_kind','endpoint_condition','disclosure','code_revision']:ns[fld]=e[fld]
 ns['base_model']=e['base_model']
 ns['model_pin']=d['model_pin'];assert ns['model_pin'].startswith(e['repo'].removeprefix('https://huggingface.co/')+'@'+e['revision'])
 ns['cost']['basis']=e['cost_basis'];ns['draw']={'id':'v1.6-regular-20261012','release':REV,'measured_on':d['measured_on'],'results_sha256':pins[k]['v17-share']['sha256']}
 ns['noul_decisive']={f:cells[k]['noul_share'][f] for f in ['acc_among_decisive','decisive','decisive_rate','n','supported','valid']}
 assert not re.search(r'/home/|workers/|#\d{4,}|\bPREREG\b|Florian|\brank(?:ed|ing)?\b|top[- ]five|top[- ]5|release.owner|the lead|\{[A-Za-z_][A-Za-z0-9_]*\}',json.dumps({f:ns.get(f) for f in ['display','author','licence','disclosure','code_revision','endpoint_condition','cost']}),re.I),'internal public text'
 for f in ['axes','scores','views','jevbench_score','capability','composite_ci95','intelligence','calibration','validity','status','support','speed','v16','decision_limit']:assert ns[f]==d['v17-share'][f],f
 out[k]=ns;new[k]=ns
mk='launchables-myles-g-12b';mr=out[mk];sc=L(J/'scoring/share/jevbench-v1.6.0-results.json')['systems'][0]
for f in ['intelligence','calibration','speed','capability','decision_limit','status','support','validity']:
 assert mr[f]==sc[f], 're-price changed '+f
for f in ['intelligence','calibration','speed']:assert mr['axes'][f]==sc['axes'][f],f
assert round(sc['cost']['usd_per_1000'],8)==0.00105060
assert round(sc['cost']['common_basis']['usd_per_1000_all_items'],8)==0.00132080
text="Public launch list price, counted under interpretation I-1 (a manufacturer's standard, non-promotional list price counts from day 1): GBP 0.0015 per million input tokens, output free, from launchables.ai/docs/deploy/hosted fetched 26 Oct 2026 17:38 UTC. USD 0.0020020 per million input tokens from the ECB euro reference rates of 20 Oct 2026 (GBP 1 = USD 1.33468); prices exclude VAT. Provider-reported usage: 779,294 input / 1,485 output tokens on the common 1,485-item basis; 989,607 input / 1,500 output over all 1,500 items. Common basis USD 0.00105060 per 1,000 decisions; all-item basis USD 0.00132080. The tariff applied to the row's own provider-reported tokens; not a bill and not a quote. Saved copy of the vendor page sha256 956fa709. Price corrected in v1.7.9; earlier releases showed a same-base ESTIMATE of USD 0.0264 per 1,000."
mr['cost']=cp(sc['cost']);mr['cost']['basis']=text
for f in ['scores','views','jevbench_score','composite_ci95']:mr[f]=cp(sc[f])
mr['axes']['cost']=sc['axes']['cost'];mr['v16']['ci95']['composite']=cp(sc['v16']['ci95']['composite'])
# Remove stale price claims wherever the original row carried them; factual measurement prose stays byte-exact.
for f in ['cost_basis','price_basis']:
 if f in mr:mr[f]=text
for k in ['singularity-super-decider','singularity-super-decider-thinking']:out[k]['source_url']='https://singularitycompute.com/super-decider'
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
 if k in ['launchables-myles-g-12b','singularity-super-decider','singularity-super-decider-thinking']:continue
 assert {f:v for f,v in row.items() if f not in ['rank','ranks']}=={f:v for f,v in out[k].items() if f not in ['rank','ranks']},k
note='One new self-hosted row GLiClass v4 9B; Myles-G 12B now priced at its public list price; Super Decider links point to the vendor page; no method change.'
res.update(revision=REV,label='JevBench v1.7.9: one same-draw self-hosted addition and one price correction',systems=sorted(out.values(),key=lambda s:s['key']),n_ranked=sum(bool(s['ranked']) for s in out.values()),roster_count=len(out),run_kind='same-draw-addendum',source_sha256=source_sha,source_note=note)
res['measurement_notes']=old['results']['measurement_notes']+[note+' GLiClass answered 1,485 of 1,500 requests; 15 HTTP 422 length refusals count as misses. Its cost is an ESTIMATE from Qwen/Qwen3.5-9B with zero generated output.'];res['addendum']={'predecessor':PREV,'new_keys':keys,'remeasured_keys':[],'repriced_keys':[mk],'link_fixed_keys':['singularity-super-decider','singularity-super-decider-thinking'],'method_change':False};put(V/f'jevbench-{REV}-results.json',res)
cat=cp(old['categories'])
for k in keys:cat['systems'][k]=cells[k]['cells_share'];cat['lanes'][k]=inputs[k]['registry']['lane']
cat.update(revision=REV,results_sha256=sha(V/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256'],results_sha256_note='Bound to v1.7.9 results; 296 carried cells retained; new cells computed with unchanged frozen tools.');put(V/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(V/f'jevbench-{PREV}-{n}.json',V/f'jevbench-{REV}-{n}.json')
tf=J/'receipts/topfive-diff.json';a=L(J/'inputs/APPROVAL.json')
if tf.exists() and not A.comparison_only:assert L(tf)['lists']==580 and not L(tf).get('bootstrap')
proof={'source_inputs':source_inputs,'schema_version':1,'revision':REV,'predecessor':{'revision':PREV,'publication_sha256':sha(V/f'jevbench-{PREV}-publication.json')},'method':res['method'],'pricing_module_sha256':'645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4','scorers':old['proof']['scorers'],'carried_rows':len(prev)-3,'carried_rows_equal_except':['rank','ranks'],'exceptions':{'launchables-myles-g-12b':'cost, composites, composite CIs and price text only','singularity-super-decider':'source_url only','singularity-super-decider-thinking':'source_url only'},'new_rows':{k:{'raw_sha256':inputs[k]['raw_sha256'],'scored_input_sha256':pins[k]['v17-share']['sha256'],'source_sha256':pins[k],'model_pin':new[k]['model_pin'],'price_reference':{'base':'Qwen/Qwen3.5-9B','listing':'qwen/qwen3.5-9b','in':0.10,'out':0.0},'axes':new[k]['axes'],'composite_ci95':new[k]['composite_ci95'],'decision_limit':new[k]['decision_limit'],'treatment':new[k]['listing']} for k in keys},'remeasured_rows':{},'repriced_rows':{mk:{'raw_sha256':sha(pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r160/v170/bases/d1012b/runs')/L(J/'inputs/MYLESG12-REGISTRY.json')[mk].get('file',mk+'.jsonl')),'registry_sha256':sha(J/'inputs/MYLESG12-REGISTRY.json'),'scored_sha256':sha(J/'scoring/share/jevbench-v1.6.0-results.json'),'vendor_price_url':'https://www.launchables.ai/docs/deploy/hosted','vendor_page_sha256':'956fa709dfa454ee108966a9a0a79ec1660e91e7047a1b8ab6a32e146c36a01e','fetched_at':'2026-10-26T17:38:00Z','source':'api','rates_per_m':[0.0020020,0.0],'measurement_changed':False}},'link_fixed_rows':['singularity-super-decider','singularity-super-decider-thinking'],'publication_approval':a,'topfive_diff_sha256':sha(tf) if tf.exists() else None}
put(V/f'jevbench-{REV}-proof.json',proof);pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json','sha256':sha(V/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']}
put(V/f'jevbench-{REV}-publication.json',pub);put(J/'receipts/REMEASURED-ROW-SPEC.json',{k:out[k] for k in [mk,'singularity-super-decider','singularity-super-decider-thinking']});put(J/'receipts/NEW-ROW-SPEC.json',new);put(J/'receipts/BUILD.json',{'revision':REV,'base':PREV,'carried_equal_except_ranks':len(prev)-3,'new_keys':keys,'remeasured_keys':[],'repriced_keys':[mk],'link_fixed_keys':['singularity-super-decider','singularity-super-decider-thinking'],'roster_count':len(out),'n_ranked':res['n_ranked'],'files':pub['files']})
print('Built PENDING',REV,len(out),'rows;',len(prev)-3,'carried equal except ranks; 1 self-hosted addition; comparison_only',A.comparison_only)

# Refresh the human-readable price delta receipt from the built row.
before_after=L(J/'receipts/MYLESG12-BEFORE-AFTER.json')
before_after['after']={f:out[mk][f] for f in before_after['after']}
put(J/'receipts/MYLESG12-BEFORE-AFTER.json',before_after)
