# Data collection & refresh guide

The dataset is assembled from many sources. Three are live APIs fetched by
`scripts/fetch-live.mjs`; the rest are scraped / hand-collected snapshots kept in
`data/raw/` (most with a per-source `*.method.md` documenting exactly how to refresh them).
EU-provider research lives in `data/research/` (e.g. `llm-tracker-eu.md`).

Full rebuild:

```bash
npm run data:refresh   # fetch-live.mjs (OpenRouter + AA + DesignArena) then build-dataset.mjs
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

### ArtificialAnalysis — coding & intelligence benchmarks
- `GET https://artificialanalysis.ai/api/v2/data/llms/models` with header
  `x-api-key: $ARTIFICIAL_ANALYSIS_API_KEY`. Returns ~500 models with
  `evaluations.artificial_analysis_coding_index`, `…_intelligence_index`, and
  sub-benchmarks (livecodebench, scicode, terminalbench_hard, tau2, gpqa, mmlu_pro),
  plus `pricing` and speed. One entry per reasoning setting (e.g. `GPT-5.5 (high)`).

### DesignArena — Agentic Web Dev leaderboards
- `POST https://www.designarena.ai/api/leaderboard` (JSON body). We pull two boards:
  - Frontend: `{"arenaType":"agents","category":"agon_webapps","variationName":"public","inputModality":"text"}`
  - Full-Stack: `{"arenaType":"agents","category":"fullstack","variationName":"public"}`
  - Response: `data[].{modelId,elo,winRate,battles}`.

## Scraped / curated snapshots (manual — see each `*.method.md`)

| Source | Snapshot | How to refresh |
|---|---|---|
| AWS Bedrock (EU on-demand token prices) | `data/raw/aws-bedrock.json` | [aws-bedrock.method.md](raw/aws-bedrock.method.md) — AWS Price List Bulk API per region + pricing page for Claude |
| Azure AI Foundry (EU token prices) | `data/raw/azure-foundry.json` | [azure-foundry.method.md](raw/azure-foundry.method.md) — Azure Retail Prices API (`prices.azure.com`) |
| Google Vertex AI (Gemini + Model Garden partner models, EU) | `data/raw/google-vertex.json` | [google-vertex.method.md](raw/google-vertex.method.md) — Vertex pricing page (JS-rendered → agent-browser) |
| Nebius Token Factory (EU serverless catalog) | `data/raw/nebius.json` | [nebius.method.md](raw/nebius.method.md) — tokenfactory.nebius.com/models (JS SPA → agent-browser) |
| Inceptron (EU serverless catalog) | `data/raw/inceptron.json` | [inceptron.method.md](raw/inceptron.method.md) — public `api.inceptron.io/v1/models` + OpenRouter cross-check |
| Scaleway Generative APIs (FR-sovereign, EUR→USD) | `data/raw/scaleway.json` | scaleway.com/en/generative-apis/ pricing — prices are EUR, converted at the rate in `currency_note` |
| IONOS AI Model Hub (DE-sovereign, EUR→USD) | `data/raw/ionos.json` | cloud.ionos.de/managed/ai-model-hub pricing — prices are EUR, converted at the rate in `currency_note` |
| Mistral first-party API (FR, USD) | `data/raw/mistral.json` | mistral.ai/pricing — own open-weight models only |
| ArtificialAnalysis Coding Agent Index (model × harness; we take the per-model max) | `data/raw/aa-coding-agents.json` | reverse-engineered from the AA homepage RSC payload (`self.__next_f` `rows` array) |
| GitHub Copilot (premium-request multipliers, commercial June 2026+) | `data/raw/github-copilot.json` | [github-copilot.method.md](raw/github-copilot.method.md) — GitHub Copilot docs |
| Anthropic / Claude Code (Opus 4.6–4.8, Sonnet 4.6, Fable 5 list token price) | `data/raw/claude-code.json` | [claude-code.method.md](raw/claude-code.method.md) — Anthropic pricing page + `claude-api` skill |
| Provider metadata (eu_hosted / non_us / country / TEE notes) | `data/raw/provider-meta.json` | Hand-curated from `data/research/` |
| Manual supplements & benchmark overrides | `data/raw/manual.json` | Hand-edit; remove entries once upstream data is live (currently empty) |

When you refresh a snapshot, also bump its `collected_at` and re-run `npm run data:build`
(and `npm run db:seed` if a DB is attached). The build merges everything and recomputes
`data/dataset.json`. See [SCHEMA.md](SCHEMA.md) for the output shape and the
normalization rules that line up a model's benchmarks with its provider prices.
