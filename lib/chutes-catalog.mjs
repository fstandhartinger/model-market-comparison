// R9.1: executable collector for the first-party Chutes TEE catalog (data/raw/chutes.json).
// Pure parser: the live `llm.chutes.ai/v1/models` payload plus the previous snapshot in,
// the normalized `models` array out. Curated family names (`model_name`, `provider_org`) are
// carried over from the previous snapshot by exact live id; a new id gets a conservative
// derived name and `mapping: "derived"` so a reviewer can see it was not hand-checked.

const ORG_BY_PREFIX = {
  "qwen": "Alibaba", "deepseek-ai": "DeepSeek", "zai-org": "Z.ai", "moonshotai": "Moonshot AI",
  "google": "Google", "nvidia": "NVIDIA", "mistralai": "Mistral", "unsloth": null, "openai": "OpenAI",
  "meta-llama": "Meta", "minimaxai": "MiniMax", "xiaomimimo": "Xiaomi",
};

// Float noise in the payload (0.04499999999999999) is not a price change: 6 significant digits.
const price = (value) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? Number(value.toPrecision(6)) : null);

export function derivedModelName(id) {
  return String(id).split("/").pop().replace(/-TEE$/i, "").replace(/-(FP8|NVFP4|BF16|INT4|AWQ)$/i, "");
}

export function parseChutesCatalog(payload, previous = { models: [] }, { minRetainedShare = 0.5 } = {}) {
  const rows = payload?.data;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Chutes catalog: no data array");
  const known = new Map((previous.models || []).map((m) => [m.tee_model_id, m]));
  const models = rows.map((row) => {
    if (typeof row.id !== "string" || !row.id) throw new Error("Chutes catalog: row without id");
    const input = price(row.price?.input?.usd);
    const output = price(row.price?.output?.usd);
    if (input === null || output === null) throw new Error(`Chutes catalog: ${row.id} has no numeric input/output USD price`);
    if (typeof row.confidential_compute !== "boolean") throw new Error(`Chutes catalog: ${row.id} has no confidential_compute flag`);
    const old = known.get(row.id);
    const prefix = row.id.includes("/") ? row.id.split("/")[0].toLowerCase() : "";
    const model = {
      ...(old || {}),
      model_name: old?.model_name ?? derivedModelName(row.id),
      provider_org: old?.provider_org ?? ORG_BY_PREFIX[prefix] ?? undefined,
      input_per_1m_usd: input,
      output_per_1m_usd: output,
      cache_read_per_1m_usd: price(row.price?.input_cache_read?.usd),
      // Some rows omit context_length; never blank a known value because the payload dropped it.
      context_length: [row.context_length, row.max_model_len, old?.context_length].find((v) => typeof v === "number" && v > 0),
      confidential_compute: row.confidential_compute,
      tee_model_id: row.id,
    };
    if (!old) model.mapping = "derived";
    if (model.cache_read_per_1m_usd === null) delete model.cache_read_per_1m_usd;
    for (const k of Object.keys(model)) if (model[k] === undefined) delete model[k];
    return model;
  });
  const retained = models.filter((m) => known.has(m.tee_model_id)).length;
  if (known.size > 0 && retained < known.size * minRetainedShare) {
    throw new Error(`Chutes catalog: only ${retained}/${known.size} previous ids still listed; refusing to replace the snapshot`);
  }
  const ids = new Set(models.map((m) => m.tee_model_id));
  return {
    models,
    diff: {
      added: models.filter((m) => !known.has(m.tee_model_id)).map((m) => m.tee_model_id),
      removed: [...known.keys()].filter((id) => !ids.has(id)),
      price_changed: models.filter((m) => {
        const o = known.get(m.tee_model_id);
        return o && ["input_per_1m_usd", "output_per_1m_usd", "cache_read_per_1m_usd"].some((k) => price(o[k]) !== price(m[k]));
      }).map((m) => m.tee_model_id),
    },
  };
}
