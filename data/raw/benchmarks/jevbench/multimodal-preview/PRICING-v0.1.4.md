# Image JevBench v0.1.4: Wity-1 price basis

Decision: Florian selected the base-model price for Wity-1 on 29 Sep 2026 (reply to release pricing question, Telegram 15830). This resolves the independent new-#1 cost-basis review before publication. The frozen Image JevBench v0.1 split, weights, score formulas and all other rows remain unchanged.

The Wity-1 hosted run returned usage for all 684 decisions: 120,542 input tokens and zero output tokens. Its public tariff of USD 0.042 per million input tokens, free output, and unbilled image and thinking work is too new for the JevBench 30-day price rule and is below the base-model market reference. The same system's JevBench v1.5 A3 roster uses the exact Qwen3.6-35B-A3B reference: USD 0.15 per million input tokens and USD 1.00 per million output tokens. The A3 roster SHA-256 is `369d916b4ba00e48e6bc4669c7d05feaa9614554887ec9a3c721c231ed734648`.

For this Image JevBench revision, apply those base-model rates to the measured Wity usage receipts in each track. Zero output tokens means the output rate contributes zero. Whole-benchmark estimated cost is `120542 × 0.15 / 1000000 = USD 0.0180813`, or USD 0.026434649 per 1,000 decisions. The Cost axis and four-axis harmonic composite are recomputed using the unchanged v0.1 formulas. The result is Wity-1 at 74.363945, rank #2 of 50; Imajev-4B remains #1 at 76.387987.

This estimate uses the API's reported text-token usage. The API does not bill images or thinking, and its receipts do not quantify those units, so this estimate may still understate the base model's full image-compute cost. This caveat remains visible on the public page. Wity-1's exact deployed server build also remains under author review and may prompt a complete rerun and revised score.
