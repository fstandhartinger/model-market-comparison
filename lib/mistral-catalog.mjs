// R9.1: executable collector for Mistral La Plateforme API pricing (data/raw/mistral.json).
// Pure parser: the server-rendered https://mistral.ai/pricing/api HTML plus the previous snapshot
// in, the normalized `models` array out. Each model is a <mistral-block-card-model> with labelled
// prices. Only cards with a per-million-token input AND output price are chat/text models (OCR is
// per 1000 pages, embeddings have no output, free Labs endpoints have no price).
//
// 20 Sep 2026 (iteration 134): the pricing page stopped rendering the copy-to-clipboard API id
// (`data-text`) it used to carry, so every card parsed without an id and the collector had failed
// closed since 16 Sep. Identity is therefore the card's own model name, normalized, matched against
// the curated snapshot (`api_model_id`, deliberately not `model_id`: build-dataset uses `model_id`
// as family identity and Mistral aliases like mistral-large-latest are not model names). A card the
// snapshot does not know needs its id from somewhere first-party: each card links its Mistral docs
// model page, and that page still carries the copyable id (`title="Click to copy: …"`). The fetcher
// resolves those pages and hands them in as `docs`; a new model whose id cannot be read that way
// fails the refresh closed rather than entering the snapshot unidentified.
//
// The same redesign dropped the per-card "Cached input (/M tokens)" line — cached prices are now a
// client-side toggle and are absent from the served HTML. A card's cached price is therefore only
// read from a resolved docs model page; when nothing publishes it, the field is left out rather than
// carried over from an older snapshot under today's date.

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
export const nameKey = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const INPUT_RE = /^(text )?input \((\/m tokens|per min \/ per m tok)\)$/i;
const CACHED_RE = /^cached input \(\/m tokens\)$/i;
const OUTPUT_RE = /^output \(\/m tokens\)$/i;
const DOCS_URL_RE = /href="(https:\/\/docs\.mistral\.ai\/models\/[^"]+)"/;
const CATEGORY_RE = /data-category-slug="([^"]*)"/g;
const CHAT_CATEGORY = "text-to-text";
const COPY_ID_RE = /title="Click to copy: ([^"]+)"/g;
const AMOUNT_RE = /^\$([0-9]+(?:\.[0-9]+)?)$/;

export function parseCard(html) {
  const docs_url = DOCS_URL_RE.exec(html)?.[1] ?? null;
  const tokens = decode(html.replace(/^[^>]*>/, "").replace(/<[^>]+>/g, "|")).split("|").map((t) => t.trim()).filter(Boolean);
  const priceAfter = (re) => {
    const i = tokens.findIndex((t) => re.test(t));
    if (i < 0) return null;
    const m = AMOUNT_RE.exec(tokens[i + 1] || "");
    return m ? Number(m[1]) : NaN;
  };
  const categories = [...new Set([...String(html).matchAll(CATEGORY_RE)].map((m) => m[1]).filter(Boolean))];
  return { name: tokens[0] ?? null, docs_url, categories, input: priceAfter(INPUT_RE), cached: priceAfter(CACHED_RE), output: priceAfter(OUTPUT_RE) };
}

/**
 * A Mistral docs model page (https://docs.mistral.ai/models/…): the API id as the page's single
 * copyable badge, plus the labelled USD prices the pricing page no longer serves. The label follows
 * its amount there ("$ | 1.4 | Input | /M Tokens"), and the page repeats the same block without
 * labels, so the first labelled occurrence is the one that is read.
 */
export function parseMistralDocsModel(html) {
  const ids = [...new Set([...String(html).matchAll(COPY_ID_RE)].map((m) => decode(m[1]).trim()))];
  if (ids.length !== 1) throw new Error(`Mistral docs: expected exactly one copyable API id, found ${ids.length}`);
  const tokens = decode(String(html).replace(/<[^>]+>/g, "|")).split("|").map((t) => t.trim()).filter(Boolean);
  const priceBefore = (label) => {
    const i = tokens.findIndex((t, j) => t.toLowerCase() === label && /^\/m tokens$/i.test(tokens[j + 1] || ""));
    if (i < 0) return null;
    const m = AMOUNT_RE.exec(`$${tokens[i - 1]}`);
    if (!m || tokens[i - 2] !== "$") throw new Error(`Mistral docs: ${ids[0]} has a "${label}" label without a $ amount`);
    return Number(m[1]);
  };
  return { api_model_id: ids[0], input: priceBefore("input"), cached: priceBefore("cached input"), output: priceBefore("output") };
}

/** Every priced chat/text card on the pricing page, deduped by normalized name. */
export function pricedChatCards(html) {
  const chunks = String(html).split(/<mistral-block-card-model\b/).slice(1);
  if (chunks.length === 0) throw new Error("Mistral pricing: no model cards (page layout changed?)");
  const byName = new Map();
  const priced = new Map();
  for (const chunk of chunks) {
    const card = parseCard(chunk.split(/<\/mistral-block-card-model>/)[0]);
    if (!card.name || card.input === null || card.output === null) continue;
    if ([card.input, card.output, card.cached].some((v) => Number.isNaN(v))) throw new Error(`Mistral pricing: ${card.name} has a price label without a $ amount`);
    const key = nameKey(card.name);
    // The page repeats flagship cards (hero tile + catalog entry); every copy must agree, including
    // the hero tiles that carry no category of their own.
    const seen = priced.get(key);
    if (seen && (seen.input !== card.input || seen.output !== card.output || seen.cached !== card.cached)) throw new Error(`Mistral pricing: ${card.name} is listed twice with different prices`);
    if (!seen) priced.set(key, card);
    else if (!seen.docs_url && card.docs_url) seen.docs_url = card.docs_url;
    // Per-million input and output prices alone no longer mean chat: the fine-tuned classifier
    // endpoints are priced the same way. The page's own taxonomy decides.
    if (!card.categories.includes(CHAT_CATEGORY)) continue;
    const chat = byName.get(key);
    if (!chat) byName.set(key, priced.get(key));
  }
  if (byName.size === 0) throw new Error("Mistral pricing: no priced chat models");
  return byName;
}

/**
 * The cards whose Mistral docs model page has to be read, with the reason:
 *  - `api_id`: the curated snapshot does not name the card, so its id exists nowhere else;
 *  - `cache_read`: the row published a cached-input price that the pricing page no longer states.
 * Normally that is nothing at all. Cached input for a row that never had one is NOT resolved here:
 * that would mean reading a docs page for every chat card every day, and a daily run that depends on
 * eight more third-party pages fails closed eight more ways. Coverage for those rows stays open.
 */
export function cardsNeedingDocs(html, previous = { models: [] }) {
  const byKey = new Map((previous.models || []).map((m) => [nameKey(m.model_name), m]));
  const needed = [];
  for (const [key, card] of pricedChatCards(html)) {
    const old = byKey.get(key);
    if (!old) needed.push({ card, reason: "api_id" });
    else if (old.cache_read_per_1m_usd !== undefined && card.cached === null) needed.push({ card, reason: "cache_read" });
  }
  return needed;
}

export function parseMistralPricing(html, previous = { models: [] }, { minRetainedShare = 0.5, docs = new Map() } = {}) {
  const byName = pricedChatCards(html);
  const prev = previous.models || [];
  const oldByName = new Map(prev.map((m) => [nameKey(m.model_name), m]));
  const matched = new Set();
  const models = [...byName.entries()].map(([key, card]) => {
    const old = oldByName.get(key);
    if (old) matched.add(old);
    const doc = docs.get(key) ?? null;
    const api_model_id = doc?.api_model_id ?? old?.api_model_id ?? null;
    if (!api_model_id) throw new Error(`Mistral pricing: no API id for "${card.name}"; the pricing page no longer publishes one and ${card.docs_url ? "its docs page was not resolved" : "the card links no docs model page"}`);
    // A resolved docs page states the same list prices; a disagreement means the two first-party
    // pages describe different offers and nothing may be published from either.
    for (const [field, label] of [["input", "input"], ["output", "output"]]) {
      if (doc?.[field] != null && doc[field] !== card[field]) throw new Error(`Mistral pricing: ${api_model_id} ${label} price differs between the pricing page ($${card[field]}) and its docs page ($${doc[field]})`);
    }
    const model = {
      ...(old || {}),
      model_name: old?.model_name ?? card.name,
      provider_org: old?.provider_org ?? (/^zai-/.test(api_model_id) ? "Z.ai" : "Mistral"),
      input_per_1m_usd: card.input,
      output_per_1m_usd: card.output,
      cache_read_per_1m_usd: doc?.cached ?? card.cached ?? undefined,
      region: "eu",
      api_model_id,
    };
    if (!old) model.mapping = "derived";
    for (const k of Object.keys(model)) if (model[k] === undefined) delete model[k];
    return model;
  });
  if (prev.length > 0 && matched.size < prev.length * minRetainedShare) {
    throw new Error(`Mistral pricing: only ${matched.size}/${prev.length} previous models still listed; refusing to replace the snapshot`);
  }
  const oldOf = (m) => prev.find((o) => matched.has(o) && nameKey(o.model_name) === nameKey(m.model_name));
  return {
    models,
    diff: {
      added: models.filter((m) => m.mapping === "derived").map((m) => m.api_model_id),
      removed: prev.filter((m) => !matched.has(m)).map((m) => m.model_name),
      price_changed: models.filter((m) => {
        const o = oldOf(m);
        return o && (o.input_per_1m_usd !== m.input_per_1m_usd || o.output_per_1m_usd !== m.output_per_1m_usd);
      }).map((m) => m.api_model_id),
      cache_read_dropped: prev.filter((m) => matched.has(m) && m.cache_read_per_1m_usd !== undefined
        && models.find((n) => nameKey(n.model_name) === nameKey(m.model_name))?.cache_read_per_1m_usd === undefined).map((m) => m.model_name),
    },
  };
}
