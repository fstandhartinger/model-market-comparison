# JevBench v1.8.16 candidate

One public unranked self-hosted row, Sieve-31B-v3, on the equated 27 Oct draw. Every carried row, category, board and order list stays unchanged. Display adapters hide cells below 30 scored items and retain the existing language completed-coverage floor. Frozen stored cells are unchanged.

Build twice with `python3 -B r198/v1816/build_v1816.py`; generate the snapshot with `node scripts/build-jevbench-v1816-alldata.mjs`; run `node r198/v1816/validate_v1816.mjs` and v1816 tests. `N30_BASELINE=1 node --test test/cr-257-v1816-min-samples.test.mjs` must fail on predecessor data.

TOPICS-BASE.json is the exact published v1.8.15 exception state. The worker leaves review PENDING. Only the release owner binds an independent PASS receipt and publishes. Synthetic PASS gates grant no publication authority. Reuse the existing private-token matcher without new digest lists.
