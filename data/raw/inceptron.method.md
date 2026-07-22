# Inceptron — data collection method

**Date collected:** 2026-07-22 (prior: 2026-07-14, 2026-07-13, 2026-07-12, 2026-07-06, 2026-07-01)
**Output:** `data/raw/inceptron.json`

## Live catalog on 2026-07-22
The unauthenticated native API currently exposes **4 priced text LLMs**. The native
prices and current OpenRouter Inceptron routes agree for ALL FOUR models — MiniMax
M2.5 now has an OpenRouter Inceptron endpoint too (slug `minimax/minimax-m2.5`),
so it is no longer native-catalog-only:

| Model | in $/1M | out $/1M | cache read $/1M |
|-------|----------|-----------|------------------|
| GLM 5.2 | 0.94 | 2.90 | 0.17 |
| Kimi K2.7 Code | 0.72 | 3.50 | 0.15 |
| Kimi K2.6 | 0.66 | 3.41 | 0.15 |
| MiniMax M2.5 | 0.15 | 0.90 | 0.05 |

Only change vs 2026-07-14: GLM 5.2 cache read dropped $0.18 -> $0.17/1M
(in/out unchanged at $0.94/$2.90). GLM 5.2 pricing remains volatile
(0.95/3.04 on 07-12, 0.85/2.50 on 07-13, 0.94/2.90 on 07-14 and 07-22).

GLM 5.1 and Kimi K2.6 Fast are no longer in the public native catalog. Do not infer
availability from older snapshots or marketing examples. OpenRouter provider metadata
reports headquarters Sweden (`SE`) and serving datacenter Finland (`FI`).

## What Inceptron is
Inceptron is an EU-based ("enterprise-ready") LLM inference provider. It runs an
OpenAI-compatible API at `https://api.inceptron.io/v1` and is also listed as a
provider on OpenRouter ("Inceptron", slug `inceptron`). It positions itself around
hardware-aware model compilation / optimization ("Inceptron Optimized" mode),
batched inference, and elastic GPUs across clouds, plus bring-your-own-model.

## HQ / region / EU data-residency findings
- **Headquarters: Sweden (SE)** — confirmed via OpenRouter provider metadata
  (`headquarters: "SE"`) at `https://openrouter.ai/api/frontend/all-providers`.
- **Datacenter(s): Finland (FI)** — OpenRouter metadata `datacenters: ["FI"]`.
  So serving is EU/Nordic.
- **API base URL:** `https://api.inceptron.io/v1`
- **Compliance claims (from inceptron.io homepage, rendered):**
  - "ISO 27001 certified and GDPR compliant" (homepage meta description)
  - "ISO & GDPR", "Data residency controls", "Hardened isolation", "Team controls"
    (homepage "Enterprise-ready security" section)
  - "zero-retention data handling" (homepage enterprise blurb)
- **OpenRouter data policy for this provider:** `training: false`,
  `trainingOpenRouter: false`, `retainsPrompts: false`, `canPublish: false`,
  `byokEnabled: true`. Consistent with the zero-retention / no-training claims.
- No dedicated `/security` page exists (returns 404); claims are surfaced on the
  homepage only.

## Catalog (2026-06-23)
Inceptron now serves **6 priced text LLMs** via its standard public API (was **3**
on 2026-06-18 — GLM 5.2, Kimi K2.6 Fast, and **Kimi K2.7 Code** are newly exposed
in the public `/v1/models`). All 6 appear identically in:
1. Inceptron's own catalog API `https://api.inceptron.io/v1/models` (authoritative,
   no auth, includes `pricing.prompt` / `pricing.completion` in USD per token),
2. the rendered website `https://www.inceptron.io/models`,
3. OpenRouter endpoint data (`provider_name == "Inceptron"`) — all 6 confirmed.

| Model | Maker | in $/1M | out $/1M | cache read $/1M | quant | ctx |
|-------|-------|---------|----------|-----------------|-------|-----|
| GLM 5.2 | Z.ai | 1.20 | 4.20 | 0.26 | fp4 | 1.05M |
| GLM 5.1 | Z.ai | 1.40 | 4.40 | 0.26 | fp8 | 202K |
| Kimi K2.7 Code | Moonshot AI | 0.75 | 3.50 | 0.20 | int4 | 262K (multimodal) |
| Kimi K2.6 | Moonshot AI | 0.66* | 3.50 | 0.20 | int4 | 262K (multimodal) |
| Kimi K2.6 Fast | Moonshot AI | 1.32 | 7.00 | 0.40 | fp4 | 262K (multimodal) |
| MiniMax M2.5 | MiniMax | 0.15 | 0.90 | 0.05 | fp8 | 196K |

\* Kimi K2.6 input price is now **$0.66/1M** ($0.67 on 2026-06-18, $0.68 prior);
output unchanged at $3.50/1M. The machine-readable API value is canonical.

### Kimi K2.7 Code — NOW PUBLIC (2026-06-23)
On 2026-06-18 Kimi K2.7 Code showed only in the logged-in console (SERVERLESS/NEW,
$0.75 in / $3.50 out) and was **absent** from the public `/v1/models` API. As of
2026-06-23 it **is** present in the public API (`id moonshotai/Kimi-K2.7-Code`,
int4, 262K ctx, multimodal, in $0.75 / out $3.50, cache read $0.20) and is also
confirmed on the OpenRouter `moonshotai/kimi-k2.7-code` Inceptron endpoint at the
same $0.75 / $3.50. The previously-held manual entry can be dropped — it is now a
real public catalog model and is included in `inceptron.json`.

## Models NOT served (despite being mentioned on the site)
The homepage / models page mention "Run and scale Llama, Qwen, Kimi, and DeepSeek",
show a `meta-llama/Llama-3.3-70B-Instruct` curl example, and reference
"DeepSeek V3.2 Exp Thinking". These remain **marketing / BYOM (bring-your-own-model)
/ dedicated-deployment** references, NOT standard priced endpoints — the authoritative
`/v1/models` API and OpenRouter list only the 6 models above. Of the prioritized set,
GLM 5.2, Kimi K2.6 and Kimi K2.7 Code ARE now served; DeepSeek V4/V3.2/R1, MiniMax
M2.7/M3, Qwen3, Mistral, and gpt-oss are still NOT served by Inceptron as priced
endpoints as of 2026-06-23.

## How to refresh
1. **Primary (authoritative, fastest):**
   ```bash
   curl -s https://api.inceptron.io/v1/models -A "Mozilla/5.0" | \
     python3 -c "import sys,json;[print(m['name'], m['owned_by'], float(m['pricing']['prompt'])*1e6, float(m['pricing']['completion'])*1e6, m['quantization']) for m in json.load(sys.stdin)['data']]"
   ```
   This is public (no auth needed) and returns name, owned_by, pricing.prompt,
   pricing.completion and `input_cache_reads` (USD/token -> x1e6 for per-1M),
   quantization, context_length, modalities. Persist the cache tier as
   `cache_read_per_1m_usd`, not only in `notes`.
2. **Cross-source (OpenRouter):** for each candidate slug, GET
   `https://openrouter.ai/api/v1/models/{author}/{slug}/endpoints` and filter
   `data.endpoints[].provider_name == "Inceptron"`; `pricing.prompt` /
   `pricing.completion` are USD/token. Live slugs on 2026-07-22:
   `z-ai/glm-5.2`, `moonshotai/kimi-k2.7-code`, `moonshotai/kimi-k2.6`, and
   `minimax/minimax-m2.5` (MiniMax gained an OpenRouter Inceptron route
   between 07-12 and 07-22; previously native-catalog-only). OpenRouter
   cache-read field on endpoints is `input_cache_read`; the native API's is
   `input_cache_reads`.
3. **Website (visual confirmation):** render `https://www.inceptron.io/models`
   with agent-browser (Framer SPA — static `curl` returns only the shell, must
   render JS). HQ/compliance claims live on `https://www.inceptron.io/`.
4. **Provider metadata (HQ / datacenters / data policy):**
   `https://openrouter.ai/api/v1/providers` -> entry with
   `slug == "inceptron"`.
