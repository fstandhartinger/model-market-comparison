"use client";
import { useState } from "react";
import type { ProviderInfo } from "../lib/client-model";
import { PROVIDER_PRESETS } from "../lib/cost";
import { SCORE_LABELS, type ScoreKey } from "../lib/types";
import { SCORE_OPTIONS } from "../lib/cost";

export function ScoreSelect({ value, onChange, label = "Score" }: { value: ScoreKey; onChange: (s: ScoreKey) => void; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <label className="text-sm text-gray-400">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value as ScoreKey)}
        className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
        {SCORE_OPTIONS.map((s) => <option key={s} value={s}>{SCORE_LABELS[s]}</option>)}
      </select>
    </span>
  );
}

export function Toggle({ label, on, set }: { label: string; on: boolean; set: (b: boolean) => void }) {
  return (
    <button onClick={() => set(!on)}
      className={`rounded-md border px-3 py-1.5 text-sm ${on ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
      {on ? "✓ " : ""}{label}
    </button>
  );
}

/** A reusable provider/platform checkbox filter with presets. An empty selection
 *  means "all providers". */
export function ProviderFilter({
  providers, excluded, setExcluded,
}: { providers: ProviderInfo[]; excluded: Set<string>; setExcluded: (s: Set<string>) => void }) {
  const [open, setOpen] = useState(false);
  const byPlatform = new Map<string, ProviderInfo[]>();
  for (const p of providers) {
    if (!byPlatform.has(p.platform)) byPlatform.set(p.platform, []);
    byPlatform.get(p.platform)!.push(p);
  }
  const all = providers.map((p) => p.key);
  // `excluded` is a BLOCKLIST: empty = every provider included (incl. any added later).
  const isChecked = (k: string) => !excluded.has(k);
  const toggle = (k: string) => {
    const base = new Set(excluded);
    base.has(k) ? base.delete(k) : base.add(k);
    setExcluded(base);
  };
  // A preset selects a subset → exclude everything that does NOT match.
  const applyPreset = (match: (p: ProviderInfo) => boolean) => setExcluded(new Set(providers.filter((p) => !match(p)).map((p) => p.key)));
  const isAll = excluded.size === 0;
  const label = isAll ? "All providers" : `${all.length - excluded.size} of ${all.length}`;

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(!open)}
        className={`rounded-md border px-3 py-1.5 text-sm ${excluded.size ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-300"}`}>
        Providers: {label} ▾
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-[60vh] w-80 overflow-y-auto rounded-lg border border-line bg-panel p-3 shadow-xl">
          <div className="mb-1 flex flex-wrap gap-1">
            <button onClick={() => setExcluded(new Set())} className="rounded border border-line px-2 py-0.5 text-xs text-gray-300">All</button>
            {PROVIDER_PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p.match)} className="rounded border border-accent/40 px-2 py-0.5 text-xs text-accent">{p.label}</button>
            ))}
          </div>
          <p className="mb-2 text-[10px] text-gray-500">All checked = no restriction (new providers included by default). Uncheck to exclude providers (the EU-hosted / Non-US toggles still apply on top).</p>
          {[...byPlatform.entries()].map(([platform, list]) => (
            <div key={platform} className="mb-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-accent">{platform}</span>
                <button onClick={() => { const base = new Set(excluded); list.forEach((p) => base.add(p.key)); setExcluded(base); }}
                  className="text-[10px] text-gray-500 hover:text-gray-300">exclude all</button>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {list.sort((a, b) => b.model_count - a.model_count).map((p) => (
                  <label key={p.key} className="flex items-center gap-1.5 text-xs text-gray-300">
                    <input type="checkbox" checked={isChecked(p.key)} onChange={() => toggle(p.key)} />
                    <span className="truncate" title={`${p.provider} (${p.model_count})`}>{p.provider}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface FamilyOption { key: string; name: string; org: string }

/** Searchable multi-select for model families. Empty selection = all models. */
export function ModelFilter({
  families, selected, setSelected,
}: { families: FamilyOption[]; selected: Set<string>; setSelected: (s: Set<string>) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const shown = q.trim()
    ? families.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()) || f.org.toLowerCase().includes(q.toLowerCase()))
    : families;
  const toggle = (k: string) => { const n = new Set(selected); n.has(k) ? n.delete(k) : n.add(k); setSelected(n); };
  const label = selected.size === 0 ? "All models" : `${selected.size} model${selected.size > 1 ? "s" : ""}`;
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(!open)}
        className={`rounded-md border px-3 py-1.5 text-sm ${selected.size ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-300"}`}>
        Models: {label} ▾
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-[60vh] w-80 overflow-y-auto rounded-lg border border-line bg-panel p-3 shadow-xl">
          <button
            onClick={() => setSelected(new Set())}
            disabled={selected.size === 0}
            className={`mb-2 w-full rounded-md border px-2 py-1.5 text-xs font-medium ${selected.size === 0 ? "cursor-default border-line text-gray-500" : "border-accent/60 bg-accent/15 text-accent hover:bg-accent/25"}`}
            title="Reset to all models (clears the selection)">
            {selected.size === 0 ? "✓ All models selected" : `↺ Select all models (clear ${selected.size} selected)`}
          </button>
          <div className="mb-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models…" className="w-full rounded border border-line bg-ink px-2 py-1 text-xs" />
          </div>
          <div className="grid grid-cols-1 gap-0.5">
            {shown.slice(0, 200).map((f) => (
              <label key={f.key} className="flex items-center gap-1.5 text-xs text-gray-300">
                <input type="checkbox" checked={selected.has(f.key)} onChange={() => toggle(f.key)} />
                <span className="truncate" title={`${f.name} · ${f.org}`}>{f.name} <span className="text-gray-600">{f.org}</span></span>
              </label>
            ))}
            {shown.length > 200 && <div className="mt-1 text-[10px] text-gray-500">…{shown.length - 200} more — refine search</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Excel-style data bar behind a value. `frac` is 0..1. */
export function DataBar({ frac, color = "#5b9dff", children, align = "left" }: { frac: number; color?: string; children: React.ReactNode; align?: "left" | "right" }) {
  const pct = Math.max(0, Math.min(1, frac)) * 100;
  return (
    <div className="relative">
      <div className="absolute inset-y-0.5 rounded-sm opacity-25"
        style={{ width: `${pct}%`, background: color, [align === "right" ? "right" : "left"]: 0 }} />
      <span className="relative tabular">{children}</span>
    </div>
  );
}

export function NumFilter({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <label className="text-xs text-gray-400">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode="decimal"
        className="w-20 rounded-md border border-line bg-ink px-2 py-1 text-sm" />
    </span>
  );
}
