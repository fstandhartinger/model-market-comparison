// CR-84 (2026-09-19): JevBench v1 — Benchmark Heaven's own typed-decision benchmark, shown on /jev-models.
// The committed artifact (data/raw/benchmarks/jevbench/v1/jevbench-v1-results.json, byte-identical to
// results/jevbench-v1-results.json at commit 968eba3 of github.com/fstandhartinger/jevbench) is the only
// source of every number on that page. This module validates it and reduces it to what the page draws;
// it never fills a gap: a missing price stays null ("no per-token tariff"), an empty calibration bin stays empty.

export const JEVBENCH_ARTIFACT = 'data/raw/benchmarks/jevbench/v1/jevbench-v1-results.json';
export const JEVBENCH_SHA256 = '38fc5f1d6fd8bda970c6f4a918492d67370e9e764477a302611419a97fb0bd53';
export const JEVBENCH_HARNESS = 'https://github.com/fstandhartinger/jevbench';
export const JEVBENCH_HARNESS_COMMIT = '968eba3c5420a2bf3662643d87cd77613fa1b33a';

// Keys that would carry item text, labels or per-item predictions. The artifact is aggregates only; if any of
// these ever appears, the page must not ship it.
const PRIVATE_KEYS = new Set(['items', 'item', 'prompt', 'prompts', 'state', 'text', 'label', 'labels', 'gold', 'expected', 'prediction', 'predictions', 'response', 'responses', 'raw', 'records', 'decisions']);

// Why a route has no $/1k: the artifact's own basis codes, in the page's words.
export const NO_TARIFF_REASON = {
  no_billable_account_public_endpoint: "the author's public endpoint; we hold no billable account",
  no_billable_account_public_demo: "the author's public demo; we hold no billable account",
  local_cpu_no_provider_tariff: 'open weights run on our own CPU; no provider tariff',
  flat_rate_subscription_no_per_token_tariff: 'a flat-rate subscription; no per-token tariff on this route',
};

export const OPEN_LABEL = { yes: 'open', weights: 'open weights', no: 'closed' };
const OPEN_RANK = { yes: 2, weights: 1, no: 0 };
export const CLASS_LABEL = { jev: 'Jev', 'jev-rebuild': 'open rebuild', 'llm-baseline': 'instruction-model baseline' };

// Six decimals only trims payload; rounding to the display precision here would round twice (0.516529 -> 0.5165 -> "51.6%").
const r6 = (v) => (v == null ? null : Math.round(v * 1e6) / 1e6);

/** Throws when the artifact is not the publication-safe JevBench v1 shape the page was built for. */
export function validateJevbench(a) {
  const fail = (m) => { throw new Error(`JevBench artifact: ${m}`); };
  if (a?.protocol !== 'jevbench::v1' || a?.dataset?.protocol !== 'jevbench::v1') fail('not jevbench::v1');
  if (!Array.isArray(a.systems) || !a.systems.length) fail('no systems');
  const walk = (o, path) => {
    if (Array.isArray(o)) return o.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
      if (PRIVATE_KEYS.has(k)) fail(`private-looking key ${path}.${k}`);
      walk(v, `${path}.${k}`);
    }
  };
  walk(a, '$');
  const keys = new Set();
  for (const s of a.systems) {
    if (!s.key || keys.has(s.key)) fail(`duplicate system ${s.key}`);
    keys.add(s.key);
    const o = s.overall;
    if (!o || o.n_planned !== a.n_decisions_per_model) fail(`${s.key}: planned count`);
    if (!(o.n_attempted <= o.n_planned) || s.complete !== (o.n_attempted === o.n_planned && !s.stop_reason)) fail(`${s.key}: completeness`);
    if (!OPEN_LABEL[s.open] || !CLASS_LABEL[s.class]) fail(`${s.key}: open/class code`);
    // A route without a billable account carries null, never zero; a metered route carries its tariff.
    const metered = o.cost_basis.includes('derived_usage_times_tariff');
    if (metered ? !(o.cost_per_1000_usd > 0) : o.cost_per_1000_usd !== null) fail(`${s.key}: cost ${o.cost_per_1000_usd} vs basis ${o.cost_basis}`);
    if (!metered && !o.cost_basis.every((b) => NO_TARIFF_REASON[b])) fail(`${s.key}: unknown no-tariff basis ${o.cost_basis}`);
    for (const scope of [o, ...Object.values(s.by_family), ...Object.values(s.by_cohort)]) {
      if (scope.ece && (scope.ece.bins.length !== 10 || scope.ece.bins.some((b) => (b.n === 0) !== (b.accuracy === null)))) fail(`${s.key}: calibration bins`);
    }
  }
  return a;
}

const bins = (ece) => (ece ? ece.bins.map((b) => [b.n, r6(b.mean_confidence), r6(b.accuracy)]) : null);
const scope = (x) => ({ n: x.n_attempted, accuracy: r6(x.accuracy), majority: r6(x.majority_class_accuracy), bins: bins(x.ece), ece: r6(x.ece?.ece ?? null) });

/** The page's view: ranked rows (complete runs), partial rows (stopped early but substantial) and runs too short to show. */
export function jevbenchView(a) {
  validateJevbench(a);
  const rows = a.systems.map((s) => {
    const o = s.overall;
    const metered = o.cost_basis.includes('derived_usage_times_tariff');
    return {
      key: s.key, display: s.display, short: s.display.replace(/\s*\(.*\)\s*$/, ''), author: s.author, cls: s.class,
      open: s.open, openRank: OPEN_RANK[s.open], licence: s.licence, repo: s.repo, underlying: s.underlying,
      adapter: s.adapter, probability: s.probability_source.join(' + '), identities: s.resolved_model_identities,
      complete: s.complete, ranked: s.ranked, stopReason: s.stop_reason, started: s.run_started_utc, finished: s.run_finished_utc,
      nAttempted: o.n_attempted, nPlanned: o.n_planned,
      accuracy: r6(o.accuracy), ciLo: r6(o.accuracy_ci?.lo95 ?? null), ciHi: r6(o.accuracy_ci?.hi95 ?? null), nScenarios: o.accuracy_ci?.n_scenarios ?? null,
      cost: metered ? r6(o.cost_per_1000_usd) : null, costReason: metered ? null : o.cost_basis.map((b) => NO_TARIFF_REASON[b]).join('; '),
      nCostKnown: o.n_cost_known, priceIn: s.price_input_per_m, priceOut: s.price_output_per_m, priceSource: s.price_source,
      p50: r6(o.latency_ok_s.p50_s), p95: r6(o.latency_ok_s.p95_s), latencyN: o.latency_ok_s.n, firstRequest: r6(o.first_request_s), failedN: o.latency_failed_s.n,
      ece: r6(o.ece?.ece ?? null), brier: r6(o.brier_mean), validity: r6(o.schema_validity), validityStrict: r6(o.schema_validity_strict),
      success: r6(o.operational_success), renormalized: o.n_renormalized, truncated: o.n_state_truncated, ordinalMae: r6(o.ordinal_mae),
      sameAnswer: r6(s.paraphrase_consistency.same_answer_rate), bothCorrect: r6(s.paraphrase_consistency.both_correct_rate), pairs: s.paraphrase_consistency.pairs, pairsValid: s.paraphrase_consistency.both_valid,
      tokensIn: o.mean_input_tokens == null ? null : Math.round(o.mean_input_tokens), tokensOut: o.mean_output_tokens == null ? null : Math.round(o.mean_output_tokens),
      overall: scope(o),
      families: Object.fromEntries(Object.entries(s.by_family).map(([k, v]) => [k, scope(v)])),
      cohorts: Object.fromEntries(Object.entries(s.by_cohort).map(([k, v]) => [k, scope(v)])),
    };
  });
  // Ranked = complete; a run that stopped early is shown in its own group (different evaluated subset), and a run that
  // answered fewer than half the decisions is an availability fact, not a measurement.
  const ranked = rows.filter((r) => r.ranked && r.complete);
  const partial = rows.filter((r) => r.ranked && !r.complete && r.nAttempted * 2 >= r.nPlanned);
  const tooShort = rows.filter((r) => !ranked.includes(r) && !partial.includes(r));
  const first = a.systems[0];
  return {
    generated: a.generated_utc, frozen: a.dataset.frozen_at, pilot: a.dataset.pilot, nDecisions: a.n_decisions_per_model,
    hardware: a.dataset.hardware, splits: a.dataset.splits, cohorts: a.cohorts,
    familyNames: Object.keys(first.by_family), cohortNames: Object.keys(first.by_cohort),
    familyN: Object.fromEntries(Object.entries(first.by_family).map(([k, v]) => [k, v.n_planned])),
    cohortN: Object.fromEntries(Object.entries(first.by_cohort).map(([k, v]) => [k, v.n_planned])),
    repeatability: a.repeatability, methodNotes: a.method_notes,
    measuredOn: (a.systems.map((s) => s.run_started_utc).filter(Boolean).sort()[0] || a.generated_utc).slice(0, 10),
    ranked, partial, tooShort,
  };
}
