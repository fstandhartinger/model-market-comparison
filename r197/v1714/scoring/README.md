# v1.7.14 Phase A — five rows on v1.6-regular-20261027 (same draw as v1.7.13)

Scripts: `build_field_v1714.py` (hash pins for 3 entry files, 5 raws, input, manifest, pricing module, scorer and the Decisio engine
recount; sealed input order; token totals; frozen pricing references; registry), `run_scores_v1714.sh` (frozen v1.6 / v1.7 off / v1.7
share; same flags as v1.7.13), `alt_gmed_check_v1714.py` (G_med choice + cohort independence), `cells_v1714.sh` (categories + noul
decisive; CAT15 = repo `data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json`, as the v1.7.13 critic used).
Outputs: `field/` (REGISTRY.json, ROWS.json, out-frozen, out-v17-off, out-v17-share, cells/{off,share}), `GMED-CHECK.json`.
The sealed raws are read in place via symlinks; nothing from them is copied or printed.

Scoring choices: harness score_v16 02132271 / score_v17 6363458d, B 1000, seed 16, O1S, share rule (10 s; no decision over 10 s on any
row), fixed reference G_med 2.573387642438244. GMED-CHECK: penalty 1.0 for every row under the reference or the field's own median
(-7.35); each row scored alone gives exactly the five-row field's point values (cohort independent; the field's API offsets apply only
to API rows, score_v16.py:677,706). Cost: all 1,500 items (no --cost-basis), usd_per_1000_override per row:

| row | priced input | output | reference | USD/1k | x cap |
|---|---|---|---|---|---|
| torchcast-decision-31b-v1.0 | 645,268 (server = engine) | 0 | google/gemma-4-31b-it 0.09/0.34 | 0.038716 | 0.599 |
| arcbright-elf-1-12b-r2 | 610,840 (server = full rendered prompt) | 1,500 | google/gemma-3-12b-it 0.05/0.15 (explicit) | 0.020511 | 0.318 |
| jeff_1_1_qwen_4b | 629,951 (native) | 69,580 | deepinfra:Qwen/Qwen3.5-4B 0.03/0.15 | 0.019557 | 0.303 |
| decisio-gemma-4-12b-tuned-commit-think | 844,031 (ENGINE recount; native 727,045) | 9,121 | google/gemma-3-12b-it 0.05/0.15 (explicit) | 0.029046 | 0.450 |
| jeff_1_1_large | 620,215 (native) | 21,830 | google/gemma-4-31b-it 0.09/0.34 | 0.042161 | 0.653 |
