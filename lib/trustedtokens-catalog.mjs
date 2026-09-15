// CR-27.1: executable collector for the TrustedTokens public model catalog (data/raw/trustedtokens.json).
// Pure parser: the unauthenticated JSON the ModelsIsland at trustedtokens.eu/models itself loads
// (GET https://trustedtokens.eu/api/service/models; robots.txt allows /) plus the previous
// snapshot and an ECB EUR/USD rate in, normalized rows out. Prices arrive as EUR *per token*
// and are normalized to EUR per 1M tokens; USD = EUR × ECB daily reference rate, rounded to the
// nearest cent (same convention as T-Systems). Rows missing a positive input or output price
// are skipped (not priced chat models). The lifecycle attribute (flagship / production-stable /
// experimental / deprecated) is kept, never dropped. Hosting is audited (TNG-operated GPU
// infrastructure in Germany — see trustedtokens.method.md), never derived from the payload.

const NAME_RE = /^[a-z0-9][a-z0-9._-]{1,40}\/[A-Za-z0-9][A-Za-z0-9._:-]{1,80}$/i;

export const ORG_BY_VENDOR = {
  "zai-org": "Z.ai",
  tngtech: "TNG Technology Consulting",
  google: "Google",
  openai: "OpenAI",
  qwen: "Alibaba",
  "deepseek-ai": "DeepSeek",
  nvidia: "NVIDIA",
};

export function derivedModelName(slug) {
  return String(slug).split("/").pop().split("-").map((w) => (/^[a-z]/.test(w) ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
}

export function statusFor(attributes) {
  const a = Array.isArray(attributes) ? attributes : [];
  if (a.includes("deprecated")) return "deprecated";
  if (a.includes("experimental")) return "experimental";
  if (a.includes("production-stable")) return "production";
  return "unknown";
}

const perTokenPrice = (value, field, name) => {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value <= 0 || value > 1e-3) {
    throw new Error(`TrustedTokens: unreadable ${field} price ${JSON.stringify(value)} for ${name}`);
  }
  return value;
};

// EUR per 1M tokens, float-noise-free (prices are exact fractions of a cent per thousand calls).
const per1mEur = (perToken) => Math.round(perToken * 1e6 * 1e4) / 1e4;

export function parseTrustedTokensCatalog(payloadText, previous = { models: [] }, fx, { minRetainedShare = 0.5 } = {}) {
  if (!fx || !Number.isFinite(fx.rate)) throw new Error("TrustedTokens: no FX rate");
  let payload;
  try {
    payload = JSON.parse(String(payloadText));
  } catch {
    throw new Error("TrustedTokens: response is not JSON (layout or endpoint changed?)");
  }
  const raw = payload?.models;
  if (!Array.isArray(raw)) throw new Error("TrustedTokens: payload has no models array");
  if (raw.length < 8) throw new Error(`TrustedTokens: only ${raw.length} catalog models (expected at least 8) — refusing to replace the snapshot`);

  const seen = new Set();
  const skipped = [];
  const models = [];
  for (const m of raw) {
    const slug = String(m?.name || "");
    if (!NAME_RE.test(slug)) throw new Error(`TrustedTokens: unexpected model name ${JSON.stringify(slug)}`);
    if (seen.has(slug)) throw new Error(`TrustedTokens: ${slug} listed twice`);
    seen.add(slug);
    const providers = Array.isArray(m?.providers) ? m.providers : null;
    if (!providers || providers.length === 0) throw new Error(`TrustedTokens: ${slug} has no providers entry`);
    const defaultIndex = Number.isInteger(m.default_provider_index) && m.default_provider_index >= 0 && m.default_provider_index < providers.length ? m.default_provider_index : 0;
    const offer = providers[defaultIndex] || {};
    const pricing = offer.pricing || {};
    const input = perTokenPrice(pricing.input, "input", slug);
    const output = perTokenPrice(pricing.output, "output", slug);
    const cache = perTokenPrice(pricing.cache_read, "cache_read", slug);
    if (input === null || output === null) { skipped.push(slug); continue; }
    if (offer.max_total_tokens !== undefined && !(Number.isInteger(offer.max_total_tokens) && offer.max_total_tokens > 0)) {
      throw new Error(`TrustedTokens: unreadable max_total_tokens ${JSON.stringify(offer.max_total_tokens)} for ${slug}`);
    }
    const usd = (eur) => (eur === null ? null : Math.round(eur * fx.rate * 100) / 100);
    const eurIn = per1mEur(input);
    const eurOut = per1mEur(output);
    const eurCache = cache === null ? null : per1mEur(cache);
    const vendor = slug.split("/")[0].toLowerCase();
    const model = {
      model_name: derivedModelName(slug),
      provider_org: ORG_BY_VENDOR[vendor],
      api_model_id: slug,
      model_id: slug,
      input_per_1m_eur: eurIn,
      output_per_1m_eur: eurOut,
      input_per_1m_usd: usd(eurIn),
      output_per_1m_usd: usd(eurOut),
      cache_read_per_1m_eur: eurCache ?? undefined,
      cache_read_per_1m_usd: usd(eurCache) ?? undefined,
      context_length: offer.max_total_tokens ?? undefined,
      status: statusFor(m.attributes),
      eu_hosted: true,
      hosting_class: "sovereign_germany",
      region: "eu",
      notes: `trustedtokens.eu/api/service/models ${slug}; ${offer.max_total_tokens ?? "?"} ctx; TNG-operated GPU inference in Germany; business accounts priced with included monthly credit (see trustedtokens.method.md)`,
    };
    for (const k of Object.keys(model)) if (model[k] === undefined) delete model[k];
    models.push(model);
  }
  if (models.length === 0) throw new Error("TrustedTokens: no priced chat models");

  const prevById = new Map((previous.models || []).filter((m) => m.api_model_id).map((m) => [m.api_model_id, m]));
  const matched = new Set(models.filter((m) => prevById.has(m.api_model_id)).map((m) => m.api_model_id));
  // provider_org is a lookup on our side; keep a previously curated override (e.g. a corrected display name).
  for (const m of models) {
    const old = prevById.get(m.api_model_id);
    if (old?.provider_org && old.provider_org !== m.provider_org) m.provider_org = old.provider_org;
  }
  const prev = previous.models || [];
  if (prev.length > 0 && matched.size < prev.length * minRetainedShare) {
    throw new Error(`TrustedTokens: only ${matched.size}/${prev.length} previous models still listed; refusing to replace the snapshot`);
  }
  return {
    models,
    skipped,
    diff: {
      added: models.filter((m) => !prevById.has(m.api_model_id)).map((m) => m.api_model_id),
      removed: prev.filter((m) => m.api_model_id && !models.some((n) => n.api_model_id === m.api_model_id)).map((m) => m.api_model_id),
      eur_price_changed: models.filter((m) => {
        const o = prevById.get(m.api_model_id);
        return o && ["input_per_1m_eur", "output_per_1m_eur", "cache_read_per_1m_eur"].some((k) => (o[k] ?? null) !== (m[k] ?? null));
      }).map((m) => m.api_model_id),
    },
  };
}
