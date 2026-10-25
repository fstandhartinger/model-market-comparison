"""Idempotent v172 integration, invoked only after all candidate inputs exist."""
import json,os,pathlib
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])))
def edit(name,old,new):
 p=W/name;s=p.read_text()
 if new in s:return
 assert old in s,(name,old)
 p.write_text(s.replace(old,new))
p=W/'app/api/jevbench/v1.7.2/route.ts';p.parent.mkdir(parents=True,exist_ok=True);p.write_text((W/'app/api/jevbench/v1.7.1/route.ts').read_text().replace('V171','V172').replace('v171','v172'))
p=W/'app/jev-models/v1.7.2/page.tsx';p.parent.mkdir(parents=True,exist_ok=True)
s=(W/'app/jev-models/v1.7.1/page.tsx').read_text().replace('v1.7.1','__NEW__').replace('v1.7.0','v1.7.1').replace('__NEW__','v1.7.2').replace('V171','V172').replace('v171','v172').replace('jev171','jev172').replace('Three same-draw additions','One same-draw addition').replace('Amazon Strands Decider 26B-A4B, Turion JEV 31B and Chon-1.0-12B-Fast added.','Jeetu Decider 2B added.')
s=s.replace('Amazon Strands Decider 26B-A4B, Turion JEV 31B and Chon-1.0-12B-Fast','Jeetu Decider 2B').replace('three new rows','one new row').replace('285 carried','288 carried')
p.write_text(s)
edit('lib/jevbench-live-board.mjs',"import { readJevbenchV171ForBoard, withV171Addendum }", "import { readJevbenchV172ForBoard, withV172Addendum } from './jevbench-v172-release.mjs';\nimport { readJevbenchV171ForBoard, withV171Addendum }")
edit('lib/jevbench-live-board.mjs','return v171 ? withV171Addendum(current, v171) : current;', 'const previous = v171 ? withV171Addendum(current, v171) : current;\n  const v172 = await readJevbenchV172ForBoard(root);\n  return v172 ? withV172Addendum(previous, v172) : previous;')
edit('lib/jevbench-live-board.mjs',"return (await readJevbenchV171ForBoard(root)) ? 'v1.7.1'", "return (await readJevbenchV172ForBoard(root)) ? 'v1.7.2' : (await readJevbenchV171ForBoard(root)) ? 'v1.7.1'")
edit('components/JevBenchReleaseVersionNav.tsx',"type JevRelease = 'v1.7.1'", "type JevRelease = 'v1.7.2' | 'v1.7.1'")
edit('lib/jevbench-categories.mjs',"'v1.7.0', 'v1.7.1'];", "'v1.7.0', 'v1.7.1', 'v1.7.2'];")
edit('lib/jevbench-releases.mjs',"  { version: 'v1.7.1'", "  { version: 'v1.7.2', date: '2026-10-25', href: '/jev-models/v1.7.2', text: 'One new row on the same draw: Jeetu Decider 2B. No method change; all carried scores and confidence intervals retained.' },\n  { version: 'v1.7.1'")
edit('components/JevReleaseHistory.tsx',"import { hasPublishedJevbenchV171Release }", "import { hasPublishedJevbenchV172Release } from '../lib/jevbench-v172-release.mjs';\nimport { hasPublishedJevbenchV171Release }")
edit('components/JevReleaseHistory.tsx','v170, v171] =','v170, v171, v172] =')
edit('components/JevReleaseHistory.tsx','hasPublishedJevbenchV171Release()]);','hasPublishedJevbenchV171Release(), hasPublishedJevbenchV172Release()]);')
edit('components/JevReleaseHistory.tsx',"!v171 && 'v1.7.1'].filter", "!v171 && 'v1.7.1', !v172 && 'v1.7.2'].filter")
p=W/'data/jevbench-architecture.json';d=json.loads(p.read_text());e=json.loads((J/'src/inputs.json').read_text())['jeetu-decider-2b']['entry']
d['benchmarks']['jevbench']['jeetu-decider-2b']={'arch':'open-llm-decoder','badges':{'params':'2B','derivation':'fine-tune','quant':'bf16'},'evidence':[{'url':e['repo']+'/blob/'+e['revision']+'/README.md','kind':'model-card','fact':'Qwen3.5-2B-family fine-tune with a BF16 backbone and FP32 option-pointer decision head; native author serving implementation.'}]}
p.write_text(json.dumps(d,indent=2)+'\n')
print('wired v1.7.2; predecessor chain retained')
