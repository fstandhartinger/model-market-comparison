// bh-daily-collectors-fix (7 Oct 2026): collector staleness alerts, retired collector entries, and human-action
// cards that `~/bin/notify` actually accepts (an ask owned by a reply job, never replayed from `pending`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, chmod, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planNotifications, staleCollectorDigestLines, staleCollectorHumanTodo, COLLECTOR_CARD_DAYS } from '../ops/daily/policy.mjs';
import { prepareReplyJob } from '../ops/daily/notify.mjs';
import { updateCollectorHealth, staleSources } from '../ops/daily/source-health.mjs';
import { executeNotifications } from '../ops/daily/notify.mjs';

const stale = (id, days, extra = {}) => ({ id, kind: 'collector', last_ok: '2026-09-22', failing_since: '2026-09-23', reason: 'HTTP 404', stale_days: days, ...extra });

test('a collector failing 3+ days is one digest line; benchmark sources are not collector lines', () => {
  assert.deepEqual(staleCollectorDigestLines([stale('fetch-x', 2)]), []);
  const lines = staleCollectorDigestLines([stale('fetch-x', 3), { ...stale('vals-index::2', 9), kind: 'benchmark' }]);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^Collector fetch-x failing for 3 days \(last good 2026-09-22\); previous snapshot kept: HTTP 404$/);
});

test('from 7 days a collector becomes one human-action card per failure episode, in the shape notify accepts', () => {
  assert.equal(staleCollectorHumanTodo([stale('fetch-x', COLLECTOR_CARD_DAYS - 1)]), null);
  const todo = staleCollectorHumanTodo([stale('fetch-y', 8), stale('fetch-x', 7)]);
  assert.deepEqual(todo.collectors, ['fetch-x', 'fetch-y']);
  assert.equal(todo.key, 'collector-stale:fetch-x@2026-09-23|fetch-y@2026-09-23');
  const lines = todo.text.split('\n');
  assert.equal(lines[0], '🧑 DU BIST DRAN');
  assert.equal(lines[2], '🧑 Für dich');
  assert.match(todo.text, /^- Benchmark Heaven collector fetch-x has failed for 7 days$/m);
  for (const field of [/^  Why: /m, /^  Steps:$/m, /^  1\. /m, /^  Time: \d+ min$/m]) assert.match(todo.text, field);
  const plan = (notified) => planNotifications({ status_ok: true, notified, stale_sources: [stale('fetch-x', 7)], now: 1_800_000_000_000 });
  assert.deepEqual(plan({}).sends.filter((s) => s.kind === 'collector-stale').map((s) => s.key), ['collector-stale:fetch-x@2026-09-23']);
  assert.equal(plan({ 'collector-stale:fetch-x@2026-09-23': '2026-10-01' }).sends.some((s) => s.kind === 'collector-stale'), false, 'once per episode');
});

test('retired collectors are dropped by name; a collector a partial run skipped keeps its failure history', () => {
  let state = { collectors: {
    'fetch-published': { last_ok: '2026-09-20', failing_since: null, last_error: null },
    'fetch-lumina-ledger': { last_ok: '2026-09-22', failing_since: '2026-09-23', last_error: 'HTTP 404' },
    'fetch-aa': { last_ok: '2026-09-20', failing_since: '2026-09-21', last_error: 'HTTP 500' },
  } };
  // A prices-only run executes only fetch-or; fetch-aa is still configured and must not lose its failure start.
  state = updateCollectorHealth(state, [{ name: 'fetch-or', ok: true }], '2026-10-07');
  assert.deepEqual(Object.keys(state.collectors).sort(), ['fetch-aa', 'fetch-or']);
  assert.equal(state.collectors['fetch-aa'].failing_since, '2026-09-21');
  assert.deepEqual(staleSources({ collectors: state.collectors, day: '2026-10-07' }).map((x) => [x.id, x.stale_days]), [['fetch-aa', 17]]);
});

async function stubNotify(dir) {
  const bin = join(dir, 'notify'), log = join(dir, 'calls.jsonl');
  await writeFile(bin, `#!/usr/bin/env node\nrequire('node:fs').appendFileSync(${JSON.stringify(log)}, JSON.stringify({ argv: process.argv.slice(2), jobdir: process.env.AGENT_BOARD_JOBDIR ?? null, source: process.env.NOTIFY_SOURCE ?? null }) + '\\n');\n`);
  await chmod(bin, 0o755);
  return { bin, calls: async () => (await readFile(log, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).map(JSON.parse) };
}

test('a human-action card goes out as an ask owned by a reply job; stale pending cards are not replayed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-collector-card-'));
  try {
    const stateDir = join(dir, 'state'), replyRoot = join(dir, 'jobs');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(stateDir, { recursive: true });
    // What 1-7 Oct left behind: a refused quarantine card, retried every run although the arm is no longer quarantined.
    await writeFile(join(stateDir, 'daily-state.json'), JSON.stringify({ notified: {}, failure_streak: 0, pending: [
      { kind: 'quarantine', key: 'quarantine:vulcanbench-frontier::4@v3.17', text: '🧑 DU BIST DRAN\n\nold card', onSent: { notified_key: 'quarantine:vulcanbench-frontier::4@v3.17' } },
    ] }));
    const stub = await stubNotify(dir);
    const env = { BH_NOTIFY: stub.bin, BH_TODO_REPLY_ROOT: replyRoot, HOME: dir };
    const result = await executeNotifications({ stateDir, env, now: Date.parse('2026-10-07T09:00:00Z'),
      context: { status_ok: true, top5: null, quarantined_arms: [], stale_sources: [stale('fetch-mistral-catalog', 7)] } });
    assert.deepEqual(result.sent, ['collector-stale']);
    const calls = await stub.calls();
    assert.equal(calls.length, 1, 'the stale quarantine card was dropped, not replayed');
    assert.deepEqual(calls[0].argv.slice(0, 3), ['now', '--ask', '960']);
    assert.match(calls[0].argv[3], /collector fetch-mistral-catalog has failed for 7 days/);
    assert.equal(calls[0].source, 'benchmarkheaven-daily');
    assert.match(calls[0].jobdir, /\/bh-daily-collector-stale-reply-2026-10-07-[0-9a-f]{10}$/);
    assert.match(await readFile(join(calls[0].jobdir, 'PROMPT.md'), 'utf8'), /notify ack <reply_message_id>/);
    const state = JSON.parse(await readFile(join(stateDir, 'daily-state.json'), 'utf8'));
    assert.deepEqual(state.pending, []);
    assert.ok(state.notified['collector-stale:fetch-mistral-catalog@2026-09-23']);
    assert.equal((await readdir(replyRoot)).length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('two cards the same day get separate reply jobs, and a retry keeps an appended reply', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-reply-job-'));
  try {
    const env = { BH_TODO_REPLY_ROOT: dir };
    const now = Date.parse('2026-10-07T05:17:00Z');
    const a = await prepareReplyJob({ kind: 'collector-stale', key: 'collector-stale:a@2026-09-30', text: 'card A' }, { env, now });
    const b = await prepareReplyJob({ kind: 'collector-stale', key: 'collector-stale:a@2026-09-30|b@2026-09-30', text: 'card B' }, { env, now });
    assert.notEqual(a, b);
    await writeFile(join(a, 'PROMPT.md'), (await readFile(join(a, 'PROMPT.md'), 'utf8')) + '\n## Reply\nyes\n');
    assert.equal(await prepareReplyJob({ kind: 'collector-stale', key: 'collector-stale:a@2026-09-30', text: 'card A again' }, { env, now }), a);
    const prompt = await readFile(join(a, 'PROMPT.md'), 'utf8');
    assert.match(prompt, /card A\n/);
    assert.match(prompt, /## Reply\nyes/);
    assert.doesNotMatch(prompt, /card A again/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
