"""Exercise helpers only as dry runs; fixture receipts never authorize publication."""
import pathlib,json,subprocess,hashlib,copy
from approval_v183 import check_approval
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';P=D/'jevbench-v1.8.3-publication.json';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();before=sha(P)
receipt=J/'receipts/DRYRUN-REVIEW-FIXTURE.json';receipt.write_text(json.dumps({'engine':'fixture-only','verdict':'PASS'})+'\n')
def run(args):return subprocess.run(args,cwd=W,capture_output=True,text=True)
r=run(['python3','-B',str(J/'flip_verdict_v183.py'),str(receipt),'--dry-run']);assert r.returncode==0,r.stderr
(J/'receipts/flip-dryrun.log').write_text(r.stdout+r.stderr)
r=run(['python3','-B',str(J/'freeze_v183.py'),'--wt',str(W),'--output',str(J/'receipts/forbidden-freeze.json')]);assert r.returncode!=0 and 'PENDING' in r.stderr
pr=json.loads((D/'jevbench-v1.8.3-proof.json').read_text());check_approval(W,pr)
n=0
for change in [lambda p:p['new_rows'].pop('zils-ai-z3-mini-soup-preview'),lambda p:p['new_rows'].pop('cribl-decision-1.0-27b'),lambda p:p['publication_approval'].update(status='PENDING'),lambda p:p['publication_approval'].update(fresh_baseline='v1.7.23'),lambda p:p['publication_approval'].update(top_five_effect='changed'),lambda p:p.update(topfive_diff_sha256='a'*64),lambda p:p.update(exceptions={'x':[]} ),lambda p:next(iter(p['new_rows'].values())).update(treatment='ranked')]:
 p=copy.deepcopy(pr);change(p)
 try:check_approval(W,p)
 except (AssertionError,KeyError):n+=1
 else:raise AssertionError('bad approval accepted')
assert before==sha(P)
(J/'receipts/HELPERS.json').write_text(json.dumps({'status':'PASS','dry_flip_accepted_without_write':True,'non_dry_flip_never_invoked':True,'pending_freeze_refused':True,'approval_negatives':n,'seal_helper_never_run':True,'manifest_unchanged':before},indent=1,sort_keys=True)+'\n')
print('PASS helper dry-run and pending freeze refusal;',n,'approval negatives; seal never run')
