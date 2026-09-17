import type { ClientModel, ClientOffer } from "./client-model";
import type { ScoreKey } from "./types";
import { hasScoreEvidence } from "./client-model";
import { scopeFromSettings, offerMatchesScope } from "./cost";
import { preferredVariantIds } from "./variants";
import type { PresetCandidate } from "./presets.mjs";

/** CR-1.2: the slim model record the Benchmarks page ships instead of the full client catalog. */
export type MatrixModel = Pick<ClientModel, "id" | "family_key" | "family_name" | "display_name" | "org" | "variant" | "open_weights" | "featured" | "deprecated" | "scores" | "composite_raw" | "composite_coverage" | "benchmark_count"> & {
  /** Same family rule as `selectableModels` (computed over the whole catalog on the server). */
  family_alive: boolean;
  /** Adjusted $/task at the AA reference list price; used only when no filter restricts routes (as `modelPrice`). */
  ref_cost?: number | null;
};
/** `cost`: the route's adjusted $/task at the default adjusted settings (CR-2.4 Best value). */
export type MatrixOffer = Pick<ClientOffer, "key" | "tee" | "eu_hosted" | "data_private" | "region"> & { cost?: number | null };
export interface MatrixFilterData {
  models: MatrixModel[];
  offers: Record<string, MatrixOffer[]>;
  providers: { key: string; provider: string; country?: string | null; non_us?: boolean }[];
}
export interface TopModelSettings {
  score: ScoreKey;
  hideDeprecated: boolean;
  collapse: boolean;
  openOnly: boolean;
  featured: boolean;
  familySet: Set<string> | null;
  excludedSet: Set<string> | null;
  hostedIn: readonly string[];
  providerBasedIn: readonly string[];
  labAllowed: ((org: string) => boolean) | null;
  allowDataTraining: boolean;
}

/** Every catalog configuration that passes the global filters — the same rules the overview applies
 *  before its shortlist sliders: hide deprecated families, one variant per family, open weights,
 *  Featured, families, score evidence, and at least one provider route inside the regional /
 *  confidentiality / data-policy scope. Each carries its cheapest in-scope adjusted cost and
 *  whether any route is EU-hosted, for the model presets (CR-2.4). */
export function filteredCandidates(data: MatrixFilterData, s: TopModelSettings): (MatrixModel & PresetCandidate)[] {
  const scope = scopeFromSettings(s, data.providers);
  let r = s.hideDeprecated ? data.models.filter((m) => m.family_alive) : data.models;
  const preferred = preferredVariantIds(r as unknown as ClientModel[], s.score);
  if (s.collapse) r = r.filter((m) => !preferred.has(m.family_key) || preferred.get(m.family_key) === m.id);
  if (s.openOnly) r = r.filter((m) => m.open_weights);
  if (s.labAllowed) r = r.filter((m) => s.labAllowed!(m.org));
  if (s.featured) r = r.filter((m) => m.featured);
  if (s.familySet) r = r.filter((m) => s.familySet!.has(m.family_key));
  r = r.filter((m) => hasScoreEvidence(m as unknown as ClientModel, s.score) && m.scores[s.score] != null);
  const out: (MatrixModel & PresetCandidate)[] = [];
  for (const m of r) {
    const routes = (data.offers[m.id] ?? []).filter((o) => offerMatchesScope(o as ClientOffer, scope));
    if (!routes.length) continue;
    const priced = routes.map((o) => o.cost).filter((c): c is number => c != null && Number.isFinite(c));
    const cost = priced.length ? Math.min(...priced) : scope.restricted ? null : m.ref_cost ?? null;
    out.push({ ...m, eu: routes.some((o) => !!o.eu_hosted), cost });
  }
  return out;
}

/** The top-N catalog configurations by the active score under the global filters. */
export function topModelIds(data: MatrixFilterData, s: TopModelSettings, n: number): string[] {
  return filteredCandidates(data, s).sort((a, b) => (b.scores[s.score]! - a.scores[s.score]!) || a.id.localeCompare(b.id)).slice(0, n).map((m) => m.id);
}
