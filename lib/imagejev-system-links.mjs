import { baseModelFor } from './jev-base-model.mjs';

// CR-254: keep Image system keys and reviewed sources separate from text system keys.
export const imageJevSystemPath = (key) => `/image-jev-bench/${encodeURIComponent(key)}`;
export const imageJevSourceUrl = (key, repo) => repo ?? baseModelFor('imagejevbench', key).sources[0]?.url ?? null;
