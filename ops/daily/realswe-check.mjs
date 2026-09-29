// CR-230: daily comparison of the current public sample with the frozen release.
// Capture is handled by the shared robots/rate-limited Python collector. Nothing
// in this module fetches, executes upstream code or changes published scores.
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { parseRealSwe, buildRealSweSnapshot, sha256Hex, REALS_WE_CANONICAL_URL } from '../../lib/realswe.mjs';

export const REALSWE_CAPTURE_TARGET = Object.freeze({ url: REALS_WE_CANONICAL_URL, follow_script_marker: 'entitlement-overage-lines' });
export const isRealSweEntry = (entry) => /^realswe(?:-cost)?::snapshot-\d{4}-\d{2}-\d{2}$/.test(entry.id);
const canonical = (value) => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])])) : value;
const semantic = (parsed, date) => {
  const snapshot = buildRealSweSnapshot(parsed, { date });
  return canonical({ observations: snapshot.observations.map(({ source, supporting_sources, ...row }) => row).sort((a, b) => a.id.localeCompare(b.id)), details: snapshot.details });
};
const source = (receipt) => ({ url: receipt.url, file: receipt.file, sha256: receipt.sha256, retrieved_at: receipt.retrieved_at });

export async function checkRealSweSnapshot({ entries, receipts, lock, read = readFile }) {
  const ids = entries.filter(isRealSweEntry).map((entry) => entry.id);
  if (!ids.length) return [];
  const result = (fields) => ids.map((id) => ({ id, collector: 'realswe-frozen-snapshot', ...fields }));
  try {
    if (!lock || !/^\d{4}-\d{2}-\d{2}$/.test(lock.snapshot_date)
        || ids.some((id) => !id.endsWith(`::snapshot-${lock.snapshot_date}`))) throw new Error('Real-SWE snapshot identity/lock mismatch');
    const page = receipts.find((r) => r.url === REALSWE_CAPTURE_TARGET.url);
    if (page?.status !== 200 || page.follow_error || page.follow_marker !== REALSWE_CAPTURE_TARGET.follow_script_marker
        || page.marker_matches?.length !== 1) throw new Error(`Real-SWE page/chunk discovery unavailable: ${page?.follow_error ?? page?.reason ?? 'missing successful receipt'}`);
    const chunk = receipts.find((r) => r.url === page.marker_matches[0] && r.status === 200
      && r.discovered_from === page.url && r.follow_marker === REALSWE_CAPTURE_TARGET.follow_script_marker);
    if (!chunk) throw new Error('Real-SWE discovered data chunk is unavailable');
    const body = async (file, digest, fileDigest) => {
      const bytes = await read(file);
      if (fileDigest && sha256Hex(bytes) !== fileDigest) throw new Error('Real-SWE compressed evidence hash mismatch');
      const plain = gunzipSync(bytes);
      if (sha256Hex(plain) !== digest) throw new Error('Real-SWE source body hash mismatch');
      return plain.toString('utf8');
    };
    const [priorHtml, priorChunk, html, data] = await Promise.all([
      body(lock.source_file, lock.source_sha256, lock.source_file_sha256),
      body(lock.chunk_file, lock.chunk_sha256, lock.chunk_file_sha256),
      body(page.file, page.sha256), body(chunk.file, chunk.sha256),
    ]);
    const before = semantic(parseRealSwe(priorHtml, { chunk: priorChunk }), lock.snapshot_date);
    const parsed = parseRealSwe(html, { chunk: data });
    const after = semantic(parsed, lock.snapshot_date);
    const beforeHash = sha256Hex(JSON.stringify(before)), afterHash = sha256Hex(JSON.stringify(after));
    const unchanged = beforeHash === afterHash;
    return result({ status: unchanged ? 'checked_unchanged' : 'source_changed_retained',
      reason: unchanged ? 'Current scores, configurations, task outcomes and cost details match the frozen sample; original observation dates and approvals are retained.'
        : 'Current public sample differs from the frozen release. Captures are retained for review; published values and original observation dates are unchanged.',
      configurations: parsed.probe.configurations, tasks: parsed.probe.tasks, rollouts: parsed.probe.rollouts,
      locked_snapshot: lock.snapshot_date, prior_semantic_sha256: beforeHash, current_semantic_sha256: afterHash,
      source: source(page), supporting_source: source(chunk) });
  } catch (error) {
    return result({ status: 'retained_after_failure', reason: error.message ?? String(error), locked_snapshot: lock?.snapshot_date ?? null });
  }
}
