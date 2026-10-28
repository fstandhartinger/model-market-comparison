# JevBench v1.7.14 candidate (five new rows, all UNRANKED) — review pending

Same-draw addendum on the 27 Oct regular draw `v1.6-regular-20261027`, stacked on the v1.7.13 candidate (`0defb755`, still PENDING):
five new self-hosted rows, all measured but `ranked: false` with v1.7.13's mechanism and public note (without the H2O-specific v1.1
sentence; decision `v1713-h2o141-unranked-provisional`, Florian card #18781 "Unranked", "the same treatment applies to the other rows
on that draw"):

| key | display | A | Capability | USD/1k est. (all 1,500) |
|---|---|---|---|---|
| torchcast-decision-31b-v1.0 (paid public order 69f7a75d) | Torchcast Decision 31B v1.0 | 76.38 | 91.82 | 0.038716 (0.60x) |
| arcbright-elf-1-12b-r2 | Arcbright Elf 1 12B (r2) | 75.43 | 79.86 | 0.020511 (0.32x) |
| jeff_1_1_qwen_4b | Jeff-1.1-Qwen-4B (jgeuter) | 73.09 | 79.64 | 0.019557 (0.30x) |
| decisio-gemma-4-12b-tuned-commit-think | Decisio 12B tuned commit-think (variant of the Decisio family) | 73.11 | 78.65 | 0.029046 (0.45x, engine tokens) |
| jeff_1_1_large | Jeff-1.1-Large (jgeuter) | 71.34 | 88.22 | 0.042161 (0.65x) |

All 301 v1.7.13 rows (incl. H2O-Lightning-4B v1.4.1) are fully equal, ranks included; the board and every order list equal v1.7.13's;
carry/history bytes are copied. Top fives v1.7.13 → v1.7.14: 0 of 580 lists, 0 of 171 slider states, 0 of 368 grid states, both
legacy custom weightings unchanged; single-entrant 0 of 584 for every row (`receipts/topfive-diff.json`, `receipts/CHANGED-LISTS.md`).
Scoring: `scoring/README.md` (same scorer/flags as v1.7.13; fixed reference G_med; cohort-independent).

**Predecessor dependencies are read from the files at build time** (v1.7.13 results/categories/carry/history/proof scorers, its
publication sha256, its draw block). After the v1.7.13 flip run `bash restack_v1714.sh <new-base>`: it moves the branch onto the
flipped v1.7.13 (or merged main), rebuilds, refuses (exit 3, branch rolled back) on any change other than the v1.7.13 manifest hash
and the derived v1.7.14 proof hash, re-runs the cheap gates and commits (no push). `flip_verdict_v1714.py` refuses while v1.7.13 is
not PASS or v1.7.14 is bound to an older v1.7.13 manifest.

Reproduce: `python3 -B prepare_v1714.py` → `bash compare_v1714.sh` → `python3 -B changed_lists_v1714.py` → `bash run-gates.sh`
(`RUN_BUILD=1`, `RUN_FULL_SUITE=1` for the production build / full suite, both via suite-slot) → `python3 -B collect_gates_v1714.py`.
Post-flip checks swap the synthetic PASS files listed in `.pass/SWAP-FILES.txt` (v1.7.13 manifest with synthetic PASS, v1.7.14
proof/manifest re-bound to it, patched loader) into the worktree and restore them byte-equal; synthetic receipts confer no authority.
Topics: the draw has no topic labels; five TEMPORARY entries in `data/jevbench-breakdown-exceptions.json` (same rule as v1.7.13's);
in the PENDING tree the breakdown gate reports them (and v1.7.13's) as orphaned, post-flip it passes.

Preview: `preview/index.html`, `preview/card.png` (`preview_v1714.py --publication-status pending|published`).
