// R9.1: executable collector for Mistral La Plateforme API pricing (data/raw/mistral.json).
// Pure parser: the server-rendered https://mistral.ai/pricing/api HTML plus the previous snapshot
// in, the normalized `models` array out. Each model is a <mistral-block-card-model> with labelled
// prices and a copy-to-clipboard API id. Only cards with a per-million-token input AND output
// price are chat/text models (OCR is per 1000 pages, embeddings have no output, free Labs
// endpoints have no price). Curated rows are matched by API id (`api_model_id`, deliberately not `model_id`: build-dataset uses `model_id` as family identity and Mistral aliases like mistral-large-latest are not model names), else by normalized name.

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
export const nameKey = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const INPUT_RE = /^(text )?input \((\/m tokens|per min \/ per m tok)\)$/i;
const CACHED_RE = /^cached input \(\/m tokens\)$/i;
const OUTPUT_RE = /^output \(\/m tokens\)$/i;

export function parseCard(html) {
  const id = /data-text="([^"]+)"/.exec(html)?.[1] ?? null;
  const tokens = decode(html.replace(/^[^>]*>/, "").replace(/<[^>]+>/g, "|")).split("|").map((t) => t.trim()).filter(Boolean);
  const priceAfter = (re) => {
    const i = tokens.findIndex((t) => re.test(t));
    if (i < 0) return null;
    const m = /^\$([0-9]+(?:\.[0-9]+)?)$/.exec(tokens[i + 1] || "");
    return m ? Number(m[1]) : NaN;
  };
  return { id, name: tokens[0] ?? null, input: priceAfter(INPUT_RE), cached: priceAfter(CACHED_RE), output: priceAfter(OUTPUT_RE) };
}

export function parseMistralPricing(html, previous = { models: [] }, { minRetainedShare = 0.5 } = {}) {
  const chunks = String(html).split(/<mistral-block-card-model\b/).slice(1);
  if (chunks.length === 0) throw new Error("Mistral pricing: no model cards (page layout changed?)");
  const byId = new Map();
  for (const chunk of chunks) {
    const card = parseCard(chunk.split(/<\/mistral-block-card-model>/)[0]);
    if (!card.id || card.input === null || card.output === null) continue;
    if ([card.input, card.output, card.cached].some((v) => Number.isNaN(v))) throw new Error(`Mistral pricing: ${card.id} has a price label without a $ amount`);
    const seen = byId.get(card.id);
    // The page repeats flagship cards (hero tiles + catalog); the copies must agree.
    if (seen && (seen.input !== card.input || seen.output !== card.output || seen.cached !== card.cached)) throw new Error(`Mistral pricing: ${card.id} is listed twice with different prices`);
    if (!seen) byId.set(card.id, card);
  }
  if (byId.size === 0) throw new Error("Mistral pricing: no priced chat models");
  const prev = previous.models || [];
  const oldById = new Map(prev.filter((m) => m.api_model_id).map((m) => [m.api_model_id, m]));
  const oldByName = new Map(prev.map((m) => [nameKey(m.model_name), m]));
  const matched = new Set();
  const models = [...byId.values()].map((card) => {
    const old = oldById.get(card.id) ?? oldByName.get(nameKey(card.name));
    if (old) matched.add(old);
    const model = {
      ...(old || {}),
      model_name: old?.model_name ?? card.name,
      provider_org: old?.provider_org ?? (/^zai-/.test(card.id) ? "Z.ai" : "Mistral"),
      input_per_1m_usd: card.input,
      output_per_1m_usd: card.output,
      cache_read_per_1m_usd: card.cached ?? undefined,
      region: "eu",
      api_model_id: card.id,
    };
    if (!old) model.mapping = "derived";
    for (const k of Object.keys(model)) if (model[k] === undefined) delete model[k];
    return model;
  });
  if (prev.length > 0 && matched.size < prev.length * minRetainedShare) {
    throw new Error(`Mistral pricing: only ${matched.size}/${prev.length} previous models still listed; refusing to replace the snapshot`);
  }
  const oldOf = (m) => prev.find((o) => matched.has(o) && (o.api_model_id === m.api_model_id || nameKey(o.model_name) === nameKey(m.model_name)));
  return {
    models,
    diff: {
      added: models.filter((m) => m.mapping === "derived").map((m) => m.api_model_id),
      removed: prev.filter((m) => !matched.has(m)).map((m) => m.model_name),
      price_changed: models.filter((m) => {
        const o = oldOf(m);
        return o && (o.input_per_1m_usd !== m.input_per_1m_usd || o.output_per_1m_usd !== m.output_per_1m_usd);
      }).map((m) => m.api_model_id),
    },
  };
}
