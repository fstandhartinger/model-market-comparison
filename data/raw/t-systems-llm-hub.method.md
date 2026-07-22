# T-Systems AI Foundation Services / LLM Hub — data collection method

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
