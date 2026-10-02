# JevBench v1.5 — pricing addendum interpretation note 1 (disclosed)

**Applies to:** `METHOD-v1.5-ADDENDUM-PRICING.md` (v1.5-M2, SHA-256
2fc44459ef801d0627062f7eefd973df40772e8ac117727479748e4be4c220cc). Neither that file nor
`METHOD-v1.5.md` (SHA-256 c25d3d8b8512e4d93370a9e0c99705d19b2a9389956ca33b8a4bd2b0ec501c07) is
edited. The frozen sample, weights, Cost formula, token pooling, snapshots and every other rule stay
unchanged.

**Disclosure (integrity rule, METHOD §0).** Written on 2026-09-26 at about 15:40 UTC. It follows
Florian's decision in a Claude Code chat at about 15:20 UTC: "OK. Yeah, let's keep the Jev launch price as
the assumed price for Jev." That "OK" approved the recommendation relayed on board #1976. **No official
v1.5 score existed when this note was written.** Only the B=0 diagnostic run of 25 Sep existed, and it
left these rows unpriced and unranked. The author did not compute a composite, rank or cost for any
row below before hashing this note.

## I-1. A manufacturer's standard launch list price counts from day 1

Rule 1.2 of M2 (30 days continuously in effect) guards against **price cuts**. It does not apply to
the first price a manufacturer publishes as its standard, non-promotional list price at launch. That
price counts from the day it is published. All of rule 1.1 and 1.3 still applies. A launch price
that is a promotion, introductory discount, credit, free tier, batch or commitment discount does not
count.

- A **later cut** that is younger than 30 days at the price cut-off still does not count; the previous
  counting price is used (rule 1.2 unchanged).
- A **later increase** counts at once (rule 1.2 unchanged).
- The base-model price floor (M2 §2) still applies wherever the system has an identifiable base model
  with a market reference.

Rows this changes (evidence: dated pages under
`jevbench-v15-measure-20260925/receipts/pricing-interp-1/`, `SHA256SUMS` there, plus the 25 Sep
receipts):

| Row | Counting list price | Evidence |
|---|---|---|
| `jev-1.13.0` | USD 0.042 / M input, USD 0 output (launched 18 Sep 2026) | OpenRouter listing receipt 25 Sep (`OPENROUTER-JEV-1.13-20260925.json`), TypeSafe model docs 26 Sep |
| `gpt-6-luna`, `gpt-6-luna-low` | USD 0.10 / M input, USD 0.50 / M output (standard, non-batch; published 22 Sep 2026) | OpenRouter catalog 25 Sep, model page 26 Sep (`promotion_message: null`); the `:batch` discount is not counted |
| `decision-machine-1` | USD 0.04 / M input, USD 0 output | milliseconds.ai pricing page 26 Sep. The monthly free test-key allowance is a free tier and is not counted |

None of these rows has an identifiable public base model, so no floor applies. Cost = list price ×
the row's own measured tokens, pooled over 1,624 decisions (METHOD §5).

## I-2. Token-less rows use the measured proxy tokens (#1618)

A complete row that returned no token usage is priced from the **measured proxy tokens** of the
frozen v1.5 proxy receipt `receipts/V15-PROXY-TOKENS.json` (SHA-256
6f8e61dc8b68a59189717d7ca01c246988400c27f0f2ebc0de229c6db977ac32). That receipt holds the pooled input
tokens measured on the complete official Gemini 3.1 Flash Lite run over the same 1,624 frozen
inputs: 906,800 in total, 558.37 per decision. Output tokens are the row's documented output per
decision. For no-generation readout backends (logits or embedding readout, verified in the signed
adapter code) this is 0. These rows are labelled **ESTIMATE (proxy tokens)**.

- Wherever the base-model floor applies, it is computed on the **same proxy tokens**, and
  cost = max(list-price cost, floor cost) as in M2 §2. Without a counting list price, the cost is the
  floor itself (base-model estimate).
- `jev-qwen3.5-9b-base-nvfp4`: base `Qwen/Qwen3.5-9B` → OpenRouter `qwen/qwen3.5-9b` (25 Sep
  snapshot); output 0.
- `open-alternative-jev`: base `Qwen/Qwen3.5-4B` → DeepInfra `Qwen/Qwen3.5-4B` (25 Sep snapshot);
  output 0.
- `classifier-dev-fast`: a TypeSafe Jev-based classification API; output tokens are not billed. The
  25 Sep price basis was the Pro plan: USD 20/month for 200,000 fast classifications/day, read
  19 Sep, i.e. USD 0.0033 per 1,000 at full use. The 26 Sep public page lists a usage tariff of USD
  0.042 / M input tokens. That change is younger than 30 days, so rule 1.2 decides: a cut would not
  count, and an increase counts at once. The counting cost is therefore the **higher** of (a) the
  19 Sep plan cost per 1,000 decisions and (b) the usage tariff × proxy input tokens. No base floor
  applies.
- Rows already covered by the eleven receipt estimates are unchanged.

## I-3. Price snapshot for deprecated reference listings (board #1941/#1960)

The market reference is the one in the **frozen 25 Sep price cut-off snapshots** (M2 §2: "snapshotted
at the release's price cut-off date"). A reference listing that its host deprecates after the cut-off
stays the frozen reference for v1.5.0. The row carries a visible note. Under M2 §3, a later
reference change triggers a re-score in the next release. The DeepInfra `Qwen/Qwen3.5-4B` listing
at USD 0.03 / 0.15 per M is affected: it was still listed with a price on 26 Sep, deprecated and
replaced by Qwen3.5-9B.

## I-4. Jev-class presentation anchor (board #1532/#1934)

Jev 1.13.0 is now priced under I-1. The Jev-class filter Florian already approved (cost and median
latency each at most 2× Jev 1.13.0) therefore uses Jev 1.13.0's own scored v1.5 cost and adjusted
median latency as its anchor. This is presentation only and does not change the scorer.
