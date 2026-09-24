# Claude API / Claude Code Enterprise — collection method

> **Current audit: 2026-09-24.** The adjacent JSON records the current model prices, exclusions, modifier checks, Enterprise terms, and response hashes. The dated collection notes below are historical unless marked as the current snapshot.

Current snapshot refreshed: 2026-09-24 (previous complete check: 2026-09-08).

Output: `data/raw/claude-code.json`

## Scope

This snapshot covers two related Anthropic offers:

1. first-party Claude API list prices in USD per 1M tokens; and
2. the current Claude Code Enterprise seat plus its usage-billing terms.

`models[]` includes first-party API models that have a published price and are
not retired on the collection date, including restricted-availability models.
Retired rows are excluded even when a pricing page still shows historical or
cloud-platform rates. The current snapshot contains 14 callable rows and excludes
four retired models, listed above.

## Snapshot result

The current snapshot contains **14 callable models**: Fable 5.1, Opus 5.5,
Sonnet 5, Mythos 5.1, Fable 5, Mythos 5, Opus 5, Opus 4.8, Opus 4.7, Opus 4.6,
Opus 4.5, Sonnet 4.6, Sonnet 4.5, and Haiku 4.5. Four retired models are
excluded: Opus 4.1, Opus 4, Sonnet 4, and Haiku 3.5. The current lifecycle
source and exact exclusion labels are in the adjacent JSON and its response hashes.

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
for a one-hour cache write, 0.1× by default for a cache read, and 50% off
input/output for the Batch API. The current pricing page also lists model-specific
cache-read exceptions; the catalog parser checks and records them. Output tokens, including thinking tokens, use the single output
rate for the selected model.

Claude Opus 4.6, Claude Sonnet 4.6, and later models incur a 1.1× multiplier
when `inference_geo: "us"` is requested. Default global routing uses the standard
price. This modifier applies to all token categories and stacks with caching and
other modifiers.

## Active promotion and fast-mode lifecycle

As checked on **2026-09-24**, Anthropic still lists Claude Sonnet 5 at $2 input
and $10 output per MTok. The pricing documentation explicitly says the planned
September 1 increase to $3/$15 will not happen. Do not promote the stale
standard-price schedule or infer a future price; the current values remain in
the adjacent JSON. The retained official pricing response hash is recorded in
`response_sha256.pricing` there.

Fast mode is not a separate model row in this direct-API file:

- Opus 4.8 fast mode is a research preview at $10 input / $50 output per MTok.
- Opus 4.7 fast mode is unavailable. The current pricing page says `speed: "fast"`
  requests return an error; its former fast-mode rate is historical only.
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

Fetch tip: the platform.claude.com docs pages serve clean Markdown when the
`.md` suffix is appended (e.g. `.../about-claude/pricing.md`), which avoids
HTML scraping. `claude.com/pricing` and the support.claude.com articles are
plain HTML but fetch fine with curl and a browser User-Agent (verified
2026-07-22).

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

## Executable collector (refreshed 2026-09-24)

`scripts/fetch-claude-api-catalog.mjs` (parser `lib/claude-api-catalog.mjs`, tests `test/claude-api-catalog.test.mjs`)
runs as the non-fatal daily step `fetch-claude-api-catalog`. Four GETs with an identifying User-Agent:
`platform.claude.com/docs/en/about-claude/pricing` and `…/model-deprecations` (robots.txt disallows only
`/api/`), `claude.com/pricing` (robots.txt allows all), and the Enterprise Help Center article.
The 2026-09-24 refresh captured all four response bodies before parsing.

- `models[]`: the pricing page's model table (base input, 5m/1h cache writes, cache hits, output) and its
  batch table, matched by model name. Rows labelled "retired" there, or `Retired` in the deprecations
  lifecycle table, are excluded and listed in `excluded`. `lifecycle_status` and `tentative_retirement` come
  from the lifecycle table by API model id; curated ids, aliases, availability and notes are kept. A name
  that is new to the snapshot gets `mapping: derived` and a name-derived `model_id` marked as such.
- `pricing_modifiers`: 5m/1h cache-write multipliers are derived from the table and must be uniform; the
  cache-hit default and all model-specific exceptions, the batch discount, and the US-only
  `inference_geo` multiplier are read from the page prose. Missing prose fails the run.
- `claude_code_enterprise`: the seat price is re-read from the pricing page; minimum seats, sales-assisted
  options, usage billing/limits, and the legacy-seat note are re-read from the Enterprise Help Center.
  Both check dates were updated to 2026-09-24 after successful validation.
- Fails closed: missing price or batch table, unreadable price, a callable row without a batch price,
  inconsistent write multipliers, or fewer than 50 % of previous rows still listed.
- First run 2026-09-14: all 13 callable rows and every modifier reproduced the 2026-09-08 snapshot exactly;
  four retired rows excluded (Opus 4.1, Opus 4, Sonnet 4, Haiku 3.5); tentative retirement dates added.
