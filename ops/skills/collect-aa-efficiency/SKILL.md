---
name: collect-aa-efficiency
description: Collect Artificial Analysis Intelligence Index token-efficiency data (output tokens per task, canonical input/output token counts) for the broad population exposed by a model-page fetch. Use when asked for AA token efficiency, tokens-per-task, input:output benchmark ratios, reasoning-vs-answer token splits, or to refresh data/raw/aa-efficiency.json.
---

# Collect Artificial Analysis token efficiency

AA publishes two measured token-efficiency fields per Intelligence Index variant row:

- `intelligenceIndexOutputTokensPerTask: { reasoning, answer, output }` (floats, output = answer + reasoning within 0.01)
- `canonicalIntelligenceIndexTokenCount: { input, output, answer, reasoning }` (integers, answer + reasoning == output exactly)

**Ratios from these are BENCHMARK PROXIES, never typical user I/O usage.** AA's
token budgets vary substantially across models. Typical-usage ratios
come from OpenRouter/Chutes sources, not from here.

## Where the data actually lives (verified 2026-09-10)

| Attempt | Result |
|---|---|
| API docs `https://artificialanalysis.ai/documentation` | only `/api/v2/data/llms/models`, media endpoints, `/api/v2/critpt/evaluate`; no separate efficiency/token-count endpoint found in the documentation |
| `/api/v2/data/llms/models` | API model objects include speed/context fields and evaluation scores, but no token-count fields were found |
| `https://artificialanalysis.ai/` (homepage) | only the UI-selected chart subset (23 rows on 2026-09-10) |
| `https://artificialanalysis.ai/?intelligence-efficiency=output-tokens-per-task` | byte-identical to homepage (query is client-side only) — do not rely on it |
| `https://artificialanalysis.ai/leaderboards/models` | carries scored rows (636) but ZERO efficiency fields |
| `https://artificialanalysis.ai/models/<slug>` | **carries the GLOBAL population**: 138 efficiency rows including effort variants PLUS all scored leaderboard rows (636 with UUIDs). Verified identical across 3 different model pages. |

**Recipe: fetch ONE model page.** The same population was verified for `gpt-5-6-sol`,
`claude-sonnet-5`, `claude-3-5-haiku`. Try the maintained slug list until one returns 200 (stop on 403/429):
`gpt-5-6-sol`, `claude-sonnet-5`, `gemini-3-5-flash` (slugs churn — e.g.
`deepseek-v4-1` 404s; rotate the list if all fail). Respects robots
(`Allow: /`), plain GET, real UA, ≥2.5 s between probes, no auth, no bulk crawl.

## Parse snippet

The page is Next.js Flight JSON. Reuse `lib/aa-rsc.mjs` (never eval page JS):

```js
import { flightRecords, objects, resolveFlight } from "./lib/aa-rsc.mjs";
const records = flightRecords(html);                       // throws if payload missing
for (const value of records.values())
  for (const object of objects(value)) { /* walk every keyed object */ }
// efficiency fields may be Flight "$ref" strings -> resolveFlight(ref, records)
```

Rows carry: `id` (UUID, exact source id), `slug` (exact variant slug,
e.g. `claude-sonnet-5-low`), `name` (display name incl. variant suffix),
`effort: { slug: "low"|"medium"|"high"|"xhigh"|"max"|"minimal", level }` or absent
(variant = null then; non-reasoning rows have no effort).

Complete collector: `lib/aa-efficiency.mjs` + `scripts/fetch-aa-efficiency.mjs`.
Run: `node scripts/fetch-aa-efficiency.mjs` → `data/raw/aa-efficiency.json`.
Tests: `node --test test/aa-efficiency.test.mjs`.

## Field-level notes

- Output counts for non-reasoning models: `reasoning: 0`, `answer == output` — real zeros, not missing.
- Some models appear as several variant rows (e.g. `gpt-5-6-sol`, `-low`, `-medium`, `-high`, `-xhigh`); each variant has its own UUID. Do NOT collapse by slug family; keep `(source_id, slug, variant)`.
- Coverage 2026-09-10: 138 published rows over 636 scored leaderboard rows (UI says "645 models"). Models without numbers in the checked payloads are ABSENT from `rows` — null-fill downstream, never estimate.

## Failure modes (collector fails closed, previous snapshot retained via atomic replace)

1. All probe slugs 404/timeout → abort, no write.
2. Flight payload missing/malformed → `flightRecords` throws.
3. Carrier with exactly ONE of the two fields → throw (`partial carrier`), source shape changed.
4. Negative/non-numeric values, non-safe-integer counts, `answer+reasoning != output`, zero budgets → throw.
5. Duplicate UUID with conflicting values → throw (`conflicting`).
6. Row count below 100 or below previous snapshot → throw (`incomplete scrape`).
7. Scored denominator below 400 or below carrier count → throw (`denominator`) — guards against AA removing the leaderboard table from the payload.

## Completeness verification

After run, the snapshot self-documents:
- `coverage.published_rows` vs `coverage.scored_denominator` (same payload).
- `attempts[]`: every probe URL with `fetched_at`, HTTP status, bytes, sha256.
- With `--evidence-dir=.phase02-work/aa`, raw bodies + hash log are saved there (`collector-evidence-log.jsonl`, `body-*.html`). Evidence files are optional and ignored by Git.
- Cross-check one well-known row against recon (e.g. `gemini-3-5-flash-lite`: input 1 296 279 040, output 59 475 163, reasoning 48 839 505, answer 10 635 658).
- Arithmetic spot-check: `counts.answer + counts.reasoning === counts.output` for every row (enforced at parse).

These checks cannot prove that the other models have no measurements anywhere on AA. Record them as not published in the collected payload, not as never measured. The collector checks robots before model requests and preserves the snapshot on a changed policy. Three model pages had identical 138-row sets; a 645-page crawl was therefore not justified. The API catalog currently has 644 models, the page has 636 scored rows, and the UI count was 645: keep these denominators distinct.
