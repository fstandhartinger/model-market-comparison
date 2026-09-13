import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBenchmarkComparison } from '../lib/benchmark-comparison.mjs';

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
  assert.deepEqual(out.axes[0].values.estimated, { value: 80, approximate: true });
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
