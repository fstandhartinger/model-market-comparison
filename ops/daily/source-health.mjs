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
  source_changed_retained: 'attention', contested: 'attention',
  retained_manual_snapshot: 'manual', manual_required: 'manual', source_reachable_protocol_date_retained: 'no_adapter',
};
// Per-run bookkeeping rows, not sources.
const NOT_A_SOURCE = /^(score-batch-\d+|benchmark-history)$/;

// A failed subprocess reason is the command line plus its traceback; the last line names the actual error.
const reasonLine = (reason) => {
  if (!reason) return null;
  const lines = String(reason).split('\n').map((l) => l.trim()).filter(Boolean);
  return (lines[0].startsWith('Command failed:') && lines.length > 1 ? lines.at(-1) : lines[0]).slice(0, 300);
};

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
    return {
      id, kind: kindOf(latest), status: latest.check.status, latest_run: latest.at,
      last_ok: lastOk?.at ?? null,
      failing_since: streak ? history[streak - 1].at : null, consecutive_failed_runs: streak,
      reason: reasonLine(latest.check.reason),
      cadence: cadence.get(id) ?? null, runs_seen: history.length,
    };
  });
  const order = { failing: 0, attention: 1, unknown: 2, no_adapter: 3, manual: 4, ok: 5 };
  sources.sort((a, b) => order[a.kind] - order[b.kind] || (a.failing_since ?? '').localeCompare(b.failing_since ?? '') || a.id.localeCompare(b.id));
  const count = (k) => sources.filter((s) => s.kind === k).length;
  return { generated_from_runs: runs.length, newest_run: runs[0].checked_at, oldest_run: runs.at(-1).checked_at,
    totals: Object.fromEntries(Object.keys(order).map((k) => [k, count(k)])), sources };
}

export function healthMarkdown(health) {
  const day = (t) => (t ? t.slice(0, 10) : '—');
  const lines = [`# Benchmark source health — newest run ${health.newest_run}`, '',
    `${health.generated_from_runs} runs (${day(health.oldest_run)} … ${day(health.newest_run)}). ` +
    Object.entries(health.totals).filter(([, n]) => n).map(([k, n]) => `${n} ${k.replace('_', ' ')}`).join(' · '), ''];
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
    if (dayDiff(day, since) >= maxAgeDays) out.push({ id: name, kind: 'collector', last_ok: c.last_ok, failing_since: c.failing_since, reason: c.last_error });
  }
  for (const s of benchmarks?.sources || []) {
    if (s.kind !== 'failing') continue;
    const since = (s.last_ok ?? s.failing_since ?? '').slice(0, 10);
    if (since && dayDiff(day, since) >= maxAgeDays) out.push({ id: s.id, kind: 'benchmark', last_ok: s.last_ok?.slice(0, 10) ?? null, failing_since: s.failing_since?.slice(0, 10) ?? null, reason: s.reason });
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
