import os
import pathlib,subprocess,hashlib,json
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])))
files=[W/p for p in json.loads((J/'src/site-paths.json').read_text())]
def hashes():return {str(p.relative_to(W)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
a=[]
for _ in range(2):
 subprocess.run(['bash',str(J/'rebuild_v178.sh')],check=True)
 subprocess.run(['python3','-B',str(J/'preview_v178.py')],check=True)
 a.append(hashes())
assert a[0]==a[1]
(J/'receipts/REPRO.json').write_text(json.dumps({'identical':True,'passes':2,'hashes':a[1]},indent=1,sort_keys=True)+'\n')
print('PASS: two deterministic rebuilds, identical bytes for',len(files),'changed site artifacts, code and fixtures')
