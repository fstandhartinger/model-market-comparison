import pathlib,json,hashlib,subprocess,os
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])));V=W/'data/raw/benchmarks/jevbench/v1.7'
L=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
pub=L(V/'jevbench-v1.7.1-publication.json')
assert pub['review']=={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None}
for n,r in pub['files'].items():assert r['sha256']==sha(W/r['path']),(n,'hash')
for n in ['history','history-carry','carry']:assert (V/f'jevbench-v1.7.1-{n}.json').read_bytes()==(V/f'jevbench-v1.7.0-{n}.json').read_bytes(),n
spec=L(J/'receipts/NEW-ROW-SPEC.json');inputs=L(J/'src/inputs.json')
for k,s in spec.items():
 for f in ['axes','scores','capability','composite_ci95','decision_limit','speed','intelligence','calibration','validity','views','v16','status','support']:
  assert s[f]==inputs[k]['v17-share'][f],(k,f)
 assert {f:v for f,v in s['cost'].items() if f!='basis'}=={f:v for f,v in inputs[k]['v17-share']['cost'].items() if f!='basis'},k
assert not L(J/'receipts/topfive-diff.json')['changed']
assert L(J/'receipts/topfive-extended.json')['changed_lists']==0
assert L(J/'receipts/REPRO.json')['identical']
assert (J/'receipts/topfive-after-final.json').read_bytes()==(J/'receipts/topfive-after.json').read_bytes()
subprocess.run(['node',str(J/'validate_v171.mjs'),str(W)],check=True)
print('PASS: final artifact hashes; immutable history/carry bytes; new scorer numbers and CIs exact; 40+156 unchanged top-five lists; real PENDING')
