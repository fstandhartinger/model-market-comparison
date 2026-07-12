# Data collection & refresh guide

The dataset is assembled from many sources. Three are live APIs fetched by
`scripts/fetch-live.mjs`; the rest are scraped / hand-collected snapshots kept in
`data/raw/` (most with a per-source `*.method.md` documenting exactly how to refresh them).
EU-provider research lives in `data/research/` (e.g. `llm-tracker-eu.md`).

Full rebuild:

```bash
npm run data:refresh   # fetch-live.mjs (OpenRouter + AA + Intelligence.ai/DesignArena) then build-dataset.mjs
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
- `POST https://intelligence.ai/api/leaderboard` (JSON body). We pull two distinct boards:
  - Frontend: `{"arenaType":"agents","category":"agon_webapps","variationName":"public","inputModality":"text"}`
  - Full-Stack: `{"arenaType":"agents","category":"fullstack","variationName":"public"}`
  - Response: `data[].{modelId,elo,winRate,battles}`.
- `GET https://intelligence.ai/api/registry` supplies source-owned display names and open-weight metadata for opaque/revisioned leaderboard ids. A refresh fails closed if any board id is missing from the registry.
- Board results are product/family scoped, not effort scoped. The build attaches each result exactly once to the deterministic active family representative used by collapsed views and records that limitation in `designarena_attachment_note`.

## Scraped / curated snapshots (manual — see each `*.method.md`)

| Source | Snapshot | How to refresh |
|---|---|---|
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
| ArtificialAnalysis Coding Agent Index (model/effort × harness; source-matched median) | `data/raw/aa-coding-agents.json` | parsed from the AA homepage RSC payload (`self.__next_f` `rows` array); every harness row is retained, explicit efforts remain separate, and bare identities join only through audited source mappings |
| Chutes (live models, token prices and TEE flags) | `data/raw/chutes.json` | [chutes.method.md](raw/chutes.method.md) — first-party models endpoint plus per-chute `current_estimated_price` verification |
| GitHub Copilot (current AI-Credit token catalog + legacy request multipliers) | `data/raw/github-copilot.json` | [github-copilot.method.md](raw/github-copilot.method.md) — GitHub supported-model, pricing and billing docs; the two billing systems remain separate |
| Anthropic / Claude Code (all callable first-party models + Enterprise terms) | `data/raw/claude-code.json` | [claude-code.method.md](raw/claude-code.method.md) — official pricing, model lifecycle, retention and Enterprise billing docs |
| Provider metadata (eu_hosted / non_us / country / TEE notes) | `data/raw/provider-meta.json` | Hand-curated from `data/research/` |
| Manual supplements & benchmark overrides | `data/raw/manual.json` | Hand-edit; remove entries once upstream data is live (currently empty) |

When you refresh a snapshot, also bump its `collected_at` and re-run `npm run data:build`
(and `npm run db:seed` if a DB is attached). The build merges everything and recomputes
`data/dataset.json`. See [SCHEMA.md](SCHEMA.md) for the output shape and the
normalization rules that line up a model's benchmarks with its provider prices.
