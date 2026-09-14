// R9.1: executable collector for the Inceptron catalog (data/raw/inceptron.json).
// Pure parser: the unauthenticated OpenAI-compatible catalog https://api.inceptron.io/v1/models
// (the live billing meter; pricing.prompt / completion / input_cache_reads in USD per token) and the
// previous snapshot in, normalized rows out. Only models with text output, the "chat" feature and
// both token prices are included.

const ORG = { "zai-org": "Z.ai", moonshotai: "Moonshot AI", "deepseek-ai": "DeepSeek", minimaxai: "MiniMax", minimax: "MiniMax", qwen: "Alibaba", "meta-llama": "Meta", openai: "OpenAI", mistralai: "Mistral", google: "Google" };
export const nameKey = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
/** USD per token → USD per 1M tokens, four decimals (Inceptron meters are not whole cents). */
const perMillion = (value, id, field) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Inceptron catalog: ${id} has unreadable ${field} "${value}"`);
  return Math.round(n * 1e6 * 10000) / 10000;
};

export function parseInceptronCatalog(payload, previous = { models: [] }, { minRetainedShare = 0.5 } = {}) {
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
    const model = {
      ...(old || {}),
      model_name: old?.model_name ?? m.name ?? m.id,
      api_model_id: m.id,
      provider_org: old?.provider_org ?? ORG[String(m.owned_by || m.id.split("/")[0]).toLowerCase()],
      input_per_1m_usd: input,
      output_per_1m_usd: output,
      cache_read_per_1m_usd: cacheRead || undefined,
      cache_write_per_1m_usd: cacheWrite || undefined,
      context_length: Number.isFinite(m.context_length) ? m.context_length : old?.context_length,
      quantization: m.quantization || old?.quantization,
      region: "eu",
    };
    if (!old) {
      model.mapping = "derived";
      model.notes = [`Listed by api.inceptron.io/v1/models as ${m.id}`, m.quantization ? `${m.quantization} quant` : null, Number.isFinite(m.context_length) ? `${m.context_length.toLocaleString("en-US")} context` : null, (m.input_modalities || []).join("+") || null].filter(Boolean).join("; ");
    }
    for (const k of Object.keys(model)) if (model[k] === undefined || model[k] === null) delete model[k];
    models.push(model);
  }
  if (models.length === 0) throw new Error("Inceptron catalog: no priced chat models");
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
