#!/usr/bin/env node
// CR-65.14 proof harness: replay one registry entry's protocol review offline, against a capture
// the daily run already took, with the real producer/critic gauntlet. It never writes to data/.
//
//   node ops/ux-2026-09-12/bin/replay-protocol-review.mjs <benchmark_id> <outDir> [--lie]
//     [--activity='{"field":"critpt","models":4,"added":2,"changed":1,"removed":1,"receiptUrl":"https://…"}']
//     [--activity-from-run=<daily run work dir>]
//
// `--lie` flips the row's lifecycle status to the opposite of the registry's, so the run also shows
// that the new criterion still fails closed on a false claim.
// `--activity` (CR-38.1) attaches this run's AA added/changed-value summary exactly as the daily
// arm's protocol(entry, { activity, receipt }) does; its counts must come from a real capture
// comparison, never from memory.
// `--activity-from-run` (D247) is the public-board form and takes no counts at all: it re-runs that
// run's own extraction for this benchmark against that run's capture, reconciles it against the rows
// the run started from, and computes the summary with the production `publicValueActivity`. That is
// the only honest way to replay it — the counts cannot be typed. It also selects this run's newest
// successful manifest receipt for that source; a missing run capture fails closed instead of using
// the generic historical manifest below.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { reviewArtifact } from '../../daily/gauntlet.mjs';
import { protocolReviewRow, PROTOCOL_REVIEW_CRITERIA, protocolSourceContent, protocolSourceLocator, captureKey, activitySource, publicValueActivity, followsPageScript, discoveredScriptReceipt } from '../../daily/refresh-benchmarks.mjs';
import { reconcilePublicIdentities } from '../../daily/public-identities.mjs';
import { replayManifestForRun } from '../../daily/replay-manifest.mjs';

const exec = promisify(execFile);
const [id, outDir, ...flags] = process.argv.slice(2);
if (!id || !outDir) { console.error('usage: replay-protocol-review.mjs <benchmark_id> <outDir> [--lie] [--activity=<json>] [--activity-from-run=<run work dir>]'); process.exit(2); }
const lie = flags.includes('--lie');
const activityArg = flags.find((f) => f.startsWith('--activity='));
const fromRunArg = flags.find((f) => f.startsWith('--activity-from-run='));
const fromRun = fromRunArg ? fromRunArg.slice('--activity-from-run='.length) : null;
if (activityArg && fromRun) { console.error('--activity and --activity-from-run are alternatives'); process.exit(2); }
const activity = activityArg ? JSON.parse(activityArg.slice('--activity='.length)) : null;
if (activity && (!activity.field || !Number.isFinite(activity.models) || !Number.isFinite(activity.added)
  || !Number.isFinite(activity.changed) || !Number.isFinite(activity.removed) || !activity.receiptUrl)) {
  console.error('--activity needs {"field","models","added","changed","removed","receiptUrl"}');
  process.exit(2);
}
delete activity?.affirmative;

const registry = JSON.parse(await readFile('data/raw/benchmarks/registry.json', 'utf8'));
const entry = registry.entries.find((e) => e.id === id);
if (!entry) throw new Error(`unknown benchmark id ${id}`);
const runPlan = fromRun
  ? JSON.parse(await readFile(join(fromRun, 'data/raw/benchmarks/collection-plan.json'), 'utf8'))
  : null;
const runSpec = runPlan?.entries.find((e) => e.benchmark_id === id);
if (fromRun && !runSpec?.parser) throw new Error(`${id}: no parser in ${fromRun}'s collection plan`);
const manifestPath = process.env.BH_REPLAY_MANIFEST
  ?? (fromRun
    ? await replayManifestForRun({ workDir: fromRun, source: runSpec.source, captureKey })
    : 'data/raw/benchmarks/daily-evidence/2026-09-18T05-40-11-593Z/manifest.json');
const manifests = JSON.parse(await readFile(manifestPath, 'utf8'));
// A manifest records its capture files repo-relative, so replaying a *daily run's* manifest — the
// only place a run's own captures survive — needs the checkout they are relative to. It is the
// manifest's own location minus the fixed data/raw/benchmarks/daily-evidence/<dir>/manifest.json
// tail; BH_REPLAY_ROOT overrides it. The extraction itself stays this checkout's, because the next
// run is the one this replay is a proof for.
const replayRoot = process.env.BH_REPLAY_ROOT
  ?? resolve(manifestPath, '..', '..', '..', '..', '..', '..');
const captured = new Map(manifests.filter((r) => r.status === 200)
  .map((r) => [captureKey(r), { ...r, file: r.file ? resolve(replayRoot, r.file) : r.file }]));

// Same reference selection, text extraction and excerpt bound as ops/daily/refresh-benchmarks.mjs.
const references = (entry.evidence ?? []).filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''));
if (!references.length) references.push({ url: entry.primary_url });
const sources = [];
for (const reference of references) {
  // Same discovery rule as the daily path: a page whose protocol text lives in a module script
  // whose filename changes every deploy is reviewed through the bundle *this* capture found, not
  // through the URL the registry recorded when the entry was written (D188 — LiveBench could not
  // be replayed at all before this, because the recorded bundle name was two deploys old).
  // D230 adds the marker form of the same rule: where many hashed chunks are declared, the capture
  // that carries the reviewed marker is the source.
  const receipt = followsPageScript(reference)
    ? discoveredScriptReceipt(captured.values(), reference)
    : captured.get(captureKey(reference));
  if (!receipt) throw new Error(`no capture for ${followsPageScript(reference) ? `${reference.follow_script_marker ? 'marked' : 'module'} script discovered from ${reference.page_url}` : captureKey(reference)} in the replay manifest`);
  const { stdout: body } = await exec('python3', ['ops/daily/public-candidate.py', 'text', receipt.file, ...(reference.recipe ? [reference.recipe] : [])], { maxBuffer: 16_000_000, timeout: 30_000 });
  const content = protocolSourceContent(entry.id, reference, body);
  sources.push({ ...reference, ...receipt, fetched_at: receipt.retrieved_at, content, locator: protocolSourceLocator(reference) });
}

const row = protocolReviewRow(entry);
if (lie) row.status = row.status === 'active' ? 'retained' : 'active';
if (activity) {
  const receipt = captured.get(activity.receiptUrl);
  if (!receipt) throw new Error(`no capture for activity receipt ${activity.receiptUrl} in the replay manifest`);
  const { receiptUrl, ...counts } = activity;
  sources.push(activitySource(receipt, { payload: 'Artificial Analysis model-page payload',
    removed_phrase: 'value(s) newly null', ...counts, affirmative: counts.added + counts.changed }));
}
// D247: the public-board summary, recomputed here rather than supplied. Everything below is the
// daily arm's own path — the run's plan entry, the run's capture, ops/daily/public-candidate.py,
// reconcilePublicIdentities against the rows that run started from, publicValueActivity — so the
// numbers in the packet are the numbers that run would have put there.
if (fromRun) {
  const spec = runSpec;
  if (spec.parser.runs) throw new Error(`${id}: a multi-capture arm carries no activity summary`);
  const receipt = captured.get(captureKey(spec.source));
  if (!receipt) throw new Error(`no capture for ${captureKey(spec.source)} in the replay manifest`);
  const priorPublic = JSON.parse(await readFile(join(fromRun, 'data/raw/benchmarks/public-observations.json'), 'utf8'));
  const priorRows = priorPublic.observations.filter((r) => r.benchmark_id === id);
  const withdrawals = (JSON.parse(await readFile(join(fromRun, 'data/raw/benchmarks/public-withdrawals.json'), 'utf8')).withdrawals ?? [])
    .filter((w) => w.benchmark_id === id);
  const proposed = structuredClone(spec);
  proposed.source = { ...spec.source, ...receipt, fetched_at: receipt.retrieved_at ?? receipt.fetched_at };
  for (const key of ['method_source', 'categories_source', 'frontend_source', 'detail_source', 'config_source']) {
    if (!spec.parser[key]) continue;
    const other = captured.get(captureKey(spec.parser[key]));
    if (!other) throw new Error(`no capture for ${captureKey(spec.parser[key])} in the replay manifest`);
    proposed.parser[key] = { ...spec.parser[key], ...other, fetched_at: other.retrieved_at ?? other.fetched_at };
  }
  const planFile = join(outDir, 'activity-plan.json'), candidateFile = join(outDir, 'activity-candidate.json');
  await mkdir(outDir, { recursive: true });
  await writeFile(planFile, JSON.stringify({ schema_version: 1, entries: [proposed] }, null, 1));
  await exec('python3', ['ops/daily/public-candidate.py', planFile, candidateFile], { timeout: 120_000, maxBuffer: 8_000_000 });
  const { candidate, evidence: nativeEvidence } = JSON.parse(await readFile(candidateFile, 'utf8'));
  const reconciled = reconcilePublicIdentities(candidate.observations, nativeEvidence, priorRows, { withdrawals });
  const computed = publicValueActivity(spec.parser.value_field, reconciled.rows,
    new Map(priorRows.map((r) => [r.id, r])), reconciled.withdrawn, entry.maintainer);
  console.error(`activity from ${fromRun}: ${JSON.stringify({ ...computed, rows: reconciled.rows.length, prior_rows: priorRows.length })}`);
  if (computed.models === 0) throw new Error(`${id}: no value changed against ${fromRun}'s starting rows, so that run's arm carried no summary either`);
  sources.push(activitySource(proposed.source, computed));
}
await mkdir(outDir, { recursive: true });
const reviewed = await reviewArtifact({ runDir: outDir, artifactId: `protocol-${entry.id}`, rows: [row], sources, criteria: PROTOCOL_REVIEW_CRITERIA });
console.log(JSON.stringify({ id: entry.id, lie, row_status: row.status, accepted: reviewed.accepted,
  fingerprints: reviewed.fingerprints.length, quarantined: reviewed.quarantined, errors: reviewed.errors,
  artifact_dir: join(outDir, 'gauntlet', `protocol-${entry.id}`.replace(/[^A-Za-z0-9._-]+/g, '-')) }, null, 2));
process.exit(reviewed.accepted ? 0 : 1);
