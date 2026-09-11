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

export function selectModel(catalog, dataset, { model, critic = false, producers = [], smokeTest = false, maxPricePer1M = Infinity, excludeModels = [], scheduled = false } = {}) {
  if (typeof maxPricePer1M !== 'number' || maxPricePer1M <= 0 || Number.isNaN(maxPricePer1M)) throw new Error('Invalid worker price ceiling');
  if (!Array.isArray(excludeModels) || excludeModels.some((m) => typeof m !== 'string' || !m.includes('/'))) throw new Error('Invalid excluded worker model IDs');
  const excluded = new Set(excludeModels);
  if (model && excluded.has(model)) throw new Error('Pinned worker is excluded after a recorded failure');
  const avoid = new Set(producers.map(vendorFamily));
  if (critic && (!producers.length || producers.some((id) => !id.includes('/')))) throw new Error('Critic requires explicit producer model IDs (or valid last-successful producer state)');
  if (critic && smokeTest) throw new Error('Smoke tests cannot certify a critic round');
  if (smokeTest && !model) throw new Error('Smoke tests require an explicitly pinned model');
  const candidates = candidateList(catalog, dataset, MIN_INDEX, catalog.length);
  const candidate = model ? assessModel(catalog.find((m) => m.id === model) || {}, dataset)
    : [...candidates.free_verified, ...candidates.cheap_verified].find((m) => !excluded.has(m.id) && m.input_per_1m <= maxPricePer1M && m.output_per_1m <= maxPricePer1M && (!critic || !avoid.has(m.family)));
  if (!candidate) throw new Error('No supported viable worker model found');
  if (candidate.input_per_1m > maxPricePer1M || candidate.output_per_1m > maxPricePer1M) throw new Error('Worker price exceeds configured ceiling');
  if (critic && avoid.has(candidate.family)) throw new Error('Critic must belong to a different vendor family than every producer');
  if (candidate.aa_intelligence_index !== null && candidate.aa_intelligence_index < MIN_INDEX) throw new Error(`Model is below AA ${MIN_INDEX}`);
  if (candidate.aa_intelligence_index === null && !smokeTest) throw new Error('Unscored model: only the fixed known-answer --smoke-test is allowed');
  if (smokeTest && (candidate.input_per_1m > 2 || candidate.output_per_1m > 2)) throw new Error('Smoke-test price exceeds the $2 per million token ceiling');
  if (scheduled && !FLORIAN_ALLOWED_SCHEDULED_WORKERS.includes(modelBase(candidate.id))) {
    throw new Error(`Scheduled model ${candidate.id} not in Florian's authorized scheduled-worker set`);
  }
  return candidate;
}

export function validateCompletion(body, requested) {
  if (body?.error) throw new Error('Provider returned an API error');
  if (typeof body?.model !== 'string' || modelBase(body.model) !== modelBase(requested)) throw new Error('Provider returned an unexpected or missing model ID');
  const choice = body.choices?.[0];
  if (choice?.finish_reason !== 'stop') throw new Error(`Incomplete completion (${choice?.finish_reason || 'missing finish reason'})`);
  if (typeof choice.message?.content !== 'string' || !choice.message.content.trim()) throw new Error('Empty completion');
  return choice.message.content.trim();
}
