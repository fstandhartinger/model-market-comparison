# Category radars — how to rebuild for a release (CR-257)

Everything item-level stays on Sandy under `/home/flori/jevbench-sealed/`; only the aggregate artifacts enter this repo.

1. `peritem.py [extra.json]` — scores every system's stored raw run with the release scorer and keeps only systems whose
   per-type × tier cells reproduce the published artifact exactly (addendum runs mapped in `extra.json`).
2. `build_label_input.py` — label-free labelling input (topic + use case per item).
3. Labelling: rent one owned GPU pod (gpu-pod-guard reserve/attach/release, exact-ID teardown), run `setup.sh`
   (Winnow-12B Q8 = the s1-pro model, pinned build) and `client.py`, download, shred the input on the pod.
   **Never** bulk-label against production System1 Models or with internal monitor keys (incident 1 Oct 2026).
4. Hand-check ~5 % of public items; fix systematic misses with item-group rules (documented in `aggregate.py` RULES).
5. `aggregate.py` — writes `data/raw/benchmarks/jevbench/<version>/…-categories.json` (+ ImageJevBench). Then register the
   revision in `lib/jevbench-categories.mjs` and run `node --test test/cr-257-category-radars.test.mjs`.

Paths inside the scripts point at the v1.5.4 / v0.1.5 run; adjust them for the next release.
