# STACKIT AI Model Serving — data collection method

**Date collected:** 2026-07-12
**Output:** `data/raw/stackit.json`

## Catalog scope

Use the first-party page
`https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models/`.
It was last updated on 2026-07-10 and lists 6 **Type Chat** models plus 2 embedding
models. Include the 6 chat rows and exclude the embedding-only rows.

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
any documented FX normalization.

## Refresh checks

```bash
jq '.models | length' data/raw/stackit.json
# expected for the 2026-07-12 snapshot: 6

jq '[.models[] | select(
  .status == "supported" and
  .region == "eu01" and
  .eu_hosted == true and
  .input_per_1m_eur == null and
  .output_per_1m_eur == null
)] | length' data/raw/stackit.json
# expected: 6
```
