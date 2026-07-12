import type { Dataset, ModelRow } from "./types";
import { computeCompositeScores } from "./composite.mjs";

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
    eu_hosted: o.eu_hosted, non_us: o.non_us,
  });
  for (const m of ds.models) {
    const exact = (m.offers || []).filter((offer) => offer.unit === "per_1m_token").map(toClientOffer);
    offersByModel[m.id] = exact;
    if (!offersByFamily[m.family_key]) offersByFamily[m.family_key] = [];
    if (!familyOfferKeys.has(m.family_key)) familyOfferKeys.set(m.family_key, new Set());
    const seen = familyOfferKeys.get(m.family_key)!;
    for (const offer of exact) {
      const signature = [offer.key, offer.region, offer.tee ? 1 : 0, offer.eu_hosted ? 1 : 0,
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
        composite: null, // filled below from the five fixed benchmark slots
        aa_coding_index: m.benchmarks?.aa_coding_index ?? null,
        aa_coding_agent: m.benchmarks?.aa_coding_agent_index ?? null,
        aa_intelligence_index: m.benchmarks?.aa_intelligence_index ?? null,
        designarena_frontend: m.designarena?.frontend?.elo ?? null,
        designarena_fullstack: m.designarena?.fullstack?.elo ?? null,
      },
      offer_count: (offersByModel[m.id] || []).length,
      aa_ref_input: m.aa_reference_price?.input_per_1m ?? null,
      aa_ref_output: m.aa_reference_price?.output_per_1m ?? null,
      copilot_multiplier: m.copilot?.multiplier ?? null,
      copilot_usd_per_request: m.copilot?.usd_per_request ?? null,
    };
  });

  // Five equally weighted fixed slots: three AA indices plus separate, reliability-
  // gated DesignArena Frontend and Full-Stack values. Missing slots contribute the
  // neutral value 50; a coverage-safe dominance adjustment can only raise a leader.
  const rawById = new Map(ds.models.map((m) => [m.id, m]));
  const composites = computeCompositeScores(models.map((m) => {
    const raw = rawById.get(m.id);
    return {
      id: m.id,
      scores: m.scores,
      designarenaBattles: {
        frontend: raw?.designarena?.frontend?.battles ?? null,
        fullstack: raw?.designarena?.fullstack?.battles ?? null,
      },
    };
  }));
  for (const m of models) m.scores.composite = composites.get(m.id) ?? null;

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
