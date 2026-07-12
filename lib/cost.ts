import type { ClientOffer, ClientModel, ClientData } from "./client-model";
import type { ScoreKey } from "./types";

export const SCORE_OPTIONS: ScoreKey[] = [
  "composite",
  "aa_coding_agent",
  "designarena_fullstack",
  "designarena_frontend",
  "aa_coding_index",
  "aa_intelligence_index",
];

/** Default score across the whole app. */
export const DEFAULT_SCORE: ScoreKey = "composite";

export function blend(input: number | null, output: number | null, inputWeight = 10): number | null {
  if (input == null && output == null) return null;
  const i = input ?? output ?? 0;
  const o = output ?? input ?? 0;
  return (inputWeight * i + o) / (inputWeight + 1);
}

export interface RankedOffer extends ClientOffer { blended: number }

export interface OfferScope {
  allowed: Set<string> | null;
  euHostedOnly: boolean;
  teeOnly: boolean;
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
  inputWeight = 10,
): ClientOffer[] {
  if (!offers) return [];
  return offers.filter((offer) => offerMatchesScope(offer, selection)).sort((a, b) => {
    const health = endpointHealth(a) - endpointHealth(b);
    if (health) return health;
    const aPrice = blend(a.input_per_1m, a.output_per_1m, inputWeight);
    const bPrice = blend(b.input_per_1m, b.output_per_1m, inputWeight);
    return (aPrice ?? Infinity) - (bPrice ?? Infinity);
  });
}

/** Catalog offers that match the active scope, including active listings whose
 * public token price is not published yet. One healthy route per provider
 * survives, with a priced route preferred over an unpriced one. */
export function scopedCatalogOffers(
  offers: ClientOffer[] | undefined,
  selection: OfferSelection,
  inputWeight = 10,
): ClientOffer[] {
  const sorted = scopedCatalogRoutes(offers, selection, inputWeight);
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
  inputWeight = 10
): RankedOffer[] {
  if (!offers) return [];
  const ranked = scopedCatalogOffers(offers, selection, inputWeight)
    .map((o) => ({ ...o, blended: blend(o.input_per_1m, o.output_per_1m, inputWeight) ?? Infinity }))
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
  inputWeight = 10
): number | null {
  const r = rankedOffers(data.offersByModel[m.id], selection, inputWeight);
  if (r.length) return r[0].blended;
  if (!selection || (isOfferScope(selection) && !selection.restricted)) {
    return blend(m.aa_ref_input, m.aa_ref_output, inputWeight);
  }
  return null;
}

export function scoreOf(m: ClientModel, key: ScoreKey): number | null {
  return m.scores[key] ?? null;
}

/** Sensible default minimum for a score: DesignArena is Elo (~1000), AA indices ~35,
 *  Composite is a 0–100 blend (no floor by default). */
export function defaultMinFor(score: ScoreKey): number {
  if (score === "composite") return 0;
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

/** Build the one offer scope shared by every interactive view. Provider-level
 * flags choose candidate providers; offer-level flags/regions then prevent a
 * US/UK/global route from leaking through merely because that provider also has
 * some EU capacity. */
export function createOfferScope(
  excluded: Set<string> | null,
  excludeChinese: boolean,
  providers: ProviderFlag[],
  euHostedOnly = false,
  nonUsOnly = false,
  teeOnly = false,
): OfferScope {
  return {
    allowed: effectiveAllowed(excluded, excludeChinese, providers, euHostedOnly, nonUsOnly),
    euHostedOnly,
    teeOnly,
    restricted: !!(excluded?.size || excludeChinese || euHostedOnly || nonUsOnly || teeOnly),
  };
}

// Two independent "hide" toggles, matched on family_key (covers all variants):
//  - GPT-5.5* and Claude Opus 4.8  (off by default)
//  - Claude Fable                  (ON by default). Fable 5 tops the capability
//    benchmarks but Anthropic states it falls back to Opus 4.8 for "routine tasks like
//    coding and debugging" — so it isn't usable as a standalone coding model and would
//    just sit misleadingly at #1. Hidden by default; users can opt in via the toggle.
export const HIDE_GPT_OPUS_RE = /^(gpt-5\.5|claude-opus-4\.8)/;
export const HIDE_FABLE_RE = /^claude-fable/;
export function isHiddenModel(familyKey: string, hideGptOpus: boolean, hideFable: boolean): boolean {
  return (hideGptOpus && HIDE_GPT_OPUS_RE.test(familyKey)) || (hideFable && HIDE_FABLE_RE.test(familyKey));
}

// Provider-filter presets (point 5).
export const PROVIDER_PRESETS: { label: string; match: (p: { platform: string; provider: string }) => boolean }[] = [
  { label: "Hyperscalers + 1st-party", match: (p) => ["AWS Bedrock", "Azure AI Foundry", "Anthropic API / Claude Code"].includes(p.platform) },
  { label: "Open-source market (OpenRouter)", match: (p) => p.platform === "OpenRouter" },
  { label: "Chutes / Nebius / DeepInfra", match: (p) => /chutes|nebius|deepinfra/i.test(p.provider) },
];
