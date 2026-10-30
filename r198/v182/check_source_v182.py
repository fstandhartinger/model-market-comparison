"""Verify exact carried text exceptions, numeric equality and historical source immutability."""
import pathlib,json,subprocess,hashlib,copy
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];BASE='6c9b56320bd72aed249052ab1e370fcf6d99b025';L=lambda p:json.loads(p.read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
def base(p):return subprocess.check_output(['git','show',BASE+':'+str(p)],cwd=W)
D=pathlib.Path('data/raw/benchmarks/jevbench/v1.8');b=json.loads(base(D/'jevbench-v1.8.1-results.json'));a=L(W/D/'jevbench-v1.8.2-results.json');by={s['key']:s for s in a['systems']};exceptions=L(J/'inputs/TEXT-EXCEPTIONS.json');n=0
for r in b['systems']:
 expected=copy.deepcopy(r)
 for e in exceptions:
  if e['key']!=r['key']:continue
  p=e['path'].split('.');o=expected
  for f in p[:-1]:o=o[f]
  assert o[p[-1]]==e['before'] and sha(e['before'].encode())==e['before_sha256'] and sha(e['after'].encode())==e['after_sha256'];o[p[-1]]=e['after']
 assert by[r['key']]==expected,r['key']
 def numeric(x,y):
  global n
  if isinstance(x,dict):
   for k in x:numeric(x[k],y[k])
  elif isinstance(x,list):
   assert len(x)==len(y)
   for u,v in zip(x,y):numeric(u,v)
  elif not isinstance(x,str):assert x==y;n+=1
 numeric(r,by[r['key']])
assert a['board']==b['board']
files=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE,'data/raw/benchmarks/jevbench','lib'],cwd=W,text=True).splitlines();count=0
for f in files:
 if f.startswith('data/raw/benchmarks/jevbench/') or (f.startswith('lib/jevbench-v') and f.endswith('-release.mjs')):
  assert (W/f).read_bytes()==base(f),f;count+=1
archive={}
for p in sorted((W/'app/jev-models').glob('v1.7.*/page.tsx')):
 rel=p.relative_to(W);assert p.read_bytes()==base(rel);archive[str(rel)]=sha(p.read_bytes())
bm=json.loads(base('data/jevbench-base-models.json'));am=L(W/'data/jevbench-base-models.json');allowed=set(L(J/'inputs/BASE-MODELS.json'))
for scope,rows in bm['benchmarks'].items():
 for k,v in rows.items():
  if scope!='jevbench' or k not in allowed:assert am['benchmarks'][scope][k]==v,k
arch_before=json.loads(base('data/jevbench-architecture.json'));arch_after=L(W/'data/jevbench-architecture.json')
for scope,entries in arch_before['benchmarks'].items():
 for k,v in entries.items():assert arch_after['benchmarks'][scope][k]==v,k
assert set(arch_after['benchmarks']['jevbench'])==set(arch_before['benchmarks']['jevbench'])|set(L(J/'inputs/ARCHITECTURE.json'))
receipt={'status':'PASS','base':BASE,'carried_rows':len(b['systems']),'numeric_bool_null_leaves_equal':n,'text_exceptions':len(exceptions),'text_exceptions_sha256':sha((J/'inputs/TEXT-EXCEPTIONS.json').read_bytes()),'base_data_and_loader_files_byte_equal':count,'archived_v17_pages_source_byte_equal':archive,'order_lists_equal':True,'overlay_unrelated_keys_equal':True,'architecture_existing_entries_equal':True}
(J/'receipts/CARRIED-ROWS.json').write_text(json.dumps(receipt,indent=1,sort_keys=True)+'\n');print('PASS',len(b['systems']),'carried rows;',n,'numeric/bool/null leaves;',len(exceptions),'text exceptions;',count,'historical files')
