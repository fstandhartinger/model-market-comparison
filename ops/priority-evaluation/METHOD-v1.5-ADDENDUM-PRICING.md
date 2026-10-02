# JevBench v1.5 — pricing addendum (method revision v1.5-M2, disclosed)

**Status:** appended to the frozen `METHOD-v1.5.md` (SHA-256
c25d3d8b8512e4d93370a9e0c99705d19b2a9389956ca33b8a4bd2b0ec501c07), which is **not edited**. The sampler
seed int(sha256(METHOD-v1.5.md)[:16],16) and the frozen sample (board #1339) are therefore unchanged.
This addendum's own SHA-256 is posted on the agent board (thread #13) and recorded in `SHA256SUMS`.

**Disclosure (integrity rule, METHOD §0).** Written on 2026-09-25 (Berlin afternoon) on Florian's
approval of the same day (DECISIONS.md, 25 Sep 13:20). At the time of writing **no v1.5 result
existed**: the official sample was frozen at 13:13 UTC and no entrant had run (board #1339). The
author had seen no v1.5 output of any system. The rules below were chosen to stop price gaming, not
from any ranking. They only tighten which price enters the unchanged Cost formula of METHOD §5.

**Scope.** JevBench v1.5 and every later release, and JevBench v1.4.x **from the next re-score on**
(v1.4.3 and later). Already published v1.4.2 rows are not changed retroactively; they are brought in
line when they are next re-scored.

## 1. Which price counts

1. Only a **public, bookable list price** counts: a price anyone can buy at today, self-serve or on a
   published price list, without negotiation.
2. The list price must have been **continuously in effect for at least 30 days** on the release's
   price cut-off date.
   - A price **cut** that is younger than 30 days does not count yet; the previous price that met the
     30-day test is used. If no price meets the test, the system is treated as having no bookable
     price and gets the base-model estimate (24 Sep price rule), labelled as an estimate.
   - A price **increase** counts immediately (it cannot make a system look better).
   - Evidence of age: a dated vendor price page or changelog, a public web archive snapshot, or our
     own dated price snapshot. Without evidence, the 30-day clock starts on the first date we recorded
     the price.
3. **Not counted:** promotions, launch or introductory discounts, subsidies, credits, free tiers,
   "free during beta/preview", time-limited offers, discounts that need a commitment or a volume
   tier, and author-announced or hypothetical tariffs. Where the free or promotional route is the
   only one, the system counts as having no bookable price (base-model estimate, labelled).

## 2. Price floor

Scoring cost = **max(cost at the counting list price, cost at the market reference price of the
system's base model)**, both computed from the system's own measured tokens per decision, in USD per
1,000 decisions.

- The market reference price is determined **exactly as in the base-model price rule** (DECISIONS
  24 Sep 20:30, reflex-27b precedent): the public hosted list price of the exact base model on
  OpenRouter (or an equivalent public market listing if OpenRouter has none), per input and output
  token, snapshotted at the release's price cut-off date.
- The floor is compared on the per-decision cost, not on the per-token rates, so it cannot be avoided
  by shifting price between input and output tokens.
- If a system has no identifiable public base model, or the base model has no market reference
  price, no floor applies and the row says so.
- When the floor binds, the row shows both numbers and the note "price floor: base-model reference
  price applied".

## 3. Later price changes

- A change of a counting list price (after it passes the 30-day test, or an increase at once), or of
  the base-model reference price used as the floor, triggers a **re-score** of the affected row in the
  next release or data patch.
- The re-scored row carries a **visible note** with the date of the change, the old and new price
  basis, and the previous score.
- A re-score that changes the public top five goes through the standing top-five approval gate
  (AGENTS.md, JevBench publishing).

## 4. Unchanged

The Cost formula (100 − 30 · log10($/1,000 decisions / 0.001)), token pooling, the demo/self-host
latency adjustment, all weights and gates, and every other part of METHOD-v1.5.md are unchanged.
