"""Release-owner seal helper; never run during build or review.
The new rows use the 27 October draw; its vault path is fixed below.
"""
import argparse,json,pathlib,hashlib
from approval_v184 import check_approval
p=argparse.ArgumentParser();p.add_argument('--wt',required=True,type=pathlib.Path);p.add_argument('--write',action='store_true');a=p.parse_args();W=a.wt.resolve();D=W/'data/raw/benchmarks/jevbench/v1.8';sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest()
m=json.loads((D/'jevbench-v1.8.4-publication.json').read_text());pr=json.loads((D/'jevbench-v1.8.4-proof.json').read_text());check_approval(W,pr);assert m['review']['verdict']=='PASS','REFUSED: review PENDING'
for f in m['files'].values():assert sha(W/f['path'])==f['sha256'],'REFUSED: changed artifact'
pred=W/'data/raw/benchmarks/jevbench/v1.8'/f"jevbench-{m['predecessor']['revision']}-publication.json"
assert m['predecessor']['publication_sha256']==sha(pred) and json.loads(pred.read_text())['review']['verdict']=='PASS','REFUSED: predecessor is not bound and PASS'
assert pr['predecessor']==m['predecessor'],'REFUSED: proof predecessor differs'
target=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027/frozen-release-v1.8.4/addendum.json');assert not target.exists(),'REFUSED: seal exists'
if a.write:
 target.parent.mkdir(parents=True,exist_ok=False);target.write_text(json.dumps({'release':'v1.8.4','draw':'v1.6-regular-20261027','publication_sha256':sha(D/'jevbench-v1.8.4-publication.json'),'publication':m,'proof':pr},indent=1,sort_keys=True)+'\n')
else:print('Dry run only:',target)
