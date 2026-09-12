import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildBenchmarkView, cohortOf, distribution, latestScores, normalize, profileAnomalies, selectBenchmarkView } from '../lib/benchmark-view.mjs';

const row = (id, value, extra = {}) => ({ id, modelId: id, subjectId: id, value, date: '2026-09-10', basis: 'measured', lowSample: false, ...extra });
test('radar preserves zero, reverses lower-better, and withholds missing or uninformative ranges', () => {
  const stats = { n: 20, min: -10, max: 30 };
  assert.equal(normalize(0, stats, true), 25);
  assert.equal(normalize(0, stats, false), 75);
  assert.equal(normalize(-10, stats, true), 0);
  for (const value of [null, undefined, NaN, Infinity]) assert.equal(normalize(value, stats, true), null);
  assert.equal(normalize(20, { n: 1, min: 20, max: 20 }, true), null);
  assert.equal(normalize(20, { n: 20, min: 20, max: 20 }, true), null);
  assert.equal(normalize(20, stats, null), null);
});
test('observation selection prefers measured and latest, never highest or vendor-derived claims', () => {
  const rows = [row('old', 99, { modelId: 'a', date: '2025-01-01' }), row('new', 40, { modelId: 'a' }), row('vendor', 100, { modelId: 'a', basis: 'self_reported', derived: true, date: '2026-10-01' })];
  assert.equal(latestScores(rows)[0].value, 40);
  assert.equal(latestScores(rows, 'all')[0].value, 40);
  assert.equal(latestScores(rows, 'self_reported')[0].value, 100);
});
test('peer distribution excludes unmatched identities, claims, low battle counts, and duplicate source identities', () => {
  const models = ['a','b','clone','c','d'].map((id) => ({ id, family: id }));
  const scores = [row('a', 0), row('b', 10), row('clone', 10, { subjectId: 'b' }), row('c', 900, { basis: 'self_reported' }), row('d', 500, { lowSample: true }), row('unmatched', 1000, { modelId: null })];
  assert.deepEqual(distribution({ scores }, models), { n: 2, families: 2, mean: 5, sd: 5, min: 0, max: 10 });
});
function fixture({ target = 100, lower = false, allStrong = false, peerCount = 20, familyCount = 10, axesCount = 6 } = {}) {
  const models = [{ id: 'target', family: 'target' }, ...Array.from({ length: peerCount }, (_, i) => ({ id: `p${i}`, family: `f${i % familyCount}` }))];
  const axes = Array.from({ length: axesCount }, (_, i) => {
    const scores = [row('target', i === 0 || allStrong ? target : 0), ...models.slice(1).map((m, i) => row(m.id, i % 2 ? -1 : 1))];
    const axis = { id: `axis${i}`, family: `bench${i}`, scores, higherBetter: i === 0 ? !lower : true };
    return { ...axis, stats: distribution(axis, models) };
  });
  return { models, axes };
}
test('profile flags require both relative strength and peer deviation and expose independently computable inputs', () => {
  const view = fixture(), result = profileAnomalies(view, 'target');
  assert.equal(result.flags.length, 1);
  const f = result.flags[0];
  assert.equal(f.direction, 'strong'); assert.equal(f.profileN, 5); assert.equal(f.peers, 21);
  assert.ok(Math.abs(f.mean - 100 / 21) < 1e-10);
  assert.ok(Math.abs(f.z - (100 - f.mean) / f.sd) < 1e-10);
  assert.equal(f.baseline, 0); assert.equal(f.gap, f.z);
  assert.equal(profileAnomalies(fixture({ allStrong: true }), 'target').flags.length, 0);
  assert.equal(profileAnomalies(fixture({ target: -100 }), 'target').flags[0].direction, 'weak');
  assert.equal(profileAnomalies(fixture({ target: -100, lower: true }), 'target').flags[0].direction, 'strong');
});
test('tiny peer groups, narrow family coverage, and insufficient model profile never trigger flags', () => {
  for (const settings of [{ peerCount: 18 }, { familyCount: 8 }, { axesCount: 5 }]) assert.equal(profileAnomalies(fixture(settings), 'target').flags.length, 0);
  const view = fixture({ axesCount: 5 }); view.axes.push({ ...view.axes[1], id: 'other-version' });
  assert.equal(profileAnomalies(view, 'target').flags.length, 0, 'repeating another version is not another benchmark family');
});
test('explicit CoT settings, dataset splits, and harnesses create separate evaluation axes', () => {
  const make = (configuration, harness = null) => ({ id: 'test', benchmark_id: 'test::v2', subject: { harness }, protocol: `protocol; source row: ${JSON.stringify({ configuration })}` });
  assert.notEqual(cohortOf(make('with CoT')), cohortOf(make('without CoT')));
  assert.notEqual(cohortOf(make('validation')), cohortOf(make('test')));
  assert.notEqual(cohortOf(make(null, 'Codex')), cohortOf(make(null, 'Claude Code')));
});
test('two harnesses of one model stay separate axes and rows, never merged', () => {
  const observation = (harness, value) => ({
    id: `realswe:${harness}`, benchmark_id: 'realswe::snapshot-2026-09-12',
    subject: { model_id: null, source_id: `realswe:${harness}`, name: 'GPT-6 Astra', harness, variant: null },
    value, unit: 'percent', basis: 'measured', protocol: 'Real-SWE public leaderboard',
    confidence_interval: { level: 0.95, lower: value, upper: value },
    source: { url: 'https://realswe.withspecific.com/', retrieved_at: '2026-09-12', published_at: null, file: 'evidence' },
  });
  const ds = {
    models: [],
    sources: { artificialanalysis: '2026-09-01', designarena: '2026-09-01' },
    benchmark_results: {
      registry: [{ id: 'realswe::snapshot-2026-09-12', family: 'realswe', name: 'Real-SWE', version: 'snapshot-2026-09-12',
        category: 'Coding', one_sentence_description: 'Resolution rate on a public sample.', scoring: { unit: 'percent', higher_better: true },
        primary_url: 'https://realswe.withspecific.com/' }],
      observations: [observation('Codex CLI', 20), observation('Claude Code', 30)],
      collections: [],
    },
  };
  const axes = buildBenchmarkView(ds).axes.filter((a) => a.benchmarkId === 'realswe::snapshot-2026-09-12');
  assert.equal(axes.length, 2, 'each harness is its own axis');
  assert.deepEqual(axes.map((a) => a.cohort).sort(), ['Claude Code', 'Codex CLI']);
  for (const axis of axes) {
    assert.equal(axis.scores.length, 1);
    assert.equal(axis.scores[0].harness, axis.cohort);
    assert.equal(axis.scores[0].modelId, null);
  }
});
test('actual source adapter keeps all version identities, values and dated legacy inputs, without mutating data', async () => {
  const ds = JSON.parse(await readFile('data/dataset.json', 'utf8')), before = JSON.stringify(ds);
  const view = buildBenchmarkView(ds), ids = new Set(view.axes.map((a) => a.benchmarkId));
  for (const b of ds.benchmark_results.registry) assert.ok(ids.has(b.id), b.id);
  const byId = new Map(ds.benchmark_results.observations.map((o) => [o.id, o]));
  let count = 0;
  for (const a of view.axes) for (const r of a.scores) {
    if (r.id.startsWith('legacy:')) continue;
    const original = byId.get(r.id); count++;
    assert.equal(r.value, original.value); assert.equal(a.benchmarkId, original.benchmark_id);
    assert.equal(r.date, original.source.retrieved_at); assert.equal(view.sources[r.source].url, original.source.url);
  }
  assert.equal(count, byId.size);
  const old = view.axes.filter((a) => a.benchmarkId === 'aa-coding-agent-index::1.4');
  const current = view.axes.filter((a) => a.benchmarkId === 'aa-coding-agent-index::1.5');
  assert.ok(old.length && current.length);
  assert.ok(old.flatMap((a) => a.scores).every((r) => r.date === '2026-09-09'));
  const selected = selectBenchmarkView(view, ['gpt-5.6-sol::high']);
  assert.ok(selected.axes.flatMap((a) => a.scores).every((r) => r.modelId === 'gpt-5.6-sol::high'));
  assert.deepEqual(selected.axes.map((a) => a.stats), view.axes.map((a) => a.stats), 'peers independent of selection');
  assert.ok(JSON.stringify(selected).length < 500_000, 'initial benchmark payload bounded to selected models');
  assert.equal(JSON.stringify(ds), before);
});
