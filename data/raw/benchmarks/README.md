# Benchmark discovery registry

Phase 04 records identities and publication routes. `registry.json` is the accepted
catalog; `exclusions.json` records rejected, superseded and non-benchmark candidates.
`aa-observed-fields.json` preserves raw AA observations for phase 05. Phase 05 adds sourced versioned scores through `scores.json`; these files never change the Composite.

## Identity and evidence

`id` is exactly `family::version`. Never join on family alone. Published versions are
literal source versions; `snapshot-2026-09-10` means no public version was verified and
freezes the observed protocol. It is not an invented release number. Verify task set,
split, harness, judge, metric, language and reasoning effort before importing later
results. A changed protocol needs a new identity, including changes within a release.
Separate implementations have separate families, such as official HLE and AA text-only
HLE. ARC generations remain separate because their continuing boards measure different
tasks; none of their scores is interchangeable.

Entries include an English description, category, maintainer, native metric/direction,
publication URLs, command and extraction locator, version guard, cadence, saturation
decision and hashed source evidence. Null bounds mean unverified bounds. A null score
direction denotes task-specific suite metrics. Private tasks or weights stay explicitly
private. A false saturation flag with an uncertainty note does not assert headroom.

Cadence separates a maintainer promise from our proposed check frequency. Commands
capture sources or read dated evidence; they are not unattended parsers. Check robots
and the shared source cooldown, stop on restrictions/challenges, and verify the protocol
before accepting data. X uses existing desktop Chrome, shared locks and `xplainervideo`
only, at modest pace. Grok supplies leads only. Never execute downloaded source code.

## AA free wins

The model page contains 646 exact source identities and 31 inventoried fields. There
are 26 numeric fields and 6,956 scalar observations, including cost and a derived index
input; this is **not** a count of accepted benchmark scores. The registry maps 25
headline fields, including `briefcaseBreakdown.overall.elo`. Zero, null, negative values,
structured breakdowns and absence are preserved distinctly. Cost, `gdpvalNormalized`,
telemetry and auxiliary breakdowns are not additional benchmarks; see the exclusions.

Reuse the response already obtained for AA efficiency collection:

```bash
node scripts/extract-aa-benchmark-fields.mjs MODEL_PAGE.html SOURCE_RECEIPT.json
node scripts/validate-benchmark-registry.mjs
```

The receipt contains the actual URL, `fetched_at`, HTTP `status: 200` and response
`sha256`. The extractor validates provenance, model coverage, variants, scalar types,
conflicting duplicates and field continuity before an atomic write. Coverage reduction
requires manual source review. It makes no network call. Scheduled score ingestion and
daily orchestration belong to later phases; phase 04 installs no new cron job.

Coding Agent Index **1.4 and 1.5 are separate**. The legacy file retains its 2026-09-09
date and feeds the existing Composite. The current collector remains
`node scripts/fetch-aa-coding-agents.mjs`. Registry evidence uses immutable copies so
normal live v1.5 refreshes cannot invalidate historical evidence. AA LiveCodeBench's
historical task window remains unknown: its version guard prohibits comparable score
ingestion until that window is resolved.

## Coverage

The B2 sweep covers SimpleBench, EQ-Bench suites, UGI, WeirdML, Vending-Bench, Aider,
LiveBench, ARC-AGI, SWE-bench variants, Terminal-Bench, tau, Omniscience, CritPt, MLCR and
ITBench. Original GDPval, Fiction.liveBench's result image, Caliper and Boson's RPBench
remain excluded where verification failed. Further discoveries include independent
writing/slop boards, roleplay forks, RULER, HELMET, LongBench and mathematical OTIS Mock
AIME. The exclusions retain older versions and unverified leads with their reasons.

Primary receipts, compressed responses, readable extracts, X captures, worker identities
and frozen critic packets are in `ops/rebuild-2026-09/evidence/phase-04/`. The phase
report records final coverage and checks. Dataset builds validate the registry and source
hashes without fetching websites or executing recipes.

## Score ingestion (phase 05)

`collection-plan.json` defines executable parsers for supported public sources and
precise recipes for the remainder. `public-observations.json` and `vendor-candidates.json`
feed `scripts/ingest-benchmark-scores.mjs`; `ingestion-lock.json` binds the AA captures.
`scores.json` is the accepted combined snapshot. Every self-report is fingerprinted
in `score-approvals.json` against a different-family critic receipt. Dataset and
production builds verify source completeness and hashes.

Use [the daily workflow](../../../docs/benchmark-ingestion.md), including exact adapters,
manual recipes, missing-state semantics and compatibility requirements for divergences.
Unverified LiveCodeBench task windows, HLE README sample output and OTIS historical
grading are withheld. Current model coverage never counts unmatched source identities.
