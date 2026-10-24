"""Compare current top-five effects against the approved historical preview, aggregate only."""
import json,pathlib,hashlib
J=pathlib.Path(__file__).resolve().parent
source=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r168/v1641/topfive-diff-v1641.json')
old=json.loads(source.read_text());fresh=json.loads((J/'receipts/topfive-diff.json').read_text())
a={(r['view'],r['list']):r for r in old['rows'] if r['changed']}
b={(r['view'],r['metric']):r for r in fresh['rows'] if r['changed']}
changes=[]
for label in sorted(set(a)|set(b)):
 x=a.get(label);y=b.get(label)
 if x is None or y is None:changes.append(dict(list='/'.join(label),reason='changed-list membership differs'));continue
 pos=y['positions']['subq-snap-1.1']
 # Compare actual impact, not unrelated pre-existing Torchcast rank changes.
 if x['pos']!=pos or x['dropped']!=y['dropped'] or x['entrants']!=y['entrants']:
  changes.append(dict(list='/'.join(label),old_position=x['pos'],fresh_position=pos,old_dropped=x['dropped'],fresh_dropped=y['dropped'],old_entrants=x['entrants'],fresh_entrants=y['entrants']))
d=dict(historical_card='18406',historical_baseline='v1.6.40',fresh_baseline='v1.6.42',historical_preview_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),historical_changed_lists=old['changed_lists'],fresh_changed_lists=fresh['changed_lists'],changed_list_membership_matches=set(a)==set(b),subq_effect_matches=not changes,material_differences=changes,publication_authority='PENDING',refreshed_GO_required=bool(changes))
(J/'receipts/APPROVAL-COMPARISON.json').write_text(json.dumps(d,indent=2)+'\n')
lines=['# Current top-five impact versus the approved preview','',f"Old: {old['changed_lists']}/40 lists, SubQ at #4. Current: {fresh['changed_lists']}/40 lists.",'', 'Publication authority remains PENDING. '+('A refreshed GO is required: SubQ placement or displaced rows changed.' if changes else 'The lead must verify the match before granting publication authority.'),'', '|List|Old SubQ rank|Fresh rank|Old drop|Fresh drop|','|---|---|---|---|---|']
for r in changes: lines.append('|'+ '|'.join([r['list'],str(r.get('old_position')),str(r.get('fresh_position')),', '.join(r.get('old_dropped',[])),', '.join(r.get('fresh_dropped',[]))])+'|')
(J/'preview/APPROVAL-COMPARISON.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(d,indent=2))
