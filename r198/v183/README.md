# JevBench v1.8.3 candidate pipeline

Three new, unranked rows: Piccolo 27B, allec-oavg and Cribl Decision 1.0 9B. Built on live v1.8.2 at f5716874d; no carried-row exceptions. Publication stays PENDING for independent review.

The lead authorised the exact allec disclosure clause; public_text_exception.py and the production loader enforce its single row/field/string binding. GPU-time costs retain the exact frozen v1.8.2 processed-token and architecture-throughput arithmetic; loop durations are disclosure only.

Inputs contain aggregates and pinned public metadata only. Sandy-only scoring copies stay outside this repository. Run rebuild_v183.sh for deterministic assembly, heavy_v183.sh through heavy-run for the comparison, validator, tsc, scoped suites and synthetic production build/captures. check_source_v183.py and check_raw_pricing_v183.py run on Sandy. check_ref_pin_v183.py forbids placeholders and verifies repo@revision composition.

The .pass directory is an isolated synthetic fixture. flip_verdict_v183.py was exercised only with --dry-run. freeze_v183.py refuses PENDING and can only emit a review receipt; seal_v183.py is a release-owner helper and must never run in a worker build.
