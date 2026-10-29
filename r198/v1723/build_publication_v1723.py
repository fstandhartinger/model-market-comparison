"""Deterministic text-only correction bundle from the sealed v1.7.22 aggregates."""
import copy,hashlib,json,pathlib
from texts_v1723 import HIST,clean,LEAK
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.7';REV='v1.7.23';PREV='v1.7.22'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
hj=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
load=lambda n:json.loads((D/f'jevbench-{PREV}-{n}.json').read_text())
def put(p,d):p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
changes=[];before=[];after=[]
def correct(v,path,owner):
 if isinstance(v,str):
  s=clean(v).replace('chief-of-staff decision of 9 Oct 2026', 'published rule of 9 Oct 2026')
  if LEAK.search(v):before.append({'path':path,'match':LEAK.search(v).group()})
  if LEAK.search(s):after.append({'path':path,'match':LEAK.search(s).group()})
  if s!=v:changes.append({'path':path,'row_or_note':owner,'old':v,'new':s,'before_sha256':hj(v),'after_sha256':hj(s)})
  return s
 if isinstance(v,list):return [correct(x,path+f'[{i}]',x.get('key',owner) if isinstance(x,dict) else path+f'[{i}]') for i,x in enumerate(v)]
 if isinstance(v,dict):return {k:correct(x,path+'.'+k,owner) for k,x in v.items()}
 return v
old=load('results');res=correct(copy.deepcopy(old),'results','release')
for i,r in enumerate(res['systems']):
 if r['key']=='drex-max':
  # The row has no separate disclosure field; its published disclosure text is `underlying`.
  path=f'results.systems[{i}].underlying';prior=[c for c in changes if c['path']==path];changes[:]=[c for c in changes if c['path']!=path]
  oldtext=prior[0]['old'] if prior else r['underlying'];r['underlying']=oldtext.rstrip()+f" The vendor has since updated the model behind this API id; this result is from {r['last_measured_on']}."
  changes.append({'path':f'results.systems[{i}].underlying','row_or_note':r['key'],'old':oldtext,'new':r['underlying'],'before_sha256':hj(oldtext),'after_sha256':hj(r['underlying'])})
keys=sorted({c['row_or_note'] for c in changes if c['path'].startswith('results.systems[')})
res.update(revision=REV,label='JevBench v1.7.23: text-only corrections',source_note=HIST)
res['measurement_notes'].append(HIST)
res['addendum']=copy.deepcopy(old['addendum']);res['addendum'].update(predecessor=PREV,new_keys=[],remeasured_keys=[],repriced_keys=[],link_fixed_keys=[],text_fixed_keys=keys,method_change=False)
res['source_sha256']=hj(changes)
put(D/f'jevbench-{REV}-results.json',res)
for n in ['carry','history','history-carry']:
 corrected=correct(load(n),n,n);put(D/f'jevbench-{REV}-{n}.json',corrected)
siteproof=json.loads((J/'receipts/SITE-TEXT-PROOF.json').read_text())
for c in siteproof['exceptions']:
 changes.append(c)
 if LEAK.search(c['old']):before.append({'path':c['path'],'match':LEAK.search(c['old']).group()})
 if LEAK.search(c['new']):after.append({'path':c['path'],'match':LEAK.search(c['new']).group()})
cat=load('categories');cat.update(revision=REV,results_sha256=sha(D/f'jevbench-{REV}-results.json'),source_results_sha256=res['source_sha256'],results_sha256_note='Bound to v1.7.23 results; every category cell and lane is unchanged. Text-only correction release.')
put(D/f'jevbench-{REV}-categories.json',cat)
pr=load('proof');pr.update(revision=REV,predecessor={'revision':PREV,'publication_sha256':sha(D/f'jevbench-{PREV}-publication.json')},carried_rows=len(res['systems']),new_rows={},remeasured_rows={},repriced_rows={},link_fixed_rows=[],text_fixed_rows=keys,exceptions=changes,carried_rows_equal_except=[c['path'] for c in changes if c['path'].startswith('results.systems[')])
pr['publication_approval']={'status':'GO (standing; no top-five change)','fresh_baseline':PREV,'top_five_effect':'unchanged','basis':'Text-only corrections; no score, cost or rank changed.'}
pr['source_inputs']={'predecessor_results_sha256':sha(D/f'jevbench-{PREV}-results.json'),'correction_script_sha256':sha(J/'texts_v1723.py'),'site_text_proof_sha256':sha(J/'receipts/SITE-TEXT-PROOF.json')}
pr.pop('topfive_diff_sha256',None)
td=J/'receipts/topfive-diff.json'
if td.exists():
 t=json.loads(td.read_text());assert t['lists']==580 and t['changed_lists']==0,'STOP: top-five comparison changed'
 pr['top_five_comparison']={'base':PREV,'lists':t['lists'],'changed_lists':t['changed_lists'],'receipt_sha256':sha(td)}
# The unchanged scorer and common-cost provenance remains bound to the predecessor.
put(D/f'jevbench-{REV}-proof.json',pr)
md=load('publication');md.update(revision=REV,predecessor=pr['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None})
md['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json','sha256':sha(D/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']}
put(D/f'jevbench-{REV}-publication.json',md)
put(J/'receipts/TEXT-CHANGES.json',changes);put(J/'receipts/LEAK-SCAN.json',{'before':before,'after':after})
assert not after,after
print('Built PENDING',REV,'rows',len(res['systems']),'pinned text exceptions',len(changes),'leaks before',len(before),'after',len(after))
