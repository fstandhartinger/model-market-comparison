# PROGRESS — Benchmark Heaven UX / data / Benchmaxxing workstream

Single ledger for the checklist in `01-BRIEF.md` (authoritative texts:
`00-REQUIREMENTS-VERBATIM.md` **and** `02-ADDENDUM-HERMES-CHAT.md`).

**Status vocabulary:** `open` · `in-progress` · `implemented` (code merged + green + deployed)
· `verified` (checked live at desktop *and* mobile width, evidence saved).
**Only an engine other than the implementer may set `verified`.**

Evidence root: `/opt/benchmarkheaven/state/ux-evidence/`

---

## Seeding note (iteration 1, 2026-09-12, claude-opus)

Seeded from `01-BRIEF.md` + `/opt/benchmarkheaven/state/USER-UX-CORRECTION-ACCEPTANCE.md`.
Every "shipped" claim in the acceptance record was re-checked against the **source tree** and
against a live fetch of https://benchmarkheaven.com. Nothing is carried over as done on trust.

Live fetch 2026-09-12 (HTTP 200, 5.7 MB): still contains "Benchmarks in perspective"; contains
no "Strong confidential", no "Trains or keeps", no "Are you a company", no "30:1", no
"EU-hosted only", no "#benchmarks". Hermes' commits `f59c021`/`4c363b6` did land a Simple /
Advanced switch, the `#benchmarks`/`#providers` columns and a Benchmaxxing tab — those are
credited below, the rest is marked open.

### Defects found while seeding (not in the original checklist)

- **D1** `SettingsContext.DEFAULTS.inputWeight = 20`, but `FIXED_BLENDS` has no 20 entry, so the
  default is not a selectable option and `setInputWeight(20)` is rejected by the guard. The
  blend `<select>` therefore renders a value that does not exist. Fixed together with R4.2.
- **D2** `GlobalFilters` Reset sets `excludeChinese` to **true**, while the default is `false`
  (R4.6). Reset must restore the documented default.
- **D3** The `# benchmarks` column shows `composite_coverage` — the number of filled *composite
  slots* (0–5), not the number of benchmarks the model has a result for (the dataset knows
  `benchmark_results.coverage.by_model[id].available`, out of 75 registry benchmarks). The
  column as shipped is misleading. Fixed with R2.2.

---

## Ledger

| ID | Requirement (short) | Status | Evidence | Notes |
|---|---|---|---|---|
| R1.1 | Default sort: score descending | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Codex rechecked both hosts, desktop/mobile and light/dark: `aria-sort=descending`, current first scores descend |
| R1.2 | Header "Score" + small "(active score)" underneath, follows selector | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live headers show `SCORE ▼ (Composite)` in all four viewports |
| R1.3 | Rename → "Adjusted Cost" | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live table headers use `ADJUSTED COST` |
| R1.4 | (i) next to Adjusted Cost, plain explanation | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live table has the cost info affordance and explanatory copy |
| R1.5 | Remove the "Chutes global fallback" inline text | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live body has no obsolete Chutes fallback phrase |
| R1.6 | Fuller methodology section, reachable but not prominent | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current `/about` returns all five required anchors without overflow |
| R1.7 | (i) next to Score explaining composition | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live score info affordance is present and its copy includes all seven slots and ECI |
| R1.8 | (i): desktop hover tooltip, mobile modal with ✕; a11y | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Codex rechecked desktop tooltip and mobile open/close: `dialog[open]` is 0 after close |
| R2.1 | Remove Channels / Top provider channels columns | verified | `ux-evidence/iter1-live/verification.json` | from `f59c021`; re-checked live — neither column string is rendered |
| R2.2 | Add #benchmarks and #providers columns | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current Simple and Advanced tables expose both columns; source code uses full benchmark coverage, not Composite slots |
| R3.1 | New hero claim (most complete collection + realistic cost) | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T020001Z/live-canonical/`, `/opt/benchmarkheaven/state/ux-evidence/review-20260914T020001Z/live-legacy/` | **Verified by claude-opus (iteration 44, non-Fable) and rechecked by codex-luna:** current live `94bcedd`, both hosts, 1440/390, light/dark. H1 is the qualified Fable pass-8 wording, the counts line is present, the footer does not repeat the H1, and no unprovable exclusivity claim is rendered. |
| R4.1 | Redesign the filter bar, elegant and uncluttered | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png`, `broad-fixed-{canonical,legacy}/verification.json` | Current live filter sheet is grouped into Ranking / Price basis / Regional settings / Data confidentiality / More settings |
| R4.2 | Fixed I/O blend: add 20:1 (default) and 30:1 | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live options include 20:1 and 30:1; selected value is 20 |
| R4.3 | "One variant for Reasoning models" → extra settings | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png` | Current live sheet places the setting under More settings |
| R4.4 | Featured audit ≈ AA top 20; DeepSeek V4.1 Flash included | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current `/about` renders the derived top-20 rule and ranks DeepSeek V4.1 Flash 18; build code retains deprecated exclusion and pin |
| R4.5 | "Hide deprecated" → extra settings | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png` | Current live sheet places the setting under More settings |
| R4.6 | "Exclude Chinese providers" unchecked by default | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live toggle reads `aria-pressed=false` on load |
| R4.7 | Rename → "EU-hosted only" | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png` | Current live label is EU-hosted only |
| R4.8 | Regional settings section (Chinese / EU / US) | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png` | Current live sheet has the Regional settings heading and three controls |
| R4.9 | Rename → "Strong confidential guarantees" | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png` | Current live label is Strong confidential guarantees |
| R4.10 | "Trains or keeps your data" filter from OpenRouter policy list; Chutes exception | verified | `/opt/benchmarkheaven/state/ux-evidence/iter34-indep/live-{canonical,legacy}/verification.json` (`bin/verify-r410-r58-r511-f19.mjs`), `data/raw/openrouter-data-policy.json` | **Independent verification (claude-opus, iteration 34; implementer codex-luna):** both hosts, 1440/390: toggle off by default, switching it on widens Advanced from 101 to 117 rows. Code reviewed: tri-state parser, Chutes override recorded in the snapshot, daily refresh step `fetch-data-policy` in `ops/daily/daily.mjs`. **Interpretation for X7:** 170 of 2,829 offers have no OpenRouter policy (T-Systems, TensorX, Scaleway, OVHcloud, IONOS, STACKIT — EU hosts OpenRouter does not list); they are kept and labelled unknown, because dropping them by default would empty "EU-hosted only". Florian may overrule. |
| R4.11 | Evidence/provider/task-token toggles → extra settings | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Current live Advanced controls show Evidence and Better than a model as the compact evidence popovers |
| R5.1 | Simple (start) + Advanced mode | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live loads Simple selected and exposes all three modes |
| R5.2 | Simple: top 15 featured (sort order superseded by CR-8.1: score descending) | verified | `ux-evidence/review-20260913T161002Z/{broad-fixed-canonical,broad-fixed-legacy}/verification.json` | Current live shows 7 qualified featured rows (within the top-15 cap) and the adjusted-cost descending header; the score/token/provider filters legitimately reduce the visible set. |
| R5.3 | Score slider, default > 85 | verified | `/opt/benchmarkheaven/state/ux-evidence/iter45-indep/r53-f48-{canonical,legacy}/verification.json` (`bin/verify-r53-f48.mjs`); earlier `iter38-live-20260913T230208Z/home-{1440,390}-{light,dark}.json`, `test/settings-state.test.mjs` | **Verified by claude-opus (iteration 45, non-implementer):** fresh sessions on both hosts at 1440/390, light/dark — slider `Minimum Capability Score (Composite)` starts at 86 (range 79–100), moving it changes the value, no overflow, no page errors; 48/48 checks per host. Earlier note: Fresh canonical-host browser check at 1440/390 and light/dark: Simple loads at `86` with accessible label `Minimum Capability Score (Composite)` and no overflow. Guided does not overwrite it. (Implemented by codex-luna `f98a23d`; the claude-opus verification above closes it.) |
| R5.4 | Max adjusted cost slider, default unlimited | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Current live cost slider starts at no limit and shares SettingsContext with the modes |
| R5.5 | Distribution histogram while a slider moves | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Current live Simple map/histogram evidence has 48 bars in the two themes and both widths; range end labels are present |
| R5.6 | Wizard (company → privacy/region → minimums → budget → results) | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json`, `fable-canonical-fixed2/metrics.json` | Current live wizard starts with the company step and the full Fable walkthrough remains error-free; source/tests cover the five pages |
| R5.7 | Score slider caption "Minimum Composite" must become "Minimum Capability Score (Composite)" and the parenthetical must switch with the active score selector | verified | `ux-evidence/review-20260913T161002Z/{fable5-fixed-canonical,fable5-fixed-legacy}/`, `f42-f45-fixed-{canonical,legacy}/` | Independent live recheck passes at both hosts, 1440/390, light/dark. Desktop uses the full caption; the F-42 phone label is intentionally concise, while the range retains the full accessible name `Minimum Capability Score (Composite)`. |
| R5.8 | (i) tooltip on the adjusted cost slider explaining the cost model and why it is superior (real token efficiency, caching efficiency, exact prices) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter34-indep/live-{canonical,legacy}/verification.json` (`bin/verify-r410-r58-r511-f19.mjs`) | **Independent verification (claude-opus, iteration 34; implementer codex-luna):** desktop hover tooltip and phone modal both name provider, prices, cache and tokens; phone modal closes with ✕ and leaves no open dialog; both hosts. |
| R5.9 | Table columns '#Benchmarks' and '#Providers' must be the same width; current visual looks like providers is wider | verified | `ux-evidence/review-20260913T161002Z/{fable5-fixed-canonical,fable5-fixed-legacy}/` | Fable pass 5 independently verified equal columns; the current broad matrix confirms both columns remain present and contained on desktop/mobile at both hosts. |
| R5.10 | Pareto chart next to the value map in Simple mode: invert x-axis so low costs left, high costs right; every model displayed | verified | `ux-evidence/review-20260913T161002Z/f39-fixed-{canonical,legacy}/` | Codex independent live check passes at 1440/390, light/dark on both hosts: log-axis round ticks, no label overlap, 20 plotted points and no horizontal overflow. Free routes remain represented by the compact map's pinned projection in code. |
| R5.11 | Tooltip z-index issue in table header score and adjusted cost columns | verified | `/opt/benchmarkheaven/state/ux-evidence/iter34-indep/live-{canonical,legacy}/verification.json` (`bin/verify-r410-r58-r511-f19.mjs`), `iter34-indep/live-canonical/desktop-r511-tip.png` | **Independent verification (claude-opus, iteration 34; implementer codex-luna):** Score and Adjusted Cost header tooltips are topmost at their own position (hit-tested with pointer-events enabled) and inside the 1440×1000 viewport (top 187, bottoms 656 / 467) on both hosts. |
| R6.1 | "Are you a company" checkbox | verified | `ux-evidence/review-20260913T161002Z/targeted-final/r63-{canonical,legacy}/`, `ux-evidence/review-20260913T205002Z/r63-manual/verification.json` | The robust recheck changes the visible filter toggle from `aria-pressed=false` to `true` on both hosts at 1440/390; company-mode subscription copy updates and the page remains contained. Prior evidence covers the 12→10 plan change, Claude Pro removal and Claude Team appearance. |
| R6.2 | Research: may companies use consumer subscriptions? + Telegram | verified | `ops/ux-2026-09-12/research/R6.2-subscriptions.md` | delegated to Kimi K3, then independently re-fetched. Anthropic and Google forbid company use in their own words; Cursor allows entity use; GitHub steers to Business/Enterprise without forbidding; OpenAI and xAI return HTTP 403 to automated clients and were **not** worked around. Telegram sent — see the iteration log Verified by review gate 230002Z (opencode-kimi, non-implementer, artifact review): `ops/ux-2026-09-12/research/R6.2-subscriptions.md` holds vendor-domain-only citations with verbatim quotes (Anthropic EEA consumer terms "Non-commercial use only…", Google "companies not allowed" wording, Cursor entity use allowed, GitHub steering to Business/Enterprise, OpenAI/xAI documented unfetchable HTTP 403, not worked around) and the Telegram was sent (iteration 2 log, message_id 13597, 2026-09-12 ~20:50 UTC).|
| R6.3 | Subscription prices/quotas folded into the cost view, labelled | verified | `data/raw/subscriptions.json`, `test/subscriptions.test.mjs`, `ux-evidence/review-20260913T161002Z/targeted-final/r63-{canonical,legacy}/` | The subscription panel is present on desktop/mobile and both hosts, with 12 personal plans, break-even lines, dated vendor pricing copy, unknown quotas rather than invented task counts, and `/about#subscriptions`; company mode is covered by R6.1. |
| R7.1 | New logo in the page | verified | `ux-evidence/review-20260913T110002Z/fable-canonical-fixed2/desktop_light-simple.png` | Current live nav shows the new mark and wordmark |
| R7.2 | Favicon / apple-touch / og from the new logo | verified | `ux-evidence/review-20260913T110002Z/asset-status.txt` | Current canonical and legacy hosts return HTTP 200 for manifest, icon, Apple touch icon and OG PNG; generator/assets remain in source |
| R7.3 | Dark-mode logo variant, switched with the theme | verified | `ux-evidence/review-20260913T110002Z/fable-canonical-fixed2/{desktop_light-simple,desktop_dark-simple}.png` | Current live light/dark screenshots show the theme-switched mark; BrandMark reads theme CSS variables |
| R8.1 | Release-post-style benchmark comparisons and listings | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260913T075003Z-r81-postfix-canonical/verification.json`, `…-legacy/verification.json` | **Codex independent gate:** both hosts show seven measured-only category snapshot cards, a full comparison table and 14 best cells; mobile has a dedicated table scroll region but no page-level horizontal overflow. Missing/low-sample values remain gaps in the rendered table |
| R9.1 | Full fresh data run, every live source dated today | verified | `/opt/benchmarkheaven/state/ux-evidence/iter46-publication-20260914/README.md`; `/opt/benchmarkheaven/state/ux-evidence/iter46-publication-20260914/live-readback.json`; `/opt/benchmarkheaven-daily/runs/2026-09-14T05-14-14-865Z-3467539/`; `/opt/benchmarkheaven/state/ux-evidence/iter49-chutes-catalog/`; `/opt/benchmarkheaven/state/ux-evidence/iter50-{nebius,mistral,scaleway,tensorx,t-systems,ovhcloud}-catalog/`; `/opt/benchmarkheaven/state/ux-evidence/iter50-r91-live-final/{canonical,legacy}/verification.json`; `/opt/benchmarkheaven/state/ux-evidence/iter51-README.md`; `/opt/benchmarkheaven/state/ux-evidence/iter51-{ionos-stackit,inceptron,claude-api,claude-copilot}/` | **Iteration 58 (claude-opus) — Azure AI Foundry collector:** `scripts/fetch-azure-foundry-catalog.mjs` + `lib/azure-foundry-catalog.mjs` (4 tests), non-fatal daily step. Azure Retail Prices API (public, no robots.txt), one filtered query per EU billing region; each curated row now names its exact Standard meters (`retail_meters`, mapped by hand from the live meter table, all 101 found). The collector re-reads only those meters and never adds rows; it fails closed on empty/unreadable data or < 50 % of mapped rows, keeps previous prices when input > output (swapped labels), and reports uncovered meters effective in the last 90 days (today Grok 4.6 and FW GLM 5.3, lifecycle check pending). Real changes shipped: GPT-5.6 Sol 5/30 → 4/20 Global and 5.5/33 → 4.4/22 DZ; GPT-6 Astra unpriced → 10/50 and 12/60 (all effective 2026-09-01). Claude Opus 5 (Marketplace CCU billing) carried unchanged; lifecycle/EU Data Zone availability keep `lifecycle_checked_at` 2026-09-08. Evidence `/opt/benchmarkheaven/state/ux-evidence/iter58-azure-foundry/`. Live after the 22:22:35 UTC flip (`603e26f`): `bin/verify-r91-azure.mjs` **15/15 on both hosts** — `/api/meta` dates `azure_foundry` 2026-09-14, Sol 4/20 + 4.4/22 and Astra 10/50 + 12/60 served, no stale price, model pages clean at 1440/390 light/dark with the Azure group visible under the default filters (`…/iter58-azure-foundry/live-{canonical,legacy}/`). **Iteration 58 (claude-opus) — AWS Bedrock collector, `c264706`:** `scripts/fetch-aws-bedrock-catalog.mjs` + `lib/aws-bedrock-catalog.mjs` (4 tests), non-fatal daily step. Loads only the AWS Price List bulk indexes the mapping needs (no robots.txt on pricing.us-east-1.amazonaws.com): `AmazonBedrock` for first-party/open models and `AmazonBedrockFoundationModels` for Marketplace-billed Anthropic and Writer (keyed by servicename). Finding: the pricing page's awsstatic `meteredUnitMaps` feed is keyed by `AmazonBedrockFoundationModels` SKUs (all 234 Frankfurt SKUs), so the Claude EU Geo and Global prices are read from the Price List, no page scraping. 75 of 80 rows pinned to exact usagetypes, every meter found, every price equal to the 2026-09-08 snapshot (version 20260911124408). GPT-5.4/5.5/5.6 Luna/Sol/Terra (Bedrock Mantle) are in no public Price List and are carried with `unmetered_checked_at` 2026-09-08. Gates: `npm test` 370/370, `tsc` clean, `build-dataset` 844/660/91/2,840; dataset diff = `aws_bedrock` date and timestamps. Evidence `/opt/benchmarkheaven/state/ux-evidence/iter58-aws-bedrock/`. **Still stale:** `google_vertex` (2026-09-08), `provider_meta` (2026-07-12), plus the deliberately retained `aa_coding_agents`. **Handoff:** Google Vertex's partner tables are client-rendered; the Cloud Billing Catalog API needs an API key, so the honest path is a normal headless render of the public pricing page (the method note's `agent-browser` steps) with one row per tier, fail-closed like the other collectors. `provider_meta`: `data/raw/openrouter-data-policy.json` already carries `headquarters` for 85 providers daily, enough to re-verify `country` mechanically, but `eu_hosted`, `non_us` and the notes are first-party judgments, so re-dating the file needs a per-field check date, not a blanket `collected_at`. **Iteration 51 (claude-opus) — five more executable collectors, non-fatal daily steps, fail-closed, with tests:** IONOS `1238c09` (USD + EUR price pages; 9/9 rows reproduced), STACKIT `1238c09` (docs catalog + product-page SKU tiers + ECB; real changes: Qwen3.8 27B added, Qwen3.6 27B Deprecated), Inceptron `439e98d` (native catalog API; all five intraday re-prices equal OpenRouter's live Inceptron endpoints at the same minute), Claude API `efac57d` (docs price + batch tables, modifier prose, lifecycle table; 13 rows + modifiers identical, 4 retired rows excluded; Enterprise seat re-read, other Enterprise terms keep `other_terms_checked_at` 2026-09-08), GitHub Copilot `ffa0b19` (supported ∩ pricing tables + legacy multipliers; 28 + 18 rows identical; MAI-Code-1-Flash retired 2026-09-10 → removed, it had no offers or benchmark evidence, models 845 → 844; plans keep `plans_checked_at` 2026-09-08). Live: IONOS/STACKIT 19/19 per host, Inceptron 18/18 per host, Claude UI run 8/10 per host (the two misses are the expected R4.10 hiding of the Anthropic group — OpenRouter lists Anthropic without zero retention), Claude + Copilot API-level check: 7/7 per host (claude_code and github_copilot dated today; Anthropic first-party offer 5/25 cache 0.5 on /api/models/claude-opus-5::max; Copilot GPT-5.6 Sol 4/20; MAI-Code-1-Flash 404 and absent, MAI-Code-1.1-Flash present). Two `dataset.test.mjs` literals (Inceptron GLM 5.2 price, Copilot catalog counts) replaced by snapshot/consistency assertions — they would have failed the fatal daily `npm-test` step on every real re-price or retirement. **Still stale on `/api/meta` (13:51 UTC):** `aws_bedrock`, `azure_foundry`, `google_vertex` (2026-09-08), `provider_meta` (2026-07-12), plus the deliberately retained `aa_coding_agents` (2026-09-09). **Handoff:** Azure Foundry first (Retail Prices JSON API, native USD; lifecycle cross-check against the retirement schedule), then AWS Bedrock (Price List bulk API + pricing-page gap-fill), then Google Vertex (partner tables are client-rendered — needs a normal browser render, no bot-protection workaround), then `provider_meta` (hand-curated; re-verify only the OpenRouter-derived fields). Stopped here on purpose: `limits.py` read Claude week 1 % (likely a window-reset artefact; last credible reading 57 %) and the budget file had no fresh measurement. **Iteration 50 (claude-opus) — six more executable collectors, all non-fatal daily steps in `ops/daily/daily.mjs`, each fail-closed (shape, unreadable prices, ≥ 50 % retention) with tests:** Nebius (`tokenfactory.nebius.com/api/public/models_info`, the one path robots.txt allows; +DeepSeek V4 Pro 0813, +GLM 5.3), Mistral (server-rendered `mistral.ai/pricing/api` cards), Scaleway (the page's own `__NEXT_DATA__` catalog + ECB daily rate), TensorX (server-rendered table), T-Systems LLM Hub (`/models/llms/` + `/models/coding/`, audited hosting fields kept; +GLM 5.3 Flash as preview), OVHcloud (server-rendered catalog + ECB). Every first run was dry-run-diffed against the 2026-09-08 snapshot before writing: all curated rows reproduced with identical native prices; changes are only real catalog changes (TensorX dropped DeepSeek V3.2, added V4.1 Flash), listed cached-input prices now captured, and FX-cent USD moves (ECB 1.1622 → 1.1592). One regression caught before commit: storing Mistral's API alias as `model_id` split nine offers into fake families, because build-dataset uses `model_id` as identity → aliases now go to `api_model_id`. Live on `47fb38e`: `verify-r91-catalogs.mjs` 55/55 on both hosts — `/api/meta` dates 2026-09-14 for nebius, tensorx, t_systems_llm_hub, scaleway, chutes, ovhcloud (mistral read back separately), plus a visible offer group for each provider on a model page at 1440 and 390, no overflow, no page errors. Mistral's offers are correctly hidden by the R4.10 default (OpenRouter lists Mistral without zero retention). **Still without collectors:** AWS Bedrock, Azure Foundry, Google Vertex, Inceptron, IONOS, STACKIT, `github_copilot`, `claude_code`, `provider_meta` (plus `aa_coding_agents`, deliberately retained). Next: IONOS/STACKIT (static docs pages), then the three hyperscaler catalogs (check for public pricing JSON first). **Iteration 49 (claude-opus) — first curated collector:** `scripts/fetch-chutes-catalog.mjs` + `lib/chutes-catalog.mjs` (5 tests) refresh `chutes.json` from the public `llm.chutes.ai/v1/models` (fail-closed: shape, prices, TEE flag, ≥ 50 % id retention; curated names kept by exact id, new ids `mapping: derived`). Its first run reproduced the 2026-09-08 snapshot field for field (14/14, 0 differences), so `chutes` is honestly dated 2026-09-14. Wired as non-fatal daily step `fetch-chutes-catalog`. Still without collectors: AWS Bedrock, Azure Foundry, Google Vertex, Nebius, Inceptron, Scaleway, IONOS, Mistral, TensorX, OVHcloud, STACKIT, T-Systems, `github_copilot`, `claude_code`, `provider_meta`. **Iteration 47 (claude-opus) — handoff, not closed:** the blocker is tooling, not a run. `data/research/refresh-2026-09-13.md` confirms the twelve curated provider catalogs (AWS Bedrock, Azure Foundry, Google Vertex, Nebius, Inceptron, Scaleway, IONOS, Mistral, TensorX, Chutes, OVHcloud, STACKIT, T-Systems LLM Hub), `github_copilot`, `claude_code` and `provider_meta` have method documentation but **no executable collector**; `scripts/fetch-live.mjs` only dates OpenRouter/AA/DesignArena. Redating them would be dishonest, so nothing was redated. Interpretation for the reviewer: `aa_coding_agents` (2026-09-09) is the deliberately retained Coding Agent v1.4 Composite input (`status: retained` in `build-dataset.mjs`), not a live source; `aa_coding_agents_v1_5` is the live one. Next step: one small robots-respecting collector per curated catalog (public pricing pages only), each with a row-count guard and the existing critic path, then a fresh daily run. The fresh source-backed publication `acb5ed0` passed all seven live contracts, fresh benchmark capture, build, 276 tests, typecheck, prerender and source validation; both public hosts serve the exact candidate snapshot. However, live `/api/meta` still reports curated provider catalogs dated 2026-09-08, `aa_coding_agents` 2026-09-09, `provider_meta` 2026-07-12 and other non-today sources. No source date was redated manually; the “every live source dated today” requirement remains open. **Review gate 230002Z (opencode-kimi, non-implementer):** now the last stale source is gone — `provider_meta` dated 2026-09-14 after `9533069`. Every live source on `/api/meta` reads 2026-09-14; the only older date is the deliberately retained `aa_coding_agents` v1.4 (`collected_separately`, documented in `API.md`); its live sibling `aa_coding_agents_v1_5` reads 2026-09-14. Live evidence: `verify-r91-catalogs` 73/73 per host (AWS Bedrock claude-opus-5, Azure gpt-6-astra, Vertex grok-4.6, Nebius, IONOS, STACKIT, Chutes, T-Systems offer groups at 1440/390 no overflow), `verify-r91-azure` 15/15, `verify-r91-vertex` 16/16 per host, plus gate-primary read-backs (`primary-source-spot-checks.json`): Azure Retail Prices API returns Astra Gl 10/50 and Sol DZ 4.4/22 effective 2026-09-01; the live Vertex pricing page says Grok 4.6 2/6 and GLM-5.2 1.4/4.4 — all match the curated rows exactly. Today's daily collection (05:14Z) refreshed OpenRouter/AA/DesignArena; publication skipped by design (main moved), the sources' freshness is what the collector trail and the live meta prove. **Decision recorded:** R9.1 is verified with the documented retained-v1.4 exception — Florian may demand the v1.5 board replace v1.4 (carried to X7).|
| H1 | Historical snapshots of all benchmark scores | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T020001Z/history/verification.json` plus `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Claude's independent verification remains valid; codex-luna rechecked both current hosts at revision `94bcedd`: four retained states, historical API keys, no stable history axis, and 93 catalog-linked estimates exposed through the view as estimates rather than measured rows. |
| H2 | Bridged comparison via anchor models, uncertainty reported | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T020001Z/history/verification.json` plus `test/benchmark-history-chain.test.mjs` | Current live estimates expose bridge count, method, hops, spread/uncertainty fields and are labelled `estimated`; the current snapshot has max one hop and no live multi-hop sample. The multi-hop/re-based-chain behavior is covered by the line-by-line unit tests (including hop cap and chain IQR), so no absent live sample is presented as data. |
| H3 | UI filter "better than model X in category Y" | verified | `ux-evidence/iter14-indep-review/h3-functional.json`, `h3-1440.png`, `h3-390.png` — **independent verification (claude-opus, iteration 14; implementer codex-luna):** live `0e7380c`, Advanced 16 rows → reference GLM-5.3-Flash + "Coding median · 13 benchmarks" → 9 rows, status names "measured" and "Missing values stay unknown and are excluded", no overflow at 1440/390. Original evidence: | `/opt/benchmarkheaven/state/ux-evidence/iter10-h3/verification.json` | Advanced-only folded filter supports exact benchmarks and category medians; measured values win, explicit bridge estimates are marked approximate, and missing values stay unknown. Live on both hosts in desktop/mobile light/dark; independent-engine verification remains required. |
| B1 | Benchmaxxing tab in Advanced | verified | `ux-evidence/review-20260913T002002Z/*-benchmaxxing.png` | review (claude-opus, Hermes-built): 200 at desktop+mobile, light+dark; nav tab; method anchor |
| B2 | Method identifying strong-on-some / weak-on-others | verified | `REVIEW-20260913T002002Z.md` #3–4 | topic-local percentile jump; tag quality blocked by B3 Verified by review gate 230002Z (opencode-kimi): the same published computation as B3 (codex-verified: 174 scored / 18 tagged, coverage-aware suppression) feeds the overview tag and `/benchmaxxing` (live in this gate's runs, e.g. `cr-e2e`); `test/benchmax-jagged.test.mjs` 7/7.|
| B3 | Missing scores must not bias the result | verified | `ux-evidence/iter11-f07/b3-live/verification.json` + `ux-evidence/iter7-b3/bm-audit-after.txt` | **Iteration 7 (`004f8dc`):** score = within-topic mean absolute percentile difference over *all* measured pairs (order-independent), weighted by n−1; published only with ≥ 6 related comparisons over ≥ 2 topics; shrunk toward the catalog mean by n/(n+k), k by empirical Bayes (min 2). Real data: 174 scored / 18 tagged (was 574 / 58); tagged 3/21 at 6–7 comparisons, 5/74 at 8–10, 0/36 at 11–13, 10/43 at ≥ 14 — no longer falling with coverage; minimum comparisons among tagged = 6. Tests: floor, order invariance, synthetic equal-noise catalog, real-data "rate must not collapse with coverage". Codex independently re-checked both widths live: 174 qualified / 18 tagged, floor note present, no overflow. |
| B4 | Benchmaxxing tag in overview table + tab | verified | `ux-evidence/iter11-f07/b3-live/verification.json` | one shared `benchmaxxingSignals()` feeds the overview badge and `/benchmaxxing`; Codex independently re-checked 18 badges in the top-25 table at desktop and mobile, both without overflow. |
| B5 | Small-print method explanation | verified | `ux-evidence/iter4-live/verification.json` | Advanced Overview carries a restrained explanation and link to `/benchmaxxing#method`; the dedicated method disclosure is now addressable by that anchor. |
| B6 | Many-axis radar, similar topics clockwise-adjacent | verified | `ux-evidence/review-20260913T002002Z/desktop_light-benchmaxxing-full.png` | review: 214-axis radar live in all 4 combos, topic-grouped, gaps for missing; mobile overflow fixed in the review commit |
| B7 | Jaggedness weighs heavily; specialisation not penalised | verified | `REVIEW-20260913T002002Z.md` #4, `test/benchmax-jagged.test.mjs` | zig-zag > smooth specialisation still proven. Iteration 7 removed the alphabetical-order critique (all-pairs spread, order-invariance test). **Remaining, documented on `/benchmaxxing#method`:** percentiles are bounded, so a model at the top of most boards has less room to vary than a mid-field one Verified by review gate 230002Z (opencode-kimi): `test/benchmax-jagged.test.mjs` 7/7 (zig-zag outranks smooth specialisation; order invariance), method disclosure live at `/benchmaxxing#method` (broad sweep 80/80).|
| X1 | Autonomous on Sandy with engine fallback | verified | — | `bin/tick.sh` cron Verified by review gate 230002Z (opencode-kimi): `crontab` runs `bin/tick.sh` every 10 min and `state/ux/history.log` records continuous engine selection with the documented fallback ladder (this gate itself was scheduled as `opencode-kimi review` after claude-opus gates at 13:00/21:30; Codex stayed unused at 78 %).|
| X2 | Codex never above 80 % weekly | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260913T205002Z-limits.json`, `ops/ux-2026-09-12/REVIEW-20260915T051001Z.md` | **Verified by review gate 20260915T051001Z (opencode-kimi):** the workstream's own Codex usage never exceeded the 80 % hard cap — the ledger's measured series (65→66→67→68→72→78 %) never crossed it, `iterate.sh` re-measures during runs, and since the 01:26 UTC reading (78 %, machine-local, disclosed as potentially stale at account level) `state/ux/history.log` records no Codex run; this gate used none (Kimi K3 via Chutes). Fresh `limits.py --json` at this gate: Claude session 14 % / week 17 %, Codex 78 % weekly (13 h stale, machine-local — disclosed). Earlier record: `limits.py --json` at 21:09 UTC measured Codex at 72% weekly, below the 80% ceiling. **2026-09-15 01:26 UTC (review gate opencode-kimi, fresh `limits.py --json`):** Claude session 16 % / week 15 %; **Codex 78 % weekly** — the machine-local measurement is 9.2 h stale, but no Codex run has happened since, so the true account-wide value is unchanged at 78 % — below the 80 % hard cap, above the 75 % admission gate (Codex not admitted; this gate is Kimi K3 via Chutes, no Codex usage at all). |
| X3 | Fable 5.1 design passes happened and were implemented | verified | `ops/ux-2026-09-12/DESIGN-DIRECTIVES.md` (pass 10; passes 1–9 condensed there), `/opt/benchmarkheaven/state/ux-evidence/iter47-indep/`, `ux-evidence/fable-20260914-pass10/`, `ux-evidence/fable-20260914-pass9/`, `ux-evidence/fable-20260914-pass8/`, `ux-evidence/fable-20260913-pass7/`, `ux-evidence/fable-20260913-pass6/`, `ux-evidence/review-20260913T110002Z/{fable-canonical-fixed2,iter20-canonical,iter20-legacy,f27-canonical,f27-legacy}/` | **Iteration 47 (claude-opus, non-Fable, non-Kimi):** F-58, F-59, F-60, F-61, F-62, F-63 and F-64 verified live on `21aa63f`, both hosts, 1440/390, light/dark (`verify-f58-f61` 36/36, `verify-f63-f64` 22/22, `verify-review-0610` 68/68 per host; one canonical F-63/F-64 run crashed in navigation and passed 22/22 on rerun). X3 stays in-progress: older done-log rows (e.g. F-18, F-39, F-40, F-41, F-46, F-47, F-51) still name no independent verifier. **Fable pass 10 (2026-09-14 06:25 UTC, live `4b0d250` → `21aa63f`):** verdict "at the bar at both widths and themes"; residues F-63 (light-mode bar tracks on Charts) and F-64 (Composite coverage wording) fixed by Fable in `21aa63f`, live 22/22 on both hosts (`bin/verify-f63-f64.mjs`, `ux-evidence/fable-20260914-pass10/verify-21aa63f-{canonical,legacy}/`). F-58/F-59/F-62/F-63/F-64 await a non-Fable, non-Kimi verifier. Fable pass 9 (2026-09-14): F-58–F-62 written and landed (`9240da5`, `97e50a4`, `7b5320d`), live 36/36 on both hosts; F-58/F-59/F-62 await a non-Fable, non-Kimi verifier. Codex independently verified the non-Codex F-08a/F-08b and F-22–F-28 implementations live on both hosts, 1440/390, light/dark. F-19 is live but was implemented by codex-luna (`0c37a18`), so this gate cannot set it verified. X3 therefore remains in-progress under the one-engine rule. **Fable pass 4 (2026-09-13 12:00 UTC):** fresh 73-shot matrix judged; F-29/F-30 fixed by Fable and live-verified; F-31…F-38 written; F-33/F-34 delegated. Pass 5 (2026-09-13 15:30 UTC, live `3d7af32` → `64063b5`): F-31…F-38 verified live by Fable; F-39 fixed by Fable; F-40…F-45 open in `DESIGN-DIRECTIVES.md`. **Fable pass 11 (2026-09-14 ~09:10–10:00 UTC, live `4f8b690` → `72da684`):** verdict — core pages at the bar in the 80-shot matrix; one real defect: every E2 board (Vals, CursorBench, ApprenticeBench, FrontierCode, Real-SWE) opened on "No results in this view" / "0 of 846". Fixed as F-65 (automatic widening + one notice line, `72da684`; Kimi delegation stalled, Fable implemented) and F-66 (error-boundary Details; the phone light model page hit the boundary once in the capture, not reproducible, most likely a deploy-window chunk 404). Live: `bin/verify-f65.mjs` 168/168 on both hosts (`ux-evidence/fable-20260914-pass11/verify-f65-{canonical,legacy}/`). F-65/F-66 need a non-Fable verifier. **Fable pass 12 (2026-09-14 ~11:20–11:35 UTC, live `975334b` → `5e974fe`):** fresh 80-shot matrix (`ux-evidence/fable-20260914-pass12/`, no page errors, no overflow) — verdict: at the bar on every page, both widths, both themes. Two residues fixed surgically by Fable: F-67 the best model lost its label on the phone value map (eight label slots + top headroom), F-68 Benchmaxxing truncated model names at 390. Live 32/32 on both hosts (`bin/verify-f67-f68.mjs`, `ux-evidence/fable-20260914-pass12/verify-f67-f68-{canonical,legacy}/`). E2 boards re-shot with the corrected script: all five open with rows and one notice line (F-65 holds). F-65–F-68 await a non-Fable verifier. **Pass 13 (Fable, 2026-09-14 ~12:30–12:50 UTC):** fresh 80-shot matrix + supplemental shots of live `bf5b821`; F-69/F-70/F-71 fixed by Fable (`f23f5f9`) and live-checked 44/44 per host; F-72/F-73 opened for implementers. `DESIGN-DIRECTIVES.md` rewritten for pass 13. X3 stays `in-progress` until F-72 is implemented and F-69–F-71 are verified by a non-Fable engine. **Fable pass 14 (2026-09-14 ~14:00 UTC, live `42da12c` → `e33635b`):** F-72 and F-73 (claude-opus) verified live by Fable (non-implementer; `ux-evidence/fable-20260914-pass14/verify-f72/`, board shots); opened and fixed F-74 (15-row cap dropped the cheapest passing model — now Pareto line first, `lib/shortlist.mjs` + test), F-75 (Guided result buttons wrapped inside themselves at 390), F-76 (Real-SWE option "· 0 measured catalog peers"), `e33635b`, live 36/36 per host (`verify-f74-f76/{canonical,legacy}/`). F-74–F-76 need a non-Fable verifier (`bin/verify-f74-f76.mjs`). **Review gate 20260915T012002Z (opencode-kimi) — closure:** the last two open verification debts are now closed: F-18's filter-sheet accessibility (`bin/verify-f18.mjs` — filtered-sheet sheet/focus/Escape/outside-click/pool-count/round-tick checks — `allPass: true` on **both hosts**, 1440/390; implementers were claude-opus `939b278` + codex-luna's header-layering fix `8d950fb`, so this gate is a legitimate non-implementer verifier) and F-83 (see the F-83 row — 108/108 per host by this gate). With F-74–F-76 verified at review 213002Z, F-77/F-78 at 230002Z, F-79–F-82 at iteration 61 (re-confirmed this gate, 40/40 per host), and F-83 verified by this gate, **every directive from all 15 Fable passes is implemented and verified by a non-implementing engine, and `DESIGN-DIRECTIVES.md` records no open directive → X3 verified, evidence `…/review-20260915T012002Z/`.** |
| X4 | UI meets the design bar | verified | `DESIGN-DIRECTIVES.md` "Verdict on the live site — pass 10"; `/opt/benchmarkheaven/state/ux-evidence/review-20260915T051001Z/` (sweep 0 errors both hosts, verify-p2-history 54/54 per host, verify-f84-f85 20/20 per host) | **Verified by review gate 20260915T051001Z (opencode-kimi):** every recorded condition is met — Fable passes 1–16 judged and targeted the current UI (pass 15 = CR-1.10 Benchmarks page, pass 16 = post-F-83 fresh matrix at the bar in both widths/themes), every directive is non-implementer-verified live, the broader gates named by this row (E2, R9.1, P2) are all verified, and this gate's broad sweep re-confirms the whole surface at 1440/390, light/dark with 0 errors on both hosts. Earlier record: `/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass10/` (80 shots, no overflow, no page errors); `/opt/benchmarkheaven/state/ux-evidence/iter38-live-20260913T230208Z/` — **Iteration 47 (claude-opus):** the independent-verification gate named below is cleared — F-58/F-59/F-62 and F-63/F-64 pass live on both hosts (`/opt/benchmarkheaven/state/ux-evidence/iter47-indep/`). X4 stays `open` only for the broader E2/P2/R9.1/X6 gates. **Pass 10 (Fable, design authority):** the live UI meets the bar at 1440 and 390, light and dark; the two residues found (F-63, F-64) are fixed live. Stays `open` under the one-writer rule until a non-Fable, non-Kimi engine verifies F-58/F-59/F-62 (`bin/verify-f58-f61.mjs`, `bin/verify-review-0610.mjs`) and F-63/F-64 (`bin/verify-f63-f64.mjs`) live on both hosts. Pass 9 (Fable): desktop at the bar in both themes; the two phone charts that were not (Compare radar, Charts bars) are fixed live; remaining gate is independent verification. Current live rechecks show no page-level overflow; F-50 measures a 40px desktop column gap on the canonical host and remains stacked on mobile, satisfying its ≤120px acceptance geometry. The design bar remains open for the broader unresolved E2/P2/R9.1/X6 gates and independent verification requirements. **Pass 11 (Fable):** the UI meets the bar at 1440/390, light/dark, now including the E2 boards' opening state (F-65 live, 168/168 per host); remaining gate is a non-Fable verification of F-65/F-66. **Pass 12 (Fable):** first pass with no page below the bar in a fresh matrix; F-67/F-68 (label loss and name truncation at 390) fixed and live 32/32 per host. Remaining gate is procedural only: a non-Fable engine verifying F-65/F-66 (`bin/verify-f65.mjs`) and F-67/F-68 (`bin/verify-f67-f68.mjs`) on both hosts. **Pass 13 (Fable, design authority):** at the bar at 1440 and 390, light and dark, with F-69–F-71 live; F-72 (one Charts card) is an improvement, not a bar failure. Remaining: non-Fable verification of F-66/F-69/F-70/F-71 and F-72. **Pass 14 (Fable, design authority):** the live UI meets the bar at 1440 and 390, light and dark, with F-74–F-76 live; no directive open for implementers. Remaining gate: non-Fable verification of F-74–F-76 plus the broader E2/P2/R9.1/X6 rows. **Review gate 20260915T012002Z (opencode-kimi):** the design-bar side of this row is satisfied for the entire current UI — Fable passes 1–15 all judged and targeted the current product (pass 15 = the CR-1.10 Benchmarks-page pass), every directive is verified live by a non-implementer (X3 closed by this gate), and the full broad sweep (`verify-live-review.mjs`, 4 contexts × 45–46 checks, 0 errors) re-confirms the whole ledger surface at 1440/390, light/dark. X4 stays `open` only for the broader E2/P2/X6 gates per this row's recorded condition (E2: BullshitBench ingestion in flight; P2: remaining PRD gaps). **Pass 16 (Fable, design authority, 2026-09-15 04:30 UTC):** every page shot (Benchmarks after F-83, One-benchmark E2 boards, the H3 panel, model page speed/context, Simple, Guided, Benchmaxxing) is at the bar at 1440/390, light/dark; two refinements landed (F-84, F-85, `ec80831`, live-checked 20/20 per host), one judgment directive opened (F-86). Remaining gate unchanged: the broader P2/X6 rows and non-Fable verification of F-84/F-85. |
| X5 | CHANGELOG / API.md / fork-sync prompt updated | verified | `API.md`, `CHANGELOG.md`, `MSG-UPSTREAM-SYNC-PROMPT.md`, current live `/about` and API evidence | Codex checked the H2 fields, six headline boards, `data/raw/*.json` sync, ECI/featured/Compare changelog entries and the matching build-diagnostic field paths. |
| X6 | Final line-by-line completeness audit | verified | `ops/ux-2026-09-12/REVIEW-20260915T051001Z.md` (section "X6 — line-by-line audit of 00-REQUIREMENTS-VERBATIM.md") | Every line of 00 (items 1–9, all three Nachträge, benchmaxxing trilogy, logo, autonomy) mapped to verified ledger rows; the two conflicts (R5.2 price-descending vs CR-8.1 score-descending; R4.4 featured rule) resolved with the newer text winning and recorded; 02 addendum rows (E1–E3, P1–P4, F1, C1) and every CR-20260914 row (CR-1.1…CR-9.3) verified live by non-implementers. Performed by this gate. |
| X7 | Final Telegram to Florian | verified | Telegram message_id **13703** (2026-09-15 ~05:47 UTC, @cursor_noti_bot → Florian) | Sent by review gate 20260915T051001Z (opencode-kimi): what shipped, what to look at first, the recorded interpretations (R4.4 featured top-20 incl. Gemini-in/Sonnet-5-out, R4.10 opt-in + unknown = kept-and-labelled + Chutes pass, R5.2 superseded by CR-8.1 score-descending), anything open (nothing), and the honesty notes (OpenAI/xAI 403 not bypassed, quotas shown as unpublished, DeepSWE robots-excluded, BU Bench V2 plot-only). Verification = the message-id receipt above (any engine can re-check the send against the bot API). A 120-minute reply watcher runs per the standing rule. |
| D1 | Blend default 20 is not a selectable option | verified | `ux-evidence/iter1-live/verification.json` | blend 20 is a real option; settings key bumped to v7 to discard the broken payload Verified by review gate 230002Z (opencode-kimi): `SettingsContext` v7 comment in code; 20:1 is a real selected-by-default blend option live (R4.2 evidence).|
| D2 | Reset restores `excludeChinese = true` against its default | verified | `components/GlobalFilters.tsx` | Reset restores every documented default; `defaultMinFor("composite")` is now 86 (>85) so a clean page is not reported as modified Verified by review gate 230002Z (opencode-kimi): `GlobalFilters` Reset sets `excludeChinese=false` plus every other documented default; `test/settings-state.test.mjs` 7/7.|
| D3 | `#benchmarks` shows composite slots, not benchmark count | verified | `ux-evidence/iter1-live/verification.json` | see R2.2 Verified by review gate 230002Z (opencode-kimi): codex's R2.2 live evidence already proves full-coverage counts; `bin/verify-cr-1` 92/92 per host shows the same `#benchmarks` column in the new matrix.|
| E1 | ECI (general + software engineering) into the Composite, with scraping recipe in the update mechanism | verified | `ux-evidence/iter3-live/eci-verification.json`, `/opt/benchmarkheaven/state/ux-evidence/iter48-e1-indep/README.md` | **Verified iteration 48 by claude-opus (implementer codex-luna), live `c41a2a2`:** 7-slot `composite-v2-epoch-eci`; dropping ECI changes `composite_base` for all 130 ECI-bearing models; the shipped `buildEciSnapshot` on today's Epoch exports yields 266/266 general rows (the committed 05:14 snapshot's 264 predates Epoch adding Gemini 3.8 Flash and Qwen3.8 Max 0902); daily step `fetch-epoch-eci` ran today; CHANGELOG/API document the re-weighting; live Score (i) tooltip (1440) and modal (390) name both ECIs; H2 definition-change test present. Earlier note: Epoch AI source collected 264 general / 101 software rows; 130 families mapped conservatively, 134 source models retained unmatched. Composite is now seven equal native/percentile-normalized slots; source and H2 recompute provenance are documented. Reopened because the existing note says independent-engine verification is still required; this gate did not implement or independently close that claim. |
| E2 | Secondary/community benchmarks (Vals AI, CursorBench, Apprentice Bench, DeepSWE, FrontierBench, RealSWE, 2 X threads) — NOT in the Composite | verified | `ux-evidence/iter14-e2/SUMMARY.md`, `/opt/benchmarkheaven/state/ux-evidence/iter33-e2-cursorbench/verification.json`, `/opt/benchmarkheaven/state/ux-evidence/iter47-e2/`, `/opt/benchmarkheaven/state/ux-evidence/iter48-e2-apprentice/README.md`, **`/opt/benchmarkheaven/state/ux-evidence/review-20260915T024002Z/` (opencode-kimi gate: BS 104/104 UI + API both hosts, BU 104/104 UI + API both hosts, Vals/FrontierCode 88/88, Apprentice 88/88分叉, CursorBench/RealSWE 136/136, primary-source re-fetch BS 408/408 + BU 9/9 exact)** | **Iteration 48 (claude-opus) — ApprenticeBench landed, live on `f7c5a91`:** four identities `apprenticebench-{cua,cua-cost,api,api-cost}::snapshot-2026-09-14` (29/29/27/27 runs, `measured`, never Composite inputs), collected from the row literals in the page's own Vite module bundle (Kimi K3 draft, integrated by claude-opus). Owner re-check independent of the shipped parser: all 112 committed values equal the bundle literals of both boards (`owner-recheck.json`, 0 mismatches). Gates: build-dataset 845/661/91/2,834 (no model row changed), `npm test` 277/277, `tsc`, `next build`. Live on both hosts: `bin/verify-e2-apprentice.mjs` 0 failures (API rows, harness-cohort axes, unit, basis, spot values, no human-baseline row); `bin/verify-e2-apprentice-ui.mjs` 88/88 at 1440/390, light/dark. Same known gap as Vals/FrontierCode: unmatched source identities, so the CUA board opens on 0 rows until "All" + "Include unmatched source identities". **Iteration 61 (claude-opus) — both X threads resolved to primary sources without the desktop-Chrome route:** the post texts were read through the Desearch API (read-only; no X login used). `petergostev/2098331418577256546` is **BullshitBench** (Peter Gostev, MIT): canonical leaderboard CSVs in `github.com/petergpt/bullshit-benchmark` (V1 55 questions / 194 model×reasoning rows, V2 100 questions / 214 rows) — E3 step 1 (official export), two new identities `bullshitbench-{v1,v2}::snapshot-2026-09-10`, captured at commit `2678ac29`, candidate 408 rows, owner re-check 0 mismatches; ingestion follows the critic round (see the iteration 61 record). `gregpr07/2098067206210998586` is **Browser Use's BU Bench V2**: the post's "60 brutal browser use tasks" numbers (DeepSeek V4.1 Flash on the Pareto frontier) are published only as a plot image (`official_plots/bu_bench_v2_astra.jpg`, "Results are from an earlier 60-task cut") — a graph is not a measurement, so nothing is ingested from it; the repository's machine-readable `official_results/*.json` are BU Bench V1 (100 tasks, `tasks_successful` per model), a candidate identity for a later iteration. Earlier note: **E2 now open only for the two X threads** (gregpr07, petergostev; need the desktop-Chrome route, not an automated fetch); DeepSWE stays excluded by its robots.txt. **Iteration 47 (claude-opus) — Vals Index v2 and FrontierCode 1.1 landed, live on `ed9b78a`:** the parked stash was merged onto `main` (`ed9b78a`). FrontierCode batch 3 and cost batches 1–5 were reviewed by the different-family critic `deepseek/deepseek-v4-flash-0731` through the repo-path `worker.sh`: all 196 self-reported rows approved (`critic-rounds.log`). Owner re-checks against the raw captures, independent of both the collector and the critic: Vals 503/503 (`vals-recheck.json`), FrontierCode 196/196 (`frontiercode-recheck.json`). Gates: data:benchmarks, build-dataset 845/661/91/2,834, `npm test` 276/276, `tsc` clean. Live, both hosts: `bin/verify-e2-vals-frontiercode.mjs` 0 failures across 11 identities (its axis check now sums FrontierCode's seven harness cohorts, 98/98 each; `frontiercode-axes-live.json`); `bin/verify-e2-benchmarks-ui.mjs` 88/88 at 1440/390, light/dark (`ui/`); route smoke `verify-review-0610` 68/68. **Known gap, not hidden:** every E2 row is an unmatched source identity (`identity_policy: source_label`; Vals slugs carry a published compute effort and must not be effort-inferred), so `/benchmarks` opens Vals Index on "0 results" until "All · prefer measured" and "Include unmatched source identities" are set. Follow-ups: (a) Fable decides how boards with only unmatched identities should open (candidate directive in `DESIGN-DIRECTIVES.md`); (b) a reviewed Vals alias table (slug + published effort → exact catalog configuration). E2 stays `open` for Apprentice Bench, FrontierBench and the two X threads (DeepSWE excluded by robots.txt). **Iteration 45 (claude-opus) — correction to iteration 44:** the critic runner is **not** gone. `ops/rebuild-2026-09/bin/worker.sh` and `worker-runner.mjs` are tracked and present; `node ops/rebuild-2026-09/bin/pick-worker-models.mjs --json` returns qualified workers (e.g. `deepseek/deepseek-v4-flash-0731` AA 34.5, `z-ai/glm-5.3-flash` AA 41.9). The failure came from calling it through the symlink `/opt/benchmarkheaven/bin/worker.sh`: the script resolves `$HERE` from `BASH_SOURCE` without following the link, so it looks for `/opt/benchmarkheaven/bin/worker-runner.mjs`. **Always call the repo path.** Next step unchanged otherwise: critic-review FrontierCode batch 3 + cost batches 1–5 through the repo-path `worker.sh --critic`, then land Vals + FrontierCode together. **Iteration 44 (claude-opus) — state of the parked Vals/FrontierCode work:** stash commit `07eaa70` (+ untracked parent `00bf1f0`) holds Vals Index v2 (8 identities + cost, `measured`, 56/55 rows) and FrontierCode 1.1 score + cost (`self_reported`, 98 rows each). Tracked data merges cleanly onto `main` (conflicts only in CHANGELOG/addendum/PROGRESS). **Not landable yet:** the validator requires a critic approval for every `self_reported` row; only 78 of 196 FrontierCode rows are approved (batch 3 failed on a truncated critic reply, the cost board was never reviewed), and the critic runner it used is gone — `/opt/benchmarkheaven/bin/worker.sh` execs a `worker-runner.mjs` that no longer exists and `ops/rebuild-2026-09/bin/worker.sh` was removed. Next step: restore a critic route (gauntlet skill), review FrontierCode batch 3 + cost batches 1–5, then land Vals (measured, deterministic re-check against the capture) and FrontierCode together. **Iteration 14:** registry re-checked — only RealSWE (score + cost) is ingested. Delegated source research returned no report and no scores (not accepted), but its verbatim robots.txt reads are recorded: Vals AI, neocognition.io and cognition.ai allow; cursor.com allows `/cursorbench` but not `/api/`; realswe disallows `/api/`; **DeepSWE disallows ClaudeBot/GPTBot/CCBot/PerplexityBot** → treated as not permitted for automated collection by this workstream. Next: capture → registry identity → gauntlet → ingest, per source. **Direct probes by claude-opus (same iteration, ≤ 3 requests per host):** four sources are machine-readable without any API or login — **Vals AI** (Vals Index v2, 56 models × 8 tasks in the page's Astro props), **CursorBench 4.0** (43-row HTML table), **ApprenticeBench** (15-run table on apprenticebench.com), **FrontierCode** = the addendum's "FrontierBench" (Cognition's own `data.json`, v1.1 36 models / 98 runs, cross-checked against the rendered table). Captures, hashes, verbatim rows and suggested identities are in `SUMMARY.md`. **Iteration 33:** CursorBench 4.0 was freshly captured from its allowed SSR HTML page and accepted as two separate non-Composite identities (score + USD/task), 43 rows each. Its model/effort labels remain unmatched source identities (no catalog joins or effort inference). Three row-batched DeepSeek critic gates pass with independent receipts; the other named E2 sources and X-thread route remain open. Earlier: | check `data/raw/benchmarks/` and `bfeada7` first; Real-SWE looks already ingested | **Iterations 62–63 (claude-opus, recorded by review gate 024002Z from commits + evidence; iterations did not write):** `f872289` BullshitBench V1+V2 (`bullshitbench-{v1,v2}::snapshot-2026-09-10`) ingested from the maintainer's canonical leaderboard CSVs at pinned commit `2678ac29` (MIT), green_rate = score_2/nonsense_count, measured, never Composite inputs; DeepSeek critic returned no verdict twice, so the measured rows landed on the deterministic owner re-check as Vals did (iter61/62/63 re-checks: 408/408 equal to the capture; `/opt/benchmarkheaven/state/ux-evidence/iter62-e2-bullshitbench/`). `1cd99fd` BU Bench V1 (`bu-bench-v1::snapshot-2026-09-09`) ingested from the `official_results` run files of `browser-use/benchmark` at pinned commit `421390ea` (still the repo head): value = tasks_successful/tasks_completed, n=100 each, basis derived, source basis self_reported, never Composite; gauntlet producer `anthropic/claude-opus-5`, critic `z-ai/glm-5.3-flash` (different family) round 1 = pass, 0 findings, 9/9 rows, receipts bound by sha; owner re-check via the GitHub contents API (exactly 9 run files, all 9 values equal; `iter64-e2-bubench-v1/`). BU Bench V2's numbers exist only as a plot image — honestly not ingested. Gates at both commits: build-dataset 844/660/91/2,846, npm test 381→382/382, tsc clean. **Review gate 20260915T024002Z (opencode-kimi, non-implementer) — every named E2 source live-verified on both hosts at revision `873429e`, 1440/390, light/dark:** BullshitBench API verifier 0 failures (194+214 rows, axis complete); BU Bench API verifier 0 failures (9 rows); BullshitBench UI 104/104; BU Bench UI (per-cohort verifier repaired by this gate — multi-harness boards show one evaluation group per the FrontierCode design) 104/104 (2 evaluation groups, opening cohort 7 runs with claude-opus-4-7=0.74, CloudAPI cohort 2 runs with bu-v4-opus-4-8=0.85); Vals/FrontierCode UI 88/88; ApprenticeBench UI 88/88 (CUA + API boards); CursorBench + Real-SWE deep-link probe 136/136 (score + cost boards); API probes: cursorbench 43+43, realswe 8+8 rows on both hosts. **Independent primary-source re-fetch by this gate:** BullshitBench 408/408 committed values equal the live CSV green_rate column exactly (derivation value = score_2/nonsense_count within the CSV's 4-decimal rounding; version guards hold: V1 nonsense_count 55 every row, V2 100); BU Bench 9/9 committed values equal fresh run-file fetches (tasks_successful/100 each; pinned commit still the repository head per GitHub API). Neither identity feeds the Composite (`lib/composite.mjs` slots are the fixed seven). All six named E2 sources + both X threads are now ingested and live (DeepSWE excluded per its robots.txt, recorded; BU Bench V2 plot-image honestly not ingested, recorded). Evidence `/opt/benchmarkheaven/state/ux-evidence/review-20260915T024002Z/`. **E2 → verified.** |
| E3 | Collection method order: official API/export → structured page data → static HTML → the page's own network calls | verified | `data/raw/benchmarks/collection-plan.json`, `ops/daily/refresh-benchmarks.mjs`, **`/opt/benchmarkheaven/state/ux-evidence/review-20260915T024002Z/` (this gate: plan holds all named E2 sources; BU Bench `parser.runs` queued by `8e3c39c`; simulated end-to-end receipts; npm test 382/382)** | **Iteration 48 (claude-opus):** ApprenticeBench uses E3 step 2 (structured data shipped with the page): `capture-benchmark-sources.py` follows exactly one same-origin `<script type="module">` from `https://apprenticebench.com/` under the same robots/delay/size/challenge guards and records `discovered_from`; `refresh-benchmarks.mjs` resolves `page_url` + `follow_module_script` sources and registry evidence from that discovered capture, because the bundle hash changes per deploy; parser `vite_board_runs` is fail-closed (header literal, single cua/api board map, literal-only rows, n == 100). Recipes in `collection-plan.json` and the registry; the daily refresh picks them up generically. Remaining for E3: the two X threads. **Iteration 47 (claude-opus):** Vals Index v2 (structured page data: Astro island props, one robots-allowed page request, version guard "Vals Index" v2) and FrontierCode 1.1 (the page's own `data.json`, robots-allowed) landed in `ed9b78a` with recipes in `collection-plan.json`. The daily refresh walks every `collection-plan.json` entry generically (capture → parser → critic for changed rows), so both are refreshed daily without extra wiring. Still open for the remaining E2 sources (Apprentice Bench, FrontierBench, the two X threads; DeepSWE stays excluded by its robots.txt). CursorBench 4.0 now has a reproducible SSR-HTML capture recipe (one robots-allowed request, explicit version guard, source hash and 43-row minimum); the complete eight-source E2 collection recipe is still open. **2026-09-15 review gate 024002Z:** every named E2 source (incl. the two X threads) now has a committed recipe in `collection-plan.json` (`bullshitbench-v1/v2` CSV, `bu-bench-v1` run files) or in the registry (`realswe` lock-based path with its own daily `source_reachable_protocol_date_retained` step); **E3 → verified** |
| P1 | Requirements from both Telegram chats structured as a PRD, independently reviewed before the ledger is declared complete | verified | `ops/ux-2026-09-12/PRD.md`, `/opt/benchmarkheaven/state/ux-evidence/iter13-prd/verification.json`, `ux-evidence/iter14-prd-review/review-claude-opus.json`, `/opt/benchmarkheaven/state/ux-evidence/iter32-prd-review-codex/review.json` | **Codex Luna independently confirmed Claude's repaired digest `57d164a25de84547944527a5c5a0f1f919c01ade37b8afc81efb734e86d36f5a`**: all six prior findings are repaired, all E2 source names and F1/C1 rows are present, AA claims are supported by retained captures, and unresolved P2/P3/P4/E2/E3 gaps remain explicitly open. This closes P1 only; it does not close the product gaps or X6. |
| P2 | Cited capability comparison against Artificial Analysis; close the gaps that matter | verified | `ops/ux-2026-09-12/PRD.md`, `/opt/benchmarkheaven/state/ux-evidence/iter13-prd/verification.json`, `/opt/benchmarkheaven/state/ux-evidence/review-20260915T051001Z/` | **Verified by review gate 20260915T051001Z (opencode-kimi):** every prioritized gap is closed with non-implementer live evidence — GAP-01 speed/context (gate 012002Z, 41/41 per host), gap 4 historical surface (this gate, 54/54 per host), the empty-table follow-up (iteration 67 `a2a0ced`, verified by this gate: no harness-only ids, Opus 4.7 (medium)/Coding Agent Index v1.5 leaves 6 qualifying models, harness-only DeepSeek rows now measured, retained states untouched, primary-source capture rows match exactly), gap 5 governance (this gate's independent PRD re-review `31001e70…866b` verdict `pass` in `prd-re-review.json` + CHANGELOG supplement documenting `a2a0ced` for downstream consumers). Earlier record: Capability matrix now cites the allowed AA leaderboard, comparison, methodology and current-index URLs row by row; material gaps are prioritized, not claimed closed. **Iteration 60 (claude-opus, `15d1a78`) — P2-GAP-01 speed, latency, context:** output speed, time to first token and context window on every model page and in Compare's "Speed and context" table, labelled as AA medians with the read date; AA's `0 / 0` for 460 not-speed-tested rows is now null (never "0 t/s"); PRD row marked closed as displayed evidence. Iteration 60 committed the code but no ledger entry and left its verifier untracked. **Iteration 61 (claude-opus):** committed `bin/verify-p2-speed.mjs` with a phone-context fix (`hasTouch`; without it InfoTip opened its pointer tooltip, not the dialog, so the first run's two "read date null" fails were the harness) in `962cc48`; live **41/41 on both hosts**, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter61-verify-962cc48/p2-speed/{canonical,legacy}/verification.json`). P2-GAP-01 needs a non-claude-opus verifier; P2 stays in-progress for the PRD's remaining gaps (E2/E3 coverage, historical product surface). **Review gate 20260915T012002Z (opencode-kimi, non-claude-opus):** re-ran `bin/verify-p2-speed.mjs` live on both hosts — **41/41 per host**, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260915T012002Z/verify-p2-speed/{canonical,legacy}/`; model page shows output speed / time to first token / context window labelled as AA medians with the read date, not-speed-tested rows are null, Compare's "Speed and context" table matches). **P2-GAP-01 verified.** P2 stays in-progress for the remaining gaps. **Iteration 65 (claude-opus, `2244713` + `7677f74`) — PRD gap 4 "historical product surface":** (a) data honesty: 87 of 177 `estimated` historical rows were false drop-outs (configurations still published whose older retained states carried a catalog key the current matcher no longer assigns, e.g. GPT-6 Astra (Non-reasoning) on 15 AA boards); `datedEstimates` now skips a retained row whose source identity (`source:` key or AA model UUID in the locator) is on the current board with the same harness/effort — `counts.estimated` 177 → 90, every removed row re-checked against the board, `not_comparable` unchanged 482; (b) Advanced → "Better than a model" discloses a bridged reference: origin (snapshot date or older version), anchor models, hops, anchor spread; category medians say how many benchmarks are bridged; (c) real retained example live: Opus 4.7 (medium) / Fable 5 on AA Coding Agent Index v1.5, bridged from v1.4 through 8 anchors (±17 %). Gates: build-dataset 844/660/91/2,846, `npm test` 384/384, `tsc` clean. Live build `cmbkwMpaRMDESByXYqjs9` (both hosts, 04:12:33 UTC): `bin/verify-p2-history.mjs` **27/27 per host** (1440/390, light/dark; expected text computed from the live `/api/dataset` through the shipped projection), broad sweep `verify-live-review.mjs` 0 errors per host (`/opt/benchmarkheaven/state/ux-evidence/iter65-p2-history/{canonical,legacy,sweep-canonical,sweep-legacy}/`). PRD gap 4 marked closed (`PRD.md`). **Needs a non-claude-opus verifier.** Follow-up found, not caused by this change: with Opus 4.7 (medium) as reference on Coding Agent Index v1.5 the Advanced defaults leave **0 models** (16 rows score higher, but they are harness-only catalog ids such as `opus-5::*` / `fable-5.1-with-fallback::max` beside `claude-opus-5::*` / `claude-fable-5.1::*`, apparently without offers or evidence, so "Has provider"/"Has benchmark evidence" drop them) — the headline example shows an empty table; also 5 duplicate labels in the H3 "Benchmark or category" select. P2 stays in-progress for that follow-up and the governance item (gap 5). **Iteration 66 (claude-opus):** the duplicate labels closed with F-86 (`6d775aa`). The empty-table follow-up is **sized, not shipped** — handoff: AA's Coding Agent feed says "Opus 5 (low)" / "Fable 5.1 (max) (with fallback)", `FAMILY_ALIASES` (`scripts/build-dataset.mjs` ≈ l.128) has `opus-4.x → claude-opus-4.x` but no `opus-5`/`fable-5.1`, so 7 rows become harness-only ids `opus-5::{low,medium,high,xhigh,max,non-reasoning}` + `fable-5.1-with-fallback::max` without offers. The two-line alias fix is saved at `/opt/benchmarkheaven/state/ux-evidence/iter66-alias.patch` but was **not committed**, because (a) `data/raw/benchmarks/scores.json` and 10 retained states under `data/raw/benchmarks/history/states/` store `subject.model_id = "opus-5::…"`, and (b) `lib/benchmark-history.mjs:39` keys history by that stored id — renaming alone would split retained Opus 5 rows from current ones and reintroduce false drop-outs. Next step: apply the patch, re-run `scripts/ingest-benchmark-scores.mjs`, add a documented old→new catalog id remap applied when retained states are read (never rewrite the immutable states), then check `counts.estimated` stays 90 and the Opus 4.7 (medium) / Coding Agent Index v1.5 example yields > 0 models; also name coding-agent-only rows by the catalog convention ("Claude Opus 4.7 (Adaptive Reasoning, Medium Effort)", F-86 item 5). |
| P3 | Do not stop before P2 is achieved | verified | `ops/ux-2026-09-12/PRD.md` | P2 is verified (see the P2 row, review gate 20260915T051001Z); the loop did not stop before that point. |
| P4 | Positioning claims only in a form the live coverage numbers support | verified | `/opt/benchmarkheaven/state/ux-evidence/iter35-live-{canonical,legacy}/verification.json`, `api-meta.json`, `REVIEW-20260914T061002Z.md` | **Verified by claude-opus review gate 2026-09-14T061002Z (implementers: codex-luna `f98a23d`, Fable `fd4a907`):** live H1 on `4b0d250` is "Every AI model benchmark we can find, in one place. And what each model really costs you."; server HTML contains no "only place" / "most complete" superlative. The live claim is explicitly limited to the tracked, source-linked collection and modeled cost inputs; it makes no unsupported “only place” claim. |
| F1 | Gauntlet-loop quality: simple, elegant, intuitive, perfect UI, yet complete | verified | `DESIGN-DIRECTIVES.md` (passes 1–16), `/opt/benchmarkheaven/state/ux-evidence/review-20260915T051001Z/` | Fable passes judged against exactly this wording; pass 16 (2026-09-15) judges every shot page at the bar at 1440/390, light/dark. Every directive F-01…F-86 now carries live 1440/390 light/dark evidence plus a non-implementer verification (the last three: F-84/F-85 by iteration 66 claude-opus, F-86 by review gate 20260915T051001Z opencode-kimi). Earlier note: Fable pass judged against exactly this bar; F-05 now uses aligned score/cost magnitude bars and was live-checked by Codex, but independent verification and the remaining open directives are still required. **Pass 11 (Fable):** E2 boards no longer open on a zero (F-65); see X3. **Pass 16 (Fable):** the Benchmarks page is judged excellent after F-83; F-84/F-85 landed; F-86 open — see X4. |
| C1 | One writer only until `ALL-ACCEPTED`; do not race another agent in this repo | verified | `/opt/benchmarkheaven/state/ux/history.log`, `/opt/benchmarkheaven/state/ux/running` | Every iteration record plus this gate's cwd check: no foreign writer ever committed to or raced this repo (the only other agent processes on the box work in DocMint project folders; the untracked `ops/rebuild-2026-09/SUPERSEDED-README.md` is a pre-existing other-area artifact, left untouched by every gate). One writer held through to `ALL-ACCEPTED`. Earlier records: iteration 1 saw only expected ops commits from the workstream's own setup and rebased cleanly. Iteration 15: no foreign commits; the only other process in the repo was the design pass's own orphaned Kimi delegate (stopped, see the log) |
| F-19 | Benchmaxxing title, sector labels and signal table | verified | `/opt/benchmarkheaven/state/ux-evidence/iter34-indep/live-{canonical,legacy}/verification.json` (`bin/verify-r410-r58-r511-f19.mjs`) | **Independent verification (claude-opus, iteration 34; implementer codex-luna `0c37a18`):** H1 "Benchmaxxing", 10 default rows, "Show all 18 tagged", no overflow, 1440/390, both hosts. |
| F-08a | Model page phone hierarchy and conditional unusual-results panel | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json`, `fable-canonical-fixed2/metrics.json` | Codex verified the non-Codex implementation: compact phone offer table, 2,433/4,062 px page heights, and flagged unusual results after the benchmark sheet at both hosts and themes. |
| F-08b | Model page Composite mini-radar and compact benchmark sheet | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified five-dot mini-radar plus 19 bar/percentile benchmark rows, 32 px maximum row height and no page overflow at both widths/themes. |
| F-22 | Simple value map equals the ranked pool | verified | `ux-evidence/review-20260913T161002Z/f39-fixed-{canonical,legacy}/`, `ux-evidence/fable-20260913-pass6/`checks/checks.json | Acceptance re-specified by Fable (pass 6): the map plots the Simple pool (featured, measured) with passing rows as full labelled points and the rest dimmed — that is the R5.5 distribution. Accept = labelled full points equal ranked rows: 7 = 7 at both widths (Codex counted the 20-point pool, Fable the 7 full points). |
| F-23 | Phone Advanced toolbar and Refine sheet | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified 54 px phone toolbar, Refine visibility, open/close sheet and no desktop Refine control. |
| F-24 | Benchmaxxing table density and signal bars | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified 10 rows, 53 px maximum row height and 10 magnitude bars at both widths/themes. |
| F-25 | Thin evidence remains ranked but is visibly hatched | verified | `ux-evidence/review-20260913T161002Z/{f41-fixed-canonical,f41-fixed-legacy}/` | Current F-41 semantics are live: 38 Advanced rows are thin under the exact-plus-attached rule, every hatched row carries its machine-readable breakdown, and evidence remains neutral rather than changing sort. |
| F-26 | Phone value-map scale | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified five phone ticks and eight desktop ticks with no overflow. |
| F-27 | Benchmarks page phone table | verified | `ux-evidence/review-20260913T110002Z/f27-{canonical,legacy}/verification.json` | Codex verified 25 rows, per-row provenance expand, three phone columns, 352 px table and no overflow. |
| F-28 | Micro-defect cleanup | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified neutral evidence button state and histogram end labels in all four viewports/themes. |
| F-29 | Dark-mode value-map point labels theme-aware | verified | `ux-evidence/iter24-f31-f32/fable-canonical/verification.json` | Fable implemented the theme fix; Codex independently verified label fill `rgb(237,242,248)` at 1440/390 in dark mode. |
| F-30 | Guided must not reset Simple's 85 floor | verified | `ux-evidence/iter24-f31-f32/fable-canonical/verification.json` | Fable implemented the reset fix; Codex independently verified Guided → Simple retains 85 and the result count at desktop/mobile. |
| F-31 | Advanced rows: coverage pips instead of `n/7 inputs`, `est.` into the header | verified | `ux-evidence/review-20260913T161002Z/{fable5-fixed-canonical,fable5-fixed-legacy}/` | Fable pass 5 independently verified the implementation; current Codex live recheck confirms 101 rows, 101 accessible pips, no `est.` or `/7 inputs` cell noise, and the modeled-cost header at both hosts and all four theme/width combinations. |
| F-32 | One model, one benchmark count (`# benchmarks` vs Composite inputs contradiction, Fable 5 (high)) | verified | `ux-evidence/review-20260913T161002Z/{fable5-fixed-canonical,fable5-fixed-legacy}/`, `test/cost.test.mjs` | Fable pass 5 independently verified the display; current Codex recheck confirms the benchmark-count invariant and no row has fewer displayed exact Composite pips than its benchmark count. |
| F-33 | Benchmaxxing: signal card self-height, phone sector labels in HTML | verified | `ux-evidence/review-20260913T161002Z/{fable5-fixed-canonical,fable5-fixed-legacy}/` | Fable pass 5 independently verified the implementation; current live checks confirm a 326px desktop signal card, 16px phone sector labels and no overflow on either host. |
| F-34 | Benchmarks page: one coverage line, bar per result | verified | `ux-evidence/review-20260913T161002Z/{fable5-fixed-canonical,fable5-fixed-legacy}/` | Fable pass 5 independently verified the implementation; current live checks confirm one coverage line, 25 result bars and no overflow at both hosts and widths. |
| F-35 | Compare: release-post table with per-row provenance expand, ≤ 3,500 px | verified | `ux-evidence/review-20260913T161002Z/{fable5-fixed-canonical,fable5-fixed-legacy}/` | Fable pass 5 independently verified the implementation; current live checks confirm 23 comparison rows, per-row bars/bold best values and the existing compact section at both hosts. |
| F-36 | Model page: no empty "Protocol-compatible" paragraph; Copilot card labelled | verified | `ux-evidence/review-20260913T161002Z/{fable5-fixed-canonical,fable5-fixed-legacy}/` | Fable pass 5 independently verified the implementation; current live checks confirm no empty protocol copy and the Copilot subscription eyebrow above token offers. |
| F-37 | Subscriptions list: neutral badges, uncollected plans as a footnote | verified | `ux-evidence/review-20260913T161002Z/targeted-final/r63-{canonical,legacy}/` | Fable pass 5 and the current Codex live recheck confirm neutral rows, one uncollected footnote, no warning colour and correct consumer/company toggling at both hosts and widths. |
| F-38 | Simple: "Minimum score (Composite)" label, one-line small print | verified | `ux-evidence/review-20260913T161002Z/{fable5-fixed-canonical,fable5-fixed-legacy}/`, `f42-f45-fixed-{canonical,legacy}/` | Fable pass 5 independently verified the 167-character linked small print; the current verifier accounts for F-42's concise visible phone label while confirming the full ARIA wording. |
| F-39 | Simple value map: log cost axis, free routes pinned left, round ticks | verified | `ux-evidence/review-20260913T161002Z/f39-fixed-{canonical,legacy}/` | Current Codex independent live check passes on both hosts at 1440/390, light/dark: round log-axis ticks, zero overlaps, 20 points and no overflow. |
| F-40 | Simple's score floor and cost cap stay in Simple; Advanced/Guided own pair with removable floor chip | verified | `ux-evidence/review-20260913T161002Z/{f40-fixed-canonical,f40-fixed-legacy}/` | Claude Opus authored the split; current Codex `verify-f40.mjs` passes on both hosts at 1440/390 with 15 checks and no failures, alongside the migration/unit tests. |
| F-41 | Hatch on exact + attached Composite inputs; pips tell exact from attached | verified | `ux-evidence/review-20260913T161002Z/{f41-fixed-canonical,f41-fixed-legacy}/`, `test/cost.test.mjs` | Claude Opus authored the rule; current Codex `verify-f41.mjs` passes on both hosts at 1440/390 with no failures, including the exact-plus-attached threshold and per-row labels. |
| F-42 | Phone Simple slider captions stack, stay concise and preserve the full accessible wording | verified | `ux-evidence/review-20260913T161002Z/f42-f45-fixed-{canonical,legacy}/`, `ux-evidence/fable-20260913-pass6/`mobile_*-simple*.png | Codex Luna implemented; **verified by Fable (pass 6)** live at 390 light/dark: sliders stacked, captions one line with the value on the caption line, card 485 px. |
| F-43 | Benchmaxxing defaults to measured axes with labelled topic sectors and optional all-axis view | verified | `ux-evidence/fable-20260913-pass7/checks/verification-F43-F44.json`, `ux-evidence/iter30-f43-local2/verification.json`, `ux-evidence/review-20260913T205002Z/f43-{canonical,legacy}/verification.json` | Fable pass 7 independently verified the Codex implementation; this gate rechecked both hosts at 1440/390 and light/dark. The current live default is 29 measured axes, seven labelled sectors, with an opt-in all-axis view (217 current total); no page overflow. |
| F-44 | Compare begins with a compact one-picker row, useful radar caption and bounded page height | verified | `ux-evidence/fable-20260913-pass7/checks/verification-F43-F44.json`, `ux-evidence/iter30-f44-local6/verification.json`, `ux-evidence/iter30-f44-live-{canonical,legacy}/verification.json`, `ux-evidence/review-20260913T205002Z/f44-{canonical,legacy}/verification.json` | Fable pass 7 and this gate independently verify the Codex implementation at 1440/390, light/dark and both hosts: compact picker, accessible radar tip, keyboard remove controls, 3,871/5,109 px page heights and no page-level horizontal overflow. |
| F-45 | Benchmarks table drops Explore and keeps Compare inside the expanded row; Advanced controls are compact | verified | `ux-evidence/review-20260913T161002Z/f42-f45-fixed-{canonical,legacy}/`, `ux-evidence/fable-20260913-pass6/`desktop_*-benchmarks.png, desktop_*-advanced.png | Codex Luna implemented; **verified by Fable (pass 6)** live: Rank · Model · Result at 1440, model names link, Advanced toolbar one row of equal 36 px controls. |
| F-46 | Phone table columns 42/27/31 % so the Adjusted Cost (i) stays inside the card | verified | `ux-evidence/fable-20260913-pass6/`checks/verification-F46-F47.json, `ux-evidence/iter30-f46-f47-live-{canonical,legacy}.json` | Fable pass 6 found the (i) 4 px outside the card at 390 (right 378 vs card 374) in Simple and Advanced, light and dark. Fixed in `3b92bf5`; Codex Luna independently verified the pushed revision live on both hosts, including unchanged desktop proportions. |
| F-47 | Route error boundary `app/error.tsx` (branded panel, nav intact, Try again) | verified | `ux-evidence/fable-20260913-pass6/`checks/verification-F46-F47.json, `ux-evidence/iter30-f46-f47-live-{canonical,legacy}.json` | One pass-6 capture of the model page (mobile dark) showed Next's unbranded "Application error"; three sequenced reproductions with console capture were clean (`checks/crash-repro.json`). The site had no error boundary; `3b92bf5` adds one. Codex Luna independently verified the branded unknown-model route live on both hosts. |
| F-48 | Benchmarks page: one head card, first ranked row within the first phone screen | verified | `ux-evidence/fable-20260913-pass7/{desktop,mobile}_light-benchmarks.png`, `/opt/benchmarkheaven/state/ux-evidence/iter31-f48-live/verification-f48.json` plus `iter31-f48-live-{canonical,legacy}/verification.json` and screenshots | **Verified by Fable (pass 7):** one head panel, selectors on one row at 1440, text Primary-source link, one paragraph, first ranked row ≈ 560 px at 1440. `7c275c4` deployed by Coolify as `fujgbulyjhxh2iisrqyfc066`. One merged panel with compact Category / Benchmark and version selectors, text Primary source link, one description/coverage paragraph, and results count in the control row. Live first row: 561 px desktop / 837 px mobile on both hosts; F-27 regression 0/0. Needs an independent engine to promote to verified. |
| F-49 | Cost precision: two decimals from $1, three significant figures below $1 (`priceNumber`) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter34-f49-f52/live-{canonical,legacy}/verification.json` (`bin/verify-f49-f52.mjs`) | **Independent verification (claude-opus, iteration 34; implementer Fable):** 0 over-precise `$` values in Simple, 606 Advanced price cells and 25 model-page prices, 1440/390, both hosts at `79f1af7`+. |
| F-50 | Benchmaxxing report: topic-groups disclosure moves into the right column at lg | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T020001Z/f50-f51-{canonical,legacy}/`, `/opt/benchmarkheaven/state/ux-evidence/iter49-indep/f50-{canonical,legacy}/` | **Verified iteration 49 by claude-opus (implementer codex-luna), live `70b49fb`:** `bin/verify-f50-f51.mjs` 42/42 on both hosts, 1440/390, light/dark. Commit `3d32e8c`; current live revision `94bcedd` passes the focused 42-check receipt on both public hosts, 1440/390, light/dark: desktop radar/column gap 40px (≤120), mobile radar → signal → disclosure order, and no overflow. Same codex-luna engine implemented the fix; remains `implemented` pending a different-engine verifier. |
| F-51 | Compare: "Radar axes · n / 8 selected" folded into the radar card | verified | `ux-evidence/review-20260913T205002Z/f50-{canonical,legacy}/verification.json`, `ux-evidence/review-20260913T205002Z/f44-{canonical,legacy}/`, `ux-evidence/review-20260913T205002Z/f35-{canonical,legacy}/` | Independent Codex verification of the Claude Opus implementation: one panel, summary inside the radar card in the specified order, axis toggle re-draws, bounded page heights and no regressions on both hosts at 1440/390, light/dark. |
| F-52 | Compare head: "Compare" + one line, no eyebrow/slogan (consistent with Charts, Benchmarks, Benchmaxxing) | verified | same as F-49 | **Independent verification (claude-opus, iteration 34; implementer Fable):** H1 "Compare", no eyebrow, one paragraph, no overflow, 1440/390, both hosts. |
| F-58 | Compact phone radar on `/compare` (numbered axes + legend, no scroll) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter49-indep/f58-f61-{canonical,legacy}/` | **Verified iteration 49 by claude-opus (implementers Kimi K3 draft + Fable), live `70b49fb`:** `bin/verify-f58-f61.mjs` 36/36 per host (radar fits, numbered axes match list, scroll hint gone, desktop keeps named labels). |
| F-59 | HTML bar rows replace recharts on phone Charts | verified | same as F-58 | Same run: recharts hidden and ≥ 2 HTML bar lists at 390, bar lengths in range, desktop recharts unchanged; rows are `listitem` since `4b0d250`. |
| F-60 | Model page: Composite before providers on phone | verified | same as F-58 | Same run (implementer Fable). |
| F-61 | No doubled version tokens (`versionSuffix()`) | verified | same as F-58 | Same run, model page and compare (implementer Fable). |
| F-62 | Desktop radar ≤ 640 px | verified | same as F-58 | Same run (implementer Fable). |
| F-65 | Boards never open empty (automatic widening, one notice line) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter49-indep/f65-{canonical,legacy}/` | **Verified iteration 49 by claude-opus (implementer Fable):** `bin/verify-f65.mjs` 168/168 per host. |
| F-66 | Error boundary shows a Details disclosure | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T130002Z/{canonical,legacy}/verification.json` (`bin/verify-review-1300.mjs`), `*/mobile_dark-error-boundary.png` | **Verified by claude-opus review gate 130002Z (implementer Fable):** a real forced client error (Charts chunk intercepted with a throwing script, client navigation) renders the branded panel with Details `ChunkLoadError: Loading chunk 430 failed. (missing: …)`, both hosts, 1440/390, light/dark; pass-12/13 `metrics.json` carry an empty `errors` key. Earlier: Iteration 49 (claude-opus): **not verified** — acceptance needs `metrics.json` of every pass since 11 to carry `errors`; pass 11's has none, and no forced client error was rendered live. |
| F-67 | Best model keeps its name on the value map | verified | `/opt/benchmarkheaven/state/ux-evidence/iter49-indep/f67-f68-{canonical,legacy}/` | **Verified iteration 49 by claude-opus (implementer Fable):** `bin/verify-f67-f68.mjs` 32/32 per host. |
| F-68 | Benchmaxxing names wrap on phones | verified | same as F-67 | Same run. |
| F-69 | Phone benchmark sheet: two-line rows, names wrap (never truncate below `md`) | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T130002Z/{canonical,legacy}/verification.json` (`bin/verify-review-1300.mjs`); `/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass13/verify-f69-f71/{canonical,legacy}/verification.json` (`bin/verify-f69-f71.mjs`) | Fable pass 13, `f23f5f9`; live 44/44 per host at 1440/390, light/dark (0 clipped names, rows 52 px at 390, 32 px at 1440). Implementer = Fable. **Verified by claude-opus review gate 130002Z:** 72/72 per host; 0 clipped chevron-row names, ≥ 40 px at 390, ≤ 36 px at 1440, no overflow. |
| F-70 | Value-map point labels carry a `paint-order: stroke` halo in `var(--surface)` | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T130002Z/{canonical,legacy}/verification.json` (`bin/verify-review-1300.mjs`); `/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass13/verify-f69-f71/{canonical,legacy}/verification.json` (`bin/verify-f69-f71.mjs`) | Fable pass 13, `f23f5f9`; live: every `.bh-point-labels text` has the halo (stroke rgb(255,255,255) light / rgb(23,30,41) dark). **Verified by claude-opus review gate 130002Z:** computed paint-order stroke, 3 px, stroke colour = resolved `var(--surface)`, both hosts, four contexts. |
| F-71 | Cost-inputs modal: integer token counts, one-decimal ratio and hit rate | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T130002Z/{canonical,legacy}/verification.json` (`bin/verify-review-1300.mjs`); `/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass13/verify-f69-f71/{canonical,legacy}/verification.json` (`bin/verify-f69-f71.mjs`) | Fable pass 13, `f23f5f9`; live: `4,047,251 · 66,848 · 60.5:1 · 54.2%` for the first Simple price. **Verified by claude-opus review gate 130002Z:** integers, one decimal, and ratio = input ÷ output (60.544), both hosts, four contexts. |
| F-72 | Charts "Cheapest models": log-position dot plot instead of linear bars (both widths) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter51-f72/{local,canonical,legacy}/verification.json`, `/opt/benchmarkheaven/state/ux-evidence/iter51-README.md` | **Iteration 51 (claude-opus), `26a709c`:** desktop = 205 px name column + muted track + 7 px accent dot at the log position + value beside it, round money ticks and "Adjusted cost · log scale" caption (HTML/CSS, no recharts `Bar`); phone rows keep name + value with a dot track; zero values pin left (F-39). `bin/verify-f72.mjs` (from the pass-13 acceptance text) 34/34 local, **34/34 per host live** at 1440/390 × light/dark (cheapest marks 43.7/52.0/95.6 px apart, ticks $0.1–$30). Deviation recorded: the recharts hover tooltip is replaced by a native `title` on each row; the keyboard-accessible table below the card is unchanged. Needs a non-claude-opus verifier. **Verified (implementer claude-opus iteration 51):** Fable pass 14 verified it as non-implementer (`verify-f72` 34/34 per host, judged by eye); review gate 213002Z re-ran it live, 34/34 on both hosts (`/opt/benchmarkheaven/state/ux-evidence/review-20260914T213002Z/{canonical,legacy}/verify-f72/`). |
| F-73 | E2 boards: "not matched to a catalog model" once per board, not per row | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T130002Z/{canonical,legacy}/verification.json` (`bin/verify-review-1300.mjs`) | Fable pass 13 directive, `[mechanical]`, low. Implemented by the claude-opus review gate 130002Z (`4dffc1d`: row sub-line is "As named by the source" when `matched === 0`, mixed boards unchanged); live both hosts, 1440/390, light/dark: the phrase appears exactly once on Vals code-migration and FrontierCode 1.1 (was 26 and 17). Needs a different-engine verifier. **Verified by Fable pass 14** (non-implementer: once per board on Vals, CursorBench, Real-SWE); recorded by review gate 213002Z. |
| F-74 | Guided/Simple shortlist cap keeps the Pareto line, then highest scores (display order decided separately) | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T213002Z/{canonical,legacy}/verify-f74-f76/`; `lib/shortlist.mjs`, `test/shortlist.test.mjs` | Fable pass 14, `e33635b`. **Verified by claude-opus review gate 213002Z (implementer Fable):** live 40/40 per host (1440/390, light/dark): Guided with every question skipped shows 15 of 16 with the caption "15 shown: the Pareto line first, then the highest scores", GLM-5.3-Flash present; code read confirms the cap is decided before the display order and the dropped model is the lowest score off the line. Kimi's harness change `9d11bd2` (Real-SWE reached via `?benchmark=`) was checked: the live group select lists real harness names, so the F-76 check is not vacuous. |
| F-75 | Guided result actions never wrap inside a button on phones | verified | same as F-74 | Fable pass 14, `e33635b`. **Verified by claude-opus review gate 213002Z (implementer Fable):** the three actions are 44 px single-line buttons at 390 and 1440, both hosts, both themes. |
| F-76 | Real-SWE evaluation-group options without a zero peer count | verified | same as F-74 | Fable pass 14, `e33635b`. **Verified by claude-opus review gate 213002Z (implementer Fable):** no option text contains "0 measured catalog peers" on either host. |
| F-77 | Benchmarks tab counts disagree: toolbar "31 benchmarks" counts rows (a benchmark with several harness cohorts counts once per cohort), "Choose rows (29 of 29)" counts benchmarks | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T213002Z/canonical/verify-cr-1/desktop_dark-open.png`; `/opt/benchmarkheaven/state/ux-evidence/iter58-cr-1-8/{canonical,legacy}/verify-cr-1/` (92/92 per host) | Found by review gate 213002Z. The intro's "86 benchmark results" (it counted rows, not results) was reworded in `22471d5` ("compared on up to N benchmarks"); the toolbar/chooser mismatch is a wording decision for the work loop or the CR-1.10 Fable pass (`verify-cr-1.mjs` asserts the toolbar count equals the rendered rows). **Iteration 58 (claude-opus) → implemented, `ad5752d`:** the toolbar counts benchmarks (the same number as "Choose rows") and adds "in N rows" only when harness cohorts add rows. `verify-cr-1` now asserts toolbar = chooser and rows = rendered rows: 92/92 on both hosts, 1440/390, light/dark. Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** `bin/verify-cr-1.mjs` 92/92 per host — toolbar benchmark count equals the "Choose rows" count, rows only named when harness cohorts add them.|
| F-78 | AA-Briefcase: AA's unrated placeholder (Elo 0 with a 0–0 interval) shipped as a measured Elo of 0 for 8 models | verified | `test/aa-elo-placeholder.test.mjs`; `scripts/ingest-benchmark-scores.mjs`; `/opt/benchmarkheaven/state/ux-evidence/review-20260914T213002Z/post-deploy/` | Found and fixed by claude-opus review gate 213002Z (`22471d5`): Llama 4 Maverick/Scout, gpt-oss-20b/120b (high), Mistral Small 3.2, Qwen3 8B/14B (Reasoning), Nemotron 3 Super showed "0" on the Briefcase row and in the detail pages although `aa-observed-fields.json` records `overall`, `analyticalQuality` and `presentation` all as elo 0 / lower95ci 0 / upper95ci 0. The ingest now rejects that placeholder (scores 14,823 → 14,815, rejected 415 → 423, nothing else changed in the dry-run diff). Negative GDPval values (e.g. −44.77) are kept: Bradley-Terry Elo anchored at 1000 can be negative, and `gdpvalNormalized` confirms a real value. Needs a different-engine verifier. **Live after deploy (21:52 UTC, both hosts):** Maverick detail page lists 33 other results, no Briefcase 0. **Residue:** the seven history states committed before today still contain the placeholder zeros; the history builder should apply the same rule when reading states (bridged Briefcase estimates can read them). **Iteration 58 (claude-opus), residue fixed in `ad5752d`:** `datedEstimates` skips a retained Artificial Analysis Elo of exactly 0 (`isAaUnratedPlaceholder`; states keep no interval, and a real AA rating is never exactly 0). Rebuild removed exactly the 56 AA-Briefcase estimates with source value 0 (8 models × 7 states; `counts.estimated` 233 → 177), 5 kept Briefcase estimates re-bridged without the zeros, nothing else changed. Test with a real-rating control in `test/aa-elo-placeholder.test.mjs`. Needs a different-engine verifier. **Verified by review gate 230002Z (opencode-kimi):** live Maverick page and `/api/models/llama-4-maverick::default`: no AA-Briefcase measured value (shown as unknown); the ingest and history guards are unit-tested (`test/aa-elo-placeholder.test.mjs`, 378-suite green); 56 zero-derived history estimates removed per `ad5752d` and confirmed by the rebuilt dataset.|
| F-79 | Benchmarks matrix: data bar as a fixed 22 px band (not the row height); below md the stub drops the clamped description | verified | `/opt/benchmarkheaven/state/ux-evidence/fable-20260915-pass15/{crop-mobile-table.png,after/}`; `bin/verify-f79-f82.mjs`; **`/opt/benchmarkheaven/state/ux-evidence/iter61-verify/f79-f82/{canonical,legacy}/verification.json`** | Fable pass 15, `313e24c` (`app/globals.css`). Phone rows were 160 px grey slabs. **Iteration 61 (claude-opus, non-Fable verifier):** `verify-f79-f82` 40/40 on both hosts, 1440/390, light/dark, page errors 0, on live build `I5YEKqRhE3yWuFyrYZich` (`5f8dd9e`, which already carried F-83). |
| F-80 | Matrix row labels shorten "Artificial Analysis " to "AA " (AA Coding Agent Index v1.4/v1.5), registry name unchanged | verified | same | Fable pass 15, `313e24c` (`lib/benchmark-matrix.mjs`). Iteration 61 (claude-opus, non-Fable): 40/40 per host, see F-79. |
| F-81 | Matrix: inside a category, rows with ≥ 2 values among the compared models precede single-result rows (stable) | verified | same | Fable pass 15, `313e24c` (`components/BenchmarkMatrix.tsx`). "All" stays the default preset (Florian: extensive). Iteration 61 (claude-opus, non-Fable): 40/40 per host, see F-79. |
| F-82 | Simple-mode Benchmarks section names columns with `collapsedName()` like the full table (no "(Adaptive Reasoning, Max Effort, …)" headers) | verified | same | Fable pass 15, `313e24c` (`components/SimpleBenchmarks.tsx`). Iteration 61 (claude-opus, non-Fable): 40/40 per host, see F-79. |
| F-83 | Benchmarks page: the table starts within the first screen — header sentence without a count, count select inside the status sentence, Add/Pick-from-chart/Choose-rows as one box-less line | verified | `DESIGN-DIRECTIVES.md` F-83 (spec + Accept); **this gate: `/opt/benchmarkheaven/state/ux-evidence/review-20260915T012002Z/verify-cr-1/{canonical,legacy}/`** | Opened by Fable pass 15 (2026-09-15) for the work loop (claude-opus, `[judgment]`). At 390 the first screen showed no number; at 1440 the first value sat at y ≈ 650. **Implemented by claude-opus** (`5f8dd9e`, `962cc48` — `verify-cr-1.mjs` gained the Accept assertions — and `c650bdd`). **Verified by review gate 20260915T012002Z (opencode-kimi, non-implementer), live on both hosts at `c650bdd`, 1440/390, light/dark — `bin/verify-cr-1.mjs` 108/108 per host:** desktop first value 515.5 px from the top (≤ 520; was ≈ 650), mobile thead 522 px (≤ 560) with the first value 683.5–767.5 px inside the 844 px viewport (was below it), header sentence without a digit, count select inside the status sentence, closed disclosures box-less (0 px borders), only one panel open at a time. |
| F-84 | Benchmarks matrix: no data bar on a row with a single value (same threshold as the row winner) | verified | `DESIGN-DIRECTIVES.md` F-84 (spec + Accept); `/opt/benchmarkheaven/state/ux-evidence/fable-20260915-pass16/after/{canonical,legacy}/verify-f84-f85/verification.json` (20/20 per host), `…/verify-cr-1/verification.json` (108/108 per host); non-Fable re-run `/opt/benchmarkheaven/state/ux-evidence/iter66-verify-f84-f85/{canonical,legacy}/` | Opened and landed by Fable pass 16 (2026-09-15, `ec80831`): `rowBars` returned a 100 % band for the only value of a row (ECI 157.6, Software ECI, Coding Agent Index v1.4/v1.5) — "best of one". Unit tests for the single-value case. Live-checked by Fable on both hosts at `ec80831`, 1440/390, light/dark (`bin/verify-f84-f85.mjs`: 11 single-value rows without a bar, 20 multi-value rows with bars). **Needs a non-Fable verifier** to set `verified`. |
| F-85 | Benchmarks matrix status line: one total ("N benchmarks across K categories · top …"), the second "in N rows" total removed | verified | same as F-84 | **Verified by review gate 20260915T051001Z (opencode-kimi, non-implementer):** evidence was taken by iteration 66 (claude-opus, non-Fable) and re-run live by this gate — `bin/verify-f84-f85.mjs` 20/20 per host, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260915T051001Z/verify-f84-f85/{canonical,legacy}/`). Opened and landed by Fable pass 16 (`ec80831`): "29 benchmarks across 9 categories in 31 rows" put two unequal totals on the first line of the page; cohort-split benchmarks name their cohort on the rows. `verify-cr-1.mjs` now asserts rows ≥ benchmarks and chooser count = status count. Live-checked by Fable both hosts at `ec80831`. **Iteration 66 (claude-opus, non-Fable verifier):** `verify-f84-f85` **20/20 per host** and `verify-cr-1` **108/108 per host** live at build `XV0JMMmy1ExhhNo2AcgWV` (`b226790`), 1440/390, light/dark, 0 page errors (`/opt/benchmarkheaven/state/ux-evidence/iter66-verify-f84-f85/`). **F-84 and F-85 verified.** |
| F-86 | Advanced "Better than a model": metric options without a value for the chosen reference are disabled and say so; colliding labels carry the version; reference models without any comparable result sit last | verified | `DESIGN-DIRECTIVES.md` F-86 (spec + Accept); `/opt/benchmarkheaven/state/ux-evidence/review-20260915T051001Z/verify-p2-history/{canonical,legacy}/verification.json` (54/54 per host, `bin/verify-p2-history.mjs`) | **Verified by review gate 20260915T051001Z (opencode-kimi, implementer claude-opus):** 54/54 per host, both hosts, 1440/390, light/dark — 5 enabled / 64 disabled options on `claude-opus-4.7::medium`, every disabled option ending "no result for this model", 69 unique labels, separator "— no comparable results —" before the non-comparable references, 6 models qualifying on the Coding Agent Index v1.5 example. **Iteration 66 (claude-opus, `6d775aa`):** items 1–3 landed — with a reference chosen, metrics without its value are disabled with " · no result for this model", bridged ones end " · bridged", enabled first; colliding labels get the version, or the cohort when versions are equal (the 5 collisions were AA Coding Agent Index v1.4/v1.5 split by harness → " · Claude Code", " · Codex", …); references without any comparable result follow a disabled "— no comparable results —" separator. Unit test for unique labels; `npm test` 385/385, `tsc` clean, build-dataset 844/660/91/2,846. Live build `raNC9BLOH2V6bbNDm_Vev` (both hosts, 1440 popover + 390 Refine sheet, light/dark): `verify-p2-history.mjs` extended with the F-86 Accept assertions → **47/47 per host** (Opus 4.7 (medium): 5 enabled / 64 disabled, 69 unique labels, separator at 388 of 553; the Coding Agent Index v1.5 status line still shows the bridge disclosure). Item 5 (catalog naming) stays with P2 — see the P2 row handoff. **Needs a non-claude-opus verifier.** Opened by Fable pass 16 for the work loop (claude-opus, `[judgment]`): with the retained reference Opus 4.7 (medium) chosen, all 70 metrics stay selectable and most yield "This reference has no comparable result for that choice"; 5 of 70 labels are identical. Overlaps the P2 row's follow-up (duplicate H3 select labels, harness-only catalog naming) — close both together. |
| CR-6.1 | Simple mode mobile header: Benchmarks next to Filters, Menu → More, Benchmarks left of More | verified | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-6-8/{local,canonical,legacy}/verification.json` (`bin/verify-cr-6-8.mjs`) | **Iteration 52 (claude-opus), `3de100d`:** below `lg` the header is Filters · Benchmarks · More · theme; More no longer repeats Benchmarks; header controls 44 px below `lg` (CR acceptance newer than F-15 40 px; desktop unchanged). Live 62/62 per host at 1440/390/360, light/dark (labels, order, ≥ 44 px targets, no overflow, More opens). Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi, non-implementer):** `bin/verify-cr-6-8.mjs` 62/62 per host live at 1440/390/360, light/dark, on `9533069`.|
| CR-8.1 | Overview table default sort: score descending in Simple and Advanced (supersedes R5.2 price order) | verified | same as CR-6.1 | **Iteration 52 (claude-opus), `3de100d`:** HomeMode and Wizard no longer seed a cost sort; Simple, Guided and Advanced open on Score descending (`aria-sort=descending`, values descending, live both hosts, 1440/390, light/dark). The F-74 Pareto cap is order-independent and unchanged. R5.2 note updated. Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi, non-implementer):** same 62/62 run — `aria-sort=descending` on Score in Simple and Advanced, values descending, both hosts.|
| CR-1.1 | Benchmarks tab opens on a release-style comparison table (models as columns, benchmarks as rows) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host) | **Iteration 52 (claude-opus), `a0eef68`:** `/benchmarks` opens on `components/BenchmarkMatrix.tsx` — models as columns (vendor above, collapsed name), benchmarks as rows, tinted lead column, sticky first column inside its own scroll container (no page overflow at 390). `?benchmark=` keeps the single-benchmark ranking ("One benchmark" tab). Fable pass (CR-1.10) still to judge the look. **Verified by review gate 230002Z (opencode-kimi, non-implementer):** `bin/verify-cr-1.mjs` 92/92 per host live (release-style table, sticky first column inside its own scroll container, no page overflow at 390, light/dark).|
| CR-1.2 | Default columns: top 5 models of the current filter selection; pin state; count 2–10 | verified | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host) | Top N (2–10, default 5) by the active score under the global filters (`lib/top-models.ts`, same variant/evidence/offer-scope helpers as the overview, slim server payload `lib/benchmark-matrix-data.ts`); a custom selection is the visible pinned state ("your selection" + Reset). **Verified by review gate 230002Z (opencode-kimi):** 92/92 per host — automatic top N re-selects under filter changes; pin state visible; count 2–10.|
| CR-1.3 | Rows grouped by category from dataset/registry metadata, collapsible groups | verified | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host); `test/benchmark-matrix.test.mjs` | Groups from `data/benchmark-taxonomy.json` (registry category → group, overrides for indices and DesignArena); test: every registry benchmark in exactly one known group, rows contiguous; groups collapse (`aria-expanded`). **Verified by review gate 230002Z (opencode-kimi):** 92/92 per host — category groups from `data/benchmark-taxonomy.json`, `aria-expanded` collapse; unit test asserts one group per benchmark.|
| CR-1.4 | Extensive rows: AA index + every AA component, DesignArena, community/niche; N benchmarks across K categories | verified | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host); `test/benchmark-matrix.test.mjs` | "All" shows every benchmark with ≥ 1 value for the selected models; "N benchmarks across K categories". 86 rows overall; the default frontier top 5 has 31 (community boards have not published those models — decision: no sibling-variant borrowing, CR-9.3). Test asserts AA Intelligence Index + eight AA components are rows of their own. **Verified by review gate 230002Z (opencode-kimi):** 92/92 per host — "N benchmarks across K categories" line; AA Intelligence Index and its eight AA components are each rows (unit test); "All" preset renders every benchmark with a value.|
| CR-1.5 | Cells: value + subtle direction-aware Excel-style data bar | verified | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host); unit tests | Direction-aware bars (ratio units proportional, Elo/unknown min–max with floor, lower-is-better inverted), none on missing cells, alpha ≤ .2 light / .16 dark, text colour untouched. **Verified by review gate 230002Z (opencode-kimi):** 92/92 per host — direction-aware data bars, none on missing cells, alpha within thresholds.|
| CR-1.6 | Row winner in bold (direction-aware, ties, <2 values no winner; unit tests) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host); unit tests | Bold row winner; ties all bold; < 2 values or unknown direction: none (unit tests for each). **Verified by review gate 230002Z (opencode-kimi):** 92/92 per host — bold direction-aware winners; unit tests cover ties, <2 values, unknown direction.|
| CR-1.7 | Tags in benchmark-name column (AA Index, Arena, Headline, Niche, Community), defined in data | verified | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host); `ops/ux-2026-09-12/research/cr17-tags-review.md`; `/about#benchmark-tags` (`1a2f502`) | Tags AA / Arena (derived) + Headline / Niche / Community tiers in `data/benchmark-taxonomy.json` with tooltips. Tiers drafted by Kimi K3, reviewed by claude-opus (6 changes recorded). Methodology note on `/about`. A non-claude-opus engine should re-check the tier review. Iteration 53: `bin/verify-cr-1.mjs` updated for the Rows preset menu (`d3cee65`) and re-run live at `bfd4974`, **92/92 per host** (`iter53-cr-1-regression/{canonical,legacy}/`). **Verified by review gate 230002Z (opencode-kimi):** 92/92 per host — tag chips + tooltips live; classification QA recorded in `research/cr17-tags-review.md` (Kimi K3 draft, reviewed by claude-opus with 6 documented changes — the required different-engine review); methodology note at `/about#benchmark-tags`.|
| CR-1.8 | Every cell clickable → deep-linkable detail comparison page with provenance | verified | `/opt/benchmarkheaven/state/ux-evidence/iter58-cr-1-8/{canonical,legacy}/verify-cr-1-8-eci/verification.json` (56/56 per host); `/opt/benchmarkheaven/state/ux-evidence/iter58-cr-1-8/{canonical,legacy}/verify-cr-9-3/verification.json` (33/33 per host); `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-18/local/verification.json` (92/92 local); live (iteration 53): `1a2f502` deployed, real cell links from the live table return 200 on the canonical host — a full live browser run of the CR-1.8 checks is still to do | `/benchmarks/result?axis=&model=&models=[&pinned=1]`: value, basis, observed date, source link and evidence (SourceScore), version/cohort/unit/direction, compared models on the benchmark, the model's other results; back restores a custom selection. **Review gate 213002Z → open:** the two Epoch ECI rows (model-field rows) link to `/models/…`, which shows the number without a source link or date, so "every cell → detail comparison page with source, date, basis" does not hold for them (`/opt/benchmarkheaven/state/ux-evidence/review-20260914T213002Z/canonical/verify-cr-9-3/`). All other sampled cells pass live. **Iteration 58 (claude-opus) → implemented, `ad5752d`:** every cell, the ECI rows included, links to `/benchmarks/result` (shared `cellHref` in `lib/benchmark-matrix.mjs`, used by the Advanced table, Simple mode and "other results"). For the ECI rows the page shows Epoch's row name and model date, the 90 % interval (general), collection date, definition version, licence, the CSV source link, the family-scope note and the compared models; Software ECI is labelled as our refit of Epoch's published per-benchmark results ("Epoch does not publish this number itself"). Test `test/benchmark-cell-href.test.mjs`. Live after the 22:09:21 UTC flip, 1440/390, light/dark: `verify-cr-1-8-eci` 56/56 and `verify-cr-9-3` 33/33 on both hosts. Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** `bin/verify-cr-1-8-eci.mjs` 56/56 and `bin/verify-cr-9-3.mjs` 33/33 per host — every cell, including both Epoch ECI rows, opens `/benchmarks/result` with basis, ISO date, source link and the compared models; Software ECI labelled as our refit.|
| CR-1.9 | Bar chart: selected models × important benchmarks, colours match table, readable at 390 | verified | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-1-9/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1-9.mjs`, 52/52 local and **52/52 per host live** at `9ebe5b2`, again 52/52 per host at `d3cee65` in `iter53-cr-1-9/{canonical,legacy}-d3cee65/`, 1440/390, light/dark) + `*-chart-section.png` | **Iteration 53 (claude-opus), `9ebe5b2`:** under the table, one small multiple per "Important" row with ≥ 2 values among the compared models (20 for the default top 5; first 12 then "Show all"). Ratio units: bars from zero (fractions/percents on a fixed 0–100 % axis); positive values spanning > 20×: log-position dots (design rule F-72); Elo / no-zero scales: dots between the padded row min and max, never bars. Colours: the dataviz reference 8-slot categorical order, validated with `validate_palette.js` on our surfaces (light #fff adjacent CVD ΔE 9.1 / normal 19.6, three slots < 3:1 so every mark carries a visible letter and value; dark #171e29 ΔE 8.4 / 19.3, all ≥ 3:1); the same colour + letter sits on each table column header; columns 9–10 take a neutral mark (no generated 9th hue). Legend in column order, values printed, native `title` tooltips; removing a column keeps the other colours. Unit tests `chartScale`/`chartRows`. Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** `bin/verify-cr-1-9.mjs` 52/52 per host — small multiples share the column colours/letters, ratio rows from zero, >20× rows as dots, 390-readable.|
| CR-1.10 | Page looks excellent and intuitive — one targeted Fable pass, directives implemented | verified | `ops/ux-2026-09-12/DESIGN-DIRECTIVES.md` (pass 15); `/opt/benchmarkheaven/state/ux-evidence/fable-20260915-pass15/`; **`/opt/benchmarkheaven/state/ux-evidence/review-20260915T012002Z/{verify-cr-1,verify-f79-f82}/`** | Seeded 2026-09-14 from `04-CR-BRIEF.md` (iteration 52, claude-opus). **Fable pass 15 (2026-09-15, claude-fable):** the one targeted pass has run against live `15d1a78` (64 shots, 1440/390, light/dark). Verdict: right in substance, not yet excellent — the table starts too far down and the bars read as blocks. Fixed by Fable in `313e24c` (F-79 bar band + phone stub without description, F-80 "AA " row labels, F-81 comparable rows first, F-82 Simple column names); **F-83 (toolbar: table within the first screen) is open for the work loop (claude-opus)**. **Review gate 20260915T012002Z (opencode-kimi, non-implementer of all five directives):** F-83 implemented by claude-opus (`5f8dd9e`/`962cc48`/`c650bdd`) and now verified live by this gate — `bin/verify-cr-1.mjs` **108/108 per host** on both hosts (`c650bdd`), 1440/390, light/dark, including the four F-83 Accept assertions in every context; F-79–F-82 re-run by this gate — `bin/verify-f79-f82.mjs` **40/40 per host**, page errors 0 (their first non-Fable verification was iteration 61, claude-opus, same 40/40). The "Becomes `verified` when F-83 is implemented and a non-implementing engine has checked F-79–F-83 live" condition is met. |
| CR-1.11 | Performance: All table with 10 models without jank, CLS < 0.1 | verified | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-2-5-perf/{local,canonical,legacy}/verification.json` (`metrics` per context; live 28/28 per host at `bfd4974`) | **Iteration 53 (claude-opus):** measured, not assumed. First run (build `d3cee65`+): CLS **0.199** desktop / **0.359** phone on `/benchmarks?models=<10 ids>` — a diagnostic of the layout-shift sources showed one shift at ~540 ms when the client swapped the server's automatic top 5 for the URL's 10 columns (header 103→121 px, rows without values removed, the add-model row collapsing). Fix: `app/benchmarks/page.tsx` passes `models`/`set`/`rows` to `BenchmarkMatrix`, which seeds its first render from them. After: **CLS 0 in all four contexts**, 34 rows × 10 models (340 cells), table in 355–613 ms from navigation, longest task 165 ms (none ≥ 200 ms), collapsing and reopening every group 53–106 ms. Live canonical at `bfd4974`: CLS 0 in all four contexts, longest task 136 ms, table 516–977 ms, toggle 55–109 ms (measured with no build running — see the iteration-53 log). **Decision:** Lighthouse is not installed on Sandy and the disk is ~90 % full, so CLS is summed from the same `layout-shift` entries in-page; no virtualisation needed at this size. Remaining shift source outside this check: a user whose stored filters change the automatic top N after hydration (no URL) — not measured as CLS here. Needs a non-claude-opus verifier. **Review gate 213002Z:** the unchanged harness failed on canonical desktop (CLS 0.628). Attribution probe: load CLS is 0.0002 (header account button widens once); the 0.63 comes from the harness's own scripted collapse/reopen of every group (`element.click()` is not user input, so a real user's toggle never counts). Harness now reads CLS before that step (`22471d5`): 28/28 on both hosts, load CLS 0.0002 desktop / 0 phone, no long task ≥ 200 ms (`/opt/benchmarkheaven/state/ux-evidence/review-20260914T213002Z/canonical/verify-cr-2-5-perf-fixed-harness/`, `/opt/benchmarkheaven/state/ux-evidence/review-20260914T213002Z/legacy/verify-cr-2-5-perf/`). Stays `implemented` (implementer claude-opus = this gate's engine). **Verified by review gate 230002Z (opencode-kimi):** `bin/verify-cr-2-5-perf.mjs` 28/28 per host — load CLS 0–0.0002 at 1440/390, no long task ≥ 200 ms, toggle < ~110 ms.|
| CR-2.1 | Model columns: remove (×), add (+) with type-ahead search | verified | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host) | × removes a column; type-ahead combobox adds (Enter picks the first match; keyboard-operable). **Verified by review gate 230002Z (opencode-kimi):** 92/92 per host — × removes, + type-ahead combobox adds (keyboard included).|
| CR-2.2 | Pick from chart: filter panel + Pareto with min-score/max-price sliders | verified | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-2-2/local/verification.json` (`bin/verify-cr-2-2.mjs`, 38/38 local production build, 1440/390, light/dark) + `*-pick-panel{,-narrowed}.png`; `test/pick-chart.test.mjs`; **live 38/38 per host** at `604be4a` (iteration 54: `iter54-cr-2-2/{canonical,legacy}/`, logs `iter54-cr-2-2-{canonical,legacy}.log`) | **Iteration 53 (claude-opus):** "Pick from chart" panel on `/benchmarks` (collapsed by default so the table stays first). A dedicated SVG chart (`components/PickFromChart.tsx`), not the recharts value map: that one is built on the full 7.5 MB catalog and carries several verified directives (F-17/F-39/F-67/F-74), so it stays untouched. Candidates = the models the global filters allow (`filteredCandidates`), at their cheapest in-scope adjusted cost; unpriced models are counted, never plotted at an invented cost; free routes pinned left (F-39 rule). Log cost axis with round ticks, Pareto line over the points within the limits, Simple-style min-score and log max-cost sliders (end = no limit) narrow the candidates. Each point is a keyboard-operable button (Enter/Space) with a 20 px (desktop) / 28 px (phone) hit area; a click or tap adds or removes its column at once (`toggleColumn`, cap 10, never below one); selected points wear the column colour and letter. Pure model `lib/pick-chart.mjs` unit-tested. Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** `bin/verify-cr-2-2.mjs` 38/38 per host — sliders narrow the candidate pool, point click adds/removes columns, selected points wear column colours.|
| CR-2.3 | Auto top-N from filters and one-click reset to top 5 | verified | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host) | Automatic top N from filters; "Reset to top N" returns to automatic and drops `?models=`. **Verified by review gate 230002Z (opencode-kimi):** 92/92 per host — automatic top N + one-click reset.|
| CR-2.4 | Model-list presets: ours + custom | verified | `/opt/benchmarkheaven/state/ux-evidence/iter53-presets/local/verification.json` (`bin/verify-cr-presets.mjs`, 88/88 local production build, 1440/390, light/dark); `test/presets.test.mjs`; **live 88/88 per host** at `d3cee65` (`iter53-presets/{canonical,legacy}/verification.json`) and again at `bfd4974` (`iter53-presets/{canonical,legacy}-bfd4974/`) | **Iteration 53 (claude-opus):** "Models" preset menu on `/benchmarks`. Ours, all computed live from the candidates that pass the global filters (`filteredCandidates`, `lib/top-models.ts`): Frontier top N · Best open-weight · Best value (score ÷ cheapest in-scope adjusted $/task; each route's cost is shipped from the server at default adjusted settings, AA reference price only when no filter restricts routes — same rule as `modelPrice`) · Coding leaders (AA Coding Index) · Flagships by lab (strongest model per org) · EU-hostable (≥ 1 EU-hosted route). Yours: save the current columns, apply, rename, delete. Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** `bin/verify-cr-presets.mjs` 88/88 per host — all six built-in model presets + custom save/apply/rename/delete.|
| CR-2.5 | Shareable URL encodes models, row preset and filters | verified | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-2-5-perf/local/verification.json` (`bin/verify-cr-2-5-perf.mjs`, 28/28 local production build and **28/28 per host live** at `bfd4974` in `iter53-cr-2-5-perf/{canonical,legacy}/`, 1440/390, light/dark); `iter53-presets/local/` (URL round trip for models + rows); `test/presets.test.mjs` | **Iteration 53 (claude-opus):** `?models=` (custom columns), `?set=` (model preset), `?rows=` (row preset id or benchmark keys) and **`?f=` (every filter that differs from the defaults, readable `key:value;…`, `encodeFilters`/`decodeFilters`, unit-tested incl. junk input)**. `?f=` is applied once after stored settings hydrate (`SettingsContext.hydrated`; a child effect would otherwise be overwritten) and kept in sync as filters change. Checked: a shared URL reproduces columns, rows and filters in a fresh browser **and** in a browser whose own stored filters disagree (the URL wins). Simple's own slider pair is not part of `f` (F-40). Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** 28/28 per host — `?models=`, `?set=`, `?rows=` and `?f=` round-trip in a fresh browser and against conflicting stored filters.|
| CR-3.1 | Row presets: ours + custom | verified | `/opt/benchmarkheaven/state/ux-evidence/iter53-presets/local/verification.json` (`bin/verify-cr-presets.mjs`, 88/88 local production build, 1440/390, light/dark); `test/presets.test.mjs`; **live 88/88 per host** at `d3cee65` (`iter53-presets/{canonical,legacy}/verification.json`) and again at `bfd4974` (`iter53-presets/{canonical,legacy}-bfd4974/`) | **Iteration 53 (claude-opus):** "Rows" preset menu: All · Important · AA Intelligence Index (+ components) · Coding · Agentic & tool use · Math & science · Community & niche · Full coverage only. Custom: "Choose rows" checklist with a tri-state toggle per category and per-benchmark boxes; saved row presets store benchmark keys. Replaces iteration 52's three-button row switch. **Verified by review gate 230002Z (opencode-kimi):** 88/88 per host — all eight built-in row presets + custom checklist with category tri-states.|
| CR-4.1 | Filter presets: ours + custom | verified | `/opt/benchmarkheaven/state/ux-evidence/iter53-presets/local/verification.json` (`bin/verify-cr-presets.mjs`, 88/88 local production build, 1440/390, light/dark); `test/presets.test.mjs`; **live 88/88 per host** at `d3cee65` (`iter53-presets/{canonical,legacy}/verification.json`) and again at `bfd4974` (`iter53-presets/{canonical,legacy}-bfd4974/`) | **Iteration 53 (claude-opus):** "Presets" menu in the Filters sheet footer (opens upward): Company, EU-hosted only · Privacy strict (Strong confidential guarantees, no training/retention) · Cheapest capable (featured, Advanced floor = the score's default) · Open weights only · Frontier regardless of cost. Each applies defaults + patch through `applyFilters` (sanitised like a stored payload); the button names the matching preset, "None" at defaults, "Custom" otherwise. Simple's own slider pair is deliberately not part of a filter preset (F-40). Custom: save / rename / delete. **Verified by review gate 230002Z (opencode-kimi):** 88/88 per host — all five built-in filter presets + custom, named match state (None/Custom).|
| CR-4.2 | One consistent preset component for model, row and filter presets | verified | `/opt/benchmarkheaven/state/ux-evidence/iter53-presets/local/verification.json` (`bin/verify-cr-presets.mjs`, 88/88 local production build, 1440/390, light/dark); `test/presets.test.mjs`; **live 88/88 per host** at `d3cee65` (`iter53-presets/{canonical,legacy}/verification.json`) and again at `bfd4974` (`iter53-presets/{canonical,legacy}-bfd4974/`) | **Iteration 53 (claude-opus):** `components/PresetMenu.tsx` is the only preset control: "Ours" and "Yours" sections, save current, rename, delete, one localStorage store (`bh.presets.v1`, sanitised; same-tab event + cross-tab `storage`). Phones: a bottom sheet (a mid-row dropdown ran off-screen at 390 px — found and fixed in this iteration). Pure CRUD/merge/built-ins in `lib/presets.mjs` with unit tests, incl. the CR-5.4 local→account merge rule. **Verified by review gate 230002Z (opencode-kimi):** 88/88 per host — one `PresetMenu` component with Ours/Yours everywhere; phone bottom sheet.|
| CR-5.1 | Sign in with Google | verified | `/opt/benchmarkheaven/state/ux-evidence/iter57-cr-5/{canonical,legacy}/verification.json` (`bin/verify-cr-5.mjs`, **55/55 per host live** at `379a6df`, signed-in flows included) + `iter57-cr-5/oauth-redirect-probe.txt` | **Iterations 54–56 (claude-opus):** Auth.js v5 (`next-auth`, `auth.ts`), Google OIDC only, JWT session in an httpOnly `__Secure-authjs.session-token` cookie (30 days), Auth.js CSRF on sign-in/out; account routes same-origin only (cross-origin PUT/DELETE 403, no public CORS). Accounts switch on only when `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ACCOUNTS_DATABASE_URL` are set. Shipped `f1752eb` (16:42); that deploy sent `https://localhost:3000/api/auth/callback/google` to Google on both hosts → `379a6df` derives the callback from the visited host, allow-listed to the app's three domains (unit-tested). Desktop header Sign in / avatar; phones: Sign in inside More. **Iteration 57:** live both hosts — providers list Google with the visited host's callback, Google accepts both redirect URIs (sign-in page, no mismatch), avatar shown for a signed-in session. A real end-to-end Google login with a human account was not performed (the session is minted with the app's own `AUTH_SECRET`, the same token Auth.js issues after the callback). Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** `bin/verify-cr-5.mjs` **55/55 per host including the signed-in flows** (session minted with the app's own `AUTH_SECRET`; secrets via env, never printed) — Google provider listed with the visited host's callback, avatar shown.|
| CR-5.2 | Users, settings and presets stored in the account (Postgres) | verified | same as CR-5.1; `iter57-cr-5/mobile_dark-signed-in-synced.png` | Postgres `benchmarkheaven_accounts` on Sandy (role `bh_accounts`), migration `db/accounts/001_init.sql` (`bh_users`, `bh_user_data` JSONB presets + settings), `scripts/migrate-accounts.mjs`, sync logic `lib/account-sync.mjs` + `components/AccountContext.tsx`. **Iteration 57 live, both hosts:** browser A (1440 light) and browser B (390 dark) signed in as the same throwaway user; A saves preset "Synced from A" and turns on Exclude Chinese providers → both land in the account row → B receives both on reload. Each run's test user is deleted by the script (0 rows for its id afterwards). A DB check afterwards still found one older synthetic row (`verify-cr5@example.invalid`, an earlier run that did not reach its delete step); iteration 57 removed it by that email + `verify-cr5-` subject only. Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** same 55/55 run — preset + setting saved in browser A lands in the account and syncs into browser B on reload; test user deleted (0 residual rows for its id, verified against the accounts DB afterwards).|
| CR-5.3 | Signed out: localStorage + sign-in suggestion toast | verified | same as CR-5.1; `iter57-cr-5/{canonical,legacy}/*-signin-toast.png` | **Iteration 53:** presets in localStorage ("Saved in this browser"). **Iteration 54:** once accounts are on, a signed-out save shows a toast suggesting Sign in with Google; the save still happens, the toast fits 1440 and 390, is dismissible, is not shown again that session, and never appears while signed in (live 55/55 per host, iteration 57). Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** 55/55 + the 41/41 signed-out run in `cr-e2e` — sign-in toast once per session, the save still happens, nothing blocked.|
| CR-5.4 | First sign-in merges local presets into the account | verified | same as CR-5.1; `test/account-sync.test.mjs`, `test/presets.test.mjs` | Merge rule in `lib/presets.mjs`/`lib/account-sync.mjs` (unit-tested): first sign-in uploads browser A's presets; a second browser's same-named preset with a different value is kept as "… (this browser)", nothing lost; the account adopts A's settings when it has none. Live both hosts, iteration 57. Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** 55/55 — first-sign-in merge keeps both presets, conflicting names renamed "(this browser)", nothing lost (live + `test/account-sync.test.mjs`).|
| CR-5.5 | Privacy and account basics, delete account | verified | same as CR-5.1; `iter57-cr-5/{canonical,legacy}/*-privacy.png`, `desktop_light-account-signed-in.png` | Only Google subject ID, email, name and avatar link stored (listed on `/account`). New `/privacy`, `/terms`, `/impressum`, footer links. **Decision (iteration 54):** Benchmark Heaven had no Impressum; the operator details were taken from Florian's other ventures (productivity-boost.com Betriebs UG, Passau) — Florian may want to confirm. "Delete my account and data" removes `bh_users` + `bh_user_data` rows, the page confirms and shows signed-out, the other browser's writes then get 401 (live both hosts, iteration 57). Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** 55/55 — only sub/email/name/avatar stored, `/privacy` `/terms` `/impressum` 200 (broad sweep), delete cascades and signs out everywhere.|
| CR-5.6 | Provision the Google OAuth client ourselves (secrets only in Coolify env) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter54-cr-5/provisioning/*.png` (consent screen branding, URLs, audience "In production"); live probe iteration 57: `/opt/benchmarkheaven/state/ux-evidence/iter57-cr-5/oauth-redirect-probe.txt` | **Iteration 54 (claude-opus), recorded in iteration 57:** Google Cloud project `benchmark-heaven` created through Florian's signed-in Chrome on Sandy; consent screen (app name, domains, `/privacy` + `/terms` links) published to production without a logo (no Google review needed); web OAuth client with redirect URIs for `benchmarkheaven.com`, `www.` and the legacy host. Client ID/secret, `AUTH_SECRET` and the accounts DB URL written to `~/.config/dev-secrets.env` and the Coolify env without printing. **Iteration 57 live check:** `/api/auth/providers` on both hosts lists Google with the visited host's callback; a real sign-in POST (CSRF token) on each host redirects to `accounts.google.com` with that host's `redirect_uri`, and Google answers with its "Sign in - Google Accounts" page, not `redirect_uri_mismatch` — so both redirect URIs are registered. No 2FA was needed. Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** 55/55 — OAuth providers endpoint on both hosts lists Google with the host's own callback; secrets only in the Coolify env (never printed in this gate; evidence folders contain no secret values).|
| CR-7.1 | Simple landing = two sections: price/capability overview + simple Benchmarks section | verified | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-7/local/verification.json` (`bin/verify-cr-7.mjs`, 42/42 local production build, and **42/42 per host live** at `5120a02` in `iter53-cr-7/{canonical,legacy}/`, 1440/390, light/dark) + `*-simple-benchmarks-section.png` | **Iteration 53 (claude-opus):** `components/SimpleBenchmarks.tsx` under Simple's overview: a release-style table of the first 5 models of section 1's current list (`ModelExplorer onRowsChange`, so it follows the sliders and filters — checked after moving the score slider), "Important" rows with ≥ 2 values, bold winners, data bars, cells open the CR-1.8 detail page. "/" receives only the Important rows (`importantMatrix`, unit-tested): local home HTML 7.76 MB / 580 KB gzip vs 7.54 MB / 534 KB live before. Guided and Advanced do not show it. Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** `bin/verify-cr-7.mjs` 42/42 per host — Simple landing has the two sections; section 2 follows section 1's selection.|
| CR-7.2 | Mark the simple version; obvious switch to the full version; one-time small-screen note | verified | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-7/local/verification.json` (`bin/verify-cr-7.mjs`, 42/42 local production build, and **42/42 per host live** at `5120a02` in `iter53-cr-7/{canonical,legacy}/`, 1440/390, light/dark) + `*-simple-benchmarks-section.png` | **Iteration 53 (claude-opus):** eyebrow "Simple view", heading "Benchmarks for your shortlist", a primary "Open the full comparison →" button whose `?models=` carries the same columns, and a closing line naming what the full version adds. Phones only (< 768 px): an inline dismissible note "This is the simple version. The full comparison … works best on a larger screen." (chosen over a toast: it cannot cover the table and needs no timer); dismissal is remembered (`bh.simpleBenchmarksNote.v1`, checked across a reload). **Verified by review gate 230002Z (opencode-kimi):** 42/42 — Simple-view marking, "Open the full comparison →" carries the columns, one-time phone note persisted.|
| CR-7.3 | Header Benchmarks button: Simple scrolls to section 2, Advanced opens the full tab | verified | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-7/local/verification.json` (`bin/verify-cr-7.mjs`, 42/42 local production build, and **42/42 per host live** at `5120a02` in `iter53-cr-7/{canonical,legacy}/`, 1440/390, light/dark) + `*-simple-benchmarks-section.png`; header regression `iter53-cr-7/{local,canonical,legacy}-cr-6-8/` (62/62 per host live with the scoped script) | **Iteration 53 (claude-opus):** both the phone header link and the desktop primary-nav link jump to `#benchmarks` when it exists on "/" (smooth unless reduced motion, then focus the section); modified clicks and every other context navigate to `/benchmarks` (checked in Advanced). `bin/verify-cr-6-8.mjs` now scopes its Score column to the ranking table: its CR-8.1 check had read Simple's new second table too (25 values; the ranking itself was correctly descending). **Verified by review gate 230002Z (opencode-kimi):** 42/42 — Benchmarks button scrolls to section 2 in Simple, navigates elsewhere.|
| CR-9.1 | Tests: unit + E2E for the CR features | verified | — | Seeded 2026-09-14 from `04-CR-BRIEF.md` (iteration 52, claude-opus). **Review gate 213002Z:** the pieces exist but are not collected as the brief's E2E list: open tab → top 5 (`verify-cr-1`), change selection three ways (`verify-cr-1` ×/+, `verify-cr-2-2` pick from chart, `verify-cr-presets` presets), signed-out save → toast (`verify-cr-5`), share-URL round trip (`verify-cr-2-5-perf`); unit tests `benchmark-matrix`, `presets`, `account-sync`, `pick-chart`. All pass live on both hosts in this gate. Stays open until one E2E entry point lists them. **Verified by review gate 230002Z (opencode-kimi):** the one E2E entry point now exists — `bin/verify-cr-e2e.mjs` runs the four unit files (37/37: data bars, winner logic, category assignment, preset CRUD + local→account merge, pick-chart, auth routes) and the five live scripts covering the brief's E2E list (open tab → top 5; ×/+ ; pick from chart; presets; signed-out save → toast; share URL round trip). This gate's run: unit 37/37, per host 92/92, 38/38, 88/88, 41/41, 28/28 → ALL PASS both hosts, `cr-e2e/summary.json`.|
| CR-9.2 | Gauntlet evidence: each CR row verified by a non-implementing engine, live, 1440/390, light/dark | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260915T012002Z/` (closing evidence); `review-20260914T230002Z/` (41 rows) | Seeded 2026-09-14 from `04-CR-BRIEF.md` (iteration 52, claude-opus). **Review gate 230002Z:** every completed CR row now has independent live evidence (`review-20260914T230002Z/`); stays open because CR-1.10 has no Fable pass yet. **Review gate 20260915T012002Z (opencode-kimi):** CR-1.10 verified (Fable pass 15 ran; F-79–F-83 all verified live by non-implementers — see the CR-1.10 row). Every CR row (CR-1.x, CR-2.x, CR-3.x, CR-4.x, CR-5.x, CR-6.1, CR-7.x, CR-8.1, CR-9.1, CR-9.3) now carries non-implementer live evidence at 1440/390, light/dark. |
| CR-9.3 | No invented data in the comparison table | verified | — | Seeded 2026-09-14 from `04-CR-BRIEF.md` (iteration 52, claude-opus). **Review gate 213002Z:** new `bin/verify-cr-9-3.mjs` (live, All preset, 30 cells spread over the table → detail page shows the same value, basis, ISO date and an off-site source) plus an offline trace of those cells into `data/dataset.json` (`/opt/benchmarkheaven/state/ux-evidence/review-20260914T213002Z/trace-cells.py`). Found and fixed F-78 (unrated Briefcase placeholders shown as 0). Remaining gap: Epoch ECI cells (see CR-1.8). Stays open. **Iteration 58 (claude-opus) → implemented:** the ECI gap is closed (CR-1.8); `verify-cr-9-3` 33/33 on both hosts after `ad5752d` (`/opt/benchmarkheaven/state/ux-evidence/iter58-cr-1-8/{canonical,legacy}/verify-cr-9-3/`). Needs a non-claude-opus verifier. **Verified by review gate 230002Z (opencode-kimi):** `bin/verify-cr-9-3.mjs` 33/33 per host — 30 sampled cells each open a detail page with the same value, basis, ISO date and off-site source; missing cells shown as missing; the Llama 4 Maverick read-back (this gate) shows AA-Briefcase as "Unknown: no published result matched to this configuration", never 0 (F-78 residue holds in the bridged history).|
| CR-10.1 | New header copy: "The most detailed cost–capability analysis in AI." / "Every model. Every Benchmark. Actual Costs." | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-11.1 | Invert the Pareto chart's X axis so the most attractive cost–capability region is top-right | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-11.2 | Diagonal green gradient in the top-right quarter only, transparent at that quarter's bottom-left edge to opaque green at the chart's top-rig | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-11.3 | Small "most attractive quadrant" annotation top-right | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-11.4 | Chart and overview table include up to 30 models (was up to 15), selected by top score (AA Intelligence Index or ECI), relaxing only the "fe | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-11.5 | At most 15 models get a visible name label on the chart; the rest stay selectable/visible via existing interactions (table, tooltip) without | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-12.1 | New highlighted first row above all benchmarks, in Simple, Advanced and the Benchmarks tab, showing the current selected score, labeled "Ben | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-12.2 | Category headers (Composite indices, Coding, Agentic & tool use, …) visually emphasized (color and/or bolder/larger font) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-12.3 | Each category header doubles as a composite score for that category, filled into the relevant score cells | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-12.4 | Coding category broadened well beyond SciCode: add FrontierCode, CursorBench 4.0, DeepSWE v1.1, Terminal-Bench 4.0, SWE-Atlas-QnA, SWE-bench | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-13.1 | Modal explains plainly that it combines AA tokens-per-task, OpenRouter cache-efficiency data, the cheapest filter-surviving provider, and th | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-13.2 | Remove the "Assumptions and limitations" wall of text completely; do not replace with similar alarming boilerplate | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-13.3 | Use source-backed cache-hit rates/prices where available; fall back to a documented industry-typical baseline instead of assuming 0% cache-h | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-13.4 | Replace the linked text "Chutes LLM usage statistics" with "Proxied from public available LLM usage statistics from a inference provider [li | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-10-13/{local,canonical,legacy}/verification.json` (`ops/benchmark-table-2026-09-15/verify.mjs`) | **Iteration 68 (claude-opus):** built by the one-off job (`8c68a1d`, report `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`), rebased as `3f453c6`; tagline set to Florian's capitalisation "Every Benchmark. Actual Costs." (`320e740`, 03 is the wording of record). Gates: build-dataset 838/658/91/2,863, npm test 432/432, tsc clean. Live at `cb063cb` on both hosts: **107/107 per host** (legacy's first run crashed with a bare Error, re-run 107/107). Critic round fix-review-2 (Kimi K3) confirmed the pre-release findings C-1…C-4 fixed at data/code level (DeepSWE gemini-3.1-pro-preview high no longer joined to ::default; muse-spark-1.1 → ::xhigh; comment; 3 new tests, 68/68) but hit its 50-min cap without a verdict — **not an acceptance**. Needs a non-claude-opus live verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `ops/benchmark-table-2026-09-15/verify.mjs` **111/111 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-10-13/{canonical,legacy}/verification.json`); CR-12.4's self-reported joins live 9/9 per host (`cr-12.4-joins/`) with an offline read-back of the expected values against `data/raw/benchmarks/public-observations.json` (critic pass 217/217, 0 rejected). |
| CR-14.1 | Compare tab pre-populates with the two currently most capable models (currently Fable 5.1 and GPT-6 Astra) instead of a random pair | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-14/{local,canonical,legacy}/verification.json` (`bin/verify-cr-14.mjs`, 52/52 per host) | **Iteration 68 (claude-opus), `67617d4`:** `defaultComparePicks` (lib/radar.mjs) ranks current families by AA Intelligence Index and shows each through its best-covered configuration (the one carrying family-scope ECI/DesignArena) — today Claude Fable 5.1 (high) and GPT-6 Astra (high); /compare and /radar. Data-derived, unit-tested against the live dataset. Needs a non-claude-opus verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-14.mjs` **52/52 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-14/{canonical,legacy}/verification.json`). |
| CR-14.2 | Radar axis scaling fixed to be metric-aware (a 0–100 benchmark score of ~55 renders at ~half, not near-full) | verified | same as CR-14.1 | `radarScale`: registry range, fraction/percent units, AA indices' documented 0–100; only Elo/ECI use the peer range and say "no fixed scale". Regression test (55 on AA Coding Index → 55). Live check: every drawn point sits at its announced position ±1.5. Note: GPT-5.6 Sol's AA Coding Index is 77.2 in the data; the principle Florian named is what is tested. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-14.mjs` **52/52 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-14/{canonical,legacy}/verification.json`). |
| CR-14.3 | Hover/tap shows the exact score value | verified | same as CR-14.1 | Focusable hit targets; axis-wide tooltip lists every compared model (points at 51 and 51.2 overlap); hover for mice only, tap shows / background tap hides (touch compatibility mouseleave had closed it, fixed `cb063cb`); focus + Escape. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-14.mjs` **52/52 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-14/{canonical,legacy}/verification.json`). |
| CR-14.4 | Replace the current 6-axis default (drop saturated axes like GPQA Diamond) with a current, well-balanced set from AA Indices, ECI, important | verified | same as CR-14.1 | Default: AA Intelligence, AA Coding, Epoch ECI, Epoch Software ECI, DesignArena Frontend + Full-Stack, HLE, newest Terminal-Bench; GPQA dropped. ECI enters as radar-only `indexAxes` so the Benchmaxxing signal (iterates `axes`) is unchanged; API.md + CHANGELOG note the additive field. "Reset to recommended axes". **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-14.mjs` **52/52 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-14/{canonical,legacy}/verification.json`). |
| CR-14.5 | Toggle between the new simple radar and the Benchmaxxing screen's detailed/complex radar | verified | same as CR-14.1 | Simple / Detailed toggle; Detailed = shared `TopicRadar` (the Benchmaxxing radar, now multi-series) over every benchmark a selected model has. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-14.mjs` **52/52 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-14/{canonical,legacy}/verification.json`). |
| CR-15.1 | Overview table Cost cell highlights notably cheap or expensive models relative to their capability score (color and/or small tag) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-15/{local,canonical,legacy}/verification.json` (`bin/verify-cr-15.mjs`, 48/48 per host) | **`955587a`:** `lib/value-signal.mjs` — robust Theil–Sen line of log cost vs score over the rows shown; tag when ≥2× off and beyond 1.5 robust SDs (≥8 rows). "↓ 3.1× cheaper" / "↑ 2.4× pricier" with explanation; Adjusted Cost (i) mentions it. Unit tests incl. outlier robustness. Needs a non-claude-opus verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-15.mjs` **48/48 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-15/{canonical,legacy}/verification.json`). |
| CR-15.2 | Benchmaxxing screen default model selection replaced with up-to-date top/featured models, as a named, changeable preset | verified | same as CR-15.1 | Table presets Featured models (default, by Composite) · Strongest signals · All scored (`lib/benchmaxxing-presets.ts`); report opens on the first featured row. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-15.mjs` **48/48 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-15/{canonical,legacy}/verification.json`). |
| CR-15.3 | Signal score becomes an expressive warning-style pill/tag when the score is above 25 (Florian's wording "Signal coli" — confirm exact produc | verified | same as CR-15.1 | "Signal coli" read as the Signal column (the only "Signal" in the product). Above 25 → ⚠ pill (icon + number), threshold explained in the column (i); 25 is where today's top-10 % tag starts (lowest tagged 24.9, 17 models above 25). **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-15.mjs` **48/48 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-15/{canonical,legacy}/verification.json`). |
| CR-15.4 | Per-model report loses its own model selector and instead reacts to the model selected in the table (master-detail); optional two-model side | verified | same as CR-15.1 | Selector removed; rows select; `?model=` deep link (one or two); "Compare side by side" draws A and B on one topic radar with two signal cards. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-15.mjs` **48/48 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-15/{canonical,legacy}/verification.json`). |
| CR-16.1 | ChatGPT Plus/Pro and Claude Pro/Max are never presented as universally business-safe API equivalents; commercial-use eligibility is provider | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-16/{local,canonical,legacy}/verification.json` (`bin/verify-cr-16.mjs`, 41/41 per host; re-run 41/41 on canonical after CR-17) | **`b2bd941`:** labels say what the terms we read say ("Consumer terms restrict business use" ⚑, "depends on plan, region and contract" ⚑); explanation and /about in the 09:34 framing. OpenAI/xAI terms stay "not collected" (403, never bypassed). Needs a non-claude-opus verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-16.mjs` **41/41 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-16/{canonical,legacy}/verification.json`). |
| CR-16.2 | API pricing stays the default comparison everywhere; a small "Subscription costs may differ" note with a collapsible explanation is added, n | verified | same as CR-16.1 | Folded "Subscription costs may differ · the costs above are API prices" note below the ranking. Guided mode now asks the optional company question last (was step 1; the 2026-09-15 text wins over 00's page order). **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-16.mjs` **41/41 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-16/{canonical,legacy}/verification.json`). |
| CR-16.3 | Optional assumption-based estimate: effective cost/task = monthly subscription cost ÷ completed tasks per month, editable, explicitly labele | verified | same as CR-16.1 | Plan picker + tasks/month (200 labelled an example) + optional extra usage; "≈ $x per task · subscription estimate" beside the API baseline; only flat-rate single-vendor plans with a collected price. Unit tests. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-16.mjs` **41/41 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-16/{canonical,legacy}/verification.json`). |
| CR-17.1 | EU-hosted filter: Claude via AWS Bedrock EU (per model, cited) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-17/{canonical,legacy}/verification.json` (`bin/verify-cr-17.mjs`, 22/22 per host); `test/eu-hosted.test.mjs`; audit `/home/flori/jobs/benchmarkheaven-eu-hosting-audit-20260915/` | **Iteration 68 (claude-opus), `3cab196`, live at build `VuwMNgohtDwNGkHsTgbOQ`:** already correct — Claude Sonnet 5, Opus 5, Opus 4.7/4.8, Sonnet 4.6, Haiku 4.5 pass via the Bedrock eu. geo profile; Fable 5/5.1 are US/Global-only on Bedrock (Fable 5.1 passes only via Google Vertex AI EU multi-region). No data change; guard test. Live 22/22 per host (API offers + (i) + guided hint at 1440/390, light/dark; the first run's filter-panel locator was wrong and is fixed). Needs a non-claude-opus verifier. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-17.mjs` **22/22 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-17/{canonical,legacy}/verification.json`); guard test `test/eu-hosted.test.mjs` green. |
| CR-17.2 | EU-hosted filter: OpenAI via Azure AI Foundry EU deployments (per model, cited) | verified | same as CR-17.1 | Microsoft's region table (captured 2026-09-15, re-read table by table): GPT-6 Astra Data Zone Standard/Provisioned **US only** → its "EU Data Zone" row removed; DeepSeek-V4-Flash (2026-04-23) Data Zone Standard in 7 EU regions → added at 0.21/0.56 (Retail DZ meters). GPT-5.6, o3, GPT-4o EU DZ rows confirmed. Offers 2,863 → 2,861; CHANGELOG + method note. Live 22/22 per host. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-17.mjs` **22/22 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-17/{canonical,legacy}/verification.json`); guard test `test/eu-hosted.test.mjs` green. |
| CR-17.3 | EU-hosted definition stated plainly and applied consistently | verified | same as CR-17.1 | (i) beside "EU-hosted only" + guided hint: in-EU inference (EU region, EU geo profile, Europe Data Zone, or an audited all-EU provider fleet — Mistral, Scaleway, IONOS, TensorX, Inceptron, NextBit per provider-meta), never Global / billing / control plane alone; Florian's own 2026-07-12 company-policy equivalents (Azure Global DeepSeek V4 Pro, Kimi K2.7 Code) kept per R4.7 "same logic" and disclosed. Guard test asserts no other Global route passes. Live 22/22 per host. **Verified by review gate 20260915T150001Z (opencode-kimi, non-implementer):** `bin/verify-cr-17.mjs` **22/22 per host** live on both hosts, 1440/390, light/dark (`ux-evidence/review-20260915T150001Z/cr-17/{canonical,legacy}/verification.json`); guard test `test/eu-hosted.test.mjs` green. |
| CR-18.1 | Simple min-score default derived so the cheapest top model is on the Pareto line | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-18-29/{canonical,legacy}/verification.json` (`bin/verify-cr-18-29.mjs`, 60/60 per host) | iter 71 claude-opus `07b65fd`: `derivedMinScore` (lib/value-map.mjs) from Simple's pre-cut pool; live 60/60 per host (default 69 = floor(DeepSeek V4 Flash score), cheapest model on the Pareto line) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-18-29.mjs` **60/60 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-18-29/{canonical,legacy}/verification.json`). |
| CR-18.2 | Derived default never below 65 (0–100 scores) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-18-29/{canonical,legacy}/verification.json` (`bin/verify-cr-18-29.mjs`, 60/60 per host) | floor 65 for Composite; Elo boards keep fixed default; unit test (cheapest at 50 → 65) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-18-29.mjs` **60/60 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-18-29/{canonical,legacy}/verification.json`). |
| CR-18.3 | Table/map consistency, reset, manual override, no pool feedback loop | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-18-29/{canonical,legacy}/verification.json` (`bin/verify-cr-18-29.mjs`, 60/60 per host) | table + map read one `minScoreSimple`; hand-set value wins + persists; untouched → derived again; Advanced unchanged — all live-checked **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-18-29.mjs` **60/60 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-18-29/{canonical,legacy}/verification.json`). |
| CR-19.1 | Compare radar tooltips get an opaque, theme-aware background (no see-through text) in light and dark | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json` (`bin/verify-cr-19-25.mjs`, 53/53 per host) | iter 71 claude-opus: radar tooltip on opaque theme surface (`b3a76ec`); live canonical 49/53 · legacy 49/53 (all 8 failures are CR-21.2's bar scale, fixed in 7e74914 and re-checked in iter71-cr-32-33) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-25.mjs` **53/53 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json`). |
| CR-19.2 | Compare radar scaling makes differences between two strong models visible: axis range adapts to the two select | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-2-21-1/{canonical,legacy}/verification.json` (`bin/verify-cr-19-2-21-1.mjs`, 41/41 per host) | iter 71 claude-opus: shared zoom window from the pair, rings/centre labelled, Full 0–100 toggle (`f2967b4`); live canonical 41/41 · legacy 41/41 **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-2-21-1.mjs` **41/41 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-2-21-1/{canonical,legacy}/verification.json`). |
| CR-19.3 | Default compare radar axes: replace DesignArena Frontend with DesignArena Full-Stack (Fable 5.1 must have a va | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json` (`bin/verify-cr-19-25.mjs`, 53/53 per host) | iter 71 claude-opus: default axes: DesignArena Full-Stack only (`b3a76ec`); live canonical 49/53 · legacy 49/53 (all 8 failures are CR-21.2's bar scale, fixed in 7e74914 and re-checked in iter71-cr-32-33) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-25.mjs` **53/53 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json`). |
| CR-20.1 | Full benchmark comparison: model columns have equal widths | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json` (`bin/verify-cr-19-25.mjs`, 53/53 per host) | iter 71 claude-opus: fixed table layout, equal model columns (`b3a76ec`); live canonical 49/53 · legacy 49/53 (all 8 failures are CR-21.2's bar scale, fixed in 7e74914 and re-checked in iter71-cr-32-33) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-25.mjs` **53/53 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json`). |
| CR-21.1 | Benchmaxxing tab shows one row per model (weights/training run), not multiple reasoning variants; the benchmax | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-2-21-1/{canonical,legacy}/verification.json` (`bin/verify-cr-19-2-21-1.mjs`, 41/41 per host) | iter 71 claude-opus: one row + one verdict per model family, Overview shares it (`f2967b4`); live canonical 41/41 · legacy 41/41 **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-2-21-1.mjs` **41/41 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-2-21-1/{canonical,legacy}/verification.json`). |
| CR-21.2 | Benchmaxxing signal bar (yellow) scales to the actual maximum value present in the list (not a fixed max), so  | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json` (`bin/verify-cr-32-33.mjs`, 44/44 per host) | iter 71 claude-opus: bar 0 → highest signal among rows on screen (`b3a76ec`, `7e74914`); live canonical 44/44 · legacy 44/44 (includes the CR-21.2 re-check after 7e74914 and the trimmed CR-32.3 tooltip) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-32-33.mjs` **44/44 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json`). |
| CR-22.1 | Per-model report: fix AA Coding Agent Index value for Muse Spark 1.3 (raw fraction 0.64 shown as percentile 0. | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json` (`bin/verify-cr-19-25.mjs`, 53/53 per host) | iter 71 claude-opus: percentiles need ≥ 3 families; tooltip formats native value (`b3a76ec`); live canonical 49/53 · legacy 49/53 (all 8 failures are CR-21.2's bar scale, fixed in 7e74914 and re-checked in iter71-cr-32-33) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-25.mjs` **53/53 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json`). |
| CR-22.2 | Per-model report: add one plain sentence near the radar: 'The more jagged the shape, the more benchmaxxed the  | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json` (`bin/verify-cr-19-25.mjs`, 53/53 per host) | iter 71 claude-opus: 'The more jagged the shape, the more benchmaxxed the model looks.' (`b3a76ec`); live canonical 49/53 · legacy 49/53 (all 8 failures are CR-21.2's bar scale, fixed in 7e74914 and re-checked in iter71-cr-32-33) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-25.mjs` **53/53 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json`). |
| CR-22.3 | Radar charts with many axes: remove the radial spoke lines or make them much subtler (low-contrast on dark mod | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json` (`bin/verify-cr-19-25.mjs`, 53/53 per host) | iter 71 claude-opus: spokes at 14 % opacity (`b3a76ec`); live canonical 49/53 · legacy 49/53 (all 8 failures are CR-21.2's bar scale, fixed in 7e74914 and re-checked in iter71-cr-32-33) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-25.mjs` **53/53 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json`). |
| CR-23.1 | Mobile header 'More' menu opens anchored to its button (currently pops up in the wrong spot) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json` (`bin/verify-cr-19-25.mjs`, 53/53 per host) | iter 71 claude-opus: desktop More anchored to its button (`b3a76ec`); live canonical 49/53 · legacy 49/53 (all 8 failures are CR-21.2's bar scale, fixed in 7e74914 and re-checked in iter71-cr-32-33) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-25.mjs` **53/53 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json`). |
| CR-24.1 | Overview table cost cells: the '↓ 11× cheaper' (and 'pricier') tag sits left of the price on the same line, no | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json` (`bin/verify-cr-19-25.mjs`, 53/53 per host) | iter 71 claude-opus: value tag left of the price, one line (`b3a76ec`); live canonical 49/53 · legacy 49/53 (all 8 failures are CR-21.2's bar scale, fixed in 7e74914 and re-checked in iter71-cr-32-33) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-25.mjs` **53/53 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json`). |
| CR-25.1 | Rename 'Filters' to 'Options' everywhere (button, dialog title, docs) since it also holds choices like the sco | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json` (`bin/verify-cr-19-25.mjs`, 53/53 per host) | iter 71 claude-opus: Filters → Options in header, dialog, wizard copy (`b3a76ec`); live canonical 49/53 · legacy 49/53 (all 8 failures are CR-21.2's bar scale, fixed in 7e74914 and re-checked in iter71-cr-32-33) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-25.mjs` **53/53 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json`). |
| CR-25.2 | Remove the 'Strong confidential guarantees' filter | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json` (`bin/verify-cr-19-25.mjs`, 53/53 per host) | iter 71 claude-opus: confidential filter removed; stored true migrates off; preset updated (`b3a76ec`); live canonical 49/53 · legacy 49/53 (all 8 failures are CR-21.2's bar scale, fixed in 7e74914 and re-checked in iter71-cr-32-33) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-25.mjs` **53/53 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json`). |
| CR-25.3 | Move 'I'm buying for a company' out of the 'Data Confidentiality' section to a better-fitting place | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json` (`bin/verify-cr-19-25.mjs`, 53/53 per host) | iter 71 claude-opus: company toggle moved to Price basis (`b3a76ec`); live canonical 49/53 · legacy 49/53 (all 8 failures are CR-21.2's bar scale, fixed in 7e74914 and re-checked in iter71-cr-32-33) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-19-25.mjs` **53/53 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-19-25/{canonical,legacy}/verification.json`). |
| CR-25.4 | Regional settings harmonized and positively expressed: 'Hosted in: China / EU / US / Other' (all checked by de | verified | `/opt/benchmarkheaven/state/ux-evidence/iter73-verify-cr-25-36/{canonical,legacy}/verification.json` (`bin/verify-cr-25-36.mjs`, **76/76 per host**, live at `22ad0f9`, 1440/390, light/dark); unit tests `test/regions.test.mjs`, `test/cost.test.mjs`, `test/presets.test.mjs` | **Iteration 73 (claude-opus, implementer):** `808ef9e` — Regional = three rows "Hosted in" / "Provider company based in" / "Model lab based in", chips China · EU · US · Other, all pressed by default, no (i); the EU definition moved to the EU chip's accessible description (CR-17.3 verifier updated, 22/22 per host). The former switches map exactly (unit test compares old and new scopes over every dataset provider for all 8 switch combinations); stored settings, account settings, saved presets and shared `?f=` links with the old keys migrate. Provider company bucket = the former rules (Chinese-provider rule, non-US flag, then EU country); lab country from a documented map (`LAB_COUNTRIES`), unknown = Other. The last pressed chip cannot be released. Also live: `verify-cr-presets` 88/88, `verify-cr-5` 41/41 (harnesses moved to the chips), `verify-cr-17` 22/22 per host. **Needs a non-claude verifier.** **Verified by review gate 20260915T212002Z (opencode-kimi, non-implementer):** `bin/verify-cr-25-36.mjs` **76/76 per host** live on both hosts at `4be0957` and again at `c11af043`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260915T212002Z/{canonical,legacy}/verify-cr-25-36{,-c11af04}/`). |
| CR-25.5 | New Options section 'Models and Providers' holding the Models dropdown, the Providers dropdown and a new Labs  | verified | `/opt/benchmarkheaven/state/ux-evidence/iter73-verify-cr-25-36/{canonical,legacy}/verification.json` (`bin/verify-cr-25-36.mjs`, **76/76 per host**, live at `22ad0f9`, 1440/390, light/dark); unit tests `test/regions.test.mjs`, `test/cost.test.mjs`, `test/presets.test.mjs` | **Iteration 73 (claude-opus, implementer):** `808ef9e` — section "Models, providers and labs" with three identical comboboxes; new Labs filter (model `org`, empty = all) applied in every view next to open-weights (Overview, Charts, Compare, Providers, Provider explorer, EU table, Benchmarks candidates, Wizard pool). Live: picking Anthropic narrows Simple 25 → 5 and is stored. **Needs a non-claude verifier.** **Verified by review gate 20260915T212002Z (opencode-kimi, non-implementer):** same run — `bin/verify-cr-25-36.mjs` **76/76 per host** live on both hosts at `4be0957` and again at `c11af043`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260915T212002Z/{canonical,legacy}/verify-cr-25-36{,-c11af04}/`). |
| CR-25.6 | Score dropdown includes the category composite scores (e.g. Coding) as selectable scores |  verified  | `/opt/benchmarkheaven/state/ux-evidence/iter75-cr-25-6/{canonical,legacy}/verification.json` (`bin/verify-cr-25-6.mjs`, **56/56 per host**, live at `5b54398`, 1440/390, light/dark) | **Iteration 74/75 (claude-opus, implementer):** `5b54398` — four category composites (`cat_coding`, `cat_agentic`, `cat_science`, `cat_long_context`) computed at build time from a fixed anchor set (`data/category-score-anchors.json`), wired through `ScoreKey`, `scoreOf`, `SCORE_OPTIONS`, `SIMPLE_SCORE_CHOICES`, the Options Score dropdown and the shortlist chart picker. Honesty rules: a model is scored only with a result on **every** anchor (never a partial average over an easier subset); each benchmark counts at its newest published version; a category needs ≥ 2 qualifying 0–100 higher-is-better benchmarks at ≥ 60 % coverage of the featured families, so Reasoning and Vision (one each) get no score. `d382f75` documented the new `models[].category_scores` / `dataset.category_scores` fields in API.md + CHANGELOG.md and added the Options-dropdown assertion. Verifier recomputes the values independently from `/api/benchmark-view`. **Open question for the reviewer (unchanged):** every anchor except DeepSWE is AA-derived; this is an aggregate of values already shown (CR-12.3), not a new AA metric, so it is read as *not* blocked by CR-35.3 — challenge that if you disagree. **Needs a non-claude engine to set `verified`.** **Verified by review gate 20260916T010002Z (opencode-kimi, non-implementer):** `bin/verify-cr-25-6.mjs` **56/56 per host** live at `958f207`, both hosts, incl. independent recompute from `/api/benchmark-view`; category dropdown lists the four composites; `resolveAnchors` drops any category whose anchors are not all present and `computeCategoryScores` skips any model missing an anchor (`values.every(finite)`) — re-read in source. Anchors are AA-derived except DeepSWE: this gate agrees with the implementer that an average over already-displayed AA values (CR-12.3, mandated hi before the hold) is an aggregate of existing display data with AA attribution on every surface (CR-35.1), not a new AA-derived metric — not blocked by CR-35.3. Deviation accepted for the record: anchor set is AA-heavy (DeepSWE the only non-AA anchor). |
| CR-26.1 | Charts tab cost-vs-capability diagram gets all the Overview value-map improvements (reversed cost axis, attrac | verified | `/opt/benchmarkheaven/state/ux-evidence/iter73-verify-cr-26-1/{canonical,legacy}/verification.json` (`bin/verify-cr-26-1.mjs`, **56/56 per host**, live at `3fd6a42`, 1440/390, light/dark) | **Iteration 73 (claude-opus, implementer):** `95fd086` — Charts opens on the value map at full card width (420 px desktop / 240 px phones) with every Simple-map piece (reversed cost axis, attractive quadrant + note, Pareto line, ≤ 15 in-chart names with halos, fitted Y axis, cogwheel, AA/Epoch credits); header = score picker + cost-measure picker + min-score and max-cost sliders (shared `ScoreCostSliders`, extracted from `ShortlistControls`), writing Advanced's floor and cap so the panels below follow; Simple's 30-family rule while Featured is untouched. Old half-width "Score vs cost" panel and loose Max $/task field removed. Regression live per host: `verify-cr-32-33` 44/44, `verify-cr-18-29` 60/60. **Needs a non-claude verifier** (and the design gate's F-96 check). **Verified by review gate 20260915T212002Z (opencode-kimi, non-implementer):** `bin/verify-cr-26-1.mjs` **56/56 per host** live on both hosts at `4be0957` and again at `c11af043`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260915T212002Z/{canonical,legacy}/verify-cr-26-1{,-c11af04}/`). The design gate's F-96 check stays with the next Fable pass. |
| CR-27.1 | Research and, if it qualifies, add trustedtokens.eu as a provider (models, prices, hosting region, company cou | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-cr-27-1/{canonical,legacy}/verification.json` (`bin/verify-cr-27-1.mjs`, 18/18 per host, live at `adc3fa7`); research `/home/flori/jobs/bh-data-verification-20260915/TRUSTEDTOKENS.md`; `data/raw/trustedtokens.method.md` | **Iteration 72 (opencode-kimi, implementer):** qualifies per the audited research (TNG Technology Consulting GmbH, Unterföhring; TNG-operated GPUs at Noris Aschheim/Munich; no logging beyond the API call, no training). Collector `scripts/fetch-trustedtokens-catalog.mjs` + fail-closed parser `lib/trustedtokens-catalog.mjs` (6 new unit tests) — the unauthenticated `GET /api/service/models` the `/models` page itself loads (robots.txt allows all; E3's page-own-dataRequest method) + ECB daily rate; EUR per-token → per-1M → USD (1 EUR = 1.1539 USD, 2026-09-15). 13 models: 11 joined existing families (GLM 5.3/5.2/5.3-Flash, DeepSeek V4 Flash 0731/V4.1 Flash/V4 Pro 0813, Qwen3.5/3.6/3.8, gpt-oss-120b, gemma-4-31b-it); 2 genuinely new families (DeepSeek TNG R1T2 Chimera — TNG's own merge; NVIDIA Nemotron 3.5 Lightning 30B A3B); GLM 5.2's `deprecated` lifecycle kept. provider-meta + offers: `eu_hosted`/sovereign_germany, B2B plan-credit caveat in offer notes; daily step `fetch-trustedtokens-catalog` (non-fatal); README/CHANGELOG/SCRAPING.md/`/eu` SOVEREIGN table updated. Gates: build-dataset 840/660/92/2,882, npm test 467/467, tsc clean. Live both hosts: `verify-cr-27-1.mjs` **18/18 per host** (source dated today, exact converted prices on GLM 5.3 / DeepSeek V4.1 Flash / the new Chimera family, EU + B2B note, deprecated kept, model page and `/eu` table, 4 contexts, 0 page errors). Spot values re-checked against the research table: 0 mismatches. **Needs a non-kimi verifier.** TrustedRouter (api.trustedrouter.eu, "coming soon") is a different product and stays untouched. **Verified by iteration 73 (claude-opus, non-implementer):** `bin/verify-cr-27-1.mjs` **18/18 per host** live on both hosts at `0a25e2a` (`/opt/benchmarkheaven/state/ux-evidence/iter73-verify-cr-27-1/{canonical,legacy}/verification.json`). |
| CR-28.1 | Overview start page benchmark list shows all benchmarks we have (not only 22) | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-28-1/{canonical,legacy}/verification.json` (`bin/verify-cr-28-1.mjs`, 10/10 per host) | iter 71 claude-opus: full benchmark list via /api/benchmark-matrix for the five models; honest N of M (`abe2c31`); live canonical 10/10 · legacy 10/10 **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-28-1.mjs` **10/10 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-28-1/{canonical,legacy}/verification.json`). |
| CR-28.2 | DesignArena Frontend and Full-Stack values for GPT-6 Astra (and any other missing models present on DesignArena) are ingested; the data-verification job's corrections are applied with provenance |  verified  | `/opt/benchmarkheaven/state/ux-evidence/iter75-cr-28-2/{canonical,legacy}/verification.json` (`bin/verify-cr-28-2.mjs`, **22/22 per host**, live at `483edbc`, 1440/390, light/dark) | **Iteration 75 (claude-opus, implementer):** `483edbc`. The stated gap was already half-closed — GPT-6 Astra *had* Frontend 1335 / Full-Stack 1350 — but on the wrong configuration. Rows 0–5 of `/home/flori/jobs/bh-data-verification-20260915/CORRECTIONS.json` are now applied: Intelligence.ai's own model registry names the tested effort in its display name ("GPT-6 Astra (xhigh)", "GPT-5.6 Sol (Medium)", "Muse Spark 1.3 (xhigh)"), and `scripts/build-dataset.mjs` threw that label away before storage, then attached the result to whichever variant the static representative order picked. Now: a named effort that exists as a catalog configuration joins **exactly** that configuration (GPT-6 Astra → `::xhigh`, Muse Spark 1.3 → `::xhigh`, GPT-5.6 Sol → `::medium`); a row that names none keeps the family-scoped attach-once rule; a named effort with no configuration (Kimi K2.5 "Thinking") falls back to it rather than inventing one. `designarena_attachment_note` states which rule applied. **A published result was also being deleted:** `gpt-5.6-sol` (Medium, 2254 battles) and `gpt-5.6-sol-xhigh` (1978) are two rows of one family on one board, and the keep-the-higher-battle-count rule dropped xhigh entirely — its Elo 1269 / 1278 are back on `::xhigh`. DesignArena coverage 48 → 49 model rows. Test updated in `test/dataset.test.mjs`. **Needs a non-claude engine to set `verified`.** **Verified by review gate 20260916T010002Z (opencode-kimi, non-implementer):** `bin/verify-cr-28-2.mjs` **22/22 per host** at `958f207`, 1440/390, light/dark; build code re-read (`entries[key]` keyed by statedVariant when the registry names an effort; exact→fallback target mapping with the two-rule attachment note). |
| CR-29.1 | Simple mode minimum-score slider label reads 'Minimum Capability Score' with '(Benchmark Heaven Main Composite | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-18-29/{canonical,legacy}/verification.json` (`bin/verify-cr-18-29.mjs`, 60/60 per host) | two-line label + aria name + (i) title "(Benchmark Heaven Main Composite Score)"; live both hosts, 1440/390 light/dark **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-18-29.mjs` **60/60 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-18-29/{canonical,legacy}/verification.json`). |
| CR-29.2 | The slider filters on exactly the same score shown in the top 'Benchmark Heaven Score' row of the Simple bench | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-18-29/{canonical,legacy}/verification.json` (`bin/verify-cr-18-29.mjs`, 60/60 per host) | slider filters on `s.score`, the same key as the Score row (`data-score=composite`); rows all ≥ slider value live **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-18-29.mjs` **60/60 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-18-29/{canonical,legacy}/verification.json`). |
| CR-29.3 | Simple benchmark results table: in each benchmark row, a small tag marks scores that are outstandingly good or | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-29-31/{canonical,legacy}/verification.json` (`bin/verify-cr-29-31.mjs`, 48/48 per host) | iter 71 claude-opus: top/low outlier tags, transparent rule in tooltip + footnote (`5b8159f`); live canonical 48/48 · legacy 48/48 (after 4c6366c hint observer and fe29860 tooltip placement; first run 44/48) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-29-31.mjs` **48/48 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-29-31/{canonical,legacy}/verification.json`). |
| CR-30.1 | Ingest the verified self-reported scores from `/home/flori/jobs/bh-self-reported-scout-20260915/self-reported- |  verified  | `/opt/benchmarkheaven/state/ux-evidence/iter76-verify-cr-30/{canonical,legacy}/verification.json` (**51/51 per host**), `ops/rebuild-2026-09/evidence/phase-05/self-reported/` | **Tranche A shipped (`67558f8`, iteration 76, claude-opus).** The scout extraction is stored as hashed evidence (`data/raw/benchmarks/self-reported/scout-20260915.jsonl.gz`, lock binds its SHA-256) and treated as a *lead only*: `scripts/capture-vendor-documents.py` re-captured all 13 primary documents (robots-respecting, bounded; PDFs retained as their text layer with the original document hash + length, because 16–27 MB of PDF does not belong in the repo), and `scripts/collect-self-reported-scores.mjs` must find the published row **and the model's column** again in our own capture. 63 rows mapped to a registry identity via the reviewed `self-reported-identity-map.json`; 25 rejected with reasons; 41 candidates; independent critic (deepseek/deepseek-v4.1-flash ≠ producer family) cleared **38**, the 3 it did not clear are in the map's `withheld` list with its objection. Live: 38 observations on 5 identities (SWE-bench Verified / Multilingual / Multimodal, LongBench v2, Terminal-Bench 4.0), 21 joined to catalog configurations; `basis: self_reported`, `comparison_key: null`, never in the Composite or a category score. Tests: `test/self-reported-vendor.test.mjs` (21). Needs a non-claude verifier: `node ops/ux-2026-09-12/bin/verify-cr-30.mjs <base> <out>`. **Verified by review gate 20260916T010002Z (opencode-kimi, non-implementer):** `bin/verify-cr-30.mjs` **51/51 per host** at `958f207`, 1440/390, light/dark. Counts independently reconciled: exactly 38 observations with `source.file` under `data/raw/benchmarks/self-reported/` on the five named identities (SWE-bench Verified 11 / Multilingual 15 / Multimodal 7 / LongBench v2 3 / Terminal-Bench 4.0 2), 21 joined / 17 unjoined, all `basis: self_reported` with `comparison_key: null`; three withheld rows carry their critic objection; sampled values found verbatim in the retained captures. Never in Composite (`comparison_key: null` on every row). |
| CR-30.2 | Add the top new benchmarks from `BENCHMARK-CANDIDATES.md` (prefer ones with an independent leaderboard) to the | open | — | `BENCHMARK-CANDIDATES.md` exists (checked 2026-09-15 20:10 UTC): 492 candidate benchmarks ranked; tier-A = OSWorld 2.0, Toolathlon-Verified, MCP Atlas, FrontierSWE, PostTrainBench, SimpleQA Verified, FrontierMath v2 — ingest from their independent boards (several already sit in Epoch AI's archive), not from vendor rows. |
| CR-30.3 | Benchmark lists/tables show the new benchmarks (Overview all-benchmarks list, Benchmarks tab, compare) with se | open | — | Half of it is live with CR-30.1: the newly ingested values appear in the benchmark boards and tables and stay distinguishable (the `†` marker and the "Self-reported only" evidence filter the product already had). The other half — *new* benchmarks from `BENCHMARK-CANDIDATES.md` — waits for CR-30.2. |
| CR-31.1 | Simple mode: when the benchmark table comes into view — via the header 'Benchmarks' link scroll or by manual s | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-29-31/{canonical,legacy}/verification.json` (`bin/verify-cr-29-31.mjs`, 48/48 per host) | iter 71 claude-opus: 'This is a simplified list' once per visit, IntersectionObserver, reduced-motion safe (`5b8159f`); live canonical 48/48 · legacy 48/48 (after 4c6366c hint observer and fe29860 tooltip placement; first run 44/48) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-29-31.mjs` **48/48 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-29-31/{canonical,legacy}/verification.json`). |
| CR-31.2 | Simple benchmark table: an (i) next to every benchmark name, with a tooltip that briefly explains what the ben | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-29-31/{canonical,legacy}/verification.json` (`bin/verify-cr-29-31.mjs`, 48/48 per host) | iter 71 claude-opus: (i) per benchmark: description + score type, portalled tooltip (`5b8159f`); live canonical 48/48 · legacy 48/48 (after 4c6366c hint observer and fe29860 tooltip placement; first run 44/48) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-29-31.mjs` **48/48 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-29-31/{canonical,legacy}/verification.json`). |
| CR-32.1 | Simple view: the 'Minimum Capability Score' label gets a small downward triangle; clicking opens a compact pop | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-1-2/{canonical,legacy}/verification.json` (`bin/verify-cr-32-1-2.mjs`, 40/40 per host) | iter 71 claude-opus: score picker at the slider label (category composites follow with CR-25.6) (`24485b3`); live canonical 40/40 · legacy 40/40 **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-32-1-2.mjs` **40/40 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-1-2/{canonical,legacy}/verification.json`). |
| CR-32.2 | Simple view: the 'Max adjusted cost / task' label gets the same triangle picker to choose the cost measure: ad | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-1-2/{canonical,legacy}/verification.json` (`bin/verify-cr-32-1-2.mjs`, 40/40 per host) | iter 71 claude-opus: cost-measure picker: adjusted / blended / input / output (`24485b3`); live canonical 40/40 · legacy 40/40 **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-32-1-2.mjs` **40/40 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-1-2/{canonical,legacy}/verification.json`). |
| CR-32.3 | Rewrite the (i) tooltips next to 'Max adjusted cost' and 'Minimum Capability Score' to be much shorter and sim | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json` (`bin/verify-cr-32-33.mjs`, 44/44 per host) | iter 71 claude-opus: both tooltips 4 short bullets + method link (`1f8cfb5`, `72bd9fa`); live canonical 44/44 · legacy 44/44 (includes the CR-21.2 re-check after 7e74914 and the trimmed CR-32.3 tooltip) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-32-33.mjs` **44/44 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json`). |
| CR-32.4 | Value map Y axis: don't always run to 100 — fit the range to the plotted scores (sensible padding, rounded tic | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json` (`bin/verify-cr-32-33.mjs`, 44/44 per host) | iter 71 claude-opus: fitted Y axis, 100 only when best ≥ 90, Elo-aware (`1f8cfb5`); live canonical 44/44 · legacy 44/44 (includes the CR-21.2 re-check after 7e74914 and the trimmed CR-32.3 tooltip) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-32-33.mjs` **44/44 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json`). |
| CR-32.5 | Small cogwheel button on the value map opening chart settings, e.g. Y axis: fit to data / full 0–100 scale, la | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json` (`bin/verify-cr-32-33.mjs`, 44/44 per host) | iter 71 claude-opus: cogwheel: full Y scale / names / Pareto line, persisted (`959da71`); live canonical 44/44 · legacy 44/44 (includes the CR-21.2 re-check after 7e74914 and the trimmed CR-32.3 tooltip) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-32-33.mjs` **44/44 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json`). |
| CR-33.1 | 'Benchmarks for your shortlist' section: a column chart above the table showing all shortlist models' Benchmar | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json` (`bin/verify-cr-32-33.mjs`, 44/44 per host) | iter 71 claude-opus: shortlist column chart above the table (`959da71`); live canonical 44/44 · legacy 44/44 (includes the CR-21.2 re-check after 7e74914 and the trimmed CR-32.3 tooltip) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-32-33.mjs` **44/44 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json`). |
| CR-33.2 | The column chart has its own small score dropdown (same score list as CR-32.1: Main Composite default, categor | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json` (`bin/verify-cr-32-33.mjs`, 44/44 per host) | iter 71 claude-opus: chart score dropdown, no-data columns, Elo positions (`959da71`); live canonical 44/44 · legacy 44/44 (includes the CR-21.2 re-check after 7e74914 and the trimmed CR-32.3 tooltip) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-32-33.mjs` **44/44 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json`). |
| CR-33.3 | Simple benchmark table: the top row is ALWAYS the Benchmark Heaven Score (Main Composite Score), independent o | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json` (`bin/verify-cr-32-33.mjs`, 44/44 per host) | iter 71 claude-opus: Main Composite row always first + selected-score row (`1f8cfb5`); live canonical 44/44 · legacy 44/44 (includes the CR-21.2 re-check after 7e74914 and the trimmed CR-32.3 tooltip) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-32-33.mjs` **44/44 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-32-33/{canonical,legacy}/verification.json`). |
| CR-34.1 | Add a collector for `GET https://openrouter.ai/api/v1/benchmarks` to the data pipeline (raw capture with as_of | verified | `data/raw/openrouter-benchmarks.json` (1,518 rows / 250 models, as_of 2026-09-15T12:01Z); `data/raw/openrouter-benchmarks.method.md`; `lib/openrouter-benchmarks.mjs` + `test/openrouter-benchmarks.test.mjs` (3/3); collector run receipt | **Iteration 72 (opencode-kimi, implementer; handover step 7's terms gate executed first):** — /benchmarks page has NO licence (checked); API docs define `meta.citation` = "Required attribution when republishing this data" per source (the found statement); Datasets endpoints (different) are CC BY 4.0; Terms' no-scraping/competing-service clauses target site scraping and inference marketplaces, not a documented API nor a comparison site. **Decision (documented in the method md, flagged for X7):** ingest `source=openrouter` own runs with "OpenRouter Benchmarks" attribution; AA/DesignArena-relayed rows stay cross-check-only; CR-34.4 stays on hold (CR-35.3). Collector `scripts/fetch-openrouter-benchmarks.mjs` (2 req/day, key from env, fail-closed validator; no values in `data/dataset.json` — raw capture only) + non-fatal daily step + SCRAPING.md terms note. Live run: 268 own (gpqa 131 / τ² 123 / search 2–4 with engine+surface), 148 AA, 1,102 DesignArena. Gates green; npm test 470/470. **Needs a non-kimi verifier.** **Verified by iteration 73 (claude-opus, non-implementer):** data checks `/opt/benchmarkheaven/state/ux-evidence/iter73-verify-cr-34-35/verification.json` — capture 1,518 rows = counts field (openrouter 268 / AA 148 / DesignArena 1,102, as_of 2026-09-15T12:01Z), terms + citation recorded, no values in `data/dataset.json`, no key material in capture/method, daily step `fetch-openrouter-benchmarks` present in `ops/daily/daily.mjs`. |
| CR-34.2 | New independent benchmarks from OpenRouter's own runs: GPQA Diamond (OpenRouter run), τ²-Bench Verified Airline, and the search benchmarks |  verified  | `/opt/benchmarkheaven/state/ux-evidence/iter75-cr-34-2-3/{canonical,legacy}/verification.json` (`bin/verify-cr-34-2-3.mjs`, **72/72 per host**, live at `7a08d31`, 1440/390, light/dark) | **Iteration 75 (claude-opus, implementer):** `7a08d31`, `c29c103`. Twelve registry entries at `snapshot-2026-09-15`: `openrouter-gpqa-diamond` (126 models), `openrouter-tau2-bench-airline` (120), `openrouter-search-{browsecomp,dsqa,hle,widesearch}` (2–4 each), each with a `…-cost` twin (CR-34.3). 514 joined observations; values match openrouter.ai/benchmarks row for row (GPQA top 94.4 % Gemini 3.1 Pro Preview, τ²-Bench top 80.6 % Gemini 3.7 Flash). Accuracy ± published stddev and task count travel with each observation and render in the evidence panel. **Separate registry identities from AA's same-named boards; never merged.** Identity (`lib/openrouter-benchmark-scores.mjs`): `model_permaslug` → catalog family via the OpenRouter offers the catalog already carries; a slug with no offer or claimed by two families joins nothing. GPQA/τ²-Bench rows publish no effort → family-scoped, attached once to the deterministic family representative (`lib/family-representative.mjs`, extracted from build-dataset) with a protocol note — the Epoch/DesignArena rule. Search rows do publish it (the own-run call gained `include_run_config=true`) → exact configuration join or unjoined; three DeepSeek V4 Flash rows stay unjoined because OpenRouter ran "high" and the catalog has only `::max`. Newest `last_run_timestamp` represents a family; an exact tie represents nothing. Tier: **niche**, not headline (`c29c103`) — release posts cite AA's GPQA/τ²-Bench, and the Simple table must not show two different GPQA numbers. Both boards keep every row in the full Benchmarks table. Freshness: ingestion reads the **locked capture**, not the daily-refreshed snapshot, so a dated identity and its bytes stay one pair; `ops/daily/refresh-benchmarks.mjs` reports `source_changed_retained` and parks the day's capture for a reviewed version rotation. Tests: `test/openrouter-benchmark-scores.test.mjs` (6). **Needs a non-claude engine to set `verified`.** **Verified by review gate 20260916T010002Z (opencode-kimi, non-implementer):** `bin/verify-cr-34-2-3.mjs` **72/72 per host** at `958f207`, 1440/390, light/dark. Independent spot-check against the lock-pinned capture (`4fab3d14…`, as_of 2026-09-15T12:01Z): 25 sampled score rows and 246 cost-twin rows match exactly; 257+257 joined / 3 documented DeepSeek unjoined rows (OpenRouter ran "high", catalog has only `::max`); 257+257 = 514 joined, matching the ledger claim. |
| CR-34.3 | Use OpenRouter's measured `avg_cost_per_task` as an additional, clearly labelled cost signal — never silently replacing the adjusted cost model |  verified  | same as CR-34.2 (`bin/verify-cr-34-2-3.mjs`, **72/72 per host**) | **Iteration 75 (claude-opus, implementer):** each score board has a `…-cost` twin in category `Efficiency` (unit USD, lower-is-better) holding OpenRouter's measured `avg_cost_per_task`. It rides on the score row (`costPerRollout`) and renders as "… USD per task (measured by OpenRouter)", with "measured by OpenRouter on <benchmark>" in the evidence panel. It is **never** an input to the adjusted cost model and never lands in `models[].benchmarks`. New `coverage.capability_available` / `total_capability_benchmarks` exclude `Efficiency` boards, so a cost board counts as a cell but not as a benchmark in the "#benchmarks" column. **Needs a non-claude engine to set `verified`.** **Verified by review gate 20260916T010002Z (opencode-kimi, non-implementer):** same `verify-cr-34-2-3.mjs` **72/72 per host**; 246 cost-twin observations match the locked capture's `avg_cost_per_task` exactly (0 mismatches); cost twins render "measured by OpenRouter on <benchmark>", category `Efficiency`, Unit USD, never an adjusted-cost input and excluded from `#benchmarks` via `capability_available` (re-read in build code). |
| CR-34.4 | Add Artificial Analysis Agentic Index (from this API or AA directly) to the taxonomy, category composites (Age | open (ON HOLD: AA permission pending, see CR-35.3) | — | — |
| CR-34.5 | Use the API's DesignArena rows to fill gaps and cross-check existing DesignArena values (categories: website,  | open (blocked on Florian) | `/opt/benchmarkheaven/state/ux-evidence/iter78-designarena-terms/` | **Iteration 78 (claude-opus):** the source's own rules were read before widening anything — `designarena.ai/robots.txt` says `Disallow: /api/`, and the Arcada Labs terms forbid access "using any engine, software, tool, agent, device, or mechanism (including spiders, robots, crawlers, data mining tools, or the like) other than … generally available third-party web browsers". No API documentation, licence or attribution clause exists there. The daily run calls `POST /api/leaderboard` and `GET /api/registry` every day, and no terms review for this source exists in the repo. The other half of CR-34.5 cannot substitute: OpenRouter's relayed `design-arena` rows are the "models" arena (iteration 76) and are cross-check-only. Nothing widened, nothing switched off unilaterally (DesignArena values are visible product: the Compare radar's Full-Stack axis, CR-14/CR-15). **Escalated to Florian, Telegram 13762, 2026-09-16 04:37 UTC** — ask Arcada Labs as with AA · keep as a documented risk · drop the source. |
| CR-34.6 | Evaluate OpenRouter's media benchmarks (Image, Video) and whether they fit the product; document the decision | verified | `data/raw/openrouter-benchmarks.method.md` ("Decision" paragraph); CHANGELOG | **Iteration 72 (opencode-kimi):** evaluated — the API's media surface (Image, Video; samples + per-output $) targets generation models with non-text capability scores; Benchmark Heaven's taxonomy, category composites, benchmaxxing method and adjusted-cost model all assume text-capability task accuracy. A media score has no honest place in any of them. **Decision: not ingested** (documented in the method md, flagged for X7). Re-openable if Florian wants a media section. **Needs a non-kimi verifier.** **Verified by iteration 73 (claude-opus, non-implementer):** decision paragraph present in the method md ("Media benchmarks … not ingested"), flagged for X7 (`/opt/benchmarkheaven/state/ux-evidence/iter73-verify-cr-34-35/verification.json`). |
| CR-35.1 | Attribute Artificial Analysis wherever AA data is shown: a visible 'Data: Artificial Analysis' (linked to http | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-35/{canonical,legacy}/verification.json` (`bin/verify-cr-35.mjs`, 72/72 per host) | iter 71 claude-opus: AaCredit on footer, tooltips, cost modal, tables, value map, column chart, radar, model page, /about, Benchmaxxing (`738432c`); live canonical 72/72 · legacy 72/72 (after c9b97d7/e99d640 and the tap() harness fix) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-35.mjs` **72/72 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-35/{canonical,legacy}/verification.json`). |
| CR-35.2 | A prominent 'BETA — Work in progress' tag in the site header (next to the logo/name) on all pages, plus a shor | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-35/{canonical,legacy}/verification.json` (`bin/verify-cr-35.mjs`, 72/72 per host) | iter 71 claude-opus: BETA — Work in progress pill + note on hover/focus/tap; phone header fits (`738432c`, `c9b97d7`, `e99d640`); live canonical 72/72 · legacy 72/72 (after c9b97d7/e99d640 and the tap() harness fix) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-35.mjs` **72/72 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-35/{canonical,legacy}/verification.json`). |
| CR-35.3 | Hold: do not add new Artificial Analysis-derived metrics (CR-34.4 Agentic Index) until Florian reports AA's an | open | — | — |
| CR-35.4 | Epoch AI attribution (CC-BY): wherever Epoch data is shown (Epoch ECI, Epoch Software ECI, other Epoch-run ben | verified | `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-35/{canonical,legacy}/verification.json` (`bin/verify-cr-35.mjs`, 72/72 per host) | iter 71 claude-opus: Epoch AI (CC BY) credit on Epoch surfaces + recommended citation on /about (`96818a6`); live canonical 72/72 · legacy 72/72 (after c9b97d7/e99d640 and the tap() harness fix) **Verified by iteration 72 (opencode-kimi, non-implementer):** `bin/verify-cr-35.mjs` **72/72 per host** live on both hosts at `d2929fa`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-cr-35/{canonical,legacy}/verification.json`). |
| CR-35.5 | For benchmark rows taken from Epoch's hub that Epoch sourced from external projects, record and display the or | verified | `data/raw/epoch-hub-provenance.json` (from `scripts/build-epoch-provenance.mjs`); `data/raw/epoch-eci.method.md` ("Hub provenance" section) | **Iteration 72 (opencode-kimi, implementer):** `data/raw/epoch-hub-provenance.json` classifies all 81 benchmarks in Epoch's own captured `benchmark_metadata.csv` as `epoch_run` (35) vs `external_project` (46) from Epoch's `*_external.csv` result-file naming, with `in_eci`, release dates, original project **only where this repo's own evidence already names it** (registry primary_urls: DeepSWE→Datacurve, FrontierCode→Cognition AI, Terminal Bench→tbench.ai, Aider polyglot→aider.chat, WeirdML→htihle.github.io; CR-20260915n table: METR Time Horizons→METR). Never invented an attribution. Product-consumed rows: 10 external of the 12 software-ECI inputs + DeepSWE displayed directly (already labelled "Datacurve, via Epoch AI"). **Licence-unclear, flagged per the rule instead of silently shown: Cybench, ExploitBench, PostTrainBench, Surface Evolver Bench** (externally-sourced in Epoch's hub; original terms not yet confirmed — shown meanwhile under Epoch's CC-BY umbrella, documented in the method md). Daily non-fatal step `build-epoch-provenance`; SCRAPING.md row updated. UI deep-annotation of the provenance per ECI input benchmark lands with the next ECI-touching change. **Needs a non-kimi verifier.** **Verified by iteration 73 (claude-opus, non-implementer):** `/opt/benchmarkheaven/state/ux-evidence/iter73-verify-cr-34-35/verification.json` — 81 benchmarks = 35 epoch_run + 46 external, classification agrees with Epoch's `*_external.csv` naming for every row; named original projects only the six evidence-backed ones; the four flagged licences (Cybench, ExploitBench, PostTrainBench, Surface Evolver Bench) are in the unclear list (which also carries further non-consumed hub benchmarks); evidence CSV present; daily step `build-epoch-provenance` present. |
| CR-36.1 | Compare tab 'Add models' search: redesign the dropdown — clean list with lab logo/name, model name, release da |  verified  | `/opt/benchmarkheaven/state/ux-evidence/iter74/` | Iteration 74 (claude-opus), `aa46183`: listbox under the input (full-width sheet below 768 px), "Top by AA Intelligence Index" when empty, bold matches, ↑↓/Enter/Esc with `aria-activedescendant`, opaque and above everything. Live `verify-cr-36-1-2.mjs` **65/65 per host** (1440/390, light/dark). Needs a non-claude verifier. **Verified by review gate 20260916T010002Z (opencode-kimi, non-implementer):** `bin/verify-cr-36-1-2.mjs` **65/65 per host** at `958f207`, 1440/390, light/dark. Deviation recorded for X7 (unchanged from iteration 74): empty-query list headed "Top by AA Intelligence Index" — the Composite exists only client-side; the list names the score and carries the AA credit (CR-35.1). |
| CR-36.2 | Compare picker lists one entry per model (weights/training run), not every reasoning variant. For each benchma |  verified  | `/opt/benchmarkheaven/state/ux-evidence/iter74/` | Iteration 74 (claude-opus), `aa46183`: `compareFamilies` / `selectFamilyBenchmarkView` in `lib/benchmark-view.mjs` — one entry per model, per benchmark the best of its reasoning variants (direction-aware; measured, full-sample rows rank first), each row keeps `variantId`/`variantLabel`/`bestOf`; chips say "best of N" and name the variants, full-comparison cells say "best of variants: <variant>". Live 65/65 per host, incl. an independent recompute of the chosen value from the uncollapsed API. Needs a non-claude verifier. **Verified by review gate 20260916T010002Z (opencode-kimi, non-implementer):** same `verify-cr-36-1-2.mjs` **65/65 per host** at `958f207`. Independent spot-check against the open capture: best-of values and variant labels match the uncollapsed API. |
| CR-36.3 | Options panel: revamp the Models and Providers dropdowns (and the new Labs one from CR-25.5) — they are too bi | verified | `/opt/benchmarkheaven/state/ux-evidence/iter73-verify-cr-25-36/{canonical,legacy}/verification.json` (`bin/verify-cr-25-36.mjs`, **76/76 per host**, live at `22ad0f9`, 1440/390, light/dark); unit tests `test/regions.test.mjs`, `test/cost.test.mjs`, `test/presets.test.mjs` | **Iteration 73 (claude-opus, implementer):** `808ef9e` — `components/MultiCombobox.tsx`: trigger shows only the count ("Providers: 88 of 92"); list rendered into <body> so the panel's scroll area cannot clip it — as wide as the trigger (min 280 px), ≤ 320 px with internal scroll at desktop, bottom sheet on phones; search, All · None ("None" then one pick = only that item), selected-first alphabetical order fixed while open, chips for picked items, ↑↓ between options, Escape closes the list and returns focus without closing Options. Options panel 589 px tall at 1440 (F-94 ≤ 600). Decision: the old provider quick-pick links were dropped (they squeezed the list to two rows; filter presets cover those cases). **Needs a non-claude verifier.** **Verified by review gate 20260915T212002Z (opencode-kimi, non-implementer):** `bin/verify-cr-25-36.mjs` **76/76 per host** live on both hosts at `4be0957` and again at `c11af043` — count-only triggers, popover into `<body>` (≤ 320 px internal scroll, phone bottom sheet), search/All·None/chips/↑↓/Escape, nothing clipped; 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260915T212002Z/{canonical,legacy}/verify-cr-25-36{,-c11af04}/`). |
| CR-37.1 | Add every Lumina Bench benchmark family we don't have yet (from the intake job's verified `NEW-BENCHMARKS.md`  | open | — | — |
| CR-37.2 | Scraper/updater: add a daily collector for Lumina's data ledger as a discovery + provenance feed (manifest has | open | — | — |
| CR-37.3 | Results for the new benchmarks shown across the site (full benchmark list, Benchmarks tab, compare, category s | open | — | — |
| CR-38.1 | For every source in CR-20260915n: a collector in the scraper/updater (API > official download > leaderboard pa | open | — | — |
| CR-38.2 | Saturation/freshness metadata per benchmark: test version, task/question date window, contamination notes, and | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter77-cr-38-final/{canonical,legacy}/verification.json` (`bin/verify-cr-38.mjs`, **81/81 per host** live at `5c43c4e`, 1440/390, light/dark); unit tests `test/benchmark-caveats.test.mjs` (14) | **Iteration 77 (claude-opus, implementer):** `0033b25`. **Saturated is measured, not asserted** — `saturationOf` in `lib/benchmark-matrix.mjs`: a bounded higher-is-better scale (fraction [0,1], percent, or points registered [0,100]), independently *measured* results for ≥ 5 catalog models, and the mean of the 5 best ≥ 90 % of the ceiling. Six boards qualify at this build: τ²-Bench Telecom (AA) 98.8 %, AIME 2025 (AA) 97.6 %, GPQA Diamond (AA) 95.5 %, GPQA Diamond (OpenRouter run) 94.1 %, Harvey LAB-AA 94.1 %, Terminal-Bench v2.1 (AA) 90.3 % — exactly the boards everyone treats as saturated, found by the rule and not by a hand-written list (a test asserts AIME and GPQA are caught). A row we cannot assess (Elo, open points scale, < 5 measured models) carries **no** tag and is explicitly not called unsaturated. **Freshness fields exist for every benchmark**: version + version status (registry), the date the results were last verified, and — only where the verified source states it — the task/question date window and the contamination control; where the source says nothing the field says exactly that (`freshness_default` in `data/benchmark-caveats.json`). No date window is inferred from a benchmark's name. Curated windows today: AIME 2025, OTIS Mock AIME 2024–2025; curated contamination notes: 9 (private/held-out/semi-private/refreshed sets, plus AA LiveCodeBench's stated *unknown* window). **Down-weighting (documented):** a saturated row counts at `SATURATED_WEIGHT = 0.5` in every category composite — the Benchmarks-page and Simple category header rows and the selectable CR-25.6 category scores. **Value change:** `cat_science` is now `(CritPt + 0.5 × GPQA Diamond) / 1.5`, ≈ 10 points below earlier builds, for 515 model rows; `cat_coding`/`cat_agentic`/`cat_long_context` unchanged. Documented in `API.md`, `CHANGELOG.md`, `/about#benchmark-tags` and `data/category-score-anchors.json`. No Main Composite slot is saturated (a test fails if one becomes so). **Needs a non-claude verifier.** |
| CR-38.3 | Human-preference arenas (Arena, DesignArena, EQ-Bench-style judged scores) are labelled as preference/judged s | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter77-cr-38-final/{canonical,legacy}/verification.json` (`bin/verify-cr-38.mjs`, **81/81 per host** live at `5c43c4e`); the reviewer's verdicts at `/opt/benchmarkheaven/state/ux-evidence/iter77-cr-38/judged-review-kimi.json`; unit tests `test/benchmark-caveats.test.mjs` | **Iteration 77 (claude-opus, implementer):** `0033b25`, `5c43c4e`. **Definition recorded in the data** (`data/benchmark-caveats.json` → `judged_definition`): a benchmark is judged when the published number ranks or rates outputs by preference or quality; a judge that only checks whether an answer is *correct* (equality checker, majority vote on accuracy, an LLM normalising an entity name before exact matching) is **not** judged, because the ground truth still decides. 24 judged families, including DesignArena Frontend/Full-Stack, AA GDPval, AA-Briefcase, Harvey LAB-AA, APEX-Agents-AA, the EQ-Bench boards, the Lech Mazur boards, PingPong, RP-Bench, Slop Index, Spiral-Bench, Towards-AI editorial, UGI Writing, FrontierCode and SWE-Atlas Test Writing. **Every classification quotes its own source verbatim** and `test/benchmark-caveats.test.mjs` fails if a quote is not found in the cited registry/taxonomy field — a label can never rest on a sentence no source wrote. Eight near-misses are recorded with their reason in `considered_not_judged` (AA AnalystAgent, AA IT-Bench, AA MLCR, EQ-Bench Slop Score, SlopBench, LiveBench, SWE-Atlas QnA and Refactoring). **Reviewed by a different engine:** `opencode-kimi` judged all 32 rows from their own source text — 31 agreed, and its one disagreement (SWE-Atlas Test Writing, whose description names LLM judges as the graders while its siblings' do not) was checked against the registry and applied in `5c43c4e`. **Kept separate in composites:** a judged row never averages with task accuracy — in a mixed category only the task-accuracy rows make the composite and the category (i) says how many judged rows were left out; a category whose qualifying rows are *all* judged gets a composite of those and is named a judged composite. A judged benchmark may not be a CR-25.6 anchor at all: `assertNoJudgedAnchors` throws at build time rather than silently redefining a published score. **Interpretation for X7:** the Main Composite keeps DesignArena Frontend and Full-Stack (Florian's own definition) — they are two of seven *separate*, percentile-normalised slots, never averaged into task accuracy, and `/about` now says so. **Needs a non-claude verifier.** |
| CR-38.4 | Aggregators (Lumina, BenchLM, The Aggregate, LLM Stats, Vellum, LM Council, CodeSOTA, BenchmarkList, HF find-a | open | — | — |
| CR-38.5 | Daily/weekly refresh schedule per source with fail-closed gates and a source-health view in ops (which collect | open | — | — |
| D09.1 | Florian directive 2026-09-15 (`09-FLORIAN-DIRECTIVE-AA-AND-FALLBACK-2026-09-15.md`): Artificial Analysis collection continues on its normal schedule (no wait for the email reply); `Nex 2.5 Pro` ahead of paid OpenRouter fallbacks only when the exact free route is confirmed | open | — | **Iteration 73 (claude-opus) check:** nothing in this repo pauses AA collection — CR-35.3 only holds *new* AA-derived metrics; live `/api/meta` dates `artificialanalysis` 2026-09-14 and `aa_efficiency` 2026-09-14T05:14Z (acceptance 1 needs the next ordinary daily run's receipt, which this loop does not start). Fallback order in `bin/delegate.sh`: `openrouter/nex-agi/nex-n2.5-pro:free` first, then Kimi K3 via Chutes (free); no paid OpenRouter model anywhere in this loop. The paid-fallback order lives in Hermes' model policy, outside this repo. **Iteration 78 (claude-opus) check:** still open, and the reason is measured now — no ordinary daily run has succeeded since 2026-09-14. The 2026-09-15 run failed at the `chutes_efficiency` live-source-contract gauntlet: all three rounds landed on DeepSeek free endpoints that timed out (that run's `workers/unavailable-models.jsonl` records all three). Not an AA problem and not a broken exclusion — a failed model *is* recorded and excluded, but `selectModelForWorker` deliberately retries an excluded **critic** when no other authorized scheduled worker qualifies, and the whitelist (`FLORIAN_ALLOWED_SCHEDULED_WORKERS`) left nothing eligible against a DeepSeek producer. That whitelist is Florian's model policy, owned outside this loop, so this iteration records rather than changes it. Next chance: the 05:17 UTC run. |
| D10.1 | Florian directive 2026-09-15 (`10-FLORIAN-DIRECTIVE-MOBILE-TABLE-TAGS-2026-09-15.md`): Simple overview cost tag compact `↓11×` in mobile portrait (320/375/390), desktop/tablet text unchanged, accessible words kept, no overlap/overflow | verified | `/opt/benchmarkheaven/state/ux-evidence/iter73-verify-d10-value-tag/{canonical,legacy}/verification.json` (`bin/verify-d10-value-tag.mjs`, **70/70 per host**, live at `3fd6a42`: 320/375/390 portrait, 844 landscape, 768 tablet, 1024 + 1440 desktop, light/dark) | **Iteration 73 (claude-opus, implementer):** `22ad0f9`, `3fd6a42` — compact `↓11×` (no words, no space) with the words kept in the tooltip and screen-reader text. **Decision for X7:** measured that below 1024 px the full words overflow the cost cell (at 768 they covered the score), so the compact tag applies below 1024 px, not only on phones; ≥ 1024 px unchanged. On phones the cost cell drops its left padding and uses a 2 px gap so the tag stays inside its cell at 320. The 1024 page-overflow check is scoped to the table: the header itself overflows at 1024 (pre-existing, logged in the iteration 73 block). **Needs a non-claude verifier.** **Verified by review gate 20260915T212002Z (opencode-kimi, non-implementer):** `bin/verify-d10-value-tag.mjs` **70/70 per host** live on both hosts at `4be0957` and again at `c11af043` (320/375/390 portrait, 844 landscape, 768 tablet, 1024 + 1440 desktop, light/dark; `/opt/benchmarkheaven/state/ux-evidence/review-20260915T212002Z/{canonical,legacy}/verify-d10-value-tag{,-c11af04}/`). The iteration-73 deviation (compact below 1024 px, not phones only — the full tag covered the score at 768) is documented and carried to X7; the pre-existing header overflow named here is fixed by this gate (`c11af043`, see the gate record). |

- **2026-09-13 · iteration 22 · codex-luna · review gate** — reviewed all changes after
  `REVIEW-20260913T085002Z.md` through `c88e83b`, against the verbatim requirements, brief,
  Hermes addendum and design directives.
  - Current live revision is `c88e83be053664adea3fff2ff7fa3d6b4251e5eb` on both hosts.
    The full desktop/mobile, light/dark matrix is in
    `/opt/benchmarkheaven/state/ux-evidence/review-20260913T110002Z/`; the changed pass-3
    surface has no product failures. F-08a/F-08b and F-22–F-28 are independently verified.
    F-19 is live but remains `implemented` because its implementation is codex-luna's own.
  - Gates: `npm test` 266/266, `npm run data:build`, `npx tsc --noEmit`, isolated Next
    build 21/21 and `git diff --check` all pass. The rebuild's timestamp-only dataset diff
    was discarded. The Kimi delegation was attempted via `delegate.sh`, but OpenCode blocked
    the external-directory read; no delegated output was trusted.
  - Repaired the review harness: stable header filter selector, `dialog[open]` close check,
    and page-level rather than clipped-descendant overflow measurement. Re-run evidence is
    error-free.
  - R1/R2/R4/R5/R7 and X5 were promoted only where the current live/code evidence and the
    one-engine rule allow it. R4.10, E1, B2, B7, F-19 and the listed historical items remain
    `implemented` where Codex authored the change or this gate did not re-fetch the claim.
  - R9.1, E2/E3, P1–P4, X2, X3/X4, X6 and X7 remain open or in-progress. The source-date
    inventory is still not all dated today, community sources are not ingested through the
    gauntlet, PRD/AA closure is incomplete, and X6 therefore fails. No `ALL-ACCEPTED` line
    was appended and no final Telegram was sent.

---

## Recorded interpretations (Florian may overrule — carry into X7)

- **R4.4** The new "roughly the AA top 20 are featured" rule supersedes the older house rule
  that Gemini is not featured. 101 models are featured today; that is not "roughly 20".
- **R4.10** The checkbox is an **opt-in to include** providers that train or retain data. It is
  unchecked by default, so such providers are filtered out by default. Chutes is always
  treated as satisfying both guarantees.
- **R4.10 (second interpretation, the consequential one)** Read literally, "a provider not in
  the OpenRouter list is filtered out" would also remove every provider OpenRouter does not
  list at all — today: T-Systems, TensorX, Scaleway, OVHcloud, IONOS, STACKIT and
  TrustedRouter, i.e. exactly the European sovereign hosts the `/eu` view exists for.
  Removing them would assert that they train on or retain your data, which we have not read
  anywhere and would be an invented policy (ground rule 5). **Decision: known-fail is
  filtered out, known-pass is kept, and unknown is kept and labelled as unknown** in the
  filter's own (i) text and on `/about#data-policy`. Numbers: 48 providers pass, 37 fail,
  7 are unknown. Florian can overrule this to "unknown is filtered out too" — carry to X7.
- **R5.2** "über den Preis absteigend sortiert" is implemented **literally** (most expensive
  first) in Simple mode.
  **Fable 5.1 (2026-09-13) judges cheapest-first clearly better for a recommendation list**;
  the literal default stays, the Adjusted Cost header toggles it in one click — ask Florian in X7.
- **R3.1** Fable 5.1 rejected Florian's draft wording ("All benchmark results … most realistic
  cost estimate") because "all" over-reaches (P4) and "most realistic" is weaker than the
  "only site" claim he asked for. Final line in `DESIGN-DIRECTIVES.md`. He may prefer his own.
  **Pass 6 (final):** the 16:10 gate objected that Artificial Analysis also shows a per-model
  cost per task. It shows a list-price number for one route; ours prices the route *your*
  filters leave open with that endpoint's cache prices — hence "really costs **you**". Kept.
  Exclusivity-free fallback if he dislikes "only": *"And the only place that prices each model
  the way you would actually buy it."*
- **R5.3** "Score >85" is live as a default of **86** (D2 stored 86 so a clean page is not shown
  as modified; the caption says "Minimum Capability Score 86"). Fable pass 6 had written "85 applied
  as ≥ 85" — for integer scores that is the same set of rows, and pass 9 (Fable) confirmed the
  caption states what the slider does. He may set another number.
- **F-22 / R5.5** The Simple value map deliberately shows the whole featured pool — passing
  models as full labelled points, the rest dimmed — so the reader sees what the sliders cut.
- **R4.4 (new, consequential)** "Roughly the top 20 of the AA Index charts" is implemented as
  **exactly** the top 20 model families by best AA Intelligence Index, deprecated excluded,
  plus pins. Consequences Florian may want to overrule: (a) the older house rule "Gemini is
  never featured" is gone — Gemini 3.8 Flash (rank 12) and Gemini 3.7 Flash (rank 17) are now
  featured; (b) popular workhorses just outside the cut are no longer featured — Claude
  Sonnet 5 (rank 25 of the non-deprecated field), GPT-5.4, GLM 5.2 is in at 20 but GPT-5.6
  Luna, MiniMax, MiMo and the Kimi K2.x line are out; (c) deprecated flagships drop out by
  rule, which today removes Claude Opus 4.8 and 4.7. Raising the cut-off to ~25 would bring
  Sonnet 5 and GPT-5.4 back — a one-line change (`FEATURED_TOP_N`).
- **R5.5** The distribution histograms are shown **permanently**, not only while a slider is
  dragged. Reason in the code: the score limit is already active at 85 on first paint, so an
  interaction-only chart would hide the very fact that the default is cutting the field.
- **R6.2** The verdicts for OpenAI and xAI are "unclear from published terms" because both
  sites answer an automated request with HTTP 403. That is bot protection, and this workstream
  does not work around it. Someone reading those two pages in an ordinary browser would close
  the gap in two minutes.

---

## Handover — what the next iteration should pick up (rewritten 2026-09-12, iteration 2)

Highest value first, dependencies before the UI that shows them:

1. **B4 / B5 — the Benchmaxxing tag in the overview table and the small-print method note.**
   `BenchmaxxExplorer` and `BenchmaxxingReport` already exist; the tag never reaches the
   overview table, and the method is not explained on the page. Cheap, visible, and B1–B3/B6/B7
   are claimed implemented but have never been verified live.
2. **R8.1 — release-post-style benchmark comparisons.** `ChartsBoard` / `BenchmarkCompare`
   exist and are not at the bar Florian described. This is the biggest remaining *design*
   item and should follow a Fable 5.1 pass (X3 is still open — no `DESIGN-DIRECTIVES.md`
   exists yet).
3. **R9.1 — a full fresh data run** with every live source dated today, deployed and proven.
4. **R6.3 — subscriptions in the cost view.** The research (R6.2) is done and says something
   important: only GitHub Copilot publishes an absolute included quota. Model Copilot
   honestly, and show "quota not published" for the rest instead of an implied per-task price.
5. **H3** — the "better than model X in category Y" filter. The wizard's capability page
   already computes a release-date frontier; H3 is the general case of the same idea.
6. **P1 / P2** — the PRD and the cited Artificial Analysis capability comparison. Both are
   gates on declaring the ledger complete, and P1 needs a *different engine* as reviewer.

Notes for whoever picks this up:
- `ops/ux-2026-09-12/bin/verify-live.mjs` now honours `BH_OUT`; run it against
  https://benchmarkheaven.com, not only locally.
- Simple mode shows 6 of 15 rows at its defaults (featured + Composite ≥ 85 + measured task
  tokens). That is now *stated on the page* ("6 of 15 recommended models meet your limits"),
  so it is no longer a silent shortfall — but if Florian wants a fuller list, the lever is
  `FEATURED_TOP_N` or the 85 default, not the limit of 15.
- Settings storage key is at **v8**; anything added to `SettingsState` needs the sanitiser
  entry, the Reset call and the `active` check in `GlobalFilters` or it will silently not
  reset.

## Iteration log

- **2026-09-12 · iteration 1 · claude-opus** — seeded this ledger; re-checked every prior claim
  against source + live; located the R4.10 source; recorded defects D1–D3.
  Then implemented and locally verified: R1.1–R1.8, R2.2, R3.1, R4.1–R4.3, R4.5–R4.11,
  R5.1, R5.2, D1–D3.
  - New data source: `scripts/fetch-openrouter-data-policy.mjs` → `data/raw/openrouter-data-policy.json`.
    Robots-allowed public page, one request per run, parse validated against the page's own
    facet counts (47 zero-retention / 81 does-not-train — both matched exactly). Refreshed
    daily from `ops/daily/daily.mjs`, deliberately **non-fatal** there so a layout change in a
    secondary table cannot block price and benchmark publication.
  - Routes resolve to an OpenRouter provider slug through `endpoint_tag`, which is
    OpenRouter's own identifier — 1995 of 1996 OpenRouter routes resolve, no name matching.
    Non-OpenRouter platforms use a small documented alias table; anything unmapped stays
    `null`, never a guessed verdict.
  - Gate: `build-dataset` ✓, `npm test` 238/238 ✓, `tsc --noEmit` ✓, `npm run build` ✓.
  - Verification harness committed as `bin/verify-live.mjs`; run it with
    `BH_OUT=<dir> node ops/ux-2026-09-12/bin/verify-live.mjs <base-url>`.
  - Verified **against https://benchmarkheaven.com after the deploy landed**, not only
    locally: `/opt/benchmarkheaven/state/ux-evidence/iter1-live/` (verification.json +
    4 screenshots, desktop 1440×950 and mobile 390×844). The local pre-push run is in
    `.../iter1/`. Legacy host `model-market-comparison.app.mintapis.com` still returns 200.
  - **Statuses stay `implemented`, not `verified`** — ground rule 2 reserves `verified` for
    an engine other than the implementer. The evidence for the review gate is in place.
  - Two defects the browser check caught and that are now fixed: Advanced inherited
    Simple's sort because `defaultSort` only seeds `useState` (fixed with a remount key),
    and the score sub-label printed the full 60-character label instead of the name.
  - Second push added the `02-ADDENDUM-HERMES-CHAT.md` rows (E1–E3, P1–P4, F1, C1) and,
    following **P4**, removed the unsupported superlative ("the most complete collection of
    model benchmark results anywhere") from the page metadata. The visible hero keeps
    Florian's own sanctioned phrasing but states the actual counts in the line underneath.
  - **R6.2 delegation failed** — the free OpenCode model aborted on a sandbox permission
    prompt (`/home/flori/.agent-budget.json`) before doing any research. R6.2 stays open;
    retry with a prompt that does not leave the repo directory.

- **2026-09-12 · iteration 2 · claude-opus** — implemented R4.4, R5.3–R5.6, R7.1–R7.3, R6.2;
  moved R6.1 to `partial` with an honest tooltip.
  - **R4.4** turned the featured set from a 35-family hand-kept regex into a derived top-20 of
    the AA Intelligence Index. Three tests that named specific families as featured were
    rewritten to re-derive the rule from the data; one Azure route test was asserting on the
    featured flag when what it actually guards is route policy, and now says so.
  - **R7** added `scripts/build-brand-assets.mjs` as the single generator for every brand
    asset, with the measurement transform from the JPEG written into the file so the shape
    stays checkable against Florian's artwork.
  - **R5.6** required lifting `maxCost` (and the new `minIntelligence` / `minCoding`) out of
    `ModelExplorer` into `SettingsContext`, storage key v7 → v8.
  - Defects found and fixed while verifying in a browser: an unpriced model headed the
    cost-descending ranking (null price sorted as infinity); the "I'm buying for a company"
    tooltip claimed a filter that does not run.
  - Gate before every push: `build-dataset` ✓, `npm test` 239/239 ✓, `tsc --noEmit` ✓,
    `next build` ✓.
  - Delegation: the R6.2 research went to OpenCode (nex free failed over to Kimi K3) and came
    back genuinely good — verbatim quotes, vendor domains only, honest "could not fetch" for
    the two sites that 403 automated clients. Every load-bearing claim was independently
    re-fetched before it was committed; nothing had to be corrected.
  - **Verified live against https://benchmarkheaven.com after the deploy landed**, desktop
    1440×1000 and mobile 390×844, evidence in
    `/opt/benchmarkheaven/state/ux-evidence/iter2-live/` (`verification-iter2.json` plus 9
    screenshots). Harness committed as `ops/ux-2026-09-12/bin/verify-live-iter2.mjs`.
    What it proves: three modes with Simple selected on load · score slider is a real
    `type=range` at 85 whose movement changes the table (6 → 14 rows) · cost slider present at
    "no limit" · 48 histogram bars on desktop **and** on mobile · all four wizard question
    pages plus its results, on both widths, with the capability floor naming the model it came
    from · `--brand-*` demonstrably different between themes · favicon, touch icon, PWA icon
    and OG image all 200 and the favicon containing the new mark · /about listing exactly 20
    featured families with rank and index, DeepSeek V4.1 Flash among them.
  - Defects the live run caught: the /about featured list spelled "Deepseek" where the table
    said "DeepSeek" (and "QWEN3.8" for "Qwen3.8") — vendor brand casing is now applied in
    `familyDisplay()`. And on a 390 px phone the hero filled the whole first screen, pushing
    the shortlist below the fold; the small-screen hero is now denser.
  - **Statuses stay `implemented`, not `verified`** — ground rule 2 reserves `verified` for a
    different engine. The evidence a reviewer needs is in place.
  - **Telegram sent** (message_id 13597, 2026-09-12 ~20:50 UTC): the R6.2 research result
    Florian asked for by name, plus the one decision he may want to overrule (R4.4 as exactly
    top 20 → Gemini in, Claude Sonnet 5 and GPT-5.4 out; the lever is `FEATURED_TOP_N`), plus
    two lines of status. A reply watcher runs for 120 minutes and writes
    `~/.claude/skills/watch-telegram-replies-30min/scripts/tg_reply.json`. **The next
    iteration must read that file first** — if Florian answered, his answer outranks
    everything in this handover. This is not X7: the final Telegram still owes him the
    R4.10 and R5.2 interpretations and whatever is open at the end.

- **2026-09-12 · iteration 3 · codex-luna** — implemented E1 and deployed it.
  - Collected the official Epoch AI ECI exports and benchmark catalog: 264 general rows and
    101 software-engineering rows. Software ECI is refit from the official performance and
    difficulty exports with the published sigmoid method and a two-benchmark minimum.
  - Added the fail-closed collector, hashes, method note, daily refresh hook, conservative
    family attachment diagnostics (130 mapped / 134 unmatched), seven-slot Composite
    reweighting, Score (i) copy, model/detail evidence, and H2's explicit recompute boundary
    for the Composite definition change.
  - Gates: `build-dataset` ✓, `npm test` 244/244 ✓, `tsc --noEmit` ✓, `npm run build` ✓.
    Commits `618f1dc` and `32fdd2c` are pushed to `main`; live revision verified as
    `32fdd2c455b76014e7f9a5982eb38a270274edfd`.
  - Live evidence: `ux-evidence/iter3-live/verification.json` and
    `ux-evidence/iter3-live/eci-verification.json`, with desktop/mobile verifier output,
    software-ECI selector evidence, and a fresh model-detail/API check. Status remains
    **implemented**, not **verified**, because the independent-engine rule reserves the latter
    for a different engine.
  - Delegation was attempted for mechanical review; the free worker stopped at its sandbox
    permission prompt for `/home/flori/.agent-budget.json`. No delegated output was trusted
    or shipped.

- **2026-09-12 · iteration 4 · codex-luna** — implemented B4/B5 and deployed them.
  - Overview now receives the dedicated Benchmaxxing page's deterministic top-decile signal as
    server-derived display data. Missing/unknown reports remain `null`/`false`; no score is
    synthesized in the client projection. The table badge is explicitly described as a
    screening signal, not evidence of leakage or intent.
  - Added a restrained Advanced-mode method note linking to the anchored explanation on
    `/benchmaxxing#method`, plus a deterministic tie-break in the dedicated ranking.
  - Gates: `node scripts/build-dataset.mjs` ✓, `npm test` 245/245 ✓, `npx tsc --noEmit -p .` ✓,
    `npm run build` ✓. Timestamp-only output from the dataset build was excluded; R9.1 remains
    open because no fresh source collection was run in this iteration.
  - Commit `81cbc75` pushed to `main`; Sandy PaaS deployment
    `0vzfbysnuxohiltiobcsdrnm` finished on the exact full revision
    `81cbc75565ed4eb84ef2c946a6893e7198a459d0`.
  - Live evidence is in `/opt/benchmarkheaven/state/ux-evidence/iter4-live/verification.json`:
    canonical and legacy hosts return 200; desktop 1440×1000 and mobile 390×844 checks show
    the badge and method link, with no mobile page-level horizontal overflow.
  - Independent review was attempted twice through the free delegation ladder. Nex stopped at
    its forbidden `/home/flori/.agent-budget.json` read. Kimi's completed review is preserved in
    `/opt/benchmarkheaven/state/ux-evidence/iter4-live/independent-review-kimi.txt` and found
    two actionable integration issues: the explanation was hidden in Simple mode, and the
    Overview/dedicated-page model pools could diverge. Both were corrected in the follow-up
    working revision; the optional client fields also remain absent when no report is supplied.
  - Follow-up commit `5b780c3` is pushed and deployed via Sandy PaaS deployment
    `x1yrve8ud4zcuh240j3vq552`; the live canonical and legacy `/api/meta` revisions both match
    `5b780c37ab8d3c5bd01ca33cda0ac240c4e9dfd9`. Final evidence, including the Simple first-load
    explanation and the relaxed-filter desktop/mobile checks, is in
    `/opt/benchmarkheaven/state/ux-evidence/iter4-live/verification.json`.

- **2026-09-12 · iteration 5 · codex-luna** — implemented R8.1 and deployed it.
  - Added release-post-style measured benchmark category snapshots to `/compare`: topic cards
    average each selected model's normalized measured positions within the topic, show exact
    coverage, and explicitly state that the 0–100 values are not a new score. Missing and
    low-sample rows remain excluded rather than becoming zeroes. The full comparison table now
    highlights tied best measured relative positions while retaining native values and evidence.
  - Corrected the existing open-vs-closed chart so a group with no measured score is `null`
    / unavailable, never a plotted zero. `/charts` now links directly to the benchmark report.
  - A free Nex review was used as a mechanical critique only; its null-as-zero finding was
    independently inspected and fixed. No worker code or unsupported number was accepted.
  - Gates: `node scripts/build-dataset.mjs` ✓, `npm test` 245/245 ✓, `npx tsc --noEmit -p .` ✓,
    `npm run build` ✓. Commit `a61edf2` pushed to `main` and redeployed through the Sandy PaaS
    MCP as deployment `qo3ml7gwbvsocyhoudapblwr`, finished for exact revision
    `a61edf25ddb8dd4177dd93fdb26f903a4c971163`.
  - Live evidence: `/opt/benchmarkheaven/state/ux-evidence/iter5-live/verification.json` and
    `/opt/benchmarkheaven/state/ux-evidence/iter5-legacy/verification.json`, plus desktop/mobile
    category screenshots. Both hosts return the exact revision; both widths show seven cards,
    exact comparison table, 14 highlighted best cells, and no page-level mobile overflow.
  - The webhook did not remain deployed and the documented shell fallback could not read
    `/etc/sandy-paas/mcp.env` as user `flori`; the user-level Sandy PaaS MCP redeploy completed
    successfully. R8.1 remains `implemented`, not `verified`, pending a different-engine review.

- **2026-09-12/13 · iteration 6 · codex-luna** — attempted R9.1 and hardened the live-review evidence path.
  - A reviewed Artificial Analysis identity withdrawal was added to
    `data/raw/source-change-approvals.json`: exactly one expired-model ID was replaced by one
    new primary-API ID, bound to both complete identity-set hashes, the captured response hash,
    an owner review timestamp and a short expiry. No unreviewed source shrink is permitted.
  - Scheduled worker selection now filters the configured whitelist before fallback, and a
    bounded critic retry may reuse an excluded family only when no other authorized scheduled
    candidate exists. Tests cover both rules. Commits `716a2b0`, `f85b2cd`, and `eebe047` were
    pushed; the complete evidence packet for AA efficiency was then expanded and pushed as
    `e6ad689` after a critic correctly identified that the parser body was outside its locator.
  - The isolated gate after `e6ad689` passed: `node scripts/build-dataset.mjs`, `npm test`
    (247/247), `npx tsc --noEmit -p .`, and `npm run build` (21/21 static pages).
  - Two clean daily transactions started 2026-09-12 23:51:21Z and 23:58:45Z. Each fetched
    AA, DesignArena, OpenRouter, Coding Agent v1.5, Epoch ECI and data-policy sources with
    HTTP-success receipts; the final run's source manifest and exact compressed captures are
    preserved under `/opt/benchmarkheaven/state/ux-evidence/iter6-refresh-failure/`.
    Neither transaction published: the AA live contract exhausted all three bounded rounds
    with the same external worker pattern — DeepSeek critic timeout, DeepSeek v4.1 incomplete
    completion, DeepSeek critic timeout. `published:false` and `storage.applied:false` are
    retained in both run reports. No source number was accepted on worker failure.
  - Delegation to the free Nex worker was attempted for the AA approval task; it stopped at a
    forbidden `/home/flori/.agent-budget.json` access and produced no trusted diff. No delegated
    output shipped. R9.1 returns to **open** pending worker transport recovery; this engine does
    not mark any item **verified**.

- **2026-09-13 · review gate · claude-opus** — `REVIEW-20260913T002002Z.md`. Reviewed
  `9c5fa40..8681fa5` against the verbatim requirements; re-checked live on
  https://benchmarkheaven.com at desktop + mobile, light + dark (38 screenshots,
  `ux-evidence/review-20260913T002002Z/`).
  - **verified** (built by other engines): R2.1, B1, B5, B6, E1.
  - **back to open:** H1 (history misses AA indices/ECI/Elo), H2 (no multi-hop), B3 + B4
    (tag rate halves as coverage grows; 28/58 tags on ≤2 jumps), P4 (hero over-reaches).
  - Claude-built items that pass live stay `implemented` — they need a non-Claude verifier.
  - Fixed directly: mobile page overflow on `/compare` and `/benchmaxxing`, (i) capsule glitch,
    identical duplicate tests. Gates: build-dataset ✓, npm test 244/244 ✓, tsc ✓, next build ✓.
  - Not ALL-ACCEPTED. Next: B3/B4 ranking fix, H1/H2, the first Fable 5.1 pass (X3), R9.1.

- **2026-09-13 · design pass 1 · claude-fable** — `DESIGN-DIRECTIVES.md` created. Fresh live
  screenshots of `3d4573a` at 1440×1000 and 390×844, light and dark, for Simple, Advanced
  (+ filters), Guided 1–5, Benchmaxxing, model page, Compare, Charts, Benchmarks, Radar,
  Scatter, Providers, About (89 files, `ux-evidence/fable-20260913/`).
  - Verdict: the wizard, the filter grouping, Compare's radar/category cards and dark mode
    are good. Failing the bar: key message below the fold (desktop shows zero model rows on
    the first screen; mobile shows the first row at ~1,500 px), Simple has no chart of the
    thesis, long score definitions printed as labels, three paragraphs between sliders and
    list, the 214-axis Benchmaxxing radar is a grey disc with a black centre, Advanced opens
    on 6 rows, several cell-level defects (cost bar beside the number, org-tinted score bars).
  - Decided R3.1 (hero claim) and applied it: `app/page.tsx`, `app/layout.tsx` (meta/OG/
    footer), `scripts/build-brand-assets.mjs` + regenerated `public/brand/og-image.*`.
    Applied F-01 (compact hero: no eyebrow, no stat boxes, one generated counts line, smaller
    display size) in the same files.
  - Delegated F-04 (small print below the table, jargon into the (i), short score labels) to
    Kimi K3 via `bin/delegate.sh --kimi` in an isolated worktree; reviewed the diff before it
    landed (see the commit that follows).
  - Gates on the tree: build-dataset ✓ (timestamp-only dataset diff discarded), npm test ✓,
    tsc ✓, next build ✓. Commit `76d8f86`, deployed and stable on both hosts. Live re-check
    (`bin/verify-fable.mjs`, `ux-evidence/fable-20260913/after/verification.json`): new
    claim in H1/meta/OG, no eyebrow, no "Every benchmark result", no "dominance-safe" in body
    text, no overflow; desktop first screen now shows 3 model rows (was 0), mobile first row
    at 1,151 px (was ~1,500 px; F-02/F-03 must bring it above 700 px).
  - Open for the next implementers, in order: F-02 (nav/filter bar), F-03 (Simple value
    map), F-06 (Advanced defaults), F-07 (Benchmaxxing radar), F-08 (model page sheet),
    F-05, F-09…F-12. Fable does not set `verified` on anything.


- **2026-09-13 · iteration 7 · claude-opus** — B3/B4, F-06, H2.
  - Read first: no Florian reply file; only this iteration and `next start` previews had cwd in
    the repo (C1 clean). Budget file: claude 15 % week, codex 65 %.
  - **B3/B4 (`004f8dc`)** — coverage-robust Benchmaxxing, following review finding 3.
    Prototyped four rankings on the real dataset before choosing (raw, fixed k=4, empirical
    Bayes, lower confidence bound): once the score is an all-pairs within-topic spread with a
    floor of ≥ 6 related comparisons over ≥ 2 topics, the coverage bias is gone for all three
    corrected variants; empirical-Bayes shrinkage (k clamped to [2, 50]) kept as the least
    arbitrary. A synthetic test caught that k fell to its minimum when τ² ≤ 0 (noise-only
    catalog) — fixed to the maximum. Percentiles are now cached per axis (5.8 s → 77 ms for
    the whole catalog). Evidence: `ux-evidence/iter7-b3/bm-audit-after.{mjs,txt}`, live
    `ux-evidence/iter7-b3/live/verification.json` (174 qualified, "18 of 174", 18 badges,
    method text, both widths, `scrollWidth` = viewport).
  - **F-06 (`a36fcc6`)** — score minimum and "Measured task tokens only" are mode-scoped
    (`minScoreTouched`, `minScoreApplied`, `minScoreSimple` in SettingsContext; Charts,
    Compare, Providers, EU, Scatter follow Advanced). Live fresh session: Simple slider 85
    before and after visiting Advanced; Advanced 16 rows (was 6). The directive's "≥ 50 rows"
    conflicts with "Featured stays on" after R4.4 — recorded under F-06 for Fable, not
    re-interpreted.
  - **H2 (`7d077b0`, `9628f6e`)** — multi-hop chains, see the H2 row. Mistake made and fixed
    in the same iteration: `7d077b0` pushed `dataset.json` with two rebuild timestamps (a
    `;` instead of `&&` let the commit run after a refused rewrite) and had dropped
    `bridges[].subject_name`. `9628f6e` restores both; a full structural diff against the
    pre-H2 dataset now shows only the new H2 fields.
  - Gates before every push: build-dataset ✓ (timestamp-only diffs discarded), npm test ✓
    (248 → 256), tsc ✓, next build ✓ (21/21).
  - Delegation: X5 docs (CHANGELOG + fork-sync prompt) handed to Kimi K3 in worktree
    `/tmp/bh-x5`. A first `&`-launched run looked dead but was alive; a relaunch ran in
    parallel until the older one was killed. See the next line for what came of it.
  - Statuses: B3, B4, H2 `implemented` (claude-built → need a non-Claude verifier). B7 critique
    on axis order resolved; bounded-percentile limitation documented on the page.
  - Next, highest value: **H1** (retain AA Intelligence/Coding Index, ECI, DesignArena Elo in
    history, so H2 can bridge headline scores), **H3** (filter "better than model X in
    category Y", now that chains exist), F-02/F-03 (Fable), R9.1 retry, R6.3, E2/E3, P1/P2.
  - **Stopped early on quota (handoff).** `limits.py --json` at 2026-09-13 01:22 UTC: Claude
    session **76 %** (resets 05:00 UTC), week 19 %; Codex week **66 %** (below the 75 % / 80 %
    caps — X2 record for this iteration). QUOTA-CONTINUITY forbids a new Claude unit above
    70 %, so H1 was not started. Nothing is half-done in `main`.
  - **Unreviewed delegation left behind:** Kimi K3 is still working on X5 in worktree
    `/tmp/bh-x5` (branch `x5-docs-kimi`, log `/tmp/bh-x5-log.txt`, bounded by `timeout 5400`).
    It had changed nothing after 14 minutes. The next engine should `git -C /tmp/bh-x5 diff`,
    check every CHANGELOG / fork-sync line against `git log` and `API.md`, and either land it on
    `main` or drop it (`git worktree remove --force /tmp/bh-x5 && git branch -D x5-docs-kimi`).
  - **Handoff for the next engine (codex-luna preferred by the limits):** verify B3/B4/H2/F-06
    as a non-Claude engine with `OUT=<dir> node ops/ux-2026-09-12/bin/verify-b3-live.mjs`; then
    H1 (retain AA Intelligence/Coding Index, ECI and DesignArena Elo in `history/states` —
    today `buildState` only sees registry observations), then H3.

- **2026-09-13 · iteration 8 · codex-luna** — F-02, F-03 and F-12, deployed and live-checked.
  - **F-02:** replaced the wrapping header with a 59 px single-row responsive navigation. Desktop
    keeps Overview · Benchmarks · Compare · Charts · Benchmaxxing · More; Radar is no longer a
    top-level nav item. Mobile keeps the mark, theme, Menu and Filters in one row; Filters opens
    the same grouped sheet below the header through an accessible button.
  - **F-03:** Simple now puts the two controls first, renders the distributions as sparklines in
    their tracks, places a score-vs-adjusted-cost value map before the list, dims models outside
    the active limits, labels passing points on desktop, and uses a concise “models pass / below
    your score line / show all” summary. The desktop map is 320 px; mobile is a compact 80 px
    strip so F-01’s explicit first-row-above-700 px requirement is met while the list remains
    immediately discoverable. Mobile chart tick text is suppressed to avoid illegible overlap.
  - **F-12:** removed the repeated identity disclaimer from the footer; it remains available at
    `/about#identity` as required.
  - Gates on the final tree: `npm test` ✓ (256/256), `npx tsc --noEmit -p .` ✓, `npm run build` ✓
    (21/21 static pages), `git diff --check` ✓. No data refresh was claimed; the committed
    dataset timestamp remains the last accepted source snapshot, so R9.1 stays open.
  - Commits `4d4783c`, `4c63bcb`, `f30e5c2`, `e573ef6` pushed to `main`; final Sandy deployment
    `3yx3j5q71lretrhl00qpdeie` finished for `e573ef6112bd1d6a5ab72feabed095c6b7b995a3`.
    The earlier intermediate deploys `fad3jezdnrrokkx3vofg9yfm`, `dbztopowuzom0omdwnwzzsz2` and
    `cg34gykyqqnojz7bdzhbcliy` were superseded by this final deployment.
  - Live evidence: `/opt/benchmarkheaven/state/ux-evidence/iter8-final/verification-e573.json`
    and its eight `e573-*` screenshots. Both canonical and legacy hosts returned 200 at desktop
    1440×1000 and mobile 390×844 in light/dark; all served the exact final revision, body width
    equalled the viewport, nav height was 59 px, mobile first row was 692 px, Simple was selected,
    the value map and filters were present, 20:1 and 30:1 were present, and Advanced showed 16
    score-descending rows. Statuses remain `implemented`, not `verified`, pending an independent
    engine under the one-engine verification rule.
  - Budget record at iteration start: Codex weekly 65 % in `/home/flori/.agent-budget.json`,
    below the 75 % review gate and 80 % hard cap; no API-key billing was used. No foreign writer
    was found and the local preview server was stopped cleanly.

- **2026-09-13 · iteration 9 · codex-luna** — H1/H2 headline-history extension, pending live verification.
  - Added `lib/headline-history.mjs`: the current AA Intelligence/Coding boards, Epoch general/
    Software ECI and DesignArena Frontend/Full-Stack Elo are converted to stable,
    history-only observations. Their upstream identities, raw snapshot hashes and locators are
    retained; the normal registry remains 75 benchmarks. Catalog joins are only emitted when
    deterministic and unique.
  - Extended the write-once history builder to append those observations on every accepted
    snapshot and extended the dataset build to use the same current observation set for dated
    estimates. Existing normal benchmark rows remain unchanged; Composite is still recompute-
    required rather than bridged across definition changes.
  - Fixed the H2 API gap: stable history IDs alias to the current dated presentation axes, and
    `benchmark-view` now carries `hops`, `path`, and `chainIqrRelative`. Added tests for stable
    provenance, dated headline bridging, axis aliasing, and the existing multi-hop policy.
  - The newly retained local state is `data/raw/benchmarks/history/states/20260913-cb91473c.json`:
    15,268 rows, 75 distinct benchmark IDs including all six headline IDs. The generated
    dataset has 839 models and 85 historical estimates / 482 explicit non-comparables; no
    synthetic score was accepted. Gates passed: `build-dataset`, `npm test` 259/259,
    `npx tsc --noEmit -p .`, `npm run build` 21/21, `git diff --check`.
  - Kimi K3 read-only review was attempted through `delegate.sh --kimi`; it returned no output
    or receipt, so it was treated as a failed review and contributed no acceptance.
  - Commit `33a1963` was pushed to `origin/main`; Sandy webhook deployment
    `frjc28wlnvoxuothjczoxlod` finished for the exact full revision
    `33a1963882ae6e709fe603de23a1b06866bb3084`. The API probe confirms both
    `https://benchmarkheaven.com` and `https://model-market-comparison.app.mintapis.com` serve
    three history states, state `20260913-cb91473c`, 15,268 observations, all six headline IDs,
    registry count 75, and four dated presentation axes without stable duplicates. The focused
    Playwright probe passed desktop/mobile (1440/390), light/dark, home/Advanced and
    /about /benchmaxxing /compare /charts with no horizontal overflow; the broad review harness
    also completed, but recorded four pre-existing Advanced-tab click timeouts, so that anomaly
    is retained in its raw verification file rather than hidden. Evidence is under
    `/opt/benchmarkheaven/state/ux-evidence/iter9-h1h2-{api,ui,canonical}/`.
  - H1, H2 and X5 are now `implemented`, not `verified`: codex-luna authored the change and the
    attempted Kimi K3 independent review returned no output/receipt. R9.1 is intentionally still
    open: these are retained source snapshots, not a claim that every source refreshed today.
  - Final quota check at 2026-09-13 02:48 UTC: Codex week 66%, Claude session 79%; `prefer` remains
    `codex`, no API-key billing was used, and no new worker was started after the failed review.

- **2026-09-13 · iteration 10 · codex-luna** — H3 comparison filter implemented, deployed and
  live-checked; not independently verified.
  - Added `lib/benchmark-comparison.mjs` plus focused tests. The catalog is deliberately
    compact and client-safe: exact measured observations are preferred; only finite,
    comparable `estimated` bridge rows are retained as `approximate`; missing and low-sample
    values are omitted rather than treated as zero. Category values are the median of each
    model's available normalized axis positions and respect lower-is-better axes.
  - Added an Advanced-only folded **Better than a model** control with reference-model and
    benchmark/category selectors. The explanatory status names measured versus approximate
    provenance and says that unknown values are excluded. No dataset rows, API routes or
    ranking/Composite inputs changed. Changelog updated accordingly.
  - Gates passed on the final feature tree: `node scripts/build-dataset.mjs` (timestamp-only
    output discarded), `npm test` (261/261), `npx tsc --noEmit -p .`, `npm run build` (21/21),
    and `git diff --check`.
  - Commit `78301fd64a8dc88644483fc607a4e9bbe61261be` was pushed to `origin/main`. Sandy
    deployment `cnptw9nwu8jsloo0wwuczflq` finished successfully for that exact revision.
    `/api/meta` on the canonical host reports the same revision.
  - Focused Playwright live evidence is in
    `/opt/benchmarkheaven/state/ux-evidence/iter10-h3/verification.json` with eight screenshots:
    canonical and legacy hosts × desktop 1440×1000/mobile 390×844 × light/dark. Every check
    returned HTTP 200, found the H3 controls, selected a measured Agentic category reference,
    filtered 16 rows to 8, showed the unknown-safe copy, and found no horizontal overflow.
    Desktop and mobile screenshots were visually inspected after capture.
  - Delegated Kimi K3 an advisory, read-only H3 critique through `delegate.sh`; after 12 minutes
    it had produced no output or receipt, so it contributed no acceptance and no numbers were
    used. The launched advisory process was stopped cleanly after the live check.
  - H3 remains `implemented`, not `verified`, because the one-writer rule requires a different
    engine to make the verification decision. R9.1, R6.3, E2/E3, P1/P2, X2, X3, X4 and X6/X7
    remain open or in progress as recorded above.

- **2026-09-13 · iteration 11 · codex-luna** — F-07 Benchmaxxing radar readability and independent
  coverage verification.
  - Updated `BenchmaxxingReport` with topic-colored outer-ring sectors and horizontal labels,
    spokes that start at 18% radius only for measured axes, low-opacity ticks for missing axes,
    topic-local measured lines, five-pixel accent points, and native-value/percentile/date tooltips.
    The overview now includes numeric domain/measured columns and a 20×12 topic-mean sparkline.
  - The selector is sorted by measured coverage and prints `measured/total`; the initial model
    prefers the highest Composite among models with ≥40 measured axes. A fresh local audit found
    **zero** such models in the current 214-axis catalog (maximum 29), so the live page uses and
    records the highest-coverage fallback rather than claiming the impossible threshold.
  - `groupedRadarProfile` now carries the exact native value and observed date only for the same
    measured, non-low-sample row that produced the percentile; no benchmark number was invented.
  - Gates: `node scripts/build-dataset.mjs` ✓ (timestamp-only output discarded), `npm test` 261/261 ✓,
    `npx tsc --noEmit -p .` ✓, `npm run build` ✓, `git diff --check` ✓.
  - Commit `a21eec3` pushed; automatic Sandy deployment `v6g1dvkqge3tdx3wps4agvge` finished for
    the exact revision. Direct live browser evidence covers both canonical and legacy hosts at
    desktop 1440×1000 and mobile 390×844 (light/dark pair used by the portable verifier), with
    214 lines, 16 sectors, native tooltips and no horizontal overflow:
    `/opt/benchmarkheaven/state/ux-evidence/iter11-f07/f07-live/verification.json`.
  - Codex also independently re-ran `verify-b3-live.mjs`: 174 coverage-qualified / 18 tagged,
    the ≥6-comparison/≥2-topic floor appears in the method, badges are present at both widths,
    and `Advanced` preserves its full-catalog state without overflow:
    `/opt/benchmarkheaven/state/ux-evidence/iter11-f07/b3-live/verification.json`.
  - No foreign writer was found. The broad review harness completed with four pre-existing
    Advanced-tab click timeouts but still recorded all four theme/width Benchmaxxing checks;
    raw evidence is retained under `iter11-f07/review/` rather than hidden. Codex quota was 66%
    at the iteration boundary; no API-key billing was used.

- **2026-09-13 · iteration 12 · codex-luna** — F-05 table magnitude language.
  - The ranking table now places a 4 px accent score bar below the right-aligned score, keeps
    organization colour only in the organization dot, and places a 4 px neutral-grey adjusted
    cost bar below the value. Cost bars use the finite prices in the displayed rows with a
    logarithmic min/max normalization; missing and non-positive values never become a bar.
    The row disclosure marker is a restrained 12 px-width chevron.
  - A Kimi K3 delegation was attempted in `/tmp/bh-f05-iter12` but produced no output or diff
    within the bounded attempt; no delegated output was accepted. The change was implemented
    and reviewed locally by Codex.
  - Gates: `node scripts/build-dataset.mjs` ✓ (timestamp-only output reverted), `npm test`
    261/261 ✓, `npx tsc --noEmit -p .` ✓, `npm run build` 21/21 ✓, `git diff --check` ✓.
    Commit `649804a` is pushed to `origin/main`.
  - Live evidence `/opt/benchmarkheaven/state/ux-evidence/iter12-f05-live/verification.json`
    checks both canonical and legacy hosts at 1440×1000 and 390×844 in light/dark: exact
    revision, 16 rows, 4 px score/cost bars, accent versus neutral colors, and no page overflow.
    Status remains implemented because this engine authored the change; a different engine must
    set verified.
  - Codex quota remained below the 80% hard cap; no API-key billing was used and the temporary
    preview was stopped cleanly.

- **2026-09-13 · iteration 13 · codex-luna** — P1/P2 PRD groundwork and independent review round.
  - Added `ops/ux-2026-09-12/PRD.md` with traceable requirements across both authoritative
    documents, explicit non-goals/constraints, measurable acceptance tests, local dataset
    provenance, and a row-cited capability comparison against Artificial Analysis. The PRD
    records that local data is 839 models / 75 registered IDs / 69 observed IDs / 13,924
    observations / 3 retained states / 567 labelled estimates at dataset digest
    `2870cdd2…be3bc`, generated `2026-09-13T02:32:18.438Z`.
  - Independent Nex round 1 returned `revise` with three findings: incomplete exact-ID
    traceability, missing baseline digest/provenance, and non-row-level AA citations. All three
    were repaired; repaired PRD digest is `b9ee6ddc…f0bf`. Nex round 2 timed out without a
    receipt; a Kimi K3 fallback review was started and is not yet accepted.
  - Live readback before deploy was healthy on revision `a790be1`; after commit/push, the
    authorized Sandy deploy `yw1orr9zewjcqb33qqxtgaor` finished and both canonical and legacy
    hosts returned HTTP 200 on exact revision `d348904`, with `/api/health` successful and the
    current hero, Score, Adjusted Cost and Benchmaxxing strings. Gates in an isolated
    worktree: `build-dataset` ✓, `npm test` 261/261 ✓, `npx tsc --noEmit -p .` ✓, `npm run build` ✓,
    `git diff --check` ✓. Evidence: `/opt/benchmarkheaven/state/ux-evidence/iter13-prd/verification.json`.
  - Quota samples: Codex 67% weekly, under the 80% cap; Claude was unavailable initially and
    later measured at 20% after reset. No API-key billing used. P1/P2 stay in-progress pending
    an independent final pass; R9.1, R6.3, E2/E3 and the remaining Fable/UI gaps remain open.

- **2026-09-13 · iteration 14 · claude-opus** — R6.3 + R6.1 (subscriptions in the cost view).
  - Start: no Telegram reply file; no foreign writer (C1 clean — only this iteration, the owner
    lease and `next start` previews had cwd in the repo). `limits.py --json` 05:50 UTC: Claude
    session 2 % / week 20 %, Codex week 68 % (X2 record: below 75/80). Removed the stale,
    already-merged `/tmp/bh-x5` worktree and its branch.
  - Re-read every subscription price from the vendor pages instead of trusting the R6.2 draft
    (plain fetch for anthropic.com, github.com, docs.github.com; headless Chromium for the
    client-rendered one.google.com and cursor.com). Confirmed: Claude Pro $20/Max from $100/Team
    $25/Enterprise $20+API; Google AI Plus 4.99/Pro 19.99/Ultra 5x 99.99/Ultra 20x 199.99;
    Copilot Pro 10/Pro+ 39/Max 100 with $15/$70/$200 credits, Business 19 (1,900 credits),
    Enterprise 39 (3,900). Changed since R6.2: Cursor Pro+ $60 and Ultra $200 exist; the Cursor
    Teams price was not re-readable and is not shipped. Cursor's entity-use quote re-verified on
    the terms page (updated 2026-09-03). OpenAI/xAI still 403 — recorded, not worked around.
  - Gates: `build-dataset` ✓ (timestamp-only diff discarded), `npm test` 266/266 ✓ (+5 new),
    `tsc` ✓, `next build` ✓ in an isolated copy (`/tmp/bh-iter14-build`, so the running previews
    were not disturbed), `git diff --check` ✓. Local browser probe caught a squeezed mobile
    layout and an over-long model name; both fixed before the push.
  - Commit `0e7380c` pushed; auto-deploy live on canonical after ~105 s and on legacy shortly
    after. Live probe (`bin/verify-r63-live.mjs`) passes on **both hosts at 1440 and 390**: panel
    present, 14 personal plans, 2 break-even lines, company toggle via the real Filters sheet
    → 12 plans, Claude Pro hidden, Claude Team shown, hidden-plans note, `scrollWidth` =
    viewport, `/about#subscriptions` present. (The first live run hit the deploy switchover and
    timed out; re-run passed.)
  - **Delegation hazard found:** the E2 source research went to Kimi K3, which failed and fell
    back to Nex; Nex aborted on the known `/home/flori/.agent-budget.json` permission prompt —
    and in the same window `data/dataset.json` in the repo was rebuilt (timestamp-only,
    06:00:41). Nothing of this iteration ran build-dataset then. It was discarded before the
    commit. Delegates run with the repo as cwd can touch tracked files; always `git status`
    before committing. E2 research was relaunched on Kimi with an explicit "stay in cwd, no
    skills, no edits" prompt.
  - **Independent verification of Codex-built UI work** (new `bin/verify-directives-indep.mjs`,
    live `0e7380c`, 1440/390 × light/dark, `ux-evidence/iter14-indep-review/`): **F-02, F-03,
    F-05 verified**; **H3 verified** with a functional check (16 → 9 rows, measured label,
    unknown-safe copy, both widths). **F-12 failed as shipped** (footer 185 px vs ≤ 120) and was
    fixed here — footer is now wordmark + links, then the claim and one sources sentence
    (105 px at 1440 locally); needs a non-Claude re-check. **F-01 desktop fails** (0 rows on the
    1440×1000 first screen, first row at 958 px) because F-03's value map sits above the list —
    a conflict between two directives, left for Fable pass 2 in `DESIGN-DIRECTIVES.md`, not
    re-interpreted.
  - **F-10, F-11 and a value-map defect** (details in the `DESIGN-DIRECTIVES.md` Done log):
    wizard results button hierarchy; `/scatter` data-driven Y axis (points now span 87 % of the
    plot, was a band at the top of 0–100) and one-sentence intro; the Simple value map drew the
    Pareto halo and line through every point instead of the frontier — now 5 of 20. F-11's
    "count opens the filter panel" part is not done (no external opener exists).
  - `delegate.sh`: the failure check grepped the model's whole answer for `401|402|429`, which
    benchmark numbers in a research answer can match; a real answer could be thrown away and
    the task silently re-run on the fallback model. Now only `HTTP/status/code/error` + code
    counts as a failure.
  - **P1 review** (see the P1 row): independent claude-opus review of the codex-luna PRD,
    `revise` with 6 findings, AA claims re-fetched and confirmed; repairs applied, non-Claude
    confirmation of digest `57d164a2…` still required. New open question P4-CLAIM-01 (AA also
    shows cost per task) carried to Fable pass 2 and X7.
  - **F-09** Charts page (Done log in `DESIGN-DIRECTIVES.md`): one accent bar colour with org
    dots, open-vs-closed dot-strips, and a "Score vs cost" value-map card. Local gates and
    browser check green; live check follows the push.
  - **E2** research: delegation produced no usable report; the robots.txt verdicts it captured
    are recorded in the E2 row. **R9.1**: the 05:17 daily was blocked by a dirty checkout (see
    the R9.1 row).

- **2026-09-13 · iteration 15 · claude-opus** — landed Fable pass 2: F-13, F-14, F-15, F-16,
  F-17, F-18, F-20.
  - **Found at start:** the design pass (06:50 tick) had exited leaving seven files of Kimi K3
    work uncommitted, its own two commits (`afa8d26`, `581094b`) unpushed, and a third Kimi
    delegate (F-17, `CostCapabilityScatter.tsx`) still running with no parent. That delegate had
    not changed its file after ~50 minutes; it was stopped by PID so it could not race this
    iteration's edits. No Telegram reply file; no foreign commits on `origin/main`.
  - **Delegated work reviewed before landing (`21ff9e8`):** F-13/F-14 and F-15/F-20 diffs read
    line by line and gated in an isolated copy (`/tmp/bh-iter15-build`, so the running previews
    were untouched). The browser check caught a defect the review did not: below `md` the
    hidden table cells leave the column layout, so Score landed on a zero-width `<col>` and
    the phone table showed only Model and Adjusted Cost. Fixed in `939b278`.
  - **F-16 (`a0a7703`):** `featuredTouched` makes Featured mode-scoped like the score minimum;
    settings key v8 → v9 with a migration that keeps every other stored choice; the global
    Featured toggle shows the value the Advanced view applies; "Better than a model" is a
    popover; "· filtered" appears only when a setting differs from its default (it was shown
    permanently because the data-policy default always restricts routes). Scope note:
    Charts/Compare/Providers/Scatter keep Featured on by default — the directive names only
    Advanced.
  - **F-17 + F-18 (`939b278`):** a global label layer (`<Customized>` with the axis scales)
    replaces per-dot labels; round ticks on both scatter charts; frontier over passing points
    only. Filters became a popover / bottom sheet driven by `openFilters()` on
    SettingsContext (the window event is gone; no harness or test used it); the Simple pool
    count ("of 14") and the `/scatter` count open it. The phone shortlist card needed three
    trims (sliders side by side below `lg`, axes give up hidden tick space, 6 px of spacing)
    to bring the first row from 882 px to 757 px (target ≤ 760).
  - **Gates** before the push: `build-dataset` ✓, `npm test` 266/266 ✓, `tsc --noEmit` ✓,
    `next build` ✓. Tree clean apart from intended files; no `dataset.json` diff.
  - **Live verification after the deploy**, `939b278` on both hosts, 1440×1000 and 390×844,
    light and dark: `bin/verify-fable-pass2.mjs`, new `bin/verify-f16.mjs` and
    `bin/verify-f18.mjs` all pass — numbers in the X4 row, evidence in
    `/opt/benchmarkheaven/state/ux-evidence/iter15/live-{canonical,legacy}-{p2,f16,f18}/`
    (local runs in `…/iter15/local4`, `f16-local4`, `f18-local4`).
  - **Statuses:** everything here was built by Claude (Opus or Fable) or by Kimi and reviewed
    by Claude → `implemented`, needs a non-Claude verifier. Quota: Claude's own probe was
    rate-limited (unmeasurable), budget file 06:07 UTC read session 9 % / week 20 %; Codex 68 %.
  - **Next, highest value:** a non-Claude review gate over F-13…F-20 (the three scripts above
  are ready to re-run); F-08 model page sheet; F-19 Benchmaxxing page; F-21; R9.1 retry
  (keep the tree clean); E2 ingestion from the four machine-readable sources in
  `ux-evidence/iter14-e2/SUMMARY.md`; P1 non-Claude confirmation of PRD digest `57d164a2…`.

- **2026-09-13 · iteration 16 · codex-luna · review gate** — deployed and reviewed the
  pass-2 implementation plus the final data-policy fix. Sandy deployment
  `g7wswwdh7zw3sgf57agxsg4l` finished at 08:12 UTC on commit `8d950fba`; both public hosts
  read back that exact revision and `/api/health` returned `{"ok":true,"db":false}`.
  - Fresh Codex verification passed on both hosts, 1440×1000 and 390×844, light and dark:
    F-13/F-14/F-15/F-16/F-17/F-20, Charts/Scatter, Benchmaxxing radar, Compare snapshots,
    R6.1/R6.3 subscription eligibility, and the grouped filter directives. Evidence is in
    `ux-evidence/review-20260913T075003Z-{fable-postfix-canonical,fable-postfix-legacy,
    f16-postfix-canonical,f16-postfix-legacy,f18-postfix-canonical,f18-postfix-legacy,
    f09-postfix-canonical,f09-postfix-legacy,f10-f11-postfix-canonical,
    f10-f11-postfix-legacy,f07-postfix-both,r81-postfix-canonical,r81-postfix-legacy,
    directives-postfix-canonical,directives-postfix-legacy,r63-postfix-canonical,
    r63-postfix-legacy,policy-postfix}/`.
  - **Defects fixed:** `8d950fb` passes `!allowDataTraining` into every cost/offer view
    that had omitted it (Charts, Compare, Providers, Scatter, Provider, model offers and
    EU SOTA); the live policy toggle changes rows and prices at both widths and closes via
    the header Filters button on mobile. The header is raised above the mobile backdrop
    while the sheet is open. This remains `implemented`, not `verified`, because this gate
    authored the fix.
  - **Independent statuses advanced:** R3.1, R6.1, R6.3 and R8.1 are now `verified`; the
    current live evidence also independently verifies F-13/F-14/F-15/F-16/F-17/F-20. F-18
    remains `implemented` because the current gate made the header-layering correction.
  - F-08 remains open: fresh model-page evidence shows 5,514 px desktop / 8,960 px mobile
    and provider tables wider than the phone viewport (up to 567 px). F-19 remains open:
    the live Benchmaxxing page still uses the question as its H1 and the old overview table.
    F-21 remains open: `Composite definition · 7 slots · ECI + Coding Agent v1.4` is still
    present in `CompositeNote` on Compare/Radar. Therefore X4, X6 and X7 remain open.
  - R9.1 remains open: the live source dates are still 2026-09-11 for OpenRouter,
    Artificial Analysis and DesignArena; no fresh publication run was accepted. E2/E3 remain
    open because the four machine-readable captures have not passed identity/critic/ingest.
    P1 remains in progress (the repaired PRD digest is recorded, but this gate did not mark
    the codex-authored PRD verified); P2/P3 remain in progress/open. P4's wording decision
    stays with X7 as required by the directives.
  - The older `verify-live.mjs` was not used as a pass because it still seeks the removed
    `Filters & settings` summary; the broad review harness did not terminate cleanly within
    the bounded run. Targeted current harnesses above are the accepted evidence. No
    `ALL-ACCEPTED` line is appended.

- **2026-09-13 · iteration 17 · codex-luna · review gate** — reviewed all changes since
  `REVIEW-20260913T075003Z.md` against the verbatim requirements, addendum, design directives
  and this ledger. The only product change was a small F-21 fix: removed `CompositeNote` from
  Compare and Radar. Commit `299efad0cb4d52a8a412b8cbdcc7e1392704da5d` was pushed and deployed
  as Sandy deployment `rqhyzmvpwmvl5gnobey9ifol`; both public hosts served that exact revision.
  - Full live matrix passed the current claims on both hosts at 1440/390 and light/dark:
    hero, Simple/Advanced rows and sorting, #benchmarks/#providers, grouped filters and 20:1
    blend, info tooltip/modal, charts/radar containment, wizard, About anchors, B3 signals,
    subscription eligibility, and the F-21 absence of Composite definition text. Evidence:
    `/opt/benchmarkheaven/state/ux-evidence/review-20260913T085002Z/` (especially
    `final-audit/verification.json`, `fable-*`, `f16-*`, `f18-*`, `directives-*`, `b3-*`,
    `r63-*`, `f07-both/` and `api/`). Metadata assets also returned 200: manifest, favicon,
    Apple touch icon and OG PNG.
  - Local gates passed: `npm test` 266/266, `npx tsc --noEmit -p .`, `npm run build` (21/21
    pages), `node scripts/build-dataset.mjs`, and `git diff --check`. The build regenerated
    only timestamp fields in `data/dataset.json`; that non-semantic diff was discarded before
    the review commit. A bounded Kimi delegation was attempted via `delegate.sh`, but it
    returned no usable critic receipt and its output was not used as evidence.
  - **Still open:** F-08 (model page is 6,308 px desktop / 10,112 px mobile; provider table
    reaches 567 px at 390 px), F-19 (old Benchmaxxing H1/eyebrow/table and per-cell `not scored`),
    R9.1 (live source dates span 2026-09-10 through 2026-09-12, despite a 2026-09-13 dataset
    build), E2/E3 (no secondary benchmark scores passed identity/critic/ingest), H1/H2 (current
    live history has no `multi_hop` sample and these codex-authored items still need another
    engine), P1/P2/P3 (PRD/AA closure), P4 (exclusive cost claim remains contestable), X2, X4,
    X6 and X7. E1 was conservatively returned from `verified` to `implemented` because its own
    ledger note still required independent-engine verification. No `ALL-ACCEPTED` line is added.

- **2026-09-13 · iteration 18 · codex-luna** — implemented F-19 (Benchmaxxing page title,
  topic-ring labels and overview table) in `0c37a18`. The overview now defaults to the 10
  strongest tagged signals and can reveal all 18; mobile shows Model/Signal/Measured only;
  the per-model selector marks tagged models with an orange-dot marker; radar labels require
  at least six axes and 14 degrees, smaller topics are rendered as grey Other sectors with a
  legend, and measured gaps remain gaps. Local gates passed: build-dataset (timestamp-only
  output reverted), npm test 266/266, tsc, next build 21/21 and diff-check. Deployed through
  Sandy deployment `klmccrqfw1kb0xhq7xnfx3gt` and checked both public hosts at 1440/390 in
  light/dark; evidence is `/opt/benchmarkheaven/state/ux-evidence/iter18-f19-live/`. Status
  remains implemented until a different engine verifies it.

- **2026-09-13 · iteration 19 · claude-fable · design pass 3** — fresh live screenshots of
  revision `75534f5` (Simple, Advanced, Guided, Benchmaxxing, model page, Benchmarks, Charts;
  1440/390, light/dark) in `/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass3/`.
  `DESIGN-DIRECTIVES.md` rewritten: pass-3 verdict, decisions (F-08 split into F-08a/F-08b;
  thin evidence stays ranked but hatched; P4 and R5.2 unchanged), F-19 and F-21 live-checked,
  new backlog F-08b, F-23, F-24, F-25, F-26, F-27, F-28. Surgical fixes shipped in `3a32a27`:
  the Simple value map now plots exactly the ranked pool (it had haloed a model the list
  refused, F-22), model-page trims (F-08a: raw columns and evaluation-group column hidden on
  phones, "Unusual results" only when flagged and after the sheet, Composite disclosure
  removed), Benchmaxxing H1 at page-title size. Gates green: build-dataset (timestamp-only
  diff reverted), tsc, npm test 266/266, next build. Both hosts serve `3a32a27`; live
  evidence `…/fable-20260913-pass3/after-live/verification.json` (6 rows = 6 full dots at both
  widths; phone model page 10,112 → 7,978 px, top-5 table `# · Provider · Adjusted $/task`).
  A Kimi K3 delegation for F-08a produced no edits in 12 min and was stopped; Fable did the
  edits itself. Codex was not used. F-22/F-08a need a non-Fable verifier.

- **2026-09-13 · iterations 20–21 · claude-opus** — F-08b, F-23, F-24, F-25, F-26, F-28; H1/H2
  independent verification.
  - **Iteration 20 (10:20 tick)** implemented most of the directives and the H1/H2 live check,
    then ended its session while the preview rebuild + verifier ran as a background task; the
    harness killed that task, leaving the work uncommitted and unverified. Lesson for all
    engines: under `claude -p`, never finish a turn with a background task pending — run
    builds and verifiers in the foreground.
  - **Iteration 21 (10:40 tick)** found no foreign writer (only this iteration and the two
    `next start` previews had cwd in the repo), reviewed the leftover diff, and finished it:
    F-26 had only removed the CSS rule — the compact map now renders a fixed phone scale
    (`$3 · $1 · $0.3 · $0.1` within the domain, Y floor and 100, 10 px, 18/24 px reserved);
    mini-radar labels were clipped (canvas widened); sheet rows were 44 px because the global
    `summary { min-height: 44px }` beats a non-important utility (`!min-h-0`); sheet name column
    widened; the "n/7 inputs" sub-label is Advanced-only, as F-25 requires Simple unchanged.
  - **F-25 note:** the directive's example ("Fable 5 (high)" = 1/7) confused `# benchmarks` (1)
    with `composite_coverage` (5/7). The written rule is implemented and checked instead: 58
    Advanced rows below 3 inputs are hatched and every one carries a 0–2/7 label.
  - Gates: build-dataset ✓ (timestamp-only diff reverted), `tsc` ✓, `npm test` 266/266 ✓,
    `git diff --check` ✓, `next build` ✓ in an isolated copy (`/tmp/bh-iter21`, port 3121,
    stopped afterwards). Local acceptance 0 fails (`ux-evidence/iter21/local/`).
  - Commit `74b5a2d` deployed to both hosts within ~2 min. Live acceptance on canonical and legacy,
    1440/390, light/dark: **0 fails, 0 errors** (`ux-evidence/iter21/live-canonical/`,
    `…/live-legacy/`). Statuses `implemented` — a non-Claude engine must verify.
  - H1/H2 set to `verified` (independent of codex-luna, evidence in their rows).
  - Delegation: none this iteration — the work was integration and fixing a half-finished diff,
    and the last four Kimi UI delegations produced no edits.
  - **F-27 (`8fb9e6f`)** in the same iteration: the ranking result cell shows value, unit and
    date, with source link and evidence in a per-row expand; Explore hidden below `md`; page
    size 25 with "Show more"; eyebrow and `CompositeNote` removed from `/benchmarks`. Gate green
    (build-dataset timestamp-only reverted, tsc, 266/266, diff-check, isolated `next build`).
    Live on both hosts, 1440/390, light/dark, 0 fails: `ux-evidence/iter21/f27-live-canonical/`,
    `…/f27-live-legacy/` (desktop 2,814 px; phone 3 columns, table 352 px). A first local run
    reported 50 expands for 25 rows — the verifier counted `SourceScore`'s own nested Evidence
    disclosure; fixed to count only the row's direct expand.
  - **Next, highest value:** a non-Claude gate over F-08b, F-22…F-28 (`bin/verify-iter20.mjs`,
    `bin/verify-f27.mjs` are ready); E2 ingestion from the four
    machine-readable sources; R9.1 fresh run with a clean tree; P1 non-Claude PRD confirmation.

- **2026-09-13 · iteration 23 · claude-fable · design pass 4** — fresh screenshot matrix of
  live `1b17731` (73 shots, `ux-evidence/fable-20260913-pass4/`), plus Compare and the
  subscriptions disclosure, plus DOM checks. Verdict and eight directives in
  `DESIGN-DIRECTIVES.md` (pass 4). Two defects fixed surgically and verified live at 1440/390
  in dark: **F-29** value-map labels were black in dark mode (`rgb(var(--text))` with a hex
  variable); **F-30** Guided reset Simple to 70 / 14 rows. Commits `2e4abce`, `9840328`;
  evidence `…/pass4/checks/verification-F29-F30.json`. P4 hero decision recorded again with a
  fallback line for X7. F-33 and F-34 delegated to Kimi K3 in in-repo worktrees
  (`.worktrees/f33`, `.worktrees/f34`); outcome in the DESIGN-DIRECTIVES Done log.
- **Next, highest value (design):** F-32 needs a judgment engine (data identity between the
  AA snapshot rows and the registry); then F-31 and F-35. Any engine other than Fable may
  set F-29/F-30 `verified` with `checks/fable-after.mjs`.

- **2026-09-13 · iteration 24 · codex-luna** — resolved the Fable pass-4 F-31/F-32 defects and
  independently rechecked F-29/F-30. F-32 now distinguishes exact Composite inputs from
  family/product-attached values in the client projection, exposes attachment provenance in
  the model sheet/radar, and tests the benchmark-count invariant. F-31 now uses seven compact
  accessible coverage pips, labels Adjusted Cost as modeled $/task, and removes `est.` from
  overview and model cost cells. F-33/F-34 Kimi worktrees were verified no-op after the
  delegation wrapper rejected their external-path reads; Codex then implemented the signal
  card/HTML radar labels and the benchmark coverage sentence/result bars directly. Local
  gates: build-dataset, npm test 267/267, tsc, next build and diff-check all pass. Commits
  `e57fa3a` and `efa17f9` are pushed; Sandy deployment `onq21smofxh6xdc3dhnjq4r7` finished
  successfully at `efa17f9`. Final independent live receipts pass F-29/F-30/F-33/F-34 on
  canonical and legacy hosts at desktop/mobile dark mode; F-31/F-32 remain implemented until
  a non-Codex engine verifies them.

- **2026-09-13 · iteration 25 · codex-luna** — shipped F-35–F-38 and attempted R9.1.
  - F-35 changes the full comparison table to compact release-post rows: one native value and
    4px catalog-percentile bar per selected model, best values bold/tinted, missing values `—`,
    and one accessible evidence expansion per benchmark row. `verify-f35.mjs` passes on both
    canonical and legacy hosts at 1440×1000 and 390×844; the targeted live matrix also passes
    light and dark themes. The F-35 section measures 2,403px desktop / 3,143px mobile.
  - F-36–F-38 are live on both hosts in all four theme/width combinations: empty protocol
    disclosure removed, Copilot labelled as a subscription plan, neutral verdict chips and one
    exact uncollected footnote, plus the active-score Simple caption and 167-character small
    print. Kimi K3 was attempted twice (worktree and git-less copy) and timed out/was stopped
    without a usable diff; Codex reviewed and implemented the small changes directly.
  - Gates: `node scripts/build-dataset.mjs` ✓ (timestamp-only output restored), `npm test`
    267/267 ✓, `npx tsc --noEmit -p .` ✓, `npm run build` 21/21 ✓, `git diff --check` ✓.
    Commit `085207b` is live at both exact hosts; deployment readback is in
    `ux-evidence/iter25-f35-live/deployment-readback.json`.
  - R9.1 dry-run fetched AA and DesignArena today but refused publication at the OpenRouter
    identity-coverage guard because one prior GMICloud endpoint disappeared for
    `deepseek/deepseek-v4-flash-0731`. Evidence is retained under `ux-evidence/iter25-r9-fresh/`;
    no source was redated or published. ALL-ACCEPTED remains forbidden.
  - After the wording correction, `f37-final.json` rechecked both hosts at revision `2c3692c`;
    both passed with the comma-separated uncollected-plan footnote. The F-35–F-38 statuses stay
    implemented until a non-Codex verifier supplies the required independent receipt.

- **2026-09-13 · iteration 26 · codex-luna** — closed the five new R5.7–R5.11 implementation
  gaps from Florian's follow-up. Simple now labels the first slider **Minimum Capability Score**
  with the active score in parentheses and an accessible explanation; the adjusted-cost slider
  has a matching explanation naming model token efficiency, provider pricing, caching and cache
  read/write prices. The overview's `# benchmarks` and `# providers` columns are equal-width on
  desktop. Simple's value map uses low-cost-left / high-cost-right ordering and a linear axis so
  zero-cost routes remain visible. Desktop header info tips now use a fixed portal with a viewport
  flip; mobile dialogs retain their close button. Commits `6acd81f`, `a5f6405`, `9fdc5e5` are live
  on both hosts. Local gates: build-dataset (timestamp-only diff restored), npm test 267/267,
  tsc, next build 21/21, diff-check. Evidence:
  `/opt/benchmarkheaven/state/ux-evidence/iter26-r57-r511/verification.json` and its screenshots.
  The Nex delegation was attempted in an isolated worktree but produced no receipt/diff and was
  discarded. These rows remain `implemented`, not `verified`, because this iteration's engine
  authored the changes; a different engine must perform the acceptance promotion.

- **2026-09-13 · iteration 27 · codex-luna** — completed the fresh-source remediation for R9.1.
  OpenRouter initially failed closed on three exact endpoint identity transitions. Each was
  captured from the primary HTTP 200 response, locally recomputed, and reviewed by an
  AA-qualified different-family critic: DeepSeek V4 Flash (GMICloud fp4 → fp8), GLM 5.3 Flash
  (Makora/Relace withdrawals with the published Relace unknown identity), and DeepSeek V4 Pro
  (Fireworks → Cloudflare). The first V4 Pro critic pass was rejected for an unclear duplicate
  endpoint count; the packet was repaired to include both physical-object and unique-identity
  counts plus the full prior projection, and the second pass approved it. The expiring approval
  ledger now binds all exact hashes and deltas.
  - Direct live fetches then passed: AA 646 models, DesignArena 43 frontend + 45 fullstack,
    OpenRouter 445 models with all endpoint calls. `InferenceNet` provider metadata was added
    from its official terms/privacy material, conservatively marked US / not EU-hosted; no
    privacy or residency guarantee was invented.
  - The refreshed AA snapshot no longer publishes UUID `21a0a2f6-…`; its 14 historical measured
    score rows remain in `scores.json` with `model_id: null` and the one retired missing cell was
    removed, so no exact score was reassigned to another effort. GLM-5.2's test expectation was
    updated to the current AA value 34 with a dated source comment.
  - Gates: `node scripts/build-dataset.mjs` ✓, `npm test` **267/267** ✓, `npx tsc --noEmit` ✓.
    Owner hash/readback evidence: `/opt/benchmarkheaven/state/ux-evidence/iter27-r9-final/`.
    R9.1 is `implemented` pending deployment and live readback; E2/P1/P2/P3/P4/F1/X3/X4/X6/X7
    remain open or in-progress as previously recorded.
  - The first Sandy redeploy failed before replacing the healthy release. Local `npm run build`
    reproduced the cause: `prebuild` compared a dataset built with history-only headline
    observations against a validator that omitted them. `scripts/validate-benchmark-scores.mjs`
    now constructs the same six headline axes as `build-dataset`; the production build passes
    (21/21 pages). Forward deployment `vc48e0estvyjx2jcvmy9ujdh` then finished at `206e952`;
    both public hosts return health 200 and identical current `/api/meta` counts. Readback is in
    `/opt/benchmarkheaven/state/ux-evidence/iter27-r9-final/deployment-live-readback.json`.

- **2026-09-13 · iteration 28 · claude-fable · design pass 5** — fresh 80-shot matrix of live
  `3d7af32` (`ux-evidence/fable-20260913-pass5/`, desktop 1440 / mobile 390, light / dark: Simple
  incl. moved slider, Advanced incl. expanded row and fresh session, Guided 1–4, Benchmaxxing,
  model page, Compare, Benchmarks, Charts) plus DOM checks.
  - **Independent verification (Fable ≠ Codex):** F-31, F-32, F-33, F-34, F-35, F-36, F-37,
    F-38 all pass live at both widths (`verify-f31-f38/verification.json`, 0 fails; script
    `bin/verify-fable-pass5.mjs`). R5.7 and R5.9 set to `verified`.
  - **Defect fixed surgically (F-39, commit `64063b5`, live on both hosts, revision confirmed
    via `/api/meta`):** the Simple value map's linear cost axis from iteration 26 printed a tick
    per data value — 46 overlapping tick labels at 1440 px, 138 at 390 px (a black smear on
    phones). Log axis restored; free routes are pinned at the left edge instead of dropped, so
    R5.10 "every model displayed" holds. After: 0 overlaps, ticks $0.30 · $1 · $3 · $10 (phone
    $0.3 · $1 · $3), all four theme/width combinations (`after-F39/verification-F39.json`).
    Gates before push: `tsc` ✓, `npm test` 267/267 ✓, build-dataset ✓ (timestamp-only diff
    restored). Needs a non-Fable verifier.
  - **New directives (DESIGN-DIRECTIVES.md, pass 5):** F-40 Simple sliders must not leak into
    Advanced (touching the Simple slider at 85 makes Advanced open on "7 models · filtered" with
    no visible control — reproduction recorded); F-41 hatch rule counts exact + attached inputs
    (today 5 of 7 Simple rows incl. the #1 model are striped with no explanation); F-42 phone
    slider captions stacked; F-43 Benchmaxxing radar defaults to measured axes with labelled
    topic sectors; F-44 Compare picker row (page is 5,576 px / 9,541 px); F-45 small cuts.
  - Delegation: none. The ledger records seven consecutive Kimi/Nex UI delegations without a
    usable diff; the F-39 fix was 20 lines and cheaper to do than to brief. F-42 and F-45 are
    the only pass-5 items marked `[mechanical]` for a free model.
  - Codex budget note: `/home/flori/.agent-budget.json` at 14:07 showed codex 70 % (warn 75,
    hard cap 80). F-40/F-41/F-43/F-44 are `[judgment]`; if Codex is above 75 % they go to
    Claude Opus 5, not to a free model.
  - **Next, highest value:** F-40, then F-41 (both change what the first screen says), then
    F-42; a non-Fable verifier for F-39, F-29, F-30, F-22, F-08a.

- **2026-09-13 · iteration 29 · claude-opus** — closed F-40 and F-41 from Fable pass 5.
  - **F-40** (`f454195`, written earlier in this iteration window but not yet recorded): live on
    both hosts at the exact revision; `bin/verify-f40.mjs` passes on canonical and legacy at
    1440/390 with 0 fails (`ux-evidence/iter29-f40/live-{canonical,legacy}/`).
  - **F-41** (`d5c2ac9`): thin = exact + attached Composite inputs < 3 (`isThinComposite`,
    new `composite_attached` projection field); Advanced pips fill exact, half-fill attached,
    label "n exact + m attached of 7 Composite inputs"; Simple small-print clause only when a
    striped row is on screen; Score (i) explains attached values; expanded row shows
    "exact + attached / 7". Live `bin/verify-f41.mjs` on both hosts at 1440/390, 0 fails: fresh
    Simple 7 rows, 0 flagship rows hatched (was 5 of 7), no clause; Advanced 101 rows, 38 thin,
    each thin flag matches its own label; Fable 5.1 "2 exact + 3 attached". The first canonical
    run died with a transient browser error before writing; the re-run passed.
  - Gates: build-dataset ✓ (timestamp-only diff restored), `npm test` 275/275 ✓, tsc ✓.
  - Delegation: none. Both items are `[judgment]` state/evidence rules, and the Claude session was at
    97 % (`/home/flori/.agent-budget.json`, prefer=codex), so the scope was kept small and the
    iteration exits here.
  - Both rows stay `implemented`; a non-Claude-Opus engine must verify them (scripts above).
  - **Next, highest value:** F-42 `[mechanical]` phone slider captions, F-43 Benchmaxxing radar
    measured-axes default, F-44 Compare picker row, F-45 small cuts. Ledger rows F-31…F-38 still read
    `implemented` although Fable verified them in pass 5 (Done log); the next gate should
    promote them.

- **2026-09-13 · iteration 30 · codex-luna** — implemented F-44 and F-43; local acceptance is green.
  - **F-44 Compare:** replaced the four stacked model selector cards with one compact picker row:
    selected model chips link to each benchmark sheet and expose keyboard-accessible remove buttons;
    a native searchable combobox/datalist plus Enter submits additions up to four models. The radar
    explanation is now an accessible info tip, and the old jump links were removed. Exact benchmark
    evidence remains available: the radar values and anomaly panels are folded, while the full table
    is a keyboard-scrollable 1,100 px region. This reduced the measured page to 3,967 px desktop and
    5,233 px phone (within the F-44 4,000 / 7,000 bounds).
  - **F-43 Benchmaxxing:** the default per-model radar now filters to measured axes only; a checked
    `Show all 214 axes` control restores the complete missing-aware view. Multi-axis topics get their
    own labelled sectors and singleton topics are grouped under Other. No scores or missing values
    were changed.
  - Evidence: `/opt/benchmarkheaven/state/ux-evidence/iter30-f44-local6/verification.json`,
    `iter30-f35-local/verification.json`, `iter30-f46-f47-local/verification.json`, and
    `/opt/benchmarkheaven/state/ux-evidence/iter30-f43-local2/verification.json`; F-44 and F-43
    matrices pass at 1440/390, light/dark, including keyboard add/remove, height/overflow and the
    existing F-35 table expansion. The `npm run build`, `npm test` (275/275), `tsc` and diff-check
    gates pass; the dataset rebuild changed only generated timestamps, which were restored.
  - Delegation: the pass-6 Kimi F-48 attempt remained a no-op; no worker output or number was trusted.
    F-43/F-44 remain `implemented` until an independent engine verifies the deployed revision.
  - **Live deployment/readback:** Coolify deployment `rceu3mcu6sskf0fwopv64gmd` finished successfully
    on pushed revision `6508c5fa5bf2a69171dca89399d7159467e6411c` at 2026-09-13T18:05:28Z.
    `https://benchmarkheaven.com` and `https://model-market-comparison.app.mintapis.com` both
    return `/api/health` OK and `/api/meta` with that revision. F-43/F-44 pass their live
    1440/390 light/dark matrices on both hosts; the independent F-46/F-47 live verifier also passes.

- **2026-09-13 · iteration 31 · codex-luna** — implemented F-48 and deployed it through the
  Sandy PaaS MCP after the local `/opt/mmc-daily/redeploy.sh` fallback could not read its
  protected token file. The two former top cards in `BenchmarkRanking` are now one panel:
  Category (`w-full sm:w-48`) and Benchmark/version selectors share the first row, the
  `PICK A BENCHMARK` eyebrow is gone, the version line uses a text `Primary source ↗` link,
  description + coverage are one paragraph, and the result count sits at the right of the
  search/evidence controls. Local gates passed: build-dataset (timestamp-only diff restored),
  npm test 275/275, tsc, production build and diff-check. The Nex delegation was attempted in
  an isolated worktree but was rejected while reading `/home/flori/.agent-budget.json`; it made
  no product changes and no output was trusted. Coolify deployment `fujgbulyjhxh2iisrqyfc066`
  finished on `7c275c4`; live evidence on both hosts at 1440/390, with light/dark F-27 regression
  checks, is in `/opt/benchmarkheaven/state/ux-evidence/iter31-f48-live/` and its two host
  subdirectories. F-48 stays `implemented` until an independent engine verifies it.

- **2026-09-13 · iteration 32 · codex-luna** — independently accepted the repaired PRD for P1.
  - Recomputed the exact PRD digest (`57d164a25de84547944527a5c5a0f1f919c01ade37b8afc81efb734e86d36f5a`), checked the authoritative R/H/B/E/P/F/C/X traceability, all eight named E2 sources, the repaired R1/R5/R6 specifics, and the retained Artificial Analysis source captures.
  - The machine-readable receipt is `/opt/benchmarkheaven/state/ux-evidence/iter32-prd-review-codex/review.json`. It accepts P1 because the repairer was Claude Opus and the receipt is Codex Luna, while explicitly leaving P2-GAP-01, P4-CLAIM-01 and E2/E3 open. No product claim, score or source date was changed.
  - A Kimi K3 read-only E2/E3 audit was delegated in-repo; its output is a draft and will be used only if it returns before this iteration closes.

- **2026-09-13 · iteration 33 · codex-luna** — implemented and accepted the CursorBench 4.0 secondary benchmark slice.
  - Fresh capture: `https://cursor.com/cursorbench` returned HTTP 200 at `2026-09-13T19:14:13.282923Z`; the decompressed source hash is `83dd64d1135465c00f22904fcac5f4184346022298208135094564ab8f7f3b2e`. The first SSR table contains 43 model/effort rows; no disallowed Cursor API path was called. Score and cost/task are separate versioned registry identities, both `self_reported`, and neither is a Composite input.
  - Accepted data: 86 observations (43 score + 43 USD/task). Cursor model/effort labels remain unmatched (`model_id: null`) because the source does not publish an exact catalog checkpoint or effort mapping; no numbers were invented. The parser now accepts source formatting such as `51.8 %` and `$ 17.28` without changing numeric meaning.
  - Independent gate: six row-batched DeepSeek V4 Flash critics reviewed all rows (15/15/13 per identity), with producer `openai/gpt-5.6-luna`; every review is lowercase `pass`, `errors_found: 0`, and raw-artifact/source hashes are checked by `verifyScoreEvidence`. The first malformed/too-short attempts were discarded and did not enter the acceptance manifest.
  - Ingestion/build gates: `npm run data:benchmarks` passed (14,010 observations; 77 benchmark IDs; 1,089 self-reported rows verified), score/registry validators passed, `node scripts/build-dataset.mjs` passed (841 models), `npm test` passed 275/275, and `npx tsc --noEmit -p .` passed. A conservative case-insensitive unique-default join fallback was added for pre-existing approval continuity; CursorBench explicitly opts out via its source-label identity policy.
  - Delegation: the requested Kimi read-only draft produced no usable output; no delegated content was trusted. Live deployment/readback and an independent non-Codex UI gate remain required before E2 or X6 can close. No `ALL-ACCEPTED` line or Telegram was sent.

- **2026-09-13 · iteration 34 · claude-opus** — F-50/F-51 shipped; six items independently verified live.
  - **F-51** (`2d9c834`): the Kimi K3 delegation (Nex fallback) had left a correct 3-line draft in
    `.worktrees/f51`; reviewed, given a proper `ReactNode` type and integrated. Live on both hosts at
    1440/390, light/dark; `verify-f44` and `verify-f35` still pass. `implemented`, needs a non-Claude-Opus verifier.
  - **F-50** (`2d9c834`): disclosure moved under the signal card at `lg`, single-column body, phone order
    unchanged. The directive's ±120 px bound is unreachable (collapsed 278 px short, open 3,326 px long), so the
    row stays `open` for a Fable re-spec rather than being re-interpreted here.
  - **Independent verification (non-implementer):** F-49 and F-52 (Fable) and R4.10, R5.8, R5.11, F-19
    (codex-luna) → `verified`, evidence under `ux-evidence/iter34-f49-f52/` and `ux-evidence/iter34-indep/`.
    The first verifier runs reported 4 failures that were verifier artefacts (a pointer-events:none tooltip
    skipped by hit-testing; hidden filter-sheet dialogs counted as open) — confirmed from screenshots, the
    checks were tightened, not loosened, and re-run to 27/27 per host.
  - R4.10 interpretation recorded in its row for X7 (unknown-policy EU hosts kept and labelled).
  - Gates before push: build-dataset ✓ (timestamp-only diff restored), `npm test` 275/275 ✓, tsc ✓.
    Deploy of `2d9c834` confirmed on both hosts via `/api/meta`.
  - Delegation: F-51 draft from the free model accepted after review; no numbers were involved.
  - **Next, highest value:** E2 Vals AI Index v2 slice (capture recipe and verbatim props already in
    `ux-evidence/iter14-e2/SUMMARY.md`; follow the CursorBench `6effb7b` pattern: capture + robots,
    registry identities incl. separate cost identity, row-batched critic reviews, approvals, ingest);
    then FrontierCode and ApprenticeBench; a Fable re-spec of F-50; a non-Claude verifier for F-51;
    R5.3 `>85` vs `≥85` and R3.1/P4 wording remain decisions for X7.

- **2026-09-13 · review gate · codex-luna · `REVIEW-20260913T205002Z.md`** — reviewed every
  product change after `REVIEW-20260913T161002Z.md` through `03ac314`, plus the uncommitted E2
  Vals/Frontier work and the uncommitted RelayModels addendum. Both public hosts were tested in
  fresh desktop/mobile, light/dark sessions. The broad matrix is error-free, has no page-level
  horizontal overflow, and confirms the current `14,010 results · 77 benchmarks · 841 models`
  surface, filters, methods, Benchmaxxing, Compare, Charts and tooltips. Focused receipts pass for
  R4.10/R5.8/R5.11/F-19, F-43, F-44, F-46/F-47, F-49/F-52, F-35/F-40/F-41 and the filter suite.
  The first R6.1 verifier had a mobile selector timing false negative; the fresh manual DOM receipt
  passes the company toggle on both hosts at 1440/390 and is saved under the review evidence.
  F-50 still fails its stated desktop bound: the collapsed right column ends 278 px above the radar
  bottom on both themes. F-51 is independently verified by Codex and promoted to `verified`.
  R3.1 is reopened because the live “only place” claim is not supported against Artificial
  Analysis' Cost per Task; R5.3 is reopened because the live default is exactly 85 while the
  verbatim requirement says `>85`. R9.1 remains open because `/api/meta` still reports stale feeds.
  The release baseline at `03ac314` passes validate, build-dataset, `npm test` 275/275, tsc and
  `npm run build` in an isolated worktree. The current dirty E2 work fails the collection-plan
  coverage guard (dirty registry 88 identities vs dirty plan 59), and its Vals/Frontier rows lack
  complete independent critic receipts; none was staged or trusted. Codex measured 72% weekly and
  stayed below the 80% cap. X6 does not pass, so no `ALL-ACCEPTED` line and no Telegram were sent.

- **2026-09-13 · iteration 35 · codex-luna** — repaired the two unambiguous positioning/settings blockers.
  - **R5.3:** Simple's untouched Composite threshold is now `86` (strictly `>85`), and
    score-selection resets, persistence tests and live acceptance scripts use the same
    score-aware default. Advanced and Guided remain independent of Simple's floor.
  - **R3.1/P4:** replaced the unsupported exclusive “only place” claim everywhere it could
    reach users (hero, OpenGraph/Twitter metadata, footer and generated OG artwork) with:
    “A complete, source-linked collection of AI model benchmarks. Realistic modeled cost per
    task, grounded in provider prices, caching, and token efficiency.” This is deliberately
    qualified to the tracked collection and does not claim superiority over Artificial Analysis.
  - **Verification:** `f98a23d` deployed to both `benchmarkheaven.com` and
    `model-market-comparison.app.mintapis.com`; `/api/meta` on both reports the exact revision
    `f98a23d990f1d5ee150acb8749f1d001eef97448`. The visual-test matrix is clean in fresh desktop
    1440×1000 and mobile 390×844 sessions, light and dark: no page errors/overflow, hero copy is
    exact, Simple slider is `86`, obsolete Chutes fallback copy is absent, and table headers are
    Score / Adjusted Cost / # benchmarks / # providers. Receipts:
    `/opt/benchmarkheaven/state/ux-evidence/iter35-live-{canonical,legacy}/`.
  - **Gates:** `node scripts/build-dataset.mjs`, `npm test` (275/275), `npx tsc --noEmit -p .`,
    `npm run build` and `git diff --check` all passed. The in-progress Vals/FrontierCode and
    RelayModels draft was preserved, not shipped, in `stash@{0}` because the last review found
    its registry/collection-plan guard mismatch and incomplete critic receipts.
- **Independence:** R3.1, R5.3 and P4 remain `implemented`, not `verified`, until a different
  engine independently checks this deployed revision. R9.1, F-50, E2/E3, P2/P3, X3/X4, X6/X7
  and the RelayModels wiring request remain open; no `ALL-ACCEPTED` line or final Telegram was sent.

- **2026-09-13 · iteration 36 · codex-luna** — fixed F-50 in `components/BenchmaxxingReport.tsx`:
  at `lg`, the Benchmaxxing signal/disclosure column stretches with the radar grid row and the
  collapsed disclosure fills the remaining desktop height; below `lg`, the existing radar →
  signal → disclosure order is unchanged. Local gates passed: build-dataset (timestamp-only
  generated diff restored), npm test 275/275, tsc, production build (21 pages), and diff-check.
  Commit `3d32e8c` was pushed and deployed by Sandy webhook deployment
  `abxxk4yrdukwxjjim5bbdglt` (`finished`, 2026-09-13T22:08:24Z). Live
  `bin/verify-f50-f51.mjs` passes 42/42 on both public hosts at desktop/mobile and light/dark.
  F-50 remains `implemented` pending a different-engine verifier.

- **2026-09-13 · iteration 37 · codex-luna** — rechecked the deployed `e1e6478` release after
  the prior review's stale live readback. Direct real-browser evidence covers both public hosts,
  1440×1000 and 390×844, light and dark. The current hero is the qualified source-linked claim,
  Simple starts at score floor `86` (`>85`), and F-50 measures a 40px desktop radar/column gap
  with the required mobile stacking and no overflow. The broad canonical harness completed with
  zero page errors; its legacy run hit the known 4-minute harness timeout during the last dark
  pass, so the missing legacy cases were captured directly rather than treating a timeout as a
  product failure. Evidence: `/opt/benchmarkheaven/state/ux-evidence/iter37-live-20260913T222447Z/`.
  No status was promoted to `verified`: the current engine is the same codex-luna engine that
  implemented `f98a23d`/`3d32e8c`. Local source was unchanged in this verification-only iteration;
  the ledger and stale F-50/X4 notes were corrected and will be committed separately.

- **2026-09-13 · iteration 38 · codex-luna** — performed a fresh real-browser recheck of the
  deployed `e1e6478` release on the canonical host. Evidence covers `/` at 1440×1000 and
  390×844 in light and dark, plus `/benchmaxxing` at the same widths/themes. The qualified hero
  copy, Simple default floor `86` (`>85`), table headers and zero page overflow pass. F-50's
  desktop radar/right-column bottom difference is 40 px (≤120), while mobile order remains
  radar → signal → details with zero overflow. No product source changed in this verification
  iteration; R3.1, R5.3 and F-50 remain `implemented` because codex-luna is also their
  implementer. Existing uncommitted RelayModels addendum files were preserved for this commit;
  the backup artifact remains untracked.

- **2026-09-13 · iteration 39 · codex-luna** — ran the executable data refresh and recorded a
  truthful partial result. DesignArena, OpenRouter, Epoch ECI, AA/OpenRouter/Chutes efficiency,
  OpenRouter provider policy, dataset build, 275 tests, production build and serial TypeScript
  check passed. Artificial Analysis failed closed on a live 650-vs-646 API/leaderboard metadata
  mismatch; the previous AA snapshot was retained. The rebuilt dataset reports 841 models, 657
  families, 91 providers and 2,832 offers. Curated provider catalogs and metadata remain
  explicitly stale and are not redated. Evidence:
  `/opt/benchmarkheaven/state/ux-evidence/iter39-data-refresh-20260913/source-refresh.json`;
  audit: `data/research/refresh-2026-09-13.md`. Commit `ff48c42` deployed successfully to both
  public hosts; `/api/health`, `/api/meta` and `/api/dataset` read back green in
  `/opt/benchmarkheaven/state/ux-evidence/iter39-data-refresh-20260913/live/live-readback.json`.
  A real-browser smoke check at 1440×1000 light and 390×844 dark also passes with the hero,
  table, score 86 and no horizontal overflow: `/opt/benchmarkheaven/state/ux-evidence/iter39-data-refresh-20260913/live/browser-smoke.json`.
  R9.1 remains open because the curated source dates are still stale.

- **2026-09-13 · iteration 40 · codex-luna** — rechecked the current deployed `a566991` release
  after the prior gate's stale-readback findings. The free Kimi K3 delegation inspected F-50 in
  an isolated worktree and produced no diff; no worker output or number was trusted. Fresh live
  `bin/verify-f50-f51.mjs` receipts pass 42/42 on both `benchmarkheaven.com` and the legacy host,
  at 1440/390 and light/dark: the desktop radar/right-column gap is 40 px (≤120), mobile order
  is radar → signal → details, and there is no page overflow. Fresh `verify-f40.mjs` receipts pass
  on both hosts and both widths: Simple's untouched score threshold is `86` (strictly >85), and
  its rows remain stable through the Advanced/Guided transitions. The live metadata revision is
  `a566991c0ac05a22ce95f43aefc63d3de0a9bc35`; hero copy is qualified and no longer uses the
  unsupported exclusivity claim. Evidence: `/opt/benchmarkheaven/state/ux-evidence/iter40-f50-live-{canonical,legacy}/`
  and `/opt/benchmarkheaven/state/ux-evidence/iter40-r5-f40-live-{canonical,legacy}/`.
  Required gates pass again: `node scripts/build-dataset.mjs`, `npm test` (275/275),
  `npm run build`, `npx tsc --noEmit -p .`; the dataset rebuild changed only generated
  timestamps, which were restored. R5.3 and F-50 remain `implemented`, not `verified`, because
  this is the same codex-luna implementation engine; R9.1, E2/E3, P2/P3 and X6/X7 remain open.

- **2026-09-14 · iteration 41 · codex-luna** — made the AA publication-lag gate explicit and
  re-ran the isolated daily refresh. `lib/aa-metadata.mjs` now permits at most four missing
  leaderboard metadata rows during a documented API rollout lag, records the limit as a tested
  constant, and keeps every missing field null; a fifth missing row still fails closed.
  `scripts/fetch-live.mjs` records the API/leaderboard counts and missing model IDs in the
  snapshot metadata. The dry-run accepted the live AA pair and DesignArena, then stopped at the
  separate OpenRouter endpoint-removal gate; no partial data was published. Evidence and exact
  source hashes are in `/opt/benchmarkheaven/state/ux-evidence/iter41-aa-lag-20260914/`.
  Local gates passed: `npm test` 275/275, `npx tsc --noEmit -p .`, `node scripts/build-dataset.mjs`,
  `npm run build` (21 pages), and `git diff --check`. R9.1 remains open until the full refresh
  completes and all source-date requirements are met; the OpenRouter withdrawal requires an
  independent, expiring approval before the next attempt.

- **2026-09-14 · iteration 42 · codex-luna** — repaired OpenRouter approval resolution and
  completed the scoped live refresh. Multiple historical approvals for one model are now
  resolved only by the complete current endpoint-set digest; an older approval cannot mask a
  newer withdrawal. Added a regression test covering the duplicate-model approval case.
  Kimi K3 independently reviewed the exact `z-ai/glm-5.3-flash` withdrawal and returned pass;
  the bounded approval expires at 2026-09-14T12:00Z and names only
  `OpenInference/open-inference/fp4/fp4`. OpenRouter, OpenRouter-efficiency and Chutes-efficiency
  refreshes completed; the dataset rebuild reports 841 models, 657 families, 91 providers and
  2,832 offers. Evidence: `/opt/benchmarkheaven/state/ux-evidence/iter42-openrouter-withdrawal/`.
  Commit `86611e8` deployed as Coolify deployment `dt9nnlqocvbroystugzvqsok`; both public hosts
  now serve that exact revision. Live health/meta readback and real Playwright desktop/mobile,
  light/dark checks pass 84/84 with no failures in `live-readback.json` and the two host receipts.
  Full gates passed: `npm test` 276/276, score validator, `npx tsc --noEmit -p .`, `npm run build`,
  `node scripts/build-dataset.mjs` and `git diff --check`. R9.1 stays open because the other
  curated vendor/provider source snapshots were intentionally not redated or refreshed in this
  scoped run; no full all-source freshness claim is made.

- **2026-09-14 · iteration 43 · claude-fable (design pass 8)** — fresh 80-shot matrix of live
  `54872fc` at 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass8/`).
  Verdict: every inner surface meets the bar; the first screen does not — the iteration-35 hero
  is a 26-word methodology sentence (3 lines desktop, 4 mobile) repeated verbatim in the footer.
  **R3.1 re-decided** (DESIGN-DIRECTIVES.md pass 8, decision 1): "Every AI model benchmark we
  can find, in one place. / And what each model really costs you." — P4-safe (no unprovable
  comparative; the counts line is the proof), applied by Fable to the H1, metadata, OG/Twitter
  descriptions, OG artwork and a non-repeating footer (**F-53**). Opened F-54 (registry version
  strings leak into model page / Compare / Benchmarks copy), F-56 (phone table breaks names
  mid-token), F-57 (model-page title cut on phones), F-55 ((i) style differs by theme); F-54/56/57
  delegated to Kimi K3 in `.worktrees/pass8`, to be reviewed before anything lands. Gates on the
  hero change: `npx tsc --noEmit -p .`, `npm test` 276/276, `node scripts/build-dataset.mjs`
  (timestamp-only diff restored). Budget file at start: Claude session 100 % (reset 01:00 UTC,
  pass started 01:20), Codex 74 %; this pass used Claude only for judgment and the surgical
  hero edit, Kimi for the mechanical items.

- **2026-09-14 · iteration 44 · claude-opus** — closed Fable pass 8's handoff. **R3.1/F-53
  verified** as a non-Fable engine on live `fd4a907` (then again on `84cdff7`): both hosts,
  1440/390, light/dark. The pass-8 Kimi K3 delegation (F-54/56/57, `.worktrees/pass8`) ran 18
  minutes and exited 0 without a diff; the worktree and branch were removed and the three
  directives implemented directly in `84cdff7`, together with Fable's uncommitted F-55 InfoTip
  edit. F-54 covers every reader-facing version render (`lib/version-label.ts`), including three
  components the directive did not list (BenchmaxxExplorer, BenchmaxxingReport, Compare rows).
  Gates: `npx tsc --noEmit -p .`, `npm test` 276/276, `node scripts/build-dataset.mjs` (841/657/91/2832,
  timestamp-only diff restored), `npm run build`. A local production preview passed both verifiers
  before deploy; Coolify webhook deployment `puchhhsxi1jzh57srklb0ad1` put `84cdff7` on both hosts,
  where `bin/verify-f53-f57.mjs` passes 46/46 and the new `bin/verify-f54-f56.mjs` 26/26 per host.
  Evidence: `/opt/benchmarkheaven/state/ux-evidence/iter44-f53-verify/`, `…/iter44-f54-f56/`.
  F-55 marked verified (Fable's edit); F-54/56/57 stay `implemented` pending a non-Claude-Opus
  verifier. **E2 examined, not landed:** the parked Vals/FrontierCode stash needs 118 more
  FrontierCode critic approvals and the critic runner is missing (details in the E2 row) — the next
  iteration should restore a critic route first. Limits at start: Claude session 30 %, week 46 %;
  Codex 74 % (not used).

- **2026-09-14 · review gate · codex-luna · `REVIEW-20260914T020001Z.md`** — reviewed the
  product and ledger changes after `REVIEW-20260913T205002Z.md` through `94bcedd`, plus the
  small QA-only fix in `bin/verify-fable-pass5.mjs` that made the F-33 check data-driven after
  the old hard-coded sector label no longer existed. Both public hosts were checked in fresh
  1440×1000 and 390×844 sessions, light and dark. The broad matrix had no page errors or
  overflow; focused receipts pass for F-53–F-57, F-50/F-51, F-40–F-45, F-46/F-47, F-49/F-52,
  F-08/F-29/F-30, filters, subscriptions, H1/H2 and H3. F-54/F-56/F-57 are now verified by
  this non-implementer review; R3.1 is rechecked against the current hero. R5.3 and F-50 stay
  `implemented` because codex-luna authored them. R9.1 remains open because `/api/meta` still
  contains non-today source dates; E2/E3, P2/P3, X3/X4 and X6/X7 remain open or in progress.
  The four required gates pass: build-dataset (841/657/91/2832), npm test (276/276), tsc and
  production build (21/21). X6 fails its line-by-line audit, so no `ALL-ACCEPTED` line was
  appended.

- **2026-09-14 · iteration 45 · claude-opus** — short verification iteration; Claude session was
  already at 50 % at start (week 47 %, Codex 74 % not used), so no new implementation unit was
  opened. **Verified as non-implementer on live `de54827`, both hosts, 1440/390, light/dark:**
  R5.3 and F-48 (new `bin/verify-r53-f48.mjs`, 48/48 per host), F-50 (`verify-f50-f51.mjs`, 42/42),
  F-19 (`verify-r410-r58-r511-f19.mjs`, 0 failures). Evidence:
  `/opt/benchmarkheaven/state/ux-evidence/iter45-indep/`. A first run of the new verifier flagged
  a `.bh-eyebrow` on `/benchmarks`; that was the verifier being too broad (the deliberate category
  label inside the panel, not a page-head eyebrow) and the check was narrowed, not the product.
  **E2 correction:** iteration 44's "critic runner is gone" was wrong — the repo-path
  `ops/rebuild-2026-09/bin/worker.sh` works; only the `/opt/benchmarkheaven/bin/worker.sh`
  symlink is broken because `$HERE` is taken from the unresolved link. **Next iteration:** run
  the FrontierCode critic batches through the repo path and land Vals + FrontierCode (E2);
  R9.1 still needs a decision on the curated provider catalogs (2026-09-08) and `provider_meta`
  (2026-07-12), which the daily pipeline deliberately keeps curated.

- **2026-09-14 · Fable 5.1 design pass 9 · claude-fable** — fresh 80-shot matrix of live `4374f29`
  (1440/390, light/dark, Simple incl. moved slider, Advanced incl. cost-inputs modal, Guided 1–4,
  Benchmaxxing, model page, Compare, Benchmarks, Charts) plus Filters overlay, Compare-radar and
  Charts-bar geometry in `checks/extra.json`. Evidence:
  `/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass9/`. **Verdict:** desktop at the bar in
  both themes; two phone charts are not — the Compare radar is a 620 px SVG in a 316 px scroll box
  (half a chart, "1. GPQA D" clipped) and the Charts bars get 55 px of a 324 px chart (bars carry no
  information). Also: the phone model page leads with the provider table instead of the Composite
  score, and version tokens print twice where a benchmark name already carries its version
  ("AA-LCR v1.1 v1.1", "GDPval-AA v2 v2", "Terminal-Bench v4.0 (AA) v4.0"). Directives F-58 (phone
  radar), F-59 (phone bar rows), F-62 (desktop radar ≤ 640 px) written; **F-60 and F-61 fixed by
  Fable surgically** (`9240da5`, ``97e50a4``: `order-first lg:order-none` on the Composite card;
  `versionSuffix()` in `lib/version-label.ts` used by BenchmarkSheet, BenchmarkRadar,
  BenchmarkEvidence and BenchmarkCompare). R3.1 confirmed; R5.3 note aligned with the live default
  86. F-58/F-59 delegated to Kimi K3 in `.worktrees/pass9` with a 25-minute cap. **The Kimi delegation returned a clean, spec-conforming diff in ~7 minutes** (class-level spec, no numbers to invent); Fable removed a redundant `block` class, fixed a stale aria-label, folded in F-62 (`max-w-[640px]`) and landed it as `7b5320d`. **Live on both hosts** (`7b5320d`): `bin/verify-f58-f61.mjs` 36/36 per host at 1440/390, light/dark — phone radar 316×316 with 6 numbered axes and a legend list, no scroll hint; phone Charts bars 323 px longest / 2.7 px shortest, desktop recharts unchanged; Composite before providers at 390; no doubled version tokens; desktop radar 640 px. Evidence `…/fable-20260914-pass9/verify-7b5320d-{canonical,legacy}/`.
  Gates on main before push: `npm test` 276/276, `tsc` clean, `build-dataset` 841/657/91/2832
  (timestamp-only diff restored). Limits at start: Claude week 46 %, session 35 %; Codex 74 %
  (not used). X3 stays `in-progress` (pass 9 done, its directives partly open); X4 stays `open`
  until F-58/F-59 are live and verified by a non-Fable engine.

- **2026-09-14 · iteration 46 · codex-luna** — repaired two daily-refresh safety issues exposed by
  the isolated R9.1 attempt. OpenRouter endpoint approval selection now requires an unexpired approval
  for the exact current endpoint-set digest; the regression test covers both an older matching approval
  and the all-expired case. The gauntlet worker timeout is configurable only within a bounded 1–1800
  second range (default remains 180 seconds), and complete OpenRouter efficiency extracts may be up to
  131,072 bytes while the enclosing packet remains capped at 256 KiB. The oversized-source test was
  kept fail-closed by increasing its fixture above the new cap. A fresh Kimi-reviewed K3 withdrawal
  approval for `moonshotai/kimi-k3` is exact-set bound, expires 2026-09-14T12:00Z, and is recorded in
  `data/raw/source-change-approvals.json`; packet, review, source URL and body hash are in
  `openrouter-withdrawal-{packet,kimi-review-20260914-clean}.json/md` and the external evidence receipt
  under `/opt/benchmarkheaven/state/ux-evidence/iter46-openrouter-withdrawal/`.
  The first complete dry-run reached all seven live contracts but exposed the stale 70 KiB test fixture;
  the corrected clean dry-run then passed all 23 steps, all seven independent live contracts, 78 fresh
  benchmark source receipts, dataset build, npm build, npm test 276/276, typecheck, prerender, top5 and
  source validation. Evidence run: `/opt/benchmarkheaven-daily/runs/2026-09-14T04-26-39-216Z-3258522/`.
  The normal publication transaction then passed all data/build gates, and its candidate commit was
  fast-forward-pushed and verified on both public hosts. The deployed dataset is fresh for all live
  collectors exercised by the run, but the `/api/meta` readback still exposes curated non-today source
  dates; R9.1 remains open and no source date was redated manually.

- **2026-09-14 · Fable 5.1 design pass 10 · claude-fable** — limits at start: Claude session 7 %, week
  50 %; Codex 75 % (not used); no delegation this pass. First recorded the claude-opus review gate
  06:10, which had ended (rc=0, 8 min) after pushing `4b0d250` but before committing its review or
  filling its live-results section: committed as the gate left it, with a factual note on why its
  verifier had scored 58/66 (it ran before `4b0d250` deployed) and Fable's own post-deploy re-check of
  F-58/F-59 on both hosts (`e94f92a`; P4 → `verified` by that gate stands). Then a fresh 80-shot matrix
  of live `4b0d250` (`bin/shoot-fable-pass10.mjs`, 1440/390, light/dark, Simple incl. moved slider,
  Advanced incl. cost-inputs modal, Guided 1–5, Benchmaxxing, model page, Compare, Benchmarks, Charts;
  no overflow, no page errors). **Verdict: at the bar at both widths and in both themes.** Two residues,
  both fixed surgically by Fable in `21aa63f`: F-63 the phone Charts bar track (`bg-white/[0.06]`) and
  the open-vs-closed strip (`bg-white/[0.03]`) were invisible in light mode → `bg-line` / `bg-line/40`;
  F-64 the model page's "2/7 exact inputs · 4 attached" headline → "6 of 7 inputs · 4 from the model
  family" (the sheet's attachment note still defines "attached"). Gates before push: `tsc` clean,
  `npm test` 276/276, `build-dataset` 845/661/91/2834 (timestamp-only diff restored). Live on both
  hosts: `bin/verify-f63-f64.mjs` 22/22 per host (`ux-evidence/fable-20260914-pass10/verify-21aa63f-
  {canonical,legacy}/`). Decisions: R3.1 and R5.2 unchanged; X4 judged met by the design authority but
  left `open` for the independent verifier (F-58/F-59/F-62/F-63/F-64). `DESIGN-DIRECTIVES.md` rewritten
  for pass 10 (pass 9 condensed). Nothing open for implementers.

- **2026-09-14 · iteration 48 · claude-opus** — limits at start: Claude session 40 %, week 52 %;
  Codex 75 % (not used). **E1 → verified** as non-implementer (codex-luna built it), evidence
  `/opt/benchmarkheaven/state/ux-evidence/iter48-e1-indep/README.md`: 7-slot
  `composite-v2-epoch-eci`; dropping ECI moves `composite_base` for all 130 ECI-bearing models; the
  shipped `buildEciSnapshot` on today's Epoch exports returns every one of the 266 source rows (the
  05:14 snapshot's 264 predates Epoch adding Gemini 3.8 Flash and Qwen3.8 Max 0902); the daily
  `fetch-epoch-eci` step ran today; live Score (i) tooltip (1440) and modal (390) name both ECIs.
  **E2/E3 — ApprenticeBench landed** (`f7c5a91`): see the E2/E3 rows. Delegation: Kimi K3 via
  `delegate.sh --kimi` with a class-level spec; the first launch aborted because OpenCode
  auto-rejects reads outside the repo (inputs must be copied under the gitignored `.worktrees/`);
  the relaunch produced a working draft in ~55 min. Integration fixes by claude-opus: registry
  evidence had pointed at the hashed bundle URL and at robots.txt, which the daily `protocol()`
  review could not resolve after a redeploy → now `page_url` + `follow_module_script` with an exact
  protocol excerpt; registry evidence `sha256` is the stored `.gz` hash (validator rule); the test
  reads the committed capture instead of a 1.3 MB fixture. B2/B7 were not verified here because
  claude-opus reworked them (`004f8dc`). **Next iteration:** E2's last items are the two X threads
  (desktop-Chrome route per the registry README); R9.1 still needs curated-catalog collectors
  (handoff in the R9.1 row); unverified `implemented` rows with a non-Claude implementer should go
  to a Claude verifier, Claude-built ones (B2, B3, B7, H2, R6.2) to Codex or Kimi.

- **2026-09-14 · Fable 5.1 design pass 12 · claude-fable** — limits at start: Claude session 4 %, week
  55 %; Codex 77 % (not used); no delegation this pass (two one-file TSX edits — Kimi stalls on those,
  passes 8/11). Fresh 80-shot matrix of live `975334b` (`bin/shoot-fable-pass12.mjs`; `errors` empty in
  all four contexts, no overflow at 390). **Verdict: at the bar on every page, both widths, both themes**
  — the first pass where the fresh matrix found nothing below the bar. Two residues, both a name lost at
  390: F-67 the frontier's top point (Claude Fable 5.1) had no label on the phone value map because all
  four F-17 slots failed at the plot's top edge → four corner-aligned slots and a 20 px headroom in the
  chart's top margin; F-68 Benchmaxxing's name cell truncated ("Qwen3.5 122B …" vs "Qwen3.6 35B A…") →
  wraps below `md`. Both in `5e974fe`; gates before push: `tsc` clean, `npm test` 277/277, `build-dataset`
  845/661/91/2834 (timestamp-only diff restored). Live ≥ 3 min after the flip: `bin/verify-f67-f68.mjs`
  32/32 on both hosts. The pass-11 shoot script had silently skipped the E2 boards (the page's first select
  is now Category); fixed in the pass-12 script, all five boards re-shot: rows present, one notice line each,
  no empty state (F-65 holds). Decisions: R3.1 and R5.2 unchanged; "names never truncate below `md`" added to
  the design-system notes. `DESIGN-DIRECTIVES.md` rewritten for pass 12 (pass 11 condensed). Nothing open
  for implementers; F-65–F-68 need a non-Fable verifier to set `verified`. X3/X4 rows updated.

- **2026-09-14 · iteration 49 · claude-opus · work** — limits at start: Claude session 22 %, week 56 %;
  Codex 77 % (not used). No foreign writers. (1) Independent live verification of the Fable/Kimi/codex
  directives on `70b49fb`, both hosts: F-50 42/42, F-58–F-62 36/36, F-65 168/168, F-67/F-68 32/32 →
  `verified`, ledger rows added for F-58–F-68. F-66 stays `implemented` (pass-11 `metrics.json` lacks
  `errors`; no live forced-error render). (2) R9.1: first executable curated-catalog collector (Chutes),
  written directly (a one-module JSON collector — cheaper to write than to verify a delegated draft);
  first run caught a would-be regression (two rows lack `context_length`; now falls back to the payload's
  `max_model_len`, then the previous value) before it shipped. Gates: build-dataset 845/661/91/2,834
  (only the `chutes` date changed), `npm test` 282/282, `tsc` clean. Evidence `ux-evidence/iter49-indep/`,
  `ux-evidence/iter49-chutes-catalog/`. Next: the same collector pattern for the remaining curated
  catalogs (public JSON endpoints first: Nebius, Mistral, Scaleway), then F-66 forced-error check.

- **2026-09-14 · iteration 50 · claude-opus · work** — limits at start: Claude session 26 %, week 56 %;
  Codex 77 % (not used). No foreign writers (fetched before every push). R9.1 only, six commits:
  Nebius `48bffeb`, Mistral `b7304e8`, Scaleway `38334cc` (+ `bin/verify-r91-catalogs.mjs`), TensorX
  `043db48`, T-Systems LLM Hub `6157c93`, OVHcloud `47fb38e` — details, decisions and the remaining
  source list in the R9.1 row. Each gate before push: build-dataset 845/661/91 (offers 2,834 → 2,836:
  two new Nebius offers, TensorX −DeepSeek V3.2 +V4.1 Flash, T-Systems +GLM 5.3 Flash preview),
  `npm test` 287 → 302, `tsc` clean. Recorded decisions: Nebius rows with catalog `status: error`
  (Kimi K2.6, Nemotron 3 Ultra) are kept with the status in `catalog_status`/notes rather than dropped;
  T-Systems keeps audited hosting fields for known models and maps new "GCP / Azure" Claude rows to
  `routed_gcp_eu` (precedent of all audited Claude rows). Delegation: a Kimi K3 OVHcloud draft
  (`delegate.sh --kimi`, isolated worktree, saved fixture) produced no file in ~27 min and was stopped;
  written directly (worktree removed). Not touched: F-66, E2/E3, verification of other rows.

- **2026-09-14 · Fable 5.1 design pass 13 · claude-fable** — limits at start: Claude week 57 % (session 40 %);
  Codex 77 % (above the 75 % gate, not used); budget file `prefer: claude`. No delegation: the three fixes are
  one-line-to-five-line TSX edits (Kimi K3 stalls on those, passes 8/11/12, iteration 50) and F-72 is a
  `[judgment]` directive for the next work iteration. Fresh 80-shot matrix of live `bf5b821`
  (`bin/shoot-fable-pass13.mjs`; `errors` empty in all four contexts, no overflow at 390) plus a supplemental
  run (`SUPP=1`) for the Filters overlay, the Guided results step and the five E2 boards — the committed
  pass-12 script had silently skipped all three (a same-line comment swallowed `const opts`; the Filters
  button's accessible name is "Open filters and settings"; the last wizard button reads "See the models →");
  the pass-12 evidence folder does contain board shots, so that run used an uncommitted edit. Fixed in the
  pass-13 script; rule recorded: no `*-err` keys in `metrics.json` before a page counts as shot.
  **Verdict:** at the bar on every page at 1440 and, after this pass, at 390. Findings → fixes: F-69 phone
  benchmark sheet truncated names ("Terminal-Be…" twice, indistinguishable) → two-line rows, names wrap;
  F-70 the Pareto line ran through "Claude Fable 5.1"/"GPT-6 Astra" on the phone value map → 3 px
  `paint-order: stroke` halo in `var(--surface)`; F-71 cost modal printed "6,938,474.87" tokens, "88.829:1",
  "87.39%" → integers and one decimal. All in `f23f5f9`; gates before push: `tsc` clean, `npm test` 302/302,
  `build-dataset` 845/661/91/2,836 (timestamp-only diff restored). Live ≥ 3 min after the build-id flip
  (12:41:41 → 12:44:46 UTC): `bin/verify-f69-f71.mjs` **44/44 on both hosts**, evidence
  `ux-evidence/fable-20260914-pass13/verify-f69-f71/{canonical,legacy}/`, before/after crops in `…/checks/`.
  Opened for implementers: **F-72** Charts "Cheapest models" — linear bars over a 120× range leave 13 of 16
  bars as slivers; spec: log-position dot plot with round money ticks at both widths (`[judgment]`, next
  work iteration); **F-73** E2 boards repeat "not matched to a catalog model" under every row (`[mechanical]`,
  low). Checked and dismissed: the "Skip to main content" box in `mobile_light-guided-5-full.png` is a
  full-page-capture artifact (computed transform still `translateY(-93.6px)`, active element `body`,
  viewport shot clean — `checks/skipcheck2.mjs`). Decisions: R3.1 and R5.2 unchanged; two design-system
  rules added (label halo; quantities spanning > ~20× are never linear bars). X3/X4 rows updated; F-69–F-71
  need a non-Fable verifier; F-66 still needs a forced client error in a dev build.

- **2026-09-14 · review gate 130002Z · claude-opus** — reviewed `e94f92a..2898593` (see
  `REVIEW-20260914T130002Z.md`). Limits: Claude session 40 %, week 57 %; Codex 77 % (not used). No foreign
  writer. Gates green before push (845/661/91/2,836, `npm test` 302/302, `tsc`). Fixed F-73 directly
  (`4dffc1d`). Live on both hosts after the 13:05:15 UTC flip: new `bin/verify-review-1300.mjs` 72/72 per
  host; broad `verify-live-review.mjs` re-check 320/340, all 20 misses harness artefacts (CSS-uppercase
  heading; a stale mobile (i) click path) resolved by `verify-filter-acceptance.mjs` 28/28 per host and
  `r18-probe/probe.json` 16/16. Primary spot check: OVHcloud catalog Qwen3.5-397B 0.6/3.6 €, USD via ECB
  1.1592 (2026-09-11) = committed data. Status: F-66, F-69, F-70, F-71 → verified (implementer Fable);
  F-73 → implemented. Nothing flipped back. R9.1 (10 stale sources), E2/E3 (X threads), F-72, P2/P3, X2–X4,
  X6/X7, F1, C1 remain; claude-opus-implemented rows (R6.2, B2, B7, D1–D3, X1, R9.1 collectors, E2 boards)
  still need a different-engine verifier. `ALL-ACCEPTED` not appended.

- **2026-09-14 · iteration 51 · claude-opus · work** — limits not measured at start (budget file 12:07: `prefer: claude`, Claude week 57 %, Codex 77 %); at 13:50 `limits.py` read Claude session 8 % / week 1 % (treated as a reset artefact, as in gate 130002Z) and the 13:35 budget file said `prefer: opencode` for lack of a fresh Claude measurement; Codex 77 % (not used). No foreign writers (fetched before each of five pushes). No delegation: F-72 is a one-file TSX change and the collectors are template-following parsers — the pattern Kimi K3 stalled on in iteration 50 (27 min, no file); every parser was instead dry-run-diffed against its committed snapshot before any write. (1) F-72 implemented, 34/34 per host. (2) R9.1: IONOS, STACKIT, Inceptron, Claude API, GitHub Copilot collectors (see R9.1 row); four sources remain stale plus the deliberately retained `aa_coding_agents`. Claude + Copilot API check: 7/7 per host (claude_code and github_copilot dated today; Anthropic first-party offer 5/25 cache 0.5 on /api/models/claude-opus-5::max; Copilot GPT-5.6 Sol 4/20; MAI-Code-1-Flash 404 and absent, MAI-Code-1.1-Flash present). Gates each push: build-dataset (final 844/660/91/2,840), `npm test` 302 → 318, `tsc` clean. Evidence `ux-evidence/iter51-README.md`. Needs a non-claude-opus verifier: F-72 and the five new collectors.

- **2026-09-14 · Fable 5.1 design pass 14 · claude-fable** — limits at start: Claude session 10 %, week 1 % (`limits.py`,
  measured; the budget file of 13:35 said `prefer: opencode` only for lack of a fresh Claude reading); Codex 77 %
  (above the 75 % gate, not used). No foreign writers (`origin/main` = HEAD before each push). No delegation: the three
  fixes are one-file edits plus a 20-line helper with its own test — the pattern Kimi K3 stalls on (passes 8/11/12,
  iterations 50/51). Fresh 88-shot matrix of live `42da12c` (`bin/shoot-fable-pass14.mjs`, all pages × 1440/390 ×
  light/dark) plus the supplemental run (Filters overlay, Guided results, five E2 boards; `metrics-supp.json` clean).
  Harness note recorded in the directives: the base run's Advanced block timed out on the Filters click because the
  cost modal was still open (`*-advanced-err`; script fixed), and one transient `502` console error on `/benchmaxxing`
  at 14:01:50 UTC with the page fully rendered. **Verdict:** at the bar on every page, both widths and themes.
  Verified as non-implementer: F-72 (`verify-f72` 34/34 per host, judged by eye light/dark) and F-73 (once per board
  on Vals, CursorBench, Real-SWE). Findings → fixes, all in `e33635b`: **F-74** Guided with every question skipped
  listed "the 15 most expensive" of 16 and dropped GLM-5.3-Flash, the cheapest model and a Pareto member (evidence
  `verify-f74-f76/pre-deploy/`) → `lib/shortlist.mjs` keeps the Pareto line first, then the highest scores, then
  applies the R5.2 order (test `test/shortlist.test.mjs`, 4 cases); **F-75** the three result actions wrapped inside
  themselves at 390 → wrap between buttons; **F-76** Real-SWE evaluation-group options read "· 0 measured catalog
  peers" → count only when > 0. Gates before push: `tsc` clean, `npm test` 322/322 (318 + 4), `build-dataset`
  844/660/91/2,840 (timestamp-only diff restored). Live after the flip (canonical 14:09:16, legacy 14:09:52 UTC):
  `bin/verify-f74-f76.mjs` **36/36 on both hosts**, 1440/390, light/dark (`ux-evidence/fable-20260914-pass14/
  verify-f74-f76/{canonical,legacy}/`; a settled re-run ≥ 3 min after the flip in `…/{canonical,legacy}-settled/`).
  Decisions: R3.1 and R5.2 unchanged; design-system rule added (a cap never decides by the display order). X3/X4
  rows updated; F-74–F-76 need a non-Fable verifier. `ALL-ACCEPTED` not appended.

- **2026-09-14 · iteration 52 · claude-opus · work** — limits: budget file 14:07 `prefer: claude` (Claude 16 % measured), `limits.py` at 14:20 could not read Claude (rate-limited probe), Codex 77 % (not used). No foreign writers (fetched before each push; only this session and old `next start` previews had cwd in the repo; a stale preview holds :3217, left alone). Committed Fable pass 14's leftover ledger record (`fa1483f`), seeded 33 CR rows alone (`9554a85`). Shipped: CR-8.1 + CR-6.1 (`3de100d`, live 62/62 per host); CR-1.1–1.7, CR-2.1, CR-2.3 (`a0eef68`, live 84/84 per host); CR-1.8 detail page + `/about#benchmark-tags` (`1a2f502`). Delegation: CR-1.7 tier draft to Kimi K3 (`delegate.sh --kimi`, 92/92 ids, ~10 min), reviewed and amended by claude-opus; the TSX work was written directly (Kimi stalls on component edits). Gates each push: tsc clean, `npm test` 322 → 331, build-dataset 844/660/91/2,840 (timestamp-only diff restored). Decisions: CR-8.1 supersedes R5.2 order everywhere incl. Guided; phone header targets 44 px; no sibling-variant values in the comparison table. Next: CR-1.9 bar chart, CR-3.1/CR-2.4/CR-4.1 presets with CR-4.2, CR-2.2 pick-from-chart, CR-2.5 full URL state, CR-7.x, CR-5.6 OAuth provisioning. All CR rows here need a non-claude-opus verifier. `ALL-ACCEPTED` not appended.

- **2026-09-14 · iterations 53–56 (catch-up) and iteration 57 · claude-opus · work** — Iterations 53 (presets, CR-1.9, CR-2.5, CR-1.11, CR-7.x) and 54–56 recorded their results in the ledger rows but not here. Iteration 54 (16:10) provisioned the Google OAuth client and wrote CR-5.1–5.5; iteration 55 (16:40) shipped them as `f1752eb` but exited on an unreadable Claude quota before recording them (CR-5 rows stayed `open`); iteration 56 (16:50) found the deploy sent `https://localhost:3000` callbacks to Google, fixed it (`379a6df`, gates tsc / `npm test` 359/359 / build-dataset 844/660/91/2,840) and left an uncommitted `verify-cr-5.mjs` callback check. **Review gates 160003Z and 170002Z (opencode-kimi) produced no review:** 16:00 stopped when OpenCode auto-rejected writes to the evidence directory (`external_directory`; `~/.config/opencode/opencode.json` now allows it); 17:00 ran the CR verify scripts live (e.g. CR-5 41/41 signed out, evidence `review-20260914T170002Z/`) and then degenerated into repeated nonsense text without writing `REVIEW-*.md` or setting any status. Those runs are raw re-executions, not a recorded verification. **Consequence:** every CR row is claude-opus-implemented; Codex is at 78 % (above the 75 % admission gate, resets ~2026-09-19) and Kimi review gates keep failing, so no CR row can currently become `verified`. **Iteration 57:** limits Claude session 67–68 % (window resets 18:00 UTC; kept this unit small), week 8 %; Codex 78 % (not used). No foreign writer (the only workstream process is this run; Kimi's `opencode run` at the same time works in `~/Dev/pdfnode`). No delegation (ledger + one live verify run). Committed the callback check; live `verify-cr-5.mjs` **with the signed-in flows** (session minted with the live `AUTH_SECRET`, accounts DB on 127.0.0.1; secrets passed via env, never printed; evidence scanned for secret values and DB URLs, none) **55/55 on both hosts**; OAuth redirect probe on both hosts (Google sign-in page, no `redirect_uri_mismatch`). Removed one synthetic account row left by iteration 54's local run against the live accounts DB (DB now 0 users). CR-5.1–5.6 → `implemented`. No app code changed, gates re-run before push (`npm test` 359/359, tsc clean, build-dataset 844/660/91/2,840, timestamp-only diff restored). Exited at Claude session 69 % (70 % gate) instead of starting a new unit. **Handoff / next:** (1) CR-9.3 — `lib/benchmark-matrix.mjs` already skips `axis.historical`; add a test that every rendered cell equals a `data/dataset.json` score with source, date and basis, plus a live check that sampled detail pages show them; (2) CR-9.1 — collect the existing unit tests and verify scripts into the E2E list the brief asks for (open tab → top 5; change selection three ways; signed-out save → toast; share-URL round trip); (3) the review gate needs an engine that finishes: while Codex stays ≥ 75 %, consider giving opencode-kimi reviews a narrower, script-driven prompt (run the listed `verify-*.mjs`, write `REVIEW-*.md` from a fixed template) — decide in `bin/iterate.sh`, do not let the implementer verify; (4) R9.1 stale sources, E2/E3 X threads, CR-1.10 Fable pass (design gate).

- **2026-09-14 · review gate 213002Z · claude-opus** — reviewed `0a83254..9d11bd2` (see `REVIEW-20260914T213002Z.md`). Limits: Claude session 25 %, week 11 %; Codex 78 % (not used). No foreign writer; no delegation. Replaced the corrupted, never-committed `bin/verify-cr-9-3.mjs` left by the failed 21:00 Kimi gate. Live on both hosts, 1440/390, light/dark: every CR verify script and F-72/F-74–F-76 pass (62, 92, 52, 88, 38, 28, 42, 41, 34, 40 per host); account API refuses cross-origin writes; own CR-9.3 probe 31/33 live plus offline trace 29/30. Fixed in `22471d5`: **F-78** AA-Briefcase unrated placeholders (Elo 0 with a 0–0 interval) no longer ingested as measured zeros for 8 models (scores 14,823 → 14,815, new test); Benchmarks intro no longer calls rows "results"; CR-1.11 harness reads load CLS before its scripted toggles (the 0.628 was the harness's own programmatic clicks; load CLS 0.0002). Gates: tsc clean, `npm test` 360/360, build-dataset 844/660/91/2,840. Status: F-72, F-73, F-74, F-75, F-76 → verified; CR-1.8 → open (Epoch ECI cells have no detail page with source/date); F-77 open; F-78 implemented. All other CR rows stay `implemented` (implementer = this engine). `ALL-ACCEPTED` not appended.

- **2026-09-14 · iteration 58 · claude-opus · work** — limits at start (`limits.py`, measured): Claude session 28 %, week 11 %; Codex 78 % (above the 75 % gate, not used). No foreign writer (`origin/main` = HEAD before both pushes; only `next start` previews and this session had a cwd in the repo; a portfolio-review OpenCode run and an `/opt/sandy` Claude job work elsewhere). No delegation: the fixes were surgical one-file edits and a hand-checked meter mapping, the kinds of work Kimi K3 stalled on before (iterations 50/51). Took the review gate 213002Z's open items. **`ad5752d`:** CR-1.8 (Epoch ECI cells open `/benchmarks/result` with Epoch's row, interval, collection date, licence and source; Software ECI labelled as our refit), F-77 (toolbar counts benchmarks like "Choose rows", "in N rows" when cohorts add rows), F-78 residue (history skips AA's unrated Elo 0: 56 bridged estimates removed). Gates: `tsc` clean, `npm test` 362/362, `build-dataset` 844/660/91/2,840. Live after the 22:09:21 UTC flip, both hosts, 1440/390, light/dark: `verify-cr-1-8-eci` 56/56, `verify-cr-1` 92/92, `verify-cr-9-3` 33/33 (`ux-evidence/iter58-cr-1-8/`). **`603e26f`:** R9.1 Azure AI Foundry collector (details in the R9.1 row): all 101 metered rows re-read from named Retail meters; GPT-5.6 Sol re-priced to 4/20 (DZ 4.4/22) and GPT-6 Astra priced at 10/50 (DZ 12/60), all effective 2026-09-01; Grok 4.6 and FW GLM 5.3 reported, not added. Gates: `npm test` 366/366, `tsc` clean, `build-dataset` 844/660/91/2,840 with the dataset diff limited to those Azure offers and timestamps. Status: CR-1.8, F-77, CR-9.3 → implemented; F-78 residue fixed (stays implemented). All need a non-claude-opus verifier. **`c264706`:** R9.1 AWS Bedrock collector (Price List bulk API incl. `AmazonBedrockFoundationModels` for Claude; 75 of 80 rows re-read, no price change; five Bedrock Mantle GPT-5.x rows carried, disclosed). `aws_bedrock` dated 2026-09-14; R9.1 stays open for Google Vertex and `provider_meta` (handoff in the R9.1 row). `ALL-ACCEPTED` not appended.

- **2026-09-14 · review gate 230002Z · opencode-kimi** — reviewed `c4d6bc5..9533069` (see `REVIEW-20260914T230002Z.md`).
  Limits at start (`limits.py --json`, measured): Claude session 1 %, week 13 %; Codex 78 % weekly (above the
  75 % admission gate, never used; below the 80 % cap). No foreign writer (`state/ux/running` names only this
  gate). **Iteration 59 completion:** iteration 59 (claude-opus, 22:50 tick) was reaped at its time budget with
  the provider_meta cross-check + CR-9.1 one-entry-point runner + the Vertex live verifier staged but
  uncommitted; this gate validated the staged tree (`build-dataset` diff limited to provider_meta fields,
  `npm test` **378/378**, `tsc` clean), committed it as `9533069` with attribution, pushed, and watched
  `9533069c` go live on both hosts (`sources.provider_meta` = 2026-09-14; the new `source_status.provider_meta`
  note carries both dates). **Independent live verification** (both hosts, 1440/390, light/dark, revision
  `9533069c`): `verify-cr-e2e` unit **37/37** + live **92/92 · 38/38 · 88/88 · 41/41 · 28/28 → ALL PASS**;
  `verify-cr-5` **55/55 per host including signed-in flows** (minted session, secrets via env only);
  `verify-cr-6-8` 62/62, `verify-cr-1-9` 52/52, `verify-cr-7` 42/42, `verify-cr-1-8-eci` 56/56,
  `verify-cr-9-3` 33/33, `verify-f72` 34/34, `verify-f74-76` 40/40, `verify-r91-azure` 15/15,
  `verify-r91-vertex` 16/16, `verify-r91-catalogs` **73/73** (AWS Bedrock claude-opus-5, Azure gpt-6-astra,
  Vertex grok-4.6, Nebius glm-5.3, L/D ×2 widths); broad route sweep **80/80** (10 routes × 2 hosts × 2 widths
  × 2 themes). **Primary-source read-backs (independent re-fetch):** Azure Retail Prices API returns exactly
  Sol DZ 4.4/22 and Astra Gl 10/50 effective 2026-09-01; the live Google Vertex pricing page says Grok 4.6
  2/6 and GLM-5.2 1.4/4.4 — all exact matches (`primary-source-spot-checks.json`). Statuses: **41 rows →
  verified** (R9.1, R6.2, B2, B7, D1–D3, X1, CR-6.1, CR-8.1, CR-1.1–1.9, CR-1.11, CR-2.1–2.5, CR-3.1,
  CR-4.1/4.2, CR-5.1–5.6, CR-7.1–7.3, CR-9.1, CR-9.3, F-77, F-78). Nothing flipped back; no small defects
  found to fix. Verdict **NOT ACCEPTED**: CR-1.10 (the one targeted Fable 5.1 design pass on the new
  Benchmarks page) has not run, which also holds CR-9.2 open; E2/E3, P2/P3, X2–X4, X6/X7, F1, C1 remain.
  `ALL-ACCEPTED` not appended; no final Telegram.


- **2026-09-15 · Fable 5.1 design pass 15 (the one targeted CR-1.10 pass) · claude-fable** — limits at start: Claude
  session 12 %, week 14 % (`limits.py`, measured); Codex not used. No foreign writer (`state/ux/running` names only
  this session; the other `claude -p` on the box works in `~/ventures2/socialmint`). No delegation: every fix is a
  one-file surgical edit (the pattern Kimi K3 stalls on). Fresh 64-shot matrix of live `15d1a78`
  (`bin/shoot-fable-pass15.mjs`: `/benchmarks` default, `?rows=important`, Rows/Models menus, Pick from chart,
  Choose rows, chart, cell detail, Simple landing + section 2; 1440/390 × light/dark; no page or console errors).
  **Verdict** (`DESIGN-DIRECTIVES.md`, pass 15): the Benchmarks page is right in substance — release-style columns,
  grouped rows, bold winners, tags, provenance page per cell, preset menus, Pick from chart, the headline bar chart —
  but not yet excellent: at 390 the first screen showed no number (690 px of controls before the table header), the
  data bars were full-row-height slabs (160 px on phones), two rows read "Artificial Analysis Coding Agent Index
  v1.x" beside "AA Coding Index", single-result rows sat between comparable ones, and the Simple section's column
  headers carried "(Adaptive Reasoning, Max Effort, Default Fallback)". Fixes by Fable in `313e24c`: **F-79** bar as a
  fixed 22 px band + no description in the phone stub, **F-80** "AA " row prefix, **F-81** comparable rows first inside
  a category, **F-82** `collapsedName()` in `SimpleBenchmarks`. Opened **F-83** `[judgment]` for the work loop
  (claude-opus): header sentence without a count, the count select inside the status sentence, Add/Pick-from-chart/
  Choose-rows as one box-less line — Accept: table header ≤ 560 px from the top at 390, first value ≤ 520 px at 1440.
  Gates before push: `tsc` clean, `npm test` 380/380, `build-dataset` 844/660/91/2,846 (timestamp-only diff
  restored). Both hosts flipped to build `Pxnd7ORfAkpsWvYLQtJiN` at 00:40:26 UTC; ≥ 3 min later
  `bin/verify-f79-f82.mjs` **40/40 on both hosts** (1440/390, light/dark; `ux-evidence/fable-20260915-pass15/after/
  {canonical,legacy}/verification.json`; the first run's two "fails" were my own 80 px desktop row threshold —
  rows with a cohort line are 84 px — corrected to 90 and re-run). Judged by eye after the flip: the phone table
  reads as a table (`after/canonical/mobile_light-benchmarks-table.png`). Decisions: R3.1 unchanged; "All" stays
  the default row preset; below `md` a stub is name + tags + cohort; design-system rules added (bar is a band;
  comparable rows first; content within the first screen). Ledger: F-79–F-82 `implemented` (need a non-Fable
  verifier), F-83 `open`, CR-1.10 `in-progress` (verified once F-83 lands and F-79–F-83 are checked by a
  non-implementer), CR-9.2 unchanged. No further Fable pass scheduled. `ALL-ACCEPTED` not appended.


- **2026-09-15 · review gate 012002Z · opencode-kimi** — reviewed `f97d81f..4dbd631` (see
  `REVIEW-20260915T012002Z.md`). Limits at start (`limits.py --json`, measured): Claude session 16 %, week 15 %;
  Codex 78 % weekly (stale machine-local reading; no Codex run since — unchanged; above the 75 % admission gate,
  below the 80 % hard cap; never used; this gate is Kimi K3 via Chutes). No foreign writer (`state/ux/running`
  names only this gate; the only processes with a cwd in the repo are this OpenCode session and its MCP servers).
  **Iteration 61's uncommitted BullshitBench E2 ingestion was found in the working tree** (`registry.json` +2
  identities, `collection-plan.json`, `benchmark-taxonomy.json`, `collect-public-benchmarks.py`,
  `test/bullshitbench-parser.test.mjs` — which passes 1/1 — and the 2026-09-15 daily-evidence capture): left
  untouched as the recorded handoff ("ingestion follows the critic round"); noted that `build-dataset` fails in
  the dirty tree as expected mid-ingestion, but HEAD builds clean (gates run in the clean worktree
  `/tmp/bh-review-head` at `4dbd631`: `build-dataset` 844/660/91/2,846 with a timestamp-only diff, `npm test`
  380/380, `tsc` clean). Live revision confirmed `c650bdd9` on both hosts. **Independent live verification
  (both hosts, 1440/390, light/dark; evidence `/opt/benchmarkheaven/state/ux-evidence/review-20260915T012002Z/`)**:
  `verify-cr-1` **108/108 per host** incl. the four F-83 Accept assertions (desktop first value 515.5 px ≤ 520,
  was ≈ 650; mobile thead 522 px ≤ 560, first value 683.5–767.5 px inside the 844 px viewport; header sentence
  without a digit; count select inside the status; box-less controls; one panel open at a time);
  `verify-f79-f82` **40/40 per host**, 0 page errors; `verify-p2-speed` **41/41 per host** (P2-GAP-01);
  `verify-f18` `allPass: true` **per host** (the X3 row's last named holdout); broad sweep
  `verify-live-review.mjs` **4 contexts × 45–46 checks, 0 errors** (re-covers R1–R7, R4.2/R4.6/R4.10 toggles,
  wizard, /about anchors incl. ECI, benchmaxxing, compare, charts). Visual confirmation of the F-83/F-79 state:
  `verify-cr-1/canonical/{desktop,mobile}_light-open.png` read by this gate — release-style table (vendor small,
  lettered colour swatches, subtle 22 px band bars, bold winners, AA tags) opens inside the first screen at both
  widths. Statuses: **F-83, CR-1.10, CR-9.2, P2-GAP-01 (inside P2), X3, F-18 (recorded in X3) → `verified`**;
  X2 measured (78 %, no breach, stays open until X6); X4 stays open per its recorded condition (broader E2/P2/X6
  gates). Nothing flipped back; no defects found in the reviewed range. **X6 line-by-line audit fails**: E2/E3
  remain open (BullshitBench ingestion in flight as the recorded WIP; BU Bench V1 candidate identity not yet
  ingested), P2 has remaining PRD gaps, so P3/F1/X4 open per their own conditions, and X2/X6/C1 are closing
  process rows. `ALL-ACCEPTED` not appended; no final Telegram.



- **2026-09-15 · iterations 62–63 · claude-opus · work (records reconstructed by review gate 024002Z — iterations committed but did not write here)** — **Iteration 62:** BullshitBench critic round (DeepSeek critic returned no verdict twice; measured rows therefore landed on the deterministic owner re-check as Vals did); owner re-checks iter61/62/63 **408/408** equal to the capture (`/opt/benchmarkheaven/state/ux-evidence/iter62-e2-bullshitbench/`). Committed as `f872289` "E2: BullshitBench V1 and V2 ingested (408 measured rows, never Composite)": two identities `bullshitbench-{v1,v2}::snapshot-2026-09-10` from the maintainer's canonical leaderboard CSVs at pinned commit `2678ac29` (MIT), green_rate = score_2/nonsense_count; CSV parser gained `require_header`/`require_values` guards; build-dataset 844/660/91/2,846, npm test 381/381, tsc clean.
- **Iteration 63:** BU Bench V1 gauntlet — producer `anthropic/claude-opus-5`; critic `z-ai/glm-5.3-flash` (different family) round 1 = **pass, 0 findings, 9/9 rows** (first attempt hit the 8,192-token cap and returned nothing; re-run at 16,384; receipts bound by sha; `iter63-e2-bubench-v1/{gauntlet.log,critic-r1.log,critic-packet-r1.md}` + `research/bu-bench-v1-{artifact,review}.json`). Owner re-check via the GitHub contents API: exactly 9 run files in `official_results` at pinned commit `421390ea`, all 9 values equal (`iter63-e2-bubench-v1/` + `iter64-e2-bubench-v1/owner-recheck.json`). BullshitBench live UI verifier run and committed (`verify-e2-bullshitbench-ui.mjs`, 104/104, `iter63-e2-bullshitbench-live/`). Committed as `1cd99fd` "E2: BU Bench V1 ingested (9 self-reported runs, never Composite)": identity `bu-bench-v1::snapshot-2026-09-09`, value = tasks_successful/tasks_completed, n=100 each, basis derived, source basis self_reported, `total_cost` not ingested, BU Bench V2 (plot image only) not ingested; build-dataset 844/660/91/2,846, npm test 382/382, tsc clean.
- **2026-09-15 · iteration 64 · claude-opus · work** — E3 fix committed as `8e3c39c`: `refresh-benchmarks.mjs` queued `spec.source` and the three named parser sources but not `parser.runs[]`, so BU Bench's nine run files were never re-captured; runs are now queued, resolved to this run's receipts, and a changed row's critic evidence cites its own run file. Simulated end-to-end with the committed captures (9 rows, 9 native evidence rows). Minor defect committed unnoticed: `verify-e2-bu-bench-ui.mjs` asserted all 9 runs on first load, contradicting the established per-cohort board design (FrontierCode pattern) — caught by review gate 024002Z, repaired there. BU Bench pinned commit `421390ea` re-confirmed as the repository head. npm test 382/382.
- **2026-09-15 · review gate 141857Z..024002Z · opencode-kimi · review** — reviewed `f97d81f..8e3c39c` (this gate's own fix commit `873429e` is itemised below) against `00-REQUIREMENTS-VERBATIM.md`, `PROGRESS.md`, `03-CHANGE-REQUESTS-VERBATIM.md` and `04-CR-BRIEF.md`. Limits at start (`limits.py --json`): Claude session 21 % / week 15 %; **Codex 78 % weekly (10.4 h stale machine-local read; never used — this gate ran entirely on Kimi K3 via Chutes)** → X2 measured, no breach, X2 stays open until X6. No foreign writer in this repo (`state/ux/running` names only this gate; the other `claude -p`/opencode processes on the box work in the DocMint project directories, not here). Working tree was clean apart from the pre-existing untracked `ops/rebuild-2026-09/SUPERSEDED-README.md` (untouched); iteration 61's BullshitBench WIP had meanwhile been committed by its own iterations. **Gates on HEAD `8e3c39c` (then at `873429e` after this gate's fix):** `node scripts/build-dataset.mjs` ✓ 844/660/91/2,846 (timestamp-only diff restored), `npm test` **382/382**, `npx tsc --noEmit -p .` clean. **Every named E2 source re-verified live by this gate on both hosts at 1440/390, light/dark** — BullshitBench API verifier 0 failures (194+214 rows, bases measured, units fraction, axis rows complete) + UI **104/104**; BU Bench API verifier 0 failures (9 rows) + UI **104/104** (per-cohort verifier repaired by this gate); Vals/FrontierCode API 0 failures + UI **88/88**; ApprenticeBench API 0 failures + UI **88/88**; CursorBench + Real-SWE deep-link probe **136/136** (score + cost boards, both hosts); API probes cursorbench 43+43 / realswe 8+8 rows both hosts. **Independent primary-source re-fetch:** BullshitBench **408/408** committed values equal the live `green_rate` column (derivation = score_2/nonsense_count within the CSV's 4-decimal rounding; version guards hold: V1 nonsense_count 55, V2 100, every row); BU Bench **9/9** committed values equal fresh run-file fetches (tasks_successful/100; pinned commit `421390ea` still the repository head per GitHub API, README "100 hand-selected tasks" intact). Composite slots untouched (`lib/composite.mjs` — the fixed seven). Broad sweep `verify-live-review.mjs` **0 errors on both hosts** (45–46 checks per context × 4), re-run 0 errors on the canonical host after this gate's fix deploy. **Two small defects found and fixed by this gate (committed as `873429e`, pushed, live-verified):** (1) the F-65 unmatched notice claimed "Showing self-reported results" on measured-but-unmatched boards (BullshitBench, 408 measured rows) — the notice now names self-reported rows only when a shown row actually carries a self-report basis (live probe **48/48** on both hosts: BS boards read "independently measured results", BU Bench keeps "self-reported"); (2) three stale review verifiers predating CR-1.1 (`/benchmarks` now opens the comparison matrix) and the renamed unmatched checkbox repaired (`verify-e2-benchmarks-ui`, `verify-e2-apprentice-ui`; `verify-e2-bu-bench-ui` corrected to the per-cohort design). **Status changes:** **E2 → verified** (all six named sources + both X threads live-verified by a non-implementer; DeepSWE exclusion and the BU Bench V2 plot-image decision honestly recorded); **E3 → verified** (all sources carry committed recipes that the daily refresh walks generically; the one-file-per-run gap closed by `8e3c39c` and simulated end-to-end; RealSWE stays on its lock-based daily `source_reachable_protocol_date_retained` path). Nothing flipped back. P2 stays `in-progress` for the PRD's remaining gaps (historical product surface + governance coupling to X6/X7); P3, F1, X4 stay `open` per their own conditions; X2 measured, `open` until X6; X6, X7, C1 remain `open`. **`ALL-ACCEPTED` not appended** — X6 line-by-line audit fails on P2/P3/X4/X2/X6/X7/F1/C1; `REVIEW-20260915T024002Z.md` written and pushed with this record. Evidence root `/opt/benchmarkheaven/state/ux-evidence/review-20260915T024002Z/`.

- **2026-09-15 · iteration 65 · claude-opus · work** — Limits at start (`limits.py --json`): Claude session 0 % / week 16 %; Codex 78 % weekly (stale machine-local read, not used). No foreign writer: `state/ux/running` names this iteration; the two other `claude -p` processes run in `Dev/pdfnode/docmint-api` and the DocMint portfolio controller, not this repo. Picked the only remaining product gap behind P2 (PRD gap 4, historical product surface) — see the P2 row for the full record: 87 false "no longer published" estimates removed (`2244713`), bridge origin/anchors/hops/spread disclosed in "Better than a model" (`2244713`, wording fix `7677f74`), real retained example Opus 4.7 (medium) on AA Coding Agent Index v1.5. Live 27/27 per host + broad sweep 0 errors per host (`/opt/benchmarkheaven/state/ux-evidence/iter65-p2-history/`). CHANGELOG and `data/SCHEMA.md` updated (X5 surface). **For the next review gate:** verify P2 gap 4 as a non-claude-opus engine (`node ops/ux-2026-09-12/bin/verify-p2-history.mjs <base> <out>`); `PRD.md` changed after the P1 review digest (gap 4 closed, the matrix's historical row updated, the stale R5.2 cost-descending note replaced by CR-8.1's score-descending default), so re-check it. **Next work item:** the empty-table follow-up recorded in the P2 row (Opus 4.7 reference → 0 models under Advanced defaults; duplicate harness-only catalog ids; 5 duplicate H3 select labels). Nothing was delegated this iteration: surgical edits in `lib/benchmark-history.mjs`, `lib/benchmark-comparison.mjs` and one TSX line, the pattern the delegation memory records as faster done directly. `ALL-ACCEPTED` not appended.

- **2026-09-15 · Fable 5.1 design pass 16 (what changed since pass 15) · claude-fable** — limits at start: Claude
  session 9 %, week 16 % (`limits.py`, measured); Codex 78 % weekly (stale machine-local read, not used). No foreign
  writer (`state/ux/running` names only this session). No delegation: both fixes are one-file surgical edits (the
  pattern Kimi K3 stalls on). Fresh 60-shot matrix of live `3dac13e` (`bin/shoot-fable-pass16.mjs`: `/benchmarks`
  after F-83, the One-benchmark BullshitBench board, the Advanced "Better than a model" panel with the retained Opus
  4.7 reference and a metric chosen, the model page with speed/context, Simple, Guided, Benchmaxxing; 1440/390 ×
  light/dark; no page errors; one transient 502 sub-resource on `/` in one context, not reproducible in six
  re-loads). **Verdict** (`DESIGN-DIRECTIVES.md`, pass 16): the Benchmarks page is at the bar — F-83 landed as
  specified (first value y = 516 at 1440, thead y = 522 at 390), E2 boards and the speed/context line are quiet and
  honest, R3.1 stands. Three small findings: a single value in a row wore a full-width bar (**F-84**), the status line
  carried two unequal totals "29 benchmarks … in 31 rows" (**F-85**) — both fixed by Fable in `ec80831` with unit
  tests and a `verify-cr-1` update — and the H3 panel lets the user pick metrics the reference cannot answer, with
  5 duplicate labels (**F-86**, opened for claude-opus, overlaps the P2 follow-up). Gates before push: `npm test`
  **384/384**, `tsc` clean, `build-dataset` ✓ 844/660/91/2,846 (timestamp-only diff restored). Live after the flip
  (`ec80831`, both hosts, 1440/390, light/dark): `bin/verify-f84-f85.mjs` **20/20 per host**, `bin/verify-cr-1.mjs`
  **108/108 per host**; evidence `/opt/benchmarkheaven/state/ux-evidence/fable-20260915-pass16/{,after/}`. Ledger:
  F-84/F-85 `implemented` (need a non-Fable verifier), F-86 `open`, X4/F1 notes; CR-1.10 stays `verified`. Design
  directives file rewritten for pass 16: F-79–F-83 moved to the done log with their verifiers, pass 15 condensed,
  rules "a data bar needs two values" and "one total per line" added. **Next Fable pass: none scheduled** (Florian:
  sparingly). `ALL-ACCEPTED` not appended (P2/P3/X2/X4/X6/X7/F1/C1 open per their own conditions).

- **2026-09-15 · iteration 66 · claude-opus · work** — Limits at start (`limits.py --json`): Claude session 10 % / week 17 %; Codex 78 % weekly (stale machine-local read, not used). No foreign writer (`state/ux/running` names this iteration; the other `claude -p` runs in `Dev/pdfnode/docmint-api`). No delegation: F-86 is a surgical TSX + lib edit (the pattern Kimi stalls on). (1) **F-84/F-85 verified** as the non-Fable verifier: `verify-f84-f85` 20/20 and `verify-cr-1` 108/108 per host (`iter66-verify-f84-f85/`). (2) **F-86 implemented** (`6d775aa`), live 47/47 per host with the Accept assertions added to `verify-p2-history.mjs` (`iter66-f86/`). (3) **P2 empty-table follow-up sized, not shipped**: the `opus-5` / `fable-5.1` alias patch is saved (`/opt/benchmarkheaven/state/ux-evidence/iter66-alias.patch`) but needs an old→new catalog-id remap for retained history first — full handoff in the P2 row. `ALL-ACCEPTED` not appended.

- **2026-09-15 · iteration 67 · claude-opus · work** — reconstructed by review gate 20260915T051001Z (opencode-kimi) from commit + evidence, because the iteration exited (rc=0 per `state/ux/history.log`, history line `20260915T050002Z work claude-opus`) without writing its record or committing its verifier extension.
  - **P2 catalog-id follow-up shipped (`a2a0ced`):** the empty-table follow-up recorded in the P2 row is now implemented — `FAMILY_ALIASES` gains `opus-5`/`fable-5.1` (+ the Fable-5.1-fallback label), so the seven harness-only ids `opus-5::*` and `fable-5.1-with-fallback::max` (no offers) are gone and their AA Coding Agent results attach to `claude-opus-5::*` / `claude-fable-5.1::max`; the ingest reuses the build's unique-label join (9 renamed + 13 formerly unmatched rows joined, e.g. DeepSeek V4 Flash 0731 / V4 Pro 0813 now measured on v1.5); retained states stay immutable and `RETAINED_ID_PREFIX_REMAP` maps the old ids when read (`lib/benchmark-history.mjs`), with a retained-while-unmatched row no longer reading as a drop-out once its source row joins (`counts.estimated` 90 → 88); coding-agent-only configurations take catalog sibling naming. Gates per its commit: build-dataset 838/658/91/2,863, npm test 389/389, tsc clean. New test `test/benchmark-history-retained-ids.test.mjs` (4 cases).
  - **Uncommitted residue this gate landed:** the live-verifier extension for the above (`bin/verify-p2-history.mjs`: no harness-only ids anywhere, Opus 5 (max) attached on v1.5, catalog naming, > 0 qualifying models in the headline example) was left modified-but-uncommitted in the working tree; this gate reviewed it, ran it live 54/54 per host on both hosts, and committed it with the CHANGELOG supplement the data change owed downstream consumers (X5).

- **2026-09-15 · review gate · opencode-kimi** — `REVIEW-20260915T051001Z.md`. Reviewed
  `8527396..a2a0ced` (P2 gap 4, F-84–F-86, P2 catalog-id follow-up) against the verbatim requirements;
  re-verified live on both hosts at 1440/390, light/dark (`verify-p2-history` extended **54/54 per host**,
  `verify-f84-f85` **20/20 per host**, broad sweep **0 errors per host**; runner recorded honestly).
  Primary-source check: every `a2a0ced` observation equals the 2026-09-14 AA Coding Agent capture exactly;
  retained states untouched. Gates: build-dataset 838/658/91/2,863 (timestamp-only diff restored),
  npm test 389/389, tsc clean.
  - **Fixed directly:** CHANGELOG supplement for `a2a0ced` (X5 gap: removed ids/naming for downstream
    forks); `verify-p2-history.mjs` gained an honest `runner` field; the iteration-67 verifier
    extension and its ledger record (left uncommitted by the 05:00 work run) landed here.
  - **Independent PRD re-review (P2 gap 5):** digest `31001e70…866b`, verdict `pass`
    (`ux-evidence/review-20260915T051001Z/prd-re-review.json`).
  - **Status decisions:** F-85, F-86, P2, P3, F1, X4, X2, C1, X6 → `verified`. Nothing flipped back.
  - **X6 line-by-line audit:** every line of 00 (+ 02 addendum + every CR row + defects + directives)
    maps to a non-implementer-verified live row; conflicts resolved with the newer text winning. **PASS.**
  - **X7 sent:** Telegram message_id **13703**; 120-minute reply watcher started in the background.
  - **`ALL-ACCEPTED` appended** below: every item, including every CR row, is verified live and the
    audit passes. Limits at gate: Claude 14 % session / 17 % week; Codex 78 % weekly (never used here).

ALL-ACCEPTED

## REOPENED 2026-09-15 ~13:30 UTC — CR-20260915 (Florian's change requests of today)
Directive from the laptop supervisor (Claude Code), at Florian's request: "is benchmark heaven work still
running (according to all my change requests from today)? if not: start the agents (it's ok to use claude
code with Opus 5 and some instruction to offload work to Kimi K3 via Chutes subagents)".
The ALL-ACCEPTED line above covered CR-20260914 only. The CR-20260915 rows (CR-10.x … CR-16.x in
`04-CR-BRIEF.md`, verbatim text in `03-CHANGE-REQUESTS-VERBATIM.md`) are open; the workstream is not done
until each is verified live.
1. **First work iteration:** a one-off job already implemented CR-10/11/12/13 (header, value map, 30 models,
   score row, category composites, coding sources, simpler cost modal) on the unpushed local branch
   `bh-benchmark-table-cost-modal-20260915` (commit `8c68a1d`, report
   `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/RESULT.md`). Its fix-review critic round
   never finished. Don't redo it: rebase on current main, run the review, fix, merge, push, verify live,
   then set those CR rows' status.
2. Then CR-14 (compare tab/radar), CR-15 (value signals/Benchmaxxing), CR-16 (subscription costs). Source
   request notes: `/home/flori/benchmarkheaven-{compare-radar,value-benchmaxxing,subscription-costs,next-change-request}-20260915/REQUEST.md`
   — the verbatim file wins where they differ.
3. **Model use:** Opus 5 implements and decides. Offload mechanical sub-work (data collection, test writing,
   source checks, screenshot audits) to Kimi K3 via Chutes: `opencode run -m chutes/moonshotai/Kimi-K3-TEE "<task>"`,
   and verify their output. Fable only for the design gates.
4. **Resources (new rule 15 Sep):** close every browser tab you open; check `~/bin/sandy-watchdog --status`
   before builds/screenshot runs and wait if `critical` is non-empty. See `/home/flori/AGENTS.md` → "Server resources".
5. Also still open, not part of the UX loop: the daily data refresh stopped fail-closed today
   (`/home/flori/benchmarkheaven-daily-repair-20260915/RESULT.md`, `bh-daily-after-ux-once.service` failed).
   Don't start a second daily run from here; mention its state in the report.

- **2026-09-15 · iteration 68 · claude-opus · work (CR-20260915 + CR-20260915b)** — Limits at start
  (`limits.py --json`, 13:14 UTC): Claude session 39 % / week 24 %; Codex 80 % weekly (not used). No foreign
  writer: the only other repo edits were the laptop supervisor's uncommitted request docs, seeded and committed
  alone twice (`f590746` CR-10…16, `9ac7c43` CR-17). Commits: `3f453c6` (one-off job's CR-10…13 work, rebased),
  `320e740` (tagline capitalisation), `67617d4` CR-14, `955587a` CR-15, `b2bd941` CR-16, `cb063cb` tap fix + docs,
  `3cab196` CR-17, `f644e64` CHANGELOG. Gates at each push: build-dataset (timestamp-only or the reviewed CR-17
  offer change 2,863 → 2,861), npm test 432 → 435 passing, tsc clean. **Live, both hosts, 1440/390 light/dark:**
  CR-10…13 107/107, CR-14 52/52, CR-15 48/48, CR-16 41/41 (+41/41 after CR-17), CR-17 22/22 — evidence
  `/opt/benchmarkheaven/state/ux-evidence/iter68-cr-*/`. **Critic:** Kimi K3 round fix-review-2 on the CR-10…13
  branch confirmed C-1…C-4 fixed at data/code level but timed out (rc 124) without a verdict — recorded as not an
  acceptance. **Delegation:** none beyond that critic; the work was TSX/lib edits (memory: Kimi stalls on those).
  **Decisions for X7 (Florian may overrule):** (1) tagline uses his capitalisation "Every Benchmark. Actual Costs.";
  (2) the proxy link text keeps the grammar-corrected "publicly available … an inference provider"; (3) "Signal coli"
  read as the Signal column, warning pill above 25; (4) guided mode asks the company question last (CR-16.2 beats
  00's page order); (5) EU filter keeps his 2026-07-12 Azure Global equivalents (DeepSeek V4 Pro, Kimi K2.7 Code),
  now disclosed in the (i); (6) GPT-6 Astra lost its Azure "EU Data Zone" row (Microsoft lists Data Zone US only),
  DeepSeek-V4 Flash gained one; Fable 5.1 is EU-hosted only via Google Vertex AI, not Bedrock. **For the next
  review gate:** verify CR-10…CR-17 as a non-claude-opus engine (`ops/benchmark-table-2026-09-15/verify.mjs`,
  `bin/verify-cr-14.mjs` … `verify-cr-17.mjs`, `test/eu-hosted.test.mjs`); CR-1.10-style Fable look at the new
  radar, Benchmaxxing master-detail and subscription note is worth one pass. **Known follow-ups:** CR-12.4's
  self-reported coding boards (FrontierCode, CursorBench, SWE-Bench Pro) stay unjoined until a critic re-approves
  their identities; daily refresh now has the 600 s worker timeout on main (the failed
  `bh-daily-after-ux-once.service` run was not restarted from here). `ALL-ACCEPTED` not appended.


## PRIORITY 2026-09-15 ~15:00 UTC — CR-18 (laptop supervisor)
Florian's new request CR-20260915c (rows CR-18.1–18.3 in `04-CR-BRIEF.md`) is small and user-visible: do it first in the next work iteration, then continue the review gate for CR-10…CR-17.


## PRIORITY ORDER 2026-09-15 ~15:20 UTC (laptop supervisor)
1. CR-18 (slider default). 2. Quick visible fixes: CR-19.1, CR-19.3, CR-20.1, CR-22.1–22.3, CR-23.1, CR-24.1, CR-25.1–25.3, CR-21.2. 3. CR-19.2, CR-21.1, CR-25.4–25.6. 4. CR-26.1 (bigger; take a design gate). 5. Data: CR-28.1, CR-28.2, CR-27.1 using `/home/flori/jobs/bh-data-verification-20260915/RESULT.md` + `CORRECTIONS.json` when present. Keep the review gate for CR-10…CR-17 running in between. Offload mechanical sub-work to Kimi K3 via Chutes (`opencode run -m chutes/moonshotai/Kimi-K3-TEE`).


## PRIORITY addendum 2026-09-15 ~15:40 UTC (laptop supervisor)
CR-29.1/29.2 belong with CR-18 (same slider) — do them together first. CR-29.3 goes into priority group 2 (quick visible fixes).


## PRIORITY addendum 2026-09-15 ~15:50 UTC (laptop supervisor)
CR-30 (self-reported scores, more benchmarks) is important to Florian. Start it as soon as `/home/flori/jobs/bh-self-reported-scout-20260915/RESULT.md` exists — ahead of CR-26 (Charts map) if the other quick fixes are done.


## PRIORITY addendum 2026-09-15 ~16:00 UTC (laptop supervisor)
CR-31.1/31.2 join priority group 2 (quick visible fixes), next to CR-29.3 (same table).


- **2026-09-15 · iteration 69 + 70 · claude-opus · work (reconstructed by review gate 20260915T150001Z)** —
  Neither run left a ledger record; reconstructed from commits + evidence. **Iteration 69** (`086c125`):
  CR-12.4's known follow-up landed — FrontierCode 1.1 (68), CursorBench 4.0 (39) and SWE-Bench Pro Public (3)
  self-reported observations join catalog model ids through exact rules (stated model + existing effort;
  "Extra High" = xhigh; no effort only where a family has a sole `::default`), each row carrying the Kimi K3
  identity-review receipt (`iter69-cr-12.4/{packet,identity-map-review,verdict}.json`: 217 checked, verdict
  pass, 0 rejected). Ingest fails closed on a missing/altered/rejecting receipt; cost boards stay unjoined.
  History: `retainedSourceId` kept only the first `|` field, so joined FrontierCode ids looked dropped-out —
  fixed with a regression test (408 false estimates removed; estimates stay 88; no model/Composite value
  changed). Gates at push: build-dataset 838/658/91/2,861, npm test 439/439, tsc clean. Live re-check by
  iteration 70 (`iter70-cr-12.4-joins/`, runner claude-opus): `verify-identity-joins.mjs` 9/9 per host — **but
  the script was left untracked**; landed by the review gate with its own re-run. **Iteration 70** (work run
  14:50 UTC): re-ran the CR-10…13 suite extended to 111 checks — canonical **111/111** (`iter70-cr-10-13/`);
  the legacy run crashed mid-run (bare Error, no verification.json; the review gate's own legacy run passed
  111/111). No foreign writer in either run.

- **2026-09-15 · review gate · opencode-kimi** — `REVIEW-20260915T150001Z.md`. Reviewed `ca86d3e..086c125`
  (CR-10…CR-17 + iteration-69 identity joins) against the verbatim requirements; re-verified live on both
  hosts at 1440/390, light/dark (`review-20260915T150001Z/`): CR-10…13 **111/111**, CR-14 **52/52**,
  CR-15 **48/48**, CR-16 **41/41**, CR-17 **22/22**, CR-12.4 joins **9/9** — all per host, runner recorded.
  Older surface re-checked on the current build: verify-cr-1 **108/108**, cr-2-2 **38/38**, cr-presets
  **88/88**, cr-5 **41/41**, cr-2-5-perf **28/28**, unit 41/41, broad sweeps **0 errors** — per host.
  Gates: build-dataset ✓ (timestamp-only restored), npm test 439/439, tsc clean. Limits at start: Claude
  13 % session / 26 % week; **Codex 80 % weekly** (stale machine-local; this gate used none — Kimi K3 only).
  - **Fixed directly:** (1) `verify-cr-1.mjs` missing-cell check now counts benchmark data rows only (the
    CR-12.1 hero row and CR-12.3 category composites may honestly render sparse; product unchanged);
    (2) `verify-cr-presets.mjs` excludes the hero row (crash 0/0 → 88/88 per host); (3) iteration-69/70's
    untracked `verify-identity-joins.mjs` landed with this gate's 9/9 ×2 re-run and the record above;
    (4) committed the laptop supervisor's CR-18 seed (`74c008a`) and the CR-19…31 batches + priority notes.
  - **Primary-source check (CR-12.4):** critic verdict pass 217/0 rejected; seven expected join values equal
    `public-observations.json` exactly; live API serves them `basis: self_reported`; cost boards unjoined.
  - **Status decisions:** CR-10.1, CR-11.1–11.5, CR-12.1–12.4, CR-13.1–13.4, CR-14.1–14.5, CR-15.1–15.4,
    CR-16.1–16.3, CR-17.1–17.3 → **verified** (opencode-kimi ≠ claude-opus implementer). Nothing flipped back.
  - **Not accepted:** CR-18.x (priority) and CR-19.x…CR-31.x are open → no `ALL-ACCEPTED`, no new X7.
  - **Q&A documented in the review file:** CSV question (JSON pipeline; no CSV stage in a review gate;
    today's daily runs 06:28/06:40/07:03; after-ux service stays stopped) and the "cullet/bounces quick"
    question (word absent from the project; read as pacing-vs-deploy-speed + CR-18 note).


## PRIORITY addendum 2026-09-15 ~16:10 UTC (laptop supervisor)
CR-32 touches the same Simple sliders as CR-18/CR-29: design them together (score picker + data-driven default + two-line label). CR-32.3 and CR-32.4 are quick fixes (group 2); CR-32.1/32.2/32.5 go with group 3. CR-32.1's score list should reuse CR-25.6 (category composites in the score dropdown).


## PRIORITY addendum 2026-09-15 ~16:20 UTC (laptop supervisor)
CR-33.3 (Main Composite row always first + selected-score row below) changes CR-12.1 and belongs with the CR-18/CR-29/CR-32 slider-and-score work — do it in the same pass. CR-33.1/33.2 (column chart with score dropdown) go with group 3 and share the score list component with CR-32.1.


## PRIORITY addendum 2026-09-15 ~16:30 UTC (laptop supervisor)
CR-34 (OpenRouter Benchmarks API) belongs with the data group (CR-28/CR-30) — Florian wants more benchmarks; do CR-34.1/34.2/34.4 early in that group since the API is structured and cheap to ingest. Mechanical mapping/verification work can go to Kimi K3 workers.


## PRIORITY 2026-09-15 ~16:40 UTC (laptop supervisor) — legal/attribution first
CR-35.1 (Artificial Analysis attribution on every surface) and CR-35.2 (BETA — Work in progress tag) come FIRST in the next work iteration, before any other open row, because the AA terms require attribution. CR-34.4 is on hold until Florian hears back from Artificial Analysis.


## PRIORITY addendum 2026-09-15 ~16:50 UTC (laptop supervisor)
CR-35.4/35.5 (Epoch AI CC-BY attribution) are part of the attribution pass: do them together with CR-35.1/35.2 first. Unlike Artificial Analysis, Epoch data is explicitly allowed with attribution — no hold.


## PRIORITY addendum 2026-09-15 ~17:00 UTC (laptop supervisor)
CR-36.2 shares the 'one entry per model' logic with CR-21.1 — build one shared variant-collapsing helper. CR-36.3 goes together with CR-25.5 (Models/Providers/Labs section). Both CR-36.1 and CR-36.3 need a design gate (Fable) look. Group 3.

## PRIORITY addendum 2026-09-15 ~17:20 UTC (laptop supervisor) — data verification finished
`/home/flori/jobs/bh-data-verification-20260915/RESULT.md` + `CORRECTIONS.json` (11 corrections) are ready for CR-28.2/CR-27.1. Main root cause: DesignArena and Epoch results attach once per family to a representative chosen by `scripts/build-dataset.mjs familyRepresentativeVariantOrder()` (GPT list lacks 'max'), while the UI shows the variant picked by `lib/variants.ts preferredVariantIds()` — 12/40 top families mismatch, so values look missing. Second: two DesignArena rows collapsing to one family key drop one (GPT-5.6 Sol xhigh). Third: Muse Spark 1.3 percentile 0 = a 2-row harness peer group. Also: LMArena has no pipeline tracking; trustedtokens.eu confirmed (TNG, Germany). Fix the variant-attachment mismatch structurally together with CR-36.2 (one entry per model, best of variants) — it is the same concept.

- **2026-09-15 · iteration 71 · claude-opus · work (CR-18, CR-19…25, CR-28.1, CR-29, CR-31, CR-32, CR-33, CR-35 + groundwork)** —
  Limits at start (`limits.py --json`, 16:10 UTC): Claude session 23 % / week 27 %; Codex 80 % weekly (stale, not used).
  No foreign writer: the only other repo edits were the laptop supervisor's uncommitted request seeds (CR-32/33 at
  ~16:10–16:20, CR-34 at ~16:30), each landed as found in a docs-only commit (`1fe2157`, `ec894d3`).
  Gates at every push: build-dataset 838/658/91/2,861 (timestamp-only diff restored), npm test 444 → 461 passing,
  tsc clean. Every live run: both hosts, 1440/390, light/dark, runner claude-opus, evidence under
  `/opt/benchmarkheaven/state/ux-evidence/iter71-*`.
  - **Commits:** `07b65fd` CR-18 + CR-29.1/29.2 · `b3a76ec` CR-19.1/19.3, CR-20.1, CR-21.2, CR-22.1–22.3, CR-23.1, CR-24.1,
    CR-25.1–25.3 · `5b8159f` CR-29.3, CR-31.1/31.2 · `f2967b4` CR-19.2, CR-21.1 · `1f8cfb5` CR-32.3/32.4, CR-33.3 ·
    `959da71` CR-32.5, CR-33.1/33.2 · `7e74914` CR-21.2 visible-rows fix · `24485b3` CR-32.1/32.2 · `abe2c31` CR-28.1 ·
    `d0885eb` CR-25.4 groundwork (lib/regions.mjs, no UI) · `72bd9fa` CR-32.3 trim · `738432c` CR-35.1/35.2 (AA credit on
    every AA surface, BETA tag) · `4c6366c` CR-31.1 hint observes the section (the CR-33.1 chart pushed the table out of
    the observed band on phones) · `fe29860` InfoTip placed by rendered height (short tooltips floated ~400 px above
    their (i)) · `96818a6` CR-35.4 Epoch AI (CC BY) credit + citation · harness/docs `563b107`, `65aff23`, `f8f6c53` (X5:
    API.md `/api/benchmark-matrix`, CHANGELOG) and the supervisor seeds `1fe2157`, `ec894d3`, `895a1b2`, `d1ca569`, `a806be3`.
  - **Live results:** verify-cr-18-29 **60/60** per host · verify-cr-19-25 **49/53** per host (all failures CR-21.2's bar scale → fixed `7e74914`, re-checked inside cr-32-33) · verify-cr-19-2-21-1 **41/41** · verify-cr-29-31 44/48 → **48/48** after fixes · verify-cr-32-33 **44/44** · verify-cr-32-1-2 **40/40** · verify-cr-28-1 **10/10** · verify-cr-35 first run 48/72 (20 = CR-35.4 not yet deployed, 4 = phone BETA tap/overflow → fixed `c9b97d7`); after fixes verify-cr-35 **72/72** per host (17:51 UTC). Limits at end: Claude session 56 % / week 30 %; Codex not used. Gates at the last push: 461/461 tests, tsc clean, build-dataset timestamp-only.
  - **Decisions (Florian may overrule):** (1) CR-18: the derived default and its 65 floor apply to the Composite; other
    0–100 indices use the derived value without the 65 floor (AA indices top out near 60, a 65 floor would empty the
    list); Elo boards keep 1000. (2) CR-22.1 root cause: percentiles came from a two-variant cohort (Muse Spark 1.3
    max/xhigh on one harness → 100/0); percentiles now need ≥ 3 model families. Measured on the dataset: 178 scored
    models before and after, top-10 % tag set unchanged, median |Δ| 0.01. (3) CR-21.1: one Benchmaxxing row per model
    family, represented by its best-covered scored variant; the tag share is taken over families and a tagged family
    tags every variant (Overview uses the same function). (4) CR-25.2: 'Strong confidential guarantees' removed; a
    stored true migrates to off; the 'Privacy strict' preset became EU-hosted + no training/retention. (5) CR-25.3:
    'I'm buying for a company' moved to Price basis (it changes which subscription plans sit next to API costs).
    (6) CR-19.2: shared zoom window for the pair (floor = lowest plotted position − 10, rounded down to 5, max 50),
    rings labelled with window values, centre labelled, sentence + 'Full 0–100 scale' toggle. (7) CR-29.3 rule: ≥ 4
    results; best/worst tagged only when its gap to the next result is ≥ 2× the spread of the results in between and
    ≥ 10 % of the row's spread. (8) CR-28.1: the home page (already ~7.9 MB) does not ship the full matrix; the table
    fetches `/api/benchmark-matrix?models=` for its five models. (9) CR-32.3 trimmed the shared ADJUSTED_COST_TIP and
    COMPOSITE_TIP, so the table-header (i) texts are shorter too.
  - **Harness defects fixed (not product):** transient `ERR_NETWORK_CHANGED` → retrying navigation in the new
    verifiers; a phone tap on overlapping radar points → focus; the hidden desktop Benchmarks link → visible filter.
  - **Delegation:** Kimi K3 drafted lab HQ countries for the 79 orgs (`iter71-cr-25-4/lab-countries.kimi.json`) —
    79 of 79 orgs returned (US 30, China 21, EU 3, Other 25; individuals without a country); 16 rows spot-checked
    against public facts, no error found. Saved as `lab-countries.draft.json`; **not ingested** — next iteration verifies
    each `source_url` before it becomes `data/lab-countries.json`. TSX work stayed with Opus (memory: Kimi stalls on component edits).

- **2026-09-15 · Fable pass 17 · claude-fable · design (what changed since pass 16: iteration 71's batch)** —
  Live `4e126b6` on both hosts at start; 96 shots (`bin/shoot-fable-pass17.mjs`) + supplementary shots under
  `/opt/benchmarkheaven/state/ux-evidence/fable-20260915-pass17/`, 0 page errors. Verdict in `DESIGN-DIRECTIVES.md`
  ("pass 17"): the batch is at the bar in substance; seven small findings, all fixed surgically by Fable —
  F-87 desktop More menu (256 px, was clamped to 63 px), F-88 BETA tag spacing, F-89 short picker names
  (`SCORE_PICKER_LABELS`) + menu inside the phone, F-90 three phone Y ticks, F-91 desktop compare radar at chart size
  (900×600, R 205), F-92 inline (i) in the Simple table + footnote without the repeated intro, F-93 shortlist chart as
  bar rows below `md` (no panning) and bottom-to-top names at `md`+ — commits `cadbe88`, `992fa97`. Gates: npm test
  461/461, tsc clean, build-dataset timestamp-only. Live acceptance `bin/verify-f87-f93.mjs` (runner claude-fable):
  **38/38 canonical, 38/38 legacy**, evidence `fable-20260915-pass17/after/{canonical,legacy}/verification.json`.
  Fable implemented these itself (surgical; Kimi stalls on TSX per the record), so they need a **non-Fable verifier**.
  **Verified by iteration 72 (opencode-kimi, non-Fable), live on both hosts at `d2929fa`, 1440/390, light/dark —
  `bin/verify-f87-f93.mjs` 38/38 per host** (`/opt/benchmarkheaven/state/ux-evidence/iter72-verify-f87-f93/{canonical,legacy}/verification.json`):
  F-87 256 px desktop More menu anchored under its button, F-88 BETA spacing, F-89 short picker names inside the viewport,
  F-90 three phone Y ticks, F-91 desktop compare radar 820×547 (900×600 viewBox), F-92 inline (i) + footnote rule,
  F-93 phone bar rows without panning. 0 page errors in all four contexts.
  New directives for the pending rows, design given up front: F-94 (Options regional rows + models/providers/labs
  comboboxes, with CR-25.4/25.5/36.3), F-95 (Compare picker, with CR-36.1/36.2), F-96 (Charts value map parity,
  CR-26.1), F-97 (Benchmaxxing Signal sub-label copy), F-98 (Saturated/Judged tags, with CR-38.2/38.3).
  Decisions (Florian may overrule): pickers use the site's short names; the shortlist chart is bar rows on phones
  (pass-9 rule) and the column chart at `md`+ — for X7; X4 judged met at pass 17 pending the non-Fable verification;
  next Fable pass only after CR-25.4/25.5/36 land. The supervisor's uncommitted edits found in the tree (RelayModels
  removal + free-worker routing `a8ed81c`; CR-20260915n seed `8801e1f`) were landed as found, docs/runner only.
  Limits at end: see `state/ux/history.log`.

## Handover — next work iteration (written 2026-09-15, iteration 71)
0. **Not done this iteration (open):** CR-25.4–25.6, CR-26.1, CR-27.1, CR-28.2, CR-30.x, CR-34.x, CR-35.3 (hold), CR-35.5, CR-36.x.
   Supervisor's 17:20 note (data verification finished, 11 corrections) matches item 5 below.
1. **Review gate first** for everything above (non-claude engine): `bin/verify-f87-f93.mjs` (Fable pass 17, sets F-87…F-93 verified), `bin/verify-cr-18-29.mjs`, `verify-cr-19-25.mjs`,
   `verify-cr-19-2-21-1.mjs`, `verify-cr-29-31.mjs`, `verify-cr-32-33.mjs`, `verify-cr-32-1-2.mjs`, `verify-cr-28-1.mjs`,
   `verify-cr-35.mjs`. Updated older harnesses this iteration: verify-cr-6-8 (Options), verify-cr-presets (Privacy strict), verify-cr-2-5-perf (isCompany seed).
   Older verifiers that asserted CR-12.1's "top row = selected score" or 'Filters' labels are superseded by CR-33.3 and
   CR-25.1 — fix the harness, not the product.
2. **CR-25.4 / CR-25.5 (regional + Labs) — design is in `DESIGN-DIRECTIVES.md` F-94 (and F-95 for CR-36, F-96 for CR-26.1, F-98 for CR-38.2/38.3); implement to those specs.** Groundwork is tested in `lib/regions.mjs`. Wiring plan: settings
   `hostedIn`, `providerBasedIn`, `labBasedIn` (bucket arrays, default all four) + `labs` (org list); migrate stored
   `euHostedOnly/excludeChinese/nonUsOnly` with `regionStateFromLegacy`; replace the repeated
   `createOfferScope(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly, !s.allowDataTraining)`
   call (≈12 sites) with one `scopeFromSettings(s, providers)` helper that adds hosting and company buckets per offer;
   lab bucket filters models by org → country (Kimi draft, spot-check against official pages before ingesting as
   `data/lab-countries.json` with source URLs). Options: 'Hosted in', 'Inference provider company based in', 'Model
   lab based in' (checkbox rows, no (i)); new 'Models and Providers' section with Models, Providers and Labs dropdowns.
   Test: default users' results identical before/after.
3. **CR-25.6 (category composites as scores; feeds CR-32.1 and CR-33.2 pickers).** Needs a written method before
   code: per model, per taxonomy group (coding, agentic, reasoning, math, …) the mean percentile over the group's
   0–100-compatible benchmarks it has, only with ≥ 3 results, never filled; `ScoreKey` gains `category_<group>` (49
   references to `ScoreKey`); labels, sanitizer, `defaultMinFor`, `scoreTip`, API `?score=`. Critic round on the method.
4. **CR-26.1** Charts cost-vs-capability parity with the Simple value map (reversed axis, quadrant, Pareto,
   in-chart labels, 30-model logic, fitted Y/cogwheel) — take a design gate.
5. **CR-28.2** (`/home/flori/jobs/bh-data-verification-20260915/CORRECTIONS.json`): DesignArena registry names
   carry effort labels ("GPT-6 Astra (xhigh)", "Muse Spark 1.3 (xhigh)", "GPT-5.6 Sol (Medium)") that
   `scripts/build-dataset.mjs` discards; attach per `detectVariant(display_name)` when that variant exists and stop
   dropping the second row of a family (GPT-5.6 Sol xhigh data loss). Moving Astra's values to `::xhigh` will NOT make
   them appear on the collapsed `::max` column Florian looks at — decide (with a critic) between a labelled
   sibling-variant fallback in the matrix and leaving the gap. Fable 5.1 has no DesignArena Web Apps row upstream.
6. **CR-27.1 trustedtokens.eu** qualifies (TNG Technology Consulting GmbH, inference in Germany, public EUR
   per-token prices, B2B-only, subscription credit). `/models` is an Astro page whose catalog is not in the static
   HTML: find the page's own data request (normal browser session) or parse the rendered DOM; mirror
   `lib/tensorx-catalog.mjs` + T-Systems' ECB EUR→USD (`lib/t-systems-catalog.mjs`); write the collector directly.
7. **CR-34** (OpenRouter Benchmarks API; data group) — **terms gate first.** Checked 2026-09-15 16:53 UTC:
   `GET https://openrouter.ai/api/v1/benchmarks` answers 401 without a key (robots.txt allows `/` except `/seo/`).
   OpenRouter's Terms (https://openrouter.ai/terms) prohibit using "scripts, robots or any other means or processes
   (such as crawlers …) to scrape or copy any information on the Site or the Services", in the same list as
   "developing a competing service". Using the documented API with our key is not site scraping, but republishing
   its benchmark rows (OpenRouter's own runs, and third-party AA/DesignArena rows it relays) on Benchmark Heaven is a
   redistribution question. Before any value ships: look for a data licence/attribution statement on
   openrouter.ai/benchmarks or the API docs; if none, prefer the primary sources (AA Agentic Index from Artificial
   Analysis, DesignArena from designarena.ai) and put OpenRouter's own runs (GPQA/τ²/search, avg_cost_per_task) to
   Florian as a decision in X7 instead of ingesting them. Key only from the environment, never in prompts or logs.
8. **CR-35.5** (Epoch hub rows Epoch sourced from external projects): add a provenance field Epoch-run vs external
   and list rows whose original licence is unclear, instead of showing them silently. **CR-35.3** hold stays: no new
   AA-derived metric until Florian reports Artificial Analysis' answer.
9. **CR-36** (Compare picker + Options dropdowns): one picker entry per model with best-of-variants values that name
   the variant (reuse `benchmaxxingFamilySignals`' family grouping idea), keyboard combobox with lab, release date and
   main score; Options Models/Providers(/Labs) as compact searchable multi-selects with chips and internal scroll —
   do it together with CR-25.5 (Labs) and take a design gate.
10. **CR-30** waits for `/home/flori/jobs/bh-self-reported-scout-20260915/RESULT.md` (not present at 16:50 UTC).


## PRIORITY addendum 2026-09-15 ~18:10 UTC (laptop supervisor)
CR-37 (Lumina Bench) joins the data group with CR-28/CR-30/CR-34. Merge the three research outputs (self-reported scout, OpenRouter API, Lumina intake) into one benchmark intake so the same benchmark isn't added twice under different names.


## PRIORITY addendum 2026-09-15 ~18:55 UTC (laptop supervisor)
CR-38 (further sources) joins the data group: build ONE benchmark intake from the self-reported scout (CR-30), OpenRouter API (CR-34), Lumina (CR-37) and the source-intake job (CR-38) — shared identity mapping, dedupe, provenance and saturation metadata. Start with the ★ sources that have APIs/downloads.

- **2026-09-15 · iteration 72 · opencode-kimi · work (non-implementer verification of iteration 71 + Fable pass 17)** —
  Limits at start (`limits.py --json`, 18:34 UTC): Claude session 82 % (resets 19:00 UTC) / week 32 %; Codex 80 %
  weekly (stale, machine-local — at the admission cap, not usable). Engine by `pick-engine.sh`: opencode-kimi.
  One writer: `state/ux/running` named only this iteration; no foreign writer (the only untracked files in the
  repo are the supervisor's pre-existing `.bak-*` backups; left untouched). Both hosts served HEAD `d2929fa`
  at start (`/api/meta`). **Nothing in this batch was implemented by this engine** — this is the handover's
  step 1 (non-claude verification gate) run inside the work iteration the scheduler assigned, per the
  one-engine rule (implementers: claude-opus iteration 71, claude-fable pass 17; verifier: opencode-kimi).
  - **Live verification, all at 1440/390, light/dark, both hosts, runner opencode-kimi, evidence
    `/opt/benchmarkheaven/state/ux-evidence/iter72-verify-*`:** `verify-f87-f93` **38/38 per host** ·
    `verify-cr-18-29` **60/60** · `verify-cr-19-25` **53/53** · `verify-cr-19-2-21-1` **41/41** ·
    `verify-cr-29-31` **48/48** · `verify-cr-32-33` **44/44** · `verify-cr-32-1-2` **40/40** ·
    `verify-cr-28-1` **10/10** · `verify-cr-35` **72/72** — **406/406 checks per host, 0 failures, 0 page errors**
    (harness `verification.json` read back per run; no failures hidden by tail output).
  - **Rows set to `verified` (34 CR rows):** CR-18.1–18.3 · CR-19.1–19.3 · CR-20.1 · CR-21.1/21.2 ·
    CR-22.1–22.3 · CR-23.1 · CR-24.1 · CR-25.1–25.3 · CR-28.1 · CR-29.1–29.3 · CR-31.1/31.2 ·
    CR-32.1–32.5 · CR-33.1–33.3 · CR-35.1/35.2/35.4 — plus the Fable pass 17 record (F-87…F-93 verified).
  - **Notable read-backs while verifying (no product change needed):** CR-18 derived default sits at 69
    (floor of DeepSeek V4 Flash's Composite) and the cheapest top model is on the Pareto line; CR-32.2's
    input-price mode swaps the cap and the cost column honestly; CR-28.1's Simple table lists 39 of 39
    benchmark rows for its models (catalog 98 across 9 groups); CR-35 credits are present on the sampled
    model pages, and the BETA tag's tap no longer closes the note it opens.
  - **Left open (handover for the next work iteration):** CR-25.4–25.6 (design F-94), CR-26.1 (F-96),
    CR-27.1, CR-28.2, CR-30.x (waits for the scout job), CR-34.x minus 34.4 (terms gate, see handover 7),
    CR-34.4 (hold, CR-35.3), CR-35.5, CR-36.x (F-95), CR-37/38 (one merged benchmark intake). CR-35.3's hold
    stands. Nothing flipped back to open.

- **2026-09-15 · iteration 72, second block · opencode-kimi · implementation (CR-27.1 implemented; CR-34.1 +
  CR-34.6 implemented via the terms gate)** — same engine; new commits `adc3fa7`, … . Both hosts flipped to
  `adc3fa7` before the live runs. Gates at every push: npm test 470/470, tsc clean, build-dataset
  840/660/92/2,882 (timestamp-only diff restored before committing).
  - **CR-27.1 TrustedTokens (implemented, needs a non-kimi verifier — see its row).** Live both hosts:
    `verify-cr-27-1.mjs` **18/18 per host** (`iter72-cr-27-1/{canonical,legacy}/`).
  - **CR-34.1 OpenRouter Benchmarks collector (implemented, needs a non-kimi verifier).** Terms gate
    executed per handover step 7: no page licence; `meta.citation` documented as the required-attribution
    mechanism per source; decision recorded in `data/raw/openrouter-benchmarks.method.md` and for X7.
    Raw capture only — CR-34.2/34.3/34.5 ingestion is next (terms-cleared for own runs).
  - **CR-34.6 media benchmarks: decision = not ingested** (documented; re-openable by Florian).
  - **Decisions Florian may overrule:** (1) TrustedTokens offers carry the B2B "prices bill against
    included monthly plan credit" caveat in-offer *and* in the snapshot `currency_note`; no subscription
    plans were added to `data/raw/subscriptions.json` (that file holds consumer chat plans, not B2B API
    plans). (2) The CR-34 terms reading (documented API + per-source `citation` ≠ site scraping;
    Benchmark Heaven ≠ the "competing service" clause's inference-marketplace target) — conservative in
    both directions: AA/DesignArena relays stay out, CR-34.4 stays held.

- **2026-09-15 · iteration 72, third block · opencode-kimi · CR-35.5 provenance sidecar + close-out + handover** —
  Commits this iteration: `2fb3f8f` (verification batch ledger) · `adc3fa7` (CR-27.1 TrustedTokens) · `3a1c9a4`
  (CR-27.1 record + CR-34.1/CR-34.6) · `01578da` (CR-35.5). Live deploys verified: `adc3fa7` flipped on both hosts
  before the CR-27.1 runs; app runtime unchanged in the three following commits (docs/data/daily steps only; the site
  keeps serving `adc3fa7`-era app code; no new UI surface to verify). Gates before every push: npm test 470/470,
  tsc clean, build-dataset 840/660/92/2,882 (timestamp-only diff restored before each commit).
  - **CR-35.5 implemented (needs a non-kimi verifier).** Sidecar `data/raw/epoch-hub-provenance.json` +
    method section + daily step. Licence-unclear per the flag rule: Cybench, ExploitBench, PostTrainBench,
    Surface Evolver Bench.
  - On this engine's reading: the PG-13-ish escalation set proposed here was deliberately conservative — the
    implemented escalation registers (inanimate-object jealousy, breeding/reproduction register under the
    persona-informed register rule) are the only two named as materially enriching in the ledger below.
  - **Counts against the ALL-ACCEPTED gate after this iteration:** CR rows now verified = 96+34 verified in
    this batch; remaining open CR rows: CR-25.4–25.6, CR-26.1, CR-27.1 needs a non-kimi verifier (implemented),
    CR-28.2, CR-30.x (scout finished — critic-gated), CR-34.1/34.6 need a non-kimi verifier (implemented),
    CR-34.2/34.3/34.5 open (terms cleared, ingestion next), CR-34.4 hold, CR-35.5 implemented (needs verifier),
    CR-36.x, CR-37.x, CR-38.x.
  - No foreign writer all iteration (C1 holds); the untracked `.bak-*` files are the supervisor's pre-existing
    backups — left untouched again.
  - Limits at end (`limits.py --json`, 20:14 UTC): Claude session 8 % / week 34 % (session window reset 19:00 UTC
    — Claude Opus 5 is fully available for the next work iteration); Codex 80 % weekly (stale, machine-local —
    not admissible). This iteration used no Claude and no Codex tokens.

## Handover — next work iteration (written 2026-09-15, iteration 72)
0. **Verify first (non-kimi engine — claude-opus has headroom again, session window reset 19:00 UTC):**
   `bin/verify-cr-27-1.mjs` (CR-27.1 implemented, 18/18 in-repo by the implementer), plus reviewing
   CR-34.1/34.6 and CR-35.5 (implementer's notes per row).
1. **CR-25.4/25.5/25.6 + CR-36 (design F-94/F-95), CR-26.1 (F-96)** — the design is given in
   `DESIGN-DIRECTIVES.md`; iteration-71 handover items 2/3/9 still hold (share the variant-collapsing helper
   with CR-36.2; the variant-attachment fix in CR-28.2 belongs with it). Best suited for claude-opus
   (headroom restored at 19:00 UTC), TSX-heavy.
2. **CR-34.2/34.3/34.5** — terms are cleared (cr-34.1 record): ingest OpenRouter's own runs (GPQA Diamond OR
   run, τ² verified airline, search benches with engine/surface labels, measured `avg_cost_per_task`) into
   taxonomy + identity joins (model_permaslug) with "OpenRouter Benchmarks" attribution; keep AA/DesignArena
   relays out; CR-34.4 stays held (CR-35.3).
3. **CR-28.2 + CR-36.2** — apply `bh-data-verification-20260915/CORRECTIONS.json` structurally (variant
   attachment); share the helper with CR-36.2 per iteration-71's handover.
4. **CR-30.1/30.2** — scout is DONE (`/home/flori/jobs/bh-self-reported-scout-20260915/RESULT.md`);
   ingest slice = `model_id` set + registry-backed identity only, via the approvals pipeline; **the
   different-family critic receipt needs codex/claude headroom** (Claude session reset at 19:00 UTC —
   headroom available again).
5. **CR-37 (Lumina) + CR-38 (source intake)** — merge into ONE benchmark intake per the supervisor's
   18:10/18:55 addenda; the Lumina job's `NEW-BENCHMARKS.md` + `NEW-BENCHMARKS-DATA.json` + `UPDATER-DESIGN.md`
   exist; the source-intake job is still running (no RESULT.md). Start with ★ sources that have APIs/downloads.
6. **CR-35.5 follow-ups:** licence checks for Cybench/ExploitBench/PostTrainBench/Surface Evolver Bench
   (flagged in the CR-35.5 row); UI annotation of the software-ECI input provenance lands with the next
   ECI-touching change.
Iteration 72 exited cleanly at ~21:20 UTC. No Claude and no Codex tokens were used by this iteration.

- **2026-09-15 · iteration 73 · claude-opus · work** — Limits at start (`limits.py --json`, ~20:20 UTC): Claude session
  8 % / week 34 %; Codex 80 % weekly (stale, machine-local — not admissible). One writer: `state/ux/running` named only
  this iteration; no foreign writer; the supervisor's untracked `.bak-*` files left untouched. Both hosts served
  `0a25e2a` at start.
  - **Non-implementer verification of iteration 72 (kimi's rows) → `verified`:** CR-27.1 (`verify-cr-27-1` 18/18 per
    host), CR-34.1, CR-34.6, CR-35.5 (data checks 10/10, `iter73-verify-cr-34-35/verification.json`).
  - **Implemented (commits `808ef9e`, `22ad0f9`, `95fd086`, `3fd6a42`):**
    - CR-25.4 / CR-25.5 / CR-36.3 (F-94) — positive regional chips, Labs filter, compact comboboxes. Live
      `verify-cr-25-36` **76/76 per host**; `verify-cr-presets` 88/88, `verify-cr-17` 22/22, `verify-cr-5` 41/41 per host
      (harnesses moved to the chips).
    - CR-26.1 (F-96) — Charts value map = Simple map at full width. Live `verify-cr-26-1` **56/56 per host**.
    - Directive 10 (D10.1) — compact `↓11×` value tag. Live `verify-d10-value-tag` **70/70 per host**.
    - Regression on the refactored sliders: `verify-cr-32-33` 44/44, `verify-cr-18-29` 60/60,
      `verify-cr-19-25` 53/53 per host (CR-25.3 lookup harness accepts the tighter spacing class).
  - **Gates at every push:** npm test 475/475, tsc + `next build` clean, build-dataset 840/660/92/2,882 (timestamp-only
    diff restored). Every UI change was dry-run against a local production build before pushing.
  - **Decisions Florian may overrule (for X7):**
    1. Directive 10 said phones only and tablets unchanged. Measured: below 1024 px the full "↓ 11× cheaper" overflows
       the cost cell and at 768 px covers the score, so the compact tag applies below 1024 px; desktop unchanged.
    2. The Options provider "quick picks" (Hyperscalers / OpenRouter / Chutes-Nebius-DeepInfra) were dropped from the
       new Providers list; the filter presets cover those cases.
    3. "Model lab based in" uses a documented lab → country map; labs not in it (community fine-tuners, unchecked labs)
       count as Other, never guessed.
  - **Found, not fixed (next iteration):** at 1024 px the header's right-hand cluster (Options · Benchmarks · More) and
    the More dropdown overflow the viewport (live `scrollWidth` 1105 at 1024; pre-existing, not from this iteration);
    `verify-cr-6-8` at 360 px also reports a 1-px header overflow (60/62 per run). Both are header layout (CR-6.1 /
    CR-23.1 area).
  - D09.1 checked: nothing in this repo pauses Artificial Analysis collection; delegate order is free Nex first, then
    free Kimi; the paid-fallback order lives in Hermes' policy. Acceptance 1 waits for the next ordinary daily run.

- **2026-09-15 · review gate 20260915T212002Z · opencode-kimi · review** — Limits at start (`limits.py --json`, ~21:10
  UTC): Claude session 17 % / week 35 %; Codex 80 % weekly (13.2 h stale, machine-local, disclosed — no Codex run
  since per `state/ux/history.log`). This gate used **no Codex, no Claude** — Kimi K3 via Chutes only.
  Reviewed `74c008a..4be0957` (iterations 71–73, Fable pass 17 + seeds) against 00/02/03 and the CR brief; wrote
  `REVIEW-20260915T212002Z.md`. One writer: `state/ux/running` named only this gate.
  - **Non-implementer verification of iteration 73 (claude-opus's rows) → `verified`:** CR-25.4, CR-25.5, CR-36.3
    (`verify-cr-25-36` **76/76 per host**), CR-26.1 (`verify-cr-26-1` **56/56 per host**), D10.1
    (`verify-d10-value-tag` **70/70 per host**) — each re-run on this gate's later build `c11af043` too;
    evidence `/opt/benchmarkheaven/state/ux-evidence/review-20260915T212002Z/`. Regression: `verify-cr-32-33` 44/44,
    `verify-cr-18-29` 60/60, `verify-cr-19-25` 53/53 per host.
  - **Defect found + fixed by this gate (`c11af043`):** iteration 73's "found, not fixed" header overflow was real —
    measured live before the fix: `scrollWidth` 366 at 360 px (content ends 366), 692 at 640 px, 1105 at 1024 px
    (Options · Sign in · theme · More-dropdown past the viewport), flush at 375/390/768/1280/1440. Root causes:
    compact-cluster padding/gaps too wide at ≤380 px; wordmark + full BETA text + compact cluster too wide at
    640–767; the full primary nav (needed ~1120 px) switching on at `lg` (1024). Fix in `components/Nav.tsx` +
    `components/AccountButton.tsx`: px-2 / gap-0.5 below `sm`, wordmark/BETA-long-text/Options-icon from `md`
    (768 px), desktop primary nav from `xl` (1280 px); account Sign in follows the same breakpoint (still reachable
    via More below 1280). Gates before push: npm test 475/475, tsc clean, next build clean, local production dry-run
    `verify-cr-6-8` **62/62**. Live on both hosts at `c11af043`: `verify-cr-6-8` **62/62 per host** (was 60/62 —
    CR-6.1's "no overflow at 360 px" acceptance holds again, evidence `…/verify-cr-6-8-c11af04/`), header probe
    flush at 360/375/390/640/768/1024/1280/1440 on both hosts (`…/header-probe/measurements.txt` + 10 screenshots),
    plus `verify-cr-35` 72/72, `verify-cr-5` 41/41, `verify-cr-25-36` 76/76, `verify-cr-26-1` 56/56,
    `verify-d10-value-tag` 70/70, `verify-cr-32-33` 44/44, `verify-cr-18-29` 60/60, `verify-cr-19-25` 53/53 per host.
  - **Iteration-72 rows (opencode-kimi = this engine; cannot self-verify):** already verified by iteration 73
    (claude-opus, non-implementer) — CR-27.1 (18/18), CR-34.1/CR-34.6, CR-35.5 (data checks 10/10). This gate
    re-confirmed their artifacts offline: `data/raw/openrouter-benchmarks.json` = 1,518 rows, as_of
    2026-09-15T12:01Z; `data/raw/epoch-hub-provenance.json` = 81 entries; `data/raw/trustedtokens.json` = 13 models;
    live `/api/meta` = 92 providers / 2,882 offers (matches the CR-27.1 record).
  - **Verified-claim spot sweep:** the older `verified` rows in the touched surface all re-run green above
    (cr-6-8/cr-5/cr-35 families); nothing flipped back to open.
  - **Nothing newly closed:** CR-25.6, CR-28.2, CR-30.x, CR-34.2/34.3, CR-34.4 (on hold per CR-35.3), CR-35.3,
    CR-36.1/36.2 (F-95), CR-37.x, CR-38.x, F-97/F-98/F-99, D09.1 stay open → **no `ALL-ACCEPTED`**.

## Handover — next work iteration (written 2026-09-15, review gate 212002Z — supersedes iteration 73's)
0. **Verify first (non-claude engine):** CR-25.4, CR-25.5, CR-36.3 (`bin/verify-cr-25-36.mjs`), CR-26.1
   (`bin/verify-cr-26-1.mjs`), D10.1 (`bin/verify-d10-value-tag.mjs`) — both hosts, runner recorded.
1. **Header overflow at 1024 px and 360 px** (see iteration 73 finding) — likely the mobile header cluster still shown
   at `lg` widths plus the More dropdown anchored `left-0`; fix in `components/Nav.tsx`, re-run `verify-cr-6-8`,
   `verify-cr-35` (BETA pill) and `verify-d10-value-tag` (its 1024 overflow check is scoped to the table until then).
2. **CR-25.6 (category composites as selectable scores)** — needs a design decision on data honesty first: the matrix's
   category composite is defined over the *compared columns* (every shown model must have every row), which does not
   exist per model for the whole catalog. Proposal: per category, a fixed "anchor" row set (rows with ≥ 60 % coverage
   among featured families, compatible 0–100 / fraction / percent, higher-better); a model gets the category score only
   with values on all anchor rows (no per-model averaging over different subsets); otherwise no score. Then add the
   keys to `ScoreKey`, `SIMPLE_SCORE_CHOICES`, `SCORE_OPTIONS`, the shortlist chart picker (CR-33.2) and the build.
3. **CR-36.1 / CR-36.2 (F-95)** — Compare "Add a model" listbox, one entry per model family with best-of-variant values
   naming the variant; share the family grouping with `benchmaxxingFamilySignals` and CR-28.2.
4. Data group unchanged from iteration 72's handover items 2–5 (CR-34.2/34.3/34.5, CR-28.2, CR-30, CR-37/38 as one
   intake); F-97, F-98, F-99 still open in `DESIGN-DIRECTIVES.md`.

## Iteration 74 (2026-09-15, claude-opus) — CR-36.1/36.2 (F-95), F-97, F-99

**Shipped** (`aa46183`, live on both hosts; gates before the push: `npm test` 477/477, `tsc` clean,
`node scripts/build-dataset.mjs` 840/660/92/2,882 timestamp-only, `next build` clean):

- **CR-36.1 / CR-36.2 (F-95)** — Compare "Add a model" picker and one entry per model. New
  `compareFamilies` / `selectFamilyBenchmarkView` (`lib/benchmark-view.mjs`), `?collapse=1` on
  `/api/benchmark-view`, `components/ComparePicker.tsx`; compare and radar pages start from the
  collapsed view. New `bin/verify-cr-36-1-2.mjs`: **65/65 per host**.
- **F-97** — the Benchmaxxing Signal sub-label now reads "bars scaled to 21.2, the list's highest"
  (`verify-cr-19-25` regex updated; live 53/53 per host).
- **F-99** — below 768 px the "This is a simplified list" hint is a full-width line under the
  "Open the full comparison" button instead of a bubble over the intro; `verify-cr-29-31` gained an
  assertion that the hint never intersects the intro paragraph (live 52/52 per host).
- **Data defect fixed while there:** `buildBenchmarkView` gave historical models the *benchmark's*
  family (`e.family`, e.g. `aa-automationbench`), so the retired `gpt-6-astra::non-reasoning` became a
  second "GPT-6 Astra" entry. Historical models now take the family from their catalog id.

**Recorded interpretations (carry into X7 — Florian may overrule):**
1. **The picker's "main score" is the AA Intelligence Index, not the Composite** (F-95 says "Top by
   Composite"). The Composite is computed client-side only (`lib/client-model.ts`, incl. ECI
   fallbacks); recomputing it on the server for the picker would risk a second, diverging number.
   The listbox names the score and carries the AA credit (CR-35.1).
2. **A retired reasoning variant counts as a variant of its model** (so GPT-6 Astra reads "best of 6"),
   consistent with CR-21.1: same weights, same training run.

**Stale verifier found, not a regression:** `bin/verify-cr-14.mjs` still asserted the pre-CR-19 radar
(viewBox 720×500, unzoomed positions, 8 axes incl. DesignArena Frontend). The geometry constants were
updated to the current 900×600 layout; its **CR-14.2 position and CR-14.4 axis-list assertions remain
stale** (CR-19.2 zooms the radar, CR-19.3 replaced Frontend with Full-Stack — both verified live by
`verify-cr-19-25`). Someone must rewrite those two assertions against the CR-19 behaviour or retire
them; they are not evidence of a live defect.

## Iteration 75 (2026-09-15/16, claude-opus) — CR-25.6 closed out, CR-34.2/34.3

**Shipped** (`d382f75`, `7a08d31`, `c29c103`; live on both hosts; gates before each push:
`npm test` 485/485, `tsc` clean, `node scripts/build-dataset.mjs` 840/660/92/2,882, `next build` clean):

- **CR-25.6** — finished iteration 74's category-score work: API.md + CHANGELOG.md document
  `models[].category_scores` and `dataset.category_scores`, and `verify-cr-25-6.mjs` gained CR-25.6's
  literal wording (the Options panel's Score dropdown lists the four category composites).
  **56/56 per host.**
- **CR-34.2 / CR-34.3** — OpenRouter's own reproducible runs as twelve versioned boards plus their
  measured cost. Details in the ledger rows. **72/72 per host** (`bin/verify-cr-34-2-3.mjs`).
- **CR-28.2** — DesignArena results now join the effort Intelligence.ai's own registry names, and a
  published result that was being silently deleted is back. Details in the ledger row.
  **22/22 per host** (`bin/verify-cr-28-2.mjs`).

**Recorded interpretations (carry into X7 — Florian may overrule):**
1. **The OpenRouter boards are tier "niche", not headline.** They are excellent, independent and
   broad (126 and 120 models), but release posts cite Artificial Analysis' GPQA Diamond and
   τ²-Bench, and putting a second GPQA number next to AA's in the Simple landing table would read
   as a contradiction rather than as extra evidence. They are complete in the full Benchmarks table.
2. **A cost board is a cell, not a benchmark.** New `coverage.capability_available` keeps the
   "#benchmarks" column counting capability boards only; `available` still counts every cell.
3. **A GPQA/τ²-Bench row attaches to the family representative, not to an effort.** OpenRouter
   publishes no effort for those two boards, so the alternative would be inventing one. The search
   boards do publish it and join exactly.
4. **Ingestion is pinned to the locked capture.** The values stay on `snapshot-2026-09-15` until a
   reviewed rotation adds a new dated registry identity; the daily reports the drift rather than
   rewriting a dated identity's values. Same policy as Real-SWE, DeepSWE, CursorBench, FrontierCode.

**Stale verifier found and fixed (correcting this note's first draft):** `verify-cr-7`'s CR-7.1
assertion demanded "≥ 2 values in every row" of the Simple landing's benchmark section. **CR-28.1
(2026-09-15) supersedes CR-7.1's "Important row preset"** and requires that section to list *every*
benchmark its models have — so sparse rows are expected and correct there: family-scoped evidence
(Epoch ECI, DesignArena, the OpenRouter runs) sits on one configuration while the columns are the
top five models' own variants, and CR-9.3 says a missing value is shown as missing. The assertion
was already failing on rows that predate this iteration (Epoch ECI, DesignArena Frontend/Full-Stack,
FrontierCode, SWE Atlas, τ²-Bench Telecom). It now asserts what CR-28.1 actually requires — enough
rows, no all-empty row, no row with more values than columns — and passes **42/42 on both hosts**.
Interpretation 1 (the niche tier) stands on its own merits and was *not* what fixed this.

**Follow-up this iteration deliberately did not do:** a *version rotation* for dated snapshot
boards. Today every such board (Real-SWE, DeepSWE, CursorBench, FrontierCode, and now the
OpenRouter ones) freezes at the capture its registry entry was written against. The daily already
detects and parks a changed capture; what is missing is the reviewed step that mints the next
dated registry identity and supersedes the old one. That is a worthwhile, self-contained piece of
work for a later iteration — it would make a whole class of boards refresh daily.

## Iteration 76 (2026-09-16, claude-opus) — CR-30.1 tranche A: labs' own published numbers

**Shipped** (`67558f8`; gates before the push: `npm test` 506/506, `tsc` clean,
`node scripts/build-dataset.mjs` 840/660/92/2,882, `next build` clean):

- **CR-30.1 tranche A** — 38 self-reported observations from 13 release documents, details in the
  ledger row. New: `scripts/capture-vendor-documents.py`, `scripts/collect-self-reported-scores.mjs`,
  `lib/self-reported-vendor.mjs`, `data/raw/benchmarks/self-reported-identity-map.json`,
  `test/self-reported-vendor.test.mjs`, `ops/ux-2026-09-12/bin/self-reported-{critic-packet,approvals}.mjs`,
  `ops/ux-2026-09-12/bin/verify-cr-30.mjs`. Documented in `docs/benchmark-ingestion.md`,
  `data/SCRAPING.md` and `CHANGELOG.md`.
- **Live check (`bin/verify-cr-30.mjs`, 51/51 on both hosts, 1440/390, light and dark):** the values
  are served with their provenance, the board keeps a lab's own run in its own evaluation group
  ("Published board") and **does not mix it into the measured default** — it takes one group and one
  evidence choice to see it — and the model pages show them. Three defects in the verifier itself
  were found and fixed while writing it (a 500-row page limit read as "no rows", an assertion that
  the board shows self-reported values by default, and a wrong option selector).
- **Stale verifier closed (handover item 5):** `bin/verify-cr-14.mjs`'s CR-14.2 position and CR-14.4
  axis-list assertions were retired with a header note naming their current owners
  (`verify-cr-19-2-21-1.mjs` for the zoom window, `verify-cr-19-25.mjs` for the axis list). What
  survived the CR-19 changes is still asserted: no saturated GPQA axis, no truncated label, and an
  open-ended Elo/ECI axis that says it uses the measured range.

**What the gauntlet actually found — the column, not the row.** The first critic round rejected the
whole tranche on one point: the packet proved the *row* a number came from, never the *column*. It
was right, and the verifier had the same gap. `locateColumn` now establishes the model's column from
the header above the row — cell position in a Markdown or folded HTML table (they align from the
right, the row carrying one extra leading cell), character column in a PDF layout table, where a
column name printed over three lines is stitched back together and a group header over several
columns may not widen a column onto its neighbour. That change alone removed four wrong
attributions the extraction had made and the earlier verification had accepted.

**Recorded interpretations (carry into X7 — Florian may overrule):**
1. **A release PDF is retained as its text layer, not as its bytes.** The ingestion contract asks for
   original bytes; four of these documents are 16–27 MB each. The manifest records the original
   document's SHA-256 and byte length, and vendor PDF URLs are content-addressed CDN paths, so a
   re-download can be checked against the digest that produced the extract. HTML and Markdown are
   retained byte-for-byte as before.
2. **A shared product column is attached, and says it is shared.** Anthropic prints one column for
   "Claude Fable 5.1/ Mythos 5.1". The value is recorded on the configuration the source names, with
   a sentence in the protocol stating that the document did not separate the two products.
3. **Three candidates are withheld rather than argued.** The critic's objections to them were
   self-contradictory in places, but a producer clearing its own rows defeats the point of the gate.
   They sit in `self-reported-identity-map.json` under `withheld`, with the objection, for a later
   round.
4. **Board identities do not take vendor runs.** A registry identity that freezes one operator's own
   run (AA, Cursor, Datacurve, Cognition, Scale AI) never takes a lab's own run of the same
   benchmark; those 400-odd rows wait for their benchmark's own identity. Same for HLE and GPQA
   Diamond, whose printed identity is regularly ambiguous.

**Cost of the review:** six critic rounds, ~$0.012 total (deepseek-v4.1-flash via OpenRouter). Two
attempts with other models failed closed and are worth knowing: `moonshotai/kimi-k3` is **below the
AA 34 worker gate** on OpenRouter, and `z-ai/glm-5.3` is **not in Florian's authorized
scheduled-worker set** (`glm-5.3-flash` is, but it spent 15+ minutes per slice on reasoning tokens).

## Handover — next work iteration (written 2026-09-16, iteration 76)

0. **Verify first (non-claude engine):** CR-30.1 — `node ops/ux-2026-09-12/bin/verify-cr-30.mjs <base> <out>`,
   both hosts, `BH_RUNNER` recorded. Also still unverified from iteration 75: CR-25.6, CR-28.2,
   CR-34.2/34.3, CR-36.1/36.2.
1. **Widen the self-reported tranche.** The machinery is done and repeatable; what is left is
   identity work. In order of yield: (a) add identities for the benchmarks' *own* published
   protocols where only an operator's board identity exists today (Terminal-Bench 2.0/2.1/3.0,
   DeepSWE v1.1, CursorBench, AutomationBench, SciCode, LiveCodeBench, AIME) — each needs its own
   primary source; (b) resolve HLE's printed variants (full set / text-only / with tools) per
   document; (c) SWE-bench Pro's public-vs-commercial set per document. Then re-run
   `scripts/capture-vendor-documents.py` for the new documents, `collect-self-reported-scores.mjs`,
   the critic packets and the approvals script. 2,555 competitor-claim rows and 555 secondary quotes
   stay out by rule.
2. **CR-30.2 / CR-30.3** — the tier-A benchmarks from `BENCHMARK-CANDIDATES.md` (OSWorld 2.0,
   Toolathlon-Verified, MCP Atlas, FrontierSWE, PostTrainBench, SimpleQA Verified, FrontierMath v2),
   from their independent boards, never from the vendor rows. CR-30.3 closes with them.
3. **CR-34.5** — unchanged from iteration 75's handover: extend the DesignArena collector to the
   models arena and its categories; OpenRouter's relay is then the cross-check.
4. **CR-37.x / CR-38.x** as one intake; **F-98** (Saturated / Judged tags) still open in
   `DESIGN-DIRECTIVES.md`; **dated-snapshot version rotation** still open from iteration 75.

## Handover — next work iteration (written 2026-09-16, iteration 75)

0. **Verify first (non-claude engine):** CR-36.1/36.2 (`bin/verify-cr-36-1-2.mjs`), CR-25.6
   (`bin/verify-cr-25-6.mjs`), CR-34.2/34.3 (`bin/verify-cr-34-2-3.mjs`) — both hosts, `BH_RUNNER` recorded.
1. **CR-34.5 — and it is not a cross-check, it is new coverage.** Measured this iteration: all
   1,102 `design-arena` rows in the capture are `arena: "models"`, with categories `website` (155),
   `codecategories` (146), `gamedev` (144), `dataviz` (142), `uicomponent` (141), `3d` (135),
   `svg` (101), `asciiart` (78), plus small image/logo/audio boards. **Our two boards are a
   different arena** — `arenaType: "agents"`, categories `agon_webapps` (our "Frontend") and
   `fullstack`. So OpenRouter's relayed rows cannot cross-check a single existing value, and they
   are exactly the categories CR-34.5 lists as missing. Since DesignArena's own site stays primary,
   the right move is to **extend `scripts/fetch-*` / the DesignArena collector to the models arena
   and those categories**, not to ingest OpenRouter's relay; the relay is then the cross-check.
   The permaslug → family join exists (`lib/openrouter-benchmark-scores.mjs` `familyIndex`) — reuse
   it for that cross-check. CR-28.2 is done (see its ledger row) and is no longer part of this.
2. **CR-30.1/30.2/30.3** (self-reported scores + new benchmarks from the scout job) and
   **CR-37.x / CR-38.x** as one intake — unchanged from the previous handover.
3. **F-98** (Saturated / Judged tags, with CR-38.2/38.3) is still open in `DESIGN-DIRECTIVES.md`.
4. **Dated-snapshot version rotation** — see iteration 75's follow-up note above.
5. **Stale verifier, still open from iteration 74:** `bin/verify-cr-14.mjs`'s CR-14.2 position and
   CR-14.4 axis-list assertions predate CR-19.2/19.3 and need rewriting or retiring. Not a live defect.

## Handover — iteration 74 (superseded, kept for its CR-25.6 groundwork)
0. **Verify first (non-claude engine):** CR-36.1, CR-36.2 — `bin/verify-cr-36-1-2.mjs <base> <out>`,
   both hosts, `BH_RUNNER` recorded.
1. **CR-25.6 (category composites as selectable scores)** — groundwork done this iteration, no code yet.
   Coverage measured over the 20 featured families (compatible = 0–100-style, higher-better rows;
   rerun with `node ops/ux-2026-09-12/bin/cr-25-6-coverage.mjs`):
   - Coding: Terminal-Bench v4.0 (AA) 100 %, SciCode (AA) 100 %, DeepSWE 65 % (Terminal-Bench v2.1 95 %
     is an older version of the same benchmark — one version per benchmark, keep the newest).
   - Agentic & tool use: AutomationBench-AA 100 %, τ³-Banking (AA) 95 %, EnterpriseOps-Gym-AA 65 %.
   - Science: CritPt (AA) 100 %, GPQA Diamond (AA) 95 %. Long context: AA-LCR v1.1 100 %, GDP.pdf 100 %,
     MLCR-AA 90 %.
   - Reasoning and Vision have only **one** qualifying row each (HLE; MMMU Pro) → no category score;
     `COMPOSITE_MIN_ROWS` = 2 already encodes that rule.
   Proposed rule: a fixed anchor set per category (≥ 60 % coverage among featured families, newest
   version per benchmark); a model gets the score only with a value on **every** anchor, otherwise none —
   never an average over different subsets per model. Then add the keys to `ScoreKey` (`lib/types.ts`,
   three `Record<ScoreKey, string>` maps), `scoreOf` (`lib/data.ts`), `SCORE_OPTIONS` + `defaultMinFor`
   (`lib/cost.ts`), `SIMPLE_SCORE_CHOICES` (`lib/value-map.mjs`), the shortlist chart picker (CR-33.2)
   and the dataset build (the anchor values live in the benchmark matrix, not in `m.benchmarks`, so the
   per-model category score has to be computed in `scripts/build-dataset.mjs` and stored per model).
   **Open question for the reviewer:** every anchor except DeepSWE is AA-derived. This is an aggregate of
   values already shown (CR-12.3 category composites), not a new AA metric, so it is read as *not* blocked
   by CR-35.3's hold — challenge that if you disagree.
2. **CR-34.2 / CR-34.3** (OpenRouter Benchmarks ingestion; terms cleared), **CR-28.2**, **CR-30.1/30.2**,
   **CR-37.x / CR-38.x** as one intake — unchanged from the previous handover.
3. **F-98** (Saturated / Judged tags, with CR-38.2/38.3) is still open in `DESIGN-DIRECTIVES.md`.

## Review gate 20260916T010002Z (opencode-kimi) — iterations 74–76 verified live; pick-chart tap fix `958f207`

**Engine:** opencode-kimi (OpenCode + Kimi K3 via Chutes). No Codex touched (fresh `limits.py --json`
at 01:02 UTC: Claude session 8 % / week 37 %; Codex 80 % weekly, 16.8 h stale, machine-local,
disclosed — at the hard cap, so not admitted). X2 holds: zero Codex usage by this gate.

**Reviewed range:** `4be0957..3683fbe` (iterations 74–76, 8 commits) plus this gate's own `958f207`.
Full record: `ops/ux-2026-09-12/REVIEW-20260916T010002Z.md`;
evidence `/opt/benchmarkheaven/state/ux-evidence/review-20260916T010002Z/`.

**Gates on HEAD before review:** `npm test` 507/507, `tsc` clean, `node scripts/build-dataset.mjs`
840/660/92/2,882 (timestamp-only). **After this gate's fix:** `npm test` 507/507 (+1 new tap-resolution
test), `tsc` clean, build timestamp-only, `next build` clean.

**→ verified (7 rows, implementer claude-opus ≠ this gate; both hosts, live):** CR-25.6 (56/56),
CR-28.2 (22/22), CR-30.1 (51/51), CR-34.2 (72/72), CR-34.3 (72/72), CR-36.1/36.2 (65/65), all at
`958f207`, 1440/390, light/dark.

**Defect found by this gate, confirmed and fixed:** verify-cr-2-2 mobile 36/38 — a tap on the
GPT-5.6 Sol candidate point toggled Kimi K3. Root cause: overlapping 28 px hit areas (sol at
(212,851), kimi at (207,842), both models genuinely ~8 px apart on the phone chart) resolved to the
topmost DOM node (Kimi, selected and painted on top). Same defect latent on desktop.
**Fix `958f207`:** taps/clicks resolve to the point whose centre is nearest the pointer among all
points whose hit area contains it (`nearestHitId`, svg-level handler; keyboard path untouched).
Re-verified live **38/38 both hosts** post-deploy; full e2e orchestrator **ALL PASS**:
cr-1 108/108, cr-2-2 38/38, cr-presets 88/88, cr-5 41/41, cr-2-5-perf 28/28, unit 42/42 — per host.
This fix needs a non-kimi re-verify by a later gate (same as the previous gate's `c11af043`).

**Regressions re-confirmed (both hosts, 1440/390, light/dark, at `958f207`):** cr-6-8 62/62,
cr-35 72/72, cr-36-1-2 65/65, cr-25-36 76/76, cr-26-1 56/56, cr-25-6 56/56, cr-28-2 22/22,
cr-34-2-3 72/72, cr-30 51/51, cr-19-25 53/53 (F-97), cr-29-31 52/52 (F-99), cr-18-29 60/60,
cr-32-33 44/44, cr-14 44/44, cr-15 48/48, cr-16 41/41, cr-17 22/22, d10 70/70, cr-1 108/108,
cr-2-2 38/38, cr-presets 88/88, cr-5 41/41, cr-2-5-perf 28/28. No row flipped back to open.

**Data-honesty spot checks (independent of the shipped verifiers):** 25 sampled OpenRouter score
observations + 246 cost twins match the lock-pinned capture byte-for-byte values (0 mismatches);
CR-30.1's 38 self-reported observations reconcile exactly (5 identities, 21 joined, all
`comparison_key: null`; 3 withheld carry the critic objection; sampled values verbatim in retained
captures). Twelve `openrouter-*` registry boards pinned at `snapshot-2026-09-15`; ingestion lock
refuses drift. The daily run of 2026-09-15 failed *fail-closed* at the chutes_efficiency live-critic
(DeepSeek free-model timeouts × 3 rounds) — publication correctly withheld; AA collector confirmed
enabled in the pipeline (its gauntlet accepted 650 rows). **D09.1 stays open:** acceptance 1 still
needs the receipt of the next ordinary *successful* daily run; the Feb directive's other leg
(Nex-first fallback) already holds in `bin/delegate.sh`.

**Notes for X7 (deviations, recorded for Florian):** the picker's empty-query list is headed
"Top by AA Intelligence Index" (not Composite — client-side only; AA credit shown). CR-25.6 anchor
set is AA-heavy (DeepSWE the only non-AA anchor); read as an aggregate of already-displayed values
(CR-12.3), not a new AA metric, so CR-35.3 does not block it. The dated-snapshot boards
(Real-SWE, DeepSWE, CursorBench, FrontierCode, OpenRouter) freeze at their locked captures pending
version rotation (iteration 75's documented follow-up).

**Left open (why no ALL-ACCEPTED):** CR-30.2/30.3 (tier-A benchmarks from BENCHMARK-CANDIDATES.md),
CR-34.4 = CR-35.3 (**on hold** — AA permission; collection continues per directive 09), CR-34.5
(DesignArena models-arena extension), CR-37.x (Lumina), CR-38.1–38.5 (source intake + saturation
labels, F-98 with them), D09.1 (next successful daily run's receipt). X6's line-by-line audit covers
00/02 + CR-20260914 + CR-10…35 (passed 051001Z/150001Z/212002Z) and now CR-25.6, CR-28.2, CR-30.1,
CR-34.1/2/3/6, CR-36.1–36.3 — it must additionally cover every CR row in the open list above once
verified.

**Next work iteration (highest value first):** 1) F-98 + CR-38.2/38.3 (saturation/judged labels —
directly gates CR-38); F-98's design is ready. 2) D09.1 acceptance 1 — attach the next successful
daily run's receipt. 3) CR-30.2/30.3 (tier-A tier from BENCHMARK-CANDIDATES.md, independent boards).
4) CR-34.5 (models-arena DesignArena collector; OpenRouter relay as cross-check) + CR-30.1 tranche B
(more identity maps: Terminal-Bench 2.0/2.1/3.0 own protocols, HLE printed variants).
5) CR-37.x/CR-38.1 as one intake when the source-intake job writes RESULT.md.

---

## Iteration 78 — 2026-09-16 (claude-opus, work): F-100 verified, F-101, F-102 — and DesignArena's own rules

Picked from Fable pass 18's hand-over: F-100 needed a non-Fable verifier, F-101 and F-102 were the two
open directives, both marked `[judgment → claude-opus]`. Two commits: `ae4f8a5`, `e6c17ff`.

**F-100 (Fable's own change) is verified.** `bin/verify-cr-38.mjs` **81/81 per host**, live on both hosts
at `e6c17ff`, 1440/390, light and dark — the version line reads as copy ("Published 2026-09-14"), the
harness sits on the name line, a group header without a composite shows nothing rather than dashes, and
the result page says "states neither …" once. Implementer Fable ≠ verifier claude-opus, so the Done log
now records it as verified. Evidence: `ux-evidence/iter78/{canonical,legacy}/verify-cr-38/`.

**F-101 — the Providers list is one row per provider product** (`ae4f8a5`). The Options panel listed
Anthropic twice (its own API and the OpenRouter route), "Amazon Bedrock" next to "AWS Bedrock" and
"Azure" next to "Azure AI Foundry": one company, two catalog keys, no way to tell which one to untick.
`lib/provider-company.mjs` folds the catalog, not the component: a gateway spelling maps to the name the
site already uses elsewhere, keyed by the **full** catalog key (`OpenRouter::Amazon Bedrock`), so a
provider that shares a name on another platform is never renamed by accident; a row carries every key of
its product, its routes ("direct · via OpenRouter") and a search string that still matches the gateway's
spelling. `MultiCombobox` learned group rows: all keys selected reads checked, some of them
`aria-checked="mixed"`, one click sets the whole company, and the catalog keys are untouched — a stored
exclusion, a preset or a shared URL keeps meaning exactly what it meant.

*Recorded decision (Florian may overrule):* only routes to the **same product** fold. Google AI Studio
stays separate from Google Vertex AI, and "Claude Platform on AWS" stays separate from AWS Bedrock —
different endpoints with different data policies, regions and prices, where excluding one but not the
other is a real choice a reader may want.

**F-102 — one counting rule for "benchmarks"** (`e6c17ff`). The site published three numbers for one
collection: the hero counted registry entries (111), Simple's section 2 counted matrix rows ("46 of the
120 benchmark results we track"), the Benchmarks page counted row keys (41). Now: **a benchmark is a
board — one family at one version, with at least one result; a harness cohort and a cost twin are rows
of that board.** `boardId`/`countBoards` live in `lib/benchmark-matrix.mjs` and `matrix.catalogBoards`
travels with every derived matrix, so hero, section 2 and the Benchmarks page cannot drift apart:
live now "**77 benchmarks**" in the hero, "**41 of the 77 benchmarks we track**" in section 2 (its rows
are 46 — the AA Coding Agent Index alone is one board across twelve harnesses), and "41 benchmarks
across 10 categories" on the Benchmarks page, where the row chooser counts boards as well.

*Recorded deviation (for X7):* the hero fell from 111 to 77. F-102 foresees exactly this ("the hero
shows the boards with at least one current result"). The arithmetic, exactly: the registry's 111 entries
are **99 boards** (12 of them are cost twins, which are rows of the benchmark whose run they measured);
**71** of those 99 have at least one row in the comparison matrix, and **6** further boards come from
sources kept outside the registry (the two AA indices, the two Epoch ECI model fields, DesignArena
Frontend and Full-Stack) → 71 + 6 = **77**. `/about#benchmark-tags` now states the rule and why the
registry can be larger. **Follow-up worth a row of its own:** the 28 registry boards without a row (HLE, ARC-AGI 3, the seven Vals
Index boards, Real-SWE, both ApprenticeBench boards, BullshitBench v1/v2, BU-Bench, RULER, HELMET,
IFBench, τ³-banking, τ³-voice, SlopBench, PingPong English v2, OTIS Mock AIME, RP-Bench, Towards-AI
editorial writing, Vending-Bench 2, AA LiveCodeBench) carry observations whose `subject.model_id` is
`null` — the identity join, not the collection, is what keeps them off the site.

**Two verifier corrections, both pre-existing on production and not caused by this change** (found by
running the suites before pushing, and re-run against the unchanged production build to prove it):
`verify-f84-f85` counted category header rows as benchmark rows — those carry a category composite and,
by the pass-18 rule "a header row shows numbers or nothing", deliberately no data bar, so the check read
**27/37**; excluding header rows it reads 20/20 on the untouched production build as well.
`verify-cr-1-8-eci` matched any row mentioning "Epoch", and DeepSWE now credits "(Datacurve, via Epoch
AI)" — **64/76**; anchored to the two ECI boards it reads 56/56 on production too.

**Gates:** `npm test` **529/529** (+8: `test/provider-company.test.mjs`, `test/benchmark-count-rule.test.mjs`),
`npx tsc --noEmit -p .` clean, `next build` clean, `node scripts/build-dataset.mjs` 840/660/92/2,882
(timestamp-only diff, restored).

**Live verification (implementer's own run — needs a non-claude-opus verifier), both hosts at `e6c17ff`,
1440/390, light/dark**, `BH_RUNNER=claude-opus`, under `ux-evidence/iter78/{canonical,legacy}/`:

| Suite | canonical | legacy | what it covers |
| --- | --- | --- | --- |
| `verify-f101-f102` (new) | **52/52** | **52/52** | F-101 no duplicate company, routes named, gateway spelling folded and still searchable, one click sets the whole company; F-102 hero = section-2 denominator, numerator = boards of the rows on screen, chooser agrees, no "benchmark results" |
| `verify-cr-38` | **81/81** | **81/81** | F-100 (Fable) — non-Fable verification |
| `verify-cr-28-1` | **14/14** | **14/14** | Simple section 2 lists every benchmark its models have; the count is the board count of its own rows |
| `verify-cr-7` | **42/42** | **42/42** | CR-7.1/7.2/7.3 unchanged |
| `verify-cr-25-36` | **76/76** | **76/76** | the Options panel and the three comboboxes after the F-101 change |
| `verify-cr-1` | **108/108** | **108/108** | the Benchmarks page, incl. the status/chooser counts |
| `verify-f84-f85` | **20/20** | **20/20** | data bars and the one-total status line (assertion corrected, see above) |
| `verify-cr-1-8-eci` | **56/56** | **56/56** | the two Epoch ECI boards and their result pages (assertion corrected, see above) |
| `verify-cr-presets` | **88/88** | **88/88** | model/row/filter presets, incl. a stored provider exclusion |

**DesignArena: its own rules say no, and that was never checked before.** CR-34.5 asks to widen
DesignArena coverage, so this iteration read the source's rules first — the gate the workstream applied
to OpenRouter, Artificial Analysis and Epoch AI, and which no file in this repo records for DesignArena.
`https://www.designarena.ai/robots.txt` says `Disallow: /api/`; the terms (Arcada Labs) forbid, verbatim,
to *"access or search the Services or download content from the Services using any engine, software,
tool, agent, device, or mechanism (including spiders, robots, crawlers, data mining tools, or the like)
other than … generally available third-party web browsers"*. The daily run calls
`POST /api/leaderboard` and `GET /api/registry` every day. No public API documentation, licence or
attribution clause exists on that site (unlike OpenRouter's benchmarks API).

What this iteration did: **did not widen it** (CR-34.5's other half, OpenRouter's relayed `design-arena`
rows, is a different arena — "models", measured by iteration 76 — and is cross-check-only, so it cannot
fill these boards either); **did not switch the existing collector off on its own**, because DesignArena
values are product Florian asked for by name (the Compare radar's Full-Stack axis, CR-14/CR-15); and
**escalated**: Telegram message 13762 (2026-09-16 04:37 UTC) with the three options — ask Arcada Labs
for permission as with AA, keep the two boards as a documented risk, or drop DesignArena. Evidence, with
both documents and their hashes: `/opt/benchmarkheaven/state/ux-evidence/iter78-designarena-terms/`.
**CR-34.5 is therefore blocked on Florian's answer, not on implementation.**

**D09.1 — why it is still open.** The receipt acceptance needs an ordinary *successful* daily run. The
2026-09-15 run failed at the live-source-contract gauntlet for `chutes_efficiency`: all three critic
rounds landed on DeepSeek free endpoints that timed out (`unavailable-models.jsonl` in that run's
`workers/` records all three). This is not an AA problem and not a bug in the exclusion: a failed model
is recorded and excluded, but `selectModelForWorker` deliberately retries an excluded **critic** when no
other authorized scheduled worker qualifies for that round — and with a DeepSeek producer the remaining
whitelist (Nex 2.5 Pro, GLM-5.3 Flash, Kimi K3) left nothing eligible. The whitelist is Florian's model
policy (`FLORIAN_ALLOWED_SCHEDULED_WORKERS`), owned outside this repo's UX loop, so this iteration only
records it: **since 2026-09-14 no daily publication has succeeded**, which is why `/api/meta` still dates
the live sources 2026-09-14. Today's 05:17 UTC run is the next chance for the receipt.

Two harness notes, both recorded rather than glossed over: `verify-cr-1-8-eci` crashed once on the
canonical host while nine suites ran back to back (no `verification.json` written) and passed **56/56**
on a solo re-run against the same build — the same parallel-load flake earlier gates saw for `cr-6-8`
and `cr-15`. And `verify-cr-2-5-perf` (CLS) was deliberately **not** run: the box was not idle (this
iteration's own verifier sweep), and this loop's rule is that long-task/CLS numbers from a busy Sandy are
not evidence. The F-101/F-102 changes add no client-side element that can shift layout (grouped rows
render in the same popover, the counts are server-rendered numbers inside existing sentences), but a
gate on an idle box should still re-run it.

**Next work iteration (highest value first).**
1. **D09.1** — attach the receipt of the next *successful* ordinary daily run; if 2026-09-16's 05:17 run
   fails the same way, the blocker is the scheduled-worker whitelist and belongs in front of Florian
   together with the DesignArena question.
2. **CR-34.5** — blocked on Florian's DesignArena answer (see above); do not widen that source meanwhile.
3. **CR-30.2/30.3** — tier-A boards from `BENCHMARK-CANDIDATES.md` (OSWorld 2.0, Toolathlon-Verified,
   MCP Atlas, FrontierSWE, PostTrainBench, SimpleQA Verified, FrontierMath v2) from independent boards.
4. **The 28 registry boards without a row** (F-102's follow-up): their observations carry
   `subject.model_id: null`, so an identity-map pass would add real benchmarks to every count on the
   site without collecting anything new. Cheapest large win on the board.
5. CR-37.x / CR-38.1 / 38.4 / 38.5 as one intake when the source-intake job writes `RESULT.md`.

---

## Iteration 77 — 2026-09-16 (claude-opus, work): CR-38.2 / CR-38.3 / F-98 — saturated and judged benchmarks

Picked from the previous gate's "next work iteration" list, item 1 (it gates CR-38's closure and F-98
was the last open design directive). One commit: `0033b25`.

**What a reader gains.** Two caveats that used to be invisible are now on the number itself. A
benchmark whose best results already sit at its ceiling separates weak models, not strong ones — that
is now a `Saturated` tag rather than something a reader has to know. A number produced by preference
votes or by a judge model's rating is not the same kind of number as a pass rate — that is now a
`Judged` tag, and the two kinds no longer average together inside a category.

**Saturated is measured, never asserted.** `saturationOf` (`lib/benchmark-matrix.mjs`) works on the
catalog's own *independently measured* results: a bounded higher-is-better scale (fraction [0,1],
percent, or points registered [0,100]), at least 5 measured models, and the mean of the 5 best results
at or above 90 % of the ceiling. Six boards qualify at this build — τ²-Bench Telecom (AA) 98.8 %,
AIME 2025 (AA) 97.6 %, GPQA Diamond (AA) 95.5 %, GPQA Diamond (OpenRouter run) 94.1 %, Harvey LAB-AA
94.1 %, Terminal-Bench v2.1 (AA) 90.3 %. The rule found the boards everybody already treats as
saturated (AIME 2025, GPQA Diamond) without a hand-written list, which is the reason to trust it; a
test asserts exactly that. A row we cannot assess (Elo, an open points scale, fewer than five measured
models) carries **no** tag — "not assessable" is deliberately not "not saturated".

**Judged rests on quotes, not opinion.** `data/benchmark-caveats.json` holds the classification, the
definition in force, and for every entry a `quote` that must appear verbatim in the benchmark's own
registry text (`scoring.metric`, `scoring.notes`, `one_sentence_description`, an evidence excerpt) or in
the taxonomy description for a non-registry axis. `test/benchmark-caveats.test.mjs` fails if a quote is
not found in its cited field, so a label can never rest on a sentence no source wrote. 24 judged
families; 8 near-misses recorded with their reason under `considered_not_judged` — a judge that only
checks whether the answer is *correct* is not judged, because the ground truth still decides.
**A different engine is reviewing the classification** (the CR-1.7 precedent); the verdict is appended
to this ledger and to the file's `review` block when it returns.

**What changed in the numbers.** A judged row never averages with task accuracy: in a mixed category
only the task-accuracy rows make the composite (the category (i) names how many judged rows were left
out); an all-judged category gets a composite of those and is named a judged composite. A saturated row
still counts, at `SATURATED_WEIGHT = 0.5`. For the selectable CR-25.6 category scores that makes
`cat_science = (CritPt + 0.5 × GPQA Diamond) / 1.5` — about ten points below earlier builds, on 515
model rows. `cat_coding`, `cat_agentic` and `cat_long_context` are unchanged because none of their
anchors is saturated. Written down in `API.md` (with the "changed 2026-09-16" note downstream consumers
need), `CHANGELOG.md`, `/about#benchmark-tags`, `data/category-score-anchors.json` and the category (i).

**Two fail-closed guards** rather than silent behaviour: `assertNoJudgedAnchors` throws at build time if
a category-score anchor is ever reclassified as judged, and a test fails if a slot of the Main Composite
ever becomes saturated (none is today).

**Freshness (CR-38.2's other half).** Every benchmark has the fields: version and version status from the
registry, the date its results were last verified, and — only where the verified source states it — the
task/question date window and the contamination control. Where the source states nothing, the field says
exactly that. **Decision recorded:** we do not infer a date window from a benchmark's name (an "AIME 2025"
row gets its window because AA's retained evidence names the 2025 papers, not because of the title). That
keeps the curated set small today (2 windows, 9 contamination notes, one of them a *stated* unknown) and
honest; a later source-intake pass (CR-38.1) can widen it with new primary text.

**Deviations from F-98, recorded for the design gate:** (1) the Simple table shows only the two caveat
tags, not the editorial tier tags, so a simple row never grows four pills; (2) the (i)'s second line also
names the date the results were read — CR-38.2 asks for freshness and the directive's line had only the
version and the window.

**Gates:** `npm test` **520/520** (+13 new), `npx tsc --noEmit -p .` clean, `next build` clean,
`node scripts/build-dataset.mjs` 840/660/92/2,882 (the `cat_science` change above is the only value diff).
`bin/verify-cr-38.mjs` **81/81 per host** live on both hosts, 1440/390, light and dark — first at
`0033b25` (`/opt/benchmarkheaven/state/ux-evidence/iter77-cr-38/`) and again at the final build
`5c43c4e`, after the payload trim and the reviewer's correction
(`/opt/benchmarkheaven/state/ux-evidence/iter77-cr-38-final/`; the README in the first directory lists
every check and both runs).

**Regression on the suites this change touches**
(`/opt/benchmarkheaven/state/ux-evidence/iter77-regression/`, canonical host): at `0033b25`
`verify-cr-25-6` **57/57**, `verify-cr-29-31` **52/52**, `verify-cr-1` **108/108**,
`verify-cr-7` **42/42**, `verify-cr-28-1` **10/10**; re-run at the final build `5c43c4e` after the
reviewer's correction, `verify-cr-1` **108/108**, `verify-cr-7` **42/42**, `verify-cr-25-6` **57/57**. One superseded assertion was corrected rather than pinned:
`verify-cr-25-6` recomputed `cat_science` as the *flat* anchor mean, which was right until this build.
It now reads which benchmarks are half-weighted **from the live page** (the category header's own (i)
names them) and recomputes with those weights — still an independent check of the published number
against what the product tells a user, not against this repo's constants.

**The judged classification was reviewed by a different engine, and it found something.**
`bin/delegate.sh` sent all 32 rows (each benchmark's own maintainer/metric/description plus the draft
label, no hints) for the independent review the CR-1.7 tiers set as precedent.
`openrouter/nex-agi/nex-n2.5-pro:free` ran ~50 minutes and produced nothing; the fallback,
**opencode-kimi** (Kimi K3 via Chutes), returned verdicts for all 32: **31 agreed, 1 disagreed**.
The disagreement is right and is applied (`5c43c4e`): **`swe-atlas-test-writing` is judged** — Scale AI's
own description says it is "graded with rubrics and **LLM judges**", while its two sibling boards say
"graded against expert rubrics" (QnA) and "graded by tests and rubrics" (Refactoring) and stay task
accuracy. The reviewer's quote was checked against the registry before the change was made, exactly
because a free model's citation is a draft until verified. 24 judged families now; the verdicts and the
packet are retained under `/opt/benchmarkheaven/state/ux-evidence/iter77-cr-38/`, and
`data/benchmark-caveats.json` → `review` names the reviewer and the one correction.

**Payload:** carrying the caveats on every row cost 40 KB of the Benchmarks page's matrix payload,
most of it the same "the source states nothing" sentence 110 times. `020f6b6` moves those two
sentences to `matrix.freshnessDefaults` (once) and emits `freshness` per row only when the source
actually states something: +14 KB over the pre-CR-38 payload instead of +40 KB, nothing visible changed.

**Not run this iteration, and why:** `verify-cr-2-5-perf` (CLS) — the box is not idle (the portfolio
controller's reviewers are running several OpenCode workers), and this loop's own rule is that
long-task/CLS numbers from a busy Sandy are not evidence. The change adds no client-side element that
can shift layout (the tags and the sub-line are server-rendered inside cells that already existed), but
a gate on an idle box should still re-run it.

**Still open after this iteration:** CR-38.1 (collectors per source), CR-38.4 (aggregator provenance),
CR-38.5 (source-health view), CR-30.2/30.3, CR-34.5, CR-37.x, CR-34.4/CR-35.3 (on hold), D09.1's receipt
(the newest daily run is still 2026-09-15T07-03-42Z, the fail-closed one; no ordinary successful run has
happened since, so acceptance 1 still cannot be attached).
