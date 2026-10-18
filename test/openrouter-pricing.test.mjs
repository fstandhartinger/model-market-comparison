import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { collapseDuplicateEndpoints } from '../lib/openrouter-endpoints.mjs';
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
  // Expectations come from the collected OpenRouter source itself, not from one pinned model slug:
  // OpenRouter moves first-party routes between dated slugs (18 Oct 2026: DeepSeek's own endpoint left
  // deepseek/deepseek-v4.1-flash for deepseek/deepseek-v4.1-flash-1017), and a correct rebuild must follow.
  const dataset = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const source = JSON.parse(await readFile(new URL('../data/raw/openrouter.json', import.meta.url), 'utf8'));
  const expected = new Map();
  for (const m of source.models || []) {
    const priced = (m.endpoints || []).filter((e) => e.pricing?.prompt != null || e.pricing?.completion != null);
    for (const { endpoint: e } of collapseDuplicateEndpoints(priced)) {
      const key = `${m.id}::${e.provider_name || 'Unknown'}::${e.tag || null}`;
      if (!expected.has(key)) expected.set(key, []);
      expected.get(key).push(normalizeOpenRouterPriceOverrides(e.pricing?.overrides));
    }
  }
  const routes = dataset.models.flatMap((row) => row.offers).filter((offer) => offer.platform === 'OpenRouter' && offer.or_model_id);
  const scheduled = routes.filter((offer) => offer.price_overrides?.length);
  assert.ok(scheduled.length, 'at least one built OpenRouter route carries a source price schedule');
  let checked = 0;
  for (const offer of routes) {
    const key = `${offer.or_model_id}::${offer.provider}::${offer.endpoint_tag}`;
    const candidates = expected.get(key);
    // Routes outside this collection (e.g. curated stealth rows) may not invent a schedule.
    if (!candidates) { assert.equal(offer.price_overrides?.length ?? 0, 0, `${key} has no source schedule`); continue; }
    checked += 1;
    assert.ok(candidates.some((overrides) => isDeepStrictEqual(offer.price_overrides ?? [], overrides)),
      `${key} carries exactly its own source schedule`);
  }
  assert.ok(checked > scheduled.length, 'routes with and without a schedule were both compared with the source');
  // Sibling routes of one model keep different schedules apart instead of sharing one.
  assert.ok(scheduled.some((route) => routes.some((offer) => offer.or_model_id === route.or_model_id
    && !isDeepStrictEqual(offer.price_overrides ?? [], route.price_overrides))),
  'some model has sibling routes with a different schedule, so cross-wiring would be detected');
  const orIds = new Set(routes.map((offer) => offer.or_model_id));
  assert.equal(dataset.models.flatMap((row) => row.offers)
    .some((offer) => offer.platform !== 'OpenRouter' && orIds.has(offer.or_model_id) && offer.price_overrides?.length), false);
});
