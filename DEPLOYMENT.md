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

The app reads Postgres when `DATABASE_URL` is set and falls back to the bundled snapshot otherwise. On the reference Render deployment `npm run db:seed` runs as the pre-deploy command, followed by `npm start`, so the new snapshot is loaded before traffic moves to the release.

## Refreshing the data

```bash
export ARTIFICIAL_ANALYSIS_API_KEY=aa_…
npm run data:refresh   # fetch live (AA + DesignArena + OpenRouter) → rebuild dataset.json
npm run db:seed        # (if using Postgres) reload it
```
Provider catalogs (AWS/Azure/Vertex/Nebius/Inceptron) and the AA Coding Agent Index are scraped semi-manually — see [data/SCRAPING.md](data/SCRAPING.md).

## Reference deployment (Render)

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
