import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// CR-173 (2026-09-26): ARC Prize Verified per-model results pages. The sources are the committed captures
// (GPT-6 Luna 2026-09-24, the seven others 2026-09-26); mutations are synthetic failure probes, never source claims.
test('ARC Prize verified results-page parser reads every planned page and fails closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
seen={}
for bid,col in (('arc-agi::1','ARC-AGI-1'),('arc-agi::2','ARC-AGI-2')):
  extras=plan[bid]['additional_sources']
  assert len(extras)==8,len(extras)
  for x in extras:
    raw=gzip.decompress(Path(x['source']['file']).read_bytes())
    assert hashlib.sha256(raw).hexdigest()==x['source']['sha256']
    rows=m.parse(raw.decode(),x['parser'],None)
    assert [r['context']['source_variant'] for r in rows]==x['parser']['expected_variants']
    assert all(r['context']['benchmark_column']==col and r['published_at'] is None and r['context']['model_release_date'] for r in rows)
    seen[(bid,x['parser']['model_name'])]=[(r['context']['source_variant'],r['value']) for r in rows]
assert seen[('arc-agi::1','GPT-6 Astra')]==[('Max',97.5),('XHigh',98.5),('High',98.5),('Medium',97.5),('Low',96.5),('None',86.0)]
assert seen[('arc-agi::2','Claude Opus 5.5')]==[('Max',91.7),('XHigh',92.5),('High',93.3),('Medium',87.5),('Low',70.1)]
assert seen[('arc-agi::2','GPT-6 Luna')][-1]==('None',0.0)
assert seen[('arc-agi::1','Kimi K3')]==[('Max',94.5),('High',86.7),('Low',65.7)]
kimi=[x for x in plan['arc-agi::1']['additional_sources'] if x['parser']['model_name']=='Kimi K3'][0]
src=gzip.decompress(Path(kimi['source']['file']).read_bytes()).decode()
assert m.parse(src,kimi['parser'],None)[0]['context']['model_release_date']=='2026-07-16'
def fails(source,spec,what):
  try:m.parse(source,spec,None)
  except ValueError:return
  raise AssertionError('accepted: '+what)
fails(src,{**kimi['parser'],'vendor':'OpenAI'},'wrong vendor')
fails(src.replace('alt="ARC Prize Verified"','alt="ARC Prize"'),kimi['parser'],'missing badge')
fails(src,{**kimi['parser'],'expected_variants':['Max','Low']},'changed variant coverage')
fails(src,{**kimi['parser'],'model_name':'Kimi K3 Pro'},'other model title')
fails(src.replace('>94.5%<','>n/a<',1),kimi['parser'],'non-numeric cell')
print('arc verified page checks passed')
`], { encoding: 'utf8' });
  assert.match(output, /arc verified page checks passed/);
});
