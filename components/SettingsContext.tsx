"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ScoreKey } from "../lib/types";
import { DEFAULT_BLEND, DEFAULT_SCORE, defaultMinFor, FIXED_BLENDS, SCORE_OPTIONS, type PriceMode } from "../lib/cost";

interface SettingsState {
  score: ScoreKey;
  collapse: boolean;       // one variant per GPT/Claude family
  featured: boolean;
  hideDeprecated: boolean; // hide benchmark-source rows marked deprecated (on by default)
  excludeChinese: boolean;  // hide Chinese-based inference providers (not their models)
  euHostedOnly: boolean;    // only exact offers hosted in the EU or explicitly policy-equivalent
  nonUsOnly: boolean;       // only providers whose company is not US-based
  openOnly: boolean;        // only open-weights models (off by default)
  minScore: number;         // hide models scoring below this (score-aware default)
  // F-06: the score minimum is mode-scoped. Until the user sets it by hand, Simple applies
  // the score's default (85 for Composite, R5.3) and every other view applies none, so
  // Advanced opens on the full catalog. A hand-set value applies everywhere.
  minScoreTouched: boolean;
  teeOnly: boolean;         // "Strong confidential guarantees": only TEE / confidential-compute offers
  // R4.10: opt-in to INCLUDE providers that train on or retain your data. Unchecked by
  // default, so such providers are filtered out until the user asks for them.
  allowDataTraining: boolean;
  isCompany: boolean;       // R6.1: consumer subscriptions are not available to companies
  // R5.4 / R5.6: the shortlist limits. `null` means "no requirement" — deliberately not 0,
  // because 0 is a legitimate threshold and must not read as "unset".
  maxCost: number | null;        // maximum adjusted cost per task (or raw blended $/1M)
  minIntelligence: number | null; // AA Intelligence Index floor
  minCoding: number | null;       // AA Coding Index floor
  providersExcluded: string[]; // BLOCKLIST of deselected provider keys; empty = all included (incl. future providers)
  families: string[];      // selected model family keys; empty = all
  priceMode: PriceMode;    // adjusted $/task (default) vs raw fixed-blend list prices
  inputWeight: number;     // raw mode's fixed input:output blend; persists while adjusted
}

interface SettingsCtx extends SettingsState {
  setScore: (s: ScoreKey) => void;
  setCollapse: (b: boolean) => void;
  setFeatured: (b: boolean) => void;
  setHideDeprecated: (b: boolean) => void;
  setExcludeChinese: (b: boolean) => void;
  setEuHostedOnly: (b: boolean) => void;
  setNonUsOnly: (b: boolean) => void;
  setOpenOnly: (b: boolean) => void;
  setMinScore: (n: number) => void;
  /** Back to the untouched, mode-scoped default (Simple: score default, elsewhere: none). */
  resetMinScore: () => void;
  /** The score minimum every non-Simple view applies: the hand-set value, else none. */
  minScoreApplied: number;
  /** The score minimum Simple mode applies: the hand-set value, else the score's default. */
  minScoreSimple: number;
  setTeeOnly: (b: boolean) => void;
  setAllowDataTraining: (b: boolean) => void;
  setIsCompany: (b: boolean) => void;
  setMaxCost: (n: number | null) => void;
  setMinIntelligence: (n: number | null) => void;
  setMinCoding: (n: number | null) => void;
  setProvidersExcluded: (k: string[]) => void;
  setFamilies: (k: string[]) => void;
  setPriceMode: (m: PriceMode) => void;
  setInputWeight: (n: number) => void;
  excludedSet: Set<string> | null; // null = nothing excluded
  familySet: Set<string> | null;   // null = all
}

const DEFAULTS: SettingsState = { score: DEFAULT_SCORE, collapse: true, featured: true, hideDeprecated: true, excludeChinese: false, euHostedOnly: false, nonUsOnly: false, openOnly: false, minScore: 85, minScoreTouched: false, teeOnly: false, allowDataTraining: false, isCompany: false, maxCost: null, minIntelligence: null, minCoding: null, providersExcluded: [], families: [], priceMode: "adjusted", inputWeight: DEFAULT_BLEND };
// v3: the provider filter is now a BLOCKLIST (persisted `providersExcluded`) instead of
// an inclusion list. An inclusion list is a snapshot of the providers that existed when
// the user last touched the filter, so any provider added later (e.g. TensorX) was
// silently excluded — and with the EU eligibility filter on, models whose only matching route is a new
// provider vanished. A blocklist includes future providers by default. Bumping v2→v3
// discards the old (inclusion-shaped) persisted `providers` array.
// v5: dropped hideGptOpus/hideFable (toggles removed; nothing is hidden by them anymore).
// v6: added priceMode/inputWeight; stored values are validated on load (below).
// v7: added allowDataTraining/isCompany, and 20:1 became a real blend option. v6 stored
// `inputWeight: 20` while 20 was not in FIXED_BLENDS, so the guard rejected it and the
// blend <select> rendered a value with no matching <option>. Bumping the key discards
// those payloads instead of carrying the broken state forward.
// v8: maxCost, minIntelligence and minCoding moved out of ModelExplorer's local state so
// the wizard, Simple mode and Advanced mode all read and write the same limits.
// (F-06 added minScoreTouched without a bump: a v8 payload has no flag, so it loads as
// untouched and the mode-scoped defaults apply — v8 always persisted minScore, even
// when it was only the default, so the stored number cannot be trusted as a user choice.)
const KEY = "mmc.settings.v8";

const BLEND_VALUES = new Set(FIXED_BLENDS.map((b) => b.value));

/** Only known keys with a plausible type survive a load; anything else falls
 *  back to DEFAULTS so a corrupted or stale payload cannot wedge the UI. */
function sanitizeSettings(input: unknown): Partial<SettingsState> {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const out: Partial<SettingsState> = {};
  const bool = (v: unknown): v is boolean => typeof v === "boolean";
  const strArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
  if (typeof raw.score === "string" && (SCORE_OPTIONS as string[]).includes(raw.score)) out.score = raw.score as ScoreKey;
  if (bool(raw.collapse)) out.collapse = raw.collapse;
  if (bool(raw.featured)) out.featured = raw.featured;
  if (bool(raw.hideDeprecated)) out.hideDeprecated = raw.hideDeprecated;
  if (bool(raw.excludeChinese)) out.excludeChinese = raw.excludeChinese;
  if (bool(raw.euHostedOnly)) out.euHostedOnly = raw.euHostedOnly;
  if (bool(raw.nonUsOnly)) out.nonUsOnly = raw.nonUsOnly;
  if (bool(raw.openOnly)) out.openOnly = raw.openOnly;
  if (typeof raw.minScore === "number" && Number.isFinite(raw.minScore) && raw.minScore >= 0) out.minScore = raw.minScore;
  out.minScoreTouched = raw.minScoreTouched === true && out.minScore != null;
  if (bool(raw.teeOnly)) out.teeOnly = raw.teeOnly;
  if (bool(raw.allowDataTraining)) out.allowDataTraining = raw.allowDataTraining;
  if (bool(raw.isCompany)) out.isCompany = raw.isCompany;
  const limit = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0);
  if (limit(raw.maxCost)) out.maxCost = raw.maxCost as number | null;
  if (limit(raw.minIntelligence)) out.minIntelligence = raw.minIntelligence as number | null;
  if (limit(raw.minCoding)) out.minCoding = raw.minCoding as number | null;
  if (strArr(raw.providersExcluded)) out.providersExcluded = raw.providersExcluded;
  if (strArr(raw.families)) out.families = raw.families;
  if (raw.priceMode === "adjusted" || raw.priceMode === "raw") out.priceMode = raw.priceMode;
  if (typeof raw.inputWeight === "number" && BLEND_VALUES.has(raw.inputWeight)) out.inputWeight = raw.inputWeight;
  return out;
}

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SettingsState>(DEFAULTS);
  // Persisting is gated on hydration so the initial DEFAULTS write can never
  // clobber a stored choice before it has been read and applied.
  const [hydrated, setHydrated] = useState(false);

  // hydrate from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const stored = sanitizeSettings(JSON.parse(raw));
        setState((s) => ({ ...s, ...stored }));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, hydrated]);

  const value = useMemo<SettingsCtx>(() => ({
    ...state,
    setScore: (score) => setState((s) => ({ ...s, score, minScore: defaultMinFor(score), minScoreTouched: false })),
    setCollapse: (collapse) => setState((s) => ({ ...s, collapse })),
    setFeatured: (featured) => setState((s) => ({ ...s, featured })),
    setHideDeprecated: (hideDeprecated) => setState((s) => ({ ...s, hideDeprecated })),
    setExcludeChinese: (excludeChinese) => setState((s) => ({ ...s, excludeChinese })),
    setEuHostedOnly: (euHostedOnly) => setState((s) => ({ ...s, euHostedOnly })),
    setNonUsOnly: (nonUsOnly) => setState((s) => ({ ...s, nonUsOnly })),
    setOpenOnly: (openOnly) => setState((s) => ({ ...s, openOnly })),
    setMinScore: (minScore) => setState((s) => ({ ...s, minScore, minScoreTouched: true })),
    resetMinScore: () => setState((s) => ({ ...s, minScore: defaultMinFor(s.score), minScoreTouched: false })),
    minScoreApplied: state.minScoreTouched ? state.minScore : 0,
    minScoreSimple: state.minScoreTouched ? state.minScore : defaultMinFor(state.score),
    setTeeOnly: (teeOnly) => setState((s) => ({ ...s, teeOnly })),
    setAllowDataTraining: (allowDataTraining) => setState((s) => ({ ...s, allowDataTraining })),
    setIsCompany: (isCompany) => setState((s) => ({ ...s, isCompany })),
    setMaxCost: (maxCost) => setState((s) => ({ ...s, maxCost })),
    setMinIntelligence: (minIntelligence) => setState((s) => ({ ...s, minIntelligence })),
    setMinCoding: (minCoding) => setState((s) => ({ ...s, minCoding })),
    setProvidersExcluded: (providersExcluded) => setState((s) => ({ ...s, providersExcluded })),
    setFamilies: (families) => setState((s) => ({ ...s, families })),
    setPriceMode: (priceMode) => setState((s) => ({ ...s, priceMode })),
    setInputWeight: (inputWeight) => setState((s) => BLEND_VALUES.has(inputWeight) ? { ...s, inputWeight } : s),
    excludedSet: state.providersExcluded.length ? new Set(state.providersExcluded) : null,
    familySet: state.families.length ? new Set(state.families) : null,
  }), [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSettings must be used within SettingsProvider");
  return c;
}
