// CR-38.5: source-health view for the daily benchmark refresh. Reads every benchmark-step report we still hold (the
// run directories under /opt/benchmarkheaven-daily/runs and the committed daily-evidence/*/checks.json of published
// runs), and says per source: its status in the newest run, the last run it refreshed or was confirmed unchanged,
// and — when it is failing — since when and for how many consecutive runs. Written because two sources failed
// silently for days (Vals Index on 16 Sep; AA benchmark fields from 11 to 16 Sep): a retained failure keeps the old
// values on the site, which is correct, but nobody saw it.
//
// Usage: node ops/daily/source-health.mjs [--runs DIR] [--out DIR]   (prints the markdown summary)
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Statuses written by ops/daily/refresh-benchmarks.mjs, by what they mean for freshness. */
export const STATUS_KIND = {
  checked_unchanged: 'ok', updated: 'ok', candidate: 'ok', vendor_candidate: 'ok', collected: 'ok', state_appended: 'ok', state_retained: 'ok',
  retained_after_failure: 'failing', retained_after_dispute: 'failing', source_unreachable_or_manual: 'failing',
  // D249: the source answered; our own review clock ran out before the unit was admitted. That is not
  // the source failing, so it is not 'failing' — but the published value is a day older than it looks,
  // and a source that keeps landing after the deadline is exactly what this file exists to surface.
  retained_budget_exhausted: 'attention',
  source_changed_retained: 'attention', contested: 'attention',
  // F-209 / D225: `source_changed_retained` is also the status a *quarantined* arm writes (a board
  // publishing a protocol revision outside the registry's reviewed set). The two are told apart by
  // the structured `unreviewed_protocols` field the quarantine carries, never by the status alone —
  // OpenRouter's dated snapshot board has used this status for a changed capture since CR-34.2.
  retained_manual_snapshot: 'manual', manual_required: 'manual', source_reachable_protocol_date_retained: 'no_adapter',
};
// Per-run bookkeeping rows, not sources. `score-batch-7` is a different set of rows in every run, so
// "failing since" and a consecutive-run streak are meaningless for it — it must stay out of the table.
const NOT_A_SOURCE = /^(score-batch-\d+|benchmark-history)$/;
const SCORE_BATCH = /^score-batch-\d+$/;
// D204: excluding the batches from the per-source table left their quarantined rows reported nowhere —
// 72 rows on 2026-09-25, and not one of them in source-health, the run report or the run summary. They
// are a per-run total rather than a per-source history, so they are counted, not listed. Runs written
// before the count was recorded structurally still report, by reading the reason this file's own
// `fail()` wrote ("<n> rows quarantined: …"); a batch whose count cannot be established is named in
// `unknown_batches` rather than silently counted as zero.
const QUARANTINED_ROWS = /^(\d+) rows quarantined\b/;
export function quarantineTotals(run) {
  const batches = (run?.checks ?? []).filter((c) => SCORE_BATCH.test(c.id) && STATUS_KIND[c.status] === 'failing');
  let rows = 0; const unknown = [];
  for (const b of batches) {
    const counted = Number.isInteger(b.quarantined_rows) ? b.quarantined_rows
      : Number(QUARANTINED_ROWS.exec(b.reason ?? '')?.[1] ?? NaN);
    if (Number.isFinite(counted)) rows += counted; else unknown.push(b.id);
  }
  return { rows, batches: batches.length, unknown_batches: unknown };
}

// D249: the same reporting gap D204 closed for quarantined rows, for rows the review clock never
// reached. A score batch is a per-run unit and stays out of the per-source table, so without this the
// only trace of a run that dropped 20 batches on the deadline would be the step's own report.
export function budgetTotals(run) {
  const checks = (run?.checks ?? []).filter((c) => c.status === 'retained_budget_exhausted');
  const batches = checks.filter((c) => SCORE_BATCH.test(c.id));
  let rows = 0; const unknown = [];
  for (const b of batches) {
    if (Number.isInteger(b.unreviewed_rows)) rows += b.unreviewed_rows; else unknown.push(b.id);
  }
  return { units: checks.length, batches: batches.length, rows, unknown_batches: unknown,
    sources: checks.filter((c) => !NOT_A_SOURCE.test(c.id)).map((c) => c.id) };
}

// D252 (2026-09-28): the third per-run total, and the one that says the review itself did not happen.
// A protocol or score arm whose rounds all read `worker: No supported viable worker model found` was
// never shown to any model: `selectModelForWorker` threw before the call, so the arm retained
// yesterday's values without a producer or a critic ever seeing today's capture. That is correct
// fail-closed behaviour per arm and invisible in aggregate — the 2026-09-28 11:23 run retained 28
// arms this way, published, and reported itself green, because `staleSources` only names a source
// once its last good day is 3 days old and 26 of the 28 had been good that morning.
//
// It is a capacity failure, not a source failure: three `Incomplete completion (length)` answers hard-
// excluded `z-ai/glm-5.3-flash` (D199's three-strike bound), a later timeout soft-excluded
// `deepseek/deepseek-v4-flash-0731`, and those two are the whole scheduled pool once the free Kimi K3
// route is absent from `~/.llm-health.json` — so no different-family producer/critic pair existed for
// the rest of the run. Counted here so a run that reviewed nothing cannot read like a run that
// reviewed everything and found nothing to change.
const ROUND = /round (\d+): /g;
/** A round whose text begins `worker: ` never reached a model — worker selection threw first. */
export const WORKER_SELECTION_ROUND = /^worker: /;
/** The `round N: …` segments of a retained arm's reason, in order; [] when the reason names no rounds. */
export function reviewRounds(reason) {
  const text = String(reason ?? '');
  const marks = [...text.matchAll(ROUND)];
  return marks.map((m, i) => text.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : undefined)
    .replace(/;\s*$/, '').trim());
}
export function reviewCapacityTotals(run) {
  const arms = [];
  for (const check of (run?.checks ?? [])) {
    if (STATUS_KIND[check.status] !== 'failing') continue;
    const rounds = reviewRounds(check.reason);
    if (!rounds.length) continue;
    const lost = rounds.filter((r) => WORKER_SELECTION_ROUND.test(r)).length;
    if (!lost) continue;
    arms.push({ id: check.id, rounds: rounds.length, rounds_lost: lost, reviewless: lost === rounds.length });
  }
  const reviewless = arms.filter((a) => a.reviewless);
  return { arms: arms.length, reviewless: reviewless.length, rounds_lost: arms.reduce((n, a) => n + a.rounds_lost, 0),
    sources: arms.map((a) => a.id) };
}

// A failed subprocess reason is the command line plus its traceback; the last line names the actual error.
// 20 Sep 2026 (iteration 134): a captured step failure is a whole stdout+stderr transcript, and its
// first line is usually progress, not the fault. `fetch-aa` was recorded for days as
// "→ ArtificialAnalysis models …" while the line that says what broke — "Error: AA efficiency
// incomplete scrape: 145 rows (minimum 156)" — sat four lines further down. Stack frames are
// dropped, a thrown Error wins, then the line after `Command failed:`, and only then the first line.
const STACK_FRAME = /^at\s/;
const COMMAND_FAILED = /^Command failed:/;
const THROWN_ERROR = /^[\w$]*(Error|Exception):\s*\S/;
const reasonLine = (reason) => {
  if (!reason) return null;
  const lines = String(reason).split('\n').map((l) => l.trim()).filter(Boolean).filter((l) => !STACK_FRAME.test(l));
  if (lines.length === 0) return null;
  // The thrown error wins wherever it sits; then the line a `Command failed:` header introduces
  // (which is the shape npm and execFile produce); then anything that is not that header.
  const thrown = lines.find((l) => THROWN_ERROR.test(l));
  const failed = lines.findIndex((l) => COMMAND_FAILED.test(l));
  const pick = thrown
    ?? (failed >= 0 ? lines[failed + 1] : null)
    ?? lines.filter((l) => !COMMAND_FAILED.test(l)).at(failed >= 0 ? -1 : 0)
    ?? lines[0];
  return pick.slice(0, 300);
};

// F-209 / D225: a quarantined arm — the collector refused to publish a board that changed its
// reviewed protocol revision, and let every other source publish. It is recognised by the structured
// field the quarantine writes (lib/source-quarantine.mjs), so it is never confused with the same
// status used for an ordinary changed-capture retention.
export const isQuarantine = (check) => check?.status === 'source_changed_retained'
  && Array.isArray(check.unreviewed_protocols) && check.unreviewed_protocols.length > 0;

/** How many consecutive runs a quarantine must survive before the digest asks a human to act. */
export const QUARANTINE_ESCALATION_RUNS = 3;

/** reports: [{ checked_at, checks: [{ id, status, reason? }] }] → per-source health, newest run first. */
export function sourceHealth(reports, { plan = { entries: [] } } = {}) {
  // One run can be held twice (its run directory and its committed checks.json): merge by run time, first copy wins.
  const byRun = new Map();
  for (const r of reports.filter((x) => x?.checked_at && Array.isArray(x.checks))) {
    const held = byRun.get(r.checked_at) ?? { checked_at: r.checked_at, checks: [] };
    for (const c of r.checks) if (!held.checks.some((h) => h.id === c.id)) held.checks.push(c);
    byRun.set(r.checked_at, held);
  }
  const runs = [...byRun.values()].sort((a, b) => b.checked_at.localeCompare(a.checked_at));
  if (!runs.length) throw new Error('No benchmark-step reports to summarise');
  const cadence = new Map(plan.entries.map((e) => [e.benchmark_id, e.refresh === 'manual' ? 'manual snapshot' : e.cadence ?? null]));
  const ids = [...new Set(runs.flatMap((r) => r.checks.map((c) => c.id)))].filter((id) => !NOT_A_SOURCE.test(id));
  const sources = ids.map((id) => {
    const history = runs.map((r) => ({ at: r.checked_at, check: r.checks.find((c) => c.id === id) })).filter((h) => h.check);
    const kindOf = (h) => STATUS_KIND[h.check.status] ?? 'unknown';
    const latest = history[0];
    const lastOk = history.find((h) => kindOf(h) === 'ok');
    let streak = 0;
    while (streak < history.length && kindOf(history[streak]) === 'failing') streak++;
    // F-209: the quarantine streak is counted on its own — a quarantined arm is `attention`, not
    // `failing`, so the streak above never sees it, and the directive asks for it to be named on
    // every run it stays quarantined and escalated on the third.
    let quarantineStreak = 0;
    while (quarantineStreak < history.length && isQuarantine(history[quarantineStreak].check)) quarantineStreak++;
    return {
      id, kind: kindOf(latest), status: latest.check.status, latest_run: latest.at,
      last_ok: lastOk?.at ?? null,
      failing_since: streak ? history[streak - 1].at : null, consecutive_failed_runs: streak,
      quarantined_since: quarantineStreak ? history[quarantineStreak - 1].at : null,
      consecutive_quarantined_runs: quarantineStreak,
      ...(isQuarantine(latest.check) ? { unreviewed_protocols: latest.check.unreviewed_protocols,
        reviewed_protocols: latest.check.reviewed_protocols ?? null } : {}),
      reason: reasonLine(latest.check.reason),
      cadence: cadence.get(id) ?? null, runs_seen: history.length,
    };
  });
  const order = { failing: 0, attention: 1, unknown: 2, no_adapter: 3, manual: 4, ok: 5 };
  sources.sort((a, b) => order[a.kind] - order[b.kind] || (a.failing_since ?? '').localeCompare(b.failing_since ?? '') || a.id.localeCompare(b.id));
  const count = (k) => sources.filter((s) => s.kind === k).length;
  return { generated_from_runs: runs.length, newest_run: runs[0].checked_at, oldest_run: runs.at(-1).checked_at,
    totals: Object.fromEntries(Object.keys(order).map((k) => [k, count(k)])), quarantine: quarantineTotals(runs[0]), budget: budgetTotals(runs[0]), review_capacity: reviewCapacityTotals(runs[0]),
    quarantined_arms: sources.filter((s) => s.consecutive_quarantined_runs > 0)
      .map((s) => ({ id: s.id, reason: s.reason, unreviewed_protocols: s.unreviewed_protocols,
        reviewed_protocols: s.reviewed_protocols, quarantined_since: s.quarantined_since,
        consecutive_quarantined_runs: s.consecutive_quarantined_runs,
        escalate: s.consecutive_quarantined_runs >= QUARANTINE_ESCALATION_RUNS })), sources };
}

export function healthMarkdown(health) {
  const day = (t) => (t ? t.slice(0, 10) : '—');
  const lines = [`# Benchmark source health — newest run ${health.newest_run}`, '',
    `${health.generated_from_runs} runs (${day(health.oldest_run)} … ${day(health.newest_run)}). ` +
    Object.entries(health.totals).filter(([, n]) => n).map(([k, n]) => `${n} ${k.replace('_', ' ')}`).join(' · '), ''];
  const q = health.quarantine;
  if (q?.batches) {
    lines.push(`Newest run: **${q.rows} score row(s) quarantined** across ${q.batches} batch(es) — reviewed, not published, and not listed below: a batch is a per-run unit, not a source.`
      + (q.unknown_batches?.length ? ` Row count not recorded for ${q.unknown_batches.join(', ')}.` : ''), '');
  }
  const rc = health.review_capacity;
  if (rc?.arms) {
    lines.push(`Newest run: **${rc.arms} arm(s) retained without a reviewer**, ${rc.reviewless} of them in every round — ${rc.rounds_lost} round(s) ended at worker selection, before any model saw today's capture.`
      + ` Their published values are unchanged and nothing was rejected or accepted; the review did not run.`
      + (rc.sources.length ? ` Arm(s): ${rc.sources.join(', ')}.` : ''), '');
  }
  const b = health.budget;
  if (b?.units) {
    lines.push(`Newest run: **${b.units} unit(s) retained unreviewed** because the benchmark step's review budget ran out`
      + (b.batches ? ` — ${b.batches} score batch(es) holding ${b.rows} row(s)` : '')
      + (b.sources.length ? `; source arm(s): ${b.sources.join(', ')}` : '')
      + `. Their published values are unchanged and nothing was rejected; they were simply never reviewed today.`
      + (b.unknown_batches?.length ? ` Row count not recorded for ${b.unknown_batches.join(', ')}.` : ''), '');
  }
  for (const arm of health.quarantined_arms ?? []) {
    lines.push(`Newest run: **${arm.id} quarantined** for ${arm.consecutive_quarantined_runs} consecutive run(s)`
      + ` (since ${day(arm.quarantined_since)}) — unreviewed protocol revision(s) ${arm.unreviewed_protocols.join(', ')};`
      + ` its published rows are unchanged and every other source published. ${arm.reason ?? ''}`.trimEnd(), '');
  }
  const failing = health.sources.filter((s) => s.kind === 'failing' || s.kind === 'attention' || s.kind === 'unknown');
  lines.push(failing.length ? '| Source | Status | Failing since | Runs | Last OK | Reason |' : 'No failing sources.');
  if (failing.length) lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const s of failing) lines.push(`| ${s.id} | ${s.status} | ${day(s.failing_since)} | ${s.consecutive_failed_runs} | ${day(s.last_ok)} | ${(s.reason ?? '').replace(/\|/g, '/').slice(0, 160)} |`);
  return lines.join('\n') + '\n';
}

// CR-66.9: the daily run's secondary collectors (provider catalogs, data policy, Epoch provenance …) are
// non-fatal: a failure keeps the old snapshot. Their last good day is kept across runs so a source that has
// been failing for 3+ days is named in the run summary instead of staying invisible.
export const COLLECTOR_STEP = /^(fetch-|build-epoch-provenance$|check-provider-meta$)/;
const dayDiff = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

/** state: { collectors: { name: { last_ok, failing_since, last_error } } }; steps: daily report.steps. */
export function updateCollectorHealth(state, steps, day) {
  const collectors = { ...(state?.collectors || {}) };
  for (const step of steps || []) {
    if (!COLLECTOR_STEP.test(step.name)) continue;
    const prior = collectors[step.name] || { last_ok: null, failing_since: null, last_error: null };
    collectors[step.name] = step.ok
      ? { last_ok: day, failing_since: null, last_error: null }
      : { last_ok: prior.last_ok, failing_since: prior.failing_since ?? day, last_error: reasonLine(step.error) };
  }
  return { collectors };
}

/** Sources whose newest good data is at least `maxAgeDays` old: failing collectors and failing benchmark sources. */
export function staleSources({ collectors = {}, benchmarks = null, day, maxAgeDays = 3 }) {
  const out = [];
  for (const [name, c] of Object.entries(collectors)) {
    if (!c.failing_since) continue;
    const since = c.last_ok ?? c.failing_since;
    const age = dayDiff(day, since);
    if (age >= maxAgeDays) out.push({ id: name, kind: 'collector', last_ok: c.last_ok, failing_since: c.failing_since, reason: c.last_error, stale_days: age });
  }
  for (const s of benchmarks?.sources || []) {
    if (s.kind !== 'failing') continue;
    const since = (s.last_ok ?? s.failing_since ?? '').slice(0, 10);
    const age = since ? dayDiff(day, since) : null;
    if (age !== null && age >= maxAgeDays) out.push({ id: s.id, kind: 'benchmark', last_ok: s.last_ok?.slice(0, 10) ?? null, failing_since: s.failing_since?.slice(0, 10) ?? null, reason: s.reason, stale_days: age });
  }
  return out.sort((a, b) => (a.last_ok ?? '').localeCompare(b.last_ok ?? '') || a.id.localeCompare(b.id));
}

async function loadReports({ runsDir, repoRoot = '.' }) {
  const reports = [];
  const tryJson = async (p) => { try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; } };
  const evidence = join(repoRoot, 'data/raw/benchmarks/daily-evidence');
  for (const d of await readdir(evidence).catch(() => [])) { const r = await tryJson(join(evidence, d, 'checks.json')); if (r) reports.push(r); }
  if (runsDir) for (const d of await readdir(runsDir).catch(() => [])) {
    const r = await tryJson(join(runsDir, d, 'reports', 'benchmarks-step-result.json'));
    if (r?.ok) reports.push(r);
  }
  return reports;
}

/** Writes source-health.{json,md} into outDir; used by phase-step.mjs after the benchmarks step. */
export async function writeSourceHealth({ runsDir, outDir, repoRoot = '.' }) {
  const plan = JSON.parse(await readFile(join(repoRoot, 'data/raw/benchmarks/collection-plan.json'), 'utf8'));
  const health = sourceHealth(await loadReports({ runsDir, repoRoot }), { plan });
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'source-health.json'), JSON.stringify(health, null, 2) + '\n');
  await writeFile(join(outDir, 'source-health.md'), healthMarkdown(health));
  return health;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
  const runsDir = arg('--runs', '/opt/benchmarkheaven-daily/runs'), outDir = arg('--out', null);
  const health = outDir ? await writeSourceHealth({ runsDir, outDir })
    : sourceHealth(await loadReports({ runsDir }), { plan: JSON.parse(await readFile('data/raw/benchmarks/collection-plan.json', 'utf8')) });
  process.stdout.write(healthMarkdown(health));
}
