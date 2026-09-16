export interface ShortlistRow {
  id: string;
  cost: number | null | undefined;
  score: number | null | undefined;
}
/** F-74: ids kept when more than `limit` rows pass — Pareto line first, then highest scores. */
export function capShortlist(rows: readonly ShortlistRow[], limit: number | undefined): Set<string>;
export const SHORTLIST_CAP: number;
export const SHORTLIST_STORAGE_KEY: string;
export function addToSelection(sel: string[], id: string, cap?: number): string[];
export function removeFromSelection(sel: string[], id: string): string[];
export function toggleInSelection(sel: string[], id: string, cap?: number): string[];
export function moveInSelection(sel: string[], id: string, dir: -1 | 1): string[];
export function resolveSelection(stored: string[] | null, allowed: string[], auto: string[], cap?: number): { ids: string[]; manual: boolean };
export function parseStoredSelection(raw: string | null): string[] | null;
