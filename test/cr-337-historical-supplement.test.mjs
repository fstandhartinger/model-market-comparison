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
  assert.deepEqual(artifact.systems.map(r => r.key).sort(), ['kev-9b-v2', 'kev-27b-v2', 'decision2-lux-9b', 'decision2-nox-4b', 'decision2-sol-2b', 'decision2-eos-0.8b', 'decision2-kai-0.6b', 'decision2-vega-27b', 'jevberta-base', 'coco-decision-4b-ko', 'fastsem-jev-l16r25', 'janus-08b-gpu', 'janus-35b-a3b', 'noma', 'reflex-instinct-06b', 'reflex-reason-2b', 'sev-2b-preview', 'tachyone-en'].sort());
  aggregateOnly(artifact);
  for (const row of artifact.systems) {
    assert.equal(row.status.rows, 1624);
    for (const dim of ['topics', 'usecases']) for (const d of artifact.category_dimensions[dim]) {
      const cell = row.categories[dim][d.key];
      if (d.n === 0) assert.equal(cell, undefined);
      else assert.ok(cell && Number.isFinite(cell.competence) && cell.n > 0, `${row.key}/${dim}/${d.key}`);
    }
  }
});
