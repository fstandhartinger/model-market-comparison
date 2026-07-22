# IONOS AI Model Hub — collection method

Collected: 2026-07-22 (previous snapshot: 2026-07-12; this file was first created 2026-07-22 — earlier runs documented the method only inside `ionos.json`'s `method` field)

## Sources (in order of authority)

1. **USD price table**: <https://cloud.ionos.com/prices> — IONOS' official localized USD prices. These populate `input_per_1m_usd` / `output_per_1m_usd` directly; **no local EUR→USD FX conversion is applied** for this source.
2. **EUR price tables**: <https://cloud.ionos.de/preise> and <https://cloud.ionos.de/managed/ai-model-hub> — original EUR prices, recorded in each model's `notes` field as `€in/€out`.
3. **Docs catalog** (model existence / lifecycle): <https://docs.ionos.com/cloud/ai/ai-model-hub> — nav JSON embedded in the page lists all current model doc pages under `/models/llms/...`.

## Technique

Plain `curl -sL` with a desktop Chrome UA works for all three pages (no anti-bot as of 2026-07-22). The pages are React/Tailwind; easiest extraction is to strip `<script>`/`<style>`, replace tags with `|`, collapse whitespace, then regex around model names (e.g. `gpt-oss`, `Llama 3`, `Mistral`, `Qwen`) to read the `Model | $in | $out` triples. The docs page keeps its model list inside an escaped JSON nav payload — grep the raw HTML for model names there instead of the stripped text.

## Scope

Only the **text/code (LLM + Code Models)** sections are captured. Embedding/reranker (bge-*, paraphrase-*, Qwen3-VL Embedding/Reranker) and image/vision-OCR models are intentionally excluded.

## Gotchas (2026-07-22)

- The **US and DE price pages can be at different vintages**: on 2026-07-22 the USD page already listed Qwen3.5-9B but had dropped Llama 3.1 405B, while the DE pages still listed 405B (€1.75/€1.75) and did not yet list Qwen3.5-9B. The docs catalog listed **both** as current models. Resolution: keep 405B with the prior USD price (EUR unchanged), flag in notes; include Qwen3.5-9B with USD prices only and note the missing EUR.
- USD↔EUR pairs follow IONOS' own rounding (€0.15→$0.17, €0.65→$0.71, €0.10→$0.11, €0.30→$0.33, €0.80→$0.89, €0.60→$0.67, €3.60→$4.00) — do not recompute with a market FX rate.
- `Mistral Small 24B Instruct` is kept under the historical snapshot name `Mistral Small 3.2`.
- Model names on the price pages ("Llama 3.3 70B Instruct") differ from snapshot `model_name`s ("Llama 3.3 70B") — preserve the snapshot naming for diff stability.
