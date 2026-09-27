# JevBench v1.5 headline amendment: A with equal task-type weights

**Owner decision:** Florian selected this headline after reviewing the What-If Lab (26 Sep 2026, board #2063/#2067). This is a disclosed, post-leaderboard method amendment chosen by the method owner. It does not claim that the weights were frozen before results existed.

## Official headline

- Axis weights are equal: Intelligence 25%, Calibration 25%, Speed 25%, Cost 25%; Intelligence gate 50.
- Intelligence combines Choice, Noul, and Score equally (one third each) over supported types. Calibration uses the same equal type weights; tier weights remain Easy 10%, Standard 20%, Judge 30%, Hard 40%.
- The open/sealed share remains 50/50. The overfit penalty stays relative to `G_med` with allowance 8. Speed adjustment remains on. M2 pricing remains on, including the approved standard launch-list-price rule.
- `G_med` is recomputed as the median gap over ranked, complete, full-coverage v1.5.0 rows under this amendment. The A1 roster addendum and later point-release rows reuse that resulting frozen `G_med`; addendum rows do not contribute to the reference population, v1.5.0 ranking, or its tie markers.
- Official uncertainty uses the paired, stratified bootstrap with B=2,000 and seed 15. Adjacent rows whose 95% difference interval includes zero are marked as statistical ties.

## Secondary view

Preset B remains visible as a secondary axis-weight view: Intelligence 40%, Calibration 20%, Speed 20%, Cost 20%, Intelligence gate 50. It uses the same equal Choice/Noul/Score weights as the official headline, so only the axis weights differ. Preset C remains available with equal axes and Intelligence gate 60.

## Rationale and disclosure

Equal axis weights preserve continuity with v1.4. Equal treatment of Choice, Noul, and Score reflects that all three decision types are now measured. The method owner selected this rule after reviewing the What-If Lab. Before every release we review the leaderboard for anomalies and close loopholes with general, documented rules.

The original frozen method and its SHA-256 remain unchanged. This file discloses the later headline amendment and must accompany any v1.5 preview or release that uses it.
