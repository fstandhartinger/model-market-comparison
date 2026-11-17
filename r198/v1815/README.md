# JevBench v1.8.15 candidate

One public unranked self-hosted row, Starlord-4B-preview, on the equated 27 Oct draw. Every carried row, category, board and order list stays unchanged. Display adapters hide cells below 30 scored items and retain the existing language completed-coverage floor. Frozen stored cells are unchanged.

Build twice with `python3 -B r198/v1815/build_v1815.py`; generate the snapshot with `node scripts/build-jevbench-v1815-alldata.mjs`; run `node r198/v1815/validate_v1815.mjs` and v1815 tests. `N30_BASELINE=1 node --test test/cr-257-v1815-min-samples.test.mjs` must fail on predecessor data.

TOPICS-BASE.json is the exact published v1.8.14 exception state. The worker leaves review PENDING. Only the release owner binds an independent PASS receipt and publishes. Synthetic PASS gates grant no publication authority. Reuse the existing private-token matcher without new digest lists.
