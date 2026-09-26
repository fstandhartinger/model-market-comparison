#!/usr/bin/env node
// CR-173 (frontiercode lane), 2026-09-26: replays the daily protocol arm for frontiercode::1.1 and
// frontiercode-cost::1.1 against this lane's own capture (data/raw/benchmarks/daily-evidence/2026-09-26-frontiercode/),
// with the same reference filter, text extraction, excerpt rule, bound, row and criteria as
// ops/daily/refresh-benchmarks.mjs `protocol()`, and the same gauntlet (reviewArtifact, dynamic workers).
// Usage: node ops/rebuild-2026-09/evidence/phase-09/frontiercode/protocol-review.mjs [registry id ...]
// (default: the two Main entries; the Extended entries added by CR-173 were reviewed by a second call naming them)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { reviewArtifact } from '../../../../daily/gauntlet.mjs';
import { protocolReviewRow, protocolSourceContent, protocolSourceLocator, PROTOCOL_REVIEW_CRITERIA } from '../../../../daily/refresh-benchmarks.mjs';

const runDir = 'data/raw/benchmarks/daily-evidence/2026-09-26-frontiercode';
const manifest = JSON.parse(readFileSync(`${runDir}/manifest.json`, 'utf8'));
const robots = { url: 'https://cognition.com/robots.txt', file: `${runDir}/cognition.com-robots.txt`, status: 200,
  retrieved_at: manifest[0].retrieved_at };
const registry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8'));
const textSource = (file, recipe) => execFileSync('python3', ['ops/daily/public-candidate.py', 'text', file, ...(recipe ? [recipe] : [])], { encoding: 'utf8', maxBuffer: 16_000_000 });
const sha = (file) => execFileSync('python3', ['-c', 'import sys,hashlib,gzip;p=sys.argv[1];b=open(p,"rb").read();b=gzip.decompress(b) if p.endswith(".gz") else b;print(hashlib.sha256(b).hexdigest())', file], { encoding: 'utf8' }).trim();
const results = {};
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['frontiercode::1.1', 'frontiercode-cost::1.1'];
for (const id of ids) {
  const entry = registry.entries.find((e) => e.id === id);
  const references = (entry.evidence ?? []).filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''));
  const sources = references.map((reference) => {
    const receipt = reference.url === robots.url ? { ...robots, sha256: sha(robots.file) } : manifest.find((r) => r.url === reference.url);
    if (receipt?.status !== 200) throw new Error(`no capture for ${reference.url}`);
    const content = protocolSourceContent(id, reference, textSource(receipt.file, reference.recipe));
    if (Buffer.byteLength(content) > 60_000) throw new Error(`${id}: full source exceeds review bound`);
    return { ...reference, ...receipt, fetched_at: receipt.retrieved_at, content, locator: protocolSourceLocator(reference) };
  });
  const reviewed = await reviewArtifact({ runDir, artifactId: `protocol-${id}`, rows: [protocolReviewRow(entry)], sources, criteria: PROTOCOL_REVIEW_CRITERIA });
  results[id] = { accepted: reviewed.accepted, fingerprints: reviewed.fingerprints.length, errors: reviewed.errors, sources: sources.map((s) => [s.url, Buffer.byteLength(s.content)]) };
  console.log(JSON.stringify({ id, ...results[id] }));
}
