import os
"""Idempotent integration. The unchanged v1.6 chain still feeds v1.7.0; v1.7.1 follows it."""
import pathlib,json,copy
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])))
def edit(name,old,new):
 p=W/name;s=p.read_text()
 if new in s:return
 assert old in s,(name,old)
 p.write_text(s.replace(old,new))
p=W/'app/api/jevbench/v1.7.1/route.ts';p.parent.mkdir(parents=True,exist_ok=True);p.write_text((W/'app/api/jevbench/v1.7.0/route.ts').read_text().replace('V170','V171').replace('v170','v171'))
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV170ForBoard, withV170Restatement }", "import { readJevbenchV171ForBoard, withV171Addendum } from './jevbench-v171-release.mjs';\nimport { readJevbenchV170ForBoard, withV170Restatement }")
edit('lib/jevbench-live-board.mjs',"return { ...chain, ...restated, method: v170.artifact.method };", "const current = { ...chain, ...restated, method: v170.artifact.method };\n  const v171 = await readJevbenchV171ForBoard(root);\n  return v171 ? withV171Addendum(current, v171) : current;")
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV170ForBoard(root)) ? 'v1.7.0'", "return (await readJevbenchV171ForBoard(root)) ? 'v1.7.1' : (await readJevbenchV170ForBoard(root)) ? 'v1.7.0'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.7.0'", "type JevRelease = 'v1.7.1' | 'v1.7.0'")
edit('lib/jevbench-categories.mjs',"'v1.6.43', 'v1.7.0'];", "'v1.6.43', 'v1.7.0', 'v1.7.1'];")
edit('lib/jevbench-releases.mjs',"  { version: 'v1.7.0'", "  { version: 'v1.7.1', date: '2026-10-25', href: '/jev-models/v1.7.1', text: 'Three new rows on the same draw: Amazon Strands Decider 26B-A4B, Turion JEV 31B and Chon-1.0-12B-Fast. No method change; all carried scores and confidence intervals retained.' },\n  { version: 'v1.7.0'")
edit('components/JevReleaseHistory.tsx',"import { hasPublishedJevbenchV170Release }", "import { hasPublishedJevbenchV171Release } from '../lib/jevbench-v171-release.mjs';\nimport { hasPublishedJevbenchV170Release }")
edit('components/JevReleaseHistory.tsx','v1643, v170] =','v1643, v170, v171] =')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV170Release()]);','hasPublishedJevbenchV170Release(), hasPublishedJevbenchV171Release()]);')
edit('components/JevReleaseHistory.tsx',"!v170 && 'v1.7.0'].filter", "!v170 && 'v1.7.0', !v171 && 'v1.7.1'].filter")
# v1.7 is layered above v1.6. Do not change draw-equating.latest_release, which binds v1.7.0 to v1.6.43.
p=W/'data/jevbench-architecture.json';d=json.loads(p.read_text());rows=d['benchmarks']['jevbench']
for k,params,derivation,quant in [('amazon-strands-decider-26b-a4b','26B-A4B','adapter','bf16'),('turion-jev-31b','31B','fine-tune','fp8'),('chon-1.0-12b-fast','12B','adapter','bf16')]:
 e=json.loads((J/'src/inputs.json').read_text())[k]['entry']
 rows[k]={'arch':'open-llm-decoder','badges':{'params':params,'derivation':derivation,'quant':quant},'evidence':[{'url':e['repo']+'/blob/'+e['revision']+'/README.md','kind':'model-card','fact':e['base_model']+' derivative. Measured with the author serving implementation; '+quant.upper()+'.'}]}
p.write_text(json.dumps(d,indent=2)+'\n')
print('wired v1.7.1; v1.6 chain unchanged')
