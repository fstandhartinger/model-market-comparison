import pathlib,subprocess,hashlib,json
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
files=list((W/'data/raw/benchmarks/jevbench/v1.7').glob('jevbench-v1.7.19-*.json'))+[W/'lib/jevbench-v1719-release.mjs',W/'app/jev-models/v1.7.19/page.tsx']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();runs=[]
for _ in range(2):subprocess.run(['bash',str(J/'rebuild_v1719.sh')],cwd=W,check=True,capture_output=True);runs.append({str(p.relative_to(W)):sha(p) for p in files})
assert runs[0]==runs[1]
(J/'receipts/REPRO.json').write_text(json.dumps({'status':'PASS','rebuilds':2,'hashes':runs[0]},indent=1)+'\n');print('PASS two deterministic rebuilds,',len(files),'artifact hashes')
