"""Source pins, carried-row invariants and processed-input price arithmetic."""
import pathlib,json,hashlib,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();V=W/'data/raw/benchmarks/jevbench/v1.7'
BASE='020019b8926fc8beaa872edbabb2bcb509446c0f'
b=L(V/'jevbench-v1.7.12-results.json');a=L(V/'jevbench-v1.7.13-results.json');by={r['key']:r for r in a['systems']};strip=lambda r:{k:v for k,v in r.items() if k not in ['rank','ranks']}
for r in b['systems']:assert strip(r)==strip(by[r['key']]),r['key']
assert json.dumps(by['h2o-lightning-4b'],sort_keys=True)==json.dumps({**next(r for r in b['systems'] if r['key']=='h2o-lightning-4b'),'rank':by['h2o-lightning-4b']['rank'],'ranks':by['h2o-lightning-4b']['ranks']},sort_keys=True),'v1.1 row must stay equal'
bc=L(V/'jevbench-v1.7.12-categories.json');ac=L(V/'jevbench-v1.7.13-categories.json')
for dim in ['systems','lanes']:
 for key,value in bc[dim].items():assert ac[dim][key]==value,(dim,key)
for n in ['carry','history','history-carry']:assert (V/f'jevbench-v1.7.12-{n}.json').read_bytes()==(V/f'jevbench-v1.7.13-{n}.json').read_bytes()
for n in ['results','categories','carry','history','history-carry','proof','publication']:
 p=f'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.12-{n}.json';assert subprocess.check_output(['git','show',BASE+':'+p],cwd=W)==(W/p).read_bytes()
inputs=L(J/'src/inputs.json');entries=L(J/'inputs/ENTRIES.json');pins=L(J/'receipts/INPUTS.json')
for k,v in inputs.items():
 for mode in ['frozen','v17-off','v17-share']:
  p=pathlib.Path(pins[k][mode]['path']);assert sha(p)==pins[k][mode]['sha256'];orig=next(s for s in L(p)['systems'] if s['key']==k)
  for f in ['axes','scores','views','capability','composite_ci95','intelligence','calibration','speed','validity','status','decision_limit','v16']:assert v[mode].get(f)==orig.get(f),(k,mode,f)
  assert orig['cost']['usd_per_1000']==v['usd_per_1000']
 c=by[k]['cost'];assert c['kind']=='estimate' and abs(c['usd_per_1000']-1000*(711020*0.03+1500*0.15)/1e6/1500)<1e-12 and c['common_basis'] is None
 assert by[k]['model_pin']==v['model_pin']=='h2oai/h2o-lightning-4b@cc18ee330e6895c41b9a60f37a0dd122dc4c3461'
 for f in ['intelligence','calibration','speed','cost']:assert by[k]['axes'][f]==v['v17-share']['axes'][f]
 assert by[k]['draw']['id']=='v1.6-regular-20261027' and by[k]['draw']['offset']=={'C':0,'I':0} and by[k]['draw']['status']=='anchor-runs-pending'
put=lambda n,d:(J/'receipts'/n).write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
put('CARRIED-ROWS.json',{'status':'PASS','rows_equal_except_rank':len(b['systems']),'v1_1_row_equal_except_rank':True,'carried_cells_equal':len(bc['systems']),'immutable_bytes':['carry','history','history-carry'],'predecessor_files_equal_to_base':7,'base_commit':BASE,'new_score_payloads_equal_to_sources':True})
put('COST-KIND.json',{'status':'PASS','new_rows':{k:{'kind':by[k]['cost']['kind'],'usd_per_1000':by[k]['cost']['usd_per_1000'],'basis_items':1500,'priced_input_tokens':711020,'untrimmed_input_tokens_disclosed':944694,'output_tokens':1500,'base':entries[k]['entry']['base_model']} for k in inputs},'measured_without_bill':0,'negative_test':'test/jevbench-v1713-release.test.mjs'})
print('PASS',len(b['systems']),'carried rows/cells equal except ranks (v1.1 included), carry/history bytes and seven predecessor files equal to',BASE[:8],'; new row scores/CI equal trusted sources; processed-input estimate cost')
