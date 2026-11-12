"""An isolated synthetic PASS fixture (synthetic independent review + synthetic FAIR fairness verdict); never changes a real manifest or writes a seal."""
import pathlib,shutil,json,subprocess,os,hashlib,argparse
ap=argparse.ArgumentParser();ap.add_argument('--out');ap.add_argument('--keep-review-pending',action='store_true',help='synthetic FAIR bound but the manifest review stays PENDING (flip dry-run fixture)');A=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];P=pathlib.Path(A.out).resolve() if A.out else J/'.pass'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
if P.exists():shutil.rmtree(P)
P.mkdir()
for name in ['lib','data','app','components','public','test','types','scripts']:
 src=W/name
 if src.is_dir():shutil.copytree(src,P/name,symlinks=True,copy_function=os.link)
for src in W.iterdir():
 if src.is_file() and (src.suffix in ['.json','.js','.mjs','.ts','.cjs','.md'] or src.name=='.gitignore') and not src.name.startswith('.env'):shutil.copyfile(src,P/src.name)
(P/'node_modules').symlink_to(W/'node_modules')
shutil.copytree(J,P/'r198/v1810',ignore=shutil.ignore_patterns('.pass*','__pycache__'))
[(P/'r198/v1810/receipts'/n).unlink(missing_ok=True) for n in ['FREEZE-SYNTHETIC.json','FREEZE-SYNTHETIC-DRYRUN.json']]
# Historical tests use pipeline receipts; link only immutable predecessor pipelines.
for src in (W/'r198').iterdir():
 if src.is_dir() and src.name!='v1810':(P/'r198'/src.name).symlink_to(src)
for name in ['r197','r196','r195','r194','r193','r192','r191','r190']:
 if (W/name).exists():(P/name).symlink_to(W/name)
for src in W.iterdir():
 if src.is_dir() and src.name not in ['.git','.next','.heavy-run','node_modules','r198'] and not (P/src.name).exists():
  (P/src.name).symlink_to(src)
V=P/'data/raw/benchmarks/jevbench/v1.8'
def rewrite(p):b=p.read_bytes();p.unlink();p.write_bytes(b)   # break the hardlink to the real tree before any write
# Synthetic FAIR receipt inside the pass tree only (helpers read it with JEV_FAIR_ROOT=<pass tree>); confers no authority.
q=V/'jevbench-v1.8.10-proof.json';rewrite(q);pr=json.loads(q.read_text());old_proof=sha(q)
assert pr['publication_approval']['fairness_check']['verdict'] in ('PENDING','FAIR')
# A receipt already bound in the real approval is copied byte for byte (same sha) so helpers run with JEV_FAIR_ROOT=<pass tree> resolve it.
for f in ['fairness_check','fairness_check_delta']:
 c=pr['publication_approval'][f]
 if c['verdict']=='FAIR' and c.get('engine')!='synthetic-preview-only':
  src=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')/c['path'];dst=P/c['path'];dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst);assert sha(dst)==c['sha256'],f
if pr['publication_approval']['fairness_check']['verdict']=='PENDING':
 fr=P/'workers/r276-v1810-recheck/RESULT.json';fr.parent.mkdir(parents=True,exist_ok=True);fr.write_text(json.dumps({'fairness':'FAIR','engine':'synthetic-preview-only'})+'\n')
 pr['publication_approval']['fairness_check']={'path':'workers/r276-v1810-recheck/RESULT.json','verdict':'FAIR','sha256':sha(fr),'engine':'synthetic-preview-only'};put(q,pr)
if pr['publication_approval']['fairness_check_delta']['verdict']=='PENDING':
 fd=P/'workers/r278-delta-fair/RESULT.json';fd.parent.mkdir(parents=True,exist_ok=True);fd.write_text(json.dumps({'fairness':'FAIR','engine':'synthetic-preview-only'})+'\n')
 pr['publication_approval']['fairness_check_delta']={'path':'workers/r278-delta-fair/RESULT.json','verdict':'FAIR','sha256':sha(fd),'engine':'synthetic-preview-only'};put(q,pr)
proof_sha=sha(q)
m=V/'jevbench-v1.8.10-publication.json';rewrite(m);md=json.loads(m.read_text());md['files']['proof']['sha256']=proof_sha;
if not A.keep_review_pending:md['review']={'engine':'synthetic-preview-only','verdict':'PASS','receipt_sha256':'a'*64}
put(m,md)
lp=P/'lib/jevbench-v1810-release.mjs';rewrite(lp);s=lp.read_text()
if old_proof!=proof_sha:assert s.count(old_proof)==1;lp.write_text(s.replace(old_proof,proof_sha))
if not A.keep_review_pending:
 ex=P/'data/jevbench-breakdown-exceptions.json';b=ex.read_bytes();ex.unlink();ex.write_bytes(b)   # break the hardlink before the visibility-following write
 subprocess.run(['python3','-B',str(P/'r198/v1810/add_topics_exception_v1810.py')],check=True,cwd=P)
print('Synthetic fixture only:',P)
