import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseLhtbLabel, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-21 (iteration 157, CR-37.1). The sources are the committed captures of the LHTB community leaderboard page
// and its script.js; every mutation below is a synthetic failure probe, never a source claim.
test('LHTB parser reads the LB baselines and the verified COMMUNITY.push runs, and fails closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
e=[x for x in plan['entries'] if x['benchmark_id']=='long-horizon-terminal-bench::1.0'][0]
def load(src):
  raw=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8-sig')
script=load(e['source'])
reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
out=m.collect({'entries':[e]},reg)
obs=out['observations'];got={o['subject']['name']:o for o in obs}
assert len(obs)==22,len(obs)
assert got['Grok 4.5']['value']==0.505 and got['GPT-5.6-sol']['value']==0.451 and got['Grok 4.20']['value']==0.102
assert got['Kimi K3']['value']==0.378 and '"date":"2026-07-22"' in got['Kimi K3']['protocol'] and '"solved_at_0.90_0.95_1.00":[7,6,5]' in got['Kimi K3']['protocol']
assert '"date":"2026-07-01"' in got['Hy3']['protocol'] and '"solved_at_0.95":1' in got['Hy3']['protocol']
assert all(o['unit']=='points' and o['basis']=='measured' and o['subject']['harness']=='Terminus-2' for o in obs)
def fails(p,why,method=None):
  spec=json.loads(json.dumps(e['parser']))
  loader=(lambda src: method) if method is not None else load
  assert (p!=script) or (method is not None and method!=page),'probe did not mutate: '+why
  try: m.parse(p,spec,loader)
  except ValueError: return
  raise AssertionError('accepted: '+why)
page=load(e['parser']['method_source'])
fails(script.replace('const N_TASKS = 46;','const N_TASKS = 50;'),'another task count')
fails(script.replace('date: "2026-07-01", verified: true','date: "2026-07-01", verified: false'),'seed rows no longer verified')
fails(script.replace('mean: 0.505','mean: 50.5'),'mean reward off the 0..1 scale')
fails(script.replace('solved: 13, cost: 11.19','solved: 13, cost: 11.19, pass: 3'),'new LB field')
fails(script.replace('agent: "Terminus-2", name: "Kimi K3"','agent: "Claude Code", name: "Kimi K3"'),'unreviewed agent')
fails(script.replace('submitter: "Tencent", org: "Moonshot", date: "2026-07-22", verified: true','submitter: "Tencent", org: "Moonshot", date: "2026-07-22", verified: false'),'unverified community run')
fails(script.replace('{ name: "Claude Sonnet 5",','{ name: "Grok 4.5",'),'repeated model row')
fails(script,'another budget',page.replace('90-minute budget','120-minute budget'))
fails(script,'another scoring note',page.replace('errors = 0;','errors excluded;'))
print(json.dumps({'rows':len(obs)}))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { rows: 22 });
});

test('LHTB joins: a product name without a setting joins only a single default configuration', () => {
  assert.deepEqual(parseLhtbLabel('Hy3'), { family: 'hy3', effort: null });
  assert.deepEqual(parseLhtbLabel('Grok 4.20'), { family: 'grok-4.20', effort: null });
  assert.deepEqual(parseLhtbLabel('Doubao Seed 2.1 Pro'), { family: null, effort: null });
  const catalog = [
    { id: 'hy3::default', family_key: 'hy3', variant: 'default' },
    { id: 'kimi-k3::max', family_key: 'kimi-k3', variant: 'max' },
    { id: 'kimi-k3::default', family_key: 'kimi-k3', variant: 'default' },
  ];
  const joins = boardJoins(['Hy3', 'Kimi K3'].map((n) => ({ source_id: n, name: n })), parseLhtbLabel, catalog);
  assert.equal(joins[0].model_id, 'hy3::default');
  // Two configurations and no stated setting: the run cannot be placed, so it stays as named by the source.
  assert.equal(joins[1].model_id, null);
  const map = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/identity-map.json', import.meta.url), 'utf8'));
  const live = map.entries.filter((x) => x.benchmark_id === 'long-horizon-terminal-bench::1.0').map((x) => `${x.source_id}→${x.model_id}`).sort();
  assert.deepEqual(live, ['Grok 4.20→grok-4.20::default', 'Hy3→hy3::default', 'Kimi K2.7 Code→kimi-k2.7-code::default',
    'MiniMax M3→minimax-m3::default', 'Qwen3.6 Plus→qwen3.6-plus::default', 'Qwen3.7 Max→qwen3.7-max::default']);
});

test('LHTB is registered as its own versioned benchmark on the board scale, with tiers and the Lumina decision', () => {
  const registry = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
  const entry = registry.entries.find((e) => e.id === 'long-horizon-terminal-bench::1.0');
  assert.equal(entry.scoring.unit, 'points');
  assert.deepEqual(entry.scoring.range, [0, 1]);
  assert.equal(entry.category, 'Agentic');
  const taxonomy = JSON.parse(readFileSync(new URL('../data/benchmark-taxonomy.json', import.meta.url), 'utf8'));
  assert.equal(taxonomy.tiers['long-horizon-terminal-bench'], 'niche');
  const tiers = JSON.parse(readFileSync(new URL('../data/benchmaxxing-tiers.json', import.meta.url), 'utf8'));
  assert.equal(tiers.tiers['long-horizon-terminal-bench'].tier, 'secondary');
  const lumina = JSON.parse(readFileSync(new URL('../data/lumina-feed-policy.json', import.meta.url), 'utf8')).family_decisions;
  assert.deepEqual(lumina['long-horizon-terminal-bench'].benchmark_ids, ['long-horizon-terminal-bench::1.0']);
  assert.equal(lumina['benchlm-gertlabs'].decision, 'excluded');
});
