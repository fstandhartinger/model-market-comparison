# STACKIT AI Model Serving — data collection method

**Date collected:** 2026-07-22
**Output:** `data/raw/stackit.json`

## Catalog scope

Use the first-party page
`https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models/`.
It was last updated on 2026-07-16 and lists 7 **Type Chat** models plus 2 embedding
models. Include the 7 chat rows and exclude the embedding-only rows.

Parsing tip: the per-model HTML tables have empty header cells and do NOT contain the
model id; the canonical `model_id` is in each section's "Full Name: …" line under the
`<h3>` model heading (only the two gpt-oss ids also appear in `<code>` tags).

For every included model the docs state:

- OpenAI-compatible endpoint `https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1`;
- `Status Supported`; and
- a billing category (`LLM-Standard`, `LLM-Plus`, or `LLM-Premium`).

The official price list identifies EU01 as Germany South. Store `region: "eu01"`,
`server_location: "Germany South"`, and `eu_hosted: true`.

## Pricing

The model catalog itself does not print token prices. Keep all model price fields `null` in
this snapshot and retain each model's billing category. Do not silently translate a category
into a price without verifying the current first-party mapping during the same refresh.

Pricing authorities:

- Calculator: `https://calculator.stackit.cloud/ai?addService=model-serving`
- Price page: `https://www.stackit.de/de/preise/cloud-services/stackit-ai-model-serving/`

If prices are added later, store the original EUR values and price-list date before applying
any documented FX normalization. (2026-07-22 refresh: still no token prices in the catalog,
so no FX rate was applied or recorded — all price fields remain null.)

## Refresh checks

```bash
jq '.models | length' data/raw/stackit.json
# expected for the 2026-07-22 snapshot: 7

jq '[.models[] | select(
  .status == "supported" and
  .region == "eu01" and
  .eu_hosted == true and
  .input_per_1m_eur == null and
  .output_per_1m_eur == null
)] | length' data/raw/stackit.json
# expected: 7
```

## Changelog

- 2026-07-22: docs page (updated 2026-07-16) added **Gemma 4 31B**
  (`google/gemma-4-31B-it`, LLM-Plus, 256K context, text+image, tool calling +
  reasoning, BF16); Qwen3-VL 235B context label changed 218K -> 200K; Qwen3.6 27B
  now lists "Tool calling & Reasoning enabled" plus an 8192-token thinking budget.
