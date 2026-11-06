// CR-693 (2026-11-05): Artificial Analysis retired its legacy /api/v2/data/* routes at 2026-11-04 23:59 UTC; they now
// answer 410 Gone (mail "Legacy Data API endpoints retire today", 4 Nov 18:01Z; https://artificialanalysis.ai/data-api/migrate-v2-data).
// The supported replacement for /api/v2/data/llms/models is /api/v2/language/models, which is Pro-only; our key is on the
// Free tier (403 "Language models list requires a Pro subscription", X-AA-Tier: free), and /api/v2/language/models/free
// excludes the full evaluation set, context window and other fields the published snapshot carries. Moving to either is a
// decision (a subscription, or withdrawing published per-benchmark AA values), not something a collector may infer.
//
// Decision bh-aa-retained-fallback-one-publication-1105 permitted one publication on 5 November; Florian extended it on
// 6 Nov 2026 (card 19348, "Keep"): the dated 4 Nov snapshot may be retained through 6 Dec 2026 (CR-705).
// Within that window a 410 from the retired route is not an ordinary failure: the collector stops before any write with the
// marker, the daily keeps the published AA snapshot (and its token-efficiency snapshot) with their own dates while every
// other source publishes, and source health names AA as stale after three days. Any other HTTP status, including a 410
// from any other URL, still fails closed. review-live.mjs re-derives the retirement from the captured 410 receipt.
export const AA_LEGACY_API_URL = 'https://artificialanalysis.ai/api/v2/data/llms/models';
export const AA_LEGACY_API_RETIRED = 'AA_LEGACY_API_RETIRED';

export function aaLegacyApiRetiredMessage() {
  return `${AA_LEGACY_API_RETIRED} (HTTP 410 at ${AA_LEGACY_API_URL}; the supported replacement needs a Pro key or a reviewed Free-tier migration)`;
}

/** True only for a captured 410 receipt of the retired legacy models route. */
export const isAaLegacyApiRetirement = (receipt) => receipt?.url === AA_LEGACY_API_URL && receipt?.status === 410 && (receipt.method || 'GET') === 'GET';

// CR-705: a dated window instead of one UTC day. Every run in it must start from a published dataset at least as new
// as the 4 Nov baseline (proof file present and valid), and only the 4 Nov AA snapshot itself may be retained: the
// snapshot dates are pinned, so a later AA capture can never be carried forward under this exception. After the last
// day every 410 fails closed again until a new decision.
export const AA_RETENTION_FIRST_DAY = '2026-11-05';
export const AA_RETENTION_LAST_DAY = '2026-12-06';
export const AA_RETENTION_BASELINE = '2026-11-04T09:25:42.340Z';
export const AA_RETAINED_COLLECTED_AT = '2026-11-04';
export const AA_RETAINED_EFFICIENCY_COLLECTED_AT = '2026-11-04T08:51:51.964Z';
export function aaRetirementRetentionAllowed(runStart, beforeGeneratedAt) {
  if (typeof runStart !== 'string' || !Number.isFinite(Date.parse(runStart))) return false;
  if (typeof beforeGeneratedAt !== 'string' || !Number.isFinite(Date.parse(beforeGeneratedAt))) return false;
  const day = new Date(runStart).toISOString().slice(0, 10);
  return day >= AA_RETENTION_FIRST_DAY && day <= AA_RETENTION_LAST_DAY
    && Date.parse(beforeGeneratedAt) >= Date.parse(AA_RETENTION_BASELINE)
    && Date.parse(beforeGeneratedAt) < Date.parse(runStart);
}
/** True only for the pinned 4 Nov AA snapshot pair. */
export const isAaRetainedSnapshot = (collectedAt, efficiencyCollectedAt) =>
  collectedAt === AA_RETAINED_COLLECTED_AT && efficiencyCollectedAt === AA_RETAINED_EFFICIENCY_COLLECTED_AT;
