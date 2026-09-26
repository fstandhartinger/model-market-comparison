#!/usr/bin/env node
// D219 (2026-09-26): simulate the next daily refresh for the three arms that failed closed on a retired
// display badge, offline, against a committed capture — the same path ops/daily/refresh-benchmarks.mjs
// takes (swap the plan source for the run's capture, run public-candidate.py, reconcile against the
// committed prior rows plus the reviewed withdrawals). It answers one question per arm: does the
// reconciler still throw, and which rows change?
//
//   node ops/ux-2026-09-12/bin/simulate-d219-next-refresh.mjs [capture-dir] [out.json]
//
// Exit code 1 if any arm would still fail. Run it before and after a badge change, the way
// diagnose-d219-badge-identities.mjs is run before and after.
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reconcilePublicIdentities } from '../../../ops/daily/public-identities.mjs';

const exec = promisify(execFile);
const json = async (p) => JSON.parse(await readFile(p, 'utf8'));
const CAPTURE = process.argv[2] ?? 'data/raw/benchmarks/daily-evidence/2026-09-26T05-26-18-430Z';
const OUT = process.argv[3] ?? null;
const ARMS = ['eqbench-creative-writing::3', 'eqbench-longform-writing::v1.11', 'vending-bench::2'];
const semantic = ({ id, source, supporting_sources, ...rest }) => JSON.stringify(rest);

// D219_PLAN / D219_PRIOR let the same harness replay the *unfixed* state, so a green run proves the fix
// rather than the harness: with the pre-fix plan and prior rows it must still fail closed.
const plan = await json(process.env.D219_PLAN ?? 'data/raw/benchmarks/collection-plan.json');
const prior = await json(process.env.D219_PRIOR ?? 'data/raw/benchmarks/public-observations.json');
const { withdrawals } = await json('data/raw/benchmarks/public-withdrawals.json');
const manifest = new Map((await json(join(CAPTURE, 'manifest.json'))).filter((r) => r.status === 200).map((r) => [r.url, r]));
const temp = await mkdtemp(join(tmpdir(), 'd219-'));

const report = { capture: CAPTURE, arms: [] };
let failed = 0;
for (const id of ARMS) {
  const spec = structuredClone(plan.entries.find((e) => e.benchmark_id === id));
  const receipt = manifest.get(spec.source.url);
  const arm = { benchmark_id: id, source_url: spec.source.url };
  report.arms.push(arm);
  if (!receipt) { arm.status = 'no_capture'; failed++; continue; }
  spec.source = { ...spec.source, ...receipt, fetched_at: receipt.retrieved_at };
  const planFile = join(temp, `plan-${report.arms.length}.json`), outFile = join(temp, `cand-${report.arms.length}.json`);
  await writeFile(planFile, JSON.stringify({ schema_version: 1, entries: [spec] }));
  try {
    await exec('python3', ['ops/daily/public-candidate.py', planFile, outFile], { timeout: 60_000, maxBuffer: 2_000_000 });
  } catch (error) { arm.status = 'candidate_failed'; arm.error = String(error.stderr || error).slice(-600); failed++; continue; }
  const { candidate, evidence } = await json(outFile);
  const priorRows = prior.observations.filter((r) => r.benchmark_id === id);
  try {
    const reconciled = reconcilePublicIdentities(candidate.observations, evidence, priorRows,
      { withdrawals: withdrawals.filter((w) => w.benchmark_id === id) });
    const old = new Map(priorRows.map((r) => [r.id, r]));
    arm.status = 'reconciled';
    arm.prior_rows = priorRows.length;
    arm.candidate_rows = reconciled.rows.length;
    arm.withdrawn = reconciled.withdrawn.map((w) => w.source_id);
    arm.new_rows = reconciled.rows.filter((r) => !old.has(r.id)).map((r) => r.subject.source_id);
    arm.changed_rows = reconciled.rows.filter((r) => old.has(r.id) && semantic(r) !== semantic(old.get(r.id))).length;
    arm.badged_names = reconciled.rows.map((r) => r.subject.source_id)
      .filter((n) => n.startsWith('*') || n.startsWith('!') || n.endsWith(' New'));
    if (arm.badged_names.length) { arm.status = 'badge_still_published'; failed++; }
  } catch (error) { arm.status = 'reconcile_failed'; arm.error = String(error.message); failed++; }
}
report.ok = failed === 0;
const text = JSON.stringify(report, null, 2);
if (OUT) await writeFile(OUT, text + '\n');
console.log(text);
process.exit(failed ? 1 : 0);
