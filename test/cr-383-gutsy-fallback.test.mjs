import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readHistoricalJevbenchSupplement } from '../lib/jevbench-history-supplement.mjs';
test('Gutsy keeps historical scores, disclosed estimated pricing and both measured radars', async () => {
  const { artifact } = await readHistoricalJevbenchSupplement();
  const row = artifact.systems.find(row => row.key === 'gutsy-08b-priced');
  assert.match(row.name, /v1.5 measurement, v1.6 re-run pending/);
  assert.deepEqual(row.axes, { calibration: 83.98134601478253, cost: 63.499484293442904, intelligence: 16.625034099610062, speed: 61.401488281670765 });
  assert.deepEqual(row.scores, { A: 4.248419895426465, B: 3.3656582211679185, C: 2.9502915940461563 });
  assert.equal(row.cost_usd_per_1000, 0.01646963054187192);
  assert.match(row.cost_basis, /\*est\./);
  assert.match(row.cost_basis, /\$0.03 per million input tokens/);
  assert.match(row.cost_basis, /output tokens are 0/);
  assert.equal(row.latency.p50_adj, 4.548752175271511);
  assert.equal(row.status.answered_ok, 1624);
  assert.equal(row.status.missing, 0);
  assert.equal(row.measured_on, '2026-10-02');
  for (const dim of ['topics', 'usecases']) for (const category of artifact.category_dimensions[dim]) {
    if (category.n > 0) assert.equal(row.categories[dim][category.key].n, category.n);
  }
  const proof = JSON.parse(await readFile('docs/releases/CR-383-GUTSY-FALLBACK.json', 'utf8'));
  for (const gate of Object.values(proof.topfive)) assert.deepEqual(gate.before, gate.after);
  const current = JSON.parse(await readFile('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json', 'utf8'));
  assert.ok(!current.systems.some(row => row.key === 'gutsy-08b-priced'));
});
