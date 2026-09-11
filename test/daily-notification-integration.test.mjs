import test from 'node:test';
import assert from 'node:assert/strict';
import { planNotifications, findNotableDivergences, findNewMajorModels } from '../ops/daily/policy.mjs';
import { computeDivergences } from '../lib/benchmark-scores.mjs';
const previous = [{ family_key: 'known', name: 'Known', composite: 60 }];
const current = [{ family_key: 'entrant', name: 'Entrant', composite: 61 }];

test('real notification plan recognizes a top-five family entrant and first run is quiet', () => {
  const plan = planNotifications({ status_ok: true, top5: { previous, current }, now: 1_800_000_000_000 });
  assert.equal(plan.sends.filter((s) => s.kind === 'top5-entrant').length, 1);
  assert.equal(planNotifications({ status_ok: true, top5: { previous: null, current }, now: 1_800_000_000_000 }).sends.length, 0);
});

test('failed publication does not advance the successful top-five baseline', () => {
  const plan = planNotifications({ status_ok: false, top5: { previous, current }, now: 1_800_000_000_000 });
  assert.deepEqual(plan.baseline.top5_state ?? previous, previous);
  assert.equal(plan.sends.some((s) => s.kind === 'top5-entrant'), false);
});

test('actual benchmark divergence output converts fractions to percentage points and excludes generic points', () => {
  const row = (basis, value, unit) => ({ id: basis, basis, value, unit, benchmark_id: 'synthetic::1', subject: { model_id: 'synthetic', variant: null, harness: null }, comparison_key: 'same-reviewed-protocol', source: { url: `https://${basis}.example.test/primary`, retrieved_at: '2026-01-01' } });
  const fractional = computeDivergences([row('self_reported', 0.9, 'fraction'), row('measured', 0.7, 'fraction')]);
  assert.equal(findNotableDivergences({}, { divergences: fractional }).length, 1);
  const arbitrary = computeDivergences([row('self_reported', 90, 'points'), row('measured', 70, 'points')]);
  assert.equal(findNotableDivergences({}, { divergences: arbitrary }).length, 0);
});

test('one new major family with several reasoning variants creates one notable entry', () => {
  const models = [56, 58].map((value) => ({ id: `new::${value}`, family_key: 'new', display_name: 'New', benchmarks: { aa_intelligence_index: value } }));
  const found = findNewMajorModels({ models: [] }, { models });
  assert.equal(found.length, 1);
  assert.equal(found[0].index, 58);
});

test('an eligible event whose send fails is still delivered after the next snapshot becomes the baseline', async () => {
  const { executeNotifications } = await import('../ops/daily/notify.mjs');
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const stateDir = await mkdtemp(join(tmpdir(), 'bh-notify-retry-'));
  try {
    const initial = await executeNotifications({ stateDir, context: { status_ok: true, top5: { previous, current } }, env: {}, now: 1_800_000_000_000 });
    assert.equal(initial.failed.length, 1);
    let requests = 0;
    const next = await executeNotifications({ stateDir, context: { status_ok: true, top5: { previous: current, current } }, env: { TG_BOT_TOKEN: 'synthetic', TG_CHAT_ID: 'synthetic' }, now: 1_800_086_400_000, fetchImpl: async () => { requests++; return Response.json({ ok: true }); } });
    assert.equal(requests, 1);
    assert.equal(next.sent.includes('top5-entrant'), true);
  } finally { await rm(stateDir, { recursive: true, force: true }); }
});

test('Telegram transport errors cannot put credentials into logs', async () => {
  const { sendTelegram } = await import('../ops/daily/notify.mjs');
  const token = 'synthetic-secret-token';
  const result = await sendTelegram('fixture', { token, chatId: 'fixture', fetchImpl: async () => { throw new Error(`failed URL https://api.telegram.org/bot${token}/sendMessage`); } });
  assert.equal(result.sent, false);
  assert.equal(result.reason.includes(token), false);
});

test('failure delivery retries through the weekly gate and three failures request escalation', async () => {
  const { executeNotifications } = await import('../ops/daily/notify.mjs');
  const { mkdtemp, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const stateDir = await mkdtemp(join(tmpdir(), 'bh-failure-retry-'));
  const start = 1_800_000_000_000, day = 86_400_000;
  let delivered = 0;
  const base = { stateDir, context: { status_ok: false, rc: 1 }, env: { TG_BOT_TOKEN: 'fixture', TG_CHAT_ID: 'fixture' }, fetchImpl: async () => { delivered++; return Response.json({ ok: true }); } };
  try {
    assert.equal((await executeNotifications({ ...base, env: {}, now: start })).failed.length, 1);
    assert.equal((await executeNotifications({ ...base, now: start + day })).sent.filter((s) => s === 'failure').length, 1);
    await executeNotifications({ ...base, now: start + 2 * day });
    assert.equal(delivered, 1);
    assert.equal(JSON.parse(await readFile(join(stateDir, 'escalation-request.json'))).streak, 3);
    await executeNotifications({ ...base, now: start + 8 * day - 1 });
    assert.equal(delivered, 1);
    await executeNotifications({ ...base, now: start + 8 * day });
    assert.equal(delivered, 2);
  } finally { await rm(stateDir, { recursive: true, force: true }); }
});

test('recovery drops an unsent stale failure alert without a Telegram message', async () => {
  const { executeNotifications } = await import('../ops/daily/notify.mjs');
  const { mkdtemp, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const stateDir = await mkdtemp(join(tmpdir(), 'bh-failure-recovery-'));
  let delivered = 0;
  try {
    await executeNotifications({ stateDir, context: { status_ok: false, rc: 1 }, env: {}, now: 1_800_000_000_000 });
    const result = await executeNotifications({ stateDir, context: { status_ok: true }, env: { TG_BOT_TOKEN: 'fixture', TG_CHAT_ID: 'fixture' }, now: 1_800_086_400_000, fetchImpl: async () => { delivered++; return Response.json({ ok: true }); } });
    assert.equal(delivered, 0); assert.equal(result.sent.length, 0);
    const state = JSON.parse(await readFile(join(stateDir, 'daily-state.json')));
    assert.deepEqual(state.pending, []); assert.equal(state.failure_streak, 0);
  } finally { await rm(stateDir, { recursive: true, force: true }); }
});
