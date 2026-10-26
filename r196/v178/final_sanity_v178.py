"""Final candidate bindings, preview state and exact unchanged numeric release artifacts."""
import hashlib,json,pathlib,subprocess
from approval_v178 import check_approval
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=L(J/'inputs/APPROVAL.json');proof=L(V/'jevbench-v1.7.8-proof.json');man=L(V/'jevbench-v1.7.8-publication.json')
assert proof['publication_approval']==a;check_approval(W,proof)
assert man['review']=={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None}
for n,f in man['files'].items():assert sha(W/f['path'])==f['sha256'],n
# This binding-only change must preserve every byte of the built numerical/public data.
for n in ['results','categories','carry','history','history-carry']:
 p=V/f'jevbench-v1.7.8-{n}.json'
 assert p.read_bytes()==subprocess.check_output(['git','show','f2a8b299:'+str(p.relative_to(W))],cwd=W),n
assert 'fairness FAIR' in (J/'preview/index.html').read_text()
assert L(J/'receipts/FAIRNESS-TEXT-RESOLUTION.json')['status']=='PASS'
out={'status':'PASS','fairness':a['fairness_check'],'publication':'PENDING','approval_proof_equal':True,'manifest_hashes_verified':True,'numeric_and_public_data_bytes_equal_to_build_commit':True,'preview_fairness':'FAIR','text_fix_checks':10}
(J/'receipts/FINAL-SANITY.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n')
print('PASS final FAIR binding, PENDING publication, preview header and exact numerical/public data bytes against f2a8b299')
