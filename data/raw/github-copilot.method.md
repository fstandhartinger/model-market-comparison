# GitHub Copilot pricing — collection method and caveats

Collected: 2026-07-22 (previous: 2026-07-12)

Output: `data/raw/github-copilot.json`

## Scope

This snapshot deliberately carries both billing systems that are still relevant:

1. `current_models[]` contains the current supported Copilot catalog and its
   token prices. Current usage is converted to GitHub AI Credits at
   **1 credit = $0.01 USD**.
2. `models[]` contains the complete official **legacy** premium-request
   multiplier table. The build currently consumes this array for Copilot's
   separate per-request comparison axis.

These two arrays must not be conflated. A current token price is not a premium
request multiplier, and neither can be converted into the other without knowing
the request's input, cached-input, cache-write, and output token counts.

## Current commercial billing (Business and Enterprise)

GitHub moved organization and enterprise customers to usage-based billing on
June 1, 2026. Copilot features consume model tokens, the model's published token
price is converted to AI Credits, and overage is billed at $0.01 per credit.
Code completions and next-edit suggestions remain unlimited on paid plans and do
not consume AI Credits.

| Plan | Seat price / month | Standard credits / user / month | Existing-customer promotion |
|---|---:|---:|---:|
| Business | $19 | 1,900 | 3,000 during June-August 2026 |
| Enterprise | $39 | 3,900 | 7,000 during June-August 2026 |

The promotional window is recorded as `2026-06-01` through the exclusive end
`2026-09-01`. Credits are pooled at the billing-entity level and do not roll
over. When the pool is exhausted, configured budgets determine whether usage is
blocked or continues as paid overage.

The individual plans were also refreshed because they appear in the source
file: Pro $10 / 1,500 credits, Pro+ $39 / 7,000 credits, and Max $100 / 20,000
credits. GitHub labels the portion above each subscription-price-equivalent base
as a variable flex allotment.

## Current supported model catalog and token prices

`current_models[]` is the intersection of two official references fetched on
the collection date:

- the supported-model catalog determines which models are currently offered;
- the models-and-pricing table supplies USD prices per 1M tokens.

Result: **27 current models** across OpenAI, Anthropic, Google, Microsoft,
GitHub, and Moonshot AI. The only new entry relative to the 2026-07-12 snapshot
is **Gemini 3.6 Flash** (GA, categorized Versatile in the pricing table, $1.50
input / $0.15 cached input / $7.50 output per 1M tokens — note the output price
is lower than Gemini 3.5 Flash's $9.00). Gemini 3.6 Flash appears in the
supported-model catalog and pricing table but not yet in the legacy multiplier
table, so it has no `models[]` row. All other prices, plans, credits, the
June-August 2026 commercial promotion, and the Claude Sonnet 5 introductory
pricing (through 2026-08-31) were re-verified unchanged on 2026-07-22. Claude
Sonnet 4 remains in one pricing table and in parts of the plans page, but it is
absent from the current supported-model reference, so it is not treated as a
current supported model here.

For models with a long-context tier, the normal price is stored in the main
fields and the threshold and higher price are stored in `long_context`.
Anthropic models also have a cache-write field. Claude Sonnet 5's stored values
are the active introductory prices through August 31, 2026; its standard values
from September 1 are recorded separately on the same row.

## Legacy premium-request billing

The multiplier table now applies **only** to Copilot Pro and Copilot Pro+
subscribers on an existing annual plan who chose to remain on request-based
billing after June 1, 2026. It does not apply to Business, Enterprise, new
individual plans, or current AI-Credit overage. GitHub also states that users on
legacy annual plans do not receive new models and features.

- Overage remains **$0.04 per premium request**.
- `effective_usd_per_request = multiplier × $0.04`.
- Auto model selection receives a 10% multiplier discount.
- Copilot code review uses 13 premium requests under legacy billing.
- GitHub marks Claude Sonnet 4.6 and GPT-5.4 mini multipliers as subject to
  change and identifies MAI-Code-1-Flash's 0.33× multiplier as promotional;
  no promotion end date is published.

The official table contains 25 model rows. Several are no longer in the current
usage-based catalog (for example GPT-4o and GPT-5.1 variants); they remain in
`models[]` because GitHub's legacy reference still lists them.

## Official primary sources

1. Current supported models:
   <https://docs.github.com/en/copilot/reference/ai-models/supported-models>
2. Current per-token model prices:
   <https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing>
3. Business/Enterprise credits, pooling, promotion, and overage:
   <https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises>
4. Commercial plan prices and standard credits:
   <https://docs.github.com/en/copilot/tutorials/roll-out-at-scale/assign-licenses/choose-enterprise-plan>
5. Individual plan prices and credits:
   <https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-individuals>
6. Legacy multiplier table:
   <https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/model-multipliers-for-annual-plans>
7. Legacy request allowances and $0.04 overage:
   <https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/copilot-requests>

No secondary source supplies a value in this snapshot.

## Update procedure

1. Reconcile the supported-model page against the current pricing table.
2. Replace `current_models[]`; preserve long-context thresholds and promotional
   start/end semantics explicitly.
3. Re-fetch the two usage-based billing pages for credit allowances and active
   commercial promotions.
4. Re-fetch the legacy multiplier page independently. Do not infer multipliers
   for new models that are absent from that page.
5. Recompute every legacy `effective_usd_per_request` from the published
   multiplier and `$0.04` base price.
6. Validate JSON and assert 27 current rows and 25 legacy rows for this snapshot.

## Collection notes 2026-07-22

All seven documented URLs still work with plain `curl -sL` (HTTP 200, no
anti-bot). Tables were extracted from the raw HTML with a small Python
`html.parser` script. Legacy multiplier table re-fetched independently: still
exactly 25 rows with unchanged multipliers, $0.04 overage, 10% auto-selection
discount, and the subject-to-change / promotional flags on Claude Sonnet 4.6,
GPT-5.4 mini, and MAI-Code-1-Flash. All prices in this source are USD; no EUR
conversion applies.
