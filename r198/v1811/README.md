# JevBench v1.8.11 candidate

One unranked public self-hosted row, Minimodels Decision 1.0 (candy-cane), on the equated 27 Oct draw.
All carried scores, ranks, notes and stored cells remain unchanged. Only the v1.8.11 display adapter suppresses breakdown cells below 30 scored items. Language cells also retain the existing completed-coverage criterion, with its display floor raised to 30 in this release. Frozen stored cells are unchanged; absent subject-topic labels retain the existing draw-wide exception.

Rebuild on Sandy with the pinned frozen scorer installed: `python3 -B r198/v1811/build_v1811.py` (twice for determinism).
Then regenerate the candidate snapshot: `node scripts/build-jevbench-v1811-alldata.mjs`.
Run `node r198/v1811/validate_v1811.mjs` and the v1811 tests. `N30_BASELINE=1 node --test test/cr-257-v1811-min-samples.test.mjs` must fail on the predecessor data.
The worker leaves the manifest PENDING. Only the release owner may bind a real independent PASS receipt using `flip_verdict_v1811.py`; `--dry-run` does not mutate any file. The real flip refreshes the publication-dependent topic exception and All-data snapshot. No fairness review is required for this unranked row-only addition.
`make_passtree_v1811.py` creates an isolated synthetic PASS tree for gates; it grants no publication authority.
