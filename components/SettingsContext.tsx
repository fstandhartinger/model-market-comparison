"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ScoreKey } from "../lib/types";
import { defaultMinFor, type PriceMode } from "../lib/cost";
import { advancedFiltersActive, anyFiltersActive, isBlendValue, sanitizeSettings, SETTINGS_DEFAULTS, type SettingsState } from "../lib/settings-state";

interface SettingsCtx extends SettingsState {
  setScore: (s: ScoreKey) => void;
  setCollapse: (b: boolean) => void;
  setFeatured: (b: boolean) => void;
  setHideDeprecated: (b: boolean) => void;
  setExcludeChinese: (b: boolean) => void;
  setEuHostedOnly: (b: boolean) => void;
  setNonUsOnly: (b: boolean) => void;
  setOpenOnly: (b: boolean) => void;
  /** Simple's score floor (F-40: written only by Simple's slider). */
  setMinScore: (n: number) => void;
  /** Back to Simple's untouched, score-aware default. */
  resetMinScore: () => void;
  /** The score floor Simple applies: the hand-set value, else the score's default. */
  minScoreSimple: number;
  /** Advanced's score floor (F-40); 0 = none. Also read by Guided results, Charts, Compare, EU table. */
  setAdvancedMinScore: (n: number) => void;
  /** Simple's cost cap (F-40: written only by Simple's slider). */
  setSimpleMaxCost: (n: number | null) => void;
  /** F-16: the Featured filter Advanced applies — the hand-set value, else off (full catalog). */
  featuredAdvanced: boolean;
  /** Back to the untouched, mode-scoped default (Simple: featured only, Advanced: all). */
  resetFeatured: () => void;
  /** Which home view is on screen, so the global Featured toggle shows the value that view applies. Not persisted. */
  advancedView: boolean;
  setAdvancedView: (b: boolean) => void;
  /** True when any setting differs from its documented default (drives Reset). */
  userFiltersActive: boolean;
  /** True when a setting non-Simple views apply differs from its default (drives Advanced's "· filtered"). */
  advancedFiltersActive: boolean;
  /** F-18: the Filters overlay. Stable callbacks, so listeners can depend on them. */
  filtersOpen: boolean;
  openFilters: () => void;
  closeFilters: () => void;
  toggleFilters: () => void;
  /** Rows the ranking on screen shows, for the sheet's "Show N models" button; null elsewhere. */
  resultCount: number | null;
  setResultCount: (n: number | null) => void;
  setTeeOnly: (b: boolean) => void;
  setAllowDataTraining: (b: boolean) => void;
  setIsCompany: (b: boolean) => void;
  /** Advanced's cost cap (toolbar field, Guided budget page). */
  setMaxCost: (n: number | null) => void;
  setMinIntelligence: (n: number | null) => void;
  setMinCoding: (n: number | null) => void;
  setProvidersExcluded: (k: string[]) => void;
  setFamilies: (k: string[]) => void;
  setPriceMode: (m: PriceMode) => void;
  setInputWeight: (n: number) => void;
  /** CR-4.1: replace every filter key at once with a resolved preset (lib/presets.mjs). */
  applyFilters: (filters: Record<string, unknown>) => void;
  /** CR-5.2: the persisted settings alone (what the account stores). */
  settingsState: SettingsState;
  /** CR-5.2: adopt the account's stored settings, sanitised like a stored payload. */
  replaceSettings: (raw: Record<string, unknown>) => void;
  /** True once stored settings have been read; URL-driven settings must wait for it (CR-2.5). */
  hydrated: boolean;
  excludedSet: Set<string> | null; // null = nothing excluded
  familySet: Set<string> | null;   // null = all
}

// v3: the provider filter is now a BLOCKLIST (persisted `providersExcluded`) instead of
// an inclusion list. An inclusion list is a snapshot of the providers that existed when
// the user last touched the filter, so any provider added later (e.g. TensorX) was
// silently excluded — and with the EU eligibility filter on, models whose only matching route is a new
// provider vanished. A blocklist includes future providers by default. Bumping v2→v3
// discards the old (inclusion-shaped) persisted `providers` array.
// v5: dropped hideGptOpus/hideFable (toggles removed; nothing is hidden by them anymore).
// v6: added priceMode/inputWeight; stored values are validated on load (lib/settings-state.ts).
// v7: added allowDataTraining/isCompany, and 20:1 became a real blend option. v6 stored
// `inputWeight: 20` while 20 was not in FIXED_BLENDS, so the guard rejected it and the
// blend <select> rendered a value with no matching <option>. Bumping the key discards
// those payloads instead of carrying the broken state forward.
// v8: maxCost, minIntelligence and minCoding moved out of ModelExplorer's local state so
// the wizard, Simple mode and Advanced mode all read and write the same limits.
// (F-06 added minScoreTouched without a bump: a v8 payload has no flag, so it loads as
// untouched and the mode-scoped defaults apply — v8 always persisted minScore, even
// when it was only the default, so the stored number cannot be trusted as a user choice.)
// v9 (F-16): added featuredTouched. v8 always persisted `featured: true` as the default, so
// a v8 payload is migrated with its Featured choice dropped — it loads as untouched.
// F-40 split the floor and cap by mode without a bump: a payload without `advancedMinScore`
// is recognised as pre-split and migrated in sanitizeSettings.
const KEY = "mmc.settings.v9";
const PREVIOUS_KEY = "mmc.settings.v8";

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SettingsState>(SETTINGS_DEFAULTS);
  // Persisting is gated on hydration so the initial DEFAULTS write can never
  // clobber a stored choice before it has been read and applied.
  const [hydrated, setHydrated] = useState(false);

  // hydrate from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const previous = raw ? null : localStorage.getItem(PREVIOUS_KEY);
      if (raw) {
        const stored = sanitizeSettings(JSON.parse(raw));
        setState((s) => ({ ...s, ...stored }));
      } else if (previous) {
        const { featured: _dropped, featuredTouched: _untouched, ...stored } = sanitizeSettings(JSON.parse(previous));
        setState((s) => ({ ...s, ...stored }));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, hydrated]);

  const [advancedView, setAdvancedView] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const openFilters = useCallback(() => setFiltersOpen(true), []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);
  const toggleFilters = useCallback(() => setFiltersOpen((o) => !o), []);

  const value = useMemo<SettingsCtx>(() => ({
    ...state,
    // A new score is a new scale: both floors go back to their defaults.
    setScore: (score) => setState((s) => ({ ...s, score, minScore: defaultMinFor(score), minScoreTouched: false, advancedMinScore: 0 })),
    setCollapse: (collapse) => setState((s) => ({ ...s, collapse })),
    setFeatured: (featured) => setState((s) => ({ ...s, featured, featuredTouched: true })),
    featuredAdvanced: state.featuredTouched ? state.featured : false,
    resetFeatured: () => setState((s) => ({ ...s, featured: true, featuredTouched: false })),
    advancedView,
    setAdvancedView,
    filtersOpen, openFilters, closeFilters, toggleFilters,
    resultCount, setResultCount,
    userFiltersActive: anyFiltersActive(state),
    advancedFiltersActive: advancedFiltersActive(state),
    setHideDeprecated: (hideDeprecated) => setState((s) => ({ ...s, hideDeprecated })),
    setExcludeChinese: (excludeChinese) => setState((s) => ({ ...s, excludeChinese })),
    setEuHostedOnly: (euHostedOnly) => setState((s) => ({ ...s, euHostedOnly })),
    setNonUsOnly: (nonUsOnly) => setState((s) => ({ ...s, nonUsOnly })),
    setOpenOnly: (openOnly) => setState((s) => ({ ...s, openOnly })),
    setMinScore: (minScore) => setState((s) => ({ ...s, minScore, minScoreTouched: true })),
    resetMinScore: () => setState((s) => ({ ...s, minScore: defaultMinFor(s.score), minScoreTouched: false })),
    minScoreSimple: state.minScoreTouched ? state.minScore : defaultMinFor(state.score),
    setAdvancedMinScore: (advancedMinScore) => setState((s) => ({ ...s, advancedMinScore: Number.isFinite(advancedMinScore) && advancedMinScore > 0 ? advancedMinScore : 0 })),
    setSimpleMaxCost: (simpleMaxCost) => setState((s) => ({ ...s, simpleMaxCost })),
    setTeeOnly: (teeOnly) => setState((s) => ({ ...s, teeOnly })),
    setAllowDataTraining: (allowDataTraining) => setState((s) => ({ ...s, allowDataTraining })),
    setIsCompany: (isCompany) => setState((s) => ({ ...s, isCompany })),
    setMaxCost: (maxCost) => setState((s) => ({ ...s, maxCost })),
    setMinIntelligence: (minIntelligence) => setState((s) => ({ ...s, minIntelligence })),
    setMinCoding: (minCoding) => setState((s) => ({ ...s, minCoding })),
    setProvidersExcluded: (providersExcluded) => setState((s) => ({ ...s, providersExcluded })),
    setFamilies: (families) => setState((s) => ({ ...s, families })),
    setPriceMode: (priceMode) => setState((s) => ({ ...s, priceMode })),
    setInputWeight: (inputWeight) => setState((s) => isBlendValue(inputWeight) ? { ...s, inputWeight } : s),
    // Sanitised like a stored payload, so a saved preset from an older build cannot wedge the UI.
    applyFilters: (filters) => setState((s) => ({ ...s, ...sanitizeSettings({ ...s, ...filters, advancedMinScore: filters.advancedMinScore ?? s.advancedMinScore }) })),
    settingsState: state,
    replaceSettings: (raw) => setState((s) => ({ ...s, ...sanitizeSettings(raw) })),
    hydrated,
    excludedSet: state.providersExcluded.length ? new Set(state.providersExcluded) : null,
    familySet: state.families.length ? new Set(state.families) : null,
  }), [state, hydrated, advancedView, filtersOpen, resultCount, openFilters, closeFilters, toggleFilters]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSettings must be used within SettingsProvider");
  return c;
}
