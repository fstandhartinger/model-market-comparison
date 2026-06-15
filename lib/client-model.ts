import type { Dataset, ModelRow } from "./types";
import { cheapestOffers, modelCost, blendedCost, tokenOffers } from "./data";

export interface ClientOffer {
  source: string; provider: string; platform: string;
  input_per_1m: number | null; output_per_1m: number | null;
  region: string; blended: number; estimated?: boolean; notes?: string;
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
  scores: {
    aa_coding_index: number | null;
    aa_intelligence_index: number | null;
    designarena_frontend: number | null;
    designarena_fullstack: number | null;
  };
  cost10to1: number | null;
  cheapest: ClientOffer[];
  offer_count: number;
  cheapest_platform: string | null;
  copilot_usd_per_request: number | null;
}

export function toClientModel(m: ModelRow): ClientModel {
  const cheapest = cheapestOffers(m, 5).map((o) => ({
    source: o.source, provider: o.provider, platform: o.platform,
    input_per_1m: o.input_per_1m, output_per_1m: o.output_per_1m,
    region: o.region, blended: o.blended, estimated: o.estimated, notes: o.notes,
  }));
  return {
    id: m.id,
    family_key: m.family_key,
    family_name: m.family_name,
    display_name: m.display_name,
    org: m.org,
    variant: m.variant,
    open_weights: m.open_weights,
    featured: m.featured,
    scores: {
      aa_coding_index: m.benchmarks?.aa_coding_index ?? null,
      aa_intelligence_index: m.benchmarks?.aa_intelligence_index ?? null,
      designarena_frontend: m.designarena?.frontend?.elo ?? null,
      designarena_fullstack: m.designarena?.fullstack?.elo ?? null,
    },
    cost10to1: modelCost(m),
    cheapest,
    offer_count: tokenOffers(m).length,
    cheapest_platform: cheapest[0]?.platform ?? null,
    copilot_usd_per_request: m.copilot?.usd_per_request ?? null,
  };
}

export function clientRows(ds: Dataset): ClientModel[] {
  return ds.models.map(toClientModel);
}
