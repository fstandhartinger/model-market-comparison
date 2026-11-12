"""Visibility gate: the real (PENDING) tree shows exactly the v1.8.9 board; the synthetic PASS tree ranks exactly the priced rows of the draw; no private
fast-lane row appears or leaks (a private order's model name must not gain a single mention in the v1.8.10 public files)."""
import pathlib,json,glob,re,hashlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.8';L=lambda p:json.loads(pathlib.Path(p).read_text())
b=L(J/'receipts/topfive-before.json');a=L(J/'receipts/topfive-after.json');res=L(V/'jevbench-v1.8.10-results.json');old=L(V/'jevbench-v1.8.9-results.json')
RK=set(L(J/'src/ranked-keys.json'));UN=set(L(J/'src/unranked-keys.json'))
assert b['restated_by']=='v1.8.9' and a['restated_by']=='v1.8.10' and b['merged_rows']==a['merged_rows']==340
assert L(V/'jevbench-v1.8.10-publication.json')['review']['verdict']=='PENDING' and L(V/'jevbench-v1.8.9-publication.json')['review']['verdict']=='PASS'
exp={'all':(283,283+35),'open':(235,235+30),'api':(48,48+5)}
for v,(x,y) in exp.items():assert b['views'][v]['ranked']==x and a['views'][v]['ranked']==y,(v,b['views'][v]['ranked'],a['views'][v]['ranked'])
# the PENDING tree's lists are exactly the v1.8.9 lists; the PASS tree's lists minus the newly ranked rows equal them
for m in ['A','B','C','capability']:
 assert b['release_lists'][m]==old['board'][m]['order'],('PENDING tree must show the v1.8.9 board',m)
 assert [k for k in a['release_lists'][m] if k not in RK]==b['release_lists'][m],m
 assert not UN&set(a['release_lists'][m]),'unranked rows must not be listed'
assert not any(k in set(old['board']['A']['order']) for k in RK)
rows={s['key']:s for s in res['systems']}
assert all(not rows[k]['ranked'] and rows[k]['rank'] is None for k in UN) and all(rows[k]['ranked'] for k in RK)
# private fast-lane orders
norm=lambda s:re.sub(r'[^a-z0-9]','',s.lower())
priv={};pub=set()
for p in glob.glob('/home/flori/jobs/fastlane-evaluations/*/request.json'):
 try:d=json.load(open(p))
 except Exception:continue
 n=norm(d.get('model_name') or '')
 if not n:continue
 if d.get('visibility')!='public':priv.setdefault(n,d['model_name'])
 else:pub.add(n)
draw=[rows[k] for k in sorted(RK|UN)];matches=[]
for s in draw:
 for n,name in priv.items():
  if len(n)>=6 and (n in norm(s['display']) or n in norm(s['key'])):matches.append({'key':s['key'],'private_order_name':name,'also_public_order':n in pub})
# the only private-visibility order that is a row of this draw is Karpo-Decision-31B, published with the customer's written consent in v1.8.9 (standard axes only)
assert [m['key'] for m in matches]==['karpo_decision_31b'],matches
assert [e for e in L(W/'data/jevbench-breakdown-exceptions.json')['entries'] if e['key']=='karpo_decision_31b'][0]['decision'].startswith('DECISIONS 2026-11-11 09:12 UTC v189-karpo-public-scope')
karpo=rows['karpo_decision_31b'];assert karpo['publication_scope']=='standard-axes-only' and 'noul_decisive' not in karpo
# no private name gains a mention in any v1.8.10 public file
files=[V/f'jevbench-v1.8.10-{n}.json' for n in ['results','categories','proof','publication','carry','history','history-carry']]+[W/'app/jev-models/v1.8.10/page.tsx',W/'data/jevbench-draw-equating.json']
base={f:(V/f.name.replace('1.8.10','1.8.9')).read_text() if (V/f.name.replace('1.8.10','1.8.9')).exists() else '' for f in files}
leaks=[]
for n,name in priv.items():
 if len(n)<6 or n=='karpodecision31b':continue
 for f in files:
  now=norm(f.read_text()).count(n);was=norm(base[f]).count(n) if f.suffix=='.json' and 'draw-equating' not in f.name else 0
  if now>was:leaks.append((name,f.name,now,was))
assert not leaks,leaks
json_ok={'status':'PASS','pending_tree_equals_v189_board':True,'synthetic_pass_tree_ranked':{v:a['views'][v]['ranked'] for v in exp},'pending_tree_ranked':{v:b['views'][v]['ranked'] for v in exp},
 'newly_ranked_rows':len(RK),'unranked_rows':sorted(UN),'unranked_rows_not_in_any_list':True,'private_orders_checked':len(priv),'private_order_rows_in_draw':matches,'karpo_note':'published with the customer\'s written consent (v1.8.9, standard axes only); unchanged scope','new_private_name_mentions':0}
(J/'receipts/VISIBILITY.json').write_text(json.dumps(json_ok,indent=1,sort_keys=True)+'\n');print('PASS visibility:',json_ok['pending_tree_ranked'],'->',json_ok['synthetic_pass_tree_ranked'],'; private orders checked',len(priv),'; only the consented Karpo row matches; 0 new private-name mentions')
