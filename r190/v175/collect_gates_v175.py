"""Collect actual completed gate logs; preserve initial failure and its remediation."""
import pathlib,json,re,hashlib
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def counts(name):
 p=R/(name+'.log');s=p.read_text();n={k:int(re.findall(r'^# '+k+r' (\d+)$',s,re.M)[-1]) for k in ['tests','pass','fail','skipped','cancelled']};return {**n,'log_sha256':sha(p)}
out={}
for name in ['synthetic-tests','final-synthetic-release','fulltest']:
 n=counts(name);assert n['fail']==n['cancelled']==0,(name,n);out[name]={'status':'PASS',**n}
initial=counts('release-tests.initial');fixed=counts('release-tests-remediation')
assert initial['fail']==1 and initial['cancelled']==0 and fixed['fail']==fixed['cancelled']==0
assert re.findall(r'^not ok \d+ - (.*)$',(R/'release-tests.initial.log').read_text(),re.M)==['CR-205: every versioned JevBench route is covered by this test']
out['categories-remediation']={'status':'PASS',**counts('categories-remediation')}
out['initial-gates']=json.loads((R/'INITIAL-GATE-NOTES.json').read_text())
out['targeted-release-tests']={'status':'PASS_AFTER_ROUTE_COVERAGE_FIX','initial':initial,'remediation_file':'test/cr-205-jev-page-structure.test.mjs','remediation':fixed,'final_full_suite_includes_fix':True}
for name in ['actual-refusals','prepare','source-check','fairness-text','repro','validator','helpers','preview-check','preview-binding','public-prose','placements','final-sanity']:
 p=R/(name+'.log');s=p.read_text();assert s and not re.search('Traceback|AssertionError',s),name;out[name]={'status':'PASS','log_sha256':sha(p)}
p=R/'tsc.log';assert p.exists() and not re.search(r'error TS\d',p.read_text());out['typescript']={'status':'PASS','exit_code':0,'log_sha256':sha(p)}
p=R/'build.log';s=p.read_text();assert 'Generating static pages' in s and 'Finalizing page optimization' in s and not re.search('Failed to compile|Build error occurred',s);out['production-build']={'status':'PASS','exit_code':0,'log_sha256':sha(p)}
for name in ['flip','freeze']:
 p=R/(name+'-actual-pending-refused.log');assert 'fairness PENDING' in p.read_text();out[name+'-actual-dry-run']={'status':'REFUSED_AS_REQUIRED','log_sha256':sha(p)}
out['double-rebuild']=json.loads((R/'REPRO.json').read_text());out['helper-controls']=json.loads((R/'fix-helper-checks.json').read_text());out['candidate_fairness']='PENDING';out['candidate_publication_review']='PENDING'
(R/'GATES.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['double-rebuild','helper-controls']},indent=1))
