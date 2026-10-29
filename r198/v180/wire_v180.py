"""Idempotent v1.8.0 integration, no publication or review flip."""
import json,pathlib,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];C=json.loads((J/'inputs/config.json').read_text());PREV=C['previous'];V=PREV.replace('.','')[1:];MOD='v'+V
NOTE=json.loads((J/'receipts/summary.json').read_text())['note']
def edit(name,old,new):
 p=W/name;s=p.read_text()
 if new in s:return
 assert old in s,(name,old[:120]);p.write_text(s.replace(old,new))
# Routes and archive.
for name in ['app/api/jevbench/v1.8.0/route.ts','app/jev-models/v1.8.0/page.tsx']:
 p=W/name;p.parent.mkdir(parents=True,exist_ok=True)
 s=(W/name.replace('v1.8.0',PREV)).read_text().replace('V'+V,'V180').replace(MOD,'v180').replace(PREV,'v1.8.0')
 if name.endswith('page.tsx'):
  s=s.replace('Text-only corrections','GPU-time cost basis')
  s=re.sub(r"title:'[^']*'","title:'JevBench v1.8.0: GPU-time cost basis'",s)
  s=re.sub(r'(<h1[^>]*>).*?(</h1>)',r'\1JevBench v1.8.0: GPU-time cost basis\2',s)
  s=re.sub(r'(<div className="bh-eyebrow">).*?(</div>)',r'\1JevBench v1.8.0: GPU-time cost basis\2',s)
  s=s.replace('measurement_notes.slice(-2);','measurement_notes.slice(-1);')
  s=re.sub(r'href="/jev-models/[^"]+">Previous [^<]+','href="/jev-models/'+PREV+'">Previous '+PREV,s)
  s=re.sub(r"description:'[^']*'","description:'GPU-time cost estimates for self-hosted open weights; API prices and both caps unchanged.'",s)
  s=re.sub(r'<p className="mt-3 max-w-3xl">.*?</p>','<p className="mt-3 max-w-3xl">'+NOTE.replace("'",'&apos;')+'</p>',s)
  s=s.replace('/jev-models/v1.7.22','/jev-models/'+PREV).replace('Previous v1.7.22','Previous '+PREV)
 p.write_text(s)
# Latest chain.
edit('lib/jevbench-live-board.mjs',f"import {{ readJevbenchV{V}ForBoard, withV{V}Addendum }} from './jevbench-{MOD}-release.mjs';",f"import {{ readJevbenchV180ForBoard, withV180Addendum }} from './jevbench-v180-release.mjs';\nimport {{ readJevbenchV{V}ForBoard, withV{V}Addendum }} from './jevbench-{MOD}-release.mjs';")
edit('lib/jevbench-live-board.mjs',f'  return v{V} ? withV{V}Addendum(throughV1722, v{V}) : throughV1722;',f'  const throughV{V} = v{V} ? withV{V}Addendum(throughV1722, v{V}) : throughV1722;\n  const v180 = await readJevbenchV180ForBoard(root);\n  return v180 ? withV180Addendum(throughV{V}, v180) : throughV{V};') if PREV=='v1.7.23' else edit('lib/jevbench-live-board.mjs','  return v1722 ? withV1722Addendum(throughV1721, v1722) : throughV1721;','  const throughV1722 = v1722 ? withV1722Addendum(throughV1721, v1722) : throughV1721;\n  const v180 = await readJevbenchV180ForBoard(root);\n  return v180 ? withV180Addendum(throughV1722, v180) : throughV1722;')
edit('lib/jevbench-live-board.mjs',f"return (await readJevbenchV{V}ForBoard(root)) ? '{PREV}'",f"return (await readJevbenchV180ForBoard(root)) ? 'v1.8.0' : (await readJevbenchV{V}ForBoard(root)) ? '{PREV}'")
edit('components/JevBenchReleaseVersionNav.tsx',f"type JevRelease = '{PREV}'",f"type JevRelease = 'v1.8.0' | '{PREV}'")
edit('lib/jevbench-categories.mjs',f"'{PREV}'];",f"'{PREV}', 'v1.8.0'];")
edit('lib/jevbench-releases.mjs',f"  {{ version: '{PREV}'", "  { version: 'v1.8.0', date: '2026-10-29', href: '/jev-models/v1.8.0', text: '"+NOTE.replace("'","\\'")+"' },\n"+f"  {{ version: '{PREV}'")
for filename in ['components/JevReleaseHistory.tsx','app/sitemap.ts']:
 edit(filename,f"import {{ hasPublishedJevbenchV{V}Release }} from '../lib/jevbench-{MOD}-release.mjs';",f"import {{ hasPublishedJevbenchV180Release }} from '../lib/jevbench-v180-release.mjs';\nimport {{ hasPublishedJevbenchV{V}Release }} from '../lib/jevbench-{MOD}-release.mjs';")
edit('components/JevReleaseHistory.tsx',f'v{V}] = await Promise.all([',f'v{V}, v180] = await Promise.all([')
edit('components/JevReleaseHistory.tsx',f'hasPublishedJevbenchV{V}Release()]);',f'hasPublishedJevbenchV{V}Release(), hasPublishedJevbenchV180Release()]);')
edit('components/JevReleaseHistory.tsx',f"!v{V} && '{PREV}'].filter(Boolean)",f"!v{V} && '{PREV}', !v180 && 'v1.8.0'].filter(Boolean)")
edit('app/sitemap.ts',f'  const v{V}Visible = await hasPublishedJevbenchV{V}Release();\n',f'  const v{V}Visible = await hasPublishedJevbenchV{V}Release();\n  const v180Visible = await hasPublishedJevbenchV180Release();\n')
edit('app/sitemap.ts',f"(r.version !== '{PREV}' || v{V}Visible))",f"(r.version !== '{PREV}' || v{V}Visible) && (r.version !== 'v1.8.0' || v180Visible))")
edit('lib/jevbench-alldata-input.mjs',f"import {{ readJevbenchV{V}ForBoard, {MOD}BoardInput }} from './jevbench-{MOD}-release.mjs';",f"import {{ readJevbenchV180ForBoard, v180BoardInput }} from './jevbench-v180-release.mjs';\nimport {{ readJevbenchV{V}ForBoard, {MOD}BoardInput }} from './jevbench-{MOD}-release.mjs';")
edit('lib/jevbench-alldata-input.mjs',f"  '{PREV}': {{ read: readJevbenchV{V}ForBoard, board: {MOD}BoardInput }},",f"  '{PREV}': {{ read: readJevbenchV{V}ForBoard, board: {MOD}BoardInput }},\n  'v1.8.0': {{ read: readJevbenchV180ForBoard, board: v180BoardInput }},")
edit('lib/jevbench-alldata-input.mjs',"const previousKeys = version.startsWith('v1.7.')","const previousKeys = (version.startsWith('v1.7.') || version === 'v1.8.0')")
assert (W/'lib/jevbench-alldata-input.mjs').read_text().count("'v1.8.0':")==1
# Existing tests select the newest visible release dynamically.
for name in ['cr-303-feed-split','jevbench-v1630-release','jevbench-v1630-open-fold','jevbench-v170-release','jevbench-v1637-release','jevbench-feed-live-board']:
 f='test/'+name+'.test.mjs'
 edit(f,f"import {{ hasPublishedJevbenchV{V}Release }} from '../lib/jevbench-{MOD}-release.mjs';",f"import {{ hasPublishedJevbenchV180Release }} from '../lib/jevbench-v180-release.mjs';\nimport {{ hasPublishedJevbenchV{V}Release }} from '../lib/jevbench-{MOD}-release.mjs';")
 for text in [PREV,MOD]:
  p=W/f;s=p.read_text();needle=f"(await hasPublishedJevbenchV{V}Release()) ? '{text}' :"
  if needle in s and f"(await hasPublishedJevbenchV180Release()) ? '{'v1.8.0' if text==PREV else 'v180'}' :" not in s:p.write_text(s.replace(needle,f"(await hasPublishedJevbenchV180Release()) ? '{'v1.8.0' if text==PREV else 'v180'}' : "+needle))
# v1.8 inherits the same explicitly registry-bound historical aliases as v1.7.
edit('test/jevbench-architecture-data.test.mjs', "jevFiles.filter((path) => !path.includes('/jevbench/v1.7/'))", r"jevFiles.filter((path) => !/\/jevbench\/v1\.(?:7|8)\//.test(path))")
edit('test/jevbench-architecture-data.test.mjs', "jevFiles.filter((path) => path.includes('/jevbench/v1.7/'))", r"jevFiles.filter((path) => /\/jevbench\/v1\.(?:7|8)\//.test(path))")
edit('test/cr-205-jev-page-structure.test.mjs',f"'{PREV}'].sort());",f"'{PREV}', 'v1.8.0'].sort());")
# Gate the new methodology section on publication visibility.
p=W/'app/jev-models/methodology/page.tsx';s=p.read_text()
if 'JevGpuCostMethod' not in s:
 s="import { JevGpuCostMethod } from '../../../components/JevGpuCostMethod';\n"+s
 s=s.replace('<DecisionMethodology />','<DecisionMethodology /><JevGpuCostMethod />');p.write_text(s)
# Preserve archived board explanations; use GPU-time wording only on v1.8.0 boards.
p=W/'components/JevBenchV15Preview.tsx';s=p.read_text()
if 'const gpuTime =' not in s:
 s=s.replace("function Costs({ a }: { a: JevV15Artifact }) {", "function Costs({ a }: { a: JevV15Artifact }) {\n  const gpuTime = a.revision === 'v1.8.0' || (a as JevV15Artifact & {restated_by?:string}).restated_by === 'v1.8.0';")
 start=s.index('      <p className="bh-muted mt-2">Systems with a public tariff');end=s.index('      <ul className="mt-3 space-y-1.5" data-bh-jev-cost-rows>',start)
 s=s[:start]+'''      {gpuTime ? <p className="bh-muted mt-2" data-bh-jev-gpu-cost-rule>From v1.8.0, self-hosted open weights use the lower of the old list-price estimate and GPU time on a monthly-rented RTX PRO 6000 96 GB: USD 1.5235/hour at 70% average load, applied to the row&apos;s own scored input and output tokens and its measured or architecture-class throughput. Encoders, unresolved architectures and unverifiable token bases keep their previous costs. API prices, the Jev-compatible reference and both official caps are unchanged. Each row states its token basis, throughput source and resulting estimate. Earlier v1.7 prices stay in the archive.</p> : <>\n'''+s[start:end]+'''      </>}\n'''+s[end:];p.write_text(s)
print('Wired v1.8.0 with one All-data entry; PENDING visibility enforced.')

# The live feed changes costs in v1.8; archive-only expectations remain pinned.
import subprocess
subprocess.run(["python3","-B",str(J/"fix_live_test_v180.py")],check=True)
