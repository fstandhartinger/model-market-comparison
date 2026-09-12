import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

// Response bytes only: authorization/request headers never enter evidence.
export async function captureLiveSource(url, body, { method = 'GET', requestBody = null, status = 200, directory = process.env.BH_EVIDENCE_DIR } = {}) {
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  const sha256 = createHash('sha256').update(body).digest('hex');
  const file = join(directory, `${sha256}.gz`);
  await writeFile(file, gzipSync(body));
  const receipt = { url, method, request_body: requestBody, status, fetched_at: new Date().toISOString(), sha256, file };
  await appendFile(join(directory, 'live-manifest.jsonl'), JSON.stringify(receipt) + '\n');
  return receipt;
}

// A reduction may be legitimate upstream, but a collector cannot establish that.
// Stage it for review instead of silently overwriting the last known complete set.
export function assertIdentityCoverage(previous, current, identity, label) {
  if (!Array.isArray(current) || !current.length) throw new Error(`${label}: empty or invalid response`);
  const ids = current.map(identity);
  if (ids.some((id) => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) throw new Error(`${label}: missing or duplicate identities`);
  const present = new Set(ids);
  const missing = (previous || []).map(identity).filter((id) => !present.has(id));
  if (missing.length) throw new Error(`${label}: partial response or removal requiring review (${missing.length} prior identities absent: ${missing.slice(0, 5).join(', ')})`);
}

export const identityDigest = (rows, identity) => createHash('sha256').update(JSON.stringify([...new Set((rows || []).map(identity))].sort())).digest('hex');

// A collection-wide withdrawal is allowed only by an expiring, operator-reviewed
// receipt that binds the complete old and new identity sets and precisely names
// every removal. New unrelated shrinkage cannot inherit an old approval.
export function assertApprovedIdentityCoverage(previous, current, identity, label, { approval = null, now = Date.now() } = {}) {
  try { return assertIdentityCoverage(previous, current, identity, label); }
  catch (error) {
    const prior = previous || [];
    const oldIds = prior.map(identity), currentIds = new Set((current || []).map(identity));
    const missing = oldIds.filter((id) => !currentIds.has(id)).sort();
    const approved = approval && Date.parse(approval.expires_at) > now
      && approval.previous_identity_sha256 === identityDigest(prior, identity)
      && approval.current_identity_sha256 === identityDigest(current, identity)
      && Array.isArray(approval.removed)
      && JSON.stringify([...approval.removed].sort()) === JSON.stringify(missing);
    if (!approved) throw error;
    return assertIdentityCoverage(prior.filter((row) => !missing.includes(identity(row))), current, identity, label);
  }
}

export const endpointIdentity = (e) => `${e.provider_name ?? ''}/${e.tag ?? ''}/${e.quantization ?? ''}`;
export const endpointIdentityDigest = (rows) => identityDigest(rows, endpointIdentity);

export function assertOpenRouterEndpointCoverage(previous, current, { approval, now = Date.now() } = {}) {
  if (!Array.isArray(current)) throw new Error('OpenRouter endpoints: invalid response');
  if (!current.length && !previous?.length) return; // Explicitly empty upstream is different from a failed request.
  const key = endpointIdentity;
  // Several physical endpoints legitimately share one public provider tag.
  const unique = (rows) => [...new Map((rows || []).map((e) => [key(e), e])).values()];
  let prior = unique(previous);
  // Only an owner-reviewed, expiring change can allow a source withdrawal.
  // Bind BOTH complete identity sets: no other shrink can inherit the exception.
  if (approval && Date.parse(approval.expires_at) > now
    && approval.previous_identity_sha256 === endpointIdentityDigest(prior)
    && approval.current_identity_sha256 === endpointIdentityDigest(current)
    && Array.isArray(approval.removed)) prior = prior.filter((e) => !approval.removed.includes(key(e)));
  assertIdentityCoverage(prior, unique(current), key, 'OpenRouter endpoints');
  for (const endpoint of current) {
    if (!endpoint.provider_name || !endpoint.tag || !endpoint.pricing || ['prompt', 'completion'].some((key) => endpoint.pricing[key] == null || String(endpoint.pricing[key]).trim() === '' || !Number.isFinite(Number(endpoint.pricing[key])) || Number(endpoint.pricing[key]) < 0)) throw new Error('OpenRouter endpoints: missing identity or invalid token price');
  }
}

export function assertMeasuredFields(previous, current, fields, label) {
  for (const field of fields) {
    const prior = previous?.[field], next = current?.[field];
    if (next != null && (typeof next !== 'number' || !Number.isFinite(next))) throw new Error(`${label}: invalid numeric ${field}`);
    if (typeof prior === 'number' && next == null) throw new Error(`${label}: prior measurement ${field} absent; partial response or withdrawal requires review`);
  }
}
