# Nebius (Token Factory) pricing — how to (re)fetch & update

**Output file:** `data/raw/nebius.json`
**Last collected:** 2026-06-23 (prior: 2026-06-18)
**Provider:** Nebius B.V. — Netherlands-based EU AI cloud. The serverless per-token
LLM product is **Nebius Token Factory** (formerly *Nebius AI Studio*).
OpenAI-compatible API host: `https://api.tokenfactory.nebius.com/v1`.

## Listing URL (cite this)
- **Public model catalog + per-token prices:** <https://tokenfactory.nebius.com/models>
- Marketing/overview: <https://nebius.com/services/token-factory>
- General price index: <https://nebius.com/prices>

## Method (2026-06-18)
1. The catalog page is a JS-rendered SPA — `curl` returns a ~5 KB shell, and the
   marketing pages' `__NEXT_DATA__` only contains a few model name mentions, not the
   price table. So the table was rendered with **agent-browser** (headless Chromium):
   ```bash
   agent-browser close
   agent-browser open "https://tokenfactory.nebius.com/models"
   agent-browser wait 4000
   agent-browser eval 'document.body.innerText' > /tmp/tf_text.txt
   agent-browser close
   ```
2. Each model card renders as: provider org, model id, `$X / 1M In`, `$Y / 1M Out`,
   `<n> Tok/s`, tier (`Base`/`Fast`), served region (e.g. `eu-north1`), and modality
   (`Text-to-text` / `Vision` / `Embedding`). Parsed with a small Python regex script
   keyed off the `$X / 1M In` lines.
3. **Tier:** every public model in this snapshot is the **`Base`** tier (no `Fast`
   tier offered on the public endpoints right now). Captured in each model's `notes`.

## Result (2026-06-23 refresh)
- **24 public endpoints** rendered (anonymous header showed `All 24 / Private 0 /
  Public 24`). Wrote **23** to `nebius.json` (24 minus the embedding model).
- **Catalog shrank from 29 → 24** vs 2026-06-18. The "deprecated on June 22" banner
  did its thing: the previously `Deprecated`-tagged **GLM-5** and **DeepSeek-V3.2**
  are **gone**; the two `…-m` mirror variants (**Nemotron 3 Nano Omni (m)**,
  **Llama 3.1 Nemotron Ultra 253B (m)**) and **INTELLECT-3** are also **gone**.
- **gpt-oss-120b survived** and is **no longer flagged deprecated**.
- **Region change:** **GLM-5.2 now serves from `us-central1`** (was `eu-north1` on
  2026-06-18) → re-flagged `region:"us"`. All other prices unchanged from prior.
- **No more deprecation banner / no `Deprecated` tags** in this render.

### Prior snapshot (2026-06-18, for history)
- 29 public endpoints, wrote 28. Deprecation banner present; GLM-5, DeepSeek-V3.2,
  gpt-oss-120b carried `Deprecated` tags. Two `…-m` mirror variants present.
- **Omitted (1):** `Qwen3-Embedding-8B` ($0.01/1M in, 4096 dims) — an embedding
  model with no output-token price; not a text/chat LLM.
- Vision/multimodal models that are still text-token-priced ARE included and flagged
  in `notes` (Cosmos3 Super Reasoner, MiniCPM-V 4.5, Qwen2.5-VL-72B).
- The two `…-m` entries (Nemotron 3 Nano Omni (m), Llama 3.1 Nemotron Ultra 253B (m))
  are managed/mirror endpoint variants at identical price — kept and flagged.

### Tracked open models — found on Nebius (2026-06-18)
| Model | In $/1M | Out $/1M | Region |
|---|---|---|---|
| GLM 5.2 | 1.40 | 4.40 | eu-north1 (Finland) |
| GLM 5.1 | 1.40 | 4.40 | eu-north1 |
| GLM 5 (deprecated) | 1.00 | 3.20 | us-central1 |
| Kimi K2.6 | 0.95 | 4.00 | us-central1 |
| DeepSeek V4 Pro | 1.75 | 3.50 | uk-south1 |
| DeepSeek V3.2 (deprecated) | 0.30 | 0.45 | us-central1 |
| MiniMax M2.5 | 0.30 | 1.20 | us-central1 |
| Qwen3-235B | 0.20 | 0.60 | eu-north1 |
| Qwen3-Next-80B | 0.15 | 1.20 | eu-north1 |
| Qwen3-32B | 0.10 | 0.30 | eu-north1 |
| gpt-oss-120b | 0.15 | 0.60 | eu-north1 |
| Llama 3.3 70B | 0.13 | 0.40 | eu-north1 |

### Tracked models NOT on Nebius public catalog (2026-06-18)
- GLM 5.1 IS present; **GLM 5.2** IS present (it is the newest, "New" tag).
- **Kimi K2.5 / K2.7** — not present (only K2.6).
- **DeepSeek R1** — not present (only V4 Pro + deprecated V3.2).
- **MiniMax M2.7 / M3** — not present (only M2.5).
- **Qwen3 Coder-480B** — not present. (Newest Qwen is Qwen3.5-397B-A17B + Qwen3-235B.)
- **Llama 4 Maverick / Scout** — not present (only Llama 3.3 70B + NVIDIA Nemotron-Llama variants).
- **gpt-oss-20b** — not present (only 120b).
- **Xiaomi MiMo** — not present.
- **Mistral** — the marketing page <nebius.com/services/token-factory> lists legacy
  Mistral models, but they do NOT appear in the live `tokenfactory.nebius.com/models`
  public catalog, so they were not priced here.

## EU region & ZDR
- **EU region: CONFIRMED.** Nebius is a Netherlands (EU) company; the catalog's
  primary serverless region is **`eu-north1` (Finland)**, and Nebius operates EU
  data centres in **Finland and France**. Most public models in this snapshot serve
  from `eu-north1`; a subset serve from `us-central1` / `uk-south1` (noted per model
  in `region` + `notes`). For the merged dataset, `region:"eu"` is used for the
  EU-served models and the raw served region is preserved in `notes`.
- **Zero-data-retention: CONFIRMED (marketing claim).** The catalog page advertises
  "**zero-retention data flow**" for endpoints, and Nebius positions Token Factory as
  GDPR-compliant with no training on customer data. This is a vendor claim from the
  product page, not an independently audited certificate — treat accordingly.

## TEE / confidential-compute verdict (checked 2026-06-23)
- **Does Nebius / Token Factory advertise TEE / confidential-computing / hardware-
  attested SERVERLESS inference? NO.** It offers only standard hosting with
  zero-retention + compliance certs — NOT confidential compute for the serverless
  endpoints.
- **Evidence:**
  - The live models page `tokenfactory.nebius.com/models` contains **no** mention of
    TEE, "Trusted Execution", confidential, attestation, enclave, SGX/SEV/TDX. (The
    only "tee" substring on the page is inside the word "guaranteed".)
  - The Token Factory product page `nebius.com/services/token-factory` lists the
    security posture as: **zero-retention mode** ("requests and outputs are never
    stored or reused for training"), **SOC 2 Type II / HIPAA / ISO 27001**, **EU & US
    data-residency** (data centres in Finland, France, US), custom DPAs, SSO/RBAC.
    **No** TEE / confidential-compute / hardware-attestation language.
  - The only Nebius "confidential computing" footprint found is a **research proof-of-
    concept** — the ELIXIR BioHackathon "BioHackCloud" Attested-TLS demo for private
    LLM inference (`nebius.com/blog/posts/elixir-biohackathon`). That is a one-off PoC,
    **not** a productized feature of the Token Factory serverless catalog.
- **Bottom line:** our prior belief is **confirmed** — Nebius Token Factory serverless
  inference is standard hosting with ZDR / no-training, **not** TEE / confidential
  compute.

## How to refresh
1. Re-run the agent-browser steps above against
   <https://tokenfactory.nebius.com/models>.
2. (Optional, needs auth) The OpenAI-compatible model list at
   `GET https://api.tokenfactory.nebius.com/v1/models` returns `{"detail":"Couldn't
   authenticate..."}` without a key — it does NOT include prices anyway, so the
   rendered catalog page remains the source of truth for pricing. To use it, set a
   Nebius API key as `Authorization: Bearer <key>` (we don't currently store one).
3. Re-parse, re-normalize model names to lab style, omit the embedding model,
   rebuild `nebius.json`.
