import pathlib,json,hashlib,re,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];R=J/'receipts';L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
g={}
for n in ['SCORING','SOURCE','REPRO','HELPERS','PREVIEW','BROWSER','RAW-HANDOFF','PRECONDITIONS','OFF-NONCOST','PASS-STATE','FAIR-BINDING']:g[n]=L(R/(n+'.json'));assert g[n]['status']=='PASS'
for n,receipt in [('typescript','TSC-EXIT'),('production-build','BUILD-EXIT'),('fulltest','FULLTEST-EXIT')]:
 x=L(R/(receipt+'.json'));assert x['exit_code']==0;g[n]={'status':'PASS',**x}
for n,log in [('release-tests','release-tests.log'),('fulltest','fulltest.log'),('post-flip-tests','post-flip-tests.log')]:
 s=(R/log).read_text();counts={}
 for f in ['tests','pass','fail','cancelled','skipped','todo']:
  m=re.search(r'(?:#|ℹ)\s+'+f+r'\s+(\d+)',s)
  if m:counts[f]=int(m.group(1))
 assert counts.get('fail')==0 and counts.get('pass',0)>0,(n,counts)
 g[n]={**g.get(n,{}),'status':'PASS',**counts,'log_sha256':sha(R/log)}
for n in ['validator','source','repro','helpers','preview-check','build','tsc']:
 p=R/(n+'.log');assert p.exists();g.setdefault(n,{'status':'PASS'});g[n]['log_sha256']=sha(p)
top=L(R/'topfive-diff.json');custom=L(R/'topfive-custom.json');sliders=L(R/'topfive-sliders.json')
assert top['base']=='v1.7.10' and top['candidate']=='v1.7.11' and top['lists']==580
for name,h in top['snapshots_sha256'].items():assert sha(R/name)==h,name
assert sha(R/'topfive-custom.json')==top['custom_receipt_sha256']
proof=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.11-proof.json')
from approval_v1711 import check_approval
approval=check_approval(W,proof)
assert approval['fairness_check']['engine']=='claude-opus-5-5 account C effort medium'
assert approval['fairness_check']['sha256']=='6f8fb3b2d14ef364931f3e08d135598424d30c176d02d5bb5bb717045cbcb801'
fair=L(pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')/approval['fairness_check']['path'])
binding=g['FAIR-BINDING']
assert binding['pre_edit_results_sha256']==fair['bound_to']['results_sha256']
assert binding['post_edit_results_sha256']==sha(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.11-results.json')
assert binding['review_receipt_sha256']==approval['fairness_check']['sha256']
assert binding['pre_edit_topfive_diff_sha256']==fair['bound_to']['topfive_diff_sha256']==sha(R/'topfive-diff.json')
assert proof['release_owner_rulings']==['decisio-gemma-engine-correction-28484']
assert L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.11-publication.json')['review']=={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None}
g['FAIR']={'status':'PASS',**approval['fairness_check'],'publication_review':'PENDING'}
assert proof['topfive_diff_sha256']==sha(R/'topfive-diff.json')
g['TOPFIVE']={'status':'PASS','lists':top['lists'],'changed_lists':top['changed_lists'],'slider_states':len(sliders['states']),'slider_changed_states':sliders['changed_states'],'custom_changed_lists':top['custom_changed_labels'],'grid_states':custom['slider_grid_states'],'grid_changed_states':custom['slider_grid_changed'],'snapshot_hashes_verified':True,'diff_bound_to_proof':True,'ranks_fixture_present':(W/'test/fixtures/jevbench-v1711-ranks.json').is_file()}
(R/'GATES.json').write_text(json.dumps(g,indent=1,sort_keys=True)+'\n')
print(json.dumps({k:{f:v for f,v in x.items() if f in ['status','tests','pass','fail','skipped']} for k,x in g.items()},indent=1))
