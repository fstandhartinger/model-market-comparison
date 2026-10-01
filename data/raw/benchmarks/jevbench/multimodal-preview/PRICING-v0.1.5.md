# Image JevBench v0.1.5: Wity-1 API price basis

Decision: Florian selected Wity-1's stated API tariff on 1 Oct 2026. His decision supersedes the 30-day pricing rule for this case. The v0.1 split, measured outputs, axes other than Cost, scoring formula, and every other system's score remain unchanged.

Wity's pricing page, captured at `/home/flori/jobs/wity-nemotron-entries-20260928/evidence/wity-pricing-live.20260929.html`, states USD 0.042 per million input tokens; output, thinking, and images are free. The tariff is younger than 30 days. The 684-decision run returned 120,542 input tokens and zero output tokens, so the stated API charge is `120542 × 0.042 / 1000000 = USD 0.005062764` for the full track, or USD 0.007401701754 per 1,000 decisions.

The unchanged Cost score is `min(100, 100 − 30·log10(usd_per_1000 / 0.001))`. The four axes keep their equal-weight harmonic mean, followed by the existing v1.4 gates below 50. Applying the tariff gives Wity-1 a Cost score of 73.920053 and a headline composite of 80.198539, rank #1 of 50. Imajev-4B becomes #2 at 76.387987.

| Track | API tariff: USD/1k | Cost score | Composite | Base-model alternative: USD/1k | Alternative composite |
| --- | ---: | ---: | ---: | ---: | ---: |
| all | 0.007401702 | 73.920053 | 80.198539 | 0.026434649 | 74.363945 |
| core | 0.008129436 | 72.698188 | 78.625265 | 0.029033700 | 72.806783 |
| everyday photo | 0.005424163 | 77.970018 | 84.164242 | 0.019372011 | 78.444651 |

The alternative applies the Qwen3.6-35B-A3B base-model market reference of USD 0.15/M input and USD 1.00/M output to Wity's measured usage. The run returned zero output tokens, so the output rate contributes zero; its headline composite would be 74.363945, rank #2.

Images and thinking are unbilled by the API and are not quantified in its usage receipt. The exact deployed Wity server build remains under author review and could require a rerun and revised score. The live tariff can change; this artifact freezes the 1 Oct owner decision and the measured usage used for it.
