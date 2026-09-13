# Changelog

For downstream consumers (forks, apps syncing data from this repo or the live API):
the **data locations have not moved**. What changed recently is the hosting URL and
some app internals — details per release below.

## 2026-09-13 — Advanced comparison filter (H3)

Advanced mode now includes a folded **Better than a model** filter. Choose a reference
model and either a benchmark or category median; the table keeps only models above that
reference. Current measured values win. Retained bridge estimates can participate only when
they are explicitly marked approximate; missing and low-sample values remain unknown and
are excluded. This is a UI-only change: no dataset paths, benchmark rows, or public API
contracts changed.

## 2026-09-12 — Provider data policy, grouped settings, self-explaining table

**New data file for downstream consumers: `data/raw/openrouter-data-policy.json`.**
A daily snapshot of OpenRouter's published provider table, reduced to the two facets that
site exposes as filters: `does_not_train` and `zero_retention`. Each entry also carries the
derived `private` verdict (both true), the provider's headquarters, and any `override`.
Every parse is cross-checked against the counts OpenRouter prints for its own filters and
the collector fails rather than publishing a table it cannot reconcile. Collect it with
`npm run data:policy`.

- `dataset.json` additions (all optional, nothing removed or renamed):
  - offers gain `or_provider_slug` and `data_private`. `data_private` is **tri-state** —
    `true`/`false` mean OpenRouter publishes a verdict; **absent means unknown**, which is
    not the same as `false` and must not be rendered as "trains on your data".
  - `providers[]` gain `data_private` (worst known verdict across that channel's routes).
  - `sources.openrouter_data_policy` records when the snapshot was taken.
- **Chutes is an explicit, recorded override**: OpenRouter miscategorises it, so it is
  treated as satisfying both guarantees. The reason ships inside the snapshot itself.
- New UI filter "Trains or keeps your data" (off by default → such providers are excluded
  from every figure). Providers OpenRouter does not list are kept and labelled unknown.
- Fixed I/O blend gains **20:1 (the new default)** and **30:1**. The previous default of 20
  was not a selectable blend, so the stored value was rejected on load; the settings key
  moved to `mmc.settings.v7` to discard those payloads.
- `defaultMinFor("composite")` is now **85**, matching the shipped default, so "reset" no
  longer widened the list it was restoring.
- Overview table: sorts by score descending by default, the header shows the active score
  name, `#benchmarks` now counts distinct benchmarks with a result (previously it showed
  the 0–5 composite slot coverage), and `#benchmarks` is sortable.
- `/about` is restructured into anchored sections — `#adjusted-cost`, `#score`,
  `#data-policy`, `#identity` — and is where the long cost paragraph now lives.

## 2026-09-12 — Benchmaxxing tab: cross-benchmark estimates (~1 day after phase 11)

- New public tab `/benchmaxxing` ("Benchmaxxing") with navigation entry and read-only API
  `GET /api/benchmaxxing?model=<id>` / `?axis=<axisId>`. It estimates results on exact
  benchmark versions where a catalog model has **no result of any kind**, from an ordinary
  least-squares fit across catalog models measured on **both exact versions** (native units,
  roughly 95% prediction intervals; published only when the pair shares at least 12 measured
  catalog models and |Pearson r| ≥ 0.5; measured results only, low-sample and unmatched
  identities excluded).
- Every estimate is labelled **estimated · not a measurement**: it carries a roughly 95%
  prediction interval (residual noise × sample-size/leverage factor), the predictor value,
  `n` / `r` / `R²`, an extrapolation flag, and the observed cohort range for grounding.
  Versions and cohorts are never mixed or pooled, and estimates live only on this tab —
  they never enter rankings, radar charts or the Composite.
- The tab also adds carefully qualified **bottom-decile tags**: the worst decile of the
  measured catalog cohort on one exact benchmark version (at least 20 measured catalog
  peers, direction-adjusted, measured results only), with the model-level tag
  "Bottom decile on N axes" requiring at least 4 axes across at least 2 benchmark families.
  Missing benchmarks never count against a model; versions are never pooled; the tag is not
  a claim of overall worst.
- No raw benchmark path, score, ID, unit or Composite input changed; one additive UI tab,
  one additive read-only API, and targeted tests were added.

## 2026-09-12 — Phase 11: Real-SWE (Specific Labs) source

- Added the Real-SWE coding-agent board (`https://realswe.withspecific.com/`, canonical
  `https://withspecific.com/benchmarks/real-swe`) as a hash-bound, network-free source.
  The date identifies the snapshot: `realswe::snapshot-2026-09-12` (unit **percent**,
  higher-better, category Coding) and a separate `realswe-cost::snapshot-2026-09-12`
  (unit **USD per rollout**, lower-better, category Efficiency) — the cost is never folded
  into the score. Eight model+harness configurations × 10 public tasks × 8 runs = **640**
  scored rollouts, the source's own cross-check and the collector's.
- Model and harness are scored together and stay separate in the product: every
  observation keeps `subject.harness`, the presentation adapter groups one axis per
  benchmark+harness cohort, and two harnesses of the same model can never merge into one
  value. All rows carry `model_id: null` because the source publishes no catalog identity;
  they surface as unmatched source identities until a human mapping exists.
- Observations carry the native unit, basis `measured` (Specific Labs is the independent
  evaluator, not the vendor), a 95 % `confidence_interval`, and full source provenance.
  Cost rows carry a USD unit plus a `cost_provenance` block that flags the two
  lower-bound configurations (incomplete usage: Grok 4.6 and Kimi K3). Task-level pass
  counts (bestanden/8 per model) and the failure taxonomy (PASS 172,
  MISSED_REQUIREMENT 190, UNVERIFIED_ASSUMPTION 118, INTEGRATION_ERROR 136, REGRESSION 18,
  WRONG_FILE 6) are retained under `benchmark_results.details`, not as invented scores.
- The public sample limit is explicit, not hidden: `details.publication_scope` records
  10 published tasks / 8 runs / 8 configurations / 640 rollouts, and the UI prints
  "Public sample" on the axis. Only the 10-task sample is public; the values are never
  described as "all tasks".
- Collector `scripts/collect-realswe.mjs`, parser `lib/realswe.mjs` and tests
  `test/realswe.test.mjs` reproduce the snapshot from the stored bytes with no network
  access; `ingestion-lock.json` pins the page and chunk SHA-256, and the parser refuses
  drifted bytes. The `not_comparable` historical rows now carry a machine-readable
  `cause`/`cause_value` (`insufficient_bridges` / `spread_too_wide`) so the UI can explain
  why no estimate is published.
- No evidence file, score, ID, unit or API path was removed; the change is additive.
  Regression tests assert Real-SWE leaves the Composite slots and the AA v1.4/v1.5 Coding
  entries untouched.

## 2026-09-12 — Phase 10: historical retention and bridge comparison

### 2026-09-13 history extension

- Retained states now also include the six headline boards that live on model rows rather
  than in the registry: AA Intelligence/Coding, Epoch general/software ECI and both
  DesignArena Elo boards. They use stable history-only IDs and retain upstream source
  identities, raw snapshot hashes and locators without changing the 75-benchmark coverage
  denominator.
- Historical bridge projections now expose multi-hop `hops`, `path` and
  `chain_iqr_relative` fields through `/api/benchmark-view`; the direct hop remains preferred
  and every intermediate hop is subject to the same uncertainty gate.

- Every accepted score snapshot is now projected to an immutable, write-once dated state
  under `data/raw/benchmarks/history/states/<state_id>.json` with `index.json` as the
  ordered index; the id is `<yyyymmdd>-<content_sha256[0..8]>`, so identical observations
  dedupe and a re-run is a no-op. The daily refresh appends the state after the accepted
  scores write; `dataset.json` carries only state metadata.
- A model whose value vanished from the current board but exists in an older dated state
  or an older version of the same family receives a **labelled estimate** (`method:
  bridge-median-ratio`), never a measurement: median over ≥ 3 bridge configurations,
  with min/q1/q3/max spread, IQR relative to the median and the bridge count. Fewer than
  three bridges or an IQR above 25 % of the median yields `not_comparable` with
  `value: null`. Elo boards shift ranks (`bridge-rank-shift`), derived/composite indices
  are `recompute_required`, and a version change cites `source_benchmark_id` or
  `source_state_id`. `not_comparable` rows now expose `cause` (`insufficient_bridges` /
  `spread_too_wide`) and the concrete `cause_value`.
- `lib/benchmark-history.mjs`, `scripts/build-benchmark-history.mjs`,
  `test/benchmark-history.test.mjs` and `data/SCHEMA.md` document and test the policy;
  the UI/API attach estimates to their axis (`axis.estimates`) and never merge them into
  measured scores. No schema path, ID or unit was removed.

## 2026-09-11 — Phase 09: completion audit and published skills

- Owner verification pass over the live product: `benchmarkheaven.com` (and `www`) and the
  compatibility host both resolve and serve the current dataset; `/api/health`, `/api/meta`
  and all shipped routes return 200; branding and build date are current on both hosts.
  Health reports `{"ok":true,"db":false}` — no `DATABASE_URL` is configured and the product
  serves the committed static dataset, so `db:false` is expected here.
- Published the project's operational skills canonically under `ops/skills/` and installed
  them on the Sandy build server for Claude Code, Codex and opencode. Added two skills:
  `maintain-benchmarkheaven-registry` and `run-benchmarkheaven-gauntlet`; the existing
  collection/worker skills are copied unchanged except for phase-09 description-trigger
  edits to `collect-openrouter-efficiency` and `collect-chutes-io-ratio`. Installation
  receipt with SHA-256 hashes:
  `ops/rebuild-2026-09/evidence/phase-09/skills-install.json`.
- Added `ops/rebuild-2026-09/EXPLAINER-VIDEO-BRIEF.md` (source-backed narrative and
  screenshot plan) and produced the narrated German explainer video from it on Sandy
  (6 beats, 49 s, 1920×1080 H.264/AAC, 2.93 MB, retained at
  `ops/rebuild-2026-09/evidence/phase-09/benchmarkheaven-de.mp4`). Delivered to Florian
  via `@cursor_noti_bot` `sendVideo`, with the German completion Telegram
  (`message_id 13546`).
- **Known gap:** Florian's WSL machine was unreachable from Sandy, so the skills are not
  installed there; documented in `COVERAGE.md` (W28) and the receipt.
- Re-verification (attempt 3): canonical checks re-run green (build 839/654/90/2801,
  178 tests, `tsc` exit 0) and all three hosts still 200. Added
  `bin/verify-skills-discovery.mjs`, which re-hashes every installed skill and records a
  real runtime-discovery test for opencode (Claude Code/Codex path-verified only);
  evidence in `evidence/phase-09/runtime-discovery.json`. Also added `run-phase.sh`/`tick.sh`
  self-healing so a clean `rc=0` run that leaves the status on `RUNNING` is marked `DONE`
  (previously it burned a retry). The WSL gap above is unchanged.

## 2026-09-11 — Daily automation

- Replaced the daily Codex prompt loop with staged collection, dynamic AA >=34
  OpenRouter worker selection and different-family source review.
- Added efficiency/cache, registry and public/vendor benchmark refresh checks;
  incomplete candidates preserve prior values and observation dates. Coding Agent
  v1.5 is current; the dated v1.4 Composite input remains unchanged.
- Runtime moved to `/opt/benchmarkheaven-daily/`; `/opt/mmc-daily/` remains a symlink
  and the 05:17 UTC schedule is unchanged. Public API and consumer data paths remain
  compatible. New audit files live under `data/raw/benchmarks/daily-evidence/` and
  `daily-checks.json`; expiring reviewed source withdrawals are recorded separately.
- No routine success notifications. Confirmed-send deduplication, weekly failure
  alerts, notable data events and subscription-only operator escalation.

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
  - Base URL: **`https://benchmarkheaven.com`** (compatibility: `https://model-market-comparison.app.mintapis.com`)
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
