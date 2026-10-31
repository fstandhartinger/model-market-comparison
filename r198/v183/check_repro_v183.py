import pathlib,hashlib,subprocess,json
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
def build():subprocess.run(['bash',str(J/'rebuild_v183.sh')],check=True,cwd=W,capture_output=True)
def hashes():return {str(p.relative_to(W)):hashlib.sha256(p.read_bytes()).hexdigest() for p in list((W/'data/raw/benchmarks/jevbench/v1.8').glob('*v1.8.3-*'))+[W/'lib/jevbench-v183-release.mjs',W/'lib/jevbench-alldata-input.mjs',W/'lib/jevbench-live-board.mjs',W/'lib/jevbench-releases.mjs',W/'data/jevbench-draw-equating.json',W/'data/jevbench-breakdown-exceptions.json',W/'data/jevbench-base-models.json',W/'data/jevbench-architecture.json']}
build();a=hashes();build();b=hashes();assert a==b
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.8.3':")==1
(J/'receipts/REBUILD.json').write_text(json.dumps({'status':'PASS','two_rebuilds_byte_equal':True,'hashes':a},indent=1,sort_keys=True)+'\n');print('PASS two deterministic rebuilds;',len(a),'hashes; one All-data entry')
