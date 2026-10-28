"""Source pins, carried-row invariants and priced-input arithmetic (v1.7.14: five unranked rows on v1.7.13's draw)."""
import pathlib,json,hashlib,subprocess,sys
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();V=W/'data/raw/benchmarks/jevbench/v1.7'
# The predecessor files must equal the base commit's bytes (restack_v1714.sh passes the new base; default = the v1.7.13 candidate).
BASE=sys.argv[1] if len(sys.argv)>1 else '0defb755'
BASE=subprocess.check_output(['git','rev-parse',BASE],cwd=W,text=True).strip()
b=L(V/'jevbench-v1.7.13-results.json');a=L(V/'jevbench-v1.7.14-results.json');by={r['key']:r for r in a['systems']}
# Unranked release: every carried row is fully equal (ranks included) and the board is the predecessor's.
for r in b['systems']:assert r==by[r['key']],r['key']
for k in ['h2o-lightning-4b-v1.4.1','h2o-lightning-4b','arcbright-elf-1-12b','decisio-gemma-4-12b-tuned-commit','jeff_1_1_medium','jeff_1_0_large']:
 assert json.dumps(by[k],sort_keys=True)==json.dumps(next(r for r in b['systems'] if r['key']==k),sort_keys=True),k+' must stay equal'
inputs=L(J/'src/inputs.json');entries=L(J/'inputs/ENTRIES.json');pins=L(J/'receipts/INPUTS.json')
assert a['board']==b['board'] and a['n_ranked']==b['n_ranked'] and len(a['systems'])==len(b['systems'])+len(inputs)==306
bc=L(V/'jevbench-v1.7.13-categories.json');ac=L(V/'jevbench-v1.7.14-categories.json')
for dim in ['systems','lanes']:
 for key,value in bc[dim].items():assert ac[dim][key]==value,(dim,key)
for n in ['carry','history','history-carry']:assert (V/f'jevbench-v1.7.13-{n}.json').read_bytes()==(V/f'jevbench-v1.7.14-{n}.json').read_bytes()
for v in ['v1.7.12','v1.7.13']:
 for n in ['results','categories','carry','history','history-carry','proof','publication']:
  p=f'data/raw/benchmarks/jevbench/v1.7/jevbench-{v}-{n}.json';assert subprocess.check_output(['git','show',BASE+':'+p],cwd=W)==(W/p).read_bytes(),p
proof=L(V/'jevbench-v1.7.14-proof.json');assert proof['predecessor']=={'revision':'v1.7.13','publication_sha256':sha(V/'jevbench-v1.7.13-publication.json')}
for k,v in inputs.items():
 for mode in ['frozen','v17-off','v17-share']:
  p=pathlib.Path(pins[k][mode]['path']);assert sha(p)==pins[k][mode]['sha256'];orig=next(s for s in L(p)['systems'] if s['key']==k)
  for f in ['axes','scores','views','capability','composite_ci95','intelligence','calibration','speed','validity','status','decision_limit','v16']:assert v[mode].get(f)==orig.get(f),(k,mode,f)
  assert orig['cost']['usd_per_1000']==v['usd_per_1000']
 ref=proof['new_rows'][k]['price_reference'];c=by[k]['cost']
 assert c['kind']=='estimate' and abs(c['usd_per_1000']-1000*(v['priced_input_tokens']*ref['in']+v['output_tokens']*ref['out'])/1e6/1500)<1e-12 and c['common_basis'] is None
 assert by[k]['model_pin']==v['model_pin'] and by[k]['model_pin'].endswith('@'+entries[k]['entry']['revision'])
 for f in ['intelligence','calibration','speed','cost']:assert by[k]['axes'][f]==v['v17-share']['axes'][f]
 assert by[k]['ranked'] is False and by[k]['rank'] is None and by[k]['ranks']=={'A':None,'B':None,'C':None,'capability':None} and by[k]['listing']=='unranked' and len(by[k]['not_ranked_because'])>=60
 assert not any(k in o['order'] for o in a['board'].values())
 h=by['h2o-lightning-4b-v1.4.1']['draw']
 assert by[k]['draw']['id']==h['id']=='v1.6-regular-20261027' and by[k]['draw']['offset']==h['offset']=={'C':0,'I':0} and by[k]['draw']['status']==h['status'] and by[k]['draw']['release']=='v1.7.14'
 assert by[k]['paid_fast_lane'] is (k=='torchcast-decision-31b-v1.0')
assert inputs['decisio-gemma-4-12b-tuned-commit-think']['priced_input_tokens']==844031 and pins['decisio-gemma-4-12b-tuned-commit-think']['engine_recount']['file_sha256'].startswith('8c9f4691551a')
put=lambda n,d:(J/'receipts'/n).write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
put('CARRIED-ROWS.json',{'status':'PASS','rows_equal':len(b['systems']),'rows_equal_including_ranks':True,'board_equal':True,'new_rows_unranked':sorted(inputs),'family_rows_equal':['h2o-lightning-4b-v1.4.1','h2o-lightning-4b','arcbright-elf-1-12b','decisio-gemma-4-12b-tuned-commit','jeff_1_1_medium','jeff_1_0_large'],'carried_cells_equal':len(bc['systems']),'immutable_bytes':['carry','history','history-carry'],'predecessor_files_equal_to_base':14,'base_commit':BASE,'predecessor_publication_sha256':proof['predecessor']['publication_sha256'],'new_score_payloads_equal_to_sources':True})
put('COST-KIND.json',{'status':'PASS','new_rows':{k:{'kind':by[k]['cost']['kind'],'usd_per_1000':by[k]['cost']['usd_per_1000'],'basis_items':1500,'priced_input_tokens':inputs[k]['priced_input_tokens'],'native_input_tokens':inputs[k]['native_input_tokens'],'output_tokens':inputs[k]['output_tokens'],'base':entries[k]['entry']['base_model'],'reference':proof['new_rows'][k]['price_reference']} for k in inputs},'measured_without_bill':0,'negative_test':'test/jevbench-v1714-release.test.mjs'})
print('PASS',len(b['systems']),'carried rows/cells fully equal incl. ranks (family rows included), board unchanged, 5 new rows unranked on the same draw, carry/history bytes and 14 predecessor files (v1.7.12 + v1.7.13) equal to',BASE[:8],'; predecessor hash bound; new row scores/CI equal trusted sources; estimate costs recomputed')
