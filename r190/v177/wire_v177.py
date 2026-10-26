"""Idempotent v1.7.7 integration; predecessor chain remains unchanged."""
import json,os,pathlib
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])))
def edit(name,old,new):
 p=W/name;s=p.read_text()
 if new in s:return
 assert old in s,(name,old)
 p.write_text(s.replace(old,new))
p=W/'app/api/jevbench/v1.7.7/route.ts';p.parent.mkdir(parents=True,exist_ok=True);p.write_text((W/'app/api/jevbench/v1.7.6/route.ts').read_text().replace('V176','V177').replace('v176','v177'))
p=W/'app/jev-models/v1.7.7/page.tsx';p.parent.mkdir(parents=True,exist_ok=True)
s=(W/'app/jev-models/v1.7.6/page.tsx').read_text().replace('v1.7.6','__NEW__').replace('v1.7.5','v1.7.6').replace('__NEW__','v1.7.7').replace('V176','V177').replace('v176','v177').replace('jev176','jev177')
s=s.replace('Decisio 12B tuned commit (variant of the Decisio family)', 'D1A Gemma 4 E4B and D1A Gemma 4 E2B').replace('Decisio 12B tuned commit', 'D1A Gemma 4 E4B and D1A Gemma 4 E2B').replace('joins as a self-hosted row','join as self-hosted rows').replace('292 carried','293 carried').replace('One same-draw self-hosted addition','Two same-draw self-hosted additions').replace('One new self-hosted row','Two new self-hosted rows')
p.write_text(s)
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV176ForBoard, withV176Addendum }", "import { readJevbenchV177ForBoard, withV177Addendum } from './jevbench-v177-release.mjs';\nimport { readJevbenchV176ForBoard, withV176Addendum }")
edit('lib/jevbench-live-board.mjs','return v176 ? withV176Addendum(throughV175, v176) : throughV175;', 'const throughV176 = v176 ? withV176Addendum(throughV175, v176) : throughV175;\n  const v177 = await readJevbenchV177ForBoard(root);\n  return v177 ? withV177Addendum(throughV176, v177) : throughV176;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV176ForBoard(root)) ? 'v1.7.6'", "return (await readJevbenchV177ForBoard(root)) ? 'v1.7.7' : (await readJevbenchV176ForBoard(root)) ? 'v1.7.6'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.7.6'", "type JevRelease = 'v1.7.7' | 'v1.7.6'")
edit('lib/jevbench-categories.mjs',"'v1.7.1', 'v1.7.2', 'v1.7.3', 'v1.7.4', 'v1.7.5', 'v1.7.6'];", "'v1.7.1', 'v1.7.2', 'v1.7.3', 'v1.7.4', 'v1.7.5', 'v1.7.6', 'v1.7.7'];")
edit('lib/jevbench-releases.mjs',"  { version: 'v1.7.6'", "  { version: 'v1.7.7', date: '2026-10-26', href: '/jev-models/v1.7.7', text: 'Two new self-hosted rows D1A on Gemma 4 E4B (JohnP1 d1a-e4b) and D1A on Gemma 4 E2B (JohnP1 d1a-e2b); no method change.' },\n  { version: 'v1.7.6'")
edit('components/JevReleaseHistory.tsx',"import { hasPublishedJevbenchV176Release }", "import { hasPublishedJevbenchV177Release } from '../lib/jevbench-v177-release.mjs';\nimport { hasPublishedJevbenchV176Release }")
edit('components/JevReleaseHistory.tsx','v171, v172, v173, v174, v175, v176] =','v171, v172, v173, v174, v175, v176, v177] =')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV176Release()]);','hasPublishedJevbenchV176Release(), hasPublishedJevbenchV177Release()]);')
edit('components/JevReleaseHistory.tsx',"!v176 && 'v1.7.6'].filter", "!v176 && 'v1.7.6', !v177 && 'v1.7.7'].filter")
print('wired v1.7.7; predecessor chain retained')
