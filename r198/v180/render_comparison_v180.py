"""Render all saved ranking comparisons; never recomputes scores or modifies receipts."""
import html,json,pathlib
J=pathlib.Path(__file__).resolve().parent
load=lambda n:json.loads((J/'receipts'/n).read_text())
d=load('topfive-diff.json');s=load('topfive-sliders.json');c=load('topfive-custom.json')
groups=[('580 primary and supplementary lists',d['rows']),('Custom weights',d['custom'])]
groups.append(('Slider transition states',[{'label':f"{r['scope']}/{r['slider']}/from={r['from']}/other_cap={r['other_cap']}",'before':r['before_top10'],'after':r['after_top10']} for r in s['states']]))
groups.append(('Open-board cost/latency grid',[{'label':f"open/cost={r['cost']}/latency={r['latency']}",'before':r['before_top10'],'after':r['after_top10']} for r in c['slider_grid']]))
parts=[];counts={}
for name,rows in groups:
 changed=[r for r in rows if r['before']!=r['after']];counts[name]={'states':len(rows),'changed_top10':len(changed),'changed_top5':sum(r['before'][:5]!=r['after'][:5] for r in rows)}
 parts.append('<section><h2>'+html.escape(name)+'</h2><p>'+html.escape(str(counts[name]))+'</p>')
 for r in changed:
  before=r['before'];after=r['after']
  parts.append('<h3>'+html.escape(r['label'])+'</h3><table><tr><th>Rank</th><th>v1.7.22</th><th>v1.8.0 candidate</th></tr>')
  for i in range(max(len(before),len(after))):parts.append('<tr><td>'+str(i+1)+'</td><td>'+html.escape(before[i] if i<len(before) else '—')+'</td><td>'+html.escape(after[i] if i<len(after) else '—')+'</td></tr>')
  parts.append('</table>')
 parts.append('</section>')
assert counts['580 primary and supplementary lists']['states']==580
assert counts['580 primary and supplementary lists']['changed_top5']==d['changed_lists']
assert counts['580 primary and supplementary lists']['changed_top10']==d['changed_top10_count']
assert counts['Slider transition states']['states']==d['slider_states']
assert counts['Open-board cost/latency grid']['states']==368
out=J/'preview/changed-lists.html'
out.write_text('<!doctype html><meta charset="utf-8"><title>JevBench cost preview</title><style>body{font-family:system-ui;margin:32px;background:#10141d;color:#eee}table{border-collapse:collapse}td,th{padding:5px 18px;border:1px solid #456}h2{margin-top:40px}h3{margin-top:24px}</style><h1>JevBench v1.8.0: candidate only — approval PENDING</h1><p>Every changed top-ten list is shown, including changes below fifth place. The underlying receipts retain unchanged states too.</p>'+''.join(parts))
print(json.dumps({'status':'PASS','path':str(out.relative_to(J.parents[1])),'groups':counts},indent=1))
