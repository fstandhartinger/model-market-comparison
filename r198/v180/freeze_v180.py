"""Inspect a seal addendum only. This helper never writes to the vault."""
import argparse,hashlib,json,pathlib
from approval_v180 import check_approval
p=argparse.ArgumentParser();p.add_argument('--wt',required=True,type=pathlib.Path);p.add_argument('--output',required=True,type=pathlib.Path);p.add_argument('--write',action='store_true');a=p.parse_args();W=a.wt.resolve();D=W/'data/raw/benchmarks/jevbench/v1.8';sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest()
m=json.loads((D/'jevbench-v1.8.0-publication.json').read_text());pr=json.loads((D/'jevbench-v1.8.0-proof.json').read_text());check_approval(W,pr);assert m['review']['verdict']=='PASS','REFUSED: review PENDING'
assert not a.write,'REFUSED: dry-run helper never writes a seal'
for f in m['files'].values():assert sha(W/f['path'])==f['sha256'],'REFUSED: changed bytes'
pred=W/'data/raw/benchmarks/jevbench/v1.7'/f"jevbench-{m['predecessor']['revision']}-publication.json"
assert m['predecessor']['publication_sha256']==sha(pred) and json.loads(pred.read_text())['review']['verdict']=='PASS','REFUSED: predecessor is not bound and PASS'
assert pr['predecessor']==m['predecessor'],'REFUSED: proof predecessor differs'
assert a.output.resolve().is_relative_to(W/'r198/v180/receipts') and not a.output.exists(),'REFUSED: invalid output'
a.output.write_text(json.dumps({'release':'v1.8.0','vault_draw':'v1.6-regular-20261027','spans_draws':True,'publication_sha256':sha(D/'jevbench-v1.8.0-publication.json'),'publication':m,'proof':pr},indent=1,sort_keys=True)+'\n');print('DRY RUN only; no seal written')
