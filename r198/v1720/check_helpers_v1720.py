import json,pathlib,subprocess,hashlib,copy,tempfile,shutil,os
from approval_v1720 import check_approval
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];R=J/'receipts';V=W/'data/raw/benchmarks/jevbench/v1.7'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();files=[V/f'jevbench-v1.7.{v}-publication.json' for v in [16,17,18,19]];before={str(p):sha(p) for p in files}
f=R/'DRYRUN-REVIEW-FIXTURE.json';f.write_text(json.dumps({'verdict':'PASS','engine':'fixture-only: dry-run input; no review authority'})+'\n')
run=lambda args:subprocess.run(args,capture_output=True,text=True)
x=run(['python3','-B',str(J/'flip_verdict_v1720.py'),str(f),'--dry-run']);(R/'flip-dry-run-real.log').write_text(x.stdout+x.stderr);assert x.returncode==0 and '"dry_run": true' in x.stdout,x.stderr
x=run(['python3','-B',str(J/'freeze_v1720.py'),'--wt',str(W),'--output',str(R/'actual-must-not-exist.json')]);(R/'freeze-pending-refused.log').write_text(x.stdout+x.stderr);assert x.returncode!=0 and 'publication review PENDING' in x.stderr,x.stderr;assert not (R/'actual-must-not-exist.json').exists()
# A stale predecessor binding is rejected in a disposable fixture, using dry-run only.
with tempfile.TemporaryDirectory(prefix='helper-stale-',dir=R) as td:
 root=pathlib.Path(td);v=root/'data/raw/benchmarks/jevbench/v1.7';v.mkdir(parents=True)
 man=json.loads((V/'jevbench-v1.7.20-publication.json').read_text())
 for info in man['files'].values():shutil.copyfile(W/info['path'],root/info['path'])
 shutil.copyfile(V/'jevbench-v1.7.19-publication.json',v/'jevbench-v1.7.19-publication.json')
 man['predecessor']['publication_sha256']='b'*64;(v/'jevbench-v1.7.20-publication.json').write_text(json.dumps(man)+'\n')
 x=subprocess.run(['python3','-B',str(J/'flip_verdict_v1720.py'),str(f),'--dry-run'],capture_output=True,text=True,env={**os.environ,'WT':str(root)})
 (R/'flip-stale-binding-refused.log').write_text(x.stdout+x.stderr);assert x.returncode!=0 and 'bound to an older v1.7.19 manifest' in x.stderr
# Refuse fixture publication; no non-dry invocation (even one expected to fail).
proof=json.loads((V/'jevbench-v1.7.20-proof.json').read_text());check_approval(W,proof);negatives=0
for mut in [lambda d:d['publication_approval'].update(status='wrong'),lambda d:d['publication_approval'].update(top_five_effect='changed'),lambda d:d['publication_approval'].update(fresh_baseline='v1.7.16'),lambda d:d.update(topfive_diff_sha256='a'*64),lambda d:d.update(carried_rows_equal_except=['rank','ranks','axes']),lambda d:d['cost_basis'].update(n_items=1500),lambda d:d['exceptions'].update({'x':{'axes':{}}})]:
 d=copy.deepcopy(proof);mut(d)
 try:check_approval(W,d)
 except (AssertionError,KeyError):negatives+=1
 else:raise AssertionError('bad approval accepted')
assert before=={str(p):sha(p) for p in files}
(R/'HELPERS.json').write_text(json.dumps({'status':'PASS','dry_flip_accepted_without_write':True,'freeze_refused_while_pending':True,'approval_negatives':negatives,'manifests_unchanged':before,'non_dry_flip_invoked':False,'seal_write_invoked':False,'stale_binding_dry_run_refused':True},indent=1)+'\n')
print('PASS dry flip accepted, PENDING freeze refused,',negatives,'approval negatives, manifests byte equal')
