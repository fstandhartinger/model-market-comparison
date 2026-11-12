// Model page URL resolution and canonical policy.
//
// F-228 (Fable pass 43): /models/<raw> accepts an exact id, a family key, or a variant id whose variant has
// left the data while its family is still here — a launch-day "::default" row gains real variants a day later,
// and the link shared on launch day must not 404.
//
// Growth SEO (12 Nov 2026): the sitemap lists one URL per family (/models/<family_key>). The variant that the
// family URL resolves to names that same family URL as canonical, so sitemap and canonical agree. Before, e.g.
// /models/claude-opus-5.5 declared /models/claude-opus-5.5%3A%3Amax, a URL that is not in the sitemap.
// Every other variant keeps its own URL as canonical.

/** @template {{ id: string, family_key: string }} T @param {T[]} models @param {string} raw @returns {T | undefined} */
export function findModel(models, raw) {
  const id = decodeURIComponent(raw);
  const family = id.split('::')[0];
  return models.find((m) => m.id === id || m.family_key === id) ?? (family !== id ? models.find((m) => m.family_key === family) : undefined);
}

/** @template {{ id: string, family_key: string }} T @param {T[]} models @param {T} model @returns {string} */
export function modelCanonicalPath(models, model) {
  const representative = findModel(models, model.family_key);
  const key = representative?.id === model.id ? model.family_key : model.id;
  return `/models/${encodeURIComponent(key)}`;
}
