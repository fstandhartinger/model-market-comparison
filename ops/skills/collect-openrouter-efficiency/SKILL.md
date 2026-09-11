---
name: collect-openrouter-efficiency
description: Collect OpenRouter per-model workload I/O ratios and exact-endpoint cache-hit statistics and prices using public Flight payloads and the frontend effective-pricing API. Use when OpenRouter per-model I/O ratios, endpoint cache-hit rates, or cache read/write prices need to be refreshed or checked against a primary payload.
---

# Collect OpenRouter workload and caching evidence

From the Benchmark Heaven repository run `node scripts/fetch-openrouter-efficiency.mjs`.
Default: one weekly ranking plus four model pages, oldest attempted first. Each page
adds one cache-statistics request. Initial targeted batches use
`--models=moonshotai/kimi-k3,openai/gpt-5.6-sol` (maximum twelve), optionally
`--evidence-dir=.phase02-work/or/collected`. Do not crawl every model daily.
Read robots first: https://openrouter.ai/robots.txt currently permits all except
`/seo/`. Use the project User-Agent, 2-second page spacing and 1.5 seconds before
cache requests. Stop on 403/429; do not retry controls. No key or login is needed.

## Exact sources and fields

1. `https://openrouter.ai/<exact-or-model-id>` (e.g. `/moonshotai/kimi-k3`).
   Parse embedded `self.__next_f.push` Flight JSON with `lib/aa-rsc.mjs`, never eval.
   React Query keys:
   - `["model-page","providerTableEndpointStats",{permaslug,variant,...}]`:
     `state.data[]` contains `id` (endpoint UUID), `model_variant_slug` (exact API ID),
     `model_variant_permaslug`, `variant`, `provider_name`, `provider_slug`
     (EXACT routing tag), `pricing.input_cache_read`, `pricing.input_cache_write`.
   - `["model-page","appStats",{permaslug,variant}]`:
     `state.data.model_chart[]` has `date`, `model_permaslug`, `variant`,
     `variant_permaslug`, `total_prompt_tokens`, `total_completion_tokens`, `count`.
     Sum prompt/output separately over the previous seven completed UTC days.
     Exclude today. Incomplete days mean no page-derived ratio.
     `top_apps_chart` is a selected-app subset; never substitute it for `model_chart`.
2. `https://openrouter.ai/rankings?view=week`.
   Query `["rankings","models",{view:"week"}]`, `state.data[]`: twenty weekly model
   aggregates with the same prompt/completion fields. Join `variant_permaslug`
   EXACTLY to catalog `canonical_slug`; preserve `:free`. Each row's `date` is its
   last activity bucket and can precede yesterday. The Kimi weekly totals were
   independently equal to September 3–9 page totals in the September 10 capture.
   No cached-token metric from rankings is ingested (its zero is not a cache rate).
3. **Endpoint cache-hit source:**
   `https://openrouter.ai/api/frontend/v1/stats/effective-pricing?permaslug=<URL-encoded-permaslug>&variant=standard&shape=v7`
   Parameters come from the exact model-page query. JSON envelope `data` contains
   `providerSummaries[]`: `endpointId`, `providerName`, `providerSlug`,
   `cacheHitRate` (fraction 0..1), `totalTokens`. It also contains
   `endpointProviderSlugs`, `inputChartData`, `outputChartData`.
   Join `endpointId` to the page endpoint `id`, THEN store under
   `(model_variant_slug, provider_slug)`. Here the page `provider_slug` is the
   routing tag; the cache API `providerSlug` is a BASE provider slug and loses
   suffixes. Fireworks, Fireworks US and Fireworks Fast demonstrate why it is
   unsafe as the join key. Preserve source display names alongside canonical names.

The cache API route/schema were found in the public page JS bundle
`https://openrouter.ai/_next/static/immutable/chunks/0x-zpsoajr_sg.js` on 2026-09-10
(`effectivePricingSummaryOptions`, Zod schema `providerSummaries`). The adjacent
`32-asinua3xkd.js` labels `cacheHitRate` as “Cache hit rate”. Chunk filenames change:
use the page's own script URLs for future rediscovery, not guessed route variants.
The old `/api/frontend/stats/endpoint` and `/api/frontend/models/find` URLs in recon
are SPA-shell dead ends. The working route includes `/v1/`.

## Parsing and provenance

```js
import { parseOpenRouterPage, parseOpenRouterCache } from './lib/openrouter-efficiency.mjs';
const page = parseOpenRouterPage(html, {
  or_model_id: 'moonshotai/kimi-k3', start_date: '2026-09-03', end_date: '2026-09-09'
});
const cache = parseOpenRouterCache(cacheJson, page.endpoints);
// cache.joined[] has exact endpoint_tag and provider; cache.unjoined[] stays unassigned.
```

Page cache prices are decimal USD/token strings, multiplied by 1e6. Missing is
null, not free and not proof of lack of support. Existing offer/registry prices
come from the dated `/api/v1/models/<id>/endpoints` catalog. Raw page prices are
also saved. Rates are measured OpenRouter telemetry; converted prices are derived
from self-reported prices. Ratios are derived from measured usage. Preserve URL,
collection timestamp, source window, response SHA-256 and every failed attempt.
Applying a per-SKU workload to AA effort variants does not make it effort-specific.
Only if empirical OR usage is unavailable, use the documented Chutes global
fallback as assumed. AA canonical ratios remain benchmark proxies/cross-checks.

The cache response omits the underlying numerator/denominator and exact summary
interval. Preserve `summary_window: null`; chart dates describe only the chart,
not a proven summary window. Never derive a rate from latency or uptime. A model's
aggregate cache share must not be copied onto its endpoints.

## Completeness and failures

Require HTTP 200, full parseable JSON/Flight data, successful named queries, exact
model identities, unique endpoint UUIDs, valid nonnegative finite prices and
safe-integer counters, unique daily identities and all requested page dates.
The weekly ranking parser expects at least the verified twenty rows; smaller
payloads require source review. Endpoints may lack cache summaries. Multiple
UUIDs may even share a routing tag: keep raw UUID observations but publish no
pair-level rate/price for an ambiguous tag. Validate cache rates in [0,1], unique
summary UUIDs and the response's UUID-to-base-slug map. Unknown UUIDs stay unjoined.
None of these checks proves upstream telemetry is exhaustive; report coverage.

HTTP/parse failures preserve prior snapshots. Partial page failures are recorded.
Cache-only failures retain prior rates only for identical UUID/tag/provider and
keep their original dates. Do not relabel retained observations as newly fetched.
Workload observations older than 30 days fall back; old cache rates are flagged
stale. The pipeline writes data/raw/openrouter-efficiency.json atomically.

Run `node --test test/openrouter-efficiency.test.mjs test/efficiency.test.mjs`.
Compare parser output with saved primary bodies; verify all non-null cache rates
against summary UUIDs and exact page tags, and reconcile weekly/page token sums.
Skills are staged here for phase-09 installation across the Sandy runtimes; the WSL
machine remains a documented gap (see skills-install receipt).
