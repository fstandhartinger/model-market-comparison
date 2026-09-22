# JevBench v1.3.1 — results

**JevBench Score** = Intelligence above chance, Calibration, Speed, Cost — 25 % each, geometric mean; below 50 Intelligence receives a growing near-chance penalty.

Artifact: [`results/v1.2/jevbench-v1.2-results.json`](results/v1.2/jevbench-v1.2-results.json) · scoring code:
[`jevbench/composite_v13.py`](jevbench/composite_v13.py) · built by [`scripts/v1.2/finalize.py`](scripts/v1.2/finalize.py) from the
v1.2-wip measurements (tag `v1.2-wip`; no measurement changed; later revisions add systems measured on the same frozen items, see the revision log) · interactive page: [benchmarkheaven.com/jev-models](https://benchmarkheaven.com/jev-models)

![JevBench Score](results/v1.2/charts/main-score.png)

> **Speed note.** Latency of self-hosted and demo endpoints is adjusted ×2 (+0.15 s on our own servers) to approximate production load — an assumption, not a measurement; raw measurements are in the table and the repo.

## Ranking

| # | System | **JevBench Score** | Intelligence | Calibration | Speed | Cost | $ per 1,000 decisions | p50 raw → adjusted | Endpoint |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Hopper | **75.4** | 76.4 | 83.0 | 86.8 | 58.7 | $0.0238 est. | 0.13 s → 0.41 s | our GPU (lium.io RTX A6000 48 GB), local loopback HTTP; serial |
| 2 | Jev 1.13.0 | **74.4** | 85.7 | 82.7 | 83.3 | 52.0 | $0.0399 | 0.65 s | production API (api.typesafe.ai) |
| 3 | Jobe Qwen3.5-4B (frozen) | **73.4** | 79.1 | 71.9 | 85.6 | 59.5 | $0.0224 est. | 0.13 s → 0.42 s | our GPU (lium.io RTX A6000 48 GB), in-process, serial |
| 4 | SemIf (Qwen3.5-4B) | **73.1** | 79.0 | 72.6 | 83.7 | 59.5 | $0.0224 est. | 0.20 s → 0.55 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 5 | djev (Maisa, diffusion-gemma) | **73.0** | 82.7 | 65.4 | 91.4 | 57.6 | $0.0260 (announced price, free preview) | 0.24 s | production API (api.djev.dev, free preview) |
| 6 | metask-jev-4b | **72.4** | 76.6 | 73.7 | 89.1 | 54.5 | $0.0328 est. | 0.07 s → 0.28 s | our GPU (lium.io RTX 5090 32 GB); serial, in-process candidate-logit inference |
| 7 | Winnow-12B Q8 | **71.2** | 82.0 | 72.0 | 82.3 | 52.9 | $0.0371 est. | 0.23 s → 0.60 s | our GPU (lium.io RTX 4090 24 GB), reached over the internet from Germany; serial, one request at a time |
| 8 | NInfer Qwen3.8-Flash-Next mixed | **70.9** | 87.4 | 84.5 | 88.2 | 38.9 | $0.1087 est. | 0.08 s → 0.31 s | our lium.io RTX PRO 6000 Blackwell 96 GB; NInfer and harness co-located; serial |
| 9 | local-jev Qwen3.5-4B | **70.9** | 78.8 | 76.8 | 75.0 | 55.8 | $0.0297 est. | 0.71 s → 1.57 s | our GPU (lium.io A6000 48 GB), reached over the internet from Germany; serial, one request at a time |
| 10 | reflex 4B (kshetrajna12) | **70.3** | 80.1 | 75.2 | 68.0 | 59.7 | $0.0221 est. | 1.80 s → 3.75 s | our RunPod GPU (H100 NVL 96 GB, Canada), reached over the internet from Germany |
| 11 | JevOne | **69.3** | 84.4 | 85.9 | 88.5 | 35.9 | $0.1373 est. | 0.09 s → 0.32 s | our GPU (lium.io RTX PRO 6000 Blackwell 96 GB), local loopback HTTP, TP1; serial; independently validated one-card condition |
| 12 | JEV Qwen3.5-9B Base NVFP4 | **68.9** | 73.8 | 75.5 | 93.3 | 43.3 | $0.0775 est. | 0.02 s → 0.19 s | our GPU (lium.io RTX 5090 32 GB), local loopback HTTP, native FP4; serial |
| 13 | jqv (Qwen3-32B zero-shot) | **68.6** | 79.3 | 79.0 | 74.6 | 47.5 | $0.0564 est. | 0.75 s → 1.64 s | our RunPod GPU (H100 NVL 96 GB, Canada), reached over the internet from Germany |
| 14 | decision-machine-1 (milliseconds.ai) | **68.3** | 62.1 | 70.4 | 92.9 | 53.7 | $0.0350 | 0.17 s | production API (milliseconds.ai, served from its nearest region), measured from Germany |
| 15 | swanOne | **67.8** | 85.3 | 79.1 | 81.3 | 38.6 | $0.1115 est. | 0.34 s → 0.82 s | our GPU (lium.io H200 141 GB), local container endpoint; serial; raw T=1.0 |
| 16 | decider-35b-a3b (Mapika) | **67.6** | 79.6 | 71.5 | 80.8 | 45.3 | $0.0666 est. | 0.29 s → 0.73 s | our RunPod GPU (H100 NVL 96 GB), reached over the internet |
| 17 | open-alternative-jev (Qwen3.5-4B, IkerMoel) | **67.0** | 64.0 | 63.2 | 83.5 | 59.6 | $0.0222 est. | 0.21 s → 0.56 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 18 | system-one-open (Gemma 4 E2B LoRA on an L4) | **66.6** | 69.5 | 56.7 | 77.0 | 64.8 | $0.0149 est. | 0.65 s → 1.30 s | author's public demo endpoint (Modal, L4) — not a production service |
| 19 | OpenJev razorback16 (DiffusionGemma 26B) | **66.4** | 79.2 | 64.8 | 83.2 | 45.5 | $0.0656 est. | 0.24 s → 0.63 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 20 | SimpleJev Qwen3.8-27B | **66.3** | 84.7 | 81.1 | 71.2 | 39.5 | $0.1040 est. | 1.01 s → 2.03 s | author's public demo endpoint (Featherless Classifier Demo) — not a production service |
| 21 | NInfer Qwen3.8-27B NVFP4 (T=1.5) | **66.2** | 84.4 | 80.7 | 80.1 | 35.2 | $0.1449 est. | 0.37 s → 0.89 s | our lium.io RTX 5090 32 GB, reached over the public internet from Sandy; serial |
| 22 | ZeroEntropy zerank-2 | **66.0** | 63.0 | 76.5 | 79.0 | 49.8 | $0.0473 | 0.13 s → 0.40 s | our GPU (lium.io A6000 48 GB), serial, one option batch per decision |
| 23 | GPT-5.6 Luna (low) | **65.9** | 95.3 | 89.8 | 77.5 | 28.5 | $0.2419 | 0.97 s | production API (OpenAI), reasoning effort low |
| 24 | openjev-sglang (Qwen3.6-35B-A3B on SGLang) | **65.3** | 83.4 | 77.4 | 77.1 | 36.5 | $0.1313 est. | 0.68 s → 1.36 s | author's public demo endpoint (Modal) — not a production service |
| 25 | NInfer Qwen3.8-27B NVFP4 | **64.7** | 84.4 | 73.6 | 80.1 | 35.2 | $0.1449 est. | 0.37 s → 0.89 s | our lium.io RTX 5090 32 GB, reached over the public internet from Sandy; serial |
| 26 | Qwen3-Reranker-4B | **63.8** | 64.0 | 67.0 | 78.7 | 49.2 | $0.0495 | 0.13 s → 0.41 s | our GPU (lium.io A6000 48 GB), serial, one option batch per decision |
| 27 | Raw Phi-4 mini direct logits | **63.4** | 59.1 | 62.2 | 88.8 | 49.6 | $0.0480 est. | 0.06 s → 0.28 s | our lium.io RTX A6000 48 GB; local in-process; serial; one forward pass |
| 28 | reflex-27b (Qwen3.8-27B) | **63.3** | 85.8 | 86.2 | 67.5 | 32.3 | $0.1811 est. | 1.89 s → 3.93 s | our RunPod GPU (H100 NVL 96 GB), reached over the internet |
| 29 | LitJev (Qwen3.8-27B) | **62.7** | 82.4 | 83.5 | 66.7 | 33.6 | $0.1630 est. | 2.03 s → 4.20 s | our RunPod GPU (H100 NVL 96 GB, Canada), reached over the internet from Germany |
| 30 | kev 0.6B (research preview) | **62.5** | 51.9 | 51.1 | 75.6 | 76.1 | $0.0063 est. | 0.59 s → 1.33 s | our RunPod GPU (GeForce RTX 3090 24 GB, community cloud CA), reached over the internet |
| 31 | SimpleJev Qwen3.6-35B-A3B | **62.5** | 79.5 | 67.1 | 75.0 | 38.1 | $0.1156 est. | 0.85 s → 1.70 s | author's public demo endpoint (Featherless Classifier Demo) — not a production service |
| 32 | djev (thinking) | **62.4** | 80.8 | 92.7 | 75.2 | 26.9 | $0.2743 est. | 0.43 s → 1.00 s | our GPU (lium.io H200 141 GB), reached over the internet from Germany; serial, one request at a time |
| 33 | jev-local (Qwen3.5-9B) | **61.8** | 70.8 | 68.7 | 69.2 | 43.3 | $0.0775 est. | 1.05 s → 2.24 s | our RunPod GPU (H100 NVL 96 GB, Canada), reached over the internet from Germany |
| 34 | decider-2b (Mapika) | **61.7** | 61.2 | 46.6 | 83.2 | 61.0 | $0.0200 est. | 0.26 s → 0.67 s | our RunPod GPU (H100 NVL 96 GB, Canada), reached over the internet from Germany |
| 35 | Bespoke Nimble 9B | **60.5** | 77.9 | 65.3 | 78.7 | 33.4 | $0.1658 est. | 0.39 s → 0.93 s | our RunPod GPU (A40 48 GB, Canada), reached over the internet from Germany |
| 36 | Gemini 3.1 Flash-Lite | **60.1** | 85.6 | 68.1 | 81.8 | 27.4 | $0.2638 | 0.76 s | production API (Google) |
| 37 | OpenJev (thinking, BF16) | **60.0** | 88.0 | 69.6 | 76.1 | 27.8 | $0.2546 est. | 0.46 s → 1.08 s | our GPU (lium.io H200 141 GB), reached over the internet from Germany; serial, one request at a time |
| 38 | kev 4B (research preview) | **59.7** | 64.8 | 42.0 | 75.7 | 61.8 | $0.0188 est. | 0.55 s → 1.25 s | our RunPod GPU (GeForce RTX 3090 24 GB, community cloud CA), reached over the internet |
| 39 | Raw Qwen3 4B Instruct 2507 direct logits | **58.6** | 70.2 | 32.1 | 87.6 | 59.7 | $0.0221 est. | 0.08 s → 0.31 s | our lium.io RTX A6000 48 GB; local in-process; serial; one forward pass |
| 40 | DeepSeek V4.1 Flash | **57.5** | 94.3 | 96.7 | 71.6 | 16.8 | $0.5937 | 1.42 s | production API (DeepSeek) |
| 41 | kev 8B (research preview) | **56.4** | 69.4 | 44.2 | 74.9 | 44.0 | $0.0733 est. | 0.59 s → 1.33 s | our RunPod GPU (GeForce RTX 3090 24 GB, community cloud CA), reached over the internet |
| 42 | Open-Jev 9B (Zefan Cai) | **55.0** | 71.2 | 63.3 | 72.0 | 28.1 | $0.2488 est. | 0.75 s → 1.66 s | our RunPod GPU (H100 80GB HBM3), reached over the internet |
| 43 | system-one (Qwen3-8B, Goedecke) | **54.8** | 70.3 | 36.8 | 84.4 | 41.5 | $0.0894 est. | 0.17 s → 0.48 s | our RunPod GPU (RTX PRO 4500 Blackwell 32 GB (EU-RO-1)), reached over the internet |
| 44 | jeff (GLiFormer 400M) | **54.4** | 46.9 | 64.6 | 63.5 | 76.6 | $0.0060 est. | 0.94 s → 2.03 s | our CPU (4 threads, Ryzen 5 3600) |
| 45 | Laya (421M) | **54.4** | 45.8 | 62.5 | 71.1 | 86.2 | $0.0029 est. | 0.79 s → 1.72 s | our CPU (4 threads, Ryzen 5 3600) |
| 46 | Open-Jev 2B (Zefan Cai) | **51.3** | 61.0 | 55.1 | 73.5 | 28.1 | $0.2488 est. | 0.66 s → 1.48 s | our RunPod GPU (H100 80GB HBM3), reached over the internet |
| 47 | Raw Qwen3 8B direct logits | **50.4** | 68.8 | 26.0 | 86.3 | 41.9 | $0.0866 est. | 0.08 s → 0.32 s | our lium.io RTX A6000 48 GB; local in-process; serial; one forward pass |
| 48 | OpenDecision (ModernBERT-large zero-shot) | **40.6** | 40.8 | 56.1 | 79.9 | 75.3 | $0.0066 est. | 0.34 s → 0.83 s | our RunPod GPU (H100 NVL 96 GB, Canada), reached over the internet from Germany |
| 49 | openJev Verdict 1.4 | **38.9** | 38.6 | 74.1 | 78.1 | 82.4 | $0.0039 est. | 0.31 s → 0.78 s | our CPU (4 threads, Ryzen 5 3600) |
| 50 | openJev Verdict (151M) | **38.1** | 39.8 | 51.3 | 76.7 | 83.1 | $0.0037 est. | 0.28 s → 0.71 s | our CPU (4 threads, Ryzen 5 3600) |
| 51 | Raw Qwen3 1.7B direct logits | **37.4** | 42.9 | 26.8 | 89.7 | 64.9 | $0.0148 est. | 0.07 s → 0.28 s | our lium.io RTX A6000 48 GB; local in-process; serial; one forward pass |
| 52 | kev 0.5B | **33.2** | 38.2 | 47.4 | 77.0 | 76.1 | $0.0063 est. | 0.43 s → 1.01 s | our RunPod GPU (GeForce RTX 3090 24 GB, community cloud CA), reached over the internet |
| 53 | GLiNER2 large (Fastino) | **29.6** | 40.1 | 24.3 | 61.7 | 73.3 | $0.0077 est. | 1.10 s → 2.34 s | our CPU (4 threads, Ryzen 5 3600) |
| 54 | smalljev semantic-v9 | **27.4** | 35.1 | 58.9 | 79.8 | 57.9 | $0.0254 est. | 0.41 s → 0.98 s | our GPU (lium.io A6000 48 GB), reached over the internet from Germany; serial, one request at a time |
| 55 | GLiNER2 (gliner2.5-base) | **24.0** | 35.6 | 23.7 | 71.8 | 83.1 | $0.0037 est. | 0.31 s → 0.78 s | our CPU (4 threads, Ryzen 5 3600) |
| 56 | Open Jev JSON Canvas (JoshuaSP) | **23.8** | 83.2 | none (label only) | 84.1 | 45.6 | $0.0650 est. | 0.22 s → 0.60 s | our lium.io H100 80 GB; local in-process; serial; seed 0; one denoising step |
| 57 | open-jev-deberta-v3-large (local CPU) | **23.1** | 31.9 | 66.4 | 66.0 | 74.0 | $0.0073 est. | 1.77 s → 3.69 s | our CPU (2 threads, Ryzen 5 3600) |
| 58 | GLiNER2.5 multi (Fastino, 287M) | **16.6** | 27.7 | 56.1 | 67.8 | 82.4 | $0.0039 est. | 0.43 s → 1.01 s | our CPU (4 threads, Ryzen 5 3600) |
| 59 | Raw Qwen3 0.6B direct logits | **14.7** | 28.5 | 21.9 | 89.9 | 73.9 | $0.0074 est. | 0.07 s → 0.29 s | our lium.io RTX A6000 48 GB; local in-process; serial; one forward pass |
| 60 | GLiNER2.5 small (Fastino, 74M) | **13.8** | 25.6 | 47.2 | 77.8 | 82.4 | $0.0039 est. | 0.11 s → 0.38 s | our CPU (4 threads, Ryzen 5 3600) |
| 61 | SimpleJev (Qwen3.5-0.8B, CPU) | **11.6** | 24.9 | 48.5 | 57.5 | 68.3 | $0.0114 est. | 3.99 s → 8.14 s | our CPU, Qwen3.5-0.8B float32, 4 inference threads, local loopback HTTP, serial, author-documented 4096-token limit |
| 62 | Mirror | **5.2** | 18.3 | 24.3 | 70.8 | 73.3 | $0.0077 est. | 0.90 s → 1.80 s | hosted submission endpoint, serial from Germany; strict 512-token context rejection |
| 63 | Mixedbread mxbai-rerank-base-v2 | **0.8** | 6.7 | 83.1 | 87.5 | 67.9 | $0.0117 | 0.07 s → 0.29 s | our GPU (lium.io A6000 48 GB), serial, one option batch per decision |
| 64 | BAAI bge-reranker-v2-m3 | **0.7** | 6.3 | 83.8 | 89.5 | 73.4 | $0.0077 | 0.03 s → 0.22 s | our GPU (lium.io A6000 48 GB), serial, one option batch per decision |
| 65 | Alibaba GTE Reranker ModernBERT-base | **0.3** | 4.6 | 76.8 | 90.6 | 69.6 | $0.0103 | 0.05 s → 0.25 s | our GPU (lium.io A6000 48 GB), serial, one option batch per decision |
| 66 | Certo v1 (AltSlate Labs) | **0.0** | 0.0 | 82.0 | 94.0 | 100.0 | $0.0010 est. | 0.02 s → 0.19 s | our RunPod GPU (GeForce RTX 3090 24 GB, community cloud), reached over the internet from Germany |

Hopper is #1 with 75.4; Jev 1.13.0 is #2, 1.0 points behind (difference of the rounded scores). Jev 1.13.0 is #2 with 74.4.

## Honorable mentions — services built on another entrant's model

A service that runs another entrant's model is listed with all of its scores and axes, but is not ranked against the models. Ranking it would rank the same model twice, once at the model's own price and once at the service's. The row keeps every number, axis, cost basis and per-task outcome; it carries no rank number.

| # | System | **JevBench Score** | Intelligence | Calibration | Speed | Cost | $ per 1,000 decisions | p50 raw → adjusted | Endpoint |
|---|---|---|---|---|---|---|---|---|---|
|  | classifier.dev (fast tier) | **83.6** | 85.1 | 77.9 | 87.6 | 84.3 | $0.0033 est. | 0.39 s | production API (classifier.dev, fast tier) |

### classifier.dev (fast tier) — runs on Jev (TypeSafe)

classifier.dev is not its own model. Its own pages say so: "The fast tier is Jev, TypeSafe's decision model" (https://classifier.dev/benchmark, read 2026-09-20), and the API answers with "model": "jev-1.13.0" — the same model version this benchmark measures directly as Jev 1.13.0. What it adds is a price and, on its smart tier, an orchestration layer: "The smart tier is Jev plus a reasoning model re-asking only the answers Jev put under 0.7 confidence" — escalation on low confidence (a model cascade), not best-of-N, not self-consistency and not a committee. Its published escalation model is gemini-3.8-flash. Ranking it against Jev would rank Jev's model against Jev's model, so from v1.2.4 it is an honorable mention instead of #1.

**Only the fast tier was measured. The smart tier's escalation was never run, so nothing here scores it.**

*Price.* $0.0033 per 1,000 decisions is an estimate from the published flat-rate plan at full use: classifier.dev Pro is $20/month for 200,000 fast classifications a day (https://classifier.dev/pricing, read 2026-09-20), and one classification is one decision. Lower use costs more per decision — at a tenth of that allowance it is $0.033 per 1,000 — and the free tier (20,000 fast classifications a day), which is what our run used, costs nothing. Their pages do not say how the flat rate is funded, so we do not know their cost basis; the only figure they publish is what the model costs a caller: "The model behind the fast tier costs about $0.005 per thousand classifications and needs a TypeSafe key" (https://classifier.dev/pricing) — for their short single-sentence inputs, not for JevBench's whole questions.

*Not a pass-through.* On our set the fast tier scored 97.3 % on the judge tier against Jev's 94.5 %, and 70.5 % against 74.1 % on the hard tier. classifier.dev's own explanation for differences of this kind is batching ("The fast tier is Jev, packed a thousand to a request"); on their own two test sets they measured the same difference as noise.

A legitimate, well-documented product: free without an account, open source (https://github.com/mrmps/classifier-dev), by Michael Ryaboy (@michael_chomsky). Sources, read 2026-09-20: <https://classifier.dev>, <https://classifier.dev/benchmark>, <https://classifier.dev/pricing>, <https://classifier.dev/about>


**Partial runs** — shown, not ranked (a tier attempted for fewer than 95 % of its decisions):

| # | System | **JevBench Score** | Intelligence | Calibration | Speed | Cost | $ per 1,000 decisions | p50 raw → adjusted | Endpoint |
|---|---|---|---|---|---|---|---|---|---|
|  | Qwen3.8 27B (partial run) | **24.8** | 67.4 | 92.1 | 61.3 | 0.0 | $2.6691 est. | 5.75 s | Chutes shared inference (TEE) |
|  | Needle 3, options as tools (partial run) | **1.1** | 13.5 | none (label only) | 52.8 | 65.3 | $0.0144 est. | 3.78 s → 7.71 s | our CPU (2 threads, Ryzen 5 3600) |
|  | Needle 3 (partial run) | **0.1** | 4.6 | none (label only) | 59.9 | 58.7 | $0.0238 est. | 1.69 s → 3.52 s | our CPU (2 threads, Ryzen 5 3600) |

Footnote — BAAI bge-reranker-v2-m3: Neutral documented reranker adapter; instruction and no-instruction public calibration were run, then frozen before one held-out pass.

Footnote — Certo v1 (AltSlate Labs): The public Certo v1 checkpoint through the author's DecisionModel, serially on our rented GPU. The question instruction is prepended to the state because Certo exposes state + runtime options but no separate question field; the published 64-token state and 48-token option limits are unchanged. The model card says v1 does not yet transfer to arbitrary natural-language prose. Cost is an estimate from same-size hosted encoders times the checkpoint's retained input tokens, not free/100.

Footnote — classifier.dev (fast tier): Its own benchmark page says the fast tier is Jev. Free for us; the price is its published Pro plan ($20/month for 200,000 fast classifications a day) at full use, $0.0033 per 1,000 decisions.

Footnote — decider-2b (Mapika): The author's TypeSafe-compatible server and published weights (Qwen3.5-2B-Base with a trained one-pass decision readout), run serially on our GPU. Self-host latency gets the standard ×2 + 0.15 s adjustment.

Footnote — decider-35b-a3b (Mapika): The author's TypeSafe-compatible server and published FP8 weights, run serially on our H100 NVL. The exhaustive startup batch warmup was skipped; each required serial shape captured lazily before its measured request. Self-host latency receives the standard ×2 + 0.15 s adjustment. Cost uses the closest hosted 35B-A3B input tariff and is not the temporary rental charge.

Footnote — decision-machine-1 (milliseconds.ai): A closed-weights decision model behind a production API that serves TypeSafe's wire format, so the unchanged typesafe adapter ran it. Run on a free test key (30 requests a minute, 2.2 s between requests); the provider states the inference infrastructure is the same as for paid keys. Cost is the public paid tariff, $0.04 per million input tokens (output free), times the input tokens the API reported.

Footnote — djev (thinking): Experimental full-generation path over the same DiffusionGemma checkpoint as djev-dev: thinking was enabled and the model could generate up to 8,192 tokens before returning its distribution. Current djev-dev itself hard-codes enable_thinking=false, diffusion_max_steps=1 and read_only=true, so this is not a switch in its published typed API. It is substantially slower/costlier, and 72/534 requests exhausted the output budget without a parseable distribution; those are failures. Cost uses measured tokens and a same-size hosted reference, not the H200 rental bill.

Footnote — djev (Maisa, diffusion-gemma): The measured endpoint was Maisa's hosted API in free preview; the cost uses its announced price ($0.035 per million input tokens, output free), and nothing was charged. The self-hostable djev-dev runtime is Apache-2.0 and applies a structured one-step inference method to Google's Apache-2.0 diffusiongemma-26B-A4B-it checkpoint; it adds no separately trained djev weights. Probabilities are djev's own (its docs call them experimental and uncalibrated).

Footnote — GLiNER2 large (Fastino): The large checkpoint of Fastino's earlier GLiNER2 family, same documented mapping as the GLiNER2 row: the question goes in front of the text and the probabilities are the model's own single-label softmax over the labels, read out in full. A general schema classifier, not a Jev rebuild.

Footnote — GLiNER2.5 multi (Fastino, 287M): The multilingual GLiNER2.5 checkpoint (287M), same family and same documented mapping as the GLiNER2 row. JevBench items are English only, so its multilingual training is not exercised here.

Footnote — GLiNER2.5 small (Fastino, 74M): The small GLiNER2.5 checkpoint (74M), same family and same documented mapping as the GLiNER2 row: the question goes in front of the text and the probabilities are the model's own single-label softmax over the labels, read out in full. A general schema classifier, not a Jev rebuild.

Footnote — GLiNER2 (gliner2.5-base): A general schema classifier, not a Jev rebuild. The question goes in front of the text; the probabilities are GLiNER2's own single-label softmax over the labels, read out in full (mapping fixed before the run).

Footnote — Alibaba GTE Reranker ModernBERT-base: Neutral documented reranker adapter; instruction and no-instruction public calibration were run, then frozen before one held-out pass.

Footnote — Hopper: Pinned submitted adapter and base weights, native complete distributions; nonzero hosted-reference cost from measured input tokens.

Footnote — jeff (GLiFormer 400M): Self-hosted from its GitHub repo with server defaults, on our CPU (the author recommends a GPU, e.g. an L4), through the same TypeSafe-compatible API as Jev.

Footnote — jev-local (Qwen3.5-9B): The author's local Jev-compatible server in its default full configuration: a frozen Qwen3.5-9B scores each option by its mean log-probability (one forward pass per option, no generation, no decision training). Run serially on our GPU. It re-reads the state once per option; if its reported token count covers one pass only, a per-token hosted price would be higher than this estimate.

Footnote — JEV Qwen3.5-9B Base NVFP4: Pinned native NVFP4 checkpoint with option-token-logit adapter. Cost uses the exact Qwen3.5-9B hosted input reference and benchmark prompt-token reference, not temporary GPU rental spend.

Footnote — JevOne: Every prompt is evaluated in forward and reversed option order. Cost uses twice the logical input count. The author default is two 96 GB GPUs; this run validated one 96 GB GPU without changing weights or mapping.

Footnote — Jobe Qwen3.5-4B (frozen): Frozen unmodified Qwen3.5-4B BF16 backbone; native restricted softmax over in-context option-letter logits at the last position, no temperature and no order averaging. The model was warm-loaded. Flash-linear-attention was installed; causal convolution used Transformers' correct reference implementation because the optional compiled extension had no compatible wheel. Cost is a nonzero same-model hosted estimate.

Footnote — jqv (Qwen3-32B zero-shot): A stock Qwen3-32B with no decision training: the state is prefilled once, each question is an isolated branch and the answer is read from the option-letter logits, with one fitted temperature (3.02, 400 MMLU validation items). Re-run in v1.2.8 on our own GPU from the now-public serving code (Octalab-Inc/jqv 0189b67), so all 534 decisions including the held-out hard items were asked; this full run replaces the v1.2.7 partial row, which had been measured on the submitter's machine. Cost is the base model's public per-token tariff, not free.

Footnote — kev 0.5B: Self-hosted from the author's repository at commit 20fa626 through its native TypeSafe-compatible `/v1/systemone` server, BF16 on an RTX 3090; measured serially from Sandy over the internet. This is the v0.1 release.

Footnote — kev 0.6B (research preview): Self-hosted from the author's repository at commit 20fa626 through its native TypeSafe-compatible `/v1/systemone` server, BF16 on an RTX 3090; measured serially from Sandy over the internet. The author labels this checkpoint a research preview.

Footnote — kev 4B (research preview): Self-hosted from the author's repository at commit 20fa626 through its native TypeSafe-compatible `/v1/systemone` server, BF16 on an RTX 3090; measured serially from Sandy over the internet. The author labels this checkpoint a research preview.

Footnote — kev 8B (research preview): Self-hosted from the author's repository at commit 20fa626 through its native TypeSafe-compatible `/v1/systemone` server, BF16 on an RTX 3090; measured serially from Sandy over the internet. The author labels this checkpoint a research preview.

Footnote — Laya (421M): The English checkpoint (repo root), run on our CPU through its own `laya` package. Its budget is 512 tokens per question, so long hard-tier states are cut by the package itself.

Footnote — LitJev (Qwen3.8-27B): The author's reproduction of Jev's decision layer on an off-the-shelf model, in its default configuration: Qwen3.8-27B, scores read from the output head, no training and no calibration file (its README says probabilities are not calibrated by default). Run serially on our GPU through an SSH tunnel, because its server binds to localhost; the request still crosses the internet and gets the ×2 + 0.15 s adjustment.

Footnote — local-jev Qwen3.5-4B: The pinned Qwen3.5-4B text model ran through the entrant's native TypeSafe-compatible HTTP route. Its zero-shot JSON layout and per-primitive temperatures were frozen in the submitted commit; the author disclosed selecting JSON over plain prompts on the 231 public items. Cost is USD 0.04/M measured input tokens, not free or an automatic 100.

Footnote — metask-jev-4b: The exact multilingual merged checkpoint ran through the author's submitted PR #17 adapter at a 4096-token limit. Two hard items exceeded that limit and correctly count as failed/wrong. The PR's submitted temperatures (choice 1.7875, noul 2.25, score 2.05) were kept unchanged; the current checkpoint temperature.json instead advertises 1.9, 2.375, 2.3, a discrepancy disclosed here. Cost is USD 0.04/M measured input tokens, not free or an automatic 100.

Footnote — Mirror: Strict 512-token endpoint: 171 HTTP 422 context rejections count as misses. Probabilities are temperature-1 normalized singleton classification-span scores, not a categorical calibration head.

Footnote — Mixedbread mxbai-rerank-base-v2: Neutral documented reranker adapter; instruction and no-instruction public calibration were run, then frozen before one held-out pass.

Footnote — Bespoke Nimble 9B: Re-run in v1.2.8 at Bespoke Labs' request after they raised the serving prompt limit from 2,048 to 8,192 tokens (bespokelabsai/nimble PR #4). Same recipe as the v1.1.3 run — the published LoRA merged into Qwen3.5-9B with the author's PEFT safe-merge, served with SGLang and the author's Jev-compatible API — now from current nimble main; the adapter weights are unchanged. Hard-tier accuracy rose from 43.6 % to 65.5 %, yet the score fell: the long hard items that used to fail at once are now answered and priced (so Cost fell), and this pod was in Canada while the v1.1.3 run's was in Sweden, so part of the lower Speed is network distance from our server in Germany. This complete run replaces the earlier row; its old score is kept in the artifact under superseded_rows.

Footnote — NInfer Qwen3.8-27B NVFP4 (T=1.5): Same native logits as the raw row, divided by the preregistered temperature 1.5 before softmax. The submitter selected 1.5 on public JevBench hard items, so this calibration is development-set tuned and disclosed. Cost uses a nonzero hosted same-model tariff.

Footnote — NInfer Qwen3.8-27B NVFP4: Native option-letter logits from one non-thinking prefill pass, raw softmax (temperature 1.0). Cost uses a nonzero hosted same-model reference tariff, not automatic 100.

Footnote — NInfer Qwen3.8-Flash-Next mixed: Native option-letter logits from one non-thinking prefill pass, raw softmax (temperature 1.0). Cost uses a nonzero hosted same-model reference tariff, not automatic 100.

Footnote — Open Jev JSON Canvas (JoshuaSP): Faithful multi-token trie projection is label-only; no probability distribution is invented, so Calibration is zero by rule.

Footnote — Open-Jev 2B (Zefan Cai): The author's pinned LoRA adapter, trained scalar decision head and calibration temperature, served by the author's Open-Jev server with prefix caching off, batch size 1 and 4,096-token limit. Serial requests were measured from Sandy over an SSH tunnel to the H100. Self-host latency receives the standing x2 + 0.15 s adjustment. Cost uses the exact Qwen3.5-9B hosted input tariff for 9B and the same conservative same-family proxy for the unlisted 2B; neither receives an automatic 100. Exact normalized comparison found no JevBench public task state or instruction in the 79,116-row public training projection.

Footnote — Open-Jev 9B (Zefan Cai): The author's pinned LoRA adapter, trained scalar decision head and calibration temperature, served by the author's Open-Jev server with prefix caching off, batch size 1 and 4,096-token limit. Serial requests were measured from Sandy over an SSH tunnel to the H100. Self-host latency receives the standing x2 + 0.15 s adjustment. Cost uses the exact Qwen3.5-9B hosted input tariff for 9B and the same conservative same-family proxy for the unlisted 2B; neither receives an automatic 100. Exact normalized comparison found no JevBench public task state or instruction in the 79,116-row public training projection.

Footnote — OpenDecision (ModernBERT-large zero-shot): A zero-shot NLI classifier behind a TypeSafe-compatible server, not a trained decision model: it scores each option as an entailment hypothesis with ModernBERT-large-zeroshot-v2.0. Its choice path runs several NLI passes over the same state, which the reported token count does not include, so a per-token hosted price would be higher than the estimate here. Pre-registered for our CPU in v1.2.7, run on our GPU because the CPU was far too slow.

Footnote — OpenJev (thinking, BF16): OpenJev's real typed-API thinking switch at think=512, using its own /v1/systemone server over BF16 DiffusionGemma. The thought is generated first, then native probability reads are taken after it. All 534 requests returned valid distributions. Cost counts the server's billed input and thought output tokens.

Footnote — openJev Verdict 1.4: Same public weights as the earlier Verdict row, run through the author's fixed v1.4 engine. That engine auto-loads the calibrator for every option count, frames candidate labels as NLI sentences and uses a 512-token context budget. Run locally on our CPU, serially.

Footnote — openJev Verdict (151M): The openJev-verdict-2.0 Hugging Face repo ships no weights; its config is byte-identical to heman10x/rlcd-modernbert-151m, whose published weights we ran with the author's engine. The 'verdict2-base' checkpoint behind the README's numbers is not downloadable yet (Git LFS 404); we will run it once it is.

Footnote — Qwen3-Reranker-4B: Neutral documented reranker adapter; instruction and no-instruction public calibration were run, then frozen before one held-out pass.

Footnote — Raw Phi-4 mini direct logits: Neutral preregistered uncalibrated softmax over next-token option-letter logits; reproduced raw-logit control, not an S1Bench score.

Footnote — Raw Qwen3 0.6B direct logits: Neutral preregistered uncalibrated softmax over next-token option-letter logits; reproduced raw-logit control, not an S1Bench score.

Footnote — Raw Qwen3 1.7B direct logits: Neutral preregistered uncalibrated softmax over next-token option-letter logits; reproduced raw-logit control, not an S1Bench score.

Footnote — Raw Qwen3 4B Instruct 2507 direct logits: Neutral preregistered uncalibrated softmax over next-token option-letter logits; reproduced raw-logit control, not an S1Bench score.

Footnote — Raw Qwen3 8B direct logits: Neutral preregistered uncalibrated softmax over next-token option-letter logits; reproduced raw-logit control, not an S1Bench score.

Footnote — reflex-27b (Qwen3.8-27B): The frozen public Qwen3.8-27B checkpoint through reflex at the requested pinned commit, with two option orders averaged and temperature 1. No adapter or fitted calibration file. Run serially on our H100 NVL. Self-host latency receives the standard ×2 + 0.15 s adjustment; cost uses the exact base model's public hosted input tariff.

Footnote — reflex 4B (kshetrajna12): The author's reflex-serve: Qwen3.5-4B with the published LoRA and its per-primitive calibration file; the state is encoded once and each question read from the label logits. Run serially on our GPU; the author discloses that the 231 public items were used four times as a development gate.

Footnote — SimpleJev (Qwen3.5-0.8B, CPU): Seven over-4096-token hard inputs received the endpoint’s documented HTTP 422 rejection and count as misses. No truncation or context extension was introduced.

Footnote — SimpleJev Qwen3.6-35B-A3B: Author's no-login shared demo, model id recorded verbatim, one request at a time at or below its 2 RPS limit. SimpleJev reads answer-token logits and returns the complete distribution; it does not generate an answer. Speed uses the public-demo x2 load adjustment; cost uses a hosted size-class input price and is not free/100.

Footnote — SimpleJev Qwen3.8-27B: Author's no-login shared demo, model id recorded verbatim, one request at a time at or below its 2 RPS limit. SimpleJev reads answer-token logits and returns the complete distribution; it does not generate an answer. Speed uses the public-demo x2 load adjustment; cost uses a hosted size-class input price and is not free/100.

Footnote — smalljev semantic-v9: The public semantic-v9 LoRA and native heads over MiniCPM5-2B-Base, through the mapping frozen before the run. It has a typed Python contract but no TypeSafe-compatible HTTP route. The released training recipe explicitly hill-climbed against JevBench's public shape and source families; this allowed public benchmark-directed development is disclosed. Cost is $0.04/M measured input tokens, not free/100.

Footnote — swanOne: Raw T=1.0 preregistered row. One constrained completion token is included in cost. Public-task and public-hard temperature-development disclosures are retained.

Footnote — Winnow-12B Q8: The submitted Q8_0 GGUF ran through the pinned author's TypeSafe-compatible /v1/systemone server with 8,192 context, four resident decision branches, Q8 KV, and full GPU offload. The private training corpus was not released. The author's checksum-based audit reports zero exact public-item overlap, but that claim cannot be independently reproduced; our scan found no exact public state or instruction text in the released artifacts. Cost uses the $0.05/M-input hosted Gemma 3 12B reference, not free/100.

Footnote — ZeroEntropy zerank-2: Neutral documented reranker adapter; instruction and no-instruction public calibration were run, then frozen before one held-out pass.

Footnote — open-alternative-jev: With the options in reverse order (A. no, B. yes) the same model scored 21 % instead of 72 % on yes/no answer-judging items — small models are very sensitive to option order. The ranked row uses the author's own order
(`A. yes, B. no`, as his `yes_no()` helper builds it); the reversed-order run was our adapter's mistake and is kept only as raw
files (`results/v1.2/wip/`, GPU round runs).

## How the score works

| Axis | Definition |
|---|---|
| **Intelligence** | Per tier: 100 x (accuracy - chance) / (1 - chance), clipped at 0. Chance is 1 / options for each item (1 / levels for score items), then averaged within the tier. Tier weights: hard 30 %, easy 14 %, standard 28 %, judge 28 %. Failed, timed-out or unparseable answers count as wrong. |
| **Calibration** | Hard tier only, systems that return a probability distribution: mean of (a) 100 x (1 - ECE/0.5), ECE = top-label expected calibration error in 10 bins, and (b) probability fidelity = 100 x (1 - mean total-variation distance) between the returned distribution and the exact gold distribution on the 20 probability items. Label-only systems have none; it counts as 0 in the JevBench Score. |
| **Speed** | Mean of score(p50) and score(p95) of the serial 242-decision standard+judge run; score(s) = 100 - 20 log10(s / 0.1 s), clipped to 0..100 (0.1 s = 100, 1 s = 80, 10 s = 60). Latency of self-hosted and demo endpoints is adjusted ×2 (+0.15 s on our own servers) to approximate production load — an assumption, not a measurement; raw measurements are in the table and the repo. Production APIs (Jev, djev, classifier.dev, OpenAI, Google, DeepSeek, Chutes) are not adjusted. |
| **Cost** | US dollars per 1,000 DECISIONS — not per 1,000 tokens. One decision is one whole question: its state, its rubric and its options, which is hundreds to thousands of input tokens. Pooled over all 534 v1.2 decisions; score = 100 - 30 log10(usd / 0.001), clipped to 0..100 ($0.001 = 100, $0.01 = 70, $0.10 = 40, $1 = 10). Measured = public tariff x measured tokens. est. = hosted-provider list price of the same weights or size class x tokens (for a flat-rate service, its published plan price at full use). announced = the provider's published price, not yet charged (free preview), x measured tokens. |
| **JevBench Score** | Geometric mean of Intelligence, Calibration, Speed and Cost, 25 % each. If chance-corrected Intelligence is below 50, multiply by (Intelligence / 50)^2; at or above 50 there is no penalty. |

![The four axes](results/v1.2/charts/axes.png)

## Other views (not the JevBench Score)

Other views reweight the same four axes and combine them the same way (geometric mean). They are not the JevBench Score. Weights are Intelligence : Calibration : Speed : Cost.

| System | JevBench Score (25:25:25:25) (25:25:25:25) | Balanced 33:33:33 (no calibration) (33:0:33:33) | Emphasis on Accuracy 60:20:20 (60:0:20:20) | Emphasis on Speed 20:60:20 (20:0:60:20) | Emphasis on Cost 20:20:60 (20:0:20:60) | Intelligence only (100:0:0:0) |
|---|---|---|---|---|---|---|
| Hopper | #1 75.4 | #4 73.0 | #7 74.4 | #4 78.3 | #6 66.9 | #29 76.4 |
| Jev 1.13.0 | #2 74.4 | #6 71.8 | #2 77.1 | #9 76.2 | #14 63.1 | #6 85.7 |
| Jobe Qwen3.5-4B (frozen) | #3 73.4 | #2 73.9 | #3 75.9 | #3 78.3 | #4 67.7 | #24 79.1 |
| SemIf (Qwen3.5-4B) | #4 73.1 | #3 73.3 | #4 75.5 | #6 77.3 | #5 67.4 | #25 79.0 |
| djev (Maisa, diffusion-gemma) | #5 73.0 | #1 75.8 | #1 78.5 | #1 81.7 | #3 67.9 | #15 82.7 |
| metask-jev-4b | #6 72.4 | #5 71.9 | #9 73.8 | #2 78.4 | #12 64.4 | #28 76.6 |
| Winnow-12B Q8 | #7 71.2 | #8 71.0 | #5 75.2 | #10 75.3 | #15 63.1 | #17 82.0 |
| NInfer Qwen3.8-Flash-Next mixed | #8 70.9 | #17 66.9 | #6 74.5 | #11 74.8 | #27 53.9 | #4 87.4 |
| local-jev Qwen3.5-4B | #9 70.9 | #10 69.1 | #11 72.8 | #21 71.4 | #13 63.4 | #26 78.8 |
| reflex 4B (kshetrajna12) | #10 70.3 | #11 68.8 | #10 73.1 | #31 68.4 | #8 65.0 | #19 80.1 |
| JevOne | #11 69.3 | #23 64.5 | #14 71.8 | #15 73.2 | #34 51.0 | #10 84.4 |
| JEV Qwen3.5-9B Base NVFP4 | #12 68.9 | #20 66.8 | #24 69.5 | #8 76.4 | #26 56.2 | #30 73.8 |
| jqv (Qwen3-32B zero-shot) | #13 68.6 | #22 65.5 | #18 70.7 | #26 69.0 | #21 57.6 | #22 79.3 |
| decision-machine-1 (milliseconds.ai) | #14 68.3 | #15 67.6 | #34 65.4 | #7 76.8 | #16 61.7 | #42 62.1 |
| swanOne | #15 67.8 | #24 64.4 | #12 72.1 | #22 70.7 | #31 52.5 | #8 85.3 |
| decider-35b-a3b (Mapika) | #16 67.6 | #21 66.3 | #16 71.3 | #19 71.7 | #25 56.9 | #20 79.6 |
| open-alternative-jev (Qwen3.5-4B, IkerMoel) | #17 67.0 | #13 68.3 | #29 66.6 | #13 74.0 | #11 64.7 | #39 64.0 |
| system-one-open (Gemma 4 E2B LoRA on an L4) | #18 66.6 | #9 70.3 | #22 70.0 | #17 72.9 | #2 68.0 | #35 69.5 |
| OpenJev razorback16 (DiffusionGemma 26B) | #19 66.4 | #18 66.9 | #15 71.6 | #16 73.0 | #22 57.3 | #23 79.2 |
| SimpleJev Qwen3.8-27B | #20 66.3 | #30 62.0 | #19 70.2 | #38 65.5 | #33 51.8 | #9 84.7 |
| NInfer Qwen3.8-27B NVFP4 (T=1.5) | #21 66.2 | #31 62.0 | #20 70.1 | #29 68.7 | #37 49.4 | #11 84.4 |
| ZeroEntropy zerank-2 | #22 66.0 | #27 62.8 | #42 62.9 | #27 68.8 | #23 57.2 | #41 63.0 |
| GPT-5.6 Luna (low) | #23 65.9 | #37 59.5 | #13 71.8 | #37 66.1 | #45 44.3 | #1 95.3 |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | #24 65.3 | #33 61.7 | #23 69.6 | #32 67.4 | #36 50.0 | #13 83.4 |
| NInfer Qwen3.8-27B NVFP4 | #25 64.7 | #32 62.0 | #21 70.1 | #30 68.7 | #38 49.4 | #12 84.4 |
| Qwen3-Reranker-4B | #26 63.8 | #28 62.8 | #40 63.3 | #28 68.7 | #24 56.9 | #40 64.0 |
| Raw Phi-4 mini direct logits | #27 63.4 | #25 63.8 | #43 61.9 | #18 72.9 | #20 57.7 | #45 59.1 |
| reflex-27b (Qwen3.8-27B) | #28 63.3 | #40 57.2 | #28 67.2 | #42 61.1 | #42 45.5 | #5 85.8 |
| LitJev (Qwen3.8-27B) | #29 62.7 | #42 57.0 | #31 66.0 | #43 60.7 | #41 46.1 | #16 82.4 |
| kev 0.6B (research preview) | #30 62.5 | #19 66.8 | #44 60.4 | #25 70.2 | #1 70.4 | #46 51.9 |
| SimpleJev Qwen3.6-35B-A3B | #31 62.5 | #35 61.0 | #26 67.8 | #35 66.3 | #35 50.6 | #21 79.5 |
| djev (thinking) | #32 62.4 | #44 54.6 | #38 63.9 | #41 62.1 | #49 41.1 | #18 80.8 |
| jev-local (Qwen3.5-9B) | #33 61.8 | #36 59.6 | #39 63.9 | #40 63.3 | #32 52.5 | #32 70.8 |
| decider-2b (Mapika) | #34 61.7 | #14 67.7 | #36 65.1 | #14 73.5 | #10 64.9 | #43 61.2 |
| Bespoke Nimble 9B | #35 60.5 | #38 58.9 | #32 65.9 | #36 66.2 | #39 47.0 | #27 77.9 |
| Gemini 3.1 Flash-Lite | #36 60.1 | #39 57.6 | #27 67.5 | #34 66.3 | #47 42.8 | #7 85.6 |
| OpenJev (thinking, BF16) | #37 60.0 | #41 57.1 | #25 67.9 | #39 64.0 | #46 42.8 | #3 88.0 |
| kev 4B (research preview) | #38 59.7 | #16 67.2 | #30 66.2 | #24 70.5 | #9 65.0 | #38 64.8 |
| Raw Qwen3 4B Instruct 2507 direct logits | #39 58.6 | #7 71.6 | #17 71.0 | #5 77.6 | #7 66.6 | #34 70.2 |
| DeepSeek V4.1 Flash | #40 57.5 | #48 48.4 | #41 63.2 | #47 56.6 | #55 31.7 | #2 94.3 |
| kev 8B (research preview) | #41 56.4 | #34 61.2 | #37 64.3 | #33 66.3 | #28 53.6 | #36 69.4 |
| Open-Jev 9B (Zefan Cai) | #42 55.0 | #46 52.4 | #45 59.3 | #44 59.5 | #50 40.9 | #31 71.2 |
| system-one (Qwen3-8B, Goedecke) | #43 54.8 | #29 62.6 | #33 65.6 | #23 70.6 | #30 53.1 | #33 70.3 |
| jeff (GLiFormer 400M) | #44 54.4 | #45 53.6 | #47 48.2 | #48 54.5 | #18 58.7 | #47 41.1 |
| Laya (421M) | #45 54.4 | #43 55.0 | #48 47.7 | #46 56.8 | #17 61.4 | #48 38.5 |
| Open-Jev 2B (Zefan Cai) | #46 51.3 | #47 50.1 | #46 54.2 | #45 58.4 | #52 39.8 | #44 61.0 |
| Raw Qwen3 8B direct logits | #47 50.4 | #26 62.9 | #35 65.2 | #20 71.4 | #29 53.5 | #37 68.8 |
| OpenDecision (ModernBERT-large zero-shot) | #48 40.6 | #50 41.7 | #50 35.2 | #50 46.0 | #43 44.9 | #50 27.2 |
| openJev Verdict 1.4 | #49 38.9 | #52 37.4 | #53 30.7 | #52 40.8 | #48 41.6 | #53 22.9 |
| openJev Verdict (151M) | #50 38.1 | #51 40.1 | #51 33.3 | #51 43.3 | #44 44.7 | #52 25.2 |
| Raw Qwen3 1.7B direct logits | #51 37.4 | #49 46.3 | #49 39.7 | #49 53.4 | #40 46.9 | #49 31.5 |
| kev 0.5B | #52 33.2 | #54 35.4 | #54 29.4 | #53 38.9 | #53 38.7 | #54 22.2 |
| GLiNER2 large (Fastino) | #53 29.6 | #53 36.5 | #52 31.8 | #54 37.8 | #51 40.5 | #51 25.9 |
| smalljev semantic-v9 | #54 27.4 | #56 26.9 | #56 22.6 | #56 31.4 | #56 27.6 | #56 17.3 |
| GLiNER2 (gliner2.5-base) | #55 24.0 | #55 30.3 | #55 24.6 | #55 32.6 | #54 34.6 | #55 18.1 |
| Open Jev JSON Canvas (JoshuaSP) | #56 23.8 | #12 68.3 | #8 73.9 | #12 74.2 | #19 58.1 | #14 83.2 |
| open-jev-deberta-v3-large (local CPU) | #57 23.1 | #57 21.9 | #57 17.8 | #57 23.7 | #57 24.9 | #57 13.0 |
| GLiNER2.5 multi (Fastino, 287M) | #58 16.6 | #59 16.4 | #59 12.6 | #59 18.0 | #59 19.5 | #59 8.5 |
| Raw Qwen3 0.6B direct logits | #59 14.7 | #58 18.7 | #58 14.1 | #58 22.4 | #58 20.7 | #58 9.3 |
| GLiNER2.5 small (Fastino, 74M) | #60 13.8 | #60 14.4 | #60 10.6 | #60 16.5 | #60 16.9 | #60 6.7 |
| SimpleJev (Qwen3.5-0.8B, CPU) | #61 11.6 | #61 11.5 | #61 9.0 | #61 12.5 | #61 13.4 | #61 6.2 |
| Mirror | #62 5.2 | #62 6.1 | #62 4.2 | #62 7.3 | #62 7.4 | #62 2.4 |
| Mixedbread mxbai-rerank-base-v2 | #63 0.8 | #63 0.6 | #63 0.3 | #63 0.9 | #63 0.8 | #63 0.1 |
| BAAI bge-reranker-v2-m3 | #64 0.7 | #64 0.5 | #64 0.3 | #64 0.8 | #64 0.7 | #64 0.1 |
| Alibaba GTE Reranker ModernBERT-base | #65 0.3 | #65 0.3 | #65 0.1 | #65 0.4 | #65 0.4 | #65 0.0 |
| Certo v1 (AltSlate Labs) | #66 0.0 | #66 0.0 | #66 0.0 | #66 0.0 | #66 0.0 | #66 0.0 |

## Hard tier

![Hard tier accuracy](results/v1.2/charts/hard-tier.png)
![Hard tier by family](results/v1.2/charts/hard-families.png)
![Calibration](results/v1.2/charts/calibration.png)

220 new decisions (111 public, 109 held out): long multi-condition policy documents (2-6k tokens), priority trade-offs, deliberately ambiguous cases with a 'no clear answer' label, traps, multi-hop lookups, date/number reasoning, adversarial distractors, subtle answer-judging, overlapping routing, and probability items with an exact gold distribution. Half written by Claude Opus 5, half by GPT-5.6 Sol; each item reviewed blind and then against its gold by the other model; one discussion round; frozen and hashed before any benchmarked system saw an item. No item was selected on any system's answers.

## Tier accuracies and raw latency

| System | easy | standard | judge | hard | p50 raw | p95 raw | hard-tier p50 | Adjustment |
|---|---|---|---|---|---|---|---|---|
| Hopper | 100.0 % | 96.9 % | 83.6 % | 65.0 % | 0.13 s | 0.18 s | 0.13 s | x2 + 0.15 s (assumption, not measured) |
| Jev 1.13.0 | 100.0 % | 99.0 % | 94.5 % | 74.1 % | 0.65 s | 0.72 s | 0.67 s | none (production API) |
| Jobe Qwen3.5-4B (frozen) | 100.0 % | 97.9 % | 96.6 % | 58.6 % | 0.13 s | 0.25 s | 0.14 s | x2 + 0.15 s (assumption, not measured) |
| SemIf (Qwen3.5-4B) | 100.0 % | 97.9 % | 95.2 % | 59.5 % | 0.20 s | 0.32 s | 0.22 s | x2 + 0.15 s (assumption, not measured) |
| djev (Maisa, diffusion-gemma) | 100.0 % | 97.9 % | 93.2 % | 69.5 % | 0.24 s | 0.31 s | 0.25 s | none (production API) |
| metask-jev-4b | 100.0 % | 97.9 % | 89.7 % | 59.1 % | 0.07 s | 0.14 s | 0.09 s | x2 + 0.15 s (assumption, not measured) |
| Winnow-12B Q8 | 100.0 % | 96.9 % | 91.1 % | 70.9 % | 0.23 s | 0.41 s | 0.28 s | x2 + 0.15 s (assumption, not measured) |
| NInfer Qwen3.8-Flash-Next mixed | 100.0 % | 99.0 % | 95.2 % | 77.3 % | 0.08 s | 0.17 s | 0.11 s | x2 + 0.15 s (assumption, not measured) |
| local-jev Qwen3.5-4B | 100.0 % | 95.8 % | 95.9 % | 60.5 % | 0.71 s | 0.94 s | 0.77 s | x2 + 0.15 s (assumption, not measured) |
| reflex 4B (kshetrajna12) | 100.0 % | 94.8 % | 97.3 % | 63.2 % | 1.80 s | 2.05 s | 1.87 s | x2 + 0.15 s (assumption, not measured) |
| JevOne | 100.0 % | 96.9 % | 92.5 % | 75.0 % | 0.09 s | 0.15 s | 0.11 s | x2 + 0.15 s (assumption, not measured) |
| JEV Qwen3.5-9B Base NVFP4 | 100.0 % | 91.7 % | 89.7 % | 58.6 % | 0.02 s | 0.05 s | 0.03 s | x2 + 0.15 s (assumption, not measured) |
| jqv (Qwen3-32B zero-shot) | 100.0 % | 95.8 % | 92.5 % | 64.5 % | 0.75 s | 0.97 s | 0.81 s | x2 + 0.15 s (assumption, not measured) |
| decision-machine-1 (milliseconds.ai) | 100.0 % | 76.0 % | 89.7 % | 46.8 % | 0.17 s | 0.30 s | 0.19 s | none (production API) |
| swanOne | 100.0 % | 96.9 % | 93.2 % | 76.4 % | 0.34 s | 0.37 s | 0.34 s | x2 + 0.15 s (assumption, not measured) |
| decider-35b-a3b (Mapika) | 100.0 % | 96.9 % | 91.1 % | 65.5 % | 0.29 s | 0.49 s | 0.31 s | x2 + 0.15 s (assumption, not measured) |
| open-alternative-jev (Qwen3.5-4B, IkerMoel) | 100.0 % | 84.4 % | 74.7 % | 56.8 % | 0.21 s | 0.32 s | 0.24 s | x2 + 0.15 s (assumption, not measured) |
| system-one-open (Gemma 4 E2B LoRA on an L4) | 100.0 % | 93.8 % | 87.7 % | 49.1 % | 0.65 s | 0.77 s | 0.68 s | x2 (assumption, not measured) |
| OpenJev razorback16 (DiffusionGemma 26B) | 100.0 % | 95.8 % | 91.1 % | 65.5 % | 0.24 s | 0.31 s | 0.27 s | x2 + 0.15 s (assumption, not measured) |
| SimpleJev Qwen3.8-27B | 100.0 % | 96.9 % | 93.2 % | 75.0 % | 1.01 s | 1.88 s | 1.50 s | x2 (assumption, not measured) |
| NInfer Qwen3.8-27B NVFP4 (T=1.5) | 100.0 % | 97.9 % | 96.6 % | 70.5 % | 0.37 s | 0.47 s | 0.41 s | x2 + 0.15 s (assumption, not measured) |
| ZeroEntropy zerank-2 | 100.0 % | 79.2 % | 88.4 % | 47.3 % | 0.13 s | 1.50 s | 0.23 s | x2 + 0.15 s (assumption, not measured) |
| GPT-5.6 Luna (low) | 100.0 % | 97.9 % | 96.6 % | 94.5 % | 0.97 s | 1.82 s | 1.22 s | none (production API) |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | 100.0 % | 95.8 % | 95.2 % | 71.4 % | 0.68 s | 0.73 s | 0.69 s | x2 (assumption, not measured) |
| NInfer Qwen3.8-27B NVFP4 | 100.0 % | 97.9 % | 96.6 % | 70.5 % | 0.37 s | 0.47 s | 0.41 s | x2 + 0.15 s (assumption, not measured) |
| Qwen3-Reranker-4B | 100.0 % | 79.2 % | 87.7 % | 50.0 % | 0.13 s | 1.56 s | 0.26 s | x2 + 0.15 s (assumption, not measured) |
| Raw Phi-4 mini direct logits | 100.0 % | 74.0 % | 78.1 % | 52.3 % | 0.06 s | 0.16 s | 0.08 s | x2 + 0.15 s (assumption, not measured) |
| reflex-27b (Qwen3.8-27B) | 100.0 % | 95.8 % | 95.9 % | 75.9 % | 1.89 s | 2.21 s | 2.11 s | x2 + 0.15 s (assumption, not measured) |
| LitJev (Qwen3.8-27B) | 100.0 % | 97.9 % | 88.4 % | 73.2 % | 2.03 s | 2.46 s | 2.29 s | x2 + 0.15 s (assumption, not measured) |
| kev 0.6B (research preview) | 100.0 % | 81.2 % | 66.4 % | 40.0 % | 0.59 s | 0.97 s | 0.61 s | x2 + 0.15 s (assumption, not measured) |
| SimpleJev Qwen3.6-35B-A3B | 100.0 % | 93.8 % | 93.2 % | 66.4 % | 0.85 s | 0.93 s | 0.88 s | x2 (assumption, not measured) |
| djev (thinking) | 95.8 % | 99.0 % | 80.1 % | 77.7 % | 0.43 s | 1.45 s | 1.06 s | x2 + 0.15 s (assumption, not measured) |
| jev-local (Qwen3.5-9B) | 100.0 % | 84.4 % | 89.0 % | 59.1 % | 1.05 s | 2.62 s | 1.38 s | x2 + 0.15 s (assumption, not measured) |
| decider-2b (Mapika) | 100.0 % | 85.4 % | 77.4 % | 47.3 % | 0.26 s | 0.28 s | 0.27 s | x2 + 0.15 s (assumption, not measured) |
| Bespoke Nimble 9B | 100.0 % | 94.8 % | 89.0 % | 65.5 % | 0.39 s | 0.65 s | 0.44 s | x2 + 0.15 s (assumption, not measured) |
| Gemini 3.1 Flash-Lite | 100.0 % | 99.0 % | 93.2 % | 75.0 % | 0.76 s | 0.88 s | 0.79 s | none (production API) |
| OpenJev (thinking, BF16) | 100.0 % | 100.0 % | 94.5 % | 78.2 % | 0.46 s | 1.08 s | 0.88 s | x2 + 0.15 s (assumption, not measured) |
| kev 4B (research preview) | 100.0 % | 91.7 % | 85.6 % | 42.3 % | 0.55 s | 0.99 s | 0.72 s | x2 + 0.15 s (assumption, not measured) |
| Raw Qwen3 4B Instruct 2507 direct logits | 100.0 % | 86.5 % | 93.8 % | 51.8 % | 0.08 s | 0.20 s | 0.11 s | x2 + 0.15 s (assumption, not measured) |
| DeepSeek V4.1 Flash | 98.6 % | 99.0 % | 93.2 % | 95.0 % | 1.42 s | 4.89 s | 3.15 s | none (production API) |
| kev 8B (research preview) | 100.0 % | 92.7 % | 90.4 % | 47.3 % | 0.59 s | 1.15 s | 0.76 s | x2 + 0.15 s (assumption, not measured) |
| Open-Jev 9B (Zefan Cai) | 100.0 % | 90.6 % | 81.5 % | 60.9 % | 0.75 s | 1.81 s | 0.80 s | x2 + 0.15 s (assumption, not measured) |
| system-one (Qwen3-8B, Goedecke) | 100.0 % | 90.6 % | 91.8 % | 50.0 % | 0.17 s | 0.30 s | 0.21 s | x2 + 0.15 s (assumption, not measured) |
| jeff (GLiFormer 400M) | 100.0 % | 76.0 % | 61.6 % | 37.7 % | 0.94 s | 10.97 s | 2.24 s | x2 + 0.15 s (assumption, not measured) |
| Laya (421M) | 94.4 % | 72.9 % | 69.2 % | 34.1 % | 0.79 s | 2.20 s | 1.93 s | x2 + 0.15 s (assumption, not measured) |
| Open-Jev 2B (Zefan Cai) | 100.0 % | 79.2 % | 88.4 % | 42.7 % | 0.66 s | 1.45 s | 0.70 s | x2 + 0.15 s (assumption, not measured) |
| Raw Qwen3 8B direct logits | 100.0 % | 86.5 % | 96.6 % | 46.4 % | 0.08 s | 0.29 s | 0.15 s | x2 + 0.15 s (assumption, not measured) |
| OpenDecision (ModernBERT-large zero-shot) | 87.5 % | 62.5 % | 71.2 % | 33.2 % | 0.34 s | 0.54 s | 0.36 s | x2 + 0.15 s (assumption, not measured) |
| openJev Verdict 1.4 | 86.1 % | 67.7 % | 56.2 % | 37.7 % | 0.31 s | 0.92 s | 0.63 s | x2 + 0.15 s (assumption, not measured) |
| openJev Verdict (151M) | 86.1 % | 65.6 % | 61.0 % | 38.2 % | 0.28 s | 1.45 s | 0.75 s | x2 + 0.15 s (assumption, not measured) |
| Raw Qwen3 1.7B direct logits | 81.9 % | 55.2 % | 75.3 % | 43.6 % | 0.07 s | 0.11 s | 0.07 s | x2 + 0.15 s (assumption, not measured) |
| kev 0.5B | 95.8 % | 52.1 % | 71.2 % | 30.9 % | 0.43 s | 0.92 s | 0.59 s | x2 + 0.15 s (assumption, not measured) |
| GLiNER2 large (Fastino) | 98.6 % | 62.5 % | 61.0 % | 36.4 % | 1.10 s | 14.49 s | 2.50 s | x2 + 0.15 s (assumption, not measured) |
| smalljev semantic-v9 | 97.2 % | 68.8 % | 40.4 % | 38.2 % | 0.41 s | 0.46 s | 0.42 s | x2 + 0.15 s (assumption, not measured) |
| GLiNER2 (gliner2.5-base) | 97.2 % | 66.7 % | 45.9 % | 36.4 % | 0.31 s | 4.15 s | 0.95 s | x2 + 0.15 s (assumption, not measured) |
| Open Jev JSON Canvas (JoshuaSP) | 100.0 % | 99.0 % | 92.5 % | 70.5 % | 0.22 s | 0.25 s | 0.24 s | x2 + 0.15 s (assumption, not measured) |
| open-jev-deberta-v3-large (local CPU) | 100.0 % | 49.0 % | 53.4 % | 36.4 % | 1.77 s | 3.35 s | 2.64 s | x2 + 0.15 s (assumption, not measured) |
| GLiNER2.5 multi (Fastino, 287M) | 90.3 % | 51.0 % | 43.8 % | 37.7 % | 0.43 s | 8.18 s | 1.23 s | x2 + 0.15 s (assumption, not measured) |
| Raw Qwen3 0.6B direct logits | 88.9 % | 54.2 % | 46.6 % | 35.0 % | 0.07 s | 0.10 s | 0.07 s | x2 + 0.15 s (assumption, not measured) |
| GLiNER2.5 small (Fastino, 74M) | 83.3 % | 47.9 % | 50.0 % | 33.2 % | 0.11 s | 2.10 s | 0.30 s | x2 + 0.15 s (assumption, not measured) |
| SimpleJev (Qwen3.5-0.8B, CPU) | 87.5 % | 57.3 % | 19.2 % | 40.0 % | 3.99 s | 10.97 s | 8.09 s | x2 + 0.15 s (assumption, not measured) |
| Mirror | 87.5 % | 45.8 % | 31.5 % | 17.3 % | 0.90 s | 2.33 s | 1.69 s | x2 (assumption, not measured) |
| Mixedbread mxbai-rerank-base-v2 | 44.4 % | 33.3 % | 26.7 % | 40.0 % | 0.07 s | 0.23 s | 0.07 s | x2 + 0.15 s (assumption, not measured) |
| BAAI bge-reranker-v2-m3 | 43.1 % | 36.5 % | 8.9 % | 36.8 % | 0.03 s | 0.18 s | 0.04 s | x2 + 0.15 s (assumption, not measured) |
| Alibaba GTE Reranker ModernBERT-base | 33.3 % | 39.6 % | 30.1 % | 33.6 % | 0.05 s | 0.10 s | 0.05 s | x2 + 0.15 s (assumption, not measured) |
| Certo v1 (AltSlate Labs) | 27.8 % | 30.2 % | 21.9 % | 31.8 % | 0.02 s | 0.03 s | 0.02 s | x2 + 0.15 s (assumption, not measured) |
| classifier.dev (fast tier) | 100.0 % | 99.0 % | 97.3 % | 70.5 % | 0.39 s | 0.45 s | 0.38 s | none (production API) |
| Qwen3.8 27B | 98.6 % | 99.0 % | 95.3 % | 21.4 % | 5.75 s | 12.97 s | 20.47 s | none (production API) |
| Needle 3, options as tools | 66.7 % | 31.2 % | 34.2 % | — | 3.78 s | 33.64 s | — | x2 + 0.15 s (assumption, not measured) |
| Needle 3 | 47.2 % | 16.7 % | 31.5 % | 7.7 % | 1.69 s | 14.36 s | 19.28 s | x2 + 0.15 s (assumption, not measured) |

## Cost basis

**The Cost column is US dollars per 1,000 DECISIONS, not per 1,000 tokens.** One decision is a whole question: its state,
its rubric and its options — hundreds to thousands of input tokens. One decision is a whole question, not a token. Jev 1.13.0 reads 950 input tokens per decision on average over the 534 v1.2 decisions. At its public tariff of $0.042 per MILLION input tokens (output tokens are free, https://docs.typesafe.ai/models), 1,000 decisions therefore cost 950 x 1,000 x $0.042 / 1,000,000 = $0.0399. That is what the Cost column shows: $0.0399 per 1,000 decisions, not per 1,000 tokens.

- **Hopper** — $0.0238 est.: Nonzero hosted-comparable estimate; see RESULT.md
- **Jev 1.13.0** — $0.0399: public tariff x measured tokens (https://docs.typesafe.ai/models (output tokens not billed)) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | public tariff x measured tokens (hard-tier run)
- **Jobe Qwen3.5-4B (frozen)** — $0.0224 est.: ESTIMATE: hosted-provider price, DeepInfra Qwen3.5-4B hosted reference list price $0.03/M in, $0.0/M out (same underlying weights; one forward pass, no generated tokens) x 396 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **SemIf (Qwen3.5-4B)** — $0.0224 est.: ESTIMATE: hosted-provider price, deepinfra Qwen/Qwen3.5-4B list price $0.03/M in, $0.15/M out (same weights (not on OpenRouter), as open-alternative-jev in v1.1.2) x 396 input and 1 output tokens per decision (input tokens measured) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | ESTIMATE: deepinfra Qwen/Qwen3.5-4B $0.03/M in, $0.15/M out x 1244 in / 0 out tokens per hard decision
- **djev (Maisa, diffusion-gemma)** — $0.0260 (announced price, free preview): ANNOUNCED PRICE (free preview): djev's docs state $0.035 per million input tokens, output tokens free (https://api.djev.dev/docs, 'Usage & credits'; prepaid billing not yet switched on, 19 Sep 2026, so nothing was charged) x measured input tokens (741 per decision on average over all 534 decisions)
- **metask-jev-4b** — $0.0328 est.: ESTIMATE: hosted 4B reference rate USD 0.04/M input, USD 0/M output over the exact measured prompt-token counts of all 534 attempts; no generated answer tokens
- **Winnow-12B Q8** — $0.0371 est.: ESTIMATE: hosted-provider price, OpenRouter google/gemma-3-12b-it hosted reference list price $0.05/M in, $0.0/M out (the nearest publicly hosted 12B Gemma sibling; Winnow reads answer logits in one forward pass and generates no answer tokens) x 393 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **NInfer Qwen3.8-Flash-Next mixed** — $0.1087 est.: ESTIMATE: hosted-provider price, OpenRouter qwen/qwen3.8-flash hosted list reference list price $0.15/M in, $0.0/M out (same underlying Flash-Next weights; native one-pass option-logit readout) x 366 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **local-jev Qwen3.5-4B** — $0.0297 est.: ESTIMATE: hosted-provider price, hosted 4B reference rate list price $0.04/M in, $0.0/M out (one forward pass over measured input tokens and no generated answer tokens) x 397 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **reflex 4B (kshetrajna12)** — $0.0221 est.: ESTIMATE: hosted-provider price, DeepInfra Qwen/Qwen3.5-4B list price $0.03/M in, $0.0/M out (the exact base weights; one pass, no generated output) x 377 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **JevOne** — $0.1373 est.: Nonzero hosted-comparable estimate; see RESULT.md
- **JEV Qwen3.5-9B Base NVFP4** — $0.0775 est.: Nonzero hosted-comparable estimate; see RESULT.md
- **jqv (Qwen3-32B zero-shot)** — $0.0564 est.: ESTIMATE: hosted-provider price, OpenRouter qwen/qwen3-32b list price $0.08/M in, $0.0/M out (the exact base model this system reads logits from; nothing is generated) x 359 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **decision-machine-1 (milliseconds.ai)** — $0.0350: public tariff x measured tokens: $0.04 per million input tokens, output free (https://docs.milliseconds.ai/reference/pricing, read 2026-09-21) x 496 input tokens per easy/standard/judge decision as reported by the API; the run used the free test key, the price is the paid one
- **swanOne** — $0.1115 est.: Nonzero hosted-comparable estimate; see RESULT.md
- **decider-35b-a3b (Mapika)** — $0.0666 est.: ESTIMATE: hosted-provider price, OpenRouter Qwen3.6-35B-A3B list price list price $0.1/M in, $0.0/M out (the closest public hosted 35B-A3B direct-logit model; no output is generated) x 312 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **open-alternative-jev (Qwen3.5-4B, IkerMoel)** — $0.0222 est.: ESTIMATE: hosted-provider price, deepinfra Qwen/Qwen3.5-4B list price $0.03/M in, $0.15/M out (as open-alternative-jev) x 383 input and 1 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) | ESTIMATE: deepinfra Qwen/Qwen3.5-4B $0.03/M in, $0.15/M out x 1235 in / 1 out tokens per hard decision
- **system-one-open (Gemma 4 E2B LoRA on an L4)** — $0.0149 est.: ESTIMATE: hosted-provider price, deepinfra google/gemma-4-E4B-it list price $0.02/M in, $0.1/M out (Gemma 4 E2B is not listed; the nearest larger sibling, Gemma 4 E4B, is listed only on DeepInfra) x 383 input and 2 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | ESTIMATE: deepinfra google/gemma-4-E4B-it $0.02/M in, $0.1/M out x 1235 in / 2 out tokens per hard decision
- **OpenJev razorback16 (DiffusionGemma 26B)** — $0.0656 est.: ESTIMATE: hosted-provider price, openrouter google/gemma-4-26b-a4b-it list price $0.09/M in, $0.3/M out (DiffusionGemma 26B-A4B is not listed; the same-size Gemma 4 26B-A4B MoE sibling is (size class moe_26B-A4B)) x 380 input and 1 output tokens per decision (input tokens measured) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | ESTIMATE: openrouter google/gemma-4-26b-a4b-it $0.09/M in, $0.3/M out x 1222 in / 0 out tokens per hard decision
- **SimpleJev Qwen3.8-27B** — $0.1040 est.: ESTIMATE: hosted-provider price, OpenRouter Gemma 4 26B-A4B size-class reference list price $0.09/M in, $0.0/M out (a public 27B dense model served as a direct-logit classifier; no output is generated) x 809 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **NInfer Qwen3.8-27B NVFP4 (T=1.5)** — $0.1449 est.: ESTIMATE: hosted-provider price, OpenRouter Qwen3.8-27B hosted list reference list price $0.2/M in, $0.0/M out (same underlying weights; native one-pass option-logit readout) x 366 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **ZeroEntropy zerank-2** — $0.0473: MEASURED model inference time x lium.io A6000 tariff USD 0.42/hour
- **GPT-5.6 Luna (low)** — $0.2419: public tariff x measured tokens (https://platform.openai.com/docs/pricing (standard tier, read 2026-09-19)) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | public tariff x measured tokens (hard-tier run)
- **openjev-sglang (Qwen3.6-35B-A3B on SGLang)** — $0.1313 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3.6-35b-a3b list price $0.1/M in, $0.9/M out (same base weights) x 610 input and 2 output tokens per decision [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | ESTIMATE: openrouter qwen/qwen3.6-35b-a3b $0.1/M in, $0.9/M out x 2272 in / 2 out tokens per hard decision
- **NInfer Qwen3.8-27B NVFP4** — $0.1449 est.: ESTIMATE: hosted-provider price, OpenRouter Qwen3.8-27B hosted list reference list price $0.2/M in, $0.0/M out (same underlying weights; native one-pass option-logit readout) x 366 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **Qwen3-Reranker-4B** — $0.0495: MEASURED model inference time x lium.io A6000 tariff USD 0.42/hour
- **Raw Phi-4 mini direct logits** — $0.0480 est.: Nonzero hosted-comparable estimate; see RESULT.md
- **reflex-27b (Qwen3.8-27B)** — $0.1811 est.: ESTIMATE: hosted-provider price, OpenRouter Qwen3.8-27B list price list price $0.214/M in, $0.0/M out (the exact public base weights used as a direct-logit classifier; no output is generated) x 481 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **LitJev (Qwen3.8-27B)** — $0.1630 est.: ESTIMATE: hosted-provider price, OpenRouter Qwen3.8-27B (as the reflex-27b row) list price $0.214/M in, $0.0/M out (the exact base weights; nothing is generated) x 418 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **kev 0.6B (research preview)** — $0.0063 est.: ESTIMATE: hosted-provider price, DeepInfra Qwen3-Embedding-0.6B size-class reference list price $0.01/M in, $0.0/M out (a <=0.6B one-pass model with no generated output) x 279 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **SimpleJev Qwen3.6-35B-A3B** — $0.1156 est.: ESTIMATE: hosted-provider price, OpenRouter Qwen3.6-35B-A3B list price list price $0.1/M in, $0.0/M out (the same base weights served as a direct-logit classifier; no output is generated) x 809 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **djev (thinking)** — $0.2743 est.: ESTIMATE: same-size hosted reference x 749 measured input and 690 measured output tokens per attempted decision across all 534, failures included
- **jev-local (Qwen3.5-9B)** — $0.0775 est.: ESTIMATE: hosted-provider price, OpenRouter qwen/qwen3.5-9b list price $0.1/M in, $0.0/M out (the exact base weights; scored by log-probabilities, nothing is generated) x 452 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts)
- **decider-2b (Mapika)** — $0.0200 est.: ESTIMATE: hosted-provider price, DeepInfra Qwen/Qwen3.5-4B list price $0.03/M in, $0.0/M out (no hosted ~2B Qwen3.5 is listed, so the 4B price is used and errs high; one pass, no output) x 312 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **Bespoke Nimble 9B** — $0.1658 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3.5-9b list price $0.1/M in, $0.15/M out (a LoRA merge of Qwen3.5-9B; the base weights are listed on OpenRouter (size class dense_9B), as in the v1.1.3 row) x 970 input and 1 output tokens per decision (input tokens measured (the system's own count))
- **Gemini 3.1 Flash-Lite** — $0.2638: public tariff x measured tokens (https://ai.google.dev/gemini-api/docs/pricing (paid tier, read 2026-09-19)) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | public tariff x measured tokens (hard-tier run)
- **OpenJev (thinking, BF16)** — $0.2546 est.: ESTIMATE: same hosted reference x 1778 billed input and 315 thought output tokens per decision
- **kev 4B (research preview)** — $0.0188 est.: ESTIMATE: hosted-provider price, DeepInfra Qwen3.5-4B size-class reference list price $0.03/M in, $0.0/M out (a 4B one-pass model with no generated output) x 279 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **Raw Qwen3 4B Instruct 2507 direct logits** — $0.0221 est.: Nonzero hosted-comparable estimate; see RESULT.md
- **DeepSeek V4.1 Flash** — $0.5937: public tariff x measured tokens (https://api-docs.deepseek.com/quick_start/pricing (cache-miss off-peak; the run is on a Saturday, off-peak all day)) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | public tariff x measured tokens (hard-tier run)
- **kev 8B (research preview)** — $0.0733 est.: ESTIMATE: hosted-provider price, OpenRouter qwen/qwen3-8b list price list price $0.117/M in, $0.0/M out (the same-size Qwen3-8B weights; kev generates no output tokens) x 279 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **Open-Jev 9B (Zefan Cai)** — $0.2488 est.: ESTIMATE: hosted-provider price, OpenRouter Qwen3.5-9B list price read 2026-09-21 list price $0.1/M in, $0.0/M out (the exact 9B base and a conservative same-family proxy for the unlisted 2B; the decision head generates no output tokens) x 1439 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **system-one (Qwen3-8B, Goedecke)** — $0.0894 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3-8b list price $0.117/M in, $0.455/M out (same weights, listed on OpenRouter) x 412 input and 1 output tokens per decision (input tokens measured) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | ESTIMATE: openrouter qwen/qwen3-8b $0.117/M in, $0.455/M out x 1258 in / 1 out tokens per hard decision
- **jeff (GLiFormer 400M)** — $0.0060 est.: ESTIMATE: hosted-provider price, deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) list price $0.01/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 272 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **Laya (421M)** — $0.0029 est.: ESTIMATE: hosted-provider price, deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) list price $0.01/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 205 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **Open-Jev 2B (Zefan Cai)** — $0.2488 est.: ESTIMATE: hosted-provider price, OpenRouter Qwen3.5-9B list price read 2026-09-21 list price $0.1/M in, $0.0/M out (the exact 9B base and a conservative same-family proxy for the unlisted 2B; the decision head generates no output tokens) x 1439 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **Raw Qwen3 8B direct logits** — $0.0866 est.: Nonzero hosted-comparable estimate; see RESULT.md
- **OpenDecision (ModernBERT-large zero-shot)** — $0.0066 est.: ESTIMATE: hosted-provider price, deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) list price $0.01/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 329 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **openJev Verdict 1.4** — $0.0039 est.: ESTIMATE: hosted-provider price, deepinfra base-size encoders (bge-base, e5-base, gte-base, all-mpnet-base) list price $0.005/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 452 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts)
- **openJev Verdict (151M)** — $0.0037 est.: ESTIMATE: hosted-provider price, deepinfra base-size encoders (bge-base, e5-base, gte-base, all-mpnet-base) list price $0.005/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 383 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json]
- **Raw Qwen3 1.7B direct logits** — $0.0148 est.: Nonzero hosted-comparable estimate; see RESULT.md
- **kev 0.5B** — $0.0063 est.: ESTIMATE: hosted-provider price, DeepInfra Qwen3-Embedding-0.6B size-class reference list price $0.01/M in, $0.0/M out (a <=0.6B one-pass model with no generated output) x 279 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **GLiNER2 large (Fastino)** — $0.0077 est.: ESTIMATE: hosted-provider price, deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) list price $0.01/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 452 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts)
- **smalljev semantic-v9** — $0.0254 est.: ESTIMATE: hosted-provider price, submitted Qwen/Qwen2.5-3B-Instruct hosted reference list price $0.04/M in, $0.0/M out (the author's documented reference for the same approximate size class; one forward pass, nothing generated) x 329 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **GLiNER2 (gliner2.5-base)** — $0.0037 est.: ESTIMATE: hosted-provider price, deepinfra base-size encoders (bge-base, e5-base, gte-base, all-mpnet-base) list price $0.005/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 383 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json]
- **Open Jev JSON Canvas (JoshuaSP)** — $0.0650 est.: Nonzero hosted-comparable estimate; see RESULT.md
- **open-jev-deberta-v3-large (local CPU)** — $0.0073 est.: ESTIMATE: hosted-provider price, deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) list price $0.01/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 383 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | ESTIMATE: deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) $0.01/M in, $0.0/M out x 1235 in / 0 out tokens per hard decision
- **GLiNER2.5 multi (Fastino, 287M)** — $0.0039 est.: ESTIMATE: hosted-provider price, deepinfra base-size encoders (bge-base, e5-base, gte-base, all-mpnet-base) list price $0.005/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 452 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts)
- **Raw Qwen3 0.6B direct logits** — $0.0074 est.: Nonzero hosted-comparable estimate; see RESULT.md
- **GLiNER2.5 small (Fastino, 74M)** — $0.0039 est.: ESTIMATE: hosted-provider price, deepinfra base-size encoders (bge-base, e5-base, gte-base, all-mpnet-base) list price $0.005/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 452 input and 0 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts)
- **SimpleJev (Qwen3.5-0.8B, CPU)** — $0.0114 est.: Same nonzero hosted size-class reference and exact prompt-token accounting; see RESULT.md
- **Mirror** — $0.0077 est.: Nonzero hosted-comparable estimate; see RESULT.md
- **Mixedbread mxbai-rerank-base-v2** — $0.0117: MEASURED model inference time x lium.io A6000 tariff USD 0.42/hour
- **BAAI bge-reranker-v2-m3** — $0.0077: MEASURED model inference time x lium.io A6000 tariff USD 0.42/hour
- **Alibaba GTE Reranker ModernBERT-base** — $0.0103: MEASURED model inference time x lium.io A6000 tariff USD 0.42/hour
- **Certo v1 (AltSlate Labs)** — $0.0010 est.: ESTIMATE: hosted-provider price, deepinfra encoders of the same size (bge-large, e5-large, Qwen3-Embedding-0.6B) list price $0.01/M in, $0.0/M out (an encoder of the same size class; one forward pass, nothing generated) x 86 input and 0 output tokens per decision (input tokens measured (the system's own count))
- **classifier.dev (fast tier)** — $0.0033 est.: ESTIMATE from the published paid plan (the free tier was used): classifier.dev Pro $20/month for 200,000 fast classifications a day (https://classifier.dev/pricing, read 2026-09-19) = $0.0033 per 1,000 decisions at full use; one decision = one classification. Lower use costs more per decision: at a tenth of that allowance it is $0.033 per 1,000, and the free tier (20,000 fast classifications a day, which is what this run used) costs nothing.
- **Qwen3.8 27B** — $2.6691 est.: ESTIMATE: hosted-provider price, openrouter qwen/qwen3.8-27b list price $0.214/M in, $2.55/M out (same weights; our run used a flat-rate Chutes subscription) x 416 input and 393 output tokens per decision [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | ESTIMATE: openrouter qwen/qwen3.8-27b $0.214/M in, $2.55/M out x 1592 in / 1833 out tokens per hard decision
- **Needle 3, options as tools** — $0.0144 est.: ESTIMATE: same per-token price as Needle 3 (openrouter meta-llama/llama-3.2-1b-instruct $0.027/M in, $0.201/M out) x 383 input and 20 output tokens per decision, over the 314 easy/standard/judge decisions it ran (no hard-tier run). The v1.2 score lab had no price for this row and scored it 100; fixed. [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json]
- **Needle 3** — $0.0238 est.: ESTIMATE: hosted-provider price, openrouter meta-llama/llama-3.2-1b-instruct list price $0.027/M in, $0.201/M out (no generative model under 1B is listed; the smallest listed one (1B) errs high; about 20 generated tokens for one tool call) x 383 input and 20 output tokens per decision (input tokens counted from the gemini-3.1-flash-lite run, same prompts) [corrected in v1.2.3: the price now averages each of the 314 v1.1 decisions once; see results/v1.2/cost-correction-v1.2.3.json] | ESTIMATE: openrouter meta-llama/llama-3.2-1b-instruct $0.027/M in, $0.201/M out x 1235 in / 20 out tokens per hard decision

## Accuracy by subject topic

Accuracy per subject topic over all four tiers (easy, standard, judge, hard): correct / attempted; failures count as wrong; items a partial run never attempted are left out. Aggregates only; not part of the JevBench Score. Topics differ in their tier mix (n_items_by_tier), so compare systems within a topic, not topics with each other. A topic with fewer than 15 attempted items for a system is too thin to read (partial runs). How the topics were assigned: [`datasets/TOPICS.md`](datasets/TOPICS.md).

| System | Math & numbers (129) | Coding & software (56) | Rules, policy & law (67) | Finance & commerce (64) | Support & operations (119) | Everyday language (79) | Safety & security (20) |
|---|---|---|---|---|---|---|---|
| Jev 1.13.0 | 87.6 % | 83.9 % | 83.6 % | 73.4 % | 89.1 % | 100.0 % | 100.0 % |
| SemIf (Qwen3.5-4B) | 79.1 % | 96.4 % | 64.2 % | 60.9 % | 87.4 % | 100.0 % | 75.0 % |
| djev (Maisa, diffusion-gemma) | 86.1 % | 94.6 % | 76.1 % | 64.1 % | 85.7 % | 98.7 % | 95.0 % |
| Winnow-12B Q8 | 82.2 % | 98.2 % | 82.1 % | 71.9 % | 79.8 % | 100.0 % | 90.0 % |
| reflex 4B (kshetrajna12) | 86.1 % | 87.5 % | 68.7 % | 70.3 % | 84.0 % | 97.5 % | 80.0 % |
| jqv (Qwen3-32B zero-shot) | 85.3 % | 89.3 % | 70.2 % | 67.2 % | 80.7 % | 97.5 % | 90.0 % |
| decision-machine-1 (milliseconds.ai) | 79.1 % | 82.1 % | 40.3 % | 56.2 % | 74.0 % | 86.1 % | 60.0 % |
| decider-35b-a3b (Mapika) | 84.5 % | 76.8 % | 71.6 % | 70.3 % | 85.7 % | 97.5 % | 90.0 % |
| open-alternative-jev (Qwen3.5-4B, IkerMoel) | 71.3 % | 87.5 % | 59.7 % | 60.9 % | 68.9 % | 91.1 % | 65.0 % |
| system-one-open (Gemma 4 E2B LoRA on an L4) | 79.8 % | 80.4 % | 56.7 % | 46.9 % | 75.6 % | 98.7 % | 70.0 % |
| OpenJev razorback16 (DiffusionGemma 26B) | 84.5 % | 91.1 % | 65.7 % | 64.1 % | 84.0 % | 98.7 % | 90.0 % |
| SimpleJev Qwen3.8-27B | 80.6 % | 96.4 % | 85.1 % | 71.9 % | 90.8 % | 97.5 % | 100.0 % |
| GPT-5.6 Luna (low) | 93.0 % | 100.0 % | 94.0 % | 98.4 % | 96.6 % | 98.7 % | 100.0 % |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | 86.8 % | 89.3 % | 73.1 % | 76.6 % | 87.4 % | 98.7 % | 90.0 % |
| reflex-27b (Qwen3.8-27B) | 85.3 % | 92.9 % | 85.1 % | 75.0 % | 89.9 % | 98.7 % | 95.0 % |
| LitJev (Qwen3.8-27B) | 77.5 % | 82.1 % | 86.6 % | 75.0 % | 90.8 % | 98.7 % | 90.0 % |
| kev 0.6B (research preview) | 79.1 % | 50.0 % | 53.7 % | 48.4 % | 43.7 % | 89.9 % | 75.0 % |
| SimpleJev Qwen3.6-35B-A3B | 85.3 % | 87.5 % | 71.6 % | 68.8 % | 83.2 % | 96.2 % | 90.0 % |
| djev (thinking) | 85.3 % | 85.7 % | 74.6 % | 82.8 % | 81.5 % | 96.2 % | 90.0 % |
| jev-local (Qwen3.5-9B) | 79.1 % | 73.2 % | 58.2 % | 65.6 % | 82.3 % | 92.4 % | 90.0 % |
| decider-2b (Mapika) | 81.4 % | 67.9 % | 53.7 % | 53.1 % | 61.3 % | 91.1 % | 65.0 % |
| Bespoke Nimble 9B | 83.7 % | 85.7 % | 80.6 % | 68.8 % | 78.1 % | 94.9 % | 75.0 % |
| Gemini 3.1 Flash-Lite | 86.1 % | 92.9 % | 85.1 % | 71.9 % | 87.4 % | 100.0 % | 95.0 % |
| OpenJev (thinking, BF16) | 92.2 % | 98.2 % | 79.1 % | 71.9 % | 89.1 % | 100.0 % | 100.0 % |
| kev 4B (research preview) | 83.0 % | 62.5 % | 50.7 % | 42.2 % | 73.1 % | 93.7 % | 70.0 % |
| DeepSeek V4.1 Flash | 90.7 % | 98.2 % | 92.5 % | 96.9 % | 97.5 % | 100.0 % | 100.0 % |
| kev 8B (research preview) | 81.4 % | 78.6 % | 58.2 % | 51.6 % | 74.8 % | 93.7 % | 65.0 % |
| Open-Jev 9B (Zefan Cai) | 79.1 % | 87.5 % | 67.2 % | 62.5 % | 73.1 % | 92.4 % | 80.0 % |
| system-one (Qwen3-8B, Goedecke) | 82.2 % | 78.6 % | 52.2 % | 62.5 % | 74.0 % | 96.2 % | 70.0 % |
| jeff (GLiFormer 400M) | 69.0 % | 67.9 % | 40.3 % | 46.9 % | 47.9 % | 84.8 % | 50.0 % |
| Laya (421M) | 51.9 % | 58.9 % | 40.3 % | 54.7 % | 61.3 % | 83.5 % | 65.0 % |
| Open-Jev 2B (Zefan Cai) | 76.7 % | 66.1 % | 46.3 % | 51.6 % | 75.6 % | 89.9 % | 50.0 % |
| OpenDecision (ModernBERT-large zero-shot) | 71.3 % | 42.9 % | 37.3 % | 48.4 % | 44.5 % | 78.5 % | 65.0 % |
| openJev Verdict 1.4 | 64.3 % | 55.4 % | 38.8 % | 51.6 % | 37.8 % | 78.5 % | 60.0 % |
| openJev Verdict (151M) | 65.1 % | 51.8 % | 38.8 % | 51.6 % | 42.9 % | 79.8 % | 60.0 % |
| kev 0.5B | 72.1 % | 46.4 % | 37.3 % | 40.6 % | 43.7 % | 75.9 % | 45.0 % |
| GLiNER2 large (Fastino) | 69.0 % | 57.1 % | 44.8 % | 43.8 % | 37.8 % | 82.3 % | 55.0 % |
| smalljev semantic-v9 | 40.3 % | 60.7 % | 43.3 % | 48.4 % | 46.2 % | 84.8 % | 55.0 % |
| GLiNER2 (gliner2.5-base) | 58.1 % | 42.9 % | 41.8 % | 37.5 % | 43.7 % | 83.5 % | 60.0 % |
| open-jev-deberta-v3-large (local CPU) | 62.0 % | 46.4 % | 37.3 % | 42.2 % | 35.3 % | 81.0 % | 65.0 % |
| GLiNER2.5 multi (Fastino, 287M) | 58.9 % | 33.9 % | 40.3 % | 43.8 % | 34.4 % | 79.8 % | 35.0 % |
| GLiNER2.5 small (Fastino, 74M) | 62.0 % | 35.7 % | 38.8 % | 39.1 % | 34.4 % | 62.0 % | 55.0 % |
| Certo v1 (AltSlate Labs) | 39.5 % | 12.5 % | 26.9 % | 26.6 % | 24.4 % | 30.4 % | 25.0 % |
| classifier.dev (fast tier) (honorable mention) | 86.1 % | 92.9 % | 79.1 % | 70.3 % | 88.2 % | 100.0 % | 95.0 % |
| Qwen3.8 27B (partial) | 92.4 % | 97.4 % | 96.3 % | 95.0 % | 100.0 % | 97.3 % | 100.0 % (n=4, too few) |
| Needle 3, options as tools (partial) | 58.7 % | 0.0 % | 16.7 % | 66.7 % | 15.7 % | 60.8 % | 50.0 % (n=2, too few) |
| Needle 3 (partial) | 51.5 % | 2.6 % | 23.1 % | 54.0 % | 17.3 % | 26.7 % | 50.0 % (n=4, too few) |

## Limitations

- **The latency adjustment (×2, +0.15 s) is an assumption, not a measurement.** We ran self-hosted and demo endpoints one request at a time (parallelism 1, no other load), so their latency is likely better than the same model on a busy production server; the official Jev API presumably runs under high load, given the public interest. Serving under load trades per-user speed for throughput: in the NVIDIA chart shown by [SemiAnalysis](https://newsletter.semianalysis.com/p/nvidia-blackwell-perf-tco-analysis), moving to the throughput-maximising setting cuts per-user tokens/s by far more than 2×. That chart is a 1.8T MoE on GPU clusters, not a 4B model on one GPU, so it supports the direction and size of the effect, not our exact factor. The +0.15 s stands for infrastructure our self-hosted tests lacked: authentication, load balancing, logging, billing, API gateway. Raw p50/p95 are in the tier table above and in the artifact; a measurement under load is planned.
- 534 decisions is a pilot, not a census, and it is English-only. Held-out decisions are sent to the evaluated services to get predictions: not public is not the same as not seen.
- Latency is one origin (a server in Germany) at one time of day; production APIs, public demos, our GPU and a local CPU are different kinds of latency.
- Estimated costs describe what a large inference provider would charge for a model of that size, not what the author pays.

## Revision log

- **v1.3.1** (2026-09-22): Added 18 independently reviewed rows on the unchanged frozen 534-decision v1.2 task set, using the v1.3.0 scorer. Each addition includes standard aggregate and per-task evidence. No earlier measurement or task changed. Reflex 0.8B and typed-engine remain withheld pending review.
- **v1.3.0** (2026-09-22): Scoring-only release; the task set and measurements are unchanged. Intelligence is now accuracy above each item's uniform-guessing baseline, aggregated with the existing tier weights. If chance-corrected Intelligence is below 50, the composite receives a growing (Intelligence / 50)^2 penalty. Calibration, Speed, Cost and ranking eligibility are unchanged.
- **v1.2.16** (2026-09-21): Added the reranker class and five Apache-2.0 open rerankers. A neutral adapter, identical task instructions, public-only temperature/yes-no calibration grids, and a no-instruction public baseline were preregistered before the held-out run. Every row covers all 534 frozen decisions; no earlier row or task changed.
- **v1.2.15** (2026-09-21): Added Open-Jev 2B and Open-Jev 9B by Zefan Cai. Both public checkpoints ran all 534 frozen decisions through the author's pinned LoRA-plus-decision-head server, serially on our RunPod H100 with prefix caching off. An exact normalized-text audit found no JevBench public state or instruction in the 79,116-row public training projection. No earlier measurement or task changed.
- **v1.2.14** (2026-09-21): Added Winnow-12B Q8 after its author requested evaluation. The pinned Q8_0 GGUF ran all 534 unchanged decisions through the author's pinned TypeSafe-compatible server, serially on our lium.io RTX 4090. The row records the applicable Apache-2.0 Gemma 4 terms, non-zero hosted-reference cost and the independently unverifiable private-training overlap claim. No earlier measurement or task changed.
- **v1.2.13** (2026-09-21): Added OpenJev (thinking, BF16) using OpenJev's native typed-API think=512 switch over DiffusionGemma. It ran all 534 unchanged decisions serially on the same H200. No earlier measurement or task changed.
- **v1.2.12** (2026-09-21): Added djev (thinking), an experimental full-generation run over the same open DiffusionGemma checkpoint used by djev-dev. Thinking was enabled with a frozen 8,192-token output cap on all 534 unchanged decisions. Current djev-dev itself hard-codes thinking off, one denoising step and read-only inference, so this row is not presented as a switch in its published typed API. No earlier measurement or task changed.
- **v1.2.10** (2026-09-21): Added smalljev semantic-v9 after its author requested evaluation. The public Apache-2.0 MiniCPM5-2B-Base LoRA and native decision heads ran all 534 frozen decisions serially on our lium.io A6000. Its mapping, endpoint condition, non-zero hosted-reference cost basis and public-benchmark-directed training disclosure were committed before the run (docs/v1.2-additions-smalljev.md). No earlier measurement or task changed.
- **v1.2.9** (2026-09-21): Added Certo v1 (AltSlate Labs) after its author requested evaluation. The public MIT ModernBERT-large checkpoint ran all 534 frozen decisions through the author's DecisionModel, serially on our RunPod RTX 3090. Its mapping, published 64-token state and 48-token option limits, endpoint condition and hosted-price cost basis were pushed before the run (docs/v1.2-additions-certo.md). No earlier measurement or task changed.
- **v1.2.8** (2026-09-21): Added requested systems on the unchanged frozen 534-decision set, each through its author's own server and the existing TypeSafe adapter, one request at a time: decider-35b-a3b and reflex-27b (issues #4, #5), decider-2b (#2), reflex 4B (#3), OpenDecision, jev-local and LitJev on our RunPod GPUs; GLiNER2 large on our CPU; and decision-machine-1 (#8), a closed decision model behind milliseconds.ai's production API, shown in its own class. jqv (#6, #9) was re-run in full on our own GPU from its now-public serving code; that complete run replaces the v1.2.7 partial row. Bespoke Nimble 9B was re-run at Bespoke Labs' request after they raised its serving prompt limit from 2,048 to 8,192 tokens; the complete re-run replaces the v1.1.3 row (its old score is kept under superseded_rows). Mappings, endpoint conditions and cost bases were pushed before the runs (docs/v1.2-additions-run4.md, docs/v1.2-additions-run4b.md). No earlier measurement changed.
- **v1.2.7** (2026-09-20): Added three systems: jqv (a stock Qwen3-32B read as a decision model, submitted with a public endpoint) and the GLiNER2.5 small and multi checkpoints. The GLiNER2.5 rows ran the full frozen 534-decision set on our CPU with the same mapping as the GLiNER2 row. jqv is a partial row: its endpoint is the submitter's own machine, and this revision stopped sending held-out items to an endpoint a submitter operates. The easy and standard/judge tiers had already been sent in full when that was decided; the 109 held-out hard items never were, so the row covers 425 of 534 decisions and carries no rank. Mappings, endpoint conditions and cost bases were committed before any row was aggregated and before the published GLiNER2.5 runs started (docs/v1.2-additions-run3.md); jqv's run had begun about ten minutes earlier, but it needs no mapping and is priced at its base model's public tariff. No earlier row changed.
- **v1.2.6** (2026-09-20): Added openJev Verdict 1.4 and the identified SimpleJev public-demo configurations on the unchanged frozen 534-decision set. No earlier row changed.
- **v1.2.5** (2026-09-20): Added kev 0.5B and the 0.6B, 4B and 8B research previews. Each ran the full frozen v1.2 set (534 decisions including held-out items) through kev's native TypeSafe-compatible endpoint on an RTX 3090. No other row changed.
- **v1.2.4** (2026-09-20): classifier.dev (fast tier) leaves the ranking and becomes an honorable mention. It is not its own model: its own pages say "The fast tier is Jev, TypeSafe's decision model" (https://classifier.dev/benchmark), so ranking it against Jev ranks Jev's model against Jev's model at a different price. General rule from this revision on: a service that runs another entrant's model is listed with all of its scores and axes, but is not ranked against the models. Its numbers, axes, cost basis, radars and per-task outcomes are unchanged; only its rank is gone. Every other row moves up one place; no score changed.
- **v1.2.3** (2026-09-20): Cost correction. Every row's $ per 1,000 decisions is recomputed with each of the 534 decisions counted exactly once and priced exactly once. Three arithmetic mistakes were fixed: the 242-decision standard+judge run was averaged twice in the v1.1-tier price (556 rows instead of 314); rows priced from the gemini-3.1-flash-lite token counts used that run's standard+judge-only average (452 input tokens per decision) for all 314 v1.1 decisions instead of its average over all 314 (383); and requests whose answer came back unparseable were left unpriced although they were billed (9 DeepSeek V4.1 Flash decisions). The first two made the affected rows look 1.5-11 % more expensive than they are; the third made DeepSeek look 2.6 % cheaper. No tariff, no measurement, no item and no answer changed, and no rank changed. Details: results/v1.2/cost-correction-v1.2.3.json.
- **v1.2.2** (2026-09-19): Added five systems requested by readers: Laya, jeff, GLiNER2, openJev Verdict and classifier.dev (fast tier). Full v1.2 set each (534 decisions incl. held-out), scored with the unchanged v1.2 rules. Local systems ran on our CPU (4 threads) with the usual self-hosted latency adjustment; classifier.dev is a production API. Mappings were fixed before the runs (docs/v1.2-additions.md). No other row changed.
- **v1.2.1** (2026-09-19): Added djev (Maisa, diffusion-gemma): full v1.2 set (534 decisions incl. held-out) through its production API, scored with the unchanged v1.2 rules. Cost at djev's announced price ($0.035/M input tokens, output free), which is not yet charged (free preview). No other row changed.
- **v1.2** (2026-09-19): Final JevBench Score: 4 axes, geometric mean.

## What changed in the score (v1.3.0)

A system that is cheap and fast but barely better than guessing could rank high; intelligence is now measured above
chance, and systems below half-way get a growing penalty.

- Intelligence is `(accuracy - chance) / (1 - chance)` within each tier, clipped at zero. Chance is computed for every
  frozen item as `1 / number of options` (`1 / levels` for score items), before the unchanged 14:28:28:30 tier weighting.
- If chance-corrected Intelligence is below 50, the composite is multiplied by `(Intelligence / 50)²`. At 50 or above,
  no penalty applies.
- Calibration, Speed, Cost, the task set, measurements and ranking eligibility are unchanged.

## What changed from v1.2-wip to v1.2

- Score: four axes (Intelligence, Calibration, Speed, Cost), 25 % each, geometric mean — replaces the Balanced 33:33:33 arithmetic Main Score.
- Intelligence weights hard 30 % (was 50 %); the rest 1 : 2 : 2 over easy : standard : judge.
- Speed scale 20 points per 10× (was 50); Cost scale 30 points per 10× from $0.001 (was 25). Latency of non-production endpoints adjusted (assumption, see the speed note).
- One open-alternative-jev row (author's option order), named plainly; the reversed-order run is a footnote.
- Needle 3 options-as-tools priced on Needle 3's per-token basis ($0.0162 est.; it had no price).
- Qwen3.8 27B on Chutes is treated as a production API (no latency adjustment).

## Cost correction in v1.2.3 (20 September 2026)

Every price on this page was recomputed so that each of the 534 decisions is counted exactly once, and priced exactly
once. No tariff, no measurement, no item, no answer and no rank changed. What was wrong:

1. The v1.1 and v1.1.3 aggregations built their cost average from a row list that contained the 242-decision standard+judge run twice (once as the standard tier, once as the judge tier) and the 72 easy decisions once: 556 rows instead of 314. The standard and judge tiers were therefore over-weighted in the price, which made the affected rows look 1.5-3.3 % more expensive than they are.
2. Rows without their own token counts were priced at the input tokens of the gemini-3.1-flash-lite run measured on the 242 standard+judge decisions only (452 per decision) and that figure was applied to all 314 v1.1 decisions, which excludes the shorter easy tier. Over all 314 decisions the same run averages 383.41 input tokens, which is the figure used from v1.2.3 on. This made the affected rows look 4-11 % more expensive.
3. A metered row's price left out the requests whose answer came back unparseable. Those requests returned HTTP 200 with generated tokens and were billed, and JevBench already counts them as wrong answers, so from v1.2.3 they are priced too. Only DeepSeek V4.1 Flash had any (9 of its 314 v1.1 decisions); its price rises by 2.6 %.
4. No tariff was wrong. The hard-tier costs, and classifier.dev's flat plan price, were already correct.

Almost every affected row had been published as slightly **more** expensive than it is: those prices move down by 1.5 %
to 11 % and their JevBench Scores up by at most 0.2 points. DeepSeek V4.1 Flash moves the other way (+2.6 %, score
58.1 → 57.8) because its unparseable-but-billed requests are now priced. No rank changed. Row-by-row figures and
their derivation: [`results/v1.2/cost-correction-v1.2.3.json`](results/v1.2/cost-correction-v1.2.3.json).

| System | published before | corrected | change |
|---|---|---|---|
| Jev 1.13.0 | $0.0406 | $0.0399 | -1.72 % |
| SemIf (Qwen3.5-4B) | $0.0230 | $0.0224 | -2.31 % |
| system-one-open (Gemma 4 E2B LoRA on an L4) | $0.0157 | $0.0149 | -5.13 % |
| OpenJev razorback16 (DiffusionGemma 26B) | $0.0672 | $0.0656 | -2.36 % |
| GPT-5.6 Luna (low) | $0.2473 | $0.2419 | -2.17 % |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | $0.1346 | $0.1313 | -2.48 % |
| Bespoke Nimble 9B | $0.1085 | $0.1049 | -3.28 % |
| Gemini 3.1 Flash-Lite | $0.2682 | $0.2638 | -1.65 % |
| DeepSeek V4.1 Flash | $0.5788 | $0.5937 | +2.57 % |
| system-one (Qwen3-8B, Goedecke) | $0.0915 | $0.0894 | -2.29 % |
| openJev Verdict (151M) | $0.0039 | $0.0037 | -5.21 % |
| GLiNER2 (gliner2.5-base) | $0.0039 | $0.0037 | -5.21 % |
| open-jev-deberta-v3-large (local CPU) | $0.0077 | $0.0073 | -5.20 % |
| Qwen3.8 27B | $2.7110 | $2.6691 | -1.55 % |
| Needle 3, options as tools | $0.0162 | $0.0144 | -11.39 % |
| Needle 3 | $0.0249 | $0.0238 | -4.36 % |
