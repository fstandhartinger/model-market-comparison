"""Independent equality and source binding against the exact base commit."""
import pathlib,json,subprocess,hashlib,sys
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';BASE=sys.argv[1] if len(sys.argv)>1 else 'a84361b60c9332cb1b61e78cc5344fee0fe5f50e'
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();put=lambda n,d:(J/'receipts'/n).write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
b=L(V/'jevbench-v1.7.21-results.json');a=L(V/'jevbench-v1.7.22-results.json');by={r['key']:r for r in a['systems']};K='umpire-35b-a3b';proof=L(V/'jevbench-v1.7.22-proof.json')
for r in b['systems']:assert by[r['key']]==r,('carried row',r['key'])
assert a['board']==b['board'] and a['n_ranked']==b['n_ranked'] and len(by)==len(b['systems'])+1==316
bc=L(V/'jevbench-v1.7.21-categories.json');ac=L(V/'jevbench-v1.7.22-categories.json')
for dim in ['systems','lanes']:
 for k,v in bc[dim].items():assert ac[dim][k]==v,(dim,k)
assert set(ac['systems'])-set(bc['systems'])=={K} and 'topics' not in ac['systems'][K]
for n in ['carry','history','history-carry']:assert (V/f'jevbench-v1.7.21-{n}.json').read_bytes()==(V/f'jevbench-v1.7.22-{n}.json').read_bytes()
immutable=[]
for v in ['v1.7.13','v1.7.14','v1.7.15','v1.7.16','v1.7.17','v1.7.18','v1.7.19','v1.7.20','v1.7.21']:
 for n in ['results','categories','carry','history','history-carry','proof','publication']:immutable.append(f'data/raw/benchmarks/jevbench/v1.7/jevbench-{v}-{n}.json')
immutable+=['lib/jevbench-v1721-release.mjs','lib/jevbench-v1715-release.mjs','lib/jevbench-v1714-release.mjs','lib/jevbench-v1713-release.mjs','lib/jevbench-cohort-merge.mjs']
for p in immutable:assert subprocess.check_output(['git','show',BASE+':'+p],cwd=W)==(W/p).read_bytes(),p
inputs=L(J/'src/inputs.json')[K];pins=L(J/'receipts/INPUTS.json');cs=L('/home/flori/jobs/jevbench-add-requests-20260919/workers/r198-v1722-build/score/private/COMMON-SET.json')
assert proof['exceptions']=={} and proof['repriced_rows']=={} and a['addendum']['repriced_keys']==[] and proof['carried_rows_equal_except']==[]
assert proof['predecessor']=={'revision':'v1.7.21','publication_sha256':sha(V/'jevbench-v1.7.21-publication.json')}
assert proof['cost_basis']['n_items']==cs['common_n']==1489 and proof['cost_basis']['set_sha256']==cs['common_set_sha256']=='4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537'
assert len(proof['cost_basis']['per_row_membership'])==11
oldproof=L(V/'jevbench-v1.7.17-proof.json')
for k,v in oldproof['cost_basis']['per_row_membership'].items():assert proof['cost_basis']['per_row_membership'][k]['raw_sha256']==v['raw_sha256'],('predecessor raw pin',k)
assert proof['cost_basis']['per_row_membership']==pins['common_set']['per_row_membership']
assert proof['cost_basis']['per_row_membership'][K]['answered_ok']-proof['cost_basis']['per_row_membership'][K]['answered_not_in_common']==1489
for mode in ['frozen','v17-off','v17-share']:
 p=pathlib.Path(pins[K][mode]['path']);assert sha(p)==pins[K][mode]['sha256'];result=L(p);assert result['v16']['cost_basis']['file_sha256']==proof['cost_basis']['cost_basis_sha256'];s=result['systems'][0]
 for f in ['axes','scores','views','capability','composite_ci95','intelligence','calibration','speed','validity','status','decision_limit','v16']:assert inputs[mode].get(f)==s.get(f),(mode,f)
for f in ['axes','scores','views','capability','jevbench_score','composite_ci95']:assert by[K][f]==inputs['v17-share'][f],f
assert by[K]['ranked'] is False and by[K]['rank'] is None and by[K]['ranks']=={'A':None,'B':None,'C':None,'capability':None} and by[K]['listing']=='unranked'
assert by[K]['status']['rows']==by[K]['v16']['n_items']==1500 and by[K]['status']['answered_ok']==1495
c=by[K]['cost'];assert abs(c['usd_per_1000']-1000*inputs['input_tokens_common']*.3125/1e6/1489)<1e-15 and c['common_basis']['n_items']==1489
assert abs(c['common_basis']['usd_per_1000_all_items']-1000*inputs['input_tokens_all']*.3125/1e6/1500)<1e-15
old=json.loads(subprocess.check_output(['git','show',BASE+':data/jevbench-draw-equating.json'],cwd=W));new=L(W/'data/jevbench-draw-equating.json')
for db,da in zip(old['draws'],new['draws']):
 if db['draw']=='v1.6-regular-20261027':assert {**da,'releases':None,'latest_release':None}=={**db,'releases':None,'latest_release':None} and da['releases']==db['releases']+['v1.7.22'] and da['latest_release']=='v1.7.22'
 else:assert da==db
put('CARRIED-ROWS.json',{'status':'PASS','carried_rows':315,'rows_equal_including_ranks':315,'carried_cells_equal':len(bc['systems']),'board_equal':True,'predecessor_bytes_equal':len(immutable),'base_commit':BASE})
put('COMMON-SET-BINDING.json',{'status':'PASS','n_items':1489,'set_sha256':cs['common_set_sha256'],'unchanged':True,'historical_membership_rows':10,'new_membership_rows':1,'frozen_at':'v1.7.16','per_row_membership':proof['cost_basis']['per_row_membership']})
print('PASS 315 carried rows fully equal, cells and orders equal;',len(immutable),'predecessor files byte-equal to base; frozen common basis bound and unchanged; new numeric payload exactly from frozen scorer')
