import assert from 'node:assert/strict';
import test from 'node:test';
import contextData from '../data/jevbench-context-length.json' with { type: 'json' };

const SEALED_MARKERS = [
  'jevbench-sealed',
  'sealed item',
  'gold answer',
  'prediction',
  'question text',
];

test('context-length dataset covers the frozen public v1.4.1 rows without invented limits', () => {
  assert.equal(contextData.sourceDataset, 'JevBench v1.4.1 public split');
  assert.equal(contextData.capacitySystems.length, 82);
  assert.equal(new Set(contextData.capacitySystems.map((row) => row.key)).size, 82);
  assert.equal(contextData.capacitySystems.filter((row) => row.rank != null).length, 77);
  assert.equal(contextData.capacitySystems.filter((row) => row.rank == null).length, 5);
  assert.equal(contextData.capacitySystems.filter((row) => row.maxContextTokens == null).length, 8);
  assert.deepEqual(
    Object.fromEntries(Object.entries(contextData.capacitySystems.reduce((counts, row) => {
      counts[row.type] = (counts[row.type] ?? 0) + 1;
      return counts;
    }, {}))),
    { 'API cap': 16, 'Trained length': 45, 'Hard limit': 13, Unknown: 8 },
  );
  for (const row of contextData.capacitySystems) {
    assert.ok(row.sourceUrl, `${row.key} needs a primary source URL`);
    assert.match(row.sourceDate, /^\d{4}-\d{2}-\d{2}$/);
    if (row.maxContextTokens == null) assert.equal(row.type, 'Unknown', `${row.key} unknown limit must be labelled`);
    else assert.ok(row.maxContextTokens > 0, `${row.key} limit must be positive`);
  }
});

test('length analysis only includes reconciled public telemetry and records exclusions', () => {
  assert.equal(contextData.lengthSystems.length, 13);
  assert.equal(contextData.excludedLengthSystems.length, 2);
  assert.deepEqual(contextData.excludedLengthSystems.map((row) => row.key), ['jevk5-v02', 'system-one-open']);
  for (const row of contextData.lengthSystems) {
    assert.equal(row.outcomes, 231);
    assert.ok(row.lengthCoverage > 0 && row.lengthCoverage <= row.outcomes);
    assert.equal(row.buckets.reduce((sum, bucket) => sum + bucket.n, 0), row.lengthCoverage);
    assert.ok(row.buckets.every((bucket) => bucket.correct >= 0 && bucket.correct <= bucket.n));
  }
  assert.equal(contextData.longPolicyItems, 19);
  assert.equal(contextData.longPolicySystems.length, 14);
});

test('public context artifact contains no sealed item-level material', () => {
  const serialized = JSON.stringify(contextData).toLowerCase();
  for (const marker of SEALED_MARKERS) assert.equal(serialized.includes(marker), false, `unexpected marker: ${marker}`);
  for (const row of contextData.capacitySystems) {
    assert.equal(typeof row.basis, 'string');
    assert.equal('question' in row, false);
    assert.equal('gold' in row, false);
    assert.equal('prediction' in row, false);
  }
});
