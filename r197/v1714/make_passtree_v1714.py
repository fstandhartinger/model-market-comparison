"""Isolated synthetic publication fixtures; never edits the real PENDING manifests.
  make_passtree_v1714.py [--v1714 pass|pending|absent] [--out DIR]
Builds a copy of the site data/lib in DIR (default .pass) in which v1.7.13 carries a synthetic PASS review (as after its flip:
the v1.7.13 manifest bytes change) and v1.7.14 is
  pass    - re-bound to the changed v1.7.13 manifest hash (proof + manifest), synthetic PASS, loader hash patched (= after restack + flip)
  pending - exactly as built in the worktree (still PENDING; bound to the real v1.7.13 bytes; hidden by the reader)
  absent  - removed (the board of a tree without v1.7.14 at all)
SWAP-FILES.txt lists every lib/data file that differs from the worktree (postflip_*_v1714.sh swap exactly these)."""
import argparse,os,pathlib,shutil,json,hashlib
ap=argparse.ArgumentParser();ap.add_argument('--v1714',choices=['pass','pending','absent'],default='pass');ap.add_argument('--out');A=ap.parse_args()
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
# v1.7.13 flip (synthetic): only the review block of its manifest changes; its pinned files are untouched.
p=D/'jevbench-v1.7.13-publication.json';d=json.loads(p.read_text())
if d['review']['verdict']!='PASS':d['review']=FAKE;put(p,d)
pred_sha=sha(p)
if A.v1714=='absent':
 for f in D.glob('jevbench-v1.7.14-*.json'):f.unlink()
elif A.v1714=='pass':
 q=D/'jevbench-v1.7.14-proof.json';pr=json.loads(q.read_text());old_proof=sha(q)
 assert pr['publication_approval']['top_five_effect']=='unchanged','the PASS copy is only built for an unranked, no-top-five-change release'
 pr['predecessor']={'revision':'v1.7.13','publication_sha256':pred_sha};put(q,pr);proof_sha=sha(q)
 m=D/'jevbench-v1.7.14-publication.json';md=json.loads(m.read_text());md['predecessor']=pr['predecessor'];md['files']['proof']['sha256']=proof_sha;md['review']=FAKE;put(m,md)
 lp=P/'lib/jevbench-v1714-release.mjs';s=lp.read_text();assert s.count(old_proof)==1;lp.write_text(s.replace(old_proof,proof_sha))
swap=[]
for root in ['lib','data/raw/benchmarks/jevbench/v1.7']:
 for f in sorted((P/root).iterdir()):
  rel=f.relative_to(P);w=W/rel
  if f.is_file() and (not w.exists() or w.read_bytes()!=f.read_bytes()):swap.append(str(rel))
 for f in sorted((W/root).iterdir()):
  rel=f.relative_to(W)
  if f.is_file() and not (P/rel).exists():swap.append('-'+str(rel))
(P/'SWAP-FILES.txt').write_text('\n'.join(swap)+'\n')
print(P,A.v1714,'swap',swap)
