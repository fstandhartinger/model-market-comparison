"""PASS simulation: the new unranked row is visible on the merged board and in the /api/jevbench/latest feed with the d1027 note and
holds no rank anywhere; the draw's six carried rows stay unranked and change only their note; no row of any draw vanishes or changes
rank/listing versus the v1.7.14 board (v1.7.15 PENDING); order lists identical. The real worktree (v1.7.15 PENDING) shows the v1.7.14 board."""
import json,pathlib,subprocess,collections
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
res=json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-results.json').read_text());by={s['key']:s for s in res['systems']}
NEW='microsoft-decision-1-r2';DK=res['addendum']['text_fixed_keys'];KEYS=sorted(DK+[NEW])
run=lambda root:json.loads(subprocess.run(['node',str(J/'visibility_v1715.mjs'),str(root)],check=True,capture_output=True,text=True).stdout)
subprocess.run(['python3','-B',str(J/'make_passtree_v1715.py'),'--v1715','pending','--out',str(J/'.pass/.alt-pending')],check=True,capture_output=True)
subprocess.run(['python3','-B',str(J/'make_passtree_v1715.py')],check=True,capture_output=True)
real=run(W);b=run(J/'.pass/.alt-pending');a=run(J/'.pass')
assert NEW not in real['board'] and NEW not in real['feed'] and real['restated_by']=='v1.7.14','PENDING leak in the real tree'
assert all(real['board'][k]['not_ranked_because']!=by[k]['not_ranked_because'] for k in DK),'real tree still shows the v1.7.14 notes'
assert b['restated_by']=='v1.7.14' and b['latest_release']=='v1.7.14' and a['restated_by']=='v1.7.15' and a['latest_release']=='v1.7.15',(b['restated_by'],b['latest_release'],a['restated_by'],a['latest_release'])
assert set(a['board'])==set(b['board'])|{NEW} and NEW not in b['board'],'board roster: exactly one addition'
assert set(a['feed'])==set(b['feed'])|{NEW} and NEW not in b['feed'],'feed roster: exactly one addition'
for k in b['board']:
 x,y=dict(a['board'][k]),dict(b['board'][k])
 if k in DK:assert x['not_ranked_because']==by[k]['not_ranked_because']!=y['not_ranked_because'],k;x.pop('not_ranked_because');y.pop('not_ranked_because')
 assert x==y,('board row changed',k)
for k in b['feed']:
 x,y=dict(a['feed'][k]),dict(b['feed'][k])
 if k in DK:assert x['not_ranked_because']==by[k]['not_ranked_because'],k;x.pop('not_ranked_because');y.pop('not_ranked_because')
 assert x==y,('feed row changed',k)
assert a['orders']==b['orders'] and not any(k in o for o in a['orders'].values() for k in KEYS),'order lists'
rows={}
for K in KEYS:
 r=a['board'][K];f=a['feed'][K]
 assert r['ranked'] is False and r['listing']=='unranked' and r['rank'] is None and r['ranks']=={'A':None,'B':None,'C':None,'capability':None} and r['draw']=='v1.6-regular-20261027' and r['not_ranked_because']==by[K]['not_ranked_because'],K
 assert f['ranked'] is False and f['listing']=='unranked' and all(f[x] is None for x in ['rank','open_board_rank','api_board_rank','capability_rank','open_capability_rank']) and f['not_ranked_because']==r['not_ranked_because'] and f['composite_score'] is not None,K
 rows[K]={'board':r,'feed':f}
twin='microsoft-decision-1'   # same scope membership as the live round-1 row
assert all((NEW in a['scopes'][sc])==(twin in a['scopes'][sc]) for sc in ['open','api']) and NEW in a['scopes']['api'],'scope of the hosted row'
draws=lambda t:collections.Counter(x['draw'] for x in t['board'].values());db,da=draws(b),draws(a)
for d,n in db.items():assert da[d]==n+(1 if d=='v1.6-regular-20261027' else 0),('rows of draw vanished or changed',d,n,da[d])
out={'status':'PASS','real_tree_restated_by':real['restated_by'],'real_tree_latest':real['latest_release'],'baseline_restated_by':b['restated_by'],'pass_tree_restated_by':a['restated_by'],'feed_latest_release':a['latest_release'],'board_rows_real':len(real['board']),'board_rows_before':len(b['board']),'board_rows_after':len(a['board']),'feed_rows_before':len(b['feed']),'feed_rows_after':len(a['feed']),
 'rows_per_draw_before':dict(sorted((str(k),v) for k,v in db.items())),'rows_per_draw_after':dict(sorted((str(k),v) for k,v in da.items())),'other_rows_identical':True,'draw_rows_differ_only_in_note':DK,'order_lists_identical':True,'draw_rows':rows,'new_row_in_api_scope':True,'pending_hidden_in_real_tree':True}
(J/'receipts/VISIBILITY-POSTFLIP.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n')
print('PASS new row visible unranked on merged board + feed (api scope, like the round-1 row); the 6 carried draw rows unranked with the new note only;',len(b['board']),'->',len(a['board']),'board rows; no row of any draw vanished or changed; orders identical; real PENDING tree shows the v1.7.14 board (',len(real['board']),'rows,',real['restated_by'],')')
