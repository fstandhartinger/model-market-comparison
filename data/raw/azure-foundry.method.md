# Azure AI Foundry pricing — how to re-fetch / update

**Last collected:** 2026-06-15
**Method:** Azure Retail Prices API (no auth). Output written to `azure-foundry.json`.

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
(preferring EU regions / Global tier), converts to per-1M, and writes `azure-foundry.json`.
To refresh: re-run the fetch + build scripts (fetch loops `NextPageLink`; ~9000 EU items).
Watch for new model families appearing under new `Azure <Vendor> Models` productNames
and new GPT version prefixes (`5.6`, etc.) in `Azure OpenAI GPT5`.
