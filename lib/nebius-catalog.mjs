// R9.1: executable collector for the Nebius Token Factory catalog (data/raw/nebius.json).
// Pure parser: the public `tokenfactory.nebius.com/api/public/models_info` payload plus the
// previous snapshot in, the normalized `models` array out. Curated `model_name`/`provider_org`
// are carried over by exact flavor `model_id` (older rows only carry it inside `notes` as
// "id <model_id>"); a new id gets a derived name and `mapping: "derived"`.

const ORG_BY_VENDOR = {
  deepseek: "DeepSeek", moonshotai: "Moonshot AI", "zai-org": "Z.ai", zai: "Z.ai", qwen: "Alibaba",
  nvidia: "NVIDIA", google: "Google", "meta-llama": "Meta", meta: "Meta", openai: "OpenAI",
  minimaxai: "MiniMax", minimax: "MiniMax", nousresearch: "Nous Research", openbmb: "OpenBMB",
};

// Served region → the dataset's coarse region flag. UK is deliberately not "eu".
const EU_COUNTRIES = new Set(["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"]);
export function regionFlag(countryCode) {
  const code = String(countryCode || "").toUpperCase();
  if (EU_COUNTRIES.has(code)) return "eu";
  if (code === "US") return "us";
  if (code === "UK" || code === "GB") return "uk";
  return null;
}

const price = (value) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? Number(value.toPrecision(6)) : null);

export function previousModelId(model) {
  if (typeof model?.model_id === "string" && model.model_id) return model.model_id;
  const match = /\bid ([^\s;]+)/.exec(String(model?.notes || ""));
  return match ? match[1].replace(/\.$/, "") : null;
}

export function derivedModelName(name) {
  return String(name).split("/").pop().replace(/-/g, " ");
}

export function parseNebiusCatalog(payload, previous = { models: [] }, { minRetainedShare = 0.5 } = {}) {
  if (!Array.isArray(payload) || payload.length === 0) throw new Error("Nebius catalog: no model array");
  const known = new Map((previous.models || []).map((m) => [previousModelId(m), m]).filter(([id]) => id));
  const models = [];
  const skipped = [];
  for (const entry of payload) {
    const flavors = Array.isArray(entry?.flavors) ? entry.flavors : [];
    if (flavors.length === 0) throw new Error(`Nebius catalog: ${entry?.name} has no flavors`);
    for (const flavor of flavors) {
      const id = flavor.model_id;
      if (typeof id !== "string" || !id) throw new Error(`Nebius catalog: ${entry.name} flavor without model_id`);
      const type = flavor.model_type || entry.type;
      const input = price(flavor.input_price_per_million_tokens);
      const output = price(flavor.output_price_per_million_tokens);
      if (input === null || output === null) throw new Error(`Nebius catalog: ${id} has no numeric input/output price`);
      // Embeddings (and any other non-chat type) have no text output price; the method keeps them out.
      if (!/^text2text$|^image2text$|vision/i.test(String(type)) || output === 0) { skipped.push(id); continue; }
      const served = Array.isArray(flavor.regions) ? flavor.regions : [];
      if (served.length !== 1) throw new Error(`Nebius catalog: ${id} is served from ${served.length} regions; the row schema holds one`);
      const region = regionFlag(served[0].country_code);
      if (!region) throw new Error(`Nebius catalog: ${id} has unknown region country ${served[0].country_code}`);
      const old = known.get(id);
      const vendor = (id.includes("/") ? id.split("/")[0] : entry.vendor || "").toLowerCase();
      const context = [flavor.max_model_len, old?.context_length].find((v) => typeof v === "number" && v > 0);
      const model = {
        model_name: old?.model_name ?? derivedModelName(flavor.model_name || entry.name),
        provider_org: old?.provider_org ?? ORG_BY_VENDOR[vendor] ?? ORG_BY_VENDOR[String(entry.vendor || "").toLowerCase()],
        input_per_1m_usd: input,
        output_per_1m_usd: output,
        region,
        model_id: id,
        context_length: context,
        status: entry.status || undefined,
        notes: [`flavor: ${flavor.label || "default"}`, `served region: ${served[0].name} (${served[0].country_code})`, `id ${id}`, entry.status && entry.status !== "active" ? `catalog status: ${entry.status}` : null].filter(Boolean).join("; "),
      };
      if (!old) model.mapping = "derived";
      for (const k of Object.keys(model)) if (model[k] === undefined) delete model[k];
      models.push(model);
    }
  }
  if (models.length === 0) throw new Error("Nebius catalog: no priced chat models");
  const retained = models.filter((m) => known.has(m.model_id)).length;
  if (known.size > 0 && retained < known.size * minRetainedShare) {
    throw new Error(`Nebius catalog: only ${retained}/${known.size} previous ids still listed; refusing to replace the snapshot`);
  }
  const ids = new Set(models.map((m) => m.model_id));
  return {
    models,
    skipped,
    diff: {
      added: models.filter((m) => !known.has(m.model_id)).map((m) => m.model_id),
      removed: [...known.keys()].filter((id) => !ids.has(id)),
      price_changed: models.filter((m) => {
        const o = known.get(m.model_id);
        return o && ["input_per_1m_usd", "output_per_1m_usd"].some((k) => price(o[k]) !== m[k]);
      }).map((m) => m.model_id),
      region_changed: models.filter((m) => known.has(m.model_id) && known.get(m.model_id).region !== m.region).map((m) => m.model_id),
    },
  };
}
