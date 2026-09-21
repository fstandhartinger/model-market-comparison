import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseBlueprintBenchLabel, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-21 (iteration 155, CR-37.1). The source is the committed capture of Andon Labs' Blueprint-Bench 2 page;
// every mutation below is a synthetic failure probe, never a source claim.
test('Blueprint-Bench 2 parser reads every model row, skips the human baseline, keeps the ** floor marker and fails closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
e=[x for x in plan['entries'] if x['benchmark_id']=='blueprint-bench::2'][0]
def load(src):
  raw=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8-sig')
page=load(e['source'])
reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
out=m.collect({'entries':[e]},reg)
obs=out['observations'];names=[o['subject']['name'] for o in obs]
assert len(obs)==26,len(obs)
assert not any('Human' in n for n in names),names
got={o['subject']['name']:o for o in obs}
assert got['GPT-6 Astra']['value']==0.497 and got['Claude Fable 5.1']['value']==0.419 and got['Kimi K2.6']['value']==0.039
assert all(o['unit']=='points' and o['basis']=='measured' for o in obs)
floored=sorted(n for n,o in got.items() if '"marker":"at or below the random baseline' in o['protocol'])
assert floored==['Claude Haiku 4.5','Gemini 3 Flash','Gemini Robotics-ER 1.6','Grok 4.20 Reasoning','Grok 4.3'],floored
assert all(got[n]['value']==0 for n in floored)
assert '"marker"' not in got['Kimi K2.6']['protocol']
def fails(p,why):
  try: m.parse(p,e['parser'],load)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(page.replace('50 apartments sequentially','40 apartments sequentially'),'another apartment count')
fails(page.replace('random baseline maps to 0','random baseline maps to 0.5'),'another normalisation')
fails(page.replace('Jaccard similarity</strong> (50%)','Jaccard similarity</strong> (40%)').replace('Jaccard similarity (50%)','Jaccard similarity (40%)'),'another scoring weight')
fails(page.replace('Score at or below the random baseline','Score below the median'),'floor footnote changed')
fails(page.replace('>Score<','>Accuracy<'),'another value column')
fails(page.replace('--> Claude Opus 5<','--> GPT-6 Astra<'),'repeated model row')
print(json.dumps({'rows':len(obs)}))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { rows: 26 });
});

test('Blueprint-Bench 2 joins: a product name without a setting joins only a single default configuration', () => {
  assert.deepEqual(parseBlueprintBenchLabel('Gemini 3 Flash'), { family: 'gemini-3-flash', effort: null });
  assert.deepEqual(parseBlueprintBenchLabel('Grok 4.20 Reasoning'), { family: 'grok-4.20-reasoning', effort: null });
  assert.deepEqual(parseBlueprintBenchLabel('Human*'), { family: null, effort: null });
  assert.deepEqual(parseBlueprintBenchLabel('Gemini Robotics-ER 1.6'), { family: null, effort: null });
  const catalog = [
    { id: 'gemini-3-flash::default', family_key: 'gemini-3-flash', variant: 'default' },
    { id: 'gemini-3-flash-preview::reasoning', family_key: 'gemini-3-flash-preview', variant: 'reasoning' },
    { id: 'gemini-3.6-flash::high', family_key: 'gemini-3.6-flash', variant: 'high' },
    { id: 'claude-opus-5::max', family_key: 'claude-opus-5', variant: 'max' },
    { id: 'claude-opus-5::high', family_key: 'claude-opus-5', variant: 'high' },
  ];
  const rows = ['Gemini 3 Flash', 'Gemini 3.6 Flash', 'Claude Opus 5'].map((n) => ({ source_id: n, name: n }));
  const joins = boardJoins(rows, parseBlueprintBenchLabel, catalog);
  assert.equal(joins[0].model_id, 'gemini-3-flash::default');
  // A single non-default configuration is not "no setting": the board may have run another level.
  assert.equal(joins[1].model_id, null);
  assert.equal(joins[2].model_id, null);
  const map = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/identity-map.json', import.meta.url), 'utf8'));
  const live = map.entries.filter((x) => x.benchmark_id === 'blueprint-bench::2').map((x) => `${x.source_id}→${x.model_id}`).sort();
  assert.deepEqual(live, ['Gemini 3 Flash→gemini-3-flash::default', 'Grok 4.20 Reasoning→grok-4.20-reasoning::default']);
});

test('Blueprint-Bench 2 is registered as its own versioned benchmark on the source scale, with tiers', () => {
  const registry = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
  const entry = registry.entries.find((e) => e.id === 'blueprint-bench::2');
  assert.equal(entry.scoring.unit, 'points');
  assert.deepEqual(entry.scoring.range, [0, 1]);
  assert.equal(entry.category, 'Vision');
  const taxonomy = JSON.parse(readFileSync(new URL('../data/benchmark-taxonomy.json', import.meta.url), 'utf8'));
  assert.equal(taxonomy.tiers['blueprint-bench'], 'niche');
  const tiers = JSON.parse(readFileSync(new URL('../data/benchmaxxing-tiers.json', import.meta.url), 'utf8'));
  assert.equal(tiers.tiers['blueprint-bench'].tier, 'secondary');
});

test('a higher-is-better ranking whose best shown value is 0 draws no bar, never a full one', () => {
  const src = readFileSync(new URL('../components/BenchmarkRanking.tsx', import.meta.url), 'utf8');
  const line = src.split('\n').find((l) => l.includes('const barWidth ='));
  assert.match(line, /topValue > 0 \? Math\.min\(100, \(row\.value \/ topValue\) \* 100\) : null;$/);
});
