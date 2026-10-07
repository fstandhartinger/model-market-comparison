// R9.1: executable collector for the Inceptron catalog (data/raw/inceptron.json).
// Pure parsers: the unauthenticated OpenAI-compatible catalog https://api.inceptron.io/v1/models
// decides WHICH models are served (text output, "chat" feature, both token prices) and the
// previous snapshot keeps curated rows. CR-329.1: the PRICE of the direct route comes from
// Inceptron's own published list, https://www.inceptron.io/models (its pricing page says
// "Serverless inference: see models page"). The API catalog carries an `openrouter.slug` per model —
// it is the provider feed OpenRouter ingests, and its prices equal the OpenRouter route
// (GLM-5.3 on 7 Oct 2026: API/OpenRouter $0.60/$3.39, list $1.40/$4.40). Storing it as the direct
// price made the direct row a copy of the OpenRouter row. The feed price is kept as
// api_catalog_* for reference; a model the list page does not show gets no direct price.

const ORG = { "zai-org": "Z.ai", moonshotai: "Moonshot AI", "deepseek-ai": "DeepSeek", minimaxai: "MiniMax", minimax: "MiniMax", qwen: "Alibaba", "meta-llama": "Meta", openai: "OpenAI", mistralai: "Mistral", google: "Google" };
export const nameKey = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
/** USD per token → USD per 1M tokens, four decimals (Inceptron meters are not whole cents). */
const perMillion = (value, id, field) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Inceptron catalog: ${id} has unreadable ${field} "${value}"`);
  return Math.round(n * 1e6 * 10000) / 10000;
};

export const INCEPTRON_LIST_URL = "https://www.inceptron.io/models";
const money = (s) => (s == null ? null : Number(s));
const decodeEntities = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

/** Server-rendered Framer page → [{ name, key, input_per_1m_usd, output_per_1m_usd, cache_read_per_1m_usd?, quantization? }].
 *  Each card reads "<Name> <Org> Description License Mode … Input tokens, 1M $x Output tokens, 1M $y [Cache read $z]
 *  Quantization q". Framer renders a card once per breakpoint, so identical cards collapse; two DIFFERENT prices for
 *  one name fail closed. */
export function parseInceptronModelsPage(html) {
  const text = decodeEntities(String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const card = /(?:M o d e l s|Go to playground|Talk to our team) ([A-Za-z0-9][\w.\- ]{0,60}?) \S+ Description License Mode [\w ]+? Region Input tokens, 1M \$([\d.]+) Output tokens, 1M \$([\d.]+)(?: Cache read \$([\d.]+))? Quantization (\S+)/g;
  const byKey = new Map();
  for (const m of text.matchAll(card)) {
    const row = { name: m[1].trim(), key: nameKey(m[1]), input_per_1m_usd: money(m[2]), output_per_1m_usd: money(m[3]), cache_read_per_1m_usd: money(m[4]) ?? undefined, quantization: m[5].toLowerCase() };
    if (!Number.isFinite(row.input_per_1m_usd) || !Number.isFinite(row.output_per_1m_usd)) throw new Error(`Inceptron models page: unreadable price for ${row.name}`);
    const seen = byKey.get(row.key);
    if (seen && (seen.input_per_1m_usd !== row.input_per_1m_usd || seen.output_per_1m_usd !== row.output_per_1m_usd || seen.cache_read_per_1m_usd !== row.cache_read_per_1m_usd)) {
      throw new Error(`Inceptron models page: ${row.name} shows two different prices`);
    }
    byKey.set(row.key, row);
  }
  if (byKey.size === 0) throw new Error("Inceptron models page: no priced model cards (page layout changed?)");
  for (const row of byKey.values()) if (row.cache_read_per_1m_usd === undefined) delete row.cache_read_per_1m_usd;
  return [...byKey.values()];
}

export function parseInceptronCatalog(payload, previous = { models: [] }, { minRetainedShare = 0.5, listPrices = null, listUrl = INCEPTRON_LIST_URL, collectedAt = null } = {}) {
  const list = Array.isArray(payload?.data) ? payload.data : null;
  if (!list || list.length === 0) throw new Error("Inceptron catalog: no data array (API shape changed?)");
  const prev = previous.models || [];
  // Curated rows carry the API id in api_model_id (from this collector on) or in their notes.
  const findOld = (m) => prev.find((p) => p.api_model_id === m.id)
    ?? prev.find((p) => String(p.notes || "").includes(m.id))
    ?? prev.find((p) => nameKey(p.model_name) === nameKey(m.name));
  const matched = new Set();
  const skipped = [];
  const models = [];
  const seen = new Set();
  for (const m of list) {
    if (!m?.id || typeof m.id !== "string") throw new Error("Inceptron catalog: model without an id");
    if (seen.has(m.id)) throw new Error(`Inceptron catalog: ${m.id} listed twice`);
    seen.add(m.id);
    const input = perMillion(m.pricing?.prompt, m.id, "prompt price");
    const output = perMillion(m.pricing?.completion, m.id, "completion price");
    const textOut = (m.output_modalities || ["text"]).includes("text");
    const chat = !Array.isArray(m.supported_features) || m.supported_features.includes("chat");
    if (!textOut || !chat || !input || !output) { skipped.push(m.id); continue; }
    const cacheRead = perMillion(m.pricing?.input_cache_reads, m.id, "cache-read price");
    const cacheWrite = perMillion(m.pricing?.input_cache_writes, m.id, "cache-write price");
    const old = findOld(m);
    if (old) {
      if (matched.has(old)) throw new Error(`Inceptron catalog: ${m.id} and another id map to the same curated row ${old.model_name}`);
      matched.add(old);
    }
    // The list page names models like "GLM-5.3" / "Kimi-K2.7 Code"; the API names them "GLM 5.3" with id zai-org/GLM-5.3.
    const listed = listPrices ? listPrices.find((p) => p.key === nameKey(m.name) || p.key === nameKey(m.id.split("/").pop())) : null;
    const { input_per_1m_usd: _i, output_per_1m_usd: _o, cache_read_per_1m_usd: _c, cache_write_per_1m_usd: _w, price_status: _s, price_source: _p, ...kept } = old || {};
    const model = {
      ...kept,
      model_name: old?.model_name ?? m.name ?? m.id,
      api_model_id: m.id,
      provider_org: old?.provider_org ?? ORG[String(m.owned_by || m.id.split("/")[0]).toLowerCase()],
      ...(listPrices
        ? listed
          ? { input_per_1m_usd: listed.input_per_1m_usd, output_per_1m_usd: listed.output_per_1m_usd, cache_read_per_1m_usd: listed.cache_read_per_1m_usd,
              price_source: { url: listUrl, date: collectedAt, basis: "Inceptron list price (direct API)" } }
          : { price_status: "n/a", price_source: { url: listUrl, date: collectedAt, basis: "not on Inceptron's published price list; the OpenRouter feed price is not copied" } }
        : { input_per_1m_usd: input, output_per_1m_usd: output, cache_read_per_1m_usd: cacheRead || undefined, cache_write_per_1m_usd: cacheWrite || undefined }),
      ...(listPrices ? { api_catalog_price: { input_per_1m_usd: input, output_per_1m_usd: output, cache_read_per_1m_usd: cacheRead || undefined, url: "https://api.inceptron.io/v1/models", note: "provider feed ingested by OpenRouter; equals the OpenRouter route" } } : {}),
      context_length: Number.isFinite(m.context_length) ? m.context_length : old?.context_length,
      quantization: m.quantization || old?.quantization,
      region: "eu",
    };
    if (!old) {
      model.mapping = "derived";
      model.notes = [`Listed by api.inceptron.io/v1/models as ${m.id}`, m.quantization ? `${m.quantization} quant` : null, Number.isFinite(m.context_length) ? `${m.context_length.toLocaleString("en-US")} context` : null, (m.input_modalities || []).join("+") || null].filter(Boolean).join("; ");
    }
    for (const k of Object.keys(model)) if (model[k] === undefined || model[k] === null) delete model[k];
    if (model.api_catalog_price?.cache_read_per_1m_usd === undefined) delete model.api_catalog_price?.cache_read_per_1m_usd;
    models.push(model);
  }
  if (models.length === 0) throw new Error("Inceptron catalog: no priced chat models");
  if (listPrices && !models.some((m) => m.input_per_1m_usd != null)) throw new Error("Inceptron catalog: no served model matches the published price list (name mapping broke?)");
  if (prev.length > 0 && matched.size < prev.length * minRetainedShare) {
    throw new Error(`Inceptron catalog: only ${matched.size}/${prev.length} previous models still listed; refusing to replace the snapshot`);
  }
  const before = (m) => prev.find((p) => matched.has(p) && p.model_name === m.model_name);
  return {
    models,
    skipped,
    diff: {
      added: models.filter((m) => m.mapping === "derived" && !before(m)).map((m) => m.api_model_id),
      removed: prev.filter((p) => !matched.has(p)).map((p) => p.model_name),
      price_changed: models.filter((m) => { const o = before(m); return o && (o.input_per_1m_usd !== m.input_per_1m_usd || o.output_per_1m_usd !== m.output_per_1m_usd || (o.cache_read_per_1m_usd ?? null) !== (m.cache_read_per_1m_usd ?? null)); })
        .map((m) => { const o = before(m); return `${m.model_name}: ${o.input_per_1m_usd}/${o.output_per_1m_usd} (cache ${o.cache_read_per_1m_usd ?? "—"}) -> ${m.input_per_1m_usd}/${m.output_per_1m_usd} (cache ${m.cache_read_per_1m_usd ?? "—"})`; }),
    },
  };
}
