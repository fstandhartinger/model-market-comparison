import type { Dataset, ModelRow, ScoreKey } from "./types";
import { compositeEvidenceCount, computeCompositeScoreDetails } from "./composite.mjs";

export interface ClientOffer {
  key: string; // `${platform}::${provider}`
  source: string;
  provider: string;
  platform: string;
  input_per_1m: number | null;
  output_per_1m: number | null;
  cache_read_per_1m?: number | null;
  cache_write_per_1m?: number | null;
  or_model_id?: string;
  or_canonical_slug?: string | null;
  or_hugging_face_id?: string | null;
  status?: number | null;
  endpoint_tag?: string | null;
  pricing_tier?: string | null;
  route_type?: string | null;
  region: string;
  estimated?: boolean;
  notes?: string;
  tee?: boolean;
  eu_hosted?: boolean;
  eu_policy_equivalent?: boolean;
  non_us?: boolean;
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
  deprecated?: boolean;
  scores: {
    composite: number | null;
    aa_coding_index: number | null;
    aa_coding_agent: number | null;
    aa_intelligence_index: number | null;
    designarena_frontend: number | null;
    designarena_fullstack: number | null;
  };
  composite_base: number | null;
  composite_coverage: number;
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
  eu_dedicated?: boolean;
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
  offersByModel: Record<string, ClientOffer[]>;
  providers: ProviderInfo[];
  families: FamilyOption[];
}

/** Whether a displayed score is backed by at least one source result. Composite
 * may be the neutral 50 fallback even when this returns false. */
export function hasScoreEvidence(model: ClientModel, score: ScoreKey): boolean {
  return score === "composite" ? model.composite_coverage > 0 : model.scores[score] != null;
}

function offerKey(platform: string, provider: string) {
  return `${platform}::${provider}`;
}

export function clientData(ds: Dataset): ClientData {
  const offersByFamily: Record<string, ClientOffer[]> = {};
  const offersByModel: Record<string, ClientOffer[]> = {};
  const familyOfferKeys = new Map<string, Set<string>>();
  const toClientOffer = (o: ModelRow["offers"][number]): ClientOffer => ({
    key: offerKey(o.platform, o.provider),
    source: o.source, provider: o.provider, platform: o.platform,
    input_per_1m: o.input_per_1m, output_per_1m: o.output_per_1m,
    cache_read_per_1m: o.cache_read_per_1m, cache_write_per_1m: o.cache_write_per_1m,
    or_model_id: o.or_model_id,
    or_canonical_slug: o.or_canonical_slug,
    or_hugging_face_id: o.or_hugging_face_id,
    status: o.status, endpoint_tag: o.endpoint_tag,
    pricing_tier: o.pricing_tier, route_type: o.route_type,
    region: o.region, estimated: o.estimated, notes: o.notes, tee: o.tee,
    eu_hosted: o.eu_hosted, eu_policy_equivalent: o.eu_policy_equivalent, non_us: o.non_us,
  });
  for (const m of ds.models) {
    const exact = (m.offers || []).filter((offer) => offer.unit === "per_1m_token").map(toClientOffer);
    offersByModel[m.id] = exact;
    if (!offersByFamily[m.family_key]) offersByFamily[m.family_key] = [];
    if (!familyOfferKeys.has(m.family_key)) familyOfferKeys.set(m.family_key, new Set());
    const seen = familyOfferKeys.get(m.family_key)!;
    for (const offer of exact) {
      const signature = [offer.key, offer.region, offer.tee ? 1 : 0, offer.eu_hosted ? 1 : 0,
        offer.eu_policy_equivalent ? 1 : 0,
        offer.input_per_1m, offer.output_per_1m, offer.cache_read_per_1m, offer.cache_write_per_1m,
        offer.or_model_id || "", offer.or_canonical_slug || "", offer.or_hugging_face_id || "", offer.endpoint_tag || "",
        offer.pricing_tier || "", offer.route_type || ""].join("::");
      if (seen.has(signature)) continue;
      seen.add(signature);
      offersByFamily[m.family_key].push(offer);
    }
  }
  const models: ClientModel[] = ds.models.map((m: ModelRow) => {
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
      deprecated: m.deprecated,
      scores: {
        composite: null, // filled below from the five benchmark slots
        aa_coding_index: m.benchmarks?.aa_coding_index ?? null,
        aa_coding_agent: m.benchmarks?.aa_coding_agent_index ?? null,
        aa_intelligence_index: m.benchmarks?.aa_intelligence_index ?? null,
        designarena_frontend: m.designarena?.frontend?.elo ?? null,
        designarena_fullstack: m.designarena?.fullstack?.elo ?? null,
      },
      composite_base: null,
      composite_coverage: 0,
      offer_count: (offersByModel[m.id] || []).length,
      aa_ref_input: m.aa_reference_price?.input_per_1m ?? null,
      aa_ref_output: m.aa_reference_price?.output_per_1m ?? null,
      copilot_multiplier: m.copilot?.multiplier ?? null,
      copilot_usd_per_request: m.copilot?.usd_per_request ?? null,
    };
  });

  // Five conceptual slots: three AA indices plus separate, reliability-gated
  // DesignArena Frontend and Full-Stack values. Each observed source value is
  // percentile-normalized; every missing slot inherits the model's mean observed
  // percentile. An evidence-free row receives 50 but keeps coverage 0 so it cannot
  // masquerade as a measured family representative.
  const rawById = new Map(ds.models.map((m) => [m.id, m]));
  // FAMILY BACKFILL: benchmark sources attach to different effort rows of the same
  // family (AA Coding/Intelligence on the flagship effort, Coding-Agent and DesignArena
  // on an alias row like "GPT-5.4 (medium)"), so no single row sees the family's full
  // evidence. A missing slot is therefore filled with the family's best REAL measurement
  // of that slot before imputation — a real sibling measurement beats assuming the
  // model's own mean percentile. Without this, whichever row represents a family is
  // punished for the slots that happen to live on its siblings (GPT-5.4 ranked below its
  // own mini/nano), and low-coverage rows game the imputation upward.
  const famBest = new Map<string, { c: number | null; ca: number | null; i: number | null; df: { elo: number; battles: number | null } | null; ds: { elo: number; battles: number | null } | null }>();
  for (const m of models) {
    const raw = rawById.get(m.id);
    const fb = famBest.get(m.family_key) ?? { c: null, ca: null, i: null, df: null, ds: null };
    const better = (a: number | null, b: number | null) => (a == null ? b : b == null ? a : Math.max(a, b));
    fb.c = better(fb.c, m.scores.aa_coding_index);
    fb.ca = better(fb.ca, m.scores.aa_coding_agent);
    fb.i = better(fb.i, m.scores.aa_intelligence_index);
    const df = m.scores.designarena_frontend;
    if (df != null && (fb.df == null || df > fb.df.elo)) fb.df = { elo: df, battles: raw?.designarena?.frontend?.battles ?? null };
    const dsv = m.scores.designarena_fullstack;
    if (dsv != null && (fb.ds == null || dsv > fb.ds.elo)) fb.ds = { elo: dsv, battles: raw?.designarena?.fullstack?.battles ?? null };
    famBest.set(m.family_key, fb);
  }
  // Coverage counts a row's OWN measurements only (pre-backfill): backfilled slots make
  // every sibling inherit the family maxima, so counting them would let a never-measured
  // catalog row (e.g. a bare OpenRouter listing) pose as the family's measured
  // representative and win the collapse pick. Evaluated BEFORE the display backfill below.
  const coverage = new Map(models.map((m) => {
    const raw = rawById.get(m.id);
    return [m.id, compositeEvidenceCount({
      id: m.id,
      scores: m.scores,
      designarenaBattles: {
        frontend: raw?.designarena?.frontend?.battles ?? null,
        fullstack: raw?.designarena?.fullstack?.battles ?? null,
      },
    })];
  }));
  // DISPLAY BACKFILL (user policy): a variant that lacks a metric inherits the family's
  // best measured value of that metric — shown everywhere (Compare, model detail, metric
  // sorting), not only inside the composite. A metric no variant of the family was ever
  // measured on stays empty (e.g. Opus 4.6 has no complete AA Coding / Coding-Agent
  // measurement at the source at all).
  const compositeInputs = models.map((m) => {
    const raw = rawById.get(m.id);
    const fb = famBest.get(m.family_key)!;
    const ownDf = m.scores.designarena_frontend;
    const ownDs = m.scores.designarena_fullstack;
    m.scores.aa_coding_index = m.scores.aa_coding_index ?? fb.c;
    m.scores.aa_coding_agent = m.scores.aa_coding_agent ?? fb.ca;
    m.scores.aa_intelligence_index = m.scores.aa_intelligence_index ?? fb.i;
    m.scores.designarena_frontend = ownDf ?? fb.df?.elo ?? null;
    m.scores.designarena_fullstack = ownDs ?? fb.ds?.elo ?? null;
    return {
      id: m.id,
      scores: m.scores,
      designarenaBattles: {
        frontend: ownDf != null ? raw?.designarena?.frontend?.battles ?? null : fb.df?.battles ?? null,
        fullstack: ownDs != null ? raw?.designarena?.fullstack?.battles ?? null : fb.ds?.battles ?? null,
      },
    };
  });
  const { scores: composites, baseScores } = computeCompositeScoreDetails(compositeInputs);
  for (const m of models) {
    m.scores.composite = composites.get(m.id) ?? 50;
    m.composite_base = baseScores.get(m.id) ?? 50;
    m.composite_coverage = coverage.get(m.id) ?? 0;
  }

  const providers: ProviderInfo[] = ds.providers.map((p) => ({
    key: offerKey(p.platform, p.provider), platform: p.platform, provider: p.provider, model_count: p.model_count,
    eu_hosted: (p as ProviderInfo).eu_hosted, eu_dedicated: (p as ProviderInfo).eu_dedicated, non_us: (p as ProviderInfo).non_us, hyperscaler: (p as ProviderInfo).hyperscaler,
    country: (p as ProviderInfo).country, note: (p as ProviderInfo).note, coming_soon: (p as ProviderInfo).coming_soon,
  }));

  const famMap = new Map<string, FamilyOption>();
  for (const m of models) if (!famMap.has(m.family_key)) famMap.set(m.family_key, { key: m.family_key, name: m.family_name, org: m.org });
  const families = [...famMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return { generated_at: ds.generated_at, models, offersByFamily, offersByModel, providers, families };
}
