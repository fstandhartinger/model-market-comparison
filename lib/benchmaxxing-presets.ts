// CR-15.2: the Benchmaxxing table's model list presets. A plain module (no "use client") so the
// server page and the client table share one ordering.
import type { BenchmaxxingLevel } from "./benchmaxxing-levels.mjs";

export type BenchmaxxingOverviewRow = {
  id: string;
  name: string;
  org: string;
  score: number;
  comparisons: number;
  topics: number;
  measured: number;
  total: number;
  domainSpecialization: number | null;
  /** CR-74.2: the family's Main Composite as the collapsed Overview shows it; null without composite inputs. */
  composite: number | null;
  featured: boolean;
  /** CR-74.2: false for deprecated families the Overview hides by default; Top 50 skips them. */
  alive?: boolean;
  tagged: boolean;
  /** CR-74.1 / CR-77.1: the published tag level (light ≥ +3, medium ≥ +6, strong ≥ +12), decided by the score alone. */
  level: BenchmaxxingLevel | null;
  /** CR-77.2: why the tag is uncertain (few comparisons, interval reaching below zero); null when it is not. */
  uncertain?: string | null;
  /** CR-69.3: 80 % bootstrap interval of the score; null when it cannot be computed. */
  interval?: { lower: number; upper: number } | null;
};

export type BenchmaxxingPreset = "featured" | "top50" | "all";

/** CR-74.2: how many rows Top 50 lists, and how many rows All scored shows before its "Show all" button. Featured and
 *  Top 50 always show every row. */
export const BENCHMAXXING_TOP_N = 50;
export const BENCHMAXXING_ALL_LIMIT = 50;

// CR-74.2 (Florian 2026-09-17): exactly three presets, Featured first and default; the old signal-ranked preset is gone (CR-71.1).
export const DEFAULT_BENCHMAXXING_PRESET: BenchmaxxingPreset = "featured";
export const BENCHMAXXING_PRESETS: { key: BenchmaxxingPreset; label: string; heading: string }[] = [
  { key: "featured", label: "Featured models", heading: "Today’s featured models" },
  { key: "top50", label: "Top 50", heading: "The 50 highest Main Composite scores" },
  { key: "all", label: "All scored", heading: "Every scored model" },
];

/** CR-74.2: the Main Composite a preset ranks by. The lead wires the Benchmaxxing-penalised composite (CR-74.4 toggle)
 *  through this accessor; every composite-based ordering below goes through it. */
export type CompositeOf = (row: BenchmaxxingOverviewRow) => number | null;
const rowComposite: CompositeOf = (row) => row.composite;

/** Featured: featured families by composite. Top 50: the 50 scored families with the highest composite (families
 *  without a composite are left out), in the Overview's order. All scored: every scored family by composite. */
export function presetRows(rows: BenchmaxxingOverviewRow[], preset: BenchmaxxingPreset, compositeOf: CompositeOf = rowComposite): BenchmaxxingOverviewRow[] {
  const value = (row: BenchmaxxingOverviewRow) => { const v = compositeOf(row); return typeof v === "number" && Number.isFinite(v) ? v : null; };
  const byComposite = (a: BenchmaxxingOverviewRow, b: BenchmaxxingOverviewRow) => (value(b) ?? -Infinity) - (value(a) ?? -Infinity) || a.name.localeCompare(b.name);
  if (preset === "featured") return rows.filter((r) => r.featured).sort(byComposite);
  if (preset === "top50") return rows.filter((r) => r.alive !== false && value(r) != null).sort(byComposite).slice(0, BENCHMAXXING_TOP_N);
  return [...rows].sort(byComposite);
}

/** CR-74.2: the rows a preset shows before "Show all" — only All scored is ever truncated. */
export function presetLimit(preset: BenchmaxxingPreset): number {
  return preset === "all" ? BENCHMAXXING_ALL_LIMIT : Infinity;
}

/** F-104: a deep link must land with its model visible and selected in the master list. Keep the current preset when
 *  the model is in it, else the narrowest preset that lists it (Featured → Top 50 → All scored); expand the All scored
 *  list only when the row sits below its first page. */
export function presetShowing(rows: BenchmaxxingOverviewRow[], id: string, current: BenchmaxxingPreset = "featured", compositeOf: CompositeOf = rowComposite): { preset: BenchmaxxingPreset; showAll: boolean } | null {
  const order: BenchmaxxingPreset[] = [current, ...(["featured", "top50", "all"] as BenchmaxxingPreset[]).filter((p) => p !== current)];
  for (const preset of order) {
    const index = presetRows(rows, preset, compositeOf).findIndex((r) => r.id === id);
    if (index >= 0) return { preset, showAll: index >= presetLimit(preset) };
  }
  return null;
}
