"""Collect the actual outcome of every gate run for v1.7.16 (no promotion of PENDING; failures are recorded, not hidden)."""
import pathlib,json,hashlib,re
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';W=J.parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();L=lambda n:json.loads((R/n).read_text())
def tap(name):
 p=R/name;s=p.read_text();c={k:sum(int(x) for x in re.findall(r'^# '+k+r' (\d+)$',s,re.M)) for k in ['tests','pass','fail','skipped','cancelled']}
 return {**c,'not_ok':re.findall(r'^not ok \d+ - (.*)$',s,re.M),'log_sha256':sha(p)}
out={}
for name in ['repro','source','validator','helpers','preview-check','raw','pricing-references','public-text','visibility']:
 p=R/(name+'.log');s=p.read_text();assert 'PASS' in s and not re.search('Traceback|AssertionError|Error:',s),name;out[name]={'status':'PASS','summary':s.strip().splitlines()[-1][:500],'log_sha256':sha(p)}
out['release-tests-pending']=tap('release-tests.log')
# Known PENDING-state failure (pre-existing since v1.7.14): recorded topics exceptions name rows the PENDING tree hides (here the new
# Strike-1 row), so the breakdown gate reports them as orphaned. It must pass in the post-flip simulation (asserted below).
GATE='gate: no listed row lacks topic, use-case or language cells without a recorded exception'
assert out['release-tests-pending']['not_ok'] in ([],[GATE]) and out['release-tests-pending']['fail']==len(out['release-tests-pending']['not_ok']),out['release-tests-pending']['not_ok']
out['postflip-release-suites']=tap('postflip-tests.log');assert out['postflip-release-suites']['fail']==0 and out['postflip-release-suites']['tests']>0
assert 'restored byte-equal' in (R/'postflip-tests.log').read_text()
if (R/'fulltest-postflip.log').exists():
 out['fulltest-postflip-once']=tap('fulltest-postflip.log');out['fulltest-postflip-once']['exit']=L('FULLTEST-POSTFLIP-EXIT.json')
 out['fulltest-postflip-once']['restored_byte_equal']='restored byte-equal' in (R/'fulltest-postflip.log').read_text()
 # The one cancelled test of the full run (a 180 s timeout while the whole suite ran) is re-run alone in the same post-flip state.
 if (R/'mcp-rerun-postflip.log').exists():
  out['fulltest-postflip-once']['cancelled_rerun']={**tap('mcp-rerun-postflip.log'),'file':'test/jevbench-mcp-endpoint.test.mjs','restored_byte_equal':'restored byte-equal' in (R/'mcp-rerun-postflip.log').read_text()}
  f=out['fulltest-postflip-once'];assert f['fail']==0 and f['cancelled']<=1 and f['cancelled_rerun']['fail']==0 and f['cancelled_rerun']['pass']==f['cancelled_rerun']['tests']>0
p=R/'tsc.log';assert not re.search(r'error TS\d',p.read_text());out['typescript']={'status':'PASS','exit_code':0,'log_sha256':sha(p)}
p=R/'build-postflip.log'
if p.exists():
 s=p.read_text();pages=re.findall(r'Generating static pages \((\d+)/(\d+)\)',s)[-1];assert pages[0]==pages[1] and L('BUILD-POSTFLIP-EXIT.json')['exit_code']==0 and 'restored byte-equal' in s and '/jev-models/v1.7.16' in s
 out['production-build-postflip']={'status':'PASS','pages':f'{pages[0]}/{pages[1]}','log_sha256':sha(p),'built_route':L('BUILT-LINKS.json')}
for name in ['CARRIED-ROWS','COMMON-SET-BINDING','COST-KIND','HELPERS','REPRO','PREVIEW','PRICING-REFERENCES','RAW-BINDING','PUBLIC-TEXT','VISIBILITY-POSTFLIP']:out[name]=L(name+'.json')
d=L('topfive-diff.json');cl=L('CHANGED-LISTS-BY-ROW.json')
out['top-five']={'changed':d['changed'],'changed_lists':d['changed_lists'],'lists':d['lists'],'slider_changed_states':d['slider_changed_states'],'slider_states':d['slider_states'],'custom_changed_labels':d['custom_changed_labels'],'slider_grid_changed':d['explicit_slider_grid_changed'],'slider_grid_states':d['explicit_slider_grid_states'],'entrant_counts':cl['entrant_counts'],'leaver_counts':cl['leaver_counts'],'single_entrant_counts':cl['single_entrant_counts']}
pub=json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.16-publication.json').read_text());proof=json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.16-proof.json').read_text())
assert pub['review']['verdict']=='PENDING' and proof['publication_approval']['top_five_effect']=='unchanged' and not d['changed'] and d['changed_lists']==0 and d['slider_changed_states']==0 and d['explicit_slider_grid_changed']==0 and not d['custom_changed_labels']
out.update(status='PASS_WITH_OPEN_ITEMS',publication_review='PENDING',approval=proof['publication_approval']['status'],
 open_items=['independent publication review PENDING (flip_verdict_v1716.py binds a real PASS receipt; then freeze/seal by the release owner)'])
(R/'GATES.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('collected; top-five changed lists',d['changed_lists'],'of',d['lists'],'; full suite once:',out.get('fulltest-postflip-once',{}).get('tests'),'tests',out.get('fulltest-postflip-once',{}).get('fail'),'fail')
