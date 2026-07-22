# LLM gateways / routers snapshot — how to (re)collect & update

**Output file:** `data/gateways.json`
**Last collected:** 2026-07-22 (prior: 2026-06-29)

## Update 2026-07-22
First standalone method file (previously the method lived only in the JSON's
top-level `note` field: "Researched 2026-06 from each product's own
docs/pricing"). This dataset is a **curated manual snapshot**, not scraped by
`build-dataset` — do not expect a scraper; re-collection is manual research.

## Method
For each of the ~35 gateways/routers/aggregators, verify against **first-party
sources only**:
1. The product's own homepage / pricing page / docs (WebFetch; some pages are
   JS-rendered SPAs or bot-blocked — mark those fields unverifiable rather than
   sourcing from third parties).
2. For OSS entries, the GitHub repo (license field, archived flag, `pushed_at`
   for activity, transfers/renames) — the GitHub API is authoritative over
   marketing pages for license/activity.
3. Fields: `pricing` (markups/tiers), `eu`/`eu_detail` (distinguish inference
   residency vs logs-only vs self-host), `self_host`, `open_source`, `hq`,
   `notes` (rebrands, acquisitions, shutdowns, abandonment).

**Never invent values.** If a field cannot be re-confirmed from a first-party
source, keep the previous snapshot's value and flag it in `notes` (see IBM
watsonx.ai, Martian, LangDB pricing, AnannasAI in the 2026-07-22 pass).

## Currency
Prices are recorded in each product's **native currency** (EUR for EUrouter
tiers, USD elsewhere). No FX conversion is applied and no exchange rate is
stored in the file. (If a conversion is ever introduced, use the ECB reference
rate of the collection date and record it.)

## EU classification (from the JSON `note`)
EU-native (inference routed in-EU by design) > EU option (EU endpoint/region
available, often enterprise) > Self-host in EU (OSS on your own EU infra) >
Logs-only (only logs/metadata EU-resident) > No. US-HQ vendors stay flagged
US regardless of server location (CLOUD Act).

## 2026-07-22 findings summary
- Changed: Cortecs HQ Vienna; Requesty 600+ models; Portkey tiered SaaS pricing
  ($49 Production) + 50+ guardrails + Gateway 2.0; TrueFoundry 4-tier pricing
  (Pro Plus $2999); llmgateway.io explicit pricing + AGPL-3.0; LangDB repo →
  vllora/vllora (agent debugging); Vercel AI Gateway "$5/mo credits" gone,
  add-on surcharges added; Martian repositioned as research lab (router pages
  down); Plano homepage planoai.dev; New API homepage newapi.ai; AIMLAPI 1000+
  models; nano-gpt 5% pinning/BYOK surcharges; RouteLLM inactive since 2024-08;
  Helicone standalone gateway repo idle since 2025-11; Pydantic markup detail
  (5% Personal/Team, 3% Growth); Kilo Code official Inceptron EU partnership.
- Unverifiable (old values kept, flagged in notes): IBM watsonx.ai (403),
  Martian pricing/self_host, LangDB pricing/HQ (403), AnannasAI (HTTP 522),
  GPUStack HQ, nano-gpt $8/mo sub, several HQ fields.
- No gateways added or removed (35 entries).
