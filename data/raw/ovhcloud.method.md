# OVHcloud AI Endpoints — data collection method

**Date collected:** 2026-07-12
**Output:** `data/raw/ovhcloud.json`

## Scope and authoritative sources

The first-party catalog is `https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/`.
It is server-rendered and, on the collection date, displayed **21 results**. Include only
models that return generated text and expose both input- and output-token prices. This leaves
9 LLM/VLM rows. Exclude embeddings, guard/moderation models, speech-to-text, text-to-speech,
and image generation.

OVHcloud's launch statement says AI Endpoints runs on its sovereign infrastructure and that
customer data is hosted in Europe:
`https://corporate.ovhcloud.com/en-gb/newsroom/news/ai-endpoints/`. The product page also
states zero data retention apart from billing data and no use of prompts for model training.
These offers can therefore be stored with `region: "eu"` and `eu_hosted: true`.

## Currency handling

The catalog publishes **EUR per 1 million tokens**. Preserve the original values in
`input_per_1m_eur` and `output_per_1m_eur`.

The collection date was a Sunday, so use the official ECB reference rate from the latest
preceding business day, **2026-07-10: 1 EUR = 1.1430 USD**. Preserve the EUR values and
calculate `USD = EUR * 1.1430`, rounded to the nearest USD cent. The raw snapshot records
the rate and date under `usd_normalization`.

On future refreshes:

1. use the ECB EUR/USD reference rate for the collection date, or explicitly the latest
   preceding ECB business day;
2. store `fx_rate` and `fx_rate_date` alongside the snapshot; and
3. calculate `USD = EUR * USD-per-EUR`, using the same rate for every row.

ECB reference rates: `https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/`

## Refresh checks

```bash
jq '.models | length' data/raw/ovhcloud.json
# expected for the 2026-07-12 snapshot: 9

jq '[.models[] | select(
  (.input_per_1m_eur | type) == "number" and
  (.output_per_1m_eur | type) == "number" and
  (.input_per_1m_usd | type) == "number" and
  (.output_per_1m_usd | type) == "number"
)] | length' data/raw/ovhcloud.json
# expected: 9
```
