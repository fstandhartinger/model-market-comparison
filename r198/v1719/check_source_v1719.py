import pathlib,json,hashlib,subprocess
from rows_v1719 import KEYS
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';L=lambda p:json.loads(p.read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
a=L(V/'jevbench-v1.7.19-results.json');b=L(V/'jevbench-v1.7.18-results.json');by={s['key']:s for s in a['systems']};assert len(a['systems'])==len(b['systems'])+2==313 and all(by[s['key']]==s for s in b['systems']) and a['board']==b['board']
ca=L(V/'jevbench-v1.7.19-categories.json');cb=L(V/'jevbench-v1.7.18-categories.json');assert all(ca['systems'][k]==s for k,s in cb['systems'].items()) and all(ca['lanes'][k]==s for k,s in cb['lanes'].items())
# Every predecessor release artifact and loader byte equals the requested base, including flipped PASS v1.7.18.
files=[]
for version in ['16','17','18']:
 files += [f'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.{version}-{n}.json' for n in ['results','categories','carry','proof','publication','history','history-carry']]+[f'lib/jevbench-v17{version}-release.mjs']
for f in files:assert (W/f).read_bytes()==subprocess.check_output(['git','show','7992090a6359ae155b40d89cb117c3b240b8ff11:'+f],cwd=W),f
(J/'receipts/CARRIED-ROWS.json').write_text(json.dumps({'status':'PASS','base':'7992090a6359ae155b40d89cb117c3b240b8ff11','carried_rows_equal':len(b['systems']),'carried_cells_equal':len(cb['systems']),'orders_equal':True,'predecessor_files_equal':len(files)},indent=1)+'\n')
print('PASS 311 carried rows incl ranks and all cells/orders equal; 24 predecessor files byte equal to base')
