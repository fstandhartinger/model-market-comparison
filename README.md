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
  **Featured**, **Exclude Chinese providers**, **EU-hosted only**, **Non-US provider only**,
  **TEE / confidential only**, **Hide GPT-5.5 / Opus 4.8**, **Hide Fable**, plus
  provider- and model-checklist filters.
- **Selectable scores**: **Composite** (five fixed missing-neutral slots, 0–100, default), ArtificialAnalysis
  **Coding Index**, **Coding Agent Index** (median across published harnesses for the exact model/effort variant), **Intelligence Index**,
  and DesignArena **Frontend** / **Full-Stack** Elo.
- **Overview** — fully sortable table with per-column filters, **Has score** / **Has provider**
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
  dedicated/BYOC capability alone never turns a global route into an EU-hosted one.
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
routes EU-hosted. The Composite averages five equally weighted, fixed slots: AA Coding,
exact-variant AA Coding Agent, AA Intelligence, DesignArena Frontend and DesignArena
Full-Stack. AA values are clamped to 0–100. A DesignArena board qualifies with at least
500 battles and its Elo is converted to the expected score against a fixed Elo 1000
opponent: `100 / (1 + 10^((1000 − Elo) / 400))`. Each missing slot contributes the
neutral value 50 and the denominator always remains five; a model with no observed
slot has no Composite. A coverage-safe dominance adjustment may raise a leader to at
least 0.1 above a model whose every observed slot it covers and matches or exceeds
(with one strict improvement); it never lowers the covered model. GitHub Copilot&apos;s
current token/AI-Credit rates and legacy annual-plan
request multipliers are kept separate from provider API offers.
Model identities are joined conservatively across sources; modes, releases, pricing tiers
and hosting routes remain separate unless a stable source id/repository proves equivalence.
Figures may still change upstream —
**verify before relying on them**. Not affiliated with any provider.
