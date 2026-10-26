"""Idempotent v1.7.8 integration; predecessor chain remains unchanged."""
import json,os,pathlib
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])))
def edit(name,old,new):
 p=W/name;s=p.read_text()
 if new in s:return
 assert old in s,(name,old)
 p.write_text(s.replace(old,new))
p=W/'app/api/jevbench/v1.7.8/route.ts';p.parent.mkdir(parents=True,exist_ok=True);p.write_text((W/'app/api/jevbench/v1.7.7/route.ts').read_text().replace('V177','V178').replace('v177','v178'))
p=W/'app/jev-models/v1.7.8/page.tsx';p.parent.mkdir(parents=True,exist_ok=True)
s=(W/'app/jev-models/v1.7.7/page.tsx').read_text().replace('v1.7.7','__NEW__').replace('v1.7.6','v1.7.7').replace('__NEW__','v1.7.8').replace('V177','V178').replace('v177','v178').replace('jev177','jev178')
s=s.replace('D1A Gemma 4 E4B and D1A Gemma 4 E2B','Jeff-1.1-Medium').replace('join as self-hosted rows','joins as a self-hosted row').replace('293 carried','295 carried').replace('Two same-draw self-hosted additions','One same-draw self-hosted addition').replace('Two new self-hosted rows','One new self-hosted row')
s=s.replace("On each D1A row, 15 of 1,500 answers were made on a prompt truncated at the author's 65,536-token limit and took over 10 s (up to 20.6 s on E4B and 16.2 s on E2B); the v1.7 share view counts them as wrong.", 'Question-aware retrieval answered 15 long items within 8,192 input tokens; none of the 1,500 answers exceeded 10 s. Cost is an ESTIMATE; an uncounted second-prefill estimate of 427,166 input tokens is not priced. Weights CC BY-NC-4.0 (non-commercial). Pricing the uncounted prefills would lower the Cost axis from 53.79 to 49.49, below the composite gate; this sensitivity is not included in the scores.')
p.write_text(s)
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV177ForBoard, withV177Addendum }", "import { readJevbenchV178ForBoard, withV178Addendum } from './jevbench-v178-release.mjs';\nimport { readJevbenchV177ForBoard, withV177Addendum }")
edit('lib/jevbench-live-board.mjs','return v177 ? withV177Addendum(throughV176, v177) : throughV176;', 'const throughV177 = v177 ? withV177Addendum(throughV176, v177) : throughV176;\n  const v178 = await readJevbenchV178ForBoard(root);\n  return v178 ? withV178Addendum(throughV177, v178) : throughV177;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV177ForBoard(root)) ? 'v1.7.7'", "return (await readJevbenchV178ForBoard(root)) ? 'v1.7.8' : (await readJevbenchV177ForBoard(root)) ? 'v1.7.7'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.7.7'", "type JevRelease = 'v1.7.8' | 'v1.7.7'")
edit('lib/jevbench-categories.mjs',"'v1.7.1', 'v1.7.2', 'v1.7.3', 'v1.7.4', 'v1.7.5', 'v1.7.6', 'v1.7.7'];", "'v1.7.1', 'v1.7.2', 'v1.7.3', 'v1.7.4', 'v1.7.5', 'v1.7.6', 'v1.7.7', 'v1.7.8'];")
edit('lib/jevbench-releases.mjs',"  { version: 'v1.7.7'", "  { version: 'v1.7.8', date: '2026-10-26', href: '/jev-models/v1.7.8', text: 'One new self-hosted row Jeff-1.1-Medium; no method change.' },\n  { version: 'v1.7.7'")
edit('components/JevReleaseHistory.tsx',"import { hasPublishedJevbenchV177Release }", "import { hasPublishedJevbenchV178Release } from '../lib/jevbench-v178-release.mjs';\nimport { hasPublishedJevbenchV177Release }")
edit('components/JevReleaseHistory.tsx','v171, v172, v173, v174, v175, v176, v177] =','v171, v172, v173, v174, v175, v176, v177, v178] =')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV177Release()]);','hasPublishedJevbenchV177Release(), hasPublishedJevbenchV178Release()]);')
edit('components/JevReleaseHistory.tsx',"!v177 && 'v1.7.7'].filter", "!v177 && 'v1.7.7', !v178 && 'v1.7.8'].filter")
print('wired v1.7.8; predecessor chain retained')

p=W/'data/jevbench-architecture.json';text=p.read_text();entry=json.loads((J/'inputs/ARCHITECTURE-JEFF11M.json').read_text());key='"jeff_1_1_medium": '
encoded=json.dumps(entry,indent=2,ensure_ascii=False).replace('\n','\n      ')
if key in text:
 start=text.index(key)+len(key);_,length=json.JSONDecoder().raw_decode(text[start:]);text=text[:start]+encoded+text[start+length:]
else:
 marker='\n    },\n    "imagejevbench":';assert marker in text
 text=text.replace(marker,',\n      '+key+encoded+marker,1)
p.write_text(text)
