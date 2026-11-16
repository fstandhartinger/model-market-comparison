# JevBench v1.8.14 candidate

Two unranked public self-hosted rows, Quyet-1.2-Large and Quyet-1.2-Small, on the equated 27 Oct draw.
All carried scores and ranks remain unchanged. The sole carried-row exception adds Karpo-Decision-31B breakdowns and category cells with exact peer count parity, removes its publication restriction, and corrects both disclosure and underlying to the same approved paid-evaluation prose. The allowed changed fields are v16.breakdowns, v16.breakdowns_equated, publication_scope, disclosure and underlying. The v1.8.14 display adapter retains the v1.8.13 rule that suppresses breakdown cells below 30 scored items. Language cells also retain the existing completed-coverage criterion, with its existing display floor of 30. Frozen stored cells are unchanged; absent subject-topic labels retain the existing draw-wide exception.

Rebuild on Sandy with the pinned frozen scorer installed: `python3 -B r198/v1814/build_v1814.py` (twice for determinism).
Then regenerate the candidate snapshot: `node scripts/build-jevbench-v1814-alldata.mjs`.
Run `node r198/v1814/validate_v1814.mjs` and the v1814 tests. `N30_BASELINE=1 node --test test/cr-257-v1814-min-samples.test.mjs` must fail on the predecessor data.
The worker leaves the manifest PENDING. Only the release owner may bind a real independent PASS receipt using `flip_verdict_v1814.py`; `--dry-run` does not mutate any file. The real flip refreshes the publication-dependent topic exception and All-data snapshot. No fairness review is required for these row-only additions.
`make_passtree_v1814.py` creates an isolated synthetic PASS tree for gates; it grants no publication authority.

`inputs/TOPICS-BASE.json` must be the exact published predecessor exception state. Refresh it when rebasing a stacked candidate onto a newly published predecessor; otherwise the PASS helper drops that predecessor's new exceptions. The v1814 topic-base regression requires all predecessor entries and the predecessor's topic-less new rows to remain covered.

The compiled checker reuses the predecessor private-token matcher. Current-run literal checks and identifier lists stay in the private worker job, outside Git; the public final-scan receipt uses generic labels.

Synthetic gates must use a fresh owned scratch location, or refresh only exact intended public files after their path checks. Never move, delete or refresh a guard-refused tree. Use independent copies for mutable files; inherited hardlinks must be detached from intended source files under exact-path checks before source edits. Languages are rendered in their separate table; the categoryView snapshot is the topic/use-case radar projection. The compiled checker validates both surfaces.
