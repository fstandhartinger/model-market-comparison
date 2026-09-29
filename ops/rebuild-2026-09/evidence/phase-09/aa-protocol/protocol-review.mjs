#!/usr/bin/env node
// CR-173, 2026-09-26: replays the daily protocol arm for AA field entries against the registry's own committed
// methodology capture, with the same reference filter, text extraction, excerpt rule, bound, row and criteria as
// ops/daily/refresh-benchmarks.mjs `protocol()` and the same gauntlet (reviewArtifact, dynamic workers). The daily
// arm additionally attaches its own activity summary (aaActivitySource); that summary only bears on `status`.
// Usage: node ops/rebuild-2026-09/evidence/phase-09/aa-protocol/protocol-review.mjs <registry id> [...]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { reviewArtifact } from '../../../../daily/gauntlet.mjs';
import { protocolReviewRow, protocolSourceContent, protocolSourceLocator, PROTOCOL_REVIEW_CRITERIA } from '../../../../daily/refresh-benchmarks.mjs';

const runDir = 'ops/rebuild-2026-09/evidence/phase-09/aa-protocol';
const registry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8'));
const textSource = (file, recipe) => execFileSync('python3', ['ops/daily/public-candidate.py', 'text', file, ...(recipe ? [recipe] : [])], { encoding: 'utf8', maxBuffer: 16_000_000 });
for (const id of process.argv.slice(2)) {
  const entry = registry.entries.find((e) => e.id === id);
  const references = (entry.evidence ?? []).filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''));
  const sources = references.map((reference) => {
    if (!reference.file) throw new Error(`${id}: no committed capture for ${reference.url}`);
    const content = protocolSourceContent(id, reference, textSource(reference.file, reference.recipe));
    if (Buffer.byteLength(content) > 60_000) throw new Error(`${id}: full source exceeds review bound`);
    return { ...reference, status: 200, retrieved_at: reference.fetched_at, content, locator: protocolSourceLocator(reference) };
  });
  const reviewed = await reviewArtifact({ runDir, artifactId: `protocol-${id}`, rows: [protocolReviewRow(entry)], sources, criteria: PROTOCOL_REVIEW_CRITERIA });
  console.log(JSON.stringify({ id, accepted: reviewed.accepted, fingerprints: reviewed.fingerprints.length, errors: reviewed.errors }));
}
