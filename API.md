# Public API

All endpoints are **read-only**, return JSON, and are **CORS-enabled** (`Access-Control-Allow-Origin: *`), so they can be called from any site or tool — including directly from a browser.

Base URL (reference deployment): `https://model-market-comparison.onrender.com`

The data is served from Postgres when `DATABASE_URL` is configured, otherwise from the committed `data/dataset.json` snapshot — the API shape is identical either way.

## Endpoints

### `GET /api/dataset`
The **full dataset** in one response — the canonical machine-readable feed: every model (with benchmarks, scores, all provider offers), the provider directory, source collection dates and counts. Cached 5 min (`Cache-Control: public, max-age=300`).

```jsonc
{
  "generated_at": "2026-06-29T…",
  "counts": { "models": 704, "families": 575, "providers": 78, "offers": 1700 },
  "sources": { "artificialanalysis": "2026-06-29", "openrouter": "2026-06-29", … },
  "models": [ { "id": "glm-5.2::max", "family_key": "glm-5.2", "family_name": "GLM 5.2",
    "org": "Z.ai", "variant": "max", "open_weights": true, "featured": true,
    "benchmarks": { "aa_coding_index": 68.8, "aa_coding_agent_index": 57.7,
      "aa_intelligence_index": 51.1, "aa_livecodebench": …, "aa_scicode": … },
    "designarena": { "frontend": { "elo": 1283 }, "fullstack": { "elo": 1295 } },
    "offers": [ { "source": "Inceptron", "provider": "Inceptron", "platform": "Inceptron",
      "input_per_1m": 1.2, "output_per_1m": 4.2, "region": "eu", "unit": "per_1m_token",
      "eu_hosted": true, "non_us": true, "tee": false } ],
    "copilot": { "multiplier": …, "usd_per_request": … } } ],
  "providers": [ { "platform": "Nebius", "provider": "Nebius", "model_count": 24,
    "eu_hosted": true, "non_us": true, "country": "Netherlands" } ]
}
```

### `GET /api/models`
List of models with a single chosen score, the cheapest 10:1-blended cost, and the top-5 cheapest providers per model.

Query params:
- `score` — one of `composite` | `aa_coding_index` | `aa_coding_agent` | `aa_intelligence_index` | `designarena_frontend` | `designarena_fullstack` (default `aa_coding_index`).
- `featured=1` — only the curated featured set.
- `hasBenchmark=1` — only models with a benchmark value.

### `GET /api/models/{id}`
One model by `id` (e.g. `glm-5.2::max`) or by `family_key` (e.g. `glm-5.2`): full benchmarks, all token offers, sibling reasoning variants, and the top-5 cheapest providers.

### `GET /api/providers`
The provider/platform directory with per-provider model counts and the `eu_hosted` / `non_us` / `country` flags.

### `GET /api/meta`
Dataset `generated_at`, `counts`, per-source collection dates, and whether the data is served from `postgres` or the bundled snapshot.

### `GET /api/health`
`{ "ok": true, "db": true|false }` — liveness + whether a database is wired.

## Pricing / score conventions
- Token prices are **USD per 1M tokens**, input and output separately. GitHub Copilot is per **premium request** (shown separately).
- **10:1 blended cost** = `(10·input + 1·output) / 11`.
- Score scales: `composite` and the AA indices are 0–100; DesignArena values are Elo (~1000–1400). The **Coding Agent Index** is the *highest* score a model achieves across harnesses (Claude Code / Codex / Cursor CLI / …).
- `eu_hosted` is currently a **provider-level** flag (the provider serves from EU data centres); check the offer's `region` for the exact serving location.
