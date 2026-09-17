// 17 Sep 2026: AA renamed "DeepSeek V4 Pro" to "DeepSeek V4 Pro 0424" (same AA UUID) once a newer checkpoint appeared, and the
// name-derived catalog id changed with it: the model's URL, curated joins and stored score rows broke the day's build.
/**
 * Family key for an AA model: the key already published for this AA UUID wins over today's name-derived key, unless another
 * AA model in today's list derives exactly that row id itself (a genuine split, not a rename).
 * `naturalRowIds`: Map of `${naturalKey}::${variant}` → AA UUID for today's list.
 */
export function stickyAaFamilyKey({ aaId, naturalKey, variant, publishedKey, naturalRowIds }) {
  if (!publishedKey || publishedKey === naturalKey) return naturalKey;
  const claimant = naturalRowIds.get(`${publishedKey}::${variant}`);
  return claimant === undefined || claimant === aaId ? publishedKey : naturalKey;
}
