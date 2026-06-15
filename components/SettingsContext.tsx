"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ScoreKey } from "../lib/types";
import { DEFAULT_SCORE, defaultMinFor } from "../lib/cost";

interface SettingsState {
  score: ScoreKey;
  collapse: boolean;       // one variant per GPT/Claude family
  featured: boolean;
  excludeChinese: boolean;      // hide Chinese-based inference providers (not their models)
  excludeUnauthorized: boolean; // hide GPT-5.5 / Opus 4.8 / Fable from the model list
  minScore: number;        // hide models scoring below this (score-aware default)
  providers: string[];     // selected provider keys; empty = all
  families: string[];      // selected model family keys; empty = all
}

interface SettingsCtx extends SettingsState {
  setScore: (s: ScoreKey) => void;
  setCollapse: (b: boolean) => void;
  setFeatured: (b: boolean) => void;
  setExcludeChinese: (b: boolean) => void;
  setExcludeUnauthorized: (b: boolean) => void;
  setMinScore: (n: number) => void;
  setProviders: (k: string[]) => void;
  setFamilies: (k: string[]) => void;
  providerSet: Set<string> | null; // null = all
  familySet: Set<string> | null;   // null = all
}

const DEFAULTS: SettingsState = { score: DEFAULT_SCORE, collapse: true, featured: true, excludeChinese: true, excludeUnauthorized: true, minScore: defaultMinFor(DEFAULT_SCORE), providers: [], families: [] };
const KEY = "mmc.settings.v1";

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
    setExcludeUnauthorized: (excludeUnauthorized) => setState((s) => ({ ...s, excludeUnauthorized })),
    setMinScore: (minScore) => setState((s) => ({ ...s, minScore })),
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
