"""Boundary-place gate: the disclosed boundary sentences (T3) are true of the rebuilt candidate. Karpo-Decision-31B must hold #5 on the all-systems Composite B
list and Arcbright Elf 1 12B (r2) #4 on the open-weights Composite A and C lists (site assembly, receipts/topfive-after.json); nothing else may be disclosed,
and every other place of a ranked row of the draw in a primary top five is listed for the review receipt. Aggregates only."""
import json,pathlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(pathlib.Path(p).read_text())
a=L(J/'receipts/topfive-after.json');res=L(W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.10-results.json');by={s['key']:s for s in res['systems']}
order=lambda v,o:[r['key'] for r in a['full_rankings'][v]['composites'][o]]
assert order('all','B').index('karpo_decision_31b')+1==5,'Karpo must be #5 on all-systems Composite B'
assert order('open','A').index('arcbright-elf-1-12b-r2')+1==4 and order('open','C').index('arcbright-elf-1-12b-r2')+1==4,'Arcbright r2 must be #4 on open Composite A and C'
notes={k:s['listing_note'] for k,s in by.items() if s.get('listing_note') and 'within the uncertainty of the draw shift' in s['listing_note']}
assert sorted(notes)==['arcbright-elf-1-12b-r2','karpo_decision_31b']
assert 'Composite B among all systems' in notes['karpo_decision_31b'] and 'open-weights Composite A and C' in notes['arcbright-elf-1-12b-r2']
RK=set(res['addendum']['ranked_keys']);places={}
for v in ['all','open','api']:
 for o in ['A','B','C']:
  for i,k in enumerate(order(v,o)[:5]):
   if k in RK:places.setdefault(k,[]).append(f'{v}/Composite {o} #{i+1}')
 for g,arr in a['full_rankings'][v]['capability'].items():
  for i,r in enumerate(arr[:5]):
   if r['key'] in RK:places.setdefault(r['key'],[]).append(f'{v}/capability/{g} #{i+1}')
(J/'receipts/BOUNDARY.json').write_text(json.dumps({'status':'PASS','karpo_all_composite_B_place':5,'arcbright_r2_open_composite_A_place':4,'arcbright_r2_open_composite_C_place':4,'disclosed_rows':sorted(notes),'ranked_rows_with_primary_top_five_places':{k:len(v) for k,v in sorted(places.items())}},indent=1,sort_keys=True)+'\n')
print('PASS boundary: Karpo all/B #5, Arcbright r2 open A/C #4; disclosed rows',sorted(notes))
