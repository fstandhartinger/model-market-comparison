# JevBench v1.2.2 — results

**JevBench Score** = Intelligence, Calibration, Speed, Cost — 25 % each, geometric mean: a weak axis pulls the score down hard.

Artifact: [`results/v1.2/jevbench-v1.2-results.json`](results/v1.2/jevbench-v1.2-results.json) · scoring code:
[`jevbench/composite_v12.py`](jevbench/composite_v12.py) · built by [`scripts/v1.2/finalize.py`](scripts/v1.2/finalize.py) from the
v1.2-wip measurements (tag `v1.2-wip`; no measurement changed; later revisions add systems measured on the same frozen items, see the revision log) · interactive page: [benchmarkheaven.com/jev-models](https://benchmarkheaven.com/jev-models)

![JevBench Score](results/v1.2/charts/main-score.png)

> **Speed note.** Latency of self-hosted and demo endpoints is adjusted ×2 (+0.15 s on our own servers) to approximate production load — an assumption, not a measurement; raw measurements are in the table and the repo.

## Ranking

| # | System | **JevBench Score** | Intelligence | Calibration | Speed | Cost | $ / 1,000 | p50 raw → adjusted | Endpoint |
|---|---|---|---|---|---|---|---|---|---|
| 1 | classifier.dev (fast tier) | **84.8** | 90.1 | 77.9 | 87.6 | 84.3 | $0.0033 est. | 0.39 s | production API (classifier.dev, fast tier) |
| 2 | Jev 1.13.0 | **75.3** | 90.4 | 82.7 | 83.3 | 51.7 | $0.0406 | 0.65 s | production API (api.typesafe.ai) |
| 3 | SemIf (Qwen3.5-4B) | **74.6** | 85.9 | 72.6 | 83.7 | 59.2 | $0.0230 est. | 0.20 s → 0.55 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 4 | djev (Maisa, diffusion-gemma) | **74.3** | 88.4 | 65.4 | 91.4 | 57.6 | $0.0260 (announced price, free preview) | 0.24 s | production API (api.djev.dev, free preview) |
| 5 | Laya (421M) | **70.1** | 63.2 | 62.5 | 71.1 | 86.2 | $0.0029 est. | 0.79 s → 1.72 s | our CPU (4 threads, Ryzen 5 3600) |
| 6 | open-alternative-jev (Qwen3.5-4B, IkerMoel) | **69.8** | 75.6 | 63.2 | 83.5 | 59.6 | $0.0222 est. | 0.21 s → 0.56 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 7 | system-one-open (Gemma 4 E2B LoRA on an L4) | **68.7** | 79.5 | 56.7 | 77.0 | 64.1 | $0.0157 est. | 0.65 s → 1.30 s | author's public demo endpoint (Modal, L4) — not a production service |
| 8 | OpenJev razorback16 (DiffusionGemma 26B) | **67.6** | 86.0 | 64.8 | 83.2 | 45.2 | $0.0672 est. | 0.24 s → 0.63 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 9 | jeff (GLiFormer 400M) | **66.9** | 63.9 | 64.6 | 63.5 | 76.6 | $0.0060 est. | 0.94 s → 2.03 s | our CPU (4 threads, Ryzen 5 3600) |
| 10 | openjev-sglang (Qwen3.6-35B-A3B on SGLang) | **66.2** | 88.9 | 77.4 | 77.1 | 36.1 | $0.1346 est. | 0.68 s → 1.36 s | author's public demo endpoint (Modal) — not a production service |
| 11 | openJev Verdict (151M) | **66.1** | 59.0 | 51.3 | 76.7 | 82.4 | $0.0039 est. | 0.28 s → 0.71 s | our CPU (4 threads, Ryzen 5 3600) |
| 12 | GPT-5.6 Luna (low) | **66.0** | 96.8 | 89.8 | 77.5 | 28.2 | $0.2473 | 0.97 s | production API (OpenAI), reasoning effort low |
| 13 | open-jev-deberta-v3-large (local CPU) | **64.4** | 53.6 | 66.4 | 66.0 | 73.3 | $0.0077 est. | 1.77 s → 3.69 s | our CPU (2 threads, Ryzen 5 3600) |
| 14 | Bespoke Nimble 9B | **63.5** | 78.6 | 64.5 | 82.5 | 38.9 | $0.1085 est. | 0.19 s → 0.52 s | our RunPod GPU (A40 48 GB (EU-SE-1)), reached over the internet |
| 15 | Gemini 3.1 Flash-Lite | **60.8** | 90.3 | 68.1 | 81.8 | 27.1 | $0.2682 | 0.76 s | production API (Google) |
| 16 | DeepSeek V4.1 Flash | **58.1** | 96.1 | 96.7 | 71.6 | 17.1 | $0.5788 | 1.42 s | production API (DeepSeek) |
| 17 | system-one (Qwen3-8B, Goedecke) | **56.5** | 80.1 | 36.8 | 84.4 | 41.2 | $0.0915 est. | 0.17 s → 0.48 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 18 | GLiNER2 (gliner2.5-base) | **52.9** | 56.0 | 23.7 | 71.8 | 82.4 | $0.0039 est. | 0.31 s → 0.78 s | our CPU (4 threads, Ryzen 5 3600) |

classifier.dev (fast tier) is #1 with 84.8; Jev 1.13.0 is #2, 9.5 points behind (difference of the rounded scores). Jev 1.13.0 is #2 with 75.3.

**Partial runs** — shown, not ranked (a tier attempted for fewer than 95 % of its decisions):

| # | System | **JevBench Score** | Intelligence | Calibration | Speed | Cost | $ / 1,000 | p50 raw → adjusted | Endpoint |
|---|---|---|---|---|---|---|---|---|---|
|  | Qwen3.8 27B (partial run) | **25.5** | 74.6 | 92.1 | 61.3 | 0.0 | $2.7110 est. | 5.75 s | Chutes shared inference (TEE) |
|  | Needle 3, options as tools (partial run) | **19.1** | 39.5 | none (label only) | 52.8 | 63.7 | $0.0162 est. | 3.78 s → 7.71 s | our CPU (2 threads, Ryzen 5 3600) |
|  | Needle 3 (partial run) | **16.7** | 22.4 | none (label only) | 59.9 | 58.1 | $0.0249 est. | 1.69 s → 3.52 s | our CPU (2 threads, Ryzen 5 3600) |

Footnote — classifier.dev (fast tier): Its own benchmark page says the fast tier is Jev. Free for us; the price is its published Pro plan ($20/month for 200,000 fast classifications a day) at full use, $0.0033 per 1,000 decisions.

Footnote — djev (Maisa, diffusion-gemma): Hosted API in free preview: the cost uses djev's announced price ($0.035 per million input tokens, output free); nothing is charged yet. Open-sourcing is planned, not yet released. Probabilities are djev's own (its docs call them experimental and uncalibrated).

Footnote — GLiNER2 (gliner2.5-base): A general schema classifier, not a Jev rebuild. The question goes in front of the text; the probabilities are GLiNER2's own single-label softmax over the labels, read out in full (mapping fixed before the run).

Footnote — jeff (GLiFormer 400M): Self-hosted from its GitHub repo with server defaults, on our CPU (the author recommends a GPU, e.g. an L4), through the same TypeSafe-compatible API as Jev.

Footnote — Laya (421M): The English checkpoint (repo root), run on our CPU through its own `laya` package. Its budget is 512 tokens per question, so long hard-tier states are cut by the package itself.

Footnote — openJev Verdict (151M): The openJev-verdict-2.0 Hugging Face repo ships no weights; its config is byte-identical to heman10x/rlcd-modernbert-151m, whose published weights we ran with the author's engine. The 'verdict2-base' checkpoint behind the README's numbers is not downloadable yet (Git LFS 404); we will run it once it is.

Footnote — open-alternative-jev: With the options in reverse order (A. no, B. yes) the same model scored 21 % instead of 72 % on yes/no answer-judging items — small models are very sensitive to option order. The ranked row uses the author's own order
(`A. yes, B. no`, as his `yes_no()` helper builds it); the reversed-order run was our adapter's mistake and is kept only as raw
files (`results/v1.2/wip/`, GPU round runs).

## How the score works

| Axis | Definition |
|---|---|
| **Intelligence** | 100 x weighted accuracy: hard 30 %, easy 14 %, standard 28 %, judge 28 %. Accuracy = correct / all items; failed, timed-out or unparseable answers count as wrong. |
| **Calibration** | Hard tier only, systems that return a probability distribution: mean of (a) 100 x (1 - ECE/0.5), ECE = top-label expected calibration error in 10 bins, and (b) probability fidelity = 100 x (1 - mean total-variation distance) between the returned distribution and the exact gold distribution on the 20 probability items. Label-only systems have none; it counts as 0 in the JevBench Score. |
| **Speed** | Mean of score(p50) and score(p95) of the serial 242-decision standard+judge run; score(s) = 100 - 20 log10(s / 0.1 s), clipped to 0..100 (0.1 s = 100, 1 s = 80, 10 s = 60). Latency of self-hosted and demo endpoints is adjusted ×2 (+0.15 s on our own servers) to approximate production load — an assumption, not a measurement; raw measurements are in the table and the repo. Production APIs (Jev, djev, classifier.dev, OpenAI, Google, DeepSeek, Chutes) are not adjusted. |
| **Cost** | Dollars per 1,000 decisions pooled over all 534 v1.2 decisions; score = 100 - 30 log10(usd / 0.001), clipped to 0..100 ($0.001 = 100, $0.01 = 70, $0.10 = 40, $1 = 10). Measured = public tariff x measured tokens. est. = hosted-provider list price of the same weights or size class x tokens (for a flat-rate service, its published plan price at full use). announced = the provider's published price, not yet charged (free preview), x measured tokens. |
| **JevBench Score** | exp(sum over the four axes of 0.25 x ln(max(axis, 1))) — the geometric mean of Intelligence, Calibration, Speed and Cost. A weak axis pulls the score down hard; a strong axis cannot buy it back. |

![The four axes](results/v1.2/charts/axes.png)

## Other views (not the JevBench Score)

Other views reweight the same four axes and combine them the same way (geometric mean). They are not the JevBench Score. Weights are Intelligence : Calibration : Speed : Cost.

| System | JevBench Score (25:25:25:25) (25:25:25:25) | Balanced 33:33:33 (no calibration) (33:0:33:33) | Emphasis on Accuracy 60:20:20 (60:0:20:20) | Emphasis on Speed 20:60:20 (20:0:60:20) | Emphasis on Cost 20:20:60 (20:0:20:60) | Intelligence only (100:0:0:0) |
|---|---|---|---|---|---|---|
| classifier.dev (fast tier) | #1 84.8 | #1 87.3 | #1 88.4 | #1 87.4 | #1 86.1 | #5 90.1 |
| Jev 1.13.0 | #2 75.3 | #5 73.0 | #3 79.5 | #4 77.0 | #11 63.6 | #3 90.4 |
| SemIf (Qwen3.5-4B) | #3 74.6 | #3 75.2 | #4 79.3 | #3 78.5 | #8 68.3 | #9 85.9 |
| djev (Maisa, diffusion-gemma) | #4 74.3 | #2 77.5 | #2 81.6 | #2 82.7 | #7 68.8 | #7 88.4 |
| Laya (421M) | #5 70.1 | #6 72.9 | #13 68.9 | #10 72.2 | #2 78.0 | #15 63.2 |
| open-alternative-jev (Qwen3.5-4B, IkerMoel) | #6 69.8 | #7 72.2 | #7 73.5 | #5 76.5 | #10 66.9 | #13 75.6 |
| system-one-open (Gemma 4 E2B LoRA on an L4) | #7 68.7 | #4 73.2 | #5 75.7 | #6 74.7 | #6 69.4 | #11 79.5 |
| OpenJev razorback16 (DiffusionGemma 26B) | #8 67.6 | #10 68.6 | #6 75.1 | #7 74.1 | #12 58.1 | #8 86.0 |
| jeff (GLiFormer 400M) | #9 66.9 | #11 67.7 | #15 66.2 | #16 66.0 | #5 71.1 | #14 63.9 |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | #10 66.2 | #15 62.8 | #9 72.2 | #13 68.1 | #15 50.3 | #6 88.9 |
| openJev Verdict (151M) | #11 66.1 | #8 71.9 | #14 66.4 | #8 73.8 | #3 75.9 | #16 59.0 |
| GPT-5.6 Luna (low) | #12 66.0 | #16 59.6 | #8 72.4 | #15 66.2 | #16 44.2 | #1 96.8 |
| open-jev-deberta-v3-large (local CPU) | #13 64.4 | #13 63.8 | #18 59.5 | #17 64.6 | #9 67.4 | #18 53.6 |
| Bespoke Nimble 9B | #14 63.5 | #14 63.2 | #12 69.0 | #11 70.3 | #14 52.1 | #12 78.6 |
| Gemini 3.1 Flash-Lite | #15 60.8 | #17 58.5 | #11 69.6 | #14 66.9 | #17 43.0 | #4 90.3 |
| DeepSeek V4.1 Flash | #16 58.1 | #18 49.0 | #16 64.2 | #18 57.0 | #18 32.2 | #2 96.1 |
| system-one (Qwen3-8B, Goedecke) | #17 56.5 | #12 65.3 | #10 70.8 | #9 72.3 | #13 54.3 | #10 80.1 |
| GLiNER2 (gliner2.5-base) | #18 52.9 | #9 69.2 | #17 63.6 | #12 70.2 | #4 74.2 | #17 56.0 |

## Hard tier

![Hard tier accuracy](results/v1.2/charts/hard-tier.png)
![Hard tier by family](results/v1.2/charts/hard-families.png)
![Calibration](results/v1.2/charts/calibration.png)

220 new decisions (111 public, 109 held out): long multi-condition policy documents (2-6k tokens), priority trade-offs, deliberately ambiguous cases with a 'no clear answer' label, traps, multi-hop lookups, date/number reasoning, adversarial distractors, subtle answer-judging, overlapping routing, and probability items with an exact gold distribution. Half written by Claude Opus 5, half by GPT-5.6 Sol; each item reviewed blind and then against its gold by the other model; one discussion round; frozen and hashed before any benchmarked system saw an item. No item was selected on any system's answers.

## Tier accuracies and raw latency

| System | easy | standard | judge | hard | p50 raw | p95 raw | hard-tier p50 | Adjustment |
|---|---|---|---|---|---|---|---|---|
| classifier.dev (fast tier) | 100.0 % | 99.0 % | 97.3 % | 70.5 % | 0.39 s | 0.45 s | 0.38 s | none (production API) |
| Jev 1.13.0 | 100.0 % | 99.0 % | 94.5 % | 74.1 % | 0.65 s | 0.72 s | 0.67 s | none (production API) |
| SemIf (Qwen3.5-4B) | 100.0 % | 97.9 % | 95.2 % | 59.5 % | 0.20 s | 0.32 s | 0.22 s | x2 + 0.15 s (assumption, not measured) |
| djev (Maisa, diffusion-gemma) | 100.0 % | 97.9 % | 93.2 % | 69.5 % | 0.24 s | 0.31 s | 0.25 s | none (production API) |
| Laya (421M) | 94.4 % | 72.9 % | 69.2 % | 34.1 % | 0.79 s | 2.20 s | 1.93 s | x2 + 0.15 s (assumption, not measured) |
| open-alternative-jev (Qwen3.5-4B, IkerMoel) | 100.0 % | 84.4 % | 74.7 % | 56.8 % | 0.21 s | 0.32 s | 0.24 s | x2 + 0.15 s (assumption, not measured) |
| system-one-open (Gemma 4 E2B LoRA on an L4) | 100.0 % | 93.8 % | 87.7 % | 49.1 % | 0.65 s | 0.77 s | 0.68 s | x2 (assumption, not measured) |
| OpenJev razorback16 (DiffusionGemma 26B) | 100.0 % | 95.8 % | 91.1 % | 65.5 % | 0.24 s | 0.31 s | 0.27 s | x2 + 0.15 s (assumption, not measured) |
| jeff (GLiFormer 400M) | 100.0 % | 76.0 % | 61.6 % | 37.7 % | 0.94 s | 10.97 s | 2.24 s | x2 + 0.15 s (assumption, not measured) |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | 100.0 % | 95.8 % | 95.2 % | 71.4 % | 0.68 s | 0.73 s | 0.69 s | x2 (assumption, not measured) |
| openJev Verdict (151M) | 86.1 % | 65.6 % | 61.0 % | 38.2 % | 0.28 s | 1.45 s | 0.75 s | x2 + 0.15 s (assumption, not measured) |
| GPT-5.6 Luna (low) | 100.0 % | 97.9 % | 96.6 % | 94.5 % | 0.97 s | 1.82 s | 1.22 s | none (production API) |
| open-jev-deberta-v3-large (local CPU) | 100.0 % | 49.0 % | 53.4 % | 36.4 % | 1.77 s | 3.35 s | 2.64 s | x2 + 0.15 s (assumption, not measured) |
| Bespoke Nimble 9B | 100.0 % | 94.8 % | 89.0 % | 43.6 % | 0.19 s | 0.46 s | 0.20 s | x2 + 0.15 s (assumption, not measured) |
| Gemini 3.1 Flash-Lite | 100.0 % | 99.0 % | 93.2 % | 75.0 % | 0.76 s | 0.88 s | 0.79 s | none (production API) |
| DeepSeek V4.1 Flash | 98.6 % | 99.0 % | 93.2 % | 95.0 % | 1.42 s | 4.89 s | 3.15 s | none (production API) |
| system-one (Qwen3-8B, Goedecke) | 100.0 % | 90.6 % | 91.8 % | 50.0 % | 0.17 s | 0.30 s | 0.21 s | x2 + 0.15 s (assumption, not measured) |
| GLiNER2 (gliner2.5-base) | 97.2 % | 66.7 % | 45.9 % | 36.4 % | 0.31 s | 4.15 s | 0.95 s | x2 + 0.15 s (assumption, not measured) |
| Qwen3.8 27B | 98.6 % | 99.0 % | 95.3 % | 21.4 % | 5.75 s | 12.97 s | 20.47 s | none (production API) |
| Needle 3, options as tools | 66.7 % | 31.2 % | 34.2 % | — | 3.78 s | 33.64 s | — | x2 + 0.15 s (assumption, not measured) |
| Needle 3 | 47.2 % | 16.7 % | 31.5 % | 7.7 % | 1.69 s | 14.36 s | 19.28 s | x2 + 0.15 s (assumption, not measured) |

## Cost basis

- **classifier.dev (fast tier)** — $0.0033 est.: ESTIMATE from the published paid plan (the free tier was used): classifier.dev Pro $20/month for 200,000 fast classifications a day (https://classifier.dev/pricing, read 2026-09-19) = $0.0033 per 1,000 decisions at full use; one decision = one classification. Lower use costs more per decision: at a tenth of that allowance it is $0.033 per 1,000, and the free tier (20,000 fast classifications a day, which is what this run used) costs nothing.
- **Jev 1.13.0** — $0.0406: public tariff x measured tokens (https://docs.typesafe.ai/models (output tokens not billed)) | public tariff x measured tokens (hard-tier run)
- **SemIf (Qwen3.5-4B)** — $0.0230 est.: ESTIMATE: hosted-provider price, deepinfra Qwen/Qwen3.5-4B list price $0.03/M in, $0.15/M out (same weights (not on OpenRouter), as open-alternative-jev in v1.1.2) x 426 input and 1 output tokens per decision (input tokens measured) | ESTIMATE: deepinfra Qwen/Qwen3.5-4B $0.03/M in, $0.15/M out x 1244 in / 0 out tokens per hard decision
- **djev (Maisa, diffusion-gemma)** — $0.0260 (announced price, free preview): ANNOUNCED PRICE (free preview): djev's docs state $0.035 per million input tokens, output tokens free (https://api.djev.dev/docs, 'Usage & credits'; prepaid billing not yet switched on, 19 Sep 2026, so nothing was charged) x measured input tokens (741 per decision on average over all 534 decisions)
- **Laya (421M)** — $0.0029 est.: ESTIMATE: hosted-provider price, deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) list price $0.01/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 205 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **open-alternative-jev (Qwen3.5-4B, IkerMoel)** — $0.0222 est.: ESTIMATE: hosted-provider price, deepinfra Qwen/Qwen3.5-4B list price $0.03/M in, $0.15/M out (as open-alternative-jev) x 383 input and 1 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) | ESTIMATE: deepinfra Qwen/Qwen3.5-4B $0.03/M in, $0.15/M out x 1235 in / 1 out tokens per hard decision
- **system-one-open (Gemma 4 E2B LoRA on an L4)** — $0.0157 est.: ESTIMATE: hosted-provider price, deepinfra google/gemma-4-E4B-it list price $0.02/M in, $0.1/M out (Gemma 4 E2B is not listed; the nearest larger sibling, Gemma 4 E4B, is listed only on DeepInfra) x 452 input and 2 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) | ESTIMATE: deepinfra google/gemma-4-E4B-it $0.02/M in, $0.1/M out x 1235 in / 2 out tokens per hard decision
- **OpenJev razorback16 (DiffusionGemma 26B)** — $0.0672 est.: ESTIMATE: hosted-provider price, openrouter google/gemma-4-26b-a4b-it list price $0.09/M in, $0.3/M out (DiffusionGemma 26B-A4B is not listed; the same-size Gemma 4 26B-A4B MoE sibling is (size class moe_26B-A4B)) x 410 input and 1 output tokens per decision (input tokens measured) | ESTIMATE: openrouter google/gemma-4-26b-a4b-it $0.09/M in, $0.3/M out x 1222 in / 0 out tokens per hard decision
- **jeff (GLiFormer 400M)** — $0.0060 est.: ESTIMATE: hosted-provider price, deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) list price $0.01/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 272 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **openjev-sglang (Qwen3.6-35B-A3B on SGLang)** — $0.1346 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3.6-35b-a3b list price $0.1/M in, $0.9/M out (same base weights) x 667 input and 2 output tokens per decision | ESTIMATE: openrouter qwen/qwen3.6-35b-a3b $0.1/M in, $0.9/M out x 2272 in / 2 out tokens per hard decision
- **openJev Verdict (151M)** — $0.0039 est.: ESTIMATE: hosted-provider price, deepinfra base-size encoders (bge-base, e5-base, gte-base, all-mpnet-base) list price $0.005/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 452 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts)
- **GPT-5.6 Luna (low)** — $0.2473: public tariff x measured tokens (https://platform.openai.com/docs/pricing (standard tier, read 2026-09-19)) | public tariff x measured tokens (hard-tier run)
- **open-jev-deberta-v3-large (local CPU)** — $0.0077 est.: ESTIMATE: hosted-provider price, deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) list price $0.01/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 452 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) | ESTIMATE: deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) $0.01/M in, $0.0/M out x 1235 in / 0 out tokens per hard decision
- **Bespoke Nimble 9B** — $0.1085 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3.5-9b list price $0.1/M in, $0.15/M out (a LoRA merge of Qwen3.5-9B; the base weights are listed on OpenRouter (size class dense_9B)) x 990 input and 1 output tokens per decision (input tokens measured) | ESTIMATE: openrouter qwen/qwen3.5-9b $0.1/M in, $0.15/M out x 1215 in / 2 out tokens per hard decision
- **Gemini 3.1 Flash-Lite** — $0.2682: public tariff x measured tokens (https://ai.google.dev/gemini-api/docs/pricing (paid tier, read 2026-09-19)) | public tariff x measured tokens (hard-tier run)
- **DeepSeek V4.1 Flash** — $0.5788: public tariff x measured tokens (https://api-docs.deepseek.com/quick_start/pricing (cache-miss off-peak; the run is on a Saturday, off-peak all day)) | public tariff x measured tokens (hard-tier run)
- **system-one (Qwen3-8B, Goedecke)** — $0.0915 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3-8b list price $0.117/M in, $0.455/M out (same weights, listed on OpenRouter) x 443 input and 1 output tokens per decision (input tokens measured) | ESTIMATE: openrouter qwen/qwen3-8b $0.117/M in, $0.455/M out x 1258 in / 1 out tokens per hard decision
- **GLiNER2 (gliner2.5-base)** — $0.0039 est.: ESTIMATE: hosted-provider price, deepinfra base-size encoders (bge-base, e5-base, gte-base, all-mpnet-base) list price $0.005/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 452 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts)
- **Qwen3.8 27B** — $2.7110 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3.8-27b list price $0.214/M in, $2.55/M out (same weights; our run used a flat-rate Chutes subscription) x 445 input and 393 output tokens per decision | ESTIMATE: openrouter qwen/qwen3.8-27b $0.214/M in, $2.55/M out x 1592 in / 1833 out tokens per hard decision
- **Needle 3, options as tools** — $0.0162 est.: ESTIMATE: same per-token price as Needle 3 (openrouter meta-llama/llama-3.2-1b-instruct $0.027/M in, $0.201/M out) x 452 input and 20 output tokens per decision, over the 314 easy/standard/judge decisions it ran (no hard-tier run). The v1.2 score lab had no price for this row and scored it 100; fixed.
- **Needle 3** — $0.0249 est.: ESTIMATE: hosted-provider price, openrouter meta-llama/llama-3.2-1b-instruct list price $0.027/M in, $0.201/M out (no generative model under 1B is listed; the smallest listed one (1B) errs high; about 20 generated tokens for one tool call) x 452 input and 20 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) | ESTIMATE: openrouter meta-llama/llama-3.2-1b-instruct $0.027/M in, $0.201/M out x 1235 in / 20 out tokens per hard decision

## Accuracy by subject topic

Accuracy per subject topic over all four tiers (easy, standard, judge, hard): correct / attempted; failures count as wrong; items a partial run never attempted are left out. Aggregates only; not part of the JevBench Score. Topics differ in their tier mix (n_items_by_tier), so compare systems within a topic, not topics with each other. A topic with fewer than 15 attempted items for a system is too thin to read (partial runs). How the topics were assigned: [`datasets/TOPICS.md`](datasets/TOPICS.md).

| System | Math & numbers (129) | Coding & software (56) | Rules, policy & law (67) | Finance & commerce (64) | Support & operations (119) | Everyday language (79) | Safety & security (20) |
|---|---|---|---|---|---|---|---|
| classifier.dev (fast tier) | 86.1 % | 92.9 % | 79.1 % | 70.3 % | 88.2 % | 100.0 % | 95.0 % |
| Jev 1.13.0 | 87.6 % | 83.9 % | 83.6 % | 73.4 % | 89.1 % | 100.0 % | 100.0 % |
| SemIf (Qwen3.5-4B) | 79.1 % | 96.4 % | 64.2 % | 60.9 % | 87.4 % | 100.0 % | 75.0 % |
| djev (Maisa, diffusion-gemma) | 86.1 % | 94.6 % | 76.1 % | 64.1 % | 85.7 % | 98.7 % | 95.0 % |
| Laya (421M) | 51.9 % | 58.9 % | 40.3 % | 54.7 % | 61.3 % | 83.5 % | 65.0 % |
| open-alternative-jev (Qwen3.5-4B, IkerMoel) | 71.3 % | 87.5 % | 59.7 % | 60.9 % | 68.9 % | 91.1 % | 65.0 % |
| system-one-open (Gemma 4 E2B LoRA on an L4) | 79.8 % | 80.4 % | 56.7 % | 46.9 % | 75.6 % | 98.7 % | 70.0 % |
| OpenJev razorback16 (DiffusionGemma 26B) | 84.5 % | 91.1 % | 65.7 % | 64.1 % | 84.0 % | 98.7 % | 90.0 % |
| jeff (GLiFormer 400M) | 69.0 % | 67.9 % | 40.3 % | 46.9 % | 47.9 % | 84.8 % | 50.0 % |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | 86.8 % | 89.3 % | 73.1 % | 76.6 % | 87.4 % | 98.7 % | 90.0 % |
| openJev Verdict (151M) | 65.1 % | 51.8 % | 38.8 % | 51.6 % | 42.9 % | 79.8 % | 60.0 % |
| GPT-5.6 Luna (low) | 93.0 % | 100.0 % | 94.0 % | 98.4 % | 96.6 % | 98.7 % | 100.0 % |
| open-jev-deberta-v3-large (local CPU) | 62.0 % | 46.4 % | 37.3 % | 42.2 % | 35.3 % | 81.0 % | 65.0 % |
| Bespoke Nimble 9B | 83.7 % | 83.9 % | 50.7 % | 50.0 % | 65.5 % | 94.9 % | 75.0 % |
| Gemini 3.1 Flash-Lite | 86.1 % | 92.9 % | 85.1 % | 71.9 % | 87.4 % | 100.0 % | 95.0 % |
| DeepSeek V4.1 Flash | 90.7 % | 98.2 % | 92.5 % | 96.9 % | 97.5 % | 100.0 % | 100.0 % |
| system-one (Qwen3-8B, Goedecke) | 82.2 % | 78.6 % | 52.2 % | 62.5 % | 74.0 % | 96.2 % | 70.0 % |
| GLiNER2 (gliner2.5-base) | 58.1 % | 42.9 % | 41.8 % | 37.5 % | 43.7 % | 83.5 % | 60.0 % |
| Qwen3.8 27B (partial) | 92.4 % | 97.4 % | 96.3 % | 95.0 % | 100.0 % | 97.3 % | 100.0 % (n=4, too few) |
| Needle 3, options as tools (partial) | 58.7 % | 0.0 % | 16.7 % | 66.7 % | 15.7 % | 60.8 % | 50.0 % (n=2, too few) |
| Needle 3 (partial) | 51.5 % | 2.6 % | 23.1 % | 54.0 % | 17.3 % | 26.7 % | 50.0 % (n=4, too few) |

## Limitations

- **The latency adjustment (×2, +0.15 s) is an assumption, not a measurement.** We ran self-hosted and demo endpoints one request at a time (parallelism 1, no other load), so their latency is likely better than the same model on a busy production server; the official Jev API presumably runs under high load, given the public interest. Serving under load trades per-user speed for throughput: in the NVIDIA chart shown by [SemiAnalysis](https://newsletter.semianalysis.com/p/nvidia-blackwell-perf-tco-analysis), moving to the throughput-maximising setting cuts per-user tokens/s by far more than 2×. That chart is a 1.8T MoE on GPU clusters, not a 4B model on one GPU, so it supports the direction and size of the effect, not our exact factor. The +0.15 s stands for infrastructure our self-hosted tests lacked: authentication, load balancing, logging, billing, API gateway. Raw p50/p95 are in the tier table above and in the artifact; a measurement under load is planned.
- 534 decisions is a pilot, not a census, and it is English-only. Held-out decisions are sent to the evaluated services to get predictions: not public is not the same as not seen.
- Latency is one origin (a server in Germany) at one time of day; production APIs, public demos, our GPU and a local CPU are different kinds of latency.
- Estimated costs describe what a large inference provider would charge for a model of that size, not what the author pays.

## Revision log

- **v1.2.2** (2026-09-19): Added five systems requested by readers: Laya, jeff, GLiNER2, openJev Verdict and classifier.dev (fast tier). Full v1.2 set each (534 decisions incl. held-out), scored with the unchanged v1.2 rules. Local systems ran on our CPU (4 threads) with the usual self-hosted latency adjustment; classifier.dev is a production API. Mappings were fixed before the runs (docs/v1.2-additions.md). No other row changed.
- **v1.2.1** (2026-09-19): Added djev (Maisa, diffusion-gemma): full v1.2 set (534 decisions incl. held-out) through its production API, scored with the unchanged v1.2 rules. Cost at djev's announced price ($0.035/M input tokens, output free), which is not yet charged (free preview). No other row changed.
- **v1.2** (2026-09-19): Final JevBench Score: 4 axes, geometric mean.

## What changed from v1.2-wip

- Score: four axes (Intelligence, Calibration, Speed, Cost), 25 % each, geometric mean — replaces the Balanced 33:33:33 arithmetic Main Score.
- Intelligence weights hard 30 % (was 50 %); the rest 1 : 2 : 2 over easy : standard : judge.
- Speed scale 20 points per 10× (was 50); Cost scale 30 points per 10× from $0.001 (was 25). Latency of non-production endpoints adjusted (assumption, see the speed note).
- One open-alternative-jev row (author's option order), named plainly; the reversed-order run is a footnote.
- Needle 3 options-as-tools priced on Needle 3's per-token basis ($0.0162 est.; it had no price).
- Qwen3.8 27B on Chutes is treated as a production API (no latency adjustment).
