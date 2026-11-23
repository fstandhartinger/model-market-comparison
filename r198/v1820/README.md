# JevBench v1.8.20 candidate

One public unranked self-hosted row, Starlord-4B-v2.0-preview, and the first row on the new 22 Nov 2026 draw (`v1.6-regular-20261122`). The draw is registered with status anchor-runs-pending and offset 0 (joins through the addendum, like the 27 Oct draw in v1.7.13), so the row's published numbers equal its scorer numbers; G_med is carried over from the 27 Oct draw (single-row draw, no cohort). Every carried row, category, board and order list stays unchanged. Display adapters hide cells below 30 scored items and retain the existing language completed-coverage floor. Frozen stored cells are unchanged.

Build twice with `python3 -B r198/v1820/build_v1820.py`; generate the snapshot with `node scripts/build-jevbench-v1820-alldata.mjs`; run `node r198/v1820/validate_v1820.mjs` and the v1820 tests. `N30_BASELINE=1 node --test test/cr-257-v1820-min-samples.test.mjs` must fail on the legacy low-sample display baseline.

TOPICS-BASE.json is the exact pinned main exception state, including the published v1.8.19 entries. The worker leaves review PENDING and `inputs/APPROVAL.json` at PENDING: the release owner binds the approval text (`GO (...)`), an independent PASS receipt and publishes. Synthetic PASS gates grant no publication authority. Reuse the existing private-token matcher without new digest lists.

Cost: v1.8 min(list, GPU-time) over all 1,500 items of the new draw (no common-basis exclusion); the GPU-time leg binds. The frozen scorer ran with the registry rates the pipeline derives; scorer cost must equal the independent derivation within 1e-15.
