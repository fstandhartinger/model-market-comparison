#!/usr/bin/env node
// CR-65.14 proof harness: replay one registry entry's protocol review offline, against a capture
// the daily run already took, with the real producer/critic gauntlet. It never writes to data/.
//
//   node ops/ux-2026-09-12/bin/replay-protocol-review.mjs <benchmark_id> <outDir> [--lie]
//     [--activity='{"field":"critpt","models":4,"added":2,"changed":1,"removed":1,"receiptUrl":"https://…"}']
//     [--activity-from-run=<daily run work dir>]
//
// `--lie` flips the row's lifecycle status to the opposite of the registry's, so the run also shows
// that the new criterion still fails closed on a false claim. `--lie=<field>` (D251.4) does the same
// for the other two lifecycle fields, whose criterion clauses read absence in the source as evidence
// and therefore have to stay falsifiable: `--lie=version_status` claims the maintainer publishes a
// release identifier for a board that publishes none (and the reverse), and `--lie=superseded_by`
// names a successor the protocol never mentions. Bare `--lie` stays `--lie=status`.
// `--activity` (CR-38.1) attaches this run's AA added/changed-value summary exactly as the daily
// arm's protocol(entry, { activity, receipt }) does; its counts must come from a real capture
// comparison, never from memory.
// `--activity-from-run` (D247) is the public-board form and takes no counts at all: it re-runs that
// run's own extraction for this benchmark against that run's capture, reconciles it against the rows
// the run started from, and computes the summary with the production `publicValueActivity`. That is
// the only honest way to replay it — the counts cannot be typed.
// `--aa-from-run=<daily run dir>` (D251.3) is the AA form of the same idea, and replaces `--activity`
// for an AA board. The AA model page is fetched by `fetch-aa`, never by `capture-benchmark-sources`,
// so it is not in a run's `manifest.json` and `--activity` could never find it; it *is* in that run's
// `sources/live-manifest.jsonl`, which is where this reads it. It then parses that capture with the
// production `parseAaBenchmarkFields`, compares it against this checkout's published
// `aa-observed-fields.json` exactly as the daily arm does, and computes both summaries with
// `aaFieldActivity` and `aaFieldScale`. Nothing is typed: run it and the packet carries the numbers
// that run's own arm carried.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify, isDeepStrictEqual } from 'node:util';
import { reviewArtifact } from '../../daily/gauntlet.mjs';
import { protocolReviewRow, PROTOCOL_REVIEW_CRITERIA, protocolSourceContent, protocolSourceLocator, captureKey, activitySource, publicValueActivity, publicValueScale, aaFieldActivity, aaFieldScale, scaleSource, followsPageScript, discoveredScriptReceipt } from '../../daily/refresh-benchmarks.mjs';
import { reconcilePublicIdentities } from '../../daily/public-identities.mjs';
import { parseAaBenchmarkFields } from '../../../lib/aa-benchmark-fields.mjs';
import { gunzipSync } from 'node:zlib';

const exec = promisify(execFile);
const [id, outDir, ...flags] = process.argv.slice(2);
if (!id || !outDir) { console.error('usage: replay-protocol-review.mjs <benchmark_id> <outDir> [--lie[=status|version_status|superseded_by]] [--activity=<json>] [--activity-from-run=<run work dir>]'); process.exit(2); }
const LIE_FIELDS = ['status', 'version_status', 'superseded_by'];
const lieArg = flags.find((f) => f === '--lie' || f.startsWith('--lie='));
const lieField = lieArg ? (lieArg === '--lie' ? 'status' : lieArg.slice('--lie='.length)) : null;
if (lieField && !LIE_FIELDS.includes(lieField)) { console.error(`--lie=<field> is one of ${LIE_FIELDS.join(', ')}`); process.exit(2); }
const lie = Boolean(lieField);
const activityArg = flags.find((f) => f.startsWith('--activity='));
const fromRunArg = flags.find((f) => f.startsWith('--activity-from-run='));
const fromRun = fromRunArg ? fromRunArg.slice('--activity-from-run='.length) : null;
const aaRunArg = flags.find((f) => f.startsWith('--aa-from-run='));
const aaRun = aaRunArg ? aaRunArg.slice('--aa-from-run='.length) : null;
if ([activityArg, fromRun, aaRun].filter(Boolean).length > 1) { console.error('--activity, --activity-from-run and --aa-from-run are alternatives'); process.exit(2); }
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
const manifestPath = process.env.BH_REPLAY_MANIFEST ?? 'data/raw/benchmarks/daily-evidence/2026-09-18T05-40-11-593Z/manifest.json';
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
// Every lie has to be a claim the protocol text can actually refute, or the control proves nothing:
// a `snapshot` board becomes one that publishes a release identifier, and a board that names no
// successor gains one — a real registry id, so `protocolReviewRow`'s own shape stays intact.
if (lieField === 'status') row.status = row.status === 'active' ? 'retained' : 'active';
if (lieField === 'version_status') row.version_status = row.version_status === 'published' ? 'snapshot' : 'published';
if (lieField === 'superseded_by') {
  row.superseded_by = row.superseded_by === null
    ? (registry.entries.find((e) => e.family !== entry.family)?.id ?? null)
    : null;
  if (row.superseded_by === null) throw new Error(`${id}: no other family in the registry to invent a supersession from`);
}
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
  const plan = JSON.parse(await readFile(join(fromRun, 'data/raw/benchmarks/collection-plan.json'), 'utf8'));
  const spec = plan.entries.find((e) => e.benchmark_id === id);
  if (!spec?.parser) throw new Error(`${id}: no parser in ${fromRun}'s collection plan`);
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
  const scale = publicValueScale(spec.parser.value_field, reconciled.rows, entry.maintainer);
  console.error(`activity from ${fromRun}: ${JSON.stringify({ ...computed, rows: reconciled.rows.length, prior_rows: priorRows.length })}`);
  console.error(`scale from ${fromRun}: ${JSON.stringify(scale)}`);
  if (computed.models === 0) throw new Error(`${id}: no value changed against ${fromRun}'s starting rows, so that run's arm carried no summary either`);
  // D251.1: the daily attaches the activity summary only when it is affirmative and the scale
  // summary whenever the board publishes a finite value; this reproduces both conditions.
  if (computed.affirmative) sources.push(activitySource(proposed.source, computed));
  if (scale) sources.push(scaleSource(proposed.source, scale));
}
// D251.3: the AA arm's two generated summaries, both recomputed here from that run's own capture.
if (aaRun) {
  const mapping = registry.aa_field_map.find((m) => m.benchmark_id === id);
  if (!mapping) throw new Error(`${id}: not an AA field board; --aa-from-run does not apply`);
  const live = (await readFile(join(aaRun, 'sources', 'live-manifest.jsonl'), 'utf8')).trim().split('\n').map((l) => JSON.parse(l));
  const oldAa = JSON.parse(await readFile('data/raw/benchmarks/aa-observed-fields.json', 'utf8'));
  const receipt = live.find((r) => r.status === 200 && r.url === oldAa.source_url);
  if (!receipt) throw new Error(`no capture of ${oldAa.source_url} in ${aaRun}'s live manifest`);
  const html = gunzipSync(await readFile(receipt.file)).toString();
  const next = parseAaBenchmarkFields(html, { source_url: receipt.url, collected_at: receipt.fetched_at,
    source_sha256: receipt.sha256, minimumRows: oldAa.count });
  const priorBySource = new Map(oldAa.rows.map((r) => [r.source_id, r]));
  const changed = next.rows.filter((r) => !isDeepStrictEqual(r, priorBySource.get(r.source_id)));
  const root = mapping.field.split('.')[0];
  const activityComputed = aaFieldActivity(root, changed, priorBySource);
  const scale = aaFieldScale(mapping.field, next.rows);
  const source = { ...receipt, retrieved_at: receipt.fetched_at };
  console.error(`aa activity from ${aaRun}: ${JSON.stringify(activityComputed)}`);
  console.error(`aa scale from ${aaRun}: ${JSON.stringify(scale)}`);
  // The AA arm attaches its activity summary whatever the counts say (CR-38.1's behaviour, unlike
  // D247's public form), so this does too — a replay that withheld it would not be that arm.
  sources.push(activitySource(source, activityComputed));
  if (scale) sources.push(scaleSource(source, scale));
}
await mkdir(outDir, { recursive: true });
const reviewed = await reviewArtifact({ runDir: outDir, artifactId: `protocol-${entry.id}`, rows: [row], sources, criteria: PROTOCOL_REVIEW_CRITERIA });
console.log(JSON.stringify({ id: entry.id, lie, lie_field: lieField, row_status: row.status, row_version_status: row.version_status, row_superseded_by: row.superseded_by, accepted: reviewed.accepted,
  fingerprints: reviewed.fingerprints.length, quarantined: reviewed.quarantined, errors: reviewed.errors,
  artifact_dir: join(outDir, 'gauntlet', `protocol-${entry.id}`.replace(/[^A-Za-z0-9._-]+/g, '-')) }, null, 2));
process.exit(reviewed.accepted ? 0 : 1);
