# AWS Bedrock pricing — how to (re)fetch & update

**Output file:** `data/raw/aws-bedrock.json`
**Last collected:** 2026-06-18 (bulk API version `20260619225109`)
**Primary method:** AWS Price List Bulk API (no auth). Pricing-page WebFetch + web search used only to fill gaps the bulk API doesn't cover (Anthropic Claude, Cohere).

**2026-06-18 snapshot result:** 61 models — 54 priced directly from `eu-central-1`, 2 from `eu-west-2` (Llama 3 8B / 70B), 4 from `eu-west-3` (Mistral 7B / Mistral Large / Mixtral 8x7B / Amazon Titan Text Lite), 5 gap-filled (3 Anthropic Claude served via EU cross-region profile + 2 Cohere Command US-region). New since the prior (2026-06-17) snapshot: **Amazon Titan Text Express (eu-central-1, $0.30 in / $0.863 out per 1M)** now appears directly in the EU bulk API, and **Amazon Titan Text Lite** is now sourced from the `eu-west-3` bulk index ($0.20/$0.25 per 1M) instead of the US pricing page, replacing the previous US-region gap-fill. Image/audio-only and embedding models with no text-token meter (Nova Canvas, Nova Sonic/2.0, Titan Embeddings G1/V2) are intentionally excluded.

**Models explicitly checked for and NOT on Bedrock (2026-06-18):** Kimi K2.6 / K2.7, GLM 5.1 / 5.2, MiniMax M2.6 / M2.7 / M3, MiMo, DeepSeek V4, Claude Opus 4.7 / 4.8 — none are present in the bulk API EU indexes or on the pricing page. Latest Bedrock versions remain Kimi K2.5, GLM 5, MiniMax M2.5, DeepSeek V3.2, Claude Opus 4.6 / Sonnet 4.6 / Haiku 4.5. (As always Bedrock carries no OpenAI GPT or Google Gemini chat models — only Google Gemma open weights and OpenAI gpt-oss.)

## 1. Price List Bulk API (primary, no auth, no AWS account)

The bulk API exposes per-region Bedrock price lists. All token prices are quoted **per 1,000 tokens** in USD — multiply by 1000 to get per-1M.

### Step A — get the current region index
```bash
curl -s "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/region_index.json" \
  -o region_index.json
```
This lists every region and a `currentVersionUrl` like
`/offers/v1.0/aws/AmazonBedrock/<VERSION>/<region>/index.json`.
EU regions present (2026-06): `eu-central-1, eu-west-1, eu-west-2, eu-west-3, eu-north-1, eu-south-1, eu-south-2, eu-central-2`.

### Step B — fetch the per-region index (Frankfurt = primary)
```bash
BASE="https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock"
# Use the dated VERSION from region_index.json, OR the 'current' alias.
# Simplest robust approach: download ALL EU region indexes (each ~150KB-960KB),
# parse each, and for every model pick the first region (in priority order) that
# has both standard Input+Output token meters. Priority order used 2026-06-17:
#   eu-central-1 > eu-west-3 > eu-west-1 > eu-north-1 > eu-south-1 > eu-west-2 > eu-south-2 > eu-central-2
for r in eu-central-1 eu-west-3 eu-west-1 eu-north-1 eu-south-1 eu-west-2 eu-south-2 eu-central-2; do
  curl -s "$BASE/current/$r/index.json" -o "bedrock_$r.json"
done
# Frankfurt (eu-central-1) carries the bulk of current models (~850 KB).
# eu-west-3 (Paris) adds legacy Mistral 7B / Mistral Large / Mixtral 8x7B.
# eu-west-2 (London) adds legacy Llama 3 8B / 70B.
```
The full multi-region `index.json` (`.../current/index.json`) is hundreds of MB — **do not** download it. Always use the per-region files.

### Step C — parse
Structure: `products` (sku -> attributes) + `terms.OnDemand` (sku -> priceDimensions with `pricePerUnit.USD`, `unit` = `"1K tokens"`).

Key attributes per product:
- `model` — display name (e.g. "Nova Pro", "Mistral Large 3")
- `provider` — org ("Mistral", "Qwen", "Meta", ...); **empty for Amazon's own models** (Nova) — default these to "Amazon".
- `inferenceType` — pick the **standard** text tiers only:
  - `"Input tokens"`  -> input price
  - `"Output tokens"` -> output price
  - Skip `*flex*`, `*priority*`, `*batch*`, audio/image/video token, and `Prompt cache read/write` variants (those are alternate service tiers / modalities).
- `service_tier` — `standard / flex / priority / batch`.

Normalization: `per_1m_usd = pricePerUnit.USD * 1000`.

Note: newer entries also use `inferenceType` = `"Text Input Tokens"` / `"Text Output Tokens"` (treat as equivalent to `Input tokens`/`Output tokens`). Skip any product whose only meters are image/audio/video token counts (e.g. Nova Canvas, Nova Sonic) — those have no text-token price and should be excluded from the LLM list.

Parsing logic (Python, used 2026-06-17): for each region file build `sku->USD` from `terms.OnDemand`; filter `products` to `service_tier == "standard"`; group by `(provider, model)` taking `Input/Text Input Tokens` -> input and `Output/Text Output Tokens` -> output; multiply per-1K USD by 1000. Then take the union of `(provider, model)` keys across all EU region files and, per model, select the first region (in the priority order above) that has both input+output meters. Tag `region` in the output and add a `notes` flag for any model not sourced from `eu-central-1`.

## 2. Gaps the bulk API does NOT cover well

- **Anthropic Claude (current 4.x):** the bulk API EU files contain **no Anthropic entries**, and us-east-1 only has stale Claude 2.x / 3.x with missing output prices. Current Claude pricing was taken from the public pricing page / Anthropic direct API (Bedrock matches direct API as of 2026-06):
  - Claude Opus 4.6 — $5 in / $25 out per 1M  (still the latest Opus on Bedrock as of 2026-06-17; 4.7/4.8 are Anthropic-direct only, not yet on Bedrock)
  - Claude Sonnet 4.6 — $3 in / $15 out per 1M
  - Claude Haiku 4.5 — $1 in / $5 out per 1M
  - In EU, Claude is served via the **EU cross-region inference profile** (`eu.anthropic.*`), not a single-region model. Cross-region inference can add ~10% in some configs.
- **Cohere Command / Command Light:** not in EU bulk API. Prices from public pricing page, US region ($0.0015/$0.0020 and $0.0003/$0.0006 per 1K). Marked region `us-east-1`.
- **Amazon Titan Text:** legacy, largely superseded by Nova; only Titan Text Lite captured from the pricing page ($0.0003/$0.0004 per 1K), region us-east-1.

To refresh these gap models, WebFetch `https://aws.amazon.com/bedrock/pricing/` (note: the page is JS-heavy and the markdown conversion is often partial/stale — cross-check with a web search for "AWS Bedrock <model> pricing per million tokens").

## 3. Caveats

- **EU availability:** Many flagship models (esp. Anthropic) are only invokable in EU via **cross-region inference profiles**, not as a regional model — the bulk API lists them per *underlying* region (US) rather than EU. Prices for the model are identical; the `region` field in the JSON notes where the listed price came from.
- Prices are **on-demand** only. Batch = ~50% off; prompt caching = up to ~90% off cached input. Not captured here.
- The bulk API `publicationDate` (e.g. 2026-06-11) tells you data freshness. Re-run Steps A–C to update; the dated `<VERSION>` path is immutable, `current/` always points at the latest.
- Provider name normalization applied in output: `Mistral AI`->`Mistral`, `Minimax AI`->`MiniMax`, `Z AI`->`Z.ai`, `Nvidia`->`NVIDIA`.
