"""Dry runs only; all mutating helper cases run in a disposable synthetic tree."""
import json,pathlib,subprocess,hashlib,os,copy
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];P=J/'.pass';R=J/'receipts'
run=lambda argv,**kw:subprocess.run(argv,text=True,capture_output=True,**kw)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
V=W/'data/raw/benchmarks/jevbench/v1.7';pub=V/'jevbench-v1.7.14-publication.json';pub13=V/'jevbench-v1.7.13-publication.json';before=(sha(pub),sha(pub13))
fixture=R/'DRYRUN-REVIEW-FIXTURE.json';fixture.write_text(json.dumps({'verdict':'PASS','engine':'fixture-only: dry-run input, not an independent review'})+'\n')
# Real tree: v1.7.13 is still PENDING, so even the dry-run flip refuses (v1.7.13 first, then restack).
x=run(['python3','-B',str(J/'flip_verdict_v1714.py'),str(fixture),'--dry-run']);(R/'flip-dry-run-real-refused.log').write_text(x.stdout+x.stderr)
real_pred=json.loads(pub13.read_text())['review']['verdict']
if real_pred!='PASS':assert x.returncode!=0 and 'predecessor v1.7.13 must be PASS first' in x.stderr,x.stderr
x=run(['python3','-B',str(J/'freeze_v1714.py'),'--wt',str(W),'--output',str(R/'actual-must-not-exist.json')]);(R/'freeze-pending-refused.log').write_text(x.stdout+x.stderr)
assert x.returncode!=0 and ('publication review PENDING' in x.stderr or 'predecessor must be PASS' in x.stderr);assert not (R/'actual-must-not-exist.json').exists()
# Synthetic tree (v1.7.13 synthetic PASS, v1.7.14 re-bound): flip dry run on a PENDING copy, freeze dry run on the PASS copy.
subprocess.run(['python3','-B',str(J/'make_passtree_v1714.py')],check=True,capture_output=True)
pr=P/'r197/v1714/receipts';pr.mkdir(parents=True,exist_ok=True);(pr/'freeze.json').unlink(missing_ok=True);(pr/'topfive-diff.json').write_bytes((R/'topfive-diff.json').read_bytes())
pd=P/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.14-publication.json';synthetic_pass=pd.read_bytes()
m=json.loads(synthetic_pass);m['review']={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None};pd.write_text(json.dumps(m,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
x=run(['python3','-B',str(J/'flip_verdict_v1714.py'),str(fixture),'--dry-run'],env={**os.environ,'WT':str(P)});(R/'flip-dry-run.log').write_text(x.stdout+x.stderr);assert x.returncode==0,x.stderr
flip_dry_ok=True
# Stale binding: v1.7.14 bound to an older v1.7.13 manifest must be refused.
m2=copy.deepcopy(m);m2['predecessor']['publication_sha256']='c'*64;pd.write_text(json.dumps(m2,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
x=run(['python3','-B',str(J/'flip_verdict_v1714.py'),str(fixture),'--dry-run'],env={**os.environ,'WT':str(P)});(R/'flip-stale-binding-refused.log').write_text(x.stdout+x.stderr)
assert x.returncode!=0 and ('older v1.7.13 manifest' in x.stderr or 'manifest bytes differ' in x.stderr),x.stderr
pd.write_bytes(synthetic_pass)
x=run(['python3','-B',str(J/'freeze_v1714.py'),'--wt',str(P),'--output',str(pr/'freeze.json')]);(R/'freeze-dry-run.log').write_text(x.stdout+x.stderr);assert x.returncode==0,x.stderr;(R/'FREEZE-SYNTHETIC-DRYRUN.json').write_bytes((pr/'freeze.json').read_bytes())
x=run(['python3','-B',str(J/'freeze_v1714.py'),'--wt',str(P),'--output',str(pr/'forbidden.json'),'--write']);(R/'freeze-write-refused.log').write_text(x.stdout+x.stderr);assert x.returncode!=0 and 'never writes a seal' in x.stderr
from approval_v1714 import check_approval
proof=json.loads((V/'jevbench-v1.7.14-proof.json').read_text())
check_approval(W,proof)
negatives=0
for mut in [lambda d:d['publication_approval'].update(status='GO (standing; no top-five change; paid public order)'),lambda d:d['publication_approval'].update(top_five_effect='changed'),
            lambda d:d['publication_approval']['paid_public'].update(visibility='private'),lambda d:d['publication_approval']['paid_public'].update(key='h2o-lightning-4b-v1.4.1'),
            lambda d:d['publication_approval']['unranked_basis'].update(decision='none'),lambda d:d['publication_approval'].update(fresh_baseline='v1.7.12'),
            lambda d:d.update(topfive_diff_sha256='d'*64),*[(lambda k:lambda d:d['new_rows'][k].update(treatment='ranked'))(k) for k in sorted(proof['new_rows'])],
            lambda d:d['new_rows'].pop('jeff_1_1_large')]:
 d=copy.deepcopy(proof);mut(d)
 try:check_approval(W,d)
 except (AssertionError,KeyError):negatives+=1
 else:raise AssertionError('bad approval accepted')
assert (sha(pub),sha(pub13))==before
x=run(['python3','-B',str(J/'flip_verdict_v1714.py'),str(fixture)],env={**os.environ,'WT':str(P)})
(R/'flip-real-refused.log').write_text(x.stdout+x.stderr)
assert x.returncode!=0 and ('fixture receipts are dry-run only' in x.stderr)
assert (sha(pub),sha(pub13))==before
(R/'HELPERS.json').write_text(json.dumps({'status':'PASS','real_v1713_review':real_pred,'real_flip_dry_run_refused_while_v1713_pending':real_pred!='PASS','synthetic_flip_dry_run':flip_dry_ok,'stale_predecessor_binding_refused':True,'real_manifests_unchanged':before,'pending_freeze_refused':True,'fixture_flip_refused':True,'synthetic_freeze_dry_run':True,'seal_write_refused':True,'standing_go_checked':True,'approval_negative_cases':negatives,'fixture_grants_no_authority':True},indent=1)+'\n')
print('PASS flip/freeze dry runs (real tree refused while v1.7.13 PENDING; synthetic tree OK), stale-binding refusal, seal-write refusal,',negatives,'approval negatives; real manifests unchanged')
