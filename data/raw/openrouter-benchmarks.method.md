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

---

## 2026-09-16 — ingestion of the own-run rows (CR-34.2 / CR-34.3)

The own-run call is now `GET /api/v1/benchmarks?source=openrouter&include_run_config=true` and its
rows are kept separately as `own_data`. `include_run_config` is documented for the search
benchmarks and publishes the lane each row ran in (`max_agent_turns`, `reasoning_effort`,
`temperature`).

**Registry.** Six score boards and six cost boards, all `snapshot-2026-09-15`:
`openrouter-gpqa-diamond`, `openrouter-tau2-bench-airline`, `openrouter-search-browsecomp`,
`openrouter-search-dsqa`, `openrouter-search-hle`, `openrouter-search-widesearch`, each with a
`…-cost` twin in category `Efficiency`. OpenRouter's GPQA Diamond and τ²-Bench runs are **separate
registry identities** from Artificial Analysis' same-named boards and are never merged with them.

**Identity.** `model_permaslug` is an exact OpenRouter model id and resolves to a catalog family
through the OpenRouter offers the catalog already carries (`or_canonical_slug` / `or_model_id`);
a slug two families claim, or a slug with no OpenRouter offer, joins nothing.
- GPQA Diamond and τ²-Bench rows state **no** reasoning effort. They are family-scoped evidence and
  attach exactly once to the deterministic family representative (`lib/family-representative.mjs`),
  with a protocol note saying so — the same rule as Epoch ECI and DesignArena.
- Search rows state the effort. It must exist as a catalog configuration; otherwise the row stays
  unjoined. No effort is ever guessed or mapped onto a neighbouring one.
- When several permaslugs of one family publish the same board, the newest `last_run_timestamp`
  represents the family; an exact tie represents nothing.

**Values.** `accuracy` / `primary_score` are stored as fractions in 0–1. `accuracy_stddev` and
`total_tasks` travel with the observation and are shown beside the value. `avg_cost_per_task` is a
**separate USD observation** on the `-cost` board, displayed as "measured by OpenRouter" — it is a
cost signal beside the score, never an input to Benchmark Heaven's adjusted cost model, and cost
boards are excluded from the "#benchmarks" count (`coverage.capability_available`).

**Freshness.** Ingestion reads the locked capture
(`data/raw/benchmarks/daily-evidence/2026-09-15-openrouter-benchmarks/…gz`), not the daily-refreshed
live snapshot, so a dated registry identity and its bytes stay the same pair. The daily collector
keeps refreshing `data/raw/openrouter-benchmarks.json` and reports capture drift as
`openrouter-benchmarks: source_changed_retained`, parking that day's capture in the run's evidence
folder for a reviewed version rotation.
