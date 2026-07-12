# Model Market Comparison

Compare **open-source and frontier LLMs** by capability and price in one place.
Capability comes from [ArtificialAnalysis](https://artificialanalysis.ai) (Coding,
Coding Agent & Intelligence indices) and [DesignArena](https://www.designarena.ai)
(Agentic Web Dev Frontend & Full-Stack Elo). Prices are aggregated across **OpenRouter**
inference providers, **AWS Bedrock**, **Azure AI Foundry**, **Google Vertex AI**,
**Nebius**, **Inceptron**, **TensorX**, **Scaleway**, **IONOS**, **Mistral**, **Chutes**,
**OVHcloud**, **STACKIT**, **T-Systems LLM Hub**,
**GitHub Copilot**, and the **Anthropic / Claude Code** list price — normalized to
USD per 1M tokens.

> 📋 Product spec: [PRD.md](PRD.md) · 🗂️ Data schema: [data/SCHEMA.md](data/SCHEMA.md) ·
> 🔄 Data collection & refresh: [data/SCRAPING.md](data/SCRAPING.md) ·
> 🔌 Public API: [API.md](API.md) · 🚀 Deploy / migrate / env vars: [DEPLOYMENT.md](DEPLOYMENT.md)

## Features

- **Global filter bar** (applies across every interactive comparison and linked model
  detail, persisted): selectable **score**,
  min-score, **One variant for Reasoning models** (collapse GPT/Claude/GLM/Kimi to one),
  **Featured**, **Hide deprecated** (on by default), **Exclude Chinese providers**, **EU-hosted / approved equivalent only**, **Non-US provider only**,
  **TEE / confidential only**, **Hide GPT-5.5 / Opus 4.8**, **Hide Fable**, plus
  provider- and model-checklist filters.
- **Selectable scores**: **Composite** (five percentile slots with model-mean imputation, 0–100, default), ArtificialAnalysis
  **Coding Index**, **Coding Agent Index** (median across published harnesses for the exact model/effort variant), **Intelligence Index**,
  and DesignArena **Frontend** / **Full-Stack** Elo.
- **Overview** — fully sortable table with per-column filters, **Has benchmark evidence**
  for Composite (or **Has score** for a direct metric) / **Has provider**
  toggles, and Excel-style **data bars** on score & cost.
- **Compare** — pick two models (A/B) head-to-head; scores & cheapest price shown big with
  the winner highlighted, plus each model's cheapest providers side by side.
- **Cost vs Capability** — scatter: **x = cost** (cheapest 10:1 blended $/1M, axis inverted
  so cheaper is right), **y = capability**, circle = closed / square = open, with a
  **Pareto frontier** line of best-value models.
- **Charts** — capability leaderboard, cheapest-model ranking, open vs closed comparisons.
- **Model detail** — top-5 cheapest providers and all offers by platform within the
  active global filter scope, full benchmark breakdown, reasoning-variant comparison,
  current GitHub Copilot token/AI-Credit prices and legacy per-request cost.
- **Providers per Model** — searchable model picker → that model's providers ranked by price.
- **Provider explorer** — pick one provider → every model it offers; click a model to compare
  that provider's price against all others (ranked, with its price-rank in the field).
- **Gateways** — 35+ LLM gateways/routers/aggregators compared on EU routing capability,
  self-host/local, open-source license, HQ and pricing.
- **EU & Sovereign** — which providers are EU-hosted/sovereign and which SOTA models they
  actually serve (incl. TEE/confidentiality notes + a separate dedicated/BYOC-only list).
  Interactive EU filtering requires evidence on the exact model offer; provider-level
  dedicated/BYOC capability alone never turns a global route into an EU-hosted one. The
  only policy exceptions are Azure Direct Global DeepSeek V4 Pro and Kimi K2.7 Code:
  they qualify as company-approved equivalents without being relabeled as technically EU-resident.
- **Public read-only JSON API** (CORS-enabled) — `/api/dataset` (full export),
  `/api/models`, `/api/models/[id]`, `/api/providers`, `/api/meta`, `/api/health`. See [API.md](API.md).

Featured models include GPT-5.6 Sol/Terra/Luna, GPT-5.5 / GPT-5.4 (with Mini and
low/medium/high/xhigh settings), Claude Opus 4.8 / 4.7 / 4.6, Sonnet 4.6 / 5,
**Fable 5**, Kimi K2.5 / K2.6 /
K2.7-Coding, GLM 5.1 / 5.2, MiniMax M2.5 / M2.7 / M3, Xiaomi MiMo-V2.5-Pro and
DeepSeek V4 Pro.

## Stack

Next.js (App Router, TypeScript) · Recharts · PostgreSQL · deployed on Render.

The app reads from Postgres when `DATABASE_URL` is set (seeded from
`data/dataset.json`) and otherwise serves the committed snapshot, so it always
renders even without a database.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000  (uses bundled data/dataset.json)
```

### Refresh the data

```bash
export ARTIFICIAL_ANALYSIS_API_KEY=aa_…    # for the AA fetch
npm run data:refresh                        # fetch live APIs + rebuild dataset.json
# with a database:
export DATABASE_URL=postgres://…
npm run db:seed
```

See [data/SCRAPING.md](data/SCRAPING.md) for per-source details (incl. how to update
the manually scraped AWS / Azure / Copilot / Claude snapshots).

## Deploy / migrate

Full guide incl. **required env vars / secrets**, Postgres setup, Docker and **Azure**
hosting: [DEPLOYMENT.md](DEPLOYMENT.md). In short — the only runtime secret is the
optional `DATABASE_URL` (the app falls back to the bundled `data/dataset.json` snapshot
without it); `ARTIFICIAL_ANALYSIS_API_KEY` is needed only to refresh data, not at runtime.
A [`render.yaml`](render.yaml) Blueprint and a [`Dockerfile`](Dockerfile) are included.

## Methodology & caveats

10:1 blended cost = `(10·input + 1·output) / 11` per 1M tokens. EU residency is
audited per offer/model/region; an EU-capable provider does not make its US or global
routes EU-hosted. Separately, `eu_policy_equivalent` admits only Azure Direct Global
DeepSeek V4 Pro and Kimi K2.7 Code to the EU filter under this company&apos;s legal/business
classification; inference may occur outside the EU and the flag is not a technical residency
guarantee. The Composite uses five capability slots: AA Coding,
source-matched AA Coding Agent, AA Intelligence, DesignArena Frontend and DesignArena
Full-Stack. AA values are clamped to 0–100. A DesignArena board qualifies with at least
500 battles and its Elo is converted to the expected score against a fixed Elo 1000
opponent: `100 / (1 + 10^((1000 − Elo) / 400))`. Each observed slot is then converted
to its empirical percentile among the current catalog&apos;s unique observed values. Every
missing slot is assigned that model&apos;s mean percentile across its observed slots. The
result is therefore exactly the mean of its available percentiles, so missing slots cannot
move it; a model with no reliable observed slot receives the neutral fallback 50. Coverage
is tracked separately so this fallback is not mistaken for benchmark evidence when choosing
a family representative, applying **Has benchmark evidence**, or building capability charts and the
Pareto frontier. GitHub Copilot&apos;s
current token/AI-Credit rates and legacy annual-plan
request multipliers are kept separate from provider API offers.
Model identities are joined conservatively across sources; modes, releases, pricing tiers
and hosting routes remain separate unless a stable source id/repository proves equivalence.
When DesignArena publishes only a bare product identity and a family has exactly one
benchmark-bearing configuration, that family-scoped result contributes to the
family-representative composite with an explicit provenance note; ambiguous multi-effort
families stay separate.
Figures may still change upstream —
**verify before relying on them**. Not affiliated with any provider.
