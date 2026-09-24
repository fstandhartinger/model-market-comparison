import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { resolve, sep } from 'node:path';
import { validateBenchmarkScores } from './benchmark-scores.mjs';
import { vendorFamily } from '../ops/rebuild-2026-09/bin/worker-policy.mjs';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const canonical = (v) => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v;
export const observationDigest = (o) => sha256(JSON.stringify(canonical(o)));

/** The row as its value critic approved it: before a reviewed identity join set subject.model_id. */
export function unjoined(o) {
  const { join_note: _note, identity_review: _review, ...rest } = o;
  return { ...rest, subject: { ...o.subject, model_id: null } };
}

export const identityKey = (o) => `${o.benchmark_id}|${o.subject.source_id}|${o.subject.model_id}`;

/** Identity receipt: a packet listing proposed joins, and a verdict from a critic outside the producer's vendor family
 *  that passes the packet and does not reject this join. */
export async function verifyIdentityReview(o, root = process.cwd(), cache = new Map()) {
  const r = o.identity_review;
  const load = async (file, digest) => {
    const path = resolve(root, file || '');
    if (!path.startsWith(resolve(root) + sep)) throw new Error('Identity review file outside repository');
    if (!cache.has(path)) cache.set(path, await readFile(path));
    if (sha256(cache.get(path)) !== digest) throw new Error(`Identity review digest mismatch: ${o.id}`);
    return JSON.parse(cache.get(path).toString());
  };
  const packet = await load(r?.packet_file, r?.packet_sha256);
  const verdict = await load(r?.verdict_file, r?.verdict_sha256);
  if (!r.critic_model || !Array.isArray(r.producer_models) || !r.producer_models.length
      || r.producer_models.some((m) => vendorFamily(m) === vendorFamily(r.critic_model))) throw new Error(`Identity review not independent: ${o.id}`);
  const key = identityKey(o);
  if (!packet.joins?.some((j) => j.key === key)) throw new Error(`Identity join not in reviewed packet: ${o.id}`);
  if (verdict.packet_sha256 !== r.packet_sha256 || verdict.checked !== packet.joins.length
      || !Array.isArray(verdict.rejected) || verdict.rejected.some((x) => x.key === key)) throw new Error(`Identity join not accepted by critic: ${o.id}`);
}

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
    // A reviewed identity join changes only subject.model_id: the value approval still binds the unjoined row,
    // and the join must carry its own independent receipt naming exactly this row and configuration.
    if (o.identity_review) await verifyIdentityReview(o, root, reviews);
    const approvedForm = o.identity_review ? unjoined(o) : o;
    const approval = approvals.rows.find((r) => r.id === o.id && r.observation_sha256 === observationDigest(approvedForm));
    if (!approval || !approval.critic_model || !Array.isArray(approval.producer_models) || !approval.producer_models.length
        || approval.producer_models.some((m) => vendorFamily(m) === vendorFamily(approval.critic_model))) throw new Error(`Unreviewed vendor score: ${o.id}`);
    const reviewPath = resolve(root, approval.review_file || '');
    if (!reviewPath.startsWith(resolve(root) + sep)) throw new Error('Review file outside repository');
    if (!reviews.has(reviewPath)) reviews.set(reviewPath, await readFile(reviewPath));
    const reviewBytes = reviews.get(reviewPath);
    if (sha256(reviewBytes) !== approval.review_sha256) throw new Error(`Critic receipt digest mismatch: ${o.id}`);
    const receipt = JSON.parse(await readFile(reviewPath + '.meta.json', 'utf8'));
    if (receipt.output_sha256 !== approval.review_sha256 || receipt.actual_model !== approval.critic_model
        || !Array.isArray(receipt.producers) || JSON.stringify([...new Set(receipt.producers)].sort()) !== JSON.stringify([...new Set(approval.producer_models)].sort())) {
      throw new Error(`Critic identity/producer receipt mismatch: ${o.id}`);
    }
    const verdict = JSON.parse(reviewBytes.toString().trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
    if (verdict.verdict !== 'pass' || verdict.errors_found !== 0 || !Array.isArray(verdict.findings) || verdict.findings.length
        || !Array.isArray(verdict.missing_evidence) || verdict.missing_evidence.length || !Array.isArray(verdict.fixed)
        || !Array.isArray(verdict.coverage_checked)
        || (!verdict.coverage_checked.includes(approval.review_row) && !verdict.coverage_checked.includes(approval.id))) throw new Error(`Critic did not cover accepted row: ${o.id}`);
    const artifactPath = resolve(root, approval.artifact_file || '');
    if (!artifactPath.startsWith(resolve(root) + sep)) throw new Error('Artifact file outside repository');
    if (!artifacts.has(artifactPath)) {
      const stored = await readFile(artifactPath);
      const raw = artifactPath.endsWith('.gz') ? gunzipSync(stored) : stored;
      const artifact = JSON.parse(raw);
      const rows = Array.isArray(artifact) ? artifact : Array.isArray(artifact.observations) ? artifact.observations
        : typeof artifact.id === 'string' ? [artifact] : null;
      artifacts.set(artifactPath, { sha256: sha256(raw), rows });
    }
    const artifact = artifacts.get(artifactPath);
    const reviewed = typeof approval.review_row === 'number' ? artifact.rows?.[approval.review_row - 1]
      : artifact.rows?.find((row) => row.id === approval.review_row);
    if (artifact.sha256 !== verdict.artifact_sha256 || !reviewed || observationDigest(reviewed) !== observationDigest(approvedForm)) throw new Error(`Accepted row differs from critic artifact: ${o.id}`);
    // This acceptance manifest is owner-authored after resolving the critic's findings.
    if (approval.verdict !== 'accepted' || !approval.evidence_locator) throw new Error(`Missing owner acceptance: ${o.id}`);
  }
  return { observations: snapshot.observations.length, source_files: files.size,
    self_reported_verified: snapshot.observations.filter((o) => (o.source_basis ?? o.basis) === 'self_reported').length };
}
