"""Isolated dry-run checks: PENDING flip succeeds; receipt and freeze controls hold."""
import pathlib,json,hashlib,subprocess,os,tempfile,shutil
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=pathlib.Path('data/raw/benchmarks/jevbench/v1.7');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
checks=[]
with tempfile.TemporaryDirectory(prefix='.helper-check-',dir=J) as t:
 T=pathlib.Path(t);(T/V).mkdir(parents=True);(T/'r190/v177/receipts').mkdir(parents=True);(T/'r185/v172/inputs').mkdir(parents=True)
 for p in (W/V).glob('jevbench-v1.7.[67]-*.json'):shutil.copyfile(p,T/V/p.name)
 shutil.copyfile(W/'r185/v172/inputs/APPROVAL.json',T/'r185/v172/inputs/APPROVAL.json');shutil.copyfile(J/'receipts/topfive-diff.json',T/'r190/v177/receipts/topfive-diff.json')
 # Fixture receipt names a real engine but is not an independent release approval.
 receipt=T/'fixture-review.json';put(receipt,{'verdict':'PASS','engine':'Claude Opus 5.5'});manifest=T/V/'jevbench-v1.7.7-publication.json';output=T/'r190/v177/receipts/freeze.json'
 def run(script,args,ok,pattern=None):
  before=sha(manifest);r=subprocess.run(['python3','-B',str(J/script),*map(str,args)],env={**os.environ,'WT':str(T)},capture_output=True,text=True)
  assert (r.returncode==0)==ok,(script,r.stdout,r.stderr)
  assert sha(manifest)==before
  if pattern:assert pattern in r.stderr,(pattern,r.stderr)
  return r
 flip=('flip_verdict_v177.py',[receipt,'--dry-run']);freeze=('freeze_v177.py',['--wt',T,'--output',output])
 assert json.loads(manifest.read_text())['review']=={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None}
 r=run(*flip,True);result=json.loads(r.stdout)
 assert result['would_set_review']=={'engine':'Claude Opus 5.5','verdict':'PASS','receipt_sha256':sha(receipt)}
 (J/'receipts/flip-pending-dry-run.json').write_text(r.stdout)
 checks.append('real-engine PASS fixture receipt succeeds on copied PENDING manifest in dry-run; manifest unchanged')
 refusals=[]
 for rec in [{'verdict':v,'engine':'Claude Opus 5.5'} for v in ['FAIL','PENDING','PASS_WITH_CONDITIONS',None]]+[
  {'verdict':'PASS','engine':e} for e in ['synthetic-only','PENDING',' pending-engine','',None,42]]:
  put(receipt,rec);r=run(*flip,False,'REFUSED:');refusals.append(r.stderr)
 (J/'receipts/flip-invalid-refused.log').write_text('\n'.join(refusals))
 checks.append('non-PASS and synthetic/pending/missing/invalid-engine receipts refused without mutation')
 put(receipt,{'verdict':'PASS','engine':'Claude Opus 5.5'})
 r=run(*freeze,False,'publication review PENDING');(J/'receipts/freeze-pending-refused.log').write_text(r.stderr)
 checks.append('freeze refuses PENDING manifest without mutation')
 pred=T/V/'jevbench-v1.7.6-publication.json';original=pred.read_bytes();pred.write_bytes(original+b'\n')
 run(*flip,False);pred.write_bytes(original)
 m=json.loads(manifest.read_text());m['review']={'engine':'synthetic-only','verdict':'PASS','receipt_sha256':sha(receipt)};put(manifest,m)
 run(*freeze,True);(J/'receipts/freeze-synthetic-dry-run.json').write_bytes(output.read_bytes())
 checks.append('isolated synthetic PASS manifest accepted by freeze; no seal writes')
 pred.write_bytes(original+b'\n');run(*freeze,False)
 checks.append('unbound predecessor refuses both helpers in their valid review states')
# Each new row must reject a foreign pin and template tokens.
rows=json.loads((J/'receipts/NEW-ROW-SPEC.json').read_text())
with tempfile.TemporaryDirectory(prefix='.row-check-',dir=J) as t:
 p=pathlib.Path(t)/'row.json'
 for k,row in rows.items():
  for label,r,ok in [('correct',row,True),('foreign pin',dict(row,model_pin='Wrong/Model@123'),False),*[(f'template {x}',dict(row,disclosure=x),False) for x in ['{REF}','{ref}','{Ref}','{ref_2}']]]:
   put(p,r);result=subprocess.run(['node',str(J/'validate_v177.mjs'),'--check-row-json',str(p)],text=True,capture_output=True);assert (result.returncode==0)==ok,(k,label,result.stderr)
checks.append('both row gates reject foreign owner pins and mixed-case templates')
put(J/'receipts/HELPERS.json',{'status':'PASS','checks':checks});print('PASS',len(checks),'helper/gate checks')
