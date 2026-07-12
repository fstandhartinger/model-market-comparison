# Azure AI Foundry pricing — how to re-fetch / update

**Last collected:** 2026-07-12 (93 offer rows; Retail API, lifecycle, roster, and deployment-scope re-check)
**Method:** Azure Retail Prices API (no auth). Output written to `azure-foundry.json`.

**Authoritative cross-checks:**
- https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule
- https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/retired-models
- https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure
- https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability
- https://learn.microsoft.com/en-us/azure/foundry/how-to/fireworks/enable-fireworks-models

**2026-07-12 result:** All non-null stored prices were rechecked against live Retail meters, then
availability was independently checked against Microsoft's model-retirement schedule (updated
2026-07-09) and current model/region catalogs. Retail meters are billing records and can outlive a
deployable model, so lifecycle wins over a lingering meter.

Removed as retired: GPT-5/5.1/5.2/5.3 Chat, GPT-4.5, DeepSeek-V3, MAI-DS-R1, Grok 3,
Grok 3 Mini, and Azure Direct Kimi K2 Thinking. GPT-5.2 Pro was also removed: a Retail meter
exists, but it is absent from both the current GPT-5.2 model catalog and lifecycle roster.
The newer lifecycle schedule gives 2026-07-01 as the retirement date for Fireworks Kimi K2.5,
GLM 5, MiniMax M2.5, DeepSeek V3.2, and gpt-oss-120B, so those stale Fireworks rows were removed.
Current Fireworks rows such as GLM 5.2, Kimi K2.7 Code, MiniMax M2.7, and DeepSeek V4 Pro remain
US-hosted/non-EU routes.

Thirteen documented Europe Data Zone price routes were added separately from their Global routes:
both GPT-5.5 context tiers, GPT-4.1/Mini/Nano, GPT-4o 2024-11-20, GPT-4o mini, o1, o3,
o3-mini, o4-mini, Mistral Large 3, and Mistral Medium 3.5. GPT-5.6 Luna/Sol/Terra are active
GA versions dated 2026-07-09 with both Global and Europe Data Zone availability. The Retail API
still has no standard uncached token meters for them, so all six route rows are present with
`null` input/output prices. Do not substitute OpenAI-direct prices.

The current fetch must also query the separate product **`Azure Kimi`**. It is not matched by the
old OpenAI/Models/AI Foundry filters. Azure Kimi is a native/direct product with separate Global
and DZ meters, while similarly named rows under **`Azure Fireworks Models`** are partner-hosted
offers with different prices. They are represented as distinct rows with explicit `(Azure Direct)`
or `(Fireworks)` labels.

**Hosting semantics:** `armRegionName=swedencentral` identifies the Azure resource/billing meter;
it does not prove where inference runs. Global deployments are therefore stored as `region=global`.
Fireworks documents only US deployment regions and explicitly excludes its inference from the Azure
EU Data Boundary, so every Fireworks row is stored as `region=us, eu_hosted=false`. Only verified
Europe Data Zone or regional deployments are represented as EU-hosted offer rows.

GPT-5.6 Sol, Terra, and Luna are visible in the current Azure availability documentation, but the
Retail Prices API still exposes no standard token meters for them. They are intentionally retained
as unpriced Global and EU Data Zone rows (`null` input/output) rather than populated with
OpenAI-direct prices that have not been confirmed as Azure prices.

## TL;DR refresh recipe (2026-06-17)
Four paginated query families (USD), looping `NextPageLink`, over the six EU resource regions
`swedencentral, westeurope, francecentral, germanywestcentral, polandcentral, spaincentral`:

```
$filter=contains(productName,'OpenAI') and (<six armRegionName eq ...>)
$filter=contains(productName,'Models')  and (<six armRegionName eq ...>)
$filter=contains(productName,'AI Foundry') and (<six armRegionName eq ...>)
$filter=productName eq 'Azure Kimi' and (<six armRegionName eq ...>)
```

That returns ~6,800 EU items. The model families live under these `productName`s:
`Azure OpenAI`, `Azure OpenAI GPT5`, `Azure OpenAI Reasoning`, `Azure OpenAI OSS Models`,
`Azure Deepseek Models`, `Azure Grok Models`, `Azure Llama Models`, `Azure Mistral Models`,
`Azure Phi Models`, `Cohere Models`, `MAI Models`, **`Azure Kimi`**, and
**`Azure Fireworks Models`**. Fetch + build scripts are kept in
`/tmp/fetch_azure.py` + `/tmp/build_azure.py` (regenerate from this doc — they cache raw
items to `/tmp/azure_raw.json`).

### Fireworks partner offers versus Azure Direct
- Fireworks rows are identified by `productName = Azure Fireworks Models` and `FW ...` meters.
  The `DZ` text in those billing meter names must not be interpreted as EU residency: Microsoft's
  Fireworks deployment guide lists only US regions and excludes the service from the EU Data Boundary.
- Native Kimi rows come from `productName = Azure Kimi`; never pair these meters with Fireworks
  input/output meters. K2 Thinking retired on 2026-03-29 and is excluded despite its lingering
  meter. Current native Global prices are K2.5 `$0.60/$3.00`, K2.6 `$0.95/$4.00`, and K2.7 Code
  `$0.95/$4.00`.
- DeepSeek V4 Pro and V3.2 likewise exist as Azure Direct Global offers and as distinct Fireworks
  partner alternatives. Keep the `(Fireworks)` suffix and US hosting metadata on the latter.

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
| `FW ...` | **Fireworks-hosted** model. `DZ` is part of the billing-meter label; it does **not** override Fireworks' documented US-only inference scope or EU Data Boundary exclusion. |
| `Cache` / `Ch ` | cached input — skip for standard price |

Unit is in `unitOfMeasure`: `1M` (already per-million) or `1K` (multiply by 1000 to get per-million).

### Tier choice for this dataset
Deployment tiers are separate offers. Global list-price rows use `region=global` and do
not qualify as EU-hosted. A Data Zone meter becomes an `region=eu` row only when the
current model availability documentation confirms Europe Data Zone deployment. Regional
meters retain their real Azure region. Fireworks rows always use `region=us` and
`eu_hosted=false`. Cached (`cd`/`cchd`), batch, and PP/priority meters are excluded from
the primary input/output values; useful cache prices may be retained in notes.

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
- When deduplicating replicated billing meters, prefer order: swedencentral, westeurope,
  francecentral, germanywestcentral, polandcentral, spaincentral. Never copy that billing
  region into the offer's inference `region`; derive the latter from deployment scope.

## 4. EU region caveats
- **Phi** models are only metered in `swedencentral` (no Global tier). Region-locked.
- OpenAI and Azure Direct partner models may expose **Global**, **Data Zone EU**, and
  **Regional** tiers. Global has no EU processing guarantee. The JSON stores verified EU
  Data Zone offers separately so filtering does not confuse an EU billing resource with
  EU inference.
- Native Azure Kimi has DZ Retail meters, but the current Europe Data Zone availability
  table does not yet list those Kimi deployments. The prices are documented in notes,
  while the offers remain non-EU until Microsoft documents deployment availability.
- The same conservative rule applies to current Grok, DeepSeek, and Cohere Command A Plus
  DZ meters: the Europe Data Zone table does not list these deployments as of 2026-07-12.
  They remain Global rows; a billing meter alone is not evidence of EU processing.
- **Fireworks is not an EU tier.** Its inference is outside the EU Data Boundary and only
  documented in US deployment regions, even when a replicated meter was fetched through
  an EU resource region.
- `Cognitive Services` serviceName filter is dead — always filter on `productName`.

## 5. Re-run
The build pulls the three broad `contains(productName,...)` queries plus the exact
`productName eq 'Azure Kimi'` query for the six main EU resource regions,
caches to `/tmp/azure_raw.json`, decodes meter names, pairs input+output per model
within the same product and deployment tier, converts to per-1M, and writes
`azure-foundry.json`. To refresh: re-run the fetch + build scripts (fetch loops
`NextPageLink`).

Things to watch for on the next refresh:
- Published standard token meters for GPT-5.6 Luna/Sol/Terra. Until Azure publishes them, keep
  the documented Global and Europe Data Zone routes unpriced; never infer them from OpenAI rates.
- New GPT version prefixes in `Azure OpenAI GPT5`; always cross-check meter-derived rows against
  the lifecycle schedule because Chat/preview meters can remain after retirement.
- New rows under `Azure Fireworks Models` (MiniMax M3, MiMo, Qwen). Kimi K2.7 and GLM 5.2
  are already present as of 2026-07-01 meters.
- Any new `Azure <Vendor> Models` productName (e.g. an Anthropic product — none today).
- Verify a known anchor after each run: `GPT 5 Inpt Glbl 1M Tokens` must be 1.25 /1M and
  `V4 Pro Inp glbl Tokens` must be 0.00174 /1K (= 1.74 /1M).

## 6. EU versus Global versus Fireworks
Azure **Global** list prices can be replicated across EU resource regions without gaining
data residency; these rows remain `global`. Verified **Europe Data Zone** offers carry a
residency premium and are separate `eu` rows. **Fireworks** is a partner backend with US-only
deployment and an explicit EU Data Boundary exclusion, so its `DZ`-named Retail meters are
never treated as EU-hosted. Phi remains a genuine regional `swedencentral` offer.
