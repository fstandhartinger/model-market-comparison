import json,pathlib,subprocess,sys
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];K='umpire-35b-a3b'
run=lambda root:json.loads(subprocess.run(['node',str(J/'visibility_v1722.mjs'),str(root)],check=True,capture_output=True,text=True).stdout)
if '--resume-captures' in sys.argv:
 real=run(W);b=json.loads((J/'receipts/visibility-before.json').read_text());a=json.loads((J/'receipts/visibility-pass.json').read_text())
else:
 subprocess.run(['python3','-B',str(J/'make_passtree_v1722.py'),'--v1722','pending','--out',str(J/'.pass/.alt-pending')],check=True,capture_output=True)
 subprocess.run(['python3','-B',str(J/'make_passtree_v1722.py')],check=True,capture_output=True)
 real=run(W);b=run(J/'.pass/.alt-pending');a=run(J/'.pass')
for n,d in [('visibility-before.json',b),('visibility-pass.json',a)]: (J/'receipts'/n).write_text(json.dumps(d,indent=1)+'\n')
subprocess.run(['node',str(J/'check_classification_v1722.mjs')],check=True)
assert K not in real['board'] and K not in real['feed'] and real['restated_by']=='v1.7.20'
assert b['restated_by']=='v1.7.21' and a['restated_by']==a['latest_release']=='v1.7.22'
for name in ['board','feed']:
 assert set(a[name])==set(b[name])|{K}
 for k,v in b[name].items():assert a[name][k]==v,(name,k)
assert len(b['board'])==315 and len(a['board'])==316 and a['orders']==b['orders']
r=a['board'][K];f=a['feed'][K];assert r['ranked'] is False and r['listing']=='unranked' and r['rank'] is None and r['ranks']=={'A':None,'B':None,'C':None,'capability':None}
assert f['ranked'] is False and all(f[x] is None for x in ['rank','open_board_rank','api_board_rank','capability_rank','open_capability_rank'])
assert K in a['scopes']['open'] and K not in a['scopes']['api']
(J/'receipts/VISIBILITY-POSTFLIP.json').write_text(json.dumps({'status':'PASS','real_tree_restated_by':real['restated_by'],'pending_hidden_in_real_tree':True,'board_rows_before':315,'board_rows_after':316,'all_carried_rows_equal':True,'orders_equal':True,'new_row_open_scope':True,'new_row':{'board':r,'feed':f}},indent=1,sort_keys=True)+'\n')
print('PASS synthetic 315 -> 316 board/feed rows; all carried rows and orders identical; self-hosted new row unranked in open scope; real tree stays v1.7.20 while v1.7.21 and v1.7.22 are PENDING')
