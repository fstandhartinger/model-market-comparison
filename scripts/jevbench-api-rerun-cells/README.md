# Breakdowns for the API overlay rows (CR-331)

`data/jevbench-api-a4-equated.json` adds API rows to the live boards after the frozen v1.6.1 release: A4 u P and A5 u P
re-runs (600 items, equated) and full-set rows such as Liquid AI d1. Their breakdowns live in
`data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-api-rerun-cells.json` (aggregates only).

When you add an overlay row:

1. Score it as usual (score-a4-K / score-a5-K / a full-set round). Its sealed items must have topic + use-case labels
   (Winnow r13 recipe; `labels-r13-ruled` covers S u P, `labels-r15-ruled` the A4/A5 sealed items). A fresh sealed subset
   needs a labelling run first (one small owned pod, see jobs labels-r14 / labels-r15).
2. On Sandy: `python3 scripts/jevbench-api-rerun-cells/build_api_rerun_cells.py data/jevbench-api-a4-equated.json
   data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-cells-supplement.json <out.json>` — it checks each row's run sha256 and
   I_open/I_sealed against the published row and that the item-level rescore reproduces the scorer's own breakdowns
   exactly, then writes per-type x tier splits plus family/topic/use-case cells (MIN_N 15, raw, never equated).
   A full-set row is read from its round's `out-O1S/categories-with-topics.json` (paths for d1 are in the script).
3. Copy the output over the artifact and run `node --test test/cr-331-breakdowns-every-row.test.mjs` — the release gate
   fails for any live row without per-type/tier and topic/use-case aggregates.

Language cells are not in this artifact (the language view has its own supplement pipeline).
