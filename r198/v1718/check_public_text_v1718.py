import pathlib,json,re,hashlib
from rows_v1718 import KEYS,LOST,NOUL,PARTIAL,HIST
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';rows=json.loads((V/'jevbench-v1.7.18-results.json').read_text())['systems'];by={s['key']:s for s in rows}
for k in KEYS:
 s=by[k];assert LOST in s['disclosure'];assert s['ranked'] and s['endpoint_kind']=='gpu' and s['api_flag'] is False
 t=json.dumps(s)
 assert not re.search(r'/home/|workers/|#\d{4,}|Florian|auto-intake|custody|deputy|jevbench-add-requests|release.owner',t,re.I),k
 assert not re.search(r'\{[A-Za-z_][A-Za-z0-9_]*\}',t)
 if k==KEYS[0]:assert NOUL in s['disclosure'] and PARTIAL in s['disclosure'];assert s['listing']=='ranked_over_cap'
 assert s['cost']['common_basis']['n_items']==1485
 assert s['cost']['kind']=='estimate'
page=(W/'app/jev-models/v1.7.18/page.tsx').read_text();assert LOST in page;assert NOUL in page;assert HIST in page
assert HIST in (W/'lib/jevbench-releases.mjs').read_text()
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps({'status':'PASS','both_loss_disclosures_exact':True,'partial_and_noul_exact':True,'no_internal_text':True,'same_items':1485},indent=1)+'\n')
print('PASS exact disclosures, public text, 1,485 same-items estimate, 26B over-cap treatment')
