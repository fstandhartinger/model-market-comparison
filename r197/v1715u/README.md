# JevBench v1.7.15 candidate (UNRANKED variant: Microsoft-Decision-1 round 2 on the 27 Oct draw) — review pending

Stacked on the flipped, sealed v1.7.14 (`c51053c3` = origin/main with the v1.7.14 merge, review PASS). Release-owner decision
`d1027-strong-anchors-needed` (DECISIONS 2026-10-28 06:48 UTC): the fairness review of the EQUATED candidate (`fd2b67db`, branch
`jobs/jevbench-add-requests-20260919-v1715`, parked) is SUSPICIOUS, so the 27 Oct draw `v1.6-regular-20261027` is **not equated**
(status `anchor-runs-pending`, offset 0) and all of its rows stay measured-but-unranked. Two changes:

1. **New row `microsoft-decision-1-r2`** — "Microsoft-Decision-1 (updated weights, Oct 2026)", paid public evaluation (order d2b677de),
   hosted API, published (share-view) values, scored on 1,493 items (7 items the provider had seen in an earlier evaluation excluded;
   private 1,493-item gold view `120d0ba7…`; raw `1f069818…`), 4 context-limit refusals scored wrong, served model id unchanged from round 1.
   Cost: advertised Azure Foundry tariff 0.042/M input, output free, kind tariff (decision `msft-r2-cost-basis-tariff`), USD 0.013138/1k.
   `ranked: false`, null ranks, listing `unranked`, in no order list. The live round-1 row is unchanged.
2. **Public note** (`not_ranked_because`) of all seven d1027 rows: "Measured on the 27 Oct 2026 draw. Its anchor runs are complete, but the
   anchor models are weaker than this row, and for models at this level the draw's adjustment is uncertain by several points. Shown
   unranked until stronger anchors are measured." H2O-Lightning-4B v1.4.1 keeps its v1.1 comparison sentence. Disclosures (with the
   topic-cell sentence) are unchanged. The six carried rows differ from v1.7.14 in exactly that one field, pinned by sha256
   (proof `exceptions`, loader `V1715_TEXT_FIXED`).

Every other v1.7.14 row is equal in every field, ranks included; the board and every order list equal v1.7.14's; carry/history bytes are
copied. Draw table: only `releases` += v1.7.15 and `latest_release` v1.7.15. Top fives v1.7.14 → v1.7.15: 0 of 580 lists, 0 of 171 slider
states, 0 of 368 grid states, custom weightings unchanged (`receipts/topfive-diff.json`, `receipts/CHANGED-LISTS.md`). Approval: standing
GO (no top-five change; paid public order); no fairness receipt is bound (no row enters a ranking).

Reproduce: `python3 -B prepare_v1715.py` → `bash compare_v1715.sh` → `bash run-gates.sh` (`RUN_BUILD=1`, `RUN_FULL_SUITE=1`; heavy runs via
suite-slot) → `python3 -B collect_gates_v1715.py`. Microsoft scores/cells: job dir `r197/v1715/score/field` (frozen tools, 1,493-item view,
`scoring/cells_v1715.sh`), reused unchanged from the parked build (scoring does not depend on equating). Post-flip checks swap the synthetic
PASS manifest listed in `.pass/SWAP-FILES.txt` into the worktree and restore it byte-equal; synthetic receipts confer no authority. Topics:
the draw has no topic labels; one more TEMPORARY entry in `data/jevbench-breakdown-exceptions.json` (in the PENDING tree the breakdown gate
reports it as orphaned; post-flip it passes).

Preview: `preview/index.html`, `preview/card.png` (`preview_v1715.py --publication-status pending|published`).
