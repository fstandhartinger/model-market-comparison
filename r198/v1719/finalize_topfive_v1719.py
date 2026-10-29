import pathlib,json,hashlib
J=pathlib.Path(__file__).resolve().parent
x=json.loads((J/'topfive-comparison.json').read_text())
assert x['lists']==580 and not x['top5_changed'] and not x['changed_lists'] and not x['slider_changed'] and not x['grid_changed'] and not any(r['changed'] for r in x['custom'])
d={'baseline':'v1.7.18','lists':580,'changed':False,'changed_lists':0,'slider_states':x['slider_states'],'slider_changed_states':0,'explicit_slider_grid_states':x['grid_states'],'explicit_slider_grid_changed':0,'custom_changed_labels':[],'comparison_sha256':hashlib.sha256((J/'topfive-comparison.json').read_bytes()).hexdigest()}
p=J/'receipts/topfive-diff.json';p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
p=J/'inputs/APPROVAL.json';a=json.loads(p.read_text());a['top_five_preview']['sha256']=hashlib.sha256((J/'receipts/topfive-diff.json').read_bytes()).hexdigest();p.write_text(json.dumps(a,indent=1,sort_keys=True)+'\n')
print('PASS 0/580 lists, 0/'+str(x['slider_states'])+' sliders, 0/'+str(x['grid_states'])+' grid states; approval bound')
