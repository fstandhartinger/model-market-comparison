import os
"""Small isolated preview tree. Synthetic review never touches the candidate manifest."""
import pathlib,shutil,json,sys
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])));P=J/'.pass'
P.mkdir(exist_ok=True)
if (P/'lib').exists():shutil.rmtree(P/'lib')
shutil.copytree(W/'lib',P/'lib')
for name in ['ops','r169t']:
 if not (P/name).exists():(P/name).symlink_to(W/name)
(P/'data/raw/benchmarks/jevbench').mkdir(parents=True,exist_ok=True)
# Link immutable inputs; copy only the release directory that needs synthetic review.
for base in ['data','data/raw','data/raw/benchmarks','data/raw/benchmarks/jevbench']:
 for f in (W/base).iterdir():
  dst=P/base/f.name
  if f.name=='v1.7' and base.endswith('jevbench'):continue
  if dst.exists():continue
  dst.symlink_to(f)
D=P/'data/raw/benchmarks/jevbench/v1.7'
D.mkdir(exist_ok=True)
for f in (W/'data/raw/benchmarks/jevbench/v1.7').iterdir():
 if f.is_file():shutil.copyfile(f,D/f.name)
p=D/'jevbench-v1.7.2-publication.json';d=json.loads(p.read_text());d['review']={'engine':'synthetic-preview-only','verdict':'PASS','receipt_sha256':'a'*64};p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
if '--bootstrap' in sys.argv:
 p=P/'lib/jevbench-v172-release.mjs';s=p.read_text().replace('previousManifestSha256:predecessor.sha256});','previousManifestSha256:predecessor.sha256},{candidate:true});');p.write_text(s)
print(P)
