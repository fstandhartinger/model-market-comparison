#!/usr/bin/env node
// CR-65.14 proof harness: replay one registry entry's protocol review offline, against a capture
// the daily run already took, with the real producer/critic gauntlet. It never writes to data/.
//
//   node ops/ux-2026-09-12/bin/replay-protocol-review.mjs <benchmark_id> <outDir> [--lie]
//     [--activity '{"field":"critpt","models":4,"added":2,"changed":1,"removed":1,"receiptUrl":"https://…"}']
//
// `--lie` flips the row's lifecycle status to the opposite of the registry's, so the run also shows
// that the new criterion still fails closed on a false claim.
// `--activity` (CR-38.1) attaches this run's AA added/changed-value summary exactly as the daily
// arm's protocol(entry, { activity, receipt }) does; its counts must come from a real capture
// comparison, never from memory.
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { reviewArtifact } from '../../daily/gauntlet.mjs';
import { protocolReviewRow, PROTOCOL_REVIEW_CRITERIA, protocolSourceContent, protocolSourceLocator, captureKey, aaActivitySource } from '../../daily/refresh-benchmarks.mjs';

const exec = promisify(execFile);
const [id, outDir, ...flags] = process.argv.slice(2);
if (!id || !outDir) { console.error('usage: replay-protocol-review.mjs <benchmark_id> <outDir> [--lie] [--activity <json>]'); process.exit(2); }
const lie = flags.includes('--lie');
const activityArg = flags.find((f) => f.startsWith('--activity='));
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
const manifests = JSON.parse(await readFile(process.env.BH_REPLAY_MANIFEST
  ?? 'data/raw/benchmarks/daily-evidence/2026-09-18T05-40-11-593Z/manifest.json', 'utf8'));
const captured = new Map(manifests.filter((r) => r.status === 200).map((r) => [captureKey(r), r]));

// Same reference selection, text extraction and excerpt bound as ops/daily/refresh-benchmarks.mjs.
const references = (entry.evidence ?? []).filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''));
if (!references.length) references.push({ url: entry.primary_url });
const sources = [];
for (const reference of references) {
  const receipt = captured.get(captureKey(reference));
  if (!receipt) throw new Error(`no capture for ${captureKey(reference)} in the replay manifest`);
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
  sources.push(aaActivitySource(receipt, { ...counts, affirmative: counts.added + counts.changed }));
}
await mkdir(outDir, { recursive: true });
const reviewed = await reviewArtifact({ runDir: outDir, artifactId: `protocol-${entry.id}`, rows: [row], sources, criteria: PROTOCOL_REVIEW_CRITERIA });
console.log(JSON.stringify({ id: entry.id, lie, row_status: row.status, accepted: reviewed.accepted,
  fingerprints: reviewed.fingerprints.length, quarantined: reviewed.quarantined, errors: reviewed.errors,
  artifact_dir: join(outDir, 'gauntlet', `protocol-${entry.id}`.replace(/[^A-Za-z0-9._-]+/g, '-')) }, null, 2));
process.exit(reviewed.accepted ? 0 : 1);
