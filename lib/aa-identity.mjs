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

/**
 * Is this AA model's published family key frozen, i.e. must this build keep it?
 *
 * 17 Sep 2026, second lesson: freezing a key only while "AA's name differs from the published one"
 * lasts exactly one build. The 13:36 run published `deepseek-v4-pro::max` under AA's new name
 * "DeepSeek V4 Pro 0424"; on every later build the two names matched again, the freeze lapsed, and
 * the row would have been renamed — breaking stored score rows, public URLs and seven tests. A
 * freeze is therefore recorded in the dataset (`aa_key_freezes`) and holds until the key and the
 * name derive each other again.
 *
 * `publishedFreeze` is the recorded entry for this AA UUID (or undefined). `knownFreezes` is false
 * for a dataset published before the record existed; such a dataset is read back through the one
 * signal it does carry — a published key its own published name no longer derives.
 */
export function aaKeyFrozen({ publishedKey, publishedName, currentName, publishedNaturalKey, publishedFreeze, knownFreezes }) {
  if (!publishedKey) return false;
  if (publishedFreeze) return publishedFreeze.family_key === publishedKey;
  if (publishedName !== currentName) return true;
  return !knownFreezes && publishedNaturalKey != null && publishedNaturalKey !== publishedKey;
}
