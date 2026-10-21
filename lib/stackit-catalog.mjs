// R9.1: executable collector for STACKIT AI Model Serving (data/raw/stackit.json).
// Pure parser: the first-party "Available Shared Models" docs page (model list, billing category,
// status, context), the STACKIT AI Model Serving product page (per-model EU01 token prices, EUR,
// with the billing SKU per row), the previous snapshot and an ECB EUR/USD rate in, normalized rows
// out. Only "Type Chat" models under "Text Models" are included; embedding models are out of scope.

const decode = (s) => String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;| /g, " ");
/** Visible text with "|" between elements, so labels and values stay separable. */
export const pipeText = (html) => decode(String(html).replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, "|")).replace(/\s+/g, " ").replace(/(\| ?)+/g, "|");

const MONTHS = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
const CATEGORIES = ["LLM-Standard", "LLM-Plus", "LLM-Premium"];

export function readShellModels(docsHtml) {
  const t = pipeText(docsHtml);
  const updated = /Last updated on \|?([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/.exec(t);
  const start = t.indexOf("|Text Models|Section titled");
  const end = t.indexOf("|Embedding Models|Section titled", start);
  if (start < 0 || end < 0) throw new Error("STACKIT docs: no Text Models section (page layout changed?)");
  const parts = t.slice(start, end).split("|Full Name: |");
  const models = [];
  for (let i = 1; i < parts.length; i++) {
    const name = /\|([^|]+)\|Section titled “\1”\|?$/.exec(parts[i - 1])?.[1]?.trim();
    const body = parts[i];
    const id = body.slice(0, body.indexOf("|")).trim();
    // The last model's facts end where the Text Models slice ends, without a trailing separator.
    const fact = (label) => new RegExp(`\\|${label}\\|([^|]+)(?:\\||$)`).exec(body)?.[1]?.trim() ?? null;
    if (!name || !id) throw new Error(`STACKIT docs: model section ${i} without a name or full name`);
    const category = fact("Category");
    if (!CATEGORIES.includes(category)) throw new Error(`STACKIT docs: ${id} has unknown billing category "${category}"`);
    models.push({
      name, id, category,
      type: fact("Type"),
      status: (fact("Status") || "").toLowerCase() || null,
      context: fact("Context length")?.replace(/\s*Tokens?$/i, "") ?? null,
    });
  }
  if (models.length === 0) throw new Error("STACKIT docs: no models under Text Models");
  return { models: models.filter((m) => m.type === "Chat"), updated: updated ? `${updated[3]}-${MONTHS[updated[1]]}-${updated[2].padStart(2, "0")}` : null };
}

// Since the stackit.com relaunch (2026-10) the product page carries a "STACKIT AI Model Serving
// price table": one row per model — Model | Type | Region | input EUR/1M | output EUR/1M | SKUs —
// replacing the old six-row EU01 SKU list. The SKU stem identifies the billing category; the
// standard tier keeps separate input/output SKUs, plus/premium share one SKU for both directions.
const SKU_CATEGORY = {
  "llm-standard-input-eu01": "LLM-Standard",
  "llm-standard-output-eu01": "LLM-Standard",
  "llm-standard-plus-eu01": "LLM-Plus",
  "llm-standard-premium-eu01": "LLM-Premium",
};

const skuCategory = (row, field, label) => {
  const category = SKU_CATEGORY[String(row[field]).toLowerCase()];
  if (!category) throw new Error(`STACKIT prices: unknown ${label} SKU "Model Serving-${row[field]}" for ${row.name}`);
  return category;
};

const rowCategory = (row) => {
  const input = skuCategory(row, "inSku", "input");
  const output = skuCategory(row, "outSku", "output");
  if (input !== output) throw new Error(`STACKIT prices: ${row.name} input/output SKUs map to different tiers (${row.inSku} vs ${row.outSku})`);
  return input;
};

export function readModelPriceRows(productHtml) {
  const t = pipeText(productHtml);
  const rows = [];
  const re = /([^|]{1,120})\|Chat\|EU01\|([0-9]+(?:\.[0-9]+)?)€\|([0-9]+(?:\.[0-9]+)?)€\|Input\|: *Model Serving-([a-zA-Z0-9-]+)\|Output\|: *Model Serving-([a-zA-Z0-9-]+)/g;
  for (const m of t.matchAll(re)) {
    rows.push({
      name: m[1].trim(),
      input: Number(Number(m[2]).toPrecision(6)),
      output: Number(Number(m[3]).toPrecision(6)),
      inSku: m[4],
      outSku: m[5],
    });
  }
  return rows;
}

export function readTierPrices(productHtml) {
  const tiers = {};
  for (const row of readModelPriceRows(productHtml)) {
    const key = rowCategory(row);
    const t = (tiers[key] = tiers[key] || {});
    if (t.input != null && t.input !== row.input) throw new Error(`STACKIT prices: ${key} input listed twice with different prices`);
    if (t.output != null && t.output !== row.output) throw new Error(`STACKIT prices: ${key} output listed twice with different prices`);
    t.input = row.input;
    t.output = row.output;
  }
  for (const c of CATEGORIES) if (tiers[c]?.input == null || tiers[c]?.output == null) throw new Error(`STACKIT prices: no EU01 input/output price for ${c} (page layout changed?)`);
  return tiers;
}

const normName = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
const findPriceRow = (rows, name) => {
  const n = normName(name);
  const hits = rows.filter((r) => { const rn = normName(r.name); return rn === n || rn.includes(n) || n.includes(rn); });
  if (hits.length === 1) return hits[0];
  const exact = hits.filter((r) => normName(r.name) === n);
  if (exact.length === 1) return exact[0];
  if (hits.length === 0) return null;
  throw new Error(`STACKIT prices: ${name} matches ${hits.length} EU01 price rows (${hits.map((r) => r.name).join(", ")})`);
};

const ORG = [[/^qwen\//i, "Alibaba"], [/^openai\//i, "OpenAI"], [/llama/i, "Meta"], [/^google\//i, "Google"], [/mistral/i, "Mistral"], [/deepseek/i, "DeepSeek"]];
const usd = (eur, rate) => Math.round(eur * rate * 10000) / 10000;

export function parseStackitCatalog(docsHtml, productHtml, previous = { models: [] }, fx, { minRetainedShare = 0.5 } = {}) {
  if (!fx || !Number.isFinite(fx.rate)) throw new Error("STACKIT catalog: no FX rate");
  const { models: listed, updated } = readShellModels(docsHtml);
  const tiers = readTierPrices(productHtml);
  // Every docs-listed chat model must appear in the product page's price table with a SKU that
  // maps to the same billing category — the docs category alone is not a price source.
  const priceRows = readModelPriceRows(productHtml);
  for (const row of listed) {
    const hit = findPriceRow(priceRows, row.name);
    if (!hit) throw new Error(`STACKIT prices: no EU01 price row for ${row.name} (page layout changed?)`);
    const billed = rowCategory(hit);
    if (billed !== row.category) throw new Error(`STACKIT prices: ${row.name} is billed as ${billed} (SKU Model Serving-${hit.inSku}) but the docs list ${row.category}`);
  }
  const prev = previous.models || [];
  const byId = new Map(prev.map((m) => [m.model_id, m]));
  const matched = new Set();
  const models = [];
  for (const row of listed) {
    const old = byId.get(row.id);
    if (old) matched.add(old);
    const price = tiers[row.category];
    const model = {
      ...(old || {}),
      model_name: old?.model_name ?? row.name,
      model_id: row.id,
      provider_org: old?.provider_org ?? ORG.find(([re]) => re.test(row.id))?.[1],
      billing_category: row.category,
      input_per_1m_eur: price.input,
      output_per_1m_eur: price.output,
      input_per_1m_usd: usd(price.input, fx.rate),
      output_per_1m_usd: usd(price.output, fx.rate),
      region: "eu01",
      server_location: "Germany South",
      eu_hosted: true,
      status: row.status,
      context_length_label: row.context ?? old?.context_length_label,
    };
    if (!old) { model.mapping = "derived"; model.notes = `New in the ${updated ?? "current"} docs update; ${row.category}${row.context ? `; ${row.context} context` : ""}.`; }
    for (const k of Object.keys(model)) if (model[k] === undefined || model[k] === null) delete model[k];
    models.push(model);
  }
  if (models.length === 0) throw new Error("STACKIT catalog: no chat models");
  if (prev.length > 0 && matched.size < prev.length * minRetainedShare) {
    throw new Error(`STACKIT catalog: only ${matched.size}/${prev.length} previous models still listed; refusing to replace the snapshot`);
  }
  return {
    models, tiers, docs_updated: updated,
    diff: {
      added: models.filter((m) => !byId.has(m.model_id)).map((m) => m.model_id),
      removed: prev.filter((m) => !matched.has(m)).map((m) => m.model_id),
      category_or_status_changed: models.filter((m) => { const o = byId.get(m.model_id); return o && (o.billing_category !== m.billing_category || o.status !== m.status); }).map((m) => m.model_id),
      eur_price_changed: models.filter((m) => { const o = byId.get(m.model_id); return o && (o.input_per_1m_eur !== m.input_per_1m_eur || o.output_per_1m_eur !== m.output_per_1m_eur); }).map((m) => m.model_id),
    },
  };
}
