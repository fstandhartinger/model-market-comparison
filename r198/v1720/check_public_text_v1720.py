import pathlib,json,re
from rows_v1720 import *
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];rows=json.loads((J/'receipts/NEW-ROW-SPEC.json').read_text());n=0
for k,s in rows.items():
 assert s['disclosure']==DISCLOSURE and s['licence']==LICENCE
 for f in ['display','author','disclosure','endpoint_condition','licence']:
  assert not re.search(r'Florian|order\s+[a-f0-9]{8}|/home/|workers/|#\d+|PREREG|custody|deputy|top.?five|top.?5|first place|winner',s[f],re.I),f;n+=1
 assert '1,485' in s['cost']['basis'] and '0.42' in s['cost']['basis'] and '3.00' in s['cost']['basis'] and 'ESTIMATE' in s['cost']['basis']
p=(W/'app/jev-models/v1.7.20/page.tsx').read_text();assert HIST.replace("'",'&apos;') in p and 'Previous v1.7.19' in p;assert not re.search(r'DecisionNode|KnowLine|lost|Florian|order\s+[a-f0-9]{8}',p)
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps({'status':'PASS','row_text_fields':n,'paid_and_consent_disclosure':True,'licence_noncommercial':True,'no_order_id_or_rank_promise':True},indent=1)+'\n');print('PASS paid/consent, licence, estimate, public text and no internal/order/rank promises')
