# CR-275 — JevBench v1.5.6 (Vansa-3.4)

One row added: **Vansa-3.4**, from its complete paid fast-lane run on 1 Oct 2026 (request f0ecbb92). Vansa's hosted
API answered all 1,624 decisions. We used the frozen v1.5 sample, scorer, headline-A method and G_med. No new inference
was run for this release, and no existing row, interval, method or price changed.

- **Source:** the delivered aggregate `result-vansa-3.4.json` (sha256 9616f8e4…), meta 2d8ad55d…, delivery receipt
  e507288c…, raw output 1db31aad… (private, never published). Scorer pins: manifest 8a4f7689…, adapter e63de1c3…,
  plus the v1.5 baseline, gold, headline and scorer files listed in `RESCORE-RECEIPT.json`.
- **Reproduction:** `rescore.py` re-ran the pinned official scorer offline on the stored raw output. The result
  matched the delivered aggregate exactly (A 71.5906; I 58.04, C 87.62, S 91.28, Cost 61.44).
- **Price:** the official row uses Vansa's stated API price of USD 0.034 per 1M input tokens, with no output charge.
  Under interpretation I-1, a launch list price counts from day 1. The closed-beta "no charges today" is a promotion
  and was not used. Vansa now reports a base model, so the 1 Oct 2026 rule for API models with a known base applies.
  The striped bar applies the Qwen3.5-4B base-model reference to the same measured tokens (921,181 input, 0 output).
  That reference is the frozen 25 Sep DeepInfra listing at USD 0.03/M input and 0.15/M output. It gives USD 0.0170
  per 1,000 decisions, Cost 63.07 and A 72.13.
- **Base model:** developer-reported, from private correspondence on 1 Oct 2026. Vansa-3.4 is built on Qwen3.5-4B via
  an open decision fine-tune, with Vansa's own adapters. The intermediate fine-tune is not named. It is shown as
  "Qwen3.5-4B (self-reported)" with that note, and it is never counted as a cited public disclosure. The publication
  GO is Florian's, dated 3 Oct 2026 (card16014 resolved).
- **Ranks:** Composite A #5 and B #5, C #6, Capability #7 (in class). The Capability top five is unchanged. The A and B
  composite top fives change: Plumb-4B (A) and JevK5 v0.3 (B) move to #6. This is covered by the paid fast-lane top-five
  exception and the explicit GO (`TOP-FIVE.json`).
- **Categories:** `categories.py` recomputed the topic and use-case aggregates from the stored per-item output and the
  existing frozen labels. First it checked that all 24 split/type/tier cells reproduce. Only aggregates are written.
  All prior systems are byte-identical to v1.5.5.
