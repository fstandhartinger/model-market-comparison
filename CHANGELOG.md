# Changelog

For downstream consumers (forks, apps syncing data from this repo or the live API):
the **data locations have not moved**. What changed recently is the hosting URL and
some app internals — details per release below.

## 2026-09-11 — New domain: Benchmark Heaven at benchmarkheaven.com

- **The product is renamed Benchmark Heaven** (formerly Model Market Comparison).
- **New primary base URL: `https://benchmarkheaven.com`.**
- **The previous base URL `https://model-market-comparison.app.mintapis.com` remains
  valid as a compatibility URL and serves the same endpoints and dataset.** No consumer
  migration is required; both hosts stay attached.
- **Nothing else moved:** the GitHub repo, repo file paths, JSON schema, model/offer/
  benchmark IDs, units, the Composite definition and settings storage keys are unchanged. Browser preferences are per origin, so
  saved filters/theme on the old hostname are not transferred to the new hostname.
- The fetch scripts' HTTP User-Agent now identifies the collector as Benchmark Heaven;
  the contacted GitHub project URL inside it is unchanged.
- New Observatory mark, favicon, touch icon, light/dark identity, serif display typography,
  social card, metadata, README header, and branded fork-sync/Telegram templates.
- Older entries below keep the previously correct hostnames as their historical record.

## 2026-09-10 — Phase 04: benchmark discovery

- Added a versioned benchmark registry with verified publication routes, scoring semantics,
  provenance and an exclusion ledger, including public and independent writing/RP boards.
- Retained AA's previously discarded benchmark fields as raw observations with a fail-closed
  extractor. Coding Agent Index v1.4 and v1.5 remain separate; the legacy date is unchanged.
- Dataset builds validate registry evidence. Public API scores and Composite inputs are unchanged.

## 2026-09-10 — Phase 03: effective task costs

- Comparisons default to modeled USD/task, combining exact-variant task tokens, usage I/O and exact-endpoint cache statistics, with every fallback explained.
- Raw list prices and six fixed I/O scenarios remain selectable; settings move to `mmc.settings.v6`.
- The explorer starts at cheapest adjusted cost and measured task-token data; minimum benchmark scores make the cost/capability question directly filterable.
- Every selected price has a keyboard/touch explainer; charts and averages expose their constituent prices.
- Retired a Sol override that mixed first-party list rates with OpenRouter cached rates. Raw API units and data paths remain unchanged. See [cost policy and five-model checks](docs/effective-cost.md).

## Where to find the data (canonical, stable)

- **In the repo** (updated ~daily by an automated refresh commit to `main`):
  - `data/dataset.json` — the full built dataset (models, families, offers, scores, sources).
  - `data/raw/*.json` — per-source snapshots (ArtificialAnalysis, OpenRouter, DesignArena, per-provider catalogs, `manual.json` overrides).
  - `data/gateways.json` — gateway comparison data.
- **Live API** (same JSON shapes as the repo, CORS `*`; see [API.md](API.md)):
  - Base URL: **`https://model-market-comparison.app.mintapis.com`**
  - `GET /api/dataset` · `GET /api/models` · `GET /api/providers` · `GET /api/meta` · `GET /api/health`

## 2026-09-10 — rebuild phase 02

- Add `models[].token_efficiency` with dated AA output-tokens-per-task/canonical benchmark counts and workload I/O evidence. Exact OpenRouter usage takes priority; the Chutes global fallback is explicitly assumed. AA ratios remain benchmark proxies.
- Add `efficiency.openrouter_endpoints[or_model_id][endpoint_tag]` with provider names, exact endpoint identities, cache-hit statistics, dated cache read/write prices and sparse-coverage statuses. Base provider labels never join endpoint telemetry.
- Add explicit coverage, unmatched AA rows, provenance and failed/uncollected-attempt records. Preserve all historical metadata field dates, existing prices, score meanings, URLs and file locations.
- Add three atomic collectors, parser/identity/failure tests and reusable collection skills. Daily refresh gains AA efficiency, one weekly OpenRouter ranking plus four model pages in rotation, and seven completed days of Chutes aggregate usage.
- Optional Postgres seeding adds `dataset_meta.extensions` to retain additive metadata; production continues to serve bundled JSON. See [API.md](API.md#phase-02-additions--token-and-caching-evidence-2026-09-10) for the full schema. Adjusted costs and UI follow in subsequent phases.

## 2026-09-10 — rebuild phase 01

- Repair AA metadata parsing for slug-based Flight records and retain historical identifiers/licensing with their original per-field source dates. Refresh AA, OpenRouter and DesignArena; restore all 68 v1.4 Coding Agent rows.
- AA changed the Coding Agent benchmark to v1.5. Collect it into `data/raw/aa-coding-agents-v1.5.json` with strict validation and atomic writes. Preserve the existing Composite and v1.4 collection date; explain the separation in `/about` and `source_status`.
- Track daily runner/prompt in `ops/daily/`; use the tested collector and subscription-only Codex auth. No data URLs or existing score fields moved.

## 2026-09-08

- **New featured models:** GPT-6 Astra, GLM-5.3 Flash, Muse Spark 1.3, Qwen3.8 Max 0902
  (`FEATURED_RE` in `scripts/build-dataset.mjs`).
- Provider catalogs refreshed, including the previously unfinished AWS/Azure/Vertex,
  Claude direct, Copilot and T-Systems checks. AA / DesignArena / OpenRouter /
  Coding-Agent snapshots refreshed. See [audit details](data/research/refresh-2026-09-08.md).
- `scripts/fetch-live.mjs`: the ArtificialAnalysis fetch now tolerates up to 3 API models
  whose leaderboard metadata hasn't rolled out yet (ships them with null metadata instead
  of aborting the refresh). Empty/broken feeds and larger mismatches still fail.
  `aa_metadata.available`, `aa_metadata.is_open_weights` and `aa_metadata.deprecated`
  expose missing metadata; existing top-level booleans stay compatible.
- Cron was active at 05:17 UTC daily; today's failed fetch was the blocker. Its server
  prompt now builds before testing, so production prerender checks use current output.
- **Auto-deploy verified:** GitHub pushes now trigger Coolify via webhook; older
  documentation saying pushes do not deploy was stale. Explicit redeploy is a fallback.
- **No DB/schema migration**: production serves bundled JSON without `DATABASE_URL`.
  Routes and repo file paths are unchanged. Check individual `sources` dates, not
  just `generated_at`. The daily cron refreshes the four live benchmark/router sources;
  manual provider catalogs retain separate audit dates.
- Copilot: 29 current token entries / 19 legacy multiplier entries. Claude direct:
  13 callable models; Opus 4.1 retired, Fable/Mythos 5.1 cache pricing captured,
  cancelled Sonnet 5 price increase removed.
- Azure Astra is documented but direct prices remain null until a named Retail meter
  is published. OpenRouter Azure prices remain separate. Qwen3.8 Max 0902 has prices
  but no exact benchmark yet; no score copied from bare Qwen3.8 Max.

## 2026-08-26

- **Hosting/base URL changed:** the reference deployment moved from Render
  (`model-market-comparison.onrender.com`, suspended 2026-08-25) to
  **`https://model-market-comparison.app.mintapis.com`** (Sandy/Coolify). All API routes
  and JSON shapes are unchanged — only the host is new. See [DEPLOYMENT.md](DEPLOYMENT.md).
- **Filters removed:** the "Hide GPT-5.5 / Opus 4.8" and "Hide Fable" global toggles are
  gone; `isHiddenModel` no longer exists in `lib/cost.ts`. Persisted settings key bumped
  `mmc.settings.v4` → **`mmc.settings.v5`**.
- Deep catalog audit (AWS Bedrock EU-Geo Claude prices corrected, FX refresh, delistings);
  featured-set regex hardened with `(?!-)` lookaheads; `scripts/top5.mjs` added
  (top-5-by-Composite snapshot used by the daily refresh notifier).

## Earlier

The daily data-refresh commits ("Refresh …") only touch `data/` (and occasionally test
pins) and never change API routes or file locations. For app-level history before this
file existed, see `git log`.

## 2026-09-11 — Phase 06 benchmark explorer

- Added `/benchmarks` rankings, a standalone `/radar`, and up to four exact configurations on `/compare`, with source scales, versioned evaluation groups, selectable axes and explicit sparse coverage.
- Added complete per-model benchmark sheets, conservative explainable profile signals, and protocol-compatible divergence displays.
- Revamped navigation, light/dark themes, keyboard focus and disclosures; retained adjusted-cost and provider comparisons. Coding Agent v1.4 and its September 9 Composite source remain unchanged; v1.5 is separately visible.
- Added the compact benchmark presentation endpoint and exact observation lookup; canonical source/dataset fields and paths remain compatible. No benchmark value was changed or invented.

- Phase 06 release follow-up: update Next.js to 15.5.25 and compatible PostCSS 8 resolution; clean npm audit reports no remaining findings. Benchmark data and Composite definitions are unchanged.
