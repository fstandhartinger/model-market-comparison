"""Copy aggregate-only scorer artifacts. No sealed records or item data exported."""
import pathlib,json,hashlib
J=pathlib.Path(__file__).resolve().parent;S=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r208-v184-build/score')
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();put=lambda p,x:p.write_text(json.dumps(x,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
sc=L(J/'src/scored.json');cells=L(J/'src/cells.json');reg=L(S/'REGISTRY.json');usage=L(J/'src/usage.json')
for mode in ['frozen','v17-off','v17-share']:
 p=S/f'out-{mode}/jevbench-v1.6.0-results.json';d=L(p);assert d['G_med']==2.573387642438244 and d['bootstrap']['B']==1000 and d['bootstrap']['bootstrap_seed']==16
 for r in d['systems']:
  k=r['key'];sc.setdefault(k,{'pins':{},'cost_basis_sha256':d['v16']['cost_basis']['file_sha256']});sc[k][mode]=r;sc[k]['pins'][mode]=sha(p)
  assert r['status']['rows']==1500 and r['status']['answered_ok']==usage[k]['expect']['ok'] and r['v16']['n_items']==(1125 if k in ['allec-oavg'] else 1500)
  assert abs(r['cost']['usd_per_1000']-usage[k]['cost_common'])<1e-12
for mode in ['off','share']:
 p=S/f'cells/{mode}/categories.json';c=L(p);dec=L(S/f'cells/{mode}/decisive.json')
 for k in reg:
  v=cells.setdefault(k,{});v['cells_'+mode]=c['systems'][k];v['noul_'+mode]=dec[k];v['pool_'+mode]={dim:{x['key']:x['n'] for x in c[dim]} for dim in ['families','languages','usecases']};assert 'topics' not in c['systems'][k]
put(J/'src/scored.json',sc);put(J/'src/cells.json',cells)
print('PASS aggregate capture:',len(sc),'rows, 3 scored views, cells and decisive counts')
