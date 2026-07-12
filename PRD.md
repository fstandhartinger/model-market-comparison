# PRD — Model Market Comparison

## 1. Problem & goal

Pricing for LLMs is scattered across inference marketplaces (OpenRouter), the
hyperscalers (AWS Bedrock, Azure AI Foundry), IDE bundles (GitHub Copilot), and
first-party APIs (Anthropic / Claude Code). Capability lives in yet other places
(ArtificialAnalysis, DesignArena). Nobody can answer "which model gives me the most
capability per dollar, and who is the cheapest place to run it?" in one view.

**Goal:** a single web app that, for open-source and frontier LLMs, shows capability
(benchmark scores) next to price (across every provider), and ranks models by value.

## 2. Users & key questions

- *"For coding, what's the best model I can afford?"* → sort by AA Coding Index, read cost.
- *"I picked model X — who runs it cheapest?"* → top-5 cheapest providers per model.
- *"Open weights vs the closed frontier — how big is the price/quality gap?"* → charts.
- *"How expensive is this model inside GitHub Copilot or AWS Bedrock specifically?"* → model detail.

## 3. Data sources (see `data/SCRAPING.md`)

| Source | What it provides | Access |
|---|---|---|
| OpenRouter | Model catalog + per-provider token prices | Live API |
| ArtificialAnalysis | Coding, Coding Agent and Intelligence indices, sub-benchmarks | Live API + public leaderboard payload |
| DesignArena | Agentic Web Dev Frontend & Full-Stack Elo | Live API (POST) |
| AWS Bedrock | On-demand token prices, EU regions | Price List API + page |
| Azure AI Foundry | Token prices and per-model serving scope | Retail Prices API + model docs |
| Google Vertex AI | Gemini and Model Garden partner-model prices/locations | Pricing + location docs |
| Direct APIs | Nebius, Inceptron, TensorX, Scaleway, IONOS, Mistral, Chutes | Catalog/pricing APIs and docs |
| GitHub Copilot | Current AI-Credit token catalog + legacy Pro/Pro+ request multipliers | Billing/model docs |
| Anthropic / Claude Code | All currently callable API models, promotions and Enterprise terms | Official pricing/lifecycle docs |

## 4. Functional requirements

1. **Model overview** — table of models with a **selectable score** (AA Coding,
   missing-neutral Composite, AA Coding, AA Coding Agent, AA Intelligence,
   DesignArena Frontend, DesignArena Full-Stack), the cheapest
   10:1 blended cost, and the top providers. Filter by featured / open-weights /
   org / search; sort by score, cost, name, org.
2. **Cheapest providers per model** — model detail lists the **top-5 cheapest
   providers** (10:1 blended) plus all token offers grouped by platform.
3. **Cost vs Capability scatter** — x = cost (cheapest 10:1 blended $/1M), y =
   selected capability score; colored by org; log-cost toggle; click → detail.
   *Best value = upper-left.*
4. **Charts** — capability leaderboard, cheapest-model ranking, open-vs-closed
   comparisons (avg capability and avg cost).
5. **Providers** — every provider/platform and how many model families it prices.
6. **Featured models** (brief): GPT-5.6 Sol/Terra/Luna, GPT-5.5 / GPT-5.4 (+ Mini,
   reasoning settings), Opus 4.8/4.7/4.6, Sonnet 4.6/5, Fable 5, Kimi K2.5/K2.6/K2.7-Coding, GLM 5.1/5.2,
   MiniMax M2.5/M2.7/M3, MiMo-V2.5-Pro, DeepSeek V4 Pro.
7. **Backend + DB** — Postgres is the source of truth (seeded from `dataset.json`);
   the app falls back to the bundled snapshot when no DB is configured. JSON API at
   `/api/models`, `/api/models/[id]`, `/api/providers`, `/api/meta`, `/api/health`.

## 5. Non-goals

- Real-time per-request billing or usage metering.
- Estimating a user's actual Copilot request token count or included-credit burn (published unit rates are shown on their own axis).
- Authentication — the data is public; the app is read-only.

## 6. Pricing methodology

- All token prices normalized to **USD per 1M tokens**, input and output separately.
- **10:1 blended cost** = `(10·input + 1·output) / 11`, approximating a read-heavy
  workload (the brief's "10:1 input/output token mix"). The cost axis uses each
  model's cheapest such offer across all providers.
- EU residency is determined per model offer and serving location. Provider capability,
  resource/billing region, or a global endpoint is not sufficient evidence of EU hosting.
- The Composite normalizes four capability slots and fits pairwise shared-slot
  differences into a least-squares rating graph with a fixed four-slot denominator.
  Pairs without shared evidence create no edge; a missing slot contributes zero
  difference and therefore cannot amplify the remaining scores. Coverage-subset
  profiles that are identical on all shared slots are hard-tied before fitting.
  DesignArena boards require at least 500 battles.
- Current GitHub Copilot billing uses published model token rates converted to AI
  Credits at $0.01/credit. The old `multiplier × $0.04` request calculation is shown
  separately and labeled legacy annual Pro/Pro+ only; neither is mixed into API-provider cost rankings.

## 7. Architecture

Next.js (App Router, TypeScript) single service on Render + managed Postgres.
Data pipeline: `fetch-live.mjs` → `build-dataset.mjs` → `dataset.json` →
`seed-db.mjs` → Postgres. Charts via Recharts. See `README.md` and `data/SCHEMA.md`.

## 8. Caveats

Figures can go stale and naming is normalized heuristically across sources; the app
is informational and not affiliated with any provider. GLM 5.2 and other just-released
models may carry estimated or pending pricing (flagged in the UI and `data/raw/manual.json`).
