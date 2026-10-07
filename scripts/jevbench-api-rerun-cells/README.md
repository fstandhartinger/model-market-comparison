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

CR-334: the default build adds L1/L2 runs from each release's `runs/api/<key>.jsonl`, requiring an exposure receipt,
unique response IDs and complete joins to that release's frozen ID map. Category cells include only present scored
responses; missing responses are not imputed. Original A/P (or S/P) responses win over repeated public responses;
supplements follow L1 then L2, with each stable identity scored once. `coverage` / `n_items` and per-type/tier splits
retain their original basis; `category_pools` / `category_n_items` describe the category union. The default labels
are ruled r13, r14 and r15, with authoring use-case precedence.

Future labelled supplements need no code edit: repeat `--pool NAME=/path/to/release` (L1/L2/L3/C1; explicit pools
replace the defaults) and `--label-file /path/to/ruled.jsonl` (adds to the default label files). Example:

```bash
python3 scripts/jevbench-api-rerun-cells/build_api_rerun_cells.py EQUATED SUPPLEMENT OUT \
  --pool L1=/path/to/L1 --pool L2=/path/to/L2 --pool L3=/path/to/L3 --pool C1=/path/to/C1 \
  --label-file /path/to/labels-L3-ruled.jsonl --label-file /path/to/labels-C1-ruled.jsonl
```

Run `python3 -m unittest discover -s scripts/jevbench-api-rerun-cells -p 'test_*.py'` for union/receipt/join checks.
