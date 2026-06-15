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
        "aa_intelligence_index": 0, "aa_coding_index": 0, "aa_math_index": 0,
        "aa_livecodebench": 0, "aa_scicode": 0, "aa_terminalbench_hard": 0,
        "aa_tau2": 0, "aa_gpqa": 0, "aa_mmlu_pro": 0
      },
      "aa_reference_price": { "input_per_1m": 0, "output_per_1m": 0, "blended_3to1": 0 },
      "aa_speed": { "output_tps": 0, "ttft_s": 0 },
      "designarena": {                 // family-level Elo, both leaderboards
        "frontend": { "elo": 0, "winRate": 0, "battles": 0, "modelId": "…" },
        "fullstack": { "elo": 0, "winRate": 0, "battles": 0, "modelId": "…" }
      },
      "copilot": { "multiplier": 0, "usd_per_request": 0, "notes": "" } | null,
      "offers": [                      // family-level; shared by all variants
        {
          "source": "OpenRouter" | "AWS Bedrock" | "Azure AI Foundry" | "Anthropic API / Claude Code",
          "provider": "Novita", "platform": "OpenRouter",
          "input_per_1m": 0.57, "output_per_1m": 2.3,
          "cache_read_per_1m": null, "cache_write_per_1m": null,
          "region": "global" | "eu-central-1" | …,
          "unit": "per_1m_token",
          "estimated": false, "notes": ""
        }
      ]
    }
  ],
  "providers": [ { "platform": "OpenRouter", "provider": "Novita", "model_count": 0 } ]
}
```

## Normalization

`build-dataset.mjs` reduces every source's model label to a canonical `family_key`
(strip vendor prefix, drop parentheticals/dates/`-fast`/`-latest`, unify version
dashes like `4-8`→`4.8`). Reasoning effort / thinking is captured separately as
`variant`. Benchmarks are per-variant (ArtificialAnalysis publishes per setting);
prices and DesignArena Elo are family-level and attached to every variant of the
family. `FAMILY_ALIASES` merges split keys (e.g. `claude-fable` → `claude-fable-5`).

## In Postgres

`scripts/seed-db.mjs` loads this file into three tables: `models` (one row per
variant, full row JSON in `data`), `offers` (one row per family-level offer), and
`dataset_meta` (counts/sources/providers). The app reads Postgres when
`DATABASE_URL` is set and falls back to this bundled JSON otherwise.
