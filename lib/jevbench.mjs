// CR-84 (Florian 2026-09-18/19): JevBench v1 is Benchmark Heaven's own measurement of Jev-class typed-decision models.
// The committed artifact is the only source of every number on /jev-models. This module validates that the artifact is
// the publication-safe aggregate (no item text, label or per-item prediction anywhere) and turns it into page rows
// without computing a single new metric — it only selects, orders and labels what the artifact already states.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export const JEVBENCH_ARTIFACT = 'data/raw/benchmarks/jevbench/v1/jevbench-v1-results.json';
export const JEVBENCH_AVAILABILITY = 'data/raw/benchmarks/jevbench/v1/availability.json';
export const JEVBENCH_REPO = 'https://github.com/fstandhartinger/jevbench';

// Keys that would carry a task, a gold answer or a model's per-item reply. The artifact is aggregates only; any of these
// anywhere in it means a private split could leak into the browser bundle or the public JSON, so validation fails.
const FORBIDDEN_KEYS = new Set(['text', 'prompt', 'question', 'questions', 'state', 'rubric', 'instructions', 'label', 'labels', 'gold', 'expected',
  'prediction', 'predictions', 'predicted', 'item', 'items', 'decision_id', 'item_id', 'raw', 'raw_response', 'response', 'responses', 'reply', 'replies',
  'answer', 'answers', 'completion', 'messages', 'content', 'records']);
const RATE_KEYS = ['accuracy', 'operational_success', 'schema_validity', 'schema_validity_strict', 'majority_class_accuracy'];
const OPEN_LEVELS = ['yes', 'weights', 'no'];
const PROBABILITY_SOURCES = ['native', 'verbalized'];

const fail = (message) => { throw new Error(`JevBench artifact: ${message}`); };
const rate = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
const nonneg = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const nullOr = (v, test) => v === null || test(v);

function scanForbidden(value, path) {
  if (Array.isArray(value)) return value.forEach((v, i) => scanForbidden(v, `${path}[${i}]`));
  if (!value || typeof value !== 'object') return;
  for (const [k, v] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(k.toLowerCase())) fail(`${path}.${k} looks like item-level content; only aggregates may be published`);
    scanForbidden(v, `${path}.${k}`);
  }
}

/** One aggregate block (a system's overall, one family or one cohort). Unsupported metrics must be null, never 0. */
function checkAggregate(a, where) {
  if (!a || typeof a !== 'object') fail(`${where}: missing aggregate`);
  // A group the run never reached is a stub: its planned count and a null accuracy, nothing else.
  if (a.n_attempted === 0) {
    if (!Number.isInteger(a.n_planned) || a.accuracy !== null || Object.keys(a).some((k) => !['accuracy', 'n_attempted', 'n_planned'].includes(k))) fail(`${where}: an unattempted group may only state its planned count`);
    return;
  }
  for (const k of ['n_planned', 'n_attempted', 'n_scorable', 'n_cost_known', 'n_renormalized', 'n_state_truncated']) if (!Number.isInteger(a[k]) || a[k] < 0) fail(`${where}.${k}`);
  if (a.n_attempted > a.n_planned || a.n_scorable > a.n_attempted || a.n_cost_known > a.n_attempted) fail(`${where}: denominators out of order`);
  for (const k of RATE_KEYS) if (!nullOr(a[k], rate)) fail(`${where}.${k} is not a rate`);
  if (a.n_scorable === 0 && a.accuracy !== null) fail(`${where}: accuracy without a scorable decision`);
  // A route with no billable account carries a null price. Zero would read as "free" and sort as cheapest.
  if (a.n_cost_known === 0 ? a.cost_per_1000_usd !== null : !(nonneg(a.cost_per_1000_usd) && a.cost_per_1000_usd > 0)) fail(`${where}: cost must be null without a metered decision and positive with one`);
  if (!nullOr(a.brier_mean, nonneg) || !nullOr(a.ordinal_mae, nonneg)) fail(`${where}: brier/ordinal`);
  for (const k of ['latency_ok_s', 'latency_failed_s', 'latency_ok_excl_first_s']) {
    const l = a[k];
    if (!l || !Number.isInteger(l.n) || (l.n === 0 ? l.p50_s !== null || l.p95_s !== null : !nonneg(l.p50_s) || !nonneg(l.p95_s) || l.p95_s < l.p50_s)) fail(`${where}.${k}`);
  }
  if (a.ece !== null) {
    if (!Array.isArray(a.ece.bins) || a.ece.bins.length !== 10 || !nonneg(a.ece.ece)) fail(`${where}.ece`);
    let total = 0;
    a.ece.bins.forEach((b, i) => {
      if (Math.abs(b.lo - i / 10) > 1e-9 || Math.abs(b.hi - (i + 1) / 10) > 1e-9 || !Number.isInteger(b.n) || b.n < 0) fail(`${where}.ece.bins[${i}] edges`);
      // Empty bins are absent (null), never interpolated or zero.
      if (b.n === 0 ? b.accuracy !== null || b.mean_confidence !== null : !rate(b.accuracy) || !rate(b.mean_confidence)) fail(`${where}.ece.bins[${i}] values`);
      total += b.n;
    });
    if (total !== a.ece.n) fail(`${where}.ece bin counts do not add up`);
  }
  if (a.accuracy_ci !== null && a.accuracy_ci !== undefined) {
    const c = a.accuracy_ci;
    if (!rate(c.lo95) || !rate(c.hi95) || c.lo95 > c.hi95) fail(`${where}.accuracy_ci`);
  }
}

export function validateJevbenchArtifact(artifact) {
  if (!artifact || artifact.protocol !== 'jevbench::v1' || artifact.dataset?.protocol !== 'jevbench::v1') fail('protocol must be jevbench::v1');
  if (!Number.isInteger(artifact.n_decisions_per_model) || artifact.n_decisions_per_model <= 0) fail('n_decisions_per_model');
  const splits = artifact.dataset.splits;
  if (!Array.isArray(splits) || !splits.length || splits.some((s) => !/^[a-f0-9]{64}$/.test(s.sha256) || !Number.isInteger(s.n))) fail('dataset splits need a whole-split sha256 and a count');
  if (!Array.isArray(artifact.systems) || !artifact.systems.length) fail('no systems');
  scanForbidden(artifact, '$');
  const keys = new Set();
  for (const s of artifact.systems) {
    const where = `systems.${s.key}`;
    if (typeof s.key !== 'string' || !s.key || keys.has(s.key)) fail(`duplicate or missing key ${s.key}`);
    keys.add(s.key);
    for (const k of ['display', 'author', 'licence', 'adapter', 'price_source', 'class']) if (typeof s[k] !== 'string' || !s[k].trim()) fail(`${where}.${k}`);
    if (!OPEN_LEVELS.includes(s.open)) fail(`${where}.open must be one of ${OPEN_LEVELS.join('/')}`);
    if (!Array.isArray(s.probability_source) || !s.probability_source.length || s.probability_source.some((p) => !PROBABILITY_SOURCES.includes(p))) fail(`${where}.probability_source`);
    if (typeof s.ranked !== 'boolean' || typeof s.complete !== 'boolean') fail(`${where}: ranked/complete flags`);
    if (s.complete !== (s.overall?.n_attempted === s.overall?.n_planned && s.overall?.n_planned === artifact.n_decisions_per_model)) fail(`${where}: "complete" disagrees with its own denominators`);
    if (s.repo !== null && !/^https:\/\//.test(s.repo)) fail(`${where}.repo`);
    checkAggregate(s.overall, `${where}.overall`);
    for (const [name, a] of Object.entries(s.by_family ?? {})) checkAggregate(a, `${where}.by_family.${name}`);
    for (const [name, a] of Object.entries(s.by_cohort ?? {})) checkAggregate(a, `${where}.by_cohort.${name}`);
    const pc = s.paraphrase_consistency;
    if (!pc || !Number.isInteger(pc.pairs) || !Number.isInteger(pc.both_valid) || !nullOr(pc.same_answer_rate, rate) || !nullOr(pc.both_correct_rate, rate)) fail(`${where}.paraphrase_consistency`);
  }
  return artifact;
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export async function readJevbench(root = process.cwd()) {
  const bytes = await readFile(`${root}/${JEVBENCH_ARTIFACT}`);
  const artifact = validateJevbenchArtifact(JSON.parse(bytes.toString('utf8')));
  const availability = JSON.parse(await readFile(`${root}/${JEVBENCH_AVAILABILITY}`, 'utf8'));
  return { artifact, availability, sha256: sha256(bytes), bytes };
}

function row(s) {
  const o = s.overall;
  return {
    key: s.key, display: s.display, author: s.author, cls: s.class, repo: s.repo, licence: s.licence, open: s.open, underlying: s.underlying ?? null,
    probability: s.probability_source.join(' + '), identity: (s.resolved_model_identities ?? []).join(', '), adapter: s.adapter,
    reasoningEffort: s.request_options?.reasoning_effort ?? null, complete: s.complete, ranked: s.ranked, stopReason: s.stop_reason ?? null,
    runStarted: s.run_started_utc ?? null, runFinished: s.run_finished_utc ?? null,
    accuracy: o.accuracy, ciLo: o.accuracy_ci?.lo95 ?? null, ciHi: o.accuracy_ci?.hi95 ?? null, nScenarios: o.accuracy_ci?.n_scenarios ?? null,
    nPlanned: o.n_planned, nAttempted: o.n_attempted, nScorable: o.n_scorable,
    cost: o.cost_per_1000_usd, costKnown: o.n_cost_known, costBasis: o.cost_basis ?? [], priceSource: s.price_source,
    priceIn: s.price_input_per_m ?? null, priceOut: s.price_output_per_m ?? null,
    p50: o.latency_ok_s.p50_s, p95: o.latency_ok_s.p95_s, latencyN: o.latency_ok_s.n, firstRequest: o.first_request_s ?? null,
    failedN: o.latency_failed_s.n, failedP50: o.latency_failed_s.p50_s,
    ece: o.ece?.ece ?? null, brier: o.brier_mean, validity: o.schema_validity, validityStrict: o.schema_validity_strict, opSuccess: o.operational_success,
    renormalized: o.n_renormalized, truncated: o.n_state_truncated, meanIn: o.mean_input_tokens ?? null, meanOut: o.mean_output_tokens ?? null,
    sameAnswer: s.paraphrase_consistency.same_answer_rate, bothCorrect: s.paraphrase_consistency.both_correct_rate,
    pairs: s.paraphrase_consistency.pairs, bothValid: s.paraphrase_consistency.both_valid,
    bins: (o.ece?.bins ?? []).map((b) => ({ lo: b.lo, hi: b.hi, n: b.n, accuracy: b.accuracy, confidence: b.mean_confidence })),
    byFamily: Object.fromEntries(Object.entries(s.by_family ?? {}).map(([k, a]) => [k, { accuracy: a.accuracy, n: a.n_scorable ?? 0, planned: a.n_planned }])),
    byCohort: Object.fromEntries(Object.entries(s.by_cohort ?? {}).map(([k, a]) => [k, { accuracy: a.accuracy, n: a.n_scorable ?? 0, planned: a.n_planned }])),
  };
}

const byAccuracy = (a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1) || a.display.localeCompare(b.display);

/** Page rows. Complete runs are the ranking; a run that stopped early is shown with its denominator but never ranked
 *  against complete ones; a system that answered only a handful of decisions is an availability row. */
export function jevbenchView({ artifact, availability, sha256: hash }) {
  const rows = artifact.systems.map(row);
  const ranked = rows.filter((r) => r.ranked && r.complete).sort(byAccuracy);
  const partial = rows.filter((r) => r.ranked && !r.complete).sort(byAccuracy);
  const unrunnable = rows.filter((r) => !r.ranked);
  // Floors and denominators per family/cohort from a complete run (identical across complete runs by construction).
  const ref = artifact.systems.find((s) => s.complete);
  const floors = (group) => Object.fromEntries(Object.entries(ref?.[group] ?? {}).map(([k, a]) => [k, { floor: a.majority_class_accuracy, n: a.n_planned }]));
  const unrunnableKeys = new Set(unrunnable.map((r) => r.display.split(' (')[0]));
  return {
    sha256: hash, protocol: artifact.protocol, benchmark: artifact.benchmark, generated: artifact.generated_utc, frozenAt: artifact.dataset.frozen_at,
    pilot: artifact.dataset.pilot === true, labelsChangedAfterInference: artifact.dataset.labels_changed_after_inference,
    decisions: artifact.n_decisions_per_model, hardware: artifact.dataset.hardware,
    splits: artifact.dataset.splits.map((s) => ({ name: s.name, n: s.n, sha256: s.sha256 })),
    cohorts: artifact.cohorts, methodNotes: artifact.method_notes, repeatability: artifact.repeatability,
    familyFloors: floors('by_family'), cohortFloors: floors('by_cohort'),
    ranked, partial, unrunnable,
    // The availability ledger also names the one system we reached but could not finish; it is shown once, from the artifact.
    notMeasured: (availability?.not_measured ?? []).filter((n) => !unrunnableKeys.has(n.candidate)),
    findings: jevbenchFindings(ranked, partial),
  };
}

const pct = (v) => `${(v * 100).toFixed(1)}%`;

/** Plain-language findings, each built from artifact values only (CR-84: nothing on the page may invent a number). */
export function jevbenchFindings(ranked, partial = []) {
  const out = [];
  const [first, second] = ranked;
  if (first && second) {
    const overlap = first.ciLo !== null && second.ciHi !== null && second.ciHi >= first.ciLo;
    out.push({ id: 'top', text: `${first.display} leads at ${pct(first.accuracy)}, ${second.display} follows at ${pct(second.accuracy)}${overlap ? ' — their 95% intervals overlap, so read the top rows as a group, not a podium' : ''}.` });
  }
  const bestOpen = ranked.find((r) => r.open === 'yes');
  if (bestOpen) out.push({ id: 'open', text: `Best open rebuild: ${bestOpen.display} at ${pct(bestOpen.accuracy)}.` });
  const metered = ranked.filter((r) => r.cost !== null).sort((a, b) => a.cost - b.cost);
  if (metered[0]) out.push({ id: 'cheap', text: `Cheapest metered route: ${metered[0].display} at $${metered[0].cost.toFixed(3)} per 1,000 decisions. ${ranked.length - metered.length} of ${ranked.length} complete runs have no per-token tariff to us, which is not the same as free.` });
  const timed = ranked.filter((r) => r.p50 !== null).sort((a, b) => a.p50 - b.p50);
  if (timed[0]) {
    const near = timed.filter((r) => r.p50 - timed[0].p50 <= 0.05);
    out.push({ id: 'fast', text: `Fastest median: ${near.map((r) => r.display).join(', ')} (${timed[0].p50.toFixed(2)} s${near.length > 1 ? ` to ${near[near.length - 1].p50.toFixed(2)} s — indistinguishable` : ''}), measured serially from one server in Germany.` });
  }
  const calibrated = ranked.filter((r) => r.ece !== null).sort((a, b) => a.ece - b.ece);
  if (calibrated[0]) out.push({ id: 'calibrated', text: `Best calibrated: ${calibrated[0].display} (ECE ${calibrated[0].ece.toFixed(3)}, ${calibrated[0].probability} probabilities).` });
  const renorm = [...ranked, ...partial].filter((r) => r.renormalized > 0);
  if (renorm.length) out.push({ id: 'renorm', text: `Only models that write their probabilities needed renormalizing: ${renorm.map((r) => `${r.display} (${r.renormalized})`).join(', ')}. A native distribution sums to 1 by construction.` });
  for (const r of ranked.filter((x) => x.truncated > 0)) out.push({ id: `truncated-${r.key}`, text: `${r.display} did not see the whole question ${r.truncated} times out of ${r.nAttempted}: its input window is shorter than several requests, so its ${pct(r.accuracy)} is a context limit as much as a judgement one.` });
  return out;
}
