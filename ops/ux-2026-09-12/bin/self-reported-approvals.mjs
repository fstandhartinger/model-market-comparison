#!/usr/bin/env node
// Owner acceptance for a reviewed self-reported tranche: writes one score-approvals row per candidate
// the critic actually covered, bound to the exact observation, the critic receipt and the artifact.
// Usage: node ops/ux-2026-09-12/bin/self-reported-approvals.mjs <artifact.json> <review.json> <locator>
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { writeJSONAtomic } from '../../../lib/snapshot.mjs';
import { observationDigest } from '../../../lib/benchmark-score-evidence.mjs';

const [artifactPath, reviewPath, locator] = process.argv.slice(2);
if (!artifactPath || !reviewPath || !locator) throw new Error('usage: <artifact.json> <review.json> <evidence locator>');
const sha = (b) => createHash('sha256').update(b).digest('hex');

const artifactBytes = await readFile(artifactPath);
const artifact = JSON.parse(artifactBytes);
const reviewBytes = await readFile(reviewPath);
const receipt = JSON.parse(await readFile(`${reviewPath}.meta.json`, 'utf8'));
const verdict = JSON.parse(reviewBytes.toString().trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));

if (verdict.verdict !== 'pass' || verdict.errors_found !== 0 || verdict.findings?.length) throw new Error('The critic did not pass this tranche; repair the findings and review again');
if (verdict.artifact_sha256 !== sha(artifactBytes)) throw new Error('The critic reviewed a different artifact');
if (receipt.output_sha256 !== sha(reviewBytes)) throw new Error('Critic receipt does not match the review file');

const covered = new Set(verdict.coverage_checked ?? []);
const approvals = JSON.parse(await readFile('data/raw/benchmarks/score-approvals.json', 'utf8'));
const rows = approvals.rows.filter((r) => !artifact.observations.some((o) => o.id === r.id));
let added = 0, skipped = [];
for (const o of artifact.observations) {
  if (!covered.has(o.id)) { skipped.push(o.id); continue; }
  rows.push({
    id: o.id,
    observation_sha256: observationDigest(o),
    critic_model: receipt.actual_model,
    producer_models: [...new Set(receipt.producers)],
    review_file: reviewPath,
    review_sha256: sha(reviewBytes),
    artifact_file: artifactPath,
    review_row: o.id,
    verdict: 'accepted',
    evidence_locator: `${locator}; ${o.id}`,
  });
  added++;
}
rows.sort((a, b) => a.id.localeCompare(b.id));
await writeJSONAtomic('data/raw/benchmarks/score-approvals.json', { ...approvals, rows });
console.log(JSON.stringify({ added, skipped_not_covered: skipped, total: rows.length }));
