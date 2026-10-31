# JevBench v1.8.4 candidate pipeline

One unranked addition: Granite Switch 4.1 8B, decision adapter revision 4.1.1, on the 27 October draw. Predecessor is the sealed v1.8.3 candidate 49183e72a14d65353e6a4d534a6fb404e17901c2. Publication remains PENDING for independent review. The three SHA-pinned carried text exceptions clarify z3 cleanup/ten-second treatment and allec's supported-type denominator; every carried number and archived artifact remains unchanged.

The declared Granite4.1 base is preserved. Its admitted Granite4.2 sibling reference is USD0.06/M input and USD0.25/M output. Native usage retains generated output tokens. Granite is outside the six calibrated Gemma/Qwen cost classes, so the existing v1.8 fallback retains the sibling estimate; GPU-time components are null. No throughput is invented from another family, observed loop duration or pod bill.

Inputs contain aggregate scorer outputs and pinned public metadata only. Private scoring copies stay outside this repository. Use rebuild_v184.sh for deterministic assembly and heavy_v184.sh through heavy-run for comparison, validator, tsc, focused suites and a synthetic production build/captures. check_source_v184.py and check_raw_pricing_v184.py run on Sandy. check_ref_pin_v184.py forbids placeholders and verifies repo@revision composition. The carried allec exception is constrained to its exact sentence prefix and exact allowed word span.

The .pass directory is an isolated synthetic fixture. flip_verdict_v184.py may only be exercised with --dry-run during build/review. freeze_v184.py refuses PENDING and emits only a dry-run review receipt; seal_v184.py belongs to the release owner and is never run by a builder.
