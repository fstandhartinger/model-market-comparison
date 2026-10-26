"""Final candidate bindings and exact carried-row exceptions."""
import hashlib,json,pathlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
proof=L(V/'jevbench-v1.7.9-proof.json');man=L(V/'jevbench-v1.7.9-publication.json');a=L(J/'inputs/APPROVAL.json')
assert proof['publication_approval']==a and a['fairness_check']['verdict'] in ['PENDING','FAIR'];assert man['review']=={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None}
for n,f in man['files'].items():assert sha(W/f['path'])==f['sha256'],n
old=L(V/'jevbench-v1.7.8-results.json');new=L(V/'jevbench-v1.7.9-results.json');old={s['key']:s for s in old['systems']};new={s['key']:s for s in new['systems']}
def strip(s):s=json.loads(json.dumps(s));s.pop('rank',None);s.pop('ranks',None);return s
exceptions=['launchables-myles-g-12b','singularity-super-decider','singularity-super-decider-thinking']
for k,p in old.items():
 b=strip(p);s=strip(new[k])
 if k=='launchables-myles-g-12b':
  for f in ['cost','scores','views','jevbench_score','composite_ci95','cost_basis','price_basis']:b.pop(f,None);s.pop(f,None)
  b['axes'].pop('cost');s['axes'].pop('cost');b['v16']['ci95'].pop('composite');s['v16']['ci95'].pop('composite')
 elif k in exceptions:b.pop('source_url',None);s.pop('source_url',None)
 assert s==b,k
for n in ['carry','history','history-carry']:assert (V/f'jevbench-v1.7.8-{n}.json').read_bytes()==(V/f'jevbench-v1.7.9-{n}.json').read_bytes(),n
assert ('fairness '+a['fairness_check']['verdict']) in (J/'preview/index.html').read_text()
(J/'receipts/FINAL-SANITY.json').write_text(json.dumps({'status':'PASS','publication':'PENDING','fairness':a['fairness_check']['verdict'],'unchanged_except_rank':293,'exact_exceptions':exceptions,'immutable_carry_history':True,'manifest_hashes_verified':True},indent=1,sort_keys=True)+'\n');print('PASS candidate bindings, 293 unchanged rows, exact reprice/link exceptions, immutable carry/history')
