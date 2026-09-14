// R9.1: executable collector for STACKIT AI Model Serving (data/raw/stackit.json).
// Pure parser: the first-party "Available Shared Models" docs page (model list, billing category,
// status, context), the STACKIT AI Model Serving product page (per-category SKU token prices, EUR),
// the previous snapshot and an ECB EUR/USD rate in, normalized rows out. Only "Type Chat" models
// under "Text Models" are included; embedding models are out of scope.

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

export function readTierPrices(productHtml) {
  const t = pipeText(productHtml);
  const tiers = {};
  for (const m of t.matchAll(/Model Serving-llm-(standard|plus|premium)-(input|output)-EU01\|Germany South\|mio (input|output) token\|([0-9]+(?:\.[0-9]+)?) €/g)) {
    if (m[2] !== m[3]) throw new Error(`STACKIT prices: SKU llm-${m[1]}-${m[2]} billed per ${m[3]} token`);
    const key = `LLM-${m[1][0].toUpperCase()}${m[1].slice(1)}`;
    const value = Number(Number(m[4]).toPrecision(6));
    tiers[key] = tiers[key] || {};
    if (tiers[key][m[2]] != null && tiers[key][m[2]] !== value) throw new Error(`STACKIT prices: ${key} ${m[2]} listed twice with different prices`);
    tiers[key][m[2]] = value;
  }
  for (const c of CATEGORIES) if (tiers[c]?.input == null || tiers[c]?.output == null) throw new Error(`STACKIT prices: no EU01 input/output price for ${c} (page layout changed?)`);
  return tiers;
}

const ORG = [[/^qwen\//i, "Alibaba"], [/^openai\//i, "OpenAI"], [/llama/i, "Meta"], [/^google\//i, "Google"], [/mistral/i, "Mistral"], [/deepseek/i, "DeepSeek"]];
const usd = (eur, rate) => Math.round(eur * rate * 10000) / 10000;

export function parseStackitCatalog(docsHtml, productHtml, previous = { models: [] }, fx, { minRetainedShare = 0.5 } = {}) {
  if (!fx || !Number.isFinite(fx.rate)) throw new Error("STACKIT catalog: no FX rate");
  const { models: listed, updated } = readShellModels(docsHtml);
  const tiers = readTierPrices(productHtml);
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
