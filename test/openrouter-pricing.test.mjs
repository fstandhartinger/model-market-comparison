import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizeOpenRouterPriceOverrides,
  matchesOpenRouterPriceOverride,
  selectOpenRouterPriceOverride,
  describeOpenRouterPriceOverride,
} from '../lib/openrouter-pricing.mjs';

test('OpenRouter endpoint prices convert from USD per token to USD per million and keep source conditions', () => {
  assert.deepEqual(normalizeOpenRouterPriceOverrides([{
    min_prompt_tokens: 272000,
    prompt: '0.0000002', completion: '0.00000075', input_cache_read: '0.00000002',
    input_cache_write: '0.00000025', audio: '0.000002',
  }]), [{
    min_prompt_tokens: 272000, input_per_1m: 0.2, output_per_1m: 0.75,
    cache_read_per_1m: 0.02, cache_write_per_1m: 0.25,
  }]);
});

test('OpenRouter prompt-length tiers include the exact published threshold', () => {
  const tier = { min_prompt_tokens: 272000, input_per_1m: 0.2 };
  assert.equal(matchesOpenRouterPriceOverride(tier, { promptTokens: 271999, date: new Date('2026-09-24T12:00:00Z') }), false);
  assert.equal(matchesOpenRouterPriceOverride(tier, { promptTokens: 272000, date: new Date('2026-09-24T12:00:00Z') }), true);
  assert.equal(selectOpenRouterPriceOverride([
    { min_prompt_tokens: 16000, input_per_1m: 3 },
    { min_prompt_tokens: 18000, input_per_1m: 4 },
  ], { promptTokens: 20000, date: new Date('2026-09-24T12:00:00Z') }).override.input_per_1m, 4);
});

test('OpenRouter UTC schedules use half-open minute ranges and the listed UTC weekdays', () => {
  const weekday = { utc_start: 100, utc_end: 400, utc_days: ['monday', 'tuesday'], input_per_1m: 0.3 };
  const matches = (date) => matchesOpenRouterPriceOverride(weekday, { promptTokens: 10, date: new Date(date) });
  assert.equal(matches('2026-09-28T00:59:00Z'), false); // Monday before 01:00
  assert.equal(matches('2026-09-28T01:00:00Z'), true);
  assert.equal(matches('2026-09-29T03:59:59Z'), true);
  assert.equal(matches('2026-09-29T04:00:00Z'), false);
  assert.equal(matches('2026-09-26T02:00:00Z'), false); // Saturday
});

test('OpenRouter UTC schedules cover midnight boundaries and windows that cross midnight', () => {
  const overnight = { utc_start: 2200, utc_end: 200, utc_days: ['monday'], input_per_1m: 0.1 };
  const matches = (date) => matchesOpenRouterPriceOverride(overnight, { promptTokens: 10, date: new Date(date) });
  assert.equal(matches('2026-09-28T22:00:00Z'), true);
  assert.equal(matches('2026-09-29T01:59:00Z'), true);
  assert.equal(matches('2026-09-29T02:00:00Z'), false);
  assert.equal(matches('2026-09-29T22:00:00Z'), false);
  const midnightEnd = { utc_start: 1000, utc_end: 0, input_per_1m: 0.2 };
  assert.equal(matchesOpenRouterPriceOverride(midnightEnd, { promptTokens: 10, date: new Date('2026-09-24T23:59:00Z') }), true);
  assert.equal(matchesOpenRouterPriceOverride(midnightEnd, { promptTokens: 10, date: new Date('2026-09-24T00:00:00Z') }), false);
});

test('overlapping OpenRouter schedule and prompt conditions fail closed', () => {
  const choice = selectOpenRouterPriceOverride([
    { utc_start: 0, utc_end: 600, utc_days: ['thursday'], input_per_1m: 0.2 },
    { min_prompt_tokens: 1000, input_per_1m: 0.3 },
  ], { promptTokens: 1000, date: new Date('2026-09-24T03:00:00Z') });
  assert.deepEqual(choice, { status: 'ambiguous', override: null });
  assert.equal(describeOpenRouterPriceOverride({ utc_start: 100, utc_end: 400, utc_days: ['monday', 'tuesday'] }), 'mon, tue, 01:00–04:00 UTC');
});

test('rebuilt endpoint overrides remain attached to their exact OpenRouter provider route', async () => {
  const dataset = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const model = dataset.models.find((row) => row.offers.some((offer) => offer.or_model_id === 'deepseek/deepseek-v4.1-flash'));
  assert.ok(model, 'the current source model is represented in the built dataset');
  const routes = model.offers.filter((offer) => offer.or_model_id === 'deepseek/deepseek-v4.1-flash');
  const deepseek = routes.find((offer) => offer.platform === 'OpenRouter' && offer.provider === 'DeepSeek' && offer.endpoint_tag === 'deepseek');
  const alibaba = routes.find((offer) => offer.platform === 'OpenRouter' && offer.provider === 'Alibaba' && offer.endpoint_tag === 'alibaba');
  assert.ok(deepseek?.price_overrides?.length);
  assert.ok(alibaba?.price_overrides?.length);
  assert.notDeepEqual(deepseek.price_overrides, alibaba.price_overrides);
  assert.equal(deepseek.price_overrides[0].input_per_1m, 0.15);
  assert.equal(alibaba.price_overrides[1].input_per_1m, 0.15);
  assert.equal(routes.filter((offer) => offer.platform !== 'OpenRouter').some((offer) => offer.price_overrides?.length), false);
});
