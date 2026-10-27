# JevBench v1.7.13 candidate — review pending

First release on the fresh draw `v1.6-regular-20261027`: one new self-hosted row, **H2O-Lightning-4B v1.4.1**
(`h2oai/h2o-lightning-4b@cc18ee33`, paid public order, automatic publication). Base: v1.7.12 commit `020019b8`. No method
change, no new model call, no reprice. All 300 predecessor rows (including H2O-Lightning-4B v1.1) are equal except `rank`/`ranks`;
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

Top fives (v1.7.12 → v1.7.13): 99 of 580 watched lists change, all from this row: open-weights board A/B/C (#2/#3/#2), open
Balanced/Speed/Cost views, all-scope Speed (#4) and Cost (#5) views in frozen/off/share; both legacy custom weightings; the
open-scope Capability top five under 32 of 171 cost/latency slider states and all 368 grid states (cost cap 1.0-1.3x). All-scope
A/B/C top fives and every Capability list at the official caps are unchanged.
`receipts/CHANGED-LISTS.md`, `receipts/topfive-diff.json`.

Approval: `GO (paid public fast-lane order, automatic publication)`; because top fives change, a bound FAIR verdict
(`workers/r197-v1713-fair/RESULT.json`) is required. It is PENDING: the loader, flip and freeze refuse until
`bind_fair_v1713.py` binds it (then rebuilds). The breakdown gate needs a recorded decision for the missing topic cells
(the draw has no topic labels): `add_topics_exception_v1713.py --decision "<DECISIONS ... UTC | board #N>"`.

Reproduce: `python3 -B prepare_v1713.py` → `bash compare_v1713.sh` → `python3 -B changed_lists_v1713.py` → `bash run-gates.sh`
(`RUN_FULL_SUITE=1` for the full suite) → `python3 -B collect_gates_v1713.py`. Post-flip checks run on a synthetic PASS/FAIR copy
(`.pass`, `postflip_*_v1713.sh`) and restore the real files byte-equal; synthetic receipts confer no authority. `freeze_v1713.py`
is dry-run only (never writes a seal).

Preview: `preview/index.html`, `preview/card.png` (footer: `preview_v1713.py --publication-status pending|published`).
