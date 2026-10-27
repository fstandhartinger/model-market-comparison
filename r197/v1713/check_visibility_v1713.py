"""PASS simulation: the unranked row is visible on the merged board and in the /api/jevbench/latest feed with its reason, holds no
rank anywhere, and no row of any draw vanishes or changes rank/listing versus the PENDING tree (= the published v1.7.12 board)."""
import json,pathlib,subprocess,collections
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];K='h2o-lightning-4b-v1.4.1'
run=lambda root:json.loads(subprocess.run(['node',str(J/'visibility_v1713.mjs'),str(root)],check=True,capture_output=True,text=True).stdout)
subprocess.run(['python3','-B',str(J/'make_passtree_v1713.py')],check=True,capture_output=True)
b=run(W);a=run(J/'.pass')
assert b['restated_by']=='v1.7.12' and a['restated_by']=='v1.7.13' and a['latest_release']=='v1.7.13',(b['restated_by'],a['restated_by'],a['latest_release'])
assert set(a['board'])==set(b['board'])|{K} and K not in b['board'],'board roster: exactly one addition'
assert set(a['feed'])==set(b['feed'])|{K} and K not in b['feed'],'feed roster: exactly one addition'
for k in b['board']:assert a['board'][k]==b['board'][k],('board row changed',k)
for k in b['feed']:assert a['feed'][k]==b['feed'][k],('feed row changed',k)
assert a['orders']==b['orders'] and not any(K in o for o in a['orders'].values()),'order lists'
r=a['board'][K];f=a['feed'][K]
assert r['ranked'] is False and r['listing']=='unranked' and r['rank'] is None and r['ranks']=={'A':None,'B':None,'C':None,'capability':None} and r['draw']=='v1.6-regular-20261027'
assert f['ranked'] is False and f['listing']=='unranked' and all(f[x] is None for x in ['rank','open_board_rank','api_board_rank','capability_rank','open_capability_rank']) and f['not_ranked_because']==r['not_ranked_because'] and f['composite_score'] is not None
assert K in a['scopes']['open'] and K not in a['scopes']['api']
draws=lambda t:collections.Counter(x['draw'] for x in t['board'].values())
db,da=draws(b),draws(a)
for d,n in db.items():assert da[d]==n,('rows of draw vanished',d,n,da[d])
out={'status':'PASS','pending_tree_restated_by':b['restated_by'],'pass_tree_restated_by':a['restated_by'],'feed_latest_release':a['latest_release'],'board_rows_before':len(b['board']),'board_rows_after':len(a['board']),'feed_rows_before':len(b['feed']),'feed_rows_after':len(a['feed']),
 'rows_per_draw_before':dict(sorted((str(k),v) for k,v in db.items())),'rows_per_draw_after':dict(sorted((str(k),v) for k,v in da.items())),'other_rows_identical':True,'order_lists_identical':True,'new_row_board':r,'new_row_feed':f,'new_row_in_open_scope':True}
(J/'receipts/VISIBILITY-POSTFLIP.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n')
print('PASS visible unranked on merged board + feed (open scope);',len(b['board']),'->',len(a['board']),'board rows; no row of any draw vanished or changed; orders identical')
