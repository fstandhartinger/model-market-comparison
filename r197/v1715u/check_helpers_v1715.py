"""Dry runs only; all mutating helper cases run in a disposable synthetic tree."""
import json,pathlib,subprocess,hashlib,os,copy
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];P=J/'.pass';R=J/'receipts'
run=lambda argv,**kw:subprocess.run(argv,text=True,capture_output=True,**kw)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
V=W/'data/raw/benchmarks/jevbench/v1.7';pub=V/'jevbench-v1.7.15-publication.json';pub14=V/'jevbench-v1.7.14-publication.json';appr=J/'inputs/APPROVAL.json';before=(sha(pub),sha(pub14),sha(appr))
fixture=R/'DRYRUN-REVIEW-FIXTURE.json';fixture.write_text(json.dumps({'verdict':'PASS','engine':'fixture-only: dry-run input, not an independent review'})+'\n')
# Real tree: v1.7.14 is PASS, so the dry-run flip is accepted and writes nothing; freeze refuses while v1.7.15 is PENDING.
x=run(['python3','-B',str(J/'flip_verdict_v1715.py'),str(fixture),'--dry-run']);(R/'flip-dry-run-real.log').write_text(x.stdout+x.stderr)
assert x.returncode==0 and '"dry_run": true' in x.stdout,x.stderr
assert (sha(pub),sha(pub14),sha(appr))==before,'dry run wrote'
x=run(['python3','-B',str(J/'freeze_v1715.py'),'--wt',str(W),'--output',str(R/'actual-must-not-exist.json')]);(R/'freeze-pending-refused.log').write_text(x.stdout+x.stderr)
assert x.returncode!=0 and 'publication review PENDING' in x.stderr,x.stderr;assert not (R/'actual-must-not-exist.json').exists()
# Synthetic tree (v1.7.15 synthetic PASS): flip dry run on a PENDING copy, stale binding refused, freeze dry run on the PASS copy.
subprocess.run(['python3','-B',str(J/'make_passtree_v1715.py')],check=True,capture_output=True)
pr=P/'r197/v1715u/receipts';pr.mkdir(parents=True,exist_ok=True);(pr/'freeze.json').unlink(missing_ok=True);(pr/'topfive-diff.json').write_bytes((R/'topfive-diff.json').read_bytes())
env={**os.environ,'WT':str(P)}
pd=P/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-publication.json';synthetic_pass=pd.read_bytes()
m=json.loads(synthetic_pass);m['review']={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None};pd.write_text(json.dumps(m,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
x=run(['python3','-B',str(J/'flip_verdict_v1715.py'),str(fixture),'--dry-run'],env=env);(R/'flip-dry-run.log').write_text(x.stdout+x.stderr);assert x.returncode==0,x.stderr
m2=copy.deepcopy(m);m2['predecessor']['publication_sha256']='c'*64;pd.write_text(json.dumps(m2,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
x=run(['python3','-B',str(J/'flip_verdict_v1715.py'),str(fixture),'--dry-run'],env=env);(R/'flip-stale-binding-refused.log').write_text(x.stdout+x.stderr)
assert x.returncode!=0 and ('older v1.7.14 manifest' in x.stderr or 'manifest bytes differ' in x.stderr),x.stderr
m3=copy.deepcopy(m);m3['review']={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None};pd.write_text(json.dumps(m3,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
x=run(['python3','-B',str(J/'flip_verdict_v1715.py'),str(fixture)],env=env);(R/'flip-real-refused.log').write_text(x.stdout+x.stderr);assert x.returncode!=0 and 'fixture receipts are dry-run only' in x.stderr
pd.write_bytes(synthetic_pass)
x=run(['python3','-B',str(J/'freeze_v1715.py'),'--wt',str(P),'--output',str(pr/'freeze.json')],env=env);(R/'freeze-dry-run.log').write_text(x.stdout+x.stderr);assert x.returncode==0,x.stderr;(R/'FREEZE-SYNTHETIC-DRYRUN.json').write_bytes((pr/'freeze.json').read_bytes())
x=run(['python3','-B',str(J/'freeze_v1715.py'),'--wt',str(P),'--output',str(pr/'forbidden.json'),'--write'],env=env);(R/'freeze-write-refused.log').write_text(x.stdout+x.stderr);assert x.returncode!=0 and 'never writes a seal' in x.stderr
from approval_v1715 import check_approval
proof=json.loads((V/'jevbench-v1.7.15-proof.json').read_text())
check_approval(W,proof)
negatives=0
for mut in [lambda d:d['publication_approval'].update(status='GO (standing; no top-five change; paid public order for Torchcast)'),lambda d:d['publication_approval'].update(top_five_effect='changed'),
            lambda d:d['publication_approval']['paid_public'].update(visibility='private'),lambda d:d['publication_approval']['paid_public'].update(key='h2o-lightning-4b-v1.4.1'),
            lambda d:d['publication_approval']['unranked_basis'].update(decision='v1713-h2o141-unranked-provisional'),lambda d:d['publication_approval'].update(fresh_baseline='v1.7.13'),
            lambda d:d['publication_approval']['cost_basis'].update(decision='none'),lambda d:d['publication_approval'].update(fairness_check={'verdict':'FAIR'}),
            lambda d:d.update(topfive_diff_sha256='d'*64),lambda d:d['new_rows']['microsoft-decision-1-r2'].update(treatment='ranked'),
            lambda d:d['exceptions']['jeff_1_1_large'].update(disclosure={}),lambda d:d['exceptions'].pop('jeff_1_1_large'),lambda d:d['same_draw'].update(status='equated')]:
 d=copy.deepcopy(proof);mut(d)
 try:check_approval(W,d)
 except (AssertionError,KeyError):negatives+=1
 else:raise AssertionError('bad approval accepted')
assert (sha(pub),sha(pub14),sha(appr))==before,'real manifests/approval changed'
(R/'HELPERS.json').write_text(json.dumps({'status':'PASS','real_v1714_review':json.loads(pub14.read_text())['review']['verdict'],'real_flip_dry_run_accepted_no_write':True,'synthetic_flip_dry_run':True,'stale_predecessor_binding_refused':True,'real_manifests_unchanged':before,'pending_freeze_refused':True,'fixture_flip_refused':True,'synthetic_freeze_dry_run':True,'seal_write_refused':True,'standing_go_checked':True,'approval_negative_cases':negatives,'fixture_grants_no_authority':True},indent=1)+'\n')
print('PASS flip/freeze dry runs (real tree: v1.7.14 PASS, dry-run flip accepted without writing, freeze refused while PENDING; synthetic tree OK), stale-binding refusal, fixture non-dry flip refused, seal-write refusal,',negatives,'approval negatives; real manifests unchanged')
