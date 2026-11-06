# VulcanBench Frontier: joins for accepted published rows

CR-703. Base revision: `bfdc3d820e5ec3c0e23d74f8919f52f38e05a450`. Reviewed on 6 November 2026.

All 19 labels below are already accepted observations in `data/raw/benchmarks/public-observations.json` at this revision. Each label states the exact model and effort; the existing `parseVulcanbenchFrontierLabel` / `boardJoins` rules resolve it to one existing catalog configuration. The board labels, complete protocol and captured primary-source receipts remain attached to those observations. No new score or observation is admitted.

The existing 28 VulcanBench joins and every other board entry are preserved byte for byte. The corresponding 19 score observations receive only the canonical ingest model_id, variant and join_note enrichment; values, protocols and original source receipts/dates are unchanged. All other score records are preserved. The canonical dataset build succeeds. Its benchmark_results changes only these 19 identities and their coverage; all observation IDs, source labels, values and ordering remain unchanged. All other dataset fields, including the original refresh timestamp/source-status metadata, are retained so this identity repair cannot imply a successful new daily refresh. Catalog model fields and Composite inputs are unchanged. The source board score order is unchanged. A global identity-map regeneration is deliberately avoided because unrelated missing-row withdrawals must be reviewed by their owners.

| Published source label | Exact catalog configuration |
| --- | --- |
| Sonnet 5.5 [max] | `claude-sonnet-5.5::max` |
| Opus 5.5 [medium] | `claude-opus-5.5::medium` |
| Opus 5.5 [extra-high] | `claude-opus-5.5::xhigh` |
| Opus 5.5 [max] | `claude-opus-5.5::max` |
| Sonnet 5.5 [extra-high] | `claude-sonnet-5.5::xhigh` |
| GPT-6.1 Terra [max] | `gpt-6.1-terra::max` |
| GPT-6.1 Sol [extra-high] | `gpt-6.1-sol::xhigh` |
| GPT-6.1 Sol [max] | `gpt-6.1-sol::max` |
| GPT-6.1 Sol [high] | `gpt-6.1-sol::high` |
| Haiku 5.5 [high] | `claude-haiku-5.5::high` |
| Sonnet 5.5 [medium] | `claude-sonnet-5.5::medium` |
| GPT-6.1 Terra [extra-high] | `gpt-6.1-terra::xhigh` |
| GPT-6 Sol [high] | `gpt-6-sol::high` |
| GPT-6 Luna [extra-high] | `gpt-6-luna::xhigh` |
| GPT-6.1 Terra [low] | `gpt-6.1-terra::low` |
| GPT-6 Sol [low] | `gpt-6-sol::low` |
| GPT-6 Luna [high] | `gpt-6-luna::high` |
| GPT-6 Luna [medium] | `gpt-6-luna::medium` |
| GPT-6 Luna [low] | `gpt-6-luna::low` |

The 15 candidate rows held by the 5 November numeric-format critic are outside this review. PR #572 changed the review criterion; it did not approve those rows. The 6 November daily run stopped at the retired Artificial Analysis API before any fresh score review. Those candidate scores must pass a future independent review and publication; this change grants no approval to them.

Source file hashes at review:

- `lib/board-identity.mjs`: `beb4c128be4bc327e4948c03bd8683be5605ad5ef0d20834b8b927411f322cb2`
- `data/raw/benchmarks/public-observations.json`: `e6f1c874a78e438bb538301e83c8cc35ecdc1238224e5ac52eec5da04fea39ff`
- `data/raw/benchmarks/identity-map.json`: `9fcdea5ae14d6ec37ef7d4e9cba20afffd63ddbbf509952cf9d82b581516a907`
- `data/dataset.json`: `ab112b09b90311aa6821c324dd3aab2e3aaabdaaa339e43ea8c685b628e5f2b2`

Validation: canonical score ingest and dataset build succeeded. The 16 existing VulcanBench/KernelBench, identity-map provenance, withdrawal/regeneration and coding-source checks pass. A semantic comparison confirms exactly 19 new joins, no deleted map entries or score observations, and unchanged values, sources, protocols, ordering and all other dataset fields. Full typecheck, production build, complete tests and deployment checks remain the merge queue's responsibility.
