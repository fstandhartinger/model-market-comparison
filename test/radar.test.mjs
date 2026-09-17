import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildBenchmarkView, latestScores, normalize, selectBenchmarkView } from '../lib/benchmark-view.mjs';
import { axisRange, defaultComparePicks, defaultRadarAxes, detailedRadarAxes, formatRadarValue, radarPercentile, radarPosition, radarScale, scaleNote } from '../lib/radar.mjs';

const row = (modelId, value, extra = {}) => ({ id: `${modelId}:${value}`, modelId, subjectId: modelId, value, date: '2026-09-14', basis: 'measured', lowSample: false, ...extra });
const axis = (extra) => ({ id: extra.family, benchmarkId: extra.family, name: extra.family, version: '1', category: 'Coding', cohort: 'Published board', unit: 'points', higherBetter: true, scores: [], stats: { n: 20, min: 10, max: 56 }, ...extra });

test('CR-14.2 regression: ~55 on the 0–100 AA Coding Index plots a little past half, not near full', () => {
  const coding = axis({ family: 'aa_coding_index' });
  assert.equal(radarScale(55, coding).value, 55);
  assert.equal(radarScale(55, coding).scale, 'fixed');
  assert.ok(normalize(55, coding.stats, true) > 95, 'the old peer min-max position was near full');
});

test('fixed scales: registry range, fraction and percent units, lower-is-better reversed and clamped', () => {
  assert.equal(radarScale(0.55, axis({ family: 'x', unit: 'fraction', publishedRange: [0, 1] })).value, 55);
  assert.equal(radarScale(0.3, axis({ family: 'x', unit: 'fraction' })).value, 30);
  assert.equal(radarScale(80, axis({ family: 'x', unit: 'percent' })).value, 80);
  assert.equal(radarScale(40, axis({ family: 'x', publishedRange: [0, 100], higherBetter: false })).value, 60);
  assert.equal(radarScale(120, axis({ family: 'x', publishedRange: [0, 100] })).value, 100);
  assert.deepEqual(axisRange(axis({ family: 'x', unit: 'points', publishedRange: [null, null] })), null);
});

test('open-ended metrics (Elo, ECI) use the measured peer range and say so; unknown direction or value is never drawn', () => {
  const elo = axis({ family: 'frontend', unit: 'Elo', stats: { n: 40, min: 1000, max: 1400 } });
  assert.deepEqual(radarScale(1200, elo), { value: 50, scale: 'peer', range: [1000, 1400] });
  assert.match(scaleNote(radarScale(1200, elo), 'Elo'), /no fixed scale/);
  assert.equal(radarScale(1200, { ...elo, stats: { n: 1, min: 1200, max: 1200 } }), null);
  assert.equal(radarScale(50, axis({ family: 'x', higherBetter: null })), null);
  for (const v of [null, undefined, NaN]) assert.equal(radarScale(v, axis({ family: 'aa_coding_index' })), null);
});

test('CR-14.3 exact values: fractions as percentages, Elo whole, ECI with unit', () => {
  assert.equal(formatRadarValue(0.5531, 'fraction'), '55.3%');
  assert.equal(formatRadarValue(1335.4, 'Elo'), '1335 Elo');
  assert.equal(formatRadarValue(166.62, 'ECI'), '166.6 ECI');
  assert.equal(formatRadarValue(77.2, 'points'), '77.2');
  assert.equal(scaleNote(radarScale(55, axis({ family: 'aa_coding_index' })), 'points'), '55 on its 0–100 scale');
});

test('CR-14.4 default axes: one per family, newest version, families without data skipped', () => {
  const axes = [
    axis({ id: 'tb21', family: 'aa-terminal-bench', version: '2.1', stats: { n: 236 } }),
    axis({ id: 'tb40', family: 'aa-terminal-bench', version: '4.0', stats: { n: 149 } }),
    axis({ id: 'ii', family: 'aa_intelligence_index', version: 'snapshot-2026-09-14 (unversioned)' }),
    axis({ id: 'gpqa', family: 'aa-gpqa-diamond' }),
    axis({ id: 'thin', family: 'aa-hle', stats: { n: 1 } }),
  ];
  assert.deepEqual(defaultRadarAxes(axes), ['ii', 'tb40']);
});

test('CR-14.1 default pair: top two current families by AA Intelligence, each via its best-covered configuration', () => {
  const models = [
    { id: 'a::max', family: 'a' }, { id: 'a::high', family: 'a' }, { id: 'b::max', family: 'b' },
    { id: 'c::max', family: 'c', deprecated: true }, { id: 'd::high', family: 'd' },
  ];
  const view = {
    models,
    axes: [
      axis({ id: 'ii', family: 'aa_intelligence_index', scores: [row('a::max', 53), row('a::high', 51), row('b::max', 52), row('c::max', 60), row('d::high', 40)] }),
      axis({ id: 'fe', family: 'frontend', unit: 'Elo', scores: [row('a::high', 1300)] }),
    ],
    indexAxes: [axis({ id: 'eci', family: 'epoch_eci', unit: 'ECI', scores: [row('a::high', 164)] })],
  };
  assert.deepEqual(defaultComparePicks(view), ['a::high', 'b::max']);
  assert.deepEqual(defaultComparePicks({ models, axes: [] }), []);
});

test('CR-14.5 detailed axes: every plottable axis a compared model has, topics contiguous', () => {
  const axes = [
    axis({ id: 'z', family: 'z', category: 'Math', scores: [row('m', 0.4)], unit: 'fraction' }),
    axis({ id: 'y', family: 'y', category: 'Coding', scores: [row('m', 0.2)], unit: 'fraction' }),
    axis({ id: 'x', family: 'x', category: 'Coding', scores: [row('other', 0.9)], unit: 'fraction' }),
    axis({ id: 'w', family: 'w', category: 'Agentic', scores: [row('m', 1500, { lowSample: true })], unit: 'Elo' }),
  ];
  assert.deepEqual(detailedRadarAxes(axes, ['m'], 'native').map((a) => a.id), ['y', 'z']);
});

test('live dataset: ECI index axes exist outside view.axes (Benchmaxxing unchanged), picks follow AA data', async () => {
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const view = buildBenchmarkView(ds);
  assert.deepEqual(view.indexAxes.map((a) => a.family), ['epoch_eci', 'epoch_eci_software']);
  assert.ok(view.indexAxes.every((a) => a.scores.length >= 20 && a.stats.n >= 20));
  assert.ok(!view.axes.some((a) => a.family.startsWith('epoch_eci')));
  const picks = defaultComparePicks(view);
  const aa = view.axes.find((a) => a.family === 'aa_intelligence_index');
  const family = new Map(view.models.map((m) => [m.id, m]));
  const best = new Map();
  for (const r of latestScores(aa.scores)) { const m = family.get(r.modelId); if (m && !m.deprecated && !m.historical && !(best.get(m.family) >= r.value)) best.set(m.family, r.value); }
  const expected = [...best].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 2).map(([f]) => f);
  assert.deepEqual(picks.map((id) => family.get(id).family), expected);
  const selected = selectBenchmarkView(view, picks);
  assert.ok(selected.indexAxes.every((a) => a.scores.every((r) => picks.includes(r.modelId))));
  // CR-19.3: one DesignArena axis (Full-Stack), so seven default axes.
  assert.equal(defaultRadarAxes([...selected.axes, ...selected.indexAxes]).length, 7);
});

// F-107 / CR-65.17: one convention per polygon — percentile among measured models by default, native as the toggle.
const cohort = (values, extra = {}) => axis({ family: extra.family ?? 'c', ...extra, scores: values.map(([id, v]) => row(id, v)) });

test('F-107: on every axis the best compared model is plotted at the largest radius, under both conventions', () => {
  const models = ['a::high', 'b::x', 'c::x', 'd::x', 'e::x'];
  const axes = [
    cohort([['a::high', 51.2], ['b::x', 40], ['c::x', 30], ['d::x', 20], ['e::x', 10]], { family: 'aa_intelligence_index' }),
    cohort([['a::high', 1450], ['b::x', 1500], ['c::x', 1400], ['d::x', 1300], ['e::x', 1200]], { family: 'elo', unit: 'Elo', stats: { n: 5, min: 1200, max: 1500 } }),
    cohort([['a::high', 0.3], ['b::x', 0.5], ['c::x', 0.1], ['d::x', 0.7], ['e::x', 0.9]], { family: 'err', unit: 'fraction', higherBetter: false }),
    cohort([['a::high', 120], ['b::x', 150], ['c::x', 150], ['d::x', 90], ['e::x', 60]], { family: 'eci', stats: { n: 5, min: 60, max: 150 } }),
  ];
  for (const convention of ['percentile', 'native']) {
    for (const ax of axes) {
      const native = models.map((id) => latestScores(ax.scores).find((r) => r.modelId === id).value);
      const best = ax.higherBetter === false ? Math.min(...native) : Math.max(...native);
      const pos = models.map((id, k) => radarPosition(ax, id, native[k], convention).value);
      const top = Math.max(...pos);
      models.forEach((_, k) => { if (native[k] === best) assert.equal(pos[k], top, `${convention} ${ax.family}`); else assert.ok(pos[k] <= top); });
    }
  }
  assert.equal(radarPosition(axes[0], 'a::high', 51.2).value, 100, 'the #1 model on AA Intelligence sits on the rim, not near the centre');
  assert.equal(radarPosition(axes[0], 'a::high', 51.2, 'native').value, 51.2);
});

test('F-107: percentile positions say so, and too few measured families are never placed (no zero)', () => {
  const ax = cohort([['a::1', 10], ['b::1', 20], ['c::1', 30], ['d::1', 40], ['e::1', 50]]);
  const p = radarPercentile(ax, 'd::1');
  assert.deepEqual(p, { value: 75, scale: 'percentile', n: 5 });
  assert.equal(scaleNote(p, 'points'), 'p75 among 5 measured models');
  assert.equal(radarPercentile(cohort([['a::1', 10], ['a::2', 20], ['b::1', 30]]), 'b::1'), null);
  assert.equal(radarPercentile(ax, 'missing'), null);
});

test('F-108 (g): detailed axes put single-axis topics after every multi-axis topic', () => {
  const ids = ['m::1', 'n::1', 'o::1'];
  const mk = (id, category) => axis({ id, family: id, category, unit: 'fraction', scores: ids.map((mid, k) => row(mid, 0.2 + k * 0.1)) });
  const axes = [mk('a1', 'Agentic'), mk('c1', 'Coding'), mk('c2', 'Coding'), mk('l1', 'Long context'), mk('m1', 'Math'), mk('m2', 'Math')];
  assert.deepEqual(detailedRadarAxes(axes, ['m::1']).map((a) => a.id), ['c1', 'c2', 'm1', 'm2', 'a1', 'l1']);
});

test('F-107 live: the leading AA Intelligence Index family sits at p95 or above on the percentile radar', async () => {
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const view = buildBenchmarkView(ds);
  const aa = [...view.axes, ...view.indexAxes].find((a) => a.family === 'aa_intelligence_index' && !a.historical);
  const [best] = latestScores(aa.scores).filter((r) => !r.lowSample && Number.isFinite(r.value)).sort((x, y) => y.value - x.value);
  assert.ok(radarPercentile(aa, best.modelId).value >= 95, best.modelId);
});

test('F-107: a narrowed Compare view carries whole-catalog percentiles, a best-of row uses its variant', async () => {
  const { selectFamilyBenchmarkView } = await import('../lib/benchmark-view.mjs');
  const { withRadarPercentiles } = await import('../lib/radar.mjs');
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const view = buildBenchmarkView(ds);
  const picks = defaultComparePicks(view);
  const narrowed = withRadarPercentiles(selectFamilyBenchmarkView(view, picks), view);
  const aaFull = [...view.axes, ...view.indexAxes].find((a) => a.family === 'aa_intelligence_index' && !a.historical);
  const aa = [...narrowed.axes, ...narrowed.indexAxes].find((a) => a.id === aaFull.id);
  assert.equal(aa.percentileN, radarPercentile(aaFull, latestScores(aaFull.scores)[0].modelId).n);
  for (const id of narrowed.picks ?? picks) {
    const row = latestScores(aa.scores).find((r) => r.modelId === id);
    if (!row) continue;
    assert.equal(radarPercentile(aa, id).value, Math.round(radarPercentile(aaFull, row.variantId ?? id).value * 1000) / 1000);
  }
  assert.ok(radarPercentile(aa, (narrowed.picks ?? picks)[0]).value >= 95, 'the leading family sits at the rim in Compare too');
});
