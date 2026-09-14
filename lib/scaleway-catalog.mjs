// R9.1: executable collector for Scaleway Generative APIs (data/raw/scaleway.json).
// Pure parsers: the pricing page's own structured Next.js data
// (props.pageProps.externalData["templates.pricing-page"].catalogProducts.generativeApis.models)
// and the ECB daily reference-rate XML, plus the previous snapshot, in; normalized rows out.
// The row `notes` keep the audited "€in/€out; api-slug; …" format, because build-dataset
// reads the Scaleway family identity from its second segment.

export function extractNextData(html) {
  const match = /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/.exec(String(html));
  if (!match) throw new Error("Scaleway pricing: no __NEXT_DATA__ (page layout changed?)");
  const models = JSON.parse(match[1])?.props?.pageProps?.externalData?.["templates.pricing-page"]?.catalogProducts?.generativeApis?.models;
  if (!Array.isArray(models) || models.length === 0) throw new Error("Scaleway pricing: generativeApis.models missing or empty");
  return models;
}

export function parseEcbUsdRate(xml) {
  const time = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(String(xml))?.[1];
  const rate = Number(/currency=['"]USD['"]\s+rate=['"]([0-9.]+)['"]/.exec(String(xml))?.[1]);
  if (!time || !Number.isFinite(rate) || rate < 0.7 || rate > 1.7) throw new Error("ECB: no plausible EUR/USD reference rate");
  return { rate, date: time };
}

const ORG_BY_PROVIDER = { deepseek: "DeepSeek", zai: "Z.ai", "z.ai": "Z.ai", qwen: "Alibaba", alibaba: "Alibaba", meta: "Meta", mistral: "Mistral", "mistral ai": "Mistral", google: "Google", openai: "OpenAI" };

export function eurPerMillion(price) {
  const value = price?.perMillionTokens?.value;
  if (!value) return null;
  if (value.currencyCode !== "EUR") throw new Error(`Scaleway pricing: unexpected currency ${value.currencyCode}`);
  const eur = Number(value.units || 0) + Number(value.nanos || 0) / 1e9;
  if (!Number.isFinite(eur) || eur < 0) throw new Error("Scaleway pricing: invalid price value");
  return Number(eur.toPrecision(6));
}

const slugOf = (m) => m?.api_model_id || String(m?.notes || "").match(/^[^;]+;\s*([^;]+)/)?.[1]?.trim() || null;
const eur = (v) => `€${v.toFixed(2)}`;
const usd = (v, rate) => Math.round(v * rate * 100) / 100;

export function parseScalewayCatalog(apiModels, previous = { models: [] }, fx, { region = "fr-par", minRetainedShare = 0.5 } = {}) {
  if (!fx || !Number.isFinite(fx.rate)) throw new Error("Scaleway pricing: no FX rate");
  const known = new Map((previous.models || []).map((m) => [slugOf(m), m]).filter(([slug]) => slug));
  const models = [];
  const skipped = [];
  for (const api of apiModels) {
    if (typeof api?.apiId !== "string" || !api.apiId) throw new Error("Scaleway pricing: model without apiId");
    const tasks = Array.isArray(api.tasks) ? api.tasks : [];
    const offer = (api.regions || []).find((r) => r.region === region);
    const input = offer ? eurPerMillion(offer.inputTokenPrice) : null;
    const output = offer ? eurPerMillion(offer.outputTokenPrice) : null;
    // Chat models have both token prices; embeddings (input only) and transcription (per minute) drop out.
    if (!tasks.includes("chat") || input === null || output === null) { skipped.push(api.apiId); continue; }
    const cached = eurPerMillion(offer.inputCachedTokenPrice);
    const old = known.get(api.apiId);
    const model = {
      model_name: old?.model_name ?? api.apiId,
      provider_org: old?.provider_org ?? ORG_BY_PROVIDER[String(api.providerName || "").toLowerCase()],
      input_per_1m_usd: usd(input, fx.rate),
      output_per_1m_usd: usd(output, fx.rate),
      cache_read_per_1m_usd: cached === null ? undefined : usd(cached, fx.rate),
      region: "eu",
      api_model_id: api.apiId,
      context_length: typeof api.contextWindow === "number" && api.contextWindow > 0 ? api.contextWindow : old?.context_length,
      status: api.status || undefined,
      notes: [`${eur(input)}/${eur(output)}${cached === null ? "" : ` (cached ${eur(cached)})`}`, api.apiId, tasks.includes("vision") ? "vision+text" : null, api.status ? `status ${api.status}` : null].filter(Boolean).join("; "),
    };
    if (!old) model.mapping = "derived";
    for (const k of Object.keys(model)) if (model[k] === undefined) delete model[k];
    models.push(model);
  }
  if (models.length === 0) throw new Error("Scaleway pricing: no priced chat models");
  const retained = models.filter((m) => known.has(m.api_model_id)).length;
  if (known.size > 0 && retained < known.size * minRetainedShare) {
    throw new Error(`Scaleway pricing: only ${retained}/${known.size} previous models still listed; refusing to replace the snapshot`);
  }
  const ids = new Set(models.map((m) => m.api_model_id));
  const oldEur = (m) => String(m?.notes || "").match(/€([0-9.]+)\/€([0-9.]+)/)?.slice(1).map(Number);
  return {
    models,
    skipped,
    diff: {
      added: models.filter((m) => !known.has(m.api_model_id)).map((m) => m.api_model_id),
      removed: [...known.keys()].filter((slug) => !ids.has(slug)),
      eur_price_changed: models.filter((m) => {
        const before = oldEur(known.get(m.api_model_id));
        const after = oldEur(m);
        return before && (before[0] !== after[0] || before[1] !== after[1]);
      }).map((m) => m.api_model_id),
    },
  };
}
