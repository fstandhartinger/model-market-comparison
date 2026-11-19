// CR-786 (19 Nov 2026): OpenRouter stopped listing region-pinned endpoint variants and `:batch` endpoints in one
// step (179 of 1,552 endpoints, bound 77). The bound stays; only a reviewed, expiring receipt bound to the complete
// prior endpoint set may excuse the exact named removals. These tests pin that the receipt cannot excuse anything
// else, lapses, and replays against the retained responses of the two failed runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { approvedOpenRouterEndpointWithdrawals, endpointIdentity, openRouterEndpointSetDigest, planOpenRouterWithdrawals } from '../lib/live-source.mjs';

const fixture = (n, perModel = 3) => Array.from({ length: n }, (_, i) => ({ id: `lab/model-${i}`, name: `Model ${i}`,
  endpoints: Array.from({ length: perModel }, (_, j) => ({ provider_name: `P${j}`, tag: j === 2 ? `p0/eu` : `p${j}`, quantization: 'fp8', pricing: { prompt: '0.000001', completion: '0.000002' } })) }));
const endpointsOf = (models) => new Map(models.map((m) => [m.id, m.endpoints]));
const now = Date.parse('2026-11-19T07:00:00Z');

function scenario() {
  const prior = fixture(100); // 300 endpoints, limit 15
  const previous = { collected_at: '2026-11-17', models: prior };
  // Every model loses its region-pinned third endpoint: 100 of 300 > 15.
  const models = prior.map((m) => ({ ...m, endpoints: m.endpoints.slice(0, 2) }));
  const removed = models.map((m) => `${m.id} P2/p0/eu/fp8`);
  const approval = { cr: 'CR-786', previous_collected_at: '2026-11-17', previous_identity_sha256: openRouterEndpointSetDigest(prior), removed,
    reviewed_at: '2026-11-19T06:30:00Z', expires_at: '2026-11-21T06:00:00Z', review_basis: 'fixture review' };
  return { prior, previous, models, removed, approval };
}

test('CR-786: without a receipt the large endpoint removal still fails at the unchanged bound', () => {
  const { previous, models } = scenario();
  assert.match(planOpenRouterWithdrawals({ previous, models, endpointsById: endpointsOf(models), date: '2026-11-19', now }).error,
    /100 of 300 prior endpoints absent \(limit 15\)/);
});

test('CR-786: a valid receipt records the named removals as ordinary dated withdrawals', () => {
  const { previous, models, approval } = scenario();
  const plan = planOpenRouterWithdrawals({ previous, models, endpointsById: endpointsOf(models), date: '2026-11-19', approval, now });
  assert.equal(plan.error, null);
  assert.equal(plan.run.withdrawn_endpoints.length, 100);
  assert.ok(plan.run.withdrawn_endpoints.every((e) => e.withdrawn_at === '2026-11-19' && e.last_seen === '2026-11-17'));
  assert.equal(plan.withdrawals.endpoints.length, 100);
  assert.deepEqual(plan.run.limits, { models: 10, endpoints: 15 }, 'bounds unchanged');
  assert.deepEqual(plan.run.approved_endpoint_withdrawals, { cr: 'CR-786', reviewed_at: '2026-11-19T06:30:00Z', count: 100 });
});

test('CR-786: unapproved removals still count against the bound', () => {
  const { previous, models, approval } = scenario();
  const within = models.map((m, i) => (i < 15 ? { ...m, endpoints: m.endpoints.slice(1) } : m));
  assert.equal(planOpenRouterWithdrawals({ previous, models: within, endpointsById: endpointsOf(within), date: '2026-11-19', approval, now }).error, null);
  const beyond = models.map((m, i) => (i < 16 ? { ...m, endpoints: m.endpoints.slice(1) } : m));
  assert.match(planOpenRouterWithdrawals({ previous, models: beyond, endpointsById: endpointsOf(beyond), date: '2026-11-19', approval, now }).error,
    /16 of 300 prior endpoints absent \(limit 15\).*100 more under a reviewed approval/);
});

test('CR-786: the receipt lapses on expiry, a long window, a missing basis or a different prior snapshot', () => {
  const { prior, previous, models, approval } = scenario();
  const fails = (a, prev = previous, at = now) => assert.match(planOpenRouterWithdrawals({ previous: prev, models, endpointsById: endpointsOf(models), date: '2026-11-19', approval: a, now: at }).error, /prior endpoints absent \(limit 1[45]\)/);
  fails(approval, previous, Date.parse(approval.expires_at));
  fails(approval, previous, Date.parse('2026-11-19T06:00:00Z')); // before review
  fails({ ...approval, expires_at: '2026-11-23T06:31:00Z' }, previous, now);
  fails({ ...approval, review_basis: ' ' });
  fails({ ...approval, removed: [] });
  fails(approval, { ...previous, collected_at: '2026-11-18' });
  const changed = prior.map((m, i) => (i === 0 ? { ...m, endpoints: m.endpoints.slice(1) } : m));
  fails(approval, { ...previous, models: changed });
  assert.equal(approvedOpenRouterEndpointWithdrawals(null, previous, { now }).size, 0);
});

// Replay against the retained HTTP responses of runs 2026-11-19T05-17 and 05-51 (copied by sha256).
test('CR-786: committed approval replays against the retained 2026-11-19 responses and nothing else', async () => {
  const dir = new URL('../ops/daily-repair-2026-11-19/openrouter-endpoints/', import.meta.url);
  const a = JSON.parse(await readFile(new URL('../data/raw/source-change-approvals.json', import.meta.url), 'utf8')).openrouter_endpoint_withdrawals;
  if (a?.cr !== 'CR-786') return; // superseded by a later receipt
  const reviewBytes = await readFile(new URL('review.json', dir));
  assert.equal(createHash('sha256').update(reviewBytes).digest('hex'), a.review_sha256);
  const review = JSON.parse(reviewBytes);
  assert.ok(Date.parse(a.expires_at) - Date.parse(a.reviewed_at) <= 3 * 86400000 && a.review_basis && a.owner_acceptance);
  assert.equal(new Set(a.removed).size, a.removed.length);
  const { keys, collected_at } = JSON.parse(await readFile(new URL('prior-endpoint-keys.json', dir), 'utf8'));
  // Provider names contain no slash; tags may, quantization is the last segment.
  const row = (id) => { const x = id.indexOf('/'), y = id.lastIndexOf('/'); return { provider_name: id.slice(0, x), tag: id.slice(x + 1, y), quantization: id.slice(y + 1) || null }; };
  const byModel = new Map();
  for (const k of keys) { const s = k.indexOf(' '); const id = k.slice(0, s); if (!byModel.has(id)) byModel.set(id, []); byModel.get(id).push(row(k.slice(s + 1))); }
  const prior = [...byModel].map(([id, endpoints]) => ({ id, endpoints }));
  assert.equal(openRouterEndpointSetDigest(prior), a.previous_identity_sha256);
  assert.equal(collected_at, a.previous_collected_at);
  const previous = { collected_at, models: prior };
  // Current state: prior endpoints for untouched models, the final retained response of the 05:51 run for the others.
  const finalRun = Object.keys(review.runs).sort().at(-1);
  const current = new Map(prior.map((m) => [m.id, m.endpoints]));
  for (const m of review.models) {
    const last = m.responses[finalRun].at(-1);
    assert.equal(last.status, 200);
    const bytes = gunzipSync(await readFile(new URL(`evidence/${last.sha256}.gz`, dir)));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), last.sha256);
    const endpoints = JSON.parse(bytes).data.endpoints;
    assert.deepEqual(endpoints.map(endpointIdentity).sort(), m.current_identities);
    current.set(m.model_id, endpoints);
  }
  const models = prior.map((m) => ({ id: m.id }));
  const at = Date.parse(a.reviewed_at);
  assert.match(planOpenRouterWithdrawals({ previous, models, endpointsById: current, date: '2026-11-19', now: at }).error,
    /179 of 1552 prior endpoints absent \(limit 77\)/);
  const plan = planOpenRouterWithdrawals({ previous, models, endpointsById: current, date: '2026-11-19', approval: a, now: at });
  assert.equal(plan.error, null);
  assert.deepEqual(plan.run.withdrawn_endpoints.map((e) => `${e.model_id} ${e.identity}`).sort(), [...a.removed].sort());
  // The first run's extra absence was not approved: it counts against the bound (1 <= 77) and is never excused.
  const extra = review.excluded_not_in_both_runs;
  assert.deepEqual(extra, ['qwen/qwen3.8-27b Tenstorrent/tenstorrent/fp8/fp8']);
  assert.ok(!a.removed.includes(extra[0]));
  // 78 further unapproved absences fail.
  const stripped = new Map(current);
  let n = 0;
  for (const m of prior) { if (n >= 78) break; const left = stripped.get(m.id); if (left.length) { stripped.set(m.id, left.slice(1)); n++; } }
  assert.match(planOpenRouterWithdrawals({ previous, models, endpointsById: stripped, date: '2026-11-19', approval: a, now: at }).error, /prior endpoints absent \(limit 77\)/);
  assert.match(planOpenRouterWithdrawals({ previous, models, endpointsById: current, date: '2026-11-19', approval: a, now: Date.parse(a.expires_at) }).error, /limit 77/);
});
