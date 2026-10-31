"""Idempotent v1.8.3 wiring. Preserves every archived v1.7 page."""
import pathlib,json,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];HIST=json.loads((J/'inputs/history.json').read_text())
def edit(f,a,b):
 p=W/f;s=p.read_text()
 if b in s:return
 assert a in s,(f,a[:100]);p.write_text(s.replace(a,b))
# API and release page, derived from immediate predecessor.
for f in ['app/api/jevbench/v1.8.3/route.ts','app/jev-models/v1.8.3/page.tsx']:
 p=W/f;p.parent.mkdir(parents=True,exist_ok=True);s=(W/f.replace('v1.8.3','v1.8.2')).read_text().replace('V182','V183').replace('v182','v183').replace('v1.8.2','v1.8.3')
 if f.endswith('page.tsx'):
  s=s.replace('four unranked rows','three unranked rows')
  s=re.sub(r"description:'[^']*'","description:'Three measured decision models added on the 27 Oct draw, shown unranked until equated.'",s)
  s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+HIST.replace("'",'&apos;')+'</p>',s)
  s=s.replace('/jev-models/v1.8.1','/jev-models/v1.8.2').replace('Previous v1.8.1','Previous v1.8.2')
 p.write_text(s)
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV182ForBoard, withV182Addendum } from './jevbench-v182-release.mjs';","import { readJevbenchV183ForBoard, withV183Addendum } from './jevbench-v183-release.mjs';\nimport { readJevbenchV182ForBoard, withV182Addendum } from './jevbench-v182-release.mjs';")
edit('lib/jevbench-live-board.mjs','  return v182 ? withV182Addendum(throughV181, v182) : throughV181;','  const throughV182 = v182 ? withV182Addendum(throughV181, v182) : throughV181;\n  const v183 = await readJevbenchV183ForBoard(root);\n  return v183 ? withV183Addendum(throughV182, v183) : throughV182;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV182ForBoard(root)) ? 'v1.8.2'","return (await readJevbenchV183ForBoard(root)) ? 'v1.8.3' : (await readJevbenchV182ForBoard(root)) ? 'v1.8.2'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.8.2'","type JevRelease = 'v1.8.3' | 'v1.8.2'")
edit('lib/jevbench-categories.mjs',"'v1.8.2'];","'v1.8.2', 'v1.8.3'];")
p=W/'lib/jevbench-releases.mjs';s=''.join(l for l in p.read_text().splitlines(keepends=True) if "{ version: 'v1.8.3'" not in l);p.write_text(s)
edit('lib/jevbench-releases.mjs',"  { version: 'v1.8.2'","  { version: 'v1.8.3', date: '2026-10-31', href: '/jev-models/v1.8.3', text: "+json.dumps(HIST)+" },\n  { version: 'v1.8.2'")
for f in ['components/JevReleaseHistory.tsx','app/sitemap.ts']:
 edit(f,"import { hasPublishedJevbenchV182Release } from '../lib/jevbench-v182-release.mjs';","import { hasPublishedJevbenchV183Release } from '../lib/jevbench-v183-release.mjs';\nimport { hasPublishedJevbenchV182Release } from '../lib/jevbench-v182-release.mjs';")
edit('components/JevReleaseHistory.tsx','v182] = await Promise.all([','v182, v183] = await Promise.all([')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV182Release()]);','hasPublishedJevbenchV182Release(), hasPublishedJevbenchV183Release()]);')
edit('components/JevReleaseHistory.tsx',"!v182 && 'v1.8.2'].filter(Boolean)","!v182 && 'v1.8.2', !v183 && 'v1.8.3'].filter(Boolean)")
edit('app/sitemap.ts','  const v182Visible = await hasPublishedJevbenchV182Release();','  const v182Visible = await hasPublishedJevbenchV182Release();\n  const v183Visible = await hasPublishedJevbenchV183Release();')
edit('app/sitemap.ts',"(r.version !== 'v1.8.2' || v182Visible))","(r.version !== 'v1.8.2' || v182Visible) && (r.version !== 'v1.8.3' || v183Visible))")
edit('lib/jevbench-alldata-input.mjs',"import { readJevbenchV182ForBoard, v182BoardInput } from './jevbench-v182-release.mjs';","import { readJevbenchV183ForBoard, v183BoardInput } from './jevbench-v183-release.mjs';\nimport { readJevbenchV182ForBoard, v182BoardInput } from './jevbench-v182-release.mjs';")
edit('lib/jevbench-alldata-input.mjs',"  'v1.8.2': { read: readJevbenchV182ForBoard, board: v182BoardInput },","  'v1.8.2': { read: readJevbenchV182ForBoard, board: v182BoardInput },\n  'v1.8.3': { read: readJevbenchV183ForBoard, board: v183BoardInput },")
edit('lib/jevbench-alldata-input.mjs',"version === 'v1.8.2')","version.startsWith('v1.8.'))")
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.8.3':")==1
edit('test/cr-205-jev-page-structure.test.mjs',"'v1.8.2'].sort());","'v1.8.2', 'v1.8.3'].sort());")
# Draw's status and offsets remain unchanged; only the release list advances.
p=W/'data/jevbench-draw-equating.json';d=json.loads(p.read_text())
def drawupdate(x):
 if isinstance(x,dict):
  if x.get('id')=='v1.6-regular-20261027' or ('releases'in x and 'v1.7.21'in x['releases']):
   if 'releases'in x and 'v1.8.3'not in x['releases']:x['releases'].append('v1.8.3')
   if 'latest_release'in x:x['latest_release']='v1.8.3'
  for v in x.values():drawupdate(v)
 elif isinstance(x,list):
  for v in x:drawupdate(v)
drawupdate(d);p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
print('Wired v1.8.3; exactly one All-data loader; public visibility review-gated')

# Presentation overlay: cite the declared parents of these new rows; never infer an undisclosed API base.
p=W/'data/jevbench-base-models.json';d=json.loads(p.read_text());incoming=json.loads((J/'inputs/BASE-MODELS.json').read_text())
for key,value in incoming.items():
 d['benchmarks']['jevbench'][key]=value
p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')

# Required architecture coverage for the three new artifact keys only.
p=W/'data/jevbench-architecture.json';d=json.loads(p.read_text());incoming=json.loads((J/'inputs/ARCHITECTURE.json').read_text())
for key,value in incoming.items():
 if key in d['benchmarks']['jevbench']:assert d['benchmarks']['jevbench'][key]==value
 else:d['benchmarks']['jevbench'][key]=value
p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
