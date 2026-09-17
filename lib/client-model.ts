import type { Dataset, ModelRow, ScoreKey, TokenEfficiency, EfficiencyDataset } from "./types";
import { compositeEvidenceCount, computeCompositeScoreDetails } from "./composite.mjs";
import { deterministicFamilyRepresentative } from "./family-representative.mjs";
import type { BenchmarkComparison } from "./benchmark-comparison.mjs";

export interface ClientBenchmaxxing {
  score: number | null;
  signal: boolean;
  /** CR-42.2: 'strong' = the tag (top BENCHMAXX_TAG_SHARE), 'weak' = the next band up to BENCHMAXX_WEAK_SHARE. */
  level?: "strong" | "weak" | null;
  /** F-104: the family's scored representative — the Benchmaxxing report whose score the tag shows. */
  reportId?: string;
}

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
  /** R4.10: true/false = OpenRouter publishes a policy for the serving provider and it
   *  does / does not satisfy "Does not train" + "Zero retention". Undefined = unknown. */
  data_private?: boolean;
}

export type CompositeSlot =
  | "aa_coding_index"
  | "aa_coding_agent"
  | "aa_intelligence_index"
  | "epoch_eci"
  | "epoch_eci_software"
  | "designarena_frontend"
  | "designarena_fullstack";

/** CR-65.1: composite slots whose sources publish at model-family scope (no effort setting). Only these are
 *  shared with a family's other configurations; the AA indices stay on the configuration AA measured. */
export const FAMILY_SCOPE_SLOTS = ["epoch_eci", "epoch_eci_software", "designarena_frontend", "designarena_fullstack"] as const;
export type FamilyScopeSlot = (typeof FAMILY_SCOPE_SLOTS)[number];

export interface CompositeAttachment {
  /** The catalog row that supplied the displayed value, when there is one. */
  sourceModelId: string | null;
  /** Short, user-facing provenance for an attached value. */
  label: string;
  note: string;
}

export interface ClientModel {
  token_efficiency?: TokenEfficiency;
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
    epoch_eci: number | null;
    epoch_eci_software: number | null;
    designarena_frontend: number | null;
    designarena_fullstack: number | null;
    cat_coding: number | null;
    cat_agentic: number | null;
    cat_science: number | null;
    cat_long_context: number | null;
  };
  composite_base: number | null;
  composite_coverage: number;
  /** Composite slots filled by an attached (family- or product-scope) value; see F-41. */
  composite_attached: number;
  /** Composite values used for this row but not measured on this exact configuration. */
  composite_attachments: Partial<Record<CompositeSlot, CompositeAttachment>>;
  /** Distinct registry benchmarks this model has a usable result for (R2.2). Not the
   *  same as `composite_coverage`, which counts the seven composite slots only. */
  benchmark_count: number;
  offer_count: number;
  aa_ref_input: number | null;
  aa_ref_output: number | null;
  copilot_multiplier: number | null;
  copilot_usd_per_request: number | null;
  /** Coverage-aware topic-local inconsistency signal. Estimates are never used. */
  benchmaxxing_score?: number | null;
  benchmaxxing_signal?: boolean;
  benchmaxxing_level?: "strong" | "weak" | null;
  benchmaxxing_report_id?: string;
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
  /** CR-42.3: the provider's official website, curated in data/raw/provider-meta.json with a dated verification. */
  website?: string | null;
}

export interface FamilyOption { key: string; name: string; org: string }

export interface ClientData {
  efficiency?: EfficiencyDataset;
  sourceDates?: Record<string, string>;
  generated_at: string;
  models: ClientModel[];
  offersByFamily: Record<string, ClientOffer[]>;
  offersByModel: Record<string, ClientOffer[]>;
  providers: ProviderInfo[];
  families: FamilyOption[];
  /** H3: current measured or explicitly bridged comparison values for the Advanced filter. */
  comparison?: BenchmarkComparison;
}

/** Whether a displayed score is backed by at least one source result. Composite
 * may be the neutral 50 fallback even when this returns false. */
export function hasScoreEvidence(model: ClientModel, score: ScoreKey): boolean {
  return score === "composite" ? model.composite_coverage > 0 : model.scores[score] != null;
}

/** F-41: a Composite looks thin when fewer than three of its seven slots hold any value,
 *  exact or attached. Attached inputs are disclosed separately, not treated as missing. */
export function isThinComposite(model: Pick<ClientModel, "composite_coverage" | "composite_attached">): boolean {
  return model.composite_coverage + model.composite_attached < 3;
}

/** CR-65.4 (data & math gauntlet C5): ranked by the Composite, rows with fewer than three of seven inputs sit in
 *  an "insufficient evidence" band below every measured row, in either direction; inside each band the value
 *  decides. Other scores are single measurements and sort by value only. Missing values sink as before. */
export function compareByScore(
  a: { m: Pick<ClientModel, "composite_coverage" | "composite_attached">; sc: number | null | undefined },
  b: { m: Pick<ClientModel, "composite_coverage" | "composite_attached">; sc: number | null | undefined },
  score: ScoreKey,
  dir: 1 | -1,
): number {
  if (score === "composite") {
    const band = Number(isThinComposite(a.m)) - Number(isThinComposite(b.m));
    if (band) return band;
  }
  return dir * ((a.sc ?? -Infinity) - (b.sc ?? -Infinity));
}

function offerKey(platform: string, provider: string) {
  return `${platform}::${provider}`;
}

export function clientData(ds: Dataset, benchmaxxing: Record<string, ClientBenchmaxxing> = {}): ClientData {
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
    data_private: o.data_private,
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
      token_efficiency: m.token_efficiency,
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
        composite: null, // filled below from the seven benchmark slots
        aa_coding_index: m.benchmarks?.aa_coding_index ?? null,
        aa_coding_agent: m.benchmarks?.aa_coding_agent_index ?? null,
        aa_intelligence_index: m.benchmarks?.aa_intelligence_index ?? null,
        epoch_eci: m.benchmarks?.epoch_eci ?? null,
        epoch_eci_software: m.benchmarks?.epoch_eci_software ?? null,
        designarena_frontend: m.designarena?.frontend?.elo ?? null,
        designarena_fullstack: m.designarena?.fullstack?.elo ?? null,
        cat_coding: m.category_scores?.cat_coding ?? null,
        cat_agentic: m.category_scores?.cat_agentic ?? null,
        cat_science: m.category_scores?.cat_science ?? null,
        cat_long_context: m.category_scores?.cat_long_context ?? null,
      },
      composite_base: null,
      composite_coverage: 0,
      composite_attached: 0,
      composite_attachments: {},
      benchmark_count: ds.benchmark_results?.coverage?.by_model?.[m.id]?.capability_available
        ?? ds.benchmark_results?.coverage?.by_model?.[m.id]?.available ?? 0,
      offer_count: (offersByModel[m.id] || []).length,
      aa_ref_input: m.aa_reference_price?.input_per_1m ?? null,
      aa_ref_output: m.aa_reference_price?.output_per_1m ?? null,
      copilot_multiplier: m.copilot?.multiplier ?? null,
      copilot_usd_per_request: m.copilot?.usd_per_request ?? null,
      ...(Object.prototype.hasOwnProperty.call(benchmaxxing, m.id)
        ? { benchmaxxing_score: benchmaxxing[m.id].score, benchmaxxing_signal: benchmaxxing[m.id].signal, benchmaxxing_level: benchmaxxing[m.id].level ?? (benchmaxxing[m.id].signal ? "strong" : null), benchmaxxing_report_id: benchmaxxing[m.id].reportId ?? m.id }
        : {}),
    };
  });

  // Seven conceptual slots: three AA indices, two Epoch ECI indices, plus separate,
  // reliability-gated DesignArena Frontend and Full-Stack values. Each observed source value is
  // percentile-normalized; every missing slot inherits the model's mean observed
  // percentile. An evidence-free row receives 50 but keeps coverage 0 so it cannot
  // masquerade as a measured family representative.
  const rawById = new Map(ds.models.map((m) => [m.id, m]));
  // FAMILY-SCOPE ATTACHMENT (CR-65.1, supersedes the earlier "family's best value" backfill). Only sources that
  // publish a result for a model family without an effort setting — Epoch ECI, Epoch Software ECI and
  // DesignArena — are shared with a family's other configurations. AA Coding, AA Intelligence and the Coding
  // Agent Index are measured per effort setting and never move to a sibling: a non-reasoning row does not
  // inherit the max row's AA Intelligence. There is no family maximum either: a family-scope value is shared
  // only when every configuration that carries it agrees, otherwise only the family representative's own value
  // is shared, otherwise nothing; and a current row never borrows from a deprecated sibling.
  const familyRows = new Map<string, ModelRow[]>();
  for (const raw of ds.models) {
    if (!familyRows.has(raw.family_key)) familyRows.set(raw.family_key, []);
    familyRows.get(raw.family_key)!.push(raw);
  }
  const slotValue = (row: ModelRow, slot: CompositeSlot): number | null => {
    if (slot === "aa_coding_index") return row.benchmarks?.aa_coding_index ?? null;
    if (slot === "aa_coding_agent") return row.benchmarks?.aa_coding_agent_index ?? null;
    if (slot === "aa_intelligence_index") return row.benchmarks?.aa_intelligence_index ?? null;
    if (slot === "epoch_eci") return row.benchmarks?.epoch_eci ?? null;
    if (slot === "epoch_eci_software") return row.benchmarks?.epoch_eci_software ?? null;
    return row.designarena?.[slot === "designarena_frontend" ? "frontend" : "fullstack"]?.elo ?? null;
  };
  const familyDonor = (row: ModelRow, slot: FamilyScopeSlot): ModelRow | null => {
    const rows = familyRows.get(row.family_key) ?? [];
    const donors = rows.filter((c) => c.id !== row.id && slotValue(c, slot) != null && (row.deprecated === true || c.deprecated !== true))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!donors.length) return null;
    const representative = deterministicFamilyRepresentative(row.family_key, rows) as ModelRow | undefined;
    const named = donors.find((c) => c.id === representative?.id) ?? null;
    if (new Set(donors.map((c) => slotValue(c, slot))).size === 1) return named ?? donors[0];
    return named;
  };
  const slotLabels: Record<CompositeSlot, string> = {
    aa_coding_index: "AA Coding",
    aa_coding_agent: "Coding Agent",
    aa_intelligence_index: "AA Intelligence",
    epoch_eci: "Epoch ECI",
    epoch_eci_software: "Software ECI",
    designarena_frontend: "DesignArena Frontend",
    designarena_fullstack: "DesignArena Full-Stack",
  };
  const attachmentMaps = new Map<string, Partial<Record<CompositeSlot, CompositeAttachment>>>();
  const donors = new Map<string, Partial<Record<FamilyScopeSlot, ModelRow>>>();
  for (const model of models) {
    const raw = rawById.get(model.id)!;
    const attached: Partial<Record<CompositeSlot, CompositeAttachment>> = {};
    const borrowed: Partial<Record<FamilyScopeSlot, ModelRow>> = {};
    const add = (slot: CompositeSlot, sourceModelId: string | null, note: string) => {
      attached[slot] = { sourceModelId, label: slotLabels[slot], note };
    };
    for (const slot of FAMILY_SCOPE_SLOTS) {
      const eci = slot === "epoch_eci" || slot === "epoch_eci_software";
      const ownNote = eci ? raw.epoch_eci_attachment_note : raw.designarena_attachment_note;
      if (slotValue(raw, slot) != null) {
        if (ownNote) add(slot, null, ownNote);
        continue;
      }
      const donor = familyDonor(raw, slot);
      if (!donor) continue;
      borrowed[slot] = donor;
      const donorNote = eci ? donor.epoch_eci_attachment_note ?? "Epoch AI publishes this at family scope." : donor.designarena_attachment_note ?? "DesignArena publishes this at product/family scope.";
      add(slot, donor.id, `Attached from ${donor.display_name}; ${donorNote}`);
    }
    attachmentMaps.set(model.id, attached);
    donors.set(model.id, borrowed);
    model.composite_attachments = attached;
  }
  // The registry coverage contains the versioned secondary benchmark catalog. The six
  // headline axes below are retained from their own primary snapshots rather than copied
  // into that registry, so count exact (non-attached) headline observations as well. The
  // Coding Agent slot is already versioned in the registry and is intentionally excluded.
  const headlineSlots: CompositeSlot[] = ["aa_coding_index", "aa_intelligence_index", "epoch_eci", "epoch_eci_software", "designarena_frontend", "designarena_fullstack"];
  for (const model of models) {
    const raw = rawById.get(model.id)!;
    const exactHeadlineCount = headlineSlots.filter((slot) => slotValue(raw, slot) != null && !model.composite_attachments[slot]).length;
    model.benchmark_count += exactHeadlineCount;
  }
  // Coverage counts a row's exact, non-attached measurements only (pre-backfill): backfilled slots make
  // every sibling inherit the family maxima, so counting them would let a never-measured
  // catalog row (e.g. a bare OpenRouter listing) pose as the family's measured
  // representative and win the collapse pick. Evaluated BEFORE the display backfill below.
  const coverage = new Map(models.map((m) => {
    const raw = rawById.get(m.id);
    const rawCount = compositeEvidenceCount({
      id: m.id,
      scores: m.scores,
      designarenaBattles: {
        frontend: raw?.designarena?.frontend?.battles ?? null,
        fullstack: raw?.designarena?.fullstack?.battles ?? null,
      },
    });
    const attachedOwnSlots = Object.keys(attachmentMaps.get(m.id) ?? {})
      .filter((slot) => slotValue(raw!, slot as CompositeSlot) != null).length;
    return [m.id, Math.max(0, rawCount - attachedOwnSlots)];
  }));
  // DISPLAY: a family-scope value shared above is shown everywhere (Compare, model detail, metric sorting), not
  // only inside the composite. Effort-specific AA values stay on the configuration that was measured.
  const compositeInputs = models.map((m) => {
    const raw = rawById.get(m.id);
    const borrowed = donors.get(m.id) ?? {};
    const share = (slot: FamilyScopeSlot) => (borrowed[slot] ? slotValue(borrowed[slot]!, slot) : null);
    const ownDf = m.scores.designarena_frontend;
    const ownDs = m.scores.designarena_fullstack;
    m.scores.epoch_eci = m.scores.epoch_eci ?? share("epoch_eci");
    m.scores.epoch_eci_software = m.scores.epoch_eci_software ?? share("epoch_eci_software");
    m.scores.designarena_frontend = ownDf ?? share("designarena_frontend");
    m.scores.designarena_fullstack = ownDs ?? share("designarena_fullstack");
    return {
      id: m.id,
      scores: m.scores,
      designarenaBattles: {
        frontend: (ownDf != null ? raw : borrowed.designarena_frontend)?.designarena?.frontend?.battles ?? null,
        fullstack: (ownDs != null ? raw : borrowed.designarena_fullstack)?.designarena?.fullstack?.battles ?? null,
      },
    };
  });
  const { scores: composites, baseScores } = computeCompositeScoreDetails(compositeInputs);
  for (const m of models) {
    m.scores.composite = composites.get(m.id) ?? 50;
    m.composite_base = baseScores.get(m.id) ?? 50;
    m.composite_coverage = coverage.get(m.id) ?? 0;
    m.composite_attached = Math.min(7 - m.composite_coverage, Object.keys(m.composite_attachments).length);
  }

  const providers: ProviderInfo[] = ds.providers.map((p) => ({
    key: offerKey(p.platform, p.provider), platform: p.platform, provider: p.provider, model_count: p.model_count,
    eu_hosted: (p as ProviderInfo).eu_hosted, eu_dedicated: (p as ProviderInfo).eu_dedicated, non_us: (p as ProviderInfo).non_us, hyperscaler: (p as ProviderInfo).hyperscaler,
    country: (p as ProviderInfo).country, note: (p as ProviderInfo).note, coming_soon: (p as ProviderInfo).coming_soon, website: (p as ProviderInfo).website ?? null,
  }));

  const famMap = new Map<string, FamilyOption>();
  for (const m of models) if (!famMap.has(m.family_key)) famMap.set(m.family_key, { key: m.family_key, name: m.family_name, org: m.org });
  const families = [...famMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return { generated_at: ds.generated_at, efficiency: ds.efficiency, sourceDates: ds.sources, models, offersByFamily, offersByModel, providers, families };
}
