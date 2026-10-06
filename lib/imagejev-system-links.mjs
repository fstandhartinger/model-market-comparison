import { baseModelFor } from './jev-base-model.mjs';

// CR-254: keep Image system keys and reviewed sources separate from text system keys.
export const imageJevSystemPath = (key) => `/image-jev-bench/${encodeURIComponent(key)}`;
// Author-requested product homepages for closed systems without a public repo (wity: Rakshith, X, 6 Oct 2026).
export const IMAGE_JEV_HOMEPAGES = Object.freeze({ wity_1: 'https://wity.alphanimble.com/' });
export const imageJevSourceUrl = (key, repo) => repo ?? IMAGE_JEV_HOMEPAGES[key] ?? baseModelFor('imagejevbench', key).sources[0]?.url ?? null;
