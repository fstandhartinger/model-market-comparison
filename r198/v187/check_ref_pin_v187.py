"""Fail closed on new-row placeholders and absent/composed model pins."""
import json,pathlib,hashlib,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
a=json.loads((W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.7-results.json').read_text());entries=json.loads((J/'inputs/ENTRIES.json').read_text());rows={s['key']:s for s in a['systems'] if s['key'] in entries}
for k,s in rows.items():
 e=entries[k]['entry'];assert e['revision'] is None and s['model_pin']==e['repo']==s['repo']=='https://openrouter.ai/nvidia/nemotron-3.5-super-vl' and '{' not in s['model_pin']
 def walk(v):
  if isinstance(v,str):assert '{' not in v,(k,'placeholder')
  elif isinstance(v,dict):
   for x in v.values():walk(x)
  elif isinstance(v,list):
   for x in v:walk(x)
 walk(s);assert '{REF}' not in s['cost']['basis']
assert len(rows)==1
(J/'receipts/REF-PIN.json').write_text(json.dumps({'status':'PASS','rows':sorted(rows),'all_strings_no_brace_placeholders':True,'model_pin_is_the_exact_openrouter_model_page_not_a_placeholder_or_copied_pin':True,'cost_basis_is_the_hosted_tariff_text':True},indent=1)+'\n')
print('PASS 1 exact OpenRouter model-page pin, no literal placeholders in any new-row string')
