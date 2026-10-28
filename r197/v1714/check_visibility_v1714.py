"""PASS simulation: the five unranked rows are visible on the merged board and in the /api/jevbench/latest feed with their reason,
hold no rank anywhere, and no row of any draw vanishes or changes rank/listing versus the v1.7.13-PASS tree (v1.7.14 still PENDING).
The real worktree (both releases PENDING) must show none of them."""
import json,pathlib,subprocess,collections
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
KEYS=sorted(json.loads((J/'src/inputs.json').read_text()));H2O='h2o-lightning-4b-v1.4.1'
run=lambda root:json.loads(subprocess.run(['node',str(J/'visibility_v1714.mjs'),str(root)],check=True,capture_output=True,text=True).stdout)
subprocess.run(['python3','-B',str(J/'make_passtree_v1714.py'),'--v1714','pending','--out',str(J/'.pass/.alt-pending')],check=True,capture_output=True)
subprocess.run(['python3','-B',str(J/'make_passtree_v1714.py')],check=True,capture_output=True)
real=run(W);b=run(J/'.pass/.alt-pending');a=run(J/'.pass')
assert not any(k in real['board'] or k in real['feed'] for k in KEYS),'PENDING leak in the real tree'
assert b['restated_by']=='v1.7.13' and b['latest_release']=='v1.7.13' and a['restated_by']=='v1.7.14' and a['latest_release']=='v1.7.14',(b['restated_by'],b['latest_release'],a['restated_by'],a['latest_release'])
assert set(a['board'])==set(b['board'])|set(KEYS) and not set(KEYS)&set(b['board']),'board roster: exactly five additions'
assert set(a['feed'])==set(b['feed'])|set(KEYS) and not set(KEYS)&set(b['feed']),'feed roster: exactly five additions'
for k in b['board']:assert a['board'][k]==b['board'][k],('board row changed',k)
for k in b['feed']:assert a['feed'][k]==b['feed'][k],('feed row changed',k)
assert a['orders']==b['orders'] and not any(k in o for o in a['orders'].values() for k in KEYS),'order lists'
rows={}
for K in KEYS:
 r=a['board'][K];f=a['feed'][K]
 assert r['ranked'] is False and r['listing']=='unranked' and r['rank'] is None and r['ranks']=={'A':None,'B':None,'C':None,'capability':None} and r['draw']=='v1.6-regular-20261027',K
 assert f['ranked'] is False and f['listing']=='unranked' and all(f[x] is None for x in ['rank','open_board_rank','api_board_rank','capability_rank','open_capability_rank']) and f['not_ranked_because']==r['not_ranked_because'] and f['composite_score'] is not None,K
 assert K in a['scopes']['open'] and K not in a['scopes']['api'],K
 rows[K]={'board':r,'feed':f}
assert H2O in a['board'] and a['board'][H2O]==b['board'][H2O],'v1.7.13 row unchanged'
draws=lambda t:collections.Counter(x['draw'] for x in t['board'].values())
db,da=draws(b),draws(a)
for d,n in db.items():assert da[d]==n+(len(KEYS) if d=='v1.6-regular-20261027' else 0),('rows of draw vanished or changed',d,n,da[d])
out={'status':'PASS','real_tree_restated_by':real['restated_by'],'real_tree_latest':real['latest_release'],'baseline_restated_by':b['restated_by'],'pass_tree_restated_by':a['restated_by'],'feed_latest_release':a['latest_release'],'board_rows_real':len(real['board']),'board_rows_before':len(b['board']),'board_rows_after':len(a['board']),'feed_rows_before':len(b['feed']),'feed_rows_after':len(a['feed']),
 'rows_per_draw_before':dict(sorted((str(k),v) for k,v in db.items())),'rows_per_draw_after':dict(sorted((str(k),v) for k,v in da.items())),'other_rows_identical':True,'order_lists_identical':True,'new_rows':rows,'new_rows_in_open_scope':True,'pending_hidden_in_real_tree':True}
(J/'receipts/VISIBILITY-POSTFLIP.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n')
print('PASS 5 rows visible unranked on merged board + feed (open scope);',len(b['board']),'->',len(a['board']),'board rows; no row of any draw vanished or changed; orders identical; real PENDING tree shows none (',len(real['board']),'rows,',real['restated_by'],')')
