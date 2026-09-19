# Jev-class models

*Page copy for `/jev-models`. Tables are generated from `jevbench-v1-results.json`;
regenerate rather than edit a number by hand.*

---

## Lead

**Typed decisions, compared on five things at once.**

A Jev-class model does not write you an answer. You hand it some state and a bounded
rubric - pick one of these five options, is this allowed, rate this 0 to 3 - and it hands
back one typed answer and a probability. TypeSafe's Jev started this shape; a dozen open
rebuilds appeared within days. So which of them is actually good?

JevBench v1 is **our own benchmark**, built and run by Benchmark Heaven on
2026-09-19. 9 systems, 242 typed decisions each, every one of
them answered through the interface its author published. Five axes, five sortable
columns, and deliberately no combined score: **smart, cheap, fast, reliable, open** is a
trade-off, and a single number would delete exactly the thing you came here to see.

Harness and the published decisions are MIT: <https://github.com/fstandhartinger/jevbench>

## The table

| System | Author | Decisions answered | Accuracy | 95% CI | $/1k decisions | p50 | p95 | ECE | Brier | Valid answers | Exact-sum answers | Same answer on a rephrasing | Open |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GPT-5.6 Luna (low reasoning effort) | OpenAI | 242/242 | 97.1% | 94.7%-98.8% | $0.176 | 0.97 s | 1.82 s | 0.016 | 0.056 | 100.0% | 91.7% | 94.4% | closed |
| Jev 1.13.0 (TypeSafe AI) | TypeSafe AI | 242/242 | 96.3% | 93.7%-98.4% | $0.027 | 0.65 s | 0.72 s | 0.027 | 0.056 | 100.0% | 100.0% | 97.2% | closed |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | ekzhang | 242/242 | 95.5% | 92.8%-97.8% | no tariff | 0.68 s | 0.73 s | 0.042 | 0.085 | 100.0% | 100.0% | 88.9% | open |
| Gemini 3.1 Flash-Lite | Google | 242/242 | 95.5% | 92.6%-97.9% | $0.195 | 0.76 s | 0.88 s | 0.041 | 0.095 | 100.0% | 100.0% | 97.2% | closed |
| DeepSeek V4.1 Flash (thinking default) | DeepSeek | 242/242 | 95.5% | 92.5%-97.9% | $0.245 | 1.42 s | 4.89 s | 0.009 | 0.028 | 96.7% | 95.0% | 100.0% | open weights |
| system-one-open (Gemma 4 E2B LoRA on an L4) | mithalouni | 242/242 | 90.1% | 86.3%-93.7% | no tariff | 0.65 s | 0.77 s | 0.068 | 0.138 | 100.0% | 100.0% | 86.1% | open |
| open-jev-deberta-v3-large (local CPU) | Kotoba Labs | 242/242 | 51.7% | 45.0%-58.4% | no tariff | 1.77 s | 3.35 s | 0.147 | 0.651 | 100.0% | 100.0% | 83.3% | open |
| Qwen3.8 27B (Chutes TEE) | Qwen / Chutes | 223/242 (stopped early) | 96.9% | 94.4%-99.1% | no tariff | 5.75 s | 12.97 s | 0.014 | 0.019 | 97.8% | 97.3% | 100.0% | open weights |

"No tariff" is not zero. It means that route has no per-token bill to us - a public demo,
a flat-rate subscription, or open weights on our own CPU - and the compute is still real.

## What the run actually says

- **The top of the table is close.** GPT-5.6 Luna (low reasoning effort) leads at 97.1%, Jev 1.13.0 (TypeSafe AI) is at 96.3%, and their confidence intervals overlap. Treat the first few rows as a group, not a podium.
- **The best open rebuild is openjev-sglang (Qwen3.6-35B-A3B on SGLang)** at 95.5% (96.3% for Jev itself). The gap between a weekend rebuild and the commercial model is smaller than the gap between the rebuilds themselves.
- **An ordinary small instruction model is not out of its depth here.** GPT-5.6 Luna (low reasoning effort) reaches 97.1%. What the purpose-built models buy you shows up in the other four columns, not in accuracy.
- **open-jev-deberta-v3-large (local CPU) did not see the whole question 80 times out of 242.** Its encoder window is 256 tokens and several routing requests are longer than that. Its 51.7% is a context limit as much as a judgement one - worth knowing before anyone reads it as 'small encoders cannot do this'.
- **Cheapest metered route: Jev 1.13.0 (TypeSafe AI) at $0.027 per 1,000 decisions.** Fastest: Jev 1.13.0, openjev-sglang and system-one-open, indistinguishable at about 0.65 s median.
- **Only the models that *write* their probabilities ever fail the arithmetic.** A native distribution sums to 1 by construction. GPT-5.6 Luna (low reasoning effort) (20), DeepSeek V4.1 Flash (thinking default) (4), Qwen3.8 27B (Chutes TEE) (1) needed renormalizing, all of it three-decimal rounding inside the 2 % band. That is the practical difference between reading a distribution and asking for one in prose.
- **Best calibrated: DeepSeek V4.1 Flash (thinking default)** (ECE 0.009). A stated probability that tracks reality is the whole reason to use this shape of model instead of parsing text, and the spread across the table is wide.

## By cohort

The suite has three cohorts, and they are not equally hard. `original-public` is 72
decisions we wrote and published. `heldout-private` is 24 we wrote and did not publish,
so the suite cannot be trained on in full. `imported-public-source` is 146 decisions from
our own auto-router experiment - real routing requests and real answer-quality
judgements. The last row is the score for answering every question with the commonest
label, which is the floor each column has to beat.

| System | heldout-private (24) | imported-public-source (146) | original-public (72) |
|---|---|---|---|
| GPT-5.6 Luna (low reasoning effort) | 100.0% | 96.6% | 97.2% |
| Jev 1.13.0 (TypeSafe AI) | 100.0% | 94.5% | 98.6% |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | 100.0% | 95.2% | 94.4% |
| Gemini 3.1 Flash-Lite | 100.0% | 93.2% | 98.6% |
| DeepSeek V4.1 Flash (thinking default) | 100.0% | 93.2% | 98.6% |
| system-one-open (Gemma 4 E2B LoRA on an L4) | 95.8% | 87.7% | 93.1% |
| open-jev-deberta-v3-large (local CPU) | 66.7% | 53.4% | 43.1% |
| Qwen3.8 27B (Chutes TEE) | 100.0% | 95.3% | 98.6% |
| *always answer with the commonest label* | 16.7% | 41.8% | 16.7% |

## By family

| System | adequacy (84) | extraction (16) | intent (16) | ordinal (16) | policy (16) | routing (94) |
|---|---|---|---|---|---|---|
| GPT-5.6 Luna (low reasoning effort) | 92.9% | 100.0% | 100.0% | 100.0% | 93.8% | 100.0% |
| Jev 1.13.0 (TypeSafe AI) | 95.2% | 100.0% | 100.0% | 100.0% | 93.8% | 95.7% |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | 89.3% | 100.0% | 100.0% | 100.0% | 87.5% | 100.0% |
| Gemini 3.1 Flash-Lite | 89.3% | 100.0% | 100.0% | 100.0% | 100.0% | 97.9% |
| DeepSeek V4.1 Flash (thinking default) | 89.3% | 100.0% | 100.0% | 100.0% | 93.8% | 98.9% |
| system-one-open (Gemma 4 E2B LoRA on an L4) | 88.1% | 93.8% | 93.8% | 100.0% | 81.2% | 90.4% |
| open-jev-deberta-v3-large (local CPU) | 77.4% | 68.8% | 56.2% | 50.0% | 50.0% | 25.5% |
| Qwen3.8 27B (Chutes TEE) | 90.8% | 100.0% | 100.0% | 100.0% | 100.0% | 98.9% |
| *always answer with the commonest label* | 82.1% | 31.2% | 25.0% | 31.2% | 50.0% | 21.3% |

## How each system was reached

| System | Interface | Probabilities | Resolved identity | First request | Mean in/out tokens | Price basis |
|---|---|---|---|---|---|---|
| GPT-5.6 Luna (low reasoning effort) | `openai_compat` | verbalized | gpt-5.6-luna | 0.79 s | 496 / 64 | https://platform.openai.com/docs/pricing (standard tier, read 2026-09-19) |
| Jev 1.13.0 (TypeSafe AI) | `typesafe` | native | jev-1.13.0 | 0.64 s | 653 / 47 | https://docs.typesafe.ai/models (output tokens not billed) |
| openjev-sglang (Qwen3.6-35B-A3B on SGLang) | `typesafe` | native | jev-latest | 0.85 s | 741 / 2 | author's own public Modal deployment; we hold no billable account |
| Gemini 3.1 Flash-Lite | `openai_compat` | verbalized | gemini-3.1-flash-lite | 0.73 s | 452 / 55 | https://ai.google.dev/gemini-api/docs/pricing (paid tier, read 2026-09-19) |
| DeepSeek V4.1 Flash (thinking default) | `openai_compat` | verbalized | deepseek-flash | 1.09 s | 475 / 376 | https://api-docs.deepseek.com/quick_start/pricing (cache-miss off-peak; the run is on a Saturday, off-peak all day) |
| system-one-open (Gemma 4 E2B LoRA on an L4) | `systemone_list` | native | e2b-full | 29.40 s | - / - | author's own public Modal deployment; we hold no billable account |
| open-jev-deberta-v3-large (local CPU) | `local_openjev` | native | com-kotobalabs/open-jev-deberta-v3-large | 5.62 s | - / - | open weights run on our own CPU; no provider tariff |
| Qwen3.8 27B (Chutes TEE) | `openai_compat` | verbalized | Qwen/Qwen3.8-27B-TEE | 5.25 s | 485 / 426 | flat-rate Chutes subscription; no per-token tariff on this route |

## Method

Every system sees the same state, the same instructions, the same rubric and the same
exact label set. Only the transport differs.

The four native adapters read the model's **own** probability distribution - a single
forward pass, nothing generated. The `openai_compat` adapter asks an ordinary instruction
model to **write** a distribution under a JSON schema. Those are different objects. They
are labelled `native` and `verbalized` everywhere on this page and in the artifact, and
they are never pooled into one calibration claim. Token-level logprobs are not used for
anyone.

Requests go out one at a time from a Hetzner server in Germany, with no retries and no
concurrency, so the latency you see includes the network. The first request to each
system is reported separately, because a scale-to-zero endpoint bills its cold start to
whoever knocks first.

Accuracy is argmax over the exact label set. Confidence intervals resample whole
scenarios rather than individual decisions, because a paraphrase pair is one scenario
asked twice. Brier is the multi-class sum over the label set. ECE is top-label confidence
in ten equal-width bins, and empty bins are absent rather than zero.

Price is the provider's own published tariff, read on 2026-09-19, multiplied by the
token usage that provider reported. It is marked `derived_usage_times_tariff` in the
artifact, not presented as an invoice.

**How much of a gap is noise?** Jev answered the same 242 decisions twice this morning, about 16 minutes apart. 3 answers changed (1.2% of the suite), all of them in routing, and the run's accuracy moved from 96.7% to 96.3%. These endpoints are not deterministic, so read a gap of about a point between two rows as noise and use the confidence intervals.

**One protocol change, stated openly.** v1 froze a 0.001 tolerance on "do the
probabilities sum to 1" before the run. The run showed that this mostly measures rounding:
models that write probabilities to three decimals land on 0.999 for a nine-option
question. Rejecting those measures arithmetic, not judgement. So the headline
renormalizes any distribution that sums to within 2 % of 1, uniformly for every system,
and the page reports **both** columns - "valid answers" under the headline rule and
"exact-sum answers" under the original one. Distributions outside the 2 % band are still
invalid and still count as wrong.

## Who could not be measured, and why

- **open-alternative-jev (Qwen3.5-4B, HF Space)** (IkerMoel): we reached it and it answered, but the run stopped after 6 decisions - AppError: You have exceeded your ZeroGPU runs limit. Subscribe to Hugging Face PRO to get 40 min of ZeroGPU quota a day. A handful of answers is evidence that we tried, not a measurement, so it is not in the table.
- **open-alternative-jev** (IkerMoel): Reached, and it answers correctly - but its Hugging Face Space runs on ZeroGPU, whose free quota ran out after a handful of decisions, anonymously and again signed in with our own account. The Space's own message points at a paid Hugging Face PRO subscription; we do not buy one without Florian. Running the Qwen3.5-4B weights ourselves needs about 8 GB, over this job's 4 GB bound. Six answers are kept as evidence of the attempt and are deliberately not in the table.
- **Bespoke Nimble 9B** (Bespoke Labs): Needs an NVIDIA GPU (~18 GB for the 9B weights, per the README) and there is no public endpoint. Our RunPod API returns HTTP 403 with Cloudflare `error code: 1010`, a bot rejection; we do not change client identity to get past one, so no GPU could be rented.
- **SemIf / openjev** (Theodore Lee (TheoLeeCJ)): README: "Python 3.10+, CUDA, and a GPU that can hold a 4B BF16 model". The alternative is a browser-only WebGPU demo, which is not a programmable endpoint. No GPU available (see above).
- **open-jev** (Dasein Labs): MLX on Apple Silicon. The README itself says "there is no container path because Linux containers cannot reach the Apple GPU". We have no Apple hardware.
- **open-jev** (JoshuaSP): DiffusionGemma 26B-A4B measured on an H100 through the author's own Modal account. No public endpoint, no GPU on our side.
- **OpenJev** (razorback16 / Codiv): README: "at least 24 GB of memory for the NVFP4 checkpoint". The hosted route, codiv.ai, returns HTTP 403 to us and we hold no account there.
- **mini-jev** (Mikhail Rakutko (r-ms)): README: "~9 GB of disk for the weights … the 4B model needs about 8.5 GB of memory" plus Apple Silicon or CUDA. Over our 4 GB memory bound and our disk headroom.
- **system-one** (Sean Goedecke): Frozen Qwen3-8B scored locally; same memory and GPU wall, no public endpoint.
- **system-one-gemma** (Akash Kamat): The base model is gated: the README requires accepting Google's Gemma licence on Hugging Face first. We do not accept binding terms on Florian's behalf.
- **jevlike** (Vincent Wang-Maścianica): The released checkpoints are the Doom and chess vision scorers; there is no released general text-decision checkpoint to run against this suite.
- **AlexWortega/openjev** (Alex Wortega): A three-way NLI head (entailment / contradiction / neutral) plus task-specific heads. Turning that into a distribution over our arbitrary label sets needs an assumption we would then be measuring instead of the model.
- **Needle 3** (Cactus Compute): Its interface returns a chosen label plus one accept/refuse confidence, not a distribution over the exact label set, and we do not synthesize a distribution from a confidence scalar. Measured separately on the same 78 routing tasks in our earlier head-to-head (`~/jobs/needle3-vs-jev-20260918`): 0/78 category accuracy, ~4.2 s median on the same CPU.
- **GLiNER2** (Fastino): A multi-label classification head. Its per-label scores are not a categorical posterior over our label set without choosing a normalization, and that choice would drive the calibration number. Kept as a candidate for a later version with a documented mapping.
- **Succinct Router 14M** (Pedro Marques): A trained router over three fixed GPT settings, not a general typed-decision interface. In `MARKET.md`, not in the suite.
- **jev-model-router, Director, Loki** (various): Applications built on a decision model, not decision models. In `MARKET.md`.

Every exclusion is an availability fact about our hardware and access, never a quality
verdict. The full ledger with each project's own words is in the repository.

## Limits

- 242 decisions is a pilot, not a census, and it is English-only.
- The answer-adequacy cohort is 61 `yes` to 7 `no`, a majority-class floor of 82.1%; read that family against its
  majority-class floor, which the tables show.
- Two of the instruction-model baselines judge some of their own earlier answers in that
  cohort, because the saved answers came from four models and two of them are also
  measured here.
- The held-out decisions are sent to the services being evaluated in order to get
  predictions. Not public is not the same as not seen. This is not a contamination proof.
- Latency is one origin at one time of day. A hosted endpoint and a local CPU are not the
  same kind of latency and should not be read as one ranking.
- The public demo endpoints are shared with everyone else using them. Their numbers
  describe that deployment on that day, not the model's ceiling on your hardware.

## Credit

Every open rebuild here is someone's weekend project published for free, and several of
them run on their author's own money. Links go to their repositories:

- **Jev 1.13.0 (TypeSafe AI)** - TypeSafe AI, proprietary API - <https://docs.typesafe.ai>
- **open-alternative-jev (Qwen3.5-4B, HF Space)** - IkerMoel, Apache-2.0 (repository); Qwen3.5 weights keep their own terms - <https://github.com/ikermoel/open-alternative-jev>
- **open-jev-deberta-v3-large (local CPU)** - Kotoba Labs, Apache-2.0 (model card); DeBERTa-v3 keeps its own terms - <https://github.com/kotoba-lang/typed-decisions>
- **openjev-sglang (Qwen3.6-35B-A3B on SGLang)** - ekzhang, no licence file in the repository as of 2026-09-19; Qwen3.6 weights keep their own terms - <https://github.com/ekzhang/openjev-sglang>
- **system-one-open (Gemma 4 E2B LoRA on an L4)** - mithalouni, MIT (repository LICENSE; Gemma weights keep Google’s terms) - <https://github.com/mithalouni/system-one-open>

Authors: if we tested the wrong configuration, tell us and we will rerun it. New entrants
become v1.1 rather than silently changing v1's cohort.
