# AWS Bedrock pricing — how to (re)fetch & update

**Output file:** `data/raw/aws-bedrock.json`
**Last collected:** 2026-06-15
**Primary method:** AWS Price List Bulk API (no auth). Pricing-page WebFetch + web search used only to fill gaps the bulk API doesn't cover (Anthropic Claude, Cohere, Titan).

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
# Use the dated VERSION from region_index.json, OR the 'current' alias:
curl -s "$BASE/current/eu-central-1/index.json" -o bedrock_euc1.json   # ~850 KB, fine
# Also useful for legacy models not in Frankfurt:
curl -s "$BASE/current/eu-west-1/index.json" -o bedrock_ew1.json       # adds Mistral Large/7B, Mixtral
curl -s "$BASE/current/eu-west-2/index.json" -o bedrock_ew2.json       # adds Llama 3 8B/70B
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

Parsing snippet (Python) is in git history of this task; logic: build `sku->USD` from `terms.OnDemand`, then group `products` by `(provider, model)` taking `Input tokens`/`Output tokens`.

## 2. Gaps the bulk API does NOT cover well

- **Anthropic Claude (current 4.x):** the bulk API EU files contain **no Anthropic entries**, and us-east-1 only has stale Claude 2.x / 3.x with missing output prices. Current Claude pricing was taken from the public pricing page / Anthropic direct API (Bedrock matches direct API as of 2026-06):
  - Claude Opus 4.6 — $5 in / $25 out per 1M
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
