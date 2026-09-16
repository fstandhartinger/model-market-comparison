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

test('scoreBenchmaxxing gives within-topic zig-zags more signal than smooth domain specialization', () => {
  const peers = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`p${i}`, i * 10]));
  const a = (id, category, smooth, jagged) => axis(id, category, { ...peers, smooth, jagged });
  const v = {
    models: [{ id: 'smooth', name: 'Smooth', org: 'Test' }, { id: 'jagged', name: 'Jagged', org: 'Test' }],
    axes: [
      a('code-a', 'Coding', 90, 95), a('code-b', 'Coding', 88, 20), a('code-c', 'Coding', 86, 92), a('code-d', 'Coding', 89, 25),
      a('writing-a', 'Writing', 30, 50), a('writing-b', 'Writing', 32, 48), a('writing-c', 'Writing', 31, 52), a('writing-d', 'Writing', 33, 49),
    ],
  };
  const smooth = scoreBenchmaxxing(v, 'smooth');
  const jagged = scoreBenchmaxxing(v, 'jagged');
  assert.equal(smooth.status, 'scored');
  assert.equal(jagged.status, 'scored');
  assert.ok(jagged.score > smooth.score, 'within-topic oscillation outranks smooth cross-domain specialization');
  assert.ok(smooth.domainSpecialization > 0, 'specialization remains disclosed, not folded into anomaly score');
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

test('scoreBenchmaxxing refuses a score below the comparison and topic floor', () => {
  // 5 measured axes in one topic: 4 comparisons, 1 topic -> not scored.
  // A third family keeps each axis a real cohort (CR-22.1: percentiles need >= 3 model families).
  const axes = Array.from({ length: 5 }, (_, i) => axis(`code-${i}`, 'Coding', { smooth: 50 + i, jagged: i % 2 ? 10 : 90, peer: 40 + i }));
  const out = scoreBenchmaxxing(view(axes), 'jagged');
  assert.equal(out.status, 'insufficient-coverage');
  assert.equal(out.score, null);
  assert.equal(out.comparisons, 4);
  assert.equal(out.topics, 1);
});

test('scoreBenchmaxxing does not depend on axis order within a topic', () => {
  const peers = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`p${i}`, i * 10]));
  const values = [95, 20, 90, 25, 60];
  const build = (names) => ({
    models: [{ id: 'm', name: 'M', org: 'T' }],
    axes: [
      ...names.map((name, i) => axis(name, 'Coding', { ...peers, m: values[i] })),
      axis('w-a', 'Writing', { ...peers, m: 40 }), axis('w-b', 'Writing', { ...peers, m: 45 }), axis('w-c', 'Writing', { ...peers, m: 42 }),
    ],
  });
  const a = scoreBenchmaxxing(build(['a', 'b', 'c', 'd', 'e']), 'm');
  const b = scoreBenchmaxxing(build(['e', 'a', 'd', 'b', 'c']), 'm');
  assert.equal(a.status, 'scored');
  assert.ok(Math.abs(a.rawScore - b.rawScore) < 1e-9, 'renaming axes (changing their alphabetical order) leaves the score unchanged');
});

test('Benchmaxxing tag rate does not concentrate on low-coverage models (synthetic catalog)', () => {
  // Every model has the SAME underlying unevenness; only coverage differs.
  let seed = 7;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const models = Array.from({ length: 200 }, (_, i) => ({ id: `m${i}`, name: `m${i}`, org: 'T', sparse: i % 2 === 0 }));
  const topics = ['Coding', 'Writing', 'Math'];
  const axesList = [];
  for (const topic of topics) for (let k = 0; k < 7; k += 1) {
    const entries = [];
    for (const m of models) {
      if (m.sparse && k >= 3) continue; // sparse models: 3 per topic -> 6 comparisons; dense: 7 per topic -> 18
      entries.push([m.id, 50 + (rand() - 0.5) * 60]);
    }
    axesList.push(catalogAxis(`${topic}-${k}`, topic, entries));
  }
  const v = { models, axes: axesList };
  const { reports, tagged } = benchmaxxingSignals(v);
  assert.equal(reports.length, 200, 'both coverage levels meet the floor');
  const sparseTagged = models.filter((m) => m.sparse && tagged.has(m.id)).length;
  const denseTagged = models.filter((m) => !m.sparse && tagged.has(m.id)).length;
  assert.ok(sparseTagged <= denseTagged * 2 + 2, `sparse ${sparseTagged} vs dense ${denseTagged}`);
  const raw = [...models].filter((m) => m.sparse).map((m) => scoreBenchmaxxing(v, m.id));
  assert.ok(raw.every((r) => r.score !== r.rawScore || r.rawScore === r.shrinkage.priorMean), 'scores are shrunk toward the catalog mean');
});

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

// CR-65.5 (data & math gauntlet B1): release test. A simulated catalog WITHOUT any benchmaxxing — every axis is
// skill plus independent noise — must not tag mid-table models preferentially: the tagged share (strong + weak)
// in each level tercile stays within ±10 percentage points of the overall share. The unadjusted spread fails
// this (mid-pack models spread most because percentiles are bounded), which the second assertion pins.
test('CR-65.5: without benchmaxxing, tags spread evenly across level bands (null simulation)', () => {
  for (const seed0 of [7, 11, 23]) {
    let seed = seed0;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gauss = () => Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());
    const models = Array.from({ length: 300 }, (_, i) => ({ id: `m${i}`, skill: gauss() }));
    const axes = [];
    for (const topic of ['Coding', 'Math', 'Agentic']) for (let k = 0; k < 5; k += 1) {
      axes.push({ ...axis(`${topic}-${k}`, topic, {}), scores: models.map((m) => ({ modelId: m.id, value: m.skill + 0.45 * gauss(), basis: 'measured', lowSample: false })) });
    }
    const v = { models, axes };
    const { reports, tagged, weak } = benchmaxxingSignals(v);
    assert.equal(reports.length, 300);
    assert.ok(reports.every(([, r]) => r.levelAdjustment), 'a catalog this size is level-adjusted');
    const level = new Map(reports.map(([id, r]) => [id, r.levelAdjustment.level]));
    const bands = [[0, 100 / 3], [100 / 3, 200 / 3], [200 / 3, 101]];
    const share = (set) => bands.map(([lo, hi]) => { const ids = reports.map(([id]) => id).filter((id) => level.get(id) >= lo && level.get(id) < hi); return ids.filter((id) => set(id)).length / ids.length; });
    const overall = (tagged.size + weak.size) / reports.length;
    for (const s of share((id) => tagged.has(id) || weak.has(id))) assert.ok(Math.abs(s - overall) <= 0.10, `seed ${seed0}: band share ${s.toFixed(3)} vs overall ${overall.toFixed(3)}`);
    // Power check: ranking by the unadjusted spread puts most of the same number of models in the middle band.
    const byRaw = [...reports].sort((a, b) => b[1].rawScore - a[1].rawScore).slice(0, tagged.size + weak.size).map(([id]) => id);
    const mid = byRaw.filter((id) => level.get(id) >= 100 / 3 && level.get(id) < 200 / 3).length / byRaw.length;
    assert.ok(mid > 0.6, `seed ${seed0}: unadjusted spread is mid-table heavy (${mid.toFixed(2)})`);
  }
});

test('CR-65.5: the expected-spread fit recovers a known quadratic and is not applied to a tiny catalog', async () => {
  const { fitLevelCurve, BENCHMAXX_LEVEL_MIN_MODELS } = await import('../lib/benchmax.mjs');
  const truth = (m) => -3.9 + 1.04 * m - 0.0098 * m * m;
  const curve = fitLevelCurve(Array.from({ length: 21 }, (_, i) => ({ x: i * 5, y: truth(i * 5) })));
  for (const m of [10, 50, 90]) assert.ok(Math.abs(curve.at(m) - truth(m)) < 1e-6, `fit at ${m}`);
  assert.equal(fitLevelCurve([{ x: 1, y: 1 }, { x: 2, y: 2 }]), null);
  assert.ok(BENCHMAXX_LEVEL_MIN_MODELS >= 20);
  const peers = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`p${i}`, i * 10]));
  const small = { models: [{ id: 'm' }], axes: ['a', 'b', 'c', 'd'].flatMap((k) => [axis(`c-${k}`, 'Coding', { ...peers, m: 50 }), axis(`w-${k}`, 'Writing', { ...peers, m: 60 })]) };
  assert.equal(scoreBenchmaxxing(small, 'm').levelAdjustment, null);
});

test('CR-65.6 / CR-65.7: a thin model at the top is untagged; judged and Uncensored axes do not move the signal', async () => {
  const { BENCHMAXX_TAG_MIN_COMPARISONS, BENCHMAXX_MIN_SHRINK, isSignalAxis } = await import('../lib/benchmax.mjs');
  assert.ok(BENCHMAXX_TAG_MIN_COMPARISONS >= 10);
  assert.ok(BENCHMAXX_MIN_SHRINK >= 6);
  // 40 smooth peers with 12 comparisons each and one very jagged model with only 8 comparisons.
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const models = Array.from({ length: 40 }, (_, i) => ({ id: `p${i}` })).concat([{ id: 'thin' }]);
  const axes = [];
  for (const topic of ['Coding', 'Math', 'Agentic']) for (let k = 0; k < 5; k += 1) {
    const entries = models.filter((m) => m.id !== 'thin' || k < 4).map((m, i) => [m.id, m.id === 'thin' ? (k % 2 ? 0 : 100) : i * 2 + rnd() * 10]);
    axes.push(catalogAxis(`${topic}-${k}`, topic, entries));
  }
  const v = { models, axes };
  const thin = scoreBenchmaxxing(v, 'thin');
  assert.equal(thin.comparisons, 9);
  const { reports, tagged, weak } = benchmaxxingSignals(v);
  assert.equal(reports[0][0], 'thin', 'the thin model has the highest score');
  assert.ok(!tagged.has('thin') && !weak.has('thin'), 'but fewer than 10 comparisons never carry a named tag');
  // A judged axis and an Uncensored axis with a wild value leave the score unchanged.
  const withNoise = { models, axes: [...axes,
    { ...catalogAxis('judged-a', 'Coding', models.map((m, i) => [m.id, m.id === 'p3' ? 100 : i])), judged: true },
    { ...catalogAxis('judged-b', 'Coding', models.map((m, i) => [m.id, m.id === 'p3' ? 0 : i])), judged: true },
    catalogAxis('ugi-a', 'Uncensored', models.map((m, i) => [m.id, m.id === 'p3' ? 100 : i])),
    catalogAxis('ugi-b', 'Uncensored', models.map((m, i) => [m.id, m.id === 'p3' ? 0 : i])),
  ] };
  assert.equal(isSignalAxis(withNoise.axes.at(-1)), false);
  assert.equal(isSignalAxis(withNoise.axes.at(-3)), false);
  assert.equal(scoreBenchmaxxing(withNoise, 'p3').score, scoreBenchmaxxing(v, 'p3').score);
});
