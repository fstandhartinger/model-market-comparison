# Public API

All endpoints are **read-only**, return JSON, and are **CORS-enabled** (`Access-Control-Allow-Origin: *`), so they can be called from any site or tool — including directly from a browser.

Base URL (reference deployment): `https://model-market-comparison.app.mintapis.com`

The data is served from Postgres when `DATABASE_URL` is configured, otherwise from the committed `data/dataset.json` snapshot — the API shape is identical either way.

## Endpoints

### `GET /api/benchmarks`

All exact versioned registry entries, source/metric definitions, collection status and
per-benchmark coverage. No family-only version aliases are accepted.

### `GET /api/benchmark-scores`

Filters: `benchmark_id`, `model_id`, `basis` (`measured`, `self_reported`, `derived`),
`offset` (default 0), `limit` (default 100, maximum 500). Returns observations, total,
stored divergences, coverage and collection status. Both identity filters also return
the sparse cell status. Unknown exact versions/models return 404; bad parameters 400.
Derived observations include `source_basis` and formula/inputs. Every score includes
its source URL, dates, immutable hash and locator. Unmatched source subjects have null
catalog model IDs and remain queryable by benchmark.

The full dataset now includes `benchmark_results` with the registry, observations,
missing cells, collection attempts, rejections, divergences and coverage. Model detail
also returns `benchmark_observations`, `benchmark_divergences`, `benchmark_coverage`.
See [ingestion and missing-value contract](docs/benchmark-ingestion.md). Composite
scores and their five existing slots retain their previous API behavior.

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
- Score scales: `composite` and the AA indices are 0–100; raw DesignArena score keys return Elo (~1000–1400). The **Coding Agent Index** is the median across all published harnesses for the exact model/reasoning-effort variant (Claude Code / Codex / Cursor CLI / …); every harness result is retained and results are never copied to sibling variants. This existing field retains the dated **v1.4** snapshot. AA's current **v1.5** has different benchmark components and is collected separately at `data/raw/aa-coding-agents-v1.5.json`; it does not replace the Composite input.
- `composite` uses five slots: AA Coding, source-matched AA Coding Agent, AA Intelligence, DesignArena Frontend and DesignArena Full-Stack. AA values are clamped to 0–100. Each DesignArena board needs at least 200 battles and is converted from Elo to its expected score against a fixed Elo 1000 opponent: `100 / (1 + 10^((1000 − Elo) / 400))`. Each observed slot is percentile-normalized over the current catalog's unique observed values. Every missing slot is assigned that model's mean observed percentile, making `composite_base` exactly the arithmetic mean of its available percentiles. With no reliable observed slot the fallback is 50; this fallback is not treated as benchmark evidence for family-representative selection. The returned `composite` adds a deterministic least-squares projection: if a model covers all reliable slots of another measured model and is no worse in each, the final scores preserve that dominance with a 0.1-point margin. `composite_base` exposes the pre-projection value. Family-scoped Intelligence.ai results attach exactly once to the deterministic collapsed-view representative and are labeled with `designarena_attachment_note`.
- Offer-level `eu_hosted` says that this specific model offer is served from an audited EU location. `eu_policy_equivalent` is a separate company-specific classification that makes an offer eligible for the product&apos;s EU filter without asserting technical EU residency; it is currently set only on Azure Direct Global DeepSeek V4 Pro and Kimi K2.7 Code, whose inference may occur outside the EU. Provider-level `eu_hosted` only says the provider has at least some EU-hosted capacity; it must not be used by itself to infer residency for every offer.

## Consumer update — 2026-09-08

The canonical host is `https://model-market-comparison.app.mintapis.com`;
the former Render host is suspended. All route paths remain unchanged.
The reference deployment serves **bundled JSON**, with no runtime database.
No database migration or credentials are needed to consume the public feed.

Prefer `GET /api/dataset` or the Git-tracked `data/dataset.json` for ingestion.
Use `GET /api/models?score=composite` for computed scores (Composite is computed
by app code, not stored as a scalar in the raw dataset). Check **each** date in
`sources`; `generated_at` only proves that a build ran, not that every source refreshed.
The daily job refreshes AA, AA Coding Agents, OpenRouter and DesignArena; curated
provider snapshots have separate audit dates. Do not assume every source refreshes daily.

Additive fields under each AA-backed model's `aa_metadata`:
`available` (boolean), `is_open_weights` and `deprecated` (boolean or null).
During a small upstream publication lag, benchmark rows are retained with null
metadata. Existing top-level booleans remain compatible: `open_weights:false`
means open weights are not established, and `deprecated:false` means not known
retired. Inspect the nullable fields to distinguish unknown from confirmed false.
Do not infer an open license from a lab name.

Exact model IDs and effort variants remain distinct. In particular, scores for
`qwen3.8-max` must not be copied to `qwen3.8-max-0902`, whose current evidence
is pricing only. Nullable direct Azure Astra prices are not zero; OpenRouter's
Azure offers are separate priced routes.

See [CHANGELOG.md](CHANGELOG.md) and [September audit](data/research/refresh-2026-09-08.md).

### Phase 01 additions (2026-09-10)

Existing URLs, file paths and score meanings remain unchanged. `sources.aa_coding_agents`
is the actual last collection date of the retained v1.4 snapshot, not today's date.
`sources.aa_coding_agents_v1_5` tracks the newly collected version. `source_status`
explains this separation. The v1.5 raw rows carry exact source IDs, components and
provenance; they will enter versioned benchmark views in phases 04–06.

`models[].aa_metadata.retained_fields` records `source`, `collected_at` and `reason`
for each metadata field retained from an older AA publication after the current
leaderboard stopped providing it. A snapshot refresh does not advance those field dates.

### Phase 02 additions — token and caching evidence (2026-09-10)

**All existing URLs, files, fields, prices and Composite inputs retain their meanings.**
Read the additions from `GET /api/dataset` or `data/dataset.json`. The full model
returned by `/api/models/{id}` includes `token_efficiency`; the compact `/api/models`
listing keeps its existing shape. Adjusted-cost computation/UI is a later phase.

An observation has `{ value, source, url, collected_at, basis }`. `value` can be a
number or the documented token-count object. `basis` is `measured` (AA benchmarks
or OpenRouter workload telemetry), `self_reported` (Chutes' own counters or catalog
prices), `derived` (explicit arithmetic), or `assumed` (applying a global workload
ratio to a different model). `source_basis` records the input classification for
derived/assumed values. Missing observations are **null**, never zero.

| JSON path | Meaning |
|---|---|
| `models[].token_efficiency.aa.tokens_per_task.value` | AA `intelligenceIndexOutputTokensPerTask`: `{ reasoning, answer, output }`, output tokens per Intelligence Index task for the exact AA UUID/effort. |
| `models[].token_efficiency.aa.canonical_token_counts.value` | AA `canonicalIntelligenceIndexTokenCount`: `{ input, output, answer, reasoning }`, totals over its canonical benchmark run. |
| `models[].token_efficiency.aa.benchmark_input_output_ratio` | Canonical input/output quotient, explicitly `interpretation: benchmark_proxy`. It is not observed user usage and is not the workload fallback. |
| `models[].token_efficiency.input_output_ratio` | Preferred empirical OpenRouter workload ratio, otherwise the Chutes global fallback. Includes `fallback`, `scope`, `window`, and a `fallback_reason`/`evidence_ref` when assumed. |
| `models[].token_efficiency.attempts` | Source attempts/outcomes, including missing API usage fields, exact-ID gaps, uncollected pages, incomplete windows and fallback evidence. Null attempt dates mean no fetch occurred. |
| `efficiency.global_io_ratio` | Chutes ratio plus source totals, seven completed UTC dates, cohort selection and returned/included/excluded-row coverage. |
| `efficiency.openrouter_endpoints[or_model_id][endpoint_tag]` | Exact pair registry: provider name, endpoint UUID when verified, cache-hit observation and cache read/write price observations. |
| `efficiency.aa_unmatched.value` | Collected AA rows whose UUID is not yet in the model catalog. Kept with provenance; never attached to a similarly named model. |
| `efficiency.coverage` | Explicit model/pair denominators and coverage counts. `schema_version` is 1. |

Workload selection uses exact published OpenRouter IDs or an unambiguous sole
offered SKU. Model pages provide `appStats.state.data.model_chart`; weekly rankings
extend coverage through an **exact canonical-slug join**, with `:free` kept separate.
Both use `sum(total_prompt_tokens) / sum(total_completion_tokens)`. The seven-day
page window excludes today; incomplete windows remain unavailable. These statistics
cover all apps/effort configurations on that SKU, not an isolated coding-agent cohort.
No family-name join or AA benchmark ratio substitutes for workload observations.

The Chutes ratio uses token-positive chute/day rows from `/invocations/stats/llm`
over the previous seven completed UTC days, including published anonymized aggregates.
It sums input and output independently, rather than averaging ratios. Raw counters
are self-reported; the global quotient is derived; its assignment to another model
is assumed. This is general Chutes traffic, not a coding-agent-only sample.

An endpoint entry's `cache_hit_rate.value` is a fraction from 0 to 1, taken from
OpenRouter `providerSummaries[].cacheHitRate`. The source `endpointId` is joined to
the model page's endpoint `id`, then to its exact `provider_slug` routing tag. The
effective-pricing API's **base** `providerSlug` is not an endpoint tag. Display names
such as Fireworks, Fireworks US and Fireworks Fast cannot establish equivalence.
Duplicate tags or identity conflicts get null cache observations and an explicit
status. Missing statistics are sparse coverage, not a zero hit rate.

OpenRouter does not publish the underlying cache-rate numerator/denominator or
the exact summary interval in this response. `summary_window` is null;
`chart_date_range` describes the accompanying chart only. Do not assume it defines
the summary interval. Cache read/write observations use **USD per million tokens**,
converted from the dated public endpoint catalog. Existing offer prices remain
unchanged; page-scraped price observations also remain in the raw snapshot.

New sources: `aa_efficiency`, `openrouter_efficiency`, `chutes_efficiency`.
The OpenRouter source date is the collector run, **not** a claim that every page
was refreshed. Individual dates survive rotation and failed fetches. Workload
observations older than 30 days fall back to Chutes; retained cache observations
and a stale Chutes fallback expose `stale: true` after 30 days. Consumers should
inspect observation dates/status, not just `generated_at`.

```js
const ds = await (await fetch('/api/dataset')).json();
const model = ds.models.find(m => m.id === selectedModelId);
const io = model.token_efficiency.input_output_ratio;
const offer = model.offers.find(o => o.or_model_id && o.endpoint_tag);
const cache = offer && ds.efficiency.openrouter_endpoints[offer.or_model_id]?.[offer.endpoint_tag];
// io.value = input tokens per output token; io.fallback says whether it is assumed.
// cache?.cache_hit_rate?.value is null/absent when unknown, with status explaining why.
```

Raw files: `data/raw/aa-efficiency.json`, `openrouter-efficiency.json`,
`chutes-efficiency.json`. Run `npm run data:efficiency` for independent refreshes.
`fetch-live.mjs aa` also refreshes AA efficiency; `fetch-live.mjs or` refreshes the
weekly ranking, four model pages in rotation and the Chutes fallback. The three
recipes are under `ops/rebuild-2026-09/skills/` for phase-09 installation.

Production continues to use bundled JSON. Optional Postgres installations should
run `node scripts/seed-db.mjs`: its idempotent `dataset_meta.extensions` JSONB
addition preserves the new top-level fields (and existing source-status metadata).
An old seed falls back to the bundled snapshot until reseeded.

### Effective-cost UI (phase 03)

The UI now defaults to modeled **USD/task**. Raw API `input_per_1m`, `output_per_1m` and cache fields retain their existing USD/million units and paths; no raw field was renamed or silently converted. Consumers can import the pure `effectiveCost` / `fixedCost` functions from `lib/effective-cost.mjs`. `effective_cost_per_task` and `effective_cost_per_1m_tokens` are separate return fields, with resolved inputs, dollar terms and explicit assumptions. See [effective-cost policy](docs/effective-cost.md) for all fallbacks and workload limitations. The UI settings key is now `mmc.settings.v6`; adjusted costs and the retained fixed-blend alternatives are global and persisted.

### Benchmark exploration (phase 06)

The canonical dataset/benchmark endpoints keep their existing fields. `GET /api/benchmark-scores` additionally accepts `observation_id` for exact row lookup, composable with `benchmark_id`, `model_id` and pagination.

`GET /api/benchmark-view?model=<id>` (repeat up to four) supplies a bounded UI projection with versioned axes, sources and fixed catalog peer statistics. `?axis=<id>` instead selects one published evaluation group including unmatched source identities. These presentation IDs include version, unit and harness/configuration and may change if source protocol metadata changes; use registry IDs and observation IDs from the canonical APIs for integrations. The view is additive and never changes Composite. See [explorer methodology](docs/benchmark-explorer.md).
