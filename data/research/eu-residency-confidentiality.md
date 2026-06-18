# EU Data Residency & Confidentiality for Open-Model LLM Inference

Research date: **2026-06-18**. For the model-market-comparison app.

**Scope.** This document maps the *compliance mechanisms* — not a provider price list (prices already live in the app) — that give genuine **EU data residency** and/or **confidentiality** for the top open-source models we track. It is organised by three angles:

1. Hyperscaler EU regions (AWS Bedrock, Azure AI Foundry, Google Vertex AI)
2. Confidential compute (TEE) & zero-data-retention (ZDR) providers
3. What "EU inference" realistically means per open-model family (summary table at the end)

**Three distinct guarantees** are kept separate throughout — they are routinely conflated and mean very different things for GDPR:

- **Stored in EU** — data at rest lives only in EU data centres.
- **Processed in EU** — ML inference compute also happens in the EU (not just storage). The common trap: a "global" routing mode breaks this even when storage is EU.
- **No retention at all (ZDR)** — prompts/outputs are never persisted (contractually and/or technically enforced).
- **TEE-blindness** — data is processed inside hardware-isolated memory so the *operator physically cannot read plaintext*. This is orthogonal to retention: a TEE can still persist *encrypted* artifacts, and "no retention" can exist without a TEE. The strongest providers assert **both**.

Note on hardware: the dominant real-deal confidential pattern is **AMD SEV-SNP or Intel TDX (CPU) + NVIDIA Confidential Computing H100/H200 (GPU)**, optionally with Protected PCIe for the CPU↔GPU link.

Unconfirmable items are flagged **UNKNOWN / not found**. Catalogs rotate frequently — model lists are point-in-time snapshots.

---

## Angle 1 — Hyperscaler EU regions for open models

### At-a-glance

| Dimension | AWS Bedrock | Azure AI Foundry | Google Vertex AI |
|---|---|---|---|
| Data **stored** in EU | Yes — encrypted at rest in chosen EU region; AWS won't move/replicate out | Yes — Foundry resource in customer tenant, AES-256, within EU geography (EUDB) | Yes — at-rest in selected EU region/multi-region (contractual) |
| Data **processed** in EU | Yes single-region; EU Geo cross-region inference stays within 7 EU regions (use `eu.` profile, **NOT Global**) | Yes for Standard / DataZone-EU; **Global** deployment type is **NOT** EU-bounded | Yes only via EU regional / EU multi-region endpoint; **global endpoint is NOT EU-bounded** |
| No training on customer data | Yes (explicit) | Yes (explicit) | Yes — "Training Restriction" (without permission) |
| **NO RETENTION** default | **Yes** — default Zero Data Retention + Zero Operator Access | No — default has abuse-monitoring store; ZDR needs Limited Access approval | No — short caches (24h); invoiced customers exempt from abuse logging; per-model ZDR UNKNOWN |
| Open models for in-EU | Nova, Llama, Mistral, DeepSeek-R1 | gpt-oss, DeepSeek, Llama, Mistral, Phi | Gemma, Llama, Mistral, DeepSeek, Qwen (MaaS or self-deploy) |
| Fireworks-hosted (Kimi/GLM/MiniMax) in EU | n/a | **NO — explicitly EXCLUDED from EU Data Boundary; serverless US-only** | n/a |

### AWS Bedrock

**EU regions.** `eu-central-1` (Frankfurt), `eu-central-2` (Zurich), `eu-west-1` (Ireland), `eu-west-2` (London), `eu-west-3` (Paris), `eu-north-1` (Stockholm), `eu-south-1` (Milan), `eu-south-2` (Spain). Application inference profiles support a narrower EU set (`eu-central-1`, `eu-west-1/2/3`).

**Stored in EU.** > "Any customer content processed by Amazon Bedrock is encrypted and stored at rest in the AWS Region where you are using Amazon Bedrock." (Bedrock FAQ). > "We will not move or replicate your content outside of your chosen AWS Regions except as agreed" (AWS ALPS security blog).

**No training + default ZDR.** > "No, AWS and the third-party model providers will not use any inputs to or outputs from Amazon Bedrock to train Amazon Nova, Amazon Titan, or any third-party models." (Bedrock FAQ). > "Amazon Bedrock uses a zero operator access (ZOA) data security model... Also, Amazon Bedrock uses a zero data retention (ZDR) data security model. This means that by default, Amazon Bedrock does not store model inputs or outputs." (abuse-detection docs). Model providers cannot access prompts (deep-copy architecture). The only documented retention overrides are *closed frontier* models (e.g. OpenAI GPT-5.x classifier-flagged traffic, Claude Fable 5 with opt-in) — open models (Nova/Llama/Mistral/DeepSeek) run under default ZDR. Verify each model's `allowed_modes` at deploy.

**Cross-region inference caveat (CRITICAL).** EU Geo profile keeps data in EU: > "Cross-Region inference requests to an inference profile tied to a geography (e.g. US, EU and APAC) are kept within the AWS Regions that are part of the geography... your input prompts and output results might move outside of your source Region during cross-Region inference." The EU Geo profile routes only to 7 EU regions (`eu-north-1, eu-west-3, eu-south-1, eu-south-2, eu-west-1, eu-central-1, eu-central-2`). **The Global profile routes to ALL commercial AWS regions worldwide — you must use the `eu.`-prefixed Geo profile to stay in-EU.**

**Certifications.** SOC 1/2/3 (Type 2), ISO/IEC 27001/27017/27018/27701/9001/22301/20000, ISO/IEC 42001 (AI), CSA STAR Level 2, **C5 (BSI Germany)**. **HDS**: eligible via ISO 27001 scope but no explicit Bedrock-HDS statement — UNKNOWN. **SecNumCloud**: NOT held (the AWS European Sovereign Cloud, GA Jan 2026, has C5 + SOC 2 + 7 ISO certs but **not** SecNumCloud). **EU AI Act**: no Bedrock-specific statement — UNKNOWN.

**Open models in EU.** Amazon **Nova** (broad EU coverage); **Mistral** (confirmed EU, e.g. Mistral Large in eu-west-3); **Llama** (on Bedrock and offered in EU; precise per-version EU matrix UNKNOWN); **DeepSeek-R1** (managed model exists; EU-region availability UNKNOWN). **GLM / Qwen / Kimi / MiniMax / MiMo** — not found as managed Bedrock models.

### Azure AI Foundry + EU Data Boundary

**EU Data Boundary (EUDB)** — completed Feb 26, 2025. > "The EU Data Boundary is a geographically defined boundary within which Microsoft has committed to store and process Customer Data and personal data for our Microsoft enterprise online services, including Azure... For EU Data Boundary Services, Customer Data and pseudonymized personal data are stored and processed... in datacenters located in countries in the EU or EFTA." Covers Customer Data, pseudonymized personal data in telemetry, and Professional Services Data.

**No training + processing location.** > "Your prompts (inputs) and completions (outputs), your embeddings, and your training data: are NOT available to other customers... are NOT used to train any generative AI foundation models without your permission or instruction." > "The models are stateless: no prompts or completions are stored in the model." Processing location depends on deployment type: > "Prompts and responses are processed within the customer-specified geography (unless you are using a Global or DataZone deployment type)... If you create a DataZone deployment in a Foundry resource located in a European Union Member Nation, prompts and responses may be processed in that or any other European Union Member Nation."

**Retention / ZDR.** ZDR = "modified abuse monitoring" via Limited Access approval; when approved "the data storage and human review process... is not performed" (automated review may still run), verified by `ContentLogging: false`. EU human reviewers for EEA deployments. **CORRECTION:** the often-cited "30 days abuse retention" figure is from older doc versions and is **NOT** confirmed by current (June 2026) primary docs — treat as unconfirmed.

**Certifications.** ISO/IEC 27001:2022, SOC 2 Type 2, **C5 (BSI "C5:2020")**, **HDS** (France Central/South, Germany West Central, Sweden Central, North/West Europe — but **NOT for preview/prerelease services**). Compliance docs list umbrella "Azure" rather than "Azure OpenAI" by name — verify per-service via the Service Trust Portal.

**Open models in EU ("Models sold by Azure" — strong tier).** gpt-oss (120b/20b), DeepSeek (R1, V3), Llama (incl. Llama 4 Scout/Maverick), Mistral (Large/Small/Medium 3, Mixtral, Mistral-7B), Phi. All get full data-privacy + EUDB coverage when deployed in an EU region (Standard or DataZone-EU).

**CRITICAL — Fireworks AI on Foundry (Kimi K2, GLM, Qwen, DeepSeek, gpt-oss, MiniMax) is EXCLUDED from EU residency.** Stated twice in Microsoft's own doc: > "Important — Fireworks on Foundry is currently excluded from EU Data Boundary commitments." > "When you use Fireworks on Foundry, data is shared between Microsoft and Fireworks AI..." Serverless (Data Zone Standard) regions are **US ONLY** (East US, East US 2, Central US, North Central US, West US, West US 3). The catalog includes Kimi K2 (Moonshot), Qwen 3.5, GLM-4.7/5.1 (Zhipu), DeepSeek; MiniMax appears in marketing blogs but not the Learn catalog table (unconfirmed). **Bottom line: Fireworks-hosted open models cannot be pinned to EU-only residency on Azure and are outside EUDB.**

### Google Vertex AI

**EU regions.** europe-west1 (Belgium), -west2 (London), -west3 (Frankfurt), -west4 (Netherlands), -west6 (Switzerland), -west8 (Milan), -west9 (Paris), -north1 (Finland), -central2 (Poland), -southwest1 (Spain). The **EU multi-region** endpoint (`aiplatform.eu.rep.googleapis.com`) is the construct that guarantees EU at-rest + EU ML processing together.

**Stored vs processed (two distinct commitments).** > "Data residency at-rest: We commit to storing your data only in the specific geographic locations you select." > "Data residency during ML processing: We commit to performing ML processing of your data within the same specific region or multi-region where it's stored." > "All machine learning (ML) processes... occur within the US when requests are made to regionally-available APIs in the US, or within the EU when requests are made to regionally-available APIs in Europe." > "The AI/ML data location (DRZ) commitment is only supported in locations in the US and EU." **CRITICAL:** > "Don't use the global endpoint if you have ML processing requirements, because you can't control or know which region your ML processing requests are sent to."

**No training + retention.** > "Google won't use your data to train or fine-tune any AI/ML models without your prior permission or instruction." (Section 17 "Training Restriction"). > "We do not use data that you provide us to train our own models without your permission." Retention: cached contents up to 24h; invoiced/enterprise customers not subject to abuse-monitoring prompt logging; Grounding-with-Search stores 30 days. Per-model ZDR scope UNKNOWN.

**Certifications.** ISO/IEC 27001, 27017, 27018, 27701, ISO/IEC 42001 (AI), SOC 1/2/3, **BSI C5 (C5:2020)**, PCI DSS, HIPAA, FedRAMP, CSA STAR. Exact per-certification "Vertex AI in scope" list not directly quotable — UNKNOWN, verify on live compliance pages.

**Open models in EU (MaaS vs self-deploy).** **Gemma** (MaaS + self-deploy to EU); **Llama** (serverless MaaS via EU multi-region endpoint + open weights); **Mistral** (serverless, default region europe-west4); **DeepSeek** (Model Garden self-deploy/MaaS; EU MaaS region UNKNOWN); **Qwen** (Model Garden self-deploy; EU MaaS availability UNKNOWN); **any open weights** can be self-deployed to your own EU endpoint, keeping storage + inference in-region. For guaranteed EU residency: use EU-MaaS via the EU multi-region endpoint, or self-deploy open weights to your own EU endpoint. **Never use the global endpoint.**

---

## Angle 2 — Confidential compute (TEE) & zero-data-retention providers

**Buckets** (how to read each provider):
- **Asserts BOTH** no-retention **and** TEE-blindness: Tinfoil, Privatemode/Edgeless (EU), Atoma, Azure managed Confidential Inferencing, RedPill/Phala.
- **Primarily TEE-blindness (+ no-training)**: Chutes, NEAR AI, Opaque, Secret Network, Nillion (note: Nillion persists encrypted history).
- **Verifiability-only, NOT confidential** (prove a computation ran, but not private): zkML/proof-of-logits projects (Inference Labs/Omron, Ambient, Gensyn) — do not treat as confidentiality.

### Phala Network (on OpenRouter as "Phala")

Two brands: **Phala Cloud** (GPU-TEE platform) and **RedPill** (confidential AI API/chat). **Hardware:** Intel TDX (CPU; AMD SEV-SNP also supported) + NVIDIA H100/H200 in CC mode, SPDM-secured CPU↔GPU channel (H200/B300 also on the GPU marketplace). **Attestation:** RA-TLS + per-response signing; GPU report verified via NVIDIA Remote Attestation Service (NRAS); client SDK fetches each CVM's TDX quote and runs `dcap-qvl` locally, confirming a "no-log" entry in on-chain `DstackApp.sol`. RedPill `GET /v1/attestation/report?model=` returns `signing_address`, `nvidia_payload`, `intel_quote`, `all_attestations`; per-response headers `x-phala-receipt-sig`, `x-phala-compose-hash`, `x-phala-no-log`. Verification tools: proof.t16z.com, trust.phala.com. **Models (Phala's own):** Qwen3.5/3.6, GLM-4.7-Flash, Gemma 3, gpt-oss-20b, embeddings. **On OpenRouter "Phala" lists ~16 models** incl. Qwen3.5/3.6, Kimi K2.5/K2.6, GLM 4.7/5/5.1, Gemma 3/4, MiniMax M2.5, gpt-oss-120b/20b. (RedPill *aggregates* 4 TEE backends — Phala, Tinfoil, Near AI, Chutes — so some models on RedPill are served by the others.) **Retention (asserts BOTH):** > "Zero data retention - conversations deleted after session" / "We store nothing." > "Never used for training." > "No-log isn't a policy — it's a property of the registered build. The compose has no log volumes, no telemetry." **EU residency: UNKNOWN / not found** (advertised regions US-West + India). The exact ZDR badge on the OpenRouter provider page could not be extracted (JS-rendered) — UNKNOWN.

### Chutes (chutes.ai — our own platform; decentralized Bittensor subnet)

**Hardware:** Intel TDX confidential VMs via **sek8s** (hardened k8s) + NVIDIA GPUs with CC + Protected PCIe (PPCIE) for encrypted CPU↔GPU traffic (H100/H200). > "The memory used by a TD is encrypted using a key known only to the CPU." > "All data and code sent to the GPU for processing are encrypted." **Attestation (strong, well-documented):** RTMRs measure firmware/bootloader/kernel; TD Quote signed by a CPU-fused key bound to a validator nonce; validator checks the quote against Intel keys + NVIDIA GPU attestation + compares RTMRs against a known-good "golden" sek8s config (> "Only if every single measurement matches does attestation pass"). LUKS-encrypted root FS released only after attestation; **cosign** admission controller only schedules cryptographically-signed images; **chutes-net-nanny** blocks outbound traffic by default. Public verifiability: > "You can request the latest TD Quote and NVIDIA attestation report directly from the node" + IMA "Full Software Manifest". **Distinctive — opt-in post-quantum E2EE:** > "Your prompts are encrypted on your machine using post-quantum cryptography... decrypted only inside a hardware-isolated Trusted Execution Environment (Intel TDX)." Stack: ML-KEM-768 (Kyber) + ChaCha20-Poly1305 + HKDF-SHA256, ephemeral per-request keys. (Their own caveat: E2EE is opt-in via `chutes-e2ee-transport`, not default for all inference.) **Retention:** primarily TEE-blindness + no-plaintext-logging ("Your prompts. Your data. Hardware-protected from everyone—even us."); no numeric retention SLA found. **TEE naming convention (confirmed):** model id = `provider/Name-TEE`, served from `llm.chutes.ai/v1`. **13 live TEE models (2026-06-18):** `deepseek-ai/DeepSeek-V3.2-TEE`, `moonshotai/Kimi-K2.5-TEE`, `moonshotai/Kimi-K2.6-TEE`, `zai-org/GLM-5-TEE`, `zai-org/GLM-5.1-TEE`, `zai-org/GLM-5.2-TEE`, `Qwen/Qwen3.5-397B-A17B-TEE`, `Qwen/Qwen3.6-27B-TEE`, `Qwen/Qwen3-32B-TEE`, `Qwen/Qwen3-235B-A22B-Thinking-2507-TEE`, `MiniMaxAI/MiniMax-M2.5-TEE`, `google/gemma-4-31B-turbo-TEE`, `unsloth/Mistral-Nemo-Instruct-2407-TEE`. **EU residency: UNKNOWN / not found** (decentralized anonymous miner network — no documented EU-pinning guarantee). On OpenRouter: provider `chutes`, ~8 models, no explicit ZDR/data-policy text on the provider page (only a ToS link).

### OpenRouter — data policies & ZDR routing

Two distinct, easily-confused control layers (docs restructured 2026 under `/docs/guides/...`; legacy `/docs/features/...` paths now 404):

**(A) Anti-training / data-collection control.** Account toggle: > "you can set whether you would like to allow routing to providers that may train on your data... If you opt out, OpenRouter will not route to providers that train." Per-request param **`data_collection`**: `"allow"` (default — providers may store non-transiently and train) vs `"deny"` (only providers that don't collect user data). Caveat: "This setting has no bearing on OpenRouter's own policies."

**(B) Zero Data Retention (ZDR) — the stricter, retention-specific system.** > "Zero Data Retention (ZDR) means that a provider will not store your data for any period of time." Enforceable globally, per model group, per guardrail, or per request. Per-model-group toggles (Anthropic / OpenAI / Google / Non-frontier) and org guardrail fields `enforce_zdr_anthropic|openai|google|other`. Per-request **`zdr: true`** routes only to ZDR endpoints (combined as **OR** with account/guardrail settings — can enable for a request, cannot disable account-wide enforcement). OpenRouter's own stance: > "OpenRouter itself has a ZDR policy; your prompts are not retained unless you specifically opt in to prompt logging." Reliance caveat: the downstream provider must offer ZDR on the called endpoint.

**`data_collection: "deny"` ≠ ZDR.** `deny` excludes training/non-transient storage; `zdr: true` is the strict no-retention filter. Separately, OpenRouter has a **"Sovereign AI"** feature for in-region/data-residency routing — this is the routing-layer EU lever (distinct from ZDR). Suffixes: `:free`, `:nitro` (sort throughput), `:floor` (sort price); `:online` is **deprecated** (use the `web_search` tool).

### Other TEE / ZDR providers (EU relevance)

- **Edgeless Systems / Continuum → Privatemode AI (privatemode.ai)** — **clearest EU/GDPR-sovereign option.** German company (Bochum). AMD SEV-SNP + Intel TDX + NVIDIA CC; Contrast Confidential Containers; client-side AES-256; open-source reproducible builds + transparency logs. Models: Kimi K2.6, Gemma 4 31B, gpt-oss-120b, Voxtral, Whisper, Qwen3 Embedding (Llama 3.3 70B at launch). **Asserts BOTH:** > "no data is retained and Privatemode never trains on your data." > "zero-access design prevents operators, cloud providers, and model vendors from decrypting." **EU:** > "hosted in top-tier data centers in the European Union", "Made in Germany", GDPR + NIS2 pages.
- **Tinfoil (tinfoil.sh)** — strongest attestation story; AMD SEV-SNP + Intel TDX + NVIDIA CC on H100/H200/**B200**. Reproducible GitHub-Actions builds → Sigstore transparency log; open-source browser-native verifier binds enclave verification to TLS. Models: Llama 3.3 70B, gpt-oss 120B, Kimi K2.5/K2.6, Gemma 3, GLM 5.1, DeepSeek R1/V4, Mistral. **Asserts BOTH** (technically-enforced ZDR + no-training). US company; **EU residency UNKNOWN.**
- **Atoma (atoma.ai)** — Intel TDX + AMD SEV-SNP + NVIDIA CC; on-chain attestation via Sui. Models: Llama 3.3 70B, Llama 3.1 405B, DeepSeek R1 671B. **Asserts BOTH.** Claims "North America, Europe" DCs (no EU pinning guarantee).
- **NEAR AI Cloud (cloud.near.ai)** — Intel TDX + NVIDIA CC (built on Phala's Private-ML-SDK); per-request proofs. Open-weight Llama/Qwen/DeepSeek/Mixtral. Primarily TEE-blindness + no-training; EU UNKNOWN.
- **Azure AI Confidential Inferencing** (managed, preview) — AMD SEV-SNP + NVIDIA H100; **asserts BOTH** (> "stateless processing... discard the prompts when inferencing is complete"; protected "even by Microsoft"). Mostly Phi/Whisper today. Confidential GPU confirmed in **West Europe**.
- **Google Confidential Space / Confidential VM + GPU** — infrastructure (BYO container, no model catalog). CPU TEE in EU (europe-west3/4/9); confidential **H100 GPU EU narrow — only europe-west4-c (Netherlands)** found.
- **Fortanix (Armet AI)** — broad hardware incl. Blackwell; composite CPU+GPU attestation; **EU endpoint (Eindhoven, NL)**. BYO/open models (Nemotron). No explicit no-retention clause.
- **Opaque (opaque.co)** — Intel SGX + NVIDIA H100 CC; runs LLaMa/Mistral/Gemma; runs in customer's Azure (EU via Azure EU). TEE-blindness; no clean ZDR clause.
- **Secret Network / SecretAI**, **Nillion (nilAI)**, **io.net**, **iExec (FR)**, **Super Protocol**, **Marlin Oyster** — additional TEE infra/marketplaces (mostly BYO-model, on-chain attestation, no written ZDR DPA). Nillion is EU-unfriendly (servers outside EEA, incl. US). io.net's models all returned `supports_attestation:false` on 2026-06-18.
- **Defunct / not confidential:** Mithril Security/BlindLlama (defunct), Hugging Face (policy-only, no TEE), Hyperbolic/Gradient Network/Nous (no TEE).

---

## Angle 3 — What "EU inference" realistically means, per model family

Beyond the hyperscalers and TEE providers, an **EU-native provider layer** matters for the Chinese open models that hyperscalers don't cover in-EU:

- **OVHcloud AI Endpoints** (Roubaix, France) — **SecNumCloud (ANSSI)** certified, EU jurisdiction, GDPR, "zero data retention, no training on prompts." Catalog (2026-06-18): Qwen3.6-27B, Qwen3.5-397B-A17B, Qwen3.5-9B, Qwen3-32B, Qwen3-Coder-30B, Qwen2.5-VL-72B, Llama 3.3 70B, Mistral (7B / Small 3.2 24B / Nemo), gpt-oss-20b/120b. **No GLM/Kimi/MiniMax/DeepSeek** in catalog yet (Kimi K2.5 is a pending roadmap request). The strongest EU-sovereign route, but limited to Qwen/Llama/Mistral/gpt-oss.
- **Scaleway Generative APIs** (France) — EU hosting, GDPR, zero data retention (> "we do not collect, read, reuse, or analyse... inputs, prompts or outputs"; data "stored only in Europe"). Models: DeepSeek, Qwen (3.5/3.6), Mistral, plus others. No explicit GLM/Kimi/MiniMax confirmed.
- **EUrouter (eurouter.ai)** — EU-residency *aggregator* routing across EU-compliant backends (Infercom, OVHcloud, Scaleway) plus EU-bounded AWS Bedrock EU profiles and Azure EU DataZone deployments. Useful as a single EU-only routing layer; per-model coverage inherits from underlying providers.

### Per-model-family EU-options summary

Legend: **Hyperscaler-EU** = AWS Bedrock EU Geo / Azure EUDB / Vertex EU (residency guaranteed). **EU-native** = OVHcloud / Scaleway / EUrouter (GDPR + EU DC, often ZDR). **TEE** = confidential compute (Chutes/Phala/Tinfoil/Privatemode etc.; EU-pinning only where noted). **Self-deploy** = open weights on your own EU GPU endpoint (always possible if weights are open).

| Model family | Hyperscaler-EU (residency-guaranteed) | EU-native providers | Confidential / TEE | Realistic EU verdict |
|---|---|---|---|---|
| **Llama 4 / Llama 3.x** | Azure (EUDB, incl. Llama 4), Bedrock EU, Vertex EU MaaS | OVHcloud (3.3 70B), Scaleway | Tinfoil, Atoma, NEAR, Chutes (3.x via Nemo), Privatemode (3.3) | **Many EU options** — easiest family |
| **Mistral / Mixtral** | Azure (EUDB), Bedrock EU, Vertex EU (europe-west4) | OVHcloud, Scaleway | Chutes (Mistral-Nemo-TEE), Opaque | **Many EU options** (Mistral is EU-origin) |
| **Qwen3 / Qwen3.5 / Qwen3.6** | Vertex Model Garden (self-deploy; EU MaaS UNKNOWN) | **OVHcloud, Scaleway** (broad Qwen) | Chutes (multiple Qwen-TEE), Phala, NEAR | **Many EU options** — strong via OVH/Scaleway |
| **DeepSeek V4 / V3.2 / R1** | Azure (EUDB: R1/V3), Bedrock (R1, EU UNKNOWN), Vertex (Model Garden) | Scaleway (DeepSeek) | Chutes (V3.2-TEE), Tinfoil (R1/V4), Atoma (R1 671B) | **Several EU options** (Azure EUDB strongest) |
| **gpt-oss-120b / 20b** | **Azure (EUDB)**, Vertex (open) | **OVHcloud, Scaleway** | Tinfoil, Privatemode, Phala, Secret | **Many EU options** |
| **GLM 5.1 / 5.2 / 5** | Azure **only via Fireworks → EXCLUDED from EU**; not on Bedrock/Vertex EU | Not in OVH/Scaleway catalog yet | **Chutes (GLM-5/5.1/5.2-TEE)**, Phala (4.7/5/5.1), Privatemode (no), Tinfoil (5.1) | **Limited** — TEE (Chutes/Phala/Tinfoil) or self-deploy; no hyperscaler-EU. MIT license → self-host friendly |
| **Kimi K2.5 / K2.6 / K2.7** | Azure **only via Fireworks → EXCLUDED from EU** | Not yet (OVH roadmap request for K2.5) | **Chutes (K2.5/K2.6-TEE)**, Phala, Tinfoil, Privatemode (K2.6) | **Limited** — TEE or self-deploy; **Privatemode (DE) is the EU-pinned TEE route for K2.6**. K2.7 not yet seen in TEE catalogs |
| **MiniMax M2.5 / M2.7 / M3** | Azure Fireworks (marketing only, unconfirmed) → EXCLUDED | Not found | **Chutes (M2.5-TEE)**, Phala (M2.5) | **Very limited** — TEE only (M2.5); M2.7/M3 not found in EU/TEE routes; self-deploy |
| **MiMo-V2.5-Pro (Xiaomi)** | None found | None found | None found | **None found** — only Xiaomi's own platform + OpenRouter routing (non-EU). Self-deploy open weights is the only EU path |

**Reading the table.** Western-origin open families (**Llama, Mistral, Qwen, gpt-oss, DeepSeek**) have genuine, residency-guaranteed EU routes via hyperscalers and/or EU-native sovereign clouds. The three Chinese "flagship-coder" families (**GLM, Kimi, MiniMax**) have **no hyperscaler-EU residency** — Azure carries them only through Fireworks, which Microsoft explicitly excludes from the EU Data Boundary — so the realistic EU paths are **confidential-compute TEE providers** (Chutes, Phala, Tinfoil, and the EU-pinned Privatemode for Kimi K2.6 / gpt-oss) or **self-hosting the open weights** in an EU region. **MiMo-V2.5-Pro** has no managed EU option at all today; self-deploy is the only EU-residency path.

---

## Bottom line

- **Strongest EU-residency-guaranteed routes for Western open models (Llama/Mistral/Qwen/gpt-oss/DeepSeek):** AWS Bedrock EU Geo profile (default ZDR — best retention posture), Azure EU DataZone (EUDB, incl. Llama 4 / DeepSeek / gpt-oss), Google Vertex EU multi-region, and the SecNumCloud-certified **OVHcloud** + GDPR-ZDR **Scaleway** sovereign clouds.
- **Strongest confidentiality routes for Chinese open models (GLM/Kimi/MiniMax):** TEE providers — our own **Chutes** (Intel TDX + NVIDIA CC, `…-TEE` models incl. GLM 5/5.1/5.2, Kimi K2.5/K2.6, MiniMax M2.5, DeepSeek V3.2, plus opt-in post-quantum E2EE), **Phala** (on OpenRouter), **Tinfoil**, and the **EU-pinned Privatemode** (Germany, GDPR+NIS2) which carries Kimi K2.6 + gpt-oss.
- **The single cleanest EU-sovereign-and-confidential combo** for Chinese models is **Privatemode (Edgeless Systems, Germany)** — but its catalog is narrow.

## Key caveats

1. **The "global routing" trap** breaks EU residency on every hyperscaler: AWS Global cross-region profile, Azure Global deployment type, Vertex global endpoint. Always select the explicit EU-bounded alternative.
2. **Fireworks-on-Azure is a hard NO for EU residency** — explicitly excluded from the EU Data Boundary, serverless US-only. Kimi/GLM/MiniMax via Azure-Fireworks branding do **not** give EU residency.
3. **TEE-blindness ≠ EU residency.** Chutes and Phala give strong confidentiality but have **no documented EU data-center pinning** (UNKNOWN) — their miners/nodes can be anywhere. For *both* EU residency *and* confidentiality, use Privatemode (DE), Azure West Europe Confidential Inferencing, Vertex europe-west4 confidential GPU, or self-deploy in an EU TEE.
4. **No retention vs no training vs TEE-blindness are independent.** Only AWS Bedrock offers ZDR *by default*; Azure needs Limited Access approval; TEE providers vary (Tinfoil/Privatemode/Atoma assert both, Chutes/NEAR are primarily TEE-blindness).
5. **MiMo-V2.5-Pro** and **MiniMax M2.7/M3** currently have no managed EU/TEE route found — self-deploy only.

## Sources

**AWS Bedrock**
- https://aws.amazon.com/bedrock/faqs/
- https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/geographic-cross-region-inference.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html
- https://aws.amazon.com/compliance/eu-data-protection/
- https://aws.amazon.com/compliance/bsi-c5/
- https://aws.amazon.com/blogs/alps/security_bedrock/
- https://aws.amazon.com/blogs/security/aws-european-sovereign-cloud-achieves-first-compliance-milestone-soc-2-and-c5-reports-plus-seven-iso-certifications/

**Azure AI Foundry**
- https://learn.microsoft.com/en-us/privacy/eudb/eu-data-boundary-learn
- https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy
- https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/abuse-monitoring
- https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure
- https://learn.microsoft.com/en-us/azure/foundry/how-to/fireworks/enable-fireworks-models
- https://learn.microsoft.com/en-us/compliance/regulatory/offering-c5-germany
- https://learn.microsoft.com/en-us/compliance/regulatory/offering-hds-france

**Google Vertex AI**
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/partner-models/mistral
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/open-models/choose-serving-option
- https://services.google.com/fh/files/misc/genai_privacy_google_cloud.pdf
- https://blog.google/intl/en-ca/company-news/technology/announcing-data-residency-at-rest-and-during-machine-learning-ml-processing/
- https://cloud.google.com/security/compliance/iso-27001

**TEE / ZDR providers**
- https://openrouter.ai/docs/guides/features/zdr
- https://openrouter.ai/docs/guides/privacy/data-collection
- https://openrouter.ai/docs/guides/routing/provider-selection
- https://openrouter.ai/docs/guides/features/sovereign-ai
- https://openrouter.ai/provider/phala
- https://openrouter.ai/provider/chutes
- https://chutes.ai/news/confidential-compute-for-ai-inference-how-chutes-delivers-verifiable-privacy-with-trusted-execution-environments
- https://chutes.ai/news/end-to-end-encrypted-ai-inference-with-post-quantum-cryptography
- https://chutes.ai/docs/core-concepts/security-architecture
- https://llm.chutes.ai/v1/models
- https://phala.com/posts/Phala-GPU-TEE-Deep-Dive
- https://docs.redpill.ai/privacy/confidential-ai/models
- https://proof.t16z.com
- https://trust.phala.com
- https://tinfoil.sh/technology
- https://github.com/tinfoilsh/verifier
- https://privatemode.ai/security-and-encryption
- https://docs.privatemode.ai/architecture/overview
- https://edgeless.systems/products/new_continuum
- https://cloud.near.ai
- https://atoma.ai
- https://techcommunity.microsoft.com/blog/azureconfidentialcomputingblog/azure-ai-confidential-inferencing-technical-deep-dive/4253150
- https://docs.cloud.google.com/confidential-computing/confidential-vm/docs/create-a-confidential-vm-instance-with-gpu
- https://fortanix.com/platform/armet-ai

**EU-native providers (Angle 3)**
- https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/
- https://corporate.ovhcloud.com/en/newsroom/news/ai-endpoints/
- https://www.scaleway.com/en/docs/generative-apis/reference-content/supported-models/
- https://www.scaleway.com/en/generative-apis/
- https://www.eurouter.ai/providers
- https://github.com/ovh/public-cloud-roadmap/issues/1086
