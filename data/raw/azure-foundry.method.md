# Azure AI Foundry pricing — how to re-fetch / update

**Last collected:** 2026-07-07 (76 text LLMs; 6,757 EU items fetched — comprehensive re-scrape;
IDENTICAL to 2026-07-06: no additions, no price changes)
**Method:** Azure Retail Prices API (no auth). Output written to `azure-foundry.json`.

**GLM 5.2 special-focus verdict (2026-07-07, re-check):** GLM 5.2 is **STILL NOT priced on
Azure AI Foundry** — as of 2026-07-07 there is **no `FW GLM 5.2 Inp/Outp DZ Tokens` meter** in
the Retail Prices API (zero substring hits for `GLM 5.2`/`GLM5.2` across
productName/meterName/skuName/productId/skuId in the full 6,757-item EU pull). The `Azure
Fireworks Models` GLM meters remain only **FW GLM 5** (Inp 0.0011/1K = 1.10/1M, Outp 0.00352/1K
= 3.52/1M) and **FW GLM 5.1** (Inp 0.00154/1K = 1.54/1M, Outp 0.00484/1K = 4.84/1M) — unchanged
from 2026-07-01. (Note: even the earlier "GA-listed-but-unpriced FW-GLM-5.2 catalog entry" is not
observable via the priced Retail API; only priced meters are visible here.) GLM is present only
as **GLM 5** and **GLM 5.1**, both via the `Azure Fireworks Models` partner catalog
(Fireworks-on-Azure), DataZone-EU tier only. There is **no Microsoft-native / first-party Z.ai
product**, and DataZone-EU is excluded by Microsoft from the EU Data Boundary, so these are
effectively US/Fireworks-served. Also re-verified absent 2026-07-07: **Kimi K2.7, MiniMax M3,
standalone DeepSeek V4** (only V4 Pro + V4 Flash exist first-party; V4 Pro also via Fireworks).
Fireworks catalog unchanged (9 priced models): Kimi K2.5/K2.6, GLM 5/5.1, MiniMax M2.5/2.7,
DeepSeek V3.2/V4-Pro, GPT OSS 120B. Also still absent 2026-07-07: MiMo, Qwen, Gemini, and any
Anthropic Claude (Opus/Sonnet). Also still absent: Qwen, MiMo, and any Anthropic Claude (Opus/Sonnet), Gemini.

## TL;DR refresh recipe (2026-06-17)
Three paginated queries (USD), looping `NextPageLink`, over the six EU regions
`swedencentral, westeurope, francecentral, germanywestcentral, polandcentral, spaincentral`:

```
$filter=contains(productName,'OpenAI') and (<six armRegionName eq ...>)
$filter=contains(productName,'Models')  and (<six armRegionName eq ...>)
$filter=contains(productName,'AI Foundry') and (<six armRegionName eq ...>)
```

That returns ~6,800 EU items. The model families live under these `productName`s:
`Azure OpenAI`, `Azure OpenAI GPT5`, `Azure OpenAI Reasoning`, `Azure OpenAI OSS Models`,
`Azure Deepseek Models`, `Azure Grok Models`, `Azure Llama Models`, `Azure Mistral Models`,
`Azure Phi Models`, `Cohere Models`, `MAI Models`, and **`Azure Fireworks Models`** (NEW —
this is where Kimi / GLM / MiniMax live, see below). Fetch + build scripts are kept in
`/tmp/fetch_azure.py` + `/tmp/build_azure.py` (regenerate from this doc — they cache raw
items to `/tmp/azure_raw.json`).

### Partner / open models are hosted via Fireworks (critical, NEW 2026)
- **Kimi K2.5, Kimi K2.6, GLM 5, GLM 5.1, MiniMax M2.5, MiniMax 2.7** are offered ONLY
  through the `Azure Fireworks Models` product (Fireworks-on-Azure). Meter pattern:
  `FW <Model> Inp DZ Tokens` / `FW <Model> Outp DZ Tokens` (also `Cache Inp` = skip).
  These have **DataZone EU tier only — no Global tier**. Prices identical across all 6 EU regions.
- NOT found on Azure as of 2026-07-07 (re-verified, zero substring hits in all fields):
  Kimi K2.7, GLM 5.2, MiniMax M3/MiniMax 3, MiMo (any), Qwen (any), and any Anthropic
  Claude (Opus/Sonnet/Anthropic — incl. Claude Sonnet 5 released 2026-06-30;
  Claude remains absent from Azure Foundry, confirming Anthropic is still not on Azure).
  The Fireworks catalog is unchanged from 2026-06-17:
  Kimi K2.5/K2.6, GLM 5/5.1, MiniMax M2.5/2.7, DeepSeek V3.2/V4-Pro, GPT OSS 120B only.
- DeepSeek V4 Pro / V3.2 exist BOTH first-party (`Azure Deepseek Models`, has Global tier)
  AND via Fireworks (DataZone-only); both are listed (Fireworks ones suffixed "(Fireworks)").

## 1. The API

Public, unauthenticated, paginated JSON. Returns ALL Azure meters; filter with OData `$filter`.

```
https://prices.azure.com/api/retail/prices?currencyCode=USD&$filter=<odata>
```

Pagination: follow `NextPageLink` until `null`. Each page returns up to 100 items
in `Items[]`. A model family can span dozens of pages, so loop.

### Filters that work
- `serviceName eq 'Cognitive Services'` → **returns 0 items** (do NOT use; the meters
  are NOT tagged with this serviceName anymore).
- `contains(productName,'OpenAI')` → OpenAI models (productName `Azure OpenAI`,
  `Azure OpenAI GPT5`, `Azure OpenAI Media`, `Azure OpenAI OSS Models`). ~6800 EU items.
- `contains(productName,'Models')` → partner/open models (`Azure Deepseek Models`,
  `Azure Llama Models`, `Azure Mistral Models`, `Azure Grok Models`, `Azure Phi Models`,
  `Cohere Models`, `MAI Models`, `Azure BFL Flux Models`, `Azure Fireworks Models`).
- `contains(productName,'AI Foundry')` → ONLY provisioned-throughput reservations
  (`1/Hour` units), NOT per-token. Ignore for token pricing.

Combine with EU region filter (the prices used here):
```
contains(productName,'OpenAI') and (armRegionName eq 'swedencentral' or armRegionName eq 'westeurope' or armRegionName eq 'francecentral' or armRegionName eq 'germanywestcentral' or armRegionName eq 'polandcentral' or armRegionName eq 'spaincentral')
```

### curl test
```bash
curl -s "https://prices.azure.com/api/retail/prices?currencyCode=USD&\$filter=contains(productName,'OpenAI')%20and%20armRegionName%20eq%20'swedencentral'" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);[print(i['meterName'],i['armRegionName'],i['retailPrice'],i['unitOfMeasure']) for i in d['Items'][:20]]"
```

## 2. Meter-name decoding (critical)

Prices are encoded in `meterName`, not in a clean model field. Abbreviations:

| token | meaning |
|-------|---------|
| `Inp` / `Inpt` / `inp` | **input** tokens |
| `Opt` / `outpt` / `opt` | **output** tokens |
| `cd` / `cchd` | cached input (cheaper) — skip for standard price |
| `pp` / `PP` | priority/provisioned premium — sometimes the only standard meter for a model |
| `Batch` | batch API (50% off) — skip for standard price |
| `Gl` / `glbl` / `Glbl` / `Glb` | **Global** deployment tier |
| `Dz` / `DZone` / `Dzone` / `DZ` | **Data Zone (EU)** deployment tier |
| `regnl` / `regnl` | Regional deployment tier |
| `LongCo` / `longco` | long-context tier (GPT-5.4/5.5) |
| `ShortCo` | short-context tier = the **default** GPT-5.5 tier |
| `FW ...` | **Fireworks-hosted** model (Kimi/GLM/MiniMax/DeepSeek). `DZ` = DataZone EU, the ONLY tier offered |
| `Cache` / `Ch ` | cached input — skip for standard price |

Unit is in `unitOfMeasure`: `1M` (already per-million) or `1K` (multiply by 1000 to get per-million).

### Tier choice for this dataset
We use the **Global** tier list price (`Gl`/`glbl`). Global prices are identical
across all EU regions and are the headline numbers. **Data Zone (EU)** prices
(`Dz`/`DZone`) are ~10% higher (EU data-residency premium) and noted in the model
`notes` where relevant. We exclude cached (`cd`/`cchd`), batch, and PP/priority meters.

### Example meters
```
'GPT 5 Inpt Glbl 1M Tokens'      -> GPT-5 input, Global, 1.25 /1M
'GPT 5 outpt Glbl 1M Tokens'     -> GPT-5 output, Global, 10.0 /1M
'5.4 inp Gl 1M Tokens' / '5.4 opt Gl 1M Tokens'  -> GPT-5.4 in/out (Global) 2.5 / 15.0
'5.5 ShortCo inp Gl 1M Tokens'   -> GPT-5.5 default-tier input (Global) 5.0
'V4 Pro Inp glbl Tokens' (1K)    -> DeepSeek V4 Pro input, 0.00174/1K = 1.74/1M
'Phi-4-Input Tokens' (1K)        -> Phi-4 input, swedencentral only, 0.125/1K = 0.125/1M
```

## 3. Normalization
- All prices → **USD per 1,000,000 tokens**, input and output separate.
- `1K` meters multiplied by 1000.
- When picking a region for a meter, prefer order: swedencentral, westeurope,
  francecentral, germanywestcentral, polandcentral, spaincentral. The Global-tier
  retail price is region-independent so the chosen region label is informational.

## 4. EU region caveats
- **Phi** models are only metered in `swedencentral` (no Global tier). Region-locked.
- OpenAI / partner models have a 3-tier model: **Global** (cheapest, no data residency),
  **Data Zone EU** (~+10%, EU residency), **Regional** (highest, single-region). EU
  customers most often deploy Global or Data Zone EU. We list Global; EU Data Zone
  noted inline.
- `Cognitive Services` serviceName filter is dead — always filter on `productName`.

## 5. Re-run
The build pulls three `contains(productName,...)` queries for the six main EU regions,
caches to `/tmp/azure_raw.json`, decodes meter names, pairs input+output per model
(preferring Global tier; Fireworks + Phi are tier-locked), converts to per-1M, and writes
`azure-foundry.json`. To refresh: re-run the fetch + build scripts (fetch loops
`NextPageLink`; ~6,800 EU items as of 2026-06-17).

Things to watch for on the next refresh:
- New GPT version prefixes (`5.6`, etc.) in `Azure OpenAI GPT5`. As of 2026-06-23 the GPT5
  product spans 5 / 5.1 / 5.2 / 5.3 / 5.4 / 5.5 (incl. codex/chat/mini/nano/pro variants) plus
  `chat-latest` rolling meters dated 05052026 and 05282026 (both 5.0/30.0 Global).
- New rows under `Azure Fireworks Models` (Kimi K2.7, GLM 5.2, MiniMax M3, MiMo, Qwen —
  none present 2026-06-23 but this is the product they would appear under).
- Any new `Azure <Vendor> Models` productName (e.g. an Anthropic product — none today).
- Verify a known anchor after each run: `GPT 5 Inpt Glbl 1M Tokens` must be 1.25 /1M and
  `V4 Pro Inp glbl Tokens` must be 0.00174 /1K (= 1.74 /1M).

## 6. EU vs US note (2026-06-17)
Azure **Global**-tier list prices are region-independent (same in EU and US). The EU
**DataZone** tier carries a residency premium (typically ~+10% on OpenAI/Grok; noted
inline per model). Fireworks-hosted models (Kimi/GLM/MiniMax) ship DataZone-EU-only and
priced identically across all six EU regions; there is no separate cheaper Global tier for
them. Phi is regional (swedencentral) only. So for EU deployment the numbers in this file
are accurate as-is; US customers on Global tier pay the same Global prices.
