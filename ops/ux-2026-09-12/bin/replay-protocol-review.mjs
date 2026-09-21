#!/usr/bin/env node
// CR-65.14 proof harness: replay one registry entry's protocol review offline, against a capture
// the daily run already took, with the real producer/critic gauntlet. It never writes to data/.
//
//   node ops/ux-2026-09-12/bin/replay-protocol-review.mjs <benchmark_id> <outDir> [--lie]
//
// `--lie` flips the row's lifecycle status to the opposite of the registry's, so the run also shows
// that the new criterion still fails closed on a false claim.
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { reviewArtifact } from '../../daily/gauntlet.mjs';
import { protocolReviewRow, PROTOCOL_REVIEW_CRITERIA, protocolSourceContent, protocolSourceLocator } from '../../daily/refresh-benchmarks.mjs';

const exec = promisify(execFile);
const [id, outDir, ...flags] = process.argv.slice(2);
if (!id || !outDir) { console.error('usage: replay-protocol-review.mjs <benchmark_id> <outDir> [--lie]'); process.exit(2); }
const lie = flags.includes('--lie');

const registry = JSON.parse(await readFile('data/raw/benchmarks/registry.json', 'utf8'));
const entry = registry.entries.find((e) => e.id === id);
if (!entry) throw new Error(`unknown benchmark id ${id}`);
const manifests = JSON.parse(await readFile(process.env.BH_REPLAY_MANIFEST
  ?? 'data/raw/benchmarks/daily-evidence/2026-09-18T05-40-11-593Z/manifest.json', 'utf8'));
const captured = new Map(manifests.filter((r) => r.status === 200).map((r) => [r.url, r]));

// Same reference selection, text extraction and excerpt bound as ops/daily/refresh-benchmarks.mjs.
const references = (entry.evidence ?? []).filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''));
if (!references.length) references.push({ url: entry.primary_url });
const sources = [];
for (const reference of references) {
  const receipt = captured.get(reference.url);
  if (!receipt) throw new Error(`no capture for ${reference.url} in the replay manifest`);
  const { stdout: body } = await exec('python3', ['ops/daily/public-candidate.py', 'text', receipt.file], { maxBuffer: 16_000_000, timeout: 30_000 });
  const content = protocolSourceContent(entry.id, reference, body);
  sources.push({ ...reference, ...receipt, fetched_at: receipt.retrieved_at, content, locator: protocolSourceLocator(reference) });
}

const row = protocolReviewRow(entry);
if (lie) row.status = row.status === 'active' ? 'retained' : 'active';
await mkdir(outDir, { recursive: true });
const reviewed = await reviewArtifact({ runDir: outDir, artifactId: `protocol-${entry.id}`, rows: [row], sources, criteria: PROTOCOL_REVIEW_CRITERIA });
console.log(JSON.stringify({ id: entry.id, lie, row_status: row.status, accepted: reviewed.accepted,
  fingerprints: reviewed.fingerprints.length, quarantined: reviewed.quarantined, errors: reviewed.errors,
  artifact_dir: join(outDir, 'gauntlet', `protocol-${entry.id}`.replace(/[^A-Za-z0-9._-]+/g, '-')) }, null, 2));
process.exit(reviewed.accepted ? 0 : 1);
