# Changelog

For downstream consumers (forks, apps syncing data from this repo or the live API):
the **data locations have not moved**. What changed recently is the hosting URL and
some app internals — details per release below.

## Where to find the data (canonical, stable)

- **In the repo** (updated ~daily by an automated refresh commit to `main`):
  - `data/dataset.json` — the full built dataset (models, families, offers, scores, sources).
  - `data/raw/*.json` — per-source snapshots (ArtificialAnalysis, OpenRouter, DesignArena, per-provider catalogs, `manual.json` overrides).
  - `data/gateways.json` — gateway comparison data.
- **Live API** (same JSON shapes as the repo, CORS `*`; see [API.md](API.md)):
  - Base URL: **`https://model-market-comparison.app.mintapis.com`**
  - `GET /api/dataset` · `GET /api/models` · `GET /api/providers` · `GET /api/meta` · `GET /api/health`

## 2026-09-08

- **New featured models:** GPT-6 Astra, GLM-5.3 Flash, Muse Spark 1.3, Qwen3.8 Max 0902
  (`FEATURED_RE` in `scripts/build-dataset.mjs`).
- Provider catalogs refreshed, including the previously unfinished AWS/Azure/Vertex,
  Claude direct, Copilot and T-Systems checks. AA / DesignArena / OpenRouter /
  Coding-Agent snapshots refreshed. See [audit details](data/research/refresh-2026-09-08.md).
- `scripts/fetch-live.mjs`: the ArtificialAnalysis fetch now tolerates up to 3 API models
  whose leaderboard metadata hasn't rolled out yet (ships them with null metadata instead
  of aborting the refresh). Empty/broken feeds and larger mismatches still fail.
  `aa_metadata.available`, `aa_metadata.is_open_weights` and `aa_metadata.deprecated`
  expose missing metadata; existing top-level booleans stay compatible.
- Cron was active at 05:17 UTC daily; today's failed fetch was the blocker. Its server
  prompt now builds before testing, so production prerender checks use current output.
- **No DB/schema migration**: production serves bundled JSON without `DATABASE_URL`.
  Routes and repo file paths are unchanged. Check individual `sources` dates, not
  just `generated_at`. The daily cron refreshes the four live benchmark/router sources;
  manual provider catalogs retain separate audit dates.
- Copilot: 29 current token entries / 19 legacy multiplier entries. Claude direct:
  13 callable models; Opus 4.1 retired, Fable/Mythos 5.1 cache pricing captured,
  cancelled Sonnet 5 price increase removed.
- Azure Astra is documented but direct prices remain null until a named Retail meter
  is published. OpenRouter Azure prices remain separate. Qwen3.8 Max 0902 has prices
  but no exact benchmark yet; no score copied from bare Qwen3.8 Max.

## 2026-08-26

- **Hosting/base URL changed:** the reference deployment moved from Render
  (`model-market-comparison.onrender.com`, suspended 2026-08-25) to
  **`https://model-market-comparison.app.mintapis.com`** (Sandy/Coolify). All API routes
  and JSON shapes are unchanged — only the host is new. See [DEPLOYMENT.md](DEPLOYMENT.md).
- **Filters removed:** the "Hide GPT-5.5 / Opus 4.8" and "Hide Fable" global toggles are
  gone; `isHiddenModel` no longer exists in `lib/cost.ts`. Persisted settings key bumped
  `mmc.settings.v4` → **`mmc.settings.v5`**.
- Deep catalog audit (AWS Bedrock EU-Geo Claude prices corrected, FX refresh, delistings);
  featured-set regex hardened with `(?!-)` lookaheads; `scripts/top5.mjs` added
  (top-5-by-Composite snapshot used by the daily refresh notifier).

## Earlier

The daily data-refresh commits ("Refresh …") only touch `data/` (and occasionally test
pins) and never change API routes or file locations. For app-level history before this
file existed, see `git log`.
