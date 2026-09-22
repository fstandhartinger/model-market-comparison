// 2026-09-22: Epoch dropped GLM-4.6 from its ECI fit. The history layer kept an `epoch-eci::general` estimate for it,
// and the benchmark view turned that estimate into an unregistered board ("epoch-eci::general", category Other),
// which failed the daily run's taxonomy test. ECI estimates stay in the dataset's history but never become an axis.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

const ds = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8'));

test('an Epoch ECI history estimate for a dropped model does not create a board', () => {
  const historical = ds.benchmark_results.historical ?? { estimates: [] };
  const estimate = (benchmark_id) => ({ id: `hist-state:test:${benchmark_id}:epoch:GLM-4.6||`, benchmark_id, family: 'epoch-eci',
    source_benchmark_id: benchmark_id, source_state_id: 'test', model_id: 'epoch:GLM-4.6', subject_name: 'GLM-4.6', harness: null,
    variant: null, cohort: null, unit: 'points', higher_better: true, method: 'bridge-median-ratio', status: 'estimated',
    source_value: 140, value: 140, uncertainty: null, comparison: { bridge_count: 50, hops: 1, path: [] }, source: { file: 'data/raw/epoch-eci.json' } });
  const withEstimate = { ...ds, benchmark_results: { ...ds.benchmark_results,
    historical: { ...historical, estimates: [...(historical.estimates ?? []), estimate('epoch-eci::general'), estimate('epoch-eci::software')] } } };
  const before = buildBenchmarkView(ds), after = buildBenchmarkView(withEstimate);
  assert.ok(!after.axes.some((a) => String(a.benchmarkId).startsWith('epoch-eci')));
  assert.deepEqual(after.axes.map((a) => a.id), before.axes.map((a) => a.id));
  assert.equal(after.models.length, before.models.length);
  assert.deepEqual(after.indexAxes.map((a) => a.id), before.indexAxes.map((a) => a.id));
});
