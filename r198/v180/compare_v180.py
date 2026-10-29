"""All primary/supplementary top-five AND top-ten lists, with exact row-key lists."""
import html,json,pathlib,hashlib
J=pathlib.Path(__file__).resolve().parent;L=lambda n:json.loads((J/'receipts'/n).read_text());put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
b=L('topfive-before.json');a=L('topfive-after.json');e=L('topfive-extended.json');s=L('topfive-sliders.json');c=L('topfive-custom.json')
rows=[]
for view,groups in a['full_rankings'].items():
 for group,metrics in groups.items():
  for metric,arr in metrics.items():
   before=b['full_rankings'][view][group][metric];rows.append({'label':view+'/'+group+'/'+metric,'view':view,'before':[x['key'] for x in before[:10]],'after':[x['key'] for x in arr[:10]]})
for m in ['A','B','C','capability']:rows.append({'label':'release/'+m,'view':'release','before':b['release_lists'][m][:10],'after':a['release_lists'][m][:10]})
assert len(rows)==40,len(rows)
for r in e['rows']:rows.append({'label':'/'.join([r['variant'],r['scope'],r['caps'],r['metric']]),'view':r['scope'],'before':[x['key'] for x in r['full_before'][:10]],'after':[x['key'] for x in r['full_after'][:10]]})
assert len(rows)==580,len(rows)
for r in rows:r.update(changed_top5=r['before'][:5]!=r['after'][:5],changed_top10=r['before']!=r['after'])
changed=[r for r in rows if r['changed_top5']];changed10=[r for r in rows if r['changed_top10']]
custom=[]
for r in c['rows']:
 x=[v['key'] for v in r['full_before'][:10]];y=[v['key'] for v in r['full_after'][:10]];custom.append({'label':r['scope']+'/'+r['metric'],'before':x,'after':y,'changed_top5':x[:5]!=y[:5],'changed_top10':x!=y})
ref=json.loads((J/'inputs/reference-boards.json').read_text())['c']
main=[x['key'] for x in a['full_rankings']['all']['capability']['official_caps']];op=[x['key'] for x in a['full_rankings']['open']['capability']['official_caps']]
model={'reference_open_count':ref['n_open_ranked'],'actual_open_count':len(op),'main':{'reference_top10':[x[1] for x in ref['main'][:10]],'actual_top10':main[:10]},'open':{'reference_top10':[x[1] for x in ref['open'][:10]],'actual_top10':op[:10]}}
for x in ['main','open']:model[x]['changed_top5']=model[x]['reference_top10'][:5]!=model[x]['actual_top10'][:5];model[x]['changed_top10']=model[x]['reference_top10']!=model[x]['actual_top10']
d={'candidate_results_sha256':hashlib.sha256((J.parents[1]/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.0-results.json').read_bytes()).hexdigest(),'base':'v1.7.22','candidate':'v1.8.0','lists':580,'changed':bool(changed),'changed_lists':len(changed),'changed_top10_count':len(changed10),'changed_labels':[r['label'] for r in changed],'rows':rows,'slider_states':len(s['states']),'slider_changed_states':s['changed_states'],'slider_changed_top10_states':sum(r.get('changed_top10',False) for r in s['states']),'explicit_slider_grid_states':c['slider_grid_states'],'explicit_slider_grid_changed':c['slider_grid_changed'],'explicit_slider_grid_top10_changed':sum(r.get('changed_top10',False) for r in c['slider_grid']),'custom':custom,'custom_changed_labels':[r['label'] for r in custom if r['changed_top5']],'model_comparison':model}
put(J/'receipts/topfive-diff.json',d);put(J/'receipts/model-board-comparison.json',model)
parts=[]
for r in rows+custom:
 if r['before']==r['after']:continue
 parts.append('<h2>'+html.escape(r['label'])+'</h2><table><tr><th>Rank</th><th>v1.7.22</th><th>v1.8.0 candidate</th></tr>'+''.join('<tr><td>'+str(i+1)+'</td><td>'+html.escape(r['before'][i] if i<len(r['before']) else '—')+'</td><td>'+html.escape(r['after'][i] if i<len(r['after']) else '—')+'</td></tr>' for i in range(max(len(r['before']),len(r['after']))))+'</table>')
(J/'preview/changed-lists.html').write_text('<!doctype html><meta charset="utf-8"><title>JevBench cost preview</title><style>body{font-family:system-ui;margin:32px;background:#10141d;color:#eee}table{border-collapse:collapse}td,th{padding:5px 18px;border:1px solid #456}h2{margin-top:32px}</style><h1>JevBench v1.8.0: candidate only — approval PENDING</h1><p>'+str(len(changed))+' of 580 top-five lists and '+str(len(changed10))+' top-ten lists change. Slider, grid and custom states are recorded separately in the comparison receipts.</p>'+''.join(parts))
print('Compared 580 lists:',len(changed),'top-five changes,',len(changed10),'top-ten changes; open count',len(op),'vs reference',ref['n_open_ranked'])

# Expand the review table with every saved slider transition and grid state too.
import subprocess
subprocess.run(["python3","-B",str(J/"render_comparison_v180.py")],check=True)
