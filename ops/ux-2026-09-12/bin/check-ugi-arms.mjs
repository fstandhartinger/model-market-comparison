#!/usr/bin/env node
// D247 acceptance: did the run publish the UGI boards, and is what it published fresh?
//
// The four UGI columns come out of one CSV. Two of them — ugi-natint and ugi-writing — were
// retained_after_failure in every publishing run from 26 September on, because their protocol review
// could not settle `status: "active"` from a Space page that only defines the columns. So the acceptance
// for D247's fix is not "the code changed": it is those two arms reaching `candidate` in a real run, and
// the rows they publish carrying today's capture rather than 2026-09-10's.
//
// Nothing here is a pinned number. The per-board row counts and dates are read out of the published
// observations, and the arm statuses out of the run's own receipt.
//
// Usage: node ops/ux-2026-09-12/bin/check-ugi-arms.mjs [runDir|latest] [--json]
//   runDir  a /opt/benchmarkheaven-daily/runs/<stamp> directory; `latest` (default) takes the newest.
// Exit 1 if an arm this fix is about is still retained after failure, or if its published rows are
// staler than a sibling's — the shape of the defect, checked rather than described.

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const RUNS = '/opt/benchmarkheaven-daily/runs';
const REPO = '/opt/model-market-comparison';
// The two arms the fix is for, and the two that were already publishing. Both halves matter: a run in
// which all four fail is a different problem from the one D247 describes.
const REPAIRED = ['ugi-natint::snapshot-2026-09-10', 'ugi-writing::snapshot-2026-09-10'];
const SIBLINGS = ['ugi::snapshot-2026-09-10', 'ugi-willingness::snapshot-2026-09-10'];

const args = process.argv.slice(2).filter((a) => a !== '--json');
const asJson = process.argv.includes('--json');
const json = async (p) => JSON.parse(await readFile(p, 'utf8'));

const newestRun = async () => {
  const entries = await readdir(RUNS, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}T/.test(e.name)).map((e) => e.name).sort();
  if (!dirs.length) throw new Error(`no runs under ${RUNS}`);
  return join(RUNS, dirs.at(-1));
};

// A run records its arm outcomes in the work tree's daily-checks.json once the benchmark step wrote it,
// and in reports/benchmarks-step-result.json for a run that got that far. Read whichever exists.
const armChecks = async (runDir) => {
  for (const candidate of ['work/data/raw/benchmarks/daily-checks.json', 'reports/benchmarks-step-result.json']) {
    try {
      const body = await json(join(runDir, candidate));
      const checks = Array.isArray(body) ? body : body.checks ?? body.daily_checks ?? [];
      if (checks.length) return { source: candidate, checks };
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  throw new Error(`${runDir}: no arm receipt yet (the benchmark step has not reported)`);
};

const runDir = !args[0] || args[0] === 'latest' ? await newestRun() : args[0];
const { source, checks } = await armChecks(runDir);
const byId = new Map(checks.filter((c) => String(c.id ?? '').startsWith('ugi')).map((c) => [c.id, c]));

// What is actually published right now, per board, from the repo's own observations.
const published = await json(join(REPO, 'data/raw/benchmarks/public-observations.json'));
const board = (id) => {
  const rows = published.observations.filter((o) => o.benchmark_id === id);
  const dates = [...new Set(rows.map((o) => o.source.retrieved_at.slice(0, 10)))].sort();
  return { rows: rows.length, capture_dates: dates, newest_capture: dates.at(-1) ?? null };
};

const report = { run: runDir, receipt: source, arms: {}, failures: [] };
for (const id of [...REPAIRED, ...SIBLINGS]) {
  const check = byId.get(id);
  report.arms[id] = { status: check?.status ?? 'absent', rows_in_run: check?.rows ?? null,
    changed_rows: check?.changed_rows ?? null, published: board(id) };
}
const freshest = Math.max(...SIBLINGS.map((id) => Date.parse(board(id).newest_capture ?? 0)));
for (const id of REPAIRED) {
  const arm = report.arms[id];
  if (arm.status === 'retained_after_failure') report.failures.push(`${id}: still retained after failure — ${String(byId.get(id)?.reason ?? '').slice(0, 160)}`);
  const own = Date.parse(arm.published.newest_capture ?? 0);
  if (Number.isFinite(freshest) && own < freshest) {
    report.failures.push(`${id}: published rows stop at ${arm.published.newest_capture}, its siblings reach ${new Date(freshest).toISOString().slice(0, 10)}`);
  }
}
report.pass = report.failures.length === 0;

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`run:     ${runDir}\nreceipt: ${source}\n`);
  for (const [id, arm] of Object.entries(report.arms)) {
    console.log(`${REPAIRED.includes(id) ? '→' : ' '} ${id.split('::')[0].padEnd(16)} ${String(arm.status).padEnd(24)} ` +
      `run rows=${String(arm.rows_in_run ?? '-').padEnd(5)} published=${String(arm.published.rows).padEnd(5)} captures=${arm.published.capture_dates.join(',')}`);
  }
  console.log('');
  for (const failure of report.failures) console.log(`FAIL  ${failure}`);
  console.log(report.pass ? 'PASS  both repaired arms published, and no board is staler than its siblings' : `${report.failures.length} failure(s)`);
}
process.exit(report.pass ? 0 : 1);
