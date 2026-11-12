# ImageJevBench v0.4 aggregate feed (schema 1)

The loader is `imagejev-v04-feed.mjs`; its TypeScript contract is in
`imagejev-v04-feed.d.mts`. The example is
`data/fixtures/imagejev-v04.fixture.json`. **All example models and numbers are
fictional fixtures, not benchmark results.** No measurements run in this code.

The separate `/image-jev-bench/v0.4` page uses the site's normal layout. It is
unlisted and `noindex`; the existing `/image-jev-bench` v0.3 board, archives,
radars, full roster and `/jev-models` page are untouched. This is a fixture board
for release-owner review, not a public release or a replacement for v0.3.

## Wiring

- By default the page reads `data/imagejev-v04.json` at request time. That file
  intentionally does not exist on this branch: there are no measured v0.4 results.
- Set `IMAGEJEV_V04_PREVIEW_FIXTURE=1` on a **local preview server** to read the
  committed fixture instead. No query string can enable fixtures. The loader also
  requires `allowFixture: true`; production's default path rejects fixture data.
- `loadImageJevV04Feed(readText, options)` parses JSON and calls
  `validateImageJevV04Feed(unknown)`. It returns the validated feed or `null`.
  Read errors, malformed JSON, invalid fields and empty feeds all return `null`;
  the entire results section is hidden and the page shell still responds normally.
  There is no fallback to v0.3, cache, partially valid rows or estimated values.
- The page's file paths are fixed, relative to the app root, and included in
  Next's output tracing for this route. It never fetches a remote feed.
- The release owner supplies the reviewed measured JSON and method disclosure,
  reviews how to expose the page, and removes preview indexing restrictions as a
  separate publication step. Changing the fixture switch alone cannot publish
  measured results. This branch does not add a menu/sitemap entry or release claim.

## Fields

Every listed field is required. Objects accept **only** these fields, so legacy
ranking, carry and delta fields cannot silently enter the new board. JSON numbers
must be finite numbers, not strings. Timestamps are canonical UTC ISO strings
(`YYYY-MM-DDTHH:mm:ss.sssZ`) and must represent real dates.

| Feed field | Contract |
| --- | --- |
| `schema_version` | Exactly `1` |
| `benchmark` | Exactly `"ImageJevBench"` |
| `scale` | Exactly `"v0.4"`; no cross-version scale |
| `revision` | `v0.4`, optional numeric patch, optional uppercase-led suffix, e.g. `v0.4-A` |
| `data_kind` | `"fixture"` or `"measured"`; fixtures require explicit loader opt-in |
| `built_utc` | Canonical UTC ISO timestamp |
| `items` | Integer 1–1,000,000; total items in this v0.4 feed |
| `method_disclosure` | Nonblank plain text up to 20,000 characters, or `null` for the visible release-owner placeholder |
| `rows` | 1–1,000 complete aggregate rows; unique IDs; rendered in supplied order |

| Row field | Contract |
| --- | --- |
| `id` | 1–100 lowercase letters, digits, `.`, `_`, `-`; starts with a letter or digit |
| `name` | Nonblank plain text, at most 200 characters |
| `n` | Integer 1–`items`; measured item count for this row |
| `measured_utc` | Canonical UTC ISO timestamp, no later than `built_utc` |
| `intelligence`, `calibration`, `composite` | Scores in [0, 100], measured on this v0.4 scale |
| `latency_p50_s` | Median latency in seconds, finite and nonnegative |
| `usd_per_1000` | USD per 1,000 decisions, finite and nonnegative |

Fixture row IDs must start `fixture-` and names must start `Fixture `; the UI also
shows a prominent fictional-fixture warning. Scores use the existing English UI
and `en-US` numeric formatting; no UI translation layer exists on the v0.3 page.

The displayed raw Capability is `(intelligence + calibration) / 2`, using only
the current v0.4 row. Composite is supplied by the feed, not recomputed here.
There are **no ranks, eligibility caps, v0.3 deltas, carried results or combined
leaderboards** in this preview contract. The chart explicitly labels raw
Capability as uncapped. No existing shared ranking helper or legacy artifact is
imported. This contract intentionally does not promise the final release's
ranking, category-radar or acceptance schema; those need the release owner's
measured artifacts and separate review.

Run validation tests with `node --test test/imagejev-v04-feed.test.mjs`.
Production-page tests live in `test/imagejev-v04-page.test.mjs` and run after a
production build as part of `npm test`.
