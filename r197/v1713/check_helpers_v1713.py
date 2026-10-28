"""Dry runs only; all mutating helper cases run in a disposable synthetic tree."""
import json,pathlib,subprocess,hashlib,os,copy
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];P=J/'.pass';R=J/'receipts'
run=lambda argv,**kw:subprocess.run(argv,text=True,capture_output=True,**kw)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
pub=W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-publication.json';before=sha(pub)
fixture=R/'DRYRUN-REVIEW-FIXTURE.json';fixture.write_text(json.dumps({'verdict':'PASS','engine':'fixture-only: dry-run input, not an independent review'})+'\n')
x=run(['python3','-B',str(J/'flip_verdict_v1713.py'),str(fixture),'--dry-run']);(R/'flip-dry-run.log').write_text(x.stdout+x.stderr)
flip_dry_ok=x.returncode==0
assert flip_dry_ok,x.stderr  # unranked release: the standing GO needs no FAIR verdict, only the zero-change top-five preview
assert sha(pub)==before
x=run(['python3','-B',str(J/'freeze_v1713.py'),'--wt',str(W),'--output',str(R/'actual-must-not-exist.json')]);(R/'freeze-pending-refused.log').write_text(x.stdout+x.stderr);assert x.returncode!=0 and 'publication review PENDING' in x.stderr;assert not (R/'actual-must-not-exist.json').exists()
subprocess.run(['python3','-B',str(J/'make_passtree_v1713.py')],check=True)
pr=P/'r197/v1713/receipts';pr.mkdir(parents=True,exist_ok=True);(pr/'freeze.json').unlink(missing_ok=True);(pr/'topfive-diff.json').write_bytes((R/'topfive-diff.json').read_bytes())
x=run(['python3','-B',str(J/'freeze_v1713.py'),'--wt',str(P),'--output',str(pr/'freeze.json')],env={**os.environ,'JEV_FAIR_ROOT':str(P/'synthetic-fair')});(R/'freeze-dry-run.log').write_text(x.stdout+x.stderr);assert x.returncode==0,x.stderr;(R/'FREEZE-SYNTHETIC-DRYRUN.json').write_bytes((pr/'freeze.json').read_bytes())
x=run(['python3','-B',str(J/'freeze_v1713.py'),'--wt',str(P),'--output',str(pr/'forbidden.json'),'--write'],env={**os.environ,'JEV_FAIR_ROOT':str(P/'synthetic-fair')});(R/'freeze-write-refused.log').write_text(x.stdout+x.stderr);assert x.returncode!=0 and 'never writes a seal' in x.stderr
from approval_v1713 import check_approval
proof=json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-proof.json').read_text())
check_approval(W,proof)
negatives=0
for mut in [lambda d:d['publication_approval']['fairness_check'].update(verdict='PENDING'),lambda d:d['publication_approval']['fairness_check'].update(verdict='FAIR'),lambda d:d['publication_approval']['fairness_check'].update(sha256='a'*64),lambda d:d['publication_approval']['paid_public'].update(visibility='private'),lambda d:d['publication_approval'].update(status='GO (paid public fast-lane order, automatic publication)'),lambda d:d['publication_approval'].update(top_five_effect='changed'),lambda d:d['new_rows']['h2o-lightning-4b-v1.4.1'].update(treatment='ranked')]:
 d=copy.deepcopy(proof);mut(d)
 try:check_approval(W,d)
 except AssertionError:negatives+=1
 else:raise AssertionError('bad approval accepted')
assert sha(pub)==before
x=run(['python3','-B',str(J/'flip_verdict_v1713.py'),str(fixture)])
(R/'flip-real-refused.log').write_text(x.stdout+x.stderr)
assert x.returncode!=0 and 'fixture receipts are dry-run only' in x.stderr
assert sha(pub)==before
(R/'HELPERS.json').write_text(json.dumps({'status':'PASS','flip_dry_run':True,'real_manifest_unchanged':before,'pending_freeze_refused':True,'real_flip_with_fixture_refused':True,'synthetic_freeze_dry_run':True,'seal_write_refused':True,'fairness_evidence':'SUSPICIOUS bound, handled by unranking','standing_go_checked':True,'approval_negative_cases':negatives,'flip_dry_run_actual_ok':flip_dry_ok,'fixture_grants_no_authority':True},indent=1)+'\n');print('PASS flip/freeze dry runs, actual PENDING refusal, seal-write refusal, approval negatives (old GO, top-five change claimed, fairness evidence tampered, row ranked); real manifest unchanged')
