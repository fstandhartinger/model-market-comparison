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
  "counts": { "models": 758, "families": 600, "providers": 85, "offers": 2368 },
  "sources": { "artificialanalysis": "2026-07-12", "openrouter": "2026-07-12", … },
  "models": [ { "id": "glm-5.2::max", "family_key": "glm-5.2", "family_name": "GLM 5.2",
    "org": "Z.ai", "variant": "max", "open_weights": true, "featured": true,
    "benchmarks": { "aa_coding_index": 68.8, "aa_coding_agent_index": 57.9,
      "aa_intelligence_index": 51.1, "aa_livecodebench": …, "aa_scicode": … },
    "designarena": { "frontend": { "elo": 1276, "battles": 4923 },
      "fullstack": { "elo": 1296, "battles": 1848 } },
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
Every row also includes `composite_base` (the pre-projection mean-imputed value) and
`composite_coverage` from 0 to 5 so clients can distinguish the neutral Composite fallback
50 at 0/5 from a measured score.

Query params:
- `score` — one of `composite` | `aa_coding_index` | `aa_coding_agent` | `aa_intelligence_index` | `designarena_frontend` | `designarena_fullstack` (default `aa_coding_index`).
- `featured=1` — only the curated featured set.
- `hasBenchmark=1` — only models with source benchmark evidence. This excludes
  zero-evidence rows even though their `composite` fallback is the neutral 50.

### `GET /api/models/{id}`
One model by `id` (e.g. `glm-5.2::max`) or by `family_key` (e.g. `glm-5.2`): full benchmarks, all token offers, sibling reasoning variants, and the top-5 cheapest providers.

### `GET /api/providers`
The provider/platform directory with per-provider model counts and the `eu_hosted` / `non_us` / `country` flags.

### `GET /api/meta`
Dataset `generated_at`, `counts`, per-source collection dates, and whether the data is served from `postgres` or the bundled snapshot.

### `GET /api/health`
`{ "ok": true, "db": true|false }` — liveness + whether a database is wired.

## Pricing / score conventions
- Token prices are **USD per 1M tokens**, input and output separately. EUR-native snapshots retain the original EUR fields and store the audited ECB conversion rate/date used for USD normalization. An active catalog row may have `null` prices when the provider publishes no per-model rate. Context tiers, OpenRouter endpoint tiers, and managed routes such as Azure Direct versus Fireworks remain separate offers. Current GitHub Copilot usage is token-metered and converted to AI Credits at $0.01/credit; its `current` rates stay on the separate Copilot product axis. `multiplier` / `usd_per_request` apply only to eligible legacy annual Pro/Pro+ request billing.
- **10:1 blended cost** = `(10·input + 1·output) / 11`.
- Score scales: `composite` and the AA indices are 0–100; raw DesignArena score keys return Elo (~1000–1400). The **Coding Agent Index** is the median across all published harnesses for the exact model/reasoning-effort variant (Claude Code / Codex / Cursor CLI / …); every harness result is retained and results are never copied to sibling variants.
- `composite` uses five slots: AA Coding, source-matched AA Coding Agent, AA Intelligence, DesignArena Frontend and DesignArena Full-Stack. AA values are clamped to 0–100. Each DesignArena board needs at least 200 battles and is converted from Elo to its expected score against a fixed Elo 1000 opponent: `100 / (1 + 10^((1000 − Elo) / 400))`. Each observed slot is percentile-normalized over the current catalog's unique observed values. Every missing slot is assigned that model's mean observed percentile, making `composite_base` exactly the arithmetic mean of its available percentiles. With no reliable observed slot the fallback is 50; this fallback is not treated as benchmark evidence for family-representative selection. The returned `composite` adds a deterministic least-squares projection: if a model covers all reliable slots of another measured model and is no worse in each, the final scores preserve that dominance with a 0.1-point margin. `composite_base` exposes the pre-projection value. Family-scoped Intelligence.ai results attach exactly once to the deterministic collapsed-view representative and are labeled with `designarena_attachment_note`.
- Offer-level `eu_hosted` says that this specific model offer is served from an audited EU location. `eu_policy_equivalent` is a separate company-specific classification that makes an offer eligible for the product&apos;s EU filter without asserting technical EU residency; it is currently set only on Azure Direct Global DeepSeek V4 Pro and Kimi K2.7 Code, whose inference may occur outside the EU. Provider-level `eu_hosted` only says the provider has at least some EU-hosted capacity; it must not be used by itself to infer residency for every offer.
