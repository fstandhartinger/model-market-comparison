import pathlib,json,hashlib
J=pathlib.Path(__file__).resolve().parent
L=lambda p:json.loads(p.read_text())
b=L(J/'receipts/topfive-before.json');a=L(J/'receipts/topfive-after.json')
assert b['restated_by']=='v1.7.12' and a['restated_by']=='v1.7.13'
assert (J/'receipts/topfive-before.json').read_bytes()==(J/'receipts/topfive-before-pristine.json').read_bytes(),'wired PENDING tree must equal the pristine v1.7.12 board'
assert b['merged_rows']==300 and a['merged_rows']==301
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
d={'base':'v1.7.12','candidate':'v1.7.13','variant':'10-second share','lists':40,'changed':bool(changed),'changed_lists':len(changed),'changed_labels':[r['view']+'/'+r['metric'] for r in changed],'rows':rows}
extended=L(J/'receipts/topfive-extended.json');sliders=L(J/'receipts/topfive-sliders.json')
d.update(primary_lists=40,primary_changed_lists=len(changed),extended_lists=extended['lists'],extended_changed_lists=extended['changed_lists'],extended_changed_labels=extended['changed_labels'],slider_changed_states=sliders['changed_states'],changed=bool(changed or extended['changed_lists'] or sliders['changed_states']))
d.update(primary_changed_labels=[r['view']+'/'+r['metric'] for r in changed],lists=40+extended['lists'],changed_lists=len(changed)+extended['changed_lists'],changed_labels=[r['view']+'/'+r['metric'] for r in changed]+extended['changed_labels'])
d.update(comparison_scope='40 primary site assembly lists plus supplementary frozen/off/share axis/weight/cap lists, slider boundaries, four custom weightings and a 368-state slider grid; real manifest PENDING; before-tree equals the pristine v1.7.12 commit', snapshots_sha256={n:hashlib.sha256((J/'receipts'/n).read_bytes()).hexdigest() for n in ['topfive-before.json','topfive-after.json','topfive-extended.json','topfive-sliders.json']})
custom=L(J/'receipts/topfive-custom.json');d.update(custom_changed_labels=[r['metric'] for r in custom['rows'] if r['changed']],custom_weight_example=custom['weights'],explicit_slider_grid_states=custom['slider_grid_states'],explicit_slider_grid_changed=custom['slider_grid_changed'],custom_receipt_sha256=hashlib.sha256((J/'receipts/topfive-custom.json').read_bytes()).hexdigest())
(J/'receipts/topfive-diff.json').write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
print('Compared',d['lists'],'primary plus supplementary lists;',d['changed_lists'],'changed;',d['slider_changed_states'],'slider states changed')
