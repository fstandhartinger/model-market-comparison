# JevBench multimodal round 2 — result

Completed 22 September 2026. **Nothing was published.** No X posts were made and the frozen JevBench text board was not changed.

## Part 1 — explainer delivered first

Created and sent `out/jevbench-multimodal-status.mp4`: English, George voice, 105 seconds, 4.9 MB, with a three-line Telegram caption. It covers the exact 110-item starting set, dataset-only gold, the first djev and decider image results, Jev's text-only status, the browser/UI use-case finding, why the track remained private, and the safeguarded synthetic recommendation. The video shows licensed CLEVR-HOPE, Geometry3K, and ScreenSpot examples.

## Part 2 — private round

### Real set

The round began with the requested 110 items and extended computer/browser use by 18 source-labelled rows:

- 80 image-reasoning items: 20 each from CLEVR-HOPE, Geometry3K, ArxivQA, and FinQA.
- 36 ScreenSpot computer-use items: the prior 24 plus 12 new rows, balanced across Windows, macOS, iOS, and Android.
- 12 Multimodal-Mind2Web browser-use items: the prior 6 plus 6 new source-positive-vs-source-negative choices.
- Final real total: **128**.

No “task done?” items were admitted. ScreenSpot and Multimodal-Mind2Web label targets/actions but do not provide an auditable post-action completion screenshot for these rows. Inferring completion would violate the source-labelled-gold rule.

### Results

| System | Image reasoning (80) | Computer/browser use (48) | All real (128) | Synthetic (8) |
|---|---:|---:|---:|---:|
| GPT-5.6 Luna | **62/80 (77.5%)** | 14/48 (29.2%) | **76/128 (59.4%)** | 7/8 (87.5%) |
| Gemini 3.1 Flash-Lite | 52/80 (65.0%) | **21/48 (43.8%)** | 73/128 (57.0%) | 7/8 (87.5%) |
| djev-dev BF16 | 43/80 (53.8%) | 18/48 (37.5%) | 61/128 (47.7%) | 7/8 (87.5%) |
| AlexWortega/openjev 4B v2 BF16 | 50/80 (62.5%) | 10/48 (20.8%) | 60/128 (46.9%) | 7/8 (87.5%) |
| Mapika/decider-2b-vision BF16 | 45/80 (56.3%) | 10/48 (20.8%) | 55/128 (43.0%) | 6/8 (75.0%) |
| kshetrajna12/reflex 4B BF16 | 46/80 (57.5%) | 9/48 (18.8%) | 55/128 (43.0%) | 7/8 (87.5%) |

Starting 30 computer/browser items only: djev 9/30; Gemini 12/30; Luna 7/30; decider 5/30; openjev 6/30; reflex 4/30.

Median latency notes:

- djev: 0.171 s on the starting computer-use 30; 0.191 s on the 18-item extension; prior image p50 0.167 s.
- decider: 0.090 s over all 128 real items.
- openjev: 0.165 s over all 128 real items.
- reflex: 0.140 s over all 128 real items.
- Gemini: 1.20 s over the starting 110 and 1.26 s on the extension.
- Luna: 6.13 s over the starting 110 and 6.25 s on the extension. This is end-to-end Codex subscription orchestration latency, not directly comparable to local inference.

Jev itself takes no images and was excluded rather than scored zero.

### Synthetic family

Generated 10 paired positive/negative operational images with `Tongyi-MAI/Z-Image-Turbo` through the free Chutes API: damaged parcel, empty shelf slot, walking-path safety hazard, UI error state, and acceptable product photo.

- Gold was fixed in each generation spec before checking.
- Gemini 3.1 Flash-Lite independently checked the rendered pixels.
- On disagreement, Chutes Qwen3.5-397B-A17B served as the second checker.
- Eight images were accepted. The negative empty-shelf and negative safety-hazard images were dropped because the primary checker contradicted the spec and the second checker did not resolve the disagreement.
- Every accepted item has `synthetic: true`, generation model, seed, spec ID, checker result, and synthetic gold origin.
- Synthetic share is **8/136 = 5.9%**, below the one-third cap.
- Results are reported separately because generated imagery can favour systems exposed to similar generators. The 8-item family is illustrative, not rank-worthy.

### Compute and spend

The prior djev pod was gone, so one Lium H200 was rented with a four-hour TTL and USD 12 automatic cap. It ran djev, decider, openjev 4B v2, and reflex serially. The pod was explicitly removed after 25 minutes at an estimated **USD 1.23**. A final authenticated listing confirmed that exact pod was absent. Other listed GPUs belonged to separate jobs and were not touched. Total task spend remained well below the USD 25 cap.

### Private deliverables

- `PREVIEW.html` — self-contained private preview with embedded licensed real and accepted synthetic examples.
- `ONE-PAGER.md` — decision summary.
- `items-extended-real.json` — 128 real source-labelled items.
- `items-extension.json` — the 18 new computer/browser items.
- `synthetic-specs.json`, `synthetic-validation.json`, `items-synthetic.json` — generation provenance, checks, drops, and the 8 accepted rows.
- `results-*.json` / `results-*.log` — baseline and open-system outcomes.
- `out/jevbench-multimodal-status.mp4` — delivered explainer.

## Recommendation

If Florian approves publication, use a **separate, clearly labelled multimodal preview board**. Never fold it into JevBench v1.2; keep real and synthetic columns separate; disclose that the public real items are contamination-prone; and expand computer-use before presenting a definitive ranking.

## Delivery

- Explainer video sent first through the Telegram bot API with a three-line caption.
- `PREVIEW.html`: Telegram message 14198.
- `ONE-PAGER.md`: Telegram message 14199.
- Publication decision requested through `notify now --requested`. No reply watcher was started; the message directs Florian to Hermes.
