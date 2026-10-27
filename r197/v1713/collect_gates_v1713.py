"""Collect the actual outcome of every gate run for v1.7.13 (no promotion of PENDING; failures are recorded, not hidden)."""
import pathlib,json,hashlib,re
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';W=J.parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();L=lambda n:json.loads((R/n).read_text())
def tap(name):
 p=R/name;s=p.read_text();c={k:sum(int(x) for x in re.findall(r'^# '+k+r' (\d+)$',s,re.M)) for k in ['tests','pass','fail','skipped','cancelled']}
 return {**c,'not_ok':re.findall(r'^not ok \d+ - (.*)$',s,re.M),'log_sha256':sha(p)}
out={}
for name in ['repro','source','validator','helpers','preview-check','raw','pricing-references']:
 p=R/(name+'.log');s=p.read_text();assert 'PASS' in s and not re.search('Traceback|AssertionError|Error:',s),name;out[name]={'status':'PASS','log_sha256':sha(p)}
out['release-tests-pending']=tap('release-tests.log');assert out['release-tests-pending']['fail']==0
out['postflip-release-suites']=tap('postflip-tests.log');assert out['postflip-release-suites']['fail']==0
out['fulltest-postflip-once']=tap('fulltest-postflip.log')
out['fulltest-postflip-once']['note']='Full npm test run once in the simulated post-flip state; the 4 failures were fixed (3 tests choosing a ranks fixture by newest release now include v1.7.13; the topics gate needs a recorded exception, helper add_topics_exception_v1713.py) and re-verified below; the full suite was not re-run.'
out['postflip-fix-recheck']=tap('postflip-fix-tests.log');out['postflip-fix-recheck']['note']='The 4 previously failing suites plus the release test, post-flip, with a SYNTHETIC topics exception applied temporarily and removed afterwards'
assert out['postflip-fix-recheck']['fail']==0
p=R/'tsc.log';assert not re.search(r'error TS\d',p.read_text());out['typescript']={'status':'PASS','exit_code':0,'log_sha256':sha(p)}
p=R/'build-postflip.log';s=p.read_text();m=re.search(r'Generating static pages \((\d+)/(\d+)\)\s*$',s,re.M) or re.findall(r'Generating static pages \((\d+)/(\d+)\)',s)
pages=re.findall(r'Generating static pages \((\d+)/(\d+)\)',s)[-1];assert pages[0]==pages[1] and L('BUILD-POSTFLIP-EXIT.json')['exit_code']==0 and 'restored byte-equal' in s and '/jev-models/v1.7.13' in s
out['production-build-postflip']={'status':'PASS','pages':f'{pages[0]}/{pages[1]}','log_sha256':sha(p)}
for name in ['CARRIED-ROWS','COST-KIND','HELPERS','REPRO','PREVIEW','CHANGED-LISTS-BY-ROW','PRICING-REFERENCES','RAW-BINDING']:out[name]=L(name+'.json')
proof=json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-proof.json').read_text());fair=proof['publication_approval']['fairness_check']['verdict']
assert json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-publication.json').read_text())['review']['verdict']=='PENDING'
out.update(status='PASS_WITH_OPEN_ITEMS',fairness=fair,publication_review='PENDING',open_items=['fairness review not bound (PENDING): flip/freeze refuse until bind_fair_v1713.py runs','topics breakdown exception needs a recorded decision (add_topics_exception_v1713.py --decision ...)'])
(R/'GATES.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('collected; fairness',fair,'; full suite once:',out['fulltest-postflip-once']['tests'],'tests',out['fulltest-postflip-once']['fail'],'fail (fixed, rechecked',out['postflip-fix-recheck']['pass'],'/',out['postflip-fix-recheck']['tests'],')')
