# AWS Bedrock pricing — how to (re)fetch & update

**Output file:** `data/raw/aws-bedrock.json`
**Last collected:** 2026-07-22 (bulk API version `20260720215247`, published 2026-07-20; model cards, lifecycle, and public pricing re-checked)
**Primary method:** AWS Price List Bulk API (no auth) for regional standard on-demand meters. The official Bedrock pricing page plus official model-card and regional-availability pages fill current-model gaps that are not represented in the EU bulk indexes.

**Authoritative current-state sources:**
- https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/region_index.json
- https://aws.amazon.com/bedrock/pricing/
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html

**2026-07-22 snapshot result:** 77 active text-LLM offer rows (74 prior + 3 new). The bulk API version advanced to `20260720215247` (published 2026-07-20), but the EU bulk-priced set is unchanged: same 52 included bulk models, byte-identical prices, zero regional additions/removals. The bulk feed STILL lists Llama 3.2 1B/3B in `eu-central-1` (at $0.13/$0.13 and $0.19/$0.19) even though their Bedrock EOL date (2026-07-07) has passed and they are absent from the docs lifecycle pending-EOL table — this is price-list lag, and they remain excluded. **NEW: OpenAI GPT-5.6 Sol / Terra / Luna went GA on Bedrock 2026-07-13** (AWS what's-new `2026/07/openai-gpt-sol-terra`); like GPT-5.4/5.5 they are Bedrock Mantle models absent from the bulk API (verified: the us-east-1 bulk index contains no GPT-5.x entries, only gpt-oss/Safeguard), so they are gap-filled at the OpenAI first-party rates AWS explicitly says Bedrock matches: Sol `$5/$30` (us-east-1, us-east-2), Terra `$2.50/$15` (us-east-1, us-east-2, us-west-2; cross-confirmed on OpenRouter), Luna `$1/$6` (same 3 regions). GPT-5.4 and GPT-5.5 remain on the pricing page at unchanged prices and are retained. **Pricing-page gotcha:** the JS-heavy pricing page's markdown conversion showed "Claude Opus 4.8 $6/$30" — that is a conflation with the *legacy public-extended-access* rows (Claude 3.5 Sonnet/v2 now surface at $6/$30 markup); Opus 4.8 standard on-demand is confirmed still `$5/$25` by multiple current sources. Claude Sonnet 5's `$2/$10` launch promotion is still active (through 2026-08-31). Anthropic model-card set unchanged (Sonnet 5, Fable 5, Opus 4.8/4.7/4.6/4.5, Sonnet 4.6/4.5, Haiku 4.5 active; Mythos 5 + Mythos Preview still gated/non-GA and excluded; Opus 4.1, Sonnet 4, Claude 3.x now Legacy/pending-EOL and excluded). NEW-model re-check 2026-07-22: still NO GLM 5.1/5.2, Kimi K2.6/K2.7, MiniMax M2.6+/M3, or DeepSeek V4 anywhere in the EU bulk indexes; only new Bedrock launch in the 07-12→07-22 window is the GPT-5.6 trio. All prices USD upstream; no EUR conversion applicable.

**2026-07-12 snapshot result:** 74 active text-LLM offer rows. Of the 65-row input snapshot, Llama 3.2 1B and 3B were removed because their Bedrock EOL date was 2026-07-07. Eleven active, publicly priced gaps were added from the official pricing/model-card catalog: Claude Fable 5, Claude Opus 4.5/4.6, Claude Sonnet 4.5, Llama 3.1 8B/70B, Llama 3.3 70B, Llama 4 Maverick/Scout, Mistral Small 24.02, and Mistral Large 2 (24.07). Fable 5 is Global/US-Geo only; the other added Claude models have EU Geo profiles; the added Meta and older Mistral offers are US-only. Six other valid US-only gaps remain included: GPT-5.4, GPT-5.5, Grok 4.3, DeepSeek R1, Writer Palmyra X4, and Writer Palmyra X5. Legacy Cohere Command and Command Light remain excluded because the current pricing page exposes them under Provisioned Throughput rather than comparable on-demand token offers.

Seven `eu-central-1` rows had accidentally been overwritten with lower US prices on 2026-07-09. The authoritative Frankfurt bulk feed explicitly labels and prices these meters for EU (Frankfurt), so the regional values were restored: DeepSeek V3.1 `$0.696/$2.016`; gpt-oss-120b `$0.20/$0.79`; gpt-oss-20b `$0.09/$0.40`; Qwen3 235B A22B 2507 `$0.29/$1.16`; Qwen3 32B `$0.20/$0.79`; Qwen3 Coder 30B A3B `$0.20/$0.79`; Qwen3 Coder 480B A35B `$0.54/$2.16`. Cross-region routing has no surcharge, but AWS charges the source-region rate; that does not make the US price valid for a Frankfurt offer.

Claude Sonnet 5 stores the price effective on the collection date: the launch promotion is `$2/$10` through 2026-08-31. The row and this method record the exact transition date to the `$3/$15` standard price, 2026-09-01, so a future refresh can change the active price deterministically.

**2026-07-07 snapshot result:** 61 models — 54 priced directly from the bulk API (49 from `eu-central-1`, 2 from `eu-west-2` (Llama 3 8B / 70B), 3 from `eu-west-3` (Mistral 7B / Mistral Large / Mixtral 8x7B)), 7 gap-filled (5 Anthropic Claude via EU cross-region profile + 2 Cohere US-region). The bulk API version is **still `20260707080509`** (unchanged since 2026-07-06; `current/` did not advance) and the bulk-priced model set is **byte-for-byte identical to the 2026-07-06 snapshot: same 54 models, same prices, ZERO additions/removals/price changes.** Cosmetic raw-name quirks persist and are normalized as before (`google.gemma-4-26b-a4b/-31b/-e2b` -> `Gemma 4 26B A4B/31B/E2B`, `DeepSeek v3.2` -> `DeepSeek V3.2`, `Minimax M2/M2.1` -> `MiniMax M2/M2.1`). Anthropic + Cohere gap-fills preserved unchanged (bulk API still has no EU Anthropic entries). **NEW models re-checked and NOT found (2026-07-07):** GLM 5.1 / **GLM 5.2** (still NOT on Bedrock — latest Z.ai model is GLM 5, only `GLM 4.7`, `GLM 4.7 Flash`, `GLM 5` present across all 8 EU indexes), Kimi K2.6 / K2.7 (latest = K2.5; only `Kimi K2 Thinking` + `Kimi K2.5`), MiniMax M2.7 / M3 (latest = M2.5), DeepSeek V4 (latest = V3.2). No new Qwen3 / Nova / Llama / gpt-oss / Nemotron versions either.

**2026-07-06 snapshot result:** 61 models — 54 priced directly from the bulk API (49 from `eu-central-1`, 2 from `eu-west-2` (Llama 3 8B / 70B), 3 from `eu-west-3` (Mistral 7B / Mistral Large / Mixtral 8x7B)), 7 gap-filled (5 Anthropic Claude via EU cross-region profile + 2 Cohere US-region). The bulk API version **advanced to `20260707080509`** (from `20260619225109`), but the bulk-priced model set is unchanged vs the 2026-07-01 snapshot: **same 54 models, byte-identical prices, ZERO new models.** The only diff in the raw data is cosmetic — AWS now emits three Gemma-4 SKUs under raw model ids (`google.gemma-4-26b-a4b/-31b/-e2b`) and lowercases a few display strings (`DeepSeek v3.2`, `Minimax M2/M2.1`); these are normalized back to the prior human-readable names (`Gemma 4 26B A4B/31B/E2B`, `DeepSeek V3.2`, `MiniMax M2/M2.1`) in the output. Anthropic + Cohere gap-fills preserved unchanged (bulk API still contains no EU Anthropic entries). **NEW models checked and NOT found (2026-07-06):** GLM 5.1 / **GLM 5.2** (still NOT native on Bedrock — latest Z.ai model is GLM 5, model id `zai.glm-5`), Kimi K2.6 / K2.7 (latest = K2.5), MiniMax M2.7 / M3 (latest = M2.5), DeepSeek V4 (latest = V3.2), plus no new Qwen3 / Nova / Llama / gpt-oss versions. Image/speech-only models (Nova Canvas, Nova Sonic, Nova Sonic 2.0) present in some EU indexes but excluded by name.

**2026-07-01 snapshot result:** 61 models — 54 priced directly from the bulk API (49 from `eu-central-1`, 2 from `eu-west-2` (Llama 3 8B / 70B), 3 from `eu-west-3` (Mistral 7B / Mistral Large / Mixtral 8x7B)), 7 gap-filled (5 Anthropic Claude served via EU cross-region profile + 2 Cohere Command US-region). The bulk API version is **still `20260619225109`** (unchanged since the 2026-06-18 collection; `current/` did not advance), so the bulk-priced model set is byte-for-byte identical to the 2026-06-23 snapshot (54 models). **What changed is the Anthropic gap-fill.** The 2026-06-23 note claimed Claude Opus 4.7/4.8 were "not yet on Bedrock" and listed Opus 4.6 as the latest — that is now stale. As of 2026-07-01: **Claude Opus 4.8 has been on Bedrock since ~2026-05-28** (DevelopersIO), **Claude Opus 4.7 is also live**, and **Claude Sonnet 5 (released 2026-06-30) is live on Bedrock** (AWS blog "Introducing Claude Sonnet 5 on AWS", EU cross-region profile `eu.anthropic.claude-sonnet-5`, e.g. an eu-north-1 regional entry at $2.20/1M). The Anthropic gap-fill therefore now carries: Claude Sonnet 5, Opus 4.8, Opus 4.7, Sonnet 4.6, Haiku 4.5 (Opus 4.6 dropped as superseded). Image/audio/speech-only models with no standalone text-LLM use (Nova Canvas, Nova Sonic, Nova Sonic 2.0, Titan Embeddings) are intentionally excluded — Nova Sonic / Nova Sonic 2.0 DO carry "Text Input/Output Token" meters in `eu-north-1` but are speech-to-speech models, so they are excluded by name. Amazon Titan Text Express/Lite remain absent from all EU bulk indexes (dropped, as in 2026-06-23).

**Anthropic pricing basis (current 2026-07-22 gap-fill, unchanged since 2026-07-12):** Bedrock's standard on-demand rates match the published Anthropic rates. Claude Sonnet 5 is **$2/$10 through 2026-08-31**, then `$3/$15` beginning 2026-09-01. Claude Fable 5 is `$10/$50`; Opus 4.8/4.7/4.6/4.5 are `$5/$25`; Sonnet 4.6/4.5 are `$3/$15`; Haiku 4.5 is `$1/$5`. Fable 5's current official model card marks it Active but exposes only US Geo and Global inference IDs, so it is retained as a non-EU route. Mythos 5 and Mythos Preview are non-GA and have no comparable public standard token price, so they remain excluded.

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
  - Claude Sonnet 5 — active promotion $2 in / $10 out through 2026-08-31; $3/$15 from 2026-09-01
  - Claude Fable 5 — $10/$50, Global/US Geo only (not EU-hosted)
  - Claude Opus 4.8 — $5 in / $25 out per 1M (on Bedrock since ~2026-05-28; Fast Mode $10/$50 not captured)
  - Claude Opus 4.7 — $5 in / $25 out per 1M (also live on Bedrock)
  - Claude Opus 4.6 — $5/$25
  - Claude Opus 4.5 — $5/$25
  - Claude Sonnet 4.6 — $3 in / $15 out per 1M
  - Claude Sonnet 4.5 — $3/$15
  - Claude Haiku 4.5 — $1 in / $5 out per 1M
  - Where the model card exposes an EU Geo ID, Claude is served through the **EU cross-region inference profile** (`eu.anthropic.*`), not a single-region model. A European source region alone is insufficient when only the Global profile is available, as with Fable 5.
- **Cohere Command / Command Light:** excluded. The current public pricing table lists these legacy models under Provisioned Throughput rather than the comparable on-demand token table. Do not reconstruct token rows from the old pricing examples. Current Cohere models should only be added when an official on-demand token meter and supported region are both available.
- **Amazon Titan Text:** legacy, largely superseded by Nova. As of the 2026-06-23 snapshot, Titan Text Express and Titan Text Lite are **no longer present in ANY EU bulk index** (they briefly appeared in the 2026-06-18 snapshot) and are now dropped from the output entirely rather than gap-filled with stale US pricing-page values. If they need to be re-included, the historical US-region pricing was ~$0.0003/$0.0004 per 1K (Lite) / ~$0.0008/$0.0016 per 1K (Express).

To refresh these gap models, WebFetch `https://aws.amazon.com/bedrock/pricing/` (note: the page is JS-heavy and the markdown conversion is often partial/stale — cross-check with a web search for "AWS Bedrock <model> pricing per million tokens").

## 3. Caveats

- **EU availability:** Many flagship models (esp. Anthropic) are only invokable in EU via **EU cross-region inference profiles**, not as a single-region model. AWS prices Geo cross-region inference at the source-region rate. Never substitute a lower US price into an EU-region row; the JSON records the offer/inference scope used by that price.
- Prices are **on-demand** only. Batch = ~50% off; prompt caching = up to ~90% off cached input. Not captured here.
- The bulk API `publicationDate` (e.g. 2026-06-11) tells you data freshness. Re-run Steps A–C to update; the dated `<VERSION>` path is immutable, `current/` always points at the latest.
- Provider name normalization applied in output: `Mistral AI`->`Mistral`, `Minimax AI`->`MiniMax`, `Z AI`->`Z.ai`, `Nvidia`->`NVIDIA`.
