# Claude API / Claude Code Enterprise — collection method

Collected: 2026-07-12

Output: `data/raw/claude-code.json`

## Scope

This snapshot covers two related Anthropic offers:

1. first-party Claude API list prices in USD per 1M tokens; and
2. the current Claude Code Enterprise seat plus its usage-billing terms.

`models[]` includes every non-retired first-party API model with a published
price on the collection date. That means active generally available models,
Claude Mythos 5 in limited availability, and Claude Opus 4.1, which is deprecated
but remains callable until its scheduled August 5, 2026 retirement. Models that
Anthropic marks retired are excluded even when the pricing page still displays
their historical/cloud-platform rates.

## Snapshot result

The file contains **11 callable models**:

- 10 active models: Claude Fable 5, Claude Mythos 5, Opus 4.8, Opus 4.7,
  Opus 4.6, Opus 4.5, Sonnet 5, Sonnet 4.6, Sonnet 4.5, and Haiku 4.5.
- 1 deprecated but not yet retired model: Claude Opus 4.1.

Newly captured relative to the prior incomplete snapshot are Claude Mythos 5,
Claude Opus 4.5, Claude Opus 4.1, Claude Sonnet 4.5, and Claude Haiku 4.5.
Mythos Preview is not included because it retired June 30, 2026 in favor of
Mythos 5.

For older dated model IDs, the pinned ID is stored in `model_id` and the
convenience alias separately in `model_alias`. Starting with the 4.6 generation,
Anthropic's dateless IDs are themselves pinned model IDs rather than evergreen
aliases.

## Token price fields

The main fields are the current standard/list prices unless an explicitly dated
promotion is active:

- `input_per_1m_usd` and `output_per_1m_usd`
- `cache_write_per_1m_usd` for a five-minute cache write
- `cache_write_1h_per_1m_usd` for a one-hour cache write
- `cache_read_per_1m_usd` for a cache hit/refresh
- `batch_input_per_1m_usd` and `batch_output_per_1m_usd`

Anthropic's general modifiers are 1.25× input for a five-minute cache write, 2×
for a one-hour cache write, 0.1× for a cache read, and 50% off input/output for
the Batch API. Output tokens, including thinking tokens, use the single output
rate for the selected model.

Claude Opus 4.6, Claude Sonnet 4.6, and later models incur a 1.1× multiplier
when `inference_geo: "us"` is requested. Default global routing uses the standard
price. This modifier applies to all token categories and stacks with caching and
other modifiers.

## Active promotion and fast-mode lifecycle

Claude Sonnet 5 has introductory pricing through **August 31, 2026**:

| Category | Promotional | Standard from 2026-09-01 |
|---|---:|---:|
| Input | $2 / MTok | $3 / MTok |
| 5m cache write | $2.50 / MTok | $3.75 / MTok |
| 1h cache write | $4 / MTok | $6 / MTok |
| Cache read | $0.20 / MTok | $0.30 / MTok |
| Output | $10 / MTok | $15 / MTok |
| Batch input | $1 / MTok | $1.50 / MTok |
| Batch output | $5 / MTok | $7.50 / MTok |

The active promotional values are stored in the top-level fields so the app
shows the price actually charged on the collection date. The future standard
values and transition date are retained in `standard_pricing` to make the
scheduled update deterministic.

Fast mode is not a separate model row in this direct-API file:

- Opus 4.8 fast mode is a research preview at $10 input / $50 output per MTok.
- Opus 4.7 fast mode is deprecated at $30 / $150 and scheduled for removal on
  July 24, 2026.
- Opus 4.6 fast mode was removed June 29, 2026. A request with `speed: "fast"`
  now runs at standard speed and standard price.

Fast-mode facts are stored on the affected model rows. Fast mode cannot be
combined with the Batch API; cache and data-residency modifiers still stack.

## Fable 5 and Mythos 5 availability

Claude Fable 5 is generally available; Claude Mythos 5 has the same published
specs and prices but is available only to approved Project Glasswing customers.
Both require 30-day data retention and are not eligible for zero data retention.
Their access had been temporarily interrupted and was restored before this
snapshot. Mythos 5 succeeds Mythos Preview.

## Claude Code Enterprise pricing

The current Enterprise offer is no longer accurately described as an opaque
custom seat bundle with included usage:

- **$20 per user per month**, billed annually;
- a single Enterprise seat includes Claude web/desktop/mobile, Claude Code, and
  Cowork;
- the seat includes **no usage allowance**;
- every token used in Claude, Claude Code, or Cowork is billed from the first
  token at standard API rates on top of the seat fee;
- no plan-level or seat-level usage cap; admins can set org/user spend limits;
- self-serve minimum: 20 seats; sales-assisted minimum: 50 seats.

Sales-assisted Enterprise can add invoicing, HIPAA-readiness/BAA, dedicated
customer success, and multi-currency support. Anthropic also documents
case-by-case enterprise volume discounts and custom terms. The older Chat / Chat
+ Claude Code and Standard / Premium seat types are legacy, unavailable for new
contracts, and transition to the single Enterprise seat at renewal.

## Official primary sources

1. Full model/cache/batch/fast pricing and Sonnet 5 promotion:
   <https://platform.claude.com/docs/en/about-claude/pricing>
2. Latest models, canonical IDs, Fable/Mythos availability, and context specs:
   <https://platform.claude.com/docs/en/about-claude/models/overview>
3. ID/versioning semantics:
   <https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions>
4. Active/deprecated/retired lifecycle table:
   <https://platform.claude.com/docs/en/about-claude/model-deprecations>
5. Sonnet 5 launch and promotional pricing:
   <https://platform.claude.com/docs/en/about-claude/models/whats-new-sonnet-5>
6. Fable 5 / Mythos 5 launch and limited availability:
   <https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5>
7. Model-specific retention rules:
   <https://platform.claude.com/docs/en/manage-claude/api-and-data-retention>
8. Enterprise seat price and plan comparison:
   <https://claude.com/pricing>
9. Current Enterprise billing, minimum seats, and legacy-plan transitions:
   <https://support.claude.com/en/articles/9797531-what-is-the-enterprise-plan>
   <https://support.claude.com/en/articles/13393991-purchase-and-manage-seats-on-enterprise-plans>

No local cached skill and no secondary source supplies a value in this snapshot.

## Update procedure

1. Reconcile the pricing page with the lifecycle page; exclude rows already
   retired from the first-party API and retain deprecated rows until retirement.
2. Reconcile the latest-model overview and model ID/versioning page for new IDs,
   aliases, and limited-availability offers.
3. Refresh base, both cache-write TTLs, cache-read, batch, fast-mode, promotion,
   and data-residency values independently.
4. On September 1, 2026, promote Sonnet 5's `standard_pricing` values to the
   top-level price fields and remove the expired promotion block.
5. On August 5, 2026, remove Opus 4.1 after confirming retirement. On July 24,
   remove Opus 4.7's fast-mode block after confirming removal.
6. Re-fetch Claude pricing and Enterprise Help Center pages because seat and
   usage terms are separate from API model pricing.
7. Validate the JSON and confirm every numerical price maps directly to an
   official table entry or documented multiplier.
