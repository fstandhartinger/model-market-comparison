import { baseModelFor } from './jev-base-model.mjs';

// CR-254: keep Image system keys and reviewed sources separate from text system keys.
export const IMAGE_JEV_DETAIL_VERSIONS = ['v0.2.0', 'v0.1.5', 'v0.1.4'];
export const imageJevAuthorUrl = (key) => key === 'wity_1' ? 'https://wity.alphanimble.com/' : null;
export function imageJevSystemPath(key, revision) {
  if (revision != null && !IMAGE_JEV_DETAIL_VERSIONS.includes(revision)) throw new Error(`Unsupported ImageJev revision: ${revision}`);
  return `/image-jev-bench/${revision ? `${revision}/` : ''}${encodeURIComponent(key)}`;
}
export const imageJevBoardPath = (revision = 'v0.2.0') => {
  if (!IMAGE_JEV_DETAIL_VERSIONS.includes(revision)) throw new Error(`Unsupported ImageJev revision: ${revision}`);
  return `/image-jev-bench?version=${revision}`;
};
export const imageJevSourceUrl = (key, repo, revision = 'v0.2.0') => {
  // Historical recipe is a distinct configuration, never the current Imajev repository.
  if (key === 'imajev_4b_20260926' || (revision === 'v0.2.0' && ['neohorse_jev_4b', 'jevany_27b_sft', 'jevany_27b_rlcr'].includes(key))) return null;
  return repo ?? baseModelFor('imagejevbench', key).sources[0]?.url ?? null;
};
