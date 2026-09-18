// Pure policy: transport success is not benchmark qualification.
export const MIN_INDEX = 34;
export const SMOKE_TASK = 'Return exactly one JSON object: sum is 19 + 23; missing is null because no source value was supplied; versions_equal is whether benchmark v1.4 equals benchmark v1.5. Use keys sum, missing, versions_equal. No other text.';
export const modelBase = (id) => String(id || '').replace(/:free$/, '');
export const vendorFamily = (id) => {
  const vendor = modelBase(id).replace(/^chutes\//, '').split('/')[0].toLowerCase();
  return ({ 'zai-org': 'z-ai', 'deepseek-ai': 'deepseek', moonshot: 'moonshotai' })[vendor] || vendor;
};
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
const orgKey = (s) => vendorFamily(s).replace(/[^a-z0-9]/g, '');
const price = (value) => ['string', 'number'].includes(typeof value) && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) * 1e6 : null;

export function assessModel(model, dataset) {
  const id = model.id;
  if (typeof id !== 'string' || !id.includes('/') || (id.includes(':') && !id.endsWith(':free'))) return null;
  const input = price(model.pricing?.prompt), output = price(model.pricing?.completion);
  if (input === null || output === null) return null;
  const base = modelBase(id);
  const exact = dataset.models.filter((m) => m.aa_metadata?.openrouter_api_id && modelBase(m.aa_metadata.openrouter_api_id) === base);
  let matches, join;
  if (exact.length) {
    // Include siblings too: an explicit ID on only the max row must not hide low scores.
    const families = new Set(exact.map((m) => m.family_key));
    matches = dataset.models.filter((m) => families.has(m.family_key) && m.aa_model_id);
    join = 'exact_id_and_variants';
  } else {
    const slug = norm(base.split('/').pop());
    matches = dataset.models.filter((m) => m.aa_model_id && !m.aa_metadata?.openrouter_api_id && norm(m.family_key) === slug);
    // A fallback is evidence only when the named family is unambiguous.
    if (new Set(matches.map((m) => m.org)).size > 1 || matches.some((m) => orgKey(m.org) !== orgKey(base))) matches = [];
    join = matches.length ? 'exact_family_slug' : 'unknown';
  }
  const scores = matches.map((m) => m.benchmarks?.aa_intelligence_index).filter((v) => typeof v === 'number' && Number.isFinite(v));
  const index = scores.length && scores.length === matches.length ? Math.min(...scores) : null;
  return {
    id, family: vendorFamily(id), free: input === 0 && output === 0,
    input_per_1m: input, output_per_1m: output, context: model.context_length ?? null,
    aa_intelligence_index: index, aa_source: join,
    matched_model_ids: matches.map((m) => m.id).sort(),
    aa_variant_scores: matches.map((m) => ({ id: m.id, index: m.benchmarks?.aa_intelligence_index ?? null })),
  };
}

export function candidateList(catalog, dataset, minimum = MIN_INDEX, limit = 10) {
  if (!Number.isFinite(minimum) || minimum < MIN_INDEX) throw new Error('Minimum AA index must be at least 34');
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Limit must be a positive integer');
  if (!Array.isArray(catalog) || !catalog.length || !Array.isArray(dataset.models) || !dataset.models.length) throw new Error('Empty or invalid catalog/dataset');
  const candidates = catalog.map((m) => assessModel(m, dataset)).filter(Boolean);
  const eligible = candidates.filter((m) => m.aa_intelligence_index !== null && m.aa_intelligence_index >= minimum);
  const cost = (m) => m.input_per_1m + m.output_per_1m;
  eligible.sort((a, b) => cost(a) - cost(b) || b.aa_intelligence_index - a.aa_intelligence_index || a.id.localeCompare(b.id));
  return {
    min_index: minimum, generated_at: new Date().toISOString(),
    free_verified: eligible.filter((m) => m.free).slice(0, limit),
    cheap_verified: eligible.filter((m) => !m.free).slice(0, limit),
    free_unverified: candidates.filter((m) => m.free && m.aa_intelligence_index === null).slice(0, limit),
    excluded_too_weak: candidates.filter((m) => m.aa_intelligence_index !== null && m.aa_intelligence_index < minimum && m.free).slice(0, limit),
    note: 'AA gate uses the conservative minimum across matched variants. Unknown models are never eligible for unattended work. :batch and other unsupported variants are excluded. Family fallback is explicitly labelled; no dated-SKU guesswork.',
  };
}

// Florian 2026-09-11: models he has explicitly authorized for unattended
// scheduled worker work. Anything else fails closed in scheduled runs — his
// cost ceilings are policy, not suggestions. Quality gates sit above this.
export const FLORIAN_ALLOWED_SCHEDULED_WORKERS = [
  'nex-agi/nex-n2.5-pro',
  'deepseek/deepseek-v4-flash-0731',
  'deepseek/deepseek-v4.1-flash',
  'deepseek/deepseek-v4-flash-0731',
  'z-ai/glm-5.3-flash',
  'z-ai/glm-5.3-flash-0731',
  'moonshotai/kimi-k3',
];

export function composeFlorianGate({ agent = false } = {}) {
  return {
    additionalRules:
      'Florian whitelist 2026-09-11: any paid OpenRouter candidate must be in ' +
      FLORIAN_ALLOWED_SCHEDULED_WORKERS + '. Free OpenRouter without a verified ' +
      'AA score is not enough — verified free (Nex 2.5 Pro) is preferred. Rarely ' +
      'use standout price/performance (DeepSeek V4.1 Flash, GLM-5.3 Flash). Kimi K3 ' +
      'over Chutes is the normal path (free, unlimited, not oversubscribed). ' +
      'x-ai/* is NEVER allowed unattended without explicit per-run approval.',
    allowedIds: FLORIAN_ALLOWED_SCHEDULED_WORKERS,
  };
}

// CR-66.3 (2026-09-17): free workers behind the local LiteLLM router (127.0.0.1:4010), tried before the paid
// OpenRouter pool. Qualification is the AA Intelligence Index of the exact variant the call runs — never the family
// minimum — and the router route must be healthy in ~/.llm-health.json. Kimi K3: Moonshot's model card documents
// `reasoning_effort` low/high/max with default "max", and the call sends "max", so it runs kimi-k3::max whether Chutes
// forwards the field or applies the template default. Qwen3.8 27B (best variant xhigh, AA 33.9) and Union Alpha (no
// AA index) are listed so the rule, not an omission, keeps them out; they qualify automatically once AA measures them
// at >= 34. `allowed_as` is the whitelist entry (Florian 2026-09-11: "Kimi K3 over Chutes is the normal path").
export const FREE_ROUTER_WORKERS = [
  { id: 'chutes/moonshotai/Kimi-K3-TEE', router_model: 'fw-kimi-k3', provider_model: 'moonshotai/Kimi-K3-TEE', health: ['models', 'kimi-k3'], variant_model_id: 'kimi-k3::max', reasoning_effort: 'max', allowed_as: 'moonshotai/kimi-k3' },
  { id: 'chutes/Qwen/Qwen3.8-27B-TEE', router_model: 'fw-qwen3.8-27b', provider_model: 'Qwen/Qwen3.8-27B-TEE', health: ['models', 'qwen3.8-27b'], variant_model_id: 'qwen3.8-27b::xhigh', reasoning_effort: 'xhigh', allowed_as: null },
  { id: 'openrouter/stealth/union-alpha', router_model: 'ua-openrouter', provider_model: 'stealth/union-alpha', health: ['union_alpha', 'ua-openrouter'], variant_model_id: 'union-alpha::default', reasoning_effort: null, allowed_as: null },
];

/** Health of one router route from ~/.llm-health.json: models.<key>.usable, or a union_alpha ranked_api entry marked healthy. */
export function routerRouteHealthy(health, [block, key]) {
  if (!health || typeof health !== 'object') return false;
  if (block === 'models') return health.models?.[key]?.usable === true;
  return health.union_alpha?.available === true && (health.union_alpha.ranked_api ?? []).some((r) => r?.key === key && r.health === 'healthy');
}

/** CR-66.3: qualified, healthy free router workers in health order; each shaped like an OpenRouter candidate plus `transport`. */
export function freeRouterCandidates(dataset, health, { workers = FREE_ROUTER_WORKERS, minimum = MIN_INDEX } = {}) {
  const models = new Map((dataset?.models ?? []).map((m) => [m.id, m]));
  const rank = (w) => (w.health[0] === 'models' ? health?.models?.[w.health[1]]?.rank ?? 99 : -1);
  return workers.map((w) => {
    const index = models.get(w.variant_model_id)?.benchmarks?.aa_intelligence_index;
    return { id: w.id, family: vendorFamily(w.id), free: true, input_per_1m: 0, output_per_1m: 0, context: null,
      aa_intelligence_index: typeof index === 'number' && Number.isFinite(index) ? index : null, aa_source: 'exact_variant',
      matched_model_ids: [w.variant_model_id], aa_variant_scores: [{ id: w.variant_model_id, index: index ?? null }],
      transport: 'router', router_model: w.router_model, provider_model: w.provider_model, reasoning_effort: w.reasoning_effort, allowed_as: w.allowed_as,
      healthy: routerRouteHealthy(health, w.health), _rank: rank(w) };
  }).filter((c) => c.healthy && c.allowed_as && FLORIAN_ALLOWED_SCHEDULED_WORKERS.includes(c.allowed_as) && c.aa_intelligence_index !== null && c.aa_intelligence_index >= minimum)
    .sort((a, b) => a._rank - b._rank || a.id.localeCompare(b.id))
    .map(({ _rank, ...c }) => c);
}

// CR-73.4 (2026-09-18): which role a free route is spent on.
// Measured on the 17 Sep 13:36 baseline (`ops/daily/PROFILE-CR73.md`): 24 critic calls took 90.9 min and $0.041,
// 22 producer calls 5.8 min and $0.019. Only one free route qualifies (Kimi K3, AA 43.8), and the different-family
// critic rule means it can serve only one of the two roles per packet. Spent on the producer it saves ~0.1 min a
// call; spent on the critic it saves ~4.6 min a call and removes the run's whole paid critic chain. So a producer
// takes the free route only when the paid pool has nothing viable — the route is never lost, only ordered last.
// `any` restores the CR-66.3 order (free first for both roles) for a run that wants it.
export const FREE_ROUTE_ROLES = ['critic', 'any'];
export function freeRouteRole(value = process.env.BH_WORKER_FREE_ROUTE_ROLE) {
  if (value === undefined || value === null || value === '') return 'critic';
  if (!FREE_ROUTE_ROLES.includes(value)) throw new Error(`Unsupported free-route role ${value}`);
  return value;
}

/** A receipt-legible route label: the transport plus the exact route the call went out on (CR-73.4). */
export function routeLabel(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  if (candidate.transport === 'router') return `router:${candidate.router_model ?? 'unknown'}`;
  if (candidate.transport === 'opencode') return 'opencode:chutes';
  return 'openrouter';
}

export function selectModel(catalog, dataset, { model, critic = false, producers = [], smokeTest = false, maxPricePer1M = Infinity, excludeModels = [], scheduled = false, freeRouter = [], freeRouteRole: role = 'critic' } = {}) {
  if (typeof maxPricePer1M !== 'number' || maxPricePer1M <= 0 || Number.isNaN(maxPricePer1M)) throw new Error('Invalid worker price ceiling');
  if (!Array.isArray(excludeModels) || excludeModels.some((m) => typeof m !== 'string' || !m.includes('/'))) throw new Error('Invalid excluded worker model IDs');
  const excluded = new Set(excludeModels);
  if (model && excluded.has(model)) throw new Error('Pinned worker is excluded after a recorded failure');
  const avoid = new Set(producers.map(vendorFamily));
  if (critic && (!producers.length || producers.some((id) => !id.includes('/')))) throw new Error('Critic requires explicit producer model IDs (or valid last-successful producer state)');
  if (critic && smokeTest) throw new Error('Smoke tests cannot certify a critic round');
  if (smokeTest && !model) throw new Error('Smoke tests require an explicitly pinned model');
  const candidates = candidateList(catalog, dataset, MIN_INDEX, catalog.length);
  // CR-66.3: qualified free router workers are offered only to scheduled calls with no pinned model.
  // CR-73.4: with `freeRouteRole: 'critic'` (the default) a producer sees them last instead of first, so the one
  // qualifying free route stays available to the critic it saves 40x more time on. Nothing is removed from the pool.
  if (!FREE_ROUTE_ROLES.includes(role)) throw new Error(`Unsupported free-route role ${role}`);
  const offeredFree = scheduled && !model ? freeRouter : [];
  const freeFirst = role === 'any' || critic;
  const rankedCandidates = [...(freeFirst ? offeredFree : []), ...candidates.free_verified, ...candidates.cheap_verified, ...(freeFirst ? [] : offeredFree)]
    .filter((m) => !scheduled || m.transport === 'router' || FLORIAN_ALLOWED_SCHEDULED_WORKERS.includes(modelBase(m.id)));
  const candidate = model ? assessModel(catalog.find((m) => m.id === model) || {}, dataset)
    : rankedCandidates.find((m) => !excluded.has(m.id) && m.input_per_1m <= maxPricePer1M && m.output_per_1m <= maxPricePer1M && (!critic || !avoid.has(m.family)));
  if (!candidate) throw new Error('No supported viable worker model found');
  if (candidate.input_per_1m > maxPricePer1M || candidate.output_per_1m > maxPricePer1M) throw new Error('Worker price exceeds configured ceiling');
  if (critic && avoid.has(candidate.family)) throw new Error('Critic must belong to a different vendor family than every producer');
  if (candidate.aa_intelligence_index !== null && candidate.aa_intelligence_index < MIN_INDEX) throw new Error(`Model is below AA ${MIN_INDEX}`);
  if (candidate.aa_intelligence_index === null && !smokeTest) throw new Error('Unscored model: only the fixed known-answer --smoke-test is allowed');
  if (smokeTest && (candidate.input_per_1m > 2 || candidate.output_per_1m > 2)) throw new Error('Smoke-test price exceeds the $2 per million token ceiling');
  if (scheduled && !FLORIAN_ALLOWED_SCHEDULED_WORKERS.includes(candidate.transport === 'router' ? candidate.allowed_as : modelBase(candidate.id))) {
    throw new Error(`Scheduled model ${candidate.id} not in Florian's authorized scheduled-worker set`);
  }
  return candidate;
}

// A transient critic transport failure should not make a bounded run
// impossible when the whitelist has only one remaining different family. Keep
// producer failures excluded; only a critic may retry its excluded pool, and
// only after the normal selection has no viable scheduled candidate.
export function selectModelForWorker(catalog, dataset, options = {}) {
  try { return selectModel(catalog, dataset, options); }
  catch (error) {
    if (options.scheduled && options.critic && options.excludeModels?.length && error.message === 'No supported viable worker model found') {
      // 2026-09-17 (CR-67.3): a failed free router route stays excluded. Re-offering it cost the 06:07 run three
      // 300 s router timeouts and ~20 slow max-effort critic calls, and the benchmark step ran out of time.
      const freeIds = new Set((options.freeRouter ?? []).map((c) => c.id));
      return selectModel(catalog, dataset, { ...options, excludeModels: options.excludeModels.filter((id) => freeIds.has(id)) });
    }
    throw error;
  }
}

export function validateCompletion(body, requested) {
  if (body?.error) throw new Error('Provider returned an API error');
  if (typeof body?.model !== 'string' || modelBase(body.model) !== modelBase(requested)) throw new Error('Provider returned an unexpected or missing model ID');
  const choice = body.choices?.[0];
  if (choice?.finish_reason !== 'stop') throw new Error(`Incomplete completion (${choice?.finish_reason || 'missing finish reason'})`);
  if (typeof choice.message?.content !== 'string' || !choice.message.content.trim()) throw new Error('Empty completion');
  return choice.message.content.trim();
}
