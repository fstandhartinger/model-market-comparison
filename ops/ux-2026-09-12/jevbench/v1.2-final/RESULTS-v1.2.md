# JevBench v1.2 — results

**JevBench Score** = Intelligence, Calibration, Speed, Cost — 25 % each, geometric mean: a weak axis pulls the score down hard.

Artifact: [`results/v1.2/jevbench-v1.2-results.json`](results/v1.2/jevbench-v1.2-results.json) · scoring code:
[`jevbench/composite_v12.py`](jevbench/composite_v12.py) · built by [`scripts/v1.2/finalize.py`](scripts/v1.2/finalize.py) from the
v1.2-wip measurements (tag `v1.2-wip`; no measurement changed) · interactive page: [benchmarkheaven.com/jev-models](https://benchmarkheaven.com/jev-models)

![JevBench Score](results/v1.2/charts/main-score.png)

> **Speed note.** Latency of self-hosted and demo endpoints is adjusted ×2 (+0.15 s on our own servers) to approximate production load — an assumption, not a measurement; raw measurements are in the table and the repo.

## Ranking

| # | System | **JevBench Score** | Intelligence | Calibration | Speed | Cost | $ / 1,000 | p50 raw → adjusted | Endpoint |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Jev 1.13.0 | **75.3** | 90.4 | 82.7 | 83.3 | 51.7 | $0.0406 | 0.65 s | production API (api.typesafe.ai) |
| 2 | SemIf (Qwen3.5-4B) | **74.6** | 85.9 | 72.6 | 83.7 | 59.2 | $0.0230 est. | 0.20 s → 0.55 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 3 | open-alternative-jev (Qwen3.5-4B, IkerMoel) | **69.8** | 75.6 | 63.2 | 83.5 | 59.6 | $0.0222 est. | 0.21 s → 0.56 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 4 | system-one-open (Gemma 4 E2B LoRA on an L4) | **68.7** | 79.5 | 56.7 | 77.0 | 64.1 | $0.0157 est. | 0.65 s → 1.30 s | author's public demo endpoint (Modal, L4) — not a production service |
| 5 | OpenJev razorback16 (DiffusionGemma 26B) | **67.6** | 86.0 | 64.8 | 83.2 | 45.2 | $0.0672 est. | 0.24 s → 0.63 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 6 | openjev-sglang (Qwen3.6-35B-A3B on SGLang) | **66.2** | 88.9 | 77.4 | 77.1 | 36.1 | $0.1346 est. | 0.68 s → 1.36 s | author's public demo endpoint (Modal) — not a production service |
| 7 | GPT-5.6 Luna (low) | **66.0** | 96.8 | 89.8 | 77.5 | 28.2 | $0.2473 | 0.97 s | production API (OpenAI), reasoning effort low |
| 8 | open-jev-deberta-v3-large (local CPU) | **64.4** | 53.6 | 66.4 | 66.0 | 73.3 | $0.0077 est. | 1.77 s → 3.69 s | our CPU (2 threads, Ryzen 5 3600) |
| 9 | Bespoke Nimble 9B | **63.5** | 78.6 | 64.5 | 82.5 | 38.9 | $0.1085 est. | 0.19 s → 0.52 s | our RunPod GPU (A40 48 GB (EU-SE-1)), reached over the internet |
| 10 | Gemini 3.1 Flash-Lite | **60.8** | 90.3 | 68.1 | 81.8 | 27.1 | $0.2682 | 0.76 s | production API (Google) |
| 11 | DeepSeek V4.1 Flash | **58.1** | 96.1 | 96.7 | 71.6 | 17.1 | $0.5788 | 1.42 s | production API (DeepSeek) |
| 12 | system-one (Qwen3-8B, Goedecke) | **56.5** | 80.1 | 36.8 | 84.4 | 41.2 | $0.0915 est. | 0.17 s → 0.48 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |

Jev 1.13.0 is #1 with 75.3; SemIf (Qwen3.5-4B) is #2, 0.7 points behind (difference of the rounded scores).

**Partial runs** — shown, not ranked (a tier attempted for fewer than 95 % of its decisions):

| # | System | **JevBench Score** | Intelligence | Calibration | Speed | Cost | $ / 1,000 | p50 raw → adjusted | Endpoint |
|---|---|---|---|---|---|---|---|---|---|
|  | Qwen3.8 27B (partial run) | **25.5** | 74.6 | 92.1 | 61.3 | 0.0 | $2.7110 est. | 5.75 s | Chutes shared inference (TEE) |
|  | Needle 3, options as tools (partial run) | **19.1** | 39.5 | none (label only) | 52.8 | 63.7 | $0.0162 est. | 3.78 s → 7.71 s | our CPU (2 threads, Ryzen 5 3600) |
|  | Needle 3 (partial run) | **16.7** | 22.4 | none (label only) | 59.9 | 58.1 | $0.0249 est. | 1.69 s → 3.52 s | our CPU (2 threads, Ryzen 5 3600) |

Footnote — open-alternative-jev: With the options in reverse order (A. no, B. yes) the same model scored 21 % instead of 72 % on yes/no answer-judging items — small models are very sensitive to option order. The ranked row uses the author's own order
(`A. yes, B. no`, as his `yes_no()` helper builds it); the reversed-order run was our adapter's mistake and is kept only as raw
files (`results/v1.2/wip/`, GPU round runs).

## How the score works

| Axis | Definition |
|---|---|
| **Intelligence** | 100 x weighted accuracy: hard 30 %, easy 14 %, standard 28 %, judge 28 %. Accuracy = correct / all items; failed, timed-out or unparseable answers count as wrong. |
| **Calibration** | Hard tier only, systems that return a probability distribution: mean of (a) 100 x (1 - ECE/0.5), ECE = top-label expected calibration error in 10 bins, and (b) probability fidelity = 100 x (1 - mean total-variation distance) between the returned distribution and the exact gold distribution on the 20 probability items. Label-only systems have none; it counts as 0 in the JevBench Score. |
| **Speed** | Mean of score(p50) and score(p95) of the serial 242-decision standard+judge run; score(s) = 100 - 20 log10(s / 0.1 s), clipped to 0..100 (0.1 s = 100, 1 s = 80, 10 s = 60). Latency of self-hosted and demo endpoints is adjusted ×2 (+0.15 s on our own servers) to approximate production load — an assumption, not a measurement; raw measurements are in the table and the repo. Production APIs (Jev, OpenAI, Google, DeepSeek, Chutes) are not adjusted. |
| **Cost** | Dollars per 1,000 decisions pooled over all 534 v1.2 decisions; score = 100 - 30 log10(usd / 0.001), clipped to 0..100 ($0.001 = 100, $0.01 = 70, $0.10 = 40, $1 = 10). Measured = public tariff x measured tokens. est. = hosted-provider list price of the same weights or size class x tokens. |
| **JevBench Score** | exp(sum over the four axes of 0.25 x ln(max(axis, 1))) — the geometric mean of Intelligence, Calibration, Speed and Cost. A weak axis pulls the score down hard; a strong axis cannot buy it back. |

![The four axes](results/v1.2/charts/axes.png)

## Other views (not the JevBench Score)

Other views reweight the same four axes and combine them the same way (geometric mean). They are not the JevBench Score. Weights are Intelligence : Calibration : Speed : Cost.

| System | JevBench Score (25:25:25:25) (25:25:25:25) | Balanced 33:33:33 (no calibration) (33:0:33:33) | Emphasis on Accuracy 60:20:20 (60:0:20:20) | Emphasis on Speed 20:60:20 (20:0:60:20) | Emphasis on Cost 20:20:60 (20:0:20:60) | Intelligence only (100:0:0:0) |
|---|---|---|---|---|---|---|
| Jev 1.13.0 | #1 75.3 | #3 73.0 | #1 79.5 | #2 77.0 | #5 63.6 | #3 90.4 |
| SemIf (Qwen3.5-4B) | #2 74.6 | #1 75.2 | #2 79.3 | #1 78.5 | #2 68.3 | #7 85.9 |
| open-alternative-jev (Qwen3.5-4B, IkerMoel) | #3 69.8 | #4 72.2 | #5 73.5 | #3 76.5 | #4 66.9 | #11 75.6 |
| system-one-open (Gemma 4 E2B LoRA on an L4) | #4 68.7 | #2 73.2 | #3 75.7 | #4 74.7 | #1 69.4 | #9 79.5 |
| OpenJev razorback16 (DiffusionGemma 26B) | #5 67.6 | #5 68.6 | #4 75.1 | #5 74.1 | #6 58.1 | #6 86.0 |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | #6 66.2 | #9 62.8 | #7 72.2 | #8 68.1 | #9 50.3 | #5 88.9 |
| GPT-5.6 Luna (low) | #7 66.0 | #10 59.6 | #6 72.4 | #10 66.2 | #10 44.2 | #1 96.8 |
| open-jev-deberta-v3-large (local CPU) | #8 64.4 | #7 63.8 | #12 59.5 | #11 64.6 | #3 67.4 | #12 53.6 |
| Bespoke Nimble 9B | #9 63.5 | #8 63.2 | #10 69.0 | #7 70.3 | #8 52.1 | #10 78.6 |
| Gemini 3.1 Flash-Lite | #10 60.8 | #11 58.5 | #9 69.6 | #9 66.9 | #11 43.0 | #4 90.3 |
| DeepSeek V4.1 Flash | #11 58.1 | #12 49.0 | #11 64.2 | #12 57.0 | #12 32.2 | #2 96.1 |
| system-one (Qwen3-8B, Goedecke) | #12 56.5 | #6 65.3 | #8 70.8 | #6 72.3 | #7 54.3 | #8 80.1 |

## Hard tier

![Hard tier accuracy](results/v1.2/charts/hard-tier.png)
![Hard tier by family](results/v1.2/charts/hard-families.png)
![Calibration](results/v1.2/charts/calibration.png)

220 new decisions (111 public, 109 held out): long multi-condition policy documents (2-6k tokens), priority trade-offs, deliberately ambiguous cases with a 'no clear answer' label, traps, multi-hop lookups, date/number reasoning, adversarial distractors, subtle answer-judging, overlapping routing, and probability items with an exact gold distribution. Half written by Claude Opus 5, half by GPT-5.6 Sol; each item reviewed blind and then against its gold by the other model; one discussion round; frozen and hashed before any benchmarked system saw an item. No item was selected on any system's answers.

## Tier accuracies and raw latency

| System | easy | standard | judge | hard | p50 raw | p95 raw | hard-tier p50 | Adjustment |
|---|---|---|---|---|---|---|---|---|
| Jev 1.13.0 | 100.0 % | 99.0 % | 94.5 % | 74.1 % | 0.65 s | 0.72 s | 0.67 s | none (production API) |
| SemIf (Qwen3.5-4B) | 100.0 % | 97.9 % | 95.2 % | 59.5 % | 0.20 s | 0.32 s | 0.22 s | x2 + 0.15 s (assumption, not measured) |
| open-alternative-jev (Qwen3.5-4B, IkerMoel) | 100.0 % | 84.4 % | 74.7 % | 56.8 % | 0.21 s | 0.32 s | 0.24 s | x2 + 0.15 s (assumption, not measured) |
| system-one-open (Gemma 4 E2B LoRA on an L4) | 100.0 % | 93.8 % | 87.7 % | 49.1 % | 0.65 s | 0.77 s | 0.68 s | x2 (assumption, not measured) |
| OpenJev razorback16 (DiffusionGemma 26B) | 100.0 % | 95.8 % | 91.1 % | 65.5 % | 0.24 s | 0.31 s | 0.27 s | x2 + 0.15 s (assumption, not measured) |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | 100.0 % | 95.8 % | 95.2 % | 71.4 % | 0.68 s | 0.73 s | 0.69 s | x2 (assumption, not measured) |
| GPT-5.6 Luna (low) | 100.0 % | 97.9 % | 96.6 % | 94.5 % | 0.97 s | 1.82 s | 1.22 s | none (production API) |
| open-jev-deberta-v3-large (local CPU) | 100.0 % | 49.0 % | 53.4 % | 36.4 % | 1.77 s | 3.35 s | 2.64 s | x2 + 0.15 s (assumption, not measured) |
| Bespoke Nimble 9B | 100.0 % | 94.8 % | 89.0 % | 43.6 % | 0.19 s | 0.46 s | 0.20 s | x2 + 0.15 s (assumption, not measured) |
| Gemini 3.1 Flash-Lite | 100.0 % | 99.0 % | 93.2 % | 75.0 % | 0.76 s | 0.88 s | 0.79 s | none (production API) |
| DeepSeek V4.1 Flash | 98.6 % | 99.0 % | 93.2 % | 95.0 % | 1.42 s | 4.89 s | 3.15 s | none (production API) |
| system-one (Qwen3-8B, Goedecke) | 100.0 % | 90.6 % | 91.8 % | 50.0 % | 0.17 s | 0.30 s | 0.21 s | x2 + 0.15 s (assumption, not measured) |
| Qwen3.8 27B | 98.6 % | 99.0 % | 95.3 % | 21.4 % | 5.75 s | 12.97 s | 20.47 s | none (production API) |
| Needle 3, options as tools | 66.7 % | 31.2 % | 34.2 % | — | 3.78 s | 33.64 s | — | x2 + 0.15 s (assumption, not measured) |
| Needle 3 | 47.2 % | 16.7 % | 31.5 % | 7.7 % | 1.69 s | 14.36 s | 19.28 s | x2 + 0.15 s (assumption, not measured) |

## Cost basis

- **Jev 1.13.0** — $0.0406: public tariff x measured tokens (https://docs.typesafe.ai/models (output tokens not billed)) | public tariff x measured tokens (hard-tier run)
- **SemIf (Qwen3.5-4B)** — $0.0230 est.: ESTIMATE: hosted-provider price, deepinfra Qwen/Qwen3.5-4B list price $0.03/M in, $0.15/M out (same weights (not on OpenRouter), as open-alternative-jev in v1.1.2) x 426 input and 1 output tokens per decision (input tokens measured) | ESTIMATE: deepinfra Qwen/Qwen3.5-4B $0.03/M in, $0.15/M out x 1244 in / 0 out tokens per hard decision
- **open-alternative-jev (Qwen3.5-4B, IkerMoel)** — $0.0222 est.: ESTIMATE: hosted-provider price, deepinfra Qwen/Qwen3.5-4B list price $0.03/M in, $0.15/M out (as open-alternative-jev) x 383 input and 1 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) | ESTIMATE: deepinfra Qwen/Qwen3.5-4B $0.03/M in, $0.15/M out x 1235 in / 1 out tokens per hard decision
- **system-one-open (Gemma 4 E2B LoRA on an L4)** — $0.0157 est.: ESTIMATE: hosted-provider price, deepinfra google/gemma-4-E4B-it list price $0.02/M in, $0.1/M out (Gemma 4 E2B is not listed; the nearest larger sibling, Gemma 4 E4B, is listed only on DeepInfra) x 452 input and 2 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) | ESTIMATE: deepinfra google/gemma-4-E4B-it $0.02/M in, $0.1/M out x 1235 in / 2 out tokens per hard decision
- **OpenJev razorback16 (DiffusionGemma 26B)** — $0.0672 est.: ESTIMATE: hosted-provider price, openrouter google/gemma-4-26b-a4b-it list price $0.09/M in, $0.3/M out (DiffusionGemma 26B-A4B is not listed; the same-size Gemma 4 26B-A4B MoE sibling is (size class moe_26B-A4B)) x 410 input and 1 output tokens per decision (input tokens measured) | ESTIMATE: openrouter google/gemma-4-26b-a4b-it $0.09/M in, $0.3/M out x 1222 in / 0 out tokens per hard decision
- **openjev-sglang (Qwen3.6-35B-A3B on SGLang)** — $0.1346 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3.6-35b-a3b list price $0.1/M in, $0.9/M out (same base weights) x 667 input and 2 output tokens per decision | ESTIMATE: openrouter qwen/qwen3.6-35b-a3b $0.1/M in, $0.9/M out x 2272 in / 2 out tokens per hard decision
- **GPT-5.6 Luna (low)** — $0.2473: public tariff x measured tokens (https://platform.openai.com/docs/pricing (standard tier, read 2026-09-19)) | public tariff x measured tokens (hard-tier run)
- **open-jev-deberta-v3-large (local CPU)** — $0.0077 est.: ESTIMATE: hosted-provider price, deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) list price $0.01/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 452 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) | ESTIMATE: deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) $0.01/M in, $0.0/M out x 1235 in / 0 out tokens per hard decision
- **Bespoke Nimble 9B** — $0.1085 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3.5-9b list price $0.1/M in, $0.15/M out (a LoRA merge of Qwen3.5-9B; the base weights are listed on OpenRouter (size class dense_9B)) x 990 input and 1 output tokens per decision (input tokens measured) | ESTIMATE: openrouter qwen/qwen3.5-9b $0.1/M in, $0.15/M out x 1215 in / 2 out tokens per hard decision
- **Gemini 3.1 Flash-Lite** — $0.2682: public tariff x measured tokens (https://ai.google.dev/gemini-api/docs/pricing (paid tier, read 2026-09-19)) | public tariff x measured tokens (hard-tier run)
- **DeepSeek V4.1 Flash** — $0.5788: public tariff x measured tokens (https://api-docs.deepseek.com/quick_start/pricing (cache-miss off-peak; the run is on a Saturday, off-peak all day)) | public tariff x measured tokens (hard-tier run)
- **system-one (Qwen3-8B, Goedecke)** — $0.0915 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3-8b list price $0.117/M in, $0.455/M out (same weights, listed on OpenRouter) x 443 input and 1 output tokens per decision (input tokens measured) | ESTIMATE: openrouter qwen/qwen3-8b $0.117/M in, $0.455/M out x 1258 in / 1 out tokens per hard decision
- **Qwen3.8 27B** — $2.7110 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3.8-27b list price $0.214/M in, $2.55/M out (same weights; our run used a flat-rate Chutes subscription) x 445 input and 393 output tokens per decision | ESTIMATE: openrouter qwen/qwen3.8-27b $0.214/M in, $2.55/M out x 1592 in / 1833 out tokens per hard decision
- **Needle 3, options as tools** — $0.0162 est.: ESTIMATE: same per-token price as Needle 3 (openrouter meta-llama/llama-3.2-1b-instruct $0.027/M in, $0.201/M out) x 452 input and 20 output tokens per decision, over the 314 easy/standard/judge decisions it ran (no hard-tier run). The v1.2 score lab had no price for this row and scored it 100; fixed.
- **Needle 3** — $0.0249 est.: ESTIMATE: hosted-provider price, openrouter meta-llama/llama-3.2-1b-instruct list price $0.027/M in, $0.201/M out (no generative model under 1B is listed; the smallest listed one (1B) errs high; about 20 generated tokens for one tool call) x 452 input and 20 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) | ESTIMATE: openrouter meta-llama/llama-3.2-1b-instruct $0.027/M in, $0.201/M out x 1235 in / 20 out tokens per hard decision

## What changed from v1.2-wip

- Score: four axes (Intelligence, Calibration, Speed, Cost), 25 % each, geometric mean — replaces the Balanced 33:33:33 arithmetic Main Score.
- Intelligence weights hard 30 % (was 50 %); the rest 1 : 2 : 2 over easy : standard : judge.
- Speed scale 20 points per 10× (was 50); Cost scale 30 points per 10× from $0.001 (was 25). Latency of non-production endpoints adjusted (assumption, see the speed note).
- One open-alternative-jev row (author's option order), named plainly; the reversed-order run is a footnote.
- Needle 3 options-as-tools priced on Needle 3's per-token basis ($0.0162 est.; it had no price).
- Qwen3.8 27B on Chutes is treated as a production API (no latency adjustment).
