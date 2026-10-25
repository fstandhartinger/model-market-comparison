"""Independent aggregate checks; never imports or executes model/submitter code."""
import pathlib,json,hashlib,re,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();K='dopest-1.0-31b'
a=L(V/'jevbench-v1.7.4-results.json');b=L(V/'jevbench-v1.7.3-results.json');by={s['key']:s for s in a['systems']};x=L(J/'src/inputs.json')[K];row=by[K]
assert len(by)==291 and a['n_ranked']==271 and len(b['systems'])==290
for s in b['systems']:assert {k:v for k,v in s.items() if k not in ['rank','ranks']}=={k:v for k,v in by[s['key']].items() if k not in ['rank','ranks']},s['key']
for f in ['axes','scores','views','jevbench_score','capability','speed','v16','intelligence','calibration','validity','composite_ci95','decision_limit','status','support']:assert row[f]==x['v17-share'][f],f
assert {k:v for k,v in row['cost'].items() if k!='basis'}=={k:v for k,v in x['v17-share']['cost'].items() if k!='basis'}
for name in ['carry','history','history-carry']:assert (V/f'jevbench-v1.7.4-{name}.json').read_bytes()==(V/f'jevbench-v1.7.3-{name}.json').read_bytes()
text=json.dumps({f:row[f] for f in ['author','disclosure','licence','endpoint_condition','code_revision','cost']})
assert not re.search(r'/home/|workers/|J/r\d|#\d{4,}|\bPREREG\b|Florian|b7099b77|53a5052f|\brank(?:ed|ing)?\b|top[- ]five|top[- ]5|zero-based',text,re.I)
for p in (J/'cells').rglob('*.json'):
 def walk(d):
  if isinstance(d,dict):
   for k,v in d.items():
    assert k not in ['task_id','opaque_id','item_text','predictions','per_item','item_results'],(p,k)
    walk(v)
  elif isinstance(d,list):
   for v in d:walk(v)
 walk(L(p))
proof=L(V/'jevbench-v1.7.4-proof.json');approval=L(J/'inputs/APPROVAL.json');pub=L(V/'jevbench-v1.7.4-publication.json')
assert proof['publication_approval']==approval and pub['review']['verdict']=='PENDING'
assert approval['fairness_check']['verdict']=='PENDING','lead must separately review any fairness binding change'
for f,d in pub['files'].items():assert sha(W/d['path'])==d['sha256'],f
assert sha(J/'receipts/topfive-diff.json')==proof['topfive_diff_sha256']==approval['top_five_preview']['sha256']
for p in [W/'app/api/jevbench/v1.7.3/route.ts',W/'app/jev-models/v1.7.3/page.tsx']:
 assert p.read_bytes()==subprocess.check_output(['git','show','HEAD:'+str(p.relative_to(W))]),p
result={'status':'PASS','rows':291,'ranked':271,'carried_rows_equal_except_ranks':290,'new_row_numeric_fields_exact':True,'history_carry_bytes_exact':True,'new_public_text_scan':'PASS','cells_aggregate_only':'PASS','publication':'PENDING','fairness':'PENDING','preview_bound':True,'previous_release_pages_unchanged':True}
(J/'receipts/FINAL-SANITY.json').write_text(json.dumps(result,indent=1,sort_keys=True)+'\n');print(json.dumps(result))
