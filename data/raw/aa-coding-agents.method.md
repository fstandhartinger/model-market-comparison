# Artificial Analysis Coding Agent Index — collection notes

## Retained snapshots

- **v1.4 legacy snapshot**: `data/raw/aa-coding-agents.json`, collected 2026-09-09, 68 rows. This is the dated v1.4 input used by the existing Composite path.
- **v1.5 snapshot**: `data/raw/aa-coding-agents-v1.5.json`, collected 2026-09-23, 19 complete rows. Keep v1.5 separate from v1.4; never combine values across versions.
- Method source dates and endpoints above were read from the two retained snapshot headers on 2026-09-24. No live AA values were fetched for this documentation correction.

## v1.4 source and extraction

The v1.4 rows were retained from Artificial Analysis's Coding Agent Index page payload. The raw snapshot records the source URL, collection date, row identity, score and completeness fields. The earlier note that described a 2026-07-22 collection is stale; it did not match the retained 2026-09-09 snapshot.

## v1.5 source and validation

The v1.5 collector is `scripts/fetch-aa-coding-agents.mjs`, using `lib/aa-coding-agents.mjs` on `https://artificialanalysis.ai/agents/coding-agents`. It decodes the page's Flight JSON and resolves the full `benchmarkRows` array. It requires the v1.5 marker, the three expected components (`deep-swe-v1.1`, `swe-atlas-qna`, `terminal-bench-v4`), exactly three component results per row, one-third weights, finite 0–1 values, and agreement between each index score and the weighted component mean before atomic replacement.

## Handling and limits

AA-derived values remain subject to the repository's source-permission hold. Do not refresh, remove, or alter numeric AA rows until the written-permission question is resolved. The v1.4 and v1.5 captures are separate dated snapshots, not a single continuous series. Any median or other display transform must follow an explicit permission decision and a reviewed change request.
