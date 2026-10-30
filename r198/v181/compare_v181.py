import pathlib,json,hashlib
J=pathlib.Path(__file__).resolve().parent
L=lambda p:json.loads(p.read_text())
b=L(J/'receipts/topfive-before.json');a=L(J/'receipts/topfive-after.json')
assert b['restated_by']=='v1.8.0' and a['restated_by']=='v1.8.1'
pre=json.loads((J.parents[1]/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.0-results.json').read_text());new=json.loads((J/'src/inputs.json').read_text())
assert b['merged_rows']==len(pre['systems'])==316 and a['merged_rows']==len(pre['systems'])+len(new)
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
d={'base':'v1.8.0','candidate':'v1.8.1','variant':'10-second share','lists':40,'changed':bool(changed),'changed_lists':len(changed),'changed_labels':[r['view']+'/'+r['metric'] for r in changed],'rows':rows}
extended=L(J/'receipts/topfive-extended.json');sliders=L(J/'receipts/topfive-sliders.json')
d.update(primary_lists=40,primary_changed_lists=len(changed),extended_lists=extended['lists'],extended_changed_lists=extended['changed_lists'],extended_changed_labels=extended['changed_labels'],slider_states=len(sliders['states']),slider_changed_states=sliders['changed_states'],changed=bool(changed or extended['changed_lists'] or sliders['changed_states']))
d.update(primary_changed_labels=[r['view']+'/'+r['metric'] for r in changed],lists=40+extended['lists'],changed_lists=len(changed)+extended['changed_lists'],changed_labels=[r['view']+'/'+r['metric'] for r in changed]+extended['changed_labels'])
d.update(comparison_scope='40 primary site assembly lists plus supplementary frozen/off/share axis/weight/cap lists, slider boundaries, four custom weightings and a 368-state slider grid; before = v1.8.0 (PASS) tree with v1.8.1 wired but PENDING (carried rows, cells, costs and order lists equal to the base), after = v1.8.1 synthetic PASS; real manifest PENDING', snapshots_sha256={n:hashlib.sha256((J/'receipts'/n).read_bytes()).hexdigest() for n in ['topfive-before.json','topfive-after.json','topfive-extended.json','topfive-sliders.json']})
custom=L(J/'receipts/topfive-custom.json');d.update(custom_changed_labels=[r['metric'] for r in custom['rows'] if r['changed']],custom_weight_example=custom['weights'],explicit_slider_grid_states=custom['slider_grid_states'],explicit_slider_grid_changed=custom['slider_grid_changed'],custom_receipt_sha256=hashlib.sha256((J/'receipts/topfive-custom.json').read_bytes()).hexdigest())
d['candidate_results_sha256']=hashlib.sha256((J.parents[1]/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.1-results.json').read_bytes()).hexdigest()
(J/'receipts/topfive-diff.json').write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
print('Compared',d['lists'],'primary plus supplementary lists;',d['changed_lists'],'changed;',d['slider_changed_states'],'of',d['slider_states'],'slider states changed;',d['explicit_slider_grid_changed'],'of',d['explicit_slider_grid_states'],'grid states changed; custom changed',d['custom_changed_labels'])
