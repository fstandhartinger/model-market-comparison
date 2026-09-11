# Explainer-video brief — "Benchmark Heaven"

Prepared by the phase-09 owner on Sandy for the local Claude session on Florian's
machine (the session that owns the `explainer-video` skill and ElevenLabs narration).
This brief contains the story, the source-backed numbers, and the screenshot moments.
The narrated video was produced from it directly on Sandy (the `explainer-video` skill
and ElevenLabs credentials are present there); the delivery receipt is at the bottom of
this file.

## The one-sentence story

Model Market Comparison became **Benchmark Heaven**: the same live model/price database,
now with token- and cache-efficiency adjusted "effective costs" as the default, and the
most complete versioned AI benchmark collection we could source — published daily at
**https://benchmarkheaven.com**.

## What changed (before → after)

| | Before (Model Market Comparison) | After (Benchmark Heaven) |
|---|---|---|
| Name / home | model-market-comparison.app.mintapis.com | **benchmarkheaven.com** (+ www + old host as compatibility) |
| Default price shown | raw list price | **effective cost**, adjusted per §2 (I/O ratio, tokens-per-task, cache) |
| Benchmark data | a few reliable sources baked in | **73-entry versioned registry**, 13,908 observations, explicit provenance |
| Benchmark views | model list | per-model score list, model-vs-model, inverse per-benchmark view, **radar**, anomalies |
| Freshness | ad-hoc updates | **daily 05:17 UTC** cron, staged job on cheap AA ≥ 34 workers with a critic round (W17) |
| Data size | 835 models / 2,784 offers | **839 models / 654 families / 90 providers / 2,801 offers** |

Compatibility promise that must be said out loud: **no data location moved.** Same repo,
same JSON schema, same IDs and units, same API paths; the old hostname still serves the
same endpoints. Only the hostname, default view and added data/features changed.

## Source-backed numbers worth showing

All figures are from the committed `data/dataset.json` / published API and the phase-08
installed run receipts in `ops/rebuild-2026-09/evidence/`.

- Live catalog: **839 models, 654 families, 90 providers, 2,801 offers** (`/api/meta`).
- Benchmark collection: **13,908 observations** — 12,622 measured, 767 derived,
  519 self-reported (each marked as such, with a source URL).
- Registry: **73 verified benchmarks**, every one with a one-sentence English
  description, category, primary URL, collection recipe and pinned version.
- AA token efficiency: **141 models** with measured output-tokens-per-task
  (Artificial Analysis Intelligence Index payloads).
- Cache efficiency by **model × provider**: 1,288 endpoint pairs, 939 with a cache-read
  price, 274 with a cache-write price; unknown hit rates stay explicitly unknown.
- Realistic I/O ratio: OpenRouter empirical data for **51 models**; where absent, the
  Chutes global derived fallback (input:output ≈ **21.03**) is used and labelled as a
  fallback, never presented as an observed workload.
- Daily automation: installed run started `2026-09-11T06:32:03.542Z`, finished
  `2026-09-11T06:50:09.612Z`, 36/36 steps, exit 0, published snapshot `a41df419`,
  reported model charges **$0.167** (`evidence/phase-08/normal-run/run-report.json`).
  Workers are chosen by the AA ≥ 34 picker rule (enforced at pick time, see
  `worker-policy.mjs`), not AA-scored again in the run receipt.
- Versions never mixed: Coding Agent **v1.4** stays frozen for the unchanged Composite;
  v1.5 is collected and shown separately. Terminal-Bench 4.0 ≠ 3.0.

## 5–10 screenshot-worthy moments

1. **Hero / home** — the "Benchmark Heaven" wordmark on the new domain, with adjusted
   effective cost visible by default and the raw-price toggle right there.
2. **Effective-cost explainer** on a row — hover/expand to show the assumptions
   (ratio, tokens-per-task, cache read/write) with their source and date.
3. **The min-score question answered on one screen** — set a minimum benchmark score and
   see the cheapest model at that bar, adjusted.
4. **Radar chart on `/compare`** — four models overlaid across collected benchmark axes,
   with each axis labelled by benchmark version.
5. **`/radar` tab** — the same comparison as a first-class destination.
6. **Per-model full score list** (`/models/<id>`) — every score with version, source,
   date and a self-reported flag, sparse gaps shown as gaps (no zeros).
7. **Inverse benchmark view** (`/benchmarks`) — pick a benchmark, list the models that
   report it, with its collection recipe and "where results appear".
8. **Anomaly highlighting** — a model that is unusually strong/weak, or an outlier
   against its own profile, called out with the method behind it.
9. **Old host still alive** — `model-market-comparison.app.mintapis.com` serving the same
   data, proving the downstream-compatibility promise.
10. **Daily governance** — the cron receipt (`STATUS: ok … Live-Pruefung: OK`) and the
    AA ≥ 34 worker/critic rule, i.e. the data updates itself cheaply and critically.

## Narration beats (~60 s)

1. "We rebuilt our model comparison into **Benchmark Heaven**."
2. "It no longer shows you sticker price — by default it shows the **effective** price
   for real agentic coding: real input/output ratios, tokens needed per task, and cache."
3. "It now knows **73 benchmarks** and **13,908 scores**, each with its source, date and
   version — measured, self-reported or derived, never silently mixed."
4. "Radar charts, per-model score lists, inverse benchmark views and anomaly flags."
5. "Everything updates itself **daily** on free or cheap models, with a critic checking
   the numbers."
6. "Same data, same API, new home: **benchmarkheaven.com**."

## What the video must not claim

- That the benchmark universe is complete — it is 73 curated entries with a documented
  exclusion ledger, not "all of AI Twitter".
- Any live measured-vs-self-reported divergence — none were found, so none are shown.
- That the video is delivered until Florian actually receives it.

## Delivery / status

- Brief written and committed: 2026-09-11 (this file).
- **Video produced on Sandy by the phase-09 owner** with the `explainer-video` skill and
  ElevenLabs (`eleven_multilingual_v2`, voice George): 6 German narration beats, ~49 s,
  claiming nothing outside the "must not claim" list above.
- Artifact retained at `evidence/phase-09/benchmarkheaven-de.mp4` — 1920×1080, 30 fps,
  H.264 + AAC, 49.10 s, 2.93 MB, sha256
  `aa0392908f6b9d6cc368bf39104ab6820fa7cc4bd2a3dd13c9b17ece604c21aa`.
- **Delivered to Florian 2026-09-11 ~23:38 UTC** via `@cursor_noti_bot` `sendVideo`
  (returned `ok`; the API response with the video message id was not retained by the build
  script). The German completion summary followed as Telegram `message_id 13546`.
- **COVERAGE W27 is complete.**
