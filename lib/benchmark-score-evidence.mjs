import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { resolve, sep } from 'node:path';
import { validateBenchmarkScores } from './benchmark-scores.mjs';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const canonical = (v) => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v;
export const observationDigest = (o) => sha256(JSON.stringify(canonical(o)));

export async function verifyScoreEvidence(snapshot, registry, { root = process.cwd(), approvals = { rows: [] } } = {}) {
  validateBenchmarkScores(snapshot, registry);
  const files = new Map();
  const reviews = new Map();
  const artifacts = new Map();
  for (const o of [...snapshot.observations, ...snapshot.missing]) {
    for (const source of [o.source, ...(o.supporting_sources || [])]) {
    const path = resolve(root, source.file);
    if (!path.startsWith(resolve(root) + sep)) throw new Error('Source file outside repository');
    if (!files.has(path)) {
      const stored = await readFile(path);
      files.set(path, sha256(path.endsWith('.gz') ? gunzipSync(stored) : stored));
    }
    if (files.get(path) !== source.sha256) throw new Error(`Source digest mismatch: ${source.file}`);
    }
    if ((o.source_basis ?? o.basis) !== 'self_reported') continue;
    const approval = approvals.rows.find((r) => r.id === o.id && r.observation_sha256 === observationDigest(o));
    if (!approval || !approval.critic_model || !Array.isArray(approval.producer_models) || !approval.producer_models.length
        || approval.producer_models.some((m) => m.split('/')[0] === approval.critic_model.split('/')[0])) throw new Error(`Unreviewed vendor score: ${o.id}`);
    const reviewPath = resolve(root, approval.review_file || '');
    if (!reviewPath.startsWith(resolve(root) + sep)) throw new Error('Review file outside repository');
    if (!reviews.has(reviewPath)) reviews.set(reviewPath, await readFile(reviewPath));
    const reviewBytes = reviews.get(reviewPath);
    if (sha256(reviewBytes) !== approval.review_sha256) throw new Error(`Critic receipt digest mismatch: ${o.id}`);
    const verdict = JSON.parse(reviewBytes.toString().trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
    if (verdict.verdict !== 'pass' || verdict.errors_found !== 0 || !Array.isArray(verdict.findings) || verdict.findings.length
        || !Array.isArray(verdict.missing_evidence) || verdict.missing_evidence.length || !Array.isArray(verdict.fixed)
        || !Array.isArray(verdict.coverage_checked) || !verdict.coverage_checked.includes(approval.review_row)) throw new Error(`Critic did not cover accepted row: ${o.id}`);
    const artifactPath = resolve(root, approval.artifact_file || '');
    if (!artifactPath.startsWith(resolve(root) + sep)) throw new Error('Artifact file outside repository');
    if (!artifacts.has(artifactPath)) {
      const stored = await readFile(artifactPath);
      const raw = artifactPath.endsWith('.gz') ? gunzipSync(stored) : stored;
      const artifact = JSON.parse(raw);
      artifacts.set(artifactPath, { sha256: sha256(raw), rows: Array.isArray(artifact) ? artifact : artifact.observations });
    }
    const artifact = artifacts.get(artifactPath);
    const reviewed = typeof approval.review_row === 'number' ? artifact.rows?.[approval.review_row - 1]
      : artifact.rows?.find((row) => row.id === approval.review_row);
    if (artifact.sha256 !== verdict.artifact_sha256 || !reviewed || observationDigest(reviewed) !== observationDigest(o)) throw new Error(`Accepted row differs from critic artifact: ${o.id}`);
    // This acceptance manifest is owner-authored after resolving the critic's findings.
    if (approval.verdict !== 'accepted' || !approval.evidence_locator) throw new Error(`Missing owner acceptance: ${o.id}`);
  }
  return { observations: snapshot.observations.length, source_files: files.size,
    self_reported_verified: snapshot.observations.filter((o) => (o.source_basis ?? o.basis) === 'self_reported').length };
}
