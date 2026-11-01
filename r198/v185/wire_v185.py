"""Idempotent v1.8.5 wiring. Preserves every archived v1.7 page."""
import pathlib,json,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];HIST=json.loads((J/'inputs/history.json').read_text())
def edit(f,a,b):
 p=W/f;s=p.read_text()
 if b in s:return
 assert a in s,(f,a[:100]);p.write_text(s.replace(a,b))
# API and release page, derived from immediate predecessor.
for f in ['app/api/jevbench/v1.8.5/route.ts','app/jev-models/v1.8.5/page.tsx']:
 p=W/f;p.parent.mkdir(parents=True,exist_ok=True);s=(W/f.replace('v1.8.5','v1.8.4')).read_text().replace('V184','V185').replace('v184','v185').replace('v1.8.4','v1.8.5')
 if f.endswith('page.tsx'):
  s=s.replace('four unranked rows','one unranked row').replace('five unranked rows','one unranked row')
  s=re.sub(r"description:'[^']*'","description:'Granite Switch 4.1 30B measured on the 27 Oct draw, shown unranked until equated.'",s)
  s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+HIST.replace("'",'&apos;')+'</p>',s)
  s=s.replace('/jev-models/v1.8.3','/jev-models/v1.8.4').replace('Previous v1.8.3','Previous v1.8.4')
 p.write_text(s)
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV184ForBoard, withV184Addendum } from './jevbench-v184-release.mjs';","import { readJevbenchV185ForBoard, withV185Addendum } from './jevbench-v185-release.mjs';\nimport { readJevbenchV184ForBoard, withV184Addendum } from './jevbench-v184-release.mjs';")
edit('lib/jevbench-live-board.mjs','  return v184 ? withV184Addendum(throughV183, v184) : throughV183;','  const throughV184 = v184 ? withV184Addendum(throughV183, v184) : throughV183;\n  const v185 = await readJevbenchV185ForBoard(root);\n  return v185 ? withV185Addendum(throughV184, v185) : throughV184;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV184ForBoard(root)) ? 'v1.8.4'","return (await readJevbenchV185ForBoard(root)) ? 'v1.8.5' : (await readJevbenchV184ForBoard(root)) ? 'v1.8.4'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.8.4'","type JevRelease = 'v1.8.5' | 'v1.8.4'")
edit('lib/jevbench-categories.mjs',"'v1.8.4'];","'v1.8.4', 'v1.8.5'];")
p=W/'lib/jevbench-releases.mjs';s=''.join(l for l in p.read_text().splitlines(keepends=True) if "{ version: 'v1.8.5'" not in l);p.write_text(s)
edit('lib/jevbench-releases.mjs',"  { version: 'v1.8.4'","  { version: 'v1.8.5', date: '2026-11-01', href: '/jev-models/v1.8.5', text: "+json.dumps(HIST)+" },\n  { version: 'v1.8.4'")
for f in ['components/JevReleaseHistory.tsx','app/sitemap.ts']:
 edit(f,"import { hasPublishedJevbenchV184Release } from '../lib/jevbench-v184-release.mjs';","import { hasPublishedJevbenchV185Release } from '../lib/jevbench-v185-release.mjs';\nimport { hasPublishedJevbenchV184Release } from '../lib/jevbench-v184-release.mjs';")
edit('components/JevReleaseHistory.tsx','v184] = await Promise.all([','v184, v185] = await Promise.all([')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV184Release()]);','hasPublishedJevbenchV184Release(), hasPublishedJevbenchV185Release()]);')
edit('components/JevReleaseHistory.tsx',"!v184 && 'v1.8.4'].filter(Boolean)","!v184 && 'v1.8.4', !v185 && 'v1.8.5'].filter(Boolean)")
edit('app/sitemap.ts','  const v184Visible = await hasPublishedJevbenchV184Release();','  const v184Visible = await hasPublishedJevbenchV184Release();\n  const v185Visible = await hasPublishedJevbenchV185Release();')
edit('app/sitemap.ts',"(r.version !== 'v1.8.4' || v184Visible))","(r.version !== 'v1.8.4' || v184Visible) && (r.version !== 'v1.8.5' || v185Visible))")
edit('lib/jevbench-alldata-input.mjs',"import { readJevbenchV184ForBoard, v184BoardInput } from './jevbench-v184-release.mjs';","import { readJevbenchV185ForBoard, v185BoardInput } from './jevbench-v185-release.mjs';\nimport { readJevbenchV184ForBoard, v184BoardInput } from './jevbench-v184-release.mjs';")
edit('lib/jevbench-alldata-input.mjs',"  'v1.8.4': { read: readJevbenchV184ForBoard, board: v184BoardInput },","  'v1.8.4': { read: readJevbenchV184ForBoard, board: v184BoardInput },\n  'v1.8.5': { read: readJevbenchV185ForBoard, board: v185BoardInput },")
edit('lib/jevbench-alldata-input.mjs',"version === 'v1.8.4')","version.startsWith('v1.8.'))")
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.8.5':")==1
edit('test/cr-205-jev-page-structure.test.mjs',"'v1.8.4'].sort());","'v1.8.4', 'v1.8.5'].sort());")
# Draw's status and offsets remain unchanged; only the release list advances.
p=W/'data/jevbench-draw-equating.json';d=json.loads(p.read_text())
def drawupdate(x):
 if isinstance(x,dict):
  if x.get('id')=='v1.6-regular-20261027' or ('releases'in x and 'v1.7.21'in x['releases']):
   if 'releases'in x and 'v1.8.5'not in x['releases']:x['releases'].append('v1.8.5')
   if 'latest_release'in x:x['latest_release']='v1.8.5'
  for v in x.values():drawupdate(v)
 elif isinstance(x,list):
  for v in x:drawupdate(v)
drawupdate(d);p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
print('Wired v1.8.5; exactly one All-data loader; public visibility review-gated')

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
