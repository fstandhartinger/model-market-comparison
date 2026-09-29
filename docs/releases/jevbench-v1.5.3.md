# JevBench v1.5.3 — measured roster addendum A4

Six complete systems join the official A/B/C board; Eval Engine / Chromia Decision-4B is PARTIAL / UNRANKED. The release has 105 ranked systems and 111 roster entries. All three top-five orders are unchanged from v1.5.2. Earlier result artifacts, existing measurements, frozen method and G_med remain unchanged. Existing tie markers survive only where their pairs remain adjacent; no new paired rank comparison is claimed.

| System | A score | A / B / C rank | Valid coverage |
|---|---:|---|---|
| Instinct Dual 4B | 46.968 | 26 / 30 / 31 | 1,624/1,624 |
| Bev / Bonsai 27B | 15.767 | 60 / 60 / 61 | 1,624/1,624 |
| Bosun v3.1 0.6B | 2.500 | 72 / 72 / 72 | 1,624/1,624 |
| Deem 0.8B v1 | 2.138 | 74 / 74 / 74 | 1,624/1,624 |
| Laya multilingual | 0.019 | 85 / 85 / 85 | 1,624/1,624 |
| Laya typed-decisions | 0.000 | 105 / 105 / 105 | 1,624/1,624 |
| Decision-4B (Eval Engine / Chromia) | — | UNRANKED | 1,550/1,624 |

Zero-score ties retain the prior board order; the new typed-decisions row follows those existing tied rows. The numerical rank is not evidence of a statistically significant difference.

All runs used the frozen 904 public/open + 720 sealed items. Only aggregates are public. The new API flag applies only to Instinct: the operator received sealed item text without answers. Its served model identity is dated, not an independently verifiable immutable checkpoint. The row discloses prior sealed-text exposure, public-set method selection, demo latency adjustment, and a base-model price estimate instead of the announced tariff.

Bev and Deem carry their submitted interface limitations and evaluator adaptations in each row. Laya's two sub-checkpoints and Bosun were measured on a shared CPU, with their raw and adjusted latencies disclosed. Bosun's float32 deviation is disclosed without claiming numerical parity with bfloat16. Decision-4B overflowed our evaluator's configured 2,048-token context on 74 requests; its public row has no composite, axis score, interval or rank. This is not a claim about a submitted API's limit.

## Release-side mmBERT price-listing adoption

The release owner adopts `jhu-clsp/mmBERT-base` as **unlisted in the frozen 25 September snapshots** for A4. This is a versioned release extension to the unlisted-base table; the original frozen pricing module and previous releases are not rewritten.

The release verifier independently searched identifiers in all 458 OpenRouter entries and 383 DeepInfra entries: no `mmbert`, `jhu`, or `clsp` match. This is evidence about the frozen snapshots, not a claim that no provider anywhere offers mmBERT. Laya multilingual uses the labelled same-class hosted-encoder estimate of $0.01/M input and $0/M output, on its own reported 638,872 input tokens across 1,624 decisions. The cost is $0.003933940886699508 per 1,000 decisions. Independently flooring the same usage against frozen `BAAI/bge-m3` yields exactly the same cost (delta 0.0).

Frozen snapshot hashes:

- OpenRouter: `f5d0cd8e0f7d2d6514748c99bfcaeacc09775bac7aa7eecf765af4ba04b0dcd5`
- DeepInfra: `84eb7926acd4e93b71d695be24898e2ca999b20011d1b66cc0348ce7c6c3546f`

## Scoring provenance

The measured candidate aggregates are r27 `8bb335c0515c2d6e8542073c02df65155c06618bb5aacd7fd966ee9cc5bff10e` and r30 `d0a2f72ae9176a255acb3e34f7bd3aa2d90891aba0fb8d8dbbeca91453ab1ae3`. Their raw-output, metadata and adapter-spec digests were verified by the release owner. The released scorer dependency manifest `2fc8f3cde46953c49e924cbea05996261367c4cfce4b96a4c4be2ab6447a3826` still matches the five frozen modules/registry used.

Independent standard-library recomputation imports no official scorer. It recomputes all six complete rows from pinned outputs and frozen gold, including axes, latency, price, composites and 2,000 paired stratified bootstrap replicates at seed 15. Maximum absolute discrepancy is `3.552713678800501e-14`. Its aggregate-only receipt is `0c3bde7cb7d457c074d9cf6b5c924f0dd2c2efb6f9067d0ba403c6f72848060e`. Duplicate, unknown and missing item counts are zero for all seven runs; Decision-4B alone has 74 invalid/failed answers. Its biased incomplete diagnostics are not published.

The A4 sidecar binds the source and recomputation hashes plus the release-side price adoption. The builder pins v1.5.2 (`01e1f0019ca3bd3b1183f5b701f069ba0c7bf52462d1103f88a03e01339c968b`), enforces coverage/rankability and checks every top five. The public versioned API exposes exact result bytes with `X-Content-SHA256`.
