# Lumina Bench ledger — discovery and provenance feed (CR-37.2, CR-38.4)

**What it is.** Lumina Bench (https://luminabench.com/) aggregates 435 benchmark families and 15,598 result
records (ledger generated 2026-09-01, methodology 2.3.0). It is an aggregator, so Benchmark Heaven uses it to
find benchmarks and to see where results come from — **no Lumina value reaches the dataset**. A family becomes
a board only through a collector for its primary evaluator (`data/raw/benchmarks/collection-plan.json`).

**Access.** `robots.txt`: `User-Agent: * Allow: /`. The ledger files under `/downloads/` are Lumina's published
exports. No site-wide data licence; Lumina's `/terms` (checked 2026-09-16) says: "These foundation-stage terms
are a product placeholder, not final legal terms." Its own per-source `licence` field is empty for 523 of 873
sources. One manifest request a day (21 KB); the definitions, results and sources tables (≈13 MB) only when
the manifest's `sourceDataHash` changes.

**Checks (fail closed, previous snapshot kept).** Manifest schema major version 1, `projection: public`, a
64-hex `sourceDataHash`, the three tables with the columns the feed reads and a sha256 per file. Each table's
bytes must hash to the manifest's value, its column list must equal the manifest's, and its row count must equal
`recordCount`. Every result must name a defined family; slugs must be unique; the family count may not shrink by
more than 10 %.

**What is kept.** Per family: slug, name, organisation, category, version, lifecycle, primary source URL and
Lumina's licence/redistribution fields for it, result and model counts, the newest `observedAt`, the cited hosts,
and the results counted by who the cited host is: `evaluator` (ran the benchmark on others' models), `vendor`
(a model developer about its own model), `aggregator`, or `estimated` (Lumina's own estimate — not a published
result). On a hash change, `last_change` lists added, removed and changed families.

**Classification.** `data/lumina-feed-policy.json` holds the reviewed host roles and the per-family decisions
(`in_registry` with the registry ids, `on_hold`, `excluded`, `planned`, or a reviewed `vendor_reported`). Every
other family is classified mechanically: `no_results`, `evaluator_result`, `vendor_reported`, `aggregator_only`.
A host role is a first cut: an evaluator's host can relay lab numbers (cybench.github.io links system cards;
`artificialanalysis.ai/models/…` pages show lab-reported values), so every `evaluator_result` family must be read
by hand and recorded before the snapshot is accepted. Until then the daily run writes the candidate to
`lumina-ledger.pending-review.json`, keeps the committed snapshot and reports a warning.

**First reading (2026-09-16, decisions reviewed by opencode-kimi, 6 corrections applied).** Of 435 families: 74
already in the registry, 16 planned collectors, 7 on hold (AA-derived, CR-35.3), 11 excluded (DesignArena expansion
CR-39.1, BenchLM's own composites and normalisations, Mercor APEX terms, saturated MATH-500), 99 without results,
64 vendor-reported only, 164 whose every cited value is an aggregator page or a Lumina estimate. 12,533 of 15,598 results cite benchlm.ai.

`node scripts/fetch-lumina-ledger.mjs --report` prints the current reading.
