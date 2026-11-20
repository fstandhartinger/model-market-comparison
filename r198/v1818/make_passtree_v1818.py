"""Explicit synthetic PASS simulation; no real manifest or seal is changed.
--resume completes an interrupted copy only when every existing source file still matches.
"""
import pathlib,shutil,json,os,argparse
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--resume',action='store_true');args=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];P=J/'.pass'
assert not P.exists() or args.resume,'existing simulation requires explicit --resume (unfinished copies only)'
P.mkdir(exist_ok=args.resume)
def copy_identical(src,dst):
 src=pathlib.Path(src);dst=pathlib.Path(dst)
 if dst.exists():
  # Resume never replaces a file, including source files protected by cleanup guards.
  assert src.read_bytes()==dst.read_bytes(),f'changed partial-copy file: {dst.relative_to(P)}'
 else:os.link(src,dst)
 return str(dst)
def link_identical(src,dst):
 if dst.is_symlink():assert dst.resolve()==src.resolve()
 else:dst.symlink_to(src)
for src in W.iterdir():
 if src.name in ['.git','.next','.heavy-run','.job-unit','node_modules','tsconfig.tsbuildinfo']:continue
 if src.name=='r198':
  (P/'r198').mkdir(exist_ok=args.resume)
  for rel in src.iterdir():
   if rel.name in ['v1812','v1813','v1814','v1815','v1816','v1817','v1818']:
    # This worker's helpers/receipts may evolve between an interrupted copy and resume.
    # Keep that copy independent; no archived or protected source is replaced here.
    shutil.copytree(rel,P/'r198'/rel.name,dirs_exist_ok=args.resume,ignore=shutil.ignore_patterns('.pass','__pycache__'))
   else:link_identical(rel,P/'r198'/rel.name)
 elif src.is_dir():shutil.copytree(src,P/src.name,symlinks=True,copy_function=copy_identical,dirs_exist_ok=args.resume)
 else:copy_identical(src,P/src.name)
link_identical(W/'node_modules',P/'node_modules')
import hashlib,subprocess
def put_unlinked(p,value):
 if p.exists():p.unlink()
 p.write_text(json.dumps(value,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
D=P/'data/raw/benchmarks/jevbench/v1.8'
pred=D/'jevbench-v1.8.17-publication.json';prior=json.loads(pred.read_text())
assert prior['review']['verdict'] in ['PENDING','PASS']
if prior['review']['verdict']=='PENDING':
 prior['review']={'verdict':'PASS','engine':'synthetic-preview-only','receipt_sha256':'b'*64};put_unlinked(pred,prior)
p=D/'jevbench-v1.8.18-publication.json';m=json.loads(p.read_text());assert m['review']['verdict']=='PENDING','resume only accepts an unfinished PENDING copy'
m['predecessor']['publication_sha256']=hashlib.sha256(pred.read_bytes()).hexdigest()
proofpath=D/'jevbench-v1.8.18-proof.json';proof=json.loads(proofpath.read_text());proof['predecessor']=m['predecessor']
# Only the isolated fixture simulates completed fairness approval. Production readers
# apply the same unconditional approval checks to every engine.
proof['publication_approval']['fairness_review_required']=False
proof['publication_approval']['fairness_review_verdict']='PASS'
proof['rank_review']['fairness_review']='PASS'
put_unlinked(proofpath,proof)
put_unlinked(P/'r198/v1818/inputs/APPROVAL.json',proof['publication_approval'])
m['files']['proof']['sha256']=hashlib.sha256(proofpath.read_bytes()).hexdigest()
m['review']={'verdict':'PASS','engine':'isolated-fixture-review','receipt_sha256':'a'*64};put_unlinked(p,m)
# Generated loader pins must match the synthetic predecessor binding, without touching a source hardlink.
loader=P/'lib/jevbench-v1818-release.mjs';loader.unlink()
subprocess.run(['python3','-B',str(P/'r198/v1818/make_lib_v1818.py')],check=True)
# Break mutable presentation hardlinks before regeneration in the simulation.
for f in ['data/jevbench-breakdown-exceptions.json','data/jevbench-v1.8.17-alldata.json','data/jevbench-v1.8.18-alldata.json']:
 p=P/f
 if p.exists():b=p.read_bytes();p.unlink();p.write_bytes(b)
subprocess.run(['git','init','-q',str(P)],check=True)
# Index the actual fixture, including intentional directory symlinks. Reusing the source
# path list would attempt to stage files beyond those symlinks.
subprocess.run(['git','add','--all'],cwd=P,check=True)
# An unborn HEAD reports every staged file as added. Commit this local fixture
# so status reflects only changes made by the gates, without an enormous listing.
subprocess.run(['git','-c','user.name=Synthetic gate fixture','-c','user.email=fixture@example.invalid','commit','-qm','Synthetic PASS gate fixture; no publication authority'],cwd=P,check=True)
print(P)
