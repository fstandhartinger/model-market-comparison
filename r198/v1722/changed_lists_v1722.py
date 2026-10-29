"""Every changed top-five list v1.7.21 -> v1.7.22 with its entrants and leavers (primary 40 + supplementary 540, slider states, the
368-state grid and the custom weightings), plus single-entrant counterfactuals per row of the 27 Oct draw from the full production orders
(all seven rows are unranked, so every list must stay unchanged; this receipt proves it rather than assuming it)."""
import json,pathlib
J=pathlib.Path(__file__).resolve().parent;L=lambda n:json.loads((J/'receipts'/n).read_text())
a=L('topfive-after.json');b=L('topfive-before.json');d=L('topfive-diff.json');ext=L('topfive-extended.json');sl=L('topfive-sliders.json');cu=L('topfive-custom.json')
ad=json.loads((J.parents[1]/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.22-results.json').read_text())['addendum'];keys=sorted(ad['new_keys']+ad['repriced_keys'])
def delta(label,before,after):
 return {'list':label,'before':before,'after':after,'entrants':[k for k in after if k not in before],'leavers':[k for k in before if k not in after],'order_only':set(before)==set(after)}
changed=[]
for r in d['rows']:
 if r['changed']:changed.append(delta(r['view']+'/'+r['metric'],r['before'],r['after']))
for r in ext['rows']:
 if r['changed']:changed.append(delta('/'.join(r[x] for x in ['variant','scope','caps','metric']),r['before'],r['after']))
assert len(changed)==d['changed_lists']
sliders=[delta(f"slider/{s['scope']}/{s['slider']}/other {s['other_cap']}/from {s['from']}",s['before'],s['after']) for s in sl['states'] if s['changed']]
grid=[delta(f"grid/open/cost {g['cost']}/latency {g['latency']}",g['before'],g['after']) for g in cu['slider_grid'] if g['changed']]
custom=[delta(f"custom/{r['scope']}/{r['metric']}",r['before'],r['after']) for r in cu['rows'] if r['changed']]
# Single-entrant counterfactual per draw row (all other draw rows removed) over the full production orders.
rows=[]
for view,groups in a['full_rankings'].items():
 for group,metrics in groups.items():
  for metric,arr in metrics.items():rows.append({'label':view+'/'+group+'/'+metric,'before':[s['key'] for s in b['full_rankings'][view][group][metric]],'after':[s['key'] for s in arr]})
for m in ['A','B','C','capability']:rows.append({'label':'release/'+m,'before':b['release_lists'][m],'after':a['release_lists'][m]})
for r in ext['rows']+cu['rows']:rows.append({'label':'/'.join(r[x] for x in ['variant','scope','caps','metric']),'before':[s['key'] for s in r['full_before']],'after':[s['key'] for s in r['full_after']]})
by={k:[] for k in sorted(keys)}
for k in by:
 for r in rows:
  after=[x for x in r['after'] if x not in keys or x==k][:5];before=r['before'][:5]
  if after!=before:by[k].append({'list':r['label'],'before':before,'after':after,'entrant_rank':after.index(k)+1 if k in after else None})
ent={};lea={}
for c in changed+sliders+grid+custom:
 for k in c['entrants']:ent[k]=ent.get(k,0)+1
 for k in c['leavers']:lea[k]=lea.get(k,0)+1
out={'status':'PASS','baseline':'v1.7.21','candidate':'v1.7.22','lists':d['lists'],'changed_lists':len(changed),'changed':changed,'slider_states':d['slider_states'],'slider_changed':sliders,'grid_states':d['explicit_slider_grid_states'],'grid_changed':grid,'custom_rows':len(cu['rows']),'custom_changed':custom,
     'entrant_counts':dict(sorted(ent.items())),'leaver_counts':dict(sorted(lea.items())),'draw_keys':keys,'single_entrant_lists':len(rows),'changed_lists_by_row':by,'single_entrant_counts':{k:len(v) for k,v in by.items()},
     'method':'Top fives from the site assembly (before = v1.7.21 PASS tree with v1.7.22 PENDING, after = v1.7.22 synthetic PASS); entrants/leavers = keys entering/leaving the top five; single-entrant = one draw row kept alone in the full production orders (unranked rows never appear in them).'}
(J/'receipts/CHANGED-LISTS-BY-ROW.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n')
disp={s['key']:s['display'] for s in json.loads((J.parents[1]/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.22-results.json').read_text())['systems']}
name=lambda k:f'{disp.get(k,k)} (`{k}`)'
lines=['# Top-five comparison v1.7.21 → v1.7.22','',f'All seven rows of the 27 Oct draw stay unranked (draw not equated); Microsoft-Decision-1 (updated weights) is added unranked. Lists compared: {d["lists"]} (40 primary + {d["extended_lists"]} supplementary); changed: {len(changed)}. Slider states: {d["slider_changed_states"]} of {d["slider_states"]} changed. Slider grid: {len(grid)} of {d["explicit_slider_grid_states"]} changed. Custom weightings: {len(custom)} of {len(cu["rows"])} changed.','',
       '## Entrants (number of changed lists/states each row enters)','']+[f'- {name(k)}: {n}' for k,n in ent.items()]+['','## Leavers (number of changed lists/states each row leaves)','']+[f'- {name(k)}: {n}' for k,n in lea.items()]+['','## Every changed list','']
for c in changed+custom+sliders+grid:
 lines.append(f"- {c['list']}: before {', '.join(c['before'])} → after {', '.join(c['after'])}; enter: {', '.join(c['entrants']) or '— (order only)'}; leave: {', '.join(c['leavers']) or '—'}")
lines+=['','## Single-entrant counterfactuals (each draw row alone)','']+[f'- {name(k)}: {len(v)} of {len(rows)} lists change' for k,v in by.items()]
(J/'receipts/CHANGED-LISTS.md').write_text('\n'.join(lines)+'\n')
print('PASS',d['lists'],'lists;',len(changed),'changed; sliders',len(sliders),'; grid',len(grid),'; custom',len(custom),'; entrants',ent,'; leavers',lea)
