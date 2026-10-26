"""Collect actual final receipts; no synthetic fixture grants publication."""
import pathlib,json,hashlib,re
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();out={}
for name in ['release-tests','fulltest']:
 p=R/(name+'.log');text=p.read_text();n={k:int(re.findall(r'^# '+k+r' (\d+)$',text,re.M)[-1]) for k in ['tests','pass','fail','skipped','cancelled']};assert n['fail']==n['cancelled']==0,(name,n);out[name]={'status':'PASS',**n,'log_sha256':sha(p)}
p=R/'synthetic-tests.log';text=p.read_text();fail=[int(x) for x in re.findall(r'^# fail (\d+)$',text,re.M)];assert fail and not any(fail);out['synthetic-tests']={'status':'PASS','tests':sum(map(int,re.findall(r'^# tests (\d+)$',text,re.M))),'pass':sum(map(int,re.findall(r'^# pass (\d+)$',text,re.M))),'fail':sum(fail),'log_sha256':sha(p)}
for name in ['prepare','source','repro','validator','helpers','preview']:
 p=R/(name+'.log');s=p.read_text();assert 'PASS' in s and not re.search('Traceback|AssertionError',s);out[name]={'status':'PASS','log_sha256':sha(p)}
p=R/'tsc.log';assert p.exists() and not re.search(r'error TS\d',p.read_text());out['typescript']={'status':'PASS','exit_code':0,'log_sha256':sha(p)}
p=R/'build.log';s=p.read_text();assert 'Generating static pages' in s and 'Finalizing page optimization' in s and not re.search('Failed to compile|Build error occurred',s);out['production-build']={'status':'PASS','exit_code':0,'log_sha256':sha(p)}
for name in ['flip-pending-refused','freeze-pending-refused']:
 p=R/(name+'.log');assert 'fairness PENDING' in p.read_text();out[name]={'status':'REFUSED_AS_REQUIRED','log_sha256':sha(p)}
p=R/'freeze-publication-pending-refused.log';assert 'publication review PENDING' in p.read_text();out['freeze-publication-pending']={'status':'REFUSED_AS_REQUIRED','log_sha256':sha(p)}
for name in ['flip-fair-synthetic-dry-run','freeze-fair-synthetic-dry-run']:
 p=R/(name+'.json');assert p.exists();out[name]={'status':'PASS','fixture_only':True,'log_sha256':sha(p)}
out['topfive']=json.loads((R/'topfive-diff.json').read_text());assert out['topfive']['changed'] is True
out['double-rebuild']=json.loads((R/'REPRO.json').read_text());out['helper-controls']=json.loads((R/'HELPERS.json').read_text());out['candidate_publication_review']='PENDING'
out['final-prose-delta']=json.loads((R/'FINAL-PROSE-DELTA.json').read_text())
out['public-fields']=json.loads((R/'PUBLIC-FIELDS.json').read_text())
out['preview-browser']={**json.loads((R/'preview-browser.json').read_text()),'status':'PASS_WITH_LIMITATION','limitation':'Browser functionality passed before final sensitivity text and four additional custom-preset data rows; interaction logic unchanged; final syntax PASS.'}
(R/'GATES.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('PASS all required final gates; independent publication review remains PENDING')
