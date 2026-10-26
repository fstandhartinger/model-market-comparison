"""Verify hygiene findings against sanitized public fields; require the independent fairness binding."""
import pathlib,json,hashlib,re
J=pathlib.Path(__file__).resolve().parent;F=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r190-sieve-fair/RESULT.json')
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();e=L(J/'inputs/ENTRY-SIEVE.json')['sieve-31b-v2']['entry']
r=L(F);assert r['fairness']=='FAIR' and not r['blockers']
fields=['display','author','licence','disclosure','code_revision','endpoint_condition','cost_basis'];s=json.dumps({k:e[k] for k in fields})
patterns={'sealed_item_ids':r'v16-[a-f0-9]{14}','internal_ids_paths_roles':r'/home/|workers/|J/|#\d{4,}|Florian|the lead|release.owner|\bPREREG\b|instance id|\brank(?:ed|ing)?\b'}
for k,p in patterns.items():assert not re.search(p,s,re.I),k
for t in ['own shim','8.5495','training datasets','contamination','4 decimals','32,768','15','misses','ESTIMATE']:assert t.lower() in s.lower(),t
fair=L(J/'inputs/APPROVAL.json')['fairness_check']
assert fair['verdict']=='FAIR' and fair['path']=='workers/r190-sieve-fair/RESULT.json' and fair['sha256']==sha(F),'FAIR review binding required'
out={'status':'PASS','independent_fairness':'FAIR','review_path':'workers/r190-sieve-fair/RESULT.json','review_sha256':sha(F),'findings_resolved':{'F1':'No sealed opaque item identifiers in editable public fields or captured numeric inputs.','F2':'Board identifiers, internal paths/roles, personal name, VM identifiers and rank prose removed by equivalent sanitized public text.'},'watch_findings_retained':{'F3':'Training datasets unidentified; contamination unchecked.','F4':'Declared author training/serving temperature; no separate post-hoc JevBench fit identified.','F5':'Review preview only; no publication or author message.'},'publication_fairness_binding':fair,'entry_sha256':sha(J/'inputs/ENTRY-SIEVE.json')}
(J/'receipts/FAIRNESS-TEXT-RESOLUTION.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print(json.dumps(out))
