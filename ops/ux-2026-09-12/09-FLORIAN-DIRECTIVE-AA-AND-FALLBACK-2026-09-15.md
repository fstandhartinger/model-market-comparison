# Florian directive — Artificial Analysis and fallback order

**Decision recorded:** 2026-09-15 UTC

## 1. Artificial Analysis collection

Do **not** pause collection of Artificial Analysis data while awaiting a reply to Florian's email. Continue the normal collection schedule from the publicly available source, retaining normal evidence/provenance and failure handling.

This is not permission to bypass access controls, robots.txt, rate limits, authentication, paywalls, or other protections. If the existing approved collection route becomes unavailable or disallowed, preserve the last verified observation and report that fact rather than evading the restriction.

Remove or supersede any current requirement, stop condition, status text, or collector policy that says Artificial Analysis fetches must wait for an email reply.

## 2. Fallback worker order

Before the two paid OpenRouter fallback models, prefer **`Nex 2.5 Pro`** (the model designation supplied by Florian) **when the exact available route is confirmed free at execution time**.

- Keep the normal model-policy whitelist, quota checks, and exact runtime/model readback.
- Do not silently substitute a differently named Nex model if `Nex 2.5 Pro` cannot be verified as available and free.
- If it is unavailable, no longer free, or not authorized, continue with the approved fallback order and record why.

## Acceptance evidence

1. A dry run or next ordinary successful daily run confirms the Artificial Analysis collector is enabled and retains source date/hash/provenance.
2. The fallback configuration or documented selection logic shows `Nex 2.5 Pro` ahead of the two paid OpenRouter alternatives, conditional on exact free-route verification.
3. Tests and the live service remain healthy after any implementation change.
