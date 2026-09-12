/** Parser for the public https://openrouter.ai/providers table.
 *
 * The page server-renders one `<tr>` per provider with the columns
 * `Provider | Trains | Retention | BYOK | Headquarters | Terms of service | …`.
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

export function parseProviderPolicyPage(html) {
  if (typeof html !== "string" || !html.includes("or-table__cell")) {
    throw new Error("OpenRouter providers page did not contain the provider table");
  }
  const providers = [];
  const seen = new Set();
  for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || []) {
    const slug = row.match(/href="\/provider\/([^"#?]+)"/)?.[1];
    if (!slug || seen.has(slug)) continue;
    const cells = row.match(/<td[^>]*class="[^"]*or-table__cell[^"]*"[^>]*>([\s\S]*?)<\/td>/g) || [];
    if (cells.length < 3) continue;
    const body = (i) => cells[i].replace(/^<td[^>]*>/, "").replace(/<\/td>$/, "");
    const name = text(body(0)).replace(/^Favicon for \S+\s*/, "") || slug;
    const does_not_train = trains(body(1)) === null ? null : trains(body(1)) === false;
    const zero_retention = zeroRetention(body(2));
    seen.add(slug);
    providers.push({
      slug,
      name,
      does_not_train,
      zero_retention,
      headquarters: cells.length > 4 ? (text(body(4)) === "—" ? null : text(body(4))) : null,
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
