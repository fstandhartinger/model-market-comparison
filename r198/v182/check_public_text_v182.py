import pathlib,json,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text());rows={s['key']:s for s in L(W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.2-results.json')['systems'] if s.get('new_in')=='v1.8.2'}
requirements={'oenogarum':['739,884','four reads','Apache-2.0','private new-domain','380','33 byte-identical'],'amber-4b':['826,084','375','CC-BY-NC','smoke-stop.json','34 byte-identical'],'piccolo-4b':['1,080,355','87.01%','read twice','65,535','49 byte-identical'],'piccolo-9b':['1,080,355','89.61%','read twice','65,535','49 byte-identical']}
result={}
forbidden=re.compile(r'worker|\blead\b|custody|custodian|release.owner|measurement review|deputy|\bboard\b|#\d+|Florian|\bCoS\b|order.id|jevbench-add-requests|fastlane-native|r201-v182|Disposition is for|0\.0645|x cap|cost cap USD|0\.15 s',re.I)
grep_hits=[]
def public(v):
 if isinstance(v,dict):
  for k,x in v.items():
   assert not re.fullmatch(r'task_id|opaque_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret',k,re.I), 'private field'
   public(x)
 elif isinstance(v,list):
  for x in v:public(x)
 elif isinstance(v,str):
  assert not forbidden.search(v),forbidden.search(v).group(0) if forbidden.search(v) else v
for k,s in rows.items():
 public(s);text=' '.join(str(s.get(f,'')) for f in ['display','author','licence','disclosure','endpoint_condition','cost'])
 assert not re.search(r'/home/|workers/|#\d{4,}|\bPREREG\b|custody|deputy|Florian|release.owner|\{[A-Z_]+\}',text,re.I),k
 assert not re.search(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b',text,re.I),k
 assert 'Sandy' not in text,k
 assert not re.search(r'changes no top-five list|72\s*%|17-21\s*%|97\s*%|0\.064594|2 times measured p50|2\*p50|2\s*×\s*p50',s['disclosure'],re.I),k
 assert not re.search(r'\bpending\b',s['cost']['basis'],re.I),k
 for term in requirements[k]:assert term.lower() in text.lower(),(k,term)
 assert s['not_ranked_because']=='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.'
 result[k]={'disclosures_ok':True,'required_terms_present':requirements[k],'no_internal_refs':True,'neutral_draw_note':True}
assert len(rows)==4
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps({'status':'PASS','grep_hits':grep_hits,'all_new_row_strings_checked':True,'rows':result,'history_truthfully_says_four':L(J/'inputs/history.json').startswith('Added four rows')},indent=1,sort_keys=True)+'\n')
print('PASS public text, neutral draw note and required disclosures on',len(rows),'rows')
