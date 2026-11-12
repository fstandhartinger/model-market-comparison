"""Exercise helpers only as dry runs; fixture receipts never authorize publication. Real tree: every helper refuses while the fairness verdict is PENDING.
Synthetic PASS tree (.pass, synthetic FAIR): flip/freeze dry runs work; a seal write and a bare non-FAIR bind are refused."""
import pathlib,json,subprocess,hashlib,copy,os,tempfile
from approval_v1810 import check_approval
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';P=D/'jevbench-v1.8.10-publication.json';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();before={'manifest':sha(P),'proof':sha(D/'jevbench-v1.8.10-proof.json'),'approval':sha(J/'inputs/APPROVAL.json')}
R=J/'receipts';R.mkdir(exist_ok=True);receipt=R/'DRYRUN-REVIEW-FIXTURE.json';receipt.write_text(json.dumps({'engine':'fixture-only','verdict':'PASS'})+'\n')
def run(args,env=None):return subprocess.run(args,cwd=W,capture_output=True,text=True,env={**os.environ,**(env or {})})
log=[]
# --- real tree: fairness PENDING -> everything refuses
r=run(['python3','-B',str(J/'flip_verdict_v1810.py'),str(receipt),'--dry-run']);assert r.returncode!=0 and 'FAIR' in r.stderr+r.stdout,r.stderr;log.append('flip dry run on the real tree: '+r.stderr.strip().splitlines()[-1])
r=run(['python3','-B',str(J/'freeze_v1810.py'),'--wt',str(W),'--output',str(R/'forbidden-freeze.json')]);assert r.returncode!=0 and ('PENDING' in r.stderr),r.stderr;log.append('freeze on the real tree: '+r.stderr.strip().splitlines()[-1])
r=run(['python3','-B',str(J/'seal_v1810.py'),'--wt',str(W)]);assert r.returncode!=0;log.append('seal helper on the real tree: refused')
r=run(['python3','-B',str(J/'bind_fair_v1810.py'),'--dry-run'],{'JEV_FAIR_ROOT':'/nonexistent'});assert r.returncode!=0 and 'missing' in r.stderr,r.stderr;log.append('bind_fair without a receipt: refused')
pr=json.loads((D/'jevbench-v1.8.10-proof.json').read_text())
try:check_approval(W,pr)
except AssertionError as e:assert 'PENDING' in str(e) or 'FAIR' in str(e);log.append('approval while PENDING: '+str(e)[:80])
else:raise AssertionError('PENDING approval accepted')
# --- bind_fair verdicts on fixtures (dry run only; nothing is bound)
with tempfile.TemporaryDirectory() as t:
 tp=pathlib.Path(t);(tp/'workers/r276-v1810-recheck').mkdir(parents=True)
 for verdict,ok in [('PENDING',False),('SUSPICIOUS',False),('UNFAIR',False),('FAIR',True)]:
  (tp/'workers/r276-v1810-recheck/RESULT.json').write_text(json.dumps({'verdict':verdict,'engine':'fixture'}))
  r=run(['python3','-B',str(J/'bind_fair_v1810.py'),'--dry-run'],{'JEV_FAIR_ROOT':str(tp)});assert (r.returncode==0)==ok,(verdict,r.stderr,r.stdout);log.append(f'bind_fair --dry-run {verdict}: '+('would bind' if ok else 'refused'))
assert before=={'manifest':sha(P),'proof':sha(D/'jevbench-v1.8.10-proof.json'),'approval':sha(J/'inputs/APPROVAL.json')},'a dry run changed the real tree'
# --- approval negatives (synthetic PASS tree has a FAIR receipt)
FP=J/'.pass-fp'
subprocess.run(['python3','-B',str(J/'make_passtree_v1810.py'),'--out',str(FP),'--keep-review-pending'],check=True,cwd=W,capture_output=True)
env={'WT':str(FP),'JEV_FAIR_ROOT':str(FP)}
r=run(['python3','-B',str(FP/'r198/v1810/flip_verdict_v1810.py'),str(receipt),'--dry-run'],env);assert r.returncode==0 and '"dry_run": true' in r.stdout,r.stderr+r.stdout;log.append('flip dry run (synthetic FAIR bound, review PENDING): would set review PASS, manifest unchanged on disk')
assert 'PENDING' in (FP/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.10-publication.json').read_text()
fp=FP/'r198/v1810/receipts/FREEZE-SYNTHETIC-DRYRUN.json';fp.unlink(missing_ok=True)
PT=J/'.pass';(PT/'r198/v1810/receipts/FREEZE-SYNTHETIC-DRYRUN.json').unlink(missing_ok=True);penv={'WT':str(PT),'JEV_FAIR_ROOT':str(PT)}
r=run(['python3','-B',str(PT/'r198/v1810/freeze_v1810.py'),'--wt',str(PT),'--output',str(PT/'r198/v1810/receipts/FREEZE-SYNTHETIC-DRYRUN.json')],penv);assert r.returncode==0 and 'DRY RUN' in r.stdout,r.stderr+r.stdout;log.append('freeze dry run (synthetic PASS tree): addendum JSON written inside the fixture only, no seal')
r=run(['python3','-B',str(PT/'r198/v1810/freeze_v1810.py'),'--wt',str(PT),'--output',str(PT/'r198/v1810/receipts/x.json'),'--write'],penv);assert r.returncode!=0 and 'never writes a seal' in r.stderr,r.stderr;log.append('freeze --write: refused (never writes a seal)')
r=run(['python3','-B',str(PT/'r198/v1810/seal_v1810.py'),'--wt',str(PT)],penv);assert r.returncode==0 and 'Dry run' in r.stdout,r.stderr+r.stdout;log.append('seal helper without --write (synthetic tree): dry run only')
import shutil;shutil.copyfile(PT/'r198/v1810/receipts/FREEZE-SYNTHETIC-DRYRUN.json',R/'FREEZE-SYNTHETIC-DRYRUN.json');shutil.rmtree(FP)
n=0
mods=[lambda p:p['publication_approval'].update(status='PENDING'),lambda p:p['publication_approval'].update(fresh_baseline='v1.8.8'),lambda p:p['publication_approval'].update(top_five_effect='unchanged'),lambda p:p.update(topfive_diff_sha256='a'*64),
 lambda p:p['publication_approval']['fairness_check'].update(verdict='SUSPICIOUS'),lambda p:p['publication_approval']['go'].update(quote='no'),lambda p:p['publication_approval']['equating_basis'].update(decision='x'),lambda p:p.update(new_rows={'x':1}),lambda p:p['equated_rows'].pop(next(iter(p['equated_rows']))),
 lambda p:p['publication_approval']['top_five_preview'].update(sha256='b'*64),lambda p:p['publication_approval']['fairness_check'].update(path='other.json')]
for change in mods:
 p=copy.deepcopy(pr);change(p)
 try:check_approval(W,p)
 except (AssertionError,KeyError):n+=1
 else:raise AssertionError('bad approval accepted')
out={'status':'PASS','real_tree_flip_freeze_seal_bind_refused_while_fairness_pending':True,'bind_fair_refuses_non_fair_verdicts':True,'approval_negatives':n,'non_dry_flip_never_invoked':True,'seal_helper_never_run_for_real':True,'log':log,'real_tree_unchanged':before}
(R/'HELPERS.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('PASS helper dry-runs;',n,'approval negatives; '+'; '.join(log))
