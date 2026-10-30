"""All numeric, boolean and null leaves vs critic-reviewed head; enumerate text deltas."""
import json,pathlib,subprocess,hashlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];BASE='ef5c54155926b2f20fded6ecf21c513a9747d17e'
baseline=json.loads((J/'inputs/FIX-BASELINE.json').read_text());count=0;strings=[]
def walk(a,b,path):
 global count
 assert type(a)==type(b),(path,type(a),type(b))
 if isinstance(a,dict):
  assert a.keys()==b.keys(),path
  for k in a:walk(a[k],b[k],path+'.'+k)
 elif isinstance(a,list):
  assert len(a)==len(b),path
  for i,(u,v) in enumerate(zip(a,b)):walk(u,v,path+f'[{i}]')
 elif isinstance(a,str):
  if a!=b:strings.append({'path':path,'before':a,'after':b,'before_sha256':hashlib.sha256(a.encode()).hexdigest(),'after_sha256':hashlib.sha256(b.encode()).hexdigest()})
 else:assert a==b,(path,a,b);count+=1
for name in ['results','categories','proof','publication','carry','history','history-carry']:
 p=pathlib.Path(f'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.2-{name}.json')
 walk(baseline[name],json.loads((W/p).read_text()),name)
# The final result-row deltas are the public exceptions, including generated cost text.
p=pathlib.Path('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.2-results.json')
a=baseline['results'];b=json.loads((W/p).read_text());assert a['board']==b['board']
result_changes=[dict(id=i+1,**s) for i,s in enumerate(strings) if s['path'].startswith('results.systems[')]
receipt={'status':'PASS','baseline':BASE,'numeric_bool_null_leaves_equal':count,'numeric_differences':0,'order_lists_equal':True,'artifact_text_changes':strings,'public_text_exceptions':result_changes}
(J/'receipts/FIX-ROUND-EQUALITY.json').write_text(json.dumps(receipt,indent=1,ensure_ascii=False)+'\n')
print('PASS',count,'numeric/bool/null leaves identical across seven artifacts;',len(result_changes),'SHA-pinned public text exceptions')
