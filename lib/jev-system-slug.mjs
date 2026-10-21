// CR-170 (2026-09-26): a JevBench system key is an internal, frozen artifact id; its public page URL is
// normally the same string. When an operator asks for a rename, the key stays (the pinned artifacts and
// receipts use it) and only the public slug changes; the old URL answers with a permanent redirect
// (next.config.mjs, JEV_SYSTEM_SLUG_REDIRECTS).
export const JEV_SYSTEM_SLUG_ALIASES = {
  'kushal-gemma4-31b-it-autoloops': 'autoloops-gemma-4-31b-it',
};
const KEY_BY_SLUG = Object.fromEntries(Object.entries(JEV_SYSTEM_SLUG_ALIASES).map(([key, slug]) => [slug, key]));

export const jevSystemSlug = (key) => JEV_SYSTEM_SLUG_ALIASES[key] ?? key;
export const jevSystemKeyFromSlug = (slug) => KEY_BY_SLUG[slug] ?? slug;
export const jevSystemPath = (key) => `/jev-models/${encodeURIComponent(jevSystemSlug(key))}`;
export const JEV_SYSTEM_SLUG_REDIRECTS = Object.entries(JEV_SYSTEM_SLUG_ALIASES)
  .map(([key, slug]) => ({ source: `/jev-models/${key}`, destination: `/jev-models/${slug}`, permanent: true }));

// Superseded model pages: the old slug stays a (temporary) redirect to the release that replaced it. Listed here so
// next.config.mjs and the sitemap read one source; a redirecting URL must not be in the sitemap.
// CR-519 (v1.6.35): Seb-9B's 7 Oct v1.6.1 row is superseded by its re-measurement; its model URL points to that release.
export const JEV_SUPERSEDED_SLUG_REDIRECTS = [
  { source: '/jev-models/seb-9b', destination: '/jev-models/v1.6.35', permanent: false },
];
export const isRedirectedJevPath = (path) => [...JEV_SYSTEM_SLUG_REDIRECTS, ...JEV_SUPERSEDED_SLUG_REDIRECTS].some((r) => r.source === path);
