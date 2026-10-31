import test from 'node:test';
import assert from 'node:assert/strict';
import { assessModel, selectModel, selectModelForWorker, candidateList } from '../ops/rebuild-2026-09/bin/worker-policy.mjs';

const catalogRow = (id, pricing = {prompt: '0.0000001', completion: '0.0000002'}) => ({id, pricing});
const aaRow = (id, score, overrides = {}) => ({ id, aa_model_id: id, family_key: 'product-v4.1', org: 'Example', benchmarks: {aa_intelligence_index: score}, ...overrides });

test('AA fallback requires exact version and matching organization', () => {
  const data = {models: [aaRow('product-v4.1::max', 40)]};
  assert.equal(assessModel(catalogRow('example/product-v4.1'), data).aa_intelligence_index, 40);
  for (const id of ['other/product-v4.1', 'example/product-v4', 'example/product-v4.1-0910', 'example/product-v41']) {
    assert.equal(assessModel(catalogRow(id), data).aa_intelligence_index, null, id);
  }
});

test('explicit maximum-effort mapping cannot hide a weak or missing sibling', () => {
  const model = catalogRow('example/product-v4.1');
  const high = aaRow('product-v4.1::max', 40, {aa_metadata: {openrouter_api_id: model.id}});
  // CR-634: the floor is 23 on the AA Intelligence Index v5.0 scale (34 on v4.x).
  const low = aaRow('product-v4.1::low', 20);
  assert.equal(assessModel(model, {models: [high, low]}).aa_intelligence_index, 20);
  assert.throws(() => selectModel([model], {models: [high, low]}, {model: model.id}), /below AA/);
  assert.equal(assessModel(model, {models: [high, aaRow('missing', null)]}).aa_intelligence_index, null);
});

test('missing or malformed prices never become free eligibility', () => {
  const data = {models: [aaRow('known', 40)]};
  for (const missing of [null, undefined, '', ' ', false, true, 'NaN', '-1']) {
    assert.equal(assessModel(catalogRow('example/product-v4.1', {prompt: missing, completion: '0'}), data), null);
  }
  assert.equal(assessModel(catalogRow('example/product-v4.1:batch'), data), null);
  assert.throws(() => candidateList([catalogRow('example/product-v4.1')], data, 22), /at least 23/);
});

test('unscored transport smoke has a price ceiling and cannot select automatically', () => {
  const data = {models: [aaRow('known', 40)]};
  const cheap = catalogRow('unknown/product');
  assert.equal(selectModel([cheap], data, {model: cheap.id, smokeTest: true}).aa_intelligence_index, null);
  assert.throws(() => selectModel([cheap], data, {smokeTest: true}), /explicitly pinned/);
  const expensive = catalogRow('unknown/costly', {prompt: '0.000003', completion: '0.000001'});
  assert.throws(() => selectModel([expensive], data, {model: expensive.id, smokeTest: true}), /price exceeds/);
});

test('critic excludes every producer family including aliases and explicit model pins', () => {
  const models = ['deepseek/reviewer', 'z-ai/reviewer'];
  const catalog = models.map((id) => catalogRow(id));
  const data = {models: models.map((id) => aaRow(id, 40, {family_key: id, aa_metadata: {openrouter_api_id: id}}))};
  assert.throws(() => selectModel(catalog, data, {critic: true}), /requires explicit producer/);
  assert.equal(selectModel(catalog, data, {critic: true, producers: ['deepseek-ai/producer']}).id, 'z-ai/reviewer');
  assert.throws(() => selectModel(catalog, data, {critic: true, producers: ['chutes/zai-org/producer'], model: 'z-ai/reviewer'}), /different vendor family/);
  assert.throws(() => selectModel(catalog, data, {critic: true, producers: ['deepseek/producer', 'z-ai/producer']}), /No supported viable/);
  assert.throws(() => selectModel(catalog, data, {critic: true, smokeTest: true, producers: ['openai/author']}), /cannot certify/);
});

test('daily price ceiling is rechecked against live catalog even for explicit pins', () => {
  const model = catalogRow('example/product-v4.1', { prompt: '0.000001', completion: '0.000003' });
  const data = { models: [aaRow('known', 40)] };
  assert.throws(() => selectModel([model], data, { model: model.id, maxPricePer1M: 2 }), /price exceeds/);
  assert.throws(() => selectModel([model], data, { maxPricePer1M: 2 }), /No supported viable/);
  assert.throws(() => selectModel([model], data, { maxPricePer1M: NaN }), /Invalid/);
});

test('a failed worker is excluded while the next cheapest still needs AA qualification, price cap and a different family', () => {
  const ids = ['deepseek/producer', 'z-ai/reviewer', 'google/reviewer'];
  const catalog = ids.map((id, i) => catalogRow(id, { prompt: String((i + 1) / 1e6), completion: String((i + 1) / 1e6) }));
  const data = { models: ids.map((id) => aaRow(id, 23, { family_key: id, aa_metadata: { openrouter_api_id: id } })) };
  const options = { critic: true, producers: ['deepseek/producer'], excludeModels: ['z-ai/reviewer'], maxPricePer1M: 4 };
  assert.equal(selectModel(catalog, data, options).id, 'google/reviewer');
  assert.throws(() => selectModel(catalog, data, { ...options, maxPricePer1M: 2 }), /No supported viable/);
  assert.throws(() => selectModel(catalog, data, { ...options, model: 'z-ai/reviewer' }), /excluded/);
  data.models[2].benchmarks.aa_intelligence_index = 22.9;
  assert.throws(() => selectModel(catalog, data, options), /No supported viable/);
});

test('scheduled selection filters the whitelist before choosing the cheapest fallback', () => {
  const unauthorized = catalogRow('google/reviewer', { prompt: '0.0000001', completion: '0.0000001' });
  const authorized = catalogRow('nex-agi/nex-n2.5-pro', { prompt: '0.0000002', completion: '0.0000002' });
  const data = { models: [
    aaRow('google/reviewer', 40, { family_key: 'google/reviewer', aa_metadata: { openrouter_api_id: unauthorized.id } }),
    aaRow('nex-agi/nex-n2.5-pro', 40, { family_key: 'nex-agi/nex-n2.5-pro', aa_metadata: { openrouter_api_id: authorized.id } }),
  ] };
  assert.equal(selectModel([unauthorized, authorized], data, { scheduled: true }).id, authorized.id);
  assert.throws(() => selectModel([unauthorized], { models: [data.models[0]] }, { scheduled: true }), /No supported viable/);
});

test('critic retry reuses an excluded family only when no other scheduled candidate exists', () => {
  const deepseek = catalogRow('deepseek/deepseek-v4-flash-0731');
  const zai = catalogRow('z-ai/glm-5.3-flash');
  const data = { models: [
    aaRow('deepseek/deepseek-v4-flash-0731', 40, { family_key: deepseek.id, aa_metadata: { openrouter_api_id: deepseek.id } }),
    aaRow('z-ai/glm-5.3-flash', 40, { family_key: zai.id, aa_metadata: { openrouter_api_id: zai.id } }),
  ] };
  assert.equal(selectModelForWorker([deepseek, zai], data, {
    scheduled: true, critic: true, producers: [zai.id], excludeModels: [deepseek.id],
  }).id, deepseek.id);
  assert.throws(() => selectModelForWorker([deepseek, zai], data, {
    scheduled: true, critic: true, producers: [deepseek.id, zai.id], excludeModels: [deepseek.id],
  }), /No supported viable/);
});

// CR-634 (critic round 2 F9): an estimated v5 value never qualifies by itself; it counts only when the model's measured
// v4.x value met the old floor of 34, so no model below the former v4 floor becomes a worker through its estimate.
test('CR-634: estimated AA values qualify only with a measured v4.x value at or above 34', async () => {
  const { qualifyingAaIndex, V4_MIN_INDEX } = await import('../ops/rebuild-2026-09/bin/worker-policy.mjs');
  const est = (value, v4) => ({ benchmarks: { aa_intelligence_index: value }, aa_intelligence: { status: 'estimated', value, v4_value: v4 } });
  assert.equal(V4_MIN_INDEX, 34);
  assert.equal(qualifyingAaIndex({ benchmarks: { aa_intelligence_index: 27.8 }, aa_intelligence: { status: 'measured', value: 27.8 } }), 27.8);
  assert.equal(qualifyingAaIndex(est(23.4, 33.8)), null, 'GPT-5.5 (Medium): v4 33.8 stays below the floor');
  assert.equal(qualifyingAaIndex(est(24.6, 34.5)), 24.6);
  assert.equal(qualifyingAaIndex(est(22.9, 34.0)), 23, 'v4 at the floor stays qualified even where the estimate rounds below 23');
  assert.equal(qualifyingAaIndex({ benchmarks: {} }), null);
  // Every estimated row in the published dataset keeps its v4 decision.
  const { readFileSync } = await import('node:fs');
  const ds = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  for (const row of ds.models.filter((m) => m.aa_intelligence?.status === 'estimated')) {
    assert.equal(qualifyingAaIndex(row) !== null && qualifyingAaIndex(row) >= 23, row.aa_intelligence.v4_value >= 34, row.id);
  }
});
