import pathlib,json,hashlib,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7'
files=list(V.glob('jevbench-v1.7.20-*.json'))+[W/'lib/jevbench-v1720-release.mjs',W/'app/jev-models/v1.7.20/page.tsx']
files=list(dict.fromkeys(files+[W/f for f in ['app/sitemap.ts','components/JevBenchReleaseVersionNav.tsx','components/JevReleaseHistory.tsx','data/jevbench-architecture.json','lib/jevbench-categories.mjs','lib/jevbench-alldata-input.mjs','lib/jevbench-live-board.mjs','lib/jevbench-releases.mjs','test/cr-205-jev-page-structure.test.mjs','test/cr-303-feed-split.test.mjs','test/jevbench-feed-live-board.test.mjs','test/jevbench-v1630-open-fold.test.mjs','test/jevbench-v1630-release.test.mjs','test/jevbench-v1637-release.test.mjs','test/jevbench-v170-release.test.mjs']]+[W/'app/api/jevbench/v1.7.20/route.ts']))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();a={str(p.relative_to(W)):sha(p) for p in files}
for _ in range(2):
 subprocess.run(['bash',str(J/'rebuild_v1720.sh')],cwd=W,check=True)
 assert a=={str(p.relative_to(W)):sha(p) for p in files},'rebuild drift'
(J/'receipts/REPRODUCIBILITY.json').write_text(json.dumps({'status':'PASS','rebuilds':2,'hashes':a},indent=1)+'\n');print('PASS deterministic rebuild twice')
