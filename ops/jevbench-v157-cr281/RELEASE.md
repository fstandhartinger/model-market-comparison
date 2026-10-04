# CR-281 — JevBench v1.5.7

Adds exactly one ranked row to v1.5.6: Open-Jev 27B v1.1 (Zefan Cai), from add-requests run 45. This is an addendum on the frozen v1.5 1,624-decision sample, equal-type headline-A scorer and G_med 5.186627500079243. No inference was run for this release. Existing rows retain every value except their ranks; existing paired markers remain only on pairs still adjacent.

**No top-five change; not a paid fast-lane run; no Florian GO needed (AGENTS rule)**. `TOP-FIVE.json` records the unchanged A, B, C and Capability top fives and eligibility. The lead still reviews the release and its gates before publication.

wity-1 is not part of this release.

| System | A | B | C | Capability |
|---|---:|---:|---:|---|
| Open-Jev 27B v1.1 | 76 | 75 | 74 | 70.45; outside caps |

Open-Jev's run-45 author loader used the pinned Open-Jev-27B-v1.1 model and Qwen3.8-27B base (lineage verified by architecture). Composite A is 2.926978075888752, Intelligence 60.74, Calibration 80.17. Frozen BASE_REFERENCES pricing applies without a pricing gate: USD 0.7157353448275862/1,000 decisions, 11.0804× the Capability cost cap. Raw p50 is 699.8 ms; adjusted latency is 1.54968 s, 1.2569× the latency cap. Speed is a **LOWER BOUND**: flash-linear-attention and causal-conv1d kernels were not installed, so the author loader used the Transformers reference path; the author documents the kernel path as answer-identical. Independent candidate encoding produces high input-token usage. The public pin contains only model/base/loader revisions. Prior Open-Jev 2B/9B rows are unchanged.

## Reproduction and provenance

`rescore.py` performs one bounded offline scorer invocation with no inference. It checks Open-Jev's entire row for value identity against the stored run-45 aggregate and its A/B/C scores against SCORES-R45. A fresh r5 replay on 4 October 2026 passed: the entire Open-Jev row is value-identical to the stored run-45 aggregate, and all A/B/C scores exactly match SCORES-R45. `RESCORE-RECEIPT.json` was regenerated; its values and bytes remain identical to the prior Open-Jev receipt. No inference was performed.

- Open-Jev private raw SHA-256: 3bc7bebdced8313784a57cf4e8ed317714b3b2000a1690cd312109ad44aaaf3d.
- Run-45 aggregate SHA-256: 44e9effe6145b16a87101527f9a7fae68f850343342b9027f1c3030a2d839c78.

`build.py` verifies raw, metadata and scoring-pin hashes before projection. The parent artifact hash and aggregate addendum hash are in the result artifact; new-row provenance carries the relevant source hashes. Raw outputs and sealed item text remain private and are not copied to the repository.

`categories.py` reproduces all 24 split/type/tier cells for the new row, including tier counts, using the frozen scorer and existing labels. It writes only topic/use-case aggregates for both radars. Every prior system's category entry remains identical to v1.5.6; `CATEGORY-VERIFICATION.json` records the new-row checks. The r4 existing-row proof checks all 113 prior result rows and 112 prior category entries.

The page retains the Capability chart, synchronized speed/cost charts, composite chart, direct comparison with both category radars, full table, method notes and history. Current page/feed pointers use v1.5.7; all historical routes remain pinned. The UI and chart scoring helpers are unchanged from main; stored A/B/C scores and ranks remain available on system detail pages.

## Release gates and preview

Required merge-queue commands are `node_modules/.bin/tsc --noEmit`, `npm run build`, and full `npm test`, through the Sandy heavy-work guard. All three commands passed in r5 on 4 October 2026: TypeScript exit 0, production build exit 0, and full tests exit 0 (1,996 tests: 1,995 passed, 1 skipped, 0 failed). Locked dependencies were installed with `npm ci` after the initial typecheck could not start because `node_modules` was absent. No source or assertion fixes were needed.

Fresh screenshots from the local production server are in `workers/v157-build-r5/screenshots/`: `desktop-top.png` (1440×1000), `open-jev-row.png` (Open-Jev detail with A #76, B #75, C #74), and `mobile-top.png` (390×844). At 390px the document and body widths were 380px, with no horizontal overflow. The isolated browser and local server were stopped and the worktree `.next` output deleted. See `workers/v157-build-r5/RESULT.md` and gate logs for evidence. Lead review remains required before publication.

`REEVALUATION-PLAN.json` retains the existing helper's JevBench plan with a factual one-row addendum annotation; unrelated image/audio ledger snapshots are omitted. The helper still reads the historical v1.5.4 roster; that pre-existing limitation is disclosed rather than silently repaired in this release. Only the one already-completed measured entrant is added, and no remeasurement or ledger mutation was performed.
