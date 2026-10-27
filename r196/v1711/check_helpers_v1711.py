"""Dry runs and refusal checks; only synthetic fixtures can satisfy FAIR/publication checks."""
import json,pathlib,subprocess,hashlib,os,copy
from approval_v1711 import check_approval
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];P=J/'.pass';R=J/'receipts';V='data/raw/benchmarks/jevbench/v1.7/'
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
run=lambda argv,**kw:subprocess.run(argv,text=True,capture_output=True,**kw)
pub=W/(V+'jevbench-v1.7.11-publication.json');before=sha(pub);proof=json.loads((W/(V+'jevbench-v1.7.11-proof.json')).read_text());changed=proof['publication_approval']['top_five_effect']=='changed'
fixture=R/'DRYRUN-REVIEW-FIXTURE.json';put(fixture,{'verdict':'PASS','engine':'fixture-only: dry-run input, no authority'})
x=run(['python3','-B',str(J/'flip_verdict_v1711.py'),str(fixture),'--dry-run']);(R/'flip-pending.log').write_text(x.stdout+x.stderr)
assert (x.returncode!=0 and 'fairness PENDING' in x.stderr) if changed else x.returncode==0
x=run(['python3','-B',str(J/'freeze_v1711.py'),'--wt',str(W),'--output',str(R/'actual-must-not-exist.json')]);(R/'freeze-pending-refused.log').write_text(x.stdout+x.stderr);assert x.returncode!=0;assert not (R/'actual-must-not-exist.json').exists()
subprocess.run(['python3','-B',str(J/'make_passtree_v1711.py')],check=True)
pr=P/'r196/v1711/receipts';pr.mkdir(parents=True,exist_ok=True);(pr/'topfive-diff.json').write_bytes((R/'topfive-diff.json').read_bytes());fair=pr/'FAIR-FIXTURE.json';put(fair,{'verdict':'FAIR','engine':'synthetic fixture only; no publication authority'})
pp=P/(V+'jevbench-v1.7.11-proof.json');p=json.loads(pp.read_text());p['publication_approval']['fairness_check']={'path':str(fair),'verdict':'FAIR','sha256':sha(fair)};put(pp,p)
mp=P/(V+'jevbench-v1.7.11-publication.json');m=json.loads(mp.read_text());m['files']['proof']['sha256']=sha(pp);m['review']={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None};put(mp,m)
check_approval(P,p)
x=run(['python3','-B',str(J/'flip_verdict_v1711.py'),str(fixture),'--dry-run'],env={**os.environ,'WT':str(P)});(R/'flip-dry-run.log').write_text(x.stdout+x.stderr);assert x.returncode==0,x.stderr
m['review']={'engine':'synthetic-fixture-only','verdict':'PASS','receipt_sha256':'a'*64};put(mp,m)
(pr/'freeze.json').unlink(missing_ok=True)
x=run(['python3','-B',str(J/'freeze_v1711.py'),'--wt',str(P),'--output',str(pr/'freeze.json')]);(R/'freeze-dry-run.log').write_text(x.stdout+x.stderr);assert x.returncode==0,x.stderr
(R/'FREEZE-SYNTHETIC-DRYRUN.json').write_bytes((pr/'freeze.json').read_bytes())
x=run(['python3','-B',str(J/'freeze_v1711.py'),'--wt',str(P),'--output',str(pr/'forbidden.json'),'--write']);(R/'freeze-write-refused.log').write_text(x.stdout+x.stderr);assert x.returncode!=0 and 'never writes a seal' in x.stderr
negative=0
if changed:
 for field,value in [('verdict','PENDING'),('sha256','a'*64)]:
  d=copy.deepcopy(p);d['publication_approval']['fairness_check'][field]=value
  try:check_approval(P,d)
  except AssertionError:negative+=1
  else:raise AssertionError('invalid FAIR accepted')
assert sha(pub)==before
put(R/'HELPERS.json',{'status':'PASS','real_pending_flip_refused':changed,'synthetic_flip_dry_run':True,'pending_freeze_refused':True,'synthetic_freeze_dry_run':True,'seal_write_refused':True,'fairness_negative_cases':negative,'real_manifest_unchanged':before,'fixture_grants_no_authority':True})
print('PASS actual pending refusal, synthetic flip/freeze dry runs, seal-write refusal and FAIR negatives; real manifest unchanged')
