# Google Vertex AI pricing — collection method

**Collected:** 2026-06-17
**Output:** `google-vertex.json` (same shape as `aws-bedrock.json`)

## Sources

Primary (authoritative), the official Vertex AI / "Agent Platform" pricing page:

- https://cloud.google.com/vertex-ai/generative-ai/pricing
  (redirects to `cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing`)

This single page contains both Google's Gemini pricing and the **Partner models**
section (Anthropic Claude, Meta Llama, Mistral, DeepSeek, Qwen). The partner tables
are rendered client-side, so a plain HTTP fetch returns only the Gemini section — the
page was loaded in a **headless browser (Playwright)** and the rendered text scraped to
read the partner tables.

Supporting / cross-reference (not used for final numbers):
- https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/claude (model list only)
- https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/mistral (model list only)
- https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/llama (model list only)
- Anthropic's own list prices (via the `claude-api` skill catalog) confirm Claude-on-Vertex
  mirrors Anthropic list pricing exactly (Fable 5 $10/$50, Opus 4.x $5/$25, Sonnet 4.x $3/$15,
  Haiku 4.5 $1/$5).

## Region assumption (europe-west4)

Vertex AI generative-AI token pricing is largely region-independent:

- **Partner models** (Claude, Llama, Mistral, DeepSeek, Qwen) are priced **per token with no
  regional differentiation** on the pricing page — Claude is listed under "Global" / "US
  Multi-Region (us)" with identical rates, and the open-model tables show a single global rate.
  These rows are tagged `"region": "global"` in the JSON; the EU price equals the listed price.
- **Gemini** pricing is per-token and global for the 2.x family. The **Gemini 3.x family** has a
  small **non-global surcharge**: Gemini 3.5 Flash is $1.50/$9.00 (Global) vs **$1.65/$9.90
  (Non-global)**, and Gemini 3.1 Flash-Lite is $0.25/$1.50 (Global) vs **$0.275/$1.65
  (Non-global)**. Since the task targets EU regions (europe-west4), the JSON uses the
  **non-global** numbers for those two models (tagged `"region": "europe-west4"`) and notes the
  Global figure. **Caveat:** Google states non-global pricing for GA Gemini 3+ takes effect
  **2026-07-01**; before that date Global pricing applies even to europe-west4. Gemini 3.1 Pro and
  Gemini 3 Flash show no non-global surcharge and are tagged `"region": "global"`.

## Gemini context-tier caveat

Gemini Pro models are tiered by input context length:
- **Gemini 3.1 Pro:** $2 / $12 for ≤200K input tokens; **$4 / $18 for >200K**.
- **Gemini 2.5 Pro:** $1.25 / $10 for ≤200K; **$2.50 / $15 for >200K**.

The JSON records the **standard ≤200K base tier** (the larger >200K tier is noted in each
model's `notes`). Flash / Flash-Lite tiers are flat across context length.

## Claude-on-Vertex note

Claude models are Model Garden **partner models** offered as managed APIs. Their Vertex
per-1M prices **mirror Anthropic's own list prices** exactly. Vertex charges all tokens
(input + output) at long-context rates once a query's input context ≥ 200K tokens; the base
(<200K) rate is recorded. `region` is set to `global` because Claude on Vertex is offered
through Global / US-multi-region endpoints with no separate EU token price on the pricing page.

## Notes / omissions

- **Multimodal sub-rates** (audio/image/video input, image output) are not separate rows —
  for Gemini Flash models the text/image/video input rate is used and the audio rate noted.
- **Batch / cache-hit / priority** prices are omitted (only on-demand standard pay-go captured).
- **Deprecated Claude** rows older than Opus 4.1 (Opus 4, Sonnet 4, Claude 3.x) and Mistral OCR
  (priced per page, not per useful token) were omitted to keep the set to current/comparable
  pay-go LLMs. MiniMax appeared as a partner header but no usable per-token row was rendered, so
  it was omitted.
- No model that is **self-deploy/throughput-only** (no MaaS pay-go rate) was included.

## How to refresh

1. Open https://cloud.google.com/vertex-ai/generative-ai/pricing in a headless browser
   (Playwright) — a plain fetch misses the JS-rendered partner tables.
2. Scrape `document.body.innerText` and grep for the partner section ("Anthropic's Claude
   models", "Meta's Llama models", "Mistral AI's models", "Deepseek's models", "Qwen's models")
   and the Gemini 3 / 2.5 tables.
3. Update the standard ≤200K base-tier input/output numbers. Re-check the non-global Gemini 3+
   surcharge and whether it has gone into effect (2026-07-01 cutover).
