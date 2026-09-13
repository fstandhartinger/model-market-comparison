import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHeadlineObservations, HEADLINE_REGISTRY } from '../lib/headline-history.mjs';
import { buildState, datedEstimates } from '../lib/benchmark-history.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

const source = { url: 'https://example.org/board', retrieved_at: '2026-09-13', published_at: null, sha256: 'a'.repeat(64), file: 'fixture.json', locator: 'fixture' };

test('headline source snapshots become stable, provenance-bearing history observations', () => {
  const observations = buildHeadlineObservations({
    artificialanalysis: {
      endpoint: 'https://artificialanalysis.ai/api/v2/data/llms/models', collected_at: '2026-09-13', sha256: 'b'.repeat(64),
      models: [
        { id: 'aa-a', name: 'Model A', evaluations: { artificial_analysis_intelligence_index: 80, artificial_analysis_coding_index: 70 } },
        { id: 'aa-b', name: 'Model B', evaluations: { artificial_analysis_intelligence_index: 60 } },
      ],
    },
    epochEci: {
      definition_version: 'epoch-eci-test', collected_at: '2026-09-13', source: { urls: { general: 'https://epoch.ai/data/eci_scores.csv' }, sha256: { general: 'c'.repeat(64) } },
      models: [{ source_model_name: 'Model A', display_name: 'Model A', general: 150, software: 160 }],
    },
    designarena: {
      endpoint: 'https://www.designarena.ai/api/leaderboard', collected_at: '2026-09-13', sha256: 'd'.repeat(64),
      model_registry: { da_a: { display_name: 'Model A' } },
      leaderboards: { frontend: { data: [{ modelId: 'da_a', elo: 1200 }] } },
    },
    modelRows: [{ id: 'model-a::default', aa_model_id: 'aa-a', display_name: 'Model A', benchmarks: { epoch_eci: 150, epoch_eci_software: 160 }, designarena: { frontend: { modelId: 'da_a' } } }],
  });
  assert.equal(HEADLINE_REGISTRY.length, 6);
  assert.equal(observations.length, 6);
  assert.deepEqual([...new Set(observations.map((row) => row.benchmark_id))].sort(), [
    'aa-coding-index::snapshot', 'aa-intelligence-index::snapshot', 'designarena-frontend::snapshot', 'epoch-eci::general', 'epoch-eci::software',
  ].sort());
  const aa = observations.find((row) => row.benchmark_id === 'aa-intelligence-index::snapshot');
  assert.equal(aa.subject.model_id, 'aa-a');
  assert.equal(aa.subject.catalog_model_id, 'model-a::default');
  assert.equal(aa.source.sha256, 'b'.repeat(64));
  assert.match(aa.source.locator, /aa-a/);
});

test('headline values use the same dated bridge policy as registry benchmarks', () => {
  const row = (id, value, benchmarkId) => ({ id, value, benchmark_id: benchmarkId, basis: 'measured', unit: 'points',
    subject: { source_id: id, model_id: id, catalog_model_id: id === 'historic' ? 'model-historic' : null, name: id, variant: null, harness: null }, source });
  const old = ['a', 'b', 'c'].map((id) => row(id, 1, 'aa-intelligence-index::snapshot')).concat(row('historic', 3, 'aa-intelligence-index::snapshot'));
  const live = ['a', 'b', 'c'].map((id) => row(id, 2, 'aa-intelligence-index::snapshot'));
  const estimate = datedEstimates(live, { entries: HEADLINE_REGISTRY }, [buildState(old, { state_id: 'old', source: 'fixture', collected_at: '2026-09-12' })])[0];
  assert.equal(estimate.status, 'estimated');
  assert.equal(estimate.value, 6);
  assert.equal(estimate.model_id, 'model-historic');
  assert.equal(estimate.source.sha256, 'a'.repeat(64));
});

test('history-only headline IDs attach to the current dated presentation axis', () => {
  const estimate = {
    id: 'hist:aa-old', benchmark_id: 'aa-intelligence-index::snapshot', source_benchmark_id: 'aa-intelligence-index::snapshot', source_state_id: 'old',
    family: 'aa-intelligence-index', model_id: 'aa-old', subject_name: 'Old Model', harness: null, variant: null, cohort: null,
    unit: 'points', higher_better: true, method: 'bridge-median-ratio', status: 'estimated', source_value: 50, value: 55, uncertainty: null,
    comparison: { bridge_count: 3, aggregate: 1.1, spread: null, comparable: true, reason: null, cause: null, cause_value: null, bridges: [], hops: 1, path: [], chain_iqr_relative: 0 },
    source, note: 'fixture estimate',
  };
  const view = buildBenchmarkView({
    models: [{ id: 'model-a', display_name: 'Model A', org: 'Example', family_key: 'model-a', open_weights: false, deprecated: false, aa_model_id: 'aa-a', benchmarks: { aa_intelligence_index: 60 }, designarena: {} }],
    sources: { artificialanalysis: '2026-09-13', designarena: '2026-09-13' },
    benchmark_results: { observations: [], registry: [], collections: [], missing: [], divergences: [], historical: { estimates: [estimate], states: [] } },
  });
  const axis = view.axes.find((item) => item.benchmarkId === 'aa_intelligence_index::snapshot-2026-09-13');
  assert.ok(axis);
  assert.equal(view.axes.some((item) => item.benchmarkId === 'aa-intelligence-index::snapshot'), false);
  assert.equal(axis.estimates.length, 1);
  assert.equal(axis.estimates[0].benchmarkId, 'aa-intelligence-index::snapshot');
});
