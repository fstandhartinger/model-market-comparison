// "Use this model" entry on JevBench (open weights) and ImageJevBench rows. PREVIEW: hidden from visitors until
// Florian's GO (not before the Decision Models unstealth). Flip USE_MODEL_PUBLIC to true to roll it out; until then it
// only renders in a tab opened with the unpublished ?bh-pv=<token> link. It lasts for that tab only (sessionStorage),
// always shows a PREVIEW banner, and any other ?bh-pv value or the banner's exit button switches it off (10 Oct 2026).

import slugs from '../data/use-model-slugs.json';

export const USE_MODEL_PUBLIC = false;
export const USE_MODEL_PARAM = 'bh-pv';
export const USE_MODEL_TOKEN = 'dm-use-7q';
/** sessionStorage key; the 9 Oct preview kept the same key in localStorage, which is now cleared on every visit. */
export const USE_MODEL_STORAGE_KEY = 'bh-use-model-preview';
export const USE_MODEL_HUB = 'https://decisionmodels.io/models';

export type UseModelBenchmark = 'jevbench' | 'imagejevbench';
export type UseModelTarget = 'hub' | 'dedicated' | 'api' | 'local' | 'hardware';

/** Hub card anchors on decisionmodels.io/models/<slug> (workstream D owns the hub; renamed here if D names them differently). */
export const USE_MODEL_ANCHORS: Record<Exclude<UseModelTarget, 'hub'>, string> = {
  dedicated: 'dedicated', api: 'api', local: 'local', hardware: 'hardware',
};

const SLUGS: Record<UseModelBenchmark, Record<string, string>> = { jevbench: slugs.jevbench, imagejevbench: slugs.imagejevbench };

/** Benchmark system key -> hub slug, from the hub's own mapping (data/use-model-slugs.json, scripts/sync-use-model-slugs.mjs). */
export function useModelSlug(key: string, benchmark: UseModelBenchmark): string {
  return SLUGS[benchmark][key] ?? key.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
}

export function useModelHref(key: string, benchmark: UseModelBenchmark, target: UseModelTarget = 'hub'): string {
  const hash = target === 'hub' ? '' : `#${USE_MODEL_ANCHORS[target]}`;
  return `${USE_MODEL_HUB}/${useModelSlug(key, benchmark)}?ref=${benchmark}${hash}`;
}

/** Open-weights rows the hub knows: hosted APIs, wrappers and the Jev reference cannot be hosted or run by the visitor,
 *  and a row the hub has no page for yet shows no button instead of a dead link. */
export function useModelEligible(row: { key: string; api_flag?: boolean; listing?: string }, benchmark: UseModelBenchmark): boolean {
  if (row.api_flag) return false;
  if (row.listing && ['reference', 'wrapper', 'api_offering'].includes(row.listing)) return false;
  return row.key in SLUGS[benchmark];
}
