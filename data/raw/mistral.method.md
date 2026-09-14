# Mistral AI (La Plateforme) pricing — how to (re)fetch & update

**Output file:** `data/raw/mistral.json`
**Last collected:** refreshed daily by `scripts/fetch-mistral-catalog.mjs` (first automated run
2026-09-14; manual refreshes before: 2026-09-08, 2026-08-26, 2026-07-22, 2026-07-12)

## Update 2026-09-14 — executable collector (R9.1)
`scripts/fetch-mistral-catalog.mjs` + `lib/mistral-catalog.mjs` (tests in
`test/mistral-catalog.test.mjs`) now do the refresh as the non-fatal daily step
`fetch-mistral-catalog` in `ops/daily/daily.mjs`. One GET of <https://mistral.ai/pricing/api>
(`robots.txt`: `Allow: /`); no browser needed.

- Each model is a `<mistral-block-card-model>`; the API id is the copy button's `data-text`.
- A card is a chat/text model only if it has both an `Input (/M tokens)` (Voxtral: `Text Input
  (per min / per M tok)`) and an `Output (/M tokens)` USD price. OCR (per 1000 pages),
  embeddings, classifiers, TTS/transcription and unpriced Labs endpoints (Leanstral) drop out by
  that rule — the scope below is enforced by structure, not by a name list.
- `Cached input (/M tokens)` → `cache_read_per_1m_usd` (today only GLM 5.2: $0.14).
- Hero tiles repeat catalog cards; duplicates must carry identical prices or the run fails.
- Curated rows are matched by `api_model_id` (not `model_id`, which build-dataset would use as the family identity — aliases such as `mistral-large-latest` would become fake families), else by normalized name ("Ministral 3 (3B)" =
  "Ministral 3 3B"); new cards get `mapping: "derived"`. Fewer than half of the previous models
  still listed → fail closed, previous snapshot untouched.

First run 2026-09-14: all 9 rows reproduced with identical names, orgs and prices; no additions
or removals.

## Update 2026-07-22
First standalone method file (previously the method lived only in the JSON's
`method` field). Refreshed from <https://mistral.ai/pricing/api> — the page is
still server-rendered and plain `curl` works (no anti-bot):

```bash
curl -sL -A "Mozilla/5.0 ... Chrome/126.0 Safari/537.36" \
  "https://mistral.ai/pricing/api" -o /tmp/mistral_api.html
```

Then strip `<script>`/`<style>`/tags and split on tag boundaries; each model
card renders as: model name, license badge (`Open`/`Premier`/`Labs`),
description, capability tags, `Input (/M tokens)` `$X`, `Output (/M tokens)`
`$Y`, and the API model id (e.g. `mistral-medium-latest`).

**Result: no changes.** All 15 tracked chat/text models present with identical
prices vs 2026-07-12. No new priced text models. The only new catalog entry is
**Leanstral** (`labs-leanstral-2603`), a Lean 4 code agent that is **free for a
limited period** — excluded per scope (temporary free Labs endpoint, no price).

## Scope (what goes into mistral.json)
Include all priced chat/text-token models (15 as of 2026-07-22), including
Voxtral Small's text-token axis (audio input $0.004/min noted in `notes`).
Exclude: embeddings (Mistral Embed, Codestral Embed), classifiers
(Mistral Moderation, Classifier API 3B/8B), OCR-only (OCR 4 — priced **per
1000 pages**, $4 OCR / $5 Document AI, not per token), transcription-only
(Voxtral Mini Transcribe 2 / Realtime), TTS (Voxtral TTS), fine-tuning fees,
and temporary free Labs endpoints (Leanstral).

## Currency / region
- The page has a USD/EUR toggle; the default server-rendered prices are
  **native USD** — no EUR conversion is applied to this source.
- Mistral hosts data in the EU (France) by default unless the explicit US API
  endpoint is selected → `region: "eu"` for all rows.

## Gotchas
- <https://mistral.ai/pricing> (without `/api`) is the **consumer plan** page
  (Pro $14.99 etc.), not API pricing — use `/pricing/api`.
- The page lists each flagship model twice (hero tiles + full catalog);
  dedupe by model name.
- Legacy models (Mistral NeMo, Mixtral 8x7B, Mixtral 8x22B) sit at the bottom
  of the catalog list — don't miss them.

## Current snapshot (2026-07-22, unchanged since 2026-07-12)
| Model | In $/1M | Out $/1M |
|---|---|---|
| Mistral Large 3 | 0.50 | 1.50 |
| Mistral Medium 3.5 | 1.50 | 7.50 |
| Magistral Medium | 2.00 | 5.00 |
| Mistral Small 4 | 0.15 | 0.60 |
| Codestral | 0.30 | 0.90 |
| Devstral 2 | 0.40 | 2.00 |
| Voxtral Small (text) | 0.10 | 0.40 |
| Devstral Small 2 | 0.10 | 0.30 |
| Magistral Small | 0.50 | 1.50 |
| Ministral 3 3B | 0.10 | 0.10 |
| Ministral 3 8B | 0.15 | 0.15 |
| Ministral 3 14B | 0.20 | 0.20 |
| Mistral Nemo | 0.15 | 0.15 |
| Mixtral 8x7B | 0.70 | 0.70 |
| Mixtral 8x22B | 2.00 | 6.00 |
