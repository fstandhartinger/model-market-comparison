import type { Dataset, ModelRow, Offer, ScoreKey } from "./types";
import bundled from "../data/dataset.json";
import { loadFromDb } from "./db";

let cache: { at: number; data: Dataset } | null = null;
const TTL = 5 * 60 * 1000;

/** The dataset, sourced from Postgres when DATABASE_URL is set & seeded,
 *  otherwise from the committed data/dataset.json snapshot. */
export async function getDataset(): Promise<Dataset> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  let data = bundled as unknown as Dataset;
  let from = "bundled";
  if (process.env.DATABASE_URL) {
    try {
      const db = await loadFromDb();
      if (db && db.models.length) { data = db; from = "postgres"; }
    } catch (e) {
      console.warn("[data] DB load failed, using bundled snapshot:", (e as Error).message);
    }
  }
  (data as Dataset & { _source?: string })._source = from;
  cache = { at: Date.now(), data };
  return data;
}

export function clearCache() { cache = null; }

// --- Pricing helpers -------------------------------------------------------

/** Blended $/1M tokens for an input:output weighting (default 10:1). */
export function blendedCost(input: number | null, output: number | null, inputWeight = 10): number | null {
  if (input == null && output == null) return null;
  const i = input ?? output ?? 0;
  const o = output ?? input ?? 0;
  return (inputWeight * i + o) / (inputWeight + 1);
}

export function tokenOffers(model: ModelRow): Offer[] {
  return (model.offers || []).filter((o) => o.unit === "per_1m_token" && (o.input_per_1m != null || o.output_per_1m != null));
}

/** Cheapest token offers by 10:1 blended cost. */
export function cheapestOffers(model: ModelRow, n = 5, inputWeight = 10): (Offer & { blended: number })[] {
  return tokenOffers(model)
    .map((o) => ({ ...o, blended: blendedCost(o.input_per_1m, o.output_per_1m, inputWeight) ?? Infinity }))
    .filter((o) => Number.isFinite(o.blended))
    .sort((a, b) => a.blended - b.blended)
    .slice(0, n);
}

/** Representative (cheapest) blended cost for the cost axis of the scatter. */
export function modelCost(model: ModelRow, inputWeight = 10): number | null {
  const c = cheapestOffers(model, 1, inputWeight);
  if (c.length) return c[0].blended;
  const ref = model.aa_reference_price;
  return blendedCost(ref?.input_per_1m ?? null, ref?.output_per_1m ?? null, inputWeight);
}

// --- Score helpers ---------------------------------------------------------

export function scoreOf(model: ModelRow, key: ScoreKey): number | null {
  switch (key) {
    case "aa_coding_index": return model.benchmarks?.aa_coding_index ?? null;
    case "aa_intelligence_index": return model.benchmarks?.aa_intelligence_index ?? null;
    case "designarena_frontend": return model.designarena?.frontend?.elo ?? null;
    case "designarena_fullstack": return model.designarena?.fullstack?.elo ?? null;
    case "composite": return null; // blended score is computed client-side (needs cross-model normalization)
  }
}
