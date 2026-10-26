"""Verify raw and runtime receipts in place; emit only aggregate counts and hashes."""
import json,pathlib,hashlib,re
J=pathlib.Path(__file__).resolve().parent;M=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r41-d1a/attempt3-measured');L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();out={}
assert L(M/'teardown.json')['closed'] is True
entries=L(J/'inputs/ENTRY-D1A.json')
for k,e in entries.items():
 size=k.rsplit('-',1)[1];D=M/'out'/size;raw=pathlib.Path(e['raw']);rr=[json.loads(x) for x in raw.open()];audit=[json.loads(x) for x in (D/'prompt-audit.jsonl').open()]
 windows=[i for i in range(len(audit)-1499) if all(audit[i+j]['input_tokens']==rr[j]['usage']['input_tokens'] for j in range(1500))];assert len(windows)==1
 audit=audit[windows[0]:windows[0]+1500]
 assert len(rr)==len(audit)==1500 and all(r['ok'] and r['status_code']==200 and not r['error'] for r in rr)
 over={i for i,r in enumerate(rr) if r['latency_s']>10};truncated={i for i,r in enumerate(audit) if r['state_truncated']}
 assert len(over)==15 and over==truncated
 expected=L(pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score/ENTRIES-R15A-LEAD.json'))[k]['expect']
 assert sum(r['usage']['input_tokens'] for r in rr)==expected['input_tokens'] and sum(r['usage']['output_tokens'] for r in rr)==expected['output_tokens']
 for file in ['weights-verify.json','node-model-verify.json']:
  data=L(D/file);assert data.get('verified',data.get('ok',False)),(file,list(data))
 assert L(D/'import-audit.json')['source_verified'] is True
 out[k]={'rows':1500,'http_200':1500,'truncated':15,'over_10s':15,'over_limit_equals_truncated':True,'max_latency_s':max(r['latency_s'] for r in rr),'raw_sha256':sha(raw),'runtime_receipts_sha256':{f:sha(D/f) for f in ['weights-verify.json','node-model-verify.json','import-audit.json','row-measurement.json','prompt-audit.jsonl']},'teardown_sha256':sha(M/'teardown.json')}
# Public prose scan includes the entry copy and captured scored sources.
for p in [J/'inputs/ENTRY-D1A.json',J/'src/inputs.json']:
 text=p.read_text();assert not re.search(r'\{[A-Za-z_][A-Za-z0-9_]*\}',text)
 for f in ['licence','disclosure','code_revision','endpoint_condition','cost_basis']:
  def walk(v):
   if isinstance(v,dict):
    for key,x in v.items():
     if key==f and isinstance(x,str):assert not re.search(r'/home/|workers/|#\d{4,}|Florian|release.owner|the lead|\brank(?:ed|ing)?\b|\bpod\b|\bVM\b',x,re.I),(p.name,f)
     walk(x)
   elif isinstance(v,list):
    for x in v:walk(x)
  walk(L(p))
(J/'receipts/SOURCE.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('PASS raw HTTP/usage aggregates, exact truncation-timeout equality, runtime verification receipts, teardown and public prose')
