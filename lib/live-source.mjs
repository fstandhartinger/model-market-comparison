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

// D191 (24 Sep 2026): binding the *current* set to one exact response means any
// upstream addition between the review and the run invalidates the approval, even
// though the reviewed withdrawal has not moved. AA added two models in the twelve
// hours between two reviews and the pipeline missed a day over it. A reviewer who
// has seen the source keep growing may therefore write `allow_additions` with a
// stated `additions_basis`; the withdrawal itself stays pinned exactly (the prior
// set and the named removals are still bound), only *new* identities are tolerated,
// and only up to the same bound the OpenRouter withdrawal planner uses. It is never
// the default: an approval without the two fields is checked against the exact
// response, as before.
export const APPROVED_ADDITION_BOUNDS = { min: 10, share: 0.02 };

const additionsWithinBound = (approval, priorCount, addedCount) => approval.allow_additions === true
  && typeof approval.additions_basis === 'string' && approval.additions_basis.trim().length > 0
  && addedCount <= Math.max(APPROVED_ADDITION_BOUNDS.min, Math.floor(APPROVED_ADDITION_BOUNDS.share * priorCount));

// A collection-wide withdrawal is allowed only by an expiring, operator-reviewed
// receipt that binds the complete old and new identity sets and precisely names
// every removal. New unrelated shrinkage cannot inherit an old approval.
export function assertApprovedIdentityCoverage(previous, current, identity, label, { approval = null, now = Date.now() } = {}) {
  try { return assertIdentityCoverage(previous, current, identity, label); }
  catch (error) {
    const prior = previous || [];
    const oldIds = prior.map(identity), currentIds = new Set((current || []).map(identity));
    const missing = oldIds.filter((id) => !currentIds.has(id)).sort();
    const priorIds = new Set(oldIds);
    const added = [...currentIds].filter((id) => !priorIds.has(id));
    const bindsCurrent = approval?.current_identity_sha256 === identityDigest(current, identity);
    const approved = approval && Date.parse(approval.expires_at) > now
      && approval.previous_identity_sha256 === identityDigest(prior, identity)
      && (bindsCurrent || additionsWithinBound(approval, priorIds.size, added.length))
      && Array.isArray(approval.removed)
      && JSON.stringify([...approval.removed].sort()) === JSON.stringify(missing);
    if (!approved) throw error;
    return assertIdentityCoverage(prior.filter((row) => !missing.includes(identity(row))), current, identity, label);
  }
}

export const endpointIdentity = (e) => `${e.provider_name ?? ''}/${e.tag ?? ''}/${e.quantization ?? ''}`;
export const endpointIdentityDigest = (rows) => identityDigest(rows, endpointIdentity);

// A model can have several historical, expiring withdrawal approvals. Only the
// approval bound to the complete current identity set may be considered; callers
// must not select by model ID alone.
export function selectOpenRouterEndpointApproval(approvals, modelId, current, { now = Date.now() } = {}) {
  const digest = endpointIdentityDigest(current);
  return (approvals || []).find((approval) => approval?.model_id === modelId
    && approval.current_identity_sha256 === digest
    && Number.isFinite(Date.parse(approval.expires_at))
    && Date.parse(approval.expires_at) > now);
}

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

// CR-66.1: OpenRouter routinely retires a `:batch` SKU, a preview model or one
// provider endpoint. After one re-check, a bounded removal is a dated withdrawal
// (identity kept under `withdrawals`, never priced); a large one is still a failed
// or partial response and stops the run. Bounds match the publish gate.
export const OPENROUTER_WITHDRAWAL_BOUNDS = { models: { min: 10, share: 0.02 }, endpoints: { share: 0.05 } };

export function planOpenRouterWithdrawals({ previous = {}, models, endpointsById, date, bounds = OPENROUTER_WITHDRAWAL_BOUNDS }) {
  const prior = previous.models || [];
  const carried = previous.withdrawals || { models: [], endpoints: [] };
  const currentIds = new Set(models.map((m) => m.id));
  const withdrawnModels = [], restoredModels = [];
  for (const m of prior) {
    if (!currentIds.has(m.id)) withdrawnModels.push({ id: m.id, name: m.name ?? null, withdrawn_at: date, last_seen: previous.collected_at ?? null, endpoint_count: m.endpoints?.length ?? 0 });
  }
  const newModelIds = new Set(withdrawnModels.map((m) => m.id));
  const models_ = [...withdrawnModels];
  for (const m of carried.models || []) {
    if (currentIds.has(m.id)) restoredModels.push({ id: m.id, withdrawn_at: m.withdrawn_at, restored_at: date });
    else if (!newModelIds.has(m.id)) models_.push(m);
  }
  const withdrawnEndpoints = [], restoredEndpoints = [];
  const priorById = new Map(prior.map((m) => [m.id, m]));
  const present = (id) => new Set((endpointsById.get(id) || []).map(endpointIdentity));
  for (const id of currentIds) {
    const now = present(id);
    const lost = new Set((priorById.get(id)?.endpoints || []).map(endpointIdentity).filter((key) => !now.has(key)));
    for (const identity of [...lost].sort()) {
      const e = priorById.get(id).endpoints.find((x) => endpointIdentity(x) === identity);
      withdrawnEndpoints.push({ model_id: id, identity, provider_name: e.provider_name ?? null, tag: e.tag ?? null, quantization: e.quantization ?? null, withdrawn_at: date, last_seen: previous.collected_at ?? null });
    }
  }
  const newEndpointKeys = new Set(withdrawnEndpoints.map((e) => `${e.model_id} ${e.identity}`));
  const endpoints_ = [...withdrawnEndpoints];
  for (const e of carried.endpoints || []) {
    if (currentIds.has(e.model_id) && present(e.model_id).has(e.identity)) restoredEndpoints.push({ model_id: e.model_id, identity: e.identity, withdrawn_at: e.withdrawn_at, restored_at: date });
    else if (!newEndpointKeys.has(`${e.model_id} ${e.identity}`)) endpoints_.push(e);
  }
  const priorEndpointCount = new Set(prior.flatMap((m) => (m.endpoints || []).map((e) => `${m.id} ${endpointIdentity(e)}`))).size;
  const modelLimit = Math.max(bounds.models.min, Math.floor(bounds.models.share * prior.length));
  const endpointLimit = Math.floor(bounds.endpoints.share * priorEndpointCount);
  const errors = [];
  if (withdrawnModels.length > modelLimit) errors.push(`OpenRouter catalog: ${withdrawnModels.length} models absent (limit ${modelLimit}): partial response or removal requiring review (${withdrawnModels.slice(0, 5).map((m) => m.id).join(', ')})`);
  if (withdrawnEndpoints.length > endpointLimit) errors.push(`OpenRouter endpoints: ${withdrawnEndpoints.length} of ${priorEndpointCount} prior endpoints absent (limit ${endpointLimit}): partial response or removal requiring review (${withdrawnEndpoints.slice(0, 5).map((e) => `${e.model_id} ${e.identity}`).join(', ')})`);
  const byId = (a, b) => (a.model_id ?? a.id).localeCompare(b.model_id ?? b.id) || String(a.identity ?? '').localeCompare(String(b.identity ?? ''));
  return {
    withdrawals: { models: models_.sort(byId), endpoints: endpoints_.sort(byId) },
    run: { date, withdrawn_models: withdrawnModels, withdrawn_endpoints: withdrawnEndpoints, restored_models: restoredModels, restored_endpoints: restoredEndpoints, limits: { models: modelLimit, endpoints: endpointLimit } },
    error: errors.length ? errors.join('\n') : null,
  };
}
