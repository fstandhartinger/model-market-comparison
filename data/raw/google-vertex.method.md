# Google Vertex AI pricing — collection method

**Collected:** 2026-06-18 (refreshed)
**Output:** `google-vertex.json` (same shape as `aws-bedrock.json`) — 42 models

## Sources

Primary (authoritative), the official Vertex AI / "Agent Platform" pricing page:

- https://cloud.google.com/vertex-ai/generative-ai/pricing
  (redirects to `cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing`)

This single page contains both Google's Gemini pricing and the **Partner models**
section (Anthropic Claude, xAI Grok, DeepSeek, MiniMax, Moonshot/Kimi, GLM, Qwen,
OpenAI gpt-oss, Meta Llama, Mistral). The partner tables and the per-region Claude
tables are rendered client-side, so a plain HTTP fetch returns only the Gemini
section — the page was loaded in a **headless browser (`agent-browser`)** and
`document.body.innerText` scraped to read the partner tables.

## What changed at the 2026-06-18 refresh (was 41, now 42)

Compared the live page to the 2026-06-17 snapshot — pricing is essentially
unchanged in 24h. Only delta: **Gemini 2.0 Flash Lite** ($0.075 in / $0.30 out)
was added as its own row (it was on the page before but omitted from the JSON).
All Gemini, Claude EU-region (eu / europe-west1), Grok, DeepSeek, MiniMax, Kimi,
GLM, Qwen, gpt-oss, Llama, and Mistral rates verified identical to the prior
snapshot. The Claude region tables (one `<section data-tab=...>` per region inside
the `<devsite-selector>`) are all present in the DOM at once, so no clicking is
needed — read each section's `innerText` directly. EU surcharge is exactly +10%.

## What changed at the prior refresh (was 29 models, then 41)

NEW partner makers/models now present on Vertex Model Garden:
- **xAI Grok** (entirely new section): Grok 4.3, Grok 4.20 Reasoning/Non-Reasoning,
  Grok 4.1 Fast Reasoning/Non-Reasoning.
- **MiniMax-M2** — now has a usable per-token row (previously only a header).
- **Moonshot Kimi-K2-Thinking** — new "Moonshot's models" section.
- **GLM** (Zhipu) — new section: GLM-5 and GLM-4.7.
- **OpenAI gpt-oss-120b / gpt-oss-20b** — new open-weight rows.
- **Gemini 2.0 Flash** added.
- DeepSeek-OCR appeared too (omitted — priced per page, not a general LLM).

So **Kimi, GLM, and MiniMax ARE now on Vertex** (they were not before). **MiMo is
NOT** present. (For the record: Kimi=Moonshot, GLM=Zhipu, MiniMax=MiniMax.)

## Region handling (europe-west4 target)

- **Open partner models** (DeepSeek, MiniMax, Kimi, GLM, Qwen, gpt-oss, Llama,
  Mistral, Grok) are priced **per token with no regional differentiation** — single
  global rate. Tagged `"region": "global"`; the EU price equals the listed price.
- **Anthropic Claude** DOES have per-region pricing now (a region selector:
  Global / US Multi-Region / EU Multi-Region (eu) / us-east5 / europe-west1 /
  asia-southeast1 / asia-east1). **There is no europe-west4 tab.** The EU regions
  carry a **~10% surcharge** over Global. Crucially, the two EU regions list
  **different model subsets**:
  - **EU Multi-Region (eu)**: only Fable 5 ($11/$55), Opus 4.8 ($5.50/$27.50),
    Opus 4.7 ($5.50/$27.50).
  - **europe-west1**: Opus 4.6 & 4.5 ($5.50/$27.50), Sonnet 4.6 & 4.5
    ($3.30/$16.50), Haiku 4.5 ($1.10/$5.50).
  The JSON records each Claude model at its EU rate, tagging `region` as `eu` or
  `europe-west1` accordingly (with the Global rate noted). Claude Opus 4.1 has
  uniform pricing across all regions → `global`.
- **Gemini** 2.x family is global. The **Gemini 3+ family** has a **non-global
  surcharge** (Gemini 3.5 Flash $1.50/$9.00 Global vs **$1.65/$9.90 Non-global**;
  Gemini 3.1 Flash-Lite $0.25/$1.50 vs **$0.275/$1.65**). Those two use the
  non-global numbers tagged `europe-west4`. **Caveat:** Google states non-global
  pricing for GA Gemini 3+ takes effect **2026-07-01**; before that date Global
  pricing applies even to europe-west4. Gemini 3.1 Pro and Gemini 3 Flash show no
  non-global surcharge → `global`.

## Gemini context-tier caveat

Gemini Pro models are tiered by input context length (the JSON records the **base
≤200K tier**; the >200K tier is noted per-model):
- **Gemini 3.1 Pro:** $2/$12 for ≤200K; $4/$18 for >200K.
- **Gemini 2.5 Pro:** $1.25/$10 for ≤200K; $2.50/$15 for >200K.
Flash / Flash-Lite tiers are flat across context length. Grok also has a >200K
tier ($2.50/$5.00) noted in its rows.

## Notes / omissions

- **Multimodal sub-rates** (audio/image/video input, image output) are not separate
  rows — text input rate used; audio noted.
- **Batch / cache-hit / priority / cache-write** prices omitted (only on-demand
  standard pay-go captured; some cache-hit values noted).
- **Deprecated Claude** rows (Opus 4, Sonnet 4, Claude 3.x) omitted.
- **DeepSeek-OCR** and **Mistral OCR** omitted (per-page pricing, not general LLMs).
- **Gemini image/video-only** models (3 Pro Image, 3.1 Flash Image, 2.5 Flash
  Image, Deep Research Agent, Live API) omitted — not text-LLM pay-go rows.

## How to refresh

1. `agent-browser close` then
   `agent-browser open https://cloud.google.com/vertex-ai/generative-ai/pricing`
   (a plain fetch misses the JS-rendered partner + per-region Claude tables).
2. `agent-browser eval 'document.body.innerText' > /tmp/vertex.txt`, un-escape
   `\n`/`\t`, then grep the Gemini 3 / 2.5 tables and each partner header
   (Anthropic, xAI, Deepseek, MiniMax, Moonshot, Qwen, GLM, OpenAI, Meta's Llama,
   Mistral AI).
3. For Claude EU rates: NO clicking needed. The region selector is a
   `<devsite-selector>` web component whose region panes are all `<section
   data-tab="...">` siblings present in the DOM simultaneously. Read each region's
   text directly, e.g.:
   `agent-browser eval '(() => { const ds=[...document.querySelectorAll("devsite-selector")].find(d=>/EU Multi-Region/.test(d.textContent)); const s=[...ds.querySelectorAll("section")]; return s.find(x=>x.getAttribute("data-tab")==="eu-multi-region-eu").innerText; })()'`
   Region data-tabs: `global`, `us-multi-region-us`, `eu-multi-region-eu`,
   `us-east5`, `europe-west1`, `asia-southeast1`, `asia-east1`. The two EU regions
   list different model subsets (eu: Fable 5 + Opus 4.8/4.7; europe-west1: Opus
   4.6/4.5 + Sonnet 4.6/4.5 + Haiku 4.5).
   NOTE: use a dedicated `agent-browser --session vertex ...` — the shared `default`
   session can be hijacked by other concurrent agent-browser users and drift to a
   different URL mid-scrape.
4. Update the standard ≤200K base-tier input/output numbers. Re-check the
   non-global Gemini 3+ surcharge and whether it has gone into effect
   (2026-07-01 cutover) and the Claude EU surcharge (~10%).
