# Google Vertex AI pricing — collection method

**Collected:** 2026-07-22 (comprehensive live re-scrape)
**Output:** `google-vertex.json` (same shape as `aws-bedrock.json`) — 59 offer rows / 44 current model families

## Sources

Primary (authoritative), the official Vertex AI / "Agent Platform" pricing page:

- https://cloud.google.com/vertex-ai/generative-ai/pricing
  (redirects to `cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing`)
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency

This single page contains both Google's Gemini pricing and the **Partner models**
section (Anthropic Claude, xAI Grok, DeepSeek, MiniMax, Moonshot/Kimi, GLM, Qwen,
OpenAI gpt-oss, Meta Llama, Mistral). The partner tables and the per-region Claude
tables are rendered client-side, so a plain HTTP fetch returns only the Gemini
section — the page was loaded in a **headless browser (`agent-browser`)** and
`document.body.innerText` scraped to read the partner tables.

## 2026-07-22 re-scrape (was 56 rows/42 families, now 59/44)

Full re-scrape in the dedicated `--session vertex` headless browser (agent-browser
0.8.5), per the "How to refresh" steps below (unchanged; technique still works,
incl. reading the Claude `<devsite-selector>` `data-tab` panes without clicking).
Two net-new Gemini models, both **GA released 2026-07-21** (confirmed on their
docs pages at `docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/
3-6-flash` and `.../3-5-flash-lite`):
- **Gemini 3.6 Flash** — $1.50 in / $7.50 out (cached $0.15), flat across context
  tiers, no Global/Non-global split on the pricing table and Standard PayGo is
  Global-only per its model page → one `global` row.
- **Gemini 3.5 Flash-Lite** — $0.30/$2.50 Global (cached $0.03) and $0.33/$2.75
  Non-global (cached $0.033). Its model page documents Standard PayGo
  Multi-region `us`/`eu` with EU ML processing → `global` + `eu` rows, matching
  the 3.5 Flash / 3.1 Flash-Lite pattern. Retirement 2027-07-21 or later.
Everything else byte-identical to the 2026-07-12 snapshot: all Gemini 3.x/2.5
rates, Gemini Omni Flash ($1.50/$9 — pricing page now labels it just "Gemini Omni
Flash" under a "Gemini Omni" header, but its docs page still says Launch stage:
Preview, so the row keeps the Preview name), all Claude panes (Global + eu +
europe-west1, +10% EU surcharge, Sonnet 5 promo $2.20/$11 eu), Grok, DeepSeek,
MiniMax, Kimi, GLM, Qwen, gpt-oss, Llama, Mistral. New-model watch: **GLM-5.2,
Kimi K2.7, MiniMax-M3, DeepSeek-V4 all still NOT present** (grep of full page
text = 0 hits). All prices remain USD; no currency conversion applies to this
source.

## 2026-07-12 comprehensive price, lifecycle, and route audit

All 43 input-row token pairs matched the live pricing page, but two rows were no longer
deployable: Gemini 2.0 Flash and Gemini 2.0 Flash-Lite retired on 2026-06-01 and were
removed. Gemini Omni Flash Preview is a current multimodal text-in/text-out PayGo model
at `$1.50/$9.00`; it was added as a Global-only route. The result is 42 current model
families represented by 56 separate offer rows.

The prior snapshot conflated model families with deployment offers. It kept only the
more expensive EU price for nine Claude families and for Gemini 3.5 Flash / Gemini 3.1
Flash-Lite, so non-EU comparisons could not select the cheaper Global route. All eleven
Global routes are now explicit. Conversely, Gemini 2.5 Pro, Flash, and Flash-Lite had
only Global rows despite Google's data-residency matrix documenting EU ML processing;
same-price EU routes were added for those three families.

Gemini 3.5 Flash and Gemini 3.1 Flash-Lite Standard PayGo residency uses the `eu`
multi-region endpoint, not `europe-west4`; both EU rows were corrected. Gemini 3.5's
`europe-west2` location is Single-Zone Provisioned Throughput, not the PayGo route stored
here. Global endpoints remain non-EU because Google provides no processing-location
guarantee. The official Mistral pages still support the existing EU-hosted
`europe-west4` rows for Mistral Medium 3, Mistral Small 3.1, and Codestral 2.

## 2026-07-07 comprehensive re-scrape (historical; still 43, no price deltas)

Full re-scrape of the live page in the dedicated `--session vertex` headless
browser (agent-browser 0.8.5). **All rates unchanged; model roster identical (43
captured)** vs the 2026-07-06 snapshot — every Gemini, Claude (all region panes),
Grok, DeepSeek, MiniMax, Kimi, GLM, Qwen, gpt-oss, Llama, and Mistral rate matched
byte-for-byte. New-model watch for this pass:
- **GLM-5.2: NOT present.** GLM section still lists only **GLM-4.7** ($0.60/$2.20)
  and **GLM-5** (rendered "GLM-5 *", $1.00/$3.20, Cache Hit $0.10). No GLM-5.2.
- **Kimi K2.7: NOT present.** Moonshot section: only **Kimi-K2-Thinking** ($0.60/$2.50).
- **MiniMax M3: NOT present.** MiniMax section: only **MiniMax-M2** ($0.30/$1.20).
- **DeepSeek V4: NOT present.** DeepSeek section: V3.1 ($0.60/$1.70), V3.2
  ($0.56/$1.68), R1(0528) ($1.35/$5.40), + OCR (omitted). No V4.
- Claude EU panes re-read from the `<devsite-selector>` sections — unchanged:
  eu = Sonnet 5 (promo $2.20/$11.00, standard-from-Sept-1 $3.30/$16.50) + Fable 5
  $11/$55 + Opus 4.8/4.7 $5.50/$27.50; europe-west1 = Opus 4.6/4.5 $5.50/$27.50 +
  Sonnet 4.6/4.5 $3.30/$16.50 (Sonnet 4.5 >200K $6.60/$24.75) + Haiku 4.5 $1.10/$5.50.
  Opus 4.1 uniform $15/$75 (global). EU surcharge exactly +10%.
- Gemini 3+ non-global (EU) surcharge remains IN EFFECT: 3.5 Flash $1.65/$9.90 +
  3.1 Flash-Lite $0.275/$1.65 recorded non-global; 3.1 Pro $2/$12 and 3 Flash $0.5/$3
  still Global. Gemini 2.5 Pro $1.25/$10, 2.5 Flash $0.30/$2.50, 2.5 Flash Lite
  $0.10/$0.40, 2.0 Flash $0.15/$0.60, 2.0 Flash Lite $0.075/$0.30 all unchanged.

## 2026-07-06 comprehensive re-scrape (still 43, no price deltas)

Full re-scrape of the live page in the dedicated `--session vertex` headless
browser (agent-browser 0.8.5). **All rates unchanged; model roster identical (43
captured)** vs the 2026-07-01 snapshot. New-model watch for this pass:
- **GLM-5.2: NOT present.** GLM section still lists only **GLM-4.7** ($0.60/$2.20)
  and **GLM-5** (rendered "GLM-5 *", $1.00/$3.20, Cache Hit $0.10). No GLM-5.2.
- **Kimi K2.7: NOT present.** Moonshot section: only **Kimi-K2-Thinking** ($0.60/$2.50).
- **MiniMax M3: NOT present.** MiniMax section: only **MiniMax-M2** ($0.30/$1.20).
- **DeepSeek V4: NOT present.** DeepSeek section: V3.1 ($0.60/$1.70), V3.2
  ($0.56/$1.68), R1(0528) ($1.35/$5.40), + OCR (omitted). No V4.
- Claude EU panes re-read from the `<devsite-selector>` sections — unchanged:
  eu = Sonnet 5 (promo $2.20/$11.00, standard-from-Sept-1 $3.30/$16.50) + Fable 5
  $11/$55 + Opus 4.8/4.7 $5.50/$27.50; europe-west1 = Opus 4.6/4.5 $5.50/$27.50 +
  Sonnet 4.6/4.5 $3.30/$16.50 (Sonnet 4.5 >200K $6.60/$24.75) + Haiku 4.5 $1.10/$5.50.
  Opus 4.1 uniform $15/$75 (global). EU surcharge exactly +10%.
- Gemini 3+ non-global (EU) surcharge remains IN EFFECT: 3.5 Flash $1.65/$9.90 +
  3.1 Flash-Lite $0.275/$1.65 recorded non-global; 3.1 Pro $2/$12 and 3 Flash $0.5/$3
  still Global. Gemini 2.5 Pro $1.25/$10, 2.5 Flash $0.30/$2.50, 2.5 Flash Lite
  $0.10/$0.40, 2.0 Flash $0.15/$0.60, 2.0 Flash Lite $0.075/$0.30 all unchanged.
- On-page since prior passes but still omitted (per omission policy, not text-LLM
  pay-go rows): Gemini Omni Flash ($1.50/$9), Gemini Deep Research Agent ($2/$12),
  Gemini 3 Pro/3.1 Flash Image (Nano Banana), 2.5 Flash Image, Live API models,
  DeepSeek-OCR, Mistral OCR, deprecated Claude (Opus 4, Sonnet 4, Claude 3.x).

## 2026-07-01 comprehensive re-scrape (still 43, no price deltas)

Full re-scrape of the live page in the dedicated `--session vertex` headless
browser (agent-browser 0.8.5). **All rates unchanged; model roster identical (43
captured).** Special-focus verification for this pass:
- **GLM-5.2: NOT present.** The GLM section lists only **GLM-4.7** ($0.60/$2.20)
  and **GLM-5** (rendered "GLM-5 *", $1.00/$3.20, Cache Hit $0.10) — GLM-5 is the
  newest GLM on Vertex. No GLM-5.2 anywhere on the page. (Maker labeled "GLM's
  models"; provider org normalized to **Z.ai**, formerly tagged "Zhipu AI".)
- **Kimi K2.7: NOT present.** Moonshot section has only **Kimi-K2-Thinking**
  ($0.60/$2.50).
- **MiniMax M3: NOT present.** MiniMax section has only **MiniMax-M2** ($0.30/$1.20).
- **DeepSeek V4: NOT present.** DeepSeek section: V3.1, V3.2, R1(0528), + OCR
  (omitted). No V4.
- Claude EU region tables re-read from the `<devsite-selector>` panes — unchanged:
  eu = Sonnet 5 (promo $2.20/$11.00) + Fable 5 $11/$55 + Opus 4.8/4.7 $5.50/$27.50;
  europe-west1 = Opus 4.6/4.5 $5.50/$27.50 + Sonnet 4.6/4.5 $3.30/$16.50 + Haiku 4.5
  $1.10/$5.50. Opus 4.1 confirmed still present under the flat "Models with uniform
  pricing across all regions" Claude sub-table at $15/$75 (global). Sonnet 5 promo
  through 2026-08-31; standard-from-Sept-1 $3.30/$16.50 (eu).
- Gemini 3+ non-global (EU) surcharge in effect (2026-07-01 cutover reached): Gemini
  3.5 Flash $1.65/$9.90 + 3.1 Flash-Lite $0.275/$1.65 recorded non-global; 3.1 Pro
  $2/$12 and 3 Flash $0.5/$3 still Global. Gemini 2.5 Pro $1.25/$10, 2.5 Flash
  $0.30/$2.50, 2.5 Flash Lite $0.10/$0.40, 2.0 Flash $0.15/$0.60, 2.0 Flash Lite
  $0.075/$0.30 all unchanged.

## What changed at the 2026-07-01 refresh (was 42, now 43)

Re-scraped the live page in the dedicated `--session vertex` headless browser
(agent-browser 0.8.5). One net-new model: **Claude Sonnet 5** — Anthropic released
it 2026-06-30 and it is now on Vertex Model Garden with **per-region pricing**
(present in the `global`, `us-multi-region-us`, and `eu-multi-region-eu` panes of
the Anthropic devsite-selector; NOT in `europe-west1`). It carries a **dual-price
schedule**: a **Promotional price through 2026-08-31** and a **Standard price from
2026-09-01**. As of today (2026-07-01) the promotional price is active, so the JSON
records the **EU Multi-Region (eu) promotional** rate:
- Sonnet 5 promo (eu): **$2.20 in / $11.00 out** (Global promo $2/$10) — the +10% EU surcharge.
- Sonnet 5 standard-from-Sept-1 (eu): $3.30 in / $16.50 out (Global $3/$15) — noted per-row.

**Gemini 3+ non-global surcharge is now IN EFFECT (2026-07-01 cutover reached).**
The page's footnote ("pricing will go into effect for GA Gemini 3 and later on
July 1, 2026") is now current, so **Gemini 3.5 Flash** ($1.65/$9.90 non-global) and
**Gemini 3.1 Flash-Lite** ($0.275/$1.65 non-global) are recorded at their non-global
(europe-west4) rates rather than Global. **Gemini 3.1 Pro** ($2/$12) and **Gemini 3
Flash** ($0.5/$3) still show no non-global surcharge on the Gemini 3 table → `global`.
Live labels are "Gemini 3.1 Pro Preview" and "Gemini 3 Flash Preview".

Everything else unchanged from 2026-06-23: Claude EU subsets (eu: Fable 5 + Opus
4.8/4.7 [+ now Sonnet 5]; europe-west1: Opus 4.6/4.5 + Sonnet 4.6/4.5 + Haiku 4.5),
Opus 4.1 uniform $15/$75 (global). Partner roster identical — Kimi-K2-Thinking,
GLM-5 + GLM-4.7, MiniMax-M2, Grok 4.3/4.20 R+NR/4.1 Fast R+NR, DeepSeek V3.1/V3.2/
R1(0528) (still NO DeepSeek-V4), Qwen3 (4 models), gpt-oss 120b/20b, Llama 4
Maverick/Scout + 3.3 70B, Mistral Medium 3 / Small 3.1 / Codestral 2 — all at the
same rates. DeepSeek-OCR and Mistral OCR still omitted (per-page). Total captured: 43.

## What changed at the 2026-06-23 refresh (still 42, no price deltas)

Re-scraped the live page in a dedicated `--session vertex` headless browser
(agent-browser 0.8.5). Compared against the 2026-06-18 snapshot — **all rates
unchanged**, model roster identical (still 42 captured). Re-verified:
- Gemini 3 family: only **Gemini 3.5 Flash** ($1.50/$9.00 Global vs $1.65/$9.90
  non-global) and **Gemini 3.1 Flash-Lite** ($0.25/$1.50 vs $0.275/$1.65) carry a
  non-global surcharge. **Gemini 3.1 Pro** ($2/$12) and **Gemini 3 Flash**
  ($0.5/$3) show no surcharge (Global only). The 2026-07-01 non-global cutover note
  for GA Gemini 3+ is still on the page.
- Claude EU tables (read from the Anthropic `<devsite-selector>` `<section
  data-tab>` panes): EU Multi-Region (eu) = Fable 5 $11/$55, Opus 4.8 $5.50/$27.50,
  Opus 4.7 $5.50/$27.50; europe-west1 = Opus 4.6/4.5 $5.50/$27.50, Sonnet 4.6/4.5
  $3.30/$16.50, Haiku 4.5 $1.10/$5.50. EU surcharge exactly +10%. Opus 4.1
  $15/$75 uniform (global).
- Partner roster on Vertex: **Kimi-K2-Thinking (Moonshot), GLM-5 + GLM-4.7 (Zhipu),
  MiniMax-M2 — all present**. **DeepSeek: only V3.1, V3.2, R1 (0528) (+ OCR,
  omitted) — NO DeepSeek-V4 on Vertex.** No MiMo. Grok 4.3 / 4.20 R+NR / 4.1 Fast
  R+NR, Qwen3 (4 models), gpt-oss 120b/20b, Llama 4 Maverick/Scout + 3.3 70B,
  Mistral Medium 3 / Small 3.1 / Codestral 2 all unchanged.

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

## Region handling

- A single **Global** rate does not establish EU hosting. Google states that requests to
  the Global endpoint can be processed in any region supported by the model and that the
  caller cannot control or know the processing region. DeepSeek, MiniMax, Kimi, GLM,
  Qwen, gpt-oss, Llama, and Grok rows therefore remain `"region": "global"` and must not
  qualify for EU-only filtering merely because Vertex itself has European regions.
- **Mistral Medium 3, Mistral Small 3.1 (25.03), and Codestral 2** have documented
  `europe-west4` endpoints with EU multi-region ML processing. Their token rates do not
  change, but their rows use `"region": "europe-west4"` and are valid EU-hosted offers.
- **Anthropic Claude** has per-region pricing (a region selector:
  Global / US Multi-Region / EU Multi-Region (eu) / us-east5 / europe-west1 /
  asia-southeast1 / asia-east1). **There is no europe-west4 tab.** The EU regions
  carry a **~10% surcharge** over Global. Crucially, the two EU regions list
  **different model subsets**:
  - **EU Multi-Region (eu)**: Sonnet 5 promotional ($2.20/$11), Fable 5
    ($11/$55), Opus 4.8 ($5.50/$27.50), and Opus 4.7 ($5.50/$27.50).
  - **europe-west1**: Opus 4.6 & 4.5 ($5.50/$27.50), Sonnet 4.6 & 4.5
    ($3.30/$16.50), Haiku 4.5 ($1.10/$5.50).
  The JSON records both the cheaper `global` route and the EU `eu`/`europe-west1`
  route for each of these nine models. Claude Opus 4.1 remains Global because its
  current model page does not document an EU-resident inference route.
- **Gemini 3.5 Flash / Gemini 3.1 Flash-Lite:** both Global and EU Standard PayGo
  routes are explicit. Global is `$1.50/$9.00` and `$0.25/$1.50`; EU is
  `$1.65/$9.90` and `$0.275/$1.65`. The EU rows use `region=eu`, as documented.
- **Gemini 2.5 Pro / Flash / Flash-Lite:** Global and EU-resident online-prediction
  routes are separate rows but have identical token prices. Google's data-residency
  matrix, not merely endpoint presence, is the basis for `eu_hosted=true`.
- Gemini 3.1 Pro and Gemini 3 Flash remain Global-only because current Standard PayGo
  documentation does not establish an EU-resident route for them.

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
- **Gemini Omni Flash Preview** is included because it has general text input/output.
  Specialized image models (3 Pro Image, 3.1 Flash Image, 2.5 Flash Image), Deep
  Research Agent, and Live API variants remain omitted from the general text-LLM scope.

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
   list different model subsets (eu: Sonnet 5 + Fable 5 + Opus 4.8/4.7;
   europe-west1: Opus 4.6/4.5 + Sonnet 4.6/4.5 + Haiku 4.5).
   NOTE: use a dedicated `agent-browser --session vertex ...` — the shared `default`
   session can be hijacked by other concurrent agent-browser users and drift to a
   different URL mid-scrape.
4. Update the standard ≤200K base-tier input/output numbers. Re-check the
   non-global Gemini 3+ surcharge and whether it has gone into effect
   (2026-07-01 cutover) and the Claude EU surcharge (~10%).
