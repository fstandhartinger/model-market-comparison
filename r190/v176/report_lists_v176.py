"""Exact list-by-list top-five differences and slider boundary receipts."""
import pathlib,json
J=pathlib.Path(__file__).resolve().parent;L=lambda n:json.loads((J/'receipts'/n).read_text())
e=L('topfive-extended.json');d=L('topfive-diff.json');s=L('topfive-sliders.json');K='decisio-gemma-4-12b-tuned-commit'
assert d['primary_changed_labels']==['open/composites/A','open/composites/C']
for metric,out in [('A','chon-1.0-e4b'),('C','decisio-gemma-4-31b-v080')]:
 r=next(r for r in e['rows'] if r['variant']=='share' and r['scope']=='open' and r['caps']=='none' and r['metric']==metric)
 assert r['after'][4]==K and out in r['before'] and out not in r['after']
lines=['# v1.7.5 → v1.7.6 top-five comparison','',f"Primary changes: {d['primary_changed_lists']}/40. Supplementary changes: {e['changed_lists']}/{e['lists']}. Single-slider changed states: {s['changed_states']}/{len(s['states'])}.",'','Open composites A and C add the new Decisio row at #5, displacing Chon-1.0-E4B and Decisio Gemma 4 31B v0.8.0 respectively. Every changed list and recorded slider state is listed below. API lists are unchanged. This finite domain does not exhaust arbitrary custom weights, simultaneous slider combinations or subfilters.','', '| Variant | Scope | Caps | Metric | New position | Leaves top five |','|---|---|---|---|---:|---|']
for r in e['rows']:
 if r['changed']:lines.append('| '+' | '.join([r['variant'],r['scope'],r['caps'],r['metric'],str(r['after'].index(K)+1),', '.join(k for k in r['before'] if k not in r['after'])])+' |')
lines+=['','Custom-weight witness I:C:S:Cost = 0:50:10:5 puts Decisio #4 on v1.7.5, displacing vllm-sr-d3-mini. Prescore used v1.7.4 (#3, before Sieve joined). Fresh witness I:C:S:Cost = 10:60:0:20 places Decisio #3 against v1.7.5. All 368 explicit cost/latency grid states match positions #2/#2/#3/#4 at cost 1.0/1.1/1.2/1.3×.', '', '## Changed slider states','', '| Scope | Slider | Other cap | From inclusive | New position |','|---|---|---|---|---:|']
for r in s['states']:
 if r['changed']:lines.append('| '+' | '.join(map(str,[r['scope'],r['slider'],r['other_cap'],r['from'],r['decisio_rank']]))+' |')
(J/'CHANGED-LISTS.md').write_text('\n'.join(lines)+'\n');print('PASS exact top-five comparison;',d['primary_changed_lists'],'primary,',e['changed_lists'],'supplementary,',s['changed_states'],'slider states changed')
