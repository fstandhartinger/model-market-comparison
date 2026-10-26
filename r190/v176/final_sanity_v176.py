"""Independent aggregate checks; never imports or executes model/submitter code."""
import pathlib,json,hashlib,re,subprocess,sys
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();K='decisio-gemma-4-12b-tuned-commit'
def check_new_row_text(row):
 repo=row['repo'].removeprefix('https://huggingface.co/').rstrip('/')
 pin=row.get('model_pin','')
 assert pin.startswith(repo+'@'),'model_pin must start with repo owner/name'
 if row['key']==K:
  assert 'tachara-ai/Decisio-12b-tuned-commit@245e00dc' in pin and not re.search('sthanika-ai|31B',pin,re.I),'model_pin owner/revision or base family size mismatch'
  assert pin=='tachara-ai/Decisio-12b-tuned-commit@245e00dc45abad14d693b1ebae4d4c7aa9cf72f1 + aminry/decisio@4f849ff2dbae10a53026e382ce3dd60b95780594','model_pin owner/revision or base family size mismatch'
 assert not re.search(r'\{[A-Z_]+\}',json.dumps(row)),'public text contains template token'
if len(sys.argv)>1 and sys.argv[1]=='--check-row-json':
 check_new_row_text(L(pathlib.Path(sys.argv[2])))
 print('PASS new row pin and template gates');sys.exit(0)
a=L(V/'jevbench-v1.7.6-results.json');b=L(V/'jevbench-v1.7.5-results.json');by={s['key']:s for s in a['systems']};x=L(J/'src/inputs.json')[K];row=by[K]
for key in a['addendum']['new_keys']:check_new_row_text(by[key])
assert len(by)==293 and a['n_ranked']==273 and len(b['systems'])==292
for s in b['systems']:assert {k:v for k,v in s.items() if k not in ['rank','ranks']}=={k:v for k,v in by[s['key']].items() if k not in ['rank','ranks']},s['key']
for f in ['axes','scores','views','jevbench_score','capability','speed','v16','intelligence','calibration','validity','composite_ci95','decision_limit','status','support']:assert row[f]==x['v17-share'][f],f
assert {k:v for k,v in row['cost'].items() if k!='basis'}=={k:v for k,v in x['v17-share']['cost'].items() if k!='basis'}
for name in ['carry','history','history-carry']:assert (V/f'jevbench-v1.7.6-{name}.json').read_bytes()==(V/f'jevbench-v1.7.5-{name}.json').read_bytes()
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
proof=L(V/'jevbench-v1.7.6-proof.json');approval=L(J/'inputs/APPROVAL.json');pub=L(V/'jevbench-v1.7.6-publication.json')
assert proof['publication_approval']==approval and pub['review']['verdict']=='PENDING'
fair=approval['fairness_check'];FR=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')/fair['path']
assert fair['verdict']=='FAIR' and re.fullmatch(r'[0-9a-f]{64}',fair.get('sha256','')) and FR.is_file() and sha(FR)==fair['sha256'] and L(FR).get('fairness')=='FAIR','FAIR fairness receipt bound by sha required'
for f,d in pub['files'].items():assert sha(W/d['path'])==d['sha256'],f
assert sha(J/'receipts/topfive-diff.json')==proof['topfive_diff_sha256']==approval['top_five_preview']['sha256']
for p in [W/'app/api/jevbench/v1.7.5/route.ts',W/'app/jev-models/v1.7.5/page.tsx']:
 assert p.read_bytes()==subprocess.check_output(['git','show','HEAD:'+str(p.relative_to(W))]),p
result={'status':'PASS','rows':293,'ranked':273,'carried_rows_equal_except_ranks':292,'new_row_numeric_fields_exact':True,'history_carry_bytes_exact':True,'new_public_text_scan':'PASS','cells_aggregate_only':'PASS','publication':'PENDING','fairness':fair['verdict'],'fairness_receipt_sha256':fair.get('sha256'),'preview_bound':True,'previous_release_pages_unchanged':True}
(J/'receipts/FINAL-SANITY.json').write_text(json.dumps(result,indent=1,sort_keys=True)+'\n');print(json.dumps(result))
