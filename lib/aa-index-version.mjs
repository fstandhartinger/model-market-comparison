// CR-629 (2026-10-31): Artificial Analysis moved its Intelligence Index from v4.x to v5.0 on 2026-10-28.
// The v2 API now carries the index for 89 of 704 previously scored models (rescored values move a median of
// about -9 points) and has withdrawn the Coding and Math Indexes for every model. fetch-aa refused that
// response, correctly, and the daily died at fetch-aa four days running, so no source published at all.
//
// A different major index version is a methodology review, never a silent update (as CR-542 is for the Coding
// Agent Index). Minor versions (4.0 → 4.3.2) have always rolled in with their values and still do. The collector
// is pinned to the major version; a leaderboard that names one other major version in every statement carries
// the marker, and the daily then keeps the published v4.x snapshot with its own date while every other source
// publishes. Absent or mixed statements are never a version change: the ordinary checks then fail closed.
export const AA_INDEX_PINNED_MAJOR = '4';
export const AA_INDEX_VERSION_CHANGED = 'AA_INDEX_VERSION_CHANGED';
// The composite indexes AA derives from its own index methodology. Every other evaluation is a single benchmark.
export const AA_INDEX_FIELDS = ['artificial_analysis_intelligence_index', 'artificial_analysis_coding_index', 'artificial_analysis_math_index'];

/** Every "Intelligence Index vX[.Y…]" statement on the captured leaderboard page, in page order. */
export function aaIndexPageVersions(html) {
  if (typeof html !== 'string' || !html) throw new Error('AA leaderboard page missing');
  return [...html.matchAll(/Intelligence Index v(\d+(?:\.\d+)*)\b/g)].map((m) => m[1]);
}

/** The page's index version when every statement names one major version other than the pinned one; else null. */
export function changedAaIndexVersion(versions) {
  if (!Array.isArray(versions) || !versions.length) return null;
  const majors = new Set(versions.map((v) => v.split('.')[0]));
  if (majors.size !== 1 || majors.has(AA_INDEX_PINNED_MAJOR)) return null;
  return versions.reduce((a, b) => (b.split('.').length > a.split('.').length ? b : a));
}

export function aaIndexVersionChangeMessage(pageVersion) {
  return `${AA_INDEX_VERSION_CHANGED} (page states v${pageVersion}, collector pinned to v${AA_INDEX_PINNED_MAJOR}.x)`;
}
