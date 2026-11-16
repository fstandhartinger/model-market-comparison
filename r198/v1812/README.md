# JevBench v1.8.12 candidate

One unranked public self-hosted row, Starlord-27B-v2.0-preview, on the equated 27 Oct draw.
All carried scores, ranks and stored cells remain unchanged. The sole carried-row change is the declared not_ranked_because wording for H2O-Lightning-4B v1.4.1, copied exactly from WeMM-JEV and VisionJEV. The v1.8.12 display adapter retains the v1.8.11 rule that suppresses breakdown cells below 30 scored items. Language cells also retain the existing completed-coverage criterion, with its existing display floor of 30. Frozen stored cells are unchanged; absent subject-topic labels retain the existing draw-wide exception.

Rebuild on Sandy with the pinned frozen scorer installed: `python3 -B r198/v1812/build_v1812.py` (twice for determinism).
Then regenerate the candidate snapshot: `node scripts/build-jevbench-v1812-alldata.mjs`.
Run `node r198/v1812/validate_v1812.mjs` and the v1812 tests. `N30_BASELINE=1 node --test test/cr-257-v1812-min-samples.test.mjs` must fail on the predecessor data.
The worker leaves the manifest PENDING. Only the release owner may bind a real independent PASS receipt using `flip_verdict_v1812.py`; `--dry-run` does not mutate any file. The real flip refreshes the publication-dependent topic exception and All-data snapshot. No fairness review is required for this unranked row-only addition.
`make_passtree_v1812.py` creates an isolated synthetic PASS tree for gates; it grants no publication authority.
