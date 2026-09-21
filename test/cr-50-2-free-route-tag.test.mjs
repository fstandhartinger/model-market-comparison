// CR-50.2 — the "Free route" mark appears only while a zero-price route is current and broadly usable
// (Florian 2026-09-16, CR-20260916l). The form (a muted pill under the price, provider and limits in its title) was
// chosen by the design authority in iteration 149; these fixtures pin when it may appear and what it may claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { currentFreeRoutes, freeRouteTitle, isCurrentFreeRoute, paidRoutes, FREE_ROUTE_MAX_AGE_DAYS } from '../lib/free-route.mjs';

const WHEN = { snapshotDate: '2026-09-21', generatedAt: '2026-09-21T11:43:44.634Z' };
const free = (over = {}) => ({ platform: 'OpenRouter', provider: 'Decart', or_model_id: 'z-ai/glm-5.2:free', input_per_1m: 0, output_per_1m: 0, status: 0, ...over });
const paid = (over = {}) => ({ platform: 'OpenRouter', provider: 'Fireworks', or_model_id: 'z-ai/glm-5.2', input_per_1m: 0.6, output_per_1m: 2.2, status: 0, ...over });

test('CR-50.2: a current, healthy free route alongside a paid one is marked; the paid route still sets the price', () => {
  const offers = [paid(), free()];
  assert.deepEqual(currentFreeRoutes(offers, WHEN).map((o) => o.provider), ['Decart']);
  assert.deepEqual(paidRoutes(offers).map((o) => o.provider), ['Fireworks']);
});

test('CR-50.2: a model whose only route is a valid free one is marked', () => {
  assert.equal(currentFreeRoutes([free({ provider: 'Nex AGI', or_model_id: 'nex-agi/nex-n2.5-pro:free' })], WHEN).length, 1);
});

test('CR-50.2: a vanished free endpoint leaves no mark', () => {
  // The refresh drops a route OpenRouter no longer lists; what remains is paid only.
  assert.deepEqual(currentFreeRoutes([paid()], WHEN), []);
});

test('CR-50.2: degraded, stealth-preview, non-OpenRouter and stale routes are not "currently available"', () => {
  assert.equal(isCurrentFreeRoute(free({ status: -2 }), WHEN), false);
  assert.equal(isCurrentFreeRoute(free({ status: -5 }), WHEN), false);
  assert.equal(isCurrentFreeRoute(free({ status: null }), WHEN), false);
  assert.equal(isCurrentFreeRoute(free({ or_model_id: 'stealth/union-alpha', endpoint_tag: 'stealth' }), WHEN), false);
  assert.equal(isCurrentFreeRoute(free({ platform: 'Chutes', or_model_id: null }), WHEN), false);
  const stale = { snapshotDate: '2026-09-17', generatedAt: '2026-09-21T11:43:44.634Z' };
  assert.equal(FREE_ROUTE_MAX_AGE_DAYS, 3);
  assert.equal(isCurrentFreeRoute(free(), stale), false);
  assert.equal(isCurrentFreeRoute(free(), { snapshotDate: '2026-09-18', generatedAt: '2026-09-21T00:00:00Z' }), true);
  assert.equal(isCurrentFreeRoute(free(), {}), false, 'an unknown snapshot date is unconfirmed');
  assert.equal(isCurrentFreeRoute(free(), { snapshotDate: '2026-09-23', generatedAt: '2026-09-21T11:43:44.634Z' }), false, 'a snapshot dated after the build is unconfirmed (Codex P2)');
});

test('CR-50.2: a paid route is never a free route', () => {
  assert.equal(isCurrentFreeRoute(paid(), WHEN), false);
});

test('CR-50.2: the title names the provider and the limits and never calls the model free', () => {
  const title = freeRouteTitle([free(), free({ provider: 'Decart' }), free({ provider: 'ModelRun' })], '2026-09-21');
  assert.match(title, /^Free route on OpenRouter via Decart, ModelRun \(listed live on 2026-09-21\)\./);
  assert.match(title, /limits apply/);
  assert.match(title, /availability may change/);
  assert.match(title, /every other route costs money/);
  assert.doesNotMatch(title, /model is free|is free\b/i);
});

test('CR-50.2: the overview marks free routes from the filtered route list and explains the pill in the legend', async () => {
  const src = await readFile(new URL('../components/ModelExplorer.tsx', import.meta.url), 'utf8');
  // Filters apply: the mark reads the scoped route list, not the raw catalog.
  assert.match(src, /const freeRoutes = currentFreeRoutes\(allOffers, freeRouteWhen\)/);
  assert.match(src, /const allOffers = scopedCatalogRoutes\(data\.offersByModel\[m\.id\], offerScope, ctx\)/);
  assert.match(src, /data-bh-tag-legend="free-route"/);
  assert.match(src, /className="bh-free-tag" data-bh-free-route=/);
});
