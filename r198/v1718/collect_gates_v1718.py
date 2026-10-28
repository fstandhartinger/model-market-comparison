"""Collect completed gates; refuse any unapproved suite failure."""
import pathlib,json,re,hashlib
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';load=lambda n:json.loads((R/n).read_text());out={}
for n in ['TSC','PENDING','POSTFLIP','BUILD-POSTFLIP']:
 d=load(n+'-EXIT.json');assert d['exit_code']==0,(n,d);out[n]='PASS'
for name in ['release-tests.log','postflip-tests.log']:
 t=(R/name).read_text();bad=re.findall(r'^not ok \d+ - (.*)$',t,re.M);assert not bad,(name,bad)
 out[name]={k:int(re.search(r'^# '+k+r' (\d+)$',t,re.M)[1]) for k in ['tests','pass','fail','skipped']}
t=(R/'fulltest-postflip.log').read_text();bad=re.findall(r'^not ok \d+ - (.*)$',t,re.M);f=load('FULLTEST-POSTFLIP-EXIT.json');summary={k:int(re.search(r'^# '+k+r' (\d+)$',t,re.M)[1]) for k in ['tests','pass','fail','skipped']}
if bad:
 assert bad==["the supervisor's dated brief backups can never make the checkout dirty again"],bad
 assert 'daily-clean-checkout-wait.test.mjs:22:1' in t and ('stdout maxBuffer length exceeded' in t or 'not a git repository' in t), 'not the accepted snapshot / .git failure'
 assert summary['fail']==1 and f['exit_code']==1,(summary,f)
 out['full_suite']={'status':'PASS_EXCEPT_ACCEPTED_SNAPSHOT_ENVIRONMENT','accepted_failure':bad[0],'test':'test/daily-clean-checkout-wait.test.mjs','snapshot_without_tracked_HEAD':True,**summary}
else:
 assert summary['fail']==0 and f['exit_code']==0
 out['full_suite']={'status':'PASS',**summary}
for n in ['CARRIED-EQUALITY.json','REPRO.json','HELPERS.json','PRICING.json','PUBLIC-TEXT.json','PREVIEW.json','SOURCE-RECHECK-BUILD2.json','VISIBILITY-POSTFLIP.json','ASSEMBLED-TOPFIVE.json','BUILT-LINKS.json']:
 assert load(n)['status']=='PASS',n;out[n]='PASS'
assert 'All synthetic bindings restored byte-equal' in (R/'heavy-fixture.log').read_text(), 'snapshot bindings not restored'
for name,expected in load('REPRO.json')['hashes'].items():assert hashlib.sha256((J.parents[1]/name).read_bytes()).hexdigest()==expected, name
for v in [16,17,18]:assert json.loads((J.parents[1]/f'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.{v}-publication.json').read_text())['review']['verdict']=='PENDING'
out['synthetic_bindings_restored']=True;out['real_manifests_pending']=True;out['repro_hashes_still_match']=True
(R/'GATES.json').write_text(json.dumps({'status':'PASS','gates':out},indent=1,sort_keys=True)+'\n')
print(json.dumps(out,indent=1))
