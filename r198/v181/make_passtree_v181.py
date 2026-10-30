"""An isolated synthetic PASS fixture; never changes a real manifest or writes a seal."""
import pathlib,shutil,json,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];P=J/'.pass'
if P.exists():shutil.rmtree(P)
P.mkdir()
for name in ['lib','data','app','components','public','test','types','scripts']:
 src=W/name
 if src.is_dir():shutil.copytree(src,P/name,symlinks=True)
for src in W.iterdir():
 if src.is_file() and src.suffix in ['.json','.js','.mjs','.ts','.cjs'] and not src.name.startswith('.env'):shutil.copyfile(src,P/src.name)
(P/'node_modules').symlink_to(W/'node_modules')
shutil.copytree(J,P/'r198/v181',ignore=shutil.ignore_patterns('.pass','__pycache__'))
(P/'r198/v181/receipts/FREEZE-SYNTHETIC.json').unlink(missing_ok=True)
# Historical tests use pipeline receipts; link only immutable predecessor pipelines.
for src in (W/'r198').iterdir():
 if src.is_dir() and src.name!='v181':(P/'r198'/src.name).symlink_to(src)
for name in ['r197','r196','r195','r194','r193','r192','r191','r190']:
 if (W/name).exists():(P/name).symlink_to(W/name)
for src in W.iterdir():
 if src.is_dir() and src.name not in ['.git','.next','.heavy-run','node_modules','r198'] and not (P/src.name).exists():
  (P/src.name).symlink_to(src)
p=P/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.1-publication.json';m=json.loads(p.read_text());m['review']={'engine':'synthetic-preview-only','verdict':'PASS','receipt_sha256':'a'*64};p.write_text(json.dumps(m,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
subprocess.run(['python3','-B',str(P/'r198/v181/add_topics_exception_v181.py')],check=True,cwd=P)
print('Synthetic fixture only:',P)
