// Reliability review N132 (19 Nov 2026): the daily records its npm-test duration and posts one #8 finding when the
// suite nears its cap, and one #8 finding on the first publish-blocking failure of a streak (not after a streak).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COLLECTOR_OWNER_JOB, DAILY_FINDING_THREAD, npmTestBudgetFinding, npmTestRecord, nextNpmTestHistory, planNotifications, publishBlockedFinding } from '../ops/daily/policy.mjs';
import { executeNotifications, sendBoardHandoff } from '../ops/daily/notify.mjs';
import { NPM_TEST_TIMEOUT_MS } from '../ops/daily/daily.mjs';

const CAP = 3_600_000;
const DAY_MS = 86_400_000;
const T0 = Date.parse('2026-11-19T05:40:00Z');
const run = (seconds, { ok = true, concurrency = 12 } = {}) => npmTestRecord([{ name: 'npm-test', ok, duration_ms: seconds * 1000 }], { capMs: CAP, concurrency });

test('the daily judges npm-test against the same cap the step is killed at', () => {
  assert.equal(NPM_TEST_TIMEOUT_MS, CAP);
  assert.equal(npmTestRecord([{ name: 'npm-ci', ok: true, duration_ms: 5 }], { capMs: CAP }), null, 'no record when the step never ran');
  const killed = run(3600.4, { ok: false });
  assert.equal(killed.timed_out, true);
  assert.equal(run(2800).timed_out, false);
});

test('fixture: 2800 of 3600 s warns, 2000 s stays silent, a killed suite is the 100 % band', () => {
  const warn = npmTestBudgetFinding(run(2800), [], { day: '2026-11-19' });
  assert.equal(warn.key, 'npm-test-budget:75');
  assert.equal(warn.thread, DAILY_FINDING_THREAD);
  assert.match(warn.text, /2800 s of its 3600 s cap \(78 %\)/);
  assert.match(warn.text, /never raise the cap/);
  assert.equal(npmTestBudgetFinding(run(2000), [{ day: '2026-11-18', duration_ms: 1950_000, concurrency: 12 }], { day: '2026-11-19' }), null);
  assert.equal(npmTestBudgetFinding(run(3165), [], { day: '2026-11-19' }).key, 'npm-test-budget:85');
  const killed = npmTestBudgetFinding(run(3600, { ok: false }), [], { day: '2026-11-19' });
  assert.equal(killed.key, 'npm-test-budget:100');
  assert.match(killed.text, /killed at its 3600 s cap/);
});

test('a rise of more than 10 % against the last earlier day warns only past half the cap and at the same concurrency', () => {
  const history = [{ day: '2026-11-18', duration_ms: 1600_000, concurrency: 12 }];
  const rise = npmTestBudgetFinding(run(1900), history, { day: '2026-11-19' });
  assert.equal(rise.key, 'npm-test-rise:2026-11-19');
  assert.match(rise.text, /1600 s on 2026-11-18 \(\+19 %\)/);
  assert.equal(npmTestBudgetFinding(run(1700), history, { day: '2026-11-19' }), null, '+6 % is noise');
  assert.equal(npmTestBudgetFinding(run(1200), [{ day: '2026-11-18', duration_ms: 1000_000, concurrency: 12 }], { day: '2026-11-19' }), null, 'a third of the cap is no risk');
  assert.equal(npmTestBudgetFinding(run(1900), [{ day: '2026-11-18', duration_ms: 1600_000, concurrency: null }], { day: '2026-11-19' }), null, 'another concurrency is not comparable');
  assert.equal(npmTestBudgetFinding(run(1900), [{ day: '2026-11-19', duration_ms: 1600_000, concurrency: 12 }], { day: '2026-11-19' }), null, 'a same-day retry is not "a day"');
});

test('only a completed suite enters the duration history; a dry run records nothing', () => {
  const iso = '2026-11-19T06:00:00.000Z';
  assert.deepEqual(nextNpmTestHistory([], run(2000), { iso }).map((h) => [h.day, h.duration_ms, h.concurrency]), [['2026-11-19', 2_000_000, 12]]);
  assert.deepEqual(nextNpmTestHistory([], run(3600, { ok: false }), { iso }), []);
  assert.deepEqual(nextNpmTestHistory([], run(2000), { iso, dryRun: true }), []);
  const long = Array.from({ length: 20 }, (_, i) => ({ day: `2026-10-${String(i + 1).padStart(2, '0')}`, duration_ms: 1000 }));
  assert.equal(nextNpmTestHistory(long, run(2000), { iso }).length, 14);
});

test('the first failed run of a streak plans one publish-blocked finding; later runs of that streak are duplicates', () => {
  const first = planNotifications({ status_ok: false, rc: 1, failure_streak: 0, published: false, failed_step: 'npm-test',
    error: 'npm-test FAILED: ...\nTIMEOUT: npm-test was killed after 3600123 ms against its 3600000 ms limit', run_dir: '/runs/a', now: T0 });
  const send = first.sends.find((s) => s.kind === 'publish-blocked');
  assert.ok(send);
  assert.deepEqual(send.board, { thread: 8, kind: 'finding' });
  assert.equal(first.baseline.failure_streak_started_at, '2026-11-19T05:40:00.000Z');
  assert.match(send.text, /rc=1 in step npm-test/);
  assert.match(send.text, /Cause: TIMEOUT: npm-test was killed/);
  const notified = { [send.key]: new Date(T0).toISOString() };
  const second = planNotifications({ status_ok: false, rc: 1, failure_streak: 1, failure_streak_started_at: first.baseline.failure_streak_started_at,
    notified, published: false, now: T0 + 3_600_000 });
  assert.equal(second.sends.some((s) => s.kind === 'publish-blocked'), false);
  assert.ok(second.skips.some((s) => s.kind === 'publish-blocked' && s.reason === 'duplicate'));
  assert.equal(second.baseline.failure_streak_started_at, first.baseline.failure_streak_started_at);
  const recovered = planNotifications({ status_ok: true, failure_streak: 2, failure_streak_started_at: first.baseline.failure_streak_started_at, notified, now: T0 + DAY_MS });
  assert.equal(recovered.baseline.failure_streak_started_at, null);
  const next = planNotifications({ status_ok: false, rc: 1, failure_streak: 0, notified, published: false, now: T0 + 2 * DAY_MS });
  assert.equal(next.sends.filter((s) => s.kind === 'publish-blocked').length, 1, 'a new streak posts again');
});

test('a run that published (e.g. only the live check failed) is not a publish block; an open pre-N132 streak posts once', () => {
  assert.equal(publishBlockedFinding({ statusOk: false, published: true, streakStartedAt: '2026-11-19T05:40:00.000Z', streak: 1 }), null);
  const open = planNotifications({ status_ok: false, rc: 1, failure_streak: 5, now: T0 });
  assert.equal(open.baseline.failure_streak_started_at, '2026-11-19T05:40:00.000Z');
  assert.equal(open.sends.filter((s) => s.kind === 'publish-blocked').length, 1);
});

function recorder({ failFirst = 0 } = {}) {
  const calls = [];
  let failures = failFirst;
  const execImpl = async (bin, args) => {
    if (failures > 0) { failures -= 1; const e = new Error('relay down'); e.code = 1; throw e; }
    calls.push({ bin, args });
    return { stdout: '', stderr: '' };
  };
  return { calls, execImpl, boardPosts: () => calls.filter((c) => c.args[0] === 'post') };
}

test('fixture: a publish block across four failed runs posts exactly one #8 finding, unaddressed; Florian gets nothing', async () => {
  const stateDir = await mkdtemp(join(tmpdir(), 'bh-n132-block-'));
  try {
    const r = recorder();
    const env = { BH_AGENT_BOARD: '/stub/agent-board', BH_NOTIFY: '/stub/notify', HOME: stateDir };
    for (let i = 0; i < 4; i++) {
      await executeNotifications({ stateDir, env, execImpl: r.execImpl, now: T0 + i * 3_600_000,
        context: { status_ok: false, rc: 1, published: false, failed_step: 'npm-test', error: 'TIMEOUT: npm-test was killed', run_dir: `/runs/${i}` } });
    }
    const posts = r.boardPosts();
    assert.equal(posts.length, 1);
    assert.deepEqual(posts[0].args.slice(0, 4), ['post', '8', '--kind', 'finding']);
    assert.equal(posts[0].args.includes('--to'), false);
    assert.equal(r.calls.filter((c) => c.bin === '/stub/notify').length, 0);
    const state = JSON.parse(await readFile(join(stateDir, 'daily-state.json'), 'utf8'));
    assert.equal(state.failure_streak, 4);
    assert.equal(state.failure_streak_started_at, '2026-11-19T05:40:00.000Z');
  } finally { await rm(stateDir, { recursive: true, force: true }); }
});

test('an unsent publish-blocked finding is posted by the next failed run of the same streak', async () => {
  const stateDir = await mkdtemp(join(tmpdir(), 'bh-n132-retry-'));
  try {
    const r = recorder({ failFirst: 1 });
    const env = { BH_AGENT_BOARD: '/stub/agent-board', BH_NOTIFY: '/stub/notify', HOME: stateDir };
    const ctx = { status_ok: false, rc: 1, published: false };
    const a = await executeNotifications({ stateDir, env, execImpl: r.execImpl, now: T0, context: ctx });
    assert.deepEqual(a.failed.map((f) => f.kind), ['publish-blocked']);
    await executeNotifications({ stateDir, env, execImpl: r.execImpl, now: T0 + 3_600_000, context: ctx });
    await executeNotifications({ stateDir, env, execImpl: r.execImpl, now: T0 + 7_200_000, context: ctx });
    assert.equal(r.boardPosts().length, 1);
  } finally { await rm(stateDir, { recursive: true, force: true }); }
});

test('fixture: npm-test at 2800 s posts one addressed #8 finding, not again the same week; 2000 s stays silent', async () => {
  const stateDir = await mkdtemp(join(tmpdir(), 'bh-n132-budget-'));
  try {
    const r = recorder();
    const env = { BH_AGENT_BOARD: '/stub/agent-board', BH_NOTIFY: '/stub/notify', HOME: stateDir };
    const ok = (seconds) => ({ status_ok: true, rc: 0, published: true, npm_test: run(seconds), run_dir: '/runs/x' });
    await executeNotifications({ stateDir, env, execImpl: r.execImpl, now: T0 - DAY_MS, context: ok(2000) });
    assert.equal(r.boardPosts().length, 0, '2000 s stays silent');
    await executeNotifications({ stateDir, env, execImpl: r.execImpl, now: T0, context: ok(2800) });
    await executeNotifications({ stateDir, env, execImpl: r.execImpl, now: T0 + DAY_MS, context: ok(2810) });
    const posts = r.boardPosts();
    assert.equal(posts.length, 1);
    assert.deepEqual(posts[0].args.slice(0, 6), ['post', '8', '--kind', 'finding', '--to', COLLECTOR_OWNER_JOB]);
    assert.match(posts[0].args[6], /2800 s of its 3600 s cap \(78 %\)/);
    assert.match(posts[0].args[6], /2000 s on 2026-11-18 \(\+40 %\)/);
    await executeNotifications({ stateDir, env, execImpl: r.execImpl, now: T0 + 2 * DAY_MS, context: ok(3100) });
    assert.equal(r.boardPosts().length, 2, 'the next band (85 %) posts once');
    await executeNotifications({ stateDir, env, execImpl: r.execImpl, now: T0 + 8 * DAY_MS, context: ok(2800) });
    assert.equal(r.boardPosts().length, 3, 'a standing 75 % band is repeated after a week');
    const state = JSON.parse(await readFile(join(stateDir, 'daily-state.json'), 'utf8'));
    assert.deepEqual(state.npm_test_history.map((h) => h.duration_ms / 1000), [2000, 2800, 2810, 3100, 2800]);
  } finally { await rm(stateDir, { recursive: true, force: true }); }
});

test('a dry run plans the findings but posts nothing and records no history', async () => {
  const stateDir = await mkdtemp(join(tmpdir(), 'bh-n132-dry-'));
  try {
    const r = recorder();
    const out = await executeNotifications({ stateDir, dryRun: true, env: { BH_AGENT_BOARD: '/stub/agent-board', HOME: stateDir }, execImpl: r.execImpl, now: T0,
      context: { status_ok: false, rc: 1, published: false, npm_test: run(3600, { ok: false }) } });
    // `failure` stays in the plan but is sent by the gate finalize, never from here (CR-66.6).
    assert.deepEqual(out.plan.sends.map((s) => s.kind).sort(), ['failure', 'npm-test-budget', 'publish-blocked']);
    assert.equal(r.calls.length, 0);
  } finally { await rm(stateDir, { recursive: true, force: true }); }
});

test('the board post keeps a handoff addressed and allows only handoff/finding kinds', async () => {
  const r = recorder();
  assert.equal((await sendBoardHandoff('x', { thread: 8, execImpl: r.execImpl })).reason, 'board_target_missing');
  assert.equal((await sendBoardHandoff('x', { thread: 8, kind: 'decision', to: 'a', execImpl: r.execImpl })).reason, 'board_target_missing');
  assert.equal((await sendBoardHandoff('x', { thread: 8, kind: 'finding', execImpl: r.execImpl })).sent, true);
  assert.deepEqual(r.calls[0].args, ['post', '8', '--kind', 'finding', 'x']);
});

test('under the test runner a send without an explicit stub can never reach the real board or notify', async () => {
  const { agentBoardBinary, notifyBinary, TEST_RUNNER_BLOCKED_BIN } = await import('../ops/daily/notify.mjs');
  assert.ok(process.env.NODE_TEST_CONTEXT, 'node --test marks its processes');
  assert.equal(agentBoardBinary({ HOME: '/home/flori' }), TEST_RUNNER_BLOCKED_BIN);
  assert.equal(notifyBinary({}), TEST_RUNNER_BLOCKED_BIN);
  assert.equal(agentBoardBinary({ BH_AGENT_BOARD: '/stub/b' }), '/stub/b');
  const stateDir = await mkdtemp(join(tmpdir(), 'bh-n132-guard-'));
  try {
    const out = await executeNotifications({ stateDir, env: {}, now: T0, context: { status_ok: false, rc: 1, published: false } });
    assert.deepEqual(out.failed.map((f) => [f.kind, f.reason]), [['publish-blocked', 'agent_board_missing']]);
  } finally { await rm(stateDir, { recursive: true, force: true }); }
});
