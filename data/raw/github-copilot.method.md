# GitHub Copilot pricing — collection method & caveats

Collected: 2026-06-15
Output: `github-copilot.json`

## What this captures

GitHub Copilot's **per-premium-request** pricing for the commercial
(Business / Enterprise) tier, plus the per-model **premium-request multipliers**.
This is a fundamentally different pricing model from per-token LLM pricing — see
the big caveat below.

## CRITICAL caveat #1: per-request, not per-token

Copilot bills in **premium requests**, not tokens. Each user message / agent
interaction with a premium model consumes `1 × multiplier` premium requests.
- Overage price: **$0.04 per premium request**.
- `effective_usd_per_request = multiplier × $0.04`.
This number is NOT comparable to a per-1M-token price without an assumed
tokens-per-request conversion. Display it as its own pricing axis.

## CRITICAL caveat #2: June 1, 2026 billing switch (legacy vs. token)

On **June 1, 2026** GitHub replaced Premium Request Units (PRUs) with
**token-metered "AI Credits"** (1 credit = $0.01 USD), billed at each model's
published per-token API rate with **no monthly ceiling**. Subscription prices
were unchanged (Pro $10, Pro+ $39, Business $19/seat, Enterprise $39/seat).

The per-request **multiplier table in `github-copilot.json` is therefore LEGACY**:
per GitHub docs it now applies only to subscribers who were on an existing annual
plan and **remained on request-based billing after June 1, 2026**. New/most
commercial customers are on token billing.

We capture the legacy multipliers because:
1. They are still in effect for annual-plan holdovers.
2. They are the clean "per-request" pricing axis the comparison app wants.
If the app needs token-based numbers instead, scrape the token table at
`https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing`
(per-million-token rates, e.g. Claude Opus 4.8 ≈ $15/M in, $75/M out;
Claude Sonnet 4.6 ≈ $3/M in, $15/M out; GPT-5 ≈ $3.75/M in, $15/M out).

## CRITICAL caveat #3: multipliers escalated hard in 2026

Microsoft had been absorbing inference cost; the premium-request model became
"no longer sustainable," so frontier multipliers were repriced upward in 2026:
- Claude Opus 4.7: 7.5x → 15x → **27x** over ~60 days.
- GPT-5.3-Codex and Gemini 3.1 Pro: 1x → **6x** on the June 1 2026 reprice.
- GPT-5.5: **57x** (most expensive entry in the table).
Historical (mid-2025) numbers like "Opus 4 = 10x", "Sonnet 4 = 1x" are obsolete —
do not use them.

## Sources (in priority order)

1. **Official — legacy multiplier table (authoritative for the JSON):**
   `https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/model-multipliers-for-annual-plans`
2. **Official — requests concept / overage price & allowances:**
   `https://docs.github.com/en/copilot/concepts/billing/copilot-requests`
   `https://docs.github.com/en/copilot/managing-copilot/monitoring-usage-and-entitlements/about-premium-requests`
   (Confirms $0.04/request; Pro 300/mo, Pro+ 1,500/mo; code review = 13x.)
3. **Official — current token-based pricing (for the post-June-2026 model):**
   `https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing`
4. **Official — plans/pricing:** `https://github.com/features/copilot/plans`
5. **Secondary corroboration:**
   - benday.com/blog/copilot-billing-2026 (Business 300/seat, Enterprise 1,000/seat allowances)
   - mindstudio.ai/blog/github-copilot-new-multiplier-table-price-hikes
   - groundy.com articles on the Opus 4.7 7.5x→27x climb and the June 1 token switch

## Data-quality notes

- Multiplier values are taken verbatim from source #1 (the GitHub docs legacy
  reference table) as fetched on 2026-06-15.
- **Business/Enterprise included allowances (300 / 1,000 per seat)** come from
  source #5 (benday.com) and match GitHub's long-standing pre-June-2026 figures;
  the official docs pages we could fetch only enumerated Pro/Pro+ allowances
  explicitly. Re-verify against an org-billing docs page if exact accuracy for
  Business/Enterprise allowances matters.
- The docs table did not list older models (Claude 3.5/3.7 Sonnet, o3, o4-mini);
  they have been retired from the current Copilot model picker, so they are
  intentionally omitted.

## How to re-fetch / update

1. Re-fetch source #1 for the multiplier table; replace the `models` array.
2. Re-fetch source #2 to confirm `$0.04/request` and the per-plan allowances.
3. Recompute `effective_usd_per_request = multiplier × per_premium_request_usd`.
4. If GitHub fully retires legacy request billing, switch the app to the
   token-based table (source #3) and flag this file as historical.
