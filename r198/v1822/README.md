# JevBench v1.8.22 candidate

Eight unranked rows: six self-hosted on the unequated 22 Nov draw, two hosted APUS rows on the equated 27 Oct draw. APUS is unpriced with null cost, composite and rank. All 358 v1.8.21 systems, category cells, boards and top fives carry unchanged. Review and approval stay PENDING; public readers hide the candidate.

Mica: first not-measured -> measured key transition; lead authorisation r259 (rule 6 revised). Only mica-v01-4b leaves not_measured. The historic v1.8.21 artifact stays unchanged.

Build twice with build_v1822.py; snapshot with scripts/build-jevbench-v1822-alldata.mjs; validate with validate_v1822.mjs. Inputs/SOURCE-PINS and PROVENANCE record full source digests and per-row critics. The build uses only pinned aggregates and the frozen first-party composite checker; no sealed raw reads or rescoring. Mica M1 and both recommended text fixes are applied verbatim. Decibel has a GPU-time estimate only; the other self-hosted rows use min(frozen list, GPU-time).

Topics use the predecessor exception mechanism and stay absent while review is PENDING. Display cells require n and completed coverage >= 30. Categories remain raw, including APUS. The non-latest d1027 releases list includes v1.8.22 as v1.8.19 did; its latest_release stays v1.8.19 per the APUS delta's releases-only scope.

PR #705 / CR-852 archive allowlist coordination: whichever merges second must list v1.8.22. The lead owns CR allocation, push, PR creation (paid-order, no bh-merge-ready), review binding and publication.
