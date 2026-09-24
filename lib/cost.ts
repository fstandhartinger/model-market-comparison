import type { ClientOffer, ClientModel, ClientData } from "./client-model";
import type { ScoreKey } from "./types";
import { effectiveCost, fixedCost, cacheHitBaseline, FIXED_BLENDS, DEFAULT_BLEND, FALLBACK_OUTPUT_TOKENS, FALLBACK_IO_RATIO, type EffectiveCostResult, type CacheHitBaseline } from "./effective-cost.mjs";
import { REGION_BUCKETS, allRegions, countryBucket, hostingBucket, regionStateFromLegacy } from "./regions.mjs";
import { isFreeRoute } from "./free-route.mjs";
import { applyOpenRouterPriceOverride, describeOpenRouterPriceOverride, describeOpenRouterPriceOverrideWithRates, selectOpenRouterPriceOverride } from "./openrouter-pricing.mjs";
export { FIXED_BLENDS, DEFAULT_BLEND };

export type PriceMode = "adjusted" | "raw";
/** CR-65.8: which input:output ratio turns a model's output tokens per task into input tokens.
 *  "common" (default): one documented global ratio for every model, so two models with the same prices and the
 *  same tokens per task cost the same. "usage": each model's own OpenRouter traffic mix ("as used on OpenRouter"),
 *  which describes who uses a model rather than what a task costs. */
export type IoBasis = "common" | "usage";
export interface PriceSettings { priceMode: PriceMode; inputWeight: number; ioBasis?: IoBasis }
export const DEFAULT_IO_BASIS: IoBasis = "common";
export const DEFAULT_PRICE_SETTINGS: PriceSettings = { priceMode: "adjusted", inputWeight: DEFAULT_BLEND, ioBasis: DEFAULT_IO_BASIS };
export interface PriceContext extends PriceSettings { model: ClientModel; data: ClientData }
/** 2026-09-15: the exact wording shown for a proxied I/O-ratio source; only the "[link]" after it is a link. */
export const IO_PROXY_TEXT = "Proxied from publicly available LLM usage statistics from an inference provider";
/** `proxy`: the I/O ratio comes from a provider's global usage statistics, not from this model. */
export interface PriceSource { label: string; source: string; url?: string; date?: string; basis?: string; note?: string; proxy?: boolean }
/** How the cache-hit rate applied to input tokens was chosen, and whether the route bills cache reads below input. */
export interface PriceCache { kind: "observed" | "baseline" | "none"; rate: number; discounted: boolean }
export interface PriceResult {
  value: number | null;
  unit: "$/task" | "$/1M tokens";
  label: string;
  assumptions: string[];
  effective: EffectiveCostResult | null;
  sources: PriceSource[];
  model?: string;
  provider?: string;
  cache?: PriceCache;
  /** The source condition used for this adjusted estimate; raw blends use the published base rate. */
  priceCondition?: string | null;
  /** Source conditions retained on the offer, including tiers not used by this scenario. */
  conditionalRates?: string[];
  conditionCheckedAt?: string;
  /** True when the AA task-token measurement was missing and the 1,000-token example task was used. */
  assumedTask?: boolean;
}

// The typical cache-hit rate is a property of one dataset build; compute it once per dataset.
const baselines = new WeakMap<object, CacheHitBaseline | null>();
function baselineFor(data: ClientData): CacheHitBaseline | null {
  const efficiency = data.efficiency;
  if (!efficiency) return null;
  // CR-62.1: a page that ships only one model's endpoints carries the catalog-wide baseline precomputed.
  if (efficiency.cache_hit_baseline !== undefined) return efficiency.cache_hit_baseline;
  if (!baselines.has(efficiency)) baselines.set(efficiency, cacheHitBaseline(efficiency, data.generated_at));
  return baselines.get(efficiency) ?? null;
}
export function priceContext(model: ClientModel, data: ClientData, settings: PriceSettings = DEFAULT_PRICE_SETTINGS): PriceContext {
  return { priceMode: settings.priceMode, inputWeight: settings.inputWeight, ioBasis: settings.ioBasis ?? DEFAULT_IO_BASIS, model, data };
}
export function priceLabel(settings: PriceSettings): string {
  return settings.priceMode === "adjusted" ? "Adjusted $/task"
    : `Raw ${settings.inputWeight === 1000000 ? "input only" : `${settings.inputWeight}:1`} $/1M tokens`;
}
type Pricing = PriceContext | number;
const valid = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;
const usable = (o: { value: unknown; stale?: boolean } | null | undefined) => o && !o.stale && valid(o.value);
// Usage observations expire relative to the dataset build, not wall-clock time
// during rendering. Benchmark task measurements describe an immutable variant.
const freshUsage = (o: { value: unknown; stale?: boolean; collected_at: string } | null | undefined, data: ClientData) => {
  if (!usable(o)) return false;
  const age = Date.parse(data.generated_at) - Date.parse(o!.collected_at);
  return !Number.isFinite(age) || age <= 30 * 86400000;
};
const SOURCE_KEYS: Record<string, string> = {
  OpenRouter: "openrouter", "Artificial Analysis": "artificialanalysis", "AWS Bedrock": "aws_bedrock",
  "Azure AI Foundry": "azure_foundry", "Google Vertex AI": "google_vertex", Anthropic: "claude_code",
  "Anthropic API / Claude Code": "claude_code", "GitHub Copilot": "github_copilot",
  Nebius: "nebius", Inceptron: "inceptron", Scaleway: "scaleway", IONOS: "ionos", Mistral: "mistral",
  TensorX: "tensorx", Chutes: "chutes", OVHcloud: "ovhcloud", STACKIT: "stackit", "T-Systems LLM Hub": "t_systems_llm_hub",
};

/** Source selection is separate from pure arithmetic. Exact model + endpoint
 * identity is mandatory for cache statistics: a route never borrows another endpoint's measured rate. CR-65.9: the one
 * documented exception is the typical baseline (median of OpenRouter endpoints), applied to any route — OpenRouter or
 * direct — that publishes a cache-read price, so one model costs the same caching share wherever it is sold. */
export function offerPrice(offer: ClientOffer, context: Pricing = 10, evaluatedAt: Date = new Date()): PriceResult {
  const settings = typeof context === "number" ? { priceMode: "raw" as const, inputWeight: context } : context;
  const priceUrl = offer.platform === "OpenRouter" && offer.or_model_id ? `https://openrouter.ai/api/v1/models/${offer.or_model_id}/endpoints`
    : offer.platform === "Google Vertex AI" ? "https://cloud.google.com/vertex-ai/generative-ai/pricing"
    : offer.platform === "Artificial Analysis" ? "https://artificialanalysis.ai/leaderboards/models"
    : offer.notes?.match(/https:\/\/[^\s,)]+/)?.[0];
  const sources: PriceSource[] = [{ label: "List prices", source: offer.source, url: priceUrl,
    date: typeof context === "number" ? undefined : context.data.sourceDates?.[SOURCE_KEYS[offer.platform]], basis: offer.estimated ? "assumed" : "self_reported",
    note: `${offer.platform} / ${offer.provider}; ${offer.region}${offer.endpoint_tag ? `; endpoint ${offer.endpoint_tag}` : ""}${offer.pricing_tier ? `; ${offer.pricing_tier}` : ""}${offer.notes ? `. ${offer.notes}` : ""}` }];
  if (offer.cache_read_source?.url) sources.push({ label: "Cache-read price", source: offer.cache_read_source.url,
    url: offer.cache_read_source.url, date: offer.cache_read_source.date, basis: "measured",
    note: [offer.cache_read_source.locator, offer.cache_read_source.sha256 ? `SHA-256 ${offer.cache_read_source.sha256}` : null].filter(Boolean).join(" · ") });
  const conditionalRates = offer.price_overrides?.map(describeOpenRouterPriceOverrideWithRates) ?? [];
  const retained = { conditionalRates: conditionalRates.length ? conditionalRates : undefined };
  const base = { label: priceLabel(settings), sources, model: typeof context === "number" ? undefined : context.model.display_name, provider: `${offer.provider} / ${offer.platform}` };
  if (settings.priceMode === "raw" || typeof context === "number") {
    const result = fixedCost(offer.input_per_1m, offer.output_per_1m, settings.inputWeight);
    if (offer.estimated) result.assumptions.push("Catalog price is marked estimated by its source.");
    return { ...base, ...retained, value: result.value, unit: "$/1M tokens", assumptions: result.assumptions, effective: null };
  }
  const { model, data } = context;
  const extra: string[] = [];
  const telemetry = model.token_efficiency;
  const common = (context.ioBasis ?? DEFAULT_IO_BASIS) === "common";
  let ratio = telemetry?.input_output_ratio;
  if (common) {
    // CR-65.8: the same workload for every model. Never a per-model ratio (not even AA's benchmark ratio).
    const global = data.efficiency?.global_io_ratio;
    ratio = freshUsage(global, data) ? { ...global!, fallback: false, basis: "assumed" } : undefined;
    extra.push(ratio
      ? "Common workload: the same global input:output ratio is applied to every model, so models are compared on one task mix, not on who happens to use them."
      : "Common workload: the global input:output ratio is unavailable or stale, so the 10:1 scenario is applied to every model.");
  } else if (!freshUsage(ratio, data)) {
    const global = data.efficiency?.global_io_ratio;
    const benchmark = telemetry?.aa?.benchmark_input_output_ratio;
    if (freshUsage(global, data)) {
      ratio = { ...global!, fallback: true, basis: "assumed" };
    } else if (usable(benchmark)) {
      ratio = { ...benchmark!, fallback: true, basis: "assumed" };
      extra.push("User usage unavailable: AA benchmark I/O ratio used as a proxy, not typical coding-agent traffic.");
    } else ratio = undefined;
    if (telemetry?.input_output_ratio) extra.push("Unavailable, invalid or stale model I/O observation ignored.");
  }
  if (ratio) {
    sources.push({ label: common ? "Input/output ratio (same for every model)" : "Input/output ratio", source: ratio.source, url: ratio.url, date: ratio.collected_at, basis: ratio.basis,
      proxy: (common || ratio.fallback === true) && ratio.source === data.efficiency?.global_io_ratio?.source,
      note: [ratio.scope, ratio.configuration_scope, ratio.window ? `${ratio.window.start_date} to ${ratio.window.end_date}` : ""].filter(Boolean).join("; ") });
    if (!common && (ratio.fallback || ratio.basis === "assumed")) extra.push("I/O ratio assigned from fallback evidence; assumed for this model and task.");
  }
  const tokens = telemetry?.aa?.tokens_per_task;
  if (tokens && !tokens.stale) sources.push({ label: "Output tokens/task", source: tokens.source, url: tokens.url, date: tokens.collected_at, basis: tokens.basis,
    note: `AA Intelligence Index task; exact configuration ${telemetry?.aa.source_slug} (${telemetry?.aa.source_variant || model.variant || "source default"}). Includes answer and reasoning tokens.` });
  if (tokens?.stale) extra.push("Stale AA task-token observation ignored.");
  const conditionCheckedAt = offer.platform === "OpenRouter" && conditionalRates.length ? evaluatedAt : undefined;
  const scenarioOutputTokens = tokens && !tokens.stale && valid(tokens.value.output) && tokens.value.output > 0
    ? tokens.value.output : FALLBACK_OUTPUT_TOKENS;
  const scenarioRatio = valid(ratio?.value) ? ratio.value : FALLBACK_IO_RATIO;
  const promptTokens = scenarioOutputTokens * scenarioRatio;
  const selectedCondition = offer.platform === "OpenRouter"
    ? selectOpenRouterPriceOverride(offer.price_overrides, { promptTokens, date: conditionCheckedAt ?? evaluatedAt })
    : { status: "none", override: null };
  const pricedOffer = offer.platform === "OpenRouter" ? applyOpenRouterPriceOverride(offer, selectedCondition.override) : offer;
  const priceCondition = selectedCondition.override ? describeOpenRouterPriceOverride(selectedCondition.override)
    : conditionalRates.length ? "Published base rate" : null;
  if (selectedCondition.override) {
    extra.push(`OpenRouter rate condition applied: ${priceCondition}; estimated prompt length ${Math.round(promptTokens).toLocaleString("en-US")} tokens; schedule checked at ${conditionCheckedAt!.toISOString()} (UTC).`);
  } else if (selectedCondition.status === "no_match") {
    extra.push(`OpenRouter base rate applies: no published prompt-length or UTC condition matches an estimated ${Math.round(promptTokens).toLocaleString("en-US")}-token prompt at ${conditionCheckedAt!.toISOString()} (UTC).`);
  } else if (selectedCondition.status === "ambiguous") {
    extra.push("OpenRouter conditional rates overlap for this prompt and UTC time; the estimate uses the published base rate until the source conditions can be disambiguated.");
  }
  const endpoint = offer.platform === "OpenRouter" && offer.or_model_id && offer.endpoint_tag
    ? data.efficiency?.openrouter_endpoints[offer.or_model_id]?.[offer.endpoint_tag] : undefined;
  const exactEndpoint = endpoint?.or_model_id === offer.or_model_id && endpoint?.endpoint_tag === offer.endpoint_tag
    && endpoint?.provider === offer.provider && !["ambiguous_endpoint_tag", "provider_identity_conflict"].includes(endpoint?.status || "") ? endpoint : undefined;
  const hit = exactEndpoint?.cache_hit_rate;
  const observedHit = freshUsage(hit, data) && hit!.value <= 1;
  // 2026-09-15: a route without its own usable observation gets the documented typical rate (median of
  // OpenRouter endpoints that bill cache reads), not 0 %. CR-65.9: only on routes that publish a cache-read price
  // (where caching is billed); a route without one gets no rate at all, so the modal never claims a cache share.
  const baselineApplies = !observedHit && valid(pricedOffer.cache_read_per_1m);
  const baseline = baselineApplies ? baselineFor(data) : null;
  if (observedHit) {
    sources.push({ label: "Cache-hit rate", source: hit!.source, url: hit!.url, date: hit!.collected_at, basis: hit!.basis, note: hit!.definition });
    extra.push("Reported endpoint cache-hit fraction applied to input tokens; denominator and summary interval are unpublished. This mapping is assumed.");
  } else {
    if (hit) extra.push("Unavailable, invalid or stale endpoint cache-hit observation ignored.");
    if (baseline) {
      sources.push({ label: "Cache-hit rate (typical baseline)", source: `Median of ${baseline.endpoints} OpenRouter endpoints`, url: baseline.url,
        date: baseline.collected_from === baseline.collected_to ? baseline.collected_to : `${baseline.collected_from} to ${baseline.collected_to}`, basis: baseline.basis, note: baseline.definition });
      extra.push(`No usable cache-hit observation for this route: typical baseline ${(baseline.value * 100).toFixed(1)}% applied (${baseline.definition})`);
    } else extra.push(valid(offer.cache_read_per_1m) ? "No usable cache-hit observation or baseline: no cache discount credited."
      : "This route publishes no cache-read price: no cache-hit rate applied and no cache discount credited.");
  }
  if (endpoint && !exactEndpoint) extra.push("Conflicting/ambiguous endpoint identity ignored; no endpoint cache statistics borrowed.");
  const appliedHit = observedHit ? hit!.value : baseline?.value ?? null;
  const costInputs = {
    input_per_1m: pricedOffer.input_per_1m, output_per_1m: pricedOffer.output_per_1m,
    cache_read_per_1m: pricedOffer.cache_read_per_1m,
    cache_write_per_1m: pricedOffer.cache_write_per_1m,
    output_tokens_per_task: tokens && !tokens.stale ? tokens.value.output : null,
    input_output_ratio: ratio?.value,
    cache_hit_rate: appliedHit,
  };
  let result = effectiveCost(costInputs);
  // CR-65.9: a route that publishes a cache-write price above its input price (explicit caching, e.g. Anthropic's
  // 1.25×) bills the input it has to cache at that price. When cache reads are credited, every uncached input token
  // is assumed to be written once (an upper bound); the engine adds only the surcharge over the input price.
  const hitRate = result.inputs.cache_hit_rate ?? 0, writePrice = pricedOffer.cache_write_per_1m, inputPrice = result.inputs.input_per_1m;
  if (hitRate > 0 && valid(writePrice) && typeof inputPrice === "number" && writePrice > inputPrice) {
    const writes = result.inputs.input_tokens_per_task * (1 - hitRate);
    result = effectiveCost({ ...costInputs, cache_write_tokens: writes, cache_write_per_1m: writePrice - inputPrice });
    result.inputs.cache_write_per_1m = writePrice;
    result.assumptions = result.assumptions.filter((a) => !/^Cache-write volume unmeasured/.test(a));
    extra.push(`Cache writes: the ${Math.round((1 - hitRate) * 100)}% of input not read from cache is assumed written once at the published write price ($${writePrice}/1M, a surcharge of $${Number((writePrice - inputPrice).toFixed(6))}/1M over input); an upper bound.`);
  }
  const read = result.inputs.cache_read_per_1m, input = result.inputs.input_per_1m;
  const cache: PriceCache = { kind: observedHit ? "observed" : baseline ? "baseline" : "none", rate: result.inputs.cache_hit_rate ?? 0,
    discounted: typeof read === "number" && typeof input === "number" && read < input };
  extra.push(common ? "AA output/task combined with one global usage I/O ratio is a modeled workload, not a measured coding-agent bill."
    : "AA output/task combined with this model's OpenRouter usage I/O is a modeled workload, not a measured coding-agent bill.");
  extra.push("Selected catalog tier only; per-request context premiums, cache storage, tools, retries and taxes are not modeled.");
  if (offer.estimated) extra.push("Catalog price is marked estimated by its source.");
  result.assumptions.push(...extra);
  result.estimated = true;
  return { ...base, ...retained, priceCondition, conditionCheckedAt: conditionCheckedAt?.toISOString(), value: result.effective_cost_per_task, unit: "$/task", assumptions: result.assumptions, effective: result, cache,
    assumedTask: !(tokens && !tokens.stale && Number.isFinite(tokens.value.output) && tokens.value.output > 0) };
}

export const SCORE_OPTIONS: ScoreKey[] = [
  "composite",
  "aa_coding_agent",
  "designarena_fullstack",
  "designarena_frontend",
  "aa_coding_index",
  "aa_intelligence_index",
  "epoch_eci_software",
  "epoch_eci",
  // CR-25.6: category composites, after the single-source scores.
  "cat_coding",
  "cat_agentic",
  "cat_science",
  "cat_long_context",
];

/** Default score across the whole app. */
export const DEFAULT_SCORE: ScoreKey = "composite";

export function blend(input: number | null, output: number | null, inputWeight = 10): number | null {
  return fixedCost(input, output, inputWeight).value;
}

export interface RankedOffer extends ClientOffer { blended: number; price: PriceResult }

export interface OfferScope {
  allowed: Set<string> | null;
  /** CR-25.4 "Hosted in": the hosting buckets an offer's inference may run in; null = all. */
  hostedIn?: string[] | null;
  /** True when "Hosted in" is exactly EU (the former EU-hosted-only switch). */
  euHostedOnly: boolean;
  teeOnly: boolean;
  /** R4.10: drop routes whose provider does NOT survive OpenRouter's own
   *  "Does not train" + "Zero retention" filter. Routes with no published policy
   *  (`data_private == null`) are kept — absence of a policy is not evidence of a bad one. */
  privateDataOnly: boolean;
  restricted: boolean;
}

type OfferSelection = Set<string> | OfferScope | null;

function isOfferScope(value: OfferSelection): value is OfferScope {
  return value != null && !(value instanceof Set);
}

/** Whether an offer is eligible for the product's EU filter. Physical EU
 * residency remains represented by `eu_hosted`; narrowly approved company
 * policy equivalents use a separate flag so Global routes are not mislabeled. */
export function isEuOffer(offer: ClientOffer): boolean {
  if (offer.eu_policy_equivalent) return true;
  if (offer.eu_hosted != null) return offer.eu_hosted;
  if (/outside the eu data boundary|excluded from the eu data boundary|us-served|served region:\s*(us|uk)/i.test(offer.notes || "")) return false;
  const region = (offer.region || "").toLowerCase();
  return region === "eu" || region.startsWith("eu-") || region.startsWith("europe-")
    || /\b(eu cross-region|swedencentral|westeurope|francecentral|germanywestcentral|polandcentral|spaincentral)\b/.test(region);
}

export function offerMatchesScope(offer: ClientOffer, selection: OfferSelection): boolean {
  if (!isOfferScope(selection)) return !selection || selection.has(offer.key);
  if (selection.allowed && !selection.allowed.has(offer.key)) return false;
  if (selection.teeOnly && !offer.tee) return false;
  if (selection.euHostedOnly && !isEuOffer(offer)) return false;
  if (selection.hostedIn && !selection.hostedIn.includes(hostingBucket(offer, isEuOffer(offer)))) return false;
  if (selection.privateDataOnly && offer.data_private === false) return false;
  return true;
}

function endpointHealth(offer: ClientOffer): number {
  if (offer.platform !== "OpenRouter") return 0;
  if (offer.status === 0) return 0;
  if (offer.status === -2) return 1;
  if (offer.status === -5) return 2;
  if (offer.status == null) return 3;
  return 4;
}

/** Every matching catalog SKU, including context tiers and serving routes. */
export function scopedCatalogRoutes(
  offers: ClientOffer[] | undefined,
  selection: OfferSelection,
  inputWeight: Pricing = 10,
): ClientOffer[] {
  if (!offers) return [];
  return offers.filter((offer) => offerMatchesScope(offer, selection)).sort((a, b) => {
    const health = endpointHealth(a) - endpointHealth(b);
    if (health) return health;
    const aPrice = offerPrice(a, inputWeight).value;
    const bPrice = offerPrice(b, inputWeight).value;
    return (aPrice ?? Infinity) - (bPrice ?? Infinity);
  });
}

/** Catalog offers that match the active scope, including active listings whose
 * public token price is not published yet. One healthy route per provider
 * survives, with a priced route preferred over an unpriced one. CR-50.1: free ($0 / ":free") routes are
 * never a paid price, so they are left out before the per-provider choice — a provider's free SKU must not
 * displace its paid route — and every ranking, count and chart built on this list ignores them. */
export function scopedCatalogOffers(
  offers: ClientOffer[] | undefined,
  selection: OfferSelection,
  inputWeight: Pricing = 10,
): ClientOffer[] {
  const sorted = scopedCatalogRoutes(offers, selection, inputWeight).filter((offer) => !isFreeRoute(offer));
  const seen = new Set<string>();
  return sorted.filter((offer) => {
    if (seen.has(offer.key)) return false;
    seen.add(offer.key);
    return true;
  });
}

/** Offers for a family, filtered to allowed provider keys (empty/null = all),
 *  with the 10:1 blended cost, sorted cheapest first. */
export function rankedOffers(
  offers: ClientOffer[] | undefined,
  selection: OfferSelection,
  inputWeight: Pricing = 10
): RankedOffer[] {
  if (!offers) return [];
  const ranked = scopedCatalogOffers(offers, selection, inputWeight)
    .map((o) => { const price = offerPrice(o, inputWeight); return { ...o, price, blended: price.value ?? Infinity }; })
    .filter((o) => Number.isFinite(o.blended))
    .sort((a, b) => a.blended - b.blended);
  return ranked;
}

/** Cheapest blended cost for a model given a provider filter, falling back to
 *  the ArtificialAnalysis reference price when no in-filter offer exists. */
export function modelCost(
  m: ClientModel,
  data: ClientData,
  selection: OfferSelection,
  settings: PriceSettings | number = DEFAULT_PRICE_SETTINGS
): number | null {
  return modelPrice(m, data, selection, settings).value;
}

export function modelPrice(m: ClientModel, data: ClientData, selection: OfferSelection, settings: PriceSettings | number = DEFAULT_PRICE_SETTINGS): PriceResult {
  const context = typeof settings === "number" ? settings : priceContext(m, data, settings);
  const r = rankedOffers(data.offersByModel[m.id], selection, context);
  if (r.length) return r[0].price;
  const reference: ClientOffer = { key: "AA reference", source: "Artificial Analysis reference list price", provider: "AA reference (no matching priced endpoint)", platform: "Artificial Analysis", region: "unspecified", input_per_1m: null, output_per_1m: null };
  // CR-50.1: an AA reference of $0 in both directions reports a free route, not a list price.
  if ((!selection || (isOfferScope(selection) && !selection.restricted)) && !isFreeRoute({ input_per_1m: m.aa_ref_input, output_per_1m: m.aa_ref_output })) {
    reference.input_per_1m = m.aa_ref_input;
    reference.output_per_1m = m.aa_ref_output;
  }
  const price = offerPrice(reference, context);
  if (price.value != null) price.assumptions.push("No priced provider route: AA reference list prices used; availability and cache behavior are unverified.");
  return price;
}

export function scoreOf(m: ClientModel, key: ScoreKey): number | null {
  return m.scores[key] ?? null;
}

/** Sensible default minimum for a score: DesignArena is Elo (~1000), AA indices ~35,
 *  Composite is a 0–100 blend (no floor by default). */
/** The min-score a score selection resets to. For Composite this is 86 (R5.3) — the same
 *  value `SettingsContext` starts from, so a fresh page is not reported as "modified" and
 *  Reset does not silently widen the shortlist it was supposed to restore. */
export function defaultMinFor(score: ScoreKey): number {
  if (score === "composite") return 86;
  return score.startsWith("designarena") ? 1000 : 35;
}

// Chinese-based inference providers (matched by provider NAME). This targets the
// providers/endpoints, NOT the model labs — open-weight models from Chinese labs
// (GLM, Kimi, DeepSeek, Qwen, MiniMax, MiMo…) stay listed and get priced via the
// remaining non-Chinese providers (DeepInfra, Together, Fireworks, Novita, …).
export const CHINESE_PROVIDER_RE = /\b(alibaba|qwen|deepseek|zhipu|z\.?ai|glm|moonshot|kimi|baidu|ernie|wenxin|baichuan|siliconflow|silicon\s*flow|tencent|hunyuan|bytedance|volcengine|volc|doubao|stepfun|minimax|streamlake|seed|nex\s*agi|iflytek|01\.?ai|inclusionai|ant\s*group|xiaomi|mimo|sensetime|modelscope|infinigence|infini-?ai|gitee)\b/i;

export function isChineseProvider(name: string): boolean {
  return CHINESE_PROVIDER_RE.test(name);
}

export function chineseProviderKeys(providers: { key: string; provider: string; country?: string | null }[]): Set<string> {
  return new Set(providers.filter((p) => isChineseProvider(p.provider) || /^(china|cn|hong kong)$/i.test(p.country || "")).map((p) => p.key));
}

type ProviderFlag = { key: string; provider: string; eu_hosted?: boolean; non_us?: boolean; eu_dedicated?: boolean; country?: string | null };

/** Combine the provider blocklist (`excluded` = keys the user unchecked) with the
 *  provider-level global toggles (exclude-Chinese, non-US-only) into one allowed-key
 *  set (null = all providers, no restriction). EU hosting is intentionally evaluated
 *  on each offer later; a provider-wide flag is not residency evidence. Starting from ALL
 *  providers and subtracting `excluded` means providers added later are included by
 *  default (no stale inclusion snapshot). */
export function effectiveAllowed(
  excluded: Set<string> | null,
  excludeChinese: boolean,
  providers: ProviderFlag[],
  euHostedOnly = false,
  nonUsOnly = false,
): Set<string> | null {
  if ((!excluded || excluded.size === 0) && !excludeChinese && !euHostedOnly && !nonUsOnly) return null;
  let base = new Set(providers.map((p) => p.key));
  if (excluded) for (const k of excluded) base.delete(k);
  if (excludeChinese) for (const k of chineseProviderKeys(providers)) base.delete(k);
  if (nonUsOnly) { const ok = new Set(providers.filter((p) => p.non_us).map((p) => p.key)); base = new Set([...base].filter((k) => ok.has(k))); }
  return base;
}

/** CR-25.4 "Provider company based in": the same rules the former switches applied, so default users and
 *  migrated settings see identical results — China = the Chinese-provider rule (name or country), US = every
 *  provider not flagged non-US, then EU by registered country; anything else (or unknown) is Other. */
export function providerBucket(p: ProviderFlag): string {
  if (chineseProviderKeys([p]).size) return "China";
  if (!p.non_us) return "US";
  return countryBucket(p.country) === "EU" ? "EU" : "Other";
}

export interface RegionSelection { hostedIn?: readonly string[] | null; providerBasedIn?: readonly string[] | null }

/** Build the one offer scope shared by every interactive view. Provider-level
 * choices (blocklist, provider company country) pick candidate providers; the
 * per-offer hosting bucket then prevents a US/UK/global route from leaking through
 * merely because that provider also has some EU capacity. */
export function createScope(
  excluded: Set<string> | null,
  providers: ProviderFlag[],
  regions: RegionSelection = {},
  privateDataOnly = false,
  teeOnly = false,
): OfferScope {
  const hostedIn = regions.hostedIn && !allRegions(regions.hostedIn) ? REGION_BUCKETS.filter((b) => regions.hostedIn!.includes(b)) : null;
  const basedIn = regions.providerBasedIn && !allRegions(regions.providerBasedIn) ? new Set(regions.providerBasedIn) : null;
  let allowed: Set<string> | null = null;
  if (excluded?.size || basedIn || hostedIn) {
    allowed = new Set(providers.filter((p) => !basedIn || basedIn.has(providerBucket(p))).map((p) => p.key));
    if (excluded) for (const k of excluded) allowed.delete(k);
  }
  return {
    allowed,
    hostedIn,
    euHostedOnly: !!hostedIn && hostedIn.length === 1 && hostedIn[0] === "EU",
    teeOnly,
    privateDataOnly,
    restricted: !!(excluded?.size || basedIn || hostedIn || teeOnly || privateDataOnly),
  };
}

/** The settings-shaped entry point every view uses. */
export function scopeFromSettings(
  s: { excludedSet: Set<string> | null; hostedIn: readonly string[]; providerBasedIn: readonly string[]; allowDataTraining: boolean },
  providers: ProviderFlag[],
): OfferScope {
  return createScope(s.excludedSet, providers, s, !s.allowDataTraining);
}

/** The pre-CR-25.4 signature (switches), kept for the tests that pin its behaviour; maps onto `createScope`. */
export function createOfferScope(
  excluded: Set<string> | null,
  excludeChinese: boolean,
  providers: ProviderFlag[],
  euHostedOnly = false,
  nonUsOnly = false,
  teeOnly = false,
  privateDataOnly = false,
): OfferScope {
  return createScope(excluded, providers, regionStateFromLegacy({ euHostedOnly, excludeChinese, nonUsOnly }), privateDataOnly, teeOnly);
}

// Provider-filter presets (point 5).
export const PROVIDER_PRESETS: { label: string; match: (p: { platform: string; provider: string }) => boolean }[] = [
  { label: "Hyperscalers + 1st-party", match: (p) => ["AWS Bedrock", "Azure AI Foundry", "Anthropic API / Claude Code"].includes(p.platform) },
  { label: "Open-source market (OpenRouter)", match: (p) => p.platform === "OpenRouter" },
  { label: "Chutes / Nebius / DeepInfra", match: (p) => /chutes|nebius|deepinfra/i.test(p.provider) },
];
