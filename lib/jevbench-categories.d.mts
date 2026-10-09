export type CategoryDef = { key: string; label: string; short: string; covers: string; n: number; split: { a: number; b: number }; lowN: boolean; plotted: boolean; lowSample: boolean };
export type CategoryDim = { key: string; title: string; note: string; cats: CategoryDef[] };
/** systems[key][dim][category] = [competence 0–100 (can be negative), scored observations, optional completed supported responses including refusals] */
export type CompareCategories = {
  revision: string; minN: number; radarMinN: number; metric: string; labelling: string; rules: string[]; splitNames: [string, string] | string[];
  categoryPools?: Record<string, string>; spokeExceptions?: Record<string, string>; exposureNotes?: Record<string, string>;
  dims: CategoryDim[]; systems: Record<string, Record<string, Record<string, [number, number, number?]>>>; missing: Record<string, string>;
};
export const JEVBENCH_CATEGORY_ARTIFACT: string;
export const L3_EXPOSURE_NOTES: Record<string, string>;
export const IMAGEJEV_CATEGORY_ARTIFACT: string;
export const JEVBENCH_CATEGORY_REVISIONS: string[];
export type JevFreshV16Revision = 'v1.6.2' | 'v1.6.3';
export const JEVBENCH_FRESH_V16_REVISIONS: JevFreshV16Revision[];
export function isFreshJevbenchV16Revision(revision: unknown): revision is JevFreshV16Revision;
export const IMAGEJEV_CATEGORY_REVISIONS: string[];
export function validateCategoryArtifact(artifact: any, dims: string[]): any;
export function jevbenchCategoryView(revision: string, keys: string[], options?: { supplement?: boolean; artifact?: unknown }): CompareCategories | null;
export const JEVBENCH_CELL_SUPPLEMENT_ARTIFACT: string;
export function withJevCellSupplement<T extends { revision: string; systems: Record<string, unknown> }>(base: T, supplement?: unknown): T & { supplement: { revision: string; pools: Record<string, number>; pool_items: number; drawn: string; note: string; source_sha256: string } };
export function imageJevCategoryView(revision: string, keys: string[]): CompareCategories | null;
export const RADAR_MIN_N: number;
export const CATEGORY_SHORT: Record<string, string>;

export const JEVBENCH_LANGUAGE_CELLS_ARTIFACT: string;
export type LanguageCellsMeta = { pools: Record<string, number>; min_n: number; drawn: string | null; min_api_basis: number };
export function withLanguageCells<T extends { revision: string; systems: Record<string, unknown> }>(base: T, cells?: any): T & { language_cells: LanguageCellsMeta };
export function languageCoverage(row: any): string;
export function jevLanguageRows<T extends { key: string; listing?: string }>(systems: T[], scope?: string): T[];
export function languagePoolNote(meta: LanguageCellsMeta): string;

export const JEVBENCH_LANGUAGE_META: LanguageCellsMeta;

export const JEVBENCH_S_CATEGORY_CELLS_ARTIFACT: string;
export function withSCategoryCells<T extends { revision: string; systems: Record<string, unknown> }>(base: T, cells?: any): T;
export function withLiveCategoryCells<T extends { revision: string; systems: Record<string, unknown> }>(base: T): ReturnType<typeof withLanguageCells<T>>;

export function freshJevbenchCategoryRows<T extends { listing?: string; rank?: number | null; jevbench_score?: number | null }>(systems: T[]): T[];
