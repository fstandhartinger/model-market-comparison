import re,json,hashlib,gzip
from pathlib import Path
E=Path('ops/rebuild-2026-09/evidence/phase-05')
raw=Path('ops/rebuild-2026-09/evidence/phase-04/sources/aa-29d2fef1679c.html.gz')
html=gzip.decompress(raw.read_bytes()).decode()
chunks=[]
for s in re.findall(r'<script[^>]*>self\.__next_f\.push\((\[.*?\])\)</script>',html,re.S):
 x=json.loads(s)
 if x[0]==1 and isinstance(x[1],str):chunks.append(x[1])
records={}
for line in ''.join(chunks).splitlines():
 if ':' not in line:continue
 k,v=line.split(':',1)
 if not re.fullmatch('[a-f0-9]+',k):continue
 try:records[k]=json.loads(v)
 except json.JSONDecodeError:pass

def visit(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from visit(v)
 elif isinstance(x,list):
  for v in x:yield from visit(v)
def deref(x):
 if isinstance(x,str) and re.match(r'^\$[a-f0-9]+(?::|$)',x):
  keys=x[1:].split(':');v=records[keys[0]]
  for k in keys[1:]:
   v=deref(v);v=v[3] if k=='props' and isinstance(v,list) else v[int(k)] if isinstance(v,list) else v[k]
  return deref(v)
 if isinstance(x,dict):return {k:deref(v) for k,v in x.items()}
 if isinstance(x,list):return [deref(v) for v in x]
 return x
source={}
for rec in records.values():
 for o in visit(rec):
  if isinstance(o.get('id'),str) and re.fullmatch(r'[a-f0-9]{8}-[a-f0-9-]{27,}',o['id']) and isinstance(o.get('slug'),str) and 'intelligenceIndex' in o:source[o['id']]=o
snap=json.loads((E/'draft-scores.json').read_text())
models=json.loads(Path('data/dataset.json').read_text())['models'];byid={m['id']:m for m in models}
checked=[]
for o in snap['observations']:
 if not o['id'].startswith('aa:'):continue
 sid,field=o['id'].split(':',2)[1:];r=source[sid];v=r
 for k in field.split('.'):v=deref(v[k])
 assert v==o['value'],o['id']
 assert o['source']['sha256']==hashlib.sha256(html.encode()).hexdigest()
 assert o['subject']['name']==r['name'];assert o['subject']['variant']==(deref(r.get('effort')) or {}).get('slug')
 mid=o['subject']['model_id']
 if mid:assert byid[mid]['aa_model_id']==sid
 checked.append({'id':o['id'],'source_name':r['name'],'source_effort':(deref(r.get('effort')) or {}).get('slug'),'model_id':mid,'benchmark_id':o['benchmark_id'],'source_value':v,'candidate_value':o['value'],'unit':o['unit']})
assert all('livecodebench' not in o['id'] for o in snap['observations'])
result={'command':'python3 ops/rebuild-2026-09/evidence/phase-05/check-aa.py','source':str(raw),'source_sha256':hashlib.sha256(html.encode()).hexdigest(),'primary_models':len(source),'scores_checked':len(checked),'all_values_names_efforts_uuid_joins_equal':True,'withheld_livecodebench':len(snap['rejected']),'rows':checked}
(E/'aa-independent-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='rows'}))
