"""Deterministic candidate from accepted aggregates and frozen ranking-review inputs. No sealed reads."""
from pathlib import Path
import json,hashlib,copy,shutil,subprocess
J=Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';REV='v1.8.18';PREV='v1.8.17';K='cue-reflex-4b-v0.2'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();cp=copy.deepcopy
def put(p,d):p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
old={n:L(D/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','proof','publication']};res=cp(old['results']);cat=cp(old['categories']);by={s['key']:s for s in res['systems']}
cfg=L(J/'inputs/RANKING-CONFIG.json');classification=L(J/'analysis/CLASSIFICATION.json');wa=L(J/'analysis/WHATIF-V1818.json')
# Every scenario already contains the all-nine production order. Removing held rows
# preserves the production order and makes a configuration change a one-list edit.
final_lists={sc:{name:[k for k in arr if k not in cfg['held']]for name,arr in lists.items()}for sc,lists in wa['primary_rankings'].items()}
def place(key,sc,name):
 arr=final_lists[sc][name];return arr.index(key)+1 if key in arr else None
T1='Measured on the 27 Oct 2026 draw and shown on the reference scale by anchor equating with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points). Not ranked yet: its top-five places lie within the uncertainty of that shift (95% interval -5.9 to +1.1 Intelligence points). Ranking follows when more anchor runs narrow the interval.'
T2='Measured on the 27 Oct 2026 draw; shown on the reference scale by anchor equating with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points; 95% interval of the Intelligence shift -5.9 to +1.1).'
HIST='Reviewed the nine rows added after the v1.8.10 ranking review using the published four-anchor equating and top-five sensitivity checks.'
s=L(J/'src/scored.json')[K];en=L(J/'inputs/ENTRIES.json')[K]['entry'];u=L(J/'src/usage.json')[K];pub=L(J/'inputs/PUBLIC-ROWS.json')[K]
for f,v in pub.items():s[f]=v
s['underlying']=pub['disclosure'];s['base_model']=en['base_model'];s['model_pin']=L(J/'inputs/ENTRY-PINS.json')['model_pin']
s.update(method='v1.7',new_in=REV,measured_in='v1.8.15',last_measured_on=en['measured_on'],measurement_date_status='measured',paid_fast_lane=True)
s['published_scores']={f:cp(s[f])for f in ['axes','scores','capability']}
eq=wa['rows'][K]['scenarios']['point'];s['axes']=cp(wa['summary'][K]['axes']);s['scores']=eq['composite'];s['capability']=eq['capability'];s['jevbench_score']=s['scores']['A']
# Equated view values were controlled against the accepted result; derive only deterministic composite views.
import importlib.util,sys
sp=importlib.util.spec_from_file_location('frozen',Path('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v15.py'));f=importlib.util.module_from_spec(sp);sys.modules['frozen']=f;sp.loader.exec_module(f)
s['views']={k:f.composite(s['axes'],dict(zip(('intelligence','calibration','speed','cost'),v)),50.) for k,v in f.SORT_VIEWS.items()}
draw=next(r['draw']for r in res['systems']if r.get('draw',{}).get('id')=='v1.6-regular-20261027');s['draw']={**{k:cp(draw[k])for k in ['id','label','drawn_on','status','offset','offset_ci95']},'release':REV,'measured_on':s['last_measured_on'],'g_med':2.573387642438244,'results_sha256':L(J/'receipts/CATEGORY-CONTROL.json')['scorer_output_sha256'],'ci_basis':'measured on the draw before equating'}
by[K]=s;res['systems']=sorted(list(by.values()),key=lambda x:x['key']);cat['systems'][K]=L(J/'src/cells.json')[K];cat['lanes'][K]='selfhosted'
for k in classification:
 row=by[k];ranked=k in cfg['ranked'];row['ranked']=ranked;row['listing']='ranked'if ranked else'unranked'
 row.pop('not_ranked_because',None);row.pop('listing_note',None)
 if ranked:
  row['listing_note']=T2
  if classification[k]['T3']:
   assert list(classification[k]['point_boundary_places'])==['open/composites/B']
   row['listing_note']+=' Its #5 place on the open-weights Composite B list is within the uncertainty of the draw shift.'
 else:row['not_ranked_because']=T1
# Named carried notes are checked on the final all-nine field, never on a partial proposal.
notes=[]
for k,row in by.items():
 if k in classification or ' Its #'not in row.get('listing_note',''):continue
 before=row['listing_note'];named=['all/composites/B']if k=='karpo_decision_31b'else['open/composites/A','open/composites/C']if k=='arcbright-elf-1-12b-r2'else None
 assert named is not None,'unhandled carried place-naming note'
 point={n:place(k,'point',n)for n in named};boundary=[n for n in named if point[n]and point[n]<=5 and any((place(k,sc,n) or 999)>5 for sc in wa['robust_scenarios'])]
 after=before.split(' Its #')[0]
 if boundary:
  assert len(set(point[n]for n in boundary))==1
  n=point[boundary[0]]
  suffix=f'Its #{n} place on Composite B among all systems is within the uncertainty of the draw shift.'if k=='karpo_decision_31b'else f'Its #{n} place on the open-weights Composite A and C lists is within the uncertainty of the draw shift.'
  after+=' '+suffix
 row['listing_note']=after
 if before!=after:notes.append({'key':k,'path':'listing_note','before':before,'after':after,'named_point_places':{n:point[n]for n in named},'remaining_boundary_places':boundary})
put(J/'inputs/TEXT-EXCEPTIONS.json',notes)
# Stable order uses the same production list inputs and tie order as the frozen WHATIF.
for metric,b in res['board'].items():
 expected=final_lists['point']['release/'+metric]
 init=[k for k in old['results']['board'][metric]['order']if by[k]['ranked']]+[k for k in cfg['ranked']if k not in old['results']['board'][metric]['order']]
 pos={k:i for i,k in enumerate(init)};value=lambda k:by[k]['capability']if metric=='capability'else by[k]['scores'][metric]
 b['order']=sorted(init,key=lambda k:(-value(k),pos[k]));assert b['order']==expected
for row in res['systems']:
 row['ranks']={m:res['board'][m]['order'].index(row['key'])+1 if row['key']in res['board'][m]['order']else None for m in ['A','B','C','capability']};row['rank']=row['ranks']['A']
res.update(revision=REV,label='JevBench v1.8.18: ranking review and Cue-Reflex-4B v0.2',roster_count=len(by),n_ranked=sum(x['ranked']for x in by.values()),run_kind='same-draw-addendum',source_note=HIST,source_sha256=sha(J/'src/scored.json'))
assert res['n_ranked']==cfg['n_ranked']
res['measurement_notes']=old['results']['measurement_notes']+[HIST]
res['addendum']={**cp(old['results']['addendum']),'predecessor':PREV,'new_keys':[K],'text_fixed_keys':[n['key']for n in notes],'rank_review_keys':sorted(classification),'remeasured_keys':[],'repriced_keys':[],'link_fixed_keys':[]}
put(D/f'jevbench-{REV}-results.json',res);cat.update(revision=REV,results_sha256=sha(D/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256']);put(D/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(D/f'jevbench-{PREV}-{n}.json',D/f'jevbench-{REV}-{n}.json')
new={K:s};bounds={K:{dim:{k:c['n']for k,c in vals.items()}for dim,vals in cat['systems'][K].items()}}
proof={'schema_version':1,'revision':REV,'method':res['method'],'predecessor':{'revision':PREV,'publication_sha256':sha(D/f'jevbench-{PREV}-publication.json')},'carried_rows':len(old['results']['systems']),'carried_rows_equal_except':{'all':'rank and ranks','reviewed_rows':['ranked','listing','not_ranked_because','listing_note'],'carried_text':notes},'exceptions':{'text_only_sha256':sha(J/'inputs/TEXT-EXCEPTIONS.json'),'base_overlay_keys':['starlord-4b-preview']},'new_rows':{K:{'scored_input_sha256':s['draw']['results_sha256'],'model_pin':s['model_pin'],'axes':s['axes'],'composite_ci95':s['composite_ci95'],'decision_limit':s['decision_limit'],'cost':u,'treatment':'ranked'if s['ranked']else'unranked'}},'rank_review':{'configuration':cfg,'whatif_sha256':sha(J/'analysis/WHATIF-V1818.json'),'classification_sha256':sha(J/'analysis/CLASSIFICATION.json'),'fairness_review':L(J/'inputs/APPROVAL.json').get('fairness_review_verdict','PENDING')},'remeasured_rows':{},'repriced_rows':{},'scorers':old['proof']['scorers'],'pricing_module_sha256':old['proof']['pricing_module_sha256'],'cost_basis':old['proof']['cost_basis'],'equating':old['proof']['equating'],'publication_approval':L(J/'inputs/APPROVAL.json'),'source_inputs':{f:sha(J/f)for f in ['src/scored.json','src/usage.json','src/cells.json','inputs/ENTRIES.json','inputs/ENTRY-PINS.json','inputs/PUBLIC-ROWS.json','inputs/TEXT-EXCEPTIONS.json','inputs/ARCHITECTURE.json','inputs/PROVENANCE.json','inputs/BREAKDOWN-POLICY.json','inputs/RANKING-CONFIG.json']}}
put(D/f'jevbench-{REV}-proof.json',proof)
manifest=cp(old['publication']);manifest.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});manifest['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.8/jevbench-{REV}-{n}.json','sha256':sha(D/f'jevbench-{REV}-{n}.json')}for n in ['results','categories','carry','proof','history','history-carry']};put(D/f'jevbench-{REV}-publication.json',manifest)
put(J/'receipts/NEW-ROWS.json',new);put(J/'receipts/BOUNDS.json',bounds);put(J/'inputs/history.json',HIST)
subprocess.run(['python3','-B',str(J/'make_lib_v1818.py')],check=True)
print('Built PENDING v1.8.18:',len(by),'rows;',res['n_ranked'],'ranked;',len(notes),'carried T3 edits')
