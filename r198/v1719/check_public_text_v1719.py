import pathlib,json,re
from rows_v1719 import *
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];rows=json.loads((J/'receipts/NEW-ROW-SPEC.json').read_text());count=0
for k,s in rows.items():
 assert s['not_ranked_because']==NOTE
 assert s['cost']['basis'].startswith('NOT PRICED.') and '471,195 input, 0 output' in s['cost']['basis'] and '1,489-item' in s['cost']['basis'] and 'not used to compute a cost' in s['cost']['basis']
 for part in [DISCLOSURE]+([MAIN_DISCLOSURE] if 'main' in k else []):assert part in s['disclosure']
 for f in ['display','disclosure','endpoint_condition','not_ranked_because']:
  t=s[f];assert not re.search(r'/home/|workers/|#\d{4,}|PREREG|custody|deputy|top.?five|top.?5|\b(?:first place|best|winner)\b',t,re.I),f
  assert not re.search(r'\{[A-Z_]+\}',t);count+=1
p=(W/'app/jev-models/v1.7.19/page.tsx').read_text();assert HIST in p and 'Previous v1.7.18' in p and 'KnowLine' not in p and 'answer file was lost' not in p
assert HIST in (W/'lib/jevbench-releases.mjs').read_text()
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps({'status':'PASS','texts':count,'exact_history':HIST,'provider':'bynn','region':'not stated'},indent=1)+'\n');print('PASS exact history, disclosures and note; no internal or ranking claims')
