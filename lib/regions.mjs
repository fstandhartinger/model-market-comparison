// CR-25.4 groundwork (Florian 2026-09-15): regional options expressed positively — "Hosted in", "Inference
// provider company based in", "Model lab based in", each over the buckets China / EU / US / Other, all
// checked by default. Pure functions so the mapping and the migration from the old toggles are testable.

export const REGION_BUCKETS = Object.freeze(['China', 'EU', 'US', 'Other']);

const EU_MEMBERS = new Set(['Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France',
  'Germany', 'Greece', 'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania',
  'Slovakia', 'Slovenia', 'Spain', 'Sweden']);

/** A company's country → bucket. "EU" itself counts as EU; Hong Kong counts as China (as the Chinese-provider rule
 *  already does); an unknown or missing country is Other, never guessed. UK, Switzerland and Norway are Other. */
export function countryBucket(country) {
  const c = String(country ?? '').trim();
  if (!c) return 'Other';
  if (/^(china|cn|hong kong|prc)$/i.test(c)) return 'China';
  if (/^(us|usa|united states( of america)?)$/i.test(c)) return 'US';
  if (/^eu$/i.test(c) || EU_MEMBERS.has(c)) return 'EU';
  return 'Other';
}

/** Where one offer's inference runs → bucket. EU needs the existing per-offer EU evidence (`euHosted`, the same
 *  rule the EU-hosted filter applies); a region label alone never makes a route EU. US regions → US; explicit
 *  Chinese regions → China; global, UK and unspecified routes → Other. */
export function hostingBucket(offer, euHosted) {
  if (euHosted) return 'EU';
  const r = String(offer?.region ?? '').toLowerCase();
  if (/^us(\b|-)/.test(r)) return 'US';
  if (/^(cn|china)\b/.test(r)) return 'China';
  return 'Other';
}

/** The positive sets a stored pre-CR-25.4 settings payload maps onto, so nobody's results change:
 *  EU-hosted only → Hosted in {EU}; exclude Chinese providers → provider company not China; non-US provider only →
 *  provider company not US. Defaults (all toggles off) give every bucket checked. */
export function regionStateFromLegacy({ euHostedOnly = false, excludeChinese = false, nonUsOnly = false } = {}) {
  return {
    hostedIn: euHostedOnly ? ['EU'] : [...REGION_BUCKETS],
    providerBasedIn: REGION_BUCKETS.filter((b) => !(excludeChinese && b === 'China') && !(nonUsOnly && b === 'US')),
    labBasedIn: [...REGION_BUCKETS],
  };
}

/** True when every bucket is checked (the filter is inactive). */
export const allRegions = (list) => REGION_BUCKETS.every((b) => (list ?? []).includes(b));
