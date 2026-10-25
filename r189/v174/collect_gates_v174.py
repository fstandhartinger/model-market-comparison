"""Record real final log counts and byte pins, never assume a command passed."""
import pathlib,json,re,hashlib
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();out={}
for name in ['release-tests','synthetic-tests','fulltest']:
 p=R/(name+'.log');s=p.read_text();n={k:int(re.findall(r'^# '+k+r' (\d+)$',s,re.M)[-1]) for k in ['tests','pass','fail','skipped','cancelled']};assert n['fail']==n['cancelled']==0,(name,n)
 out[name]={'status':'PASS',**n,'log_sha256':sha(p)}
for name in ['repro','validator','helpers','helpers-content-check','source-equivalence','preview-check','final-sanity']:
 p=R/(name+'.log');assert p.exists() and p.stat().st_size and 'Traceback' not in p.read_text() and 'AssertionError' not in p.read_text(),name
 out[name]={'status':'PASS','log_sha256':sha(p)}
p=R/'tsc.log';assert p.exists() and not re.search(r'error TS\d',p.read_text());out['typescript']={'status':'PASS','log_sha256':sha(p)}
p=R/'build.log';s=p.read_text();assert 'Generating static pages' in s and 'Finalizing page optimization' in s and not re.search(r'(Failed to compile|Build error occurred)',s);out['production_build']={'status':'PASS','log_sha256':sha(p)}
out['actual_pending_refusals']={}
for name in ['flip','freeze']:
 p=R/(name+'-actual-pending-refused.log');assert 'fairness PENDING' in p.read_text();out['actual_pending_refusals'][name]={'status':'REFUSED_AS_REQUIRED','log_sha256':sha(p)}
out['double_rebuild']=json.loads((R/'REPRO.json').read_text());out['helper_controls']=json.loads((R/'fix-helper-checks.json').read_text());out['candidate_publication_review']='PENDING';out['fairness']='PENDING'
(R/'GATES.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['double_rebuild','helper_controls']},indent=1))
