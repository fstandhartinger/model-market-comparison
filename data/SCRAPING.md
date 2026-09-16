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
| Scale Labs (SEAL) | live (part) / planned | `swe-bench-pro-public`, `swe-atlas-*` live. New boards: only the top rows are crawlable (`/api/` is robots-disallowed) and the terms on derivative use are unclear — needs a terms decision before collection |
| Vals AI | live | 9 `vals-index*` ids |
| LiveBench | live | `livebench`; category sub-scores are an optional deeper read of the same capture |
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
| MathArena | **live (2026-09-16)** | `matharena-arxivmath::2026-06`, `matharena-brokenarxiv::2026-06` (parser `matharena_table`); CC-BY-SA-4.0 data, attribute MathArena. **Planned:** further editions and families (ArXivLean, USAMO/IMO proofs, Project Euler) |
| ARC Prize | live | `arc-agi::1/2/3` |
| Humanity's Last Exam | live / planned | `hle` from the GitHub README; **planned:** HLE-Rolling once a stable public results location exists (none found on 15 Sep) |
| CritPt | live | `critpt` |
| SciCode | live | `scicode` |
| SimpleBench | live | `simple-bench` |
| LisanBench | planned | Static page, attribution OK |
| EQ-Bench | live | `eq-bench`, `eqbench-*`, `spiral-bench`, `buzzbench` |
| Giskard Phare | planned | Static page, attribution OK |
| Context Arena | planned | Open JSON API (GDM-MRCRv2 at 1M-token bins); no licence statement — attribution to Context Arena and GDM eval_hub |
| Google FACTS | planned | Kaggle-hosted suite (4 sub-benchmarks); terms unclear |
| Mercor APEX | not collected | Mercor's terms §4.2 prohibit copying, displaying or distributing the leaderboard without written permission |
| Andon Labs | live / planned | `vending-bench::2` live; **planned:** Blueprint-Bench v2, Drone-Bench |
| METR Time Horizons | planned | GitHub-hosted data; terms unclear |
| Terminal-Bench | live | `terminal-bench::4.0` (and AA's own runs as separate ids) |
| ProgramBench | planned | Static page, attribution OK |
| SlopCodeBench | planned | Static page, attribution OK |
| SWE-rebench | **live (2026-09-16)** | `swe-rebench::2026-05-15..2026-07-01` (parser `swe_rebench_window`) — one identity per task window (a window is a different task set). The 7.8 MB page is not committed: `scripts/extract-swe-rebench-window.py` keeps only the pinned window (its items, problems and the rendered row markers) plus the page's sha256. Manual snapshot; the next default window becomes a new identity in a reviewed change. Agent products ("External system") are not ingested; the source's potential-contamination marker stays per row. CC BY 4.0 task data, attribute SWE-rebench (Nebius) |
| SWE-bench | live | `swe-bench-verified`, `-multilingual`, `-multimodal` |
| LiveCodeBench | planned | Primary `performances_generation.json` is row-level and date-filterable (AA's copy stays withheld until its window is known) |
| GSO | **live (2026-09-16)** | `gso::opt1-102` (parser `gso_leaderboard`, daily) — the page's own `assets/leaderboard.json`, Opt@1 rows only (Opt@10 is another protocol); 102-task guard; hack-adjusted score and run date in the protocol (the page's changelog changes the protocol from 2026-04-27 and 2026-07-12). MIT, attribute GSO |
| Berkeley Function Calling Leaderboard | planned (low) | `data_overall.csv`, Apache-2.0. Checked 2026-09-16: 109 rows, newest models from late 2025 (Claude Opus 4.5, GPT-5.2, Gemini 3 Pro Preview) and dated checkpoint labels — little overlap with the current catalog; revisit when the board adds 2026 models |
| τ-bench (Sierra) | live | `tau2-bench`, `tau3-banking`, `tau3-voice`; **τ^τ-bench `hyper-tau-bench::release-v1` live (2026-09-16)** (parser `hyper_tau_submissions`, daily): manifest.json + one submission.json per harness x Developer model from the MIT repository; board version and the exact submission list are the guard, and each overall must equal the 53-task weighted mean of its domain scores |
| OSWorld 2.0 | **live (2026-09-16)** | `osworld-2::v2026.06.24` and `osworld-2::v2026.08.08` — one identity per task release (parser `osworld2_results`), Apache-2.0 project |
| WebArena-x | planned (low) | Four sub-benchmarks on static pages, attribution OK |
| DeepResearch Bench | planned | CSV downloads from a public HF Space |
| CodeClash | planned (low) | MIT, static page; results dated Nov 2025 |
| Inspect Evals | not collected | A runnable evaluation library with no published results; running evaluations ourselves is out of scope |
| Harbor Hub | not collected | Rows load through an internal Next.js server action (no public API); its benchmarks are ones we already collect |
| EvalEval Evaluation Cards | not collected (values) | Republishes 52 upstream sources we mostly collect directly, 4.5 months stale; monthly provenance cross-check only |
