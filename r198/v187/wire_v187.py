"""Idempotent v1.8.7 wiring. Preserves every archived v1.7 page."""
import pathlib,json,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];HIST=json.loads((J/'inputs/history.json').read_text())
def edit(f,a,b):
 p=W/f;s=p.read_text()
 if b in s:return
 assert a in s,(f,a[:100]);p.write_text(s.replace(a,b))
# API and release page, derived from immediate predecessor.
for f in ['app/api/jevbench/v1.8.7/route.ts','app/jev-models/v1.8.7/page.tsx']:
 p=W/f;p.parent.mkdir(parents=True,exist_ok=True);s=(W/f.replace('v1.8.7','v1.8.6')).read_text().replace('V186','V187').replace('v186','v187').replace('v1.8.6','v1.8.7')
 if f.endswith('page.tsx'):
  s=s.replace('four unranked rows','one unranked row').replace('five unranked rows','one unranked row')
  s=re.sub(r"description:'[^']*'","description:'NVIDIA Nemotron 3.5 Super VL measured on the 27 Oct draw, shown unranked until equated.'",s)
  s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+HIST.replace("'",'&apos;')+'</p>',s)
  s=s.replace('/jev-models/v1.8.5','/jev-models/v1.8.6').replace('Previous v1.8.5','Previous v1.8.6')
 p.write_text(s)
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV186ForBoard, withV186Addendum } from './jevbench-v186-release.mjs';","import { readJevbenchV187ForBoard, withV187Addendum } from './jevbench-v187-release.mjs';\nimport { readJevbenchV186ForBoard, withV186Addendum } from './jevbench-v186-release.mjs';")
edit('lib/jevbench-live-board.mjs','  return v186 ? withV186Addendum(throughV185, v186) : throughV185;','  const throughV186 = v186 ? withV186Addendum(throughV185, v186) : throughV185;\n  const v187 = await readJevbenchV187ForBoard(root);\n  return v187 ? withV187Addendum(throughV186, v187) : throughV186;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV186ForBoard(root)) ? 'v1.8.6'","return (await readJevbenchV187ForBoard(root)) ? 'v1.8.7' : (await readJevbenchV186ForBoard(root)) ? 'v1.8.6'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.8.6'","type JevRelease = 'v1.8.7' | 'v1.8.6'")
edit('lib/jevbench-categories.mjs',"'v1.8.6'];","'v1.8.6', 'v1.8.7'];")
p=W/'lib/jevbench-releases.mjs';s=''.join(l for l in p.read_text().splitlines(keepends=True) if "{ version: 'v1.8.7'" not in l);p.write_text(s)
edit('lib/jevbench-releases.mjs',"  { version: 'v1.8.6'","  { version: 'v1.8.7', date: '2026-11-03', href: '/jev-models/v1.8.7', text: "+json.dumps(HIST)+" },\n  { version: 'v1.8.6'")
for f in ['components/JevReleaseHistory.tsx','app/sitemap.ts']:
 edit(f,"import { hasPublishedJevbenchV186Release } from '../lib/jevbench-v186-release.mjs';","import { hasPublishedJevbenchV187Release } from '../lib/jevbench-v187-release.mjs';\nimport { hasPublishedJevbenchV186Release } from '../lib/jevbench-v186-release.mjs';")
edit('components/JevReleaseHistory.tsx','v186] = await Promise.all([','v186, v187] = await Promise.all([')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV186Release()]);','hasPublishedJevbenchV186Release(), hasPublishedJevbenchV187Release()]);')
edit('components/JevReleaseHistory.tsx',"!v186 && 'v1.8.6'].filter(Boolean)","!v186 && 'v1.8.6', !v187 && 'v1.8.7'].filter(Boolean)")
edit('app/sitemap.ts','  const v186Visible = await hasPublishedJevbenchV186Release();','  const v186Visible = await hasPublishedJevbenchV186Release();\n  const v187Visible = await hasPublishedJevbenchV187Release();')
edit('app/sitemap.ts',"(r.version !== 'v1.8.6' || v186Visible))","(r.version !== 'v1.8.6' || v186Visible) && (r.version !== 'v1.8.7' || v187Visible))")
edit('lib/jevbench-alldata-input.mjs',"import { readJevbenchV186ForBoard, v186BoardInput } from './jevbench-v186-release.mjs';","import { readJevbenchV187ForBoard, v187BoardInput } from './jevbench-v187-release.mjs';\nimport { readJevbenchV186ForBoard, v186BoardInput } from './jevbench-v186-release.mjs';")
edit('lib/jevbench-alldata-input.mjs',"  'v1.8.6': { read: readJevbenchV186ForBoard, board: v186BoardInput },","  'v1.8.6': { read: readJevbenchV186ForBoard, board: v186BoardInput },\n  'v1.8.7': { read: readJevbenchV187ForBoard, board: v187BoardInput },")
edit('lib/jevbench-alldata-input.mjs',"version === 'v1.8.6')","version.startsWith('v1.8.'))")
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.8.7':")==1
edit('test/cr-205-jev-page-structure.test.mjs',"'v1.8.6'].sort());","'v1.8.6', 'v1.8.7'].sort());")
# The registry key contains a slash; the public page slug drops the vendor segment (key stays frozen, CR-170 alias mechanism).
edit('lib/jev-system-slug.mjs',"  'kushal-gemma4-31b-it-autoloops': 'autoloops-gemma-4-31b-it',\n","  'kushal-gemma4-31b-it-autoloops': 'autoloops-gemma-4-31b-it',\n  'nvidia/nemotron-3.5-super-vl': 'nemotron-3.5-super-vl',\n")
edit('test/jevbench-system-pages.test.mjs',"assert.deepEqual(JEV_SYSTEM_SLUG_REDIRECTS, [{ source: '/jev-models/kushal-gemma4-31b-it-autoloops', destination: '/jev-models/autoloops-gemma-4-31b-it', permanent: true }]);","assert.deepEqual(JEV_SYSTEM_SLUG_REDIRECTS, [{ source: '/jev-models/kushal-gemma4-31b-it-autoloops', destination: '/jev-models/autoloops-gemma-4-31b-it', permanent: true }, { source: '/jev-models/nvidia/nemotron-3.5-super-vl', destination: '/jev-models/nemotron-3.5-super-vl', permanent: true }]);")
# Older release tests that pin the newest published release (v1.8.6 lost a gate pass by missing one of these).
for f in ['test/jevbench-feed-live-board.test.mjs','test/jevbench-v170-release.test.mjs','test/jevbench-v1637-release.test.mjs']:
 edit(f,"import { hasPublishedJevbenchV186Release } from '../lib/jevbench-v186-release.mjs';","import { hasPublishedJevbenchV187Release } from '../lib/jevbench-v187-release.mjs';\nimport { hasPublishedJevbenchV186Release } from '../lib/jevbench-v186-release.mjs';")
 edit(f,"(await hasPublishedJevbenchV186Release()) ? 'v1.8.6' :","(await hasPublishedJevbenchV187Release()) ? 'v1.8.7' : (await hasPublishedJevbenchV186Release()) ? 'v1.8.6' :")
# Draw's status and offsets remain unchanged; only the release list advances.
p=W/'data/jevbench-draw-equating.json';d=json.loads(p.read_text())
def drawupdate(x):
 if isinstance(x,dict):
  if x.get('id')=='v1.6-regular-20261027' or ('releases'in x and 'v1.7.21'in x['releases']):
   if 'releases'in x and 'v1.8.7'not in x['releases']:x['releases'].append('v1.8.7')
   if 'latest_release'in x:x['latest_release']='v1.8.7'
  for v in x.values():drawupdate(v)
 elif isinstance(x,list):
  for v in x:drawupdate(v)
drawupdate(d);p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
print('Wired v1.8.7; exactly one All-data loader; public visibility review-gated')

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
