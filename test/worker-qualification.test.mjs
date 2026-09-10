import test from 'node:test';
import assert from 'node:assert/strict';
import { assessModel, selectModel, candidateList } from '../ops/rebuild-2026-09/bin/worker-policy.mjs';

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
  const low = aaRow('product-v4.1::low', 30);
  assert.equal(assessModel(model, {models: [high, low]}).aa_intelligence_index, 30);
  assert.throws(() => selectModel([model], {models: [high, low]}, {model: model.id}), /below AA/);
  assert.equal(assessModel(model, {models: [high, aaRow('missing', null)]}).aa_intelligence_index, null);
});

test('missing or malformed prices never become free eligibility', () => {
  const data = {models: [aaRow('known', 40)]};
  for (const missing of [null, undefined, '', ' ', false, true, 'NaN', '-1']) {
    assert.equal(assessModel(catalogRow('example/product-v4.1', {prompt: missing, completion: '0'}), data), null);
  }
  assert.equal(assessModel(catalogRow('example/product-v4.1:batch'), data), null);
  assert.throws(() => candidateList([catalogRow('example/product-v4.1')], data, 33), /at least 34/);
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
