// CR-34.2 / CR-34.3: OpenRouter's own benchmark runs as versioned observations.
//
// Identity. OpenRouter publishes a `model_permaslug`, which is an exact OpenRouter model id —
// not a label to be matched fuzzily. It resolves to a catalog family through the OpenRouter
// offers the catalog already carries (`or_canonical_slug` / `or_model_id`). What the permaslug
// does *not* state, for GPQA Diamond and τ²-Bench, is a reasoning effort, so such a row is
// family-scoped evidence: it attaches exactly once to the deterministic family representative
// and says so in its protocol, exactly like Epoch ECI and DesignArena.
// The search benchmarks are different: with `include_run_config=true` OpenRouter publishes the
// lane each row ran in, including `reasoning_effort`. A stated effort must match an existing
// catalog configuration — it is never mapped onto a different one, and never falls through to a
// family representative.
//
// Values. `accuracy` (classic benchmarks) and `primary_score` (search benchmarks) are fractions
// in 0–1 and are stored in that unit. `accuracy_stddev`, `total_tasks`, the search lane and the
// run configuration travel in the protocol. `avg_cost_per_task` is a measured USD cost and
// becomes its own `-cost` observation — a cost signal beside the score, never inside it.

import { deterministicFamilyRepresentative } from './family-representative.mjs';

export const BENCHMARK_IDS = {
  gpqa_diamond: 'openrouter-gpqa-diamond',
  tau_bench_verified_airline: 'openrouter-tau2-bench-airline',
  search_browsecomp: 'openrouter-search-browsecomp',
  search_dsqa: 'openrouter-search-dsqa',
  search_hle: 'openrouter-search-hle',
  search_widesearch: 'openrouter-search-widesearch',
};
export const SEARCH_TYPES = new Set(['search_browsecomp', 'search_dsqa', 'search_hle', 'search_widesearch']);
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

// CR-65.12: a published run that cannot belong to the model it is filed under is withheld for review,
// never shown. Two independent checks:
// - the same test measured by Artificial Analysis: an OpenRouter GPQA Diamond accuracy more than 25
//   percentage points above the best AA GPQA result of any effort setting of the family;
// - the cost: at the OpenRouter list price of that slug, the published mean cost per task implies at least
//   IMPLAUSIBLE_TOKENS tokens per task (cost ÷ the higher of the input and output price), more than any
//   benchmark task here needs.
// Nova Micro's rows (GPQA 89.1 % at $0.22/task, AA measures 35.8 %; τ² 78.7 % at $1.28/task) are the case.
export const AA_SAME_TEST = { gpqa_diamond: 'aa_gpqa' };
export const MAX_ABOVE_AA = 0.25;
export const IMPLAUSIBLE_TOKENS = 1_000_000;

export function crossSourceConflict(row, familyRows) {
  const value = SEARCH_TYPES.has(row.benchmark_type) ? row.primary_score : row.accuracy;
  const field = AA_SAME_TEST[row.benchmark_type];
  if (field && finite(value)) {
    const aa = familyRows.map((m) => m.benchmarks?.[field]).filter(finite);
    if (aa.length && value - Math.max(...aa) > MAX_ABOVE_AA) {
      return `OpenRouter's accuracy ${value.toFixed(3)} is more than ${Math.round(MAX_ABOVE_AA * 100)} percentage points above Artificial Analysis's best measurement of the same test for this family (${Math.max(...aa).toFixed(3)}); the run is probably another model's and is withheld for review.`;
    }
  }
  if (finite(row.avg_cost_per_task) && row.avg_cost_per_task > 0) {
    const prices = familyRows.flatMap((m) => m.offers || [])
      .filter((o) => o.or_model_id === row.model_permaslug || o.or_canonical_slug === row.model_permaslug)
      .flatMap((o) => [o.input_per_1m, o.output_per_1m]).filter((p) => finite(p) && p > 0);
    if (prices.length) {
      const minTokens = row.avg_cost_per_task / Math.max(...prices) * 1e6;
      if (minTokens > IMPLAUSIBLE_TOKENS) {
        return `OpenRouter's mean cost of $${row.avg_cost_per_task.toFixed(4)} per task implies at least ${Math.round(minTokens).toLocaleString('en-US')} tokens per task at this model's OpenRouter list price (highest $${Math.max(...prices)}/1M); the list price cannot explain it, so the run is probably another model's and is withheld for review.`;
      }
    }
  }
  return null;
}

/** permaslug → catalog family key, from the OpenRouter offers the catalog already carries.
 *  A slug that several families claim is ambiguous and joins nothing. */
export function familyIndex(models) {
  const bySlug = new Map();
  for (const m of models) {
    for (const offer of m.offers || []) {
      for (const key of ['or_canonical_slug', 'or_model_id']) {
        const slug = offer[key];
        if (!slug) continue;
        if (!bySlug.has(slug)) bySlug.set(slug, new Set());
        bySlug.get(slug).add(m.family_key);
      }
    }
    const meta = m.openrouter_metadata;
    for (const slug of [meta?.canonical_slug, meta?.id]) {
      if (!slug) continue;
      if (!bySlug.has(slug)) bySlug.set(slug, new Set());
      bySlug.get(slug).add(m.family_key);
    }
  }
  return new Map([...bySlug].map(([slug, families]) => [slug, families.size === 1 ? [...families][0] : null]));
}

const lane = (row) => [row.search_engine, row.search_surface].filter(Boolean).join(' · ') || null;
const locatorOf = (row) => `own_data row model_permaslug=${row.model_permaslug}, benchmark_type=${row.benchmark_type}${lane(row) ? `, lane ${lane(row)}` : ''}`;

/** One deterministic subject id per published row, stable across refreshes. */
export const subjectId = (row) => [row.model_permaslug, row.benchmark_type, row.search_engine, row.search_surface,
  row.run_config?.reasoning_effort].filter(Boolean).join('|');

/** Build observations for OpenRouter's own runs.
 *  `capture` is the hash-bound `?source=openrouter&include_run_config=true` response (its `data`),
 *  or the collector snapshot that carries the same rows as `own_data`; `models` are dataset model
 *  rows; `source` is the capture's provenance from the ingestion lock. */
export function buildOpenRouterBenchmarkObservations(capture, models, source, version) {
  if (typeof version !== 'string' || !version.startsWith('snapshot-')) throw new Error('OpenRouter benchmarks: a dated snapshot version is required');
  const benchmarkId = (type) => `${BENCHMARK_IDS[type]}::${version}`;
  const rows = (capture.own_data || capture.data || []).filter((r) => r.source === 'openrouter' && BENCHMARK_IDS[r.benchmark_type]);
  const families = familyIndex(models);
  const rowsByFamily = new Map();
  for (const m of models) {
    if (!rowsByFamily.has(m.family_key)) rowsByFamily.set(m.family_key, []);
    rowsByFamily.get(m.family_key).push(m);
  }
  const byId = new Map(models.map((m) => [m.id, m]));

  // Several permaslugs can point at one family (an alias and a dated snapshot of the same model).
  // Only the newest run may represent the family; an exact tie on the run timestamp is a real
  // ambiguity and is rejected rather than resolved by ordering.
  const claims = new Map();
  const rejected = [];
  for (const row of rows) {
    const familyKey = families.get(row.model_permaslug) ?? null;
    if (!familyKey) { rejected.push({ benchmark_id: benchmarkId(row.benchmark_type), source_id: subjectId(row),
      reason: families.has(row.model_permaslug) ? 'OpenRouter permaslug is claimed by more than one catalog family.' : 'OpenRouter permaslug has no OpenRouter offer in the catalog.' }); continue; }
    const effort = SEARCH_TYPES.has(row.benchmark_type) ? row.run_config?.reasoning_effort ?? null : null;
    const key = [familyKey, row.benchmark_type, row.search_engine, row.search_surface, effort].filter(Boolean).join('|');
    const prior = claims.get(key);
    if (!prior) { claims.set(key, { row, familyKey, effort }); continue; }
    const a = Date.parse(prior.row.last_run_timestamp), b = Date.parse(row.last_run_timestamp);
    if (b > a) claims.set(key, { row, familyKey, effort });
    else if (b === a && prior.row.model_permaslug !== row.model_permaslug) {
      claims.delete(key);
      rejected.push({ benchmark_id: benchmarkId(row.benchmark_type), source_id: subjectId(row),
        reason: `Two OpenRouter permaslugs of ${familyKey} publish the same run timestamp; neither may represent the family.` });
    }
  }

  const observations = [], unmatched = [];
  for (const { row, familyKey, effort } of claims.values()) {
    const familyRows = rowsByFamily.get(familyKey) || [];
    let target = null, scope = '';
    if (effort) {
      // A stated effort joins only the catalog configuration that exists under exactly that effort.
      target = familyRows.find((m) => m.variant === effort) || null;
      scope = target ? `OpenRouter published the reasoning effort "${effort}" for this run; it joins the catalog configuration ${target.id}.` : '';
      if (!target) unmatched.push({ benchmark_id: benchmarkId(row.benchmark_type), source_id: subjectId(row),
        reason: `OpenRouter ran ${familyKey} at reasoning effort "${effort}", which is not a catalog configuration.` });
    } else {
      target = familyRows.length ? deterministicFamilyRepresentative(familyKey, familyRows) : null;
      if (target) scope = `OpenRouter publishes this run at model scope (permaslug ${row.model_permaslug}) without a reasoning effort. It is attached once to ${target.id}, the deterministic family representative used by collapsed comparisons; this does not assert that OpenRouter tested this exact effort setting.`;
      else unmatched.push({ benchmark_id: benchmarkId(row.benchmark_type), source_id: subjectId(row), reason: `No catalog configuration for family ${familyKey}.` });
    }
    const value = SEARCH_TYPES.has(row.benchmark_type) ? row.primary_score : row.accuracy;
    if (!finite(value) || value < 0 || value > 1) {
      rejected.push({ benchmark_id: benchmarkId(row.benchmark_type), source_id: subjectId(row), reason: `Published score ${JSON.stringify(value)} is not a fraction in 0–1.` });
      continue;
    }
    const conflict = crossSourceConflict(row, familyRows);
    if (conflict) {
      // `withheld` + the source locator also keep retained history states from re-publishing the run as an estimate.
      rejected.push({ benchmark_id: benchmarkId(row.benchmark_type), source_id: subjectId(row), reason: conflict, withheld: true, locator: locatorOf(row) });
      continue;
    }
    const id = subjectId(row);
    const facts = {
      permaslug: row.model_permaslug, total_tasks: row.total_tasks ?? null,
      accuracy_stddev: row.accuracy_stddev ?? null, primary_metric: row.primary_metric ?? null,
      search_engine: row.search_engine ?? null, search_surface: row.search_surface ?? null,
      run_config: row.run_config ?? null, last_run: row.last_run_timestamp ?? null,
      avg_cost_per_task_usd: finite(row.avg_cost_per_task) ? row.avg_cost_per_task : null,
      avg_latency_per_task_ms: finite(row.avg_latency_per_task_ms) ? row.avg_latency_per_task_ms : null,
    };
    const base = {
      subject: { source_id: id, name: row.display_name || row.model_permaslug, model_id: target?.id ?? null,
        variant: target?.variant ?? effort ?? null, harness: null },
      basis: 'measured',
      source: { ...source, locator: locatorOf(row) },
      comparison_key: null,
    };
    observations.push({ ...base, id: `openrouter:${id}`, benchmark_id: benchmarkId(row.benchmark_type), value, unit: 'fraction',
      protocol: `OpenRouter's own reproducible run over ${row.total_tasks ?? 'an unstated number of'} tasks${finite(row.accuracy_stddev) ? `, published standard deviation ${row.accuracy_stddev}` : ', no standard deviation published'}${row.primary_metric ? `, primary metric ${row.primary_metric}` : ''}${lane(row) ? `, search lane ${lane(row)}` : ''}${row.run_config ? `, run config ${JSON.stringify(row.run_config)}` : ''}; last run ${row.last_run_timestamp}. ${scope || 'Unjoined: the published identity does not resolve to a catalog configuration.'}; source row: ${JSON.stringify({ configuration: lane(row) || '', ...facts })}`,
      ...(finite(row.accuracy_stddev) ? { published_stddev: row.accuracy_stddev } : {}),
      ...(finite(row.total_tasks) ? { sample_size: row.total_tasks } : {}) });
    if (finite(row.avg_cost_per_task)) {
      observations.push({ ...base, id: `openrouter-cost:${id}`, benchmark_id: `${BENCHMARK_IDS[row.benchmark_type]}-cost::${version}`, value: row.avg_cost_per_task, unit: 'USD',
        ...(finite(row.total_tasks) ? { sample_size: row.total_tasks } : {}),
        protocol: `Mean USD spent per task by OpenRouter's own run of this configuration, measured on ${row.total_tasks ?? 'an unstated number of'} tasks; last run ${row.last_run_timestamp}. Measured cost of that specific run, not Benchmark Heaven's adjusted cost model. ${scope}; source row: ${JSON.stringify({ configuration: lane(row) || '', ...facts })}` });
    }
  }
  observations.sort((a, b) => a.id.localeCompare(b.id));
  return { observations, rejected, unmatched, byId };
}
