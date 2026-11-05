// CR-693 (2026-11-05): Artificial Analysis retired its legacy /api/v2/data/* routes at 2026-11-04 23:59 UTC; they now
// answer 410 Gone (mail "Legacy Data API endpoints retire today", 4 Nov 18:01Z; https://artificialanalysis.ai/data-api/migrate-v2-data).
// The supported replacement for /api/v2/data/llms/models is /api/v2/language/models, which is Pro-only; our key is on the
// Free tier (403 "Language models list requires a Pro subscription", X-AA-Tier: free), and /api/v2/language/models/free
// excludes the full evaluation set, context window and other fields the published snapshot carries. Moving to either is a
// decision (a subscription, or withdrawing published per-benchmark AA values), not something a collector may infer.
//
// Until then a 410 from the retired route is not an ordinary failure: the collector stops before any write with the
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
