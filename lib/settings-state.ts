import type { ScoreKey } from "./types";
import { DEFAULT_BLEND, DEFAULT_SCORE, FIXED_BLENDS, SCORE_OPTIONS, type PriceMode } from "./cost";

/** The persisted settings. Pure data plus the load/migration rules, so they are testable
 *  without React (components/SettingsContext.tsx wraps this in a context). */
export interface SettingsState {
  score: ScoreKey;
  collapse: boolean;       // one variant per GPT/Claude family
  featured: boolean;
  hideDeprecated: boolean; // hide benchmark-source rows marked deprecated (on by default)
  excludeChinese: boolean;  // hide Chinese-based inference providers (not their models)
  euHostedOnly: boolean;    // only exact offers hosted in the EU or explicitly policy-equivalent
  nonUsOnly: boolean;       // only providers whose company is not US-based
  openOnly: boolean;        // only open-weights models (off by default)
  // F-40: the score floor and the cost cap are split by mode. Simple's pair is written only by
  // Simple's two sliders and read only by Simple's list and map; every other view (Advanced,
  // Guided results, Charts, Compare, the EU table) reads and writes the Advanced pair. Before
  // the split, nudging a Simple slider silently filtered Advanced down to Simple's shortlist.
  minScore: number;         // Simple's floor (score-aware default until touched, R5.3)
  minScoreTouched: boolean;
  simpleMaxCost: number | null; // Simple's cost cap (R5.4); null = no limit
  advancedMinScore: number;     // 0 = no floor
  // F-16: Featured is mode-scoped. Simple applies `featured` (on by default), Advanced applies
  // nothing until the user sets Featured by hand, so it opens on the catalog.
  featuredTouched: boolean;
  teeOnly: boolean;        // "Strong confidential guarantees": only TEE / confidential-compute offers
  // R4.10: opt-in to INCLUDE providers that train on or retain your data. Unchecked by
  // default, so such providers are filtered out until the user asks for them.
  allowDataTraining: boolean;
  isCompany: boolean;       // R6.1: consumer subscriptions are not available to companies
  // R5.6: the Advanced/Guided limits. `null` means "no requirement" — deliberately not 0,
  // because 0 is a legitimate threshold and must not read as "unset".
  maxCost: number | null;        // Advanced's maximum adjusted cost per task (or raw blended $/1M)
  minIntelligence: number | null; // AA Intelligence Index floor (Guided / Advanced)
  minCoding: number | null;       // AA Coding Index floor (Guided / Advanced)
  providersExcluded: string[]; // BLOCKLIST of deselected provider keys; empty = all included (incl. future providers)
  families: string[];      // selected model family keys; empty = all
  priceMode: PriceMode;    // adjusted $/task (default) vs raw fixed-blend list prices
  inputWeight: number;     // raw mode's fixed input:output blend; persists while adjusted
}

export const SETTINGS_DEFAULTS: SettingsState = { score: DEFAULT_SCORE, collapse: true, featured: true, hideDeprecated: true, excludeChinese: false, euHostedOnly: false, nonUsOnly: false, openOnly: false, minScore: 86, minScoreTouched: false, simpleMaxCost: null, advancedMinScore: 0, featuredTouched: false, teeOnly: false, allowDataTraining: false, isCompany: false, maxCost: null, minIntelligence: null, minCoding: null, providersExcluded: [], families: [], priceMode: "adjusted", inputWeight: DEFAULT_BLEND };

const BLEND_VALUES = new Set(FIXED_BLENDS.map((b) => b.value));
export const isBlendValue = (n: number) => BLEND_VALUES.has(n);

/** Only known keys with a plausible type survive a load; anything else falls
 *  back to the defaults so a corrupted or stale payload cannot wedge the UI. */
export function sanitizeSettings(input: unknown): Partial<SettingsState> {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const out: Partial<SettingsState> = {};
  const bool = (v: unknown): v is boolean => typeof v === "boolean";
  const strArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
  const limit = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0);
  if (typeof raw.score === "string" && (SCORE_OPTIONS as string[]).includes(raw.score)) out.score = raw.score as ScoreKey;
  if (bool(raw.collapse)) out.collapse = raw.collapse;
  if (bool(raw.featured)) out.featured = raw.featured;
  out.featuredTouched = raw.featuredTouched === true && out.featured != null;
  if (bool(raw.hideDeprecated)) out.hideDeprecated = raw.hideDeprecated;
  if (bool(raw.excludeChinese)) out.excludeChinese = raw.excludeChinese;
  if (bool(raw.euHostedOnly)) out.euHostedOnly = raw.euHostedOnly;
  if (bool(raw.nonUsOnly)) out.nonUsOnly = raw.nonUsOnly;
  if (bool(raw.openOnly)) out.openOnly = raw.openOnly;
  if (typeof raw.minScore === "number" && Number.isFinite(raw.minScore) && raw.minScore >= 0) out.minScore = raw.minScore;
  out.minScoreTouched = raw.minScoreTouched === true && out.minScore != null;
  // CR-25.2: "Strong confidential guarantees" was removed; a stored true is migrated to off.
  if (raw.teeOnly !== undefined) out.teeOnly = false;
  if (bool(raw.allowDataTraining)) out.allowDataTraining = raw.allowDataTraining;
  if (bool(raw.isCompany)) out.isCompany = raw.isCompany;
  if (limit(raw.minIntelligence)) out.minIntelligence = raw.minIntelligence as number | null;
  if (limit(raw.minCoding)) out.minCoding = raw.minCoding as number | null;
  if ("advancedMinScore" in raw) {
    if (typeof raw.advancedMinScore === "number" && Number.isFinite(raw.advancedMinScore) && raw.advancedMinScore >= 0) out.advancedMinScore = raw.advancedMinScore;
    if (limit(raw.maxCost)) out.maxCost = raw.maxCost as number | null;
    if (limit(raw.simpleMaxCost)) out.simpleMaxCost = raw.simpleMaxCost as number | null;
  } else if (limit(raw.maxCost) && raw.maxCost != null) {
    // F-40 migration: a payload from before the split has one shared cap. It was most likely
    // set on Simple's slider (the start view), and on Simple it stays visible on that slider —
    // carried into Advanced it would be exactly the hidden filter this split removes. A shared
    // hand-set score floor likewise stays with Simple (minScore/minScoreTouched above).
    out.simpleMaxCost = raw.maxCost as number;
  }
  if (strArr(raw.providersExcluded)) out.providersExcluded = raw.providersExcluded;
  if (strArr(raw.families)) out.families = raw.families;
  if (raw.priceMode === "adjusted" || raw.priceMode === "raw") out.priceMode = raw.priceMode;
  if (typeof raw.inputWeight === "number" && BLEND_VALUES.has(raw.inputWeight)) out.inputWeight = raw.inputWeight;
  return out;
}

/** Filters shared by every view (providers, families, evidence scope, pricing). */
function sharedFiltersActive(s: SettingsState): boolean {
  return !!(s.providersExcluded.length || s.families.length || s.featuredTouched || !s.collapse || !s.hideDeprecated
    || s.excludeChinese || s.euHostedOnly || s.nonUsOnly || s.openOnly || s.teeOnly || s.allowDataTraining || s.isCompany
    || s.priceMode !== "adjusted" || s.inputWeight !== DEFAULT_BLEND);
}

/** What non-Simple views apply beyond their defaults; drives Advanced's "· filtered". */
export function advancedFiltersActive(s: SettingsState): boolean {
  return sharedFiltersActive(s) || s.advancedMinScore > 0 || s.maxCost != null || s.minIntelligence != null || s.minCoding != null;
}

/** Any setting anywhere differs from its default; drives the global Reset. */
export function anyFiltersActive(s: SettingsState): boolean {
  return advancedFiltersActive(s) || s.minScoreTouched || s.simpleMaxCost != null;
}
