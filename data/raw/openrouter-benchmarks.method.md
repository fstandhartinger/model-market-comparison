# OpenRouter Benchmarks — collection method (CR-34.1)

**Source:** `GET https://openrouter.ai/api/v1/benchmarks` — OpenRouter's documented public API,
authenticated with the project's existing OpenRouter API key from the environment (never printed,
logged or committed). Contract per the API docs: 30 requests/minute per key, 500 requests/day per
account; this collector runs at most twice a day (`source=openrouter` + unfiltered).
`openrouter.ai/robots.txt` allows `/` except `/seo/`. This is the API's own documented access,
not site scraping.

**Contents (as of first collection, 2026-09-15):** 1,518 rows, 250 models across three sources:
- `openrouter` (268): OpenRouter's **own**, independent reproducible runs — `gpqa_diamond`
  (131 models), `tau_bench_verified_airline` (123), and the search benchmarks `search_browsecomp`,
  `search_dsqa`, `search_hle`, `search_widesearch` (2–4 rows each, labelled with their search
  engine and surface). Fields: accuracy/primary_score + stddev, `total_tasks`,
  **`avg_cost_per_task` (measured, USD)**, `avg_latency_per_task_ms`, `last_run_timestamp`.
  These values exist nowhere else — this is their primary source.
- `artificial-analysis` (148): intelligence/coding/agentic indices + pricing, **relayed from
  Artificial Analysis** — our primary source stays AA itself; these rows are cross-check
  context only. New AA-derived metrics are ON HOLD (CR-35.3) until Florian reports AA's answer.
- `design-arena` (1,102): Elo/win-rate per arena category, **relayed from DesignArena** — our
  primary source stays designarena.ai; these rows are cross-check context only.

**Terms evaluation (2026-09-15, before any value shipped):**
1. The benchmark webpage (`openrouter.ai/benchmarks`) carries no licence statement.
2. The API documentation (`/docs/api/api-reference/benchmarks/list-benchmarks`) defines
   `meta.citation` as, verbatim, **"Required attribution when republishing this data, or null
   when results span multiple sources (attribute each item individually by its `source`
   discriminator)"** — example: "Source: Artificial Analysis (artificialanalysis.ai) via
   OpenRouter (openrouter.ai/rankings)." Republishing with per-source attribution is the
   documented, intended mode for this endpoint's data.
3. OpenRouter's Terms prohibit "scripts, robots … to scrape or copy any information on the Site
   or the Services" and "developing a competing service". The first clause targets scraping the
   website; using the documented API under its published contract is not that. Benchmark Heaven
   is a benchmark/cost comparison site, not an inference router or marketplace — it is not the
   inference-service "competing service" the clause aims at. The relays rows of third parties:
   AA and DesignArena stay cross-check-only because their own primary sources already feed us.
4. Separately, the API's **Datasets** endpoints (usage rankings, not these) are explicitly
   "licensed under CC BY 4.0 … reuse and republish it … with attribution to OpenRouter" — the
   site clearly knows how to grant data licences where wanted; the benchmarks endpoint instead
   attaches its condition to the payload (`citation`).

**Decision (recorded in PROGRESS.md, flagged for Florian in X7):** ingest the `source=openrouter`
rows (OpenRouter's own runs) with the attribution "OpenRouter Benchmarks" linked to
https://openrouter.ai/benchmarks wherever they display; keep AA and DesignArena rows as
cross-check context only (their own primary sources stay primary; CR-34.4's Agentic Index is
ON HOLD under CR-35.3). Media benchmarks (Image, Video, CR-34.6): **not ingested** — the
product compares text-capability/cost benchmarks; a media score has no place in the current
taxonomy, composites or cost model. If Florian tells us OpenRouter objects, the daily step is
one fail-closed switch away from dropping the source.

**Fail-closed gates:** non-JSON, missing `meta.as_of`, a row without `model_permaslug`, an
unknown row source or `benchmark_type`, an implausible score, a duplicate identity, < 100
own-run rows or < 500 total rows each refuse the capture; the previous snapshot stays.
