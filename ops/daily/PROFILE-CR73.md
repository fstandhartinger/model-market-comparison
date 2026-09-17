# CR-73.1 — where the daily run spends its time, and the target that follows

Florian, 17 Sep 2026: *"Kann man den Mechanismus effizienter machen?"* — CR-20260917g asks for a
profiler first and a documented, evidence-based target **before** anything about the schedule or
the guarantees is touched. This is that profile. Nothing here is estimated from a log message:
every number comes from `reports/run-report.json` and the worker receipts of the run named below,
read by `ops/daily/profile-run.mjs` (unit tests: `test/cr-73-profile-run.test.mjs`).

## How it is measured

    node ops/daily/profile-run.mjs <runDir> --json out.json --markdown out.md

* **Wall clock** = the run's own `started_at` → `finished_at`. The profile always states how much
  of it the steps account for and how much is left over, so nothing can hide between stages.
* **Worker time** = the receipts' `started_at` → `finished_at`, i.e. what the pipeline waited for,
  not what a provider billed. *Serial* is the sum of the calls, *elapsed* the union of their
  spans; `serial / elapsed` is the concurrency the run actually achieved.
* **Attribution** puts a call in the stage that was running when it started. Runs from `d35fb97`
  (17 Sep, 18:45 UTC) on record a start and end per step (`daily.mjs`); earlier runs, and the gate
  stages that report only a duration, are laid end to end from the run's start and marked
  `reconstructed`, so a reconstructed attribution is never read as a measurement.
* Every run now writes `reports/profile.json` and a short `profile` block in its run report, so the
  next change to the pipeline can be compared against the run before it (CR-73 verbatim: "Record
  per-stage and per-source timing, cache hit/miss, retry, model/cost and critical-path data in
  every run report").

## Baseline — the successful run of 17 Sep 2026, 13:36 UTC

`/opt/benchmarkheaven-daily/runs/2026-09-17T13-36-31-109Z-1656939`, published `02bd947`,
exit 0, live readback OK. Full profile:
`/opt/benchmarkheaven/state/ux-evidence/cr73/baseline-20260917T1336.{json,md}`.

| | min | % of wall |
|---|---:|---:|
| **Wall clock** | **113.2** | 100 |
| `refresh-benchmarks` | 71.1 | 62.8 |
| `review-live` | 34.6 | 30.5 |
| `fetch-or` | 1.6 | 1.4 |
| everything else (57 steps: clone, install, 20 catalog fetches, build, tests, typecheck, prerender, gate, commit, push) | 3.4 | 3.0 |
| outside any step | 2.6 | 2.3 |

**85.4 % of the run is one LLM call at a time.** 46 calls, 96.7 min of model time over 96.7 min of
clock — concurrency **1.00**: the run never had two workers in flight.

| Role | calls | min | failed |
|---|---:|---:|---:|
| critic | 24 | 90.9 | 4 |
| producer (`oneshot`) | 22 | 5.8 | 2 |

| Model | calls | min | failed | $ |
|---|---:|---:|---:|---:|
| `deepseek/deepseek-v4-flash-0731` | 18 | 82.8 | 3 | 0.0140 |
| `deepseek/deepseek-v4.1-flash` | 3 | 7.5 | 1 | 0.0271 |
| `moonshotai/Kimi-K3-TEE` (free, via the router) | 4 | 4.0 | 0 | 0.0000 |
| `z-ai/glm-5.3-flash` | 21 | 2.3 | 2 | 0.0183 |

Reported cost for the whole run: **$0.0594** (2 calls returned no charge). Cost is not the problem;
latency is.

### What the numbers say

1. **The critic chain is the run.** 24 critic calls take 90.9 min — 80 % of the wall clock. The
   producers that do the actual extraction take 5.8 min for almost the same number of calls.
2. **One model's latency dominates.** `deepseek-v4-flash-0731` averages 4.6 min per call and spends
   almost all of its output on reasoning tokens (8 000–11 700 reasoning vs ~200–500 answer tokens
   in the slowest calls), although the run asks for `effort: low` with `exclude: true`. The two
   slowest calls of the run are its two 10-minute timeouts.
3. **21.8 min bought nothing.** 6 calls returned no usable answer (2 timeouts, 4 malformed/empty),
   and each of them still blocked the chain for its full budget.
4. **Most model work re-checked unchanged data.** `refresh-benchmarks` ran 134 checks and accepted
   0 of 7 changed score rows; `review-live` accepted 6 contracts and retained 1. The sources that
   produced no change still cost 28 worker calls.
5. **The floor is 15 min** — the stages that make no worker call (5.0 min) plus the single longest
   call (10.0 min). That is an upper bound on what any change could save, not a promise.

## Targets

Derived from the baseline, not from a wish:

| Path | Target | Rationale |
|---|---|---|
| **Full run** | **p50 ≤ 45 min, p95 ≤ 60 min** (from 113 min) | The 46 calls fall into independent units (7 live contracts, ~10 benchmark sources, 7 score batches). At bounded concurrency 4 the 96.7 min of model time becomes ≈ 25 min of clock; plus 5 min of non-worker steps, 3 min unaccounted and headroom for retries ≈ 33 min measured-best-case. 45 min p50 keeps a wide margin for provider latency, 60 min p95 keeps the run inside the morning window even on a bad day. |
| **Per worker call** | **≤ 6 min — but only together with an immediate switch to another healthy critic** | Two calls hit the 10-min ceiling and returned nothing. A bare cap would be worse than the delay: the slowest *successful* call of this run took 8.3 min, and 180 s was already tried and reverted on 15 Sep because it aborted reviews that complete at 600 s (`ops/daily/gauntlet.mjs`). The budget only becomes safe when the unit can hand a timed-out call to the next healthy route inside its own retry budget (CR-73.3/73.4); a unit that still cannot be reviewed stays *withheld*, exactly as now. |
| **Retry waste** | **≤ 5 min per run** (from 21.8) | Follows from the per-call budget plus route health. |
| **Prices-only run** | **≤ 15 min** | The CR-66.7 scope skips both long stages; it must stay observably fast and is timed separately. First measurement: see below. |
| **Cache hit** | reported per source unit, never assumed | CR-73.2. A hit is only legitimate when the capture hash, the parser version and the contract version are all identical; anything else re-parses and re-reviews. |

**None of this may be bought by weakening the guarantees** (CR-20260917g, verbatim): no skipping of
changed data, no failed review counted as a pass, no lowered source-evidence requirement, no
publication of an unreviewed candidate. A withheld source stays visibly withheld. The hash-bound
publication gate (CR-66.2) and the independent-critic rule are unchanged.

### Order of work

1. **CR-73.3 (concurrency)** — the biggest measured lever (86.7 min of pure serialisation) and the
   one that does not touch what is reviewed, only how many reviews wait for each other.
2. **CR-73.4 (routes)** — a per-call budget and healthy-route preference; the free router already
   serves producers at 4 min for 4 calls, while the paid critic costs 82.8 min.
3. **CR-73.2 (reuse of unchanged units)** — the structural saving, and the one that needs the most
   care: hash + parser + contract version, invalidation, and provenance for every reuse.
4. **CR-73.5** — two consecutive unattended full runs and one changed-source run against the target,
   compared with an uncached baseline, verified by an engine that did not implement it.

## CR-73.3 — what was parallelised, and what stayed sequential (17 Sep 2026, iteration 99)

`ops/daily/concurrency.mjs` runs independent units with at most `BH_DAILY_CONCURRENCY` in flight
(default 4, range 1–8; `1` reproduces the previous strictly sequential run). It returns **one settled
result per input, indexed by input position**, so every decision the pipeline makes is taken afterwards,
in the original order. Nothing about *what* is reviewed changed.

| Unit | Where | Independent because |
|---|---|---|
| 7 live source contracts | `ops/daily/live-contracts.mjs` (extracted from `phase-step.mjs`) | one frozen packet and one `gauntlet/live-contract-<dataset>/` directory each; no unit reads another's files and none writes the staged checkout |
| score batches | `refresh-benchmarks.mjs` | disjoint row sets, one `gauntlet/scores-<n>/` directory each |
| vendor sources | `refresh-benchmarks.mjs` | one primary source, one packet file and one producer call each |
| AA field chunks | `refresh-benchmarks.mjs` | disjoint discovery rows, one artifact each |

Sequential on purpose: the public-recipe loop (its `python3 public-candidate.py` parses are local and
cheap, and each may trigger a protocol review that mutates the shared registry/protocol cache), the
protocol reviews themselves, the ingestion draft, build/test/typecheck/prerender and the publication gate.

**Guarantees kept, and how they are tested** (`test/cr-73-concurrency.test.mjs`, `test/cr-73-live-contracts.test.mjs`):

* *Deterministic aggregation.* The live-contract fixture makes the contracts finish in reverse manifest
  order; the aggregate at concurrency 4 is `JSON.stringify`-identical to the same run at concurrency 1,
  and the two withheld contracts are retained in manifest order — which matters, because
  `planRejectedContract` counts the retentions before it (CR-67.2, max 4).
* *Failure isolation.* A unit that throws (timeout, malformed packet) is recorded in place; siblings run
  to completion. The stage then fails on the **first** rejection in unit order, exactly where the
  sequential loop would have failed — never on whichever call happened to fail first.
* *Bounded queue.* At most `limit` lanes, pulled from an index cursor; the fixture asserts the peak.
* *No concurrent writes.* `onSettled` callbacks (the live gauntlet progress file) are chained, so two
  units can never write the same file at once, and the final file lists the contracts in manifest order.
* Everything a run withholds stays visibly withheld; the retention, deterministic-fallback and
  core-source-fails-closed paths are all exercised by the fixtures.

**Known trade-off, deliberately accepted:** worker-model exclusions (`unavailable-models.jsonl`) are
read when a call starts. Serially, a model that answers malformed twice is excluded before the next
call; with four lanes, up to four calls can still pick it before the exclusion lands. Each unit keeps
its own bounded retry budget and re-reads the exclusions on its next round, so this costs at most a
little extra retry time on a bad route — it can never accept an unreviewed row.

Expected effect on the baseline: 96.7 min of model time at concurrency 1.00 becomes ≈ 25 min of clock at
4 lanes. The measured result of the first run on this code is recorded below.

## Prices-only path — measured

    bash ops/daily/run.sh --dry-run --scope prices     # 17 Sep 2026, 18:46 UTC, rc 0

**2.4 min wall clock, 0 worker calls** — far inside the 15-minute budget
(`/opt/benchmarkheaven/state/ux-evidence/cr73/prices-dryrun-20260917.{json,md}`, run
`2026-09-17T18-46-25-382Z-3113883`, the first run whose steps carry their own clock: 0 reconstructed
steps, 1.9 % outside any step). The heaviest stages are `npm-build` 0.9 min, `typecheck` 0.3 min,
`fetch-or` 0.2 min, `npm-test` 0.2 min; `fetch-mistral-catalog` failed and kept its previous
snapshot, as it does in the full run. So the pipeline's own overhead — clone, install, fetch, build,
test, typecheck, prerender, gate — is about **2.5 minutes**. Everything above that in a full run is
model work.

### What the first attempt found instead

The prices dry run at 18:37 failed at `npm test` — and not because of the prices scope: a fresh
dataset build on main renamed `deepseek-v4-pro`, `deepseek-v4-flash`, `deepseek-v4-flash-vision`
and `k-exaone-2.0` to Artificial Analysis' new dated ids, which breaks seven tests. The 17 Sep
freeze of those ids held for exactly one build (`96745c3` explains and fixes it). Without that
find, the scheduled 05:17 run would have died at `npm test` and published nothing. A prices dry run
costs 2.5 minutes and exercises build + tests + typecheck + gate against the real captures — worth
running after any change that can affect identity or the dataset shape.
