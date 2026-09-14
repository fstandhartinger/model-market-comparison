# T-Systems AI Foundation Services / LLM Hub — data collection method

> **Refreshed daily since 2026-09-14 by `scripts/fetch-t-systems-catalog.mjs`** (last manual audit:
> 2026-09-08, see [September refresh audit](../research/refresh-2026-09-08.md)). The adjacent
> JSON's `method`/`collected_at` hold current values. Earlier dated notes below are historical.

## Executable collector (R9.1, 2026-09-14)

`scripts/fetch-t-systems-catalog.mjs` + `lib/t-systems-catalog.mjs` (tests in
`test/t-systems-catalog.test.mjs`), non-fatal daily step `fetch-t-systems-catalog` in
`ops/daily/daily.mjs`. GETs of `/models/llms/` and `/models/coding/` (docs host robots.txt:
`Allow: /`) and the ECB daily reference XML.

- Columns located by header text (Model, Provider, Cloud, Input, Output, Context, In €/M, Out €/M,
  Cached €/M, Plans); rows whose cell count differs (the "No models match…" filler) are ignored.
- Prices are native EUR; `—`, `n/a` or empty = no price. Plan `Test` → `status: "preview"` (prices
  stay null, as before); otherwise `active`. `Cached €/M` → `cache_read_per_1m_eur`/`_usd`.
- Both tables are merged by model name; a model listed in both must carry identical prices/cloud.
  Names are keyed with `≤`/`>` preserved, so the Gemini ≤200k / >200k tiers never merge.
- **Audited hosting fields are kept for known models** (`hosting_class`, `server_location`,
  `is_externally_hosted`, `eu_hosted`). Only a new model derives them from the Cloud column:
  `Telekom…` → `sovereign_germany`; `Azure…` → `routed_azure_eu`; `GCP…` (including Claude's
  "GCP / Azure") → `routed_gcp_eu`, the precedent of every audited Claude row. Unknown cloud text on a
  new model fails the run. New models get `mapping: "derived"`.
- USD = EUR × ECB rate, cents; rows no longer listed are dropped; fewer than half of the previous
  models → fail closed.

First run 2026-09-14 (ECB 1.1592 of 2026-09-11): 31 models. All 30 previous rows kept with identical
EUR prices and hosting fields; USD moved by FX cents only; the six Telekom-hosted priced models gained
their listed cached price (€0.03–€0.225); **GLM 5.3 Flash** added as a `preview` row (plan Test, no
prices), like Qwen 3.8 27B.

**Date collected:** 2026-07-22 (previous: 2026-07-12)
**Output:** `data/raw/t-systems-llm-hub.json`

## Catalog scope

Use the first-party active-model tables:

- Chat & Reasoning: `https://docs.llmhub.t-systems.net/models/llms/`
- Coding: `https://docs.llmhub.t-systems.net/models/coding/`
- Plans: `https://docs.llmhub.t-systems.net/plans/`

On 2026-07-22 the LLM table contained **43** model rows. One of them, `GPT Image 2`, is an
image-generation model (its Output column is mislabeled "Text" upstream); it stays out of
scope. The coding table adds two distinct models (`Qwen3 Coder 30B`, `GPT-5 Codex`) and
repeats `GLM 5.2`; deduplicate that overlap. The raw snapshot therefore contains **44**
relevant text-output chat/coding models. Vision models that return text are already
included in the LLM/coding tables. Embeddings, speech-to-text, and image-output-only
models are out of scope.

New since 2026-07-12: `GPT 5.4`, `GPT 5.4 mini`, `GPT 5.5` (Azure), `Claude Opus 4.8`,
`Gemini 3.1 Pro`, `Gemini 3.5 Flash` (GCP). Note the upstream naming inconsistency: the
new Anthropic row is called "Claude Opus 4.8" while older rows use "Claude 4.6 Opus"
style; no Claude Opus 4.7 is listed. `Gemma 4` and `Mistral Small 4` left Test/preview
status and are now generally priced at €0.60/€1.20 (both now list text-only input).

Scraping still works with plain `curl` + an HTML table parser; no anti-bot measures.

## Hosting classes

Do not treat every T-Systems catalog row as sovereign T-Cloud inference:

- `sovereign_germany`: operated on T-Cloud Public in Germany; `is_externally_hosted:false`.
- `routed_azure_eu`: forwarded to Microsoft Azure EU regions;
  `is_externally_hosted:true`.
- `routed_gcp_eu`: forwarded to Google Cloud EU regions;
  `is_externally_hosted:true`.

As of 2026-07-22 only `GLM 5.2` remains a Test row (sovereign-Germany preview, not a
generally priced production offer). Keep `status:"preview"` and both prices `null` for
Test rows. T-Systems states that its open-source T-Cloud models are processed in Germany with
no storage; proprietary routed models remain subject to the upstream provider's terms.

## Pricing and monthly floor

The model tables publish model-specific **EUR per million token** prices. Copy only those
numbers; an em dash stays `null`. For comparability, normalize priced rows with the official
ECB reference rate from the latest preceding business day, **2026-07-21: 1 EUR = 1.1418
USD** (previous refresh used 2026-07-10: 1.1430). Preserve the EUR fields and calculate
`USD = EUR * 1.1418`, rounded to the nearest USD cent. The raw snapshot records the rate, rate date, source and rounding policy under
`usd_normalization`.

On future refreshes use the collection-date ECB rate, or explicitly the latest preceding ECB
business day, and apply one documented rate consistently to every row. ECB source:
`https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/`.

The plan minimums, valid from 2026-05-01, are:

| Plan | Minimum monthly commitment |
|---|---:|
| Essential | €1,000 |
| Professional | €3,000 |
| Agentic | €5,000 |
| Enterprise | Custom |

This is the floor of monthly billing, not a surcharge and not a token rate. It is stored once
under `minimum_monthly_commitment_eur`; never copy it into model input/output pricing.

## Refresh checks

```bash
jq '.models | length' data/raw/t-systems-llm-hub.json
# expected for the 2026-07-22 snapshot: 44

jq '[.models[] | select(.hosting_class == "sovereign_germany")] | length' \
  data/raw/t-systems-llm-hub.json
# expected: 9 (8 active + 1 preview)

jq '[.models[] | select(.hosting_class == "routed_azure_eu")] | length' \
  data/raw/t-systems-llm-hub.json
# expected: 17

jq '[.models[] | select(.hosting_class == "routed_gcp_eu")] | length' \
  data/raw/t-systems-llm-hub.json
# expected: 18
```
