// Runtime identity and refresh transparency. The deployed commit is whatever the host that built
// the container says it is; absent or malformed deployment identity is explicitly unknown rather
// than guessed.
const COMMIT = /^[0-9a-f]{7,64}$/i;
// 20 Sep 2026 (iteration 134): only Coolify's variable was read, so the canonical host published its
// commit and the legacy Render host published `unknown` — and `revision` is the marker every review
// gate uses to prove a deploy landed. Each host's own documented variable is read, in the order the
// two hosts were added; nothing is derived from anything else.
const REVISION_VARS = ['SOURCE_COMMIT', 'RENDER_GIT_COMMIT'];

export function revisionFromEnvironment(environment = process.env) {
  for (const name of REVISION_VARS) {
    const value = environment?.[name];
    if (typeof value === 'string' && COMMIT.test(value)) return value.toLowerCase();
  }
  return 'unknown';
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
