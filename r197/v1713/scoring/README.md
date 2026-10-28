# v1.7.13 Phase A — H2O-Lightning-4B v1.4.1 on v1.6-regular-20261027

Scripts: `build_field_h2o141.py` (hash pins, sealed input order, frozen pricing reference, registry), `run_scores_h2o141.sh`
(frozen v1.6 / v1.7 off / v1.7 share), `alt_gmed_check.py` (G_med evidence), `cells_h2o141.sh` (categories + noul decisive).
Outputs: `field/` (REGISTRY.json, ROWS.json, out-frozen, out-v17-off, out-v17-share, cells/{off,share}), `GMED-CHECK.json`.
The sealed raw is read in place via a symlink; nothing from it is copied or printed.

## Scoring choices (evidence)

1. **Scorer**: harness `score_v16.py` sha 02132271… (asserted in `run_scores_h2o141.sh`), `score_v17.py` 6363458d…; flags as
   `r196/score-iota03/run_scores.sh` (B 1000, seed 16, workers 3, `JEV_NOUL_METHOD=O1S`). v1.7 rule = `--decision-limit-s 10
   --timeout-treatment share` (`r160/scorer/score_v17.py:15`), as every v1.7.x row (`method.treatment = share` in the v1.7.12 results).
2. **G_med, one-row cohort on a fresh draw**: `--g-med-fixed 2.573387642438244` = the merged board's reference G_med
   (`data/jevbench-draw-equating.json:9`, also the top-level `G_med` of every v1.7.x results file). Precedents: r99 computed the
   draw median from four rows with no fixed value (`r99/batch/score_r99.sh:2`, `r99/PREREG-R99.md:26`); v1.7.11 scored single rows
   with a fixed G_med per row (`r196/v1711/score_costs_v1711.py:37`). With one row, a draw median is the row's own gap
   (self-referential), so the fixed reference value is used. **Numerically neutral here**: the penalty only bites when
   gap − G_med > 8 (`score_v15.py:37`, `:235`); the row's gap is −14.43, so penalty = 1.0 under either rule.
   `GMED-CHECK.json` re-scores with no fixed G_med: identical axes and composites (`point_values_identical_and_match_published_share: true`).
3. **Cost**: `usd_per_1000_override` (the scorer's documented path, `score_v15.py:432`) = 1000 × (711,020 × 0.03 + 1,500 × 0.15) / 1e6 / 1,500
   = USD 0.0143704 per 1,000 decisions, 0.2225x cap. Reference resolved through `pricing_v15.reference()` (module 645fd82e…) for base
   `Qwen/Qwen3.5-4B` → `deepinfra:Qwen/Qwen3.5-4B` 0.03/0.15. Priced input = processed tokens after the 32k trim (DECISIONS
   h2o141-processed-input-pricing-28621), cross-checked against the kit's usage-concordance audit (0 mismatches). Untrimmed 944,694 →
   USD 0.0190439/1k (disclosed only). Basis: all 1,500 items, no `--cost-basis` (no other row on this draw).
4. **Equating**: draw status anchor-runs-pending, offset I 0 / C 0 → equated values = published values.
5. **Cells**: frozen `build_categories_v16.py` + `decisive_v16.py` under `run_under_v17.py` (off and share). No topics: the draw has no
   topic labels.

## Result (v1.7 share = the published view)

I 64.4293 · C 89.6536 · Capability 77.0414 · Speed 93.8617 · Cost 65.2759 · A 75.9756 · B 73.3467 · C 75.9756
(frozen/off: Speed 93.6586 on the 124-item window, A 75.9423). 1,500/1,500 answered, 0 over 10 s.

## Comparability caveat (for the lead and the fairness review)

Gap = I_open − I_sealed = 57.22 − 71.64 = −14.43. No ranked row on any draw has a gap below −5.7 (draw medians +2.1 to +10.1).
On the 300 public items shared by every draw, v1.4.1's I_open (57.22) is below v1.1's (61.05). Its overall Intelligence lead comes
from the fresh draw's sealed side, which no anchor run has equated yet (offset 0 by the standing fresh-draw rule).
