"""Compare two deterministic rebuilds, excluding logs and comparison fixtures."""
import hashlib,json,pathlib,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
paths=list((W/'data/raw/benchmarks/jevbench/v1.7').glob('jevbench-v1.7.14-*.json'))+[W/'lib/jevbench-v1714-release.mjs',W/'app/jev-models/v1.7.14/page.tsx',W/'app/api/jevbench/v1.7.14/route.ts',W/'data/jevbench-architecture.json',W/'data/jevbench-draw-equating.json',W/'data/jevbench-breakdown-exceptions.json',W/'lib/jevbench-releases.mjs',W/'lib/jevbench-live-board.mjs',W/'test/jevbench-v1713-release.test.mjs']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
subprocess.run(['bash',str(J/'rebuild_v1714.sh')],check=True,cwd=W);a={str(p.relative_to(W)):sha(p) for p in paths}
subprocess.run(['bash',str(J/'rebuild_v1714.sh')],check=True,cwd=W);b={str(p.relative_to(W)):sha(p) for p in paths}
assert a==b
(J/'receipts/REPRO.json').write_text(json.dumps({'status':'PASS','two_rebuilds_identical':True,'files':b},indent=1,sort_keys=True)+'\n');print('PASS two deterministic rebuilds,',len(paths),'artifact hashes')
