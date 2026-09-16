// CR-15.2: the Benchmaxxing table's model list presets. A plain module (no "use client") so the
// server page and the client table share one ordering.

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
  composite: number | null;
  featured: boolean;
  tagged: boolean;
  /** CR-43.3: the published tag level (strong = top 10 %, weak = next 10 %), for the expandable row. */
  level: "strong" | "weak" | null;
};

export type BenchmaxxingPreset = "featured" | "signals" | "all";

export const BENCHMAXXING_PRESETS: { key: BenchmaxxingPreset; label: string; heading: string }[] = [
  { key: "featured", label: "Featured models", heading: "Today’s featured models" },
  { key: "signals", label: "Strongest signals", heading: "The strongest unevenness signals" },
  { key: "all", label: "All scored", heading: "Every scored model" },
];

/** Featured (default): current top models by Composite. Strongest signals: tagged models by signal. All: every scored model by signal. */
export function presetRows(rows: BenchmaxxingOverviewRow[], preset: BenchmaxxingPreset): BenchmaxxingOverviewRow[] {
  const bySignal = (a: BenchmaxxingOverviewRow, b: BenchmaxxingOverviewRow) => b.score - a.score || b.comparisons - a.comparisons || a.name.localeCompare(b.name);
  if (preset === "featured") return rows.filter((r) => r.featured).sort((a, b) => (b.composite ?? -Infinity) - (a.composite ?? -Infinity) || a.name.localeCompare(b.name));
  if (preset === "signals") return rows.filter((r) => r.tagged).sort(bySignal);
  return [...rows].sort(bySignal);
}

/** F-104: a deep link must land with its model visible and selected in the master list. Keep the default preset when
 *  the model is in it, else the narrowest preset that lists it; expand the 10-row list only when the row sits below it. */
export function presetShowing(rows: BenchmaxxingOverviewRow[], id: string, current: BenchmaxxingPreset = "featured", limit = 10): { preset: BenchmaxxingPreset; showAll: boolean } | null {
  const order: BenchmaxxingPreset[] = [current, ...(["featured", "signals", "all"] as BenchmaxxingPreset[]).filter((p) => p !== current)];
  for (const preset of order) {
    const index = presetRows(rows, preset).findIndex((r) => r.id === id);
    if (index >= 0) return { preset, showAll: index >= limit };
  }
  return null;
}
