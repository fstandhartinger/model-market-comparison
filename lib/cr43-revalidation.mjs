import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';

const HASH_RE = /^[0-9a-f]{64}$/;

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function resolveFile(root, file) {
  return path.isAbsolute(file) ? file : path.resolve(root, file);
}

export function sourceDigest(root, source) {
  const issues = [];
  if (!source || typeof source !== 'object') return { digest: null, issues: ['source is not an object'] };
  if (!source.file) issues.push('source.file is missing');
  if (!HASH_RE.test(source.sha256 || '')) issues.push('source.sha256 is not a SHA-256 digest');
  const filePath = source.file ? resolveFile(root, source.file) : null;
  if (!filePath || !existsSync(filePath)) {
    issues.push(`source file is missing: ${source.file || '<none>'}`);
    return { digest: null, issues };
  }
  try {
    const bytes = readFileSync(filePath);
    const content = filePath.endsWith('.gz') ? gunzipSync(bytes) : bytes;
    const digest = createHash('sha256').update(content).digest('hex');
    if (source.sha256 && digest !== source.sha256) issues.push(`source hash mismatch: ${source.file}`);
    return { digest, issues };
  } catch (error) {
    issues.push(`source could not be read: ${source.file}: ${error.message}`);
    return { digest: null, issues };
  }
}

function observationProjection(observation) {
  if (!observation || typeof observation !== 'object') return observation;
  const { protocol: _protocol, ...withoutProtocol } = observation;
  return withoutProtocol;
}

function sourceProjection(source) {
  if (!source || typeof source !== 'object') return source;
  return { file: source.file ?? null, sha256: source.sha256 ?? null, url: source.url ?? null, locator: source.locator ?? null };
}

function auditRecord(record, root, sourceCache, kind) {
  const issues = [];
  if (!record || typeof record !== 'object') return [`${kind} is not an object`];
  if (kind === 'observation') {
    if (!record.id) issues.push('observation.id is missing');
    if (!record.benchmark_id) issues.push(`${record.id || '<unknown>'}: benchmark_id is missing`);
    if (!Number.isFinite(record.value)) issues.push(`${record.id || '<unknown>'}: value is not finite`);
    if (!record.unit) issues.push(`${record.id || '<unknown>'}: unit is missing`);
    if (!record.basis) issues.push(`${record.id || '<unknown>'}: basis is missing`);
  }
  if (!record.source || !record.source.url || !record.source.retrieved_at || !record.source.locator) {
    issues.push(`${record.id || '<unknown>'}: source provenance is incomplete`);
  }
  const sources = [record.source, ...(Array.isArray(record.supporting_sources) ? record.supporting_sources : [])].filter(Boolean);
  for (const source of sources) {
    const key = `${source.file || ''}|${source.sha256 || ''}`;
    let result = sourceCache.get(key);
    if (!result) {
      result = sourceDigest(root, source);
      sourceCache.set(key, result);
    }
    issues.push(...result.issues.map((issue) => `${record.id || '<unknown>'}: ${issue}`));
  }
  return issues;
}

export function auditSnapshot(snapshot, { root = process.cwd(), label = 'snapshot' } = {}) {
  const observations = Array.isArray(snapshot?.observations) ? snapshot.observations : [];
  const missing = Array.isArray(snapshot?.missing) ? snapshot.missing : [];
  const ids = new Set();
  const duplicateIds = [];
  const issues = [];
  const sourceCache = new Map();
  for (const observation of observations) {
    if (observation?.id && ids.has(observation.id)) duplicateIds.push(observation.id);
    if (observation?.id) ids.add(observation.id);
    issues.push(...auditRecord(observation, root, sourceCache, 'observation'));
  }
  for (const record of missing) issues.push(...auditRecord(record, root, sourceCache, 'missing record'));
  if (duplicateIds.length) issues.push(`duplicate observation IDs: ${duplicateIds.join(', ')}`);
  const groups = new Map();
  for (const observation of observations) {
    const key = observation?.source?.file || '<missing source file>';
    const group = groups.get(key) || { file: key, observations: 0, hash_ok: true };
    group.observations += 1;
    const result = sourceCache.get(`${observation?.source?.file || ''}|${observation?.source?.sha256 || ''}`);
    if (result?.issues?.length) group.hash_ok = false;
    groups.set(key, group);
  }
  return {
    label,
    observation_count: observations.length,
    missing_count: missing.length,
    unique_observation_ids: ids.size,
    duplicate_observation_ids: duplicateIds,
    source_file_count: sourceCache.size,
    source_files_with_issues: [...sourceCache.values()].filter((result) => result.issues.length).length,
    source_groups: [...groups.values()].sort((a, b) => a.file.localeCompare(b.file)),
    issues,
    pass: issues.length === 0,
  };
}

function byId(records) {
  return new Map((Array.isArray(records) ? records : []).filter((record) => record?.id).map((record) => [record.id, record]));
}

export function compareSnapshots(published, candidate) {
  const oldById = byId(published?.observations);
  const newById = byId(candidate?.observations);
  const missingFromCandidate = [...oldById.keys()].filter((id) => !newById.has(id));
  const candidateOnly = [...newById.keys()].filter((id) => !oldById.has(id));
  const changed = [];
  const metadataOnly = [];
  for (const id of [...oldById.keys()].filter((key) => newById.has(key)).sort()) {
    const oldRecord = oldById.get(id);
    const newRecord = newById.get(id);
    if (stable(oldRecord) !== stable(newRecord)) {
      const provenanceChanged = stable(observationProjection(oldRecord)) !== stable(observationProjection(newRecord));
      const entry = {
        id,
        old_protocol: oldRecord.protocol ?? null,
        new_protocol: newRecord.protocol ?? null,
        provenance_or_value_changed: provenanceChanged,
      };
      changed.push(entry);
      if (!provenanceChanged) metadataOnly.push(id);
    }
  }
  return {
    published_count: oldById.size,
    candidate_count: newById.size,
    missing_from_candidate: missingFromCandidate,
    candidate_only: candidateOnly,
    changed_count: changed.length,
    provenance_or_value_changed_count: changed.filter((entry) => entry.provenance_or_value_changed).length,
    metadata_only_count: metadataOnly.length,
    changed,
  };
}

export function comparePublicSnapshots(published, candidate) {
  const result = compareSnapshots(published, candidate);
  return {
    ...result,
    excluded_from_current_rebuild: result.missing_from_candidate,
  };
}

export function createRevalidationReport({ root = process.cwd(), published, candidate, publicPublished, publicCandidate }) {
  const publishedAudit = auditSnapshot(published, { root, label: 'published scores' });
  const candidateAudit = auditSnapshot(candidate, { root, label: 'fresh scores rebuild' });
  const publicPublishedAudit = auditSnapshot(publicPublished, { root, label: 'published public observations' });
  const publicCandidateAudit = auditSnapshot(publicCandidate, { root, label: 'fresh public rebuild' });
  const scoreComparison = compareSnapshots(published, candidate);
  const publicComparison = comparePublicSnapshots(publicPublished, publicCandidate);
  const blockers = [
    ...publishedAudit.issues,
    ...candidateAudit.issues,
    ...publicPublishedAudit.issues,
    ...publicCandidateAudit.issues,
    ...scoreComparison.missing_from_candidate.map((id) => `published score missing from fresh rebuild: ${id}`),
    ...scoreComparison.candidate_only.map((id) => `fresh rebuild added score not in published snapshot: ${id}`),
    ...scoreComparison.changed.filter((entry) => entry.provenance_or_value_changed).map((entry) => `score value/provenance changed: ${entry.id}`),
    ...publicComparison.excluded_from_current_rebuild.map((id) => `published public observation excluded from fresh rebuild: ${id}`),
    ...publicComparison.candidate_only.map((id) => `fresh public rebuild added observation not in published snapshot: ${id}`),
    ...publicComparison.changed.filter((entry) => entry.provenance_or_value_changed).map((entry) => `public value/provenance changed: ${entry.id}`),
  ];
  return {
    schema_version: 'cr-43.1-revalidation-v1',
    status: blockers.length ? 'fail_closed' : 'pass',
    acceptance: {
      every_published_numeric_observation_has_reproducible_source: publishedAudit.pass,
      every_fresh_numeric_observation_has_reproducible_source: candidateAudit.pass,
      numeric_and_provenance_rebuild_matches: scoreComparison.provenance_or_value_changed_count === 0 && scoreComparison.missing_from_candidate.length === 0 && scoreComparison.candidate_only.length === 0,
      all_public_rows_rebuild: publicComparison.excluded_from_current_rebuild.length === 0 && publicComparison.candidate_only.length === 0 && publicComparison.provenance_or_value_changed_count === 0,
    },
    published_scores: publishedAudit,
    fresh_scores: candidateAudit,
    score_comparison: scoreComparison,
    published_public: publicPublishedAudit,
    fresh_public: publicCandidateAudit,
    public_comparison: publicComparison,
    blockers,
  };
}
