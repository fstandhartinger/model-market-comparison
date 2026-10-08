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

## v1.7.18 refresh (L3 includes C1)

Run on Sandy in this order after the lead has reviewed the admitted complete runs. Choose **unused numeric**
`LANG_N` and `CATS_N` snapshot numbers; existing sealed snapshots are immutable. These commands do no inference.
L3's release contains C1 English category top-ups; do not add a separate C1 pool for these same items.

```bash
REPO=/home/flori/wt/jevbench-languages-full-20261007
WORKERS=/home/flori/jobs/jevbench-languages-full-20261007/workers
SEALED=/home/flori/jevbench-sealed/v1.6-run
LANG_N=4  # choose a fresh unused number if this already exists
CATS_N=2  # choose a fresh unused number if this already exists
cd "$REPO"

# 1. Language union; public-safe convenience copy excludes private provenance.
"$WORKERS/lang-cells/tools/cells/rebuild.sh" "$LANG_N" --board-revision v1.7.18 --l3-drawn 2026-10-07
cp "$WORKERS/lang-cells/language-cells.json" data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-language-cells.json

# 2. Overlay category union. Per-type/tier cells retain their original measurement basis.
python3 scripts/jevbench-api-rerun-cells/build_api_rerun_cells.py \
  data/jevbench-api-a4-equated.json \
  data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-cells-supplement.json \
  "$WORKERS/site/r3-api-category-cells.json" \
  --pool "L1=$SEALED/v1.6.0-L1" --pool "L2=$SEALED/v1.6.0-L2" \
  --pool "L3=$SEALED/v1.6.0-L3" \
  --label-file "$SEALED/v1.6.0-L3/labels/labels-l3-ruled.jsonl"
cp "$WORKERS/site/r3-api-category-cells.json" data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-api-rerun-cells.json

# 3. All S-based category unions, with newest overlay for the coverage report.
"$WORKERS/cats-all/tools/cells/rebuild_cats.sh" "$CATS_N" --board-revision v1.7.18 \
  --overlay-artifact "$WORKERS/site/r3-api-category-cells.json"
# Read the builder's invariance and coverage report before accepting the output (see below).
cp "$WORKERS/cats-all/category-cells.json" data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-category-cells.json

# 4. Remove only exceptions whose actual displayed cells now meet all 27 >=30 spokes.
# Never adds an exception: any new uncovered failure needs an evidenced, reviewed reason.
node scripts/jevbench-radar-spokes.mjs --prune
node --test test/cr-334-radar-spokes.test.mjs test/cr-334-languages-every-row.test.mjs
python3 -m unittest discover -s scripts/jevbench-api-rerun-cells -p 'test_*.py'
~/bin/heavy npx tsc --noEmit
~/bin/heavy npm run build
~/bin/heavy npm test
```

The S builder currently returns **exit 1** for its strict historical family-invariance check: the historical v1.7.12
family cells use S+P, whereas this release explicitly requests the full S+P+L1+L2+L3 category union.
It still writes the aggregate artifacts and report. The lead must verify `historical_schema_pass: true`, inspect
all strict differences and accept the family-basis change before copying; do not suppress or treat exit 1 as a pass.
`spoke_report.json` is a diagnostic; the release test reads the shipped cells themselves and the full live roster.
A coverage reason in `data/jevbench-radar-spoke-exceptions.json` must have `{key, reason, since}` and is shown by
row in Languages/full table/dated carry and in Compare. It must disappear as soon as the row meets the gate.
The v1.7.12 supplement and frozen release remain untouched for historical pages.

The final language caption computes every pool count, draw date and minimum P∪L1∪L2∪L3 language count from the
language artifact. Confirm the refreshed minimum is 60 and the draw date is 2026-10-07 before releasing; the
interim artifact is deliberately labelled with its actual counts. Headline release results and rankings do not change.
