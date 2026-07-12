# EU Data Residency / GDPR Inference — OpenRouter Provider Audit

**Research date:** 2026-06-18
**Scope:** OpenRouter's inference-provider roster, audited for European data residency / GDPR-compliant inference of top open-weight LLMs, for the model-price-comparison app.
**Method:** WebSearch + WebFetch across provider websites, docs, trust/security/compliance pages, and OpenRouter provider pages (`openrouter.ai/provider/<slug>`). Unverifiable items are marked **unknown** — not fabricated.

> **Application policy overlay (2026-07-12):** The physical-residency audit below is unchanged. This
> company separately treats Azure Direct Global DeepSeek V4 Pro and Kimi K2.7 Code as EU-hosted
> equivalents for its product filter. Global inference may occur outside the EU; Fireworks alternatives remain excluded.

> **Verdict legend:** `EU-HQ` = EU/EEA-headquartered · `EU-region` = EU residency/region pinning available (may be enterprise/dedicated only) · `NON-EU` = no EU option (exclude for residency) · `strong-conf` = strong confidentiality (ZDR / no-train / TEE) even if not EU.

> **Caveat that applies broadly:** for many US-HQ providers, EU residency requires a *dedicated/enterprise* deployment (not the cheap self-serve serverless API), and US-parent companies remain exposed to the US CLOUD Act even when servers sit in the EU. "EU AI Act readiness" was claimed by almost none and is `unknown` for nearly all. Confirm any "EU-residency guaranteed" label contractually (DPA / sales) before relying on it.

---

## Summary table

| Provider | HQ | EU residency? | GDPR / certs | Confidentiality | Open models served | Sample price ($/1M in→out) | Verdict |
|---|---|---|---|---|---|---|---|
| **Mistral** | 🇫🇷 France | **EU by default** (api.mistral.ai = Paris) | ISO 27001/27701, SOC 2 II, DPA(SCC) | No-train; ZDR (Scale plan, stateless) | **Own only** (Large 3 / Medium 3.5 / Magistral / Small 4) | Large 3 0.50→1.50 | **EU-HQ** (closed catalog) |
| **Nebius** (Token Factory) | 🇳🇱 Netherlands | **EU DCs** (Finland+France); per-model region in console | ISO 27001/27701, SOC 2 II, DPA(SCC)+DPF, NIS2/DORA | **ZDR opt-in**, no-train | GLM 5.1, Kimi K2.5/6, DeepSeek V4 Pro/V3.2, MiniMax M2.5, Qwen3 235B/Next-80B, gpt-oss-120b | DeepSeek V3 0.50→1.50 | **EU-HQ + EU-region + strong-conf — top broad-catalog EU fit** |
| **Nscale** | 🇬🇧 UK | **Owned EU/Nordic DCs** (NO/IS/PT/UK) | unknown (confirm via sales) | No-log + no-train serverless | Qwen3 235B, Llama 4 Scout, gpt-oss-120b, DeepSeek R1 distills, Mistral Devstral | gpt-oss-120b 0.10→0.40 | **EU-HQ + EU-region** (smaller Western roster; certs unverified) |
| **NextBit** (NEXTBIT 256, S.L.) | 🇪🇸 Spain | **Owns EU DC**; EU-resident endpoints | unknown (confirm) | Explicit no-training | DeepSeek V4 Pro, Qwen3.5, gpt-oss, Mistral, Gemma (no GLM/Kimi/MiniMax) | gpt-oss-20b ~0.029→0.14 | **EU-HQ** (verify per-endpoint EU marking) |
| **Inceptron** (Inceptron AB) | 🇸🇪 Sweden | likely (EU company; DC unconfirmed) | unknown | no ZDR statement found | Kimi K2.6, GLM 5.1, MiniMax M2.5 | unknown | **EU-HQ** (best small-EU candidate; confirm DC+ZDR) |
| **Amazon Bedrock** | 🇺🇸 US | **EU regions + EU CRIS pinning**; ESC (Nova-only) | AWS DPA+SCC, ISO 27001, SOC 1/2/3, C5 | ZDR (`data_retention_mode: none`, IAM-enforced), no-train | GLM, Kimi, DeepSeek V3.x/R1, MiniMax, Qwen3, Llama 4 M/S, Mistral Large 3, gpt-oss | DeepSeek V3.2 0.62→1.85 | **EU-region + strong-conf — best self-serve hyperscaler EU pin** |
| **Azure AI Foundry** | 🇺🇸 US | **Data Zone (EU)** deploy type + EUDB; two Direct Global offers are company-policy equivalents only | ISO 27001/42001, SOC 1/2/3, C5, MS DPA+SCC | No-train; ZDR via Limited Access only | EU Data Zone: **Mistral-Large-3**; Direct Global DeepSeek V4 Pro/Kimi K2.7 Code remain technically Global | Mistral-Large-3 0.50→1.50 | **EU-region** plus a non-residency policy overlay |
| **Cloudflare** (Workers AI) | 🇺🇸 US | EU via **Custom Regions** (Enterprise; GPU-pin needs sales confirm) | ISO 27001/27701/27018, SOC 2 II, C5, EU CoC, DPA+SCC+DPF | No-train; zero default retention | GLM 5.2, Kimi K2.x, DeepSeek V4 Flash/R1-distill, Qwen3-30B, Llama 4 Scout, Mistral Small, gpt-oss | DeepSeek V4 Flash ~0.10→0.20 | **EU-region** (verify compute pinning, not just TLS/L7) |
| **Together AI** | 🇺🇸 US | EU via **dedicated/cluster** (not serverless) | ISO 27001, SOC 2 II, DPA+SCC+UK | ZDR/no-train not stated for serverless | GLM 5.1/5.2, Kimi K2.6/7, DeepSeek V4 Pro, MiniMax M2.7/M3, gpt-oss | DeepSeek V4 Pro ~2.10→4.40 | **EU-region (dedicated only)** |
| **Fireworks AI** | 🇺🇸 US | EU via **dedicated `eu-west-1`** (Ireland) only | ISO 27001/27701/42001, SOC 2 II, HIPAA | **ZDR default for open models**, no-train | GLM 5.1/5.2, Kimi K2.6/7, DeepSeek V4 Pro/R1, MiniMax M2.7/M3, Qwen3 Coder-480B/235B, gpt-oss, Mistral Large 3 | GLM 5.1/5.2 1.40→4.40 | **EU-region (dedicated only) + strong-conf** |
| **Parasail** | 🇺🇸 US | EU via **dedicated endpoint** + SCCs | SOC 2, SCC (ISO/DPA unknown) | ZDR + no-train (serverless) | GLM 5.2/5.1, Kimi K2.7/6, MiniMax M3/M2.5, Qwen3 235B/Next-80B/Coder, Llama 4 Maverick, DeepSeek V4 Pro, gpt-oss | gpt-oss-120b 0.10→0.75 | **EU-region (dedicated) + strong-conf** |
| **Baseten** | 🇺🇸 US | EU **regional env** (dedicated; contact support) | SOC 2 II/3, HIPAA, DPA+SCC (no ISO) | Effective ZDR; no-train implied | GLM 5.x, Kimi K2.5/6/7, DeepSeek V4 Pro, gpt-oss, Nemotron | GLM 5.2 1.50 in | **EU-region (dedicated)** |
| **Groq** | 🇺🇸 US | Helsinki DC (enterprise/private; default storage US-GCP) | ISO 27001, SOC 2 II, DPA+SCC | **ZDR all customers**; no-train not explicit | gpt-oss-120b, Llama 4 Scout, Qwen3-32B, Kimi K2 (old) | gpt-oss-120b 0.15→0.60 | **EU-region (enterprise only)** |
| **SambaNova** | 🇺🇸 US | EU **only via Infercom partner** (Munich, DE) | Infercom: GDPR+AI Act; SambaNova own: unknown | Infercom: confirmed ZDR | DeepSeek V3.2, MiniMax M2.7, gpt-oss-120b, Llama 3.3 | gpt-oss-120b 0.22→0.59 | **EU-region (separate Infercom product/endpoint)** |
| **Cohere** | 🇨🇦 Canada | **Yes** (private VPC / EU cloud regions) | ISO 27001/42001, SOC 2 II, DPA+SCC+TIA | **ZDR** (enterprise), no-train | **Own only** (Command A/R/R+, Rerank) | Command A 2.50→10 | **EU-region + strong-conf** (own-models only) |
| **Nvidia NIM** | 🇺🇸 US | **Yes via self-hosted NIM** on EU infra; DGX Lepton EU providers | Self-host = customer-controlled (EULA/DPA) | **TEE** (H100/H200 confidential GPU), self-host residency | GLM 5.1, DeepSeek V4, MiniMax M2.7, Qwen3-Coder-480B, Llama 4 Maverick, Mistral Large 3 | self-host (AI Enterprise ~$4.5k/GPU/yr) | **EU-region (self-host) + strong-conf** (hosted build.nvidia.com disclaims GDPR data) |
| **Chutes** | unknown (decentralized; Rayon Labs) | EU hosting regions exist; **LLM-API pin unverified** | self-claim GDPR; no ISO/SOC2 found | **TEE** (Intel TDX + NVIDIA CC), optional E2EE, effective ZDR/no-train | GLM 5.1/5, Kimi K2.5/6, MiniMax M2.5, Qwen3.5/3.6, Gemma 4 (broader likely) | unknown (sub tiers $10/$20-mo) | **EU-region (unverified) + strong-conf** |
| **Phala / RedPill** | ambiguous (US/SG, decentralized) | **None** (US/India TEE nodes) | SOC 2 I (Trust Center); RedPill marketing claims more (unverified) | **Best-in-class TEE** (Intel TDX + NVIDIA confidential GPU, dual attestation) | GLM 5.1, Kimi K2.5/6, DeepSeek V3/R1, MiniMax M2.5, Qwen3, gpt-oss | gpt-oss-120b 0.15→0.60 | **NON-EU + strong-conf** (no EU node) |
| **Venice AI** | 🇺🇸 US | **None** (by design) | None published | **ZDR default**, no-train; some routed models reference NEAR/Phala, but no provider-wide attested TEE guarantee | GLM 5.1/5.2, Kimi K2.5/6/7, DeepSeek V4 Pro/V3.2, MiniMax M2.5/M2.7/M3, Qwen3 Coder-480B/235B/Next-80B, gpt-oss, MiMo | Kimi K2.6 ~0.85→4.66 | **NON-EU + privacy-first** (broad catalog; current offers not marked TEE) |
| **DeepInfra** | 🇺🇸 US | None (US DCs only) | SOC 2 I, ISO 27001 (Trust Center 403'd) | **ZDR default**, no-train | Broadest: GLM 5.1/5.2, Kimi K2.5/6/7, DeepSeek V4 Pro/V3.2/R1, MiniMax M2.5/7, Qwen3 all, Llama 4 M/S, gpt-oss, MiMo | gpt-oss-120b 0.039→0.19 | **NON-EU + strong-conf** |
| **Cerebras** | 🇺🇸 US | Emerging (France DC ~Q4'25; self-pin unconfirmed) | SOC 2 II, GDPR, DPA (no ISO) | No-train, default-ish ZDR | Qwen3-Coder-480B/235B, gpt-oss-120b, GLM-4.7, Llama 4 Maverick | gpt-oss-120b ~0.39 | **NON-EU (watchlist: France DC)** |
| **DigitalOcean** (Gradient) | 🇺🇸 US | **None for inference** (EU on roadmap); has EU DCs for other products | SOC 2 II/3, ISO 27001 (facilities), DPA+SCC | ZDR sync, no-train | GLM 5, Kimi K2.5/6, DeepSeek V4 Pro/Flash/V3.2, MiniMax M2.5, Llama 4 Maverick, gpt-oss, **MiMo V2.5/Pro** | GLM 5 1.00→3.20 | **NON-EU (inference)** |
| **Friendli** | 🇺🇸 US (Korean origin) | Not documented (contact sales) | SOC 2 II, HIPAA, DPA (SCC unclear) | **ZDR default**, no-train | GLM 5.2/5.1, Kimi K2.7/6, DeepSeek V4 Pro/V3.2/R1, MiniMax M2.5, Qwen3-235B, Magistral-Small | DeepSeek V3.2 0.50→1.50 | **NON-EU + strong-conf** |
| **WandB Inference** | 🇺🇸 US (CoreWeave) | None for serverless inference (US-GCP); Dedicated Cloud ≠ inference | ISO 27001/27017/27018, SOC 2 II, HIPAA, DPA+SCC | unknown (likely zero-retention, unconfirmed) | GLM 5.1, Kimi K2.5/6/7, DeepSeek V4 Pro/Flash, MiniMax M2.5, Qwen3 Coder-480B/235B, Llama 4 Scout, gpt-oss | Qwen3-Coder-480B ~1.00→1.50 | **NON-EU** (strong certs but US-only inference) |
| **Clarifai** | 🇺🇸 US | No turnkey EU (self-managed only); **Nebius acquired core team 2026-05** | ISO 27001, SOC 2 II, DPA+SCC | No-train; ZDR not default | Qwen3 (small), DeepSeek V3.1/3.2/distills, Kimi K2.5/6, gpt-oss, Mistral | ~0.045→0.15 (one OR model) | **NON-EU (borderline; in flux)** |
| **AI21** | 🇮🇱 Israel | EU only via AWS Bedrock EU | ISO 27001/27017/27018, SOC 2 | unknown | **Own only** (Jamba) | Jamba Large 1.7 ~2→8 | **NON-EU (own-models)** |
| **Alibaba** (Qwen/DashScope) | 🇨🇳 China | **YES — Frankfurt `eu-central-1`** but EU mode = Qwen-Plus/Flash/VL only (no open-weights) | GDPR Addendum + SCC; ZDR SLA unverified | No-train + no-retention stated | EU mode: NOT the flagship open weights | Qwen-Plus 0.40→1.20 | **EU-region (catalog restricted)** |
| **Novita** | 🇺🇸 US | None | SOC 2, SCC+DPF | No-train; no ZDR default | Large aggregator (GLM/Kimi/DeepSeek/MiniMax/Qwen3/Llama4/gpt-oss) | unknown | **NON-EU** |
| **GMICloud** | 🇺🇸 US/APAC | "Europe" claimed, unverified | SOC 2, ISO 27001 | unknown | DeepSeek V4 Pro/Flash, GLM 5.1/5, Qwen3.5-397B | DeepSeek V4 Pro 1.13→2.26 | **NON-EU (sales inquiry worthwhile)** |
| **AtlasCloud** | 🇺🇸 US (NY) | None (explicitly US-hosted) | SOC 1/2, HIPAA | unknown | GLM 5.x, Kimi K2.x, DeepSeek V4/R1/V3.2, MiniMax M2.x/M3, Qwen3.6, gpt-oss | DeepSeek V3.2 0.26→0.38 | **NON-EU** |
| **SiliconFlow** | 🇸🇬/🇨🇳 SG/China | None | None (PDPA only) | "no data stored" marketing; no contractual ZDR | DeepSeek V4/V3.2/R1, Qwen3.x | DeepSeek V3.2 0.259→0.42 | **NON-EU** |
| **Io Net** | unknown (DePIN) | **None** (global third-party nodes) | None published | TEE product (separate); std API no ZDR | DeepSeek R1, Llama 3.3, Mistral-Large-2411, Qwen2.5 | unknown | **NON-EU red flag** |
| **AkashML** | 🇺🇸 US (DePIN) | **None** (global third-party nodes) | None published | Weak/unknown | Kimi K2.7, DeepSeek V4 Flash, MiniMax M2.5, Qwen3.6, Llama 3.3 | Llama 3.3 70B 0.13→0.40 | **NON-EU red flag** |
| **Upstage** | 🇰🇷 South Korea | On-prem only | ISO 27001/27701, SOC 2 I, HIPAA | No-store sync API (carve-outs) | **Own only** (Solar) | Solar Pro 3 0.15→0.60 | **NON-EU (own-models)** |
| **Baidu** (ERNIE/Qianfan) | 🇨🇳 China | None | unknown | no ZDR | Own ERNIE (+ resells DeepSeek/Kimi/GLM) | ERNIE 4.5 Turbo ~0.11→0.44 | **NON-EU** |
| **DeepSeek** (1st party) | 🇨🇳 China | None | unknown | **trains on inputs** (app opt-out only) | Own V4 Pro/Flash | V4 Flash 0.14→0.28 | **NON-EU** |
| **Moonshot AI** (Kimi) | 🇨🇳 China (intl SG) | None (intl API in Singapore) | unknown | **trains by default** | Own Kimi K2.5/6/7 | K2.6 ~0.95→4.00 | **NON-EU** |
| **Z.AI** (Zhipu/GLM) | 🇨🇳 China (intl SG) | None (intl API in Singapore) | unknown | no ZDR; training a listed interest | Own GLM 5.2/5.1/5/4.7/4.6 | GLM-5.2 1.40→4.40 | **NON-EU** |
| **MiniMax** (1st party) | 🇨🇳 China | None (intl personal data US) | unknown | unknown | Own M3/M2.7/M2.5 | M2.5 0.30→1.20 | **NON-EU** |
| **StepFun** | 🇨🇳 China | None (global servers US) | unknown | no ZDR | Own Step-3/3.5/3.7 | Step-3.7 Flash 0.20→1.15 | **NON-EU** |
| **DekaLLM** | 🇮🇩 Indonesia | None (Indonesia sovereign cloud) | unknown | unknown | Resells gpt-oss-120b, Mistral, Gemma, Llama 405B | gpt-oss-120b 0.039→0.18 | **NON-EU** |
| **StreamLake** (Kuaishou) | 🇨🇳 China | None | unknown | unknown | Own KAT-Coder + resale | KAT-Coder-Pro V2 0.30→1.20 | **NON-EU** |
| **Nex AGI** | 🇨🇳 China | None | unknown | unknown | Nex-N2-Pro (Qwen-based), DeepSeek V3.1 | free listings | **NON-EU** |
| **Liquid AI** | 🇺🇸 US | None | unknown | no ZDR (cloud US) | Own LFM2.5 only | n/a | **NON-EU (own-models)** |
| **Reka** | 🇺🇸 US (+UK) | Via self-host/on-prem | unknown | Strong (on-prem) | Own Reka Flash/Edge/Core | n/a | **NON-EU + strong-conf (self-host, own-models)** |
| **Inception** (Mercury) | 🇺🇸 US | None | None published | None published | Own Mercury (diffusion) | n/a | **NON-EU (own-models)** |
| **Ambient** | unknown | unknown | unknown | unknown | Kimi K2.7, GLM 5.1 | n/a | **defunct/unknown** |
| **Mara** | 🇺🇸 US | unknown (US; FR via Exaion future?) | unknown | no ZDR confirmed | MiniMax M2.7/2.5, gpt-oss-120b | n/a | **NON-EU** |
| **Morph** | 🇺🇸 US | None | unknown | **ZDR** + self-host | Own Morph V3 (code-apply) | n/a | **NON-EU + strong-conf (own-models)** |
| **Relace** | 🇺🇸 US | None | unknown | **ZDR** | Own Relace Apply/Search | n/a | **NON-EU + strong-conf (own-models)** |
| **Poolside** | 🇺🇸 US (+Paris eng) | **Yes — on-prem/VPC/sovereign + GDPR DPA** | DPA | Very strong (customer infra) | Own Laguna (code) | n/a | **EU-region (self-host) + strong-conf (own-models)** |
| **Perceptron** | 🇺🇸 US | unknown | unknown | unknown | Own vision/robotics (off-target) | n/a | **NON-EU (off-target)** |
| **Switchpoint** | unknown (likely US) | unknown | unknown | claimed, unverified | Meta-router | n/a | **defunct/unknown** |
| **ModelRun** | unknown | unknown | unknown | unknown | **could not confirm exists** | n/a | **defunct/unknown** |
| **OpenInference** | unknown | unknown | unknown | unknown | gpt-oss-120b/20b, Gemma 4 | n/a | **defunct/unknown** |
| **Wafer** | 🇺🇸 US (YC) | None | unverified | "privacy" plan unverified | GLM-5.1, Kimi K2.6, Qwen 3.5 397B | n/a | **NON-EU** |
| **AionLabs** (aionlabs.ai) | unknown | unknown | unknown | unknown | Aion-x (DeepSeek/Llama-derived) | n/a | **defunct/unknown** |
| **Ionstream** | 🇺🇸 US (Texas) | None (US DCs) | unknown | unknown | Qwen3-Coder-Next 80B, Gemma 4 | n/a | **NON-EU** |

*(NVIDIA/OpenAI/Anthropic/Google/Baidu closed first-parties only included where relevant to open-weight serving.)*

---

## Per-provider notes (EU-relevant providers)

### Tier 1 — EU-headquartered

#### Mistral AI — `EU-HQ`, EU-default residency, strong confidentiality (closed catalog)
- **HQ:** Paris, France. Independent, EU-owned.
- **EU pinning:** EU (Paris) **by default** — residency is the baseline. US only if you deliberately call a US endpoint. Just use `api.mistral.ai/v1`; no region param needed.
- **GDPR/certs:** ISO 27001, ISO 27701, SOC 2 Type II. DPA available (SCC Module 4, French law). EU AI Act docs claimed (not independently audited).
- **Confidentiality:** No training on your data (contractual). Default 30-day rolling retention for abuse monitoring. **ZDR available but gated to Scale plan, stateless calls only.** TEE unknown.
- **API:** OpenAI-compatible, `https://api.mistral.ai/v1`.
- **Open models:** **Only Mistral's own** (Large 3, Medium 3.5, Magistral, Small 4). Serves NONE of GLM/Kimi/DeepSeek/MiniMax/Qwen/Llama/gpt-oss/MiMo.
- **Price:** Large 3 $0.50→$1.50; Medium 3.5 $1.50→$7.50; Small 4 $0.15→$0.60; Magistral Small $0.50→$1.50.
- **Sources:** help.mistral.ai, legal.mistral.ai, trust.mistral.ai, openrouter.ai/provider/mistral.

#### Nebius (Token Factory) — `EU-HQ + EU-region + strong-conf` — **best broad-catalog EU fit**
- **HQ:** Nebius Group N.V., Amsterdam, Netherlands; Nasdaq-listed. (Non-Russian remnant of former Yandex N.V.; Russian assets divested July 2024 — now a clean EU/Nasdaq entity.)
- **EU pinning:** Regions = EU (**Finland + France**), Israel, US. Region is a **per-model deployment property** chosen in console — **no documented `region=` API param or EU-only base URL**. Fine-tuning artifacts always stored in EU.
- **GDPR/certs:** "Full GDPR"; DPA embedded in ToS; SCCs + EU-US DPF. ISO 27001:2022, ISO 27701, SOC 2 Type II (incl. HIPAA), Deloitte-audited, scope covers Token Factory. Aligned with NIS2/DORA.
- **Confidentiality:** **ZDR** opt-in toggle. **No training on your data** (explicit). TEE unknown.
- **API:** OpenAI-compatible, `https://api.tokenfactory.nebius.com/v1/` (legacy `api.studio.nebius.com/v1`).
- **Open models:** GLM 5.1, Kimi K2.5/6, DeepSeek V4 Pro/V3.2, MiniMax M2.5, Qwen3 235B + Next-80B, gpt-oss-120b. (GLM 5.2, Kimi K2.7, DeepSeek R1, MiniMax M2.7/M3, Qwen3 Coder-480B, Llama 4, Mistral, MiMo: not confirmed.)
- **Price:** DeepSeek V3 $0.50→$1.50; Qwen3 32B $0.70→$2.80; DeepSeek V4 Pro ~$1.93 blended.
- **Verify:** Exact EU-pinning mechanism is console per-model (no API param / EU base URL) — confirm in console or with support.
- **Sources:** docs.tokenfactory.nebius.com/legal, nebius.com/trust-center, openrouter.ai/provider/nebius.

#### Nscale — `EU-HQ + EU-region` (smaller Western roster)
- **HQ:** London, UK. Founded 2023, backed by Norway's Aker. Centralized GPU cloud (NOT related to Io.net).
- **EU pinning:** Owned/partner DCs in Norway (Glomfjord, Narvik, Stavanger, Oslo), Iceland, Portugal (Sines), UK + US. EU/EEA inference physically achievable; explicit *serverless* EU-region-pin not documented (dedicated compute clearly region-specific).
- **GDPR/certs:** **unknown** — no ISO 27001 / SOC 2 / DPA published on site (plausible given UK/EU domicile; confirm via sales).
- **Confidentiality:** Serverless page states "no request or response data logged or used for training" + tenant isolation → effective ZDR + no-train. TEE unknown.
- **API:** OpenAI-compatible (base URL in console).
- **Open models:** Qwen3 235B, Qwen2.5 Coder, Llama 4 Scout, gpt-oss-120b/20b, DeepSeek R1 distills, Mistral Devstral, Mixtral. NO GLM/Kimi/DeepSeek V4/V3.2/MiniMax/Qwen3-Coder-480B/Llama 4 Maverick.
- **Price:** gpt-oss-120b $0.10→$0.40; Qwen2.5 Coder 32B $0.06→$0.20.
- **Sources:** nscale.com/about, /ai-infrastructure, /product/serverless, datacentermap.com.

#### NextBit (NEXTBIT 256, S.L.) — `EU-HQ`
- **HQ:** Zaragoza, Spain. (Listed among "Chinese providers" by OpenRouter slug but is Spanish.)
- **EU pinning:** Owns an EU data center; EU-resident endpoints. Caveat: uses some third-party cloud nodes that may sit outside the EEA — verify per-endpoint EU marking.
- **GDPR/certs:** unknown (confirm).
- **Confidentiality:** **Explicit no-training** ("not used to train AI models").
- **API:** OpenAI-compatible, `https://api.nextbit256.com/v1`.
- **Open models:** DeepSeek V4 Pro, Qwen3.5, gpt-oss, Mistral, Gemma (no GLM/Kimi/MiniMax). No own foundation model.
- **Price:** gpt-oss-20b ~$0.029→$0.14 (range varies by endpoint).
- **Sources:** nextbit256.com, openrouter.ai listing.

#### Inceptron (Inceptron AB) — `EU-HQ` (best small-EU candidate; confirm DC + ZDR)
- **HQ:** Lund, Sweden.
- **EU pinning:** Likely EU (EU company); specific DC region unconfirmed.
- **GDPR/certs / confidentiality:** No ZDR statement found; certs unknown.
- **Open models:** Kimi K2.6, GLM 5.1, MiniMax M2.5.
- **Sources:** openrouter.ai/provider/inceptron + company registry.

### Tier 2 — Non-EU HQ but real EU residency option

#### Amazon Bedrock — `EU-region + strong-conf` — best self-serve hyperscaler EU pin
- **EU pinning:** Bedrock in eu-central-1 (Frankfurt), eu-west-1 (Ireland), eu-west-3 (Paris), eu-north-1 (Stockholm). Two ways: in-region on-demand, or **EU Cross-Region Inference (CRIS)** — pass an `eu.`-prefixed inference-profile ID (e.g. `eu.amazon.nova-2-lite-v1:0`); requests can only route to EU regions. **AWS European Sovereign Cloud GA 2026-01-15** (Brandenburg, Germany) but Nova-only — not usable for third-party open models yet.
- **GDPR/certs:** Global AWS DPA (Art. 28) + SCCs; ISO 27001, SOC 1/2/3, ISO 27017/27018, C5-Germany, HIPAA.
- **Confidentiality:** `data_retention_mode: none` = true ZDR (IAM/SCP-enforceable); no-train by default; providers never receive your data. Nitro isolation; Nitro Enclaves exist but no native "Bedrock-in-enclave" product.
- **API:** OpenAI-compatible via Bedrock Mantle `https://bedrock-mantle.<region>.api.aws/v1` and `bedrock-runtime.<region>.amazonaws.com/openai/v1`; plus native Converse/InvokeModel.
- **Open models:** GLM (4.7, 5), Kimi K2/K2.5, DeepSeek V3.1/V3.2/R1, MiniMax, Qwen3 Next-80B/Coder, Llama 4 Maverick + Scout, Mistral Large 3, gpt-oss-120b/20b. Per-model EU-region availability table not cleanly verified.
- **Price:** DeepSeek V3.2 $0.62→$1.85 (US East; EU differs slightly).
- **Sources:** docs.aws.amazon.com/bedrock, aws.amazon.com/blogs/machine-learning (EU CRIS), press.aboutamazon.com (ESC GA), openrouter.ai/provider/amazon-bedrock.

#### Azure AI Foundry — `EU-region` (residency gap on top open models)
- **EU pinning:** Deployment-type dependent. **Global Standard/Provisioned = NO EU residency.** **Data Zone (EU)** = inference stays within EU/EFTA (Sweden Central + Germany West Central anchors). **Microsoft EU Data Boundary (EUDB)** in force. Enforce via Azure Policy.
- **Critical caveat:** Most top open models (DeepSeek, Kimi, Llama 4 Maverick) are **Global-Standard-only** → no EU-pinned inference. **Mistral-Large-3 is the standout open model offered with EU Data Zone.**
- **Company-policy exception:** The application admits only Azure Direct Global DeepSeek V4 Pro and Kimi K2.7 Code to its EU filter as legal/business equivalents. Their region remains Global and inference may occur outside the EU; this is not EUDB coverage. Fireworks alternatives remain US/non-EU.
- **GDPR/certs:** ISO 27001/27017/27018, ISO 42001, SOC 1/2/3, C5, HIPAA, FedRAMP; MS DPA + EU SCCs.
- **Confidentiality:** No-train by default; **ZDR only via Modified Abuse Monitoring (Limited Access program)** — application required. Azure Confidential Computing exists but applies to your own managed compute, not shared serverless MaaS.
- **API:** OpenAI-compatible, `https://<resource>.services.ai.azure.com/...`.
- **Price:** DeepSeek-V3.1 ~$1.23→$4.94; Mistral-Large-3 ~$0.50→$1.50.
- **Sources:** learn.microsoft.com/foundry (deployment-types, region-availability, eudb), openrouter.ai/provider/azure.

#### Cloudflare Workers AI — `EU-region` (verify GPU pinning)
- **EU pinning:** **Custom Regions** (Data Localization Suite, Enterprise) supports keeping LLM prompts/responses in an EU region. **Caveat:** docs confirm TLS/L7/Workers run in-region but it is **not explicitly documented that GPU inference compute is pinned EU-only** — confirm contractually. AI Gateway is NOT compatible with Regional Services — route Workers AI directly. No self-serve region param.
- **GDPR/certs:** ISO 27001:2022/27701/27018, SOC 2 II, PCI DSS L1, EU Cloud Code of Conduct, Germany C5:2020, DPA + SCCs + DPF.
- **Confidentiality:** Explicit no-train; zero default retention (nothing stored unless you wire R2/KV/D1). TEE unknown.
- **API:** OpenAI-compatible, `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1`.
- **Open models:** GLM-5.2, Kimi K2.x, DeepSeek V4 Flash + R1-distill-32B, Qwen3-30B, Llama 4 Scout, Mistral Small 3.1, gpt-oss-120b/20b. (No MiniMax/MiMo; no DeepSeek V4 Pro / full R1.)
- **Price:** DeepSeek V4 Flash ~$0.10→$0.20; GLM 5.2 ~$1.40→$4.40.
- **Sources:** developers.cloudflare.com/workers-ai (data-usage, open-ai-compatibility), blog.cloudflare.com/custom-regions, cloudflare.com/trust-hub/gdpr.

#### Together AI — `EU-region (dedicated only)`
- **EU pinning:** 25+ cities incl. UK/ES/FR/PT/IS/IT. **Public serverless ≈ no EU pin** (defaults to North America). EU residency via **dedicated endpoint in an EU AZ or GPU cluster with region selection** (marketed for GDPR/HIPAA). No EU-specific base URL for serverless.
- **GDPR/certs:** SOC 2 II, ISO 27001:2022, HIPAA; DPA with EU SCCs + UK Addendum.
- **Confidentiality:** Explicit ZDR/no-train wording **not found** for serverless (negotiable on enterprise/dedicated). TEE not found.
- **API:** OpenAI-compatible, `https://api.together.xyz/v1`.
- **Open models (serverless):** GLM 5.1/5.2, Kimi K2.6/7, DeepSeek V4 Pro, MiniMax M2.7/M3, gpt-oss-120b/20b, Qwen3.5/3.6/3.7. Qwen3 Coder-480B/235B/Next-80B, Llama 4, Mistral likely dedicated-only.
- **Price:** DeepSeek V4 Pro ~$2.10→$4.40; GLM 5.1 ~$1.40→$4.40; Kimi K2.6 ~$1.20→$4.50; gpt-oss-120b ~$0.15→$0.60.
- **Sources:** together.ai/data-center-locations, /blog/together-ai-expands-in-europe, trust.together.ai, Together DPA PDF.

#### Fireworks AI — `EU-region (dedicated only) + strong-conf`
- **EU pinning:** Serverless = US regions only. EU **only via dedicated/on-demand/BYOC** in **`eu-west-1` (Ireland)**, billed per GPU-hour, custom URL `https://<region-id>.direct.fireworks.ai/v1`. No way to force shared serverless onto EU.
- **GDPR/certs:** ISO 27001, ISO 27701, ISO 42001, SOC 2 II, HIPAA. GDPR/CCPA mapped controls. DPA/SCC text not confirmed.
- **Confidentiality:** **ZDR for open models by default**; no training on your data; TLS 1.2+/AES-256. TEE unknown.
- **API:** OpenAI-compatible, `https://api.fireworks.ai/inference/v1`.
- **Open models (serverless):** GLM 5.1/5.2, Kimi K2.6/7, DeepSeek V4 Pro/Flash + R1, MiniMax M2.7/M3, Qwen3 Coder-480B + 235B, gpt-oss-120b, Mistral Large 3.
- **Price:** GLM 5.1/5.2 $1.40→$4.40; DeepSeek V4 Pro $1.74→$3.48; gpt-oss-120b $0.15→$0.60. Cached input −50%, batch −50%.
- **Sources:** docs.fireworks.ai/guides/security_compliance, /serverless/pricing, fireworks.ai/models, openrouter.ai/provider/fireworks.

#### Parasail — `EU-region (dedicated) + strong-conf`
- **HQ:** San Mateo / SF, US. Orchestrates GPU across 25+ clouds / 15+ countries.
- **EU pinning:** Privacy policy confirms EU processing possible; EU endpoint referenced in a customer testimonial. EU placement via **Dedicated / Dedicated-Serverless endpoints** (likely sales-assisted); no documented self-serve EU pin on shared serverless.
- **GDPR/certs:** SOC 2 badge; SCCs in privacy policy. ISO 27001/HIPAA/standalone DPA unknown.
- **Confidentiality:** Explicit no-train; serverless+dedicated "do not store or log any personal data" → effective ZDR (batch API differs, ~30d). TEE unknown.
- **API:** OpenAI-compatible, `https://api.parasail.io/v1`.
- **Open models:** GLM 5.2/5.1/5, Kimi K2.7/6, MiniMax M3/M2.5, Qwen3 Coder Next/235B/Next-80B, Llama 4 Maverick, gpt-oss-120b/20b, Mistral Small 3.2, DeepSeek V4 Pro/Flash.
- **Price:** gpt-oss-120b $0.10→$0.75; GLM 5.2 $1.40→$4.40; Kimi K2.6 $0.75→$3.50; DeepSeek V4 Pro $1.74→$3.48.
- **Sources:** parasail.io/about-us, /legal/privacy-policy, openrouter.ai/provider/parasail.

#### Baseten — `EU-region (dedicated)`
- **EU pinning:** Regional environments support US/EU/UK/AU; traffic routes only to the designated region. **Not self-serve** — create env with region-named subdomain, contact support to set the restriction, then call `https://model-{id}-{env}.api.baseten.co/predict`. Documented for **dedicated**; whether shared Model APIs (`inference.baseten.co`) honor EU pinning is **unknown** — assume dedicated for guaranteed residency.
- **GDPR/certs:** SOC 2 II/3, HIPAA, PCI; GDPR + DPA (covers SCCs). **ISO 27001 NOT held.**
- **Confidentiality:** Effectively ZDR (outputs never stored, inputs not stored except temporary async buffering); no explicit no-train statement (implied; verify in DPA). TEE not mentioned.
- **API:** OpenAI-compatible, `https://inference.baseten.co/v1`; Anthropic Messages in beta.
- **Open models:** GLM 5.x, Kimi K2.5/6/7, DeepSeek V4 Pro, gpt-oss-120b, Nemotron 3.
- **Price:** GLM 5.2 $1.50 in; Kimi K2.6 $0.95 in; DeepSeek V4 $1.74 in; gpt-oss-120b $0.10 in (output prices look oddly low — verify).
- **Sources:** docs.baseten.co (regional-environments, model-apis), trust.baseten.co, openrouter.ai/provider/baseten.

#### Groq — `EU-region (enterprise only)`
- **EU pinning:** First EU DC in **Helsinki, Finland** (Equinix, mid-2025) with private Fabric connectivity. **But** standard docs still say retained data is stored in **Google Cloud US buckets** — EU residency appears to be an **enterprise/private-connectivity arrangement, not a self-serve region param** on public `api.groq.com`.
- **GDPR/certs:** SOC 2 II, ISO 27001, HIPAA; DPA with EU SCCs (Irish law).
- **Confidentiality:** **ZDR available to ALL customers** via Data Controls (also stops ≤30-day abuse logging). No-train not explicitly stated. TEE unknown.
- **API:** OpenAI-compatible, `https://api.groq.com/openai/v1`.
- **Open models:** gpt-oss-120b/20b, Llama 4 Scout, Qwen3-32B/3.6-27B, Kimi K2-Instruct (older), MiniMax M2.5 (enterprise). NO GLM 5.x, Kimi K2.5+, full DeepSeek, Qwen3-Coder/235B/Next-80B, Mistral, MiMo.
- **Price:** gpt-oss-120b $0.15→$0.60; Llama 4 Scout $0.11→$0.34.
- **Sources:** groq.com/newsroom (Helsinki), console.groq.com/docs (your-data, DPA, models), trust.groq.com.

#### SambaNova — `EU-region (separate Infercom product)`
- **EU pinning:** SambaNova Cloud is US-based, no EU region. EU residency via separate partner **Infercom** ("Europe's first sovereign IaaS," powered by SambaManaged) — **Luxembourg-domiciled, hosted in Germany (Equinix Munich)**, ~Nov 2025, "data never leaves the EU." Distinct endpoint **`https://api.infercom.ai/v1`**.
- **GDPR/certs:** Infercom: explicitly GDPR + EU AI Act, "no US CLOUD Act exposure." SambaNova corporate ISO/SOC2/DPA unknown.
- **Confidentiality:** Infercom: confirmed ZDR (no store/log/train).
- **API:** OpenAI-compatible. Cloud `https://api.sambanova.ai/v1`; Infercom EU `https://api.infercom.ai/v1`.
- **Open models:** SambaNova Cloud: DeepSeek V3.2/V3.1, MiniMax M2.7, gpt-oss-120b, Llama 3.3 70B, Gemma 4. Infercom EU is an even smaller subset (MiniMax-M2.7, gpt-oss-120b, Gemma/DeepSeek).
- **Price:** gpt-oss-120b $0.22→$0.59; MiniMax-M2.7 $0.60→$2.40. Infercom EU pricing unknown.
- **Sources:** sambanova.ai/solutions/infercom, infercom.ai/sovereign-ai, docs.sambanova.ai, openrouter.ai/provider/sambanova.

#### Cohere — `EU-region + strong-conf` (own models only)
- **EU pinning:** Hosted first-party API runs on GCP US-Central. EU residency via (a) **private deployments** in customer VPC/on-prem ("Model Vault" — Cohere receives no prompts), or (b) **AWS/Azure/GCP/OCI EU regions** in your own account.
- **GDPR/certs:** ISO 27001, **ISO 42001**, SOC 2 II; DPA + SCCs + documented Transfer Impact Assessment.
- **Confidentiality:** **ZDR** for approved enterprise; no-train opt-out; private/cloud deploys send no data to Cohere.
- **API:** Native `https://api.cohere.com/v2`; OpenAI-compat `https://api.cohere.ai/compatibility/v1`.
- **Open models:** None of the target list — **own Command A / R / R+ / R7B, Rerank, North**.
- **Price:** Command A $2.50→$10; Command R $0.15→$0.60.
- **Sources:** trustcenter.cohere.com, cohere.com/enterprise-data-commitments, /security.

#### Nvidia NIM — `EU-region (self-host) + strong-conf`
- **EU pinning (3 modes):** (A) hosted `build.nvidia.com` = US-managed, trial ToS disclaims GDPR data → don't send personal data. (B) **self-hosted NIM containers** on EU infra you control = full data residency, OpenAI-compatible `/v1/chat/completions`; can run on **NVIDIA Confidential Computing GPUs (H100/H200/Blackwell)** = hardware TEE. (C) DGX Cloud Lepton marketplace aggregates EU providers (Mistral, Nebius, Nscale, Scaleway, Fluidstack) — pin by selecting an EU provider.
- **GDPR/certs:** Self-host = customer-controlled (NVIDIA = software licensor under AI Enterprise EULA/DPA).
- **Open models:** GLM 5.1, DeepSeek V4/Flash, MiniMax M2.7, Qwen3-Coder-480B, Llama 4 Maverick, Mistral Large 3 / Nemotron (catalog volatile).
- **Price:** hosted free trial; self-host via NVIDIA AI Enterprise ~$4,500/GPU/yr (no per-token).
- **Sources:** developer.nvidia.com/confidential-computing-on-h100, nvidianews (DGX Cloud Lepton Europe), build.nvidia.com/models.

#### Alibaba (Qwen / Model Studio / DashScope) — `EU-region (catalog restricted)`
- **EU pinning:** **Frankfurt `eu-central-1`** real EU-pinned mode since 2026-03-20, EU endpoint `https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/compatible-mode/v1`. **But EU mode = Qwen-Plus/Flash/VL only — NOT the flagship open weights** (Coder-480B/235B/Next-80B).
- **GDPR:** GDPR Addendum + SCCs; no-train + no-retention stated; formal ZDR SLA unverified.
- **Price:** Qwen-Plus $0.40→$1.20; Coder-Plus ~$0.65→$3.25.
- **Sources:** alibabacloud.com Model Studio EU docs.

#### Poolside — `EU-region (self-host) + strong-conf` (own code models only)
- **HQ:** SF, US (Paris engineering). On-prem/VPC/sovereign deployment + GDPR DPA; runs in customer infra. OpenAI-compatible `https://inference.poolside.ai/v1`. Serves only its own Laguna code models. → Not relevant for serving the target open fleet, but a genuine EU/sovereign option for code.

### Strong-confidentiality but NON-EU (privacy without residency)
- **Phala / RedPill** — best-in-class TEE (Intel TDX + NVIDIA confidential GPU, dual attestation) but **no EU node** (US/India). Compliance-cert claims are RedPill marketing not substantiated by Phala's Trust Center (only SOC 2 I). `https://api.redpill.ai/v1`.
- **Venice AI** — privacy-first (ZDR default, no-train), very broad open-model catalog incl. MiMo, but **no EU residency by design** (decentralized GPU pool). Some routes reference NEAR/Phala confidentiality, but this is not a provider-wide attested-TEE guarantee, so current Venice offers are not marked TEE. `https://api.venice.ai/api/v1`.
- **DeepInfra** — cheapest + broadest catalog, ZDR default + no-train, but **US DCs only**. `https://api.deepinfra.com/v1/openai`.
- **Friendli** — default ZDR + no-train, SOC 2 II + HIPAA, strong DeepSeek/GLM coverage, but no documented EU region. `https://api.friendli.ai/serverless/v1`.
- **Chutes** — TEE (Intel TDX + NVIDIA CC) + optional post-quantum E2EE, EU hosting regions exist but **LLM-API EU-pinning unverified**; no ISO/SOC2 found. `https://llm.chutes.ai/v1`.

### Watchlist
- **Cerebras** — France DC announced ~Q4 2025 (= future EU inference site); no self-serve region selector yet. Serves Qwen3-Coder-480B/235B, gpt-oss-120b, GLM-4.7, Llama 4 Maverick.
- **DigitalOcean Gradient** — has EU DCs for other products and publicly plans EU regions for GDPR inference, but **Serverless Inference has no region selection today**. Broadest catalog incl. Xiaomi MiMo.
- **GMICloud** — claims "Europe" (unverified), holds SOC 2 + ISO 27001 — worth a direct sales question.
- **Clarifai** — good certs + DPA/SCC but no turnkey EU region; Nebius acquired its core team 2026-05 (in flux).

---

## Excluded — clearly non-EU, no EU option (for residency)

| Reason | Providers |
|---|---|
| **China-based first-parties** (intl endpoints in Singapore/US, often train on inputs) | DeepSeek, Moonshot AI (Kimi), Z.AI (Zhipu/GLM), MiniMax, StepFun, Baidu, StreamLake, Nex AGI |
| **US-only inference, no EU region** | Novita, AtlasCloud, WandB Inference, Infermatic, Wafer, Ionstream, Mara, Liquid, Inception, Perceptron, Arcee |
| **Decentralized DePIN (no residency control — red flag)** | Io Net, AkashML, (Venice/Phala by design — but kept for confidentiality) |
| **Other non-EU** | SiliconFlow (SG/China), DekaLLM (Indonesia), Upstage (Korea), AI21 (Israel; EU only via Bedrock) |
| **Could not confirm exists / defunct / unknown** | ModelRun, AionLabs, Switchpoint, Ambient, OpenInference |
| **Own-models-only (don't serve target open fleet)** — separate from residency | Mistral*, Cohere*, AI21, Upstage, Liquid, Inception, Reka, Morph, Relace, Poolside, Arcee, Perceptron (*Mistral/Cohere are EU/EU-region but closed catalog) |

---

## Bottom line for the app

**Genuine EU options that serve the broad third-party open-model fleet:**
1. **Nebius (Token Factory)** — the standout: EU-HQ (NL), EU DCs (Finland+France), ZDR + no-train, broad open catalog, OpenAI-compatible. Best all-round EU pick.
2. **Amazon Bedrock** — best self-serve EU pinning of any hyperscaler (EU regions + EU CRIS profiles + IAM-enforced ZDR), broad open catalog. US-parent CLOUD Act caveat.
3. **Nscale (UK)** — EU-HQ with owned EU/Nordic DCs and no-log/no-train serverless; smaller Western-leaning roster (no GLM/Kimi/DeepSeek-V4); confirm certs.

**EU residency available but with a catch:**
- **Together / Fireworks / Parasail / Baseten / Groq / SambaNova(Infercom)** — EU residency only via *dedicated/enterprise* endpoints (not the cheap serverless API). Fireworks/Parasail also have strong default ZDR.
- **Azure AI Foundry** — formal EU framework (Data Zone + EUDB) but most top open models are Global-only; the product separately admits Direct Global DeepSeek V4 Pro and Kimi K2.7 Code as company-policy equivalents without claiming residency.
- **Cloudflare** — EU via Enterprise Custom Regions; verify GPU compute (not just network) is EU-pinned.
- **NVIDIA NIM** — full EU residency if self-hosted on EU infra (+ TEE on H100/H200).
- **Alibaba** — real Frankfurt EU mode, but only Qwen-Plus/Flash/VL (not the open-weight flagships).

**EU-HQ but closed catalogs** (only if you also want their own models): **Mistral** (FR, EU-default), **Cohere** (CA, EU via VPC/EU cloud).

**Small EU-HQ players to validate:** **NextBit** (ES), **Inceptron** (SE).

**Confidentiality/privacy-first but NOT EU** (capabilities differ; only exact attested offers receive the TEE flag): **Phala/RedPill**, **Venice**, **Chutes**, **DeepInfra**, **Friendli**.

**Exclude for EU residency:** all Chinese first-parties, US-only providers, and the DePIN networks (Io Net, AkashML) — see exclusion table above.

> Every "EU residency" claim above for US-parent providers should be confirmed in a DPA/contract: dedicated-vs-serverless scope, whether GPU *compute* (not just storage/network) is EU-bound, and CLOUD Act exposure. EU AI Act readiness is `unknown` for nearly all.
