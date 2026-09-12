// Runtime identity and refresh transparency. Values are supplied by Coolify at runtime;
// absent or malformed deployment identity is explicitly unknown rather than guessed.
const COMMIT = /^[0-9a-f]{7,64}$/i;

export function revisionFromEnvironment(environment = process.env) {
  const value = environment?.SOURCE_COMMIT;
  return typeof value === 'string' && COMMIT.test(value) ? value.toLowerCase() : 'unknown';
}

export function sourceAgeDays(sourceDate, now = new Date().toISOString()) {
  if (typeof sourceDate !== 'string') return null;
  const then = Date.parse(sourceDate.length === 10 ? `${sourceDate}T00:00:00.000Z` : sourceDate);
  const at = Date.parse(now);
  if (!Number.isFinite(then) || !Number.isFinite(at)) return null;
  return Math.max(0, Math.floor((at - then) / 86_400_000));
}

export function publicOperatorReceipt(receipt, sources, now = new Date().toISOString()) {
  const sourceAges = Object.fromEntries(Object.entries(sources || {}).map(([name, date]) => [name, sourceAgeDays(date, now)]));
  return {
    schema_version: 1,
    generated_at: now,
    refresh_claim: 'none',
    last_success: receipt?.last_success ?? null,
    last_attempt: receipt?.last_attempt ?? null,
    source_dates: sources || {},
    source_ages_days: sourceAges,
    note: 'Source ages are calculated from the bundled snapshot. A failed attempt does not imply refreshed production data.',
  };
}
