"""Public-text gate: every string that v1.8.10 adds or changes in the public artifacts, the release page and the history line is free of internal,
private or withheld wording; the Karpo restricted-scope tests pass."""
import pathlib,subprocess,json,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.8';L=lambda p:json.loads(p.read_text())
BAD=re.compile(r'/home/|workers/|#\d{4,}|\bPREREG\b|Florian|release.owner|\b(?:the|our|release) lead\b|\blead (?:agent|job|owner)\b|custod|deputy|\bboard #|auto-intake|\bwithheld\b|\bprivate\b|fast.?lane|priority|\bCoS\b|\{[A-Za-z_][A-Za-z0-9_]*\}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b',re.I)
def strs(v,out):
 if isinstance(v,str):out.append(v)
 elif isinstance(v,list):[strs(x,out) for x in v]
 elif isinstance(v,dict):[strs(x,out) for x in v.values()]
 return out
changed=[];n=0
old=L(V/'jevbench-v1.8.9-results.json');new=L(V/'jevbench-v1.8.10-results.json');ob={s['key']:s for s in old['systems']}
for s in new['systems']:
 before={x for t in strs(ob.get(s['key'],{}),[]) for x in re.split(r'(?<=[.;])\s+',t)}   # the added row: every string is new
 for t in strs(s,[]):
  for x in re.split(r'(?<=[.;])\s+',t):
   if x not in before:changed.append(x);n+=1
for t in new['measurement_notes'][len(old['measurement_notes']):]+[new['label'],new['source_note']]:changed.append(t)
page=(W/'app/jev-models/v1.8.10/page.tsx').read_text()
for m in re.finditer(r'>([^<>]*)<',page):changed.append(re.sub(r'\{[^}]*\}','',m.group(1)))
for m in re.finditer(r"(?:title|description):'([^']*)'",page):changed.append(m.group(1))
rel=[l for l in (W/'lib/jevbench-releases.mjs').read_text().splitlines() if "version: 'v1.8.10'" in l];assert len(rel)==1;changed.append(rel[0])
d=next(x for x in json.loads((W/'data/jevbench-draw-equating.json').read_text())['draws'] if x['draw']=='v1.6-regular-20261027');changed+=[d['anchor_evidence']]
bad=[(t[:120],BAD.search(t).group()) for t in changed if BAD.search(t)];assert not bad,bad
r=subprocess.run(['node','--test','test/jevbench-v1810-public-scope.test.mjs','test/jevbench-v1810-release.test.mjs'],cwd=W,capture_output=True,text=True);assert r.returncode==0,r.stdout[-2000:]
(J/'receipts/PUBLIC-TEXT.json').write_text(json.dumps({'status':'PASS','changed_strings_scanned':len(changed),'internal_private_withheld_wording_found':0,'restricted_scope_tests':'pass'},indent=1)+'\n');print('PASS public text:',len(changed),'added/changed strings scanned; 0 internal or withheld wording; restricted-scope tests pass')
