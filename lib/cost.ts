import type { ClientOffer, ClientModel, ClientData } from "./client-model";
import type { ScoreKey } from "./types";

export const SCORE_OPTIONS: ScoreKey[] = [
  "designarena_fullstack",
  "designarena_frontend",
  "aa_coding_index",
  "aa_intelligence_index",
];

/** Default score across the whole app. */
export const DEFAULT_SCORE: ScoreKey = "designarena_fullstack";

export function blend(input: number | null, output: number | null, inputWeight = 10): number | null {
  if (input == null && output == null) return null;
  const i = input ?? output ?? 0;
  const o = output ?? input ?? 0;
  return (inputWeight * i + o) / (inputWeight + 1);
}

export interface RankedOffer extends ClientOffer { blended: number }

/** Offers for a family, filtered to allowed provider keys (empty/null = all),
 *  with the 10:1 blended cost, sorted cheapest first. */
export function rankedOffers(
  offers: ClientOffer[] | undefined,
  allowed: Set<string> | null,
  inputWeight = 10
): RankedOffer[] {
  if (!offers) return [];
  return offers
    .filter((o) => !allowed || allowed.has(o.key))
    .map((o) => ({ ...o, blended: blend(o.input_per_1m, o.output_per_1m, inputWeight) ?? Infinity }))
    .filter((o) => Number.isFinite(o.blended))
    .sort((a, b) => a.blended - b.blended);
}

/** Cheapest blended cost for a model given a provider filter, falling back to
 *  the ArtificialAnalysis reference price when no in-filter offer exists. */
export function modelCost(
  m: ClientModel,
  data: ClientData,
  allowed: Set<string> | null,
  inputWeight = 10
): number | null {
  const r = rankedOffers(data.offersByFamily[m.family_key], allowed, inputWeight);
  if (r.length) return r[0].blended;
  if (!allowed) return blend(m.aa_ref_input, m.aa_ref_output, inputWeight);
  return null;
}

export function scoreOf(m: ClientModel, key: ScoreKey): number | null {
  return m.scores[key] ?? null;
}

/** Sensible default minimum for a score: DesignArena is Elo (~1000), AA indices ~35. */
export function defaultMinFor(score: ScoreKey): number {
  return score.startsWith("designarena") ? 1000 : 35;
}

// Chinese-based inference providers (matched by provider NAME). This targets the
// providers/endpoints, NOT the model labs — open-weight models from Chinese labs
// (GLM, Kimi, DeepSeek, Qwen, MiniMax, MiMo…) stay listed and get priced via the
// remaining non-Chinese providers (DeepInfra, Together, Fireworks, Novita, …).
export const CHINESE_PROVIDER_RE = /\b(alibaba|qwen|deepseek|zhipu|z\.?ai|glm|moonshot|kimi|baidu|ernie|wenxin|baichuan|siliconflow|silicon\s*flow|tencent|hunyuan|bytedance|volcengine|volc|doubao|stepfun|minimax|iflytek|01\.?ai|inclusionai|ant\s*group|xiaomi|mimo|sensetime|modelscope|infinigence|infini-?ai|gitee)\b/i;

export function isChineseProvider(name: string): boolean {
  return CHINESE_PROVIDER_RE.test(name);
}

export function chineseProviderKeys(providers: { key: string; provider: string }[]): Set<string> {
  return new Set(providers.filter((p) => isChineseProvider(p.provider)).map((p) => p.key));
}

/** Combine an explicit provider allow-list with the "exclude Chinese providers"
 *  toggle into a single allowed-key set (null = all providers). */
export function effectiveAllowed(
  providerSet: Set<string> | null,
  excludeChinese: boolean,
  providers: { key: string; provider: string }[]
): Set<string> | null {
  if (!providerSet && !excludeChinese) return null;
  const base = providerSet ? new Set(providerSet) : new Set(providers.map((p) => p.key));
  if (excludeChinese) for (const k of chineseProviderKeys(providers)) base.delete(k);
  return base;
}

// "Unauthorized" frontier models to hide by default (GPT-5.5*, Claude Opus 4.8,
// Claude Fable). Matched on family_key, so all variants are covered.
export const UNAUTHORIZED_FAMILY_RE = /^(gpt-5\.5|claude-opus-4\.8|claude-fable)/;
export function isUnauthorizedModel(familyKey: string): boolean {
  return UNAUTHORIZED_FAMILY_RE.test(familyKey);
}

// Provider-filter presets (point 5).
export const PROVIDER_PRESETS: { label: string; match: (p: { platform: string; provider: string }) => boolean }[] = [
  { label: "Hyperscalers + 1st-party", match: (p) => ["AWS Bedrock", "Azure AI Foundry", "Anthropic API / Claude Code"].includes(p.platform) },
  { label: "Open-source market (OpenRouter)", match: (p) => p.platform === "OpenRouter" },
  { label: "Chutes / Nebius / DeepInfra", match: (p) => /chutes|nebius|deepinfra/i.test(p.provider) },
];
