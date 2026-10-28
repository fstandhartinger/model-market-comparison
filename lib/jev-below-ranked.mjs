// CR-599 (board #31027): an unranked second read of an already ranked system is listed below the ranked in-class rows of a
// Capability headline, so it neither sits among the ranks nor pushes a ranked row out of the headline fold. Explicit keys only;
// every other row keeps its order.
export const JEV_BELOW_RANKED_KEYS = new Set(['h2o_lightning_4b_v141_d7f1_image']);

/** Stable: rows whose key is listed move after all other rows; both groups keep their relative order. */
export function jevBelowRankedLast(rows, keyOf = (r) => r.row.key) {
  return [...rows.filter((r) => !JEV_BELOW_RANKED_KEYS.has(keyOf(r))), ...rows.filter((r) => JEV_BELOW_RANKED_KEYS.has(keyOf(r)))];
}
