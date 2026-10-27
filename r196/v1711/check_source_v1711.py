"""Source, recount, reference, carried-row and scope gates with negative tests."""
import pathlib,json,hashlib,subprocess,copy,re
from pricing_reference_v1711 import reference,PIN
from recount_gate_v1711 import check_recount
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();put=lambda n,d:(J/'receipts'/n).write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
b=L(V/'jevbench-v1.7.10-results.json');a=L(V/'jevbench-v1.7.11-results.json');before={r['key']:r for r in b['systems']};after={r['key']:r for r in a['systems']};pins=L(J/'receipts/INPUTS.json');entries=L(J/'inputs/ENTRIES.json');proof=L(V/'jevbench-v1.7.11-proof.json');keys=L(J/'inputs/KEYS.json')
def stripped(r,correction=False):
 r=copy.deepcopy(r)
 for f in ['rank','ranks']:r.pop(f,None)
 if correction:
  for f in ['cost','scores','views','jevbench_score','composite_ci95','cost_basis','price_basis']:r.pop(f,None)
  r['axes'].pop('cost');r['v16']['ci95'].pop('composite')
 return r
assert set(before)==set(after)
for k in before:assert stripped(before[k],k in keys)==stripped(after[k],k in keys),k
carried=L(J/'src/carried-off.json');scored=L(J/'src/inputs.json')
for k in keys:
 base=carried.get(k) or before[k]['previous']
 for f in ['intelligence','calibration','speed']:assert base['axes'][f]==scored[k]['v17-off']['axes'][f],(k,'off',f)
 for f in ['capability','speed']:
  if f in base:assert base[f]==scored[k]['v17-off'][f],(k,'off',f)
bc=L(V/'jevbench-v1.7.10-categories.json');ac=L(V/'jevbench-v1.7.11-categories.json')
for f in ['systems','lanes']:assert bc[f]==ac[f],f
for n in ['carry','history','history-carry']:assert (V/f'jevbench-v1.7.10-{n}.json').read_bytes()==(V/f'jevbench-v1.7.11-{n}.json').read_bytes()
for n in ['results','categories','carry','history','history-carry','proof','publication']:
 p=f'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.10-{n}.json';assert subprocess.check_output(['git','show','7343bd25:'+p],cwd=W)==(W/p).read_bytes()
def bind(p):
 assert sha(p['audit_path'])==p['audit_sha256'],'recount hash mismatch'
 assert sha(p['raw_path'])==p['raw_sha256'],'raw hash mismatch'
for k,p in pins.items():bind(p);check_recount(k,L(pathlib.Path(p['audit_path'])))
negative=0
for k,p in pins.items():
 a=L(pathlib.Path(p['audit_path']))
 for field,value in [('items_with_nonzero_residual',1),('pad_sum',1),('native_usage_sum',0),('other_outcomes',{'unexpected':1})]:
  bad={**a,field:value}
  try:check_recount(k,bad)
  except AssertionError:negative+=1
  else:raise AssertionError('bad recount accepted')
 if not k.endswith('tuned-commit'):
  bad=copy.deepcopy(a);bad['recount_vs_published']['over_length_ids_equal_published_failures']=False
  try:check_recount(k,bad)
  except AssertionError:negative+=1
  else:raise AssertionError('bad failure set accepted')
for k,p in pins.items():
 for f in ['audit_sha256','raw_sha256']:
  bad={**p,f:'0'*64}
  try:bind(bad)
  except AssertionError:negative+=1
  else:raise AssertionError('bad recount binding accepted')
pattern=re.compile(r'([^\s]+) at USD ([0-9.]+)/([0-9.]+) per million input/output tokens')
def prices(k,row,pr):
 r=reference(k,entries[k]['entry']);assert r==pr
 m=pattern.findall(row['cost']['basis']);assert len(m)==1
 listing,i,o=m[0];assert (listing,float(i),float(o))==(r['listing'],r['in'],r['out'])
 assert row['cost']['kind']==before[k]['cost']['kind']=='estimate'
 assert row['cost']['common_basis']['n_items']==before[k]['cost']['common_basis']['n_items']
 assert row['model_pin']==before[k]['model_pin']
 assert not re.search(r'PLACEHOLDER|\{[A-Za-z_][A-Za-z0-9_]*\}|/home/|workers/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy',row['cost']['basis'],re.I)
 assert ('registration prefill' in row['cost']['basis'])==(k.endswith('tuned-commit') or k.endswith('v090'))
 return r
refs={}
for k in keys:
 row=after[k];pr=proof['repriced_rows'][k]['price_reference'];refs[k]=prices(k,row,pr)
 for f,v in [('basis',row['cost']['basis'].replace(refs[k]['listing'],'wrong-reference')),('basis',row['cost']['basis'].replace(' at USD ',' at USD 9')),('kind','measured'),('basis',row['cost']['basis']+' PLACEHOLDER'),('basis',row['cost']['basis']+' Florian')]:
  bad=copy.deepcopy(row);bad['cost'][f]=v
  try:prices(k,bad,pr)
  except AssertionError:negative+=1
  else:raise AssertionError('public gate tamper accepted')
 bad=copy.deepcopy(row);bad['model_pin']='wrong@'+'a'*40
 try:prices(k,bad,pr)
 except AssertionError:negative+=1
 else:raise AssertionError('pin tamper accepted')
 badpr={**pr,'out':999}
 try:prices(k,row,badpr)
 except AssertionError:negative+=1
 else:raise AssertionError('reference tamper accepted')
put('SOURCE.json',{'status':'PASS','rows_equal_except_ranks':296,'cost_correction_exceptions':keys,'noncost_equal':True,'carried_cells_equal':len(bc['systems']),'predecessor_files_equal_to_base':7,'immutable_bytes':['carry','history','history-carry'],'audit_and_raw_bindings':4,'references':refs,'pricing_module_sha256':PIN,'negative_cases_refused':negative})
print('PASS 296 carried rows, four cost-only exceptions, all cells/lanes, immutable predecessor/carry/history, four recount/raw bindings, references/pins/public text/cost-kind;',negative,'negative cases refused')
