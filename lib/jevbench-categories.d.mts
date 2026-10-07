export type CategoryDef = { key: string; label: string; short: string; covers: string; n: number; split: { a: number; b: number }; lowN: boolean; plotted: boolean; lowSample: boolean };
export type CategoryDim = { key: string; title: string; note: string; cats: CategoryDef[] };
/** systems[key][dim][category] = [competence 0–100 (can be negative), items answered by that system in the category] */
export type CompareCategories = {
  revision: string; minN: number; radarMinN: number; metric: string; labelling: string; rules: string[]; splitNames: [string, string] | string[];
  dims: CategoryDim[]; systems: Record<string, Record<string, Record<string, [number, number]>>>; missing: Record<string, string>;
};
export const JEVBENCH_CATEGORY_ARTIFACT: string;
export const IMAGEJEV_CATEGORY_ARTIFACT: string;
export const JEVBENCH_CATEGORY_REVISIONS: string[];
export const IMAGEJEV_CATEGORY_REVISIONS: string[];
export function validateCategoryArtifact(artifact: any, dims: string[]): any;
export function jevbenchCategoryView(revision: string, keys: string[], options?: { supplement?: boolean }): CompareCategories | null;
export const JEVBENCH_CELL_SUPPLEMENT_ARTIFACT: string;
export function withJevCellSupplement<T extends { revision: string; systems: Record<string, unknown> }>(base: T, supplement?: unknown): T & { supplement: { revision: string; pools: Record<string, number>; pool_items: number; drawn: string; note: string; source_sha256: string } };
export function imageJevCategoryView(revision: string, keys: string[]): CompareCategories | null;
export const RADAR_MIN_N: number;
export const CATEGORY_SHORT: Record<string, string>;
