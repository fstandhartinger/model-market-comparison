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

/**
 * F-106 / CR-49.1 — the Simple view's comparison selection: one ordered list of at most SHORTLIST_CAP model ids that
 * the score chart and the benchmark table both follow (slot k = series colour k = table column k). Automatic by
 * default (the top of the list above); manual once the user adds, removes or moves a model. Pure functions — the
 * component owns storage.
 */
export const SHORTLIST_CAP = 5;
export const SHORTLIST_STORAGE_KEY = "bh.simpleShortlist.v1";

/** Adds `id` at the last free slot; unchanged when present or full. */
export function addToSelection(sel, id, cap = SHORTLIST_CAP) {
  return sel.includes(id) || sel.length >= cap ? sel : [...sel, id];
}

/** Removes `id`; later slots move up. */
export function removeFromSelection(sel, id) {
  return sel.includes(id) ? sel.filter((x) => x !== id) : sel;
}

/** Add when absent (if not full), remove when present. */
export function toggleInSelection(sel, id, cap = SHORTLIST_CAP) {
  return sel.includes(id) ? removeFromSelection(sel, id) : addToSelection(sel, id, cap);
}

/** Swaps `id` with its neighbour: dir -1 = left, +1 = right. A move past either end is a no-op. */
export function moveInSelection(sel, id, dir) {
  const i = sel.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= sel.length) return sel;
  const out = [...sel];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/**
 * What the chart and table show. `stored`: the persisted manual list (or null); `allowed`: the ids the list above
 * currently shows (the global filters decide it — this feature never changes them); `auto`: today's automatic ids.
 * Stored ids the filters no longer allow drop out silently; a manual list the filters empty entirely falls back to
 * automatic (a list the user emptied stays empty).
 * An empty `allowed` (the list has not rendered yet) is not a reason to drop anything: the automatic ids are shown
 * and the stored list stays untouched.
 */
export function resolveSelection(stored, allowed, auto, cap = SHORTLIST_CAP) {
  if (!Array.isArray(stored) || !allowed.length) return { ids: auto.slice(0, cap), manual: false };
  // The user removed every model: an empty comparison is their choice, not a reason to refill it.
  if (!stored.length) return { ids: [], manual: true };
  const ok = new Set(allowed);
  const ids = [...new Set(stored)].filter((id) => ok.has(id)).slice(0, cap);
  return ids.length ? { ids, manual: true } : { ids: auto.slice(0, cap), manual: false };
}

/** Parses the stored value `{ ids, at }`; anything else is "no manual selection". */
export function parseStoredSelection(raw) {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v?.ids) && v.ids.every((x) => typeof x === "string") ? v.ids : null;
  } catch { return null; }
}
