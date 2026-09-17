import test from 'node:test';
import assert from 'node:assert/strict';
import { BENCHMAXX_MIN_COMPARISONS, BENCHMAXX_MIN_TOPICS, benchmaxxingSignals, groupedRadarProfile, scoreBenchmaxxing } from '../lib/benchmax.mjs';

const axis = (id, category, values) => ({
  id, benchmarkId: id, name: id, category, family: category, version: 'v1', cohort: 'published',
  unit: 'points', higherBetter: true, scores: Object.entries(values).map(([modelId, value]) => ({ modelId, value, basis: 'measured', lowSample: false })),
});
const view = (axes) => ({
  models: [{ id: 'smooth', name: 'Smooth', org: 'Test' }, { id: 'jagged', name: 'Jagged', org: 'Test' }], axes,
});

test('groupedRadarProfile keeps semantic topic neighbors adjacent and leaves missing scores as gaps', () => {
  const v = view([
    axis('write', 'Writing', { smooth: 50, jagged: 50 }),
    axis('code-b', 'Coding', { smooth: 90, jagged: 20 }),
    axis('math', 'Math', { smooth: 45, jagged: 45 }),
    axis('code-a', 'Coding', { smooth: 88, jagged: 95 }),
    axis('missing', 'Coding', { smooth: 86 }),
  ]);
  const profile = groupedRadarProfile(v, 'jagged');
  assert.deepEqual(profile.axes.filter((a) => a.category === 'Coding').map((a) => a.id), ['code-a', 'code-b', 'missing']);
  assert.equal(profile.axes.find((a) => a.id === 'missing').value, null, 'no invented zero for missing score');
  assert.equal(profile.axes.find((a) => a.id === 'missing').missing, true);
});


test('scoreBenchmaxxing reports insufficient coverage instead of synthesizing a score', () => {
  const v = view([
    axis('code-a', 'Coding', { smooth: 90, jagged: 95 }),
    axis('code-b', 'Coding', { smooth: 88 }),
    axis('code-c', 'Coding', { smooth: 86 }),
    axis('writing-a', 'Writing', { smooth: 30 }),
  ]);
  const out = scoreBenchmaxxing(v, 'jagged');
  assert.equal(out.status, 'insufficient-coverage');
  assert.equal(out.score, null);
});

// B3 (review 2026-09-13): coverage must not decide the tag.
const catalogAxis = (id, category, entries) => axis(id, category, Object.fromEntries(entries));

test('real dataset: Benchmaxxing tag rate does not fall as coverage grows', async () => {
  const fs = await import('node:fs');
  const { buildBenchmarkView } = await import('../lib/benchmark-view.mjs');
  const ds = JSON.parse(fs.readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const v = buildBenchmarkView(ds);
  const { reports, tagged } = benchmaxxingSignals(v);
  assert.ok(reports.length >= 50, `enough scored models (${reports.length})`);
  for (const [, r] of reports) {
    assert.ok(r.comparisons >= BENCHMAXX_MIN_COMPARISONS && r.topics >= BENCHMAXX_MIN_TOPICS, 'every published score meets the coverage rule');
  }
  const byCoverage = [...reports].sort((a, b) => a[1].comparisons - b[1].comparisons);
  const half = Math.floor(byCoverage.length / 2);
  const rate = (rows) => rows.filter(([id]) => tagged.has(id)).length / rows.length;
  const low = rate(byCoverage.slice(0, half));
  const high = rate(byCoverage.slice(half));
  assert.ok(high >= low * 0.5, `tag rate high-coverage ${high.toFixed(3)} must not collapse vs low-coverage ${low.toFixed(3)}`);
});

// CR-65.7 (data & math gauntlet B5): a frontier-only board and an all-comers board rank different fields. The signal
// compares each pair of boards among the models measured on both, so identical orders give identical percentiles.
test('CR-65.7: two boards with the same order but different cohorts give a zero gap and no signal', async () => {
  const { pairDistances, BENCHMAXX_PAIR_MIN_MODELS } = await import('../lib/benchmax.mjs');
  const all = Array.from({ length: 40 }, (_, i) => [`f${i}::v`, i]);
  const frontier = all.slice(28); // the top 12 only, same order
  const open = catalogAxis('open', 'Coding', all), top = catalogAxis('top', 'Coding', frontier.map(([id, v]) => [id, v * 3 + 7]));
  const v = { models: all.map(([id]) => ({ id })), axes: [open, top] };
  const gaps = pairDistances(v, open, top);
  assert.equal(gaps.size, 12);
  for (const gap of gaps.values()) assert.equal(gap, 0, 'same order → same common-cohort percentile');
  // A pair whose common cohort is too small says nothing.
  const tiny = catalogAxis('tiny', 'Coding', frontier.slice(0, BENCHMAXX_PAIR_MIN_MODELS - 1));
  assert.equal(pairDistances({ ...v, axes: [open, tiny] }, open, tiny), null);
});

