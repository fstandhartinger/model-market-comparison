export type CategoryDef = { key: string; label: string; short: string; covers: string; n: number; split: { a: number; b: number }; lowN: boolean; plotted: boolean };
export type CategoryDim = { key: string; title: string; note: string; cats: CategoryDef[] };
/** systems[key][dim][category] = [competence 0–100 (can be negative), items answered by that system in the category] */
export type CompareCategories = {
  revision: string; minN: number; metric: string; labelling: string; rules: string[]; splitNames: [string, string] | string[];
  dims: CategoryDim[]; systems: Record<string, Record<string, Record<string, [number, number]>>>; missing: Record<string, string>;
};
export const JEVBENCH_CATEGORY_ARTIFACT: string;
export const IMAGEJEV_CATEGORY_ARTIFACT: string;
export const JEVBENCH_CATEGORY_REVISIONS: string[];
export const IMAGEJEV_CATEGORY_REVISIONS: string[];
export function validateCategoryArtifact(artifact: any, dims: string[]): any;
export function jevbenchCategoryView(revision: string, keys: string[]): CompareCategories | null;
export function imageJevCategoryView(revision: string, keys: string[]): CompareCategories | null;
export const CATEGORY_SHORT: Record<string, string>;
