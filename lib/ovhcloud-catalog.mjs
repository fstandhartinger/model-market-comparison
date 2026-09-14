// R9.1: executable collector for the OVHcloud AI Endpoints catalog (data/raw/ovhcloud.json).
// Pure parser: the server-rendered https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/
// HTML, the previous snapshot and an ECB EUR/USD rate in, normalized rows out. Each model card
// carries an h3 `Models_modelTitle__*` and one h2 `Models_priceMain__*` per price, followed by its
// unit ("/Mtoken(input)", "/Mtoken(output)", or per-minute / per-image units for non-LLM models).
// Only cards with both an input- and an output-token EUR price are text-generating models.

const decode = (s) => s.replace(/<!-- -->/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const text = (html) => decode(String(html)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
export const nameKey = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function readCards(html) {
  const chunks = String(html).split(/data-tc-clic="public-cloud::ai-endpoints::link-discover-catalog-ai-endpoints-/).slice(1);
  if (chunks.length === 0) throw new Error("OVHcloud catalog: no model cards (page layout changed?)");
  const cards = new Map();
  for (const chunk of chunks) {
    const slug = chunk.slice(0, chunk.indexOf('"'));
    const title = text(/Models_modelTitle__[^"]*"[^>]*>([\s\S]*?)<\/h3>/.exec(chunk)?.[1] ?? "");
    if (!slug || !title) throw new Error(`OVHcloud catalog: card ${slug || "?"} without a title`);
    const prices = [...chunk.matchAll(/Models_priceMain__[^"]*"[^>]*>([\s\S]*?)<\/h2>\s*<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) => ({ value: text(m[1]), unit: text(m[2]) }));
    const eur = (re) => {
      const hit = prices.find((p) => re.test(p.unit.replace(/\s+/g, "")));
      if (!hit) return null;
      const m = /^([0-9]+(?:\.[0-9]+)?)\s?€$/.exec(hit.value);
      if (!m) throw new Error(`OVHcloud catalog: ${title} has unreadable price "${hit.value}"`);
      return Number(m[1]);
    };
    const card = {
      slug, title,
      category: text(/_text--caption[^"]*"[^>]*>([\s\S]*?)<\/span>/.exec(chunk)?.[1] ?? ""),
      inputEur: eur(/^\/Mtoken\(input\)$/i),
      outputEur: eur(/^\/Mtoken\(output\)$/i),
      context: text(/Max\. context size:\s*<\/strong>([\s\S]*?)<\/p>/.exec(decode(chunk))?.[1] ?? "") || null,
    };
    const seen = cards.get(slug);
    if (seen && (seen.inputEur !== card.inputEur || seen.outputEur !== card.outputEur)) throw new Error(`OVHcloud catalog: ${slug} listed twice with different prices`);
    if (!seen) cards.set(slug, card);
  }
  return [...cards.values()];
}

const ORG = [[/^qwen/i, "Alibaba"], [/^gpt-oss/i, "OpenAI"], [/llama/i, "Meta"], [/mistral|mixtral|codestral/i, "Mistral"], [/deepseek/i, "DeepSeek"], [/gemma/i, "Google"]];
const usd = (eur, rate) => Math.round(eur * rate * 100) / 100;

export function parseOvhcloudCatalog(html, previous = { models: [] }, fx, { minRetainedShare = 0.5 } = {}) {
  if (!fx || !Number.isFinite(fx.rate)) throw new Error("OVHcloud catalog: no FX rate");
  const cards = readCards(html);
  const prev = previous.models || [];
  const byId = new Map(prev.filter((m) => m.model_id).map((m) => [m.model_id, m]));
  const byName = new Map(prev.map((m) => [nameKey(m.model_name), m]));
  const matched = new Set();
  const skipped = [];
  const models = [];
  for (const card of cards) {
    if (card.inputEur === null || card.outputEur === null) { skipped.push(card.title); continue; }
    const old = byId.get(card.title) ?? byName.get(nameKey(card.title));
    if (old) matched.add(old);
    const model = {
      ...(old || {}),
      model_name: old?.model_name ?? card.title,
      model_id: old?.model_id ?? card.title,
      provider_org: old?.provider_org ?? ORG.find(([re]) => re.test(card.title))?.[1],
      input_per_1m_eur: card.inputEur,
      output_per_1m_eur: card.outputEur,
      input_per_1m_usd: usd(card.inputEur, fx.rate),
      output_per_1m_usd: usd(card.outputEur, fx.rate),
      currency: "EUR",
      region: "eu",
      eu_hosted: true,
      catalog_slug: card.slug,
    };
    if (!old) { model.mapping = "derived"; model.notes = [card.category, card.context ? `${card.context} context` : null].filter(Boolean).join("; "); }
    for (const k of Object.keys(model)) if (model[k] === undefined) delete model[k];
    models.push(model);
  }
  if (models.length === 0) throw new Error("OVHcloud catalog: no priced text-generation models");
  if (prev.length > 0 && matched.size < prev.length * minRetainedShare) {
    throw new Error(`OVHcloud catalog: only ${matched.size}/${prev.length} previous models still listed; refusing to replace the snapshot`);
  }
  return {
    models,
    skipped,
    diff: {
      added: models.filter((m) => !prev.some((p) => matched.has(p) && p.model_id === m.model_id)).map((m) => m.model_id),
      removed: prev.filter((m) => !matched.has(m)).map((m) => m.model_name),
      eur_price_changed: models.filter((m) => {
        const o = prev.find((p) => matched.has(p) && p.model_id === m.model_id);
        return o && (o.input_per_1m_eur !== m.input_per_1m_eur || o.output_per_1m_eur !== m.output_per_1m_eur);
      }).map((m) => m.model_id),
    },
  };
}
