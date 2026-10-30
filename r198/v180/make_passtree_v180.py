"""Disposable synthetic approval/review simulation. Never alters real manifests."""
import argparse,hashlib,json,pathlib,subprocess,shutil
p=argparse.ArgumentParser();p.add_argument('--out');p.add_argument('--pending',action='store_true');a=p.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];P=pathlib.Path(a.out).resolve() if a.out else J/'.pass';C=json.loads((J/'inputs/config.json').read_text());PREV=C['previous'];N='v'+PREV.replace('.','')[1:]
subprocess.run(['python3','-B',str(W/f'r198/{N}/make_passtree_{N}.py'),'--out',str(P)],check=True,capture_output=True)
# Prior helpers intentionally make only lib/data fixtures. Copy source trees so Next/tests
# resolve this fixture's private lib, rather than following a source symlink back to real PENDING files.
for src in W.iterdir():
 if src.name in {'.git','node_modules','.next','.heavy-run','lib','data'} or src.name.startswith('.env'):continue
 dest=P/src.name
 if src.is_dir():
  if dest.is_symlink():dest.unlink()
  shutil.copytree(src,dest,dirs_exist_ok=True,symlinks=True,ignore=shutil.ignore_patterns('.pass','.next','node_modules','.git','__pycache__','*.tsbuildinfo'))
 elif src.is_file():shutil.copyfile(src,dest)
if not (P/'node_modules').exists():(P/'node_modules').symlink_to(W/'node_modules')
# Directory-based archive coverage uses Dirent.isDirectory(), which does not follow
# a symlink. Recreate historical directory structure while retaining cheap file links.
for directory in (P/'data/raw/benchmarks/jevbench').iterdir():
 if directory.is_symlink() and directory.is_dir():
  source=directory.resolve();directory.unlink()
  def link_file(src,dst):
   pathlib.Path(dst).symlink_to(pathlib.Path(src).resolve())
   return dst
  shutil.copytree(source,directory,copy_function=link_file,symlinks=False)
D=P/'data/raw/benchmarks/jevbench/v1.8'
# The base helper symlinks unknown data versions: detach v1.8 before touching any fixture bytes.
if D.is_symlink():D.unlink()
if D.exists():shutil.rmtree(D)
shutil.copytree(W/'data/raw/benchmarks/jevbench/v1.8',D)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
T=P/'r198/v180';(T/'preview').mkdir(exist_ok=True);(T/'receipts').mkdir(exist_ok=True)
# A previous run's synthetic dry receipt is evidence in the source tree, but must
# not occupy the next fixture's new-output path.
(T/'receipts/FREEZE-SYNTHETIC.json').unlink(missing_ok=True)
# Clearly marked synthetic inputs stay in the fixture, never used for a real fill or flip.
if not (T/'preview/manifest.json').exists():put(T/'preview/manifest.json',{'synthetic_fixture_only':True,'results_sha256':sha(D/'jevbench-v1.8.0-results.json')})
if not (T/'receipts/topfive-diff.json').exists():put(T/'receipts/topfive-diff.json',{'synthetic_fixture_only':True,'candidate_results_sha256':sha(D/'jevbench-v1.8.0-results.json')})
prp=D/'jevbench-v1.8.0-proof.json';pr=json.loads(prp.read_text());orig=sha(prp)
pr['predecessor']['publication_sha256']=sha(P/f'data/raw/benchmarks/jevbench/v1.7/jevbench-{PREV}-publication.json')
if not a.pending:pr['publication_approval']={'artifact_sha256':sha(D/'jevbench-v1.8.0-results.json'),'status':'GO','top_five_effect':'changed','card':1,'selection':'synthetic fixture only','recorded_at':'2026-10-29T00:00:00Z','go_quote':'SYNTHETIC; NOT AUTHORITY','preview_sha256':sha(T/'preview/manifest.json'),'comparison_sha256':sha(T/'receipts/topfive-diff.json')}
pr['top_five_comparison']={'base':'v1.7.23','receipt_sha256':sha(T/'receipts/topfive-diff.json')}
put(prp,pr)
mp=D/'jevbench-v1.8.0-publication.json';m=json.loads(mp.read_text());m['predecessor']=pr['predecessor'];m['files']['proof']['sha256']=sha(prp)
if not a.pending:m['review']={'engine':'synthetic-preview-only','verdict':'PASS','receipt_sha256':'a'*64}
put(mp,m)
lp=P/'lib/jevbench-v180-release.mjs';lp.write_text(lp.read_text().replace(orig,sha(prp)))
print('Synthetic v1.8.0 fixture:',P,'PENDING' if a.pending else 'PASS (no publication authority)')
