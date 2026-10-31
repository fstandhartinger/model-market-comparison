import pathlib,json,re,hashlib
from public_text_exception import check
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text())
a=L(W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.4-results.json');rows={s['key']:s for s in a['systems'] if s.get('new_in')=='v1.8.4'};assert set(rows)=={'granite-switch-4.1-8b'}
forbidden=re.compile(r'worker|lead|custody|custodian|release.owner|measurement review|deputy|board|#\d+|Florian|\bCoS\b|order.id|jevbench-add-requests|fastlane-native|r208-v184|Disposition is for|code_revision|smoke-stop|0\.0645|x cap|cost cap USD|0\.15 s|\bPREREG\b|\{',re.I)
def walk(v):
 if isinstance(v,str):assert not forbidden.search(v),forbidden.search(v)[0] if forbidden.search(v) else ''
 elif isinstance(v,list):
  for x in v:walk(x)
 elif isinstance(v,dict):
  for x in v.values():walk(x)
for s in rows.values():
 walk(s);text=json.dumps(s)
 for term in ['818,484','1,500','7 of 50','0.0312263773757529','TRITON_ATTN','FlashInfer','5e-2','no system prompt','sibling','granite-4.1-8b','granite-4.2-8b','outside the six','wrong answers']:
  assert term in text,term
 assert not re.search(r'/home/|workers/|Sandy|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b',text,re.I)
 assert 'PENDING' not in s['cost']['basis']
# F1: exact sentence prefix + exact authorised word span in carried allec disclosure.
allec=next(s for s in a['systems'] if s['key']=='allec-oavg');exception=check({'allec-oavg':allec},forbidden)
receipt={'status':'PASS','rows':sorted(rows),'all_new_row_strings_checked':True,'forbidden_hits':0,'carried_allec_exact_span':exception}
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps(receipt,indent=1,sort_keys=True)+'\n');print('PASS one new row public prose, replay/recipe/sibling/fallback disclosures; carried allec exact sentence/span')
