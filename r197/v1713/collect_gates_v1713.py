"""Collect the actual outcome of every gate run for v1.7.13 (no promotion of PENDING; failures are recorded, not hidden)."""
import pathlib,json,hashlib,re
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';W=J.parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();L=lambda n:json.loads((R/n).read_text())
def tap(name):
 p=R/name;s=p.read_text();c={k:sum(int(x) for x in re.findall(r'^# '+k+r' (\d+)$',s,re.M)) for k in ['tests','pass','fail','skipped','cancelled']}
 return {**c,'not_ok':re.findall(r'^not ok \d+ - (.*)$',s,re.M),'log_sha256':sha(p)}
out={}
for name in ['repro','source','validator','helpers','preview-check','raw','pricing-references','public-text','visibility']:
 p=R/(name+'.log');s=p.read_text();assert 'PASS' in s and not re.search('Traceback|AssertionError|Error:',s),name;out[name]={'status':'PASS','log_sha256':sha(p)}
out['release-tests-pending']=tap('release-tests.log')
# Known PENDING-state failure (pre-existing at 17d4b9e8): the recorded topics exception names the new row, which the PENDING
# tree hides, so the breakdown gate reports an orphan exception. It must pass in the post-flip simulation (asserted below).
GATE='gate: no listed row lacks topic, use-case or language cells without a recorded exception'
assert out['release-tests-pending']['not_ok']in([],[GATE]) and out['release-tests-pending']['fail']==len(out['release-tests-pending']['not_ok'])
out['release-tests-pending']['note']='PENDING state: only the breakdown gate fails (orphan topics exception while the row is hidden; pre-existing at 17d4b9e8); it passes post-flip'
out['postflip-release-suites']=tap('postflip-tests.log');assert out['postflip-release-suites']['fail']==0
out['postflip-breakdown-gate']=tap('postflip-fix-tests.log');assert out['postflip-breakdown-gate']['fail']==0 and out['postflip-breakdown-gate']['tests']>0
out['fulltest-postflip-once']=tap('fulltest-postflip.log')
out['fulltest-postflip-once']['note']='Full npm test run once in the simulated post-flip state (unranked row, standing GO, synthetic PASS manifest).'
out['fulltest-postflip-once']['exit']=L('FULLTEST-POSTFLIP-EXIT.json')
p=R/'tsc.log';assert not re.search(r'error TS\d',p.read_text());out['typescript']={'status':'PASS','exit_code':0,'log_sha256':sha(p)}
p=R/'build-postflip.log';s=p.read_text();m=re.search(r'Generating static pages \((\d+)/(\d+)\)\s*$',s,re.M) or re.findall(r'Generating static pages \((\d+)/(\d+)\)',s)
pages=re.findall(r'Generating static pages \((\d+)/(\d+)\)',s)[-1];assert pages[0]==pages[1] and L('BUILD-POSTFLIP-EXIT.json')['exit_code']==0 and 'restored byte-equal' in s and '/jev-models/v1.7.13' in s
out['production-build-postflip']={'status':'PASS','pages':f'{pages[0]}/{pages[1]}','log_sha256':sha(p)}
for name in ['CARRIED-ROWS','COST-KIND','HELPERS','REPRO','PREVIEW','CHANGED-LISTS-BY-ROW','PRICING-REFERENCES','RAW-BINDING','PUBLIC-TEXT','VISIBILITY-POSTFLIP']:out[name]=L(name+'.json')
proof=json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-proof.json').read_text());fair=proof['publication_approval']['fairness_check']['verdict'];assert fair=='SUSPICIOUS' and proof['publication_approval']['top_five_effect']=='unchanged'
d=L('topfive-diff.json');cl=L('CHANGED-LISTS-BY-ROW.json');out['top-five']={'changed':d['changed'],'changed_lists':d['changed_lists'],'lists':d['lists'],'slider_changed_states':d['slider_changed_states'],'custom_changed_labels':d['custom_changed_labels'],'slider_grid_changed':d['explicit_slider_grid_changed'],'single_entrant_lists':cl['lists'],'single_entrant_changed':cl['total_changed']}
assert not d['changed'] and d['changed_lists']==0 and d['slider_changed_states']==0 and not d['custom_changed_labels'] and d['explicit_slider_grid_changed']==0 and cl['total_changed']==0
assert json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-publication.json').read_text())['review']['verdict']=='PENDING'
out.update(status='PASS_WITH_OPEN_ITEMS',fairness=fair,publication_review='PENDING',open_items=['independent publication review PENDING (flip_verdict_v1713.py binds a real PASS receipt)'])
(R/'GATES.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('collected; fairness',fair,'(row unranked); top-five changed lists',d['changed_lists'],'of',d['lists'],'; full suite once:',out['fulltest-postflip-once']['tests'],'tests',out['fulltest-postflip-once']['fail'],'fail')
