# JevBench v1.7.13 candidate (new row UNRANKED) — review pending

First release on the fresh draw `v1.6-regular-20261027`: one new self-hosted row, **H2O-Lightning-4B v1.4.1**
(`h2oai/h2o-lightning-4b@cc18ee33`, paid public order, automatic publication). Base: v1.7.12 commit `020019b8`. No method
change, no new model call, no reprice. All 300 predecessor rows (including H2O-Lightning-4B v1.1) are fully equal, ranks included;
all carried category cells and lanes are equal; carry/history bytes are copied unchanged.

Scoring (Phase A, `/home/flori/jobs/jevbench-add-requests-20260919/r197/v1713/score/README.md`): harness `score_v16.py` 02132271 /
`score_v17.py` 6363458d, B 1000, seed 16, O1S, v1.7 share rule (decisions over 10 s fail; none here), fixed reference G_med
2.573387642438244 (one-row cohort; numerically neutral: penalty 1.0 under either rule). Cost ESTIMATE: deepinfra:Qwen/Qwen3.5-4B
0.03/0.15 on 711,020 processed input + 1,500 output tokens over all 1,500 items = USD 0.0143704/1k (0.22x cap); untrimmed
944,694 disclosed. Draw status anchor-runs-pending, offset 0 (equated = published).

The new draw joins `data/jevbench-draw-equating.json` with `joins_via: "v1.7-addendum"`: its row enters the live board
through the v1.7.13 addendum. The v1.6 cohort reader and `readChainLatestRelease` skip such draws, so the v1.6 chain that v1.7.0's
restatement is bound to is unchanged (a plain entry would make the chain report v1.7.13 and drop the whole v1.7 board).
The wired-but-PENDING tree reproduces the pristine v1.7.12 board byte for byte (`receipts/topfive-before*.json`).

UNRANKED (release-owner decision `v1713-h2o141-unranked-provisional`): the independent fairness review
(`workers/r197-v1713-fair/RESULT.json`) judged the ranked insertion SUSPICIOUS (the 27 Oct draw is 72 % multilingual, the row's
public-vs-sealed gap is -14.43, and on the 300 shared public items it scores 57.2 Intelligence vs 61.1 for v1.1). The row is
therefore published with all its measured axes, cost, speed and cells but `ranked: false`, `rank: null`, all `ranks` null,
`listing: 'unranked'` and a public `not_ranked_because` (precedent: `lib/jevbench-v1630-release.mjs:242-245` for the
ranked/rank/ranks/reason shape, `lib/jevbench-v15-preview.mjs:29,123` for the `unranked` listing of a scored row). Every carried
row is fully equal (ranks included) and every order list equals v1.7.12; the loader and `row_gates_v1713.mjs` reject the row
ranked or in any order list.

Top fives (v1.7.12 → v1.7.13): 0 of 580 watched lists change; 0 of 171 slider states; 0 of 368 grid states; both legacy custom
weightings and both entrant weightings unchanged (single-entrant check: 0 of 584). `receipts/topfive-diff.json`,
`receipts/CHANGED-LISTS.md`.

Approval: `GO (standing; no top-five change; paid public order)`. `approval_v1713.py` and the loader refuse it unless the
complete comparison shows zero changes and the row is unranked; the fairness receipt stays bound as evidence (verdict
SUSPICIOUS, sha256 pinned). `bind_fair_v1713.py` only verifies that binding. The topics exception is recorded
(data/jevbench-breakdown-exceptions.json); in the PENDING tree the breakdown gate reports it as orphaned because the row is
hidden, and it passes post-flip.

Reproduce: `python3 -B prepare_v1713.py` → `bash compare_v1713.sh` → `python3 -B changed_lists_v1713.py` → `bash run-gates.sh` (adds `check_public_text_v1713.py`, `check_visibility_v1713.py`, `postflip_sim_v1713.sh`)
(`RUN_FULL_SUITE=1` for the full suite) → `python3 -B collect_gates_v1713.py`. Post-flip checks run on a synthetic PASS copy
(`.pass`, `postflip_*_v1713.sh`) and restore the real files byte-equal; synthetic receipts confer no authority. `freeze_v1713.py`
is dry-run only (never writes a seal).

Preview: `preview/index.html`, `preview/card.png` (footer: `preview_v1713.py --publication-status pending|published`).
