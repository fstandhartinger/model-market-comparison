# EU Sovereign / Telco / Enterprise Cloud — Open-LLM Inference API Survey

**Research date:** 2026-06-18
**Purpose:** Identify which German / European sovereign-cloud, telco, and enterprise providers actually expose a **per-token inference API** for top **open-source** LLMs with **EU data residency** — for the model-price-comparison app. The decisive question for each candidate is: *does it offer a usable serverless per-token (ideally OpenAI-compatible) API for open models*, vs. being **GPU-rental-only**, **own-models-only**, or **proprietary-frontier-only**.

> Prices below are quoted in the currency the provider publishes. **Several sovereign EU providers price in EUR**, which requires conversion to compare against USD-denominated providers (OpenRouter/Together/Chutes etc.). Where a figure was back-derived from USD it is flagged.

---

## Summary table

| Provider | Owner / HQ | DC location | Per-token open-LLM API? | OpenAI-compat | Top open models hosted | Price basis | Residency / certs | Verdict |
|---|---|---|---|---|---|---|---|---|
| **STACKIT AI Model Serving** | Schwarz Digits / Schwarz Group, DE | Germany (eu01) + Austria | **YES** (serverless) | Yes | gpt-oss-120b/20b, Qwen3-VL-235B, Qwen3.6-27B, Llama 3.3 70B, Gemma 3 | EUR / 1M tok | DE/EU; BSI C5, ISO 27001/17/18, SOC 2; no-train | **INCLUDE** |
| **T-Systems AI Foundation Services (LLMHub)** | Deutsche Telekom, DE | Germany (T-Cloud, sovereign) | **YES** (serverless) | Yes | gpt-oss-120b, Llama 3.3 70B, Mistral Small 3/4, Qwen3-Next 80B / Qwen3-Coder 30B / Qwen3-VL 30B, Gemma 4 | EUR / 1M tok **+ €1,000/mo min** | DE/EU; infra BSI C5, ISO 27001, conf. compute; no-train | **INCLUDE** (flag €1k/mo floor) |
| **IONOS AI Model Hub** | IONOS SE / United Internet, DE | Germany (Frankfurt/Berlin) | **YES** (serverless) | Yes | gpt-oss-120b, Llama 3.1/3.3 (8B/70B/405B), Mistral Nemo/Small 24B, Qwen3-Coder-Next 80B | USD / 1M tok | DE; ISO 27001, Gaia-X; no-train | **INCLUDE** |
| **OVHcloud AI Endpoints** | OVHcloud, FR | France (Gravelines/Roubaix) | **YES** (serverless) | Yes | gpt-oss-120b/20b, Llama 3.3 70B, Qwen3.5/3.6, Mistral Small 3.2/Nemo | EUR / 1M tok | EU (FR); ISO 27k, SOC; no-train + ZDR | **INCLUDE** (EU comparator) |
| **Mistral La Plateforme** | Mistral AI, FR | EU | YES — own models only | Yes | Mistral Small/Medium/Large/Codestral | USD / 1M tok | EU | INCLUDE (Mistral models only) |
| **SAP Generative AI Hub** | SAP SE, DE | BTP eu10 (FFM) + hyperscalers | **NO** (proprietary-focused) | Partial (SDK) | mostly proprietary; only Mistral Small open; open weights deprecated/BYOM | "Capacity Units" (1 CU ≈ $1) | residency = upstream hyperscaler | **EXCLUDE** as open per-token |
| **Gcore Everywhere Inference** | Gcore, LU | Frankfurt + global | **NO** (per-GPU-hour) | Yes (endpoint) | Mistral, DeepSeek-R1-Distill, GLM-4.5-Air, gpt-oss-120b | EUR / GPU-hour | EU; GDPR, ISO 27001 | **EXCLUDE** from per-token tier |
| **plusServer / plusAI** | plusserver GmbH, DE | Germany | **NO** (dedicated GPU rental) | Not advertised | bring-your-own open LLM | EUR / month (GPU tier) | DE; BSI C5, Gaia-X | **EXCLUDE** from per-token tier |
| **Aleph Alpha PhariaAI** | Aleph Alpha, DE (merging w/ Cohere) | DE / sovereign | **NO** for 3rd-party open models | Yes (self-host) | own Pharia/Luminous via public API; open weights only self-hosted | USD (own models) / enterprise license | DE; ISO 27001 | **EXCLUDE** |
| **Delos Cloud** | SAP + Microsoft, DE | Berlin + Frankfurt + Leipzig | **NO** (public sector only) | n/a | OpenAI **proprietary** ("OpenAI for Germany") | not public | DE sovereign (BSI-oriented) | **EXCLUDE** |
| **Telekom × NVIDIA Industrial AI Cloud** | Deutsche Telekom, DE | Germany | **NO** (GPU capacity rental) | n/a | tenant brings own stack | GPU rental | DE sovereign | **EXCLUDE** from per-token tier |
| **EU "AI gigafactories"** | EU / EuroHPC | EU (under construction) | **NO** (not live) | n/a | n/a (training compute) | n/a | EU | **EXCLUDE** (not live 2026) |

**Bottom line:** Of all candidates, **four** expose a real serverless per-token open-LLM API with EU residency: **STACKIT, T-Systems LLMHub, IONOS AI Model Hub**, and (France) **OVHcloud AI Endpoints**. **Mistral La Plateforme** qualifies but only for Mistral's own models. Everything else is GPU-rental-only, own-models-only, proprietary-only, public-sector-gated, or not yet live.

**Common catalog gap across ALL sovereign EU providers:** none currently host **Llama 4, DeepSeek V3.2/R1/V4, GLM 5.x, Kimi K2.x, or MiniMax M-series**. The open lineup is consistently **gpt-oss-120b + Llama 3.x + Mistral + Qwen3 family** (Gcore is the only one with DeepSeek-R1 *distills* and GLM-4.5-Air). This is a meaningful finding: the cutting-edge Chinese open models (GLM/Kimi/DeepSeek/MiniMax) are **not** available with German/EU sovereign residency as of mid-2026.

---

## Per-candidate detail

### STACKIT AI Model Serving — INCLUDE
- **Owner/HQ:** Schwarz Digits Cloud GmbH (Schwarz Group / Lidl-Kaufland parent), Germany. "Sovereign cloud," 100% European.
- **DCs:** Germany (region `eu01`) + Austria; Schwarz Group's own ISO 27001 data centers.
- **API:** **Serverless per-token, OpenAI-compatible.** Endpoint `https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1`. Single auth token across shared models (chat + embeddings + vision). Access by application/qualification (token issued ~24h). Drop-in OpenAI replacement.
- **Open models (mid-2026 shared catalog):** `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `Qwen/Qwen3-VL-235B-A22B-Instruct-FP8`, `Qwen/Qwen3.6-27B`, `cortecs/Llama-3.3-70B-Instruct-FP8`, `google/gemma-3-27b-it`; embeddings `intfloat/e5-mistral-7b-instruct`, `Qwen/Qwen3-VL-Embedding-8B`. **No** Llama 4, DeepSeek, GLM, Kimi, MiniMax, or a flagship Mistral chat model. Catalog rotates; custom-model requests possible.
- **Prices (EUR / 1M tok):** Standard tier (Llama 3.3 70B, Gemma 3 27B): **€0.45 in / €0.65 out**. Embedding e5-mistral: **€0.02 in**. Larger models (Qwen3-VL-235B, gpt-oss-120b) sit in higher tiers — exact figures behind the JS pricing calculator (`calculator.stackit.cloud/ai`).
- **Residency/compliance:** All processing in German DCs; explicit **no-storage + no-training** of customer data. Certs: **BSI C5 Type 2, ISO 27001/27017/27018, ISAE 3000 / SOC 2, ISAE 3402.** GDPR by design. EU AI Act not specifically certified.
- **Confidence:** HIGH (own docs + product/pricing pages + third-party reviews).
- **Sources:** https://stackit.com/en/products/data-ai/stackit-ai-model-serving · https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models/ · https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/faq/ · https://calculator.stackit.cloud/ai?addService=model-serving · https://european.cloud/2025/10/stackit-ai-model-serving/ · https://schwarz-digits.de/en/presse/archive/2024/sovereign-stackit-cloud-with-bsi-s-c5-isae-3000-soc-2-and-isae-3402-certified

### T-Systems AI Foundation Services / "LLMHub" — INCLUDE (with caveat)
- **Owner/HQ:** T-Systems (Deutsche Telekom subsidiary), Germany.
- **DCs:** Open-source models hosted in **sovereign German T-Cloud**; proprietary models forwarded to Azure/GCP in EU regions (DE/FR/SE).
- **API:** **Serverless per-token, OpenAI-compatible** ("API identical to OpenAI's"). Base URL `https://llm-server.llmhub.t-systems.net/v2`. ~47 total models (open + proprietary).
- **Open models (sovereign T-Cloud):** **gpt-oss-120b**, **Llama 3.3 70B**, **Mistral Small 3 / Small 4 (Preview)**, **Qwen3-Next 80B**, **Qwen3-VL 30B**, **Qwen3-Coder 30B**, **Gemma 4 (Preview)**; embeddings BGE-M3, Jina v2 DE; Whisper STT. **No** Llama 4, DeepSeek, GLM, Kimi, MiniMax.
- **Prices (EUR / 1M tok):** representative **€0.20 in / €0.65 out** for T-Cloud open models (docs label as "example"/Standard tier; verify per-model). **No free / pure pay-as-you-go tier — monthly minimum commitment floor:** Essential €1,000/mo (300 RPM), Professional €3,000 (600), Agentic €5,000 (1,000), Enterprise custom.
- **Residency/compliance:** Open models = sovereign Germany; explicit **no-training** regardless of model. LLMHub ISO 27001; underlying T-Cloud Public: **BSI C5 Type 2, ISO 27001/27018/27701, SOC 1/2/3, TISAX, EU Cloud CoC, confidential computing + HSM.** EU AI Act not documented.
- **Caveat:** the **€1,000/mo entry floor** makes this enterprise-only — not consumption-style like OpenRouter/Chutes. Flag prominently in the app.
- **Confidence:** HIGH on existence/API/models/sovereignty; MEDIUM on exact per-model prices.
- **Sources:** https://docs.llmhub.t-systems.net/ · https://docs.llmhub.t-systems.net/models · https://docs.llmhub.t-systems.net/plans/ · https://www.t-systems.com/de/en/artificial-intelligence/solutions/ai-foundation-services · https://www.t-systems.com/de/en/sovereign-cloud/solutions/open-sovereign-cloud

### IONOS AI Model Hub — INCLUDE
- **Owner/HQ:** IONOS SE (Montabaur, Germany; United Internet AG). DCs in Germany (Frankfurt/Berlin).
- **API:** **Serverless per-token, OpenAI-compatible.** Endpoint `https://openai.inference.de-txl.ionos.com/v1` (chat/completions, embeddings) + native RAG/document/semantic-search endpoints. Pay-per-use.
- **Open models (June 2026):** **gpt-oss-120b**, Llama 3.1 8B, Llama 3.3 70B, Llama 3.1 405B, Mistral Nemo, Mistral Small 24B, **Qwen3-Coder-Next 80B**; vision LightOnOCR 2; embeddings/rerank (bge-m3, Qwen3-VL Embedding/Reranker 8B); image FLUX.1/FLUX.2. **No** Llama 4, DeepSeek, GLM, Kimi, MiniMax.
- **Prices (USD / 1M tok, listed on product page):** Llama 3.1 8B $0.17/$0.17 · Mistral Nemo $0.17/$0.17 · Mistral Small 24B $0.11/$0.33 · **gpt-oss-120b $0.17/$0.71** · Llama 3.3 70B $0.71/$0.71 · Llama 3.1 405B $1.93/$1.93. (Qwen3-Coder-Next & embeddings priced per-token; pull live page.)
- **Residency/compliance:** processing **confined to Germany**; GDPR-aligned; explicit **no-training**. Certs: **ISO 27001, ISO 50001, Gaia-X** (BSI C5 not explicitly confirmed).
- **Confidence:** HIGH (straight from IONOS product/docs pages).
- **Sources:** https://cloud.ionos.com/managed/ai-model-hub · https://docs.ionos.com/cloud/ai/ai-model-hub/ai-model-hub · https://api.ionos.com/docs/inference-openai/v1/

### OVHcloud AI Endpoints — INCLUDE (EU/France comparator)
- **Owner/HQ:** OVHcloud, France. DCs Gravelines/Roubaix (France).
- **API:** **GA, serverless, pay-per-token, OpenAI-compatible.** Base URL `https://oai.endpoints.kepler.ai.cloud.ovh.net/v1`. Free tier; 40+ models; 99.5% SLA.
- **Open models:** **gpt-oss-120b/20b**, **Llama 3.3 70B** / 3.1 8B, **Qwen3-32B / Qwen3.5 / Qwen3.6-27B**, **Mistral Small 3.2 24B / Nemo / 7B**; embeddings (Qwen3-Embedding-8B, bge-m3). **No** Llama 4, DeepSeek V3.2/R1, GLM, Kimi, MiniMax.
- **Prices (EUR / 1M tok):** gpt-oss-20b €0.04/€0.15 · **gpt-oss-120b €0.08/€0.40** · Qwen3-32B €0.08/€0.23 · Qwen3.5-397B-A17B €0.60/€3.60 · Mistral-Small-3.2-24B €0.09/€0.28 · **Llama-3.3-70B €0.67/€0.67** · embeddings bge-m3 €0.01. (Some EUR figures back-derived — verify live.)
- **Residency/compliance:** EU (France); explicit **no-training + zero data retention**; ISO 27000-series + SOC + healthcare certs (SecNumCloud/BSI C5 not confirmed for this product).
- **Confidence:** HIGH on existence/compat/no-train/EUR pricing; MEDIUM on a few EUR figures.
- **Sources:** https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/ · https://docs.litellm.ai/docs/providers/ovhcloud

### Mistral La Plateforme — INCLUDE (Mistral models only)
- Paris; live per-token OpenAI-compatible EU API, **own models only** (Ministral, Small 3.x, Codestral, Medium 3 $0.40/$2.00, Large 3 $2.00/$6.00). Good canonical EU source for Mistral models.
- **Source:** https://mistral.ai/pricing/

### SAP Generative AI Hub (SAP AI Core) — EXCLUDE as open per-token
- SAP SE, Walldorf. Runs on BTP (eu10 Frankfurt) but **models execute on underlying hyperscalers** → residency governed by upstream provider, not native SAP-German hosting.
- **Catalog is proprietary/frontier-dominated** (OpenAI GPT-4.1/5.x, Claude 4.6/4.7, Gemini 2.5/3.x, AWS Nova, Aleph Alpha Pharia, IBM Granite). **Open weights largely deprecated or BYOM-only**; only Mistral Small persists as a remote open model. No Llama 4/Qwen3/DeepSeek/gpt-oss/GLM/Kimi/MiniMax.
- **Billing = "Capacity Units" (not per-token):** model tokens → GenAI tokens (per-model rate, SAP Note 3437766) → CU via constant **×1.90385**; CU denominated such that **1 CU ≈ $1** in SAP's worked example, gated behind a BTP commercial plan. Not transparent pay-as-you-go.
- **Confidence:** HIGH on structure (CU billing, proprietary focus); MEDIUM on exact current open SKUs (live list is login-gated SAP Note + JS portal).
- **Sources:** https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/metering-and-pricing-for-generative-ai · https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/models-and-scenarios-in-generative-ai-hub · https://docs.litellm.ai/docs/providers/sap

### Gcore Everywhere Inference — EXCLUDE from per-token tier
- Gcore (Luxembourg HQ), Frankfurt PoP. Endpoint **is** OpenAI-compatible but billed **per-GPU-hour** (dedicated deployment), no shared per-token tier, no $/1M-token price.
- GPU prices (EUR, ex-VAT): L40S €1.08/hr, A100 €1.26/hr, H100 €1.53/hr. Models named: Mistral 7B/Small-24B, Phi-4, **DeepSeek-R1-Distill (Qwen-32B / Llama-70B)**, **GLM-4.5-Air**, gpt-oss-120b. (Distills/Air only — not full DeepSeek/GLM.) Certs GDPR, ISO 27001, PCI DSS; no BSI C5/SecNumCloud confirmed.
- **Sources:** https://gcore.com/everywhere-inference · https://gcore.com/pricing/ai

### plusServer / plusAI — EXCLUDE from per-token tier
- plusserver GmbH, Cologne; German DCs; Gaia-X founder; **BSI C5** audited. **Dedicated-GPU rental, monthly (12-mo term), NOT per-token**; no OpenAI-compatible endpoint advertised. Tiers by param size: L4/14B €1,699/mo, L40/32B €3,099/mo, H100/70B €6,599/mo (net). Customer brings any open LLM.
- **Source:** https://www.plusserver.com/en/ai-platform/

### Aleph Alpha PhariaAI — EXCLUDE
- Heidelberg. Public per-token API = **own models only** (Luminous/Pharia, ~$30/$33 per 1M in/out). Third-party open models (Llama etc.) only via **self-hosted PhariaInference** (vLLM, OpenAI-compatible) on customer/sovereign infra — enterprise license, no public per-token price. 2026: **Cohere acquiring/merging Aleph Alpha** (announced 24 Apr 2026; €500M Schwarz Group financing; expected to run on STACKIT). ISO 27001.
- **Sources:** https://docs.aleph-alpha.com/phariaai-home/latest/index.html · https://techcrunch.com/2026/04/24/cohere-acquires-merges-with-german-based-startup-to-create-a-transatlantic-ai-powerhouse/

### Delos Cloud — EXCLUDE
- SAP + Microsoft sovereign re-host of Azure; Berlin + Frankfurt (+ Leipzig ops 2026). **Public sector only**, no self-service signup, no published pricing. AI = "OpenAI for Germany" (**proprietary** OpenAI models), ~10–20% pricier than public Azure. BSI-oriented.
- **Source:** https://news.sap.com/2025/09/sap-openai-partner-launch-sovereign-openai-germany/

### Deutsche Telekom × NVIDIA "Industrial AI Cloud" — EXCLUDE from per-token tier
- Munich, launched late Apr 2026, ~$1.2B, up to 10,000 NVIDIA Blackwell GPUs. **GPU-capacity rental (GPU-as-a-service)** for training + inference — **no per-token API, no OpenAI endpoint, no published per-token price.** Tenants (e.g. Perplexity for in-country German inference) run their own stack. Sovereign German DCs.
- **Sources:** https://blogs.nvidia.com/blog/germany-industrial-ai-cloud-launch/ · https://www.telekom.com/en/media/media-information/archive/launch-industrial-ai-cloud-with-nvidia-1098706

### EU "AI gigafactories" — EXCLUDE (not live)
- ~€20B InvestAI training-compute construction; EuroHPC call delayed (expected summer 2026). **No callable inference API exists** as of 2026-06-18.
- **Source:** https://commission.europa.eu/topics/competitiveness/competitiveness-coordination-tool-projects/ai-gigafactories_en

---

## Notes for the comparison app
1. **Currency:** STACKIT, T-Systems, OVHcloud price in **EUR**; IONOS and Mistral in **USD**. Normalize before comparison.
2. **Tiering caveat:** STACKIT/T-Systems publish only "standard tier" example prices for large models; the flagship-model per-token figures need the live calculator. T-Systems' **€1,000/mo minimum** must be surfaced as it changes the economics entirely.
3. **Model coverage caveat:** none of these EU sovereign providers host the newest Chinese frontier open models (GLM 5.x, Kimi K2.x, DeepSeek V3.2/V4, MiniMax). The dependable EU-sovereign open set is **gpt-oss-120b, Llama 3.x, Mistral, Qwen3-family**.
4. **Optional follow-up vendors** (live small EU sovereign per-token APIs, not deeply verified): Scaleway Managed Inference, Nordference, regolo.ai, EULLM, Infercom.
