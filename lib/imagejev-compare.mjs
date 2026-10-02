import { imageJevDetailsFromArtifact } from './imagejev-details.mjs';

/** All visible release identities, with current measurements separate from archive references. */
export function imageJevReleaseCompareRows(artifact) {
  return imageJevDetailsFromArtifact(artifact).map((row) => ({
    key: row.key, name: row.display, cls: row.class, rank: row.rank,
    listing: row.status,
    score: row.jevbench_score, repo: row.source_url, axes: row.axes,
    typeCc: Object.fromEntries(['choice', 'noul', 'score'].map((key) => [key, { open: null, sealed: null }])),
    tierCc: Object.fromEntries(['open', 'sealed'].map((part) => [part,
      Object.fromEntries(['easy', 'standard', 'judge', 'hard'].map((tier) => [tier, null]))])),
  }));
}
