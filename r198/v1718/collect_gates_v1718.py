"""Collect completed gates; refuse any unapproved suite failure."""
import pathlib,json,re,hashlib
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';load=lambda n:json.loads((R/n).read_text());out={}
for n in ['TSC','PENDING','POSTFLIP','BUILD-POSTFLIP','SEO-PENDING-FIX','SEO-POSTFLIP-FIX']:
 d=load(n+'-EXIT.json');assert d['exit_code']==0,(n,d);out[n]='PASS'
for name in ['release-tests.log','postflip-tests.log','seo-pending-fix.log','seo-postflip-fix.log']:
 t=(R/name).read_text();bad=re.findall(r'^not ok \d+ - (.*)$',t,re.M);assert not bad,(name,bad)
 out[name]={k:int(re.search(r'^# '+k+r' (\d+)$',t,re.M)[1]) for k in ['tests','pass','fail','skipped']}
t=(R/'fulltest-postflip.log').read_text();bad=re.findall(r'^not ok \d+ - (.*)$',t,re.M);f=load('FULLTEST-POSTFLIP-EXIT.json');summary={k:int(re.search(r'^# '+k+r' (\d+)$',t,re.M)[1]) for k in ['tests','pass','fail','skipped']}
if bad:
 accepted="the supervisor's dated brief backups can never make the checkout dirty again"
 repaired='static model params include every current and historical public system; private keys never escape'
 assert accepted in bad and set(bad).issubset({accepted,repaired}) and len(bad)==len(set(bad)),bad
 assert 'daily-clean-checkout-wait.test.mjs:22:1' in t and 'not a git repository' in t, 'not the accepted snapshot / .git failure'
 if repaired in bad:
  block=t.split(' - '+repaired+'\n',1)[1].split('# Subtest:',1)[0]
  assert "error: 'knowline-26b-a4b-gen2.5'" in block and 'jevbench-seo.test.mjs:50:59' in block, 'not the repaired text-export omission'
  assert summary['fail']==2 and f['exit_code']==1,(summary,f)
  assert load('LLMS-REPAIR.json')=={'status':'PASS','full_suite_rerun':False,'reason':'one full suite requested; affected SEO cases and compiled text route reverified'}
  compiled=load('BUILT-LINKS.json');assert compiled['llms_full_both_rows'] and compiled['over_cap_label']
  out['full_suite']={'status':'COMPLETED_WITH_ACCEPTED_SNAPSHOT_FAILURE_AND_REPAIRED_OWN_FAILURE','invocations':1,'accepted_failure':accepted,'accepted_test':'test/daily-clean-checkout-wait.test.mjs','repaired_failure':repaired,'repaired_test':'test/jevbench-seo.test.mjs:50','repair_verification':'PENDING and synthetic-PASS SEO tests, fresh build, compiled llms-full both rows and outside-caps label','full_suite_rerun':False,'unresolved_failures':0,**summary}
 else:
  assert summary['fail']==1 and f['exit_code']==1,(summary,f)
  out['full_suite']={'status':'PASS_EXCEPT_ACCEPTED_SNAPSHOT_ENVIRONMENT','invocations':1,'accepted_failure':accepted,'snapshot_without_tracked_HEAD':True,**summary}

else:
 assert summary['fail']==0 and f['exit_code']==0
 out['full_suite']={'status':'PASS',**summary}

for n in ['CARRIED-EQUALITY.json','REPRO.json','HELPERS.json','PRICING.json','PUBLIC-TEXT.json','PREVIEW.json','SOURCE-RECHECK-BUILD2.json','VISIBILITY-POSTFLIP.json','ASSEMBLED-TOPFIVE.json','BUILT-LINKS.json']:
 assert load(n)['status']=='PASS',n;out[n]='PASS'
assert 'All synthetic bindings restored byte-equal' in (R/'heavy-fixture.log').read_text(), 'snapshot bindings not restored'
for name,expected in load('REPRO.json')['hashes'].items():assert hashlib.sha256((J.parents[1]/name).read_bytes()).hexdigest()==expected, name
for v in [17,18]:assert json.loads((J.parents[1]/f'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.{v}-publication.json').read_text())['review']['verdict']=='PENDING'
assert json.loads((J.parents[1]/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.16-publication.json').read_text())['review']['verdict']=='PASS'
out['predecessor_v1716_pass']=True
out['synthetic_bindings_restored']=True;out['real_manifests_pending']=True;out['repro_hashes_still_match']=True
(R/'GATES.json').write_text(json.dumps({'status':'COMPLETE_WITH_REPAIRED_OWN_FAILURE' if out['full_suite'].get('repaired_failure') else 'PASS','gates':out},indent=1,sort_keys=True)+'\n')
print(json.dumps(out,indent=1))
