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
* **Attribution** puts a call in the stage that was running when it started. Runs from 18 Sep on
  record a start and end per step (`daily.mjs`); before that the profiler lays the durations end to
  end from the run's start and marks those steps `reconstructed`.
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
| **Per worker call** | **≤ 6 min, retries included in the unit's budget** | Today two calls hit the 10-min ceiling and returned nothing. A tighter per-call budget with an immediate switch to the next healthy route cuts the 21.8 min of dead time without lowering the evidence bar — a unit that cannot be reviewed stays *withheld*, exactly as now. |
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

## Prices-only path

First measurement is recorded in
`/opt/benchmarkheaven/state/ux-evidence/cr73/prices-dryrun-20260917.md` (command, wall clock and
the profile of that run). The prices scope (CR-66.7) refreshes OpenRouter and the provider catalogs
and runs build, tests, typecheck, prerender and the gate — it makes no worker calls, so its time is
the pipeline's own overhead and the closest thing to a fixed cost the full run also carries.
