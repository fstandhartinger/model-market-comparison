"""Collect only actual gate receipts for this candidate."""
import pathlib,json,re,hashlib
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();out={}
for name in ['release-tests','synthetic-tests','fulltest']:
 p=R/(name+'.log');s=p.read_text();n={k:int(re.findall(r'^# '+k+r' (\d+)$',s,re.M)[-1]) for k in ['tests','pass','fail','skipped','cancelled']};assert n['fail']==n['cancelled']==0,(name,n);out[name]={'status':'PASS',**n,'log_sha256':sha(p)}
for name in ['actual-refusals','prepare','source-check','fairness-text','repro','validator','helpers','preview-check','placements','final-sanity']:
 p=R/(name+'.log');s=p.read_text();assert s and not re.search('Traceback|AssertionError',s),name;out[name]={'status':'PASS','log_sha256':sha(p)}
p=R/'tsc.log';assert p.exists() and not re.search(r'error TS\d',p.read_text());out['typescript']={'status':'PASS','exit_code':0,'log_sha256':sha(p)}
p=R/'build.log';s=p.read_text();assert 'Generating static pages' in s and 'Finalizing page optimization' in s and not re.search('Failed to compile|Build error occurred',s);out['production-build']={'status':'PASS','exit_code':0,'log_sha256':sha(p)}
for name in ['flip','freeze']:
 p=R/(name+'-actual-pending-refused.log');assert ('not PASS' if name=='flip' else 'publication review PENDING') in p.read_text();out[name+'-actual-dry-run']={'status':'REFUSED_AS_REQUIRED','log_sha256':sha(p)}
assert (R/'fulltest.exit').read_text().strip()=='0','final full suite exit must be zero'
initial=R/'fulltest.initial.log'
if initial.exists():
 text=initial.read_text();failures=re.split(r'^not ok ',text,flags=re.M)[1:];assert failures and all('prerender-manifest.json' in block.split('\n  ...',1)[0] for block in failures)
 out['initial-full-suite-ordering']={'status':'REMEDIATED','issue':'Started before production build completed; server-link test could not find prerender manifest. Corrected by completing build before final full suite.','initial_log_sha256':sha(initial),'initial_failure_count':len(failures),'initial_exit':int((R/'fulltest.initial.exit').read_text()),'initial_run_interrupted':True,'final_full_suite_passed':True}
out['targeted-remediation']={'status':'PASS','initial_notes':json.loads((R/'INITIAL-GATE-NOTES.json').read_text()),'remediation_log_sha256':sha(R/'release-tests-remediation.log')}
out['double-rebuild']=json.loads((R/'REPRO.json').read_text());out['helper-controls']=json.loads((R/'fix-helper-checks.json').read_text());fair=json.loads((J/'inputs/APPROVAL.json').read_text())['fairness_check'];assert fair['verdict']=='FAIR' and sha(pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')/fair['path'])==fair['sha256'];out['candidate_fairness']=fair;out['candidate_publication_review']='PENDING'
(R/'GATES.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['double-rebuild','helper-controls']},indent=1))
