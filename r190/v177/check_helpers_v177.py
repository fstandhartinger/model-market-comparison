"""Dry-run-only helpers: PENDING refusal, isolated PASS success, tamper refusal."""
import pathlib,json,hashlib,subprocess,os,tempfile,shutil
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=pathlib.Path('data/raw/benchmarks/jevbench/v1.7');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
checks=[]
with tempfile.TemporaryDirectory(prefix='.helper-check-',dir=J) as t:
 T=pathlib.Path(t);(T/V).mkdir(parents=True);(T/'r190/v177/receipts').mkdir(parents=True);(T/'r185/v172/inputs').mkdir(parents=True)
 for p in (W/V).glob('jevbench-v1.7.[67]-*.json'):shutil.copyfile(p,T/V/p.name)
 shutil.copyfile(W/'r185/v172/inputs/APPROVAL.json',T/'r185/v172/inputs/APPROVAL.json');shutil.copyfile(J/'receipts/topfive-diff.json',T/'r190/v177/receipts/topfive-diff.json')
 receipt=T/'synthetic-review.json';put(receipt,{'verdict':'PASS','engine':'synthetic-only'});manifest=T/V/'jevbench-v1.7.7-publication.json';proof=T/V/'jevbench-v1.7.7-proof.json';output=T/'r190/v177/receipts/freeze.json'
 def run(script,args,ok,pattern=None):
  before=sha(manifest);r=subprocess.run(['python3','-B',str(J/script),*map(str,args)],env={**os.environ,'WT':str(T)},capture_output=True,text=True)
  assert (r.returncode==0)==ok,(script,r.stdout,r.stderr)
  assert sha(manifest)==before
  if pattern:assert pattern in r.stderr,(pattern,r.stderr)
  return r
 flip=('flip_verdict_v177.py',[receipt,'--dry-run']);freeze=('freeze_v177.py',['--wt',T,'--output',output])
 for script,args in [flip,freeze]:
  r=run(script,args,False,'publication review PENDING');(J/'receipts'/('flip-pending-refused.log' if script.startswith('flip') else 'freeze-pending-refused.log')).write_text(r.stderr)
 checks.append('PENDING refuses flip/freeze dry runs without mutating manifest')
 m=json.loads(manifest.read_text());m['review']={'engine':'synthetic-only','verdict':'PASS','receipt_sha256':sha(receipt)};put(manifest,m)
 r=run(*flip,True);(J/'receipts/flip-synthetic-dry-run.json').write_text(r.stdout)
 run(*freeze,True);(J/'receipts/freeze-synthetic-dry-run.json').write_bytes(output.read_bytes());checks.append('isolated synthetic PASS flip/freeze dry runs succeed; no seal writes')
 pred=T/V/'jevbench-v1.7.6-publication.json';pred.write_bytes(pred.read_bytes()+b'\n')
 for script,args in [flip,freeze]:run(script,args,False)
 checks.append('unbound predecessor refuses both helpers')
# Each new row must reject a foreign pin and template tokens.
rows=json.loads((J/'receipts/NEW-ROW-SPEC.json').read_text())
with tempfile.TemporaryDirectory(prefix='.row-check-',dir=J) as t:
 p=pathlib.Path(t)/'row.json'
 for k,row in rows.items():
  for label,r,ok in [('correct',row,True),('foreign pin',dict(row,model_pin='Wrong/Model@123'),False),*[(f'template {x}',dict(row,disclosure=x),False) for x in ['{REF}','{ref}','{Ref}','{ref_2}']]]:
   put(p,r);result=subprocess.run(['node',str(J/'validate_v177.mjs'),'--check-row-json',str(p)],text=True,capture_output=True);assert (result.returncode==0)==ok,(k,label,result.stderr)
checks.append('both row gates reject foreign owner pins and mixed-case templates')
put(J/'receipts/HELPERS.json',{'status':'PASS','checks':checks});print('PASS',len(checks),'helper/gate checks')
