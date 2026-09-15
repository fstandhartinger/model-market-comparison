# TrustedTokens — collection method (CR-27.1)

**Source:** `https://trustedtokens.eu/api/service/models` — the unauthenticated JSON endpoint the
public ModelsIsland at `https://trustedtokens.eu/models/` itself loads (checked in the page's own
`/_astro/models.*.js` module, 2026-09-15). One GET plus the ECB daily EUR/USD reference rate.
`https://trustedtokens.eu/robots.txt` allows all paths (`Allow: /`). No account, no login, no
bot-protection circumvention — this is the page's own data request, the preferred collection
method in E3.

**Operator and hosting (audited 2026-09-15, see
`/home/flori/jobs/bh-data-verification-20260915/TRUSTEDTOKENS.md`):** TrustedTokens is operated by
TNG Technology Consulting GmbH (Unterföhring, Germany; HRB 135082 München). The FAQ states all
inference runs on TNG-operated GPU infrastructure in Germany (Noris datacenter, Aschheim/Munich),
prompts and outputs are not used for training and not stored beyond the API call, and a GDPR
Art. 28 DPA is offered. Treated as **EU-hosted, sovereign Germany**; one of the audited small
EU-sovereign providers (like IONOS, Scaleway, TensorX, T-Systems T-Cloud rows).

**Access model (decision, recorded for X7):** B2B only (business status verified at onboarding) and
priced as **subscriptions with included monthly usage credit** (Starter €50 / Pro €200 /
Enterprise €2,000 per month, all without VAT, marked indicative) — the public per-token prices are
what the credit is billed against. We ingest the public per-token prices as normal offers (they
are the only public price list and directly comparable per task); the plans are documented in the
snapshot's `currency_note`, not mixed into `data/raw/subscriptions.json` (that file holds consumer
chat subscriptions per R6.3). Florian may overrule either choice.

**Normalization:** prices arrive as EUR *per token* and are stored as EUR per 1M tokens;
`input/output/cache_read_per_1m_usd = EUR × ECB daily reference rate`, rounded to the nearest USD
cent (same convention as T-Systems). Lifecycle comes from the catalog's own `attributes`
(`deprecated` kept, `experimental`, `production-stable`, `flagship`). `eu_hosted: true`,
`hosting_class: sovereign_germany` per the audit. Model identity is the catalog's `org/name`
slug (also the Hugging Face id for all current rows); the org segment maps to our lab names
(`zai-org` → Z.ai, `qwen` → Alibaba, `deepseek-ai` → DeepSeek, `tngtech` → TNG Technology
Consulting — its own model merge, DeepSeek-TNG-R1T2-Chimera — `nvidia` → NVIDIA).

**Fail-closed:** non-JSON answer, missing/shrunken catalog (< 8 models), unexpected model-name
shape, a missing providers entry, an unreadable or implausible price, a duplicate, or fewer than
half the previously known models still listed → the previous snapshot is preserved.

**Not imported:** the subscription plan table (`/pricing`) and the Reserved Capacity GPU-hour
tier — they are account products, and the API access rule (per-token billing against included
credit) is already captured in the per-offer notes and the snapshot's `currency_note`.
