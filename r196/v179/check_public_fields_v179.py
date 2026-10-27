import json,pathlib,re,subprocess,hashlib
j=pathlib.Path(__file__).resolve().parent;w=j.parents[1];row=json.loads((j/'receipts/NEW-ROW-SPEC.json').read_text())['knowledgator_gliclass_v4_9b']
forbidden=re.compile(r'/home/|workers/|\bboard\s*#|\bcustody\b|#\d{4,}|Florian|release.owner|the lead|\bpod\b|\bVM\b|\b(?:item|task)[ _-]?(?:id|position)\s*[:#]',re.I)
def walk(x):
 if isinstance(x,str):assert not forbidden.search(x),'private public text'
 elif isinstance(x,dict):
  for v in x.values():walk(v)
 elif isinstance(x,list):
  for v in x:walk(v)
walk(row)
walk(json.loads((j/'src/inputs.json').read_text()))
walk(json.loads((j/'inputs/ENTRY-GLICLASS9B.json').read_text()))
# Prior architecture entries must remain exact values, with only one addition.
old=json.loads(subprocess.check_output(['git','show','2e303d93:data/jevbench-architecture.json'],cwd=w));new=json.loads((w/'data/jevbench-architecture.json').read_text());del new['benchmarks']['jevbench']['knowledgator_gliclass_v4_9b'];assert new==old
p=j/'receipts/PUBLIC-FIELDS.json';p.write_text(json.dumps({'status':'PASS','all_string_values_scanned':True,'architecture_predecessor_entries_equal':True,'raw_or_sealed_item_content_emitted':False},indent=1)+'\n')
print('PASS all public row string values; exact predecessor architecture metadata')
