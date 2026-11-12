import pathlib,hashlib,subprocess,json
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
def build():subprocess.run(['bash',str(J/'rebuild_v1810.sh')],check=True,cwd=W,capture_output=True)
def hashes():
 fs=list((W/'data/raw/benchmarks/jevbench/v1.8').glob('*v1.8.10-*'))+[W/'lib/jevbench-v1810-release.mjs',W/'lib/jevbench-alldata-input.mjs',W/'lib/jevbench-live-board.mjs',W/'lib/jevbench-releases.mjs',W/'lib/jevbench-categories.mjs',W/'data/jevbench-draw-equating.json',W/'data/jevbench-context-length-board.json',J/'src/held-keys.json',J/'src/display-renames.json',W/'components/JevBoardShared.tsx',W/'components/JevBoardInteractive.tsx',W/'lib/jevbench-v15-board.mjs',W/'app/jev-models/v1.8.10/page.tsx',W/'app/api/jevbench/v1.8.10/route.ts',W/'components/JevReleaseHistory.tsx',W/'components/JevBenchReleaseVersionNav.tsx',W/'app/sitemap.ts',J/'src/equated-keys.json',J/'src/ranked-keys.json',J/'src/unranked-keys.json',J/'receipts/EQUATED-ROW-SPEC.json',J/'receipts/RANK-SHIFT.json',J/'receipts/BUILD.json']
 return {str(p.relative_to(W)):hashlib.sha256(p.read_bytes()).hexdigest() for p in fs}
build();a=hashes();build();b=hashes();assert a==b
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.8.10':")==1
(J/'receipts/REBUILD.json').write_text(json.dumps({'status':'PASS','two_rebuilds_byte_equal':True,'hashes':a},indent=1,sort_keys=True)+'\n');print('PASS two deterministic rebuilds;',len(a),'hashes; one All-data entry')
