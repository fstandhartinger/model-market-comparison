# Artificial Analysis Coding Agent Index — collection notes

## Retained snapshots

- **v1.4 legacy snapshot**: `data/raw/aa-coding-agents.json`, collected 2026-09-09, 68 rows. This is the dated v1.4 input used by the existing Composite path.
- **v1.5 snapshot**: `data/raw/aa-coding-agents-v1.5.json`, collected 2026-09-23, 19 complete rows. Keep v1.5 separate from v1.4; never combine values across versions.
- **v2.0 snapshot** (CR-545): `data/raw/aa-coding-agents-v2.0.json`, first collected 2026-10-23, 24 complete rows. Current collector target. From this date the v1.5 file is frozen at its 2026-10-22 capture (42 rows) and never refreshed.
- Method source dates and endpoints above were read from the two retained snapshot headers on 2026-09-24. No live AA values were fetched for this documentation correction.

## v1.4 source and extraction

The v1.4 rows were retained from Artificial Analysis's Coding Agent Index page payload. The raw snapshot records the source URL, collection date, row identity, score and completeness fields. The earlier note that described a 2026-07-22 collection is stale; it did not match the retained 2026-09-09 snapshot.

## v1.5 source and validation

The v1.5 collector is `scripts/fetch-aa-coding-agents.mjs`, using `lib/aa-coding-agents.mjs` on `https://artificialanalysis.ai/agents/coding-agents`. It decodes the page's Flight JSON and resolves the full `benchmarkRows` array. It requires the v1.5 marker, the three expected components (`deep-swe-v1.1`, `swe-atlas-qna`, `terminal-bench-v4`), exactly three component results per row, one-third weights, finite 0–1 values, and agreement between each index score and the weighted component mean before atomic replacement.

## v2.0 source and validation (CR-545)

AA published Coding Agent Index v2.0 on 2026-10-23 (methodology version history: "Version 2.0 October 2026 - current"). It is the equal-weight average of FrontierCode v1.1 Main (100 of 150 non-public tasks, mean rubric score: 0 if a blocking check fails, otherwise 70-100%), Terminal-Bench 4.0 (66 tasks, pass@1) and SWE-Atlas-QnA-AA (Scale AI's 124 tasks re-graded by AA with GPT-6 Luna (xhigh) as judge, five votes per criterion, 127 of 1,306 criteria reworded; Task Resolve Rate, pass@1). Three attempts per task. Against v1.5, DeepSWE v1.1 was replaced and SWE-Atlas-QnA was re-graded; the Terminal-Bench 4.0 values were also re-run. AA keeps the payload component id `swe-atlas-qna`, so a component id alone never makes v1.5 and v2.0 comparable.

The collector (`lib/aa-coding-agents.mjs`, `CODING_AGENT_CONTRACTS`) is pinned to v2.0. It requires every version statement on the page to say v2.0, the components `frontiercode-v1.1-main`, `swe-atlas-qna` and `terminal-bench-v4`, three results per row, one-third weights, finite 0–1 values and index arithmetic within 1e-9. Source evidence: `ops/cr-545/evidence/` (page and methodology captures with SHA-256 receipts, 2026-10-23T07:08Z).

The Benchmarks matrix merges "best of" across versions only for v1.4 and v1.5 (`data/benchmark-taxonomy.json`); v2.0 is a separate row.

## Handling and limits

AA-derived values remain subject to the repository's source-permission hold. Do not refresh, remove, or alter numeric AA rows until the written-permission question is resolved. The v1.4, v1.5 and v2.0 captures are separate dated snapshots, not a single continuous series. Any median or other display transform must follow an explicit permission decision and a reviewed change request.
