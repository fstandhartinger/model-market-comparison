"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ScoreKey } from "../lib/types";
import { DEFAULT_SCORE, defaultMinFor } from "../lib/cost";

interface SettingsState {
  score: ScoreKey;
  collapse: boolean;       // one variant per GPT/Claude family
  featured: boolean;
  excludeChinese: boolean;  // hide Chinese-based inference providers (not their models)
  euHostedOnly: boolean;    // only providers that serve from EU data centers
  nonUsOnly: boolean;       // only providers whose company is not US-based
  hideGptOpus: boolean;     // hide GPT-5.5 / Claude Opus 4.8 (off by default)
  hideFable: boolean;       // hide Claude Fable (on by default)
  minScore: number;         // hide models scoring below this (score-aware default)
  teeOnly: boolean;         // only models with a TEE / confidential-compute offer
  providers: string[];     // selected provider keys; empty = all
  families: string[];      // selected model family keys; empty = all
}

interface SettingsCtx extends SettingsState {
  setScore: (s: ScoreKey) => void;
  setCollapse: (b: boolean) => void;
  setFeatured: (b: boolean) => void;
  setExcludeChinese: (b: boolean) => void;
  setEuHostedOnly: (b: boolean) => void;
  setNonUsOnly: (b: boolean) => void;
  setHideGptOpus: (b: boolean) => void;
  setHideFable: (b: boolean) => void;
  setMinScore: (n: number) => void;
  setTeeOnly: (b: boolean) => void;
  setProviders: (k: string[]) => void;
  setFamilies: (k: string[]) => void;
  providerSet: Set<string> | null; // null = all
  familySet: Set<string> | null;   // null = all
}

const DEFAULTS: SettingsState = { score: DEFAULT_SCORE, collapse: true, featured: true, excludeChinese: true, euHostedOnly: false, nonUsOnly: false, hideGptOpus: false, hideFable: true, minScore: defaultMinFor(DEFAULT_SCORE), teeOnly: false, providers: [], families: [] };
// v2: reset persisted state. v1 could store an explicit "all providers" list (via the
// old "Select all" button); when new providers were later added, that stale set excluded
// them (e.g. Nebius), wrongly filtering models. v2 starts clean (empty = all).
const KEY = "mmc.settings.v2";

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SettingsState>(DEFAULTS);

  // hydrate from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const value = useMemo<SettingsCtx>(() => ({
    ...state,
    setScore: (score) => setState((s) => ({ ...s, score, minScore: defaultMinFor(score) })),
    setCollapse: (collapse) => setState((s) => ({ ...s, collapse })),
    setFeatured: (featured) => setState((s) => ({ ...s, featured })),
    setExcludeChinese: (excludeChinese) => setState((s) => ({ ...s, excludeChinese })),
    setEuHostedOnly: (euHostedOnly) => setState((s) => ({ ...s, euHostedOnly })),
    setNonUsOnly: (nonUsOnly) => setState((s) => ({ ...s, nonUsOnly })),
    setHideGptOpus: (hideGptOpus) => setState((s) => ({ ...s, hideGptOpus })),
    setHideFable: (hideFable) => setState((s) => ({ ...s, hideFable })),
    setMinScore: (minScore) => setState((s) => ({ ...s, minScore })),
    setTeeOnly: (teeOnly) => setState((s) => ({ ...s, teeOnly })),
    setProviders: (providers) => setState((s) => ({ ...s, providers })),
    setFamilies: (families) => setState((s) => ({ ...s, families })),
    providerSet: state.providers.length ? new Set(state.providers) : null,
    familySet: state.families.length ? new Set(state.families) : null,
  }), [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSettings must be used within SettingsProvider");
  return c;
}
