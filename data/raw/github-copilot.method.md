# GitHub Copilot pricing — collection method and caveats

> **Current audit: 2026-09-24.** The adjacent JSON stores the current model/plan data, source dates, and response hashes. Earlier dated collection notes below are historical unless marked as the current snapshot.

Current catalog snapshot refreshed: 2026-09-24 (previous full audit: 2026-09-08).

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

Current result: **32 supported and priced models** and **18 legacy multiplier rows**. The adjacent JSON records current per-model values, availability gaps, retirement history, and source hashes. On 2026-09-24, Claude Sonnet 4 remained present in a pricing table but was absent from the supported-model catalog, so it stays out of `current_models[]` and is listed under `priced_not_supported`.

Current subscription terms were rechecked separately on 2026-09-24. Individual Pro, Pro+, and Max remain $10/$39/$100 per month with 1,500/7,000/20,000 monthly AI credits. Business and Enterprise remain $19/$39 per user per month with 1,900/3,900 monthly credits. Existing-customer promotional credits ended on 2026-09-01; the raw `plans[]` retains the dated promotion for historical clarity. The checked pages and hashes are stored in `plans_source_evidence`.

For models with a long-context tier, the normal price is stored in the main
fields and the threshold and higher price are stored in `long_context`.
Anthropic models also have a cache-write field. Promotion end dates are retained
with the affected rows and are not treated as current prices after expiry.

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

The current captured legacy table contains 18 model rows. Rows remain in
`models[]` when GitHub still lists them for eligible legacy annual subscribers,
even if they are absent from the current usage-based catalog.

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
6. Validate JSON and reconcile current and legacy counts to the captured source tables. The 2026-09-24 snapshot has 32 current and 18 legacy rows.

## Collection notes 2026-07-22

All seven documented URLs still work with plain `curl -sL` (HTTP 200, no
anti-bot). Tables were extracted from the raw HTML with a small Python
`html.parser` script. Legacy multiplier table re-fetched independently: still
exactly 25 rows with unchanged multipliers, $0.04 overage, 10% auto-selection
discount, and the subject-to-change / promotional flags on Claude Sonnet 4.6,
GPT-5.4 mini, and MAI-Code-1-Flash. All prices in this source are USD; no EUR
conversion applies.

## Executable collector (2026-09-14)

`scripts/fetch-github-copilot-catalog.mjs` (parser `lib/github-copilot-catalog.mjs`, tests
`test/github-copilot-catalog.test.mjs`) runs as the non-fatal daily step `fetch-github-copilot-catalog`.
Three GETs of server-rendered GitHub Docs pages with an identifying User-Agent (docs.github.com robots.txt
allows all): supported-models, models-and-pricing, model-multipliers-for-annual-plans.

- Footnote markers are `<sup><a data-footnote-ref>` elements and are removed by element, never by a
  trailing-digit rule ("Claude Opus 5" must stay "Claude Opus 5"); their footnote text is attached to the row.
- `current_models[]`: supported catalog ∩ pricing tables by exact name, in catalog order. `Default` and
  `Long context` tiers fold into one row (`long_context` with `threshold_input_tokens_gt`); "Not applicable"
  cache writes are omitted; promotion end dates come from the pricing footnote. Supported-but-unpriced and
  priced-but-unsupported names are recorded (`supported_without_price`, `priced_not_supported` — on
  2026-09-14 Claude Sonnet 4 is priced but not supported). The retirement history table is stored as
  `retirement_history`; a name both supported and in that history is listed in `retirement_overlap`
  (2026-09-14: Claude Sonnet 4.6, dated 2026-09-01) and is kept, following the intersection rule.
- `models[]` (legacy): the multiplier table; `effective_usd_per_request` = multiplier ×
  `per_premium_request_usd`; notes follow the page's "subject to change" list; the auto-selection discount
  is read from the page.
- `plans[]` are maintained separately from the model-table collector. On 2026-09-24, the official individual, organization, and enterprise billing pages were rechecked; `plans_checked_at` and the source capture hashes were updated in the adjacent JSON. The automated model collector preserves these fields.
- Fails closed: missing tables, the "1 AI credit = $0.01 USD" statement missing, unreadable price or
  multiplier, unknown tier, duplicate rows, or fewer than 50 % of previous rows in either array.
- First run 2026-09-14: 28 current and 18 legacy rows reproduced the 2026-09-08 snapshot field for field;
  **MAI-Code-1-Flash** removed from both (retired 2026-09-10, successor MAI-Code-1.1-Flash).
