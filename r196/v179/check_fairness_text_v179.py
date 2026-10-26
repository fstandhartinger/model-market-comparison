"""The top-five change must retain a PENDING fairness binding until the lead supplies its receipt."""
import pathlib,json,hashlib
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(p.read_text());a=L(J/'inputs/APPROVAL.json');diff=L(J/'receipts/topfive-diff.json')
assert diff['changed'] and diff['lists']==580 and diff['base']=='v1.7.8' and not diff.get('bootstrap')
assert a['status']=='GO (fair top-five change, Florian rule 25 Oct 2026)' and a['fresh_baseline']=='v1.7.8'
assert a['fairness_check']['path']=='workers/r196-v179-fair/RESULT.json' and a['fairness_check']['verdict'] in ['PENDING','FAIR']
if a['fairness_check']['verdict']=='FAIR':
 from approval_v179 import check_approval
 check_approval(J.parents[1],{'publication_approval':a,'topfive_diff_sha256':hashlib.sha256((J/'receipts/topfive-diff.json').read_bytes()).hexdigest()})
assert a['top_five_preview']['sha256']==hashlib.sha256((J/'receipts/topfive-diff.json').read_bytes()).hexdigest()
(J/'receipts/FAIRNESS-TEXT-RESOLUTION.json').write_text(json.dumps({'status':'PASS','fairness':a['fairness_check']['verdict'],'publication_authorized':False,'topfive_changed':True,'changed_lists':diff['changed_lists']},indent=1)+'\n')
print('PASS fresh top-five preview bound; fairness '+a['fairness_check']['verdict']+'; independent publication review still required')
