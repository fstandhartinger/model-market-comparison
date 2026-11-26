"""Deterministic eight-row addition (self-hosted, 22 Nov 2026 draw) from pinned aggregate scoring. No sealed reads or publication."""
import pathlib,json,copy,hashlib,shutil,re,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';REV='v1.8.22';PREV='v1.8.21';NEW_DRAW='v1.6-regular-20261122'
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();cp=copy.deepcopy
def put(p,v):
 p=pathlib.Path(p);tmp=p.with_name(p.name+'.v1822-tmp');tmp.write_text(json.dumps(v,indent=1,sort_keys=True,ensure_ascii=False)+'\n');tmp.replace(p)
NOTE='Measured on the 22 Nov 2026 draw, which is not yet equated to the reference scale; anchor runs for that draw are pending. Shown unranked until then.'
entries=L(J/'inputs/ENTRIES.json');usage=L(J/'src/usage.json');scored=L(J/'src/scored.json');cells=L(J/'src/cells.json');old={n:L(D/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','proof','publication']}
keys=sorted(entries);assert len(keys)==8 and keys==L(J/'src/new-keys.json')
HIST=L(J/'inputs/history.json')
# Literal, individually reviewed public fields; never map internal words into public prose.
public_rows=L(J/'inputs/PUBLIC-ROWS.json')
cleaned=L(J/'inputs/CLEANED-ROWS.json');exceptions=L(J/'inputs/TEXT-EXCEPTIONS.json');assert cleaned=={}
res=cp(old['results']);res['systems']=[cp(cleaned.get(r['key'],r)) for r in res['systems']]
exby={}
for e in exceptions:
 exby.setdefault(e['key'],{})[e['path']]=e
for r in res['systems']:
 for e in exby.get(r['key'],{}).values():
  assert r[e['path']]==e['before'] and hashlib.sha256(e['before'].encode()).hexdigest()==e['before_sha256'] and hashlib.sha256(e['after'].encode()).hexdigest()==e['after_sha256'];r[e['path']]=e['after']
res['not_measured']=[r for r in res['not_measured'] if r['key']!='mica-v01-4b']
assert res['not_measured']==[r for r in old['results']['not_measured'] if r['key']!='mica-v01-4b']
cat=cp(old['categories']);new={};bounds={};proofrows={}
import importlib.util,sys
H=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r230i/frozen')
assert sha(H/'score_v15.py')==old['proof']['scorers']['score_v15']
sp=importlib.util.spec_from_file_location('frozen_composite',H/'score_v15.py');S15=importlib.util.module_from_spec(sp);sys.modules['frozen_composite']=S15;sp.loader.exec_module(S15)
OPTIONS=old['results']['options']; AX=('intelligence','calibration','speed','cost')
def derived(axes):
    scores = {o: S15.composite(axes, {a: v['weights'][a] / 100 for a in AX}, float(v['intelligence_floor'])) for o, v in OPTIONS.items()}
    views = {n: S15.composite(axes, dict(zip(AX, w)), 50.0) for n, w in S15.SORT_VIEWS.items()}
    return scores, views, (None if axes['intelligence'] is None or axes['calibration'] is None else (axes['intelligence'] + axes['calibration']) / 2)
def close(a, b, tol): return (a is None and b is None) or (a is not None and b is not None and abs(a - b) < tol)
def check_unequated(row):
    # Offset 0: the frozen formula must reproduce the scorer's published numbers; the row stays exactly as scored.
    s0, v0, c0 = derived(row['axes'])
    assert all(close(s0[o], row['scores'][o], 1e-9) for o in OPTIONS) and close(c0, row['capability'], 1e-12) and close(row['jevbench_score'], row['scores']['A'], 1e-12), row['key']
    assert sorted(v0) == sorted(row['views']) and all(close(v0[n], row['views'][n], 1e-9) for n in row['views']), row['key']
baseby={r['key']:r for r in res['systems']}
drawtab=next(d for d in L(W/'data/jevbench-draw-equating.json')['draws'] if d['draw']==NEW_DRAW)
assert drawtab['status']=='anchor-runs-pending' and drawtab['offset']=={'I':0,'C':0} and drawtab['offset_ci95'] is None and drawtab['releases']==['v1.8.20',PREV,REV] and drawtab['latest_release']==REV
APUS_NOTE='Not ranked because it has no price: no public tariff or parameter count was stated, so it has no cost axis and no composite.'
apusdraw=next(d for d in L(W/'data/jevbench-draw-equating.json')['draws'] if d['draw']=='v1.6-regular-20261027')
for k in keys:
 en=entries[k]['entry'];u=usage[k];s=cp(scored[k]['v17-share']);assert s['v16']['g_med_used']==2.573387642438244==drawtab['g_med']
 assert all(f in s['decision_limit'] for f in ['n_over_limit','n_over_limit_answered_ok','speed_n','speed_basis'])
 if en['lane']=='selfhosted':
  assert abs(s['cost']['usd_per_1000']-u['cost_all'])<1e-15 and s['cost']['usd_per_1000']==(u['gpu_all'] if u['list_all'] is None else min(u['gpu_all'],u['list_all'])) and u['binding']=='gpu'
 assert s['v16']['equated'] is None and s['v16']['equating_offset'] is None
 for f in ['display','author','repo','licence','endpoint_condition','disclosure']:s[f]=public_rows[k][f]
 s['underlying']=public_rows[k]['disclosure'];s['notes']=public_rows[k]['notes'];s['base_model']=en['base_model']
 s['model_pin']=L(J/'inputs/ENTRY-PINS.json')[k]['model_pin'];s.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on=en['measured_on'],measurement_date_status='not-published',paid_fast_lane=en['paid_fast_lane'],ranked=False,rank=None,ranks={'A':None,'B':None,'C':None,'capability':None},listing='unranked',not_ranked_because=NOTE)
 s['draw']={**{f:drawtab[f] for f in ['label','drawn_on','status','offset','offset_ci95']},'id':drawtab['draw'],'release':REV,'measured_on':s['last_measured_on'],'g_med':drawtab['g_med'],'g_med_note':drawtab['g_med_note'],'results_sha256':scored[k]['pins']['v17-share']}
 if en['lane']=='api':
  summary=scored[k]['summary'];eq=summary['equated'];raw=cp(s['axes']);assert eq['offset']==apusdraw['offset'] and eq['offset_ci95']==apusdraw['offset_ci95']
  assert eq['intelligence']==min(100,max(0,raw['intelligence']+apusdraw['offset']['I'])) and eq['calibration']==min(100,max(0,raw['calibration']+apusdraw['offset']['C']))
  s['published_scores']={'axes':raw,'scores':cp(s['scores']),'capability':s['capability']}
  s['axes']={**raw,'intelligence':eq['intelligence'],'calibration':eq['calibration']};s['capability']=eq['capability']
  assert s['capability']==(s['axes']['intelligence']+s['axes']['calibration'])/2
  s['views']['Intelligence only']=eq['intelligence'];s['not_ranked_because']=APUS_NOTE;s['measurement_date_status']='measured'
  s['draw']={**{f:apusdraw[f] for f in ['label','drawn_on','status','offset','offset_ci95']},'id':apusdraw['draw'],'release':REV,'measured_on':en['measured_on'],'g_med':2.573387642438244,'results_sha256':scored[k]['pins']['v17-share']}
  s['cost']['basis']='Hosted API. Not priced: no public tariff or parameter count was stated, so there is no cost axis, composite score or rank.'
 else:
  # Cost basis: the live Starlord-4B-preview wording (v1.8.0 GPU-time rule), with this row's numbers.
  head=(f"GPU-time estimate from v1.8.0: one monthly-rented RTX PRO 6000 96 GB, USD 1.5235/hour; average load 70%. Architecture: {u['architecture_class']} {u['family']}, {u['active_b']:g}B active parameters; throughput {u['throughput']:.12g} tokens/s (architecture-class calibration, efficient-engine prefill). GPU-time cost USD {u['gpu_all']!r}/1,000; ")
  if u['list_all'] is None:
   s['cost']['basis']='GPU-time estimate only. '+head+f"base {en['base_model']} is UNLISTED in the frozen pricing snapshot, so no list-price leg exists. Applied GPU-time cost = USD {u['cost_all']!r}/1,000. Estimated, not a bill."
  else:
   s['cost']['basis']=head+f"old list-price estimate USD {u['list_all']!r}/1,000 ({u['ref']['listing']} at USD {u['ref']['in']:g}/M input and USD {u['ref']['out']:g}/M output). Applied min(old list-price estimate, GPU-time cost) = USD {u['cost_all']!r}/1,000. Estimated, not a bill."
 s['http_status']=public_rows[k]['http_status']
 if 'disclosures' in public_rows[k]:s['disclosures']=public_rows[k]['disclosures']
 if k in L(J/'src/decisive.json'):s['noul_decisive']=L(J/'src/decisive.json')[k]

 if en['lane']=='selfhosted':check_unequated(s)
 if en['lane']=='selfhosted':assert s['speed']['adjustment']=='x2 + 0.15 s (assumption, not measured)' and s['api_flag'] is False and s['endpoint_kind']=='gpu' and s['v16']['lane']=='selfhosted'
 new[k]=s;cat['systems'][k]=cells[k];cat['lanes'][k]=en['lane'];bounds[k]={dim:{category:cell['n'] for category,cell in rows.items()} for dim,rows in cells[k].items()}
 proofrows[k]={'scored_input_sha256':scored[k]['pins']['v17-share'],'model_pin':s['model_pin'],'axes':s['axes'],'composite_ci95':s['composite_ci95'],'decision_limit':s['decision_limit'],'treatment':'unranked','cost':u,'failure_treatment':'Failed or unanswered requests count as wrong answers.','code_commit':L(J/'inputs/ENTRY-PINS.json')[k]['code_commit'],'price_reference':u['ref']}
 if en['lane']=='api':proofrows[k]['equated_summary']=scored[k]['summary']['equated']
assert not set(keys)&set(baseby)
res.update(revision=REV,label='JevBench v1.8.22: eight unranked rows (six on the 22 Nov draw, two APUS on the 27 Oct draw)',systems=sorted(res['systems']+list(new.values()),key=lambda r:r['key']),roster_count=len(baseby)+len(keys),run_kind='same-draw-addendum',source_note=HIST,source_sha256=sha(J/'src/scored.json'))
res['measurement_notes']=old['results']['measurement_notes']+[HIST]
NEWDRAW_COST={'draw':NEW_DRAW,'n_items':1500,'rule':'every item of the draw counts; no common-basis exclusion (the common 1,489-item basis belongs to the 27 Oct draw)'}
res['addendum']={'predecessor':PREV,'new_keys':keys,'remeasured_keys':[],'repriced_keys':[],'link_fixed_keys':[],'text_fixed_keys':sorted(cleaned),'method_change':False,'new_draw':NEW_DRAW,'cost_basis':cp(old['results']['addendum']['cost_basis']),'new_draw_cost_basis':NEWDRAW_COST}
put(D/f'jevbench-{REV}-results.json',res)
cat.update(revision=REV,results_sha256=sha(D/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256']);put(D/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(D/f'jevbench-{PREV}-{n}.json',D/f'jevbench-{REV}-{n}.json')
proof={'schema_version':1,'revision':REV,'method':res['method'],'predecessor':{'revision':PREV,'publication_sha256':sha(D/f'jevbench-{PREV}-publication.json')},'carried_rows':len(baseby),'carried_rows_equal_except':exceptions,'exceptions':{'text_only_sha256':sha(J/'inputs/TEXT-EXCEPTIONS.json')},'new_rows':proofrows,'remeasured_rows':{},'repriced_rows':{},'scorers':old['proof']['scorers'],'pricing_module_sha256':'16f71aec341fdc5d0ed8ccab1c166f93eb7a98f1fe7440c3c4548c035f3f8ab0','pricing_authority':usage['turion-jev-4b']['ref']['authority'],'cost_basis':cp(old['proof']['cost_basis']),'new_draw':{'draw':NEW_DRAW,'status':'anchor-runs-pending','offset':{'I':0,'C':0},'g_med_fixed':2.573387642438244,'g_med_source':drawtab['g_med_note'],'cost_basis':NEWDRAW_COST,'decision_limit':{'limit_s':10.0,'treatment':'share'},'reference_params_sha256':usage['turion-jev-4b']['reference_params_sha256']},'publication_approval':L(J/'inputs/APPROVAL.json'),'equating':cp(old['proof']['equating']),'source_inputs':{f:sha(J/f) for f in ['inputs/SOURCE-PINS.json','src/scored.json','src/usage.json','src/cells.json','inputs/ENTRIES.json','inputs/ENTRY-PINS.json','inputs/PUBLIC-ROWS.json','inputs/CLEANED-ROWS.json','inputs/TEXT-EXCEPTIONS.json','inputs/ARCHITECTURE.json','inputs/PROVENANCE.json','inputs/BREAKDOWN-POLICY.json','src/decisive.json']}}
tf=J/'receipts/topfive-diff.json'
if tf.exists():proof['topfive_diff_sha256']=sha(tf)
put(D/f'jevbench-{REV}-proof.json',proof)
pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.8/jevbench-{REV}-{n}.json','sha256':sha(D/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']};put(D/f'jevbench-{REV}-publication.json',pub)
put(J/'receipts/COMPOSITE-MODULE.json',{'path':str(H/'score_v15.py'),'sha256':sha(H/'score_v15.py'),'note':'job-local byte-identical copy of the frozen module'});put(J/'receipts/NEW-ROWS.json',new);put(J/'receipts/BOUNDS.json',bounds)
subprocess.run(['python3','-B',str(J/'make_lib_v1822.py')],check=True)
print('Built PENDING v1.8.22: eight UNRANKED new rows (six 22 Nov + two APUS 27 Oct);',len(baseby),'carried rows and all order lists unchanged')
