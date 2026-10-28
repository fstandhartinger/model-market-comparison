"""Source pins, carried-row invariants, common-set binding and cost arithmetic (v1.7.16: Strike-1 unranked on the 27 Oct draw + the
same-items cost rule on that draw). Independent of build_publication_v1716.py: re-derives every expectation from the v1.7.15 bytes at the
base commit, the scorer outputs (old and new fields) and the private common-set receipt (aggregates only)."""
import pathlib,json,hashlib,subprocess,sys,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();V=W/'data/raw/benchmarks/jevbench/v1.7'
hj=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
# The predecessor files must equal the base commit's bytes (default = origin/main with the merged v1.7.15, ba210893).
BASE=sys.argv[1] if len(sys.argv)>1 else 'ba210893'
BASE=subprocess.check_output(['git','rev-parse',BASE],cwd=W,text=True).strip()
b=L(V/'jevbench-v1.7.15-results.json');a=L(V/'jevbench-v1.7.16-results.json');by={r['key']:r for r in a['systems']};pb={r['key']:r for r in b['systems']}
DRAW='v1.6-regular-20261027';K='strike-1';H2O='h2o-lightning-4b-v1.4.1';MS='microsoft-decision-1-r2'
HEAD="Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured.";TAIL="Shown unranked until then."
EXTRA='On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.'
note=lambda k:HEAD+(' '+EXTRA if k==H2O else '')+' '+TAIL
COST_FIELDS={'axes','composite_ci95','cost','jevbench_score','scores','v16','views'}
DK=sorted(k for k,r in pb.items() if (r.get('draw') or {}).get('id')==DRAW)
assert DK==['arcbright-elf-1-12b-r2','decisio-gemma-4-12b-tuned-commit-think',H2O,'jeff_1_1_large','jeff_1_1_qwen_4b',MS,'torchcast-decision-31b-v1.0']
# ---- common set (private receipt; aggregates only) and the scorer outputs it was applied with
B=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r197/v1716/score');P=B/'private';F=B/'field'
cs=L(P/'COMMON-SET.json');cc=L(F/'COMMON-COSTS.json');N=cs['common_n']
cb=L(P/'cost-basis-v1716.json');cbm=L(P/'cost-basis-v1716-msft.json')
assert sha(P/'cost-basis-v1716.json')==cs['cost_basis_sha256'] and sha(P/'cost-basis-v1716-msft.json')==cs['cost_basis_msft_sha256']
assert len(cb['exclude_opaque_ids'])==1500-N==11 and len(cbm['exclude_opaque_ids'])==1493-N==4 and set(cbm['exclude_opaque_ids'])<=set(cb['exclude_opaque_ids'])
proof=L(V/'jevbench-v1.7.16-proof.json');CB=proof['cost_basis']
assert (CB['n_items'],CB['set_sha256'],CB['cost_basis_sha256'],CB['cost_basis_msft_view_sha256'],CB['scorer_flag'])==(N,cs['common_set_sha256'],cs['cost_basis_sha256'],cs['cost_basis_msft_sha256'],'--cost-basis')
assert a['addendum']['cost_basis']['set_sha256']==cs['common_set_sha256'] and a['addendum']['cost_basis']['n_items']==N
mem=CB['per_row_membership'];assert sorted(mem)==sorted(DK+[K])
for k,m in mem.items():
 r=cs['rows'][k];assert m=={'answered_ok':r['ok'],'rows':r['rows'],'answered_not_in_common':r['answered_not_in_common'],'raw_sha256':r['raw_sha256']} and r['common_subset_of_ok'],k
 assert r['ok']-r['answered_not_in_common']==N,('every row answered every common item',k)
# raw pins of the membership equal the pins every earlier release recorded for these rows
for k in DK:
 if k!=MS:assert mem[k]['raw_sha256'] in json.dumps(L(V/('jevbench-v1.7.13-proof.json' if k==H2O else 'jevbench-v1.7.14-proof.json'))['new_rows'][k]),k
assert mem[MS]['raw_sha256']==L(V/'jevbench-v1.7.15-proof.json')['new_rows'][MS]['raw_sha256'] and mem[K]['raw_sha256']==proof['new_rows'][K]['raw_sha256']
# ---- carried rows: 300 fully equal; the 7 draw rows differ only in cost fields (+ MS disclosure ITEMS sentence), pinned by hash
diff={k:sorted(f for f in set(r)|set(by[k]) if r.get(f)!=by[k].get(f)) for k,r in pb.items()}
for k,v in diff.items():
 if k in DK:assert set(v)<=COST_FIELDS|({'disclosure'} if k==MS else set()) and {'cost','axes','scores'}<=set(v),(k,v)
 else:assert not v,(k,v)
assert sorted(proof['exceptions'])==DK
for k in DK:
 n,p=by[k],pb[k]
 assert proof['exceptions'][k]=={f:{'before_sha256':hj(p.get(f)),'after_sha256':hj(n.get(f))} for f in diff[k]},k
 for f in ['intelligence','calibration','speed']:assert n['axes'][f]==p['axes'][f],(k,f)
 for f in ['capability','intelligence','calibration','speed','validity','status','decision_limit','ranked','rank','ranks','listing','not_ranked_because','draw','noul_decisive']:assert n.get(f)==p.get(f),(k,f)
 assert {x:y for x,y in n['v16'].items() if x!='ci95'}=={x:y for x,y in p['v16'].items() if x!='ci95'} and {x:y for x,y in n['v16']['ci95'].items() if x!='composite'}=={x:y for x,y in p['v16']['ci95'].items() if x!='composite'},k
 c=cc['rows'][k];usd_all=p['cost']['usd_per_1000']
 assert n['cost']['common_basis']=={'n_items':N,'rule':'common','usd_per_1000_all_items':usd_all} and abs(n['cost']['usd_per_1000']-c['usd_per_1000_common'])<1e-15
 assert {x:y for x,y in n['cost'].items() if x not in ('usd_per_1000','basis','common_basis')}=={x:y for x,y in p['cost'].items() if x not in ('usd_per_1000','basis','common_basis')},k
 # cost arithmetic: tokens on the common set x the row's own reference / N
 ref_in=c['price_in_per_m'];ref_out=c['price_out_per_m']
 assert abs(n['cost']['usd_per_1000']-1000*(c['common_input_tokens']*ref_in+c['common_output_tokens']*ref_out)/1e6/N)<1e-15,k
 # the new scorer view: published cost-dependent fields = the re-scored share view; non-cost fields equal the old view
 f_=c and ('f13' if k==H2O else 'fms' if k==MS else 'f14');s=next(x for x in L(F/f_/'out-v17-share/jevbench-v1.6.0-results.json')['systems'] if x['key']==k)
 for f in ['axes','scores','views','jevbench_score','composite_ci95']:assert n[f]==s[f],(k,f)
 assert n['v16']['ci95']['composite']==s['v16']['ci95']['composite'] and abs(s['cost']['usd_per_1000']-n['cost']['usd_per_1000'])<1e-15
 # basis text: the exact same-items sentence with the published all-items figure
 sent=f"Cost on the {N:,} items every row on this draw answered (same-items rule); all-items cost USD {usd_all:.6f} per 1,000 decisions."
 assert n['cost']['basis'].count(sent)==1 and f"COST FIGURES: USD {n['cost']['usd_per_1000']:.6f} per 1,000 decisions, {n['cost']['usd_per_1000']/0.06459465517241379:.2f}x the official cost cap USD 0.064595." in n['cost']['basis'],k
 assert 'every row on this draw is costed on all 1,500 items' not in n['cost']['basis'] and 'no common cost basis applies' not in n['cost']['basis'],k
 # the rest of the basis text is the predecessor's: removing the figures sentences gives the same prefix
 assert n['cost']['basis'].split('COST FIGURES:')[0]==p['cost']['basis'].split('COST FIGURES:')[0] if k!=MS else n['cost']['basis'].split('provider-reported usage')[0]==p['cost']['basis'].split('provider-reported usage')[0],k
 assert n['ranked'] is False and n['rank'] is None and n['listing']=='unranked' and n['not_ranked_because']==note(k) and n['draw']['status']=='anchor-runs-pending' and n['draw']['offset']=={'C':0,'I':0},k
 assert 'This draw has no subject-topic labels yet, so the row has no topic cells' in n['disclosure'],(k,'topic-cell sentence kept')
assert by[MS]['disclosure']==pb[MS]['disclosure'].replace('so every score, the speed and the cost are computed on those 1,493 items.','so every score and the speed are computed on those 1,493 items; the cost uses the 1,489 items every row on this draw answered (same-items rule).')
assert a['addendum']['repriced_keys']==DK and a['addendum']['text_fixed_keys']==[] and proof['text_fixed_rows']==[] and sorted(proof['repriced_rows'])==DK
assert 'equating' not in proof and proof['same_draw']['status']=='anchor-runs-pending' and proof['same_draw']['offset']=={'C':0,'I':0}
for k in ['microsoft-decision-1','h2o-lightning-4b','arcbright-elf-1-12b','decisio-gemma-4-12b-tuned-commit','jeff_1_1_medium','jeff_1_0_large']:
 assert json.dumps(by[k],sort_keys=True)==json.dumps(pb[k],sort_keys=True),k+' must stay equal'
inputs=L(J/'src/inputs.json');pins=L(J/'receipts/INPUTS.json')
assert sorted(inputs)==[K] and a['board']==b['board'] and a['n_ranked']==b['n_ranked'] and len(a['systems'])==len(b['systems'])+1==308
assert not any(x in o['order'] for o in a['board'].values() for x in DK+[K])
bc=L(V/'jevbench-v1.7.15-categories.json');ac=L(V/'jevbench-v1.7.16-categories.json')
for dim in ['systems','lanes']:
 for key,value in bc[dim].items():assert ac[dim][key]==value,(dim,key)
assert sorted(set(ac['systems'])-set(bc['systems']))==[K] and 'topics' not in ac['systems'][K]
for n_ in ['carry','history','history-carry']:assert (V/f'jevbench-v1.7.15-{n_}.json').read_bytes()==(V/f'jevbench-v1.7.16-{n_}.json').read_bytes()
for v in ['v1.7.13','v1.7.14','v1.7.15']:
 for n_ in ['results','categories','carry','history','history-carry','proof','publication']:
  p_=f'data/raw/benchmarks/jevbench/v1.7/jevbench-{v}-{n_}.json';assert subprocess.check_output(['git','show',BASE+':'+p_],cwd=W)==(W/p_).read_bytes(),p_
for p_ in ['lib/jevbench-v1715-release.mjs','lib/jevbench-v1714-release.mjs','lib/jevbench-v1713-release.mjs','lib/jevbench-cohort-merge.mjs']:assert subprocess.check_output(['git','show',BASE+':'+p_],cwd=W)==(W/p_).read_bytes(),p_
assert proof['predecessor']=={'revision':'v1.7.15','publication_sha256':sha(V/'jevbench-v1.7.15-publication.json')} and L(V/'jevbench-v1.7.15-publication.json')['review']['verdict']=='PASS'
# The draw table: same status/offset/anchors as v1.7.15's, only releases/latest_release extended.
eq_b=json.loads(subprocess.check_output(['git','show',BASE+':data/jevbench-draw-equating.json'],cwd=W));eq_a=L(W/'data/jevbench-draw-equating.json')
db=next(x for x in eq_b['draws'] if x['draw']==DRAW);da=next(x for x in eq_a['draws'] if x['draw']==DRAW)
assert {**da,'releases':None,'latest_release':None}=={**db,'releases':None,'latest_release':None} and da['releases']==db['releases']+['v1.7.16'] and da['latest_release']=='v1.7.16' and da['status']=='anchor-runs-pending' and da['offset']=={'I':0,'C':0}
assert {**eq_a,'draws':None}=={**eq_b,'draws':None} and [x for x in eq_a['draws'] if x['draw']!=DRAW]==[x for x in eq_b['draws'] if x['draw']!=DRAW]
# ---- the new row
for k,v in inputs.items():
 for mode in ['frozen','v17-off','v17-share']:
  p_=pathlib.Path(pins[k][mode]['path']);assert sha(p_)==pins[k][mode]['sha256'];orig=next(s for s in L(p_)['systems'] if s['key']==k)
  for f in ['axes','scores','views','capability','composite_ci95','intelligence','calibration','speed','validity','status','decision_limit','v16']:assert v[mode].get(f)==orig.get(f),(k,mode,f)
  assert orig['cost']['usd_per_1000']==v['usd_per_1000']
 c=by[k]['cost'];ref=proof['new_rows'][k]['price_reference'];cr=cc['rows'][k]
 assert c['kind']=='estimate' and ref['kind']=='estimate' and ref['listing']=='deepinfra:Qwen/Qwen3.5-4B' and ref['in']==0.03 and ref['out']==0.15
 assert abs(c['usd_per_1000']-1000*(cr['common_input_tokens']*0.03)/1e6/N)<1e-12 and cr['common_output_tokens']==0 and c['common_basis']=={'n_items':N,'rule':'common','usd_per_1000_all_items':v['usd_per_1000_all_items']}
 assert abs(v['usd_per_1000_all_items']-1000*(v['input_tokens_all']*0.03)/1e6/1500)<1e-12
 for f in ['axes','scores','views','capability','jevbench_score','composite_ci95']:assert by[k][f]==v['v17-share'][f],(k,f,'published values, no offset')
 assert 'published_scores' not in by[k] and 'listing_note' not in by[k]
 assert by[k]['ranked'] is False and by[k]['rank'] is None and by[k]['ranks']=={'A':None,'B':None,'C':None,'capability':None} and by[k]['listing']=='unranked' and by[k]['not_ranked_because']==note(k)
 h=by[H2O]['draw'];assert {f:by[k]['draw'][f] for f in ['id','label','drawn_on','status','offset','offset_ci95']}=={f:h[f] for f in ['id','label','drawn_on','status','offset','offset_ci95']} and by[k]['draw']['release']=='v1.7.16'
 assert by[k]['paid_fast_lane'] is False and by[k]['display']=='Strike-1' and by[k]['status']=={'answered_ok':1495,'missing':0,'rows':1500,'status':'complete'}
put=lambda nm,d:(J/'receipts'/nm).write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
put('CARRIED-ROWS.json',{'status':'PASS','carried_rows':len(pb),'rows_equal_including_ranks':len(pb)-len(DK),'cost_only_exception':{k:diff[k] for k in DK},'exception_rows_equal_outside_the_cost_fields':True,'board_equal':True,'n_ranked_equal':True,'new_rows_unranked':[K],
     'family_rows_equal':['microsoft-decision-1','h2o-lightning-4b','arcbright-elf-1-12b','decisio-gemma-4-12b-tuned-commit','jeff_1_1_medium','jeff_1_0_large'],'carried_cells_equal':len(bc['systems']),'immutable_bytes':['carry','history','history-carry'],'predecessor_files_equal_to_base':21,'predecessor_libs_equal_to_base':4,
     'draw_entry_only_releases_extended':True,'base_commit':BASE,'predecessor_publication_sha256':proof['predecessor']['publication_sha256'],'new_score_payloads_equal_to_sources':True,'live_round1_row_unchanged':True})
put('COMMON-SET-BINDING.json',{'status':'PASS','n_items':N,'set_sha256':cs['common_set_sha256'],'set_hash_rule':cs['set_hash_rule'],'excluded_from_1500':1500-N,'excluded_from_msft_view':1493-N,'exclusion_pattern_counts':cs['exclusion_pattern_counts'],
     'per_row_membership':mem,'cost_basis_sha256':cs['cost_basis_sha256'],'cost_basis_msft_view_sha256':cs['cost_basis_msft_sha256'],'every_row_answered_every_common_item':True,'raw_pins_match_earlier_releases':True})
put('COST-KIND.json',{'status':'PASS','new_rows':{k:{'kind':by[k]['cost']['kind'],'usd_per_1000':by[k]['cost']['usd_per_1000'],'basis_items':N,'input_tokens_common':inputs[k]['input_tokens_common'],'output_tokens':0,'reference':proof['new_rows'][k]['price_reference']} for k in inputs},
     'recosted_rows':{k:{'usd_per_1000_all_items':pb[k]['cost']['usd_per_1000'],'usd_per_1000_common':by[k]['cost']['usd_per_1000'],'kind':by[k]['cost']['kind']} for k in DK},'measured_without_bill':0,'negative_test':'r197/v1716/check_pricing_reference_v1716.py + validate_v1716.mjs'})
print('PASS',len(pb)-len(DK),'carried rows fully equal incl. ranks (live round-1 Microsoft and family rows included); the',len(DK),'draw rows differ only in cost fields (Microsoft r2 also its ITEMS sentence), hash-pinned, re-derived from the --cost-basis scorer views and the common-set arithmetic; common set',N,'items sha',cs['common_set_sha256'][:8],'bound (membership of all 8 rows); board/n_ranked unchanged; new row unranked with published values and estimate cost; draw entry only gains v1.7.16; carry/history bytes, 21 predecessor files and 4 predecessor libs equal to',BASE[:8])
