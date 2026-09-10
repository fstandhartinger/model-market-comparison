# Deployment & migration guide

This app is intentionally **portable**: it's a standard Next.js (App Router) Node service with one optional Postgres database. It runs anywhere that can run Node 20 + (optionally) Postgres — Render, Vercel, Azure, AWS, a plain VM, Docker, etc.

## Required secrets / environment variables

There is **exactly one runtime secret**, and even that is optional:

| Variable | Needed for | Required? | Notes |
|---|---|---|---|
| `DATABASE_URL` | Runtime DB-backed data | **Optional** | Postgres connection string. **If unset, the app serves the committed `data/dataset.json` snapshot** and runs fully without a database. SSL is auto-enabled for non-localhost hosts. |
| `ARTIFICIAL_ANALYSIS_API_KEY` | The data refresh (`npm run data:fetch`) only | Build/ops only | **Not used at runtime.** Only needed if you re-pull ArtificialAnalysis data. Header `x-api-key`. |
| `PORT` | Serving | Provided by host | `npm start` binds `next start -p ${PORT:-3000}`. |
| `NODE_VERSION` | Build | Recommended | Set to `20`. |
| `FORCE_SEED` | Re-seeding | Optional | `=1` forces `db:seed` to re-load even if the snapshot is unchanged. |

**No keys are required for the other data sources** — OpenRouter, DesignArena, AWS Bedrock (Price List API), Azure (Retail Prices API), Google Vertex, Nebius and Inceptron are all scraped from public/unauthenticated endpoints (see [data/SCRAPING.md](data/SCRAPING.md)).

So to host the app you need **nothing secret** for a snapshot-only deployment, and only `DATABASE_URL` to back it with Postgres. To refresh data you additionally need `ARTIFICIAL_ANALYSIS_API_KEY`.

## Build & run

```bash
npm install
npm run build
npm start            # serves on $PORT (default 3000)
```

## Database (optional)

The schema is created and seeded by `scripts/seed-db.mjs` from `data/dataset.json`:

```bash
export DATABASE_URL=postgres://user:pass@host/db
npm run db:seed       # creates tables + loads the snapshot (idempotent)
```

The app reads Postgres when `DATABASE_URL` is set and falls back to the bundled snapshot otherwise. On the former Render deployment `npm run db:seed` runs as the pre-deploy command, followed by `npm start`, so the new snapshot is loaded before traffic moves to the release.

## Refreshing the data

```bash
export ARTIFICIAL_ANALYSIS_API_KEY=aa_…
npm run data:refresh   # fetch live (AA + DesignArena + OpenRouter) → rebuild dataset.json
npm run db:seed        # (if using Postgres) reload it
```
Provider catalogs (AWS/Azure/Vertex/Nebius/Inceptron) remain curated — see [data/SCRAPING.md](data/SCRAPING.md). Collect AA Coding Agent v1.5 with `node scripts/fetch-aa-coding-agents.mjs`; v1.4 stays dated and separate for Composite. The daily wrapper and prompt are tracked in `ops/daily/` and installed at `/opt/mmc-daily/`.

## Current deployment (Sandy / Coolify)

Since 2026-08-26 the reference instance runs on Florian's private Sandy PaaS (Coolify on the Hetzner server) at
`https://model-market-comparison.app.mintapis.com`, built from this repo's `Dockerfile` in snapshot mode (no `DATABASE_URL`).
The Coolify health check is disabled because `node:20-slim` ships neither `curl` nor `wget`. A GitHub webhook is now active (verified from Coolify deployment history on 2026-09-08):
pushes to `main` auto-deploy. The daily refresh cron on the server (`/opt/mmc-daily/run.sh`,
Codex CLI, 05:17 UTC) pulls, refreshes the data and pushes. Its explicit redeploy helper
(`/opt/mmc-daily/redeploy.sh`) remains a fallback if the pushed snapshot does not become live;
do not queue a second build while a webhook deployment is already progressing.
The former Render instance (`model-market-comparison.onrender.com`) was suspended by Render on 2026-08-25 (free-tier usage exceeded).

## Alternative: Render Blueprint

`render.yaml` provisions a Node web service + managed Postgres:
- Build: `npm install && npm run build`
- Pre-deploy: `npm run db:seed`
- Start: `npm start`
- `DATABASE_URL` wired from the managed DB; `healthCheckPath: /api/health`.

## Hosting on Microsoft Azure

The same artifact maps cleanly onto Azure:
- **Azure App Service** (Linux, Node 20) or **Azure Container Apps** (build the included Dockerfile) for the web service.
- **Azure Database for PostgreSQL – Flexible Server** for `DATABASE_URL` (enable SSL; the client already sends `ssl: { rejectUnauthorized: false }` for non-localhost).
- App settings: `DATABASE_URL`, `NODE_VERSION=20`, optionally `ARTIFICIAL_ANALYSIS_API_KEY`.
- Run `npm run db:seed` once (or as a startup/release step) to load the snapshot.
- No other cloud services are required.

## Public read-only API

All `/api/*` routes are CORS-enabled read-only JSON (incl. `/api/dataset` for the full export). See [API.md](API.md). This means a deployment can also serve as a **public data API** for this dataset.

## Daily refresh recovery (2026-09-08)

The server cron is enabled at `17 5 * * *` (05:17 UTC; 07:17 Berlin during summer).
Its run on September 8 stopped at an AA metadata mismatch; see the source-fetch
fix in `lib/aa-metadata.mjs`. Before pulling a recovery commit, preserve any failed
run's uncommitted snapshots (`git stash push` or an external backup), then use
`git pull --ff-only`. Do not discard or force-push them. Build before testing:
`npm run data:build && npm run build && npm test`. Deploy only a passing revision.
The server prompt must include the production build because prerender tests inspect
`.next/prerender-manifest.json`. Logs and summary: `/opt/mmc-daily/cron.log`,
`/opt/mmc-daily/last-summary.txt`. Neither a healthy cron daemon nor a fresh
`generated_at` proves the update reached production: verify `/api/meta` source dates
and compare `/api/dataset` with the committed snapshot after deployment.
