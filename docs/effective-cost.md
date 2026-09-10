# Effective costs (phase 03)

The default comparison is **modeled USD per task**, not an observed invoice or cost per successful solution. `lib/effective-cost.mjs` is pure arithmetic; `lib/cost.ts` selects the exact model/variant and provider route, attaches provenance, and applies the shared filters. Results are computed from the dataset in the client, not baked into the raw API price fields.

For prices in USD per million tokens:

```
I = output_tokens_per_task × input_output_ratio
USD/task = (I × (1 − hit) × input_price
          + I × hit × cache_read_price
          + additional_cache_write_tokens × cache_write_price
          + output_tokens_per_task × output_price) / 1,000,000
```

Output includes answer and reasoning tokens. AA measurements remain attached to their exact UUID/slug and effort; no family-level token imputation is performed. The I/O ratio uses OpenRouter's general model traffic across all apps and reasoning configurations, then Chutes' global usage. These populations are proxies for coding-agent workloads, not measurements of Claude Code, Codex or opencode task bills. Task aggregates can span many API calls; aggregate input tokens are not a single request's context size.

The explainer also provides `USD/task ÷ (I + output) × 1,000,000`, an equivalent for that model's own token mix. This is **not** the ranking metric: dividing by each model's own token count would cancel output verbosity. Both values have distinct units.

## Degradation policy

Every fallback appears in `assumptions` and the price dialog. Non-finite, negative and nonnumeric values are invalid; observed zeros remain zero for prices, hit rate and I/O ratio. Output/task must be positive.

| Input | Preference / fallback |
| --- | --- |
| Output tokens/task | Exact AA task-output observation. Otherwise **1,000 output tokens/task**, an explicit illustrative unit scenario, not an empirical estimate of the missing model's task length. Such costs are particularly uncertain and can understate long reasoning workloads. |
| I/O ratio | Usable per-model OpenRouter observation; otherwise the collected Chutes global ratio, flagged as assigned/assumed. If those are missing or marked stale, a valid AA benchmark ratio is a labelled benchmark proxy; last resort **10:1**, an explicit scenario constant. |
| Input/output list prices | If exactly one rate is missing, substitute the published counterpart, visibly assumed (legacy fixed-blend behavior). If both are missing, return unavailable, never free. |
| Cache-hit rate | Exact OpenRouter SKU + endpoint tag + provider identity, with ambiguous/conflicting/stale observations rejected. Direct provider offers cannot borrow an OpenRouter cache rate. Otherwise **0%**, with no discount credited. |
| Cache read price | Exact offer's rate; missing/invalid → regular input rate, so no unsupported discount. |
| Additional write volume | Not published in the collected data → **0 additional tokens**, explicitly excluding additional write charges. The pure engine supports an explicit nonnegative quantity. |
| Cache write price | Exact offer's rate; missing/invalid → regular input rate, charged only when additional write tokens are supplied. |
| Overflow | Return unavailable and flag it. No Infinity/NaN bargain. |

The endpoint `cacheHitRate` source does not publish its denominator or precise summary interval. Applying it to input tokens is an **assumption**, shown even for an observed fraction. This limitation prevents claims that endpoint cache behavior is a controlled provider comparison.

Cache-write semantics follow the commissioned additive formula. `cache_write_tokens` means **additional billed tokens not already counted in I**, not every cache miss. Never pass cache creations already included in I at the full write tariff without first removing their base-input charge (or supplying only the incremental write surcharge). There is no inferred write volume. Storage/TTL fees, tools, retries, context-tier transitions, taxes and non-token products are outside the estimate. Provider cache rules differ; see [OpenRouter's caching documentation](https://openrouter.ai/docs/guides/best-practices/prompt-caching).

## UI and persistence

Adjusted mode is on for new users and after the settings key changes from `mmc.settings.v5` to `mmc.settings.v6`. Raw list mode uses the fixed blend selected globally. Scenarios include output-only, 1:1, 3:1, 10:1, 100:1 and input-only. Selecting a fixed blend selects raw mode; toggling adjusted back on preserves that blend for later. Raw I/O columns and subscription/legacy per-request products remain explicitly separate units.

The model explorer defaults to ascending selected cost and shares the benchmark/minimum-score controls. In adjusted mode its “Measured task tokens only” filter starts on, so a model with an assumed 1,000-token task cannot appear to beat a measured long reasoning task by default. Turning it off restores all eligible assumed costs, labelled “assumed task”. This filter has no effect on raw fixed blends. Each underlined price opens a native keyboard/touch-accessible dialog with token/task inputs, rates, formula terms, provenance and all assumptions. Price comparisons use the same route eligibility and provider deduplication as before: EU/TEE checks happen per offer; health precedes representative-route selection; AA reference prices are allowed only without a restrictive provider/region/TEE filter.

The minimum-score screen ranks the currently eligible models and selected family representatives. It is not a claim that estimated workloads are comparable to fully measured workloads, or that benchmark score is a success probability. Missing task data must stay visibly assumed.

## Source consistency repair

The September 10 sanity check found a legacy manual override changing the **OpenRouter** GPT-5.6 Sol `openai` route to first-party $4/$20 while leaving the endpoint's $0.20 cached-input rate intact. The current [public endpoint API](https://openrouter.ai/api/v1/models/openai/gpt-5.6-sol/endpoints) explicitly publishes $2/$10 with $0.20 cache read for that route. The override was retired, with history retained in `data/raw/manual.json`; all three meters now describe the same offer. This does not alter any native first-party offer. Nonstandard flex/batch tiers stay excluded by the existing ingest policy.

## Five-model reality check — September 10, 2026

Exact variants; default exclusion of Chinese inference providers, all regions. Independent Python arithmetic agrees with the JS dollar terms within 1e-12 relative tolerance. AA task fields and OpenRouter ratios/cache summaries were checked against phase-02 archived primary extracts from today; the three winning OpenRouter endpoint tariffs were fetched again, and the Google global Standard table was opened and archived today. See `ops/rebuild-2026-09/evidence/phase-03-five-model-checks.json` and `phase-03-google-source.json` for exact inputs, original source IDs/URLs/hashes and arithmetic receipts.

| Model/effort | AA output tokens/task | Usage I:O | Hit applied | Winning route | Modeled USD/task |
| --- | ---: | ---: | ---: | --- | ---: |
| DeepSeek V4 Pro / max | 48,896.33 | 20.810:1¹ | 0%² | DigitalOcean via OpenRouter | 0.970328 |
| GPT-5.6 Sol / max | 29,309.37 | 81.096:1 | 89.84% | OpenAI via OpenRouter | 1.203159 |
| Kimi K3 / max | 48,455.23 | 67.910:1 | 94.14% | Sail Research via OpenRouter | 2.029332 |
| Gemini 3.5 Flash / high | 54,642.77 | 20.810:1¹ | 0%² | Google Vertex AI | 2.197448 |
| Claude Sonnet 5 / max | 117,787.32 | 54.938:1 | 0%² | Google Vertex AI (tied) | 14.119974 |

¹ Assigned Chutes global fallback, not observed usage for that model. ² Assumed zero because an exact, usable hit statistic is absent; not evidence that the provider cannot cache. All rows assume zero additional cache-write volume. Prices are scenario estimates, not invoice predictions.

1. **DeepSeek:** low published $0.87/$1.74 input/output tariffs explain the cheapest result, even without a cache discount. AA Intelligence 30.9 means it does not satisfy an illustrative minimum of 40. Cost and capability are separate filters.
2. **GPT:** the mixed-tariff bug above was fixed before accepting this result. Its 29.3k output tokens and observed caching make the estimate much lower than the same route's no-cache scenario ($5.046861). Among these five configurations with AA Intelligence ≥40, it is the cheapest; this is not a claim about every model in the catalog.
3. **Kimi:** its 48.5k output tokens and 67.9:1 usage mix make the no-cache scenario $9.185441, but Sail Research's exact endpoint has a 94.14% published hit fraction. That provider wins the adjusted ranking even though a different provider has a lower raw blend. The endpoint identity and both price meters were verified independently.
4. **Gemini:** the $2.197448 result uses the official $1.50/$9 global Standard tariff and Chutes ratio. The official page lists $0.15 cache reads, but our direct route lacks observed hit volume, so the model earns no discount. Being above Kimi is a conservative coverage effect; it does not establish that Gemini is more expensive on a cache-heavy real application.
5. **Sonnet:** max effort's 117.8k output measurement and 54.9:1 ratio imply 6.47M aggregate input tokens/task. At $2/$10 with no observed cache hits this explains the large estimate; the source and decimal units agree. The official table supports $0.20 cache reads, but a zero-hit fallback means we cannot credit them. Lower efforts have separate, much smaller measured token totals. This is a workload/coverage limitation, not a universal claim about Sonnet's economics.

None of these five uses the 1,000-output-token fallback. The unmeasured-token fallback is an illustrative scenario and is unsuitable as evidence of superiority over a model with measured long reasoning tasks. Every use remains labelled `est.` with its assumptions.
