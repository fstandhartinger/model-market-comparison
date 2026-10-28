"""Isolated synthetic publication fixtures; never edits the real PENDING manifest.
  make_passtree_v1717.py [--v1717 pass|pending|absent] [--out DIR]
Builds a copy of the site data/lib in DIR (default .pass); v1.7.16 is already PASS (unchanged bytes). v1.7.17 is
  pass    - synthetic PASS review in its manifest (no other byte changes; the loader pins the files, not the manifest)
  pending - exactly as built in the worktree (PENDING; hidden by the reader)
  absent  - removed (the board of a tree without v1.7.17 at all; the draw table is the worktree's, which the board never reads for v1.7 rows)
SWAP-FILES.txt lists every lib/data file that differs from the worktree (postflip_*_v1717.sh swap exactly these)."""
import argparse,os,pathlib,shutil,json,hashlib
ap=argparse.ArgumentParser();ap.add_argument('--v1717',choices=['pass','pending','absent'],default='pass');ap.add_argument('--out');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])));P=pathlib.Path(A.out).resolve() if A.out else J/'.pass'
P.mkdir(parents=True,exist_ok=True)
if (P/'lib').exists():shutil.rmtree(P/'lib')
shutil.copytree(W/'lib',P/'lib')
for name in ['ops','r169t']:
 if not (P/name).exists():(P/name).symlink_to(W/name)
(P/'data/raw/benchmarks/jevbench').mkdir(parents=True,exist_ok=True)
for base in ['data','data/raw','data/raw/benchmarks','data/raw/benchmarks/jevbench']:
 for f in (W/base).iterdir():
  dst=P/base/f.name
  if f.name=='v1.7' and base.endswith('jevbench'):continue
  if dst.exists() or dst.is_symlink():continue
  dst.symlink_to(f)
D=P/'data/raw/benchmarks/jevbench/v1.7'
if D.exists():shutil.rmtree(D)
D.mkdir()
for f in (W/'data/raw/benchmarks/jevbench/v1.7').iterdir():
 if f.is_file():shutil.copyfile(f,D/f.name)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
FAKE={'engine':'synthetic-preview-only','verdict':'PASS','receipt_sha256':'a'*64}
# The final predecessor is PASS: preserve its manifest and candidate binding byte-for-byte.
assert json.loads((D/'jevbench-v1.7.16-publication.json').read_text())['review']['verdict']=='PASS'
if A.v1717=='absent':
 for f in D.glob('jevbench-v1.7.17-*.json'):f.unlink()
elif A.v1717=='pass':
 q=D/'jevbench-v1.7.17-proof.json';pr=json.loads(q.read_text())
 assert pr['publication_approval']['top_five_effect']=='unchanged' and 'fairness_check' not in pr['publication_approval'],'the PASS copy is only built for an unranked, no-top-five-change release'
 m=D/'jevbench-v1.7.17-publication.json';md=json.loads(m.read_text());md['review']=FAKE;put(m,md)
swap=[]
for root in ['lib','data/raw/benchmarks/jevbench/v1.7']:
 for f in sorted((P/root).iterdir()):
  rel=f.relative_to(P);w=W/rel
  if f.is_file() and (not w.exists() or w.read_bytes()!=f.read_bytes()):swap.append(str(rel))
 for f in sorted((W/root).iterdir()):
  rel=f.relative_to(W)
  if f.is_file() and not (P/rel).exists():swap.append('-'+str(rel))
(P/'SWAP-FILES.txt').write_text('\n'.join(swap)+'\n')
print(P,A.v1717,'swap',swap)
