"""Board/feed visibility: the real tree (v1.7.23 PENDING) equals the v1.7.22 board; the synthetic PASS tree differs only in text."""
import json,pathlib,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
run=lambda root:json.loads(subprocess.run(['node',str(J/'visibility_v1723.mjs'),str(root)],check=True,capture_output=True,text=True).stdout)
subprocess.run(['python3','-B',str(J/'make_passtree_v1723.py'),'--v1723','pending','--out',str(J/'.pass/.alt-pending')],check=True,capture_output=True)
subprocess.run(['python3','-B',str(J/'make_passtree_v1723.py')],check=True,capture_output=True)
real=run(W);b=run(J/'.pass/.alt-pending');a=run(J/'.pass')
for n,d in [('visibility-before.json',b),('visibility-pass.json',a)]:(J/'receipts'/n).write_text(json.dumps(d,indent=1)+'\n')
assert real['restated_by']=='v1.7.22' and b['restated_by']=='v1.7.22' and a['restated_by']==a['latest_release']=='v1.7.23',(real['restated_by'],a['restated_by'])
assert real==b,'PENDING v1.7.23 must be invisible in the real tree'
assert set(a['board'])==set(b['board']) and len(a['board'])==316 and a['orders']==b['orders'] and a['scopes']==b['scopes'] and a['classification']==b['classification']
TEXT={'not_ranked_because'}
changed=0
for name in ['board','feed']:
 for k,v in b[name].items():
  w=a[name][k]
  v={x:y for x,y in v.items() if x not in TEXT};w={x:y for x,y in w.items() if x not in TEXT}
  assert w==v,(name,k)
(J/'receipts/VISIBILITY-POSTFLIP.json').write_text(json.dumps({'status':'PASS','board_rows':316,'orders_equal':True,'ranks_equal':True,'pending_hidden_in_real_tree':True},indent=1)+'\n')
print('PASS 316 board/feed rows; ranks, listings, orders, scopes and classification identical; real tree stays v1.7.22 while v1.7.23 is PENDING')
