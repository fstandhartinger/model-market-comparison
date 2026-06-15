# Model Market Comparison

Compare **open-source and frontier LLMs** by capability and price in one place.
Capability comes from [ArtificialAnalysis](https://artificialanalysis.ai) (Coding &
Intelligence indices) and [DesignArena](https://www.designarena.ai) (Agentic Web Dev
Frontend & Full-Stack Elo). Prices are aggregated across **OpenRouter** inference
providers, **AWS Bedrock**, **Azure AI Foundry**, **GitHub Copilot**, and the
**Anthropic / Claude Code** list price — normalized to USD per 1M tokens.

> 📋 Product spec: [PRD.md](PRD.md) · 🗂️ Data schema: [data/SCHEMA.md](data/SCHEMA.md) ·
> 🔄 How the data is collected & refreshed: [data/SCRAPING.md](data/SCRAPING.md)

## Features

- **Overview** — sortable model table with a **selectable score** (AA Coding, AA
  Intelligence, DesignArena Frontend/Full-Stack), cheapest 10:1 blended cost, and
  top providers. Filter by featured / open-weights / org / search.
- **Cost vs Capability** — scatter plot: **x = cost** (cheapest 10:1 blended $/1M),
  **y = capability** (selected score), colored by vendor. Best value is upper-left.
- **Charts** — capability leaderboard, cheapest-model ranking, open-weights vs
  closed comparisons.
- **Model detail** — **top-5 cheapest providers**, all token offers grouped by
  platform, full benchmark breakdown, reasoning-variant comparison, and GitHub
  Copilot per-request cost.
- **Providers** — every provider/platform and how many model families it prices.
- **JSON API** — `/api/models`, `/api/models/[id]`, `/api/providers`, `/api/meta`, `/api/health`.

Featured models include GPT-5.5 / GPT-5.4 (with Mini and low/medium/high/xhigh
settings), Claude Opus 4.8 / 4.7 / 4.6, Sonnet 4.6, **Fable 5**, Kimi K2.5 / K2.6 /
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

## Deploy (Render)

This repo ships a [`render.yaml`](render.yaml) Blueprint that provisions a Node web
service plus a managed Postgres, runs `npm run db:seed` as the pre-deploy step, and
serves the app. Point Render at this repo as a Blueprint, or create the service +
database manually and set `DATABASE_URL`.

## Methodology & caveats

10:1 blended cost = `(10·input + 1·output) / 11` per 1M tokens. AWS/Azure prices
assume European regions where available. GitHub Copilot is priced per premium
request and shown separately. Model names are normalized heuristically across
sources; figures may be stale — **verify before relying on them**. Not affiliated
with any provider.
