// R9.1: executable collector for Mistral La Plateforme API pricing (data/raw/mistral.json).
// Pure parser: the server-rendered Mistral pricing HTML plus the previous snapshot in, the
// normalized `models` array out. Since 7 Oct 2026 the page is a set of plain tables (see below);
// the card-era notes that follow are kept for the identity and docs-page rules, which still apply.
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
// The same redesign dropped the per-card "Cached input (/M tokens)" line; the 7 Oct tables carry it
// again. When nothing publishes a cached price, the field is left out rather than carried over from
// an older snapshot under today's date.

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
export const nameKey = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// 7 Oct 2026 (bh-daily-collectors-fix): https://mistral.ai/pricing/api now answers 301 to
// https://docs.mistral.ai/inference/pricing, which serves the prices as plain server-rendered tables
// (`Model | Input | Cached input | Output`, one table per family section, under a "Prices /M Tokens"
// heading). The <mistral-block-card-model> cards and their category taxonomy are gone, so every run
// from 6 Oct failed closed with "no model cards". A row is a chat/text model when its input AND output
// cells are both bare per-million-token USD amounts: OCR (/1000 Pages), transcription (/Min), TTS
// (/M Chars), embeddings (output "—") and free moderation drop out. A struck-through list price with
// a sale price beside it publishes the sale price, which is what the API charges and what the model's
// own docs page lists; the list price goes into the row's notes. Cached input is back in the served
// HTML, so it is read from the table itself.

const COPY_ID_RE = /title="Click to copy: ([^"]+)"/g;
const TABLE_HEADER = ["model", "input", "cached input", "output"];
const AMOUNT_RE = /^\$([0-9]+(?:\.[0-9]+)?)$/;
const strip = (html) => decode(String(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** One price cell: `{ price, list }` for a bare or sale USD amount, `null` for "—"/"Free", or `{ unit }` for any other unit. */
export function parseCell(html) {
  const text = strip(html);
  if (text === "—" || text === "-" || /^free$/i.test(text)) return null;
  const sale = /<ins\b[^>]*>([\s\S]*?)<\/ins>/.exec(html);
  if (sale) {
    const list = /<del\b[^>]*>([\s\S]*?)<\/del>/.exec(html);
    // Nothing may sit outside the struck and sale prices: a unit after them ("… /Min") is not per M tokens.
    if (strip(String(html).replace(/<del\b[^>]*>[\s\S]*?<\/del>/, "").replace(/<ins\b[^>]*>[\s\S]*?<\/ins>/, ""))) return { unit: text };
    const amount = (h) => AMOUNT_RE.exec(strip(h).replace(/^(original|sale) price:\s*/i, ""))?.[1];
    const price = amount(sale[1]), was = list ? amount(list[1]) : undefined;
    if (price === undefined || (list && was === undefined)) return { unit: text };
    return { price: Number(price), list: was === undefined ? null : Number(was) };
  }
  const m = AMOUNT_RE.exec(text);
  return m ? { price: Number(m[1]), list: null } : { unit: text };
}

/** One table row: name (link text without the ↗ marker and badges), docs URL and the three price cells. */
export function parseRow(html) {
  const cells = [...String(html).matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => m[1]);
  if (cells.length !== 4) throw new Error(`Mistral pricing: a table row has ${cells.length} cells, expected 4 (layout changed?)`);
  const link = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(cells[0]);
  const name = strip(link ? link[2] : cells[0]).replace(/\s*↗\s*$/, "").trim() || null;
  const href = link ? decode(link[1]) : null;
  const docs_url = href && /^\/models\//.test(href) ? `https://docs.mistral.ai${href}` : href && /^https:\/\/docs\.mistral\.ai\/models\//.test(href) ? href : null;
  const [input, cached, output] = cells.slice(1).map(parseCell);
  return { name, docs_url, input, cached, output };
}

const isAmount = (cell) => cell != null && cell.price !== undefined;

/** Every priced chat/text row of every pricing table, deduped by normalized name. */
export function pricedChatCards(html) {
  const page = String(html);
  const tables = [...page.matchAll(/<table\b[\s\S]*?<\/table>/g)];
  if (tables.length === 0) throw new Error("Mistral pricing: no pricing tables (page layout changed?)");
  const byName = new Map();
  let from = 0;
  for (const match of tables) {
    const table = match[0];
    // Bare amounts mean "per million tokens" only because the section above each table says so. The
    // specialized section (OCR, audio, moderation) says "Prices as marked" instead and holds no chat model.
    const head = page.slice(from, match.index);
    const unit = /Prices (\/M Tokens|as marked)/i.exec(strip(head))?.[1]?.toLowerCase();
    from = match.index + table.length;
    if (unit === "as marked") continue;
    if (unit !== "/m tokens") throw new Error("Mistral pricing: a pricing table without its \"Prices /M Tokens\" unit heading (layout changed?)");
    // Each section has its own controls: exactly Standard pressed (not Batch/Priority) and the
    // regional-inference surcharge switched off, or this table is not the global standard list.
    const pressed = [...head.matchAll(/aria-pressed="true"[^>]*>\s*([^<]*?)\s*<\/button>/g)].map((m) => m[1]);
    if (JSON.stringify(pressed) !== '["Standard"]') throw new Error(`Mistral pricing: a pricing table is not on the Standard pricing mode (pressed: ${JSON.stringify(pressed)})`);
    const regional = [...head.matchAll(/<button\b[^>]*role="checkbox"[^>]*>/g)].map((m) => /aria-checked="(true|false)"/.exec(m[0])?.[1]);
    if (regional.length !== 1 || regional[0] !== "false") throw new Error("Mistral pricing: a pricing table's regional-inference switch is not off (layout changed?)");
    const rows = [...table.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map((m) => m[0]);
    const header = [...(rows[0] ?? "").matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((m) => strip(m[1]).toLowerCase());
    if (JSON.stringify(header) !== JSON.stringify(TABLE_HEADER)) throw new Error(`Mistral pricing: unexpected table header ${JSON.stringify(header)} (layout changed?)`);
    for (const rowHtml of rows.slice(1)) {
      const row = parseRow(rowHtml);
      if (!row.name || !isAmount(row.input) || !isAmount(row.output)) continue;
      if (row.cached != null && !isAmount(row.cached)) throw new Error(`Mistral pricing: ${row.name} has a cached-input price in another unit (${row.cached.unit})`);
      const card = { name: row.name, docs_url: row.docs_url, input: row.input.price, output: row.output.price, cached: row.cached?.price ?? null,
        list: row.input.list != null || row.output.list != null ? { input: row.input.list, cached: row.cached?.list ?? null, output: row.output.list } : null };
      const key = nameKey(card.name);
      const seen = byName.get(key);
      if (seen && (seen.input !== card.input || seen.output !== card.output || seen.cached !== card.cached)) throw new Error(`Mistral pricing: ${card.name} is listed twice with different prices`);
      if (!seen) byName.set(key, card);
    }
  }
  if (byName.size === 0) throw new Error("Mistral pricing: no priced chat models");
  return byName;
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

// A snapshot row is found by its curated name or by the name the pricing page last listed it under
// (`source_name`: the page calls the curated "GLM 5.3" "Z.ai GLM 5.3"), and — once its docs page has
// been read — by API id.
function snapshotIndex(previous) {
  const byKey = new Map();
  for (const m of previous.models || []) for (const n of [m.model_name, m.source_name]) if (n && !byKey.has(nameKey(n))) byKey.set(nameKey(n), m);
  return byKey;
}

/**
 * The rows whose Mistral docs model page has to be read, with the reason:
 *  - `api_id`: the curated snapshot does not name the row, so its id exists nowhere else;
 *  - `cache_read`: the row published a cached-input price that the pricing table no longer states.
 * Normally that is nothing at all.
 */
export function cardsNeedingDocs(html, previous = { models: [] }) {
  const byKey = snapshotIndex(previous);
  const needed = [];
  for (const [key, card] of pricedChatCards(html)) {
    const old = byKey.get(key);
    if (!old) needed.push({ card, reason: "api_id" });
    else if (old.cache_read_per_1m_usd !== undefined && card.cached === null) needed.push({ card, reason: "cache_read" });
  }
  return needed;
}

const SALE_NOTE_RE = /\s*Sale price on the Mistral pricing page \(list [^)]*\)\. No end date stated\./;
const money = (v) => (v == null ? "—" : `$${v}`);

export function parseMistralPricing(html, previous = { models: [] }, { minRetainedShare = 0.5, docs = new Map() } = {}) {
  const byName = pricedChatCards(html);
  const prev = previous.models || [];
  const oldByName = snapshotIndex(previous);
  const matched = new Set();
  const fresh = new Set();
  const models = [...byName.entries()].map(([key, card]) => {
    const doc = docs.get(key) ?? null;
    const old = oldByName.get(key) ?? (doc ? prev.find((m) => m.api_model_id === doc.api_model_id) : undefined);
    if (old && matched.has(old)) throw new Error(`Mistral pricing: "${card.name}" and another row both resolve to ${old.api_model_id}`);
    if (old) matched.add(old);
    const api_model_id = doc?.api_model_id ?? old?.api_model_id ?? null;
    if (!api_model_id) throw new Error(`Mistral pricing: no API id for "${card.name}"; the pricing page no longer publishes one and ${card.docs_url ? "its docs page was not resolved" : "the row links no docs model page"}`);
    // A resolved docs page states the same current prices; a disagreement means the two first-party
    // pages describe different offers and nothing may be published from either.
    for (const [field, label] of [["input", "input"], ["output", "output"]]) {
      if (doc?.[field] != null && doc[field] !== card[field]) throw new Error(`Mistral pricing: ${api_model_id} ${label} price differs between the pricing page ($${card[field]}) and its docs page ($${doc[field]})`);
    }
    // The sale note is regenerated every run: it appears with the sale and disappears when the list price returns.
    const baseNotes = String(old?.notes ?? "").replace(SALE_NOTE_RE, "").trim();
    const saleNote = card.list ? `Sale price on the Mistral pricing page (list ${money(card.list.input)} input / ${money(card.list.cached)} cached / ${money(card.list.output)} output per M tokens). No end date stated.` : "";
    const model = {
      ...(old || {}),
      model_name: old?.model_name ?? card.name,
      source_name: card.name,
      provider_org: old?.provider_org ?? (/^zai-/.test(api_model_id) ? "Z.ai" : "Mistral"),
      input_per_1m_usd: card.input,
      output_per_1m_usd: card.output,
      cache_read_per_1m_usd: card.cached ?? doc?.cached ?? undefined,
      region: "eu",
      api_model_id,
      notes: [baseNotes, saleNote].filter(Boolean).join(" ") || undefined,
    };
    if (!old) { model.mapping = "derived"; fresh.add(model); }
    for (const k of Object.keys(model)) if (model[k] === undefined) delete model[k];
    return model;
  });
  if (prev.length > 0 && matched.size < prev.length * minRetainedShare) {
    throw new Error(`Mistral pricing: only ${matched.size}/${prev.length} previous models still listed; refusing to replace the snapshot`);
  }
  const oldOf = (m) => prev.find((o) => matched.has(o) && o.api_model_id === m.api_model_id);
  return {
    models,
    diff: {
      added: models.filter((m) => fresh.has(m)).map((m) => m.api_model_id),
      removed: prev.filter((m) => !matched.has(m)).map((m) => m.model_name),
      price_changed: models.filter((m) => {
        const o = oldOf(m);
        return o && (o.input_per_1m_usd !== m.input_per_1m_usd || o.output_per_1m_usd !== m.output_per_1m_usd);
      }).map((m) => m.api_model_id),
      cache_read_dropped: prev.filter((m) => matched.has(m) && m.cache_read_per_1m_usd !== undefined
        && models.find((n) => n.api_model_id === m.api_model_id)?.cache_read_per_1m_usd === undefined).map((m) => m.model_name),
    },
  };
}
