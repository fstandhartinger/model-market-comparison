# Capability Score headline, eligibility caps and API pricing (1 Oct 2026)

Owner decision: Florian, 1 Oct 2026, standing until he changes it. Applies to JevBench from v1.5.4 (presentation; no
score changes) and to ImageJevBench from v0.1.5.

## 1. The headline is the Capability Score

The top of both benchmark pages is the **JevBench Capability Score** and the **JevImageBench Capability Score**:

    Capability Score = (Intelligence + Calibration) / 2

The four-axis composite (Intelligence, Calibration, Speed, Cost; equal-weight harmonic mean with low-axis gates) stays
published unchanged, as the secondary ranking further down the page.

Why: speed and cost are easy to influence (where and how a model is hosted, promotional or cross-subsidised prices,
batching) and they rest on assumptions we have to make (provider list prices for self-served weights, the latency
adjustment for self-hosted endpoints). Intelligence and Calibration are measured on the same frozen decisions for
every system.

## 2. Eligibility cap: only Jev-class systems are ranked

Speed and cost are not dropped. They become a gate: a system enters the Capability Score ranking only if

- its cost per 1,000 decisions is at most **2×** the anchor's, **and**
- its median latency (the adjusted p50, as plotted in the speed chart) is at most **2×** the anchor's.

Systems outside the cap stay listed below a divider, sorted by Capability, each with the limit it misses. So no slow
or expensive general-purpose LLM can top the list.

**JevBench anchor:** Jev 1.13.0 in the same release (v1.5.4: USD 0.0323 per 1,000 decisions, 0.616 s median),
so the caps are USD 0.0646 and 1.233 s. 60 of the 106 ranked v1.5.4 systems qualify.

**ImageJevBench anchor:** Jev cannot read images, so there is no Jev row on ImageJevBench. We use the **same absolute
envelope** as JevBench: ≤ USD 0.0646 per 1,000 decisions and ≤ 1.233 s median latency, frozen in the v0.1.5 artifact
(`capability_eligibility`) so a later JevBench release does not move it silently. Reasoning: a decision model in this
class should fit the same per-decision budget whether its input is text or an image. With these caps 38 of the 50
v0.1.5 systems qualify (76 %, a larger share than JevBench's 60 of 106), so 2× does not disqualify too many and is kept,
identical to JevBench. Loosening to 3× would add 7 Jev-compatible fine-tunes that sit just above the 2× cost line
(2.1–2.9× cost); the general-purpose hosted LLMs (GPT-6 Luna, GPT-5.6 Luna, Gemini 3.1 Flash Lite, Gemini 3.8 Flash)
stay outside even at 3× (6.7–64× cost).

## 3. Traffic-light bars

Every Capability row shows two thin bars on a shared log scale of the ratio to the anchor (0.25× … 64×):

- **Cost** (per 1,000 decisions) and **Latency** (median).
- Green up to 1× the anchor (as cheap or fast as Jev or better), amber from 1× to the 2× cap (inside the cap, but
  borderline), red beyond the cap (outside the class).

We checked whether one bar could stand in for both. On JevBench v1.5.4, log cost and log median latency are almost
uncorrelated across the 109 systems that report both (Spearman ρ = 0.09), so one bar would mislead and each axis gets
its own. On ImageJevBench they correlate strongly (Spearman ρ = 0.90 on v0.1.5, n = 50), but mostly mechanically: self-hosted cost there
is measured GPU time × a GPU-hour rate. Both bars are kept for consistency.

## 4. API models with a known base model: ranked at their own API price

API models whose base model we know are ranked in the composite at the **developer's own stated API price**. A second,
**striped** bar shows the score and the rank they would have at the **base-model reference price**, the way we price
self-served open weights of the same base: that base model's list price at a large inference provider. This
supersedes the earlier base-model price floor for such API models. The 30-day price rule is waived where the owner
decides so explicitly. For Wity-1 on 1 Oct 2026 the tariff was younger than 30 days.

First application: **Wity-1** (ImageJevBench v0.1.5). Wity's stated tariff is USD 0.042 per million input tokens, with
output, thinking and images free. That gives USD 0.0074 per 1,000 decisions on the full split, Cost 73.92 and composite
**80.20 (#1)**. At the Qwen3.6-35B-A3B base-model reference (USD 0.15/M input, USD 1.00/M output) it would be USD 0.0264
per 1,000 decisions, Cost 57.33 and composite 74.36 (#2), shown as the striped bar. Details:
`data/raw/benchmarks/jevbench/multimodal-preview/PRICING-v0.1.5.md`.

**In the Capability Score (CR-250, Florian 1 Oct 2026):** eligibility for the Jev-class cost cap is also checked at the
developer's own API list price. Such a row carries the **API** tag and a short note saying whether it would still fit
within, or exceed, the cost cap at the base-model reference price; the tooltip gives both prices and the ratio. Only cost
moves; latency is measured on the developer's endpoint either way, and the Capability Score itself does not depend on
price. Wity-1: USD 0.0264 per 1,000 decisions at the base-model reference = 0.82× Jev 1.13.0, so it would **still fit
within** the 2× cost cap (USD 0.0646); its eligibility does not depend on the low API tariff.

JevBench rows that today are priced at a base-model reference because their operator tariff was excluded by the
30-day rule are not re-scored in this presentation release. Any change there comes with the next JevBench version.
