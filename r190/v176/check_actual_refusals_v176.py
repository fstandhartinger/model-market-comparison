"""Check final real candidate dry-run refusals without any publication or seal write."""
import pathlib,subprocess,hashlib,json
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];R=J/'receipts';M=W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.6-publication.json'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();before=sha(M);out=R/'freeze-actual-dry-run.json';assert not out.exists()
checks={}
pending=R/'actual-pending-release-review.json';review=json.loads(M.read_text())['review'];assert review['verdict']=='PENDING';pending.write_text(json.dumps(review)+'\n')
for name,args in [('flip',['flip_verdict_v176.py',str(pending),'--dry-run']),('freeze',['freeze_v176.py','--wt',str(W),'--output',str(out)])]:
 r=subprocess.run(['python3','-B',str(J/args[0]),*args[1:]],cwd=W,text=True,capture_output=True)
 assert r.returncode!=0 and ('not PASS' if name=='flip' else 'publication review PENDING') in r.stderr and sha(M)==before,(name,r.returncode)
 (R/(name+'-actual-pending-refused.log')).write_text(r.stdout+r.stderr)
 checks[name]={'exit_code':r.returncode,'refused_pending_publication_review':True,'manifest_unchanged':True}
assert not out.exists()
(R/'ACTUAL-REFUSALS.json').write_text(json.dumps({'status':'PASS','checks':checks,'manifest_sha256':before,'freeze_output_absent':True},indent=1,sort_keys=True)+'\n');print('PASS final actual candidate flip/freeze dry runs refused; manifest unchanged; no seal/output write')
