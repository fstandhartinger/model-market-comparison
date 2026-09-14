export interface ShortlistRow {
  id: string;
  cost: number | null | undefined;
  score: number | null | undefined;
}
/** F-74: ids kept when more than `limit` rows pass — Pareto line first, then highest scores. */
export function capShortlist(rows: readonly ShortlistRow[], limit: number | undefined): Set<string>;
