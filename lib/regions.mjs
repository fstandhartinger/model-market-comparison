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

/** A stored or decoded bucket list → the canonical order, unknown entries dropped. An empty or missing list means
 *  "all" (a row with every chip off would silently empty every view, so the UI never produces one). */
export function sanitizeRegionList(list) {
  if (!Array.isArray(list)) return null;
  const kept = REGION_BUCKETS.filter((b) => list.includes(b));
  return kept.length ? kept : [...REGION_BUCKETS];
}

/** Settings or a preset patch that still carries the pre-CR-25.4 booleans → the positive lists. Keys already in the
 *  new shape win; the old keys are removed so they cannot be re-applied. Returns a new object. */
export function migrateLegacyRegions(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const legacy = ['euHostedOnly', 'excludeChinese', 'nonUsOnly'].some((k) => k in raw);
  if (!legacy) return raw;
  const { euHostedOnly, excludeChinese, nonUsOnly, ...rest } = raw;
  const mapped = regionStateFromLegacy({ euHostedOnly: euHostedOnly === true, excludeChinese: excludeChinese === true, nonUsOnly: nonUsOnly === true });
  if (!('hostedIn' in rest)) rest.hostedIn = mapped.hostedIn;
  if (!('providerBasedIn' in rest)) rest.providerBasedIn = mapped.providerBasedIn;
  return rest;
}

/** CR-25.4 "Model lab based in": where the company that trained the model is registered. Only labs whose home
 *  country is well documented are listed; every other lab (community fine-tuners, labs we have not checked) is
 *  Other — never guessed. Keys are the dataset's `org` names. */
export const LAB_COUNTRIES = Object.freeze({
  Anthropic: 'US', OpenAI: 'US', Google: 'US', Meta: 'US', xAI: 'US', Microsoft: 'US', Amazon: 'US', NVIDIA: 'US', IBM: 'US',
  'Thinking Machines': 'US', Perplexity: 'US', ServiceNow: 'US', Snowflake: 'US', Databricks: 'US', 'Allen Institute for AI': 'US',
  'Liquid AI': 'US', 'Nous Research': 'US', 'Arcee AI': 'US', 'Prime Intellect': 'US', 'Reka AI': 'US', Inception: 'US', Cursor: 'US',
  Writer: 'US', 'Deep Cogito': 'US',
  // D172.1/D172.2, checked 2026-09-22 against each company's own legal pages: Unbiased is Circuit & Chisel, Inc.
  // ("We are headquartered in the United States", unbiased.ai/terms); Cognition AI, Inc. governs its terms by
  // California law (cognition.com/terms, cognition.com/privacy).
  Unbiased: 'US', 'Cognition AI': 'US',
  'Z.ai': 'China', 'Moonshot AI': 'China', Alibaba: 'China', DeepSeek: 'China', MiniMax: 'China', Xiaomi: 'China', Tencent: 'China',
  Baidu: 'China', 'ByteDance Seed': 'China', StepFun: 'China', 'China Mobile': 'China', InclusionAI: 'China', inclusionAI: 'China',
  OpenBMB: 'China', LongCat: 'China', KwaiKAT: 'China', Kwaipilot: 'China',
  Mistral: 'France', 'Multiverse Computing': 'Spain', 'TNG Technology Consulting': 'Germany',
  Cohere: 'Canada', Upstage: 'South Korea', 'LG AI Research': 'South Korea', Naver: 'South Korea', 'SK Telecom': 'South Korea',
  'Korea Telecom': 'South Korea', 'AI21 Labs': 'Israel', Sakana: 'Japan', 'TII UAE': 'United Arab Emirates', 'Swiss AI Initiative': 'Switzerland',
  Sarvam: 'India',
});

export const labBucket = (org) => countryBucket(LAB_COUNTRIES[String(org ?? '')] ?? '');

/** The model-level lab filter: the Labs picker (empty = all) and "Model lab based in". Null when nothing is restricted,
 *  so views can skip the pass entirely. */
export function labFilter(labs, labBasedIn) {
  const picked = Array.isArray(labs) && labs.length ? new Set(labs) : null;
  const regions = Array.isArray(labBasedIn) && !allRegions(labBasedIn) ? new Set(labBasedIn) : null;
  if (!picked && !regions) return null;
  return (org) => (!picked || picked.has(org)) && (!regions || regions.has(labBucket(org)));
}
