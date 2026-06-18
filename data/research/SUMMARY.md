# European inference providers — consolidated findings (2026-06-18)

Synthesis of four parallel research streams (full detail in the sibling files):
- [eu-providers-openrouter-audit.md](eu-providers-openrouter-audit.md) — all ~60 OpenRouter providers audited for EU residency/compliance
- [eu-providers-native-apis.md](eu-providers-native-apis.md) — EU-native serverless API platforms
- [eu-providers-sovereign-telco.md](eu-providers-sovereign-telco.md) — German/sovereign + telco candidates (STACKIT, Telekom, SAP, IONOS…)
- [eu-residency-confidentiality.md](eu-residency-confidentiality.md) — data-residency & confidentiality mechanisms

## Bottom line

**Yes, European alternatives exist** — but they split into two tiers depending on *which* open model you need:

- **Western open models** (Llama, Mistral, Qwen, gpt-oss, and DeepSeek V3.x/R1): **plenty** of genuine EU options with EU data residency, GDPR certs and zero-data-retention.
- **Newest Chinese frontier open models** (GLM 5.x, Kimi K2.x, DeepSeek V4, MiniMax M-series): **scarce** in the EU — essentially only **Nebius** and **Inceptron** (EU regions), plus **TEE** routes (Chutes/Phala/Privatemode) for confidentiality. The German sovereign clouds (STACKIT, T-Systems, IONOS, SAP) do **not** carry these.
- **Xiaomi MiMo-V2.5-Pro** and **MiniMax M2.7/M3**: **no managed EU route found** — self-hosting the open weights in an EU region is the only path.

## Ranked European options that expose a per-token API

| Provider | HQ / EU DCs | Residency control | Confidentiality | Open models (relevant) | Sample price (per 1M in/out) |
|---|---|---|---|---|---|
| **Nebius Token Factory** | NL · Finland, France | EU region (set per-model in console; no API `region=`) | Opt-in ZDR + no-training; ISO 27001/27701, SOC 2 II | **Broadest**: GLM 5.1/5.2, Kimi K2.6, DeepSeek V4 Pro/V3.2/R1, MiniMax M2.5, Qwen3, gpt-oss-120b | GLM 5.2 $1.40/$4.40 · Kimi K2.6 $0.95/$4.00 |
| **Scaleway Generative APIs** | FR · Paris | EU-only (Paris); **ZDR by default**; SecNumCloud in progress | Strong | MiniMax M2.5, Qwen3-235B, Mistral L/M/Magistral, gpt-oss-120b, DeepSeek | Qwen3-235B €0.75/€2.25 · gpt-oss-120b €0.15/€0.60 |
| **AWS Bedrock (EU Geo profile)** | US parent · eu-central-1 etc. | **EU cross-region inference** (`eu.`-prefixed profiles); **ZDR by default** (IAM-enforced) | Best retention posture of the hyperscalers | Llama, Mistral, DeepSeek V3.2, Nova, gpt-oss; **no GLM/Kimi/MiniMax/DeepSeek-V4** | (already in app) |
| **Inceptron** | SE | EU; zero-retention; ISO 27001 | Good | **GLM 5.1, Kimi K2.6, MiniMax M2.5** (rare EU set!) | GLM 5.1 $1.40/$4.40 · Kimi K2.6 $0.80/$3.50 |
| **OVHcloud AI Endpoints** | FR · Gravelines | EU-sovereign; **SecNumCloud/ANSSI**; ZDR, no-training | Strong | gpt-oss-120b, Llama 3.3, Qwen3.x, Mistral (narrow frontier) | gpt-oss-120b €0.08/€0.40 |
| **STACKIT AI Model Serving** | DE (Schwarz) · DE+AT | EU/DE sovereign; **BSI C5**, ISO 27001; no-training | Strong | gpt-oss-120b/20b, Qwen3-VL-235B, Llama 3.3 70B, Gemma 3 | standard tier ~€0.45/€0.65 |
| **IONOS AI Model Hub** | DE · Germany-only | DE sovereign; **BSI C5** core cloud; stateless, no-training | Strong | gpt-oss-120b, Llama 3.1/3.3, Mistral, Qwen3-Coder-Next-80B | gpt-oss-120b $0.17/$0.71 · Llama 3.3 70B $0.71/$0.71 |
| **T-Systems "LLMHub"** | DE (Telekom) · sovereign T-Cloud | DE sovereign | Strong | gpt-oss-120b, Llama 3.3, Mistral, Qwen3 | ~€0.20/€0.65 — **but €1,000/mo minimum** (enterprise-only) |
| **Azure AI Foundry (EU Data Zone)** | US parent · Sweden/EU | EU Data Boundary; ZDR needs approval | Framework | Mostly Global-only; **Mistral-Large-3** is the EU-Data-Zone open model | (already in app) |

EU-HQ but **own-models-only** (relevant only for their models): **Mistral La Plateforme** (FR — Mistral models, La-Plateforme Large 3 ≈ $0.50/$1.50), **Aleph Alpha PhariaAI** (DE — enterprise, no public per-token API; reportedly merging into Cohere Apr 2026).

## Confidentiality (TEE / zero-retention) for the Chinese frontier models

These models have **no hyperscaler-EU-residency** route, so confidential-compute is the realistic privacy answer:

- **Chutes** (our own platform) — Intel TDX + NVIDIA CC, `provider/Name-TEE` naming; **13 live TEE models incl. GLM 5/5.1/5.2, Kimi K2.5/K2.6, MiniMax M2.5, DeepSeek V3.2** + opt-in post-quantum E2EE. ⚠️ TEE ≠ EU residency (nodes can be anywhere — EU pinning unverified).
- **Privatemode** (Edgeless Systems, **Germany**) — EU-pinned **and** confidential (GDPR + NIS2). Cleanest "EU residency *and* confidentiality" combo, but **narrow catalog** (Kimi K2.6 + gpt-oss).
- **Phala / RedPill** (TEE, US/India nodes) and **Tinfoil** — strong confidentiality, not EU-resident.

## Per-model EU availability (managed per-token APIs)

| Model | Genuine EU-resident options | TEE / confidential | EU verdict |
|---|---|---|---|
| gpt-oss-120b | Nebius, Scaleway, OVHcloud, IONOS, STACKIT, T-Systems, AWS, Azure | Privatemode, Chutes | ✅ everywhere |
| Llama 4 / 3.x | most EU providers + AWS/Azure/Vertex EU | — | ✅ broad |
| Mistral (L/M/Magistral) | Mistral FR, Scaleway, OVHcloud, Azure EU DataZone | — | ✅ broad |
| Qwen3 (Coder/235B/Next) | Nebius, Scaleway, IONOS, STACKIT, AWS | Chutes | ✅ good |
| DeepSeek V3.2 / R1 | AWS Bedrock EU, Azure EU DataZone, Nebius, Scaleway | Chutes (V3.2) | ✅ ok |
| DeepSeek V4 Pro | Nebius (EU region) | Chutes (V3.2 only) | ⚠️ thin |
| GLM 5.1 / 5.2 | **Nebius, Inceptron** | Chutes (GLM 5/5.1/5.2) | ⚠️ thin (no sovereign cloud) |
| Kimi K2.6 | **Nebius, Inceptron**, Privatemode (TEE+EU) | Chutes, Privatemode | ⚠️ thin |
| MiniMax M2.5 | **Nebius, Scaleway, Inceptron** | Chutes | ⚠️ thin |
| MiniMax M2.7 / M3 | none found | — | ❌ self-host only |
| Kimi K2.7 Coding | none found (managed EU) | — | ❌ self-host only |
| Xiaomi MiMo-V2.5-Pro | none found | — | ❌ self-host only |

## Key caveats

1. **The "global routing" trap** breaks EU residency on all three hyperscalers — you must select the explicit EU-bounded profile (AWS `eu.` Geo profile, Azure EU Data Zone, Vertex EU multi-region), never the global endpoint.
2. **Fireworks-on-Azure is NOT EU-resident** — Microsoft explicitly excludes Fireworks-hosted models (which is how Azure carries Kimi/GLM/MiniMax) from the EU Data Boundary. So the Azure prices we list for those models are real but **US-served**.
3. **US-parent "EU residency" usually means a dedicated/enterprise deployment, not the cheap serverless API** (Together, Fireworks, Parasail, Baseten, Groq, SambaNova) — and **US CLOUD Act** exposure remains even with EU servers.
4. **TEE-blindness ≠ EU residency** — they are independent guarantees; only **AWS Bedrock** is zero-data-retention *by default*.
5. **EU AI Act readiness is `unknown`/unclaimed** for nearly all providers (only Mistral and SambaNova's EU partner Infercom claim it).
6. **Version availability is volatile** — flagged rather than guessed throughout; re-verify GLM 5.1-vs-5.2, Kimi K2.6-vs-K2.7, DeepSeek V4-vs-V3.2 at the provider before relying on it.

## Suggested shortlist

- **Want the broadest EU coverage incl. Chinese frontier models →** **Nebius Token Factory** (EU region) — closest to a drop-in EU replacement for the OpenRouter open-model fleet.
- **Want a true EU-sovereign vendor (DE/FR, BSI C5 / SecNumCloud) →** **STACKIT / IONOS / OVHcloud / Scaleway** — but accept the Western-open-models-only catalog.
- **Need confidentiality on GLM/Kimi/MiniMax →** **Chutes (TEE)** or, if EU pinning is mandatory, **Privatemode (DE)**.
- **Already on a hyperscaler →** **AWS Bedrock EU Geo profile** is the strongest turnkey EU + ZDR posture (Western open models only).
