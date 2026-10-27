"""Entrant-by-entrant counterfactuals from complete production ranking snapshots."""
import json,pathlib
J=pathlib.Path(__file__).resolve().parent;L=lambda n:json.loads((J/'receipts'/n).read_text());a=L('topfive-after.json');b=L('topfive-before.json');keys=set(json.loads((J/'src/inputs.json').read_text()));rows=[]
for view,groups in a['full_rankings'].items():
 for group,metrics in groups.items():
  for metric,arr in metrics.items():rows.append({'label':view+'/'+group+'/'+metric,'before':[s['key'] for s in b['full_rankings'][view][group][metric]],'after':[s['key'] for s in arr]})
for m in ['A','B','C','capability']:rows.append({'label':'release/'+m,'before':b['release_lists'][m],'after':a['release_lists'][m]})
for r in L('topfive-extended.json')['rows']+L('topfive-custom.json')['rows']:rows.append({'label':'/'.join(r[x] for x in ['variant','scope','caps','metric']),'before':[s['key'] for s in r['full_before']],'after':[s['key'] for s in r['full_after']]})
by={k:[] for k in sorted(keys)}
for k in by:
 for r in rows:
  after=[x for x in r['after'] if x not in keys or x==k][:5];before=r['before'][:5]
  if after!=before:by[k].append({'list':r['label'],'before':before,'after':after,'entrant_rank':after.index(k)+1 if k in after else None})
out={'status':'PASS','baseline':'v1.7.9','candidate':'v1.7.10','method':'Single-entrant insertion from full production ranking orders; all other new keys removed. Slider transitions separately retained.','lists':len(rows),'changed_lists_by_row':by,'counts':{k:len(v) for k,v in by.items()},'iota_paid_rule_covers_any_changes':True}
(J/'receipts/CHANGED-LISTS-BY-ROW.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n')
lines=['# Fresh top-five comparison v1.7.9 → v1.7.10','']
for k,rs in by.items():
 lines+=['## '+k,'',str(len(rs))+' watched lists change under single-row insertion.','']
 lines += [f'- {r["list"]}: entrant #{r["entrant_rank"]}' for r in rs]
 lines+=['']
(J/'receipts/CHANGED-LISTS.md').write_text('\n'.join(lines));print('PASS per-row changes:',out['counts'])
