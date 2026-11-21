# JevBench v1.8.19 candidate

Two public unranked hosted API rows, Base Labs bison-1 and groundhog-1, on the equated 27 Oct draw. Every carried row, category, board and order list stays unchanged. Display adapters hide cells below 30 scored items and retain the existing language completed-coverage floor. Frozen stored cells are unchanged.

Build twice with `python3 -B r198/v1819/build_v1819.py`; generate the snapshot with `node scripts/build-jevbench-v1819-alldata.mjs`; run `node r198/v1819/validate_v1819.mjs` and v1819 tests. `N30_BASELINE=1 node --test test/cr-257-v1819-min-samples.test.mjs` must fail on the legacy low-sample display baseline.

TOPICS-BASE.json is the exact pinned main exception state, including the published v1.8.18 entries. The worker leaves review PENDING. Only the release owner binds an independent PASS receipt and publishes. Synthetic PASS gates grant no publication authority. Reuse the existing private-token matcher without new digest lists.

Worker stop: this is an incomplete scaffold. No candidate artifacts or generated loader exist. The frozen scorer and installed resolver disagree on groundhog-1 base-floor cost; see the private worker report. Do not treat this branch as release-ready.
