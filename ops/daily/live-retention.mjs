// CR-67.2 (Florian 2026-09-17): one disputed secondary source must not block every other verified update.
// A live source contract that the producer/critic review does not accept is never overruled. For the small set of
// secondary datasets below, the run instead withholds that dataset's fresh capture: its raw files are restored from
// this run's copy of the previously published snapshot (`before/raw`, original dates and values), the decision is
// recorded, and the other contracts continue. A core source (AA, DesignArena, OpenRouter) still fails the run closed on a
// substantive rejection.
import { cp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { GAUNTLET_LIMITS } from './gauntlet.mjs';

// 17 Sep 2026 (Florian: single problems must stop blocking whole days): every retainable secondary contract may be withheld
// in the same run — the 09:16 run failed because or_efficiency was the second one. Core sources still fail closed.
export const MAX_RETAINED_CONTRACTS = 4;
/** Retainable live contracts: raw files the dataset owns and the `sources` key it dates in the dataset. */
// Headline and price sources (AA, DesignArena, OpenRouter models/endpoints) are never retainable. The token-efficiency
// datasets are: a day-old cache-hit rate or usage ratio keeps its own date, like the rotated pages they already retain.
export const RETAINABLE_CONTRACTS = {
  aa_coding_v15: { files: ['aa-coding-agents-v1.5.json'], source: 'aa_coding_agents_v1_5' },
  aa_efficiency: { files: ['aa-efficiency.json'], source: 'aa_efficiency' },
  or_efficiency: { files: ['openrouter-efficiency.json'], source: 'openrouter_efficiency' },
  chutes_efficiency: { files: ['chutes-efficiency.json'], source: 'chutes_efficiency' },
};

/** What to do with a rejected contract, given the ones already retained this run. */
export function planRejectedContract(dataset, retained = []) {
  const spec = RETAINABLE_CONTRACTS[dataset];
  if (!spec) return { action: 'fail', reason: `${dataset} is a core source; a rejected contract cannot be withheld` };
  if (retained.length >= MAX_RETAINED_CONTRACTS) return { action: 'fail', reason: `a second disputed contract (${dataset}) after ${retained.map((r) => r.dataset).join(', ')}; more than ${MAX_RETAINED_CONTRACTS} withheld source(s) fails closed` };
  return { action: 'retain', files: spec.files, source: spec.source };
}

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Restore the dataset's raw files in the staged checkout from the run's copy of the published snapshot. */
export async function retainPriorSnapshot({ runDir, rawDir, dataset, errors = [] }) {
  const plan = planRejectedContract(dataset);
  if (plan.action !== 'retain') throw new Error(plan.reason);
  const restored = [];
  for (const file of plan.files) {
    const prior = join(runDir, 'before', 'raw', file);
    const bytes = await readFile(prior); // throws when the run holds no prior copy: nothing to fall back to
    const rejected = await readFile(join(rawDir, file)).then(sha).catch(() => null);
    await cp(prior, join(rawDir, file));
    const priorJson = JSON.parse(bytes.toString('utf8'));
    restored.push({ file: `data/raw/${file}`, rejected_capture_sha256: rejected, retained_sha256: sha(bytes), retained_collected_at: priorJson.collected_at ?? null });
  }
  return { dataset, source: plan.source, decision: 'withheld today\'s capture; the previously published snapshot stays with its original date', reasons: errors.slice(0, 5), restored };
}

/**
 * 17 Sep 2026: the reviewer models failed to *answer* (malformed JSON, transport errors, no viable worker), but nobody raised
 * a substantive objection. The gauntlet already retried with other models for its full round budget. Such a contract falls
 * back to the deterministic result: every numeric row was already compared against the complete hash-verified primary
 * bodies before the review. Any substantive signal — a critic verdict other than pass, a counted error, missing evidence,
 * or a row a parsed producer audit flagged in any round — is not a reviewer failure and keeps the normal rejection path.
 */
export function reviewerUnavailable(review, maxRounds = GAUNTLET_LIMITS.maxRounds) {
  if (!review || review.accepted) return false;
  // Only after the full retry budget: a terminal 401/403/429 or an unqualified worker in round 1 is a setup problem, not a
  // format error, and must not silently skip model review every day.
  if (review.manifest?.rounds_used !== maxRounds) return false;
  if ((review.objections ?? 0) > 0) return false;
  if ((review.producer_disputed ?? []).length) return false;
  if ((review.reviews ?? []).some((r) => r.verdict !== 'pass' || r.errors_found > 0 || (r.missing_evidence ?? []).length || (r.findings ?? []).length)) return false;
  if ((review.quarantined ?? []).some((q) => !/not accepted within the round budget/.test(q.reason))) return false;
  return (review.errors ?? []).length > 0;
}
