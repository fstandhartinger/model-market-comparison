# AWS Bedrock pricing — how to (re)fetch & update

**Output file:** `data/raw/aws-bedrock.json`
**Last collected:** 2026-07-07 (re-scrape; bulk API version `20260707080509`)
**Primary method:** AWS Price List Bulk API (no auth). Pricing-page WebFetch + web search used only to fill gaps the bulk API doesn't cover (Anthropic Claude, Cohere).

**2026-07-07 snapshot result:** 61 models — 54 priced directly from the bulk API (49 from `eu-central-1`, 2 from `eu-west-2` (Llama 3 8B / 70B), 3 from `eu-west-3` (Mistral 7B / Mistral Large / Mixtral 8x7B)), 7 gap-filled (5 Anthropic Claude via EU cross-region profile + 2 Cohere US-region). The bulk API version is **still `20260707080509`** (unchanged since 2026-07-06; `current/` did not advance) and the bulk-priced model set is **byte-for-byte identical to the 2026-07-06 snapshot: same 54 models, same prices, ZERO additions/removals/price changes.** Cosmetic raw-name quirks persist and are normalized as before (`google.gemma-4-26b-a4b/-31b/-e2b` -> `Gemma 4 26B A4B/31B/E2B`, `DeepSeek v3.2` -> `DeepSeek V3.2`, `Minimax M2/M2.1` -> `MiniMax M2/M2.1`). Anthropic + Cohere gap-fills preserved unchanged (bulk API still has no EU Anthropic entries). **NEW models re-checked and NOT found (2026-07-07):** GLM 5.1 / **GLM 5.2** (still NOT on Bedrock — latest Z.ai model is GLM 5, only `GLM 4.7`, `GLM 4.7 Flash`, `GLM 5` present across all 8 EU indexes), Kimi K2.6 / K2.7 (latest = K2.5; only `Kimi K2 Thinking` + `Kimi K2.5`), MiniMax M2.7 / M3 (latest = M2.5), DeepSeek V4 (latest = V3.2). No new Qwen3 / Nova / Llama / gpt-oss / Nemotron versions either.

**2026-07-06 snapshot result:** 61 models — 54 priced directly from the bulk API (49 from `eu-central-1`, 2 from `eu-west-2` (Llama 3 8B / 70B), 3 from `eu-west-3` (Mistral 7B / Mistral Large / Mixtral 8x7B)), 7 gap-filled (5 Anthropic Claude via EU cross-region profile + 2 Cohere US-region). The bulk API version **advanced to `20260707080509`** (from `20260619225109`), but the bulk-priced model set is unchanged vs the 2026-07-01 snapshot: **same 54 models, byte-identical prices, ZERO new models.** The only diff in the raw data is cosmetic — AWS now emits three Gemma-4 SKUs under raw model ids (`google.gemma-4-26b-a4b/-31b/-e2b`) and lowercases a few display strings (`DeepSeek v3.2`, `Minimax M2/M2.1`); these are normalized back to the prior human-readable names (`Gemma 4 26B A4B/31B/E2B`, `DeepSeek V3.2`, `MiniMax M2/M2.1`) in the output. Anthropic + Cohere gap-fills preserved unchanged (bulk API still contains no EU Anthropic entries). **NEW models checked and NOT found (2026-07-06):** GLM 5.1 / **GLM 5.2** (still NOT native on Bedrock — latest Z.ai model is GLM 5, model id `zai.glm-5`), Kimi K2.6 / K2.7 (latest = K2.5), MiniMax M2.7 / M3 (latest = M2.5), DeepSeek V4 (latest = V3.2), plus no new Qwen3 / Nova / Llama / gpt-oss versions. Image/speech-only models (Nova Canvas, Nova Sonic, Nova Sonic 2.0) present in some EU indexes but excluded by name.

**2026-07-01 snapshot result:** 61 models — 54 priced directly from the bulk API (49 from `eu-central-1`, 2 from `eu-west-2` (Llama 3 8B / 70B), 3 from `eu-west-3` (Mistral 7B / Mistral Large / Mixtral 8x7B)), 7 gap-filled (5 Anthropic Claude served via EU cross-region profile + 2 Cohere Command US-region). The bulk API version is **still `20260619225109`** (unchanged since the 2026-06-18 collection; `current/` did not advance), so the bulk-priced model set is byte-for-byte identical to the 2026-06-23 snapshot (54 models). **What changed is the Anthropic gap-fill.** The 2026-06-23 note claimed Claude Opus 4.7/4.8 were "not yet on Bedrock" and listed Opus 4.6 as the latest — that is now stale. As of 2026-07-01: **Claude Opus 4.8 has been on Bedrock since ~2026-05-28** (DevelopersIO), **Claude Opus 4.7 is also live**, and **Claude Sonnet 5 (released 2026-06-30) is live on Bedrock** (AWS blog "Introducing Claude Sonnet 5 on AWS", EU cross-region profile `eu.anthropic.claude-sonnet-5`, e.g. an eu-north-1 regional entry at $2.20/1M). The Anthropic gap-fill therefore now carries: Claude Sonnet 5, Opus 4.8, Opus 4.7, Sonnet 4.6, Haiku 4.5 (Opus 4.6 dropped as superseded). Image/audio/speech-only models with no standalone text-LLM use (Nova Canvas, Nova Sonic, Nova Sonic 2.0, Titan Embeddings) are intentionally excluded — Nova Sonic / Nova Sonic 2.0 DO carry "Text Input/Output Token" meters in `eu-north-1` but are speech-to-speech models, so they are excluded by name. Amazon Titan Text Express/Lite remain absent from all EU bulk indexes (dropped, as in 2026-06-23).

**Anthropic pricing basis (2026-07-01 gap-fill):** Bedrock matches Anthropic direct-API on-demand rates. Claude Sonnet 5 = **$3 in / $15 out standard** (Anthropic introductory promo of $2/$10 through 2026-08-31 — noted per-model but the STANDARD rate is stored so the value stays valid after the promo). Claude Opus 4.8 = $5/$25 (Fast Mode $10/$50 not captured). Claude Opus 4.7 = $5/$25. Claude Sonnet 4.6 = $3/$15. Claude Haiku 4.5 = $1/$5. Note: Claude Fable 5 / Mythos 5 access on Bedrock was revoked 2026-06-12 (US export-control directive), so they are intentionally excluded.

**Parser tier discrimination (important):** standard on-demand text price requires the row be NOT flex/priority/batch. Two families exist: (1) most 3rd-party models carry an explicit `service_tier` (`standard/flex/priority/batch`, `feature=None`) — take `service_tier=="standard"`; (2) Amazon Nova + a few legacy carry `service_tier=None` and instead use `feature` (`On-demand Inference` vs `Batch Inference`) and/or `usagetype` suffixes (`-batch`, `-cross-region-global`). Robust rule used: exclude any `feature` other than `On-demand Inference`/`None`; exclude any `usagetype` containing `batch`; accept `service_tier in {None,"standard"}` with a standard (un-suffixed) text input/output meter; and when both a regional `feature="On-demand Inference"` row and a tier-less `-cross-region-global` row exist for the same model+meter, prefer the regional on-demand row so input and output prices come from the same family. Build script: `build.py` in the scratchpad (logic documented in §1).

**Models explicitly checked for and NOT on Bedrock (2026-07-01 re-scrape):** Kimi K2.6 / K2.7, GLM 5.1 / 5.2, MiniMax M2.6 / M2.7 / M3, MiMo, DeepSeek V4 — none are present in the bulk API EU indexes or on the pricing page. Latest 3rd-party Bedrock versions remain Kimi K2.5, GLM 5, MiniMax M2.5, DeepSeek V3.2. **GLM 5.2 specifically re-verified NOT on Bedrock:** the official AWS docs Z.AI model-cards index (`model-cards-zai.html`) lists only GLM 4.7, GLM 4.7 Flash, GLM 5 (model card `model-card-zai-glm-5.html`, model id `zai.glm-5`); there is no `model-card-zai-glm-5-2` page and an open opencode feature request (#32172) asks to *add* GLM 5.2 Z.AI support, confirming it is not yet available. Some third-party price aggregators/blogs incorrectly present GLM 5.2 as "available at bedrock/us-east-1/zai.glm-5" — that conflates GLM 5.2's Z.ai-direct price ($1.40 in / $4.40 out, standalone API live 2026-06-16) with the existing `zai.glm-5` (GLM 5) Bedrock model id (AWS bulk price $1.20 in / $3.84 out). AWS's own "744B / 40B active" description for GLM 5 further fuels the mix-up. GLM 5 remains the latest Z.ai model actually on Bedrock. **Anthropic (via pricing page / EU cross-region profile, NOT bulk API):** Claude Sonnet 5 (NEW, released 2026-06-30) IS on Bedrock and is now included; Claude Opus 4.8 and Opus 4.7 are also on Bedrock (both added since the stale 2026-06-23 note that claimed they weren't) and are now included; Sonnet 4.6 / Haiku 4.5 still current; Opus 4.6 dropped as superseded. Nova 2.x present: Nova 2.0 Lite / Omni / Pro (plus first-gen Nova Lite / Micro / Pro). (As always Bedrock carries no OpenAI GPT or Google Gemini chat models — only Google Gemma open weights and OpenAI gpt-oss.)

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

- **Anthropic Claude (current):** the bulk API EU files contain **no Anthropic entries**, and us-east-1 only has stale Claude 2.x / 3.x with missing output prices. Current Claude pricing was taken from the public pricing page / Anthropic direct API (Bedrock matches direct API as of 2026-07):
  - Claude Sonnet 5 — $3 in / $15 out per 1M standard (NEW 2026-06-30, live on Bedrock; introductory promo $2/$10 through 2026-08-31)
  - Claude Opus 4.8 — $5 in / $25 out per 1M (on Bedrock since ~2026-05-28; Fast Mode $10/$50 not captured)
  - Claude Opus 4.7 — $5 in / $25 out per 1M (also live on Bedrock)
  - Claude Sonnet 4.6 — $3 in / $15 out per 1M
  - Claude Haiku 4.5 — $1 in / $5 out per 1M
  - In EU, Claude is served via the **EU cross-region inference profile** (`eu.anthropic.*`), not a single-region model. Cross-region inference can add ~10% in some configs (e.g. Sonnet 5 shows $2.20/1M for the eu-north-1 leg at promo rate).
- **Cohere Command / Command Light:** not in EU bulk API. Prices from public pricing page, US region ($0.0015/$0.0020 and $0.0003/$0.0006 per 1K). Marked region `us-east-1`.
- **Amazon Titan Text:** legacy, largely superseded by Nova. As of the 2026-06-23 snapshot, Titan Text Express and Titan Text Lite are **no longer present in ANY EU bulk index** (they briefly appeared in the 2026-06-18 snapshot) and are now dropped from the output entirely rather than gap-filled with stale US pricing-page values. If they need to be re-included, the historical US-region pricing was ~$0.0003/$0.0004 per 1K (Lite) / ~$0.0008/$0.0016 per 1K (Express).

To refresh these gap models, WebFetch `https://aws.amazon.com/bedrock/pricing/` (note: the page is JS-heavy and the markdown conversion is often partial/stale — cross-check with a web search for "AWS Bedrock <model> pricing per million tokens").

## 3. Caveats

- **EU availability:** Many flagship models (esp. Anthropic) are only invokable in EU via **cross-region inference profiles**, not as a regional model — the bulk API lists them per *underlying* region (US) rather than EU. Prices for the model are identical; the `region` field in the JSON notes where the listed price came from.
- Prices are **on-demand** only. Batch = ~50% off; prompt caching = up to ~90% off cached input. Not captured here.
- The bulk API `publicationDate` (e.g. 2026-06-11) tells you data freshness. Re-run Steps A–C to update; the dated `<VERSION>` path is immutable, `current/` always points at the latest.
- Provider name normalization applied in output: `Mistral AI`->`Mistral`, `Minimax AI`->`MiniMax`, `Z AI`->`Z.ai`, `Nvidia`->`NVIDIA`.
