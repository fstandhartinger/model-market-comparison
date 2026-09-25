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
