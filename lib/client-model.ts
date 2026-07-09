import type { Dataset, ModelRow } from "./types";
import { tokenOffers } from "./data";

export interface ClientOffer {
  key: string; // `${platform}::${provider}`
  source: string;
  provider: string;
  platform: string;
  input_per_1m: number | null;
  output_per_1m: number | null;
  region: string;
  estimated?: boolean;
  notes?: string;
  tee?: boolean;
}

export interface ClientModel {
  id: string;
  family_key: string;
  family_name: string;
  display_name: string;
  org: string;
  variant: string;
  open_weights: boolean;
  featured: boolean;
  release_date: string | null;
  scores: {
    composite: number | null;
    aa_coding_index: number | null;
    aa_coding_agent: number | null;
    aa_intelligence_index: number | null;
    designarena_frontend: number | null;
    designarena_fullstack: number | null;
  };
  offer_count: number;
  aa_ref_input: number | null;
  aa_ref_output: number | null;
  copilot_multiplier: number | null;
  copilot_usd_per_request: number | null;
}

export interface ProviderInfo {
  key: string;
  platform: string;
  provider: string;
  model_count: number;
  eu_hosted?: boolean;
  non_us?: boolean;
  hyperscaler?: boolean;
  country?: string | null;
  note?: string;
  coming_soon?: boolean;
}

export interface FamilyOption { key: string; name: string; org: string }

export interface ClientData {
  generated_at: string;
  models: ClientModel[];
  offersByFamily: Record<string, ClientOffer[]>;
  providers: ProviderInfo[];
  families: FamilyOption[];
}

function offerKey(platform: string, provider: string) {
  return `${platform}::${provider}`;
}

export function clientData(ds: Dataset): ClientData {
  const offersByFamily: Record<string, ClientOffer[]> = {};
  const seenFamily = new Set<string>();
  const models: ClientModel[] = ds.models.map((m: ModelRow) => {
    if (!seenFamily.has(m.family_key)) {
      seenFamily.add(m.family_key);
      offersByFamily[m.family_key] = tokenOffers(m).map((o) => ({
        key: offerKey(o.platform, o.provider),
        source: o.source, provider: o.provider, platform: o.platform,
        input_per_1m: o.input_per_1m, output_per_1m: o.output_per_1m,
        region: o.region, estimated: o.estimated, notes: o.notes, tee: o.tee,
      }));
    }
    return {
      id: m.id,
      family_key: m.family_key,
      family_name: m.family_name,
      display_name: m.display_name,
      org: m.org,
      variant: m.variant,
      open_weights: m.open_weights,
      featured: m.featured,
      release_date: m.release_date,
      scores: {
        composite: null, // filled in below once cross-model ranges are known
        aa_coding_index: m.benchmarks?.aa_coding_index ?? null,
        aa_coding_agent: m.benchmarks?.aa_coding_agent_index ?? null,
        aa_intelligence_index: m.benchmarks?.aa_intelligence_index ?? null,
        designarena_frontend: m.designarena?.frontend?.elo ?? null,
        designarena_fullstack: m.designarena?.fullstack?.elo ?? null,
      },
      offer_count: (offersByFamily[m.family_key] || []).length,
      aa_ref_input: m.aa_reference_price?.input_per_1m ?? null,
      aa_ref_output: m.aa_reference_price?.output_per_1m ?? null,
      copilot_multiplier: m.copilot?.multiplier ?? null,
      copilot_usd_per_request: m.copilot?.usd_per_request ?? null,
    };
  });

  // Composite score: a blend over FOUR equally-weighted slots — AA Coding, AA Coding-Agent,
  // AA Intelligence, and a single combined DesignArena slot (average of the frontend &
  // full-stack Elo). Each metric is min-max normalized 0–100 across all models first.
  //
  // DesignArena is deliberately ONE slot, not two: it's a narrow web-dev-arena signal that
  // only covers ~30 models, so counting frontend + full-stack separately over-weighted it
  // (40% of the score) and let it flip the overall ranking — e.g. Opus 4.8 edging out
  // Fable 5 despite Fable leading every AA capability index. At 25% it still counts without
  // dominating the general-capability signal.
  //
  // Missing slots are IMPUTED (partial pooling): a gap is filled with the mean of (that
  // slot's field average) and (the model's own average of the slots it does have). Plain
  // "mean of present" is wrong — it lets a model carrying only the metrics it's strong on
  // outrank one measured (and weaker) on a benchmark the first simply lacks. Shrinkage keeps
  // missing data from inflating a score without unfairly sinking strong-but-partly-unbenchmarked models.
  const metricKeys = ["aa_coding_index", "aa_coding_agent", "aa_intelligence_index", "designarena_frontend", "designarena_fullstack"] as const;
  const ranges: Record<string, { min: number; max: number; mean: number } | null> = {};
  for (const k of metricKeys) {
    const vals = models.map((m) => m.scores[k]).filter((v): v is number => v != null);
    ranges[k] = vals.length ? { min: Math.min(...vals), max: Math.max(...vals), mean: vals.reduce((a, b) => a + b, 0) / vals.length } : null;
  }
  const normOf = (k: (typeof metricKeys)[number], v: number) => {
    const r = ranges[k]; if (!r) return null;
    return r.max > r.min ? ((v - r.min) / (r.max - r.min)) * 100 : 100;
  };
  const nm = (m: (typeof models)[number], k: (typeof metricKeys)[number]) => (m.scores[k] != null ? normOf(k, m.scores[k] as number) : null);
  // The four composite slots. `da` = average of whichever DesignArena boards a model is on.
  const slots = ["aa_coding_index", "aa_coding_agent", "aa_intelligence_index", "da"] as const;
  const slotValue = (m: (typeof models)[number], slot: (typeof slots)[number]): number | null => {
    if (slot !== "da") return nm(m, slot as (typeof metricKeys)[number]);
    const da = [nm(m, "designarena_frontend"), nm(m, "designarena_fullstack")].filter((v): v is number => v != null);
    return da.length ? da.reduce((a, b) => a + b, 0) / da.length : null;
  };
  const daFieldMean = [ranges.designarena_frontend, ranges.designarena_fullstack]
    .map((r, i) => (r ? normOf(i === 0 ? "designarena_frontend" : "designarena_fullstack", r.mean) : null))
    .filter((v): v is number => v != null);
  const fieldMean: Record<string, number | null> = {
    aa_coding_index: ranges.aa_coding_index ? normOf("aa_coding_index", ranges.aa_coding_index.mean) : null,
    aa_coding_agent: ranges.aa_coding_agent ? normOf("aa_coding_agent", ranges.aa_coding_agent.mean) : null,
    aa_intelligence_index: ranges.aa_intelligence_index ? normOf("aa_intelligence_index", ranges.aa_intelligence_index.mean) : null,
    da: daFieldMean.length ? daFieldMean.reduce((a, b) => a + b, 0) / daFieldMean.length : null,
  };
  for (const m of models) {
    const present = slots.map((sl) => slotValue(m, sl)).filter((v): v is number => v != null);
    if (!present.length) { m.scores.composite = null; continue; }
    const ownMean = present.reduce((a, b) => a + b, 0) / present.length;
    const filled = slots.map((sl) => {
      const v = slotValue(m, sl);
      if (v != null) return v;
      const fm = fieldMean[sl];
      return fm != null ? (fm + ownMean) / 2 : ownMean; // impute: shrink toward field mean
    });
    m.scores.composite = Math.round((filled.reduce((a, b) => a + b, 0) / filled.length) * 10) / 10;
  }

  const providers: ProviderInfo[] = ds.providers.map((p) => ({
    key: offerKey(p.platform, p.provider), platform: p.platform, provider: p.provider, model_count: p.model_count,
    eu_hosted: (p as ProviderInfo).eu_hosted, non_us: (p as ProviderInfo).non_us, hyperscaler: (p as ProviderInfo).hyperscaler,
    country: (p as ProviderInfo).country, note: (p as ProviderInfo).note, coming_soon: (p as ProviderInfo).coming_soon,
  }));

  const famMap = new Map<string, FamilyOption>();
  for (const m of models) if (!famMap.has(m.family_key)) famMap.set(m.family_key, { key: m.family_key, name: m.family_name, org: m.org });
  const families = [...famMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return { generated_at: ds.generated_at, models, offersByFamily, providers, families };
}
