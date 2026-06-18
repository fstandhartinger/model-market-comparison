# EU-Native / EU-Sovereign LLM Inference API Providers

**Research date:** 2026-06-18
**Purpose:** Identify European-based (or EU-data-residency-capable) LLM inference API platforms that serve top open-source models, for the model-market-comparison app.
**Method:** Web research (vendor pricing/docs pages, trust centers, aggregators OpenRouter/Requesty/LiteLLM). All prices observed 2026-06-18 and should be re-verified before publishing. Unknowns are marked explicitly. Many vendor pricing pages are JS-rendered SPAs — figures sourced from aggregators are flagged.

**Top open models of interest (the "checklist"):** GLM 5.1/5.2, Kimi K2.5/K2.6/K2.7, DeepSeek V4 Pro / V3.2 / R1, MiniMax M2.5/M2.7/M3, Qwen3 (Coder-480B, 235B, Next-80B), Llama 4 Maverick/Scout, Mistral (Large/Medium/Magistral), gpt-oss-120b, Xiaomi MiMo-V2.5-Pro.

---

## TL;DR — which EU platforms genuinely serve our top open models via per-token API

Ranked by usefulness for a price-comparison app (must have a **serverless per-token OpenAI-compatible API** + **EU residency** + **broad open-model catalog**):

| Rank | Platform | EU residency | Per-token API | Frontier open-model coverage | Verdict |
|---|---|---|---|---|---|
| 1 | **Nebius Token Factory** (was AI Studio) | EU region selectable (Finland/France) | ✅ | **Broadest** (GLM, Kimi, DeepSeek V4/V3.2/R1, MiniMax, Qwen3 235B/480B/Next, gpt-oss) | ⚠️ Yandex heritage — flag for strict sovereignty buyers |
| 2 | **Scaleway Generative APIs** (FR) | ✅ Paris-only, ZDR default | ✅ | MiniMax M2.5, Qwen3-235B, Mistral L/M/Magistral, gpt-oss-120b | True EU-sovereign; SecNumCloud in progress |
| 3 | **Inceptron** (Sweden) | ✅ EU, zero-retention | ✅ | **GLM 5.1, Kimi K2.6, MiniMax M2.5** + Llama/Qwen/DeepSeek | Best EU match for GLM + Kimi; ISO 27001 |
| 4 | **OVHcloud AI Endpoints** (FR) | ✅ Gravelines FR | ✅ | gpt-oss-120b only (+ Qwen3.5-397B, Llama 3.3, Mistral Small) | Strong sovereignty, narrow frontier catalog |
| 5 | **IONOS AI Model Hub** (DE) | ✅ Germany-only, stateless | ✅ | gpt-oss-120b, Qwen3-Coder-Next-80B only | Strongest German-sovereignty story (C5 core cloud) |
| 6 | **Together AI** (US, EU region) | ⚠️ EU opt-in (Sweden live) | ✅ | Broad (GLM, Kimi, DeepSeek V4, MiniMax, Qwen3) | US-HQ → CLOUD Act; EU residency mechanism for serverless underdocumented |
| 7 | **Mistral La Plateforme** (FR) | ✅ EU default, ZDR on request | ✅ | **Own models only** (Large 3, Medium 3.5, Magistral) | Not a multi-vendor aggregator |
| 8 | **Infercom** (Luxembourg, DC Munich) | ✅ EU, EUR-priced | ✅ | DeepSeek V3.1/V3.2, gpt-oss-120b, MiniMax, Llama 3.3 | Smaller; good DeepSeek coverage |
| 9 | **Regolo.ai / Seeweb** (Italy) | ✅ EU, deep certs | ✅ | gpt-oss-120b/20b, Qwen3.5, Llama 3.3 | Strong certs (ISO 27001/17/18, CSA STAR, CISPE) |
| 10 | **Nscale** (UK/Norway) | "EU sovereign" (region-pin unconfirmed) | ✅ | gpt-oss-120b, Qwen3-235B, Llama 4 Scout, DeepSeek **distills only** | No published certs; cheap; zero-retention |
| 11 | **Fireworks AI** (US) | ⚠️ EU **dedicated-only** (Frankfurt/Iceland) | ✅ (US-only serverless) | Broad | EU residency requires GPU-hour dedicated tier |
| — | **Aleph Alpha** (DE) | ✅ EU/on-prem (STACKIT) | ❌ enterprise platform, not public per-token | Integrates 3rd-party open models, but contract-gated | Quote as "POA / enterprise", no price row |
| — | **Hugging Face Inference Endpoints** | ⚠️ EU opt-in (AWS eu-west-1) | ❌ **GPU-hour rental**, not per-token | Any Hub model on rented GPU | Not per-token; no per-1M row |
| — | **DeepInfra** (US) | ❌ **No EU** (US-only) | ✅ | Broadest + cheapest | Fails any EU-residency requirement today |
| — | **DataCrunch/Verda, Exoscale, Genesis Cloud, Fluidstack, Leafcloud** | EU (various) | mostly ❌ | n/a | GPU-rental or managed-endpoint (per-GPU-time), not per-token (Genesis has a thin beta API) |

**Headline findings:**
1. Only a handful of EU-native platforms carry the **frontier Chinese open models (GLM, Kimi, DeepSeek V4, MiniMax)** via per-token API: **Nebius**, **Inceptron**, **Infercom** (DeepSeek), and to a lesser extent Scaleway (MiniMax/Qwen). The classic "sovereign EU trio" (OVHcloud, IONOS) mostly carry mid-tier weights — **gpt-oss-120b is the one checklist model nearly all of them serve**.
2. **No EU provider serves Xiaomi MiMo-V2.5-Pro** (per-token). **GLM 5.x / Kimi K2.x / DeepSeek V4** found only on Nebius, Inceptron, Together, Fireworks, DeepInfra.
3. **Confidential compute / TEE is not a GA feature** at any of these EU platforms (Nebius has R&D-only PoC).
4. The big US serverless platforms split three ways on EU residency: **Together = yes (opt-in)**, **Fireworks = yes but dedicated-only**, **DeepInfra = no**.

---

## Master pricing table — open models on EU-capable per-token APIs (USD/1M unless noted)

| Model | Nebius (EU sel.) USD | Scaleway (PAR) EUR | OVHcloud (FR) EUR | IONOS (DE) EUR | Inceptron (SE) USD | Together (EU opt) USD | Fireworks USD | DeepInfra (no EU) USD |
|---|---|---|---|---|---|---|---|---|
| GLM 5.1 / 5.2 | 1.40 / 4.40 | — | — | — | 1.40 / 4.40 (5.1) | 1.40 / 4.40 | 1.40 / 4.40 | 1.40 / 4.40 |
| Kimi K2.6 | 0.95 / 4.00 | — | — | — | 0.80 / 3.50 | — | 0.95 / 4.00 (K2.7) | 0.75 / 3.50 |
| DeepSeek V4 Pro | 1.75 / 3.50 | — | — | — | — | 1.74 / 3.48 | 1.74 / 3.48 | 1.30 / 2.60 |
| DeepSeek V3.2 | 0.30 / 0.45 | — | — | — | 3.00 / 4.50 (Infercom)¹ | — | — | 0.26 / 0.38 |
| DeepSeek R1 | (served) | distills only | — | — | — | — | (served) | 0.50 / 2.15 (R1-0528) |
| MiniMax M2.5 | 0.30 / 1.20 | (served) | — | — | (served) | (served) | — | (served) |
| MiniMax M3 | — | — | — | — | — | (served) | 0.30 / 1.20 | — |
| Qwen3-235B-A22B | 0.20 / 0.60 | 0.75 / 2.25 | — | — | — | 0.20 / 0.60 | (served) | 0.09 / 0.10 |
| Qwen3-Coder-480B | (served) | — | — | — | — | — | (served) | 0.30 / 1.00 |
| Qwen3-Next-80B | 0.15 / 1.20 | — | — | 0.15 / 0.80² | — | — | (served) | — |
| Llama 4 Maverick | ? | — | — | — | — | ? | (served) | 0.15 / 0.60 |
| Llama 4 Scout | ? | — | — | — | — | ? | (served) | 0.10 / 0.30 |
| gpt-oss-120b | 0.15 / 0.60 | 0.15 / 0.60 | 0.08 / 0.40 | 0.15 / 0.65 | (served) | 0.15 / 0.60 | 0.15 / 0.60 | 0.039 / 0.19 |
| Mistral Large 3 | — | (served) | — | — | — | — | — | — |
| Mistral Medium 3.5 | — | 1.50 / 7.50 | — | — | — | — | — | — |
| Xiaomi MiMo-V2.5-Pro | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

¹ Infercom (LU/Munich) DeepSeek V3.2 ≈ €3.00/€4.50 — different operator column, listed here for reference.
² IONOS lists "Qwen3-Coder-Next 80B" at €0.15/€0.80.
"(served)" = model available but exact price not captured. "—" = not served. "?" = availability uncertain.

> **Currency note:** Nebius, Inceptron, Together, Fireworks, DeepInfra price in **USD**. OVHcloud, Scaleway, IONOS price in **EUR**. Mistral prices in **USD**.

---

# Per-provider detail

## 1. Nebius Token Factory (formerly Nebius AI Studio) — Netherlands

**CRITICAL:** "Nebius AI Studio" was **rebranded to Nebius Token Factory** (~Oct 2025). Old `studio.nebius.ai` redirects to `tokenfactory.nebius.com`. New base URL `https://api.tokenfactory.nebius.com`. Some aggregators still show the old `api.studio.nebius.ai/v1`.

- **HQ/ownership:** Nebius Group N.V., Amsterdam NL (Dutch N.V., EU-domiciled). Spun out of Yandex (Russian assets divested July 2024); Nasdaq: NBIS. ⚠️ Yandex heritage is a sovereignty red flag for some buyers.
- **EU data centers / residency:** Inference regions EU (Finland, France) + Israel + US, **selectable per endpoint**. Fine-tuning data stored EU-only regardless. Whether EU is default if unselected: UNKNOWN.
- **GDPR/certs:** GDPR processor (DPA in ToS, SCCs, EU-US DPF certified); **ISO 27001:2022**, **SOC 2 Type II**, **HIPAA**, **ISO 27701**. C5 / SecNumCloud / formal EU AI Act posture: not found.
- **Confidentiality:** ZDR available as a **mode** (caveat: without ZDR, data may be briefly retained for speculative decoding). No training on customer data. Confidential compute = R&D PoC only, not GA.
- **API:** OpenAI-compatible; serverless per-token **and** dedicated/reserved GPU; 60+ open models.
- **Checklist served:** GLM 5.1/5.2, Kimi K2.6, DeepSeek V4 Pro/V3.2/R1, MiniMax M2.5, Qwen3-235B/Coder-480B/Next-80B, gpt-oss-120b. Not confirmed: Kimi K2.5/K2.7, MiniMax M2.7/M3, Llama 4, Mistral, Xiaomi MiMo.
- **Prices (USD/1M, aggregator-sourced — SPA blocked, confidence MEDIUM):** GLM-5.2/5.1 1.40/4.40 · Kimi K2.6 0.95/4.00 · DeepSeek V4 Pro 1.75/3.50 · DeepSeek V3.2 0.30/0.45 · MiniMax M2.5 0.30/1.20 · Qwen3-235B 0.20/0.60 · Qwen3-Next-80B 0.15/1.20 · gpt-oss-120b 0.15/0.60.
- **Sources:** https://nebius.com/ai-studio · https://docs.tokenfactory.nebius.com/legal/legal-quick-guide · https://nebius.com/trust-center · https://nebius.com/blog/posts/soc-2-type-ii-hipaa-iso-27001-enterprise-security-standards · https://www.requesty.ai/models/nebius · https://openrouter.ai/provider/nebius · https://en.wikipedia.org/wiki/Nebius_Group

## 2. OVHcloud AI Endpoints — France

- **HQ/ownership:** OVH Groupe SA, Roubaix, France (Euronext: OVH). Positions as sovereign European cloud.
- **EU DC / residency:** Inference served from **Gravelines, France**; "data hosted in Europe, protected against non-European regulations." EU is default and effectively the only posture; per-region pinning not documented.
- **GDPR/certs:** GDPR; CISPE Code of Conduct signatory; product cites ISO 27000, SOC, HDS. **SecNumCloud:** OVHcloud holds it for *dedicated sovereign* products (Roubaix/Gravelines/Strasbourg) but **NOT confirmed for AI Endpoints — likely not yet**. C5 / EU AI Act: not found.
- **Confidentiality:** ZDR ("only data required for billing"); explicit no-training; "Fast API" tier adds enhanced privacy. No TEE.
- **API:** OpenAI-compatible; base `oai.endpoints.kepler.ai.cloud.ovh.net/v1`; **serverless per-token only** (rented GPU = separate AI Deploy product). Tiers: Base; Batch (~50% off); Fast (committed, custom price).
- **Checklist served:** **gpt-oss-120b only.** Largest models: Qwen3.5-397B-A17B, Llama-3.3-70B. No GLM/Kimi/DeepSeek/MiniMax/Llama 4/Mistral Large-Medium-Magistral/Xiaomi.
- **Prices (EUR/1M, official catalog, confidence HIGH):** gpt-oss-120b 0.08/0.40 · gpt-oss-20b 0.04/0.15 · Qwen3-32B 0.08/0.23 · Qwen3-Coder-30B 0.06/0.22 · Qwen3.5-397B-A17B 0.60/3.60 · Mistral-Small-3.2-24B 0.09/0.28 · Llama-3.3-70B 0.67/0.67.
- **Sources:** https://www.ovhcloud.com/en/public-cloud/ai-endpoints/ · https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/ · https://corporate.ovhcloud.com/en/newsroom/news/ai-endpoints/ · https://www.ovhcloud.com/en/compliance/secnumcloud/ · https://labs.ovhcloud.com/en/ai-endpoints-flavors/

## 3. Scaleway Generative APIs — France

- **HQ/ownership:** Scaleway (France), Iliad Group (Xavier Niel). Markets as "drop-in OpenAI alternative, 100% made in Europe."
- **EU DC / residency:** Hosted in **Paris (PAR) only** (other Scaleway regions AMS/WAW do NOT apply to this product).
- **GDPR/certs:** GDPR; **ISO 27001:2022**; **HDS** (health data); **SecNumCloud in progress** (started Jan 2025; status as of 2026-06 not confirmed achieved). ISO 27017/27018, SOC 2, C5, EU AI Act: unverified.
- **Confidentiality:** **Zero Data Retention by default**; explicit no-training; not accessible to model creators; per-project isolation. No TEE.
- **API:** OpenAI-compatible (Chat Completions + Responses API); base `https://api.scaleway.ai/v1`; serverless per-token **and** dedicated GPU; 1M free trial tokens; Batch API −50%.
- **Checklist served:** **MiniMax M2.5, Qwen3-235B, Mistral Large 3 / Medium 3.5 / Magistral (Small), gpt-oss-120b**; DeepSeek R1 only as Llama-distills. Not served: GLM, Kimi K2, DeepSeek V3.2/V4, Qwen3-Coder-480B, Qwen3-Next-80B, Llama 4, Xiaomi MiMo.
- **Prices (EUR/1M, SPA-extracted, confidence MEDIUM):** gpt-oss-120b 0.15/0.60 · Qwen3-235B 0.75/2.25 · Qwen3.5-397B-A17B 0.60/3.60 · Mistral-Medium-3.5 1.50/7.50 · Mistral-Small-3.2 0.15/0.35 · Llama-3.3-70B 0.90/0.90 · Devstral-2-123B 0.40/2.00. (minimax-m2.5 & mistral-large-3 prices not captured — re-check.)
- **Sources:** https://www.scaleway.com/en/pricing/model-as-a-service/ · https://www.scaleway.com/en/docs/generative-apis/reference-content/supported-models/ · https://www.scaleway.com/en/docs/generative-apis/reference-content/data-privacy/ · https://www.scaleway.com/en/security-and-resilience/ · https://www.scaleway.com/en/news/scaleway-begins-the-secnumcloud-qualification-process/

## 4. IONOS AI Model Hub — Germany

- **HQ/ownership:** IONOS SE, Germany (United Internet AG group). Heavy "sovereign AI" / German data-sovereignty marketing. Gaia-X founding member.
- **EU DC / residency:** **All processing within Germany**; region **Berlin (de-txl)** only; vector-DB storage in Berlin. Default and only AI region.
- **GDPR/certs:** GDPR/DSGVO; **ISO 27001 (BSI IT-Grundschutz)**; ISO 50001; **BSI C5:2020 Type 1** (PwC) — but C5 scope is core cloud (Compute/Storage); **whether C5 formally covers the AI Model Hub is UNKNOWN**. SOC 1–3 listed (AI scope unconfirmed). SecNumCloud / explicit DPA-SCC docs / EU AI Act: not found.
- **Confidentiality:** **Stateless / zero-retention** (discards prompts & outputs each session); explicit no-training; no third-party access; encryption at rest+transit. No TEE.
- **API:** OpenAI-compatible; base `https://openai.inference.de-txl.ionos.com/v1`; serverless per-token. Also embeddings, reranking, image gen, OCR, vector DB / RAG.
- **Checklist served:** **gpt-oss-120b and Qwen3-Coder-Next-80B only.** No GLM/Kimi/DeepSeek/MiniMax/Llama 4/large Qwen3/Mistral Large-Medium-Magistral/Xiaomi.
- **Prices (EUR/1M, official price list, confidence HIGH):** GPT-OSS 120B 0.15/0.65 · Qwen3-Coder-Next 80B 0.15/0.80 · Llama 3.3 70B 0.65/0.65 · Llama 3.1 405B 1.75/1.75 · Mistral Small 24B 0.10/0.30 · Llama 3.1 8B 0.15/0.15.
- **Sources:** https://cloud.ionos.com/managed/ai-model-hub · https://docs.ionos.com/cloud/ai/ai-model-hub/data-handling · https://docs.ionos.com/cloud/ai/ai-model-hub/models/models-comparison · https://docs.ionos.com/cloud/support/general-information/price-list/ionos-cloud-se-de · https://www.ionos-group.com/investor-relations/publications/announcements/ionos-receives-c5-certification-for-compute-engine-cloud-cubes-and-s3-object-storage.html

## 5. Mistral AI — La Plateforme — France

- **HQ/ownership:** Mistral AI, Paris, France. Independent.
- **EU DC / residency:** EU data centers by default (API + Le Chat). GDPR safeguards (SCCs, Art. 46) for any non-EU provider. Separate **US endpoint** available if you want US routing. Enterprise tier can deactivate non-EU transfers org-wide.
- **GDPR/certs:** **SOC 2 Type II**, **ISO 27001 / ISO 27701**; SCCs for transfers. C5 / SecNumCloud: not advertised (UNKNOWN). Signed EU AI code of practice.
- **Confidentiality:** **ZDR available on the API on request** (suspends the 30-day abuse window). Default: 30-day rolling retention for abuse monitoring, then deleted. No training on API/customer data. TEE: not advertised.
- **API:** OpenAI-compatible; base `https://api.mistral.ai/v1/`; serverless per-token (pay-as-you-go, free experimentation tier; Batch −50%).
- **Models:** **Own models only** — NOT a multi-vendor aggregator. Lineup: Mistral Medium 3.5, Large 3, Small 4, Magistral Small/Medium, Codestral, Devstral 2, Voxtral, OCR 3.
- **Prices (USD/1M, official, confidence HIGH):** **Mistral Large 3 0.50/1.50** · Mistral Medium 3.5 1.50/7.50 · Mistral Small 4 0.10/0.30 · Magistral Small 0.50/1.50 · Magistral Medium 2.00/5.00 · Codestral 0.30/0.90.
  > **Correction:** aggregators still listing "Mistral Large" at $2/$6 are showing the **old Large 2**. Current **Large 3** (Dec 2025) is **$0.50/$1.50**. Medium 3.5 output ($7.50) is higher than Large 3.
- **Sources:** https://mistral.ai/pricing/ · https://help.mistral.ai/en/articles/347629-where-do-you-store-my-data-or-my-organization-s-data · https://trust.mistral.ai/ · https://help.mistral.ai/en/articles/347638-do-you-have-soc-2-or-iso-27001-certification · https://anarlog.so/blog/mistral-data-retention-policy/

## 6. Aleph Alpha — Germany

- **HQ/ownership:** Aleph Alpha GmbH, Heidelberg, Germany. **Cohere merger announced 24 Apr 2026** (~$20bn combined, ~$600m Schwarz Group anchor). ⚠️ MEDIUM confidence (single-source) — verify before publishing.
- **EU DC / residency:** Strong sovereignty pitch — "every model runs on European infrastructure." Key infra partner **STACKIT** (Schwarz Group, German DCs) via PhariaAI OEM. On-prem / air-gapped deployable.
- **GDPR/certs:** ISO 27001 (MEDIUM-HIGH); signed EU AI code of practice. BSI C5 / SecNumCloud: not confirmed (UNKNOWN).
- **Confidentiality:** Sovereignty is the entire pitch; on-prem/air-gapped means data stays in customer/EU jurisdiction. No explicit public ZDR/TEE claim (likely moot for on-prem).
- **Third-party open models? YES — but NOT a public per-token API.** Aleph Alpha pivoted (late 2024) away from competing on its own frontier models. **PhariaAI** is an enterprise "AI OS" / orchestration layer that "integrates the leading open-source and proprietary LLMs" — i.e. can run **third-party open weights (Llama 4, Qwen 3.x, DeepSeek V4, etc.)** alongside its Pharia-1 line, via on-prem vLLM / sovereign-hyperscaler / air-gapped clusters. **Not comparable to per-token serverless aggregators.**
- **API:** REST/HTTP (PhariaInference); Python/Rust/JS SDKs. Full OpenAI-compatibility: UNKNOWN. No public free tier; enterprise/sales-gated. Legacy Luminous API no longer actively marketed.
- **Pricing:** **Enterprise / contact-sales, not transparent per-token.** Third-party aggregator figures (~$30/1M, LOW confidence) are likely legacy Luminous, not open models — **do not treat as authoritative**.
- **Recommendation:** Mark as "Enterprise/sovereign — pricing on request, no public per-token API." No price row.
- **Sources:** https://aleph-alpha.com/about-us/ · https://docs.aleph-alpha.com/phariaai-home/latest/index.html · https://docs.aleph-alpha.com/api/ · https://smebusinessreview.com/profiles/cover/how-aleph-alpha-setting-global-benchmarks-sovereign-ai

## 7. Hugging Face — Inference Endpoints — US-HQ, EU-deployable

- **HQ/ownership:** Hugging Face, Inc. — US (NYC). EU-region deployable.
- **EU DC / residency:** **You can pin an EU region**, but it's **opt-in** (select at endpoint creation). Standard self-serve EU region = **AWS eu-west-1 (Ireland)** only; other EU regions (e.g. Frankfurt) on request. Separate HF Hub **EU Storage Regions** for GDPR-compliant model/dataset storage.
- **GDPR/certs:** Endpoints inherit your chosen AWS/Azure/GCP region's residency; TLS in transit. HF-specific SOC 2 / ISO 27001 / C5 / SecNumCloud: not confirmed (UNKNOWN; SOC 2 at enterprise tier).
- **Confidentiality:** Dedicated single-tenant GPU in your account/region; data not pooled; HF does not train on it. No managed ZDR needed (your instance). TEE not standard.
- **API & model:** **GPU-rental, NOT per-token serverless.** Pick a Hub model, deploy to a dedicated GPU, pay **per hour (per-minute billing)** regardless of throughput. OpenAI-compatible API via TGI. **Any open model on the Hub** can be deployed (GLM, Kimi, DeepSeek, MiniMax, Qwen3, Llama 4, gpt-oss-120b, Mistral, Xiaomi MiMo) if it fits the rented GPU.
  - (Note: HF "Inference Providers" is a separate per-token routing product — but the EU-region capability here is the dedicated Endpoints product.)
- **GPU pricing (USD/hr, AWS, confidence HIGH):** T4 0.50 · L4 0.80 · A10G 1.00 · L40S 1.80 · A100 80GB 2.50 · H200 5.00. (GCP H100 10.00, but GCP EU self-serve unconfirmed → EU residency effectively limited to AWS Ireland GPU lineup.)
- **Sources:** https://huggingface.co/docs/inference-endpoints/faq · https://huggingface.co/docs/inference-endpoints/en/pricing · https://huggingface.co/blog/inference-endpoints · https://huggingface.co/docs/hub/storage-regions

## 8. Together AI — US-HQ, EU region available

- **Identity:** Together Computer, Inc. (San Francisco). OpenAI-compatible at `https://api.together.ai/v1`. Serverless per-token + dedicated endpoints + GPU clusters.
- **EU residency (KEY):** **YES via region selection (opt-in).** Data-center page explicitly cites "GDPR for Europe" residency. EU DCs: UK, Spain, France, Portugal, Iceland, **Sweden now live** (serverless + dedicated + clusters). Massive buildout underway (~2 GW; France/UK/Italy/Portugal). **Nuance:** default policy permits cross-border transfer → EU residency is an active choice; clearest path is dedicated endpoints/clusters in an EU region. **Exact mechanism to pin public serverless to EU, and whether self-serve vs enterprise-gated, is UNKNOWN** — confirm with sales. US-HQ → CLOUD Act exposure.
- **GDPR/certs:** **SOC 2 Type II**, HIPAA (BAAs); **EC-approved SCCs**. ISO 27001: not found. Signed DPA: UNKNOWN.
- **Confidentiality:** No training by default (opt-in only); **opt-in ZDR** (forward-only). TEE: not found.
- **Models (serverless, observed):** GLM-5/5.1/5.2; Kimi K2.6, K2.7 Code; DeepSeek V4 Pro; MiniMax M2.5/M2.7/M3; Qwen3.5-397B, Qwen3.7-Plus/Max, Qwen3-235B FP8; gpt-oss-120B; Llama 3.3 70B. Not seen: Llama 4, Qwen3-Coder-480B, Qwen3-Next-80B.
- **Prices (USD/1M):** gpt-oss-120B 0.15/0.60 · DeepSeek V4 Pro 1.74/3.48 · Qwen3-235B FP8 0.20/0.60 · Qwen3.7-Max 1.25/3.75 · Llama 3.3 70B 1.04/1.04 · GLM-5.1 1.40/4.40 · Kimi K2.7 Code 0.95/4.00.
- **Sources:** https://www.together.ai/data-center-locations · https://www.together.ai/blog/together-ai-expands-in-europe · https://www.prnewswire.com/news-releases/together-ai-continues-european-expansion-infrastructure-now-live-and-operational-in-sweden-302545683.html · https://www.together.ai/privacy · https://www.together.ai/blog/soc-2-compliance · https://www.together.ai/pricing

## 9. Fireworks AI — US-HQ, EU dedicated-only

- **Identity:** Fireworks AI (Redwood City, CA). OpenAI-compatible at `https://api.fireworks.ai/inference/v1` (+ Anthropic-compatible endpoint).
- **EU residency (KEY):** **YES, but DEDICATED-DEPLOYMENT ONLY.** Serverless per-token = US regions only (EU serverless is roadmap). EU residency via dedicated/on-demand/BYOC by passing `--region`: `EU_FRANKFURT_1` (H100), `EU_ICELAND_1`/`_2` (H200/B200). Billed per GPU-hour (H100 $7, H200 $7, B200 $10, B300 $12). Azure-via-Fireworks is excluded from EU Data Boundary.
- **GDPR/certs (strongest of the US trio):** SOC 2 Type II, ISO 27001, ISO 27701, HIPAA, GDPR, CCPA, PCI; DPA / SCCs available.
- **Confidentiality:** ZDR (no logging for open models without opt-in); no training (BYOB); TLS 1.2+/AES-256. TEE: not found.
- **Models (serverless):** GLM 5.2/5.1/4.6; Kimi K2.7 Code, K2.6; DeepSeek V4 Pro/Flash, V3.2/V3.1/R1; MiniMax M3/M2.5; Qwen 3.7/3.6 Plus, Qwen3-Coder-480B/30B/Next, Qwen3-235B; gpt-oss-120b/20b; Llama family.
- **Prices (USD/1M):** DeepSeek V4 Pro 1.74/3.48 · DeepSeek V4 Flash 0.14/0.28 · Qwen 3.7 Plus 0.40/1.60 · gpt-oss-120b 0.15/0.60 · gpt-oss-20b 0.07/0.30 · Kimi K2.7 Code 0.95/4.00 · GLM 5.2 1.40/4.40 · MiniMax M3 0.30/1.20.
- **Sources:** https://docs.fireworks.ai/deployments/regions · https://docs.fireworks.ai/guides/ondemand-deployments · https://trust.fireworks.ai/ · https://docs.fireworks.ai/serverless/pricing · https://app.fireworks.ai/models

## 10. DeepInfra — US-HQ, NO EU residency

- **Identity:** Deep Infra, Inc. (Palo Alto, CA); $107M Series B (~2026-05). OpenAI-compatible at `https://api.deepinfra.com/v1/openai`. Serverless per-token + dedicated GPU.
- **EU residency (KEY): ABSENT.** Privacy policy verbatim: "Your data may be transferred, stored, and processed outside of your jurisdiction, specifically in the United States." ~8 US DCs; no EU commitment. **Fails any EU-residency requirement today** (high confidence).
- **GDPR/certs:** ISO 27001 (compliant); SOC 2 (Type I/II unclear); HIPAA; **GDPR "in progress" — NOT certified**; EU DPA/SCCs not found. (trust.deepinfra.com CDN-blocked to automation — verify manually.)
- **Confidentiality:** ZDR; no training without consent; data deleted 30 days after account deletion. TEE: not found.
- **Models (serverless — broadest catalog):** GLM-5.2/5.1/5; Kimi K2.5/K2.6/K2.7-Code; DeepSeek V4 Pro/Flash, V3.2, R1-0528; MiniMax M2.5/M2.7-Turbo; Qwen3-Max/3.7-Max/3.5-397B, Qwen3-Coder-480B, Qwen3-235B; Llama 4 Maverick & Scout; gpt-oss-120b.
- **Prices (USD/1M — generally cheapest):** DeepSeek V4 Pro 1.30/2.60 · DeepSeek V3.2 0.26/0.38 · DeepSeek R1-0528 0.50/2.15 · Qwen3-Coder-480B 0.30/1.00 · Qwen3-235B 0.09/0.10 · Llama 4 Maverick 0.15/0.60 · Llama 4 Scout 0.10/0.30 · gpt-oss-120b 0.039/0.19 · GLM-5.2 1.40/4.40 · Kimi K2.6 0.75/3.50.
- **Sources:** https://deepinfra.com/privacy · https://deepinfra.com/ · https://deepinfra.com/models · https://deepinfra.com/pricing

## 11. Nscale — UK / Norway

- **HQ/ownership:** London (UK); Norwegian entity NSCALE GLOMFJORD AS. EU DCs: Norway (Glomfjord), Iceland, UK, Portugal (+US).
- **Residency:** Positioned "EU Sovereign" (per LiteLLM). Per-request region-pinning guarantee: UNKNOWN.
- **Certs:** ISO 27001 / SOC 2 / C5 / SecNumCloud: **NONE FOUND** (no trust center located).
- **Confidentiality:** Explicit **zero-retention + no-training** ("We never log, repurpose or train on your request or response content"). TEE: UNKNOWN.
- **API:** Serverless, OpenAI-compatible. Base `https://inference.api.nscale.com/v1`. Native LiteLLM provider. Also GPU rental.
- **Models:** gpt-oss-120b/20b, Qwen3-235B-A22B (+2507), Llama 4 Scout 17B, DeepSeek-R1 **distills only** (Llama-8B, Qwen-14B), Mixtral 8x22B, FLUX/SDXL. NOT found: GLM, Kimi K2, full DeepSeek V3/V3.2/R1.
- **Prices (USD/1M):** gpt-oss-120b 0.10/0.40 · Qwen3-235B 0.20/0.60 · Llama 4 Scout 0.09/0.29 · gpt-oss-20b 0.05/0.20.
- **Sources:** https://www.nscale.com/product/serverless · https://docs.nscale.com/docs/ai-services/models · https://docs.litellm.ai/docs/providers/nscale

---

# Additional EU-native serverless per-token providers (discovered)

These are NOT in the original brief but DO offer serverless per-token OpenAI-compatible APIs with EU residency — strong comparison candidates, several with better frontier-model coverage than the "sovereign trio."

- **Inceptron** (Lund, Sweden) ✅ — `https://api.inceptron.io/v1`, ISO 27001, **zero-retention, no training**. Serves **GLM 5.1, Kimi K2.6, MiniMax M2.5**, Llama 3.3 70B, Qwen, DeepSeek. Kimi K2.6 $0.80/$3.50; GLM 5.1 $1.40/$4.40; cheapest model from $0.28/1M. **Best EU match for GLM + Kimi.** Sources: https://www.inceptron.io/models · https://www.requesty.ai/models/inceptron · https://openrouter.ai/provider/inceptron
- **Infercom** (Luxembourg; DC Munich) ✅ — OpenAI-compatible, EUR-priced. Serves gpt-oss-120b, **DeepSeek V3.1 & V3.2**, Llama 3.3 70B, MiniMax. gpt-oss-120b €0.22/€0.59; DeepSeek V3.2 €3.00/€4.50.
- **Regolo.ai / Seeweb** (Italy) ✅ — `https://api.regolo.ai/v1`, deep certs (ISO 27001/27017/27018, CSA STAR, CISPE). gpt-oss-120b/20b, Qwen3.5, Llama 3.3 70B. gpt-oss-120b €1.00/€4.20.
- **Tensorix** (Ireland; DCs Dublin/Helsinki) ✅ — OpenAI-compatible, zero-retention, 50+ models incl. DeepSeek V3, Qwen, Mistral. From $0.15/1M.
- **LLMBase** (Germany; DCs DE/FI/CH/NL) ✅ — OpenAI-compatible, "no data leaves the EU," 30+ models. From $0.20/1M (per-model UNKNOWN; site 403'd).
- **Nordference** (Estonia) ✅ — `https://api.nordference.ai/v1`, ISO 27001 + SOC 2 II + NIS2, zero-retention. 10+ OSS models (roster mostly UNKNOWN).
- **GreenPT** (NL, hosted on Scaleway/Paris) ✅ OpenAI-compatible — gpt-oss-120b, Mistral Small 3.2; per-token price UNKNOWN.
- **Alplink** (Estonian entity; DE + FI DCs) — EU-sovereign managed hosting for open-source apps; per-token catalog UNKNOWN, verify.
- **EUrouter** (eurouter.ai) — aggregator routing ~11 EU providers; useful discovery map, not itself a host.
- **Watchlist:** Lyceum (Berlin — per-token billing "in development"); Apertus.ai (small catalog).

---

# GPU-rental / managed-endpoint EU clouds (NOT per-token — no per-1M-token row)

| Provider | HQ | Model | Why not per-token | Certs |
|---|---|---|---|---|
| **DataCrunch / Verda** | Finland | GPU rental + self-deploy vLLM/SGLang; managed turnkey only for image/video/audio | No public token-priced LLM catalog (LLM = private TGI endpoint or self-host) | SOC 2 II, ISO 27001/17/18/27701 |
| **Exoscale** | Switzerland (A1 Digital) | "Dedicated Inference" = managed GPU endpoint, per-GPU-second + storage | Per-GPU-time, not per-token; bring any HF model | ISO 27001/17/18, SOC 2 II, **BSI C5**, HDS, TISAX, CSA STAR |
| **Genesis Cloud** | Germany (unconfirmed) | GPU rental + thin **beta** per-token API (`https://inference-api.genesiscloud.com/openai/v1`) | Beta; only DeepSeek-V3-0324 confirmed; live model list Cloudflare-blocked | ISO 27001 (facilities) |
| **Fluidstack** | UK (→NYC) | Large-scale GPU compute only | No chat/completions endpoint, no catalog; EU DCs weak/unknown | ISO 27001, SOC 2 II (secondary sources) |
| **Leafcloud** | Netherlands | GPU VMs / OpenStack; self-host vLLM | No managed catalog / token billing | ISO 27001, SOC 2 II (2025); no US parent (outside CLOUD Act) |

GPU $/hr indicative: Verda H100 ~$1.99, B200 ~$2.95–3.99 · Exoscale RTX Pro 6000 ~€2.15 · Leafcloud A100 80GB €2.15, H100 €3.45 · Genesis ~$0.08–$2.80.

Sources: https://verda.com/managed-endpoints · https://docs.verda.com/inference/language-models · https://www.exoscale.com/ai-cloud-infrastructure/dedicated-inference · https://www.exoscale.com/compliance · https://developers.genesiscloud.com/inference-service-api · https://leaf.cloud/products/gpu · https://leaf.cloud/pricing · https://docs.fluidstack.io

---

# Caveats & items to re-verify before publishing

1. **Nebius rebrand** → use "Token Factory" / `api.tokenfactory.nebius.com`; prices aggregator-sourced (SPA blocked), confidence MEDIUM. Yandex heritage = sovereignty flag.
2. **Scaleway prices** SPA-extracted; minimax-m2.5 & mistral-large-3 missing.
3. **SecNumCloud:** OVHcloud holds it (not confirmed for AI Endpoints); Scaleway in-progress (not yet confirmed achieved).
4. **C5 (IONOS):** confirmed for core cloud; AI Model Hub scope unconfirmed.
5. **Confidential compute / TEE:** NOT a GA feature at any EU platform here (Nebius PoC only).
6. **Mistral Large 3 = $0.50/$1.50** (not the old Large 2 $2/$6).
7. **Aleph Alpha–Cohere merger** (Apr 2026): single-source, verify; Aleph Alpha = enterprise platform, no per-token price row.
8. **Together** self-serve EU serverless mechanism unconfirmed; **DeepInfra** SOC 2 type & EU DPA unconfirmed (and no EU residency).
9. **Xiaomi MiMo-V2.5-Pro:** served by none of the EU providers researched.
10. **GLM 5.x / Kimi K2.x / DeepSeek V4:** EU-residency per-token options = Nebius, Inceptron (GLM+Kimi), Infercom (DeepSeek), plus US-HQ Together/Fireworks (with EU caveats).
11. **Genesis Cloud** live model list & prices Cloudflare-blocked from this environment — verify from an EU IP.
