"""Release-owner helper: refuse PENDING approval, including in dry-run mode."""
import argparse,hashlib,json,pathlib
from approval_v180 import check_approval
p=argparse.ArgumentParser();p.add_argument('receipt',type=pathlib.Path);p.add_argument('--dry-run',action='store_true');a=p.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest()
m=json.loads((D/'jevbench-v1.8.0-publication.json').read_text());pr=json.loads((D/'jevbench-v1.8.0-proof.json').read_text());check_approval(W,pr)
r=json.loads(a.receipt.read_text());assert r.get('verdict')=='PASS' and r.get('engine') not in [None,'PENDING'],'REFUSED: independent review required'
assert not r['engine'].lower().startswith(('synthetic','fixture','dry-run')) or a.dry_run,'REFUSED: synthetic review'
for f in m['files'].values():assert sha(W/f['path'])==f['sha256'],'REFUSED: changed artifact'
pred=W/'data/raw/benchmarks/jevbench/v1.7'/f"jevbench-{m['predecessor']['revision']}-publication.json"
assert m['predecessor']['publication_sha256']==sha(pred),'REFUSED: changed predecessor'
assert json.loads(pred.read_text())['review']['verdict']=='PASS' or a.dry_run,'REFUSED: predecessor review PENDING'
m['review']={'engine':r['engine'],'verdict':'PASS','receipt_sha256':sha(a.receipt)}
if a.dry_run:print(json.dumps({'dry_run':True,'would_set_review':m['review']}))
else:(D/'jevbench-v1.8.0-publication.json').write_text(json.dumps(m,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
