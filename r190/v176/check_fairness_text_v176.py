import pathlib,json,hashlib,re
J=pathlib.Path(__file__).resolve().parent;F=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r190-decisio-fair/RESULT.json')
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(F)=='09696d53206ede9d4fcb3b0a5af2061498a0d0f08a6ba4121135bee9d9d4d199'
assert L(F)['fairness']=='FAIR'
e=L(J/'inputs/ENTRY-DECISIO.json')['decisio-gemma-4-12b-tuned-commit']['entry']
s=json.dumps({k:e[k] for k in ['display','author','licence','disclosure','code_revision','endpoint_condition','cost_basis']})
assert not re.search(r'v16-[a-f0-9]{14}|/home/|workers/|J/|#\d{4,}|Florian|the lead|release.owner|\bPREREG\b|instance id|\brank(?:ed|ing)?\b',s,re.I)
for t in ['JEVBENCH-AWARE DEFAULT','193 of the 373','15 standard long positions','1,485 output','NO base key']:assert t in s,t
fixes=L(J/'receipts/TEXT-FIXES.json');assert len(fixes['fixes'])==14 and all(f['old_occurrences']==1 and f['applied'] for f in fixes['fixes'])
a=L(J/'inputs/APPROVAL.json')['fairness_check'];assert a['verdict']=='FAIR' and a['sha256']==sha(F)
out={'status':'PASS','fairness_check':a,'text_fixes':fixes,'public_hygiene':'PASS'}
(J/'receipts/FAIRNESS-TEXT-RESOLUTION.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('PASS FAIR receipt bound; all 14 exact text fixes; no sealed ids or internal prose')
