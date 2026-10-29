import json,pathlib,hashlib
from rows_v1720 import KEYS
def check_approval(W,proof):
 J=W/'r198/v1720';p=J/'receipts/topfive-diff.json';d=json.loads(p.read_text());a=proof['publication_approval']
 assert a['status']=='GO (standing; no top-five change)' and a['fresh_baseline']=='v1.7.19' and a['top_five_effect']=='unchanged'
 assert a==json.loads((J/'inputs/APPROVAL.json').read_text())
 assert proof['topfive_diff_sha256']==a['top_five_preview']['sha256']==hashlib.sha256(p.read_bytes()).hexdigest()
 assert d['lists']==580 and d['changed_lists']==0 and not d['changed'] and d['slider_changed_states']==d['explicit_slider_grid_changed']==0 and not d['custom_changed_labels']
 assert sorted(proof['new_rows'])==KEYS and proof['carried_rows_equal_except']==['rank','ranks']
 assert all(set(fields)<= {'rank','ranks'} for fields in proof['exceptions'].values())
 assert not proof['repriced_rows'] and proof['cost_basis']['n_items']==1485
 return True
