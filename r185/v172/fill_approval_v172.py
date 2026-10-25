"""Fill only the standing GO supported by the unchanged aggregate top-five comparison."""
import hashlib,json,pathlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
load=lambda p:json.loads(p.read_text())
p=J/'receipts/topfive-diff.json';d=load(p);extended=load(J/'receipts/topfive-extended.json')
assert d['base']=='v1.7.1' and d['candidate']=='v1.7.2' and d['lists']==40 and d['changed'] is False
assert extended['changed_lists']==0 and extended['lists']==156
assert d.get('comparison_scope','').startswith('complete candidate assembly'), 'prospective receipt cannot authorize the complete candidate'
for name in ['topfive-before.json','topfive-after.json','topfive-extended.json']:
 assert d['snapshots_sha256'][name]==hashlib.sha256((J/'receipts'/name).read_bytes()).hexdigest(), name
previous=load(W/'r181/v171/inputs/APPROVAL.json')
a={'go':previous['go'],'button_tap':False,'fresh_baseline':'v1.7.1','top_five_effect':'none','top_five_preview':{'path':'r185/v172/receipts/topfive-diff.json','sha256':hashlib.sha256(p.read_bytes()).hexdigest()},'asks':[{'key':'jeetu-decider-2b','admission':'custody #26049 item 1; device #26264','handoff':'board #26283 (HANDOFF-R11A.md)','relay':'regular queue'}],'status':'GO (standing, no top-five change)'}
(J/'inputs/APPROVAL.json').write_text(json.dumps(a,indent=1,sort_keys=True)+'\n')
print('Standing GO bound to unchanged 40-list preview; this does not supply independent release review or publication authority.')
