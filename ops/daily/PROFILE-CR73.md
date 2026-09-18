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

## CR-73.4 — which role the free route is spent on (18 Sep 2026, iteration 103)

The baseline above says the free route was barely used: 4 of 46 calls. The receipts say why, and the reason is not
availability.

| | calls | worker min | $ |
|---|---:|---:|---:|
| producer (`oneshot`) on paid `z-ai/glm-5.3-flash` | 18 | 1.9 | 0.0183 |
| producer on the free route `chutes/moonshotai/Kimi-K3-TEE` | 4 | 4.1 | 0 |
| critic on paid `deepseek/deepseek-v4-flash-0731` | 18 | 82.8 | 0.0140 |
| critic on paid `deepseek/deepseek-v4.1-flash` | 3 | 7.5 | 0.0271 |
| critic on paid `z-ai/glm-5.3-flash` | 3 | 0.5 | — |

**Not one critic call ran free**, and two independent mechanisms caused that:

1. **The free route was spent on the wrong role.** Kimi K3 (AA 43.8) is the only route that qualifies — Qwen3.8 27B
   tops out at 33.9 and Union Alpha has no AA index — and a critic must be a different vendor family than *every*
   producer. So the route can serve one role per packet, and CR-66.3 offered it to the producer first. A producer call
   costs ~0.1 min; a critic call on the paid chain costs ~4.6 min.
2. **One content failure in one role killed it for both.** `unavailable-models.jsonl` records the route excluded at
   13:47:22 with `Malformed producer audit row`. Every critic call after that timestamp — 20 of the 24 — went to the
   paid chain, because the exclusion list is keyed by model id alone.

### What changed

* **The free route is reserved for the critic** (`freeRouteRole`, default `critic`, in `worker-policy.mjs`;
  `selectProducerCritic` in `ops/daily/policy.mjs` names the same pair in the run report). A producer now sees the
  free routes **last** instead of first — ordered last, never removed: with no viable paid candidate a producer still
  takes the free route, so nothing the pipeline could do before is lost. `BH_WORKER_FREE_ROUTE_ROLE=any` restores the
  CR-66.3 order.
* **A content failure is scoped to the role that produced it**; a transport or health failure still excludes the route
  everywhere (`excludedWorkerModels(records, { role })` in `ops/daily/gauntlet.mjs`). A malformed producer audit is no
  evidence that a route cannot review. The three 300 s router timeouts that motivated CR-67.3 are transport failures
  and stay global, as do records with no role recorded (an older or truncated log never widens what is offered).
  CR-67.3's single strike for a free route and one retry for a paid one are unchanged *within* a role.
* **Receipts state route, attempt and cost.** Every worker receipt now carries `route`
  (`router:fw-kimi-k3` / `openrouter` / `opencode:chutes`), `attempt`, `free_route_role`, `free_routes_offered` and
  `excluded_models` next to `requested_model`, `actual_model` and `usage.cost`; the gauntlet receipts carry
  `requested_model`, `route`, `attempt` and `cost_usd` per round. A reader can now tell a free route that was **not
  offered** (unhealthy, unqualified, excluded) from one that was offered and **not taken** (reserved for the critic).

**Nothing about what is reviewed changed.** The different-family critic rule, the AA ≥ 34 qualification on the exact
variant, the health gate, the whitelist, the price ceiling and the fail-closed retry budget are untouched; a unit that
cannot be reviewed stays withheld.

**Expected effect, stated as a prediction and not as a result:** on the baseline's call mix the 24 critic calls move
from the paid chain (90.9 min, $0.041) to a route that answered 4 producer calls in 4.1 min, and the 22 producer calls
move to the paid pool (1.9 min for 18 calls, ~$0.02). Paid calls 42 → 22. The honest measurement of this is CR-73.5's
job — two consecutive unattended full runs and one changed-source run — not this section's.

**Fixtures** (`test/cr-73-free-routes.test.mjs`, 4 tests): role preference and the `any` override; the free route still
taken by a producer when no paid candidate is viable; role-scoped content failures vs global transport failures;
unhealthy, unqualified and unscored routes never treated as valid; and the real CLI against a mocked router plus
OpenRouter, asserting that the producer call goes to OpenRouter, the critic call to the router, and that both receipts
carry route, attempt and cost.

## CR-73.2 — what may be reused, and what may never be (18 Sep 2026, iteration 104)

Finding 4 of the baseline: *"Most model work re-checked unchanged data."* `refresh-benchmarks` ran
134 checks and accepted 0 of 7 changed score rows; `review-live` accepted 6 contracts and retained
1 — and the sources that produced no change still cost 28 of the run's 46 worker calls. Two paths
in the pipeline re-ask a question they have already had answered:

* the **seven live source contracts** are reviewed every day, whether or not a byte of the
  captured primary bodies moved (34.6 min of the baseline, 30.5 % of its wall clock);
* every **vendor source** is re-extracted by a producer even when its capture hash is yesterday's,
  and each extracted row then enters the score gauntlet as a "changed" row.

The public-recipe path has always done the opposite: an unchanged candidate is reported
`checked_unchanged` and its rows keep their values, dates and approvals. CR-73.2 gives the other
two paths the same discipline, with the evidence to back it.

### The rule

`ops/daily/reuse-cache.mjs` keeps an append-only log of **accepted** outcomes at
`<home>/state/reuse/reuse-cache.jsonl`, keyed by a fingerprint of everything the review reads.
A unit is reused only when **all** of this is true:

1. the fingerprint matches, and the fingerprint binds the *semantics*, not the packet bytes —
   the packet also carries timestamps, receipt paths and the execution report's run window, which
   differ on every run while saying nothing about the data;
2. the stored decision is `accepted` — a rejection, a withheld contract and an acceptance on the
   deterministic fallback (a reviewer that never answered) are **never** stored, so they are always
   asked again;
3. the entry carries this module's `REUSE_CACHE_VERSION` and is younger than 30 days, because code
   the fingerprint does not bind (the gauntlet, the worker policy) does drift;
4. for a vendor source, the cached numbers are still **exactly** the ones the site publishes for
   those slots.

| Unit | Fingerprint binds | Invalidated by |
|---|---|---|
| live contract | the extraction contract (`RULES[dataset]`), the review criteria, the required row count, `sha256(ops/daily/review-live.mjs)`, the reviewed verifier section markers, `sha256(lib/aa-efficiency.mjs)` for `aa_efficiency`, the sorted capture hashes, a hash over **every** row's `(row_id, pointer, source url, source sha256, staged, extract)`, and the **reviewer code** — `gauntlet.mjs` + `live-contracts.mjs` + `worker-policy.mjs` | one byte of any capture, any staged value or primary extract, the contract, the criteria, the verifier, the parser, or the code that builds the packet, sets the round budget or picks the critic |
| vendor source | the capture sha256, the recipe name, `sha256(ops/daily/public-candidate.py)`, `sha256(VENDOR_EXTRACTION_TASK)`, the locked slot identities (`id`, `benchmark_id`, `subject`, `unit`, `protocol`) and the **reviewer code** (`gauntlet.mjs` + `worker-policy.mjs`) | a changed capture, recipe, local extraction parser, task text or worker/policy code, a changed/added/dropped slot — **and**, at hit time, any difference between the cached numbers and the published ones |

The reviewer code is in both keys because the answer is only as reusable as the question: the
packet builder, the round budget and the different-family rule all shape what a critic is shown and
by whom. Without it (`reviewerSource: null`) a unit gets **no fingerprint at all** and is always
reviewed fresh — not knowing which code asked must never mean reusing the answer.

The vendor `locator` is deliberately *not* in the key: it is written by the extraction, so it is an
output, not part of the question. A vendor hit writes nothing at all — the published rows keep
their values, sources, dates and approvals, and no derived score row enters the run's review set
for them, which is CR-73.2's "and their dependent derived rows" clause.

### What a reuse may never do

* **Never turn a withheld source into a fresh one.** Only the branch that follows a clean
  acceptance stores; retention, rejection and the deterministic fallback all leave before it.
* **Never store an unreviewed extraction.** A vendor unit is written to the log only after the
  score gauntlet has accepted **every** slot it produced. One quarantined row and the unit stores
  nothing, so the next run extracts it again.
* **Never treat a failure as a hit.** A missing, unreadable, corrupt, truncated, foreign-version or
  expired entry is a miss, counted in `reuse` in the run report.
* **Never hide.** Every hit appears in the run report (`reuse.reused_units`) and in the unit's own
  manifest with its fingerprint, the run and day the acceptance came from, and the capture hashes
  it was taken over. A reader can re-derive the fingerprint from the same inputs.
* **Never leak across a dry run.** A dry run may be running over an overlay of uncommitted work, so
  it reads and writes `<home>/state/reuse-dry` — an outcome accepted over an overlay can never be
  reused by a publishing run. Build, tests, typecheck, prerender and the gate get no reuse
  environment at all (`ISOLATED_STEP_UNSET`, CR-66.4's rule one entry wider).

### Measured: how often does a live contract actually repeat?

A reuse cache is only worth its risk if the units repeat, so this was measured before any claim was
made about it. `ops/daily/reuse-hitrate.mjs` recomputes the data half of the live-contract key from
the packets every run already stores (`review/packets/*.txt` carry the exact row objects) and
compares consecutive runs. Over the **nine consecutive run pairs** stored on 17–18 Sep
(`/opt/benchmarkheaven/state/ux-evidence/cr73-2/hitrate-20260918.json`):

| Contract | rows | byte-identical to the run before | why |
|---|---:|---:|---|
| `aa_coding_v15` | 15 | **4/9** | a board that only moves when AA publishes a new run |
| `aa_efficiency` | 156 | **4/9** | token counts per model; changes with an AA refresh |
| `chutes_efficiency` | 693 | **4/9** | daily aggregates; stable within a day |
| `aa` | 652 | **3/9** | the AA v2 API body; stable for hours at a time |
| `da` | 142 | **0/9** | DesignArena Elo — every duel moves it |
| `or` | 445 | **0/9** | OpenRouter catalog + endpoints: `uptime_last_30m` moves continuously |
| `or_efficiency` | 24 | **0/9** | `cacheHitRate` moves continuously |
| **total** | | **15/63 (24 %)** | |

Two things follow, and both are worth stating plainly rather than being discovered later:

1. **Three of the seven contracts will never be reusable, and should not be.** `da`, `or` and
   `or_efficiency` carry live telemetry — an Elo board, a 30-minute uptime figure, a rolling
   cache-hit rate. Two runs ten minutes apart differ in the captured bytes (`uptime_last_30m`
   99.828 → 99.818, `cacheHitRate` 0.5629 → 0.5624). That is a genuinely different body and a
   correct miss; no key design can or should change it.
2. **`aa` only became reusable at all once our own capture stamps left the key.** Before that fix
   it matched itself **0/9** times: every row embeds `source.fetched_at` and
   `extract.leaderboard_source.fetched_at`, which move on every fetch, while both `sha256` values
   were identical. `withoutCaptureStamps` drops exactly those three keys (`fetched_at`,
   `retrieved_at`, `collected_at`) and only inside an object that also carries a `sha256` — so a
   changed body is still a changed hash and still a miss, while "when we fetched" stops counting as
   "what we got". That one change took the largest contract from 0/9 to 3/9.

**So the honest expectation for the live-contract half is a partial saving, not the disappearance of
the stage:** on a quiet stretch up to four of the seven contract reviews are skipped; on a busy one,
none. The prediction that belongs in the ledger is "0–4 of 7 contracts, typically 1–2", not "the live
gauntlet becomes free".

### The vendor half looks like the better of the two

Measured from the committed history of `data/raw/benchmarks/vendor-candidates.json` (the only place
a vendor capture hash is retained across days) and from the stored run reports:

* Across the published snapshots since 10 Sep, **6/6** consecutive per-URL comparisons kept the same
  capture hash. The three vendor sources are a Hugging Face model card, a Mistral release post and an
  arXiv PDF — documents, not telemetry. Small sample, stated as such, but the direction is what the
  nature of these sources predicts.
* The cost they carry is not the extraction. In the 17 Sep 13:36 baseline **3 of the 7 score
  candidates were vendor rows**, and the run accepted **0** changed rows — i.e. the whole chain of
  producer, batch and different-family critic ran to confirm numbers that had not moved. In the
  18 Sep 00:40 run **8 of 17 candidates** were vendor rows, over 3 of the 9 score batches.
* A vendor hit removes the producer call *and* keeps those rows out of `changedIds`, so their score
  batches never form. On the 18 Sep call mix that is roughly 3 producer and 3 critic calls; at the
  baseline's 4.6 min average critic latency, of the order of **10–15 minutes** — larger than the
  live-contract half, from three sources rather than seven.

Both figures are estimates from stored reports and are labelled as such. CR-73.5's two consecutive
unattended runs are what turns them into a measurement.

### Status

**Off by default.** `BH_DAILY_REUSE=1` turns it on; unset, `0` or `false` reviews everything, and
an unusable value fails rather than guesses. The 18 Sep scheduled run is therefore byte-for-byte
the run it would have been without this change. Flipping the default belongs to CR-73.5, which is
the honest measurement: two consecutive unattended full runs and one changed-source run, compared
against the uncached baseline, verified by an engine that did not implement it. The first step is
one `bash ops/daily/run.sh --dry-run` with `BH_DAILY_REUSE=1` on two consecutive days (day one
fills the log, day two should report seven live-contract hits and no producer call for an unchanged
vendor source) — a dry run must not be started where it could still hold `state/run.lock` at
05:17 UTC.

Fixtures: `test/cr-73-reuse-cache.test.mjs` (18 tests) — key stability and every invalidation, the
opt-in flag, corrupt/unreadable/expired logs, "unchanged unit, same decision, no worker call",
"changed capture re-reviews exactly that unit", withheld and fallback contracts never becoming
reusable, and the vendor key/reusability rules.
