// TypeSafe-20 image radar (lead job jevbench-radar-full-areas-20261009, Florian 9 Oct 2026): a separate sealed 600-item bank,
// 30 items per TypeSafe use case, measured for the ImageJev rows and the Jev image-to-text reference. The values are a third
// category dimension next to the v0.3 image types and v0.3 use cases; they never enter the v0.3 score or rank. A system
// without a measured cell keeps a gap (no imputation).
export const TS20_REFERENCE_KEY = 'jev-1.13.0';

/** Append the TypeSafe-20 dimension and merge its per-system cells into the v0.3 category artifact. */
export function withTs20(categories, ts20) {
  if (!categories || !ts20?.dim) return categories;
  const systems = { ...categories.systems };
  for (const [key, cells] of Object.entries(ts20.systems ?? {})) systems[key] = { ...(systems[key] ?? {}), typesafe: cells.typesafe };
  return { ...categories, dims: [...categories.dims, ts20.dim], systems };
}

/** The Jev image REFERENCE row for the compare panel: unranked, no v0.3 axes (gaps), TypeSafe-20 cells only. */
export function ts20ReferenceRow(ts20, template) {
  if (!ts20?.systems?.[TS20_REFERENCE_KEY]) return null;
  const nullAxes = Object.fromEntries(Object.keys(template?.axes ?? { intelligence: 0, calibration: 0, speed: 0, cost: 0 }).map((k) => [k, null]));
  return {
    ...template,
    key: TS20_REFERENCE_KEY,
    name: 'Jev 1.13.0 — REFERENCE (image-to-text)',
    cls: 'jev', arch: null, archBadges: null, alt: undefined,
    rank: null, listing: 'reference', score: null, repo: null, hosted: true,
    axes: nullAxes,
    typeCc: Object.fromEntries(Object.keys(template?.typeCc ?? {}).map((k) => [k, { open: null, sealed: null }])),
    tierCc: Object.fromEntries(Object.entries(template?.tierCc ?? {}).map(([p, t]) => [p, Object.fromEntries(Object.keys(t).map((k) => [k, null]))])),
  };
}
