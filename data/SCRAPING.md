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
| Epoch AI ECI (general + software engineering) | `data/raw/epoch-eci.json` | `node scripts/fetch-epoch-eci.mjs` — official CSV exports plus the official benchmark catalog; general scores are copied, software ECI is refit with Epoch's public sigmoid least-squares method and a minimum of two qualifying benchmarks |
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
