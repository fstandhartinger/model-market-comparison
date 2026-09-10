// AA API and leaderboard publications can briefly differ during a model rollout.
// Keep scores available for a small lag, but never invent license/weight metadata.
export function enrichArtificialAnalysis(apiModels, metadata, previous = {}) {
  const metadataKey = (model) => metadata.has(model.slug) ? model.slug : model.id;
  const previousById = new Map((previous.models || []).map((model) => [model.id, model]));
  const fields = {
    deprecated: "deprecated", is_reasoning: "isReasoning", is_open_weights: "isOpenWeights",
    commercial_allowed: "commercialAllowed", license_name: "licenseName", license_url: "licenseUrl",
    huggingface_url: "huggingfaceUrl", openrouter_api_id: "openrouterApiId", context_window_tokens: "contextWindowTokens",
  };
  const missing = apiModels.filter((model) => !metadata.has(metadataKey(model)));
  if (!apiModels.length || !metadata.size || missing.length > 3) {
    throw new Error(`AA metadata mismatch: API=${apiModels.length}, leaderboard=${metadata.size}, missing=${missing.length} (${missing.slice(0, 3).map((m) => m.name).join(", ")})`);
  }
  const apiIds = new Set(apiModels.map(metadataKey));
  return {
    missing: missing.map((model) => ({ id: model.id, name: model.name })),
    extraCount: [...metadata.keys()].filter((id) => !apiIds.has(id)).length,
    models: apiModels.map((model) => {
      const meta = metadata.get(metadataKey(model)) || {};
      const old = previousById.get(model.id);
      const prior = old && old.slug === model.slug ? old.metadata || {} : {};
      const values = {};
      const retained = {};
      for (const [field, sourceField] of Object.entries(fields)) {
        if (Object.hasOwn(meta, sourceField)) values[field] = meta[sourceField] ?? null;
        else if (prior[field] != null) {
          values[field] = prior[field];
          retained[field] = prior.retained_fields?.[field] || {
            source: previous.metadata_endpoint,
            collected_at: previous.collected_at,
            reason: "Field absent from current AA leaderboard; retained from last published metadata.",
          };
        } else values[field] = null;
      }
      return {
        ...model,
        metadata: {
          ...values,
          ...(Object.keys(retained).length ? { retained_fields: retained } : {}),
        },
      };
    }),
  };
}
