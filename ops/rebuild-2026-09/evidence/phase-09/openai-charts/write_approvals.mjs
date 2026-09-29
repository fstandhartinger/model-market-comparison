// CR-173 (openai-charts): owner acceptance rows for the chart-dataset observations, in CR-126's format.
// Binds each row's canonical SHA-256 with the validator's own function (lib/benchmark-score-evidence.mjs).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { observationDigest } from '../../../../../lib/benchmark-score-evidence.mjs';

const G = 'data/raw/benchmarks/daily-evidence/2026-09-26-openai-charts/gauntlet';
// Arguments: BATCH:ROUND pairs, e.g. automationbench-score:2 deepswe-cost:3 (the round whose clean review is accepted).
const batches = process.argv.slice(2).map((a) => a.split(':'));
const path = 'data/raw/benchmarks/score-approvals.json';
const approvals = JSON.parse(readFileSync(path, 'utf8'));
const have = new Set(approvals.rows.map((r) => r.id));
for (const [b, round] of batches) {
  const artifactFile = `${G}/artifact-${b}-r${round}.json`;
  const reviewFile = `${G}/review-${b}-r${round}.json`;
  const reviewBytes = readFileSync(reviewFile);
  const receipt = JSON.parse(readFileSync(`${reviewFile}.meta.json`, 'utf8'));
  const reviewSha = createHash('sha256').update(reviewBytes).digest('hex');
  if (receipt.output_sha256 !== reviewSha) throw new Error(`receipt mismatch ${b}`);
  const verdict = JSON.parse(reviewBytes.toString().trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
  const artifactSha = createHash('sha256').update(readFileSync(artifactFile)).digest('hex');
  if (verdict.verdict !== 'pass' || verdict.errors_found !== 0 || verdict.findings.length || verdict.missing_evidence.length
      || verdict.artifact_sha256 !== artifactSha) throw new Error(`not a clean review of this artifact: ${b}`);
  for (const row of JSON.parse(readFileSync(artifactFile, 'utf8')).observations) {
    if (have.has(row.id)) continue;
    approvals.rows.push({
      id: row.id, observation_sha256: observationDigest(row), critic_model: receipt.actual_model,
      producer_models: receipt.producers, review_file: reviewFile, review_sha256: reviewSha, artifact_file: artifactFile,
      review_row: row.id, verdict: 'accepted', evidence_locator: `${G}/packet-${b}-r${round}.json#CR-173 round ${round}; ${row.id}`,
    });
  }
}
writeFileSync(path, JSON.stringify(approvals, null, 2) + '\n');
console.log(approvals.rows.length);
