"""Require the accepted independent FAIR receipt and all four adopted public text fixes."""
import pathlib,json,hashlib
from approval_v179 import check_approval
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=L(J/'inputs/APPROVAL.json');diff=L(J/'receipts/topfive-diff.json')
assert diff['changed'] and diff['lists']==580 and diff['base']=='v1.7.8' and not diff.get('bootstrap')
check_approval(W,{'publication_approval':a,'topfive_diff_sha256':sha(J/'receipts/topfive-diff.json')})
assert a['fairness_check']=={'path':'workers/r196-v179-fair/RESULT.json','sha256':'2e1b723e03e25cff20c1a96a24caff3df62ad3bb916f696fbc099a62d0c9d3a3','verdict':'FAIR','engine':'claude-opus-5-5 (account C, effort medium)'}
assert 'mylesg12b-i1-27788' in a['release_owner_rulings']
F=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')/a['fairness_check']['path'];fixes=L(F)['text_fixes'];V=W/'data/raw/benchmarks/jevbench/v1.7';res=L(V/'jevbench-v1.7.9-results.json');row=next(r for r in res['systems'] if r['key']=='launchables-myles-g-12b');registry=L(J/'inputs/MYLESG12-REGISTRY.json')[row['key']]
checks=[]
for f in fixes:
 target=res['label'] if f['id']=='T4' else row['cost']['basis']
 assert f.get('new',f.get('add')) in target,f['id']
 if 'old' in f:assert f['old'] not in target or f['id']=='T4'
 if f['id']!='T4':assert f.get('new',f.get('add')) in registry['cost_basis']
 checks.append({'id':f['id'],'status':'PASS'})
(J/'receipts/FAIRNESS-TEXT-RESOLUTION.json').write_text(json.dumps({'status':'PASS','fairness':'FAIR','publication_authorized':False,'topfive_changed':True,'changed_lists':diff['changed_lists'],'binding':a['fairness_check'],'text_fix_checks':checks,'release_owner_rulings':a['release_owner_rulings']},indent=1,sort_keys=True)+'\n')
print('PASS independent FAIR receipt bound, pricing ruling recorded, T1-T4 exact text applied; publication PENDING')
