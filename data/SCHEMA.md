# Dataset schema (`data/dataset.json`)

Built by `scripts/build-dataset.mjs` from the raw snapshots in `data/raw/`.

Phase 04 adds `data/raw/benchmarks/registry.json` (schema version 1) and an independent
raw AA field snapshot. Registry identities are `family::version`, with explicit dated
identities for unversioned protocols. They are not yet attached to `models[].benchmarks`.
Builds validate their structure and hashed evidence while leaving existing scores and
Composite inputs unchanged. See [the registry contract](raw/benchmarks/README.md).

```jsonc
{
  "generated_at": "ISO timestamp",
  "counts": { "models": 0, "families": 0, "providers": 0, "offers": 0 },
  "sources": { "openrouter": "YYYY-MM-DD", "artificialanalysis": "…", … },
  "models": [
    {
      "id": "gpt-5.5::high",          // family_key + "::" + variant
      "family_key": "gpt-5.5",         // canonical, normalized across all sources
      "family_name": "GPT-5.5",
      "display_name": "GPT-5.5 (high)",
      "org": "OpenAI",
      "variant": "high",               // reasoning effort / thinking setting (or "default")
      "open_weights": false,
      "deprecated": false,             // authoritative AA lifecycle flag when present
      "release_date": "2026-…" | null,
      "aa_metadata": {
        "huggingface_url": "https://huggingface.co/…", // corrected identity used for joins
        "source_huggingface_url": "https://huggingface.co/…", // only if upstream was wrong
        "metadata_correction": "…"     // documented reason for that correction
      },
      "featured": true,                // one of the brief's required models
      "has_benchmark": true,
      "has_pricing": true,
      "benchmarks": {                  // ArtificialAnalysis; null where unpublished
        "aa_intelligence_index": 0, "aa_coding_index": 0,
        "aa_coding_agent_index": 0,    // exact model+variant median across published harnesses
        "aa_math_index": 0,
        "aa_livecodebench": 0, "aa_scicode": 0, "aa_terminalbench_hard": 0,
        "aa_tau2": 0, "aa_gpqa": 0, "aa_mmlu_pro": 0
      },
      "coding_agent_results": [        // every exact harness result, never only the winner
        { "harness": "Claude Code", "score": 57.9, "source_model_name": "GLM 5.2" }
      ],
      "aa_reference_price": { "input_per_1m": 0, "output_per_1m": 0, "blended_3to1": 0 },
      "aa_speed": { "output_tps": 0, "ttft_s": 0 },
      "designarena": {                 // exact DA source id; attached once, sometimes at family scope
        "frontend": { "elo": 0, "winRate": 0, "battles": 0, "modelId": "…" },
        "fullstack": { "elo": 0, "winRate": 0, "battles": 0, "modelId": "…" }
      },
      "designarena_attachment_note": "…", // present when bare product evidence is family-scoped
      "copilot": {
        "current": {                  // current AI-Credit/token billing
          "input_per_1m": 0, "cached_input_per_1m": 0,
          "cache_write_per_1m": 0, "output_per_1m": 0,
          "release_status": "GA", "category": "Versatile"
        },
        "fast_mode": {                 // optional, separate preview-mode rate
          "input_per_1m": 0, "cached_input_per_1m": 0, "output_per_1m": 0
        },
        "multiplier": 0,              // legacy annual Pro/Pro+ only
        "usd_per_request": 0, "notes": ""
      } | null,
      "offers": [                      // exact model/SKU; modes may have different routes
        {
          "source": "OpenRouter" | "AWS Bedrock" | "Azure AI Foundry" | "Google Vertex AI"
                  | "Nebius" | "Inceptron" | "Anthropic API / Claude Code",
          "provider": "Novita", "platform": "OpenRouter",
          "input_per_1m": 0.57, "output_per_1m": 2.3,
          "cache_read_per_1m": null, "cache_write_per_1m": null,
          "pricing_tier": "short_context" | "long_context" | null,
          "route_type": "azure_direct" | "fireworks" | null,
          "endpoint_tag": "provider/tier" | null,
          "region": "global" | "eu-central-1" | "eu" | …,
          "unit": "per_1m_token",
          "estimated": false,            // true = hand-estimated price
          "tee": false,                  // true = runs in a Trusted Execution Environment
          "eu_hosted": true,             // this exact model offer runs in an audited EU location
          "eu_policy_equivalent": false, // company-approved EU-filter equivalent; not technical residency
          "non_us": true,                // serving company is headquartered outside the US
          "notes": ""
        }
      ]
    }
  ],
  "providers": [ {
    "platform": "Nebius", "provider": "Nebius", "model_count": 0,
    "eu_hosted": true,   // serves from EU data centres (provider-level flag)
    "non_us": true,      // company HQ is not the United States
    "country": "Netherlands", "note": "", "coming_soon": false
  } ]
}
```

## Score keys (`ScoreKey`)

`composite` (0–100 dominance-safe projection of seven model-mean-imputed percentile slots;
the unadjusted mean is exposed as `composite_base` by `/api/models`),
`aa_coding_index`, `aa_coding_agent` (→ `aa_coding_agent_index`, median harness result per exact model),
`aa_intelligence_index`, `epoch_eci`, `epoch_eci_software`, `designarena_frontend`,
`designarena_fullstack`. Epoch ECI is on its native published scale; software ECI is
refit from Epoch's official performance and difficulty exports and is null below two
qualifying software benchmarks.

## Normalization

`build-dataset.mjs` reduces every source's model label to a canonical `family_key`
(strip the source vendor prefix and unify separators/version punctuation). Identity-bearing
tokens such as release dates, Preview, Fast, Instruct, Thinking and Vision are retained.
Only benchmark configuration / serving annotations are removed from the identity.
Reasoning effort is captured separately as `variant`; product names such as MiniMax,
Mistral Medium and Qwen Max remain part of the family. AA rows are preserved 1:1 and use
the leaderboard's authoritative open-weight, license, lifecycle, context and exact-source
metadata. Coding Agent results are matched to the exact `(family, variant)` or a narrowly
audited bare-source identity (currently GLM-5.1/5.2 default-thinking); every harness row
is retained, and the summary is the median across those harnesses.
Two confirmed AA repository-link errors are corrected in the generated metadata while
the original source URL and correction reason remain alongside them for auditability.

Offers are model/SKU-specific. An AA row with an exact OpenRouter id receives only that
route (with repository identity as a guarded fallback for stale aliases); distinct
Instruct/Thinking, context-price tiers, endpoint tiers and managed-hosting routes remain
separate. Intelligence.ai / DesignArena results are product/family scoped and attach exactly
once to the deterministic active representative also used by collapsed comparisons. The
`designarena_attachment_note` records that this does not establish the tested effort setting.
Results are never copied to every reasoning-effort sibling and no hidden `::designarena`
duplicate row is created.
The Composite uses seven capability slots: AA Coding, source-matched
Coding Agent, AA Intelligence, Epoch general ECI, Epoch Software Engineering ECI,
DesignArena Frontend and DesignArena Full-Stack. AA
values are clamped to 0–100. Each DesignArena board qualifies with at least 200 battles
and its Elo is converted to the expected score against a fixed Elo 1000 opponent:
`100 / (1 + 10^((1000 − Elo) / 400))`. Each observed slot is converted to its empirical
percentile among the current catalog's unique observed values. Every missing slot inherits
that model's mean observed percentile, so `composite_base` equals the mean of the
available percentiles. A deterministic least-squares projection makes the smallest symmetric
catalog-wide adjustment needed to preserve strict evidence-superset dominance for every measured
model, using a 0.1-point display margin. A row with no reliable
observed slot receives 50; its evidence coverage remains zero so the fallback is not treated
as a measurement. `FAMILY_ALIASES` merges split keys (e.g. `claude-fable` →
`claude-fable-5`).

## In Postgres

`scripts/seed-db.mjs` loads this file into three tables: `models` (one row per
variant, including its authoritative model-specific offers in `data`), `offers` (a
deduplicated family union retained for backward compatibility), and
`dataset_meta` (counts/sources/providers). The app reads Postgres when
`DATABASE_URL` is set and falls back to this bundled JSON otherwise. A legacy DB
seed without model-scoped offers also falls back to the bundled snapshot instead
of reintroducing a family-union provider/SKU leak; the next normal seed upgrades it.

### Additive AA provenance fields (2026-09-08)

`models[].aa_metadata.available` records whether AA leaderboard metadata was found.
`aa_metadata.is_open_weights` and `aa_metadata.deprecated` preserve nullable source
values. The existing top-level `open_weights` / `deprecated` remain booleans, using
false for an unknown value. Scores remain attached to the exact AA model ID and
are not dropped merely because its metadata publication lags. No DB schema change.

## Versioned benchmark results (phase 05)

`benchmark_results` has `schema_version: 1`, `registry`, `observations`, `missing`,
`collections`, `rejected`, `divergences`, and `coverage.by_model/by_benchmark`.
Observations use exact `benchmark_id` and a source subject with nullable catalog
`model_id`, effort and harness. Native numeric value/unit, measured/self_reported/derived
basis, protocol and complete source provenance are mandatory. Derived rows retain
source_basis, formula, inputs and supporting source hashes. Full types are in
`lib/benchmark-scores.d.mts`; runtime checks in `lib/benchmark-scores.mjs`.

Absent cells are unknown; not_tested, not_published, source_unreachable and contested
remain distinct. Explicit missing cells need source evidence. Coverage counts catalog
configurations once, excluding unmatched source subjects. Divergences require an
audited exact protocol key as well as identical model/version/unit/configuration.
See `docs/benchmark-ingestion.md` for formulas, daily staging and critic approvals.

## Historical comparison (phase 10)

`benchmark_results` gains an optional `historical` object (`schema_version: 1`) whenever
date-provenance is available — at least one retained dated state, or at least two
versions of a benchmark family among the current observations. It never replaces an
observation: an old value stays a historical record and a superseded model receives a
*labelled estimate*, never a measurement. Types are in `lib/benchmark-history.d.mts`;
math and policy in `lib/benchmark-history.mjs`.

### Immutable dated states

Every ingestion run projects the accepted score snapshot to a compact state and
stores it write-once under `data/raw/benchmarks/history/states/<state_id>.json`, with
`data/raw/benchmarks/history/index.json` as the ordered index. `state_id` is
`<yyyymmdd>-<content_sha256[0..8]>`, so identical observations resolve to the same
state and re-running is a no-op. A prior state is never overwritten or deleted:
`writeStateOnce` aborts if an existing id carries different content. Each state row
keeps `benchmark_id`, `model_key` (catalog model + harness + effort), value, unit,
basis and source. `scripts/build-benchmark-history.mjs` appends (`--from <file>`) and
rebuilds the index (`--reindex`); `ops/daily/refresh-benchmarks.mjs` appends after the
accepted scores write. The state also retains six history-only headline boards that are
stored on model rows rather than in the 75-entry registry: AA Intelligence Index, AA Coding
Index, Epoch general ECI, Epoch Software Engineering ECI, and DesignArena Frontend/Full-Stack
Elo. Their stable IDs are `aa-intelligence-index::snapshot`, `aa-coding-index::snapshot`,
`epoch-eci::general`, `epoch-eci::software`, `designarena-frontend::snapshot` and
`designarena-fullstack::snapshot`; they do not change the registry denominator. These rows
keep the immutable upstream source identity in `model_id`, an optional audited catalog join in
`catalog_model_id`, and the source file hash/locator. `dataset.json` only carries the state *metadata* (id, source,
time, content hash, count, benchmark ids); full row bodies live in the store.

### Bridge estimates

A value absent from the current snapshot but present in an older **dated state** or an
older **benchmark version of the same family** is bridged through configurations
measured on both sides:

    r_b = value_new(b) / value_old(b)
    aggregate = median(r_b)          # requires >= 3 bridges
    estimate  = value_old * aggregate
    uncertainty = value_old * [q1, q3]   # spread over the bridge ratios

Estimates (`method: bridge-median-ratio`) publish the aggregate, the min/q1/q3/max
spread, the IQR relative to the median, the bridge count and the contributing bridges.
If there are fewer than three bridges, or the bridge IQR exceeds **25 % of the median**,
the row is `not_comparable` and `value` is `null` — a number is never invented. Each
`not_comparable` row carries a machine-readable `cause` with the concrete number that
triggered it: `insufficient_bridges` with `cause_value` = the bridge count
(`BRIDGE_POLICY.minBridges = 3`), or `spread_too_wide` with `cause_value` = the
`iqr_relative` (`BRIDGE_POLICY.maxIqrRelative = 0.25`). The UI reads the cause to explain
*why* no estimate is published. Old values of `|x| < 1e-12` are floored out of the ratio
(`BRIDGE_POLICY.zeroFloor`). Units, direction and family (`scoring.unit`,
`scoring.higher_better`) must match; benchmarks are never mixed.

### Special cases

- **Elo / battle boards** (`scoring.unit === 'Elo'` or an Elo metric) shift ranks, not
  values (`method: bridge-rank-shift`). The estimate is the target value at the
  historical model's 0–1 rank corrected by the median bridge rank shift. The same 25 %
  limit is applied to the *absolute* IQR on the 0–1 rank scale (`iqr_relative = iqr`),
  not to an IQR relative to the median as for ratio bridges; a bridge pair whose value is
  absent from a published board is dropped rather than ranked at last place.
- **Derived/composite indices** (`scoring.derived === true`) are never bridged; a
  superseded input is `recompute_required` and must be recomputed from its inputs.
- **Index/version changes** (`family::version`) are separate provenance branches, not
  the same value; an estimate always cites `source_benchmark_id` (version bridge) or
  `source_state_id` (dated bridge).
- **Multi-hop history** is allowed when a direct bridge is unavailable: the shortest path
  over retained intermediate states/versions wins, each hop must pass the single-hop gate,
  the path is capped at three hops and the summed relative IQR is capped at 50 %. The
  estimate carries `comparison.hops`, `comparison.path` (with each hop's bridge count and
  aggregate), and `comparison.chain_iqr_relative`; a direct comparable hop is preferred.

### Limitations

An estimate is not a measurement, is marked as an estimate in the API and UI, and
carries its bridge count and uncertainty. It depends on the bridge cohort being
representative; a protocol change that spreads bridge ratios beyond the 25 % limit is
reported as incomparable rather than estimated. With a single retained state only the
cross-version bridge path is live; dated-state estimates additionally require a second,
distinct state to have been retained.

### UI and API

`lib/benchmark-view.mjs` attaches estimates to the axis of their benchmark and cohort
(`axis.estimates`); they are never merged into measured `axis.scores`. The per-axis
view already served by `/api/benchmark-view?axis=<id>` carries them, and
`components/BenchmarkRanking.tsx` renders each with its bridge count, spread and
estimate label. `selectBenchmarkView` keeps an axis's estimates when that axis is
requested directly.

## Real-SWE (phase 11)

Real-SWE (`realswe::snapshot-2026-09-12`, `family: realswe`, `category: Coding`) adds a
coding-agent board whose model+harness unit is scored together. Observations follow the
phase-05 shape — `subject` (nullable catalog `model_id`, `harness`, effort),
native `value`/`unit` (**percent**), `basis: measured`, `protocol`, and complete source
provenance — plus:

- `confidence_interval`: the source's 95 % interval (`{level: 0.95, lower, upper}`) in
  the native unit.
- `subject.harness` as a first-class cohort dimension: one axis per
  `[benchmark_id, harness, unit]`, so two harnesses of one model never merge.

The separate cost board `realswe-cost::snapshot-2026-09-12` stores the published
**USD per rollout** (unit `USD`, difference-cost category, lower-better) as its own
observation; it is never converted into a score. Task-level pass counts (passes/8 per
configuration) and the summed failure taxonomy are retained under
`benchmark_results.details['realswe::snapshot-2026-09-12']`, together with
`publication_scope` (`{tasks: 10, runs: 8, configurations: 8, rollouts: 640}`);
`details['realswe-cost::snapshot-2026-09-12']` holds `cost_provenance` (per-configuration
displayed cost, runs, basis and a lower-bound flag for incomplete-usage configurations).
`benchmark_results.collections` carries only `{benchmark_id, status, source_url, reason}`.
Every Real-SWE row has `model_id: null` (the source publishes no catalog identity) and
therefore contributes to neither `coverage.by_model` nor catalog coverage; it surfaces
only under the unmatched-source-identities toggle. The `not_comparable` historical rows
carry the phase-10 `cause`/`cause_value` described above. Sources and formula notes:
`docs/benchmark-ingestion.md`; types `lib/realswe.mjs`.
