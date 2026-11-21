# JevBench v1.8.19 candidate

Two public unranked hosted API rows, Base Labs bison-1 and groundhog-1, on the equated 27 Oct draw. Every carried row, category, board and order list stays unchanged. Display adapters hide cells below 30 scored items and retain the existing language completed-coverage floor. Frozen stored cells are unchanged.

Build twice with `python3 -B r198/v1819/build_v1819.py`; generate the snapshot with `node scripts/build-jevbench-v1819-alldata.mjs`; run `node r198/v1819/validate_v1819.mjs` and v1819 tests. `N30_BASELINE=1 node --test test/cr-257-v1819-min-samples.test.mjs` must fail on the legacy low-sample display baseline.

TOPICS-BASE.json is the exact pinned main exception state, including the published v1.8.18 entries. The worker leaves review PENDING. Only the release owner binds an independent PASS receipt and publishes. Synthetic PASS gates grant no publication authority. Reuse the existing private-token matcher without new digest lists.

Hosted pricing uses the frozen I-1 launch tariffs. When the resolver reports that the base-model floor binds, the frozen scorer receives its reference input/output rates; otherwise it receives the tariff rates. Scorer costs must match the resolver on both common and all-item bases within 1e-12.
