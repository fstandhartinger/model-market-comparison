"""Deterministic two-row addition (hosted APIs, 600-item supplementary set) from pinned aggregate scoring. No sealed reads or publication.
Both rows are priced and unranked: Intelligence, Calibration and the composite are null (no equated reference for this set)."""
import pathlib,json,copy,hashlib,shutil,re,subprocess,importlib.util,sys
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';REV='v1.8.24';PREV='v1.8.23'
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();cp=copy.deepcopy
def put(p,v):
 p=pathlib.Path(p);tmp=p.with_name(p.name+'.v1824-tmp');tmp.write_text(json.dumps(v,indent=1,sort_keys=True,ensure_ascii=False)+'\n');tmp.replace(p)
NOTE=L(J/'inputs/NOT-RANKED-TEXT.json')['NOTE']
assert NOTE=="Measured on a 600-item supplementary set (300 sealed and 300 public items). This set has no equated reference yet, so Intelligence, Calibration and the composite score are not shown and the row is not ranked."
entries=L(J/'inputs/ENTRIES.json');usage=L(J/'src/usage.json');scored=L(J/'src/scored.json');cells=L(J/'src/cells.json');old={n:L(D/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','proof','publication']}
keys=sorted(entries);assert keys==['alibaba-decision-model-sg','urun-sense'] and keys==L(J/'src/new-keys.json')
HIST=L(J/'inputs/history.json');public_rows=L(J/'inputs/PUBLIC-ROWS.json');pins=L(J/'inputs/ENTRY-PINS.json')
cleaned=L(J/'inputs/CLEANED-ROWS.json');exceptions=L(J/'inputs/TEXT-EXCEPTIONS.json');assert cleaned=={} and exceptions==[]
res=cp(old['results']);cat=cp(old['categories']);new={};bounds={};proofrows={}
H=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r230i/frozen')
assert sha(H/'score_v15.py')==old['proof']['scorers']['score_v15']
sp=importlib.util.spec_from_file_location('frozen_composite',H/'score_v15.py');S15=importlib.util.module_from_spec(sp);sys.modules['frozen_composite']=S15;sp.loader.exec_module(S15)
baseby={r['key']:r for r in res['systems']};assert not set(keys)&set(baseby)
# Fields of the scorer row that would show unequated Intelligence/Calibration or internal counts; the artifact keeps them, the page row does not.
WITHHELD=['intelligence','calibration','validity','planned_weight_denominator','addendum']
for k in keys:
 en=entries[k]['entry'];u=usage[k];pr=public_rows[k];s=cp(scored[k]['v17-share']);art=cp(s)
 assert s['key']==k and s['ranked'] is False and s['rank'] is None and s['api_flag'] is True and s['endpoint_kind']=='api' and s['api_subset'] is True and s['v16']['lane']=='api' and s['v16']['api_subset_tag']=='A2' and s['v16']['n_items']==600
 assert s['axes']['intelligence'] is None and s['axes']['calibration'] is None and s['capability'] is None and s['jevbench_score'] is None and s['composite_ci95'] is None and all(v is None for v in s['scores'].values()) and all(v is None for v in s['views'].values())
 assert s['v16']['equated'] is None and s['v16']['equating_offset'] is None and s['v16']['g_med_used'] is None
 assert s['decision_limit']['speed_n']==600 and s['decision_limit']['n_over_limit']==0 and s['speed']['n']==600 and s['speed']['adjustment']=='none (API)'
 assert s['status']['rows']==600 and s['status']['answered_ok']==sum(pr['http_status'].values())-pr['http_status'].get('502',0)==u['ok_rows']
 assert u['n_items']==600 and u['non_ok_rows_in_denominator']==600-u['ok_rows'] and u['base_model'] is None and en['base_model'] is None
 # Release cost = the installed frozen pricing table's exact figure (cost proof), not the artifact's legacy override.
 ca=u['cost_axis'];assert S15.cost_score(ca['artifact_usd_per_1000'])==ca['artifact_axis']==s['axes']['cost'] and abs(s['cost']['usd_per_1000']-u['cost_all'])<1e-8
 s['cost']={'basis':pr['cost_basis'],'common_basis':None,'kind':'tariff','usage_estimated_rows':0,'usd_per_1000':u['cost_all']}
 s['axes']=dict(s['axes'],cost=S15.cost_score(u['cost_all']));assert s['axes']['cost']==ca['exact_axis']
 for f in WITHHELD:s.pop(f,None)
 s['v16'].pop('raw_on_A',None)
 s['v16']['equating_flag']=NOTE;s['v16']['metric_basis']='Supplementary set of 600 items: 300 sealed and 300 public (API lane; not equated)'
 s['status']={'status':'complete'}
 # No licence key: the providers state none for the model (precedent: microsoft-decision-1-r2, strike-1 carry no licence); none is asserted.
 for f in ['display','author','repo','endpoint_condition','disclosure']:s[f]=pr[f]
 s.pop('licence',None)
 s['underlying']=pr['disclosure'];s['notes']=pr['notes'];s['base_model']=en['base_model'];s['http_status']=pr['http_status']
 s['model_pin']=pins[k]['model_pin']
 s.update(method='v1.7',new_in=REV,measured_in=REV,last_measured_on=en['measured_on'],measurement_date_status='measured',paid_fast_lane=en['paid_fast_lane'],ranked=False,rank=None,ranks={'A':None,'B':None,'C':None,'capability':None},listing='unranked',not_ranked_because=NOTE)
 new[k]=s;cat['systems'][k]=cells[k];cat['lanes'][k]=en['lane'];bounds[k]={dim:{category:cell['n'] for category,cell in rows.items()} for dim,rows in cells[k].items()}
 proofrows[k]={'scored_input_sha256':scored[k]['pins']['v17-share'],'source_results_sha256':scored[k]['pins']['results'],'model_pin':s['model_pin'],'axes':s['axes'],'composite_ci95':s['composite_ci95'],'decision_limit':s['decision_limit'],'treatment':'unranked','cost':u,'http_status':s['http_status'],'failure_treatment':'Failed or unanswered requests count as wrong answers.','code_commit':pins[k]['code_commit'],'withheld_fields':sorted(WITHHELD)+['v16.raw_on_A'],'artifact_internal_not_ranked_because_replaced_by_public_text':art['not_ranked_because']!=NOTE}
res.update(revision=REV,label='JevBench v1.8.24: two unranked, priced hosted API rows on a supplementary set',systems=sorted(res['systems']+list(new.values()),key=lambda r:r['key']),roster_count=len(baseby)+len(keys),run_kind='api-supplement-addendum',source_note=HIST,source_sha256=sha(J/'src/scored.json'))
res['measurement_notes']=old['results']['measurement_notes']+[HIST]
SUPP={'n_items':600,'sealed_items':300,'public_items':300,'rule':'every one of the 600 items counts in cost and speed; failed requests stay in the denominator','equated':False}
res['addendum']={'predecessor':PREV,'new_keys':keys,'remeasured_keys':[],'repriced_keys':[],'link_fixed_keys':[],'text_fixed_keys':[],'method_change':False,'cost_basis':cp(old['results']['addendum']['cost_basis']),'supplement':SUPP}
put(D/f'jevbench-{REV}-results.json',res)
cat.update(revision=REV,results_sha256=sha(D/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256']);put(D/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(D/f'jevbench-{PREV}-{n}.json',D/f'jevbench-{REV}-{n}.json')
proof={'schema_version':1,'revision':REV,'method':res['method'],'predecessor':{'revision':PREV,'publication_sha256':sha(D/f'jevbench-{PREV}-publication.json')},'carried_rows':len(baseby),'carried_rows_equal_except':exceptions,'exceptions':{'text_only_sha256':sha(J/'inputs/TEXT-EXCEPTIONS.json')},'new_rows':proofrows,'remeasured_rows':{},'repriced_rows':{},'scorers':old['proof']['scorers'],'pricing_module_sha256':old['proof']['pricing_module_sha256'],'api_pricing_module_sha256':usage[keys[0]]['api_pricing_v15_sha256'],'pricing_authority':'installed frozen API pricing table; operator standard launch list price (interpretation I-1), input tokens only','cost_basis':cp(old['proof']['cost_basis']),'supplement':{**SUPP,'status':'no equated reference; Intelligence, Calibration and composite are null','decision_limit':{'limit_s':10,'treatment':'share'}},'publication_approval':L(J/'inputs/APPROVAL.json'),'equating':cp(old['proof']['equating']),'source_inputs':{f:sha(J/f) for f in ['inputs/SOURCE-PINS.json','src/scored.json','src/usage.json','src/cells.json','inputs/ENTRIES.json','inputs/ENTRY-PINS.json','inputs/PUBLIC-ROWS.json','inputs/NOT-RANKED-TEXT.json','inputs/CLEANED-ROWS.json','inputs/TEXT-EXCEPTIONS.json','inputs/ARCHITECTURE.json','inputs/PROVENANCE.json','inputs/BREAKDOWN-POLICY.json']}}
tf=J/'receipts/topfive-diff.json'
if tf.exists():proof['topfive_diff_sha256']=sha(tf)
put(D/f'jevbench-{REV}-proof.json',proof)
pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.8/jevbench-{REV}-{n}.json','sha256':sha(D/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']};put(D/f'jevbench-{REV}-publication.json',pub)
put(J/'receipts/COMPOSITE-MODULE.json',{'path':str(H/'score_v15.py'),'sha256':sha(H/'score_v15.py'),'note':'job-local byte-identical copy of the frozen module'});put(J/'receipts/NEW-ROWS.json',new);put(J/'receipts/BOUNDS.json',bounds)
subprocess.run(['python3','-B',str(J/'make_lib_v1824.py')],check=True)
print('Built PENDING v1.8.24: two UNRANKED priced hosted API rows;',len(baseby),'carried rows and all order lists unchanged')
