> [!WARNING]
> **Work in progress — preliminary results, please don't share or cite yet.**

# JevBench v1.2 results — the hard tier

Generated 2026-09-19T12:26:36+00:00 · protocol `jevbench::v1.2` · 534 decisions per system (72 easy · 96 standard · 146 judge · **220 hard, new**) · artifact [`results/v1.2/jevbench-v1.2-results.json`](results/v1.2/jevbench-v1.2-results.json)

## What changed from v1.1.2

- **A hard tier of 220 decisions** (111 public in `datasets/public/hard.jsonl`, 109 held out). The three v1.1 tiers were saturated — the top five systems scored 97–98 % — so they could no longer separate the leaders.
- **Capability is weighted towards the hard tier**: easy 10 %, standard 20 %, judge 20 %, hard 50 %.
- **Calibration is now its own sub-score** (hard tier: ECE + fidelity to exact gold distributions). It is published beside the Main Score and enters only the 'Balanced + Calibration' preset.
- **Cost is pooled over all 534 decisions.** Hard items are long (up to ~6k tokens), so every system's cost per decision rises.
- Main Score weights unchanged (Balanced 33:33:33); speed unchanged (v1.1.2 serial run), with endpoint conditions named per row.

![Main Score](results/v1.2/charts/main-score.png)

## Ranking (Main Score, Balanced 33:33:33)

| # | System | Main | Capability | Hard tier | Speed | Cost | $ / 1,000 | Calibration | Endpoint |
|---|---|---|---|---|---|---|---|---|---|
| 1 | SemIf, formerly OpenJev (Qwen3.5-4B, TheoLeeCJ) | **74.8** | 78.4 | 59.5 % | 80.1 | 66.0 | ~$0.023 est. | 72.6 | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 2 | open-alternative-jev, author's yes/no order* (post-hoc adapter mode) | **72.0** | 70.2 | 56.8 % | 79.4 | 66.4 | ~$0.022 est. | 63.2 | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 3 | OpenJev (DiffusionGemma 26B-A4B NVFP4, razorback16) | **70.9** | 80.1 | 65.5 % | 78.3 | 54.3 | ~$0.067 est. | 64.8 | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 4 | open-alternative-jev (Qwen3.5-4B, IkerMoel) | **69.9** | 63.9 | 55.0 % | 79.6 | 66.4 | ~$0.022 est. | 61.1 | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 5 | system-one (Qwen3-8B, Sean Goedecke) | **68.3** | 71.5 | 50.0 % | 82.4 | 51.0 | ~$0.092 est. | 36.8 | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 6 | Jev 1.13.0 (TypeSafe AI) | **67.9** | 85.7 | 74.1 % | 58.2 | 59.8 | $0.041 | 82.7 | production API (api.typesafe.ai) |
| 7 | system-one-open (Gemma 4 E2B LoRA on an L4) | **66.1** | 70.8 | 49.1 % | 57.5 | 70.1 | ~$0.016 est. | 56.7 | author's public demo endpoint (Modal, L4) — not a production service |
| 8 | Bespoke Nimble 9B (Bespoke Labs) | **64.8** | 68.6 | 43.6 % | 76.7 | 49.1 | ~$0.109 est. | 64.5 | our RunPod GPU (A40 48 GB (EU-SE-1)), reached over the internet |
| 9 | openjev-sglang (Qwen3.6-35B-A3B on SGLang) | **62.8** | 83.9 | 71.4 % | 57.7 | 46.8 | ~$0.135 est. | 77.4 | author's public demo endpoint (Modal) — not a production service |
| 10 | GPT-5.6 Luna (low reasoning effort) | **60.1** | 96.2 | 94.5 % | 43.9 | 40.2 | $0.247 | 89.8 | production API (OpenAI), reasoning effort low |
| 11 | Gemini 3.1 Flash-Lite | **59.9** | 85.9 | 75.0 % | 54.5 | 39.3 | $0.268 | 68.1 | production API (Google) |
| 12 | open-jev-deberta-v3-large (local CPU) | **52.4** | 48.7 | 36.4 % | 30.7 | 77.8 | ~$0.008 est. | 66.4 | our CPU (2 threads, Ryzen 5 3600) |
| 13 | DeepSeek V4.1 Flash (thinking default) | **51.9** | 95.8 | 95.0 % | 29.0 | 30.9 | $0.579 | 96.7 | production API (DeepSeek) |
| – | Needle 3 (Cactus, 2-bit, local CPU) *(partial run, not ranked)* | — | — | 17/44 attempted (39 %) | 19.3 | — | — | — | our CPU (2 threads, Ryzen 5 3600) |
| – | Qwen3.8 27B (Chutes TEE) *(partial run, not ranked)* | — | — | 47/51 attempted (92 %) | 6.0 | — | — | 92.1 | Chutes shared inference (TEE) |
| – | Needle 3, options as tools (post-hoc adapter mode) *(partial run, not ranked)* | — | — | — | 10.6 | — | — | — | our CPU (2 threads, Ryzen 5 3600) |

## The same systems under other views

| System | Balanced 33:33:33 | Emphasis on Accuracy 60:20:20 | Emphasis on Speed 20:60:20 | Emphasis on Cost 20:20:60 | Capability only | Balanced + Calibration 25:25:25:25 | Measured prices only | Self-host sensitivity |
|---|---|---|---|---|---|---|---|---|
| SemIf (Qwen3.5-4B) | 74.8 (#1) | 76.3 (#1) | 76.9 (#1) | 71.3 (#1) | 78.4 (#7) | 74.3 (#1) | — (estimated cost) | 73.3 ($0.035/1k) |
| open-alternative-jev, yes/no order* | 72.0 (#2) | 71.3 (#5) | 74.9 (#2) | 69.7 (#2) | 70.2 (#10) | 69.8 (#3) | — (estimated cost) | 70.1 ($0.037/1k) |
| OpenJev razorback16 (DiffusionGemma 26B) | 70.9 (#3) | 74.6 (#3) | 73.9 (#4) | 64.3 (#6) | 80.1 (#6) | 69.4 (#4) | — (estimated cost) | 72.6 ($0.042/1k) |
| open-alternative-jev (Qwen3.5-4B) | 69.9 (#4) | 67.5 (#11) | 73.8 (#5) | 68.5 (#3) | 63.9 (#12) | 67.7 (#5) | — (estimated cost) | 68.1 ($0.037/1k) |
| system-one (Qwen3-8B, Goedecke) | 68.3 (#5) | 69.6 (#8) | 73.9 (#3) | 61.4 (#8) | 71.5 (#8) | 60.4 (#12) | — (estimated cost) | 72.3 ($0.030/1k) |
| Jev 1.13.0 | 67.9 (#6) | 75.0 (#2) | 64.0 (#7) | 64.7 (#5) | 85.7 (#4) | 71.6 (#2) | #1 | 67.9 (tariff) |
| system-one-open | 66.1 (#7) | 68.0 (#10) | 62.7 (#8) | 67.7 (#4) | 70.8 (#9) | 63.8 (#9) | — (estimated cost) | 60.9 ($0.066/1k) |
| Bespoke Nimble 9B | 64.8 (#8) | 66.3 (#12) | 69.6 (#6) | 58.5 (#9) | 68.6 (#11) | 64.7 (#8) | — (estimated cost) | 70.6 ($0.022/1k) |
| openjev-sglang | 62.8 (#9) | 71.2 (#6) | 60.8 (#9) | 56.4 (#10) | 83.9 (#5) | 66.4 (#7) | — (estimated cost) | 62.7 ($0.136/1k) |
| GPT-5.6 Luna (low) | 60.1 (#10) | 74.5 (#4) | 53.6 (#11) | 52.1 (#11) | 96.2 (#1) | 67.5 (#6) | #2 | 60.1 (tariff) |
| Gemini 3.1 Flash-Lite | 59.9 (#11) | 70.3 (#7) | 57.7 (#10) | 51.7 (#12) | 85.9 (#3) | 61.9 (#11) | #3 | 59.9 (tariff) |
| open-jev-deberta-v3-large | 52.4 (#12) | 50.9 (#13) | 43.7 (#12) | 62.5 (#7) | 48.7 (#13) | 55.9 (#13) | — (estimated cost) | 50.2 ($0.014/1k) |
| DeepSeek V4.1 Flash | 51.9 (#13) | 69.5 (#9) | 42.7 (#13) | 43.5 (#13) | 95.8 (#2) | 63.1 (#10) | #4 | 51.9 (tariff) |

- **Measured prices only** ranks the systems whose cost is a measured public tariff (Jev, Gemini, GPT-5.6 Luna, DeepSeek); systems priced by estimate are left out of that view.
- **Self-host sensitivity:** open weights priced as a dedicated on-demand machine billed around the clock at 30 % utilisation (GPU servers handling 4 requests in parallel at the measured latency; CPU models on a 2-vCPU Hetzner CX22). Ranking under it: SemIf (Qwen3.5-4B) 73.3, OpenJev razorback16 (DiffusionGemma 26B) 72.6, system-one (Qwen3-8B, Goedecke) 72.3, Bespoke Nimble 9B 70.6, open-alternative-jev, yes/no order* 70.1, open-alternative-jev (Qwen3.5-4B) 68.1, Jev 1.13.0 67.9, openjev-sglang 62.7, system-one-open 60.9, GPT-5.6 Luna (low) 60.1, Gemini 3.1 Flash-Lite 59.9, DeepSeek V4.1 Flash 51.9, open-jev-deberta-v3-large 50.2.

| Open system | Machine | $/h | Decisions/h at 30 % | $ / 1,000 self-hosted | vs. hosted-provider estimate |
|---|---|---|---|---|---|
| SemIf (Qwen3.5-4B) | 1x RTX PRO 4500 Blackwell 32 GB (EU-RO-1) (on-demand, RunPod secure) | $0.72 | 20735 | $0.035 | ~$0.023 est. |
| open-alternative-jev, yes/no order* | 1x RTX PRO 4500 Blackwell 32 GB (EU-RO-1) (on-demand, RunPod secure) | $0.72 | 19548 | $0.037 | ~$0.022 est. |
| OpenJev razorback16 (DiffusionGemma 26B) | 1x RTX PRO 4500 Blackwell 32 GB (EU-RO-1) (on-demand, RunPod secure) | $0.72 | 16964 | $0.042 | ~$0.067 est. |
| open-alternative-jev (Qwen3.5-4B) | 1x RTX PRO 4500 Blackwell 32 GB (EU-RO-1) (on-demand, RunPod secure) | $0.72 | 19710 | $0.037 | ~$0.022 est. |
| system-one (Qwen3-8B, Goedecke) | 1x RTX PRO 4500 Blackwell 32 GB (EU-RO-1) (on-demand, RunPod secure) | $0.72 | 23613 | $0.030 | ~$0.092 est. |
| system-one-open | 1x L4 24 GB (Gemma 4 E2B + LoRA) | $0.43 | 6521 | $0.066 | ~$0.016 est. |
| Bespoke Nimble 9B | 1x A40 48 GB (EU-SE-1) (on-demand, RunPod secure) | $0.49 | 22532 | $0.022 | ~$0.109 est. |
| openjev-sglang | 1x L40S 48 GB (Qwen3.6-35B-A3B, SGLang) | $0.86 | 6314 | $0.136 | ~$0.135 est. |
| open-jev-deberta-v3-large | Hetzner CX22 (2 vCPU) | $0.0072 | 508 | $0.014 | ~$0.008 est. |
| Needle 3 | Hetzner CX22 (2 vCPU) | $0.0072 | 121 | $0.060 | ~$0.025 est. |
| Qwen3.8 27B | 1x A100 80 GB (Qwen3.8-27B bf16) | $1.39 | 366 | $3.802 | ~$2.711 est. |

## Hard tier

![Hard tier](results/v1.2/charts/hard-tier.png)

![Hard tier by family](results/v1.2/charts/hard-families.png)

## Calibration

![Calibration](results/v1.2/charts/calibration.png)

| System | Calibration score | ECE (hard) | Probability fidelity | Brier (hard) |
|---|---|---|---|---|
| DeepSeek V4.1 Flash (thinking default) | 96.7 | 0.033 | 100.0 | 0.044 |
| Qwen3.8 27B (Chutes TEE) *(partial)* | 92.1 | 0.079 | 100.0 | 0.079 |
| GPT-5.6 Luna (low reasoning effort) | 89.8 | 0.071 | 93.7 | 0.118 |
| Jev 1.13.0 (TypeSafe AI) | 82.7 | 0.061 | 77.4 | 0.340 |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | 77.4 | 0.094 | 73.7 | 0.401 |
| SemIf, formerly OpenJev (Qwen3.5-4B, TheoLeeCJ) | 72.6 | 0.121 | 69.4 | 0.542 |
| Gemini 3.1 Flash-Lite | 68.1 | 0.267 | 89.5 | 0.510 |
| open-jev-deberta-v3-large (local CPU) | 66.4 | 0.173 | 67.4 | 0.710 |
| OpenJev (DiffusionGemma 26B-A4B NVFP4, razorback16) | 64.8 | 0.178 | 65.1 | 0.484 |
| Bespoke Nimble 9B (Bespoke Labs) | 64.5 | 0.196 | 68.3 | 0.524 |
| open-alternative-jev, author's yes/no order* (post-hoc adapter mode) | 63.2 | 0.190 | 64.4 | 0.611 |
| open-alternative-jev (Qwen3.5-4B, IkerMoel) | 61.1 | 0.231 | 68.5 | 0.657 |
| system-one-open (Gemma 4 E2B LoRA on an L4) | 56.7 | 0.257 | 64.8 | 0.747 |
| system-one (Qwen3-8B, Sean Goedecke) | 36.8 | 0.424 | 58.4 | 0.924 |

## Method

- **capability**: Weighted tier accuracy x 100: easy 10 %, standard 20 %, judge 20 %, hard 50 % (v1.1 used 1/3 each for easy/standard/judge). The hard tier carries half the weight because the three v1.1 tiers are saturated (top five systems 97-98 %). Accuracy = correct / all items; failed, timed-out or unparseable answers count as wrong.
- **hard_tier**: 220 new decisions (111 public, 109 held out): long multi-condition policy documents (2-6k tokens), priority trade-offs, deliberately ambiguous cases with a 'no clear answer' label, traps, multi-hop lookups, date/number reasoning, adversarial distractors, subtle answer-judging, overlapping routing, and probability items with an exact gold distribution. Half written by Claude Opus 5, half by GPT-5.6 Sol; each item reviewed blind and then against its gold by the other model; one discussion round; frozen and hashed before any benchmarked system saw an item. No item was selected on any system's answers.
- **speed**: Unchanged from v1.1.2: p50/p95 latency of the serial 242-decision standard+judge run, log scale 0.1 s = 100, 10 s = 0. Hard-tier latencies are published beside it. Endpoint conditions differ (production APIs vs authors' demo endpoints vs our CPU) and are named per row.
- **cost**: Dollars per 1,000 decisions pooled over all 534 v1.2 decisions (314 v1.1 + 220 hard; hard items are longer, so costs rise). Measured = public tariff x measured tokens. est. = hosted-provider list price of the same weights x tokens (v1.1.2 rule). Log scale $0.001 = 100, $10 = 0.
- **calibration**: Hard tier only, systems that return a probability distribution: mean of (a) 100 x (1 - ECE/0.5), ECE = top-label expected calibration error in 10 bins, and (b) probability fidelity = 100 x (1 - mean total-variation distance) between the returned distribution and the exact gold distribution on the 20 probability items. Label-only systems get no calibration score; in the 'Balanced + Calibration' preset they are scored as if every answer were given with 100 % confidence (what a bare label claims).
- **main**: JevBench Main Composite Score = (Capability + Speed + Cost) / 3, 'Balanced 33:33:33' (unchanged weights since v1.1.2).
- **presets**: Rankings are published under the presets, under a measured-price-only view (systems whose cost is a measured tariff), and under a self-host sensitivity (open weights priced as a dedicated on-demand machine billed 24/7 at 30 % utilisation, 4 parallel requests on GPU servers, measured latency).
- **ranked**: Ranked: every tier attempted for >= 95 % of its decisions. Partial runs are shown, marked, and not ranked.

Hard tier frozen 2026-09-19T11:43:54+00:00 · dataset hash `ec200ccd3db28153c93bfeaed55acb18b4909610ba403cf73482abbc4074ef6b` · public file sha256 `89e9e6becb33ed88c1de7d42dcc87531b2fb64cfaef4e1986faf7c37b3f80ebb`.

## Limits

- The hard tier was written by two frontier models. Items are reviewed, but a model-written benchmark can share blind spots with model-based systems.
- Family sizes are small (10–38 items); read single family cells with care.
- DeepSeek V4.1 Flash and Qwen3.8 27B reason before answering; on the long hard items they exhausted the default 4,096 output tokens and returned empty answers, so their hard-tier runs use 16,384 (the only configuration change; the aborted runs are kept as evidence).
- Speed is unchanged from v1.1.2 and measured on different kinds of endpoints: production APIs, the authors' public demo endpoints, and our own CPU.
- Estimated costs are estimates. The measured-price-only view and the self-host sensitivity show how much they move the ranking.
