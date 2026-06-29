# EU LLM Hosting Tracker — Scrape & Classification

- **Source site:** <https://llm-tracker.eu/> ("EU LLM Hosting Tracker — Which LLMs really run in Europe?")
- **Maintainer / data owner:** they consulting (<https://they-consulting.de/>), Germany
- **Underlying data source:** the page is a Vite/React SPA whose provider data is **hardcoded in `src/components/ProvidersTable.tsx`** in the open-source repo <https://github.com/THEY-Consulting/eu-llm-tracker>. There is no API/JSON feed and no separate "Runtimes" dataset (the `RuntimeCard.tsx` component is an unused template). Per-provider `sources[]` links point to each vendor's own product/pricing pages (footnotes `[0]`, `[1]` in the table). Contributions are via GitHub Issues. Self-described as community-driven, "based on publicly available research."
- **Scraped:** 2026-06-29 via agent-browser (session `llmtracker`) + repo source + provider pricing pages.

**Important framing note:** This tracker is about *EU data residency / sovereignty of hosting*, NOT about who offers a per-token API to SOTA open models. Most rows are GPU-rental clouds. The tracker does **not** itself publish per-token model prices — it links out to vendor pricing pages. It tracks **24 providers total** (including 7 US-HQ hyperscalers/AI labs that merely offer EU regions).

---

## 1. Full provider table (all 24, verbatim from tracker data)

Columns: `managedLLMs` = offers managed/hosted LLMs (per-token or turnkey); `gpuInstances` = rents raw GPU; `US law` = subject to US CLOUD Act.

| # | Provider | HQ | Compute regions | Managed LLMs | GPU instances | US law | Tracker comment | URL |
|---|----------|----|----|:--:|:--:|:--:|----|-----|
| 1 | Aleph Alpha | 🇩🇪 DE | DE | Yes | No | No | Own LLM family, **Pharia** models, business partnerships | aleph-alpha.com |
| 2 | Aruba Cloud | 🇮🇹 IT | IT, FR, UK, PL, CZ | No | Yes | No | European cloud infra (dedicated AI/ML servers) | arubacloud.com |
| 3 | AWS | 🇺🇸 US | US, EU, APAC | Yes | Yes | **Yes** | Bedrock managed LLMs, EC2 instances | aws.amazon.com |
| 4 | Azure | 🇺🇸 US | US, EU, APAC | Yes | Yes | **Yes** | EU data regions, OpenAI models | azure.microsoft.com |
| 5 | Cloudiax | 🇩🇪 DE | DE | No | Yes | No | German cloud, **managed Llama** (flat monthly GPU) | cloudiax.de |
| 6 | CoreWeave | 🇺🇸 US | US, EU | No | Yes | **Yes** | GPU cloud, some EU data centers | coreweave.com |
| 7 | elastx | 🇸🇪 SE | SE | No | Yes | No | Swedish cloud, GPU instances | elastx.se |
| 8 | Exoscale | 🇨🇭 CH | CH, DE, AT | No | Yes | No | Swiss cloud, GPU instances | exoscale.com |
| 9 | Genesis Cloud | 🇩🇪 DE | NO | No | Yes | No | EU GPU cloud, hourly billing | genesiscloud.com |
| 10 | Google Cloud | 🇺🇸 US | US, EU, APAC | Yes | Yes | **Yes** | EU data regions, Gemini models | cloud.google.com |
| 11 | gridscale | 🇩🇪 DE | DE | No | Yes | No | German cloud, GPU instances (acquired by OVHcloud 2023) | gridscale.io |
| 12 | Hetzner | 🇩🇪 DE | DE, FI | No | Yes | No | Cost-effective German hosting (GPU root servers) | hetzner.com |
| 13 | Hugging Face | 🇺🇸 US | US, EU | Yes | Yes | **Yes** | Model hub, inference endpoints; enterprise can opt EU residency | huggingface.co |
| 14 | IBM Cloud | 🇺🇸 US | US, EU, APAC | No | Yes | **Yes** | Own model family **Granite** | ibm.com/cloud |
| 15 | IONOS Cloud | 🇩🇪 DE | DE, ES, UK | No¹ | Yes | No | EU cloud with **AI Model Hub** (per-token serverless) | cloud.ionos.com |
| 16 | Mein LLM | 🇩🇪 DE | DE | No | Yes | No | German LLM hosting on dedicated GPU servers | meinllm.de |
| 17 | Mistral AI | 🇫🇷 FR | EU, US | Yes | No | No | EU AI company, Mistral models, token-based API | mistral.ai |
| 18 | Open Telekom Cloud | 🇩🇪 DE | DE, NL | No | Yes | No | Deutsche Telekom cloud, GDPR, enterprise focus | open-telekom-cloud.com |
| 19 | OpenAI | 🇺🇸 US | US, EU | Yes | No | **Yes** | GPT models, EU residency for Enterprise | openai.com |
| 20 | OVHcloud | 🇫🇷 FR | FR, DE, UK, PL, CA | No | Yes | No | EU cloud, GPU hosting | ovhcloud.com |
| 21 | Scaleway | 🇫🇷 FR | FR, NL, PL | Yes | Yes | No | EU GPU cloud, **Generative APIs** (per-token) | scaleway.com |
| 22 | Seeweb | 🇮🇹 IT | IT | No | Yes | No | Italian cloud, hourly GPU | seeweb.it |
| 23 | STACKIT | 🇩🇪 DE | DE, AT | No¹ | Yes | No | Schwarz Group, **AI Model Serving** (token-based) | stackit.de |
| 24 | Together AI | 🇺🇸 US | US, EU | Yes | Yes | **Yes** | OSS model hosting (EU residency unclear), dedicated GPU in EU | together.ai |
| 25 | UpCloud | 🇫🇮 FI | FI, DE, NL, SE, UK, APAC | No | Yes | No | Nordic cloud, AI-ready GPU servers | upcloud.com |

¹ Tracker marks IONOS & STACKIT `managedLLMs:false` but their comments + linked pages show they DO run per-token managed LLM serving (tracker field is conservative/inaccurate here). Verified independently below.

> Total rows: **25** (the tracker's headline "24" undercounts by one; the rendered table shows all 25 above — Aruba through UpCloud).

**EU data-residency / GDPR / TEE / certifications shown by the tracker:** Only a coarse "US Law / CLOUD Act" flag (🇪🇺 Not US law vs 🇺🇸 US Law) and compute-region flags. **No TEE, no SOC2/ISO/C5 certifications, no GDPR cert detail** are shown per provider. Cloudiax page mentions "TIER 3" datacenter; STACKIT is Schwarz-Group/German-sovereign; none of that is structured in the tracker.

---

## 2. BUCKET A — "ADD as a price source"

Criteria: offers a **per-token serverless API** for ≥1 benchmarked SOTA open model, AND not already {Nebius, Inceptron}.

Benchmarked SOTA set we care about: GLM 5.1/5.2, Kimi K2.x, DeepSeek V4 Pro/V3.2/R1, MiniMax M2.5/M2.7/M3, Qwen3 (Coder/235B/Next), Llama 4/3.x, Mistral (Large/Medium/Magistral), gpt-oss-120b/20b, Xiaomi MiMo.

### A1. Scaleway (FR) — **STRONG ADD** ✅
- Per-token serverless **Generative APIs**, EU regions (FR/NL/PL). Source: <https://www.scaleway.com/en/generative-apis/>
- Serves several benchmarked SOTA open models: **Qwen3 235B, Qwen3 Coder, Mistral Small/Medium, gpt-oss-120b, Llama 3.3 70B** (plus newer Qwen 3.5/3.6, Gemma, DevStral).
- Prices shown in **EUR**/1M tokens (table below). USD conversion noted (≈1.08 USD/EUR; mark as derived).

| Model (Scaleway naming) | In €/1M | Out €/1M | Maps to benchmarked? |
|---|---|---|---|
| Llama 3.3 70B Instruct | 0.90 | 0.90 | Llama 3.x ✅ |
| Qwen3 235B A22B Instruct | 0.75 | 2.25 | Qwen3 235B ✅ |
| Qwen3 Coder 30B A3B | 0.20 | 0.80 | Qwen3 Coder ✅ |
| Mistral Small 3.2 24B | 0.15 | 0.35 | Mistral Small (near-set) |
| Mistral Medium 3.5 128B | 1.50 | 7.50 | Mistral Medium ✅ |
| gpt-oss-120b | 0.15 | 0.60 | gpt-oss-120b ✅ |
| Qwen 3.5 397B A17B | 0.60 | 3.60 | newer Qwen (beyond set) |
| Qwen 3.6 35B A3B | 0.25 | 1.50 | newer Qwen |
| DevStral 2 123B | 0.40 | 2.00 | Mistral-family coder |
| Gemma 4 26B / Gemma 3 27B | 0.25 | 0.50 | not in set |

> NOTE: prices are EUR. Convert to USD at ingest time with the day's FX (do NOT hardcode). The JSON block below leaves USD fields as the EUR value with a `notes` flag — **must be FX-converted before ingest**.

### A2. IONOS Cloud (DE) — **STRONG ADD** ✅
- Per-token serverless **AI Model Hub**, OpenAI-compatible, pay-per-use, DE region. Source: <https://cloud.ionos.de/managed/ai-model-hub>
- Serves benchmarked SOTA open models: **gpt-oss-120b, Llama 3.3 70B, Llama 3.1 405B** (plus Mistral variants).

| Model | In €/1M | Out €/1M | Maps to benchmarked? |
|---|---|---|---|
| gpt-oss-120b | 0.15 | 0.65 | gpt-oss-120b ✅ |
| Llama 3.3 70B Instruct | 0.65 | 0.65 | Llama 3.x ✅ |
| Llama 3.1 405B Instruct | 1.75 | 1.75 | Llama 3.x ✅ |
| Llama 3.1 8B Instruct | 0.15 | 0.15 | Llama 3.x (small) |
| Mistral Small 24B Instruct | 0.10 | 0.30 | Mistral Small (near-set) |
| Mistral Nemo Instruct | 0.15 | 0.15 | not in set |

> Prices EUR — FX-convert before ingest. (Code/Vision/Embedding tiers exist but weren't published in the scraped excerpt — UNKNOWN.)

### A3. Mistral AI (FR) — **ADD (own open-weight SOTA models)** ✅
- Per-token API, EU-resident (FR), token-based pricing. Source: <https://mistral.ai/pricing>
- Directly in benchmarked set: **Mistral Large, Mistral Medium, Magistral**. Prices already in **USD**.

| Model | In $/1M | Out $/1M | Maps to benchmarked? |
|---|---|---|---|
| Mistral Large 3 (open-weight) | 0.50 | 1.50 | Mistral Large ✅ |
| Mistral Medium 3.5 | 1.50 | 7.50 | Mistral Medium ✅ |
| Magistral Medium | 2.00 | 5.00 | Magistral ✅ |
| Mistral Small 4 (Apache-2.0) | 0.15 | 0.60 | Mistral Small (near-set) |
| Codestral | 0.30 | 0.90 | coding (near-set) |
| Devstral 2 (open-weights) | 0.40 | 2.00 | coding (near-set) |

> Mistral is technically "own-models-only," but its models ARE in our benchmarked SOTA set and it has a clean per-token USD API → belongs in Bucket A, not B.

### A4. STACKIT (DE) — **ADD candidate, but price data NOT ingest-ready** ⚠️
- Per-token **AI Model Serving** (Schwarz Group, EU01/DE, fully sovereign). Sources: <https://www.stackit.de/en/product/stackit-ai-model-serving/>, pricing page (now <https://stackit.com/en/prices/cloud>).
- Confirmed token-based billing, but the **public pricing is by server "flavor" tier** (standard/plus/premium, e.g. €0.15/€0.45/€1.50 per *hour* for input flavors) and the **model catalog + clean per-model per-token prices are NOT published openly** (page only name-drops "Llama 3.1"; full list behind portal/contact). **Per-1M-token input/output: UNKNOWN.**
- Action: ADD once we can read the portal model catalog & token prices; not auto-ingestable from public pages today.

> Bucket-A providers (Scaleway, IONOS, Mistral, STACKIT) are all in our "already known EU-sovereign" list, but the task's Bucket-A test is "per-token API for a SOTA open model AND not Nebius/Inceptron" — they all pass and are concrete **price sources to add to the dataset**.

---

## 3. BUCKET B — "EU Sovereign page only"

Providers that only offer weak/proprietary own models, are GPU-rental-only / own-models-only, or have no usable per-token SOTA API.

| Provider | Country | What it offers | Why Bucket B | URL |
|---|---|---|---|---|
| Aleph Alpha | 🇩🇪 DE | Own **Pharia** models only | Proprietary, not in benchmarks; no SOTA open-model per-token API | aleph-alpha.com |
| Aruba Cloud | 🇮🇹 IT | Dedicated GPU servers | GPU-rental only, no managed per-token LLMs | arubacloud.com |
| Cloudiax | 🇩🇪 DE | Managed Llama 3.1-8B / 3.3-70B on **flat monthly GPU** (€999 / €3,499 mo) | NOT per-token; dedicated-GPU flat rate | cloudiax.de |
| CoreWeave | 🇺🇸 US | GPU cloud (some EU DCs) | GPU-rental only; US law | coreweave.com |
| elastx | 🇸🇪 SE | GPU instances | GPU-rental only | elastx.se |
| Exoscale | 🇨🇭 CH | GPU instances | GPU-rental only | exoscale.com |
| Genesis Cloud | 🇩🇪 DE (NO region) | Hourly GPU | GPU-rental only | genesiscloud.com |
| gridscale | 🇩🇪 DE | GPU instances | GPU-rental only | gridscale.io |
| Hetzner | 🇩🇪 DE | GPU dedicated/root servers | GPU-rental only | hetzner.com |
| Hugging Face | 🇺🇸 US | Model hub + inference endpoints | Per-endpoint (dedicated) hosting, EU residency only for enterprise; US law; not a clean EU per-token SOTA price list | huggingface.co |
| IBM Cloud | 🇺🇸 US | Own **Granite** models + GPU | Proprietary own-model + GPU; US law | ibm.com/cloud |
| Mein LLM | 🇩🇪 DE | LLM hosting on dedicated GPU | Dedicated-GPU, not serverless per-token | meinllm.de |
| Open Telekom Cloud | 🇩🇪 DE | GPU cloud (T-Systems) | GPU-rental; (their separate **LLMHub** is the managed offering, not surfaced here) | open-telekom-cloud.com |
| OVHcloud | 🇫🇷 FR | GPU hosting | Listed here as GPU-only (OVH does have AI Endpoints elsewhere, but tracker row is GPU); already known to us | ovhcloud.com |
| Seeweb | 🇮🇹 IT | Hourly GPU | GPU-rental only | seeweb.it |
| Together AI | 🇺🇸 US | OSS model hosting + EU dedicated GPU | EU residency unclear, US law; EU is dedicated GPU not guaranteed per-token EU | together.ai |
| UpCloud | 🇫🇮 FI | AI-ready GPU servers | GPU-rental only | upcloud.com |

**US-HQ hyperscalers / labs already ingested (EU regions) — neither bucket, already covered:** AWS (Bedrock), Azure (AI Foundry), Google Cloud (Vertex), OpenAI.

---

## 4. New SOTA-serving EU providers we may be MISSING

Cross-referencing the tracker against what we already ingest {Nebius, Inceptron, AWS, Azure, Google} and already-know {STACKIT, T-Systems/LLMHub, IONOS, OVHcloud, Scaleway, SAP AI Core, Aleph Alpha}:

- **Nothing genuinely new.** Every Bucket-A per-token SOTA provider on the tracker (Scaleway, IONOS, Mistral, STACKIT) was already in our "known EU-sovereign" set. The tracker does NOT surface Nebius, Inceptron, T-Systems LLMHub, SAP AI Core, or OVHcloud AI Endpoints as managed-LLM rows at all — so it's a *less* complete per-token catalog than what we already track.
- **Actionable takeaway:** the tracker adds no missing per-token SOTA provider. Its value to us is the long tail of **EU GPU-rental clouds** (Bucket B) for a "sovereign hosting" page, plus confirming Scaleway/IONOS/Mistral as clean per-token price sources to actually wire into the dataset (we currently ingest none of these three for prices — only Nebius + Inceptron + hyperscalers).
- **Mistral** caveat: we ingest Mistral via AWS Bedrock / Azure already, but **not Mistral's own first-party EU API prices** — worth adding as a distinct source.

---

## 5. Ready-to-ingest JSON blocks (aws-bedrock.json shape)

> WARNING: Scaleway and IONOS prices are in **EUR**. The fields below carry the EUR number verbatim with a `notes` flag — they MUST be FX-converted to USD before ingestion (do not treat as USD). Mistral block is already USD. `collected_at` = scrape date.

### Scaleway (EUR — convert before ingest)
```json
{
  "source": "scaleway-generative-apis",
  "region": "eu-fr-par",
  "collected_at": "2026-06-29",
  "currency_note": "PRICES ARE EUR per 1M tokens — FX-convert to USD before ingest",
  "models": [
    {"model_name": "Llama 3.3 70B Instruct", "provider_org": "Meta", "input_per_1m_usd": 0.90, "output_per_1m_usd": 0.90, "region": "eu-fr-par", "notes": "EUR not USD; per-token serverless Generative APIs"},
    {"model_name": "Qwen3 235B A22B Instruct", "provider_org": "Alibaba", "input_per_1m_usd": 0.75, "output_per_1m_usd": 2.25, "region": "eu-fr-par", "notes": "EUR not USD"},
    {"model_name": "Qwen3 Coder 30B A3B", "provider_org": "Alibaba", "input_per_1m_usd": 0.20, "output_per_1m_usd": 0.80, "region": "eu-fr-par", "notes": "EUR not USD"},
    {"model_name": "Mistral Small 3.2 24B", "provider_org": "Mistral", "input_per_1m_usd": 0.15, "output_per_1m_usd": 0.35, "region": "eu-fr-par", "notes": "EUR not USD"},
    {"model_name": "Mistral Medium 3.5 128B", "provider_org": "Mistral", "input_per_1m_usd": 1.50, "output_per_1m_usd": 7.50, "region": "eu-fr-par", "notes": "EUR not USD"},
    {"model_name": "gpt-oss-120b", "provider_org": "OpenAI", "input_per_1m_usd": 0.15, "output_per_1m_usd": 0.60, "region": "eu-fr-par", "notes": "EUR not USD"}
  ]
}
```

### IONOS AI Model Hub (EUR — convert before ingest)
```json
{
  "source": "ionos-ai-model-hub",
  "region": "eu-de",
  "collected_at": "2026-06-29",
  "currency_note": "PRICES ARE EUR per 1M tokens — FX-convert to USD before ingest",
  "models": [
    {"model_name": "gpt-oss-120b", "provider_org": "OpenAI", "input_per_1m_usd": 0.15, "output_per_1m_usd": 0.65, "region": "eu-de", "notes": "EUR not USD; OpenAI-compatible per-token serverless, pay-per-use"},
    {"model_name": "Llama 3.3 70B Instruct", "provider_org": "Meta", "input_per_1m_usd": 0.65, "output_per_1m_usd": 0.65, "region": "eu-de", "notes": "EUR not USD"},
    {"model_name": "Llama 3.1 405B Instruct", "provider_org": "Meta", "input_per_1m_usd": 1.75, "output_per_1m_usd": 1.75, "region": "eu-de", "notes": "EUR not USD"},
    {"model_name": "Llama 3.1 8B Instruct", "provider_org": "Meta", "input_per_1m_usd": 0.15, "output_per_1m_usd": 0.15, "region": "eu-de", "notes": "EUR not USD"},
    {"model_name": "Mistral Small 24B Instruct", "provider_org": "Mistral", "input_per_1m_usd": 0.10, "output_per_1m_usd": 0.30, "region": "eu-de", "notes": "EUR not USD"}
  ]
}
```

### Mistral first-party API (USD — ingest-ready)
```json
{
  "source": "mistral-api",
  "region": "eu",
  "collected_at": "2026-06-29",
  "models": [
    {"model_name": "Mistral Large 3", "provider_org": "Mistral", "input_per_1m_usd": 0.50, "output_per_1m_usd": 1.50, "region": "eu", "notes": "open-weight flagship; first-party EU API"},
    {"model_name": "Mistral Medium 3.5", "provider_org": "Mistral", "input_per_1m_usd": 1.50, "output_per_1m_usd": 7.50, "region": "eu", "notes": "first-party EU API"},
    {"model_name": "Magistral Medium", "provider_org": "Mistral", "input_per_1m_usd": 2.00, "output_per_1m_usd": 5.00, "region": "eu", "notes": "reasoning model"},
    {"model_name": "Mistral Small 4", "provider_org": "Mistral", "input_per_1m_usd": 0.15, "output_per_1m_usd": 0.60, "region": "eu", "notes": "Apache-2.0"},
    {"model_name": "Codestral", "provider_org": "Mistral", "input_per_1m_usd": 0.30, "output_per_1m_usd": 0.90, "region": "eu", "notes": "coding"},
    {"model_name": "Devstral 2", "provider_org": "Mistral", "input_per_1m_usd": 0.40, "output_per_1m_usd": 2.00, "region": "eu", "notes": "open-weights agentic coding"}
  ]
}
```

### STACKIT — no ingest block
Per-token model catalog & per-model token prices NOT public; pricing is server-flavor/hour tiers. UNKNOWN until portal access. Sources: <https://stackit.com/en/products/data-ai/stackit-ai-model-serving>, <https://stackit.com/en/prices/cloud>.

---

## Source URLs (key)
- Tracker: <https://llm-tracker.eu/> · Repo (data source): <https://github.com/THEY-Consulting/eu-llm-tracker> · Maintainer: <https://they-consulting.de/>
- Scaleway Generative APIs: <https://www.scaleway.com/en/generative-apis/>
- IONOS AI Model Hub: <https://cloud.ionos.de/managed/ai-model-hub>
- Mistral pricing: <https://mistral.ai/pricing>
- STACKIT AI Model Serving: <https://stackit.com/en/products/data-ai/stackit-ai-model-serving>
- Cloudiax managed LLM: <https://www.cloudiax.com/de/ki-managed-llm/>
