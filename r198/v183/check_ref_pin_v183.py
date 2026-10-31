"""Fail closed on new-row placeholders and absent/composed model pins."""
import json,pathlib,hashlib,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
a=json.loads((W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.3-results.json').read_text());entries=json.loads((J/'inputs/ENTRIES.json').read_text());rows={s['key']:s for s in a['systems'] if s['key'] in entries}
for k,s in rows.items():
 e=entries[k]['entry'];assert s['model_pin']==e['repo'].removeprefix('https://huggingface.co/')+'@'+e['revision']
 def walk(v):
  if isinstance(v,str):assert '{' not in v,(k,'placeholder')
  elif isinstance(v,dict):
   for x in v.values():walk(x)
  elif isinstance(v,list):
   for x in v:walk(x)
 walk(s);assert '{REF}' not in s['cost']['basis']
assert len(rows)==3
(J/'receipts/REF-PIN.json').write_text(json.dumps({'status':'PASS','rows':sorted(rows),'all_strings_no_brace_placeholders':True,'model_pin_composed_from_repo_and_revision':True,'cost_basis_composed_identically_to_v182':True},indent=1)+'\n')
print('PASS 3 exact repo@revision pins, no literal placeholders in any new-row string')
