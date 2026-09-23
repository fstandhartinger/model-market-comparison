import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';
import { benchmaxxingSignals } from '../lib/benchmax.mjs';

const dataset = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
const registry = JSON.parse(await readFile(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
const model = dataset.models.find((row) => row.id === 'mimo-v2.6-pro::default');

test('CR-117: MiMo-V2.6-Pro identity, licence and exact standard route are source-backed', () => {
  assert.ok(model);
  assert.equal(model.org, 'Xiaomi');
  assert.equal(model.open_weights, true);
  assert.equal(model.release_date, '2026-09-21');
  assert.equal(model.aa_metadata.license_name, 'MIT');
  assert.equal(model.aa_metadata.huggingface_url, 'https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL');
  assert.equal(model.aa_metadata.openrouter_api_id, 'xiaomi/mimo-v2.6-pro');
  // Every route must be the exact standard OpenRouter identity, never a borrowed one. The number of
  // routes is a live fact and grows: on 2026-09-23 DeepInfra joined Xiaomi's own endpoint, both under
  // xiaomi/mimo-v2.6-pro (openrouter.ai/api/v1/models/xiaomi/mimo-v2.6-pro/endpoints).
  assert.ok(model.offers.length >= 1);
  assert.deepEqual([...new Set(model.offers.map((offer) => offer.or_model_id))], ['xiaomi/mimo-v2.6-pro']);
  assert.deepEqual([...new Set(model.offers.map((offer) => offer.or_canonical_slug))], ['xiaomi/mimo-v2.6-pro-20260921']);
  const firstParty = model.offers.find((offer) => offer.or_provider_slug === 'xiaomi');
  assert.ok(firstParty);
  assert.deepEqual([firstParty.input_per_1m, firstParty.output_per_1m, firstParty.cache_read_per_1m], [0.435, 0.87, 0.0036]);
  assert.equal(firstParty.context_length, 1048576);
  assert.equal(firstParty.max_completion_tokens, 131072);
});

test('CR-117: AA values and efficiency attach by exact UUID, never by a borrowed model identity', () => {
  assert.equal(model.benchmarks.aa_intelligence_index, 46.3);
  assert.equal(model.benchmarks.aa_hle, 0.494);
  assert.equal(model.benchmarks.aa_scicode, 0.609);
  assert.equal(model.benchmarks.aa_lcr, 0.863333333333333);
  assert.equal(model.token_efficiency.aa.source_model_id, '24d8fdfe-6241-424e-b7b7-1b6efb06e4fb');
  assert.equal(model.token_efficiency.aa.source_slug, 'mimo-v2-6-pro');
  assert.equal(model.token_efficiency.aa.status, 'available');
});

test('CR-117: all 17 Xiaomi claims remain self-reported with reviewable provenance', () => {
  const rows = dataset.benchmark_results.observations.filter((row) => row.subject?.model_id === model.id && row.id.startsWith('self-reported:mimo-v26-'));
  assert.equal(rows.length, 17);
  assert.ok(rows.every((row) => row.basis === 'self_reported'));
  assert.ok(rows.every((row) => row.source?.published_at === '2026-09-22' && row.source?.sha256 === '8ba4b07222116198f7fa5df9472c322dae9e1a08266aa8032b1f4ba844c1bbb0'));
  assert.equal(rows.find((row) => row.id.endsWith('mimo-cyber-bench')).value, 81.7);
  assert.match(rows.find((row) => row.id.endsWith('mimo-cyber-bench')).protocol, /80\.2/);
  assert.equal(rows.find((row) => row.id.endsWith('gdpval-aa-2-1')).unit, 'elo');
  assert.equal(registry.entries.filter((row) => row.id.startsWith('xiaomi-')).length, 17);
});

test('CR-117: benchmaxxing correctly withholds a verdict when no qualifying comparisons exist', () => {
  const result = benchmaxxingSignals(buildBenchmarkView(dataset), [model.id]);
  assert.deepEqual(result.reports, []);
  assert.equal(result.levels.has(model.id), false);
  assert.equal(result.tagged.has(model.id), false);
});

test('CR-117.3: the visible MiMo Cyber Bench description discloses the 81.7-versus-80.2 source conflict', () => {
  const entry = registry.entries.find((row) => row.id === 'xiaomi-mimo-cyber-bench::snapshot-2026-09-22');
  assert.match(entry.one_sentence_description, /81\.7/);
  assert.match(entry.one_sentence_description, /80\.2/);
});
