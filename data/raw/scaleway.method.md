# Scaleway Generative APIs — data collection method

**Date collected:** refreshed daily by `scripts/fetch-scaleway-catalog.mjs` (first automated run
2026-09-14; manual refreshes before: 2026-09-08, 2026-08-26, 2026-07-22, 2026-07-12)
**Output:** `data/raw/scaleway.json`

## Update 2026-09-14 — executable collector (R9.1)

`scripts/fetch-scaleway-catalog.mjs` + `lib/scaleway-catalog.mjs` (tests in
`test/scaleway-catalog.test.mjs`) run as the non-fatal daily step `fetch-scaleway-catalog` in
`ops/daily/daily.mjs`. It no longer scrapes the HTML table: the pricing page ships its own
structured catalog in `__NEXT_DATA__` at
`props.pageProps.externalData["templates.pricing-page"].catalogProducts.generativeApis.models`
(E3 step 2 — structured data in the page). Neither the page nor the ECB XML is disallowed by
robots.txt.

- Per model: `apiId`, `tasks`, `status`, `contextWindow`, and `regions[region=fr-par]` with
  `inputTokenPrice` / `outputTokenPrice` / optional `inputCachedTokenPrice`
  `.perMillionTokens.value = {currencyCode: "EUR", units, nanos}` → EUR = units + nanos/1e9.
  Batch prices (`perMillionTokensBatch`) are not used. A non-EUR currency fails the run.
- Scope by structure: the `chat` task and both token prices. Embeddings (input only) and
  `whisper-large-v3` (per audio minute) drop out and are listed in `skipped`.
- FX: ECB daily reference XML, EUR/USD in [0.7, 1.7] or the run fails; USD = EUR × rate, cents.
- `notes` keep the audited `€in/€out[ (cached €c)]; api-slug; …` format — build-dataset takes the
  Scaleway family identity from the second segment, so do not reorder it. Curated names are kept by
  slug; new slugs get `mapping: "derived"`. Fewer than half of the previous slugs → fail closed.

First run 2026-09-14 (ECB 1.1592 of 2026-09-11): all 12 models, names and EUR prices identical to
2026-09-08; only USD cents moved with the rate (e.g. GLM 5.2 output 6.39 → 6.38), and DeepSeek V4
Flash 0731 now carries its listed cached-input price (€0.08 → $0.09).

> Note: this method file was first written on 2026-07-22. Earlier refreshes (2026-07-12)
> documented the method only inside the JSON's `method` field.

## Scope and authoritative source

The first-party pricing page is
`https://www.scaleway.com/en/pricing/model-as-a-service/`.

It is **server-rendered** — a plain `curl` with a browser User-Agent returns the full
"Generative API" pricing table in the HTML (~5 MB page). No JS rendering or browser
automation needed:

```bash
curl -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/126.0" \
  "https://www.scaleway.com/en/pricing/model-as-a-service/" -o /tmp/scaleway.html
```

To parse: strip `<script>`/`<style>`/tags, then grep around `€` characters. Table rows
read like `glm-5.2|Chat and code|€1.80| /|million tokens|€5.50| /|million tokens|Try|...`.
Note the table markup repeats each row a few times in the flattened text (responsive
layouts), so de-duplicate by model slug.

**Include** only text/vision/audio-chat LLMs with both input and output token prices
(15 rows on 2026-07-22). **Exclude**:

- `whisper-large-v3` (audio transcription, priced per audio minute)
- `qwen3-embedding-8b`, `bge-multilingual-gemma2` (embeddings, output "Free")
- the "Managed Inference" GPU-hour table further down the page (L4/L40S/H100 hourly)

Region: EU-sovereign Paris; Scaleway advertises zero data retention (ZDR) by default,
so rows carry `region: "eu"`.

## Currency handling

The page publishes **EUR per 1M tokens**. Original EUR values are preserved in each
row's `notes` field (`"€X/€Y; <api-slug>"`); the schema's `input_per_1m_usd` /
`output_per_1m_usd` fields are the converted values.

Use the official **ECB EUR/USD reference rate** for the collection date (or the latest
preceding ECB business day):

```bash
curl -s "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml" \
  | grep -o "time='[^']*'\|currency='USD' rate='[^']*'"
```

For the 2026-07-22 refresh: **1 EUR = 1.1418 USD (ECB, published 2026-07-21)**.
Compute `USD = EUR * rate`, rounded to two decimals, same rate for every row. Record
the rate and date in the JSON's `currency_note` and `method` fields.

## Refresh checks

```bash
python3 -c "import json; d=json.load(open('data/raw/scaleway.json')); print(len(d['models']))"
# expected for the 2026-07-22 snapshot: 15

# all rows must have numeric USD prices and a EUR original in notes
python3 -c "
import json
d = json.load(open('data/raw/scaleway.json'))
assert all(isinstance(m['input_per_1m_usd'], (int,float)) and
           isinstance(m['output_per_1m_usd'], (int,float)) and
           '€' in m['notes'] for m in d['models'])
print('ok')"
```

## History

- **2026-07-12:** 15 models, EUR unchanged, ECB rate 1.143 (2026-07-10).
- **2026-07-22:** identical catalog and identical EUR prices; only the FX rate moved
  (1.143 → 1.1418), shifting three rounded USD outputs by one cent: GLM 5.2
  6.29→6.28, Mistral Medium 3.5 8.57→8.56, Devstral 2 2.29→2.28.
