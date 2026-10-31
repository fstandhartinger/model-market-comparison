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
//
// CR-634 (2026-10-31, Florian card #19017 / reply #19020): v5.0 adopted after review. The pin moved to 5; a v6 page
// (or a page back on v4) is again a version change that holds the published snapshot. The v4.x snapshot of 2026-10-27
// is frozen in artificialanalysis-v4.json / aa-efficiency-v4.json and feeds the labelled v4→v5 estimates
// (lib/aa-index-surrogate.mjs) and the frozen Coding/Math Index values.
export const AA_INDEX_PINNED_MAJOR = '5';
// The snapshot the collector writes names its index version. A previous snapshot without one is the legacy v4.x file.
export const snapshotIndexMajor = (snapshot) => String(snapshot?.index_version ?? '4').split('.')[0];
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

/** The single version the page states when every statement shares the pinned major version (e.g. "5.0"); else null. */
export function pinnedAaIndexVersion(versions) {
  if (!Array.isArray(versions) || !versions.length) return null;
  if (versions.some((v) => v.split('.')[0] !== AA_INDEX_PINNED_MAJOR)) return null;
  return versions.reduce((a, b) => (b.split('.').length > a.split('.').length ? b : a));
}

/**
 * CR-634: how one collector run treats the three index fields. `changed`: the page names another major version (hold).
 * `adoption`: the page cleanly states the pinned version while the previous snapshot is on another major version — the
 * single reviewed run whose index fields are compared with nothing. Otherwise every field has the full withdrawal check.
 */
export function aaIndexRunMode(pageVersions, previous) {
  const changed = changedAaIndexVersion(pageVersions);
  const pinned = pinnedAaIndexVersion(pageVersions);
  const adoption = !changed && pinned != null && snapshotIndexMajor(previous) !== AA_INDEX_PINNED_MAJOR;
  const indexVersion = pinned ?? (snapshotIndexMajor(previous) === AA_INDEX_PINNED_MAJOR ? previous.index_version : `${AA_INDEX_PINNED_MAJOR}.0`);
  return { changed, pinned, adoption, exemptIndexFields: Boolean(changed) || adoption, indexVersion };
}

// CR-634 (critic rounds 2–3, F7): the adoption run compares the index fields with nothing, so it has its own floor: the
// reviewed adoption had exactly 89 Intelligence Index values (31 Oct 2026); anything less is a partial payload and fails
// closed. A later major version (v6) is a new reviewed adoption that sets its own floor here.
export const AA_ADOPTION_MIN_SCORED = 89;
export function assertAdoptionCoverage(models, label = 'AA') {
  const scored = (models ?? []).filter((m) => typeof m?.evaluations?.artificial_analysis_intelligence_index === 'number' && Number.isFinite(m.evaluations.artificial_analysis_intelligence_index)).length;
  if (scored < AA_ADOPTION_MIN_SCORED) throw new Error(`${label}: adopting a new Intelligence Index version needs at least ${AA_ADOPTION_MIN_SCORED} scored models; the response has ${scored}`);
  return scored;
}
