// D252 (2026-09-28): the 11:23 run retained 28 arms, published, and reported STATUS ok. 25 of those
// arms carry `round N: worker: No supported viable worker model found` — worker selection threw
// before any call, so no producer and no critic ever saw today's capture. Per arm that is the
// designed fail-closed retention; in aggregate it is a run that reviewed nothing and read exactly
// like a run that reviewed everything, because `staleSources` names a source only once its last good
// day is three days old and 26 of the 28 had been good that morning.
import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewRounds, reviewCapacityTotals, sourceHealth, healthMarkdown } from '../ops/daily/source-health.mjs';

const WORKER = 'worker: No supported viable worker model found';
const threeLost = (id) => ({ id, status: 'retained_after_failure',
  reason: `${id}: protocol not approved: round 1: ${WORKER}; round 2: ${WORKER}; round 3: ${WORKER}` });

test('the rounds of a retained arm are read in order, whatever ended them', () => {
  assert.deepEqual(reviewRounds(`x: protocol not approved: round 1: ${WORKER}; round 2: ${WORKER}`),
    [WORKER, WORKER]);
  // The real aa-benchmark-fields shape: one round reached a model and timed out, two did not.
  assert.deepEqual(reviewRounds('aa: protocol not approved: round 1: deepseek/deepseek-v4-flash-0731: '
    + `The operation was aborted due to timeout; round 2: ${WORKER}; round 3: ${WORKER}`),
    ['deepseek/deepseek-v4-flash-0731: The operation was aborted due to timeout', WORKER, WORKER]);
  // A reason that names no rounds is not a review-capacity fact at all.
  assert.deepEqual(reviewRounds('source_unreachable_or_manual'), []);
  assert.deepEqual(reviewRounds(null), []);
});

test('an arm is reviewless only when every one of its rounds ended at worker selection', () => {
  const run = { checks: [
    threeLost('arc-agi::1'),
    { id: 'aa-benchmark-fields', status: 'retained_after_failure',
      reason: `aa: protocol not approved: round 1: glm: timeout; round 2: ${WORKER}; round 3: ${WORKER}` },
    // A real review that ran and found a mismatch is not a capacity failure.
    { id: 'mazur::snapshot', status: 'retained_after_failure',
      reason: 'mazur: protocol not approved: round 1: c1 mismatch: unit does not describe the served scale' },
    // Nor is an unreachable source, nor a healthy one.
    { id: 'https://example.test/x', status: 'source_unreachable_or_manual', reason: 'HTTP 403' },
    { id: 'vals-index::2', status: 'checked_unchanged' },
  ] };
  const totals = reviewCapacityTotals(run);
  assert.equal(totals.arms, 2, 'both arms lost at least one round before any model was called');
  assert.equal(totals.reviewless, 1, 'only arc-agi::1 never reached a model at all');
  assert.equal(totals.rounds_lost, 5);
  assert.deepEqual(totals.sources, ['arc-agi::1', 'aa-benchmark-fields']);
});

test('a run whose reviews all ran reports no lost capacity', () => {
  assert.deepEqual(reviewCapacityTotals({ checks: [
    { id: 'a', status: 'checked_unchanged' },
    { id: 'b', status: 'retained_after_failure', reason: 'b: protocol not approved: round 1: c1 mismatch: metric' },
  ] }), { arms: 0, reviewless: 0, rounds_lost: 0, sources: [] });
  assert.deepEqual(reviewCapacityTotals({}), { arms: 0, reviewless: 0, rounds_lost: 0, sources: [] });
});

test('the health view carries the count and the markdown says the review did not run', () => {
  const health = sourceHealth([{ checked_at: '2026-09-28T11:53:42.848Z',
    checks: [threeLost('arc-agi::1'), threeLost('arc-agi::2'), { id: 'ok-source', status: 'updated' }] }],
    { plan: { entries: [] } });
  assert.equal(health.review_capacity.arms, 2);
  assert.equal(health.review_capacity.reviewless, 2);
  const md = healthMarkdown(health);
  assert.match(md, /2 arm\(s\) retained without a reviewer/);
  assert.match(md, /before any model saw today's capture/);
  assert.match(md, /the review did not run/);
  assert.match(md, /arc-agi::1, arc-agi::2/);
  // It is counted only on the newest run, like the quarantine and budget totals beside it.
  const older = sourceHealth([{ checked_at: '2026-09-28T12:00:00.000Z', checks: [{ id: 'ok-source', status: 'updated' }] },
    { checked_at: '2026-09-28T11:53:42.848Z', checks: [threeLost('arc-agi::1')] }], { plan: { entries: [] } });
  assert.equal(older.review_capacity.arms, 0);
  assert.doesNotMatch(healthMarkdown(older), /retained without a reviewer/);
});

// D252, second half: the run that lost its reviewers kept no record of why its free critic route was
// missing. `free_router: []` was in the catalog of all three 2026-09-28 runs; the reason had to be
// reconstructed from a health file that had since been rewritten.
test('every free router route that is not offered says why, in the catalog', async () => {
  const { freeRouterRejections, FREE_ROUTER_WORKERS } = await import('../ops/rebuild-2026-09/bin/worker-policy.mjs');
  const dataset = { models: [{ id: 'kimi-k3::max', benchmarks: { aa_intelligence_index: 43.8 } },
    { id: 'qwen3.8-27b::xhigh', benchmarks: { aa_intelligence_index: 33.7 } }] };
  const healthy = { models: { 'kimi-k3': { usable: true, rank: 0 }, 'qwen3.8-27b': { usable: true, rank: 1 } } };
  // A qualified, healthy route is not a rejection and says nothing.
  const kimi = (r) => r.find((x) => x.id === 'chutes/moonshotai/Kimi-K3-TEE');
  assert.equal(kimi(freeRouterRejections(dataset, healthy)), undefined);
  // The real 2026-09-28 shape: the route exists and is whitelisted, but the health file does not mark
  // it usable — which is exactly the fact the runs did not record.
  const unwell = { models: { 'kimi-k3': { usable: false, rank: 99 } } };
  assert.deepEqual(kimi(freeRouterRejections(dataset, unwell)),
    { id: 'chutes/moonshotai/Kimi-K3-TEE', reasons: ['route not healthy in models.kimi-k3'] });
  assert.deepEqual(kimi(freeRouterRejections(dataset, null)),
    { id: 'chutes/moonshotai/Kimi-K3-TEE', reasons: ['route not healthy in models.kimi-k3'] });
  // Qwen is kept out by the rule, not by an omission (CR-66.3), and both halves of that are named.
  const qwen = freeRouterRejections(dataset, healthy).find((x) => x.id === 'chutes/Qwen/Qwen3.8-27B-TEE');
  assert.deepEqual(qwen.reasons, ["not on Florian's scheduled-worker whitelist", 'qwen3.8-27b::xhigh AA 33.7 below 34']);
  // A route with no AA measurement at all is distinguished from one measured too low.
  const unscored = freeRouterRejections({ models: [] }, healthy)
    .find((x) => x.id === 'chutes/moonshotai/Kimi-K3-TEE');
  assert.deepEqual(unscored.reasons, ['no AA index for kimi-k3::max']);
  assert.ok(FREE_ROUTER_WORKERS.length >= 3, 'every declared route is considered, so none drops out silently');
});
