// Iteration 166: Epoch writes some Qwen releases with a space ("Qwen 3.8 Max", "Qwen 3.6 Plus"), so their ECI never
// reached the catalog's `qwen3.8-max` / `qwen3.6-plus` families. Only a Qwen name that finds no family as written is
// retried without the space; values are compared with the committed capture, which Epoch refits daily.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const ds = read('data/dataset.json'), eci = read('data/raw/epoch-eci.json');
const byId = new Map(ds.models.map((m) => [m.id, m]));
const general = (name) => eci.models.find((m) => m.source_model_name === name)?.general;

test('spaced Qwen names in Epoch ECI join their catalog family', () => {
  for (const [name, id] of [['Qwen 3.8 Max', 'qwen3.8-max::default'], ['Qwen 3.6 Plus', 'qwen3.6-plus::default'], ['Qwen 3.6 Max (Preview)', 'qwen3.6-max-preview::default']]) {
    assert.ok(Number.isFinite(general(name)), name);
    assert.equal(byId.get(id)?.benchmarks.epoch_eci, general(name), `${name} → ${id}`);
  }
  // The dated snapshot keeps its own family.
  assert.equal(byId.get('qwen3.8-max-0902::default')?.benchmarks.epoch_eci, general('Qwen3.8 Max (0902)'));
  const unmatched = ds.build_diagnostics.epoch_eci_attachment.unmatched_source_models;
  for (const name of ['Qwen 3.8 Max', 'Qwen 3.6 Plus', 'Qwen 3.6 Flash']) assert.ok(!unmatched.includes(name), name);
});
