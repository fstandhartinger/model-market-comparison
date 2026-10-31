"""Final candidate gate. Single exact authorised allec clause; no text rewrites."""
import pathlib,json,re,hashlib
from public_text_exception import check
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
L=lambda p:json.loads(p.read_text())
rows={s['key']:s for s in L(W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.3-results.json')['systems'] if s.get('new_in')=='v1.8.3'}
expected={'piccolo-27b','allec-oavg','cribl-decision-1.0-9b','cribl-decision-1.0-27b','zils-ai-z3-mini-soup-preview'}
assert set(rows)==expected
forbidden=re.compile(r'worker|lead|custody|custodian|release.owner|measurement review|deputy|board|#\d+|Florian|\bCoS\b|order.id|jevbench-add-requests|fastlane-native|r202-v183|Disposition is for|code_revision|smoke-stop|0\.0645|x cap|cost cap USD|0\.15 s|\bPREREG\b|\{',re.I)
exception_receipt=check(rows,forbidden)
requirements={'piccolo-27b':['1,064,693','92.21%','read twice','65,535'],'allec-oavg':['739,884','four reads','380','private new-domain'],'cribl-decision-1.0-9b':['853,860','861,216','0.86 %','56','PEFT','8,192']}
requirements['cribl-decision-1.0-27b']=['853,860','861,216','0.86 %','56','PEFT','8,192','use_cache=False','empty_cache()','16,000','48,186']
requirements['zils-ai-z3-mini-soup-preview']=['964,081','THREE','no tensor-content comparison','model.json','NOTICE-torchcast','8192','16,384','0.801','T=0.9','81,965','80,357','deprecated afterwards']
entry=L(J/'inputs/ENTRIES.json')['zils-ai-z3-mini-soup-preview']['entry']
soup=rows['zils-ai-z3-mini-soup-preview']
config=entry['disclosure'].split('CONFIGURATION DISCLOSURE: ',1)[1].split(' CONTEXT:',1)[0]
assert config in soup['disclosure'],'non-applied configuration disclosure must remain verbatim'
assert "These are the author's provenance claims; no tensor-content comparison was performed." in soup['disclosure']
for pin in ['492bfb19662f3c6e601cc9c4bd2911ac95609ed4','9ff7cf9838e59df461c276b7699d56b244d2af58','df99bf4ca4418bc6908ee68e9b7479af1f3b8800','851bf6e806efd8d0a36b00ddf55e13ccb7b8cd0a']:
 assert pin in soup['disclosure'],pin
note='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.'
def private_fields(v):
 if isinstance(v,dict):
  for k,x in v.items():
   assert not re.fullmatch(r'task_id|opaque_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret',k,re.I),'private field'
   private_fields(x)
 elif isinstance(v,list):
  for x in v:private_fields(x)
for k,s in rows.items():
 private_fields(s)
 assert s.get('model_pin') and '@' in s['model_pin'],k
 text=' '.join(str(s.get(f,'')) for f in ['display','author','licence','disclosure','endpoint_condition','cost'])
 assert not re.search(r'/home/|workers/|Sandy|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b',text,re.I),k
 assert not re.search(r'\bpending\b',s['cost']['basis'],re.I),k
 assert s['not_ranked_because']==note,k
 for term in requirements[k]:assert term.lower() in text.lower(),(k,term)
receipt={'status':'PASS','exception':exception_receipt,'all_new_row_strings_checked':True,'other_forbidden_hits':0,'neutral_draw_note':True,'model_pin_and_no_placeholder_gate':True,'rows':sorted(rows),'gate_source_sha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps(receipt,indent=1,sort_keys=True)+'\n')
print('PASS public text and exact authorised allec clause on 5 rows')
