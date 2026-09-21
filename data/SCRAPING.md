# Data collection & refresh guide

The dataset is assembled from many sources. Three are live APIs fetched by
`scripts/fetch-live.mjs`; the rest are scraped / hand-collected snapshots kept in
`data/raw/` (most with a per-source `*.method.md` documenting exactly how to refresh them).
EU-provider research lives in `data/research/` (e.g. `llm-tracker-eu.md`).

Full rebuild:

```bash
npm run data:refresh   # live sources + Epoch ECI, then build-dataset.mjs
# or step by step:
npm run data:fetch     # only the live APIs → data/raw/{openrouter,artificialanalysis,designarena}.json
npm run data:build     # merge all raw/*.json → data/dataset.json
npm run db:seed        # load data/dataset.json into Postgres (needs DATABASE_URL)
```

## Live APIs (automated — `scripts/fetch-live.mjs`)

### OpenRouter — providers & per-provider prices
- Catalog: `GET https://openrouter.ai/api/v1/models` (blended default price per model).
- Per-provider endpoints (used for "cheapest providers"):
  `GET https://openrouter.ai/api/v1/models/{author}/{slug}/endpoints` →
  `data.endpoints[].provider_name` + `pricing.{prompt,completion}` (USD **per token**;
  multiply by 1e6 for per-1M). Fetched for every catalog model with a concurrency cap.
- `:free` slugs are merged into the same model family as their paid slug (the free
  endpoint remains an offer). OpenRouter router/meta IDs (`openrouter/free`, `auto`,
  `fusion`, `bodybuilder`, `pareto-code`) and non-text Lyria music models are excluded.

### ArtificialAnalysis — coding & intelligence benchmarks
- `GET https://artificialanalysis.ai/api/v2/data/llms/models` with header
  `x-api-key: $ARTIFICIAL_ANALYSIS_API_KEY`. Returns ~500 models with
  `evaluations.artificial_analysis_coding_index`, `…_intelligence_index`, and
  sub-benchmarks (livecodebench, scicode, terminalbench_hard, tau2, gpqa, mmlu_pro),
  plus `pricing` and speed. One entry per reasoning setting (e.g. `GPT-5.5 (high)`).

### Intelligence.ai / DesignArena — Agentic Web Dev leaderboards
- `POST https://www.designarena.ai/api/leaderboard` (JSON body). We pull two distinct boards:
  - Frontend: `{"arenaType":"agents","category":"agon_webapps","variationName":"public","inputModality":"text"}`
  - Full-Stack: `{"arenaType":"agents","category":"fullstack","variationName":"public"}`
  - Response: `data[].{modelId,elo,winRate,battles}`.
- `GET https://www.designarena.ai/api/registry` supplies source-owned display names and open-weight metadata for opaque/revisioned leaderboard ids. A refresh fails closed if any board id is missing from the registry.
- Board results are product/family scoped, not effort scoped. The build attaches each result exactly once to the deterministic active family representative used by collapsed views and records that limitation in `designarena_attachment_note`.

## Scraped / curated snapshots (manual — see each `*.method.md`)

| Source | Snapshot | How to refresh |
|---|---|---|
| Epoch AI ECI (general + software engineering) | `data/raw/epoch-eci.json` | `node scripts/fetch-epoch-eci.mjs` — official CSV exports plus the official benchmark catalog; general scores are copied, software ECI is refit with Epoch's public sigmoid least-squares method and a minimum of two qualifying benchmarks. CC-BY; externally-sourced hub rows keep their original projects' licensing — per-benchmark provenance in `data/raw/epoch-hub-provenance.json` (`node scripts/build-epoch-provenance.mjs`) |
| AWS Bedrock (regional on-demand token prices) | `data/raw/aws-bedrock.json` | [aws-bedrock.method.md](raw/aws-bedrock.method.md) — AWS Price List Bulk API per region + model cards; EU and non-EU offers stay distinct |
| Azure AI Foundry (retail token meters + serving scope) | `data/raw/azure-foundry.json` | [azure-foundry.method.md](raw/azure-foundry.method.md) — Azure Retail Prices API plus model-card/partner-region checks; a billing region is not assumed to be the inference region; the two company-policy equivalents are stored separately from technical residency |
| Google Vertex AI (Gemini + Model Garden partner models) | `data/raw/google-vertex.json` | [google-vertex.method.md](raw/google-vertex.method.md) — Vertex pricing and model-location docs; `global` is never marked EU-hosted |
| Nebius Token Factory (mixed-region serverless catalog) | `data/raw/nebius.json` | [nebius.method.md](raw/nebius.method.md) — public models-info API; serving region is audited per model |
| Inceptron (EU serverless catalog) | `data/raw/inceptron.json` | [inceptron.method.md](raw/inceptron.method.md) — public `api.inceptron.io/v1/models` + OpenRouter cross-check |
| Scaleway Generative APIs (FR-sovereign, EUR→USD) | `data/raw/scaleway.json` | scaleway.com/en/generative-apis/ pricing — prices are EUR, converted at the rate in `currency_note` |
| IONOS AI Model Hub (DE-sovereign, EUR→USD) | `data/raw/ionos.json` | cloud.ionos.de/managed/ai-model-hub pricing — prices are EUR, converted at the rate in `currency_note` |
| Mistral first-party API (FR, USD) | `data/raw/mistral.json` | mistral.ai/pricing — own open-weight models only |
| TensorX (EU-sovereign, IE, USD) | `data/raw/tensorx.json` | tensorx.ai/models + /pricing — OpenAI-compatible per-token; serves GLM/Kimi/DeepSeek/MiniMax/Qwen/gpt-oss in-EU |
| OVHcloud AI Endpoints (FR, EUR→USD) | `data/raw/ovhcloud.json` | [ovhcloud.method.md](raw/ovhcloud.method.md) — official model/pricing catalog; original EUR rates and audited ECB conversion retained |
| STACKIT Model Serving (DE/EU) | `data/raw/stackit.json` | [stackit.method.md](raw/stackit.method.md) — official active-model catalog; rows remain explicitly unpriced where no public per-model rate exists |
| T-Systems LLM Hub (DE/EU) | `data/raw/t-systems-llm-hub.json` | [t-systems-llm-hub.method.md](raw/t-systems-llm-hub.method.md) — official catalog and context-tier prices; preview rows without public prices remain null |
| TrustedTokens (DE-sovereign, TNG; EUR→USD, B2B) | `data/raw/trustedtokens.json` | [trustedtokens.method.md](raw/trustedtokens.method.md) — `node scripts/fetch-trustedtokens-catalog.mjs`: the public `/api/service/models` payload the /models page itself loads + ECB rate; deprecated lifecycle kept |
| OpenRouter Benchmarks (own runs + relayed AA/DesignArena rows) | `data/raw/openrouter-benchmarks.json` | [openrouter-benchmarks.method.md](raw/openrouter-benchmarks.method.md) — `node scripts/fetch-openrouter-benchmarks.mjs`: documented public API (`/api/v1/benchmarks`, key from env, 2 req/day); **terms 2026-09-15:** no page licence; the payload's `meta.citation` is the required-attribution mechanism per source ("Required attribution when republishing this data"); display attribution "OpenRouter Benchmarks" → openrouter.ai/benchmarks; AA/DesignArena-relayed rows stay cross-check-only (primary sources stay primary); media benchmarks deliberately not ingested. **2026-09-16 (CR-34.2/34.3):** the own-run call adds `include_run_config=true`, so the search boards publish the reasoning effort their run used; the own-run rows are ingested as six versioned registry boards plus six `-cost` boards (measured `avg_cost_per_task`), hash-bound to `data/raw/benchmarks/ingestion-lock.json` — a newer capture becomes a new dated registry identity in a reviewed change, and the daily only reports the drift |
| ArtificialAnalysis Coding Agent Index (model/effort × harness; source-matched median) | `data/raw/aa-coding-agents.json` | retained v1.4 snapshot dated 2026-09-09 for the unchanged Composite; never replace with v1.5 or advance its historical date |
| Chutes (live models, token prices and TEE flags) | `data/raw/chutes.json` | [chutes.method.md](raw/chutes.method.md) — first-party models endpoint plus per-chute `current_estimated_price` verification |
| GitHub Copilot (current AI-Credit token catalog + legacy request multipliers) | `data/raw/github-copilot.json` | [github-copilot.method.md](raw/github-copilot.method.md) — GitHub supported-model, pricing and billing docs; the two billing systems remain separate |
| Anthropic / Claude Code (all callable first-party models + Enterprise terms) | `data/raw/claude-code.json` | [claude-code.method.md](raw/claude-code.method.md) — official pricing, model lifecycle, retention and Enterprise billing docs |
| Provider metadata (eu_hosted / non_us / country / TEE notes) | `data/raw/provider-meta.json` | Hand-curated from `data/research/` |
| Manual supplements & benchmark overrides | `data/raw/manual.json` | Hand-edit; remove entries once upstream data is live (currently empty) |

When you refresh a snapshot, also bump its `collected_at` and re-run `npm run data:build`
(and `npm run db:seed` if a DB is attached). The build merges everything and recomputes
`data/dataset.json`. See [SCHEMA.md](SCHEMA.md) for the output shape and the
normalization rules that line up a model's benchmarks with its provider prices.

## September 8, 2026 operations

The live DesignArena APIs use `www.designarena.ai`, not the former `intelligence.ai`
API host. The fetcher already uses the current host. AA publication lag tolerates
at most three API rows missing leaderboard metadata, retaining null provenance;
an empty leaderboard/API or more widespread mismatch still fails before writing.

The Sandy cron (`17 5 * * *`, UTC) is active. Its September 8 run failed on Muse
Spark 1.3's missing leaderboard metadata. The repaired fetcher and rebuilt dataset
are deployed by this refresh. Curated provider catalogs are re-audited separately;
this cron refreshes the four benchmark/router sources, not all manual provider files.
Run `npm run build` before `npm test` to refresh the production prerender manifest.
See [refresh audit](research/refresh-2026-09-08.md) for source checks and limitations.

## AA Coding Agent version change (2026-09-10)

Run `node scripts/fetch-aa-coding-agents.mjs`. It collects the full `benchmarkRows`
array from https://artificialanalysis.ai/agents/coding-agents, resolves Flight references,
and validates v1.5, exact identities, complete component coverage and score arithmetic
before atomically replacing `data/raw/aa-coding-agents-v1.5.json`. Network, parse, version
or count failures exit nonzero without overwriting the last good file. The minimum of
13 is the verified v1.5 baseline; future snapshots may grow but cannot silently shrink.

AA's [version history](https://artificialanalysis.ai/methodology/coding-agents-benchmarking)
confirms v1.5 uses DeepSWE v1.1, Terminal-Bench 4.0 and SWE-Atlas-QnA. Its 13 complete
rows are not a replacement for the 68-row v1.4 snapshot. New versioned views will ingest
v1.5 in phases 04–06. Homepage-first-array extraction is retired. The tracked cron
prompt is `ops/daily/prompt.md`; synchronize it to `/opt/mmc-daily/prompt.md` after changes.

AA metadata parsing now keys source records by slug (UUID fallback). Fields no longer
provided by the source retain previous values only for the same UUID and slug, with
original per-field provenance in `metadata.retained_fields`. Explicit current nulls
clear values; absent fields do not acquire a new observation date.

## Benchmark lifecycle and AA component identities (CR-65.14, 2026-09-18)

**One place says whether a board is still reported: `status` in `data/raw/benchmarks/registry.json`.**
`active` means the maintainer still publishes results for it; `retained` means it stopped and we keep the
values it published before, without claiming they are current. Nothing else in the repo carries that fact —
`lib/benchmark-matrix.mjs` reads it for the `Retired` row tag, and `ops/daily/refresh-benchmarks.mjs` puts it
into the protocol review packet (`protocolReviewRow`), so the reviewer compares our claim with the
maintainer's own protocol text on every refresh instead of inferring it from an omission.

`superseded_by` is read **independently** of `status`: a board can be superseded in one index and still be
actively reported elsewhere. Artificial Analysis' Terminal-Bench 2.1 is the worked example — "Superseded by
Terminal-Bench 4.0 in Intelligence Index v4.3 … It remains part of the Coding Index" — and AA scored six new
models on it in the 2026-09-18 capture. It is `active` with `superseded_by: aa-terminal-bench::4.0`.
Boards AA states it retired (AIME 2025, LiveCodeBench) or replaced going forward (τ²-Bench Telecom,
Terminal-Bench Hard) are `retained`.

**AA component identities do not get a new date per refresh.** Sixteen of the 27 AA registry entries carry a
`snapshot-2026-09-10` version, and `aa_field_map` allows exactly one entry per source field, so minting a
dated identity per refresh would supersede sixteen entries and re-key every stored row every day. An
unversioned AA component board therefore **keeps one identity across refreshes** and carries its dates on the
observations; the `snapshot-<date>` suffix means *first pinned on*, not *collected on*. A new identity is
minted only when the protocol review's `version_guard` sees the board itself change. Re-basable AA
composites are unaffected — they are collected through the headline path.

**A changed harness configuration is a new identity too, even when the old values do not move.** On
2026-09-21 AA rewrote its Terminal-Bench 4.0 implementation paragraph: the `mini-SWE-agent v2.4.6` pin and the
30-second per-command timeout were replaced by "the mini-swe-agent harness" and "Task timeouts and sandbox
resources follow the upstream task definitions"; the task set (66), pass@1 over 3 repeats, the 500-step cap and
the grading are unchanged, and all 149 previously published `terminalbenchV40` values are identical (16 models
added). Unchanged old values do not show that the added models ran under the old settings, so the field is split
by collection window like GDPval-AA v2 → v2.1: `aa-terminal-bench::4.0` reads snapshots up to 2026-09-10 and is
`retained`, `aa-terminal-bench::4.0-upstream-timeouts` reads snapshots from 2026-09-21. The version string keeps
`4.0` first so `versionRank` still ranks it as 4.0 (a date in it would rank it as an undated snapshot, below 2.1).

**Bounded attrition, not a full stop.** `assertAaBenchmarkContinuity` used to fail the whole AA arm on any
fall in any field's count, which is why the component boards stood still from 11 Sep 2026 on while the
headline indices moved. A fall up to `AA_COVERAGE_DROP` (5 % of the field's prior count, floor 3 results) is
ordinary attrition — AA deprecates individual models and results — and is recorded as `coverage_drops` in
the run report. A field emptied, a field that disappears, or a larger fall is a retirement (the way
τ³-Banking left Intelligence Index v4.3) and still fails closed for a manual source review. The bound is our
own policy, not a promise Artificial Analysis made.

The AA token-efficiency feed has a separate shrink guard because its rows are carried by model-page Flight payloads.
When a live page has fewer efficiency carriers than the retained snapshot, the collector fetches a second public AA
model page and accepts the smaller set only if the complete parsed rows match exactly. A disagreement or an
unconfirmed shrink remains failed closed. The confirmation is recorded in the run's source attempts and evidence;
the missing models are not silently retained as current measurements.

## Epoch ECI refresh details

The collector makes one request per official export at each run:
`eci_scores.csv` (published general ECI and confidence intervals),
`processed_data_for_eci.csv` (model/benchmark performance), `edi_scores.csv` (benchmark
difficulty and slope), and Epoch's public benchmark catalog module (the domain labels).
It normalizes only the benchmark join key (lowercase, punctuation removed), keeps source
rows for all published models, and attaches matched rows once to the deterministic family
representative in `dataset.json`. Unmatched source rows are retained in the raw snapshot
and listed in `build_diagnostics.epoch_eci_attachment`; no model score is guessed. Download
hashes and retrieval time are stored under `epoch-eci.json`.

The software value minimizes the same sigmoid residuals as Epoch's public explorer,
`performance = sigmoid(slope × (capability − difficulty))`, on `[-100, 300]`, using at
least two software-engineering benchmarks. ECI remains on Epoch's native scale in the
individual score view; the Composite percentile-normalizes it against the current catalog.

## Self-reported release documents (2026-09-16)

Vendor release documents (system cards, model cards, technical reports) are captured with
`scripts/capture-vendor-documents.py`, which follows the same access rules as the public-source
capture: robots.txt is honoured for `BenchmarkHeavenResearch/1.0`, one host at a time with the
crawl delay, bounded size and time, and a Cloudflare/captcha challenge stops that host instead of
being worked around. Documents behind a bot challenge or an HTTP 401 are recorded as not
retrievable and their numbers are not used.

HTML and Markdown documents are retained as their original bytes. For a release PDF (16–27 MB is
normal) the retained evidence is the `pdftotext -layout` text layer of exactly the captured bytes,
and the manifest records the original document's SHA-256 and byte length. Vendor PDF URLs are
content-addressed CDN paths, so a re-download can be checked against that digest.

Values are re-verified against those captures before they become candidates, and every candidate
still needs an independent critic approval; see
[versioned benchmark ingestion](../docs/benchmark-ingestion.md).

## Benchmark sources from CR-20260915n — one decision per source (CR-38.1, started 2026-09-16)

Florian listed ~55 benchmark sites and hubs on 15 Sep 2026. Each was audited for data access, robots.txt,
terms/licence, benchmarks and freshness in `/home/flori/jobs/bh-source-intake-20260915/` (`SOURCES.md`,
`collectors-plan.md`). This table is the standing decision per source. **Status:** `live` = a collector feeds
the dataset and the daily refresh; `planned` = a collector is justified and not built yet; `not collected` =
a recorded decision with its reason. Access rules for every collector: the bounded capture tool
(`scripts/capture-benchmark-sources.py`: robots.txt for `BenchmarkHeavenResearch/1.0`, crawl delay, size and
time bounds, a bot challenge or 403/429 stops the host), no authenticated or internal endpoints, and values
from the **primary evaluator** — an aggregator is used for discovery and cross-checks only (CR-38.4), so the
same result is never counted twice.

| Source | Status | Collector / registry ids, or reason |
| --- | --- | --- |
| Artificial Analysis | live | `fetch-live.mjs`, `fetch-aa-coding-agents.mjs`, 26 `aa-*` ids; no new AA-derived metrics while CR-35.3 holds |
| Epoch AI | live | `fetch-epoch-eci.mjs` (ECI, Software ECI), `otis-mock-aime`; from the Benchmarking Hub archive (manual snapshots, CC BY 4.0): DeepSWE, **FrontierMath Tiers 1–3 v2, FrontierMath Tier 4 v2, SimpleQA Verified (2026-09-16)** — never the FrontierMath problem pages robots.txt disallows |
| Lumina Bench | live (discovery feed, no values) | `scripts/fetch-lumina-ledger.mjs` → `data/raw/lumina-ledger.json`, daily (CR-37.2): the public ledger manifest; on a `sourceDataHash` change the definitions, results and sources tables, each checked against the manifest's sha256, columns and record count. Keeps one record per family (identity, result counts by the role of the cited host) and the diff — never a score. Reviewed host roles and per-family decisions: `data/lumina-feed-policy.json`; a family nobody has read goes to `lumina-ledger.pending-review.json` instead. robots.txt allows all; no data licence (its `/terms` calls itself a placeholder). 80 % of its non-estimated results cite BenchLM, so values always come from the primary evaluator. See `data/raw/lumina-ledger.method.md` |
| Scale Labs (SEAL) | live | `swe-bench-pro-public`, `swe-atlas-*` and **`mcp-atlas` (2026-09-21)** live — the whole board of each is served inside its own leaderboard page, so the robots-disallowed `/api/` is never requested. The 2026-09-15 note that "only the top rows are crawlable" and that a terms decision was outstanding is withdrawn: it was measured on MCP Atlas on 2026-09-21 and the page's own Next.js flight payload carries all 34 rows, and the access route, the robots policy and Scale's site terms are the same ones under which `swe-bench-pro-public` and the three `swe-atlas-*` boards have been published since 2026-09-10/15 — treating a fourth board from the same host differently was an inconsistency, not a decision. Scale publishes no data licence, so only scores with attribution are stored and nothing derivative of the site itself. **Remaining Scale boards** (DrugDiscoveryBench, HiL-Bench, RLI, the private SWE-Bench Pro set) are unread, not refused |
| Vals AI | live | 9 `vals-index*` ids |
| LiveBench | live | `livebench`; category sub-scores are an optional deeper read of the same capture. **2026-09-21:** the frontend bundle is no longer pinned by its hashed filename — livebench.ai rebuilt on 2026-09-17, `static/js/main.ac6b12ef.js` became a 404 and the board's daily refresh had been frozen for four days without anyone reading the receipt. It is discovered from the page's own script tag (`page_url` + `follow_module_script`, the route ApprenticeBench already used); `capture-benchmark-sources.py` now recognises the deferred `static/js/main.<hash>.js` form beside the Vite `/assets/<hash>.js` one and still requires exactly one match. The two Grok-3 override literals remain the guard on what the bundle says, and the registry excerpt is now a verbatim passage of it rather than a description |
| Stanford HELM | planned | Public JSON on Google Cloud Storage per release; terms unclear — attribution-only use to be confirmed |
| BenchmarkList | not collected | Every page including `sitemap.xml` serves a Cloudflare challenge; we do not work around bot protection |
| The Aggregate | not collected | `/data/*.json` is robots-disallowed for AI crawlers and no licence exists; aggregator |
| BenchLM | not collected | Aggregator; robots.txt disallows `/api/`; reached transitively through Lumina for discovery only |
| Vellum | not collected (values) | Aggregator: discovery and cross-check only (CR-38.4) |
| LLM Stats | not collected (values) | Aggregator: discovery and cross-check only (CR-38.4) |
| LM Council | not collected | Aggregator of dated snapshots from primaries we collect directly (Epoch AI, Scale, METR, SimpleBench) |
| CodeSOTA | not collected (values) | Aggregator (CC BY 4.0): discovery and cross-check only (CR-38.4); its ~7 genuinely new items go to their primary sources |
| Kaggle Benchmarks | planned | Undocumented JSON API, terms unclear; ParseBench, ITBench, Enterprise Ops, Game Arena |
| OpenCompass | planned (low) | One public POST per table; terms unclear |
| FlagEval | planned (low) | Much of the data sits behind an authenticated internal API; only the public slice qualifies |
| EuroEval | planned | Official CSV downloads, attribution OK |
| Arena (LMArena) | planned | CC BY 4.0 daily parquet dump (site terms forbid scraping; the dump is the permitted route); human preference, kept apart from task accuracy (CR-38.3) |
| Hugging Face Find a Leaderboard | not collected | Directory with no scores of its own; backing dataset gated, no licence |
| MathArena | **live (2026-09-16, editions 2026-06 + 2026-08)** | `matharena-arxivmath::2026-06`/`2026-08`, `matharena-brokenarxiv::2026-06`/`2026-08` (parser `matharena_table`); CC-BY-SA-4.0 data, attribute MathArena. **Planned:** further editions and families (ArXivLean, USAMO/IMO proofs, Project Euler) |
| ARC Prize | live | `arc-agi::1/2/3` |
| Humanity's Last Exam | live / planned | `hle` from the GitHub README; **planned:** HLE-Rolling once a stable public results location exists (none found on 15 Sep) |
| CritPt | live | `critpt` |
| SciCode | live | `scicode` |
| SimpleBench | live | `simple-bench` |
| LisanBench | **live (2026-09-16)** | `lisanbench::0.2.0` (parser `lisanbench_core`, daily) — the page's own `data/core.json` (Path Length = `sum_chain_avg`, the page's default ranking) with `data/rankings.json` as the cross-check (each score must equal the sum of its 50 per-word averages; the per-model trial count is read from the listed trials and kept in the protocol) and the repository README as the method source. Guards: 50 pinned starting words (sha256), pinned SCOWL 2026-02-25 dictionary, README score definition and 3-trial default. No robots.txt; no open-source licence — the README Usage Terms require crediting @scaling01 (Lisan al Gaib) on X and linking the repository, which the registry entry's maintainer and publication links carry wherever the board is shown. 154 rows, 52 exact joins (`parseLisanBenchId`); budgets (`:thinking-16k`), bare `:thinking` and `:free` routes are refused |
| EQ-Bench | live | `eq-bench`, `eqbench-*`, `spiral-bench`, `buzzbench` |
| Giskard Phare | planned | Static page, attribution OK |
| Context Arena | **live (2026-09-21)** | `context-arena-mrcr-v2::8-needle` (parser `context_arena_summary`, daily) — the board JSON the leaderboard app itself requests, `GET https://contextarena.ai/api/needle-summary?needles=8` (default "full" test set; `/api/available-needles` answers `{"mode":"full","needles":[8]}`): 184 `models[]` rows keyed by `model_slug` + `reasoning_mode`, each with per-bin `bin_metrics` (8k…1M power-of-two bins: `avg_score` 0–1, `n_tests`, `is_incomplete`) and `overall_metrics`. **Value:** `cum_avg_128k` × 100 — the unweighted mean of the 8k/16k/32k/64k/128k bin scores, i.e. the "upto_128K (cumulative)" figure GDM's MRCR v2 README says it reports; every scored row must reproduce it from its own five bins (tolerance 1e-9). Context Arena's own AUC @128k/@1M (trapezoid), `cum_avg_1m`, the per-bin scores/test counts, total runs, provider and latest run date stay in the protocol. Not scored: rows the site marks insufficient or unranked, rows whose bins up to 128k are incomplete (1 on 2026-09-21), contexts below 128k; a deprecated model keeps its measured row, flagged. `mode=lite` is a different, smaller test set (other values) and is never used. Guards: request params, the eight-bin layout, the reasoning-mode vocabulary, unique model × mode, and three README statements (task, 8-needle upto_128K reporting, the tools caveat). Method source: GDM's README (raw.githubusercontent.com/google-deepmind/eval_hub/master/eval_hub/mrcr_v2/README.md) — the site's own FAQ lives only in a hashed JS chunk. The site does not say whether tools were available (GDM asks every report to state it); the protocol says so. Joins: `vendor/slug@reasoning=mode`, `enabled` or no mode = no setting (lib/board-identity.mjs `parseContextArenaId`): 183 rows, 48 exact joins on 2026-09-21. robots.txt 404 (conventional access), no licence/terms page — scores with attribution only; attribute Context Arena (Dillon Uzar) and GDM eval_hub and link the leaderboard |
| Google FACTS | planned | Kaggle-hosted suite (4 sub-benchmarks); terms unclear |
| Mercor APEX | not collected | Mercor's terms §4.2 prohibit copying, displaying or distributing the leaderboard without written permission |
| Andon Labs | live / planned | `vending-bench::2` live; **`blueprint-bench::2` live (2026-09-21)** (parser `html_table`, daily) — the Blueprint-Bench 2 page's own server-rendered "Leaderboard" table (andonlabs.com/evals/blueprint-bench-2, the page's only `<table>`): rank, model, score on the page's 0–1 scale (connectivity-similarity composite, random baseline 0, perfect 1). The "Human*" baseline row (12 of 50 apartments) is skipped; a score printed `0.000**` is at or below the random baseline and keeps that marker in its protocol. Guards: header Model/Score, three cells per row, unique model names, and six page statements (task, 50 apartments in sequence, normalisation, Jaccard 50 % weight, both footnotes) via the opt-in `require_text`/`value_markers`/`unique_names` options of `html_table`. The table states no reasoning setting, so only single-default-configuration families join (`parseBlueprintBenchLabel`): 26 rows, 2 exact joins on 2026-09-21, the other 24 shown as named by the source. robots.txt: none (the path serves the HTML shell); no licence statement — scores with attribution to Andon Labs and a link. **Planned:** Drone-Bench |
| METR Time Horizons | planned | GitHub-hosted data; terms unclear |
| Terminal-Bench | live | `terminal-bench::4.0` (and AA's own runs as separate ids) |
| ProgramBench | **live (2026-09-21)** | `programbench::1` (parser `programbench_board`, daily) — the leaderboard's own `var results = [...]` board on programbench.com: 21 rows {model, provider, slug, score(fraction), cost, calls, tokens, date}, value = score × 100; the site's headline is the 200-instance macro-average of per-instance passed-test fractions (unattempted counts as 0; `src/programbench/submission.py`). Score unit percent; the board also publishes cost/calls/tokens per task and each row's date. Guards: page identity (ProgramBench; 200 tasks; mini-SWE-agent; the rebuild-from-binary statement; the update stamp), exactly one results literal, the exact ten-field row schema, unique model per row, scores descending and 0..1, and the registry README + scoring source still describing the same 200-instance macro-average of per-instance passed-test fractions. Provenance: the **authoritative submission registry** (github.com/ProgramBench/submissions, MIT — its README calls the repo the authoritative registry the leaderboard is compiled from); each row's `submission.yaml` + `_stats/score.json` receipt is pre-collected and sha256-pinned (`data/raw/benchmarks/daily-evidence/2026-09-20-programbench/`). The registry `_stats` recompute is provenance, **not a byte-exact guard** (the site's `.compile_skip` details for legacy rows predate the current `_stats` files; 2026-09-21 recompute reproduced the eight 2026-07/08 rows to ≤0.0005 and the five 2026-04/05 rows to ≤0.009). robots.txt of programbench.com: 404, conventional access; both repos MIT; attribute the ProgramBench team (Princeton & Meta) and link the leaderboard |
| MCP Atlas | **live (2026-09-21)** | `mcp-atlas::snapshot-2026-09-21` (parser `scale_swepro`, daily) — the leaderboard page's own Next.js flight payload (`entries[]`: model, score, rank, confidenceInterval_upper, createdAt, contaminationMessage, deprecated), the same rows the visible "Performance Comparison" table renders: 34 rows, 15 measured joins and 19 honest refusals. The value is the pass rate over all 1,000 tasks (500 public on Hugging Face, 500 held out); a task passes when an LLM judge scores the answer's claims against the published ground truth at ≥ 75 % coverage, so the row is task accuracy, not a judged rating. Cross-check at ingestion: the page's own coverage table lists 20 of these models with a "Pass Rate % (All 1000)" column and all 20 equal the board value exactly; its "Pass Rate % (Public 500)" column and the stale "83.6% Top Pass Rate" stat card (the board's top row is 88.1 %) are never ingested. Guards: page title, the metric and pass-threshold sentences, the 1,000-task / 36-server scope, the April 2026 re-scoring note, exactly one entries array, and a row the board marks deprecated is skipped. robots.txt allows /leaderboard/ (`/api/` disallowed and never requested). Attribute Scale AI and link the leaderboard |
| SlopCodeBench | planned | Static page, attribution OK |
| SWE-rebench | **live (2026-09-16)** | `swe-rebench::2026-05-15..2026-07-01` (parser `swe_rebench_window`) — one identity per task window (a window is a different task set). The 7.8 MB page is not committed: `scripts/extract-swe-rebench-window.py` keeps only the pinned window (its items, problems and the rendered row markers) plus the page's sha256. Manual snapshot; the next default window becomes a new identity in a reviewed change. Agent products ("External system") are not ingested; the source's potential-contamination marker stays per row. CC BY 4.0 task data, attribute SWE-rebench (Nebius) |
| SWE-bench | live | `swe-bench-verified`, `-multilingual`, `-multimodal` |
| LiveCodeBench | planned (low) | Primary `performances_generation.json` is row-level and date-filterable (AA's copy stays withheld until its window is known). **Checked 2026-09-21 (iteration 153):** the file (6.9 MB) holds 28 models (newest O4-Mini, DeepSeek-R1-0528, Qwen3-235B-A22B) and 29,540 per-problem rows whose newest problem date is 2025-04-07, so it is frozen. As with BFCL, there is little overlap with the current catalog; revisit if the board resumes |
| GSO | **live (2026-09-16)** | `gso::opt1-102` (parser `gso_leaderboard`, daily) — the page's own `assets/leaderboard.json`, Opt@1 rows only (Opt@10 is another protocol); 102-task guard; hack-adjusted score and run date in the protocol (the page's changelog changes the protocol from 2026-04-27 and 2026-07-12). MIT, attribute GSO |
| Berkeley Function Calling Leaderboard | planned (low) | `data_overall.csv`, Apache-2.0. Checked 2026-09-16: 109 rows, newest models from late 2025 (Claude Opus 4.5, GPT-5.2, Gemini 3 Pro Preview) and dated checkpoint labels — little overlap with the current catalog; revisit when the board adds 2026 models |
| τ-bench (Sierra) | live | `tau2-bench`, `tau3-banking`, `tau3-voice`; **τ^τ-bench `hyper-tau-bench::release-v1` live (2026-09-16)** (parser `hyper_tau_submissions`, daily): manifest.json + one submission.json per harness x Developer model from the MIT repository; board version and the exact submission list are the guard, and each overall must equal the 53-task weighted mean of its domain scores |
| OSWorld 2.0 | **live (2026-09-16)** | `osworld-2::v2026.06.24` and `osworld-2::v2026.08.08` — one identity per task release (parser `osworld2_results`), Apache-2.0 project |
| WebArena-x | planned (low) | Four sub-benchmarks on static pages, attribution OK |
| DeepResearch Bench | not collected (checked 2026-09-21, iteration 156) | `muset-ai/DeepResearch-Bench-Leaderboard` (Apache-2.0 HF Space; robots allows) publishes `data/leaderboard.csv` (46 rows) plus a GPT-5.5-judged board (`data_gpt55/`, 14 rows) and a small DRB-2 board. The rows are deep-research **products and scaffolds** (OpenAI Deep Research, Perplexity Research, Kimi-Researcher, `langchain-open-deep-research-gpt-5`, vendor agents) scored by an LLM judge — the same class SWE-rebench's "External system" rule keeps out. The only bare-model rows are 2025-era (`gemini-2.5-pro-preview-05-06`, `gpt-4o-search-preview`), so a collector would join nothing in the catalog; revisit if the board starts listing plain current models |
| CodeClash | planned (low) | MIT, static page; results dated Nov 2025 |
| Inspect Evals | not collected | A runnable evaluation library with no published results; running evaluations ourselves is out of scope |
| Harbor Hub | not collected | Rows load through an internal Next.js server action (no public API); its benchmarks are ones we already collect |
| EvalEval Evaluation Cards | not collected (values) | Republishes 52 upstream sources we mostly collect directly, 4.5 months stale; monthly provenance cross-check only |
| VulcanBench | **live (2026-09-18)** | `vulcanbench-frontier::4` (parser `vulcanbench_frontier_csv`, daily) — the board CSV `assets/data/swe-v4-board.csv` the leaderboard renders; guards: exact 18-column header, n=23 on every published row, the stated harness/effort enums and the frozen `code-quality-maintenance-v3` protocol family. A row the board judges on fewer than its 23 tasks (its own “§” footnote: the v3.7 protocol publishes no Code quality score for that task — 2026-09-21 GPT-5.6 Sol at max, 22 of 23) has a different denominator and is withheld, not compared; the board keeps refreshing. More than three such rows fails closed. Suite renamed Frontier v4 (formerly SWE v4); the retired v3 is a different scale and stays out. robots.txt explicitly welcomes crawlers and AI answer engines; task repos Apache-2.0 (v4-suite GitHub org). Attribute VulcanBench (Morgan Linton) |
| KernelBench-CUDA | **live (2026-09-18)** | one identity per problem: `kernelbench-cuda-glm52-fused-moe::rtx-pro-6000`, `-deepseek-nsa::rtx-pro-6000`, `-megaqwen-decode::rtx-pro-6000`, `-grid-mingru-sps::rtx-pro-6000` (parser `kernelbench_cuda_board`, daily) — the maintainer's own `benchmarks/cuda/results/leaderboard.json`; version = the hardware roofline the scores reference; guards: schema_version 1, the RTX PRO 6000 deck, and the site's own validity rule (correct and audited clean/interesting; flagged, suspect, bug and unaudited cells never score, cross-checked against the published ranked list). Scores are percent of roofline, unbounded (196.10% is a real published value). Rights: the maintainer's public repository, attribute Elliot Arledge (kernelbench.com) |
| FrontierSWE v2 | **live (2026-09-19)** | `frontierswe::2` (parser `frontierswe_v2_board`, daily) — rows from the leaderboard front page's own Next.js flight payload (`entries.abs.{best,mean,worst}`); the headline value is the site's mean@5 across the 34 tasks (5 trials per task, 20-hour budget, uniform proximus harness on the board). Epoch AI's FrontierSWE relay CSV (`frontierswe_external.csv`, Source = the site) restates 12 overlapping rows byte-exactly and is the site's effort evidence for the joins; uncovered rows (GPT-6 Astra and four others) state no setting and join nothing. Guards: page identity phrases, one tripartite view set with identical labels and best>=mean>=worst, the exact relay header and relay/site value agreement. robots.txt allows our identity (GPTBot/CCBot disallowed; /traces disallowed and never requested); open task repos (Proximal-Labs/frontier-swe-v2). Attribute the Proximal team; the relay is Epoch AI's |
| PostTrainBench | **live (2026-09-19)** | `posttrainbench::1.1` (parser `posttrainbench_js`, daily) — the site's `scores.js` (`window.SCORES_DATA`: per-cell values, the published 7-benchmark weights summing to 1, and the per-agent aggregated averages with run counts) as the board; `config.js` states each agent's display name, CLI scaffold and reasoning effort (the config value lands in every row's protocol and the join reads it live, so a site change can never be joined under a stale assumption). Baselines (official instruct models, base models, human) are references, never rows. Guards: exact 7 benchmark keys, 4 production base models per agent, 0<=values<=100 cells, integer run counts >=1, stated scaffold/effort vocab. robots.txt is absent (404→conventional access); the harness repo is MIT-licensed — attribute aisa-group (Ben Rank et al., arXiv 2603.08640, "Verified by Epoch AI" per the site's footer) |
| RSI-Exam | **live (2026-09-20)** | `rsi-exam::0.1` (parser `rsi_exam_leaderboard`, daily) — the leaderboard is server-rendered SVG between the page's own `<!-- LB:START -->` / `<!-- LB:END -->` markers: one panel per scope over the same task bank (Full 88, Public 35, Private 53), each row a model × agent-harness pair with its mean hidden-set normalised score. The Full panel is the identity; the two split panels are the same runs and stay in the protocol, never as their own score. The page's `effdata` JSON island adds mean spend, run time and output tokens and must state the same score for every model it covers. Guards: the release label `RSI-Exam 0.1`, the three scope counts, identical system sets and 1..n ranking per panel, the harness and effort vocabulary, the resource/board score agreement, and the write-up's own anchor sentences (Starter 0.00, frontier-calibrated SOTA anchor 0.60) plus the one-rollout rule. robots.txt is absent (404 → conventional access); repo and evaluation code are MIT (aiming-lab/RSI-Exam) — attribute the RSI-Exam Team (UNC) and link the leaderboard. Kimi K3 is left unjoined: the leaderboard label says `kimi cli · max` while the write-up's setup table says the effort was "Not specified", so no setting is stated (CR-83.1) |
| Toolathlon-Verified | **live (2026-09-20)** | `toolathlon-verified::2026-06-30` (parser `toolathlon_verified_board`, daily) — the page's own current-board table (`leaderboard-current-table`): one row per model with Pass@1 (mean over three runs; the ± figure is the across-run standard deviation), Pass@3, Pass^3, mean turns and tool calls, model type, agent configuration and evaluation date. **Only rows carrying the board's green check** (“independently evaluated by us”) are scored — a row submitted by someone else is never published here as a measurement. The archived pre-Verified board sits in a sibling `leaderboard-history-table` on the same page and is never parsed into this identity: the site itself says the two score series are not comparable (it is collected as its own identity, next row). Guards: release identity (“Toolathlon-Verified”, released June 30, 2026), 108 tasks / 32 MCP servers (604 tools) / 7 local toolkits (16 tools), both table classes present, the nine columns, the badge legend, the type and agent vocabulary, a board ranked by Pass@1, and the release post's own statements (108-task scope preserved, Pass@1 as the mean over three runs, what the check means, separate score series). robots.txt allows /docs/ (only /cdn-cgi/ and /_next/ are disallowed) and the site's Content-Signal header allows ai-input — attribute HKUST NLP and link the leaderboard. Observed source inconsistency: the “Best Pass@1 Score” stat card reads 76.2 % while the board's top row is 78.4 %, so the stat card is never ingested (CR-30.2) |
| Toolathlon (original release, archived board) | **live (2026-09-21)** | `toolathlon::pre-verified` (same parser `toolathlon_verified_board` with `board: "history"`, daily from the same page capture) — the maintainers' own "Previous Toolathlon leaderboard" accordion, a frozen snapshot of the board immediately before the Verified release (51 models, newest row 19 May 2026). Its own retained identity, `superseded_by` Toolathlon-Verified and never ranked against it (the site: earlier task definitions and infrastructure, not directly comparable). Only badged rows (36 of 51) are scored; rows sourced from vendor announcements are skipped before the cell guard (one, GPT-5.4-xhigh, lacks its Pass@1 `data-label`). The page's footnotes are recorded per row, not dropped: † (Claude Opus rows evaluated once, not a run mean) and ‡ (OpenAI rows re-run through the Responses API). The one Claude Agent SDK row is a vendor scaffold, not the Default agent, and is left out by a reviewed `skip_agents`; any other agent fails closed. Labels are hyphenated names with a trailing effort word (`parseToolathlonArchiveLabel`); 13 exact joins, 23 refusals. Lumina family `toolathlon` → in_registry |
