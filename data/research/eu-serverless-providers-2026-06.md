# EU-hosted serverless inference — Together AI + high-volume OpenRouter providers (2026-06-29)

Test applied (strict): a provider counts as an **ingestable EU price source** only if a normal
self-serve customer can run the **public per-token serverless API in a customer-selectable EU
region** (documented endpoint / region param / account setting). GDPR/SOC2/ISO claims, "EU
customers welcome", dedicated/enterprise EU endpoints, and EU GPU rental do **not** qualify.

**Bottom line: ZERO new EU serverless price sources.** All providers below stay `eu_hosted: false`,
`non_us: false` (all US-HQ → US CLOUD Act applies regardless of server location). No dataset/offer
changes; provider-meta notes enriched + EU page note added.

| Provider | Verdict | Why |
|---|---|---|
| **Together AI** | EU dedicated/cluster only | Sweden buildout (Sep 2025) = GPU clusters / dedicated endpoints; serverless has one global base URL, no region selector, runs from US capacity. |
| Novita | No EU | Single global endpoint `api.novita.ai`, no region param. AWS-backed, US-HQ (+ SG entity). |
| DeepInfra | No EU (3rd-party EU-GPU claim unconfirmed) | Single global `api.deepinfra.com/v1`; own privacy policy says US data centers. Strong ZDR/SOC2/ISO. |
| AtlasCloud | EU dedicated/enterprise only | `eu-west` only for deploy-your-own dedicated serverless endpoints; public `api.atlascloud.ai/v1` has no region. |
| Parasail | No EU (dedicated-only region) | Single auto-routed `api.parasail.io/v1`; region pinning is a paid Dedicated/sales election. |
| Cloudflare Workers AI | EU enterprise only | Global anycast to nearest GPU; EU pinning needs Data Localization Suite / Custom Regions (Enterprise, "not yet self-serve"). |
| Fireworks AI | EU dedicated/BYOC only | Serverless ships US regions only; EU (Frankfurt/Iceland) only for dedicated/on-demand/BYOC GPU-second deployments. |
| DigitalOcean Gradient/AI | No EU (roadmap) | Serverless single global `inference.do-ai.run`, no region; EU inference regions explicitly "planned", not shipped. **Re-check 2026-H2.** |
| WandB Inference | No EU | CoreWeave-powered, multi-tenant on GCP North America, only `coreweave-us` storage; EU only via sales-gated Dedicated Cloud. CoreWeave (US) owned. |
| Venice AI | No EU | Privacy-policy says Service is US-hosted; compute is a global decentralized GPU pool (Akash/Phala) with no selectable/guaranteed EU geography. No-logs ≠ residency. |

**One to watch:** DigitalOcean (publicly states EU serverless regions are on the roadmap).

Full per-provider evidence + source URLs are in the task transcripts; key sources include each
provider's regions/pricing/data-privacy docs and the Together SE press release
(prnewswire 302545683 / 302547103) + together.ai/data-center-locations.
