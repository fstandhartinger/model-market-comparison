# Who is in JevBench v1, who is not, and exactly why

A benchmark that quietly drops what it could not run is a benchmark you cannot check.
This ledger names every Jev-class candidate we found, what we tried, and what stopped
us. **An exclusion here is an availability fact about our run, never a quality claim
about the project.** Source snapshots, commit pins and README hashes are in
`sources.json` and `evidence/`; the market audit is in `MARKET.md`.

Hard constraints this job ran under: an x86 Linux server (AMD Ryzen 5 3600, no GPU),
4 GB of memory per job, a root disk at 87 %, a $15 ceiling on paid calls, and two
standing rules - never route around a rate limit or a bot protection, and never accept
gated model terms in Florian's name.

## Measured

| System | Author | How we reached it | Interface |
|---|---|---|---|
| Jev 1.13.0 | TypeSafe AI | `POST https://api.typesafe.ai/v1/systemone`, our own key | native, closed weights |
| openjev-sglang | ekzhang | the author's public unauthenticated Modal endpoint | native `/v1/systemone`, Qwen3.6-35B-A3B (no licence file in the repo as of 19 Sep) |
| system-one-open | mithalouni | the author's public Modal endpoint, `POST /decide` | native list flavour, Gemma 4 E2B + LoRA |
| open-jev-deberta-v3-large | Kotoba Labs | open weights, downloaded, run on our CPU | native, one forward pass |
| GPT-5.6 Luna (low effort) | OpenAI | our own key | JSON schema, verbalized probabilities |
| Gemini 3.1 Flash-Lite | Google | our own key | JSON schema, verbalized probabilities |
| DeepSeek V4.1 Flash | DeepSeek | our own key | JSON object, verbalized probabilities |
| Qwen3.8 27B | Qwen, via Chutes | our own subscription | JSON schema, verbalized probabilities |

The four LLM baselines are not Jev rebuilds. They are the honest alternative a team
actually weighs: the small instruction model you already pay for, asked for the same
decision under a schema.

## Not measured, with the reason

| Candidate | Author | What stopped us |
|---|---|---|
| open-alternative-jev | IkerMoel | Reached, and it answers correctly - but its Hugging Face Space runs on ZeroGPU, whose free quota ran out after a handful of decisions, anonymously and again signed in with our own account. The Space's own message points at a paid Hugging Face PRO subscription; we do not buy one without Florian. Running the Qwen3.5-4B weights ourselves needs about 8 GB, over this job's 4 GB bound. Six answers are kept as evidence of the attempt and are deliberately not in the table. |
| Bespoke Nimble 9B | Bespoke Labs | Needs an NVIDIA GPU (~18 GB for the 9B weights, per the README) and there is no public endpoint. Our RunPod API returns HTTP 403 with Cloudflare `error code: 1010`, a bot rejection; we do not change client identity to get past one, so no GPU could be rented. |
| SemIf / openjev | Theodore Lee (TheoLeeCJ) | README: "Python 3.10+, CUDA, and a GPU that can hold a 4B BF16 model". The alternative is a browser-only WebGPU demo, which is not a programmable endpoint. No GPU available (see above). |
| open-jev | Dasein Labs | MLX on Apple Silicon. The README itself says "there is no container path because Linux containers cannot reach the Apple GPU". We have no Apple hardware. |
| open-jev | JoshuaSP | DiffusionGemma 26B-A4B measured on an H100 through the author's own Modal account. No public endpoint, no GPU on our side. |
| OpenJev | razorback16 / Codiv | README: "at least 24 GB of memory for the NVFP4 checkpoint". The hosted route, codiv.ai, returns HTTP 403 to us and we hold no account there. |
| mini-jev | Mikhail Rakutko (r-ms) | README: "~9 GB of disk for the weights … the 4B model needs about 8.5 GB of memory" plus Apple Silicon or CUDA. Over our 4 GB memory bound and our disk headroom. |
| system-one | Sean Goedecke | Frozen Qwen3-8B scored locally; same memory and GPU wall, no public endpoint. |
| system-one-gemma | Akash Kamat | The base model is gated: the README requires accepting Google's Gemma licence on Hugging Face first. We do not accept binding terms on Florian's behalf. |
| jevlike | Vincent Wang-Maścianica | The released checkpoints are the Doom and chess vision scorers; there is no released general text-decision checkpoint to run against this suite. |
| AlexWortega/openjev | Alex Wortega | A three-way NLI head (entailment / contradiction / neutral) plus task-specific heads. Turning that into a distribution over our arbitrary label sets needs an assumption we would then be measuring instead of the model. |
| Needle 3 | Cactus Compute | Its interface returns a chosen label plus one accept/refuse confidence, not a distribution over the exact label set, and we do not synthesize a distribution from a confidence scalar. Measured separately on the same 78 routing tasks in our earlier head-to-head (`~/jobs/needle3-vs-jev-20260918`): 0/78 category accuracy, ~4.2 s median on the same CPU. |
| GLiNER2 | Fastino | A multi-label classification head. Its per-label scores are not a categorical posterior over our label set without choosing a normalization, and that choice would drive the calibration number. Kept as a candidate for a later version with a documented mapping. |
| Succinct Router 14M | Pedro Marques | A trained router over three fixed GPT settings, not a general typed-decision interface. In `MARKET.md`, not in the suite. |
| jev-model-router, Director, Loki | various | Applications built on a decision model, not decision models. In `MARKET.md`. |

## What would change this list

A public endpoint, a CPU-runnable checkpoint under ~3 GB, or a GPU budget. Authors who
want their project measured can tell us what to run; the suite is versioned, so a later
entry becomes v1.1 rather than silently changing v1's cohort.
