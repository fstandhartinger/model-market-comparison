import pathlib,json,hashlib
J=pathlib.Path(__file__).resolve().parent
L=lambda p:json.loads(p.read_text())
b=L(J/'receipts/topfive-before.json');a=L(J/'receipts/topfive-after.json')
assert b['restated_by']=='v1.7.4' and a['restated_by']=='v1.7.5'
assert b['merged_rows']==291 and a['merged_rows']==292
assert not b['cohort_log'] and not a['cohort_log']
rows=[]
for view,groups in a['full_rankings'].items():
 for group,metrics in groups.items():
  for metric,arr in metrics.items():
   before=b['full_rankings'][view][group][metric]
   x=[r['key'] for r in before[:5]];y=[r['key'] for r in arr[:5]]
   rows.append({'view':view,'metric':group+'/'+metric,'before':x,'after':y,'changed':x!=y})
assert len(rows)==36
for m in ['A','B','C','capability']:
 x=b['release_lists'][m][:5];y=a['release_lists'][m][:5]
 rows.append({'view':'release','metric':m,'before':x,'after':y,'changed':x!=y})
changed=[r for r in rows if r['changed']]
d={'base':'v1.7.4','candidate':'v1.7.5','variant':'10-second share','lists':40,'changed':bool(changed),'changed_lists':len(changed),'changed_labels':[r['view']+'/'+r['metric'] for r in changed],'rows':rows}
extended=L(J/'receipts/topfive-extended.json');sliders=L(J/'receipts/topfive-sliders.json')
d.update(primary_lists=40,primary_changed_lists=len(changed),extended_lists=extended['lists'],extended_changed_lists=extended['changed_lists'],extended_changed_labels=extended['changed_labels'],slider_changed_states=sliders['changed_states'],changed=bool(changed or extended['changed_lists'] or sliders['changed_states']))
d.update(primary_changed_labels=[r['view']+'/'+r['metric'] for r in changed],lists=40+extended['lists'],changed_lists=len(changed)+extended['changed_lists'],changed_labels=[r['view']+'/'+r['metric'] for r in changed]+extended['changed_labels'])
d.update(comparison_scope='40 primary site assembly lists plus 540 supplementary axis/weight/cap lists and all recorded slider boundaries; real manifest PENDING', snapshots_sha256={n:hashlib.sha256((J/'receipts'/n).read_bytes()).hexdigest() for n in ['topfive-before.json','topfive-after.json','topfive-extended.json','topfive-sliders.json']})
(J/'receipts/topfive-diff.json').write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
print('Compared',d['lists'],'primary plus supplementary lists;',d['changed_lists'],'changed;',d['slider_changed_states'],'slider states changed')
