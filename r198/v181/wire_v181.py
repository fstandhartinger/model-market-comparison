"""Idempotent v1.8.1 wiring. Preserves every archived v1.7 page."""
import pathlib,json,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];HIST=json.loads((J/'inputs/history.json').read_text())
def edit(f,a,b):
 p=W/f;s=p.read_text()
 if b in s:return
 assert a in s,(f,a[:100]);p.write_text(s.replace(a,b))
# API and release page, derived from immediate predecessor.
for f in ['app/api/jevbench/v1.8.1/route.ts','app/jev-models/v1.8.1/page.tsx']:
 p=W/f;p.parent.mkdir(parents=True,exist_ok=True);s=(W/f.replace('v1.8.1','v1.8.0')).read_text().replace('V180','V181').replace('v180','v181').replace('v1.8.0','v1.8.1')
 if f.endswith('page.tsx'):
  s=s.replace('GPU-time cost basis','nine unranked rows on the 27 Oct draw')
  s=re.sub(r"description:'[^']*'","description:'Nine measured decision models added on the 27 Oct draw, shown unranked until equated.'",s)
  s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+HIST.replace("'",'&apos;')+'</p>',s)
  s=s.replace('/jev-models/v1.7.23','/jev-models/v1.8.0').replace('Previous v1.7.23','Previous v1.8.0')
 p.write_text(s)
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV180ForBoard, withV180Addendum } from './jevbench-v180-release.mjs';","import { readJevbenchV181ForBoard, withV181Addendum } from './jevbench-v181-release.mjs';\nimport { readJevbenchV180ForBoard, withV180Addendum } from './jevbench-v180-release.mjs';")
edit('lib/jevbench-live-board.mjs','  return v180 ? withV180Addendum(throughV1723, v180) : throughV1723;','  const throughV180 = v180 ? withV180Addendum(throughV1723, v180) : throughV1723;\n  const v181 = await readJevbenchV181ForBoard(root);\n  return v181 ? withV181Addendum(throughV180, v181) : throughV180;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV180ForBoard(root)) ? 'v1.8.0'","return (await readJevbenchV181ForBoard(root)) ? 'v1.8.1' : (await readJevbenchV180ForBoard(root)) ? 'v1.8.0'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.8.0'","type JevRelease = 'v1.8.1' | 'v1.8.0'")
edit('lib/jevbench-categories.mjs',"'v1.8.0'];","'v1.8.0', 'v1.8.1'];")
p=W/'lib/jevbench-releases.mjs';s=''.join(l for l in p.read_text().splitlines(keepends=True) if "{ version: 'v1.8.1'" not in l);p.write_text(s)
edit('lib/jevbench-releases.mjs',"  { version: 'v1.8.0'","  { version: 'v1.8.1', date: '2026-10-30', href: '/jev-models/v1.8.1', text: "+json.dumps(HIST)+" },\n  { version: 'v1.8.0'")
for f in ['components/JevReleaseHistory.tsx','app/sitemap.ts']:
 edit(f,"import { hasPublishedJevbenchV180Release } from '../lib/jevbench-v180-release.mjs';","import { hasPublishedJevbenchV181Release } from '../lib/jevbench-v181-release.mjs';\nimport { hasPublishedJevbenchV180Release } from '../lib/jevbench-v180-release.mjs';")
edit('components/JevReleaseHistory.tsx','v180] = await Promise.all([','v180, v181] = await Promise.all([')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV180Release()]);','hasPublishedJevbenchV180Release(), hasPublishedJevbenchV181Release()]);')
edit('components/JevReleaseHistory.tsx',"!v180 && 'v1.8.0'].filter(Boolean)","!v180 && 'v1.8.0', !v181 && 'v1.8.1'].filter(Boolean)")
edit('app/sitemap.ts','  const v180Visible = await hasPublishedJevbenchV180Release();','  const v180Visible = await hasPublishedJevbenchV180Release();\n  const v181Visible = await hasPublishedJevbenchV181Release();')
edit('app/sitemap.ts',"(r.version !== 'v1.8.0' || v180Visible))","(r.version !== 'v1.8.0' || v180Visible) && (r.version !== 'v1.8.1' || v181Visible))")
edit('lib/jevbench-alldata-input.mjs',"import { readJevbenchV180ForBoard, v180BoardInput } from './jevbench-v180-release.mjs';","import { readJevbenchV181ForBoard, v181BoardInput } from './jevbench-v181-release.mjs';\nimport { readJevbenchV180ForBoard, v180BoardInput } from './jevbench-v180-release.mjs';")
edit('lib/jevbench-alldata-input.mjs',"  'v1.8.0': { read: readJevbenchV180ForBoard, board: v180BoardInput },","  'v1.8.0': { read: readJevbenchV180ForBoard, board: v180BoardInput },\n  'v1.8.1': { read: readJevbenchV181ForBoard, board: v181BoardInput },")
edit('lib/jevbench-alldata-input.mjs',"version === 'v1.8.0')","version.startsWith('v1.8.'))")
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.8.1':")==1
for name in ['cr-303-feed-split','jevbench-v1630-release','jevbench-v1630-open-fold','jevbench-v170-release','jevbench-v1637-release','jevbench-feed-live-board']:
 f='test/'+name+'.test.mjs'
 edit(f,"import { hasPublishedJevbenchV180Release } from '../lib/jevbench-v180-release.mjs';","import { hasPublishedJevbenchV181Release } from '../lib/jevbench-v181-release.mjs';\nimport { hasPublishedJevbenchV180Release } from '../lib/jevbench-v180-release.mjs';")
 p=W/f;s=p.read_text()
 for text in ['v1.8.0','v180']:
  a=f"(await hasPublishedJevbenchV180Release()) ? '{text}' :";b=f"(await hasPublishedJevbenchV181Release()) ? '{'v1.8.1' if text=='v1.8.0' else 'v181'}' : "+a
  if b not in s:s=s.replace(a,b)
 p.write_text(s)
edit('test/cr-205-jev-page-structure.test.mjs',"'v1.8.0'].sort());","'v1.8.0', 'v1.8.1'].sort());")
# Draw's status and offsets remain unchanged; only the release list advances.
p=W/'data/jevbench-draw-equating.json';d=json.loads(p.read_text())
def drawupdate(x):
 if isinstance(x,dict):
  if x.get('id')=='v1.6-regular-20261027' or ('releases'in x and 'v1.7.21'in x['releases']):
   if 'releases'in x and 'v1.8.1'not in x['releases']:x['releases'].append('v1.8.1')
   if 'latest_release'in x:x['latest_release']='v1.8.1'
  for v in x.values():drawupdate(v)
 elif isinstance(x,list):
  for v in x:drawupdate(v)
drawupdate(d);p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
print('Wired v1.8.1; exactly one All-data loader; public visibility review-gated')

# Presentation overlay: cite the declared parents of these new rows; never infer an undisclosed API base.
p=W/'data/jevbench-base-models.json';d=json.loads(p.read_text());incoming=json.loads((J/'inputs/BASE-MODELS.json').read_text())
for key,value in incoming.items():
 if key in d['benchmarks']['jevbench']:assert d['benchmarks']['jevbench'][key]==value
 else:d['benchmarks']['jevbench'][key]=value
p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
