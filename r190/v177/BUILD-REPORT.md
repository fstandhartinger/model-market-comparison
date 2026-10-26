# JevBench v1.7.7 candidate

Two first self-hosted measurements on draw v1.6-regular-20261012: D1A on Gemma 4 E4B (JohnP1 d1a-e4b) and D1A on Gemma 4 E2B (JohnP1 d1a-e2b), measured 26 Oct 2026. No method change or remeasurement. All 293 v1.7.6 predecessor rows, confidence intervals, diagnostics and category cells are carried exactly, except ranks. The candidate contains 295 rows.

The published-source hash is verified against ENTRIES-R15A-LEAD.json. Raw JSONL stays in place and is hash-checked; generated artifacts contain aggregates only. Each row's model pin is derived from its own entry and verified against preregistration. Runtime receipts confirm verified weights and source, and the final teardown receipt confirms closure.

All supplied frozen/off/share scores are preserved exactly. Cost is ESTIMATE with explicit input/output rates USD 0.02/0.10 per million tokens, using deepinfra:google/gemma-4-E4B-it; E2B explicitly uses the same-family one-size-up reference. Neither new row has a base_model key. The common-basis cost is about 0.318x the official cap; the all-item cost about 0.520x.

Each row answered 1,500/1,500 requests with HTTP 200. Exactly the same 15 requests used a truncated state at the author's 65,536-token limit and took over 10 seconds; share counts them wrong with zero calibration. Raw audit verifies timeout/truncation equality, maximum latency and native usage. Apache-2.0 is declared on the cards/metadata, without standalone LICENSE files; training provenance remains author-reported and overlap with JevBench unchecked.

Fresh v1.7.6→v1.7.7 comparison: 40 primary production-assembly lists plus 540 supplementary frozen/off/share, scope, cap, axis and weight lists; 178 single-slider transition states; two custom weighting witnesses and 368 explicit cost/latency grid states. No top-five changes. The unchanged 16 Oct standing approval is bound to the comparison receipt. This is not a claim about arbitrary simultaneous slider settings, arbitrary subfilters or exact parameter-size filters.

Publication review remains PENDING. The real loader, board, API and navigation hide the candidate. Synthetic PASS is isolated under .pass for checks only. Flip and freeze helpers are dry-run only; the real PENDING candidate refuses, and a synthetic PASS fixture succeeds. No non-dry flip, seal write, push, PR, CR, deployment, publication, author contact or notification.

Build recipe: `WT=$PWD python3 -B r190/v177/prepare_v177.py`, `WT=$PWD bash r190/v177/run_cells_v177.sh`, `WT=$PWD bash r190/v177/rebuild_v177.sh`. These use the unchanged frozen scorer/category tools and retain only aggregate outputs. Production integration follows v1.7.6; r190/v176 is untouched.

The initial targeted run identified missing route coverage and architecture metadata; the route assertion, pinned-card architecture evidence and future latest-release test fixtures were added before final gates. Gate logs and machine-readable receipts are under receipts/.

Final gates: 161 targeted tests, 57 synthetic tests and 3810 full-suite tests; zero failures. TypeScript, production build, double rebuild, source/row validation and helper controls passed. Cleanup: .next, r190/v177/.pass, tsconfig.tsbuildinfo. The shared node_modules symlink is retained.
