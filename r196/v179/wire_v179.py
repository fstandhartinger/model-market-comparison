"""Idempotent v1.7.9 integration; predecessor chain remains unchanged."""
import json,os,pathlib
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])))
def edit(name,old,new):
 p=W/name;s=p.read_text()
 if new in s:return
 assert old in s,(name,old)
 p.write_text(s.replace(old,new))
p=W/'app/api/jevbench/v1.7.9/route.ts';p.parent.mkdir(parents=True,exist_ok=True);p.write_text((W/'app/api/jevbench/v1.7.8/route.ts').read_text().replace('V178','V179').replace('v178','v179'))
p=W/'app/jev-models/v1.7.9/page.tsx';p.parent.mkdir(parents=True,exist_ok=True)
s=(W/'app/jev-models/v1.7.8/page.tsx').read_text().replace('v1.7.8','__NEW__').replace('v1.7.7','v1.7.8').replace('__NEW__','v1.7.9').replace('V178','V179').replace('v178','v179').replace('jev178','jev179')
s=s.replace('Jeff-1.1-Medium','GLiClass v4 9B').replace('295 carried','296 carried')
s=s.replace('JevBench v1.7.9 · One same-draw self-hosted addition', 'JevBench v1.7.9: one same-draw self-hosted addition and one price correction')
s=s.replace('>One same-draw self-hosted addition</h1>', '>JevBench v1.7.9: one same-draw self-hosted addition and one price correction</h1>')
s=s.replace('Same method; 296 carried rows retain their scores and confidence intervals.','Same method; one new row, one price correction and vendor link fixes.')
a=s.index(' <p className="mt-3 max-w-3xl">');b=s.index('</p>',a)+4
s=s[:a]+' <p className="mt-3 max-w-3xl">One new self-hosted row GLiClass v4 9B; Myles-G 12B now priced at its public list price; Super Decider links point to the vendor page; no method change. GLiClass answered 1,485 of 1,500 requests; 15 HTTP 422 length refusals count as misses. Its cost is an ESTIMATE from Qwen/Qwen3.5-9B with zero generated output. Myles-G 12B uses GBP 0.0015 per million input tokens, output free; prices exclude VAT. Price corrected in v1.7.9; earlier releases showed a same-base ESTIMATE of USD 0.0264 per 1,000. All other scores and confidence intervals are unchanged.</p>'+s[b:]
p.write_text(s)
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV178ForBoard, withV178Addendum }", "import { readJevbenchV179ForBoard, withV179Addendum } from './jevbench-v179-release.mjs';\nimport { readJevbenchV178ForBoard, withV178Addendum }")
edit('lib/jevbench-live-board.mjs','return v178 ? withV178Addendum(throughV177, v178) : throughV177;', 'const throughV178 = v178 ? withV178Addendum(throughV177, v178) : throughV177;\n  const v179 = await readJevbenchV179ForBoard(root);\n  return v179 ? withV179Addendum(throughV178, v179) : throughV178;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV178ForBoard(root)) ? 'v1.7.8'", "return (await readJevbenchV179ForBoard(root)) ? 'v1.7.9' : (await readJevbenchV178ForBoard(root)) ? 'v1.7.8'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.7.8'", "type JevRelease = 'v1.7.9' | 'v1.7.8'")
edit('lib/jevbench-categories.mjs',"'v1.7.1', 'v1.7.2', 'v1.7.3', 'v1.7.4', 'v1.7.5', 'v1.7.6', 'v1.7.7', 'v1.7.8'];", "'v1.7.1', 'v1.7.2', 'v1.7.3', 'v1.7.4', 'v1.7.5', 'v1.7.6', 'v1.7.7', 'v1.7.8', 'v1.7.9'];")
edit('lib/jevbench-releases.mjs',"  { version: 'v1.7.8'", "  { version: 'v1.7.9', date: '2026-10-26', href: '/jev-models/v1.7.9', text: 'One new self-hosted row GLiClass v4 9B; Myles-G 12B now priced at its public list price; Super Decider links point to the vendor page; no method change.' },\n  { version: 'v1.7.8'")
edit('components/JevReleaseHistory.tsx',"import { hasPublishedJevbenchV178Release }", "import { hasPublishedJevbenchV179Release } from '../lib/jevbench-v179-release.mjs';\nimport { hasPublishedJevbenchV178Release }")
edit('components/JevReleaseHistory.tsx','v171, v172, v173, v174, v175, v176, v177, v178] =','v171, v172, v173, v174, v175, v176, v177, v178, v179] =')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV178Release()]);','hasPublishedJevbenchV178Release(), hasPublishedJevbenchV179Release()]);')
edit('components/JevReleaseHistory.tsx',"!v178 && 'v1.7.8'].filter", "!v178 && 'v1.7.8', !v179 && 'v1.7.9'].filter")
print('wired v1.7.9; predecessor chain retained')

p=W/'data/jevbench-architecture.json';text=p.read_text();entry=json.loads((J/'inputs/ARCHITECTURE-GLICLASS9B.json').read_text());key='"knowledgator_gliclass_v4_9b": '
encoded=json.dumps(entry,indent=2,ensure_ascii=False).replace('\n','\n      ')
if key in text:
 start=text.index(key)+len(key);_,length=json.JSONDecoder().raw_decode(text[start:]);text=text[:start]+encoded+text[start+length:]
else:
 marker='\n    },\n    "imagejevbench":';assert marker in text
 text=text.replace(marker,',\n      '+key+encoded+marker,1)
p.write_text(text)
# Keep live-board tests aware of a future reviewed v1.7.9 without changing older release assertions.
for name in ['jevbench-feed-live-board','jevbench-v170-release','jevbench-v1630-release','jevbench-v1630-open-fold','jevbench-v1637-release','cr-303-feed-split']:
 p=W/f'test/{name}.test.mjs';s=p.read_text()
 if "import { hasPublishedJevbenchV179Release }" not in s:s="import { hasPublishedJevbenchV179Release } from '../lib/jevbench-v179-release.mjs';\n"+s
 for a,b in [("(await hasPublishedJevbenchV178Release()) ? 'v1.7.8'","(await hasPublishedJevbenchV179Release()) ? 'v1.7.9' : (await hasPublishedJevbenchV178Release()) ? 'v1.7.8'"),("(await hasPublishedJevbenchV178Release()) ? 'v178'","(await hasPublishedJevbenchV179Release()) ? 'v179' : (await hasPublishedJevbenchV178Release()) ? 'v178'")]:
  if b not in s:s=s.replace(a,b)
 p.write_text(s)
p=W/'test/cr-205-jev-page-structure.test.mjs';s=p.read_text()
if "'v1.7.8', 'v1.7.9'].sort()" not in s:s=s.replace("'v1.7.8'].sort()","'v1.7.8', 'v1.7.9'].sort()")
p.write_text(s)
