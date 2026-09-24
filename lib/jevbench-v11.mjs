// CR-86 (Florian 2026-09-19 07:35 UTC): JevBench v1.1 has one Main Score (v1.1.2: (Capability + Speed + Cost) / 3; 60:20:20 until v1.1.1),
// with the three sub-benchmarks and the three capability tiers visible and sortable beside it. This supersedes CR-84's
// "no combined winner" for the headline. The source artifact is retained byte-for-byte. The API projection corrects
// its defective pooled-accuracy diagnostic from the official tier denominators and the published per-tier accuracy
// and coverage; it validates all other values and recomputes Main Score only as a check.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scanForbidden } from './jevbench.mjs';

export const JEVBENCH_V11_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.1/jevbench-v1.1-results.json';
export const JEVBENCH_V11_SHA256 = 'c969a3b9d6ba3e64a4b6826f72cbba032157a634c1fd7da42e8cb5856713e55c'; // = results/v1.1/ at tag v1.1.2 (Main Score Balanced 33:33:33; Cost scale $0.001-$10)
export const TIERS = ['easy', 'standard', 'judge'];
const COST_KINDS = ['measured', 'estimate', 'unknown'];

const fail = (message) => { throw new Error(`JevBench v1.1 artifact: ${message}`); };
const score = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
const rate = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
const nullOr = (v, test) => v === null || test(v);

/** The Main Score as the published weights define it (arithmetic mean; the geometric variant is a sensitivity row only). */
export function mainScore(system, weights) {
  const parts = [system.capability?.score, system.speed?.score, system.cost?.score];
  if (parts.some((v) => typeof v !== 'number')) return null;
  return weights.capability * parts[0] + weights.speed * parts[1] + weights.cost * parts[2];
}

export function validateJevbenchV11(a) {
  if (!a || a.protocol !== 'jevbench::v1.1' || a.dataset?.protocol !== 'jevbench::v1.1') fail('protocol must be jevbench::v1.1');
  scanForbidden(a, '$', fail);
  const w = a.weights;
  if (!w || Math.abs(w.capability + w.speed + w.cost - 1) > 1e-9) fail('weights must sum to 1');
  if (!Array.isArray(a.sensitivity_order) || a.sensitivity_order.some((k) => !a.sensitivity_weightings?.[k])) fail('sensitivity weightings');
  if (!a.scoring || ['main', 'capability', 'speed', 'cost', 'calibration', 'ranked'].some((k) => typeof a.scoring[k] !== 'string')) fail('scoring texts');
  if (!Array.isArray(a.systems) || !a.systems.length) fail('no systems');
  const keys = new Set();
  for (const s of a.systems) {
    const where = `systems.${s.key}`;
    if (!s.key || keys.has(s.key)) fail(`duplicate or missing key ${s.key}`);
    keys.add(s.key);
    for (const k of ['display', 'author', 'licence', 'class']) if (typeof s[k] !== 'string' || !s[k].trim()) fail(`${where}.${k}`);
    if (typeof s.ranked !== 'boolean' || typeof s.partial !== 'boolean' || s.ranked === s.partial) fail(`${where}: exactly one of ranked/partial`);
    for (const t of TIERS) if (!nullOr(s.capability?.tier_accuracy?.[t], rate)) fail(`${where}: tier ${t} accuracy`);
    for (const [k, v] of [['capability', s.capability?.score], ['speed', s.speed?.score], ['cost', s.cost?.score], ['main', s.main_score]]) if (!nullOr(v ?? null, score)) fail(`${where}: ${k} score out of 0..100`);
    // Cost: a route with no tariff and no stated reference deployment is unknown — null, never zero; an estimate must say so.
    const c = s.cost;
    if (!COST_KINDS.includes(c?.kind) || typeof c.basis !== 'string' || !c.basis.trim()) fail(`${where}: cost kind/basis`);
    if (c.kind === 'unknown' ? c.usd_per_1000 !== null || c.score !== null : !(typeof c.usd_per_1000 === 'number' && c.usd_per_1000 > 0)) fail(`${where}: cost must be null when unknown and positive otherwise`);
    if (c.kind === 'estimate' && !/estimate/i.test(c.basis)) fail(`${where}: an estimated cost must say so in its basis`);
    // A label-only system has no calibration number; the note says why, so the cell is never blank or 0.
    if (s.has_distribution === false && (s.calibration?.brier_standard_judge !== null || !s.calibration?.note)) fail(`${where}: no distribution ⇒ null calibration with a note`);
    if (s.has_distribution === true && !nullOr(s.calibration?.brier_standard_judge, (v) => typeof v === 'number' && v >= 0)) fail(`${where}: brier`);
    if (s.ranked) {
      const m = mainScore(s, w);
      if (m === null || Math.abs(m - s.main_score) > 1e-6) fail(`${where}: main_score ${s.main_score} does not recompute (${m})`);
      if (!s.rank_under || a.sensitivity_order.some((k) => !Number.isInteger(s.rank_under[k]))) fail(`${where}: rank_under`);
      if (a.sensitivity_order.some((k) => !score(s.sensitivity?.[k]))) fail(`${where}: sensitivity`);
    }
  }
  // Ranks under every weighting are a permutation of 1..N over the ranked systems and follow that weighting's score.
  const ranked = a.systems.filter((s) => s.ranked);
  for (const k of a.sensitivity_order) {
    const ranks = ranked.map((s) => s.rank_under[k]).sort((x, y) => x - y);
    if (ranks.some((r, i) => r !== i + 1)) fail(`rank_under["${k}"] is not 1..${ranked.length}`);
    const byScore = [...ranked].sort((x, y) => y.sensitivity[k] - x.sensitivity[k]);
    if (byScore.some((s, i) => s.rank_under[k] !== i + 1)) fail(`rank_under["${k}"] disagrees with its scores`);
  }
  const headline = a.sensitivity_order[0];
  if (ranked.some((s) => Math.abs(s.sensitivity[headline] - s.main_score) > 1e-6)) fail('headline weighting must equal main_score');
  return a;
}

/** Rebuild pooled accuracy from official tier sizes and the published attempt coverage and per-tier accuracy. */
export function recomputePooledAccuracy(system, tierCounts) {
  let attempts = 0, correct = 0;
  for (const tier of TIERS) {
    const total = tierCounts?.[tier], coverage = system.coverage?.[tier], accuracy = system.capability?.tier_accuracy?.[tier];
    if (!Number.isInteger(total) || total < 0 || !rate(coverage) || !rate(accuracy)) continue;
    const tierAttempts = Math.round(total * coverage);
    if (tierAttempts === 0) continue;
    attempts += tierAttempts;
    correct += Math.round(tierAttempts * accuracy);
  }
  return attempts ? correct / attempts : null;
}

export function validateJevbenchV11PooledAccuracy(a) {
  for (const s of a.systems) {
    const expected = recomputePooledAccuracy(s, a.tiers);
    if (s.capability.pooled_accuracy !== expected) fail(`${s.key}: pooled_accuracy does not recompute (${expected})`);
  }
  return a;
}

export async function readJevbenchV11(root = process.cwd()) {
  const sourceBytes = await readFile(`${root}/${JEVBENCH_V11_ARTIFACT}`);
  const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
  if (sourceSha256 !== JEVBENCH_V11_SHA256) fail(`source SHA-256 ${sourceSha256} does not match the pinned upstream artifact`);
  const sourceArtifact = validateJevbenchV11(JSON.parse(sourceBytes.toString('utf8')));
  const artifact = structuredClone(sourceArtifact);
  for (const s of artifact.systems) s.capability.pooled_accuracy = recomputePooledAccuracy(s, artifact.tiers);
  validateJevbenchV11(artifact);
  validateJevbenchV11PooledAccuracy(artifact);
  const bytes = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return { artifact, bytes, sha256: createHash('sha256').update(bytes).digest('hex'), sourceSha256 };
}

/** CR-87.11: every benchmarked project links out. Rebuilds and tools carry their repo in the artifact; the hosted
 *  instruction models have none, so they link the vendor page the JevBench harness itself cites for their tariff/API. */
export const VENDOR_LINKS = {
  'gemini-3.1-flash-lite': 'https://ai.google.dev',
  'gpt-5.6-luna': 'https://platform.openai.com',
  'deepseek-flash': 'https://api-docs.deepseek.com',
  'qwen3.8-27b': 'https://chutes.ai',
};

/** The historical board uses its equal-tier-weighted capability score; pooled accuracy stays a separate diagnostic in the API. */
export function jevbenchV11View({ artifact: a, sha256 }) {
  const row = (s) => ({
    key: s.key, display: s.display, author: s.author, cls: s.class, repo: s.repo ?? null, link: s.repo ?? VENDOR_LINKS[s.key] ?? null, licence: s.licence, open: s.open, note: s.note ?? null,
    ranked: s.ranked, main: s.main_score, capability: s.capability.score, speed: s.speed.score, cost: s.cost.score,
    tiers: Object.fromEntries(TIERS.map((t) => [t, s.capability.tier_accuracy[t] ?? null])),
    coverage: Object.fromEntries(TIERS.map((t) => [t, s.coverage?.[t] ?? null])), decisions: s.capability.n_decisions ?? null,
    p50: s.speed.p50_s ?? null, p95: s.speed.p95_s ?? null, usd: s.cost.usd_per_1000, costKind: s.cost.kind, costBasis: s.cost.basis,
    hasDistribution: s.has_distribution, brier: s.calibration?.brier_standard_judge ?? null, calibrationNote: s.calibration?.note ?? null,
    probability: (s.probability_source ?? []).join(' + '), source: s.standard_judge_source ?? null,
    rankUnder: s.rank_under ?? null, sensitivity: s.sensitivity ?? null,
  });
  const byMain = (x, y) => (y.main ?? -1) - (x.main ?? -1) || x.display.localeCompare(y.display);
  const ranked = a.systems.filter((s) => s.ranked).map(row).sort(byMain);
  const partial = a.systems.filter((s) => !s.ranked).map(row).sort(byMain);
  return {
    sha256, protocol: a.protocol, benchmark: a.benchmark, generated: a.generated_utc, decisions: a.n_decisions_per_system, pilot: a.dataset.pilot === true,
    // The capability text promises the pooled accuracy "beside it"; that number is defective (see above), so the sentence
    // is left out rather than pointing at a value the page does not show.
    weights: a.weights, scoring: { ...a.scoring, capability: a.scoring.capability.replace(/\s*Pooled accuracy[^.]*\./i, '') }, tierCounts: a.tiers, tierNotes: a.dataset.tier_notes ?? {}, notComparableWith: a.not_comparable_with ?? null,
    sensitivityOrder: a.sensitivity_order, hardwareOrigin: String(a.dataset.hardware?.origin ?? '').replace(/^Sandy /, ''),
    referencePrices: a.reference_prices ?? null, revision: a.revision ?? null, revisionNote: a.revision_note ?? null, ranked, partial,
  };
}
