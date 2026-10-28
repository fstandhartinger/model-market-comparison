"""Source pins, carried-row invariants and tariff arithmetic (v1.7.15 unranked variant: Microsoft-Decision-1 round 2 unranked on the
27 Oct draw; the draw's six carried rows get the new public note). Independent of build_publication_v1715.py."""
import pathlib,json,hashlib,subprocess,sys
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();V=W/'data/raw/benchmarks/jevbench/v1.7'
# The predecessor files must equal the base commit's bytes (default = origin/main with the merged v1.7.14, c51053c3).
BASE=sys.argv[1] if len(sys.argv)>1 else 'c51053c3'
BASE=subprocess.check_output(['git','rev-parse',BASE],cwd=W,text=True).strip()
b=L(V/'jevbench-v1.7.14-results.json');a=L(V/'jevbench-v1.7.15-results.json');by={r['key']:r for r in a['systems']};pb={r['key']:r for r in b['systems']}
DRAW='v1.6-regular-20261027';K='microsoft-decision-1-r2';H2O='h2o-lightning-4b-v1.4.1'
HEAD="Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured.";TAIL="Shown unranked until then."
NOTE=HEAD+' '+TAIL
EXTRA='On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.'
note=lambda k:HEAD+(' '+EXTRA if k==H2O else '')+' '+TAIL
DK=sorted(k for k,r in pb.items() if (r.get('draw') or {}).get('id')==DRAW)
assert DK==['arcbright-elf-1-12b-r2','decisio-gemma-4-12b-tuned-commit-think',H2O,'jeff_1_1_large','jeff_1_1_qwen_4b','torchcast-decision-31b-v1.0']
# Every carried row is fully equal (ranks included); the six draw rows differ in exactly one field, not_ranked_because, = the new note.
diff={k:sorted(f for f in set(r)|set(by[k]) if r.get(f)!=by[k].get(f)) for k,r in pb.items()}
assert {k:v for k,v in diff.items() if v}=={k:['not_ranked_because'] for k in DK},{k:v for k,v in diff.items() if v}
for k in DK:
 assert by[k]['not_ranked_because']==note(k) and pb[k]['not_ranked_because']!=note(k),k
 assert by[k]['ranked'] is False and by[k]['rank'] is None and by[k]['listing']=='unranked' and by[k]['draw']['status']=='anchor-runs-pending' and by[k]['draw']['offset']=={'C':0,'I':0},k
 assert 'This draw has no subject-topic labels yet, so the row has no topic cells' in by[k]['disclosure'],(k,'topic-cell sentence kept')
proof=L(V/'jevbench-v1.7.15-proof.json')
assert sorted(proof['exceptions'])==DK and a['addendum']['text_fixed_keys']==DK and proof['text_fixed_rows']==DK
for k in DK:assert proof['exceptions'][k]=={'not_ranked_because':{'before_sha256':hashlib.sha256(pb[k]['not_ranked_because'].encode()).hexdigest(),'after_sha256':hashlib.sha256(note(k).encode()).hexdigest()}},k
assert 'equating' not in proof and proof['same_draw']['status']=='anchor-runs-pending' and proof['same_draw']['offset']=={'C':0,'I':0}
for k in ['microsoft-decision-1','h2o-lightning-4b','arcbright-elf-1-12b','decisio-gemma-4-12b-tuned-commit','jeff_1_1_medium','jeff_1_0_large']:
 assert json.dumps(by[k],sort_keys=True)==json.dumps(pb[k],sort_keys=True),k+' must stay equal'
inputs=L(J/'src/inputs.json');pins=L(J/'receipts/INPUTS.json')
assert sorted(inputs)==[K] and a['board']==b['board'] and a['n_ranked']==b['n_ranked'] and len(a['systems'])==len(b['systems'])+1==307
assert not any(x in o['order'] for o in a['board'].values() for x in DK+[K])
bc=L(V/'jevbench-v1.7.14-categories.json');ac=L(V/'jevbench-v1.7.15-categories.json')
for dim in ['systems','lanes']:
 for key,value in bc[dim].items():assert ac[dim][key]==value,(dim,key)
assert sorted(set(ac['systems'])-set(bc['systems']))==[K] and 'topics' not in ac['systems'][K]
for n in ['carry','history','history-carry']:assert (V/f'jevbench-v1.7.14-{n}.json').read_bytes()==(V/f'jevbench-v1.7.15-{n}.json').read_bytes()
for v in ['v1.7.13','v1.7.14']:
 for n in ['results','categories','carry','history','history-carry','proof','publication']:
  p=f'data/raw/benchmarks/jevbench/v1.7/jevbench-{v}-{n}.json';assert subprocess.check_output(['git','show',BASE+':'+p],cwd=W)==(W/p).read_bytes(),p
for p in ['lib/jevbench-v1714-release.mjs','lib/jevbench-v1713-release.mjs','lib/jevbench-cohort-merge.mjs']:assert subprocess.check_output(['git','show',BASE+':'+p],cwd=W)==(W/p).read_bytes(),p
assert proof['predecessor']=={'revision':'v1.7.14','publication_sha256':sha(V/'jevbench-v1.7.14-publication.json')} and L(V/'jevbench-v1.7.14-publication.json')['review']['verdict']=='PASS'
# The draw table: same status/offset/anchors as v1.7.14's, only releases/latest_release extended.
eq_b=json.loads(subprocess.check_output(['git','show',BASE+':data/jevbench-draw-equating.json'],cwd=W));eq_a=L(W/'data/jevbench-draw-equating.json')
db=next(x for x in eq_b['draws'] if x['draw']==DRAW);da=next(x for x in eq_a['draws'] if x['draw']==DRAW)
assert {**da,'releases':None,'latest_release':None}=={**db,'releases':None,'latest_release':None} and da['releases']==db['releases']+['v1.7.15'] and da['latest_release']=='v1.7.15' and da['status']=='anchor-runs-pending' and da['offset']=={'I':0,'C':0}
assert {**eq_a,'draws':None}=={**eq_b,'draws':None} and [x for x in eq_a['draws'] if x['draw']!=DRAW]==[x for x in eq_b['draws'] if x['draw']!=DRAW]
for k,v in inputs.items():
 for mode in ['frozen','v17-off','v17-share']:
  p=pathlib.Path(pins[k][mode]['path']);assert sha(p)==pins[k][mode]['sha256'];orig=next(s for s in L(p)['systems'] if s['key']==k)
  for f in ['axes','scores','views','capability','composite_ci95','intelligence','calibration','speed','validity','status','decision_limit','v16']:assert v[mode].get(f)==orig.get(f),(k,mode,f)
  assert orig['cost']['usd_per_1000']==v['usd_per_1000']
 c=by[k]['cost'];ref=proof['new_rows'][k]['price_reference']
 assert c['kind']=='tariff' and ref['kind']=='tariff' and ref['in']==0.042 and ref['out']==0.0 and abs(c['usd_per_1000']-1000*(v['input_tokens']*0.042)/1e6/1493)<1e-12 and c['common_basis'] is None
 for f in ['axes','scores','views','capability','jevbench_score','composite_ci95']:assert by[k][f]==v['v17-share'][f],(k,f,'published values, no offset')
 assert 'published_scores' not in by[k] and 'listing_note' not in by[k]
 assert by[k]['ranked'] is False and by[k]['rank'] is None and by[k]['ranks']=={'A':None,'B':None,'C':None,'capability':None} and by[k]['listing']=='unranked' and by[k]['not_ranked_because']==note(k)
 h=by[H2O]['draw'];assert {f:by[k]['draw'][f] for f in ['id','label','drawn_on','status','offset','offset_ci95']}=={f:h[f] for f in ['id','label','drawn_on','status','offset','offset_ci95']} and by[k]['draw']['release']=='v1.7.15'
 assert by[k]['paid_fast_lane'] is True and by[k]['display']=='Microsoft-Decision-1 (updated weights, Oct 2026)'
put=lambda nm,d:(J/'receipts'/nm).write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
put('CARRIED-ROWS.json',{'status':'PASS','carried_rows':len(pb),'rows_equal_including_ranks':len(pb)-len(DK),'note_only_exception':{k:['not_ranked_because'] for k in DK},'exception_rows_equal_outside_the_note':True,'board_equal':True,'n_ranked_equal':True,'new_rows_unranked':[K],
     'family_rows_equal':['microsoft-decision-1','h2o-lightning-4b','arcbright-elf-1-12b','decisio-gemma-4-12b-tuned-commit','jeff_1_1_medium','jeff_1_0_large'],'carried_cells_equal':len(bc['systems']),'immutable_bytes':['carry','history','history-carry'],'predecessor_files_equal_to_base':14,'predecessor_libs_equal_to_base':3,
     'draw_entry_only_releases_extended':True,'base_commit':BASE,'predecessor_publication_sha256':proof['predecessor']['publication_sha256'],'new_score_payloads_equal_to_sources':True,'live_round1_row_unchanged':True})
put('COST-KIND.json',{'status':'PASS','new_rows':{k:{'kind':by[k]['cost']['kind'],'usd_per_1000':by[k]['cost']['usd_per_1000'],'basis_items':1493,'input_tokens':inputs[k]['input_tokens'],'output_tokens':inputs[k]['output_tokens'],'reference':proof['new_rows'][k]['price_reference']} for k in inputs},'measured_without_bill':0,'negative_test':'r197/v1715u/check_pricing_reference_v1715.py + validate_v1715.mjs'})
print('PASS',len(pb)-len(DK),'carried rows fully equal incl. ranks (live round-1 Microsoft and family rows included); the',len(DK),'draw rows differ only in not_ranked_because (= the d1027 note, H2O with its v1.1 sentence; topic-cell sentence kept; pins match); board/n_ranked unchanged; new row unranked with published values and tariff cost; draw entry only gains v1.7.15; carry/history bytes, 14 predecessor files and 3 predecessor libs equal to',BASE[:8])
