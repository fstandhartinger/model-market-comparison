import { paretoFrontier } from "./pareto.mjs";

/**
 * F-74 — which models stay when more than `limit` pass the shortlist limits.
 *
 * The Simple/Guided table is capped at 15 and opens score-descending (CR-8.1); the user can
 * re-sort by cost. Cutting the *display* order would drop the cheapest passing models — exactly the
 * ones a "recommended models" list must keep. So the cap is decided separately from the
 * order: every model on the Pareto line (nobody is both cheaper and better) is kept first,
 * then the highest scores fill the remaining slots. Unpriced or unscored rows can never be
 * on the line and rank after all scored rows. Returns the kept ids in no particular order;
 * the caller applies the display order.
 */
export function capShortlist(rows, limit) {
  if (!limit || rows.length <= limit) return new Set(rows.map((r) => r.id));
  const priced = rows.filter((r) => Number.isFinite(r.cost) && Number.isFinite(r.score));
  const frontier = new Set(paretoFrontier(priced.map((r) => ({ id: r.id, x: r.cost, y: r.score }))).map((p) => p.id));
  const score = (r) => (Number.isFinite(r.score) ? r.score : -Infinity);
  const ordered = [...rows].sort((a, b) =>
    (frontier.has(b.id) ? 1 : 0) - (frontier.has(a.id) ? 1 : 0)
    || score(b) - score(a)
    || String(a.id).localeCompare(String(b.id)));
  return new Set(ordered.slice(0, limit).map((r) => r.id));
}
