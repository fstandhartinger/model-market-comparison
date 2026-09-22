// Iteration 160: four models were listed twice — once under the benchmarked family and once, benchmark-less, under a
// size-suffixed or suffix-less spelling from a managed-cloud, EU or Epoch catalog. OpenRouter's own Hugging Face ids
// show each is one model (NVIDIA-Nemotron-3-Ultra-550B-A55B, NVIDIA-Nemotron-3.5-Lightning-30B-A3B,
// Llama-4-Maverick-17B-128E-Instruct, Llama-4-Scout-17B-16E-Instruct).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dataset = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8'));
const byId = new Map(dataset.models.map((m) => [m.id, m]));
const providers = (id) => new Set(byId.get(id).offers.map((o) => o.provider));

test('no benchmark-less twin family is left beside its canonical family', () => {
  for (const family of ['nemotron-3-ultra', 'nemotron-3.5-lightning-30b-a3b', 'llama-4-maverick-17b', 'llama-4-scout-17b']) {
    assert.deepEqual(dataset.models.filter((m) => m.family_key === family).map((m) => m.id), [], family);
  }
});

test('the twins\' offers and Epoch ECI now belong to the canonical family', () => {
  assert.ok(providers('nemotron-3-ultra-550b-a55b::reasoning').has('Azure AI Foundry'));
  // Epoch refits ECI (2026-09-22: 146.27 → 146.2), so compare with today's capture rather than a pinned number.
  const eci = JSON.parse(readFileSync(new URL('../data/raw/epoch-eci.json', import.meta.url), 'utf8')).models.find((m) => m.source_model_name === 'Nemotron 3 Ultra');
  assert.ok(Number.isFinite(eci?.general));
  assert.equal(byId.get('nemotron-3-ultra-550b-a55b::reasoning').benchmarks.epoch_eci, eci.general);
  assert.ok(providers('nemotron-3.5-lightning::default').has('TrustedTokens'));
  assert.ok(providers('llama-4-maverick::default').has('AWS Bedrock'));
  assert.ok(providers('llama-4-maverick::default').has('Azure AI Foundry'));
  assert.ok(providers('llama-4-scout::default').has('AWS Bedrock'));
});

test('board rows labelled Nemotron 3 Ultra without a setting stay unjoined, not withheld', () => {
  const rows = dataset.benchmark_results.observations.filter((o) => /^nemotron[- ]3[- ]ultra$/i.test(o.subject.source_id ?? ''));
  assert.ok(rows.length >= 5);
  for (const o of rows) assert.equal(o.subject.model_id, null, o.id);
  assert.ok(!dataset.models.some((m) => m.id === 'nemotron-3-ultra::default'));
});
