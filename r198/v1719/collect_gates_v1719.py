"""Fail closed on every unexpected failure. One full-suite invocation; sole exception = missing snapshot .git/HEAD."""
import pathlib,json,re,hashlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];R=J/'receipts';L=lambda n:json.loads((R/n).read_text());out={}
for name in ['TSC','PENDING','POSTFLIP','BUILD-POSTFLIP']:
 x=L(name+'-EXIT.json');assert x['exit_code']==0,(name,x);out[name]='PASS'
for name in ['release-tests.log','postflip-tests.log']:
 s=(R/name).read_text();assert not re.findall(r'^not ok \d+ - (.*)$',s,re.M),(name,re.findall(r'^not ok \d+ - (.*)$',s,re.M));out[name]={k:int(re.search(r'^# '+k+r' (\d+)$',s,re.M)[1]) for k in ['tests','pass','fail','skipped']}
s=(R/'fulltest-postflip.log').read_text();bad=re.findall(r'^not ok \d+ - (.*)$',s,re.M);summary={k:int(re.search(r'^# '+k+r' (\d+)$',s,re.M)[1]) for k in ['tests','pass','fail','skipped']};exit_code=L('FULLTEST-POSTFLIP-EXIT.json')['exit_code']
if bad:
 assert bad==["the supervisor's dated brief backups can never make the checkout dirty again"],bad
 assert 'daily-clean-checkout-wait.test.mjs:22:1' in s and 'not a git repository' in s
 assert summary['fail']==1 and exit_code==1
 out['full_suite']={'status':'PASS_EXCEPT_ACCEPTED_SNAPSHOT_ENVIRONMENT','invocations':1,'accepted_test':'test/daily-clean-checkout-wait.test.mjs','reason':'heavy snapshot has no .git/HEAD',**summary}
else:
 assert exit_code==0 and summary['fail']==0
 out['full_suite']={'status':'PASS','invocations':1,**summary}
for n in ['CARRIED-ROWS.json','REPRO.json','HELPERS.json','PUBLIC-TEXT.json','PREVIEW.json','VALIDATOR.json','VISIBILITY-POSTFLIP.json','ASSEMBLED-TOPFIVE.json','BUILT-LINKS.json']:
 assert L(n)['status']=='PASS',n;out[n]='PASS'
for k,x in L('PRICING.json').items():assert not x['rankable'] and not x['counting_list_price'] and x['market_reference'] is None and x['usd_per_1000'] is None,k
for k,x in L('RAW-BINDING.json').items():assert x['rows']==1500 and x['answered']==1495 and x['over_limit_misses']==5 and x['refused_set_sha256'].startswith('3a0cbf0c') and x['frozen_common_n']==1489 and x['served_identity_matches'],k
assert 'All synthetic bindings restored byte-equal' in (R/'heavy-fixture.log').read_text()
for f,h in L('REPRO.json')['hashes'].items():assert hashlib.sha256((W/f).read_bytes()).hexdigest()==h,f
for v in [18,19]:assert json.loads((W/f'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.{v}-publication.json').read_text())['review']['verdict']=='PENDING'
assert json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.17-publication.json').read_text())['review']['verdict']=='PASS'
(R/'GATES.json').write_text(json.dumps({'status':'PASS','gates':out,'synthetic_bindings_restored':True,'real_manifests_pending':True},indent=1,sort_keys=True)+'\n');print(json.dumps(out,indent=1))
