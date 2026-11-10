"""Idempotent v1.8.8 wiring. Preserves every archived v1.7 page."""
import pathlib,json,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];HIST=json.loads((J/'inputs/history.json').read_text())
def edit(f,a,b):
 p=W/f;s=p.read_text()
 if b in s:return
 assert a in s,(f,a[:100]);p.write_text(s.replace(a,b))
# API and release page, derived from immediate predecessor.
for f in ['app/api/jevbench/v1.8.8/route.ts','app/jev-models/v1.8.8/page.tsx']:
 p=W/f;p.parent.mkdir(parents=True,exist_ok=True);s=(W/f.replace('v1.8.8','v1.8.7')).read_text().replace('V187','V188').replace('v187','v188').replace('v1.8.7','v1.8.8')
 if f.endswith('page.tsx'):
  s=s.replace('four unranked rows','one unranked row').replace('five unranked rows','one unranked row')
  s=re.sub(r"description:'[^']*'","description:'SD-JEV-4B-v12.1.0 (Kego, author-hosted API) measured through the author-hosted API on the 27 Oct draw, shown unranked until equated.'",s)
  s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+HIST.replace("'",'&apos;')+'</p>',s)
  s=s.replace('/jev-models/v1.8.6','/jev-models/v1.8.7').replace('Previous v1.8.6','Previous v1.8.7')
 if f.endswith('page.tsx'):s=s.replace('</p>', '</p><p>Model key: &quot;sd-jev-4b-v12.1.0-aligned-s42-step0256&quot;</p>',1)
 p.write_text(s)
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV187ForBoard, withV187Addendum } from './jevbench-v187-release.mjs';","import { readJevbenchV188ForBoard, withV188Addendum } from './jevbench-v188-release.mjs';\nimport { readJevbenchV187ForBoard, withV187Addendum } from './jevbench-v187-release.mjs';")
edit('lib/jevbench-live-board.mjs','  return v187 ? withV187Addendum(throughV186, v187) : throughV186;','  const throughV187 = v187 ? withV187Addendum(throughV186, v187) : throughV186;\n  const v188 = await readJevbenchV188ForBoard(root);\n  return v188 ? withV188Addendum(throughV187, v188) : throughV187;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV187ForBoard(root)) ? 'v1.8.7'","return (await readJevbenchV188ForBoard(root)) ? 'v1.8.8' : (await readJevbenchV187ForBoard(root)) ? 'v1.8.7'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.8.7'","type JevRelease = 'v1.8.8' | 'v1.8.7'")
edit('lib/jevbench-categories.mjs',"'v1.8.7'];","'v1.8.7', 'v1.8.8'];")
p=W/'lib/jevbench-releases.mjs';s=''.join(l for l in p.read_text().splitlines(keepends=True) if "{ version: 'v1.8.8'" not in l);p.write_text(s)
edit('lib/jevbench-releases.mjs',"  { version: 'v1.8.7'","  { version: 'v1.8.8', date: '2026-11-10', href: '/jev-models/v1.8.8', text: "+json.dumps(HIST)+" },\n  { version: 'v1.8.7'")
for f in ['components/JevReleaseHistory.tsx','app/sitemap.ts']:
 edit(f,"import { hasPublishedJevbenchV187Release } from '../lib/jevbench-v187-release.mjs';","import { hasPublishedJevbenchV188Release } from '../lib/jevbench-v188-release.mjs';\nimport { hasPublishedJevbenchV187Release } from '../lib/jevbench-v187-release.mjs';")
edit('components/JevReleaseHistory.tsx','v187] = await Promise.all([','v187, v188] = await Promise.all([')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV187Release()]);','hasPublishedJevbenchV187Release(), hasPublishedJevbenchV188Release()]);')
edit('components/JevReleaseHistory.tsx',"!v187 && 'v1.8.7'].filter(Boolean)","!v187 && 'v1.8.7', !v188 && 'v1.8.8'].filter(Boolean)")
edit('app/sitemap.ts','  const v187Visible = await hasPublishedJevbenchV187Release();','  const v187Visible = await hasPublishedJevbenchV187Release();\n  const v188Visible = await hasPublishedJevbenchV188Release();')
edit('app/sitemap.ts',"(r.version !== 'v1.8.7' || v187Visible))","(r.version !== 'v1.8.7' || v187Visible) && (r.version !== 'v1.8.8' || v188Visible))")
edit('lib/jevbench-alldata-input.mjs',"import { readJevbenchV187ForBoard, v187BoardInput } from './jevbench-v187-release.mjs';","import { readJevbenchV188ForBoard, v188BoardInput } from './jevbench-v188-release.mjs';\nimport { readJevbenchV187ForBoard, v187BoardInput } from './jevbench-v187-release.mjs';")
edit('lib/jevbench-alldata-input.mjs',"  'v1.8.7': { read: readJevbenchV187ForBoard, board: v187BoardInput },","  'v1.8.7': { read: readJevbenchV187ForBoard, board: v187BoardInput },\n  'v1.8.8': { read: readJevbenchV188ForBoard, board: v188BoardInput },")
edit('lib/jevbench-alldata-input.mjs',"version === 'v1.8.7')","version.startsWith('v1.8.'))")
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.8.8':")==1
edit('test/cr-205-jev-page-structure.test.mjs',"'v1.8.7'].sort());","'v1.8.7', 'v1.8.8'].sort());")
# Older release tests that pin the newest published release (v1.8.7 lost a gate pass by missing one of these).
for f in ['test/jevbench-feed-live-board.test.mjs','test/jevbench-v170-release.test.mjs','test/jevbench-v1637-release.test.mjs']:
 edit(f,"import { hasPublishedJevbenchV187Release } from '../lib/jevbench-v187-release.mjs';","import { hasPublishedJevbenchV188Release } from '../lib/jevbench-v188-release.mjs';\nimport { hasPublishedJevbenchV187Release } from '../lib/jevbench-v187-release.mjs';")
 edit(f,"(await hasPublishedJevbenchV187Release()) ? 'v1.8.7' :","(await hasPublishedJevbenchV188Release()) ? 'v1.8.8' : (await hasPublishedJevbenchV187Release()) ? 'v1.8.7' :")
# Draw's status and offsets remain unchanged; only the release list advances.
p=W/'data/jevbench-draw-equating.json';d=json.loads(p.read_text())
def drawupdate(x):
 if isinstance(x,dict):
  if x.get('id')=='v1.6-regular-20261027' or ('releases'in x and 'v1.7.21'in x['releases']):
   if 'releases'in x and 'v1.8.8'not in x['releases']:x['releases'].append('v1.8.8')
   if 'latest_release'in x:x['latest_release']='v1.8.8'
  for v in x.values():drawupdate(v)
 elif isinstance(x,list):
  for v in x:drawupdate(v)
drawupdate(d);p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
print('Wired v1.8.8; exactly one All-data loader; public visibility review-gated')

# Presentation overlay: cite the declared parents of these new rows; never infer an undisclosed API base.
p=W/'data/jevbench-base-models.json';d=json.loads(p.read_text());incoming=json.loads((J/'inputs/BASE-MODELS.json').read_text())
for key,value in incoming.items():
 d['benchmarks']['jevbench'][key]=value
p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')

# Required architecture coverage for the new artifact key only.
p=W/'data/jevbench-architecture.json';d=json.loads(p.read_text());incoming=json.loads((J/'inputs/ARCHITECTURE.json').read_text())
for key,value in incoming.items():
 if key in d['benchmarks']['jevbench']:assert d['benchmarks']['jevbench'][key]==value
 else:d['benchmarks']['jevbench'][key]=value
p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
