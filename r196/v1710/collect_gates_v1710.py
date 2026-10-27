"""Collect actual completed checks, without promoting PENDING publication."""
import pathlib,json,hashlib,re
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';W=J.parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();out={}
for name in ['release-tests','fulltest']:
 p=R/(name+'.log');s=p.read_text();c={k:[int(x) for x in re.findall(r'^# '+k+r' (\d+)$',s,re.M)] for k in ['tests','pass','fail','skipped','cancelled']};assert c['tests'] and c['fail'] and not any(c['fail']) and not any(c['cancelled']),name;out[name]={'status':'PASS',**{k:sum(v) for k,v in c.items()},'log_sha256':sha(p)}
for name in ['repro','source','validator','helpers','preview-check','iota-raw']:
 p=R/(name+'.log');s=p.read_text();assert 'PASS' in s and not re.search('Traceback|AssertionError',s),name;out[name]={'status':'PASS','log_sha256':sha(p)}
p=R/'tsc.log';assert not re.search(r'error TS\d',p.read_text());assert json.loads((R/'TSC-EXIT.json').read_text())['exit_code']==0;out['typescript']={'status':'PASS','log_sha256':sha(p)}
p=R/'build.log';s=p.read_text();assert 'Generating static pages (615/615)' in s and 'Finalizing page optimization' in s and not re.search('Failed to compile|Build error occurred',s);assert json.loads((R/'BUILD-EXIT.json').read_text())['exit_code']==0;out['production-build']={'status':'PASS','log_sha256':sha(p)}
for name in ['CARRIED-ROWS','COST-KIND','HELPERS','REPRO','PREVIEW','CHANGED-LISTS-BY-ROW','BUILT-LINKS','PREDECESSOR-REBASE']:out[name]=json.loads((R/(name+'.json')).read_text())
proof=json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.10-proof.json').read_text());assert proof['publication_approval']['fairness_check']['verdict']=='FAIR';assert json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.10-publication.json').read_text())['review']['verdict']=='PENDING'
out.update(status='PASS',fairness='FAIR',publication_review='PENDING');(R/'GATES.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('PASS required gates; FAIR bound; independent publication review remains PENDING')
