---
name: collect-chutes-io-ratio
description: Collect a documented global input/output token ratio from Chutes usage statistics when per-model OpenRouter workload usage is missing. Use when an app or dataset needs a documented global input:output fallback ratio and no per-model OpenRouter workload usage is available.
---

# Chutes global workload fallback

In the Benchmark Heaven repository run `node scripts/fetch-chutes-efficiency.mjs`.
It writes `data/raw/chutes-efficiency.json` atomically after validation. No API key
is required for the public aggregate endpoint; do not fetch individual prompts.

Discovery: `https://api.chutes.ai/openapi.json`, GET `/invocations/stats/llm`.
Pass `start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` (inclusive). Use the last seven
completed UTC days, excluding today. Omitting dates downloads the full historical
array and is unnecessary. There is no pagination parameter in the published schema.

Each JSON array row contains `chute_id`, `name`, `date`, `total_requests`,
`total_input_tokens`, `total_output_tokens`, `average_tps`, `average_ttft`.
Keep chute/date identity; `[private]` is a redacted name, not one shared model.
The collector keeps published aggregate counters, never private invocation content.

```js
import { parseChutesUsage, completedWeek } from './lib/chutes-efficiency.mjs';
const window = completedWeek();
const url = `https://api.chutes.ai/invocations/stats/llm?${new URLSearchParams(window)}`;
const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const result = parseChutesUsage(await response.json(), window);
// result.input_output_ratio = sum(input tokens) / sum(output tokens)
// over rows where both counters are positive; NOT mean(per-chute ratios).
```

The endpoint now aggregates `usage_data`, which includes zero-token usage as well
as LLMs. Exclude rows lacking positive input AND output from the ratio; record all
returned/included/excluded row counts. Retain anonymized token-positive aggregates.
Source implementation: [get_llm_stats, pinned September 2026](https://github.com/chutesai/chutes-api/blob/756b0f5845c2db09e961dec365356ad893b8e582/api/invocation/router.py#L232).
Date filtering is inclusive and performed on a cached, unpaginated array.

Validate the complete JSON response, required types, nonnegative safe-integer
counters, unique `(chute_id,date)` keys, no out-of-window rows, and positive token
observations for every requested day. Empty cache, missing days, malformed JSON,
duplicate identities, invalid counters or HTTP failures must preserve the previous
snapshot and exit nonzero. The API supplies no independent expected row count;
date/type/identity checks cannot prove upstream telemetry completeness. Do not
claim otherwise. Keep response SHA-256, exact URL, collection timestamp and window.

Raw Chutes counters have `basis: self_reported`; the ratio has `basis: derived`.
Applying this ratio to another model is `basis: assumed`, with the global evidence
reference and fallback flag. It represents Chutes traffic, not an isolated coding
agent cohort. First attempt OpenRouter per-model workload data; AA Intelligence
Index token budgets remain benchmark proxies/cross-checks, not user workload data.

Verification: `node --test test/chutes-efficiency.test.mjs`, then the live collector.
Recompute totals from included raw rows; confirm seven dates and the actual window.
Installation to all Sandy runtimes is handled in rebuild phase 09; the WSL machine
remains a documented gap (see skills-install receipt).
