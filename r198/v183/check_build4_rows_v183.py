"""Prove each original candidate row is byte-identical to build4's commit."""
import pathlib,json,subprocess,hashlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];BASE='6516cff7d3077e87073ce7e89b002792ca541ac7';P='data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.3-results.json'
old_text=subprocess.check_output(['git','show',BASE+':'+P],cwd=W,text=True);new_text=(W/P).read_text();old=json.loads(old_text);new=json.loads(new_text);by={r['key']:r for r in new['systems']};keys=old['addendum']['new_keys'];receipt={}
for r in old['systems']:
 if r['key'] not in keys:continue
 enc=lambda x:json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()
 assert enc(r)==enc(by[r['key']]),r['key'];receipt[r['key']]=hashlib.sha256(enc(r)).hexdigest()
assert len(receipt)==3
def row_bytes(text):
 decoder=json.JSONDecoder();pos=text.index('[',text.index('"systems":'))+1;out={}
 while True:
  while text[pos].isspace() or text[pos]==',':pos+=1
  if text[pos]==']':break
  row,end=decoder.raw_decode(text,pos);out[row['key']]=text[pos:end].encode();pos=end
 return out
before=row_bytes(old_text);after=row_bytes(new_text)
exact={}
for k in keys:
 assert before[k]==after[k],('serialized row bytes',k)
 exact[k]=hashlib.sha256(before[k]).hexdigest()
# Unchanged per-row objects also retain category and proof bindings.
for kind,path in [('categories',['systems']),('proof',['new_rows'])]:
 p=P.replace('-results.json','-'+kind+'.json');a=json.loads(subprocess.check_output(['git','show',BASE+':'+p],cwd=W));b=json.loads((W/p).read_text())
 for field in path:
  for k in keys:assert a[field][k]==b[field][k],(kind,k)
(J/'receipts/BUILD4-ROWS.json').write_text(json.dumps({'status':'PASS','base':BASE,'canonical_row_bytes_sha256':receipt,'exact_serialized_row_bytes_sha256':exact,'categories_and_row_proofs_identical':True},indent=1,sort_keys=True)+'\n')
print('PASS three build4 rows byte-identical; category and proof row objects identical')
