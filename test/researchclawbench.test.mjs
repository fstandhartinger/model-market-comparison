import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseResearchClawBenchLabel, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-21 (iteration 158, CR-37.1). The sources are the committed captures of ResearchClawBench's leaderboard data
// file, page, app.js and README; every mutation below is a synthetic failure probe, never a source claim.
test('ResearchClawBench parser reads the ResearchHarness rows as the page averages them, and fails closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
e=[x for x in plan['entries'] if x['benchmark_id']=='researchclawbench::40-tasks'][0]
def load(src):
  raw=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8-sig')
board=load(e['source']);data=json.loads(board)
reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
out=m.collect({'entries':[e]},reg)
obs=out['observations'];got={o['subject']['name']:o for o in obs}
assert len(obs)==21,len(obs)
# The value is the plain mean of the row's scored tasks, recomputed here from the raw file.
for name,o in got.items():
  xs=[v['score'] for v in data['scores']['ResearchHarness ('+name+')'].values()]
  assert o['value']==sum(xs)/len(xs),name
assert round(got['Claude-Opus-4.8']['value'],2)==21.12 and '"tasks_scored":39' in got['Claude-Opus-4.8']['protocol']
assert '"tasks_scored":33' in got['Hy3-Preview']['protocol'] and '"latest_run_date":"2026' in got['Hy3-Preview']['protocol'] or '"latest_run_date":null' in got['Hy3-Preview']['protocol']
assert all(o['unit']=='points' and o['basis']=='measured' and o['subject']['harness']=='ResearchHarness' for o in obs)
assert not any(n in got for n in ['Claude Code','InnoClaw (2.0)','Qiushi Engine'])
def mutate(f):
  d=json.loads(board);f(d);return json.dumps(d)
def fails(p,why,**over):
  spec=json.loads(json.dumps(e['parser']))
  def loader(src):
    for k,v in over.items():
      if src is spec[k]:return v
    return load(src)
  try: m.parse(p,spec,loader)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(mutate(lambda d:d['tasks'].append('Physics_004')),'another task list (new identity)')
fails(mutate(lambda d:d.update(extra=1)),'a new board key')
fails(mutate(lambda d:d['scores']['ResearchHarness (MiniMax-M3)']['Math_000'].update(score=120)),'a score off the 0..100 scale')
fails(mutate(lambda d:d['scores']['ResearchHarness (MiniMax-M3)']['Math_000'].update(model_display='Kimi-K2.6')),'a run naming another model')
fails(mutate(lambda d:d['scores']['ResearchHarness (MiniMax-M3)']['Math_000'].update(pass_k=5)),'a new entry field')
fails(mutate(lambda d:d['scores']['ResearchHarness (MiniMax-M3)'].update(Unknown_000={'score':1,'model_display':'MiniMax-M3','run_id':'x'})),'a task outside the list')
page=load(e['parser']['detail_source']);readme=load(e['parser']['method_source']);app=load(e['parser']['frontend_source'])
fails(board,'another scale statement',detail_source=page.replace('50 = matches original paper','60 = matches original paper'))
fails(board,'another judge statement',method_source=readme.replace('judged by an LLM acting as a strict peer reviewer','checked by unit tests'))
fails(board,'another averaging rule',frontend_source=app.replace('/ scores.length : -Infinity','/ 40 : -Infinity'))
print(json.dumps({'rows':len(obs)}))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { rows: 21 });
});

test('ResearchClawBench joins: a product name without a setting joins only a single default configuration', () => {
  assert.deepEqual(parseResearchClawBenchLabel('MiniMax-M3'), { family: 'minimax-m3', effort: null });
  assert.deepEqual(parseResearchClawBenchLabel('Hy3-Preview'), { family: null, effort: null });
  assert.deepEqual(parseResearchClawBenchLabel('Grok-4.1'), { family: null, effort: null });
  const catalog = [
    { id: 'qwen3.6-plus::default', family_key: 'qwen3.6-plus', variant: 'default' },
    { id: 'claude-opus-4.8::max', family_key: 'claude-opus-4.8', variant: 'max' },
    { id: 'claude-opus-4.8::high', family_key: 'claude-opus-4.8', variant: 'high' },
  ];
  const joins = boardJoins(['Qwen3.6-Plus', 'Claude-Opus-4.8'].map((n) => ({ source_id: n, name: n })), parseResearchClawBenchLabel, catalog);
  assert.equal(joins[0].model_id, 'qwen3.6-plus::default');
  assert.equal(joins[1].model_id, null);
  const map = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/identity-map.json', import.meta.url), 'utf8'));
  const live = map.entries.filter((x) => x.benchmark_id === 'researchclawbench::40-tasks').map((x) => `${x.source_id}→${x.model_id}`).sort();
  assert.deepEqual(live, ['MiMo-V2-Pro→mimo-v2-pro::default', 'MiMo-V2.5→mimo-v2.5::default', 'MiniMax-M3→minimax-m3::default',
    'Qwen3.6-Plus→qwen3.6-plus::default', 'Qwen3.7-Max→qwen3.7-max::default']);
});

test('ResearchClawBench is registered as a judged science board with its tiers and the Lumina decisions', () => {
  const registry = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
  const entry = registry.entries.find((e) => e.id === 'researchclawbench::40-tasks');
  assert.equal(entry.scoring.unit, 'points');
  assert.deepEqual(entry.scoring.range, [0, 100]);
  assert.equal(entry.category, 'Science');
  const caveats = JSON.parse(readFileSync(new URL('../data/benchmark-caveats.json', import.meta.url), 'utf8'));
  assert.ok(entry.scoring.metric.includes(caveats.judged.researchclawbench.quote));
  const tiers = JSON.parse(readFileSync(new URL('../data/benchmaxxing-tiers.json', import.meta.url), 'utf8'));
  assert.equal(tiers.tiers.researchclawbench.tier, 'judged');
  const lumina = JSON.parse(readFileSync(new URL('../data/lumina-feed-policy.json', import.meta.url), 'utf8')).family_decisions;
  assert.deepEqual(lumina['benchlm-researchclawbench'].benchmark_ids, ['researchclawbench::40-tasks']);
  assert.equal(lumina['benchlm-livecodebenchpro'].decision, 'planned');
});
