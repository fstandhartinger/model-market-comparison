# Inceptron — data collection method

**Date collected:** 2026-06-18
**Output:** `data/raw/inceptron.json`

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

## Catalog
Inceptron currently serves **exactly 3 text LLMs** via its standard priced API.
All three appear identically in:
1. Inceptron's own catalog API `https://api.inceptron.io/v1/models` (authoritative,
   includes `pricing.prompt` / `pricing.completion` in USD per token),
2. the rendered website `https://www.inceptron.io/models`,
3. OpenRouter endpoint data (`provider_name == "Inceptron"`).

| Model | Maker | in $/1M | out $/1M | cache read $/1M | quant | ctx |
|-------|-------|---------|----------|-----------------|-------|-----|
| GLM 5.1 | Z.ai | 1.40 | 4.40 | 0.26 | fp8 | 202K |
| Kimi K2.6 | Moonshot AI | 0.67* | 3.50 | 0.20 | int4 | 262K (multimodal) |
| MiniMax M2.5 | MiniMax | 0.15 | 0.90 | 0.05 | fp8 | 196K |

\* Kimi K2.6 input price: `api.inceptron.io` and OpenRouter both now report
**$0.67/1M** (down from $0.68 on the prior snapshot); cache-read also dropped to
$0.20/1M (was $0.25). The machine-readable API value ($0.67) is used as canonical
in `inceptron.json`. Output unchanged at $3.50/1M.

## Models NOT served (despite being mentioned on the site)
The homepage / models page mention "Run and scale Llama, Qwen, Kimi, and DeepSeek",
show a `meta-llama/Llama-3.3-70B-Instruct` curl example, and reference
"DeepSeek V3.2 Exp Thinking". These are **marketing / BYOM (bring-your-own-model) /
dedicated-deployment** references, NOT standard priced endpoints. The authoritative
`/v1/models` API and OpenRouter both list only the 3 models above. None of the
prioritized GLM 5.2, Kimi K2.5/K2.7, DeepSeek V4/V3.2/R1, MiniMax M2.7/M3, Qwen3,
Mistral, or gpt-oss models are served by Inceptron as priced endpoints as of
2026-06-18.

## How to refresh
1. **Primary (authoritative, fastest):**
   ```bash
   curl -s https://api.inceptron.io/v1/models -A "Mozilla/5.0" | \
     python3 -c "import sys,json;[print(m['name'], m['owned_by'], float(m['pricing']['prompt'])*1e6, float(m['pricing']['completion'])*1e6, m['quantization']) for m in json.load(sys.stdin)['data']]"
   ```
   This is public (no auth needed) and returns name, owned_by, pricing.prompt,
   pricing.completion (USD/token -> x1e6 for per-1M), quantization, context_length,
   modalities.
2. **Cross-source (OpenRouter):** for each candidate slug, GET
   `https://openrouter.ai/api/v1/models/{author}/{slug}/endpoints` and filter
   `data.endpoints[].provider_name == "Inceptron"`; `pricing.prompt` /
   `pricing.completion` are USD/token. Slugs seen served: `z-ai/glm-5.1`,
   `moonshotai/kimi-k2.6`, `minimax/minimax-m2.5`. (Scanned all ~330 OR models;
   only those 3 had Inceptron endpoints.)
3. **Website (visual confirmation):** render `https://www.inceptron.io/models`
   with agent-browser (Framer SPA — static `curl` returns only the shell, must
   render JS). HQ/compliance claims live on `https://www.inceptron.io/`.
4. **Provider metadata (HQ / datacenters / data policy):**
   `https://openrouter.ai/api/frontend/all-providers` -> entry with
   `slug == "inceptron"`.
