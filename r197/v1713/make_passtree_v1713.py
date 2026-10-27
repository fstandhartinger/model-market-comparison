"""Isolated synthetic publication fixture; never edits the real PENDING manifest or fairness verdict."""
import os,pathlib,shutil,json,hashlib
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])));P=J/'.pass'
P.mkdir(exist_ok=True)
if (P/'lib').exists():shutil.rmtree(P/'lib')
shutil.copytree(W/'lib',P/'lib')
for name in ['ops','r169t']:
 if not (P/name).exists():(P/name).symlink_to(W/name)
(P/'data/raw/benchmarks/jevbench').mkdir(parents=True,exist_ok=True)
for base in ['data','data/raw','data/raw/benchmarks','data/raw/benchmarks/jevbench']:
 for f in (W/base).iterdir():
  dst=P/base/f.name
  if f.name=='v1.7' and base.endswith('jevbench'):continue
  if dst.exists():continue
  dst.symlink_to(f)
D=P/'data/raw/benchmarks/jevbench/v1.7';D.mkdir(exist_ok=True)
for f in (W/'data/raw/benchmarks/jevbench/v1.7').iterdir():
 if f.is_file():shutil.copyfile(f,D/f.name)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
p=D/'jevbench-v1.7.13-proof.json';d=json.loads(p.read_text())
# The approval is unchanged in the PASS copy (standing GO, no top-five change, fairness SUSPICIOUS bound as evidence);
# the dry-run helpers read the fairness receipt from a byte copy so the .pass tree never touches the job directory.
assert d['publication_approval']['top_five_effect']=='unchanged','the PASS copy is only built for an unranked, no-top-five-change release'
fr=P/'synthetic-fair/workers/r197-v1713-fair';fr.mkdir(parents=True,exist_ok=True)
shutil.copyfile(pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r197-v1713-fair/RESULT.json'),fr/'RESULT.json')
put(p,d)
proof_sha=sha(p)
p=D/'jevbench-v1.7.13-publication.json';d=json.loads(p.read_text());d['files']['proof']['sha256']=proof_sha;d['review']={'engine':'synthetic-preview-only','verdict':'PASS','receipt_sha256':'a'*64};put(p,d)
p=P/'lib/jevbench-v1713-release.mjs';s=p.read_text();real=json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-publication.json').read_text())['files']['proof']['sha256'];p.write_text(s.replace(real,proof_sha))
print(P)
