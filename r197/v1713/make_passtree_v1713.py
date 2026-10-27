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
# Synthetic FAIR binding for the PASS preview copy only (the real approval stays PENDING until the fairness review is bound).
if d['publication_approval']['top_five_effect']=='changed' and d['publication_approval']['fairness_check']['verdict']!='FAIR':
 fr=P/'synthetic-fair/workers/r197-v1713-fair';fr.mkdir(parents=True,exist_ok=True);(fr/'RESULT.json').write_text(json.dumps({'fairness':'FAIR','engine':'synthetic-preview-only','note':'synthetic fixture for the .pass preview tree; confers no authority'})+'\n')
 d['publication_approval']['fairness_check']={'verdict':'FAIR','sha256':sha(fr/'RESULT.json'),'path':'workers/r197-v1713-fair/RESULT.json','engine':'synthetic-preview-only'}
put(p,d)
proof_sha=sha(p)
p=D/'jevbench-v1.7.13-publication.json';d=json.loads(p.read_text());d['files']['proof']['sha256']=proof_sha;d['review']={'engine':'synthetic-preview-only','verdict':'PASS','receipt_sha256':'a'*64};put(p,d)
p=P/'lib/jevbench-v1713-release.mjs';s=p.read_text();real=json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-publication.json').read_text())['files']['proof']['sha256'];p.write_text(s.replace(real,proof_sha))
print(P)
