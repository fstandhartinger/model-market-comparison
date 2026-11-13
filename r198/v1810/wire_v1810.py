"""Idempotent v1.8.10 wiring (the 27 Oct draw equated with four strong anchors and ranked), stacked on v1.8.9 (PASS). Preserves every archived page.
The draw entry in data/jevbench-draw-equating.json becomes status "equated" with the anchor offset, its 95% interval and the four anchor
keys from the pinned equating receipt; it gains v1.8.10 (releases + latest_release). Other draws are untouched."""
import pathlib,json,re,os
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])));HIST=json.loads((J/'inputs/history.json').read_text())
V=W/'data/raw/benchmarks/jevbench/v1.8';proof=json.loads((V/'jevbench-v1.8.10-proof.json').read_text());EQ=proof['equating']
DATE=os.environ.get('V1810_RELEASE_DATE','2026-11-12')
def edit(f,a,b):
 p=W/f;s=p.read_text()
 if b in s:return
 assert a in s,(f,a[:100]);p.write_text(s.replace(a,b,1))
# API and release page, derived from the immediate predecessor.
for f in ['app/api/jevbench/v1.8.10/route.ts','app/jev-models/v1.8.10/page.tsx']:
 p=W/f;p.parent.mkdir(parents=True,exist_ok=True);s=(W/f.replace('v1.8.10','v1.8.9')).read_text().replace('V189','V1810').replace('v189','v1810').replace('v1.8.9','v1.8.10')
 if f.endswith('page.tsx'):
  s=re.sub(r"title:'[^']*'","title:'JevBench v1.8.10: the 27 Oct draw equated and ranked'",s,count=1)
  s=re.sub(r"description:'[^']*'","description:'The 27 Oct draw is equated with four strong anchor systems and its rows are ranked; Gemini Decision 1 (Google, hosted API) joins on the same draw.'",s,count=1)
  s=s.replace('JevBench v1.8.10: one unranked row on the 27 Oct draw','JevBench v1.8.10: the 27 Oct draw equated with four strong anchors and ranked')
  s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+HIST.replace("'",'&apos;')+'</p>',s,count=1,flags=re.S)
  s=s.replace('<a href="/jev-models/v1.8.8">Previous v1.8.8</a>','<a href="/jev-models/v1.8.9">Previous v1.8.9</a>')
  assert 'Karpo' not in s and 'one unranked row' not in s,'stale predecessor text in the page'
  # r278 pre-flip (critic C2): the release page passes the assembled live chain (same inputs as the live boards, so the build memo is
  # reused) to v1810BoardInput, which bounds the release categories by row pool like withV1810Addendum; the board then takes the artifact path.
  s=s.replace("import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';","import { readJevbenchV157Release, withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';\nimport { readJevbenchV161Release } from '../../../lib/jevbench-v16-release.mjs';\nimport { assembleJevBoard } from '../../../lib/jevbench-live-board.mjs';\nimport apiA4 from '../../../data/jevbench-api-a4-equated.json';",1)
  a_=" const board=v1810BoardInput(release);"
  assert s.count(a_)==1,'release page board input'
  s=s.replace(a_," const [base,previous]=await Promise.all([readJevbenchV161Release(),readJevbenchV157Release()]);\n const chain=await assembleJevBoard({release:{artifact:base.artifact,categories:base.categories,carry:base.carry},previous,live:true,apiA4});\n const board=v1810BoardInput(release,chain);")
  assert 'v1810BoardInput(release,chain)' in s and 'readJevbenchV157Release, withPublicAdapterIds' in s
 p.write_text(s)
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV189ForBoard, withV189Addendum } from './jevbench-v189-release.mjs';","import { readJevbenchV1810ForBoard, withV1810Addendum } from './jevbench-v1810-release.mjs';\nimport { readJevbenchV189ForBoard, withV189Addendum } from './jevbench-v189-release.mjs';")
edit('lib/jevbench-live-board.mjs','  return v189 ? withV189Addendum(throughV188, v189) : throughV188;','  const throughV189 = v189 ? withV189Addendum(throughV188, v189) : throughV188;\n  const v1810 = await readJevbenchV1810ForBoard(root);\n  return v1810 ? withV1810Addendum(throughV189, v1810) : throughV189;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV189ForBoard(root)) ? 'v1.8.9'","return (await readJevbenchV1810ForBoard(root)) ? 'v1.8.10' : (await readJevbenchV189ForBoard(root)) ? 'v1.8.9'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.8.9'","type JevRelease = 'v1.8.10' | 'v1.8.9'")
edit('lib/jevbench-categories.mjs',"'v1.8.8', 'v1.8.9'];","'v1.8.8', 'v1.8.9', 'v1.8.10'];")
p=W/'lib/jevbench-releases.mjs';s=''.join(l for l in p.read_text().splitlines(keepends=True) if "{ version: 'v1.8.10'" not in l);p.write_text(s)
edit('lib/jevbench-releases.mjs',"  { version: 'v1.8.9'","  { version: 'v1.8.10', date: '"+DATE+"', href: '/jev-models/v1.8.10', text: "+json.dumps(HIST)+" },\n  { version: 'v1.8.9'")
for f in ['components/JevReleaseHistory.tsx','app/sitemap.ts']:
 edit(f,"import { hasPublishedJevbenchV189Release } from '../lib/jevbench-v189-release.mjs';","import { hasPublishedJevbenchV1810Release } from '../lib/jevbench-v1810-release.mjs';\nimport { hasPublishedJevbenchV189Release } from '../lib/jevbench-v189-release.mjs';")
edit('components/JevReleaseHistory.tsx','v189] = await Promise.all([','v189, v1810] = await Promise.all([')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV189Release()]);','hasPublishedJevbenchV189Release(), hasPublishedJevbenchV1810Release()]);')
edit('components/JevReleaseHistory.tsx',"!v189 && 'v1.8.9'].filter(Boolean)","!v189 && 'v1.8.9', !v1810 && 'v1.8.10'].filter(Boolean)")
edit('app/sitemap.ts','  const v189Visible = await hasPublishedJevbenchV189Release();','  const v189Visible = await hasPublishedJevbenchV189Release();\n  const v1810Visible = await hasPublishedJevbenchV1810Release();')
edit('app/sitemap.ts',"(r.version !== 'v1.8.9' || v189Visible))","(r.version !== 'v1.8.9' || v189Visible) && (r.version !== 'v1.8.10' || v1810Visible))")
edit('lib/jevbench-alldata-input.mjs',"import { readJevbenchV189ForBoard, v189BoardInput } from './jevbench-v189-release.mjs';","import { readJevbenchV1810ForBoard, v1810BoardInput } from './jevbench-v1810-release.mjs';\nimport { readJevbenchV189ForBoard, v189BoardInput } from './jevbench-v189-release.mjs';")
edit('lib/jevbench-alldata-input.mjs',"  'v1.8.9': { read: readJevbenchV189ForBoard, board: v189BoardInput },","  'v1.8.9': { read: readJevbenchV189ForBoard, board: v189BoardInput },\n  'v1.8.10': { read: readJevbenchV1810ForBoard, board: v1810BoardInput },")
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.8.10':")==1
# r278 pre-flip 2 (critic2 B1): the release page's All-data grid/CSV uses the same assembled live chain as the release page, so its category view
# takes the v1.8.10 artifact path instead of the frozen fallback.
edit('lib/jevbench-alldata-input.mjs',"export async function readJevAllDataInput(version, root = process.cwd()) {","async function v1810AllDataChain(root) { const [b, previous] = await Promise.all([readJevbenchV161Release(root), readJevbenchV157Release(root)]); return assembleJevBoard({ release: { artifact: b.artifact, categories: b.categories, carry: b.carry }, previous, live: true, apiA4, root }); }\n\nexport async function readJevAllDataInput(version, root = process.cwd()) {")
edit('lib/jevbench-alldata-input.mjs',"  const board = entry.board(release);","  const board = entry.board(release, version === 'v1.8.10' ? await v1810AllDataChain(root) : undefined);")
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("entry.board(release, version === 'v1.8.10' ? await v1810AllDataChain(root) : undefined)")==1
edit('test/cr-205-jev-page-structure.test.mjs',"'v1.8.8', 'v1.8.9'].sort());","'v1.8.8', 'v1.8.9', 'v1.8.10'].sort());")
# Older release tests that pin the newest published release.
for f in ['test/jevbench-feed-live-board.test.mjs','test/jevbench-v170-release.test.mjs','test/jevbench-v1637-release.test.mjs']:
 edit(f,"import { hasPublishedJevbenchV189Release } from '../lib/jevbench-v189-release.mjs';","import { hasPublishedJevbenchV1810Release } from '../lib/jevbench-v1810-release.mjs';\nimport { hasPublishedJevbenchV189Release } from '../lib/jevbench-v189-release.mjs';")
 edit(f,"(await hasPublishedJevbenchV189Release()) ? 'v1.8.9' :","(await hasPublishedJevbenchV1810Release()) ? 'v1.8.10' : (await hasPublishedJevbenchV189Release()) ? 'v1.8.9' :")
# Draw table: the 27 Oct draw becomes equated (offset, interval and anchors from the pinned receipt) and gains v1.8.10.
p=W/'data/jevbench-draw-equating.json';t=json.loads(p.read_text())
d=next(x for x in t['draws'] if x['draw']=='v1.6-regular-20261027')
if 'v1.8.10' not in d['releases']:d['releases'].append('v1.8.10')
t['method']=t['method'].replace('with fixed anchor systems measured on both draws','with anchor systems measured on both draws (each draw lists its own anchor set)')
assert 'each draw lists its own anchor set' in t['method'] and 'fixed anchor systems' not in t['method']
d.update(latest_release='v1.8.10',status='equated',offset=EQ['offset'],offset_ci95=EQ['offset_ci95'],anchors=EQ['anchors'])
d['anchor_evidence']=('Four strong anchor systems answered both the reference draw and this draw: Intelligence '+f"{EQ['offset']['I']:.2f}"+' (95% CI '+f"{EQ['offset_ci95']['I'][0]:.2f} to {EQ['offset_ci95']['I'][1]:+.2f}"+'), Calibration '+f"{EQ['offset']['C']:.2f}"+' (95% CI '+f"{EQ['offset_ci95']['C'][0]:.2f} to {EQ['offset_ci95']['C'][1]:+.2f}"+'), median over anchors, frozen scorer, B=1000. '
  'A fifth planned anchor could not be staged and is skipped as pre-registered. Receipt EQUATING-STRONG4-D1027.json, sha256 '+EQ['files']['equating']['sha256']+'; applied in v1.8.10.')
d['equating_receipt']={'name':'EQUATING-STRONG4-D1027.json','sha256':EQ['files']['equating']['sha256']}
p.write_text(json.dumps(t,indent=2,ensure_ascii=False)+'\n')
# Vendor rename (display field only; key, repo and URLs stay): the live context-length board names the system.
p=W/'data/jevbench-context-length-board.json';s=p.read_text();old='"system": "JEV-27B (AutoTrust, Qwen3.8-27B)"';new='"system": "AutoTrust-Decider-Pro-27B (AutoTrust, Qwen3.8-27B)"'
if old in s:
 assert s.count(old)==1;p.write_text(s.replace(old,new))
assert new in p.read_text() and old not in p.read_text()
# The added hosted-API row (gemini-decision-1): presentation overlays for its key only (never infer an undisclosed API base; existing entries untouched).
import sys;sys.path.insert(0,str(J));import gemini_v1810 as GEM
for f,value in [('data/jevbench-base-models.json',GEM.BASE_MODEL),('data/jevbench-architecture.json',GEM.ARCHITECTURE)]:
 p=W/f;d=json.loads(p.read_text());cur=d['benchmarks']['jevbench']
 if GEM.GK in cur:assert cur[GEM.GK]==value,(f,'different entry exists')
 else:cur[GEM.GK]=value;p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
print('Wired v1.8.10; 27 Oct draw entry equated (4 strong anchors); one All-data loader; public visibility review-gated')
