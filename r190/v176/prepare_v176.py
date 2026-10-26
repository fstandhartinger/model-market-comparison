"""Verify source bytes in place; capture aggregate scores and editable public prose only."""
import copy,hashlib,json,pathlib
J=pathlib.Path(__file__).resolve().parent;I=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score');K='decisio-gemma-4-12b-tuned-commit'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
ep=I/'ENTRIES-R14A-LEAD.json';assert sha(ep)=='e8725279270bc103d89447c6ddf353c4f626fff263d8baa9cecb758205eb1c95'
e=L(ep)[K];raw=pathlib.Path(e['raw']);assert sha(raw)=='e9c889e1a138c875eb52521748e63b4344043c7a5598527c073172dd1c81594f'
p=J/'inputs/ENTRY-DECISIO.json'
if not p.exists():
 local=copy.deepcopy(e);en=local['entry'];fixes=L(pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r190-decisio-fair/TEXT-FIXES.json'))['fixes'];applied=[]
 for fix in fixes:
  text=en[fix['field']]
  if fix['id']=='T11':
   assert text.count(fix['old_start'])==text.count(fix['old_end'])==1
   start=text.index(fix['old_start']);end=text.index(fix['old_end'],start)+len(fix['old_end']);old=text[start:end]
   assert hashlib.sha256(old.encode()).hexdigest()==fix['old_sha256']
  else:old=fix['old'];assert text.count(old)==1,fix['id']
  en[fix['field']]=text.replace(old,fix['new'],1);applied.append({'id':fix['id'],'old_occurrences':1,'applied':True})
 put(p,{K:local});put(J/'receipts/TEXT-FIXES.json',{'status':'PASS','fixes':applied,'numeric_changes':False})
local=L(J/'inputs/ENTRY-DECISIO.json');en=local[K]['entry']
en['disclosure']=en['disclosure'].replace('The v1.7 share ranking uses','The v1.7 share view uses')
en['code_revision']=en['code_revision'].replace('a rank-16 LoRA','a LoRA with adapter dimension 16')
en['cost_basis']=en['cost_basis'].replace(', r168 re-freeze of 22 Oct 2026', ', re-freeze of 22 Oct 2026')
put(J/'inputs/ENTRY-DECISIO.json',local)
reg=L(I/'field-r14a/REGISTRY.json')[K]
d={'registry':{f:v for f,v in reg.items() if f not in ['disclosure','cost_basis','code_revision','endpoint_condition']},'measured_on':'2026-10-25','raw_sha256':sha(raw)}
r={'entry_path':str(ep),'entry_sha256':sha(ep),'registry_sha256':sha(I/'field-r14a/REGISTRY.json'),'raw_sha256':sha(raw),'raw_verified_in_place':True,'scored_source_note':'Field scores retained exactly; source BUILD-META entry digest predates reviewed prose fixes F1-F6. Source entry verified against the reviewed handoff hash.'}
for mode,(speed,comp) in {'frozen':(90.63,72.27),'v17-off':(90.63,72.27),'v17-share':(90.31,72.21)}.items():
 p=I/f'field-r14a/out-{mode}/jevbench-v1.6.0-results.json';s=copy.deepcopy(next(s for s in L(p)['systems'] if s['key']==K));en=L(J/'inputs/ENTRY-DECISIO.json')[K]['entry'];s.update({f:en[f] for f in ['display','author','licence','disclosure','code_revision','endpoint_condition'] if f in s});s['cost']['basis']=en['cost_basis'];d[mode]=s;r[mode]={'path':str(p),'sha256':sha(p)}
 assert [round(s['capability'],2),round(s['axes']['intelligence'],2),round(s['axes']['calibration'],2),round(s['axes']['cost'],2),round(s['axes']['speed'],2),round(s['scores']['A'],2)]==[75.70,62.78,88.61,58.46,speed,comp],'STOP: scored numbers differ'
 assert round(s['cost']['usd_per_1000'],5)==0.02424 and s['cost']['kind']=='estimate'
 assert s['status']['answered_ok']==1485 and s['status']['rows']==1500
for f in ['axes','scores','views','jevbench_score','capability','composite_ci95','intelligence','calibration','validity','cost','status','support']:assert d['frozen'][f]==d['v17-off'][f],f
assert d['v17-share']['v16']['ci95']['B']==1000 and d['v17-share']['v16']['ci95']['seed']==28
put(J/'src/inputs.json',{K:d});put(J/'receipts/INPUTS.json',{K:r})
print('PASS source entry/raw SHA; required numeric values; 1485 answers plus 15 misses; frozen/off equality; editable public prose retained')
