# Dataset schema (`data/dataset.json`)

Built by `scripts/build-dataset.mjs` from the raw snapshots in `data/raw/`.

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

`composite` (0–100 mean of available capability percentiles, expressed as five slots
with model-mean imputation),
`aa_coding_index`, `aa_coding_agent` (→ `aa_coding_agent_index`, median harness result per exact model),
`aa_intelligence_index`, `designarena_frontend`, `designarena_fullstack`.

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
separate. DesignArena results attach once to the exact/default row, an explicitly audited
source identity such as `glm-5.2::max`, or a dedicated `::designarena` row. If DesignArena
publishes only a bare product identity and that family has exactly one benchmark-bearing
configuration, the result attaches there at family scope and carries
`designarena_attachment_note`; ambiguous multi-effort families remain separate. Results
are never copied to every reasoning-effort sibling.
The Composite uses five capability slots: AA Coding, source-matched
Coding Agent, AA Intelligence, DesignArena Frontend and DesignArena Full-Stack. AA
values are clamped to 0–100. Each DesignArena board qualifies with at least 500 battles
and its Elo is converted to the expected score against a fixed Elo 1000 opponent:
`100 / (1 + 10^((1000 − Elo) / 400))`. Each observed slot is converted to its empirical
percentile among the current catalog's unique observed values. Every missing slot inherits
that model's mean observed percentile, so the five-slot result equals the mean of the
available percentiles. A row with no reliable observed slot receives 50; its evidence
coverage remains zero so the fallback is not treated as a measurement. There is no
catalog-chain or dominance adjustment. `FAMILY_ALIASES` merges split keys (e.g. `claude-fable` →
`claude-fable-5`).

## In Postgres

`scripts/seed-db.mjs` loads this file into three tables: `models` (one row per
variant, including its authoritative model-specific offers in `data`), `offers` (a
deduplicated family union retained for backward compatibility), and
`dataset_meta` (counts/sources/providers). The app reads Postgres when
`DATABASE_URL` is set and falls back to this bundled JSON otherwise. A legacy DB
seed without model-scoped offers also falls back to the bundled snapshot instead
of reintroducing a family-union provider/SKU leak; the next normal seed upgrades it.
