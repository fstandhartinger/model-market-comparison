// D194: bound the staging trees that `compactPublishedRun` deliberately keeps.
//
// `compact-run.mjs` compacts a run only when it published *and* live-verified, because only then
// is the run's data in Git. Everything else — a failed run, a dry run — keeps its whole staging
// tree "for investigation and owner acceptance", and nothing ever bounded that. Measured on
// 2026-09-25: `/opt/benchmarkheaven-daily/runs` held 26 GB across 90 directories, of which the
// eight published runs were ~30 MB each and the rest 450 MB – 3 GB each. The box's disk watchdog
// was refusing every agent's build at 91 % use, and the site queue on agent board thread #8 had
// been paused on it for hours.
//
// The investigative value is real, but it is not permanent, and what makes those directories big
// is not the evidence:
//
//   * `work/` is `git clone`d from the repo and `npm ci`'d — `.git` 727 MB and `node_modules`
//     399 MB per run are reproducible from the base sha the report records.
//   * `before/raw` is a byte copy of the repo's tracked `data/raw` at that same base sha
//     (752 MB), recoverable with `git show <base>:data/raw/...`. It is read only *within* its own
//     run (`live-retention.mjs`, `review-live.mjs`); nothing reads another run's copy.
//   * `benchmark-candidates/` is the run's own scratch for `public-candidate.py`.
//
// The evidence a later reader actually needs — `reports/`, `sources/`, `workers/`, `gauntlet/`,
// `review/` — is ~135 MB and is kept untouched, exactly the set `compactPublishedRun` retains.
//
// No lock is taken, on purpose. A run that is still executing is by construction the newest run
// and is hours old, so `RETAIN_STAGING_DAYS`, `RETAIN_STAGING_RUNS` and the unfinished-run rule
// below each independently exclude it; taking `state/run.lock` would only make a scheduled run
// skip itself while a deletion ran.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { compactRunDirectory, STAGING_DIRECTORIES } from './compact-run.mjs';

const exec = promisify(execFile);

/** Runs started within this many days keep their staging tree, published or not. */
export const RETAIN_STAGING_DAYS = 3;
/** …and the newest this many staging trees survive regardless of age, so a quiet pipeline still
 *  leaves something to investigate. */
export const RETAIN_STAGING_RUNS = 3;
/** A directory with no run report that was written this recently may still be a live run. */
export const SETTLE_HOURS = 6;

const DAY_MS = 86_400_000, HOUR_MS = 3_600_000;

/**
 * Decide, for each run directory, whether its staging bulk may go. Pure: every input is data, so
 * the policy is testable without a filesystem and a reader can re-derive any single verdict.
 *
 * @param runs  `[{ name, started: Date|null, finished: boolean, activity: Date, staging: string[] }]`
 *              `finished` = the run wrote `reports/run-report.json`; `staging` = which bulky
 *              directories actually exist; `activity` = newest mtime seen in the directory.
 * @returns `{ prune: [{ name, staging }], keep: [{ name, reason }] }` — one reason per kept run.
 */
export function planRunPruning({ runs, now = new Date(), retainStagingDays = RETAIN_STAGING_DAYS,
  retainStagingRuns = RETAIN_STAGING_RUNS, settleHours = SETTLE_HOURS } = {}) {
  const at = now.getTime();
  const withStaging = runs.filter((run) => run.staging?.length);
  // Newest first, by the run's own start time where it has one and by file activity otherwise.
  const order = [...withStaging].sort((a, b) =>
    (b.started?.getTime() ?? b.activity.getTime()) - (a.started?.getTime() ?? a.activity.getTime()));
  const newest = new Set(order.slice(0, retainStagingRuns).map((run) => run.name));
  const prune = [], keep = [];
  for (const run of runs) {
    if (!run.staging?.length) { keep.push({ name: run.name, reason: 'no-staging' }); continue; }
    // An unfinished directory that was written recently may be the run that is executing now.
    if (!run.finished && at - run.activity.getTime() < settleHours * HOUR_MS) {
      keep.push({ name: run.name, reason: 'possibly-running' }); continue;
    }
    if (run.started && at - run.started.getTime() < retainStagingDays * DAY_MS) {
      keep.push({ name: run.name, reason: 'recent' }); continue;
    }
    if (!run.started && at - run.activity.getTime() < retainStagingDays * DAY_MS) {
      keep.push({ name: run.name, reason: 'recent' }); continue;
    }
    if (newest.has(run.name)) { keep.push({ name: run.name, reason: 'investigation-window' }); continue; }
    prune.push({ name: run.name, staging: run.staging });
  }
  return { prune, keep };
}

/** Bytes a path occupies, or null when that cannot be measured — accounting never fails a prune. */
async function diskBytes(path) {
  try { return Number.parseInt((await exec('du', ['-sb', path])).stdout.split('\t')[0], 10) || null; }
  catch { return null; }
}

/** Newest mtime under `dir`, one level deep — enough to tell a live run from an abandoned one. */
async function lastActivity(dir) {
  let newest = (await stat(dir)).mtime;
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const when = await stat(join(dir, entry.name)).then((s) => s.mtime, () => null);
    if (when && when > newest) newest = when;
  }
  return newest;
}

/** Read one run directory into the shape `planRunPruning` consumes. */
export async function describeRun(runsDir, name) {
  const dir = join(runsDir, name);
  const staging = [];
  for (const candidate of STAGING_DIRECTORIES) {
    if (await stat(join(dir, candidate)).then(() => true, () => false)) staging.push(candidate);
  }
  const report = await readFile(join(dir, 'reports/run-report.json'), 'utf8')
    .then((text) => JSON.parse(text), () => null);
  const started = report?.started_at ? new Date(report.started_at) : null;
  return { name, started: Number.isNaN(started?.getTime()) ? null : started, finished: report !== null,
    activity: await lastActivity(dir), staging };
}

/**
 * Apply the policy under `home/runs`. Returns a receipt naming every directory it touched and
 * every one it left alone with the reason, so a run report states the whole decision.
 */
export async function pruneStaleRuns({ home, now = new Date(), dryRun = false, ...limits } = {}) {
  const runsDir = join(home, 'runs');
  const names = await readdir(runsDir, { withFileTypes: true })
    .then((entries) => entries.filter((e) => e.isDirectory()).map((e) => e.name), () => null);
  if (names === null) return { applied: false, reason: 'no-runs-directory' };
  const runs = [];
  for (const name of names.sort()) runs.push(await describeRun(runsDir, name));
  const { prune, keep } = planRunPruning({ runs, now, ...limits });
  const pruned = [];
  let freedBytes = 0;
  for (const entry of prune) {
    const dir = join(runsDir, entry.name);
    const bytes = await diskBytes(dir);
    if (!dryRun) await compactRunDirectory(dir);
    const after = dryRun ? null : await diskBytes(dir);
    if (bytes !== null && after !== null) freedBytes += Math.max(0, bytes - after);
    pruned.push({ name: entry.name, removed: entry.staging, bytes_before: bytes, bytes_after: after });
  }
  return { applied: !dryRun, dry_run: dryRun, examined: runs.length, pruned, freed_bytes: freedBytes,
    kept: keep, policy: { retain_staging_days: limits.retainStagingDays ?? RETAIN_STAGING_DAYS,
      retain_staging_runs: limits.retainStagingRuns ?? RETAIN_STAGING_RUNS,
      settle_hours: limits.settleHours ?? SETTLE_HOURS } };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const argument = (flag, fallback) => {
    const index = process.argv.indexOf(flag);
    return index === -1 ? fallback : process.argv[index + 1];
  };
  const receipt = await pruneStaleRuns({
    home: argument('--home', '/opt/benchmarkheaven-daily'),
    dryRun: process.argv.includes('--dry-run'),
    retainStagingDays: Number(argument('--retain-days', RETAIN_STAGING_DAYS)),
    retainStagingRuns: Number(argument('--retain-runs', RETAIN_STAGING_RUNS)),
  });
  console.log(JSON.stringify(receipt, null, 2));
}
