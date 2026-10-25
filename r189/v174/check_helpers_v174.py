"""Dry-run helpers in an isolated fixture: PENDING refusal, FAIR acceptance and tamper checks."""
import hashlib,json,os,pathlib,shutil,subprocess,tempfile
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=pathlib.Path('data/raw/benchmarks/jevbench/v1.7')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
checks=[];approval_before=sha(J/'inputs/APPROVAL.json')
with tempfile.TemporaryDirectory(prefix='.helper-check-',dir=J) as t:
 T=pathlib.Path(t);(T/V).mkdir(parents=True);(T/'r189/v174/receipts').mkdir(parents=True)
 for p in (W/V).glob('jevbench-v1.7.[34]-*.json'):shutil.copyfile(p,T/V/p.name)
 shutil.copyfile(J/'receipts/topfive-diff.json',T/'r189/v174/receipts/topfive-diff.json')
 receipt=T/'synthetic-release-review.json';put(receipt,{'verdict':'PASS','engine':'synthetic-helper-test-only'})
 manifest=T/V/'jevbench-v1.7.4-publication.json';proof=T/V/'jevbench-v1.7.4-proof.json'
 output=T/'r189/v174/receipts/freeze-dry-run.json'
 d=json.loads(proof.read_text());d['publication_approval']['fairness_check']['verdict']='PENDING';put(proof,d)
 m=json.loads(manifest.read_text());m['files']['proof']['sha256']=sha(proof);put(manifest,m)
 def run(script,args,ok,pattern=None):
  before=sha(manifest)
  r=subprocess.run(['python3','-B',str(J/script),*map(str,args)],env={**os.environ,'WT':str(T)},text=True,capture_output=True)
  assert (r.returncode==0)==ok,(script,r.stdout,r.stderr)
  assert sha(manifest)==before,'dry run changed manifest'
  if pattern:assert pattern in r.stderr,(script,r.stderr)
  return r
 flip=('flip_verdict_v174.py',[receipt,'--dry-run']);freeze=('freeze_v174.py',['--wt',T,'--output',output])
 for script,args in [flip,freeze]:
  r=run(script,args,False,'fairness PENDING');(J/'receipts'/('flip-pending-refused.log' if script.startswith('flip') else 'freeze-pending-refused.log')).write_text(r.stderr)
 checks.append('injected PENDING fairness refused by both dry-run helpers; manifest unchanged')
 fair=T/'synthetic-fairness-only.json';put(fair,{'fixture_only':True,'verdict':'FAIR','publication_authority':False})
 original_proof=proof.read_bytes()
 def rebind():
  m=json.loads(manifest.read_text());m['files']['proof']['sha256']=sha(proof);put(manifest,m)
 d=json.loads(original_proof);d['publication_approval']['fairness_check']={'path':str(fair),'verdict':'FAIR','sha256':sha(fair)};put(proof,d);rebind()
 r=run(*flip,True);(J/'receipts/flip-fair-synthetic-dry-run.json').write_text(r.stdout)
 run(*freeze,True);add=json.loads(output.read_text())
 assert add['remeasured_rows']==d['remeasured_rows'] and add['carried_rows']==290 and add['publication_review']['verdict']=='PENDING'
 # Explicitly labelled synthetic fixture; no real fairness verdict or publication review is supplied.
 (J/'receipts/freeze-fair-synthetic-dry-run.json').write_bytes(output.read_bytes())
 checks.append('synthetic FAIR/hash-bound fixture: dry-run flip and full freeze succeed; no manifest or seal write')
 fair.write_bytes(fair.read_bytes()+b'\n')
 for script,args in [flip,freeze]:run(script,args,False,'fairness receipt missing or changed')
 checks.append('tampered fairness receipt refused')
 fair.write_bytes(fair.read_bytes()[:-1])
 put(fair,{'fixture_only':True,'verdict':'UNFAIR'})
 d=json.loads(proof.read_text());d['publication_approval']['fairness_check']['sha256']=sha(fair);put(proof,d);rebind()
 for script,args in [flip,freeze]:run(script,args,False,'fairness receipt content must be FAIR')
 checks.append('hash-bound non-FAIR receipt content refused')
 put(fair,{'fixture_only':True,'verdict':'FAIR','publication_authority':False})
 d=json.loads(proof.read_text());d['publication_approval']['fairness_check']['sha256']=sha(fair);put(proof,d);rebind()

 put(receipt,{'verdict':'PASS_WITH_CONDITIONS','engine':'synthetic-helper-test-only'})
 run(*flip,False,'not PASS');checks.append('conditional release review refused')
 put(receipt,{'verdict':'PASS','engine':'synthetic-helper-test-only'})
 pred=T/V/'jevbench-v1.7.3-publication.json';pred.write_bytes(pred.read_bytes()+b'\n')
 for script,args in [flip,freeze]:run(script,args,False)
 checks.append('unbound predecessor refused by both helpers')
assert json.loads((W/V/'jevbench-v1.7.4-publication.json').read_text())['review']['verdict']=='PENDING'
assert sha(J/'inputs/APPROVAL.json')==approval_before
(J/'receipts/fix-helper-checks.json').write_text(json.dumps({'status':'PASS','checks':checks},indent=1)+'\n')
print('\n'.join(checks))
