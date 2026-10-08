import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readHistoricalJevbenchSupplement } from '../lib/jevbench-history-supplement.mjs';
const forbidden = new Set(['item_id', 'item_ids', 'task_id', 'question', 'state', 'gold', 'prompt', 'prediction', 'per_item', 'item_results']);
function aggregateOnly(value) { if (Array.isArray(value)) value.forEach(aggregateOnly); else if (value && typeof value === 'object') for (const [key, nested] of Object.entries(value)) { assert.ok(!forbidden.has(key), key); aggregateOnly(nested); } }
test('historical supplement keeps frozen v1.5.7 and all top-five orders intact', async () => {
  const parent = await readFile('data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.7-results.json');
  assert.equal(createHash('sha256').update(parent).digest('hex'), '8b837b2b760ef238e2a465632a48aa95b53b9ce5d797dfa79b2c24b0a638911e');
  const { artifact } = await readHistoricalJevbenchSupplement();
  assert.equal(artifact.systems.length, 18);
  assert.equal(artifact.G_med, 5.186627500079243);
  const aggregates = artifact.systems.map(({ key, axes, scores, capability, cost_usd_per_1000, cost_kind, cost_basis, latency, status, categories }) => ({ key, axes, scores, capability, cost_usd_per_1000, cost_kind, cost_basis, latency, status, categories }));
  assert.equal(createHash('sha256').update(JSON.stringify(aggregates)).digest('hex'), '94c106eedc6e4aaeba1c4cbfe2ffce0f676a33e36dce852d1c66cce4b6bc4fa5', 'metadata must preserve original scores and category aggregates');
  assert.deepEqual(artifact.measurement_period, { from: '2026-10-03', to: '2026-10-04' });
  assert.deepEqual(artifact.held_keys, ['xor-26b-a4b-nvfp4', 'wald-q4b-v11']);
  const frozen = JSON.parse(parent);
  for (const option of ['A', 'B', 'C']) {
    assert.deepEqual(artifact.ranking_gate[option].before, frozen.board[option].order.slice(0, 5));
    assert.deepEqual(artifact.ranking_gate[option].after, artifact.ranking_gate[option].before);
  }
  const reference = frozen.systems.find(row => row.key === 'jev-1.13.0');
  const caps = artifact.ranking_gate.capability.caps;
  assert.equal(caps.cost_usd_per_1000, 2 * reference.cost.usd_per_1000);
  assert.equal(caps.median_seconds, 2 * reference.speed.p50_s_adjusted);
  const eligible = row => (row.cost_usd_per_1000 ?? row.cost?.usd_per_1000) <= caps.cost_usd_per_1000 && (row.latency?.p50_adj ?? row.speed?.p50_s_adjusted) <= caps.median_seconds;
  const topFive = rows => rows.filter(eligible).sort((a, b) => (b.axes.intelligence + b.axes.calibration) - (a.axes.intelligence + a.axes.calibration) || a.key.localeCompare(b.key)).slice(0, 5).map(row => row.key);
  const ranked = frozen.systems.filter(row => row.ranked);
  assert.deepEqual(artifact.ranking_gate.capability.before, topFive(ranked));
  assert.deepEqual(artifact.ranking_gate.capability.after, topFive([...ranked, ...artifact.systems]));
  assert.deepEqual(artifact.ranking_gate.capability.after, artifact.ranking_gate.capability.before);
  assert.deepEqual(artifact.systems.map(r => r.key).sort(), ['kev-9b-v2', 'kev-27b-v2', 'decision2-lux-9b', 'decision2-nox-4b', 'decision2-sol-2b', 'decision2-eos-0.8b', 'decision2-kai-0.6b', 'decision2-vega-27b', 'jevberta-base', 'coco-decision-4b-ko', 'fastsem-jev-l16r25', 'janus-08b-gpu', 'janus-35b-a3b', 'noma', 'reflex-instinct-06b', 'reflex-reason-2b', 'sev-2b-preview', 'tachyone-en'].sort());
  aggregateOnly(artifact);
  for (const row of artifact.systems) {
    for (const field of ['repo', 'model_revision', 'licence', 'gpu', 'measured_on', 'measurement_facts']) assert.ok(row[field], `${row.key}/${field}`);
    assert.ok(row.source_links.length > 0, `${row.key} needs source links`);
    assert.match(row.repo, /^https:\/\/(huggingface\.co|github\.com)\//);
    assert.match(row.model_revision, /@[a-f0-9]{40}/);
    assert.ok(row.measured_on >= artifact.measurement_period.from && row.measured_on <= artifact.measurement_period.to);
    assert.doesNotMatch(row.measurement_facts, /\/home\/|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
    assert.equal(row.status.rows, 1624);
    for (const dim of ['topics', 'usecases']) for (const d of artifact.category_dimensions[dim]) {
      const cell = row.categories[dim][d.key];
      if (d.n === 0) assert.equal(cell, undefined);
      else assert.ok(cell && Number.isFinite(cell.competence) && cell.n > 0, `${row.key}/${dim}/${d.key}`);
    }
  }
});
