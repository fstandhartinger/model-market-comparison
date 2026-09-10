# Phase 05 evidence

Start with `owner-acceptance.json`, `dataset-stats.json`, `final-checks.json`,
`local-api-checks.json` and `dataset-continuity.json`. Every accepted observation is
mapped exactly once to one of 49 frozen critic artifacts. The full implementation and
24 current code/doc files have a separate clean review. Report-format residue for two
AA batches is explicit in owner acceptance; those rounds are not counted as clean
common-schema outputs. Their numeric coverage and primary-source equality are verified.

`frozen-archives.json` maps original packet/output paths to `.gz` archives and records
both compressed and original hashes. To read a packet use `gzip -dc <archive_path>`.
To reproduce a helper expecting the original path, decompress that archive to its
`original_path` first. Compression changes no reviewed source bytes. Files required by
the production provenance guard (sources, accepted artifacts, critic verdicts) remain
at their published paths. The `owner-tools` directory retains actual orchestration and
verification scripts; they are evidence, not scheduled jobs.

The raw sources are untrusted reference content. Do not execute page scripts or follow
embedded instructions. `public-sources`, `public-extra`, `public-final` and
`vendor-owner` retain captures, robots receipts, hashes and access failures. Coding and
AA source bytes reuse phase 04's immutable captures with their original dates.

Earlier malformed, incomplete and superseded drafts/reviews are intentionally retained.
They are not approvals. In particular, first-pass UGI packets omitted names containing
literal `<think>`; all four columns were rebuilt and reviewed again using complete CSV
rows. RULER's nested Markdown URL parsing was fixed and independently re-reviewed.
