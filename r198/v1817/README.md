# JevBench v1.8.17 candidate

One public unranked hosted API row, SubQ Snap 1.2, on the equated 27 Oct draw. Every carried row, category, board and order list stays unchanged. Display adapters hide cells below 30 scored items and retain the existing language completed-coverage floor. Frozen stored cells are unchanged.

Build twice with `python3 -B r198/v1817/build_v1817.py`; generate the snapshot with `node scripts/build-jevbench-v1817-alldata.mjs`; run `node r198/v1817/validate_v1817.mjs` and v1817 tests. `N30_BASELINE=1 node --test test/cr-257-v1817-min-samples.test.mjs` must fail on the legacy low-sample display baseline.

TOPICS-BASE.json is the exact pinned main exception state, including the published v1.8.16 entries. The worker leaves review PENDING. Only the release owner binds an independent PASS receipt and publishes. Synthetic PASS gates grant no publication authority. Reuse the existing private-token matcher without new digest lists.
