"use client";
import { SCORE_SHORT_LABELS, type ScoreKey } from "../lib/types";
import { SCORE_OPTIONS } from "../lib/cost";

export function ScoreSelect({ value, onChange, label = "Score" }: { value: ScoreKey; onChange: (s: ScoreKey) => void; label?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <label className="text-sm text-gray-400">{label}</label>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as ScoreKey)}
        className="min-w-0 max-w-[240px] rounded-md border border-line bg-ink px-3 py-1.5 text-sm sm:max-w-none">
        {SCORE_OPTIONS.map((s) => <option key={s} value={s}>{SCORE_SHORT_LABELS[s]}</option>)}
      </select>
    </span>
  );
}

export function Toggle({ label, on, set }: { label: string; on: boolean; set: (b: boolean) => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={() => set(!on)}
      className={`rounded-md border px-3 py-1.5 text-sm ${on ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
      {on ? "✓ " : ""}{label}
    </button>
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
      <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode="decimal"
        className="w-20 rounded-md border border-line bg-ink px-2 py-1 text-sm" />
    </span>
  );
}
