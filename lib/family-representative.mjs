// Deterministic family representative — the one catalog configuration that owns family-scoped
// evidence. Sources that publish a product/family id without a reasoning effort (Epoch ECI,
// Intelligence.ai/DesignArena, OpenRouter's own benchmark runs) must attach their result exactly
// once, on the same row the collapsed Overview shows, and say so in an attachment note.
// Selecting by variant priority (instead of whichever source row was inserted first) keeps
// refreshes stable.

export function familyRepresentativeVariantOrder(familyKey) {
  if (familyKey.startsWith("gpt-")) {
    return ["high", "medium", "xhigh", "low", "minimal", "non-reasoning", "default"];
  }
  if (familyKey.startsWith("claude-")) {
    return ["reasoning", "high", "max", "adaptive", "xhigh", "medium", "low", "default", "non-reasoning"];
  }
  return ["reasoning", "max", "high", "adaptive", "xhigh", "medium", "low", "default", "non-reasoning"];
}

export function hasCompositeBenchmarkEvidence(row) {
  const benchmarks = row.benchmarks || {};
  return benchmarks.aa_coding_index != null
    || benchmarks.aa_coding_agent_index != null
    || benchmarks.aa_intelligence_index != null;
}

export function deterministicFamilyRepresentative(familyKey, familyRows) {
  const active = familyRows.filter((row) => row.deprecated !== true);
  const lifecycleCandidates = active.length ? active : familyRows;
  const measured = lifecycleCandidates.filter(hasCompositeBenchmarkEvidence);
  const candidates = measured.length ? measured : lifecycleCandidates;
  const order = familyRepresentativeVariantOrder(familyKey);
  return [...candidates].sort((a, b) => {
    const aRank = order.indexOf(a.variant);
    const bRank = order.indexOf(b.variant);
    const normalizedARank = aRank < 0 ? order.length : aRank;
    const normalizedBRank = bRank < 0 ? order.length : bRank;
    return normalizedARank - normalizedBRank || a.id.localeCompare(b.id);
  })[0];
}
