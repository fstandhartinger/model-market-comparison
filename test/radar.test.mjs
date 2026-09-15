import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildBenchmarkView, latestScores, normalize, selectBenchmarkView } from '../lib/benchmark-view.mjs';
import { axisRange, defaultComparePicks, defaultRadarAxes, detailedRadarAxes, formatRadarValue, radarScale, scaleNote } from '../lib/radar.mjs';

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
  assert.deepEqual(detailedRadarAxes(axes, ['m']).map((a) => a.id), ['y', 'z']);
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
  assert.equal(defaultRadarAxes([...selected.axes, ...selected.indexAxes]).length, 8);
});
