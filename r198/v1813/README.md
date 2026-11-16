# JevBench v1.8.13 candidate

One unranked public self-hosted row, H2O-Lightning-31B v1.3.4, on the equated 27 Oct draw.
All carried scores, ranks and stored cells remain unchanged. There are no carried-row exceptions. The v1.8.13 display adapter retains the v1.8.12 rule that suppresses breakdown cells below 30 scored items. Language cells also retain the existing completed-coverage criterion, with its existing display floor of 30. Frozen stored cells are unchanged; absent subject-topic labels retain the existing draw-wide exception.

Rebuild on Sandy with the pinned frozen scorer installed: `python3 -B r198/v1813/build_v1813.py` (twice for determinism).
Then regenerate the candidate snapshot: `node scripts/build-jevbench-v1813-alldata.mjs`.
Run `node r198/v1813/validate_v1813.mjs` and the v1813 tests. `N30_BASELINE=1 node --test test/cr-257-v1813-min-samples.test.mjs` must fail on the predecessor data.
The worker leaves the manifest PENDING. Only the release owner may bind a real independent PASS receipt using `flip_verdict_v1813.py`; `--dry-run` does not mutate any file. The real flip refreshes the publication-dependent topic exception and All-data snapshot. No fairness review is required for this unranked row-only addition.
`make_passtree_v1813.py` creates an isolated synthetic PASS tree for gates; it grants no publication authority.

`inputs/TOPICS-BASE.json` must be the exact published predecessor exception state. Refresh it when rebasing a stacked candidate onto a newly published predecessor; otherwise the PASS helper drops that predecessor's new exceptions. The v1813 topic-base regression requires all predecessor entries and the predecessor's topic-less new rows to remain covered.

The compiled checker reuses the predecessor private-token matcher. Current-run literal checks and identifier lists stay in the private worker job, outside Git; the public final-scan receipt uses generic labels.
