---
name: maintain-benchmarkheaven-registry
description: Maintain Benchmark Heaven's versioned benchmark registry and ingest new benchmark scores with full provenance. Use when adding or updating a benchmark entry, ingesting leaderboard or vendor scores, pinning benchmark versions, or validating that no number reaches the dataset without a source, date and basis.
---

# Maintain the Benchmark Heaven benchmark registry

Benchmark Heaven is a live model/price database plus a provenance-first benchmark
collection. Repository root: `/opt/model-market-comparison`. The published dataset is
`data/dataset.json`; the benchmark registry and its source files live under
`data/raw/benchmarks/`.

## Where things live

| File / dir | Role |
|---|---|
| `data/raw/benchmarks/registry.json` | The 73-entry benchmark registry (identity, version, scoring, source, recipe). |
| `data/raw/benchmarks/collection-plan.json` | Per-benchmark raw URLs, parsers, selectors, scales, splits, version guards. |
| `data/raw/benchmarks/ingestion-lock.json` | Binds the exact reviewed source + field snapshot for AA extraction. |
| `data/raw/benchmarks/score-approvals.json` | Owner approvals for self-reported scores, bound to canonical SHA-256. |
| `data/raw/benchmarks/scores.json`, `public-observations.json`, `vendor-candidates.json` | Retained observations by provenance class. |
| `data/raw/benchmarks/exclusions.json`, `daily-checks.json` | Exclusion ledger and current checks (never redate retained rows). |
| `data/raw/benchmarks/daily-evidence/` | New source bytes and review artifacts per daily run. |
| `data/raw/benchmarks/aa-observed-fields.json` | Captured AA field snapshot used by the extraction lock. |

## The entry schema (registry.json)

Each `entries[]` item: `id`, `name`, `version`, `version_status`, `family`, `category`,
`one_sentence_description` (English), `scoring`, `maintainer`, `source_type`,
`primary_url`, `publication_urls[]`, `how_to_collect`, `update_cadence`, `saturated`,
`superseded_by`, `status`, `first_seen`, `last_verified`, `evidence`, plus `aa_field_map`
for AA-sourced fields. Every entry must stay fully populated. Version identity is the
join key format `family::version`, including dated identities (`name::snapshot-YYYY-MM-DD`)
where no release version exists.

## Provenance rules (non-negotiable)

- Every observation carries: exact source identity, optional catalog `model_id`, source
  effort/harness, numeric value, `basis`, protocol, an HTTPS `source_url`, original
  retrieval/publication dates, immutable file/hash and locator.
- `basis` is one of `measured` (evaluator-published), `self_reported` (vendor claim or
  unestablished independence), `derived` (scale conversion/reconstruction — also record
  `source_basis`, formula and inputs), `assumed` (explicitly flagged fallback).
- Never invent a number, source, URL or date. A missing value is `unknown`; `not_tested`
  and `not_published` require an explicit source statement about that model. An omitted
  leaderboard cell proves neither.
- Never rank across benchmark versions. A changed protocol/judge/harness needs a **new**
  registry identity. Terminal-Bench 4.0 ≠ 3.0; Coding Agent v1.4 stays frozen and v1.5
  is a separate identity.
- Self-reported rows need an owner acceptance in `score-approvals.json` bound to the
  whole observation's SHA-256 plus a hashed different-family critic output.
- Primary source first; secondary quotes and graph estimates are not measurements.
- Only the `xplainervideo` X account may be used for X interactions (shared locks, cooldown).

## Adding or updating a benchmark

1. Add/verify the `registry.json` entry (all fields, English one-sentence description,
   pinned version, primary URL, collection recipe). Cross-check `family::version` uniqueness.
2. Run `node scripts/validate-benchmark-registry.mjs`.
3. Capture the primary source:
   `python3 scripts/capture-benchmark-sources.py URL_LIST.json CAPTURE_DIR` (records
   robots/crawl delay, bounds time/size, hashes bytes, never executes downloaded JS).
4. For public boards, copy `collection-plan.json` to a candidate plan, replace source
   receipts with successful capture receipts, compare task set/split/harness/judge/metric
   against registry evidence, then:
   `python3 scripts/collect-public-benchmarks.py --plan CANDIDATE_PLAN.json CANDIDATE_RESULTS.json`.
5. Freeze candidates with real primary content + hashes and run a gauntlet critic round
   (see the `run-benchmarkheaven-gauntlet` skill). Drop unverifiable values and log them.
6. Inspect joins before binding approvals:
   `node scripts/ingest-benchmark-scores.mjs --draft`, then `npm run data:benchmarks`.
7. Rebuild and verify: `node scripts/build-dataset.mjs`, `npm test`,
   `npx tsc --noEmit -p .`. Preserve original dates for retained sources.

## Do not

- Do not edit `score-approvals.json` to "fix" a value: changing value, identity, source
  or protocol invalidates the approval — re-run review instead.
- Do not overwrite the retained v1.4 file/date, or redate retained observations.
- Do not write outside the repo, and never reference `/opt/benchmarkheaven*`.
