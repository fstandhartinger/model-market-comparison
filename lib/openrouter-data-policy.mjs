/** Parser for the public https://openrouter.ai/providers table.
 *
 * The page server-renders one `<tr>` per provider with the columns
 * `Provider | Trains | Retention | BYOK | Provisional | Headquarters | Terms of service | …`
 * (the "Provisional" column appeared on 2026-11-24 and shifted "Headquarters" by one).
 * Column positions are therefore read from the page's own `<thead>` labels, never assumed.
 * Requirement R4.10 needs exactly the two facets the site exposes as checkboxes:
 * "Does not train" (Trains = No) and "Zero retention" (Retention = Zero retention).
 * A provider that satisfies both is the one that survives OpenRouter's own filter.
 */

const CHUTES_SLUG = "chutes";

/** OpenRouter miscategorises Chutes; Florian's requirement makes it an explicit
 *  exception that is treated as guaranteeing both. Recorded, not silent. */
export const POLICY_OVERRIDES = {
  [CHUTES_SLUG]: {
    does_not_train: true,
    zero_retention: true,
    reason: "OpenRouter miscategorises Chutes. Owner decision 2026-09-12: treat Chutes as guaranteeing both 'Does not train' and 'Zero retention'.",
  },
};

const stripTags = (html) => html.replace(/<[^>]+>/g, "");
const unescapeHtml = (s) => s
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&mdash;/g, "—").replace(/&nbsp;/g, " ");
const text = (html) => unescapeHtml(stripTags(html)).replace(/\s+/g, " ").trim();

/** Tri-state on purpose: an unparsable cell must never silently become `false`,
 *  which would filter a provider out on no evidence. */
function trains(cell) {
  const v = text(cell).toLowerCase();
  if (v === "no") return false;
  if (v === "yes") return true;
  return null;
}
function zeroRetention(cell) {
  const v = text(cell).toLowerCase();
  if (!v || v === "—" || v === "-") return null;
  return v === "zero retention";
}

/** Positions used only when the page's header does not name a column (pre-header fixtures). */
const LEGACY_COLUMNS = { provider: 0, trains: 1, retention: 2, headquarters: 4 };

/** Map each needed column to the index of its `<th>` label in the table header.
 *  OpenRouter inserts columns over time (e.g. "Provisional" on 2026-11-24); a fixed
 *  index then silently reads the wrong cell for every provider. */
export function providerTableColumns(html) {
  const head = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/)?.[1] ?? "";
  const labels = (head.match(/<th(?:\s[^>]*)?>[\s\S]*?<\/th>/g) || []).map((th) => text(th).toLowerCase());
  const columns = { ...LEGACY_COLUMNS };
  for (const key of Object.keys(columns)) {
    const at = labels.indexOf(key);
    if (at >= 0) columns[key] = at;
  }
  return columns;
}

/** A headquarters is a place. A yes/no value means the column mapping is wrong
 *  (a flag column was read instead) — refuse rather than publish it as a country. */
function headquartersOf(cell) {
  const v = text(cell);
  if (!v || v === "—" || v === "-") return null;
  if (/^(yes|no)$/i.test(v)) {
    throw new Error(`OpenRouter provider table: the headquarters column reads "${v}" — the table layout changed`);
  }
  return v;
}

export function parseProviderPolicyPage(html) {
  if (typeof html !== "string" || !html.includes("or-table__cell")) {
    throw new Error("OpenRouter providers page did not contain the provider table");
  }
  const col = providerTableColumns(html);
  const providers = [];
  const seen = new Set();
  for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || []) {
    const slug = row.match(/href="\/provider\/([^"#?]+)"/)?.[1];
    if (!slug || seen.has(slug)) continue;
    const cells = row.match(/<td[^>]*class="[^"]*or-table__cell[^"]*"[^>]*>([\s\S]*?)<\/td>/g) || [];
    if (cells.length < 3) continue;
    const body = (i) => cells[i].replace(/^<td[^>]*>/, "").replace(/<\/td>$/, "");
    const cell = (i) => (i < cells.length ? body(i) : "");
    const name = text(cell(col.provider)).replace(/^Favicon for \S+\s*/, "") || slug;
    const trainsCell = trains(cell(col.trains));
    const does_not_train = trainsCell === null ? null : trainsCell === false;
    const zero_retention = zeroRetention(cell(col.retention));
    seen.add(slug);
    providers.push({
      slug,
      name,
      does_not_train,
      zero_retention,
      headquarters: headquartersOf(cell(col.headquarters)),
    });
  }
  if (!providers.length) throw new Error("OpenRouter providers page yielded no provider rows");
  return providers;
}

/** True when the provider survives OpenRouter's own "Does not train" + "Zero
 *  retention" filter. `null` (unknown) is NOT a pass — we do not assert a policy
 *  we could not read. */
export function keepsDataPrivate(entry) {
  if (!entry) return null;
  if (entry.does_not_train === null || entry.zero_retention === null) return null;
  return entry.does_not_train === true && entry.zero_retention === true;
}

export function applyOverrides(providers) {
  return providers.map((p) => {
    const o = POLICY_OVERRIDES[p.slug];
    if (!o) return { ...p, override: null };
    return { ...p, does_not_train: o.does_not_train, zero_retention: o.zero_retention, override: o.reason };
  });
}

/** Benchmark Heaven platforms that are not routed through OpenRouter but ARE the same
 *  service OpenRouter lists under the given slug. Each entry is an assertion about
 *  provider identity, not about policy — the policy still comes from the snapshot.
 *  Anything absent resolves to `null` (unknown), never to a guessed verdict. */
export const PLATFORM_SLUGS = {
  "AWS Bedrock": "amazon-bedrock",
  "Azure AI Foundry": "azure",
  "Google Vertex AI": "google-vertex",
  Anthropic: "anthropic",
  Nebius: "nebius",
  Chutes: "chutes",
  Mistral: "mistral",
  Inceptron: "inceptron",
};

/** OpenRouter endpoint slugs that name a service tier of a provider already in the
 *  table (same company, same published policy) rather than a separate provider. */
export const SLUG_ALIASES = { "sambanova-turbo": "sambanova" };

/** Resolve one offer to an OpenRouter provider slug.
 *  For OpenRouter routes the slug is the first segment of the endpoint tag — that is
 *  OpenRouter's own identifier, so no name matching is involved. */
export function offerPolicySlug(offer) {
  if (!offer) return null;
  if (offer.platform === "OpenRouter") {
    const slug = String(offer.endpoint_tag || "").split("/")[0];
    if (!slug) return null;
    return SLUG_ALIASES[slug] || slug;
  }
  return PLATFORM_SLUGS[offer.platform] || null;
}

/** Build `slug -> private (true|false|null)` from a snapshot written by
 *  scripts/fetch-openrouter-data-policy.mjs. */
export function policyIndex(snapshot) {
  const index = new Map();
  for (const p of snapshot?.providers || []) index.set(p.slug, keepsDataPrivate(p));
  return index;
}
