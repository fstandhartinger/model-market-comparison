# Public API

All endpoints are **read-only**, return JSON, and are **CORS-enabled** (`Access-Control-Allow-Origin: *`), so they can be called from any site or tool — including directly from a browser.

Base URL (reference deployment): `https://model-market-comparison.onrender.com`

The data is served from Postgres when `DATABASE_URL` is configured, otherwise from the committed `data/dataset.json` snapshot — the API shape is identical either way.

## Endpoints

### `GET /api/dataset`
The **full dataset** in one response — the canonical machine-readable feed: every model (with benchmarks, scores, all provider offers), the provider directory, source collection dates and counts. Cached 5 min (`Cache-Control: public, max-age=300`).

```jsonc
{
  "generated_at": "2026-07-12T…",
  "counts": { "models": 709, "families": 563, "providers": 78, "offers": 1683 },
  "sources": { "artificialanalysis": "2026-07-12", "openrouter": "2026-07-12", … },
  "models": [ { "id": "glm-5.2::max", "family_key": "glm-5.2", "family_name": "GLM 5.2",
    "org": "Z.ai", "variant": "max", "open_weights": true, "featured": true,
    "benchmarks": { "aa_coding_index": 68.8, "aa_coding_agent_index": 57.9,
      "aa_intelligence_index": 51.1, "aa_livecodebench": …, "aa_scicode": … },
    "designarena": { "frontend": { "elo": 1280 }, "fullstack": { "elo": 1297 } },
    "offers": [ { "source": "Inceptron", "provider": "Inceptron", "platform": "Inceptron",
      "input_per_1m": 0.95, "output_per_1m": 3.04, "region": "eu", "unit": "per_1m_token",
      "eu_hosted": true, "non_us": true, "tee": false } ],
    "copilot": null } ],
  "providers": [ { "platform": "Nebius", "provider": "Nebius", "model_count": 25,
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
- Token prices are **USD per 1M tokens**, input and output separately. Current GitHub Copilot usage is token-metered and converted to AI Credits at $0.01/credit; its `current` rates stay on the separate Copilot product axis. `multiplier` / `usd_per_request` apply only to eligible legacy annual Pro/Pro+ request billing.
- **10:1 blended cost** = `(10·input + 1·output) / 11`.
- Score scales: `composite` and the AA indices are 0–100; DesignArena values are Elo (~1000–1400). The **Coding Agent Index** is the highest score the exact model/reasoning-effort variant achieves across published harnesses (Claude Code / Codex / Cursor CLI / …); results are never copied to sibling variants.
- `composite` normalizes AA Coding, AA Coding Agent, AA Intelligence and a reliable DesignArena slot. Pairwise differences use only shared slots and are fitted into a least-squares rating graph; every edge retains the same four-slot denominator, so a missing slot contributes zero difference rather than amplifying the remaining scores. Pairs without shared evidence create no edge. A coverage-subset profile that is identical on all shared slots is hard-tied to its denser peer before fitting. DesignArena boards need at least 500 battles.
- Offer-level `eu_hosted` says that this specific model offer is served from an audited EU location. Provider-level `eu_hosted` only says the provider has at least some EU-hosted capacity; it must not be used by itself to infer residency for every offer.
