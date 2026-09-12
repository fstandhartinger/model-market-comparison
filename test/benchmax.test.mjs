// Benchmaxxing library tests: cross-benchmark fit quality gates, prediction
// intervals, version-locking, evidence blocking, and bottom-decile tags.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';
import {
  MIN_ABS_R,
  MIN_OVERLAP,
  DECILE_MIN_AXES,
  DECILE_MIN_FAMILIES,
  DECILE_MIN_PEERS,
  measuredAxisMaps,
  evidencedAxisMaps,
  computePairStats,
  observedRange,
  fitPair,
  predictionInterval,
  predictForModel,
  predictForAxis,
  topPairs,
  topPredictions,
  bottomDecileTags,
} from '../lib/benchmax.mjs';

const ds = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url)));
const view = buildBenchmarkView(ds);
const maps = measuredAxisMaps(view);
const evid = evidencedAxisMaps(view);
const stats = computePairStats(maps);

const row = (axisId, modelId, value, basis = 'measured', extra = {}) => ({
  id: `${axisId}:${modelId}:${basis}:${value}`,
  modelId,
  subjectId: modelId,
  value,
  basis,
  derived: basis === 'derived',
  source: 0,
  date: '2026-09-10',
  variant: null,
  lowSample: false,
  ...extra,
});
const mkAxis = (id, rows, { higherBetter = true, unit = 'points', family = id, category = 'Test', version = 'v1', publishedRange = null } = {}) => ({
  id,
  benchmarkId: id,
  family,
  name: id,
  version,
  category,
  unit,
  higherBetter,
  publishedRange,
  cohort: 'Published board',
  url: '',
  scores: rows,
  stats: { n: 0, families: 0, mean: null, sd: null, min: null, max: null },
});
const mkModels = (n, prefix = 'm') => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, name: `${prefix}${i}`, org: 'org' }));
const viewOf = (axes, models) => ({ models, axes, sources: [], divergences: [], missing: [], generatedAt: 't', registryCount: 0, legacyDate: '2026-01-01' });
const rowsFor = (axisId, models, f) => models.map((m, i) => row(axisId, m.id, f(i)));

function linearMaps() {
  return new Map([
    ['a', new Map(Array.from({ length: 20 }, (_, i) => [`m${i}`, i]))],
    ['b', new Map(Array.from({ length: 20 }, (_, i) => [`m${i}`, 2 * i + 3]))],
    ['weak', new Map(Array.from({ length: 20 }, (_, i) => [`m${i}`, i % 2]))],
    ['few', new Map(Array.from({ length: 11 }, (_, i) => [`m${i}`, i]))],
    ['flat', new Map(Array.from({ length: 20 }, (_, i) => [`m${i}`, 42]))],
  ]);
}

test('fitPair recovers an exact linear relationship', () => {
  const st = fitPair([0, 1, 2, 3], [3, 5, 7, 9]);
  assert.ok(st);
  assert.equal(st.n, 4);
  assert.ok(Math.abs(st.slope - 2) < 1e-12);
  assert.ok(Math.abs(st.intercept - 3) < 1e-9);
  assert.equal(st.r, 1);
  assert.equal(st.r2, 1);
  assert.equal(st.minX, 0);
  assert.equal(st.maxX, 3);
  assert.equal(st.meanX, 1.5);
  assert.equal(st.meanY, 6);
  assert.equal(st.residSd, 0);
  const iv = predictionInterval(4, st);
  assert.ok(Math.abs(iv.point - 11) < 1e-9);
  assert.ok(iv.half < 1e-9);
  assert.equal(iv.low, iv.high);
});

test('fitPair rejects degenerate and non-finite inputs', () => {
  assert.equal(fitPair([1, 2], [1, 2]), null, 'n<3 rejected');
  assert.equal(fitPair([1, 2, 3], [1, 2]), null, 'length mismatch');
  assert.equal(fitPair([7, 7, 7], [1, 2, 3]), null, 'constant x');
  assert.equal(fitPair([5, 5, 5], [5, 5, 5]), null, 'constant y');
  assert.equal(fitPair([1, 2, NaN], [1, 2, 3]), null, 'non-finite');
  assert.equal(fitPair([1, 2, 3], [4, Infinity, 6]), null, 'non-finite y');
});

test('prediction interval contracts to zero on a perfect fit and widens on noise', () => {
  const exact = fitPair([0, 1, 2, 3, 4], [1, 3, 5, 7, 9]);
  const exactIv = predictionInterval(10, exact);
  assert.ok(Math.abs(exactIv.point - 21) < 1e-9);
  assert.ok(exactIv.half < 1e-9);
  const noisy = fitPair([0, 1, 2, 3, 4], [1, 5, 3, 9, 7]);
  assert.ok(noisy && noisy.residSd > 0);
  const iv = predictionInterval(2, noisy);
  assert.ok(iv.low < iv.point && iv.point < iv.high);
  const near = predictionInterval(noisy.meanX, noisy);
  const far = predictionInterval(noisy.meanX + 20, noisy);
  assert.ok(far.half > near.half, 'leverage widens the interval away from the cohort mean');
});

test('computePairStats keeps only gated pairs in both directions', () => {
  const out = computePairStats(linearMaps());
  assert.ok(out.get('a|b'), 'strong pair kept');
  assert.ok(out.get('b|a'), 'both directions stored');
  assert.ok(Math.abs(out.get('a|b').r - 1) < 1e-12);
  assert.ok(Math.abs(out.get('a|b').slope - 2) < 1e-9);
  assert.ok(Math.abs(out.get('b|a').slope - 0.5) < 1e-9);
  assert.equal(out.get('a|weak'), undefined, 'weak correlation excluded');
  assert.equal(out.get('a|few'), undefined, 'fewer than 12 overlaps excluded');
  assert.equal(out.get('a|flat'), undefined, 'zero variance excluded');
});

test('fitPair rejects degenerate and non-finite inputs', () => {
  assert.equal(fitPair([1, 2], [1, 2]), null, 'n<3 rejected');
  assert.equal(fitPair([1, 2, 3], [1, 2]), null, 'length mismatch');
  assert.equal(fitPair([7, 7, 7], [1, 2, 3]), null, 'constant x');
  assert.equal(fitPair([5, 5, 5], [5, 5, 5]), null, 'constant y');
  assert.equal(fitPair([1, 2, NaN], [1, 2, 3]), null, 'non-finite');
  assert.equal(fitPair([1, 2, 3], [4, Infinity, 6]), null, 'non-finite y');
});

test('fitPair recovers an exact linear relationship', () => {
  const st = fitPair([0, 1, 2, 3], [3, 5, 7, 9]);
  assert.ok(st);
  assert.equal(st.n, 4);
  assert.ok(Math.abs(st.slope - 2) < 1e-12);
  assert.ok(Math.abs(st.intercept - 3) < 1e-9);
  assert.equal(st.r, 1);
  assert.equal(st.r2, 1);
  assert.equal(st.minX, 0);
  assert.equal(st.maxX, 3);
  assert.equal(st.meanX, 1.5);
  assert.equal(st.meanY, 6);
  assert.equal(st.residSd, 0);
  const iv = predictionInterval(10, st);
  assert.ok(Math.abs(iv.point - 23) < 1e-9);
  assert.ok(iv.half < 1e-9);
  assert.equal(iv.low, iv.high);
});

test('prediction interval contracts to zero on a perfect fit and widens on noise', () => {
  const exact = fitPair([0, 1, 2, 3, 4], [1, 3, 5, 7, 9]);
  const iv0 = predictionInterval(10, exact);
  assert.ok(iv0.half < 1e-9);
  const noisy = fitPair([0, 1, 2, 3, 4], [1, 5, 3, 9, 7]);
  assert.ok(noisy && noisy.residSd > 0);
  const iv = predictionInterval(2, noisy);
  assert.ok(iv.low < iv.point && iv.point < iv.high);
  const near = predictionInterval(noisy.meanX, noisy);
  const far = predictionInterval(noisy.meanX + 20, noisy);
  assert.ok(far.half > near.half, 'leverage widens the interval away from the cohort mean');
});

test('predictForModel estimates an exact value and honors evidence and gates', () => {
  const models = [...mkModels(20), { id: 'q', name: 'Q', org: 'org' }];
  const P = mkAxis('P', rowsFor('P', mkModels(20), (i) => i));
  const T = mkAxis('T', rowsFor('T', mkModels(20), (i) => 2 * i + 3));
  P.scores.push(row('P', 'q', 5));
  const first = viewOf([P, T], models);
  const miniMaps = measuredAxisMaps(first);
  const miniEvid = evidencedAxisMaps(first);
  const miniStats = computePairStats(miniMaps);
  assert.equal(miniStats.get('P|T').n, 20);
  const out = predictForModel(first, miniMaps, miniEvid, miniStats, 'q');
  const pred = out.predictions.find((p) => p.target.axisId === 'T');
  assert.ok(pred, 'missing results are predicted');
  assert.ok(Math.abs(pred.point - 13) < 1e-9, 'exact linear recovery');
  assert.ok(pred.half < 1e-9);
  assert.equal(pred.predictor.axisId, 'P');
  assert.equal(pred.predictorValue, 5);
  assert.equal(pred.n, 20);
  assert.equal(pred.r, 1);
  assert.equal(pred.outsideFitRange, false);
  assert.deepEqual(pred.target.observedRange, [3, 41]);

  const T2 = mkAxis('T', [...T.scores, row('T', 'q', 99, 'self_reported')]);
  const second = viewOf([P, T2], first.models);
  const out2 = predictForModel(second, measuredAxisMaps(second), evidencedAxisMaps(second), miniStats, 'q');
  assert.equal(out2.predictions.find((p) => p.target.axisId === 'T'), undefined, 'any evidence blocks prediction');

  assert.equal(predictForModel(first, measuredAxisMaps(first), evidencedAxisMaps(first), miniStats, 'nope'), null, 'unknown model returns null');
  const idle = viewOf([P, T], [...first.models, { id: 'z', name: 'Z', org: 'org' }]);
  assert.deepEqual(predictForModel(idle, measuredAxisMaps(idle), evidencedAxisMaps(idle), miniStats, 'z').predictions, [], 'no measured axes: no predictions');
});

test('predictForModel suppresses an extrapolated point outside a target’s documented score range', () => {
  const core = mkModels(12);
  const models = [...core, { id: 'q', name: 'Q', org: 'org' }];
  const predictor = mkAxis('P', rowsFor('P', core, (i) => i));
  // The documented fraction range is semantic: a negative point is impossible,
  // even though a linear extrapolation can calculate one.
  const target = mkAxis('T', rowsFor('T', core, (i) => 0.2 + i * 0.05), { unit: 'fraction', publishedRange: [0, 1] });
  predictor.scores.push(row('P', 'q', -10));
  const mini = viewOf([predictor, target], models);
  const out = predictForModel(mini, measuredAxisMaps(mini), evidencedAxisMaps(mini), computePairStats(measuredAxisMaps(mini)), 'q');
  assert.equal(out.predictions.find((p) => p.target.axisId === 'T'), undefined, 'impossible bounded points stay unknown rather than being clamped');

  const unbounded = mkAxis('E', rowsFor('E', core, (i) => 0.2 + i * 0.05), { unit: 'Elo' });
  const eloView = viewOf([predictor, unbounded], models);
  const eloOut = predictForModel(eloView, measuredAxisMaps(eloView), evidencedAxisMaps(eloView), computePairStats(measuredAxisMaps(eloView)), 'q');
  assert.ok(eloOut.predictions.find((p) => p.target.axisId === 'E' && p.point < 0), 'negative predictions remain eligible for targets with no documented finite range');
});

test('real Gemma prediction omits the impossible bounded Coding Agent v1.4 point', () => {
  const targetAxisId = 'aa-coding-agent-index::1.4@@Codex@@fraction';
  const target = view.axes.find((a) => a.id === targetAxisId);
  assert.deepEqual(target?.publishedRange, [0, 1], 'registry documents this fraction target as 0..1');
  const out = predictForModel(view, maps, evid, stats, 'gemma-3-12b-instruct::default', { limit: 100 });
  assert.ok(out);
  assert.equal(out.predictions.find((p) => p.target.axisId === targetAxisId), undefined, 'the former negative extrapolation is suppressed, never clamped');
});

test('predictForAxis predicts only models without evidence and rejects unknown axes', () => {
  const models = [...mkModels(20), { id: 'q', name: 'Q', org: 'org' }];
  const P = mkAxis('P', rowsFor('P', mkModels(20), (i) => i));
  const T = mkAxis('T', rowsFor('T', mkModels(20), (i) => 2 * i + 3));
  P.scores.push(row('P', 'q', 5));
  const first = viewOf([P, T], models);
  const miniMaps = measuredAxisMaps(first);
  const miniEvid = evidencedAxisMaps(first);
  const miniStats = computePairStats(miniMaps);
  const out = predictForAxis(first, measuredAxisMaps(first), evidencedAxisMaps(first), miniStats, 'T');
  assert.ok(out);
  assert.equal(out.axis.axisId, 'T');
  assert.equal(out.axis.name, 'T');
  assert.deepEqual(out.axis.observedRange, [3, 41]);
  const p = out.predictions.find((r) => r.model.id === 'q');
  assert.ok(p, 'model without evidence is predicted');
  assert.ok(Math.abs(p.point - 13) < 1e-9);
  assert.equal(p.predictor.axisId, 'P');
  assert.equal(p.n, 20);
  assert.equal(p.r, 1);
  assert.equal(p.outsideFitRange, false);
  assert.equal(predictForAxis(first, measuredAxisMaps(first), evidencedAxisMaps(first), computePairStats(measuredAxisMaps(first)), 'unknown'), null);
});

test('bottomDecileTags enforces peer count, direction, and family diversity', () => {
  const core = mkModels(25, 'd');
  const tgt = { id: 'tgt', name: 'Target', org: 'org' };
  const models = [...core, tgt];
  const mkax = (axId, family) => {
    const rows = core.map((m, i) => row(axId, m.id, i + 10));
    rows.push(row(axId, 'tgt', 0));
    return mkAxis(axId, rows, { family });
  };
  const axes = [mkax('A1', 'f1'), mkax('A2', 'f1'), mkax('A3', 'f2'), mkax('A4', 'f2')];
  axes.push(mkAxis('few', core.slice(0, 19).map((m) => row('few', m.id, 0)), { family: 'f0' }));
  axes.push(mkAxis('unk', core.map((m) => row('unk', m.id, 0)), { family: 'f0', higherBetter: null }));
  const v = viewOf(axes, models);
  const res = bottomDecileTags(v, {}, measuredAxisMaps(v));
  assert.equal(res.perAxis.has('few'), false, 'below peer minimum: no set');
  assert.equal(res.perAxis.has('unk'), false, 'unknown direction: no set');
  assert.equal(res.perAxis.get('A1').k, 2, 'floor(25/10)=2 tagged');
  assert.deepEqual(res.perAxis.get('A1').models.map((m) => m.modelId).sort(), ['d0', 'tgt'].sort(), 'lowest values tagged on higher-is-better');
  const agg = res.aggregate.find((a) => a.modelId === 'tgt');
  assert.ok(agg, 'target qualifies for aggregate tag');
  assert.equal(agg.count, 4);
  assert.deepEqual(new Set(agg.families), new Set(['f1', 'f2']));
  assert.equal(res.perAxis.get('A1').k, 2, 'floor(25/10)=2 tagged');

  const fewer = bottomDecileTags(viewOf(axes.slice(0, 3), models), {}, measuredAxisMaps(viewOf(axes.slice(0, 3), models)));
  assert.equal(fewer.aggregate.length, 0, 'aggregate needs >=4 axes');
  const sameFam = bottomDecileTags(viewOf(axes.slice(0, 4).map((a) => ({ ...a, family: 'one' })), models), {}, measuredAxisMaps(viewOf(axes.slice(0, 4).map((a) => ({ ...a, family: 'one' })), models)));
  assert.equal(sameFam.aggregate.length, 0, 'aggregate needs >=2 benchmark families');
});

test('bottomDecileTags is measured-only, direction-adjusted, and peer-gated', () => {
  const models = mkModels(25, 'w');
  const asc = mkAxis('asc', models.map((m, i) => row('asc', m.id, i)), { higherBetter: true });
  const desc = mkAxis('desc', models.map((m, i) => row('desc', m.id, i)), { higherBetter: false });
  const few = mkAxis('few', models.slice(0, 19).map((m, i) => row('few', m.id, i)));
  const unk = mkAxis('unk', models.map((m, i) => row('unk', m.id, i)), { higherBetter: null });
  const sr = mkAxis('sr', models.map((m, i) => row('sr', m.id, i)));
  sr.scores.push(row('sr', 'm99', -100, 'self_reported')); // vendor claim never enters the measured cohort
  const v = viewOf([asc, desc, sr, few, unk], models);
  const res = bottomDecileTags(v, {}, measuredAxisMaps(v));
  assert.deepEqual(res.perAxis.get('asc').models.map((m) => m.modelId).sort(), ['w0', 'w1'], 'lowest values tagged on higher-is-better');
  assert.deepEqual(res.perAxis.get('desc').models.map((m) => m.modelId).sort(), ['w23', 'w24'], 'highest values tagged on lower-is-better');
  assert.equal(res.perAxis.get('sr').models.some((m) => m.modelId === 'm99'), false, 'self-reported claims never join the measured cohort');
  assert.equal(res.perAxis.get('few'), undefined, 'needs >=20 measured peers');
  assert.equal(res.perAxis.get('unk'), undefined, 'unknown direction cannot tag');
});

test('topPairs ranks strongest signals and respects minimum samples', () => {
  const axesById = [mkAxis('a', []), mkAxis('b', []), mkAxis('weak', []), mkAxis('few', []), mkAxis('flat', [])];
  const mini = viewOf(axesById, []);
  const s = computePairStats(linearMaps());
  const tops = topPairs(mini, s, { limit: 10, minN: 20 });
  assert.ok(tops.length >= 2);
  assert.equal(tops[0].n >= 20, true);
  assert.ok(Math.abs(tops[0].r) >= Math.abs(tops[1].r));
  assert.ok(tops.every((t) => t.n >= 20 && Math.abs(t.r) >= MIN_ABS_R));
  assert.equal(topPairs(mini, computePairStats(linearMaps()), { limit: 10, minN: 21 }).length, 0, 'minN respected');
});

test('topPredictions emits only gated, version-locked, finite estimates', () => {
  const tops = topPredictions(view, maps, evid, stats, { limit: 8 });
  assert.ok(tops.length > 3);
  for (const p of tops) {
    assert.ok(p.n >= MIN_OVERLAP, 'gate n');
    assert.ok(Math.abs(p.r) >= MIN_ABS_R, 'gate r');
    assert.notEqual(p.target.axisId, p.predictor.axisId, 'distinct exact axes');
    assert.ok(Number.isFinite(p.point));
    assert.ok(p.low <= p.point && p.point <= p.high);
    assert.ok(Number.isFinite(p.predictorValue));
    assert.equal(maps.get(p.predictor.axisId)?.get(p.model.id), p.predictorValue);
    assert.equal(typeof p.outsideFitRange, 'boolean');
    assert.ok(!evid.get(p.target.axisId)?.has(p.model.id), 'never predicted over evidence');
    assert.ok(p.target.version.length > 0);
    assert.notEqual(p.target.axisId, p.predictor.axisId);
    assert.ok(p.target.version.length > 0);
  }
});

test('predictForModel and predictForAxis return null on unknown identifiers', () => {
  assert.equal(predictForModel(view, maps, evid, stats, 'no-such-model::default'), null);
  assert.equal(predictForAxis(view, maps, evid, stats, 'no-such-axis'), null);
  const rich = view.axes.find((a) => (maps.get(a.id)?.size ?? 0) >= 200);
  assert.ok(rich, 'expected a rich axis');
  const out = predictForAxis(view, maps, evid, stats, rich.id, { limit: 5 });
  assert.ok(out);
  assert.equal(out.predictions.length <= 5, true);
  assert.ok(out.predictions.length > 0);
  assert.equal(out.predictions[0].predictor.axisId !== rich.id, true);
});

test('predictForModel and predictForAxis return null on unknown identifiers', () => {
  assert.equal(predictForModel(view, maps, evid, stats, 'no-such-model::default'), null);
  assert.equal(predictForAxis(view, maps, evid, stats, 'no-such-axis'), null);
  const rich = view.axes.find((a) => (maps.get(a.id)?.size ?? 0) >= 200);
  assert.ok(rich, 'expected a rich axis');
  const out = predictForAxis(view, maps, evid, stats, rich.id, { limit: 5 });
  assert.ok(out);
  assert.equal(out.predictions.length <= 5, true);
  assert.ok(out.predictions.length > 0);
  assert.equal(out.predictions[0].predictor.axisId !== rich.id, true);
});

test('real-data predictions expose gates, uncertainty and provenance on every row', () => {
  const tops = topPredictions(view, maps, evid, stats, { limit: 8 });
  assert.ok(tops.length > 3);
  const axisIds = new Set(view.axes.map((a) => a.id));
  for (const p of tops) {
    assert.ok(p.n >= MIN_OVERLAP, 'gate n');
    assert.ok(Math.abs(p.r) >= MIN_ABS_R, 'gate r');
    assert.notEqual(p.target.axisId, p.predictor.axisId, 'distinct exact axes');
    assert.ok(Number.isFinite(p.point));
    assert.ok(p.low <= p.point && p.point <= p.high);
    assert.equal(typeof p.outsideFitRange, 'boolean');
    assert.equal(maps.get(p.predictor.axisId)?.get(p.model.id), p.predictorValue);
    assert.ok(!evid.get(p.target.axisId)?.has(p.model.id), 'never predicted over evidence');
    assert.ok(Number.isFinite(p.predictorValue));
    assert.equal(maps.get(p.predictor.axisId)?.get(p.model.id), p.predictorValue);
    // already asserted above: interval bounds enclose the point
  }
});

test('bottom-decile aggregates on the real dataset honor all qualifications', () => {
  const dec = bottomDecileTags(view, {}, maps);
  assert.ok(dec.aggregate.length > 0, 'some models qualify honestly');
  for (const a of dec.aggregate) {
    assert.ok(a.count >= DECILE_MIN_AXES, 'aggregate needs >=4 axes');
    assert.ok(a.families.length >= DECILE_MIN_FAMILIES, 'aggregate needs >=2 benchmark families');
    assert.ok(a.detail.every((d) => Number.isFinite(d.value)));
    assert.ok(a.detail.every((d) => d.n >= DECILE_MIN_PEERS, 'every detail comes from an axis with >=20 measured peers'));
  }
  for (const [, ax] of dec.perAxis) {
    assert.ok(ax.n >= DECILE_MIN_PEERS, 'axis needs >=20 measured peers');
    assert.equal(ax.k, Math.max(1, Math.floor(ax.n * 0.1)));
    assert.ok(ax.models.length >= 1);
    assert.ok(ax.models.every((m) => Number.isFinite(m.value)));
  }
});

test('predictForModel and predictForAxis return null on unknown identifiers', () => {
  assert.equal(predictForModel(view, maps, evid, stats, 'no-such-model::default'), null);
  assert.equal(predictForAxis(view, maps, evid, stats, 'no-such-axis'), null);
  const rich = view.axes.find((a) => (maps.get(a.id)?.size ?? 0) >= 200);
  assert.ok(rich, 'expected a rich axis');
  const out = predictForAxis(view, maps, evid, stats, rich.id, { limit: 5 });
  assert.ok(out);
  assert.equal(out.predictions.length <= 5, true);
  assert.ok(out.predictions.length > 0);
  assert.equal(out.predictions[0].predictor.axisId !== rich.id, true);
});

test('topPredictions emits only gated, version-locked, finite estimates', () => {
  const tops = topPredictions(view, maps, evid, stats, { limit: 8 });
  assert.ok(tops.length > 3);
  for (const p of tops) {
    assert.ok(p.n >= MIN_OVERLAP, 'gate n');
    assert.ok(Math.abs(p.r) >= MIN_ABS_R, 'gate r');
    assert.notEqual(p.target.axisId, p.predictor.axisId, 'distinct exact axes');
    assert.ok(Number.isFinite(p.point));
    assert.ok(p.low <= p.point && p.point <= p.high);
    assert.ok(Number.isFinite(p.predictorValue));
    assert.equal(maps.get(p.predictor.axisId)?.get(p.model.id), p.predictorValue);
    assert.ok(!evid.get(p.target.axisId)?.has(p.model.id), 'never predicted over evidence');
    assert.ok(p.target.version.length > 0);
    assert.ok(p.predictor.axisId !== p.target.axisId);
  }
});
