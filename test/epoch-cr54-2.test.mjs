import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseDeepSweId } from '../lib/coding-identity.mjs';

// 2026-09-19 (iteration 115, CR-54.2): six more boards from Epoch AI's Benchmarking Hub archive
// (cc-by-4.0, robots allows /data/), ingested as Epoch-run snapshots with the same slug-join rule
// as the CR-54.1 boards. math_level_5 and frontiermath_erdos stay excluded with recorded reasons.
const IDS = {
  'chess-puzzles::snapshot-2026-09-18': 223,
  'mystery-game-puzzles::snapshot-2026-09-18': 128,
  'ebr-bench::snapshot-2026-09-18': 21,
  'mirrorcode::snapshot-2026-09-18': 8,
  'epoch-gpqa-diamond::snapshot-2026-09-18': 313,
  'epoch-swe-bench-verified::snapshot-2026-09-18': 35,
};
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

test('CR-54.2: the collector reproduces the committed observations from the committed evidence alone', () => {
  const out = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('c','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
ids=json.loads('${JSON.stringify(Object.keys(IDS))}')
plan={'entries':[e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries'] if e['benchmark_id'] in ids]}
r=m.collect(plan,json.loads(Path('data/raw/benchmarks/registry.json').read_text()))
print(json.dumps([[o['id'],o['benchmark_id'],o['subject']['source_id'],o['value']] for o in r['observations']]))
`]).toString();
  const fresh = JSON.parse(out);
  const committed = json('data/raw/benchmarks/public-observations.json').observations.filter((o) => o.benchmark_id in IDS)
    .map((o) => [o.id, o.benchmark_id, o.subject.source_id, o.value]);
  assert.equal(fresh.length, 728);
  assert.deepEqual(fresh, committed);
  for (const [id, n] of Object.entries(IDS)) assert.equal(fresh.filter((o) => o[1] === id).length, n, id);
  // The source's own numbers, read from the CSV members: Claude Fable 5.1 (max).
  const v = (id) => fresh.find((o) => o[1] === id && o[2] === 'claude-fable-5-1_max')?.[3];
  assert.equal(v('chess-puzzles::snapshot-2026-09-18'), 0.47);
  assert.equal(v('mystery-game-puzzles::snapshot-2026-09-18'), 0.58);
  assert.equal(v('ebr-bench::snapshot-2026-09-18'), 0.5714285714285714);
});

test('CR-54.2: registry provenance — manual snapshots, fractions, categories, CC BY attribution', () => {
  const plan = json('data/raw/benchmarks/collection-plan.json').entries;
  const registry = json('data/raw/benchmarks/registry.json').entries;
  const taxonomy = json('data/benchmark-taxonomy.json').benchmark_kinds;
  const spec = {
    'chess-puzzles::snapshot-2026-09-18': 'Reasoning',
    'mystery-game-puzzles::snapshot-2026-09-18': 'Reasoning',
    'ebr-bench::snapshot-2026-09-18': 'Agentic',
    'mirrorcode::snapshot-2026-09-18': 'Coding',
    'epoch-gpqa-diamond::snapshot-2026-09-18': 'Science',
    'epoch-swe-bench-verified::snapshot-2026-09-18': 'Coding',
  };
  for (const [id, category] of Object.entries(spec)) {
    const p = plan.find((e) => e.benchmark_id === id);
    assert.ok(p, id);
    assert.equal(p.refresh, 'manual', `${id} is never fetched by the daily run`);
    assert.equal(p.source.sha256.length, 64, 'plan is hash-bound to the committed capture');
    const e = registry.find((x) => x.id === id);
    assert.ok(e, id);
    assert.equal(e.category, category, id);
    assert.equal(e.version_status, 'snapshot', 'no version is claimed that the capture does not state');
    assert.equal(e.scoring.unit, 'fraction', id);
    assert.equal(e.source_type, 'official_leaderboard', id);
    assert.ok(e.evidence.some((x) => x.url.endsWith('/robots.txt')), 'robots receipt');
    assert.ok(e.evidence.every((x) => x.file.startsWith('data/raw/benchmarks/daily-evidence/2026-09-18-epoch-hub/')), `${id} evidence files`);
    assert.match(e.how_to_collect.notes, /CC BY 4\.0: attribute Epoch AI/);
    assert.equal(taxonomy[id.split('::')[0]], 'capability', `${id} enters the Benchmaxxing analysis`);
  }
});

test('CR-54.2: the two exclusions and all six inclusions are recorded with reasons', () => {
  const d = json('data/raw/benchmarks/epoch-hub-decisions.json');
  assert.equal(d['archive_sha256_captured_2026-09-18'], 'db87a5be1b30915a3c6411acbaa4ccb83b1b759876e3c698df8abb5ffed04f1d');
  assert.match(d.licence, /CC BY 4\.0/);
  const by = Object.fromEntries(d.decisions.map((x) => [x.board, x]));
  for (const board of ['chess_puzzles', 'mystery_game_puzzles', 'ebr_bench', 'mirrorcode', 'gpqa_diamond', 'swe_bench_verified']) {
    assert.equal(by[board]?.decision, 'ingest', board);
    assert.ok(IDS[by[board].identity], `ingested board has a registry identity: ${board}`);
    assert.ok(by[board].reason.length > 20, `reason recorded: ${board}`);
  }
  assert.equal(by.math_level_5?.decision, 'exclude');
  assert.match(by.math_level_5.reason, /2021|saturated|MATH-500/i);
  assert.equal(by.frontiermath_erdos?.decision, 'exclude');
  assert.match(by.frontiermath_erdos.reason, /0\.0|no signal|in_eci/i);
  for (const board of ['math_level_5', 'frontiermath_erdos']) {
    const family = board.replaceAll('_', '-');
    assert.ok(!json('data/raw/benchmarks/registry.json').entries.some((e) => e.family === family), `${family} is not in the registry`);
    assert.ok(!json('data/raw/benchmarks/collection-plan.json').entries.some((e) => e.benchmark_id.startsWith(`${family}::`)), `${family} is not in the plan`);
    assert.ok(!(family in json('data/benchmaxxing-tiers.json').tiers), `${family} has no tier`);
  }
});

test('CR-54.2: Benchmaxxing tiers are deliberate', () => {
  const tiers = json('data/benchmaxxing-tiers.json').tiers;
  assert.equal(tiers['chess-puzzles'].tier, 'heldout');
  assert.equal(tiers['mystery-game-puzzles'].tier, 'heldout');
  assert.equal(tiers['ebr-bench'].tier, 'heldout');
  assert.equal(tiers['mirrorcode'].tier, 'secondary');
  assert.equal(tiers['epoch-gpqa-diamond'].tier, 'headline');
  assert.equal(tiers['epoch-swe-bench-verified'].tier, 'secondary');
  for (const k of Object.keys(IDS)) assert.ok(tiers[k.split('::')[0]].reason.length > 20, k);
});

test('CR-54.2: every join re-derives from the slug and lands on an existing configuration', () => {
  const catalog = new Map(json('data/dataset.json').models.map((m) => [m.id, m]));
  const map = json('data/raw/benchmarks/identity-map.json').entries.filter((e) => e.benchmark_id in IDS);
  assert.equal(map.length, 186, String(map.length));
  const counts = Object.fromEntries(Object.keys(IDS).map((id) => [id, 0]));
  for (const e of map) {
    counts[e.benchmark_id] += 1;
    const { family, effort } = parseDeepSweId(e.source_id);
    const model = catalog.get(e.model_id);
    assert.ok(model, e.model_id);
    assert.equal(model.family_key, family, e.source_id);
    assert.equal(model.variant, effort ?? 'default', e.source_id);
    assert.match(e.rule, /./, 'every join names its reviewed rule');
  }
  assert.deepEqual(counts, {
    'chess-puzzles::snapshot-2026-09-18': 58,
    'mystery-game-puzzles::snapshot-2026-09-18': 37,
    'ebr-bench::snapshot-2026-09-18': 14,
    'mirrorcode::snapshot-2026-09-18': 5,
    'epoch-gpqa-diamond::snapshot-2026-09-18': 63,
    'epoch-swe-bench-verified::snapshot-2026-09-18': 9,
  });
  // Fail closed: dated checkpoint slugs and unstated efforts on multi-configuration families are not rewritten.
  assert.ok(!map.some((e) => e.source_id === 'qwen3.8-max-0902_xhigh'));
  assert.ok(!map.some((e) => e.source_id === 'qwen3-30b-a3b-thinking-2507'));
  const scores = json('data/raw/benchmarks/scores.json').observations;
  const joined = scores.filter((o) => o.benchmark_id in IDS && o.subject.model_id);
  assert.equal(joined.length, 189, String(joined.length));
  // 186 reviewed-map rows + MiniMax-M3 on three boards: 'MiniMax-M3' is the catalog display name and
  // parseDeepSweId fails closed on the case, so only the documented exact-name bridge may join it.
  const mapKeys = new Set(map.map((e) => `${e.benchmark_id}\0${e.source_id}`));
  const bridged = joined.filter((o) => !mapKeys.has(`${o.benchmark_id}\0${o.subject.source_id}`));
  assert.deepEqual(bridged.map((o) => [o.benchmark_id.split('::')[0], o.subject.source_id]).sort(), [
    ['chess-puzzles', 'MiniMax-M3'], ['epoch-gpqa-diamond', 'MiniMax-M3'], ['mystery-game-puzzles', 'MiniMax-M3'],
  ]);
  for (const o of bridged) {
    assert.equal(o.subject.model_id, 'minimax-m3::default', o.id);
    assert.match(o.join_note, /^Exact display name, unique default catalog configuration/, o.id);
  }
  const entryByKey = new Map(map.map((e) => [`${e.benchmark_id}\0${e.source_id}`, e]));
  for (const o of joined.filter((x) => !bridged.includes(x))) {
    const entry = entryByKey.get(`${o.benchmark_id}\0${o.subject.source_id}`);
    assert.ok(entry?.reviewed_at, `${o.id} has a per-entry review date`);
    assert.match(o.join_note, new RegExp(`^Reviewed identity map ${entry.reviewed_at}: `), o.id);
  }
});
