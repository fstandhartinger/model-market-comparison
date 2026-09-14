# TensorX — data collection method

**Date collected:** 2026-07-22
**Output:** `data/raw/tensorx.json`

## Authoritative source

**Update 2026-09-14 — executable collector (R9.1).** `scripts/fetch-tensorx-catalog.mjs` +
`lib/tensorx-catalog.mjs` (tests in `test/tensorx-catalog.test.mjs`) refresh `tensorx.json` as the
non-fatal daily step `fetch-tensorx-catalog` in `ops/daily/daily.mjs` (robots.txt: `Allow: /`,
only `/wp-admin/` disallowed). One GET; columns are located by header text (Model Name, Context,
Input Price, Cache Read, Output Price), so a column reorder cannot shift prices. Rows without both
token prices (the embedding) go to `skipped`. The `provider/slug` is stored as `api_model_id`, not
`model_id` (build-dataset would use `model_id` as the family identity); curated names are matched by
`api_model_id` or the normalized slug tail, new slugs get `mapping: "derived"`, and rows no longer
in the table are dropped. Duplicate slugs, unreadable prices or fewer than half of the previous rows
fail closed. First run 2026-09-14: 17 of 18 rows unchanged; `deepseek/deepseek-v4.1-flash` added
($0.50 / $1.50, cache $0.13, 1M); DeepSeek V3.2 no longer listed and removed.

Use the server-rendered first-party table at `https://tensorx.ai/pricing/`. It explicitly
labels prices as USD per 1 million tokens and supplies separate **Input Price**, **Cache
Read**, and **Output Price** columns. On 2026-07-22 the table contained 26 model rows: 25
text/vision models plus `qwen3-embedding-8b`. The embedding-only row is excluded from the
LLM comparison. Note: the "N of N models" counter string is no longer present in the
server-rendered HTML (it appears to be client-rendered now); count the `<tr>` rows in the
table instead (a plain `curl` with a browser User-Agent still returns the full table).

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
