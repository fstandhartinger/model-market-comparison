import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const registry = JSON.parse(fs.readFileSync('data/raw/benchmarks/registry.json', 'utf8'));
const scores = JSON.parse(fs.readFileSync('data/raw/benchmarks/scores.json', 'utf8'));

test('MentalHealthBench snapshot is versioned, judged, and fail-closed', () => {
  const id = 'mentalhealthbench::snapshot-2026-09-23';
  const entry = registry.entries.find((row) => row.id === id);
  assert.ok(entry);
  assert.equal(entry.version_status, 'snapshot');
  assert.equal(entry.category, 'Safety/Alignment');
  assert.equal(entry.scoring.unit, 'percent');
  assert.equal(entry.scoring.range[1], 100);
  assert.equal(entry.how_to_collect.version_guard.includes('17-row'), true);
  assert.equal(entry.evidence[0].sha256, 'f4ce5da8db2c7c3ec3512363f57b82a07367b30eb1b5ff20f0349f09bfcabd75');
});

test('MentalHealthBench retains all Figure 5 values without inventing effort joins', () => {
  const rows = scores.observations.filter((row) => row.benchmark_id === 'mentalhealthbench::snapshot-2026-09-23');
  assert.equal(rows.length, 17);
  assert.ok(rows.every((row) => row.basis === 'preliminary' && row.unit === 'percent'));
  assert.deepEqual(rows.map((row) => row.value), [57.3, 53.9, 52.4, 50.2, 48.6, 47.0, 46.4, 44.9, 44.5, 42.9, 41.7, 41.3, 35.5, 33.5, 32.1, 32.1, 29.5]);
  assert.equal(rows.filter((row) => row.subject.model_id !== null).length, 2);
  assert.equal(rows.find((row) => row.subject.name === 'GPT-4o (March 2025)').subject.model_id, 'gpt-4o-march-2025-chatgpt-4o-latest::default');
  assert.equal(rows.find((row) => row.subject.name === 'Gemini 2.5 Pro').subject.model_id, 'gemini-2.5-pro::default');
});
