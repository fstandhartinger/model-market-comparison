"""Verify immutable base row/data bytes and archived v1.7 source before heavy-run (which omits .git)."""
import pathlib,json,subprocess,hashlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];BASE='b05d2f618';L=lambda p:json.loads(p.read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
def base(p):return subprocess.check_output(['git','show',BASE+':'+str(p)],cwd=W)
D=pathlib.Path('data/raw/benchmarks/jevbench/v1.8');b=json.loads(base(D/'jevbench-v1.8.0-results.json'));a=L(W/D/'jevbench-v1.8.1-results.json');by={s['key']:s for s in a['systems']}
for r in b['systems']:assert by[r['key']]==r
assert a['board']==b['board']
files=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE,'data/raw/benchmarks/jevbench','lib'],cwd=W,text=True).splitlines();n=0
for f in files:
 if 'jevbench-v1.8.1' in f:continue
 if f.startswith('data/raw/benchmarks/jevbench/') or (f.startswith('lib/jevbench-v') and f.endswith('-release.mjs')):
  assert (W/f).read_bytes()==base(f),f;n+=1
archive={}
for p in sorted((W/'app/jev-models').glob('v1.7.*/page.tsx')):
 rel=p.relative_to(W);assert p.read_bytes()==base(rel),str(rel);archive[str(rel)]=sha(p.read_bytes())
receipt={'status':'PASS','base':BASE,'carried_rows':len(b['systems']),'base_data_and_loader_files_byte_equal':n,'archived_v17_pages_source_byte_equal':archive,'order_lists_equal':True}
(J/'receipts/CARRIED-ROWS.json').write_text(json.dumps(receipt,indent=1,sort_keys=True)+'\n');print('PASS',len(b['systems']),'carried rows;',n,'historical files;',len(archive),'archived v1.7 pages source byte-equal')
