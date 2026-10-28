# JevBench v1.7.16 candidate (Strike-1 on the 27 Oct draw, UNRANKED + same-items cost rule on that draw) — review pending

Stacked on the flipped, sealed v1.7.15 (`ba210893` = origin/main with the v1.7.15 merge, review PASS). The 27 Oct draw
`v1.6-regular-20261027` stays **not equated** (status `anchor-runs-pending`, offset 0; decision `d1027-strong-anchors-needed`), so all
of its rows stay measured-but-unranked. Two changes:

1. **New row `strike-1`** — "Strike-1", hosted decision API (provider Strike, EU, OVH Gravelines), all 1,500 items sent: 1,495 answered
   (HTTP 200, served model `strike-1`, native probabilities, 0 output tokens), 5 refused over the provider's input limit (8,192 tokens /
   32,000 characters; the 5 longest items) and scored as misses in the denominator. Raw `4c6c7ab2…`, CONSUMED receipt `497dfbd9…`.
   Cost: the vendor's stated base `Qwen/Qwen3.5-4B` through the frozen `pricing_v15.reference()` (module `645fd82e…`) =
   `deepinfra:Qwen/Qwen3.5-4B` 0.03/0.15, input = vendor usage, output = the vendor's reported 0 (9 Oct zero-output rule), kind
   estimate. `ranked: false`, null ranks, listing `unranked`, the d1027 note, in no order list. Disclosed: hosted EU, the 5 refusals,
   output 0, vendor-stated base (weights not published), beta with probabilities uncalibrated during beta (vendor statement).
2. **Same-items cost rule draw-wide on d1027** (v1.6.30 precedent on `v1.6-regular-20261012`, scorer flag `--cost-basis`). Strike-1
   refuses the 5 longest items and Microsoft-Decision-1 r2 ran on 1,493 items, so every d1027 row is costed on the **common answered set**:
   the items answered (HTTP 200, ok, no error) by all 8 rows = **1,489 items**, set sha256 `4e912731…` (sha256 of the sorted opaque id
   list as compact JSON; ids private). 11 items left out of cost for every row (5 = strike-1's refusals, also outside Microsoft's
   answered set; 6 = Microsoft-only: not sent or refused). Each row keeps its own price reference and token basis: raw usage for
   Torchcast/Elf/Jeff×2/Microsoft/strike-1; H2O processed tokens (no common item is trimmed, so processed = usage there); Decisio the
   engine recount (common-set engine count exact to within 6 tokens, disclosed). Only `cost`, `axes.cost`, `scores`, `views`,
   `jevbench_score`, `composite_ci95`, `v16.ci95.composite` move (Microsoft r2 also its disclosure ITEMS sentence), each pinned
   before/after (proof `exceptions`, loader `V1716_REPRICED`); Intelligence, Calibration, Speed, Capability, cells, ranks, listing and
   notes are byte-equal. Basis text: "Cost on the 1,489 items every row on this draw answered (same-items rule); all-items cost USD x per
   1,000 decisions."

| row | USD/1k all items (v1.7.15) | USD/1k common 1,489 (v1.7.16) | Cost axis | A |
|---|---|---|---|---|
| arcbright-elf-1-12b-r2 | 0.020511 | 0.019542 | 60.64 → 61.27 | 75.43 → 75.67 |
| decisio-gemma-4-12b-tuned-commit-think | 0.029046 | 0.021616 | 56.11 → 59.96 | 73.11 → 74.68 |
| h2o-lightning-4b-v1.4.1 | 0.014370 | 0.011187 | 65.28 → 68.54 | 75.98 → 77.04 |
| jeff_1_1_large | 0.042161 | 0.040568 | 51.25 → 51.75 | 71.34 → 71.58 |
| jeff_1_1_qwen_4b | 0.019557 | 0.019005 | 61.26 → 61.63 | 73.09 → 73.22 |
| microsoft-decision-1-r2 | 0.013138 (1,493) | 0.013173 | 66.44 → 66.41 | 76.99 → 76.98 |
| torchcast-decision-31b-v1.0 | 0.038716 | 0.033896 | 52.36 → 54.10 | 76.38 → 77.28 |
| strike-1 (new) | 0.033853 | 0.033990 | 54.06 | 51.81 |

Every other v1.7.15 row is equal in every field, ranks included; the board and every order list equal v1.7.15's; carry/history bytes are
copied. Draw table: only `releases` += v1.7.16 and `latest_release` v1.7.16. Top fives v1.7.15 → v1.7.16: 0 of 580 lists, 0 of 171
slider states, 0 of 368 grid states, custom weightings unchanged (`receipts/topfive-diff.json`). Approval: standing GO (no top-five
change); no fairness receipt is bound (no row enters a ranking).

Scoring (job dir `r197/v1716/score`, copies of the aggregate-only scripts in `scoring/`): `common_set_v1716.py` (common set + the
private cost-basis files) → `build_fields_v1716.py` (four fields = the cohorts that produced the published values: f13 H2O, f14 the five
v1.7.14 rows, fms Microsoft r2 on its 1,493-item view, fst strike-1) → `run_scores_v1716.sh` (score_v16 02132271 / score_v17 6363458d,
B 1000, seed 16, O1S, fixed reference G_med 2.573387642438244, 10 s share, `--cost-basis`) → `compare_fields_v1716.py`
(`scoring/FIELD-DIFF.json`: only cost-dependent paths differ from the old fields) → `cells_v1716.sh` (strike-1 cells; f14 cells equal to
v1.7.14's).

Reproduce: `python3 -B prepare_v1716.py` → `bash compare_v1716.sh` → `bash run-gates.sh` (`RUN_BUILD=1`, `RUN_FULL_SUITE=1`; heavy runs
via suite-slot) → `python3 -B collect_gates_v1716.py`. Post-flip checks swap the synthetic PASS manifest listed in `.pass/SWAP-FILES.txt`
into the worktree and restore it byte-equal; synthetic receipts confer no authority. Topics: the draw has no topic labels; one more
TEMPORARY entry in `data/jevbench-breakdown-exceptions.json` (in the PENDING tree the breakdown gate reports it as orphaned; post-flip it
passes).

Preview: `preview/index.html`, `preview/card.png` (`preview_v1716.py --publication-status pending|published`).
