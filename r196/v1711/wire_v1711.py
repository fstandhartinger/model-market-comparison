"""Idempotent v1.7.11 wiring; publication readers remain gated by independent PASS."""
import os,pathlib
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])))
def edit(n,a,b):
 p=W/n;s=p.read_text()
 if b in s:return
 assert a in s,(n,a);p.write_text(s.replace(a,b))
p=W/'app/api/jevbench/v1.7.11/route.ts';p.parent.mkdir(parents=True,exist_ok=True);p.write_text((W/'app/api/jevbench/v1.7.10/route.ts').read_text().replace('v1710','v1711').replace('V1710','V1711'))
p=W/'app/jev-models/v1.7.11/page.tsx';p.parent.mkdir(parents=True,exist_ok=True)
s=(W/'app/jev-models/v1.7.10/page.tsx').read_text().replace('v1.7.10','v1.7.11').replace('v1710','v1711').replace('V1710','V1711').replace('jev1710','jev1711').replace('2026-10-26','2026-10-27').replace('/jev-models/v1.7.9','/jev-models/v1.7.10').replace('Previous v1.7.9','Previous v1.7.10')
a=s.index(' <p className="mt-3 max-w-3xl">');b=s.index('</p>',a)+4
s=s[:a]+' <p className="mt-3 max-w-3xl">Cost correction for four Decisio Gemma rows (engine-processed input); no new measurement, no method change. Intelligence, Calibration, Speed and Capability retain their published values. Each row keeps its own common item basis. Registration prefill estimates are disclosed separately and are not priced.</p>'+s[b:]
s=s.replace('three same-draw self-hosted additions','Decisio Gemma cost correction').replace('Philly Decider v2, iota-decide-4b-v0.3 and Decisio 0.9.0 join as self-hosted rows.','Four existing Decisio Gemma rows receive corrected engine-input cost.').replace('Same method; 297 carried rows retain their scores and confidence intervals.','Same measurements and method; four costs corrected.')
p.write_text(s)
edit('lib/jevbench-live-board.mjs','import { readJevbenchV1710ForBoard, withV1710Addendum }',"import { readJevbenchV1711ForBoard, withV1711Addendum } from './jevbench-v1711-release.mjs';\nimport { readJevbenchV1710ForBoard, withV1710Addendum }")
edit('lib/jevbench-live-board.mjs','return v1710 ? withV1710Addendum(throughV179, v1710) : throughV179;','const throughV1710 = v1710 ? withV1710Addendum(throughV179, v1710) : throughV179;\n  const v1711 = await readJevbenchV1711ForBoard(root);\n  return v1711 ? withV1711Addendum(throughV1710, v1711) : throughV1710;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV1710ForBoard(root)) ? 'v1.7.10'","return (await readJevbenchV1711ForBoard(root)) ? 'v1.7.11' : (await readJevbenchV1710ForBoard(root)) ? 'v1.7.10'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.7.10'","type JevRelease = 'v1.7.11' | 'v1.7.10'")
edit('lib/jevbench-categories.mjs',"'v1.7.9', 'v1.7.10'];","'v1.7.9', 'v1.7.10', 'v1.7.11'];")
edit('lib/jevbench-releases.mjs',"  { version: 'v1.7.10'","  { version: 'v1.7.11', date: '2026-10-27', href: '/jev-models/v1.7.11', text: 'Cost correction for four Decisio Gemma rows (engine-processed input); no new measurement, no method change.' },\n  { version: 'v1.7.10'")
edit('components/JevReleaseHistory.tsx','import { hasPublishedJevbenchV1710Release }',"import { hasPublishedJevbenchV1711Release } from '../lib/jevbench-v1711-release.mjs';\nimport { hasPublishedJevbenchV1710Release }")
edit('components/JevReleaseHistory.tsx','v179, v1710] =','v179, v1710, v1711] =')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV1710Release()]);','hasPublishedJevbenchV1710Release(), hasPublishedJevbenchV1711Release()]);')
edit('components/JevReleaseHistory.tsx',"!v1710 && 'v1.7.10'].filter","!v1710 && 'v1.7.10', !v1711 && 'v1.7.11'].filter")
for name in ['jevbench-feed-live-board','jevbench-v170-release','jevbench-v1630-release','jevbench-v1630-open-fold','jevbench-v1637-release','cr-303-feed-split']:
 p=W/f'test/{name}.test.mjs';s=p.read_text()
 if 'import { hasPublishedJevbenchV1711Release }' not in s:s="import { hasPublishedJevbenchV1711Release } from '../lib/jevbench-v1711-release.mjs';\n"+s
 for a,b in [("(await hasPublishedJevbenchV1710Release()) ? 'v1.7.10'","(await hasPublishedJevbenchV1711Release()) ? 'v1.7.11' : (await hasPublishedJevbenchV1710Release()) ? 'v1.7.10'"),("(await hasPublishedJevbenchV1710Release()) ? 'v1710'","(await hasPublishedJevbenchV1711Release()) ? 'v1711' : (await hasPublishedJevbenchV1710Release()) ? 'v1710'")]:
  if b not in s:s=s.replace(a,b)
 p.write_text(s)
p=W/'test/cr-205-jev-page-structure.test.mjs';s=p.read_text();s=s.replace("'v1.7.9', 'v1.7.10'].sort()","'v1.7.9', 'v1.7.10', 'v1.7.11'].sort()");p.write_text(s)
print('wired v1.7.11')
