"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ScoreKey } from "../lib/types";
import { DEFAULT_SCORE, defaultMinFor, FIXED_BLENDS, SCORE_OPTIONS, type PriceMode } from "../lib/cost";

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
  teeOnly: boolean;         // only models with a TEE / confidential-compute offer
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
  setTeeOnly: (b: boolean) => void;
  setProvidersExcluded: (k: string[]) => void;
  setFamilies: (k: string[]) => void;
  setPriceMode: (m: PriceMode) => void;
  setInputWeight: (n: number) => void;
  excludedSet: Set<string> | null; // null = nothing excluded
  familySet: Set<string> | null;   // null = all
}

const DEFAULTS: SettingsState = { score: DEFAULT_SCORE, collapse: true, featured: true, hideDeprecated: true, excludeChinese: true, euHostedOnly: false, nonUsOnly: false, openOnly: false, minScore: defaultMinFor(DEFAULT_SCORE), teeOnly: false, providersExcluded: [], families: [], priceMode: "adjusted", inputWeight: 10 };
// v3: the provider filter is now a BLOCKLIST (persisted `providersExcluded`) instead of
// an inclusion list. An inclusion list is a snapshot of the providers that existed when
// the user last touched the filter, so any provider added later (e.g. TensorX) was
// silently excluded — and with the EU eligibility filter on, models whose only matching route is a new
// provider vanished. A blocklist includes future providers by default. Bumping v2→v3
// discards the old (inclusion-shaped) persisted `providers` array.
// v5: dropped hideGptOpus/hideFable (toggles removed; nothing is hidden by them anymore).
// v6: added priceMode/inputWeight; stored values are validated on load (below).
const KEY = "mmc.settings.v6";

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
  if (bool(raw.teeOnly)) out.teeOnly = raw.teeOnly;
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
    setScore: (score) => setState((s) => ({ ...s, score, minScore: defaultMinFor(score) })),
    setCollapse: (collapse) => setState((s) => ({ ...s, collapse })),
    setFeatured: (featured) => setState((s) => ({ ...s, featured })),
    setHideDeprecated: (hideDeprecated) => setState((s) => ({ ...s, hideDeprecated })),
    setExcludeChinese: (excludeChinese) => setState((s) => ({ ...s, excludeChinese })),
    setEuHostedOnly: (euHostedOnly) => setState((s) => ({ ...s, euHostedOnly })),
    setNonUsOnly: (nonUsOnly) => setState((s) => ({ ...s, nonUsOnly })),
    setOpenOnly: (openOnly) => setState((s) => ({ ...s, openOnly })),
    setMinScore: (minScore) => setState((s) => ({ ...s, minScore })),
    setTeeOnly: (teeOnly) => setState((s) => ({ ...s, teeOnly })),
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
