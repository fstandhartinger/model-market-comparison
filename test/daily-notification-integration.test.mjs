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

// CR-66.6: a stub `notify` binary records its arguments; nothing talks to Telegram directly.
async function stubNotify(dir, { fail = false } = {}) {
  const { writeFile, chmod } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const bin = join(dir, 'notify'), log = join(dir, 'notify-calls.jsonl');
  await writeFile(bin, `#!/usr/bin/env node\nrequire('node:fs').appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + '\\n');\nprocess.exit(${fail ? 1 : 0});\n`);
  await chmod(bin, 0o755);
  const calls = async () => { try { return (await (await import('node:fs/promises')).readFile(log, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); } catch { return []; } };
  return { bin, calls };
}

test('an eligible event whose notify send fails is still delivered after the next snapshot becomes the baseline', async () => {
  const { executeNotifications } = await import('../ops/daily/notify.mjs');
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const stateDir = await mkdtemp(join(tmpdir(), 'bh-notify-retry-'));
  try {
    const broken = await stubNotify(join(stateDir), { fail: true });
    const initial = await executeNotifications({ stateDir, context: { status_ok: true, top5: { previous, current } }, env: { BH_NOTIFY: broken.bin }, now: 1_800_000_000_000 });
    assert.equal(initial.failed.length, 1);
    const working = await stubNotify(await mkdtemp(join(tmpdir(), 'bh-notify-ok-')));
    const next = await executeNotifications({ stateDir, context: { status_ok: true, top5: { previous: current, current } }, env: { BH_NOTIFY: working.bin }, now: 1_800_086_400_000 });
    assert.equal(next.sent.includes('top5-entrant'), true);
    const calls = await working.calls();
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'now');
    // Same event again: deduplicated, notify is not called a second time.
    await executeNotifications({ stateDir, context: { status_ok: true, top5: { previous, current } }, env: { BH_NOTIFY: working.bin }, now: 1_800_172_800_000 });
    assert.equal((await working.calls()).length, 1);
  } finally { await rm(stateDir, { recursive: true, force: true }); }
});

test('CR-66.6: no direct Telegram request remains in ops/daily; a missing notify binary is a failed send, not a crash', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  for (const file of await readdir(new URL('../ops/daily/', import.meta.url))) {
    if (!/\.(mjs|sh|py)$/.test(file)) continue;
    const text = await readFile(new URL(`../ops/daily/${file}`, import.meta.url), 'utf8');
    assert.equal(/api\.telegram\.org|TG_BOT_TOKEN/.test(text), false, `${file} must go through ~/bin/notify`);
  }
  const { sendNotify } = await import('../ops/daily/notify.mjs');
  const result = await sendNotify('fixture', { bin: '/nonexistent/notify' });
  assert.deepEqual(result, { sent: false, reason: 'notify_missing' });
});

test('failures send nothing from the daily notifier (the publish gate alerts) but three failures still request escalation', async () => {
  const { executeNotifications } = await import('../ops/daily/notify.mjs');
  const { mkdtemp, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const stateDir = await mkdtemp(join(tmpdir(), 'bh-failure-retry-'));
  const start = 1_800_000_000_000, day = 86_400_000;
  try {
    const stub = await stubNotify(stateDir);
    const base = { stateDir, context: { status_ok: false, rc: 1 }, env: { BH_NOTIFY: stub.bin } };
    for (let i = 0; i < 3; i++) {
      const result = await executeNotifications({ ...base, now: start + i * day });
      assert.equal(result.sent.length, 0);
      assert.ok(result.plan.skips.some((s) => s.kind === 'failure'));
    }
    assert.equal((await stub.calls()).length, 0);
    assert.equal(JSON.parse(await readFile(join(stateDir, 'escalation-request.json'))).streak, 3);
    const state = JSON.parse(await readFile(join(stateDir, 'daily-state.json')));
    assert.deepEqual(state.pending, []);
    assert.equal(state.failure_streak, 3);
  } finally { await rm(stateDir, { recursive: true, force: true }); }
});

test('recovery resets the failure streak without a message', async () => {
  const { executeNotifications } = await import('../ops/daily/notify.mjs');
  const { mkdtemp, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const stateDir = await mkdtemp(join(tmpdir(), 'bh-failure-recovery-'));
  try {
    const stub = await stubNotify(stateDir);
    await executeNotifications({ stateDir, context: { status_ok: false, rc: 1 }, env: { BH_NOTIFY: stub.bin }, now: 1_800_000_000_000 });
    const result = await executeNotifications({ stateDir, context: { status_ok: true }, env: { BH_NOTIFY: stub.bin }, now: 1_800_086_400_000 });
    assert.equal(result.sent.length, 0);
    assert.equal((await stub.calls()).length, 0);
    const state = JSON.parse(await readFile(join(stateDir, 'daily-state.json')));
    assert.deepEqual(state.pending, []); assert.equal(state.failure_streak, 0);
  } finally { await rm(stateDir, { recursive: true, force: true }); }
});
