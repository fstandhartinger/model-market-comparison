# Historical measurements supplement

18 models measured 3–4 October 2026 on the frozen 1,624-item v1.5 pool. Each expanded row includes its actual UTC measurement date, hardware, licence, measured model/runtime revisions and pinned source links, curated from the original run metadata and receipts in METADATA.json. The displayed date range is derived from those rows. The original v1.5.7 results and category artifacts remain byte-identical. New aggregate results live in a separate endpoint and section of the historical page; they never enter the v1.6.1 feed.

Category generation uses the existing `score_v15.score_item`, `competence` and `cc_cell` methods and existing `labels-final.json`; no model inference or new labelling. Each row reproduces all 24 stored type/split/tier competence cells and counts within 1e-6. Only aggregates and hashes enter this repository. Gaming has no historical items and is shown as a gap. Category counts below the original minimum of 15 are gaps.

The release owner adopted two previously preregistered disclosed estimates: Kev-9B Base uses its instruct sibling reference (0.10/0.15 USD per million tokens); Reflex Reason uses a labelled nearest-size-class Qwen3.5-2B estimate (0.02/0.10). No frozen scorer or pricing source was changed.

XOR NVFP4 and Wald-Q4B v1.1 are held separately because they change historical C or B top five. Historical Quyet key aliases and the superseded Exaone version are omitted; current-pool measurements are in the current release. Atlas AI Reflex Instinct/Reason and sora42y Sev2B are distinct from existing Reflex4B/27B and Seb9B respectively. Korean CoCo is distinct from the current non-Korean version.

Sandy-only replay (inventory names local source aggregates and raw paths):

```sh
python3 ops/jevbench-history-cr337/build.py --inventory /home/flori/jobs/jevbench-release-adopted-rows-20261008/INVENTORY.json --held-dir /home/flori/jobs/jevbench-release-adopted-rows-20261008
```

Verification receipt: VERIFICATION.json. Both held rows have complete category aggregates retained with the release owner for preview.

The gate checks A/B/C and Capability top-five orders against the immutable historical parent. Capability uses the historical ranked field, including Jev 1.13.0, within 2× that reference's cost and adjusted median-latency caps. Both before/after lists and the exact caps are persisted in the supplement and VERIFICATION.json. XOR NVFP4 and Wald-Q4B remain excluded pending Florian's preview decision.

Presentation-only replay, without reading any raw or held-out records:

```sh
python3 ops/jevbench-history-cr337/build.py --metadata-only
```
