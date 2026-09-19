## CR-20260919 (JevBench v1.1) — Main Score, three sub-benchmarks, easy tier, Needle 3 → follow-up to CR-84

Florian, 19 Sep 2026 ~07:20 UTC, verbatim:

> Regarding Needle vs Jev and the Jev benchmark: [...] Would it make sense to add a few simpler tasks to the benchmark so that Needle also at least can solve a few of the Jev Benchmark tasks and doesn't land at a 0% score? I reckon it would be unfair to rate it as 0 because almost certainly some other Jev lookalike projects will be even worse and thus should end up with a lower score than Needle 3.

Florian, 19 Sep 2026 ~07:35 UTC, verbatim (German):

> Zu Jev Bench: Wir brauchen ganz klar nicht nur capability (Accuracy) sondern auch Speed und Cost als Achsen des Benchmarks, alles drei sollten sub-benchmarks des JevBench sein und der JevBench Main Score ist dann ein Composite Score der all diese Faktoren kombiniert.

**This supersedes one point of CR-84:** CR-84's file said "five axes, no combined winner". Florian
has now decided the opposite for the headline: JevBench has **one Main Score**, a documented
composite of three sub-benchmarks. The sub-scores stay visible and sortable, so the trade-off is
not hidden. Everything else in CR-84 (own benchmark said in the lead, no invented numbers,
availability rows outside the ranking) still holds.

**The measurement is done.** v1.1 = v1.0's 242 decisions (unchanged) + a new 72-decision easy tier,
11 systems, measured 19 Sep 2026. Nothing here asks the loop to run a model.

Delivered next to this file (`ops/ux-2026-09-12/jevbench/v1.1/`):

| File | What it is |
|---|---|
| `jevbench-v1.1-results.json` | Publication-safe artifact (aggregates only). Suggested home: `data/raw/benchmarks/jevbench/v1.1/jevbench-v1.1-results.json` |
| `PAGE-COPY-v1.1.md` | Ready English copy for the new sections |
| `charts/` | Reference renderings (main score, sub-benchmarks, tiers, sensitivity) - layout reference only; the page draws its own from the JSON |
| `registry-entry-v1.1.json` | `jevbench::v1.1` registry entry |

### What the page needs

1. **Main Score first.** Default sort of the `/jev-models` table = `main_score` desc. Columns:
   Main, Capability, Speed, Cost, then Easy / Standard / Judge tier accuracy, p50 / p95 latency,
   $ per 1,000 decisions. All sortable, nulls last in both directions.
2. **The formula on the page, in words, next to the table:** "Main Score = 0.6 x Capability + 0.2 x
   Speed + 0.2 x Cost", with the normalisation (`scoring.*` strings in the JSON are the approved text).
3. **Sensitivity table** (`systems[].rank_under`, `systems[].sensitivity`, `sensitivity_weightings`):
   rank and score under the six weightings; highlight cells whose rank differs from the headline.
4. **Estimated costs are visibly estimates:** `cost.kind == "estimate"` renders with a "~" and an
   "est." tag and `cost.basis` as the tooltip/footnote. `kind == "unknown"` renders "no tariff", never
   $0.00.
5. **Needle 3 rows:** `has_distribution == false` → the calibration cells read "no calibrated
   distribution", never blank and never 0. The "options as tools" mode is a separate, asterisked row
   with its note (`systems[].note`).
6. **Partial runs** (`ranked == false`): shown below the ranked rows, hatched/greyed, no rank number,
   with the reason.
7. **Version:** the page shows v1.1 by default and links v1.0 (`jevbench-v1-results.json` stays as
   published). Never mix v1.0 and v1.1 numbers in one column.

### Acceptance

- Every number on the page is read from the JSON; a reviewer can pick any row and recompute its Main
  Score from `capability.score`, `speed.score`, `cost.score` with the published weights.
- No `$0.00` and no blank calibration cell anywhere.
- The sensitivity table exists and matches `rank_under`.
- Mobile: the table scrolls horizontally with the system name column pinned (per the 15 Sep mobile directive).

Registry: `jevbench::v1.1`, category `Other` (same as v1). Source: https://github.com/fstandhartinger/jevbench (tag `v1.1`).
