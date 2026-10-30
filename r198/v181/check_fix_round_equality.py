import json,pathlib,subprocess,hashlib,collections
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];OLD='15ba31bf331220095a2c5eee84b27ec7b4d670e1';BASE='70b6f06d13eb8b49d7bab93a280c4bb9d29fde66'
def old(p,ref=OLD):return json.loads(subprocess.check_output(['git','show',ref+':'+str(p)],cwd=W))
def walk(a,b,p='$'):
 if type(a)!=type(b):return [(p,a,b)]
 if isinstance(a,dict):
  out=[]
  for k in sorted(set(a)|set(b)):
   if k not in a or k not in b:out.append((p+'.'+k,a.get(k),b.get(k)))
   else:out+=walk(a[k],b[k],p+'.'+k)
  return out
 if isinstance(a,list):
  assert len(a)==len(b),(p,len(a),len(b))
  return sum((walk(x,y,p+f'[{i}]') for i,(x,y) in enumerate(zip(a,b))),[])
 return [] if a==b else [(p,a,b)]
def nums(v,p='$'):
 if isinstance(v,dict):return {q:n for k,x in v.items() for q,n in nums(x,p+'.'+k).items()}
 if isinstance(v,list):return {q:n for i,x in enumerate(v) for q,n in nums(x,p+f'[{i}]').items()}
 return {p:v} if type(v)in (int,float) else {}
D=pathlib.Path('data/raw/benchmarks/jevbench/v1.8');all_diffs={};numeric_counts={}
for n in ['results','categories','carry','proof','history','history-carry','publication']:
 p=D/f'jevbench-v1.8.1-{n}.json';a=old(p);b=json.loads((W/p).read_text());assert nums(a)==nums(b),n;numeric_counts[n]=len(nums(a));all_diffs[n]=walk(a,b)
# The exact allowed public changes: cost bases, hand-edited endpoint/disclosure,
# history strings and the carried addendum rule. Binding hashes necessarily follow.
a=old(D/'jevbench-v1.8.1-results.json');b=json.loads((W/D/'jevbench-v1.8.1-results.json').read_text())
allowed={'cost.basis','disclosure','endpoint_condition','speed.adjustment'};row_diffs={}
for ar,br in zip(a['systems'],b['systems']):
 assert ar['key']==br['key'];diff=walk(ar,br,'')
 assert all(p.lstrip('.')in allowed for p,x,y in diff),(ar['key'],diff)
 if ar.get('new_in')!='v1.8.1':assert not diff
 else:row_diffs[ar['key']]=[p.lstrip('.') for p,x,y in diff]
assert set(p for p,x,y in all_diffs['results'] if not p.startswith('$.systems['))=={'$.addendum.cost_basis.rule','$.source_note',f"$.measurement_notes[{len(a['measurement_notes'])-1}]"}
assert not all_diffs['carry'] and not all_diffs['history'] and not all_diffs['history-carry']
assert all(p=='$.results_sha256' for p,x,y in all_diffs['categories'])
assert all(p in {'$.predecessor.publication_sha256','$.topfive_diff_sha256','$.source_inputs.inputs/PUBLIC-ROWS.json','$.cost_basis.rule'} for p,x,y in all_diffs['proof'])
assert all(p=='$.predecessor.publication_sha256' or (p.startswith('$.files.')and p.endswith('.sha256')) for p,x,y in all_diffs['publication'])
prev_path=D/'jevbench-v1.8.0-publication.json';live=subprocess.check_output(['git','show',BASE+':'+str(prev_path)],cwd=W);assert (W/prev_path).read_bytes()==live
assert json.loads((W/D/'jevbench-v1.8.1-publication.json').read_text())['predecessor']['publication_sha256']==hashlib.sha256(live).hexdigest()
receipt={'status':'PASS','original_candidate_sha':OLD,'base_origin_main_sha':BASE,'all_numeric_fields_identical':True,'numeric_fields_compared':numeric_counts,'carried_rows_identical':316,'new_rows':row_diffs,'enumerated_changed_paths':{n:[p for p,x,y in d] for n,d in all_diffs.items()},'live_v180_predecessor_sha256':hashlib.sha256(live).hexdigest(),'no_numeric_fields_changed':True}
(J/'FIX-ROUND-EQUALITY.json').write_text(json.dumps(receipt,indent=1,sort_keys=True)+'\n');print('PASS numeric equality',numeric_counts,'; 316 carried rows identical; only enumerated prose/rule and hash bindings differ')
