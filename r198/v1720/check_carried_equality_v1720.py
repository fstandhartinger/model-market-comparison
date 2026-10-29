"""Independent predecessor-list insertion gate; no rescoring and no use of builder ranks."""
import pathlib,json,copy
J=pathlib.Path(__file__).resolve().parent;V=J.parents[1]/'data/raw/benchmarks/jevbench/v1.7';L=lambda p:json.loads(p.read_text())
b=L(V/'jevbench-v1.7.19-results.json');a=L(V/'jevbench-v1.7.20-results.json');before={s['key']:s for s in b['systems']};after={s['key']:s for s in a['systems']};new=sorted(set(after)-set(before));changes={}
for m in ['A','B','C','capability']:
 val=lambda k:after[k]['capability'] if m=='capability' else after[k]['scores'][m]
 order=b['board'][m]['order'][:]
 for k in sorted(new,key=lambda k:(-val(k),k)):
  pos=next((i for i,p in enumerate(order) if val(p)<val(k)),len(order));order.insert(pos,k)
 assert a['board'][m]['order']==order,(m,'insertion')
 assert [k for k in order if k in before]==b['board'][m]['order']
 for i,k in enumerate(order):
  assert after[k]['ranks'][m]==i+1
  if m=='A':assert after[k]['rank']==i+1
for k,p in before.items():
 s=after[k];x=copy.deepcopy(s);y=copy.deepcopy(p)
 if not p['ranked']:assert s.get('rank')==p.get('rank') and s.get('ranks')==p.get('ranks'),('unranked ranks changed',k)
 for f in ['rank','ranks']:x.pop(f,None);y.pop(f,None)
 assert x==y,('nonrank change',k)
 d={f:{'before':p.get(f),'after':s.get(f)} for f in ['rank','ranks'] if p.get(f)!=s.get(f)}
 if d:changes[k]=d
cb=L(V/'jevbench-v1.7.19-categories.json');ca=L(V/'jevbench-v1.7.20-categories.json')
assert all(ca['systems'][k]==v for k,v in cb['systems'].items());assert all(ca['lanes'][k]==v for k,v in cb['lanes'].items())
p=L(V/'jevbench-v1.7.20-proof.json');assert p['exceptions']==changes
(J/'receipts/CARRIED-EQUALITY.json').write_text(json.dumps({'status':'PASS','carried_rows':len(before),'changed_rank_rows':len(changes),'allowed_fields':['rank','ranks'],'other_changed_fields':[],'relative_orders_unchanged':True,'unranked_ranks_unchanged':True,'cells_and_lanes_equal':True,'independently_recomputed':True,'pinned':True,'exceptions':changes},indent=1,sort_keys=True)+'\n')
print('PASS',len(before),'carried rows/cells/lanes equal except',len(changes),'independently recomputed and pinned rank/ranks; no additional stored rank-derived fields changed')
