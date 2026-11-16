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
 if src.name in ['.git','.next','.heavy-run','node_modules','tsconfig.tsbuildinfo']:continue
 if src.name=='r198':
  (P/'r198').mkdir(exist_ok=args.resume)
  for rel in src.iterdir():
   if rel.name=='v1812':
    # This worker's helpers/receipts may evolve between an interrupted copy and resume.
    # Keep that copy independent; no archived or protected source is replaced here.
    shutil.copytree(rel,P/'r198/v1812',dirs_exist_ok=args.resume,ignore=shutil.ignore_patterns('.pass','__pycache__'))
   else:link_identical(rel,P/'r198'/rel.name)
 elif src.is_dir():shutil.copytree(src,P/src.name,symlinks=True,copy_function=copy_identical,dirs_exist_ok=args.resume)
 else:copy_identical(src,P/src.name)
link_identical(W/'node_modules',P/'node_modules')
p=P/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.12-publication.json';m=json.loads(p.read_text());assert m['review']['verdict']=='PENDING','resume only accepts an unfinished PENDING copy';p.unlink();m['review']={'verdict':'PASS','engine':'synthetic-preview-only','receipt_sha256':'a'*64};p.write_text(json.dumps(m,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
# Break mutable presentation hardlinks before regeneration in the simulation.
for f in ['data/jevbench-breakdown-exceptions.json','data/jevbench-v1.8.12-alldata.json']:
 p=P/f
 if p.exists():b=p.read_bytes();p.unlink();p.write_bytes(b)
import subprocess
subprocess.run(['git','init','-q',str(P)],check=True)
print(P)
