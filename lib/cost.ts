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

// Provider-filter presets (point 5).
export const PROVIDER_PRESETS: { label: string; match: (p: { platform: string; provider: string }) => boolean }[] = [
  { label: "Hyperscalers + 1st-party", match: (p) => ["AWS Bedrock", "Azure AI Foundry", "Anthropic API / Claude Code"].includes(p.platform) },
  { label: "Open-source market (OpenRouter)", match: (p) => p.platform === "OpenRouter" },
  { label: "Chutes / Nebius / DeepInfra", match: (p) => /chutes|nebius|deepinfra/i.test(p.provider) },
];
