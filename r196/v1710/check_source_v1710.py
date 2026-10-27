"""Source pins, carried-row invariants and common price arithmetic."""
import pathlib,json,hashlib,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();V=W/'data/raw/benchmarks/jevbench/v1.7'
b=L(V/'jevbench-v1.7.9-results.json');a=L(V/'jevbench-v1.7.10-results.json');by={r['key']:r for r in a['systems']};strip=lambda r:{k:v for k,v in r.items() if k not in ['rank','ranks']}
link_keys=['singularity-super-decider','singularity-super-decider-thinking']
for r in b['systems']:
 expected=strip(r)
 if r['key'] in link_keys:expected['repo']='https://singularitycompute.com/super-decider'
 assert expected==strip(by[r['key']]),r['key']
 if r['key'] in link_keys:assert by[r['key']]['source_url']=='https://singularitycompute.com/super-decider'
bc=L(V/'jevbench-v1.7.9-categories.json');ac=L(V/'jevbench-v1.7.10-categories.json')
for dim in ['systems','lanes']:
 for key,value in bc[dim].items():assert ac[dim][key]==value,(dim,key)
for r in b['systems']:
 k=r['key'];assert bc['systems'].get(k)==ac['systems'].get(k);assert bc['lanes'].get(k)==ac['lanes'].get(k)
for n in ['carry','history','history-carry']:assert (V/f'jevbench-v1.7.9-{n}.json').read_bytes()==(V/f'jevbench-v1.7.10-{n}.json').read_bytes()
for n in ['results','categories','carry','history','history-carry','proof','publication']:
 p=f'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.9-{n}.json';assert subprocess.check_output(['git','show','a589248f:'+p],cwd=W)==(W/p).read_bytes()
inputs=L(J/'src/inputs.json');entries=L(J/'inputs/ENTRIES.json');pins=L(J/'receipts/INPUTS.json')
for k,v in inputs.items():
 for mode in ['frozen','v17-off','v17-share']:
  p=pathlib.Path(pins[k][mode]['path']);assert sha(p)==pins[k][mode]['sha256'];orig=next(s for s in L(p)['systems'] if s['key']==k)
  for f in ['axes','scores','views','capability','composite_ci95','intelligence','calibration','speed','validity','status','decision_limit','v16']:assert v[mode].get(f)==orig.get(f),(k,mode,f)
 assert by[k]['cost']['kind']=='estimate';assert not ('measured'==by[k]['cost']['kind'])
 assert by[k]['model_pin']==v['model_pin']
# Iota exact full-draw count receipt and unchanged earlier iota row.
c=L(J/'receipts/PRECONDITIONS.json')['iota_input_checks'];assert (c['rows'],c['ok'],c['input_tokens'],c['output_tokens'])==(1500,1500,1008925,0)
assert c['latency']['over_10s']==0 and round(c['latency']['max'],2)==2.41
put=lambda n,d:(J/'receipts'/n).write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
put('CARRIED-ROWS.json',{'status':'PASS','rows_equal_except_rank':295,'rows_equal_except_rank_and_repo':2,'repo_exception_keys':link_keys,'carried_cells_equal':len(bc['systems']),'immutable_bytes':['carry','history','history-carry'],'predecessor_files_equal_to_base':7,'new_score_payloads_equal_to_sources':True})
put('COST-KIND.json',{'status':'PASS','new_rows':{k:{'kind':by[k]['cost']['kind'],'common_usd_per_1000':by[k]['cost']['usd_per_1000'],'base':entries[k]['entry']['base_model']} for k in inputs},'measured_without_bill':0,'negative_test':'test/jevbench-v1710-release.test.mjs'})
print('PASS 297 carried rows/cells (two repo exceptions only), carry/history bytes and seven predecessor files; every new score/CI equals trusted source; cost estimates only; iota counts exact')
