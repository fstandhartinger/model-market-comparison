// R9.1: executable check for the hand-curated provider metadata (data/raw/provider-meta.json).
// Pure function: the curated snapshot and OpenRouter's provider table (data/raw/openrouter-data-policy.json,
// refreshed daily by scripts/fetch-openrouter-data-policy.mjs) in, the same snapshot with a dated cross-check out.
// Only `country` has a mechanical counterpart (OpenRouter's "headquarters"). eu_hosted, non_us, hyperscaler and
// the notes are first-party judgments with no machine-readable source, so the function never rewrites a curated
// value: it records agreements, disagreements a human already explained in `country_disputes`, and new
// disagreements for a human to look at. The check is dated by the OpenRouter data it read, not by the run.

const NAMES = { "United States": "US" };
const normalizeCountry = (value) => { const s = String(value ?? "").trim(); return NAMES[s] ?? s; };

export function crossCheckProviderMeta(previous, policy, { minListed = 50, minMatched = 40 } = {}) {
  const curated = previous?.providers;
  if (!curated || typeof curated !== "object" || Object.keys(curated).length === 0) throw new Error("provider-meta: previous snapshot has no providers");
  const listed = Array.isArray(policy?.providers) ? policy.providers : [];
  if (listed.length < minListed) throw new Error(`provider-meta: OpenRouter table has ${listed.length} providers (< ${minListed}); refusing to date a check against it`);
  const retrieved = String(policy?.source?.retrieved_at ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved)) throw new Error("provider-meta: OpenRouter table has no retrieved_at date");

  const byName = new Map(listed.map((p) => [String(p.name).toLowerCase(), p]));
  const disputes = previous.country_disputes ?? {};
  const agree = [], explained = [], disagreements = [], noHeadquarters = [], notListed = [];
  for (const [name, meta] of Object.entries(curated)) {
    const row = byName.get(name.toLowerCase());
    if (!row) { notListed.push(name); continue; }
    if (!row.headquarters) { noHeadquarters.push(name); continue; }
    if (normalizeCountry(row.headquarters) === normalizeCountry(meta.country)) { agree.push(name); continue; }
    const entry = { provider: name, curated: meta.country ?? null, openrouter: row.headquarters };
    // An explanation holds only for the value it was written about; if OpenRouter changes again, a human looks again.
    if (disputes[name]?.openrouter === row.headquarters) explained.push(entry);
    else disagreements.push(entry);
  }
  const matched = agree.length + explained.length + disagreements.length + noHeadquarters.length;
  if (matched < minMatched) throw new Error(`provider-meta: only ${matched} curated providers found in OpenRouter's table (< ${minMatched}); names changed?`);

  return {
    ...previous,
    collected_at: retrieved,
    judgments_checked_at: previous.judgments_checked_at ?? previous.collected_at,
    openrouter_crosscheck: {
      checked_against: `data/raw/openrouter-data-policy.json retrieved ${policy.source.retrieved_at}`,
      field: "country vs OpenRouter headquarters",
      agree: agree.length,
      explained,
      disagreements,
      no_headquarters: noHeadquarters,
      not_listed: notListed,
    },
  };
}
