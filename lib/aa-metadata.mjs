// AA API and leaderboard publications can briefly differ during a model rollout.
// Keep scores available for a small lag, but never invent license/weight metadata.
export function enrichArtificialAnalysis(apiModels, metadata) {
  const missing = apiModels.filter((model) => !metadata.has(model.id));
  if (!apiModels.length || !metadata.size || missing.length > 3) {
    throw new Error(`AA metadata mismatch: API=${apiModels.length}, leaderboard=${metadata.size}, missing=${missing.length} (${missing.slice(0, 3).map((m) => m.name).join(", ")})`);
  }
  const apiIds = new Set(apiModels.map((model) => model.id));
  return {
    missing: missing.map((model) => ({ id: model.id, name: model.name })),
    extraCount: [...metadata.keys()].filter((id) => !apiIds.has(id)).length,
    models: apiModels.map((model) => {
      const meta = metadata.get(model.id) || {};
      return {
        ...model,
        metadata: {
          deprecated: meta.deprecated ?? null,
          is_reasoning: meta.isReasoning ?? null,
          is_open_weights: meta.isOpenWeights ?? null,
          commercial_allowed: meta.commercialAllowed ?? null,
          license_name: meta.licenseName ?? null,
          license_url: meta.licenseUrl ?? null,
          huggingface_url: meta.huggingfaceUrl ?? null,
          openrouter_api_id: meta.openrouterApiId ?? null,
          context_window_tokens: meta.contextWindowTokens ?? null,
        },
      };
    }),
  };
}
