import { benchmaxxingAdjustedComposite } from "./composite.mjs";
/** CR-74.4: the Options checkbox "Include Benchmaxxing signal in the score". Server payloads carry the penalised Main
 *  Composite (the default, so the first ranking already includes it) plus `composite_raw`; with the checkbox off every
 *  model list in a page payload gets its raw composite back. Known shapes: ClientData (`models`), the home payload
 *  (`data.models`) and the benchmarks payload (`filterData.models`). Identity (same object) when `include` is on. */
type WithRaw = { composite_raw?: number | null; scores: { composite: number | null } };
const restore = <M>(models: M[]): M[] => models.map((m) => {
  const r = m as unknown as WithRaw;
  return r && r.scores && r.composite_raw !== undefined ? { ...m, scores: { ...r.scores, composite: r.composite_raw } } as M : m;
});
export function withCompositeSetting<T>(payload: T, include: boolean): T {
  if (include || !payload || typeof payload !== "object") return payload;
  const p = payload as Record<string, unknown>;
  const fix = (holder: Record<string, unknown> | undefined) =>
    holder && typeof holder === "object" && Array.isArray(holder.models) ? { ...holder, models: restore(holder.models) } : holder;
  let out: Record<string, unknown> = p;
  if (Array.isArray(p.models)) out = fix(p)!;
  for (const key of ["data", "filterData"]) {
    const inner = p[key] as Record<string, unknown> | undefined;
    if (inner && typeof inner === "object" && Array.isArray(inner.models)) out = { ...out, [key]: fix(inner) };
  }
  return out as T;
}

/** CR-74.4: the composite accessor for Benchmaxxing-tab rows (`composite` = raw Main Composite, `score` = the
 *  family's Benchmaxxing signal), e.g. `presetRows(rows, preset, benchmaxxingCompositeOf(includeBenchmaxxing))`. */
export const benchmaxxingCompositeOf = (include: boolean) =>
  (row: { composite: number | null; score: number | null }): number | null => benchmaxxingAdjustedComposite(row.composite, row.score, include);
