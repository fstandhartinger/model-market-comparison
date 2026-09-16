// F-101: the Providers list shows one row per provider *product*, not one per catalog key.
// One product can reach the catalog twice — through the provider's own API and through a gateway
// (OpenRouter) — and sometimes under a second spelling: "Amazon Bedrock" is OpenRouter's name for
// AWS Bedrock, "Azure" for Azure AI Foundry, "Google" for Google Vertex AI. A reader who wants to
// untick a company then sees two rows with no way to tell them apart.
//
// The folding lives here, on the catalog side, so the component only renders what it is given and
// every surface that lists providers reads the same names. Two *different* products of one company
// are never merged (Google AI Studio is not Vertex AI, "Claude Platform on AWS" is not Bedrock):
// their data policies, regions and prices differ, and excluding one but not the other is a real
// choice. The catalog keys themselves stay exactly as they are, so a stored exclusion, a preset or
// a shared URL keeps meaning what it meant (a partly excluded company shows as a mixed checkbox).

/** Gateway spellings → the name this site already uses for the same product (/eu, /about, the
 *  cost model's platform names). Keyed by the full catalog key, so a provider that happens to
 *  share a name on another platform is never renamed by accident. */
export const PROVIDER_COMPANY_BY_KEY = {
  'OpenRouter::Amazon Bedrock': 'AWS Bedrock',
  'OpenRouter::Azure': 'Azure AI Foundry',
  'OpenRouter::Google': 'Google Vertex AI',
};

export const providerKeyOf = (p) => `${p.platform}::${p.provider}`;

/** The name of the product behind a catalog entry. */
export function providerCompanyName(p) {
  return PROVIDER_COMPANY_BY_KEY[providerKeyOf(p)] || p.provider;
}

/** How the product is reached: its own API, or a gateway. */
export function providerRouteLabel(p) {
  return p.platform === p.provider ? 'direct' : `via ${p.platform}`;
}

/**
 * Fold a provider catalog into one entry per product.
 * Returns `{ key, keys, label, sub, search, routes, names }`, ordered like the input (first key wins),
 * with the direct route first inside a group.
 */
export function providerCompanies(providers) {
  const groups = new Map();
  for (const p of providers) {
    const label = providerCompanyName(p);
    const group = groups.get(label) || { label, entries: [] };
    group.entries.push(p);
    groups.set(label, group);
  }
  return [...groups.values()].map(({ label, entries }) => {
    const sorted = [...entries].sort((a, b) => Number(b.platform === b.provider) - Number(a.platform === a.provider));
    const keys = sorted.map(providerKeyOf);
    const routes = sorted.map(providerRouteLabel);
    const names = [...new Set(sorted.map((p) => p.provider))];
    const sub = routes.length === 1
      ? (routes[0] === 'direct' ? undefined : routes[0])
      : routes.length <= 3 ? routes.join(' · ') : `${routes.length} routes`;
    return {
      key: keys[0], keys, label, sub, routes, names,
      // The search matches the company and every route name it folds in, so typing "Amazon"
      // still finds AWS Bedrock.
      search: [label, ...names, ...routes, ...sorted.map((p) => p.platform)].join(' '),
    };
  });
}
