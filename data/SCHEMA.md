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
      "release_date": "2026-…" | null,
      "featured": true,                // one of the brief's required models
      "has_benchmark": true,
      "has_pricing": true,
      "benchmarks": {                  // ArtificialAnalysis; null where unpublished
        "aa_intelligence_index": 0, "aa_coding_index": 0,
        "aa_coding_agent_index": 0,    // exact model+variant MAX across its published harnesses
        "aa_math_index": 0,
        "aa_livecodebench": 0, "aa_scicode": 0, "aa_terminalbench_hard": 0,
        "aa_tau2": 0, "aa_gpqa": 0, "aa_mmlu_pro": 0
      },
      "aa_reference_price": { "input_per_1m": 0, "output_per_1m": 0, "blended_3to1": 0 },
      "aa_speed": { "output_tps": 0, "ttft_s": 0 },
      "designarena": {                 // family-level Elo, both leaderboards
        "frontend": { "elo": 0, "winRate": 0, "battles": 0, "modelId": "…" },
        "fullstack": { "elo": 0, "winRate": 0, "battles": 0, "modelId": "…" }
      },
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
      "offers": [                      // family-level; shared by all variants
        {
          "source": "OpenRouter" | "AWS Bedrock" | "Azure AI Foundry" | "Google Vertex AI"
                  | "Nebius" | "Inceptron" | "Anthropic API / Claude Code",
          "provider": "Novita", "platform": "OpenRouter",
          "input_per_1m": 0.57, "output_per_1m": 2.3,
          "cache_read_per_1m": null, "cache_write_per_1m": null,
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

`composite` (missing-neutral 0–100 graph rating fitted from shared normalized capability slots),
`aa_coding_index`, `aa_coding_agent` (→ `aa_coding_agent_index`, best harness per model),
`aa_intelligence_index`, `designarena_frontend`, `designarena_fullstack`.

## Normalization

`build-dataset.mjs` reduces every source's model label to a canonical `family_key`
(strip vendor prefix, drop parentheticals/dates/`-fast`/`-latest`, unify version
dashes like `4-8`→`4.8`). Reasoning effort / thinking is captured separately as
`variant`; effort detection is restricted to AA&apos;s parenthetical qualifiers so product
names such as MiniMax, Mistral Medium and Qwen Max remain part of the family. Benchmarks are per-variant (ArtificialAnalysis publishes per setting);
prices and DesignArena Elo are family-level and attached to every variant of the
family. Coding Agent scores are matched to the exact `(family, variant)` and use the
maximum only across that variant's harnesses; ambiguous effort labels stay unmatched.
The Composite uses AA Coding, Coding Agent, Intelligence and a combined DesignArena
slot (only boards with at least 500 battles). It fits pairwise differences from only
the slots both models possess into a least-squares rating graph. The denominator is
always the fixed four-slot budget, so a missing slot contributes zero difference;
no-shared-evidence pairs create no edge. Identical coverage-subset profiles are
hard-tied before fitting, preventing a sparse row from dodging an edge that affects
its otherwise identical peer. `FAMILY_ALIASES` merges split keys (e.g. `claude-fable` →
`claude-fable-5`).

## In Postgres

`scripts/seed-db.mjs` loads this file into three tables: `models` (one row per
variant, full row JSON in `data`), `offers` (one row per family-level offer), and
`dataset_meta` (counts/sources/providers). The app reads Postgres when
`DATABASE_URL` is set and falls back to this bundled JSON otherwise.
