"""Collect current final gates; fixture receipts cannot authorize publication."""
import pathlib,json,hashlib,re
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();out={}
for name in ['release-tests','fulltest','synthetic-tests']:
 p=R/(name+'.log');s=p.read_text();counts={k:[int(x) for x in re.findall(r'^(?:# |ℹ )'+k+r' (\d+)$',s,re.M)] for k in ['tests','pass','fail','skipped','cancelled']};assert counts['fail'] and not any(counts['fail']) and not any(counts['cancelled']),(name,counts);out[name]={'status':'PASS',**{k:sum(v) for k,v in counts.items()},'log_sha256':sha(p)}
for name in ['prepare','source','repro','validator','helpers','preview','fairness-text','final-sanity','public-fields','myles-pricing']:
 p=R/(name+'.log');s=p.read_text();assert 'PASS' in s and not re.search('Traceback|AssertionError',s),name;out[name]={'status':'PASS','log_sha256':sha(p)}
p=R/'tsc.log';assert p.exists() and not re.search(r'error TS\d',p.read_text());out['typescript']={'status':'PASS','log_sha256':sha(p)}
p=R/'build.log';s=p.read_text();assert 'Generating static pages' in s and 'Finalizing page optimization' in s and not re.search('Failed to compile|Build error occurred',s);out['build']={'status':'PASS','log_sha256':sha(p)}
for name in ['HELPERS','ACTUAL-REFUSALS','REPRO','FINAL-SANITY','PUBLIC-FIELDS','MYLESG12-PRICE','GLICLASS-PRICING-EQUIV','topfive-diff','preview-browser','CARRIED-ROWS','GLICLASS-NO-TOP5','MYLESG12-BEFORE-AFTER','BASE-IMMUTABLE','PREVIEW-FOOTER']:
 out[name]=json.loads((R/(name+'.json')).read_text())
out['fairness']='PENDING';out['publication_review']='PENDING';out['status']='PASS';(R/'GATES.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('PASS required gates; fairness and publication review remain PENDING')
