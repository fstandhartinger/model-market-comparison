# Claude (Claude Code / Enterprise) — list token pricing — method & sources

**Collected:** 2026-06-15
**Output:** `data/raw/claude-code.json`

## What this captures

First-party Anthropic Claude Developer Platform (API) **list/standard** per-token
prices in USD per 1M tokens, for the models relevant to a Claude Code Enterprise
deployment consuming the API / Claude Code via token metering:

- Claude Opus 4.8 (`claude-opus-4-8`)
- Claude Opus 4.7 (`claude-opus-4-7`)
- Claude Opus 4.6 (`claude-opus-4-6`)
- Claude Sonnet 4.6 (`claude-sonnet-4-6`)
- Claude Fable 5 (`claude-fable-5`) — Claude 5 / Mythos-class tier, above Opus

For each: input $/1M, output $/1M, plus 5-minute cache-write and cache-read
(hit) prices. Batch discount and Fast mode noted per model.

## Sources (both authoritative, cross-checked, identical)

1. **`claude-api` local skill** — `~/.claude/skills/.../claude-api/SKILL.md`
   "Current Models" table (cached 2026-06-04) and `shared/models.md`. This is the
   org's curated source of truth for model IDs and base input/output pricing.
   Invoke via the `claude-api` Skill; the model table is in SKILL.md.

2. **Official Anthropic pricing page** —
   <https://platform.claude.com/docs/en/about-claude/pricing.md>
   (canonical human page: <https://claude.com/pricing>). Provides the full
   matrix: base input, 5m cache write (1.25x), 1h cache write (2x), cache hit
   (0.1x), output, plus the Batch API and Fast mode tables. Fetched & verified
   2026-06-15 — prices match the skill exactly.

## Pricing structure notes

- **Prompt caching:** cache write = 1.25x base input (5-minute TTL) or 2x
  (1-hour TTL); cache read (hit) = 0.1x base input. Multipliers stack with batch
  and data-residency modifiers.
- **Batch API:** 50% discount on both input and output tokens.
- **1M context:** included at standard pricing for Fable 5, Opus 4.6/4.7/4.8,
  Sonnet 4.6 — no long-context premium.
- **Data residency:** `inference_geo: "us"` adds a 1.1x multiplier on all
  categories (Opus 4.6+/Sonnet 4.6+); global routing (default) is standard.
- **Thinking vs non-thinking:** NO pricing difference. Output tokens, including
  thinking/reasoning tokens, are billed at the single output rate.
- **Tokenizer:** Opus 4.7+ (and Fable 5) use a newer tokenizer that may produce
  up to ~35% more tokens for the same fixed text vs Opus 4.6 and earlier — a
  real-cost factor when comparing, even though the per-token rate is unchanged.

## Plan structure (Claude Code Enterprise)

Claude Code can be consumed two ways:
- **API / token-metered** — pay the per-1M-token list prices above (or negotiated
  volume discounts). This is what `claude-code.json` captures.
- **Claude subscription seat** — Pro / Team / Max / Enterprise. Claude Code
  Enterprise is a **seat-based** subscription (per-user seats via Anthropic
  enterprise sales, custom volume pricing) that bundles Claude Code usage under
  usage caps rather than per-token billing. Heavy enterprise consumption is
  typically still run against the API at these per-token rates.

The key deliverable is the per-1M-token list pricing; seat pricing is not a
published per-token number (contact-sales / custom).

## How to update

1. Re-run the `claude-api` skill and read the "Current Models" table in SKILL.md
   (note the cache date at the top of that table).
2. WebFetch <https://platform.claude.com/docs/en/about-claude/pricing.md> to
   confirm base input/output, cache, and batch numbers, and to catch any new
   model tier.
3. Update `models[]` and `collected_at` in `claude-code.json`. Keep `model_id`
   strings exact (no date suffixes; use aliases like `claude-opus-4-8`).
