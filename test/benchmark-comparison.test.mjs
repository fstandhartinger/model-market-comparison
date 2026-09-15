import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBenchmarkComparison, bridgeDisclosure } from '../lib/benchmark-comparison.mjs';

const row = (id, modelId, value, basis = 'measured') => ({
  id, modelId, subjectId: modelId, name: modelId, value, basis, derived: false,
  source: 0, date: '2026-09-13', variant: null, lowSample: false,
});
const axis = (id, category, higherBetter, scores, estimates = []) => ({
  id, name: id, benchmarkId: id, family: id, version: '1', category, description: '', unit: 'points',
  higherBetter, cohort: 'Published board', url: 'https://example.com', scores,
  stats: { n: 3, families: 3, mean: 50, sd: 20, min: 0, max: 100 }, estimates,
});

test('H3 prefers measured values, keeps bridges approximate, and omits missing models', () => {
  const view = { axes: [axis('coding-a', 'Coding', true, [row('a1', 'ref', 40), row('a2', 'measured', 70)], [{
    id: 'estimate', modelId: 'estimated', name: 'estimated', benchmarkId: 'coding-a', sourceBenchmarkId: 'coding-a::old',
    sourceStateId: 'old', value: 80, unit: 'points', higherBetter: true, status: 'estimated', method: 'bridge',
  }])], models: [], sources: [], divergences: [], missing: [], generatedAt: '2026-09-13', registryCount: 1, legacyDate: '2026-09-13' };
  const out = buildBenchmarkComparison(view);
  assert.deepEqual(out.axes[0].values.ref, { value: 40, approximate: false });
  assert.deepEqual(out.axes[0].values.measured, { value: 70, approximate: false });
  assert.equal(out.axes[0].values.estimated.value, 80);
  assert.equal(out.axes[0].values.estimated.approximate, true);
  assert.equal(out.axes[0].values.missing, undefined);
});

test('H3 category medians normalize each benchmark and preserve sparse coverage', () => {
  const view = { axes: [
    axis('coding-a', 'Coding', true, [row('a1', 'ref', 50), row('a2', 'candidate', 100)]),
    axis('coding-b', 'Coding', false, [row('b1', 'ref', 50), row('b2', 'candidate', 0)], [{
      id: 'bridge', modelId: 'ref', name: 'ref', benchmarkId: 'coding-b', sourceBenchmarkId: 'old',
      sourceStateId: 'old', value: 60, unit: 'points', higherBetter: false, status: 'estimated', method: 'bridge',
    }]),
  ], models: [], sources: [], divergences: [], missing: [], generatedAt: '2026-09-13', registryCount: 2, legacyDate: '2026-09-13' };
  const category = buildBenchmarkComparison(view).categories[0];
  assert.equal(category.values.candidate.value, 100);
  assert.equal(category.values.candidate.coverage, 2);
  assert.equal(category.values.candidate.approximate, false);
  assert.equal(category.values.ref.coverage, 2);
});

test('H3 discloses how a bridged reference was reached: snapshot, anchors, hops, spread', () => {
  const view = { axes: [axis('coding-a', 'Coding', true, [row('a1', 'x', 10), row('a2', 'y', 90)], [
    { id: 'e1', modelId: 'ratio', name: 'ratio', benchmarkId: 'coding-a', sourceBenchmarkId: 'coding-a', sourceStateId: '20260912-b2963bd0',
      value: 50, status: 'estimated', method: 'bridge-median-ratio', bridgeCount: 12, hops: 2, chainIqrRelative: 0.08, spread: { iqr_relative: 0.05 } },
    { id: 'e2', modelId: 'elo', name: 'elo', benchmarkId: 'coding-a', sourceBenchmarkId: 'coding-a', sourceStateId: '20260913-cb91473c',
      value: 60, status: 'estimated', method: 'bridge-rank-shift', bridgeCount: 40, hops: 1, chainIqrRelative: null, spread: { iqr: 0 } },
    { id: 'e3', modelId: 'version', name: 'version', benchmarkId: 'coding-a', sourceBenchmarkId: 'coding-a::0.9', sourceStateId: null,
      value: 70, status: 'estimated', method: 'bridge-median-ratio', bridgeCount: 5, hops: 1, chainIqrRelative: null, spread: { iqr_relative: 0.1 } },
  ])], models: [], sources: [], divergences: [], missing: [], generatedAt: '2026-09-15', registryCount: 1, legacyDate: '2026-09-15' };
  const out = buildBenchmarkComparison(view);
  const { ratio, elo, version } = out.axes[0].values;
  assert.deepEqual(ratio.bridge, { fromDate: '2026-09-12', fromBenchmark: null, anchors: 12, hops: 2, spreadRelative: 0.08 });
  assert.equal(bridgeDisclosure(ratio), 'approximated from the 2026-09-12 snapshot, bridged through 12 anchor models over 2 hops, anchor spread ±8%');
  assert.equal(elo.bridge.spreadRelative, null, 'rank shifts have no relative spread');
  assert.match(bridgeDisclosure(elo), /2026-09-13 snapshot, bridged through 40 anchor models, rank-based bridge/);
  assert.match(bridgeDisclosure(version), /^approximated from version 0\.9 of this benchmark, bridged through 5 anchor models, anchor spread ±10%$/);
  assert.equal(bridgeDisclosure(out.axes[0].values.x), 'measured');
  const category = out.categories[0].values.ratio;
  assert.equal(category.approximateCount, 1);
  assert.equal(bridgeDisclosure(category), 'approximated: 1 of 1 benchmark in this median is a bridged estimate from retained results');
});
