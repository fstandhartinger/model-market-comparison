#!/usr/bin/env node
// ops/daily/notify.mjs — quiet-by-default notifier for the daily run (sends through ~/bin/notify now).
//
// Policy lives in ./policy.mjs (pure, tested); this module owns IO: state
// files, the notify send, and the dedup rule that a notification key is
// persisted ONLY after a send genuinely succeeded. Missing credentials never
// produce a "sent" record, so a later run with working credentials still
// delivers the event. Sends that FAIL (transport or credentials) are kept as
// pending payloads and retried on a later run; a successful run that advances
// the top5 baseline therefore cannot silently drop an event. Dedup entries and
// the 7-day failure-alert stamp are written only after a CONFIRMED send.
// A successful run also clears any stale escalation request.
//
// State files in <home>/state (kept identical in spirit to the old runtime):
//   top5-state.json       last Composite top-5 rows (array; seeded on first run)
//   failure-alert.stamp   mtime of the last successfully sent failure alert
//   daily-state.json      { notified: {key: iso}, failure_streak, escalation_request, pending, last_run }
//   escalation-request.json  written once when the failure streak crosses 3
//
// CLI (also used by run.sh as a crash fallback):
//   node notify.mjs --home /opt/benchmarkheaven-daily [--run-dir DIR] [--rc N]
//                   [--dry-run] [--fallback]
// --fallback sends only a minimal failure alert and only when daily.mjs did
// not already finish its own notification pass within the last 3 hours.
import { mkdir, readFile, stat, writeFile, rename, rm, utimes, open } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseJsonTolerant, planNotifications } from './policy.mjs';

export const DEFAULT_HOME = '/opt/benchmarkheaven-daily';
const FALLBACK_FRESH_MS = 3 * 60 * 60 * 1000;
const NOTIFY_TIMEOUT_MS = 60_000;
const execFileAsync = promisify(execFile);

// --- small atomic JSON helper (state writes must never half-land) ----------
async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify(value, null, 1) + '\n', { flag: 'wx' });
    await rename(tmp, path);
  } finally { await rm(tmp, { force: true }); }
}

async function readJsonFile(path, fallback = null) {
  try { return parseJsonTolerant(await readFile(path, 'utf8'), fallback); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

// --- state ------------------------------------------------------------------
export async function readNotifyState(stateDir) {
  const top5Previous = await readJsonFile(join(stateDir, 'top5-state.json'), null);
  const daily = await readJsonFile(join(stateDir, 'daily-state.json'), null) ?? {};
  let failureAlertLastSentAt = null;
  try { failureAlertLastSentAt = (await stat(join(stateDir, 'failure-alert.stamp'))).mtimeMs; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return {
    top5Previous: Array.isArray(top5Previous) ? top5Previous : null,
    notified: daily.notified && typeof daily.notified === 'object' ? daily.notified : {},
    failure_streak: Number.isSafeInteger(daily.failure_streak) ? daily.failure_streak : 0,
    escalation_request: daily.escalation_request ?? null,
    pending: Array.isArray(daily.pending)
      ? daily.pending.filter((p) => p && typeof p.text === 'string')
      : [],
    last_run: daily.last_run ?? null,
    failureAlertLastSentAt,
  };
}

// --- delivery -----------------------------------------------------------------
// CR-66.6: every message goes through `~/bin/notify now` (the one way jobs on Sandy message Florian:
// dedup, daily cap, logging); no Telegram request is made from here. Returns { sent, reason? } and
// never throws — a failed send must not mask the daily run's own exit code.
export const notifyBinary = (env = process.env) => env.BH_NOTIFY || join(env.HOME || '/home/flori', 'bin/notify');

export async function sendNotify(text, { bin = notifyBinary(), execImpl = execFileAsync, replyJobDir = null, env = process.env } = {}) {
  try {
    // A 🧑 human-action block is an ask: `notify` refuses it without `--ask` and a job folder that owns the reply.
    const args = replyJobDir ? ['now', '--ask', String(HUMAN_TODO_ASK_MINUTES), String(text).slice(0, 4000)] : ['now', String(text).slice(0, 4000)];
    await execImpl(bin, args, { timeout: NOTIFY_TIMEOUT_MS,
      ...(replyJobDir ? { env: { ...env, AGENT_BOARD_JOBDIR: replyJobDir, NOTIFY_SOURCE: 'benchmarkheaven-daily' } } : {}) });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error?.code === 'ENOENT' ? 'notify_missing' : `notify_failed:${String(error?.message || 'unknown error').slice(0, 200)}` };
  }
}

// --- human-action cards ---------------------------------------------------------
// bh-daily-collectors-fix (7 Oct 2026): the quarantine card was sent as a plain `notify now` from 1 Oct on, and
// `~/bin/notify` refused every send ("a 🧑 Für dich ask needs --ask [minutes]"), so it sat in `pending` and was
// retried on every run, long after the arm had stopped being quarantined. A human-action card now goes out as an
// ask owned by a dormant reply job (no agent is launched; `notify` registers the durable on-reply action, and
// routine asks reach the chief of staff first), and a card is only ever sent from the current run's plan.
export const HUMAN_TODO_KINDS = new Set(['quarantine', 'collector-stale']);
export const HUMAN_TODO_ASK_MINUTES = 960;

export async function prepareReplyJob(send, { env = process.env, now = Date.now() } = {}) {
  const root = env.BH_TODO_REPLY_ROOT || join(env.HOME || '/home/flori', 'jobs');
  const dir = join(root, `bh-daily-${send.kind}-reply-${new Date(now).toISOString().slice(0, 10)}`);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'PROMPT.md'), [
    'Read /home/flori/AGENTS.md and /home/flori/DECISIONS.md first. This job owns the reply to one Benchmark Heaven',
    `daily-run card (${send.kind}, key ${send.key}). When resumed by a reply, FIRST run`,
    '~/bin/notify ack <reply_message_id> "<what you will do now and when you will report back>".',
    'Then act on the reply within its authorization. The card itself is below; the fix is agent work in a Benchmark',
    'Heaven worktree through the PR merge queue (skill benchmarkheaven-site-merge-queue). Never edit',
    '/opt/model-market-comparison. Evidence: /opt/benchmarkheaven-daily/last-summary.txt and state/collector-health.json.',
    '', '## Card', '', send.text, ''].join('\n'));
  return dir;
}

// --- the one entry point ------------------------------------------------------
// context: { status_ok, rc, top5: {previous, current}, datasets: {before, after},
//            summary_excerpt, quarantined_arms } — exactly what daily.mjs writes into
//            reports/notify-context.json (datasets inlined, not paths).
export async function executeNotifications({
  context, stateDir, dryRun = false,
  env = process.env, execImpl, now = Date.now(),
} = {}) {
  if (!context || typeof context.status_ok !== 'boolean') throw new Error('notify context with boolean status_ok is required');
  const state = await readNotifyState(stateDir);
  const plan = planNotifications({
    status_ok: context.status_ok, rc: context.rc ?? null,
    top5: { previous: context.top5?.previous ?? state.top5Previous, current: context.top5?.current ?? [] },
    datasets: { before: context.datasets?.before ?? null, after: context.datasets?.after ?? null },
    failure_streak: state.failure_streak,
    failure_alert_last_sent_at: state.failureAlertLastSentAt,
    notified: state.notified, escalation_request: state.escalation_request,
    summary_excerpt: context.summary_excerpt ?? null,
    // F-209 / D225: source-health's quarantined arms, so a standing quarantine becomes a human todo.
    quarantined_arms: context.quarantined_arms ?? [],
    stale_sources: context.stale_sources ?? [], now,
  });
  // Pending DATA events are replayed first. Failure alerts are replanned from
  // current status through the weekly gate; recovery drops stale unsent failures.
  // Replaying them directly would bypass weekly dedup and report resolved problems.
  // Human-action cards are never replayed: the current plan re-creates one that is still due and unsent.
  const pendingReplay = state.pending.filter((p) => p.kind !== 'failure' && !HUMAN_TODO_KINDS.has(p.kind) && !state.notified[p.key]).map((p) => ({
    kind: p.kind ?? 'pending', key: p.key ?? null, text: p.text, onSent: p.onSent ?? null, pending: true,
  }));
  const pendingKeys = new Set(pendingReplay.map((p) => p.key).filter((k) => typeof k === 'string' && k));
  // CR-66.6: failure alerts are no longer sent from here; the publish gate's finalize sends `notify now`
  // on the second consecutive failure. The streak and escalation request are still kept below.
  for (const s of plan.sends.filter((s) => s.kind === 'failure')) plan.skips.push({ kind: 'failure', key: s.key, reason: 'reported by the publish gate finalize' });
  const sends = [
    ...pendingReplay,
    ...plan.sends.filter((s) => s.kind !== 'failure' && !(typeof s.key === 'string' && pendingKeys.has(s.key))),
  ];
  for (const s of sends) console.log(`notify: plan send ${s.kind} [${s.key}]${s.pending ? ' (retry)' : ''}`);
  for (const s of plan.skips) console.log(`notify: skip ${s.kind}${s.key ? ` [${s.key}]` : ''} (${s.reason})`);
  if (dryRun) { console.log('notify: --dry-run — no sends, no state writes'); return { dryRun: true, plan, sent: [], failed: [] }; }

  const sent = []; const failed = []; const pendingNext = [];
  const notifiedAdditions = {};
  let failureStampMs = null;
  for (const send of sends) {
    let replyJobDir = null;
    if (HUMAN_TODO_KINDS.has(send.kind)) {
      try { replyJobDir = await prepareReplyJob(send, { env, now }); }
      catch (error) { console.error(`notify: reply job for ${send.kind} not created: ${error.message}`); }
    }
    const result = replyJobDir === null && HUMAN_TODO_KINDS.has(send.kind)
      ? { sent: false, reason: 'reply_job_unavailable' }
      : await sendNotify(send.text, { bin: notifyBinary(env), env, replyJobDir, ...(execImpl ? { execImpl } : {}) });
    if (result.sent) {
      console.log(`notify: sent ${send.kind} [${send.key}]`);
      sent.push(send.kind);
      if (send.onSent?.notified_key) notifiedAdditions[send.onSent.notified_key] = plan.evaluated_at;
      if (send.onSent?.failure_alert_sent_at) failureStampMs = now;
    } else {
      console.error(`notify: NOT SENT ${send.kind} [${send.key}]: ${result.reason}`);
      failed.push({ kind: send.kind, key: send.key, reason: result.reason });
      // Keep the exact payload for a later retry; dedup is NOT recorded for it.
      pendingNext.push({ kind: send.kind, key: send.key, text: send.text, onSent: send.onSent ?? null });
    }
  }

  // Escalation request is intentionally NOT gated on a Telegram send: it is a
  // local operator signal (loud log line + state file), never a notification
  // policy bypass. A successful run clears the stale request (state + file).
  if (!context.status_ok && plan.baseline.escalation_request) {
    console.error(`ESCALATION REQUESTED: ${plan.baseline.escalation_request.streak} consecutive failures — run ops/daily/escalate.sh --operator`);
    await writeJsonAtomic(join(stateDir, 'escalation-request.json'), { ...plan.baseline.escalation_request, run_status_rc: context.rc ?? null });
  }
  if (context.status_ok) await rm(join(stateDir, 'escalation-request.json'), { force: true });

  // Baseline seeding and streak bookkeeping persist even when nothing was
  // sent; dedup keys and the failure stamp persist only after a real send.
  // A failed run never advances the top5 baseline (plan keeps `previous`),
  // and a fallback context (no top5 supplied) never erases an existing one.
  if (Array.isArray(plan.baseline.top5_state)) {
    await writeJsonAtomic(join(stateDir, 'top5-state.json'), plan.baseline.top5_state);
  }
  if (failureStampMs !== null) {
    const stamp = join(stateDir, 'failure-alert.stamp');
    await mkdir(stateDir, { recursive: true });
    await (await open(stamp, 'a')).close();
    const when = new Date(failureStampMs);
    await utimes(stamp, when, when);
  }
  await writeJsonAtomic(join(stateDir, 'daily-state.json'), {
    notified: { ...state.notified, ...notifiedAdditions },
    failure_streak: plan.baseline.failure_streak,
    escalation_request: context.status_ok ? null : (plan.baseline.escalation_request ?? state.escalation_request),
    pending: pendingNext,
    last_run: { at: new Date(now).toISOString(), status_ok: context.status_ok, rc: context.rc ?? null, sent, failed: failed.map((f) => f.kind) },
  });
  return { dryRun: false, plan, sent, failed };
}

// --- CLI ----------------------------------------------------------------------
async function main(argv) {
  const option = (name) => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
  const home = option('--home') ?? DEFAULT_HOME;
  const stateDir = option('--state-dir') ?? join(home, 'state');
  const dryRun = argv.includes('--dry-run');
  const rc = option('--rc') !== null ? Number(option('--rc')) : null;
  let context = null;
  const runDir = option('--run-dir');
  if (runDir) {
    context = await readJsonFile(join(runDir, 'reports', 'notify-context.json'), null);
    if (!context) throw new Error(`no notify context under ${runDir}/reports — daily.mjs writes it at the end of every run`);
  }
  if (!context) {
    if (argv.includes('--fallback')) {
      const state = await readNotifyState(stateDir);
      if (state.last_run?.at && (option('--started-at') ? Date.parse(state.last_run.at) >= Date.parse(option('--started-at')) : Date.now() - Date.parse(state.last_run.at) < FALLBACK_FRESH_MS)) {
        console.log('notify --fallback: daily.mjs already handled notifications recently; nothing to do');
        return;
      }
      if (rc === 0) { console.log('notify --fallback: rc=0, nothing to report'); return; }
    }
    if (rc === null) throw new Error('usage: notify.mjs --run-dir DIR | --rc N [--fallback] [--dry-run]');
    context = { status_ok: rc === 0, rc, top5: null, datasets: null, summary_excerpt: null };
  }
  const result = await executeNotifications({ context, stateDir, dryRun });
  if (result.failed?.length) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => { console.error(`NOTIFY_ERROR: ${error.message}`); process.exitCode = 1; });
}
