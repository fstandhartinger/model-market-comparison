# TensorX — data collection method

**Date collected:** 2026-07-12
**Output:** `data/raw/tensorx.json`

## Authoritative source

Use the server-rendered first-party table at `https://tensorx.ai/pricing/`. It explicitly
labels prices as USD per 1 million tokens and supplies separate **Input Price**, **Cache
Read**, and **Output Price** columns. On 2026-07-12 it displayed 25 of 25 models: 24
text/vision models plus `qwen3-embedding-8b`. The embedding-only row is excluded from the
LLM comparison.

Persist all three token tiers as `input_per_1m_usd`, `cache_read_per_1m_usd`, and
`output_per_1m_usd`. Do not leave cache pricing only in prose. In particular, the live row
for `xiaomi/mimo-v2.5` is `$0.40 / $0.10 / $2.00`.

## Hosting metadata

TensorX states that the service runs on EU-sovereign infrastructure, with Dublin, Helsinki,
and Paris regions, and that every request uses zero data retention. `region: "eu"` is
therefore explicit provider evidence rather than an inference from company headquarters.

## Refresh check

After refreshing, verify that the count of included rows remains the total table count minus
embedding-only rows and that every included model has numeric input, cache-read, and output
prices:

```bash
jq '[.models[] | select(
  (.input_per_1m_usd | type) == "number" and
  (.cache_read_per_1m_usd | type) == "number" and
  (.output_per_1m_usd | type) == "number"
)] | length' data/raw/tensorx.json
```
