// CR-788 (19 Nov 2026): a reviewed receipt lets an exact, large OpenRouter endpoint delisting become dated
// withdrawals; everything outside the receipt still counts against the unchanged 5 % partial-response bound.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planOpenRouterWithdrawals, openRouterEndpointSetDigest, reviewedOpenRouterWithdrawals, OPENROUTER_WITHDRAWAL_BOUNDS } from '../lib/live-source.mjs';

const fixture = (n, perModel = 3) => Array.from({ length: n }, (_, i) => ({ id: `lab/model-${i}`, name: `Model ${i}`,
  endpoints: Array.from({ length: perModel }, (_, j) => ({ provider_name: `P${j}`, tag: `p${j}`, quantization: 'fp8', pricing: { prompt: '0.000001', completion: '0.000002' } })) }));
const endpointsOf = (models) => new Map(models.map((m) => [m.id, m.endpoints]));
const NOW = Date.parse('2026-11-19T12:00:00Z');
const prior = fixture(100); // 300 endpoints, limit 15
const previous = { collected_at: '2026-11-17', models: prior };
const stripped = prior.map((m, i) => (i < 20 ? { ...m, endpoints: m.endpoints.slice(1) } : m)); // 20 lost
const lostKeys = prior.slice(0, 20).map((m) => `${m.id} P0/p0/fp8`);
const receipt = (over = {}) => ({ previous_endpoint_set_sha256: openRouterEndpointSetDigest(prior), withdrawn: lostKeys,
  reviewed_at: '2026-11-19T09:30:00Z', expires_at: '2026-11-22T06:00:00Z', review_basis: 'reviewed delisting', ...over });
const plan = (receipts, models = stripped, now = NOW) => planOpenRouterWithdrawals({ previous, models, endpointsById: endpointsOf(models), date: '2026-11-19', receipts, now });

test('CR-788: without a receipt the bound still stops the run', () => {
  assert.match(plan([]).error, /20 of 300 prior endpoints absent \(limit 15\)/);
});

test('CR-788: an exact, valid receipt turns the delisting into dated withdrawals', () => {
  const p = plan([receipt()]);
  assert.equal(p.error, null);
  assert.equal(p.run.withdrawn_endpoints.length, 20);
  assert.equal(p.run.reviewed_endpoint_withdrawals, 20);
  assert.ok(p.withdrawals.endpoints.every((e) => e.withdrawn_at === '2026-11-19'));
});

test('CR-788: absences outside the receipt still count against the unchanged bound', () => {
  const more = stripped.map((m, i) => (i >= 20 && i < 36 ? { ...m, endpoints: m.endpoints.slice(1) } : m)); // +16 unreceipted
  assert.match(plan([receipt()], more).error, /16 of 300 prior endpoints absent \(limit 15\).*20 more withdrawn under a reviewed receipt/);
  const within = stripped.map((m, i) => (i >= 20 && i < 35 ? { ...m, endpoints: m.endpoints.slice(1) } : m)); // +15 ok
  assert.equal(plan([receipt()], within).error, null);
  assert.deepEqual(OPENROUTER_WITHDRAWAL_BOUNDS.endpoints, { share: 0.05 });
});

test('CR-788: an expired, too long, unbased or differently bound receipt is ignored', () => {
  for (const bad of [
    receipt({ expires_at: '2026-11-19T11:00:00Z' }),
    receipt({ expires_at: '2026-11-23T10:00:00Z' }), // > 3 days after review
    receipt({ review_basis: ' ' }),
    receipt({ reviewed_at: '2026-11-20T09:00:00Z', expires_at: '2026-11-21T09:00:00Z' }), // reviewed in the future
    receipt({ reviewed_at: '2026-11-19T11:00:00Z', expires_at: '2026-11-19T10:00:00Z' }), // expires before review
    receipt({ previous_endpoint_set_sha256: '0'.repeat(64) }),
    receipt({ withdrawn: 'all' }),
  ]) assert.match(plan([bad]).error, /20 of 300 prior endpoints absent/);
  // Once a successful run replaces the snapshot, the receipt no longer binds.
  assert.equal(reviewedOpenRouterWithdrawals([receipt()], stripped, { now: NOW }).size, 0);
});

test('CR-788: the committed 19 Nov receipt is well-formed and bound to its review file', async () => {
  const approvals = JSON.parse(readFileSync(new URL('../data/raw/source-change-approvals.json', import.meta.url), 'utf8'));
  const [r] = approvals.openrouter_endpoint_withdrawals;
  assert.equal(r.withdrawn.length, 179);
  assert.ok(Date.parse(r.expires_at) - Date.parse(r.reviewed_at) <= 3 * 86400000);
  const { createHash } = await import('node:crypto');
  const review = readFileSync(new URL(`../${r.review_file}`, import.meta.url));
  assert.equal(createHash('sha256').update(review).digest('hex'), r.review_sha256);
  assert.deepEqual([...JSON.parse(review).withdrawn].sort(), r.withdrawn);
});
