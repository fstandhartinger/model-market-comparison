"""Idempotent v1.7.10 integration; predecessor chain remains unchanged."""
import json,os,pathlib
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])))
def edit(name,old,new):
 p=W/name;s=p.read_text()
 if new in s:return
 assert old in s,(name,old)
 p.write_text(s.replace(old,new))
p=W/'app/api/jevbench/v1.7.10/route.ts';p.parent.mkdir(parents=True,exist_ok=True);p.write_text((W/'app/api/jevbench/v1.7.9/route.ts').read_text().replace('V179','V1710').replace('v179','v1710'))
p=W/'app/jev-models/v1.7.10/page.tsx';p.parent.mkdir(parents=True,exist_ok=True)
s=(W/'app/jev-models/v1.7.9/page.tsx').read_text().replace('v1.7.9','__NEW__').replace('v1.7.8','v1.7.9').replace('__NEW__','v1.7.10').replace('V179','V1710').replace('v179','v1710').replace('jev179','jev1710')
s=s.replace('GLiClass v4 9B joins as a self-hosted row.','Philly Decider v2, iota-decide-4b-v0.3 and Decisio 0.9.0 join as self-hosted rows.')
a=s.index(' <p className="mt-3 max-w-3xl">');b=s.index('</p>',a)+4
s=s[:a]+' <p className="mt-3 max-w-3xl">Three new self-hosted rows Philly Decider v2, iota-decide-4b-v0.3 and Decisio 0.9.0 (Qwen3.6-35B-A3B); no method change. All 297 carried rows keep their scores and confidence intervals. Super Decider rows now link to the vendor page (completes the v1.7.9 change). Philly and iota v0.3 answered all 1,500 requests with disclosed truncation; Decisio answered 1,485 and its 15 HTTP 500 length refusals count as misses. All three use estimated base-model pricing; Decisio exceeds the official cost cap.</p>'+s[b:]
s=s.replace('JevBench v1.7.10: one same-draw self-hosted addition and one price correction','JevBench v1.7.10: three same-draw self-hosted additions').replace('Same method; one new row, one price correction and vendor link fixes.','Same method; 297 carried rows retain their scores and confidence intervals.')
p.write_text(s)
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV179ForBoard, withV179Addendum }", "import { readJevbenchV1710ForBoard, withV1710Addendum } from './jevbench-v1710-release.mjs';\nimport { readJevbenchV179ForBoard, withV179Addendum }")
edit('lib/jevbench-live-board.mjs','return v179 ? withV179Addendum(throughV178, v179) : throughV178;', 'const throughV179 = v179 ? withV179Addendum(throughV178, v179) : throughV178;\n  const v1710 = await readJevbenchV1710ForBoard(root);\n  return v1710 ? withV1710Addendum(throughV179, v1710) : throughV179;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV179ForBoard(root)) ? 'v1.7.9'", "return (await readJevbenchV1710ForBoard(root)) ? 'v1.7.10' : (await readJevbenchV179ForBoard(root)) ? 'v1.7.9'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.7.9'", "type JevRelease = 'v1.7.10' | 'v1.7.9'")
edit('lib/jevbench-categories.mjs',"'v1.7.1', 'v1.7.2', 'v1.7.3', 'v1.7.4', 'v1.7.5', 'v1.7.6', 'v1.7.7', 'v1.7.8', 'v1.7.9'];", "'v1.7.1', 'v1.7.2', 'v1.7.3', 'v1.7.4', 'v1.7.5', 'v1.7.6', 'v1.7.7', 'v1.7.8', 'v1.7.9', 'v1.7.10'];")
edit('lib/jevbench-releases.mjs',"  { version: 'v1.7.9'", "  { version: 'v1.7.10', date: '2026-10-26', href: '/jev-models/v1.7.10', text: 'Three new self-hosted rows Philly Decider v2, iota-decide-4b-v0.3 and Decisio 0.9.0 (Qwen3.6-35B-A3B); no method change. Super Decider rows now link to the vendor page (completes the v1.7.9 change).' },\n  { version: 'v1.7.9'")
edit('components/JevReleaseHistory.tsx',"import { hasPublishedJevbenchV179Release }", "import { hasPublishedJevbenchV1710Release } from '../lib/jevbench-v1710-release.mjs';\nimport { hasPublishedJevbenchV179Release }")
edit('components/JevReleaseHistory.tsx','v171, v172, v173, v174, v175, v176, v177, v178, v179] =','v171, v172, v173, v174, v175, v176, v177, v178, v179, v1710] =')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV179Release()]);','hasPublishedJevbenchV179Release(), hasPublishedJevbenchV1710Release()]);')
edit('components/JevReleaseHistory.tsx',"!v179 && 'v1.7.9'].filter", "!v179 && 'v1.7.9', !v1710 && 'v1.7.10'].filter")
print('wired v1.7.10; predecessor chain retained')

# Keep live-board tests aware of a future reviewed v1.7.10 without changing older release assertions.
for name in ['jevbench-feed-live-board','jevbench-v170-release','jevbench-v1630-release','jevbench-v1630-open-fold','jevbench-v1637-release','cr-303-feed-split']:
 p=W/f'test/{name}.test.mjs';s=p.read_text()
 if "import { hasPublishedJevbenchV1710Release }" not in s:s="import { hasPublishedJevbenchV1710Release } from '../lib/jevbench-v1710-release.mjs';\n"+s
 for a,b in [("(await hasPublishedJevbenchV179Release()) ? 'v1.7.9'","(await hasPublishedJevbenchV1710Release()) ? 'v1.7.10' : (await hasPublishedJevbenchV179Release()) ? 'v1.7.9'"),("(await hasPublishedJevbenchV179Release()) ? 'v179'","(await hasPublishedJevbenchV1710Release()) ? 'v1710' : (await hasPublishedJevbenchV179Release()) ? 'v179'")]:
  if b not in s:s=s.replace(a,b)
 p.write_text(s)
p=W/'test/cr-205-jev-page-structure.test.mjs';s=p.read_text()
if "'v1.7.9', 'v1.7.10'].sort()" not in s:s=s.replace("'v1.7.9'].sort()","'v1.7.9', 'v1.7.10'].sort()")
p.write_text(s)

p=W/'data/jevbench-architecture.json';text=p.read_text();arch=json.loads((J/'inputs/ARCHITECTURE.json').read_text())
for key,entry in arch.items():
 marker='"'+key+'": ';encoded=json.dumps(entry,indent=2,ensure_ascii=False).replace('\n','\n      ')
 if marker in text:
  start=text.index(marker)+len(marker);_,length=json.JSONDecoder().raw_decode(text[start:]);text=text[:start]+encoded+text[start+length:]
 else:
  boundary='\n    },\n    "imagejevbench":';assert boundary in text;text=text.replace(boundary,',\n      '+marker+encoded+boundary,1)
p.write_text(text)
