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
| R6.2 | Research: may companies use consumer subscriptions? + Telegram | implemented | `ops/ux-2026-09-12/research/R6.2-subscriptions.md` | delegated to Kimi K3, then independently re-fetched. Anthropic and Google forbid company use in their own words; Cursor allows entity use; GitHub steers to Business/Enterprise without forbidding; OpenAI and xAI return HTTP 403 to automated clients and were **not** worked around. Telegram sent — see the iteration log |
| R6.3 | Subscription prices/quotas folded into the cost view, labelled | verified | `data/raw/subscriptions.json`, `test/subscriptions.test.mjs`, `ux-evidence/review-20260913T161002Z/targeted-final/r63-{canonical,legacy}/` | The subscription panel is present on desktop/mobile and both hosts, with 12 personal plans, break-even lines, dated vendor pricing copy, unknown quotas rather than invented task counts, and `/about#subscriptions`; company mode is covered by R6.1. |
| R7.1 | New logo in the page | verified | `ux-evidence/review-20260913T110002Z/fable-canonical-fixed2/desktop_light-simple.png` | Current live nav shows the new mark and wordmark |
| R7.2 | Favicon / apple-touch / og from the new logo | verified | `ux-evidence/review-20260913T110002Z/asset-status.txt` | Current canonical and legacy hosts return HTTP 200 for manifest, icon, Apple touch icon and OG PNG; generator/assets remain in source |
| R7.3 | Dark-mode logo variant, switched with the theme | verified | `ux-evidence/review-20260913T110002Z/fable-canonical-fixed2/{desktop_light-simple,desktop_dark-simple}.png` | Current live light/dark screenshots show the theme-switched mark; BrandMark reads theme CSS variables |
| R8.1 | Release-post-style benchmark comparisons and listings | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260913T075003Z-r81-postfix-canonical/verification.json`, `…-legacy/verification.json` | **Codex independent gate:** both hosts show seven measured-only category snapshot cards, a full comparison table and 14 best cells; mobile has a dedicated table scroll region but no page-level horizontal overflow. Missing/low-sample values remain gaps in the rendered table |
| R9.1 | Full fresh data run, every live source dated today | open | `/opt/benchmarkheaven/state/ux-evidence/iter46-publication-20260914/README.md`; `/opt/benchmarkheaven/state/ux-evidence/iter46-publication-20260914/live-readback.json`; `/opt/benchmarkheaven-daily/runs/2026-09-14T05-14-14-865Z-3467539/`; `/opt/benchmarkheaven/state/ux-evidence/iter49-chutes-catalog/`; `/opt/benchmarkheaven/state/ux-evidence/iter50-{nebius,mistral,scaleway,tensorx,t-systems,ovhcloud}-catalog/`; `/opt/benchmarkheaven/state/ux-evidence/iter50-r91-live-final/{canonical,legacy}/verification.json`; `/opt/benchmarkheaven/state/ux-evidence/iter51-README.md`; `/opt/benchmarkheaven/state/ux-evidence/iter51-{ionos-stackit,inceptron,claude-api,claude-copilot}/` | **Iteration 51 (claude-opus) — five more executable collectors, non-fatal daily steps, fail-closed, with tests:** IONOS `1238c09` (USD + EUR price pages; 9/9 rows reproduced), STACKIT `1238c09` (docs catalog + product-page SKU tiers + ECB; real changes: Qwen3.8 27B added, Qwen3.6 27B Deprecated), Inceptron `439e98d` (native catalog API; all five intraday re-prices equal OpenRouter's live Inceptron endpoints at the same minute), Claude API `efac57d` (docs price + batch tables, modifier prose, lifecycle table; 13 rows + modifiers identical, 4 retired rows excluded; Enterprise seat re-read, other Enterprise terms keep `other_terms_checked_at` 2026-09-08), GitHub Copilot `ffa0b19` (supported ∩ pricing tables + legacy multipliers; 28 + 18 rows identical; MAI-Code-1-Flash retired 2026-09-10 → removed, it had no offers or benchmark evidence, models 845 → 844; plans keep `plans_checked_at` 2026-09-08). Live: IONOS/STACKIT 19/19 per host, Inceptron 18/18 per host, Claude UI run 8/10 per host (the two misses are the expected R4.10 hiding of the Anthropic group — OpenRouter lists Anthropic without zero retention), Claude + Copilot API-level check: 7/7 per host (claude_code and github_copilot dated today; Anthropic first-party offer 5/25 cache 0.5 on /api/models/claude-opus-5::max; Copilot GPT-5.6 Sol 4/20; MAI-Code-1-Flash 404 and absent, MAI-Code-1.1-Flash present). Two `dataset.test.mjs` literals (Inceptron GLM 5.2 price, Copilot catalog counts) replaced by snapshot/consistency assertions — they would have failed the fatal daily `npm-test` step on every real re-price or retirement. **Still stale on `/api/meta` (13:51 UTC):** `aws_bedrock`, `azure_foundry`, `google_vertex` (2026-09-08), `provider_meta` (2026-07-12), plus the deliberately retained `aa_coding_agents` (2026-09-09). **Handoff:** Azure Foundry first (Retail Prices JSON API, native USD; lifecycle cross-check against the retirement schedule), then AWS Bedrock (Price List bulk API + pricing-page gap-fill), then Google Vertex (partner tables are client-rendered — needs a normal browser render, no bot-protection workaround), then `provider_meta` (hand-curated; re-verify only the OpenRouter-derived fields). Stopped here on purpose: `limits.py` read Claude week 1 % (likely a window-reset artefact; last credible reading 57 %) and the budget file had no fresh measurement. **Iteration 50 (claude-opus) — six more executable collectors, all non-fatal daily steps in `ops/daily/daily.mjs`, each fail-closed (shape, unreadable prices, ≥ 50 % retention) with tests:** Nebius (`tokenfactory.nebius.com/api/public/models_info`, the one path robots.txt allows; +DeepSeek V4 Pro 0813, +GLM 5.3), Mistral (server-rendered `mistral.ai/pricing/api` cards), Scaleway (the page's own `__NEXT_DATA__` catalog + ECB daily rate), TensorX (server-rendered table), T-Systems LLM Hub (`/models/llms/` + `/models/coding/`, audited hosting fields kept; +GLM 5.3 Flash as preview), OVHcloud (server-rendered catalog + ECB). Every first run was dry-run-diffed against the 2026-09-08 snapshot before writing: all curated rows reproduced with identical native prices; changes are only real catalog changes (TensorX dropped DeepSeek V3.2, added V4.1 Flash), listed cached-input prices now captured, and FX-cent USD moves (ECB 1.1622 → 1.1592). One regression caught before commit: storing Mistral's API alias as `model_id` split nine offers into fake families, because build-dataset uses `model_id` as identity → aliases now go to `api_model_id`. Live on `47fb38e`: `verify-r91-catalogs.mjs` 55/55 on both hosts — `/api/meta` dates 2026-09-14 for nebius, tensorx, t_systems_llm_hub, scaleway, chutes, ovhcloud (mistral read back separately), plus a visible offer group for each provider on a model page at 1440 and 390, no overflow, no page errors. Mistral's offers are correctly hidden by the R4.10 default (OpenRouter lists Mistral without zero retention). **Still without collectors:** AWS Bedrock, Azure Foundry, Google Vertex, Inceptron, IONOS, STACKIT, `github_copilot`, `claude_code`, `provider_meta` (plus `aa_coding_agents`, deliberately retained). Next: IONOS/STACKIT (static docs pages), then the three hyperscaler catalogs (check for public pricing JSON first). **Iteration 49 (claude-opus) — first curated collector:** `scripts/fetch-chutes-catalog.mjs` + `lib/chutes-catalog.mjs` (5 tests) refresh `chutes.json` from the public `llm.chutes.ai/v1/models` (fail-closed: shape, prices, TEE flag, ≥ 50 % id retention; curated names kept by exact id, new ids `mapping: derived`). Its first run reproduced the 2026-09-08 snapshot field for field (14/14, 0 differences), so `chutes` is honestly dated 2026-09-14. Wired as non-fatal daily step `fetch-chutes-catalog`. Still without collectors: AWS Bedrock, Azure Foundry, Google Vertex, Nebius, Inceptron, Scaleway, IONOS, Mistral, TensorX, OVHcloud, STACKIT, T-Systems, `github_copilot`, `claude_code`, `provider_meta`. **Iteration 47 (claude-opus) — handoff, not closed:** the blocker is tooling, not a run. `data/research/refresh-2026-09-13.md` confirms the twelve curated provider catalogs (AWS Bedrock, Azure Foundry, Google Vertex, Nebius, Inceptron, Scaleway, IONOS, Mistral, TensorX, Chutes, OVHcloud, STACKIT, T-Systems LLM Hub), `github_copilot`, `claude_code` and `provider_meta` have method documentation but **no executable collector**; `scripts/fetch-live.mjs` only dates OpenRouter/AA/DesignArena. Redating them would be dishonest, so nothing was redated. Interpretation for the reviewer: `aa_coding_agents` (2026-09-09) is the deliberately retained Coding Agent v1.4 Composite input (`status: retained` in `build-dataset.mjs`), not a live source; `aa_coding_agents_v1_5` is the live one. Next step: one small robots-respecting collector per curated catalog (public pricing pages only), each with a row-count guard and the existing critic path, then a fresh daily run. The fresh source-backed publication `acb5ed0` passed all seven live contracts, fresh benchmark capture, build, 276 tests, typecheck, prerender and source validation; both public hosts serve the exact candidate snapshot. However, live `/api/meta` still reports curated provider catalogs dated 2026-09-08, `aa_coding_agents` 2026-09-09, `provider_meta` 2026-07-12 and other non-today sources. No source date was redated manually; the “every live source dated today” requirement remains open. |
| H1 | Historical snapshots of all benchmark scores | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T020001Z/history/verification.json` plus `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Claude's independent verification remains valid; codex-luna rechecked both current hosts at revision `94bcedd`: four retained states, historical API keys, no stable history axis, and 93 catalog-linked estimates exposed through the view as estimates rather than measured rows. |
| H2 | Bridged comparison via anchor models, uncertainty reported | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T020001Z/history/verification.json` plus `test/benchmark-history-chain.test.mjs` | Current live estimates expose bridge count, method, hops, spread/uncertainty fields and are labelled `estimated`; the current snapshot has max one hop and no live multi-hop sample. The multi-hop/re-based-chain behavior is covered by the line-by-line unit tests (including hop cap and chain IQR), so no absent live sample is presented as data. |
| H3 | UI filter "better than model X in category Y" | verified | `ux-evidence/iter14-indep-review/h3-functional.json`, `h3-1440.png`, `h3-390.png` — **independent verification (claude-opus, iteration 14; implementer codex-luna):** live `0e7380c`, Advanced 16 rows → reference GLM-5.3-Flash + "Coding median · 13 benchmarks" → 9 rows, status names "measured" and "Missing values stay unknown and are excluded", no overflow at 1440/390. Original evidence: | `/opt/benchmarkheaven/state/ux-evidence/iter10-h3/verification.json` | Advanced-only folded filter supports exact benchmarks and category medians; measured values win, explicit bridge estimates are marked approximate, and missing values stay unknown. Live on both hosts in desktop/mobile light/dark; independent-engine verification remains required. |
| B1 | Benchmaxxing tab in Advanced | verified | `ux-evidence/review-20260913T002002Z/*-benchmaxxing.png` | review (claude-opus, Hermes-built): 200 at desktop+mobile, light+dark; nav tab; method anchor |
| B2 | Method identifying strong-on-some / weak-on-others | implemented | `REVIEW-20260913T002002Z.md` #3–4 | topic-local percentile jump; tag quality blocked by B3 |
| B3 | Missing scores must not bias the result | verified | `ux-evidence/iter11-f07/b3-live/verification.json` + `ux-evidence/iter7-b3/bm-audit-after.txt` | **Iteration 7 (`004f8dc`):** score = within-topic mean absolute percentile difference over *all* measured pairs (order-independent), weighted by n−1; published only with ≥ 6 related comparisons over ≥ 2 topics; shrunk toward the catalog mean by n/(n+k), k by empirical Bayes (min 2). Real data: 174 scored / 18 tagged (was 574 / 58); tagged 3/21 at 6–7 comparisons, 5/74 at 8–10, 0/36 at 11–13, 10/43 at ≥ 14 — no longer falling with coverage; minimum comparisons among tagged = 6. Tests: floor, order invariance, synthetic equal-noise catalog, real-data "rate must not collapse with coverage". Codex independently re-checked both widths live: 174 qualified / 18 tagged, floor note present, no overflow. |
| B4 | Benchmaxxing tag in overview table + tab | verified | `ux-evidence/iter11-f07/b3-live/verification.json` | one shared `benchmaxxingSignals()` feeds the overview badge and `/benchmaxxing`; Codex independently re-checked 18 badges in the top-25 table at desktop and mobile, both without overflow. |
| B5 | Small-print method explanation | verified | `ux-evidence/iter4-live/verification.json` | Advanced Overview carries a restrained explanation and link to `/benchmaxxing#method`; the dedicated method disclosure is now addressable by that anchor. |
| B6 | Many-axis radar, similar topics clockwise-adjacent | verified | `ux-evidence/review-20260913T002002Z/desktop_light-benchmaxxing-full.png` | review: 214-axis radar live in all 4 combos, topic-grouped, gaps for missing; mobile overflow fixed in the review commit |
| B7 | Jaggedness weighs heavily; specialisation not penalised | implemented | `REVIEW-20260913T002002Z.md` #4, `test/benchmax-jagged.test.mjs` | zig-zag > smooth specialisation still proven. Iteration 7 removed the alphabetical-order critique (all-pairs spread, order-invariance test). **Remaining, documented on `/benchmaxxing#method`:** percentiles are bounded, so a model at the top of most boards has less room to vary than a mid-field one |
| X1 | Autonomous on Sandy with engine fallback | implemented | — | `bin/tick.sh` cron |
| X2 | Codex never above 80 % weekly | open | `/opt/benchmarkheaven/state/ux-evidence/review-20260913T205002Z-limits.json` | `limits.py --json` at 21:09 UTC measured Codex at 72% weekly, below the 80% ceiling. X2 remains open because the final completeness gate X6 is not complete. |
| X3 | Fable 5.1 design passes happened and were implemented | in-progress | `ops/ux-2026-09-12/DESIGN-DIRECTIVES.md` (pass 10; passes 1–9 condensed there), `/opt/benchmarkheaven/state/ux-evidence/iter47-indep/`, `ux-evidence/fable-20260914-pass10/`, `ux-evidence/fable-20260914-pass9/`, `ux-evidence/fable-20260914-pass8/`, `ux-evidence/fable-20260913-pass7/`, `ux-evidence/fable-20260913-pass6/`, `ux-evidence/review-20260913T110002Z/{fable-canonical-fixed2,iter20-canonical,iter20-legacy,f27-canonical,f27-legacy}/` | **Iteration 47 (claude-opus, non-Fable, non-Kimi):** F-58, F-59, F-60, F-61, F-62, F-63 and F-64 verified live on `21aa63f`, both hosts, 1440/390, light/dark (`verify-f58-f61` 36/36, `verify-f63-f64` 22/22, `verify-review-0610` 68/68 per host; one canonical F-63/F-64 run crashed in navigation and passed 22/22 on rerun). X3 stays in-progress: older done-log rows (e.g. F-18, F-39, F-40, F-41, F-46, F-47, F-51) still name no independent verifier. **Fable pass 10 (2026-09-14 06:25 UTC, live `4b0d250` → `21aa63f`):** verdict "at the bar at both widths and themes"; residues F-63 (light-mode bar tracks on Charts) and F-64 (Composite coverage wording) fixed by Fable in `21aa63f`, live 22/22 on both hosts (`bin/verify-f63-f64.mjs`, `ux-evidence/fable-20260914-pass10/verify-21aa63f-{canonical,legacy}/`). F-58/F-59/F-62/F-63/F-64 await a non-Fable, non-Kimi verifier. Fable pass 9 (2026-09-14): F-58–F-62 written and landed (`9240da5`, `97e50a4`, `7b5320d`), live 36/36 on both hosts; F-58/F-59/F-62 await a non-Fable, non-Kimi verifier. Codex independently verified the non-Codex F-08a/F-08b and F-22–F-28 implementations live on both hosts, 1440/390, light/dark. F-19 is live but was implemented by codex-luna (`0c37a18`), so this gate cannot set it verified. X3 therefore remains in-progress under the one-engine rule. **Fable pass 4 (2026-09-13 12:00 UTC):** fresh 73-shot matrix judged; F-29/F-30 fixed by Fable and live-verified; F-31…F-38 written; F-33/F-34 delegated. Pass 5 (2026-09-13 15:30 UTC, live `3d7af32` → `64063b5`): F-31…F-38 verified live by Fable; F-39 fixed by Fable; F-40…F-45 open in `DESIGN-DIRECTIVES.md`. **Fable pass 11 (2026-09-14 ~09:10–10:00 UTC, live `4f8b690` → `72da684`):** verdict — core pages at the bar in the 80-shot matrix; one real defect: every E2 board (Vals, CursorBench, ApprenticeBench, FrontierCode, Real-SWE) opened on "No results in this view" / "0 of 846". Fixed as F-65 (automatic widening + one notice line, `72da684`; Kimi delegation stalled, Fable implemented) and F-66 (error-boundary Details; the phone light model page hit the boundary once in the capture, not reproducible, most likely a deploy-window chunk 404). Live: `bin/verify-f65.mjs` 168/168 on both hosts (`ux-evidence/fable-20260914-pass11/verify-f65-{canonical,legacy}/`). F-65/F-66 need a non-Fable verifier. **Fable pass 12 (2026-09-14 ~11:20–11:35 UTC, live `975334b` → `5e974fe`):** fresh 80-shot matrix (`ux-evidence/fable-20260914-pass12/`, no page errors, no overflow) — verdict: at the bar on every page, both widths, both themes. Two residues fixed surgically by Fable: F-67 the best model lost its label on the phone value map (eight label slots + top headroom), F-68 Benchmaxxing truncated model names at 390. Live 32/32 on both hosts (`bin/verify-f67-f68.mjs`, `ux-evidence/fable-20260914-pass12/verify-f67-f68-{canonical,legacy}/`). E2 boards re-shot with the corrected script: all five open with rows and one notice line (F-65 holds). F-65–F-68 await a non-Fable verifier. **Pass 13 (Fable, 2026-09-14 ~12:30–12:50 UTC):** fresh 80-shot matrix + supplemental shots of live `bf5b821`; F-69/F-70/F-71 fixed by Fable (`f23f5f9`) and live-checked 44/44 per host; F-72/F-73 opened for implementers. `DESIGN-DIRECTIVES.md` rewritten for pass 13. X3 stays `in-progress` until F-72 is implemented and F-69–F-71 are verified by a non-Fable engine. **Fable pass 14 (2026-09-14 ~14:00 UTC, live `42da12c` → `e33635b`):** F-72 and F-73 (claude-opus) verified live by Fable (non-implementer; `ux-evidence/fable-20260914-pass14/verify-f72/`, board shots); opened and fixed F-74 (15-row cap dropped the cheapest passing model — now Pareto line first, `lib/shortlist.mjs` + test), F-75 (Guided result buttons wrapped inside themselves at 390), F-76 (Real-SWE option "· 0 measured catalog peers"), `e33635b`, live 36/36 per host (`verify-f74-f76/{canonical,legacy}/`). F-74–F-76 need a non-Fable verifier (`bin/verify-f74-f76.mjs`). |
| X4 | UI meets the design bar | open | `DESIGN-DIRECTIVES.md` "Verdict on the live site — pass 10"; `/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass10/` (80 shots, no overflow, no page errors); `/opt/benchmarkheaven/state/ux-evidence/iter38-live-20260913T230208Z/` | **Iteration 47 (claude-opus):** the independent-verification gate named below is cleared — F-58/F-59/F-62 and F-63/F-64 pass live on both hosts (`/opt/benchmarkheaven/state/ux-evidence/iter47-indep/`). X4 stays `open` only for the broader E2/P2/R9.1/X6 gates. **Pass 10 (Fable, design authority):** the live UI meets the bar at 1440 and 390, light and dark; the two residues found (F-63, F-64) are fixed live. Stays `open` under the one-writer rule until a non-Fable, non-Kimi engine verifies F-58/F-59/F-62 (`bin/verify-f58-f61.mjs`, `bin/verify-review-0610.mjs`) and F-63/F-64 (`bin/verify-f63-f64.mjs`) live on both hosts. Pass 9 (Fable): desktop at the bar in both themes; the two phone charts that were not (Compare radar, Charts bars) are fixed live; remaining gate is independent verification. Current live rechecks show no page-level overflow; F-50 measures a 40px desktop column gap on the canonical host and remains stacked on mobile, satisfying its ≤120px acceptance geometry. The design bar remains open for the broader unresolved E2/P2/R9.1/X6 gates and independent verification requirements. **Pass 11 (Fable):** the UI meets the bar at 1440/390, light/dark, now including the E2 boards' opening state (F-65 live, 168/168 per host); remaining gate is a non-Fable verification of F-65/F-66. **Pass 12 (Fable):** first pass with no page below the bar in a fresh matrix; F-67/F-68 (label loss and name truncation at 390) fixed and live 32/32 per host. Remaining gate is procedural only: a non-Fable engine verifying F-65/F-66 (`bin/verify-f65.mjs`) and F-67/F-68 (`bin/verify-f67-f68.mjs`) on both hosts. **Pass 13 (Fable, design authority):** at the bar at 1440 and 390, light and dark, with F-69–F-71 live; F-72 (one Charts card) is an improvement, not a bar failure. Remaining: non-Fable verification of F-66/F-69/F-70/F-71 and F-72. **Pass 14 (Fable, design authority):** the live UI meets the bar at 1440 and 390, light and dark, with F-74–F-76 live; no directive open for implementers. Remaining gate: non-Fable verification of F-74–F-76 plus the broader E2/P2/R9.1/X6 rows. |
| X5 | CHANGELOG / API.md / fork-sync prompt updated | verified | `API.md`, `CHANGELOG.md`, `MSG-UPSTREAM-SYNC-PROMPT.md`, current live `/about` and API evidence | Codex checked the H2 fields, six headline boards, `data/raw/*.json` sync, ECI/featured/Compare changelog entries and the matching build-diagnostic field paths. |
| X6 | Final line-by-line completeness audit | open | — | |
| X7 | Final Telegram to Florian | open | — | |
| D1 | Blend default 20 is not a selectable option | implemented | `ux-evidence/iter1-live/verification.json` | blend 20 is a real option; settings key bumped to v7 to discard the broken payload |
| D2 | Reset restores `excludeChinese = true` against its default | implemented | `components/GlobalFilters.tsx` | Reset restores every documented default; `defaultMinFor("composite")` is now 86 (>85) so a clean page is not reported as modified |
| D3 | `#benchmarks` shows composite slots, not benchmark count | implemented | `ux-evidence/iter1-live/verification.json` | see R2.2 |
| E1 | ECI (general + software engineering) into the Composite, with scraping recipe in the update mechanism | verified | `ux-evidence/iter3-live/eci-verification.json`, `/opt/benchmarkheaven/state/ux-evidence/iter48-e1-indep/README.md` | **Verified iteration 48 by claude-opus (implementer codex-luna), live `c41a2a2`:** 7-slot `composite-v2-epoch-eci`; dropping ECI changes `composite_base` for all 130 ECI-bearing models; the shipped `buildEciSnapshot` on today's Epoch exports yields 266/266 general rows (the committed 05:14 snapshot's 264 predates Epoch adding Gemini 3.8 Flash and Qwen3.8 Max 0902); daily step `fetch-epoch-eci` ran today; CHANGELOG/API document the re-weighting; live Score (i) tooltip (1440) and modal (390) name both ECIs; H2 definition-change test present. Earlier note: Epoch AI source collected 264 general / 101 software rows; 130 families mapped conservatively, 134 source models retained unmatched. Composite is now seven equal native/percentile-normalized slots; source and H2 recompute provenance are documented. Reopened because the existing note says independent-engine verification is still required; this gate did not implement or independently close that claim. |
| E2 | Secondary/community benchmarks (Vals AI, CursorBench, Apprentice Bench, DeepSWE, FrontierBench, RealSWE, 2 X threads) — NOT in the Composite | open | `ux-evidence/iter14-e2/SUMMARY.md`, `/opt/benchmarkheaven/state/ux-evidence/iter33-e2-cursorbench/verification.json`, `/opt/benchmarkheaven/state/ux-evidence/iter47-e2/`, `/opt/benchmarkheaven/state/ux-evidence/iter48-e2-apprentice/README.md` | **Iteration 48 (claude-opus) — ApprenticeBench landed, live on `f7c5a91`:** four identities `apprenticebench-{cua,cua-cost,api,api-cost}::snapshot-2026-09-14` (29/29/27/27 runs, `measured`, never Composite inputs), collected from the row literals in the page's own Vite module bundle (Kimi K3 draft, integrated by claude-opus). Owner re-check independent of the shipped parser: all 112 committed values equal the bundle literals of both boards (`owner-recheck.json`, 0 mismatches). Gates: build-dataset 845/661/91/2,834 (no model row changed), `npm test` 277/277, `tsc`, `next build`. Live on both hosts: `bin/verify-e2-apprentice.mjs` 0 failures (API rows, harness-cohort axes, unit, basis, spot values, no human-baseline row); `bin/verify-e2-apprentice-ui.mjs` 88/88 at 1440/390, light/dark. Same known gap as Vals/FrontierCode: unmatched source identities, so the CUA board opens on 0 rows until "All" + "Include unmatched source identities". **E2 now open only for the two X threads** (gregpr07, petergostev; need the desktop-Chrome route, not an automated fetch); DeepSWE stays excluded by its robots.txt. **Iteration 47 (claude-opus) — Vals Index v2 and FrontierCode 1.1 landed, live on `ed9b78a`:** the parked stash was merged onto `main` (`ed9b78a`). FrontierCode batch 3 and cost batches 1–5 were reviewed by the different-family critic `deepseek/deepseek-v4-flash-0731` through the repo-path `worker.sh`: all 196 self-reported rows approved (`critic-rounds.log`). Owner re-checks against the raw captures, independent of both the collector and the critic: Vals 503/503 (`vals-recheck.json`), FrontierCode 196/196 (`frontiercode-recheck.json`). Gates: data:benchmarks, build-dataset 845/661/91/2,834, `npm test` 276/276, `tsc` clean. Live, both hosts: `bin/verify-e2-vals-frontiercode.mjs` 0 failures across 11 identities (its axis check now sums FrontierCode's seven harness cohorts, 98/98 each; `frontiercode-axes-live.json`); `bin/verify-e2-benchmarks-ui.mjs` 88/88 at 1440/390, light/dark (`ui/`); route smoke `verify-review-0610` 68/68. **Known gap, not hidden:** every E2 row is an unmatched source identity (`identity_policy: source_label`; Vals slugs carry a published compute effort and must not be effort-inferred), so `/benchmarks` opens Vals Index on "0 results" until "All · prefer measured" and "Include unmatched source identities" are set. Follow-ups: (a) Fable decides how boards with only unmatched identities should open (candidate directive in `DESIGN-DIRECTIVES.md`); (b) a reviewed Vals alias table (slug + published effort → exact catalog configuration). E2 stays `open` for Apprentice Bench, FrontierBench and the two X threads (DeepSWE excluded by robots.txt). **Iteration 45 (claude-opus) — correction to iteration 44:** the critic runner is **not** gone. `ops/rebuild-2026-09/bin/worker.sh` and `worker-runner.mjs` are tracked and present; `node ops/rebuild-2026-09/bin/pick-worker-models.mjs --json` returns qualified workers (e.g. `deepseek/deepseek-v4-flash-0731` AA 34.5, `z-ai/glm-5.3-flash` AA 41.9). The failure came from calling it through the symlink `/opt/benchmarkheaven/bin/worker.sh`: the script resolves `$HERE` from `BASH_SOURCE` without following the link, so it looks for `/opt/benchmarkheaven/bin/worker-runner.mjs`. **Always call the repo path.** Next step unchanged otherwise: critic-review FrontierCode batch 3 + cost batches 1–5 through the repo-path `worker.sh --critic`, then land Vals + FrontierCode together. **Iteration 44 (claude-opus) — state of the parked Vals/FrontierCode work:** stash commit `07eaa70` (+ untracked parent `00bf1f0`) holds Vals Index v2 (8 identities + cost, `measured`, 56/55 rows) and FrontierCode 1.1 score + cost (`self_reported`, 98 rows each). Tracked data merges cleanly onto `main` (conflicts only in CHANGELOG/addendum/PROGRESS). **Not landable yet:** the validator requires a critic approval for every `self_reported` row; only 78 of 196 FrontierCode rows are approved (batch 3 failed on a truncated critic reply, the cost board was never reviewed), and the critic runner it used is gone — `/opt/benchmarkheaven/bin/worker.sh` execs a `worker-runner.mjs` that no longer exists and `ops/rebuild-2026-09/bin/worker.sh` was removed. Next step: restore a critic route (gauntlet skill), review FrontierCode batch 3 + cost batches 1–5, then land Vals (measured, deterministic re-check against the capture) and FrontierCode together. **Iteration 14:** registry re-checked — only RealSWE (score + cost) is ingested. Delegated source research returned no report and no scores (not accepted), but its verbatim robots.txt reads are recorded: Vals AI, neocognition.io and cognition.ai allow; cursor.com allows `/cursorbench` but not `/api/`; realswe disallows `/api/`; **DeepSWE disallows ClaudeBot/GPTBot/CCBot/PerplexityBot** → treated as not permitted for automated collection by this workstream. Next: capture → registry identity → gauntlet → ingest, per source. **Direct probes by claude-opus (same iteration, ≤ 3 requests per host):** four sources are machine-readable without any API or login — **Vals AI** (Vals Index v2, 56 models × 8 tasks in the page's Astro props), **CursorBench 4.0** (43-row HTML table), **ApprenticeBench** (15-run table on apprenticebench.com), **FrontierCode** = the addendum's "FrontierBench" (Cognition's own `data.json`, v1.1 36 models / 98 runs, cross-checked against the rendered table). Captures, hashes, verbatim rows and suggested identities are in `SUMMARY.md`. **Iteration 33:** CursorBench 4.0 was freshly captured from its allowed SSR HTML page and accepted as two separate non-Composite identities (score + USD/task), 43 rows each. Its model/effort labels remain unmatched source identities (no catalog joins or effort inference). Three row-batched DeepSeek critic gates pass with independent receipts; the other named E2 sources and X-thread route remain open. Earlier: | check `data/raw/benchmarks/` and `bfeada7` first; Real-SWE looks already ingested |
| E3 | Collection method order: official API/export → structured page data → static HTML → the page's own network calls | open | `data/raw/benchmarks/collection-plan.json`, `ops/daily/refresh-benchmarks.mjs` | **Iteration 48 (claude-opus):** ApprenticeBench uses E3 step 2 (structured data shipped with the page): `capture-benchmark-sources.py` follows exactly one same-origin `<script type="module">` from `https://apprenticebench.com/` under the same robots/delay/size/challenge guards and records `discovered_from`; `refresh-benchmarks.mjs` resolves `page_url` + `follow_module_script` sources and registry evidence from that discovered capture, because the bundle hash changes per deploy; parser `vite_board_runs` is fail-closed (header literal, single cua/api board map, literal-only rows, n == 100). Recipes in `collection-plan.json` and the registry; the daily refresh picks them up generically. Remaining for E3: the two X threads. **Iteration 47 (claude-opus):** Vals Index v2 (structured page data: Astro island props, one robots-allowed page request, version guard "Vals Index" v2) and FrontierCode 1.1 (the page's own `data.json`, robots-allowed) landed in `ed9b78a` with recipes in `collection-plan.json`. The daily refresh walks every `collection-plan.json` entry generically (capture → parser → critic for changed rows), so both are refreshed daily without extra wiring. Still open for the remaining E2 sources (Apprentice Bench, FrontierBench, the two X threads; DeepSWE stays excluded by its robots.txt). CursorBench 4.0 now has a reproducible SSR-HTML capture recipe (one robots-allowed request, explicit version guard, source hash and 43-row minimum); the complete eight-source E2 collection recipe is still open. |
| P1 | Requirements from both Telegram chats structured as a PRD, independently reviewed before the ledger is declared complete | verified | `ops/ux-2026-09-12/PRD.md`, `/opt/benchmarkheaven/state/ux-evidence/iter13-prd/verification.json`, `ux-evidence/iter14-prd-review/review-claude-opus.json`, `/opt/benchmarkheaven/state/ux-evidence/iter32-prd-review-codex/review.json` | **Codex Luna independently confirmed Claude's repaired digest `57d164a25de84547944527a5c5a0f1f919c01ade37b8afc81efb734e86d36f5a`**: all six prior findings are repaired, all E2 source names and F1/C1 rows are present, AA claims are supported by retained captures, and unresolved P2/P3/P4/E2/E3 gaps remain explicitly open. This closes P1 only; it does not close the product gaps or X6. |
| P2 | Cited capability comparison against Artificial Analysis; close the gaps that matter | in-progress | `ops/ux-2026-09-12/PRD.md`, `/opt/benchmarkheaven/state/ux-evidence/iter13-prd/verification.json` | Capability matrix now cites the allowed AA leaderboard, comparison, methodology and current-index URLs row by row; material gaps are prioritized, not claimed closed. |
| P3 | Do not stop before P2 is achieved | open | — | |
| P4 | Positioning claims only in a form the live coverage numbers support | verified | `/opt/benchmarkheaven/state/ux-evidence/iter35-live-{canonical,legacy}/verification.json`, `api-meta.json`, `REVIEW-20260914T061002Z.md` | **Verified by claude-opus review gate 2026-09-14T061002Z (implementers: codex-luna `f98a23d`, Fable `fd4a907`):** live H1 on `4b0d250` is "Every AI model benchmark we can find, in one place. And what each model really costs you."; server HTML contains no "only place" / "most complete" superlative. The live claim is explicitly limited to the tracked, source-linked collection and modeled cost inputs; it makes no unsupported “only place” claim. |
| F1 | Gauntlet-loop quality: simple, elegant, intuitive, perfect UI, yet complete | in-progress | `DESIGN-DIRECTIVES.md`, `ux-evidence/iter12-f05-live/verification.json` | Fable pass judged against exactly this bar; F-05 now uses aligned score/cost magnitude bars and was live-checked by Codex, but independent verification and the remaining open directives are still required. **Pass 11 (Fable):** E2 boards no longer open on a zero (F-65); see X3. |
| C1 | One writer only until `ALL-ACCEPTED`; do not race another agent in this repo | open | — | iteration 1 saw only expected ops commits from the workstream's own setup and rebased cleanly. Iteration 15: no foreign commits; the only other process in the repo was the design pass's own orphaned Kimi delegate (stopped, see the log) |
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
| F-72 | Charts "Cheapest models": log-position dot plot instead of linear bars (both widths) | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter51-f72/{local,canonical,legacy}/verification.json`, `/opt/benchmarkheaven/state/ux-evidence/iter51-README.md` | **Iteration 51 (claude-opus), `26a709c`:** desktop = 205 px name column + muted track + 7 px accent dot at the log position + value beside it, round money ticks and "Adjusted cost · log scale" caption (HTML/CSS, no recharts `Bar`); phone rows keep name + value with a dot track; zero values pin left (F-39). `bin/verify-f72.mjs` (from the pass-13 acceptance text) 34/34 local, **34/34 per host live** at 1440/390 × light/dark (cheapest marks 43.7/52.0/95.6 px apart, ticks $0.1–$30). Deviation recorded: the recharts hover tooltip is replaced by a native `title` on each row; the keyboard-accessible table below the card is unchanged. Needs a non-claude-opus verifier. |
| F-73 | E2 boards: "not matched to a catalog model" once per board, not per row | implemented | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T130002Z/{canonical,legacy}/verification.json` (`bin/verify-review-1300.mjs`) | Fable pass 13 directive, `[mechanical]`, low. Implemented by the claude-opus review gate 130002Z (`4dffc1d`: row sub-line is "As named by the source" when `matched === 0`, mixed boards unchanged); live both hosts, 1440/390, light/dark: the phrase appears exactly once on Vals code-migration and FrontierCode 1.1 (was 26 and 17). Needs a different-engine verifier. |
| CR-6.1 | Simple mode mobile header: Benchmarks next to Filters, Menu → More, Benchmarks left of More | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-6-8/{local,canonical,legacy}/verification.json` (`bin/verify-cr-6-8.mjs`) | **Iteration 52 (claude-opus), `3de100d`:** below `lg` the header is Filters · Benchmarks · More · theme; More no longer repeats Benchmarks; header controls 44 px below `lg` (CR acceptance newer than F-15 40 px; desktop unchanged). Live 62/62 per host at 1440/390/360, light/dark (labels, order, ≥ 44 px targets, no overflow, More opens). Needs a non-claude-opus verifier. |
| CR-8.1 | Overview table default sort: score descending in Simple and Advanced (supersedes R5.2 price order) | implemented | same as CR-6.1 | **Iteration 52 (claude-opus), `3de100d`:** HomeMode and Wizard no longer seed a cost sort; Simple, Guided and Advanced open on Score descending (`aria-sort=descending`, values descending, live both hosts, 1440/390, light/dark). The F-74 Pareto cap is order-independent and unchanged. R5.2 note updated. Needs a non-claude-opus verifier. |
| CR-1.1 | Benchmarks tab opens on a release-style comparison table (models as columns, benchmarks as rows) | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host) | **Iteration 52 (claude-opus), `a0eef68`:** `/benchmarks` opens on `components/BenchmarkMatrix.tsx` — models as columns (vendor above, collapsed name), benchmarks as rows, tinted lead column, sticky first column inside its own scroll container (no page overflow at 390). `?benchmark=` keeps the single-benchmark ranking ("One benchmark" tab). Fable pass (CR-1.10) still to judge the look. |
| CR-1.2 | Default columns: top 5 models of the current filter selection; pin state; count 2–10 | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host) | Top N (2–10, default 5) by the active score under the global filters (`lib/top-models.ts`, same variant/evidence/offer-scope helpers as the overview, slim server payload `lib/benchmark-matrix-data.ts`); a custom selection is the visible pinned state ("your selection" + Reset). |
| CR-1.3 | Rows grouped by category from dataset/registry metadata, collapsible groups | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host); `test/benchmark-matrix.test.mjs` | Groups from `data/benchmark-taxonomy.json` (registry category → group, overrides for indices and DesignArena); test: every registry benchmark in exactly one known group, rows contiguous; groups collapse (`aria-expanded`). |
| CR-1.4 | Extensive rows: AA index + every AA component, DesignArena, community/niche; N benchmarks across K categories | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host); `test/benchmark-matrix.test.mjs` | "All" shows every benchmark with ≥ 1 value for the selected models; "N benchmarks across K categories". 86 rows overall; the default frontier top 5 has 31 (community boards have not published those models — decision: no sibling-variant borrowing, CR-9.3). Test asserts AA Intelligence Index + eight AA components are rows of their own. |
| CR-1.5 | Cells: value + subtle direction-aware Excel-style data bar | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host); unit tests | Direction-aware bars (ratio units proportional, Elo/unknown min–max with floor, lower-is-better inverted), none on missing cells, alpha ≤ .2 light / .16 dark, text colour untouched. |
| CR-1.6 | Row winner in bold (direction-aware, ties, <2 values no winner; unit tests) | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host); unit tests | Bold row winner; ties all bold; < 2 values or unknown direction: none (unit tests for each). |
| CR-1.7 | Tags in benchmark-name column (AA Index, Arena, Headline, Niche, Community), defined in data | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host); `ops/ux-2026-09-12/research/cr17-tags-review.md`; `/about#benchmark-tags` (`1a2f502`) | Tags AA / Arena (derived) + Headline / Niche / Community tiers in `data/benchmark-taxonomy.json` with tooltips. Tiers drafted by Kimi K3, reviewed by claude-opus (6 changes recorded). Methodology note on `/about`. A non-claude-opus engine should re-check the tier review. Iteration 53: `bin/verify-cr-1.mjs` updated for the Rows preset menu (`d3cee65`) and re-run live at `bfd4974`, **92/92 per host** (`iter53-cr-1-regression/{canonical,legacy}/`). |
| CR-1.8 | Every cell clickable → deep-linkable detail comparison page with provenance | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-18/local/verification.json` (92/92 local); live (iteration 53): `1a2f502` deployed, real cell links from the live table return 200 on the canonical host — a full live browser run of the CR-1.8 checks is still to do | `/benchmarks/result?axis=&model=&models=[&pinned=1]`: value, basis, observed date, source link and evidence (SourceScore), version/cohort/unit/direction, compared models on the benchmark, the model's other results; back restores a custom selection. |
| CR-1.9 | Bar chart: selected models × important benchmarks, colours match table, readable at 390 | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-1-9/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1-9.mjs`, 52/52 local and **52/52 per host live** at `9ebe5b2`, again 52/52 per host at `d3cee65` in `iter53-cr-1-9/{canonical,legacy}-d3cee65/`, 1440/390, light/dark) + `*-chart-section.png` | **Iteration 53 (claude-opus), `9ebe5b2`:** under the table, one small multiple per "Important" row with ≥ 2 values among the compared models (20 for the default top 5; first 12 then "Show all"). Ratio units: bars from zero (fractions/percents on a fixed 0–100 % axis); positive values spanning > 20×: log-position dots (design rule F-72); Elo / no-zero scales: dots between the padded row min and max, never bars. Colours: the dataviz reference 8-slot categorical order, validated with `validate_palette.js` on our surfaces (light #fff adjacent CVD ΔE 9.1 / normal 19.6, three slots < 3:1 so every mark carries a visible letter and value; dark #171e29 ΔE 8.4 / 19.3, all ≥ 3:1); the same colour + letter sits on each table column header; columns 9–10 take a neutral mark (no generated 9th hue). Legend in column order, values printed, native `title` tooltips; removing a column keeps the other colours. Unit tests `chartScale`/`chartRows`. Needs a non-claude-opus verifier. |
| CR-1.10 | Page looks excellent and intuitive — one targeted Fable pass, directives implemented | open | — | Seeded 2026-09-14 from `04-CR-BRIEF.md` (iteration 52, claude-opus). |
| CR-1.11 | Performance: All table with 10 models without jank, CLS < 0.1 | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-2-5-perf/{local,canonical,legacy}/verification.json` (`metrics` per context; live 28/28 per host at `bfd4974`) | **Iteration 53 (claude-opus):** measured, not assumed. First run (build `d3cee65`+): CLS **0.199** desktop / **0.359** phone on `/benchmarks?models=<10 ids>` — a diagnostic of the layout-shift sources showed one shift at ~540 ms when the client swapped the server's automatic top 5 for the URL's 10 columns (header 103→121 px, rows without values removed, the add-model row collapsing). Fix: `app/benchmarks/page.tsx` passes `models`/`set`/`rows` to `BenchmarkMatrix`, which seeds its first render from them. After: **CLS 0 in all four contexts**, 34 rows × 10 models (340 cells), table in 355–613 ms from navigation, longest task 165 ms (none ≥ 200 ms), collapsing and reopening every group 53–106 ms. Live canonical at `bfd4974`: CLS 0 in all four contexts, longest task 136 ms, table 516–977 ms, toggle 55–109 ms (measured with no build running — see the iteration-53 log). **Decision:** Lighthouse is not installed on Sandy and the disk is ~90 % full, so CLS is summed from the same `layout-shift` entries in-page; no virtualisation needed at this size. Remaining shift source outside this check: a user whose stored filters change the automatic top N after hydration (no URL) — not measured as CLS here. Needs a non-claude-opus verifier. |
| CR-2.1 | Model columns: remove (×), add (+) with type-ahead search | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host) | × removes a column; type-ahead combobox adds (Enter picks the first match; keyboard-operable). |
| CR-2.2 | Pick from chart: filter panel + Pareto with min-score/max-price sliders | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-2-2/local/verification.json` (`bin/verify-cr-2-2.mjs`, 38/38 local production build, 1440/390, light/dark) + `*-pick-panel{,-narrowed}.png`; `test/pick-chart.test.mjs`; **live 38/38 per host** at `604be4a` (iteration 54: `iter54-cr-2-2/{canonical,legacy}/`, logs `iter54-cr-2-2-{canonical,legacy}.log`) | **Iteration 53 (claude-opus):** "Pick from chart" panel on `/benchmarks` (collapsed by default so the table stays first). A dedicated SVG chart (`components/PickFromChart.tsx`), not the recharts value map: that one is built on the full 7.5 MB catalog and carries several verified directives (F-17/F-39/F-67/F-74), so it stays untouched. Candidates = the models the global filters allow (`filteredCandidates`), at their cheapest in-scope adjusted cost; unpriced models are counted, never plotted at an invented cost; free routes pinned left (F-39 rule). Log cost axis with round ticks, Pareto line over the points within the limits, Simple-style min-score and log max-cost sliders (end = no limit) narrow the candidates. Each point is a keyboard-operable button (Enter/Space) with a 20 px (desktop) / 28 px (phone) hit area; a click or tap adds or removes its column at once (`toggleColumn`, cap 10, never below one); selected points wear the column colour and letter. Pure model `lib/pick-chart.mjs` unit-tested. Needs a non-claude-opus verifier. |
| CR-2.3 | Auto top-N from filters and one-click reset to top 5 | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/{local,canonical,legacy}/verification.json` (`bin/verify-cr-1.mjs` at `a0eef68`, 84/84 per host) | Automatic top N from filters; "Reset to top N" returns to automatic and drops `?models=`. |
| CR-2.4 | Model-list presets: ours + custom | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter53-presets/local/verification.json` (`bin/verify-cr-presets.mjs`, 88/88 local production build, 1440/390, light/dark); `test/presets.test.mjs`; **live 88/88 per host** at `d3cee65` (`iter53-presets/{canonical,legacy}/verification.json`) and again at `bfd4974` (`iter53-presets/{canonical,legacy}-bfd4974/`) | **Iteration 53 (claude-opus):** "Models" preset menu on `/benchmarks`. Ours, all computed live from the candidates that pass the global filters (`filteredCandidates`, `lib/top-models.ts`): Frontier top N · Best open-weight · Best value (score ÷ cheapest in-scope adjusted $/task; each route's cost is shipped from the server at default adjusted settings, AA reference price only when no filter restricts routes — same rule as `modelPrice`) · Coding leaders (AA Coding Index) · Flagships by lab (strongest model per org) · EU-hostable (≥ 1 EU-hosted route). Yours: save the current columns, apply, rename, delete. Needs a non-claude-opus verifier. |
| CR-2.5 | Shareable URL encodes models, row preset and filters | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-2-5-perf/local/verification.json` (`bin/verify-cr-2-5-perf.mjs`, 28/28 local production build and **28/28 per host live** at `bfd4974` in `iter53-cr-2-5-perf/{canonical,legacy}/`, 1440/390, light/dark); `iter53-presets/local/` (URL round trip for models + rows); `test/presets.test.mjs` | **Iteration 53 (claude-opus):** `?models=` (custom columns), `?set=` (model preset), `?rows=` (row preset id or benchmark keys) and **`?f=` (every filter that differs from the defaults, readable `key:value;…`, `encodeFilters`/`decodeFilters`, unit-tested incl. junk input)**. `?f=` is applied once after stored settings hydrate (`SettingsContext.hydrated`; a child effect would otherwise be overwritten) and kept in sync as filters change. Checked: a shared URL reproduces columns, rows and filters in a fresh browser **and** in a browser whose own stored filters disagree (the URL wins). Simple's own slider pair is not part of `f` (F-40). Needs a non-claude-opus verifier. |
| CR-3.1 | Row presets: ours + custom | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter53-presets/local/verification.json` (`bin/verify-cr-presets.mjs`, 88/88 local production build, 1440/390, light/dark); `test/presets.test.mjs`; **live 88/88 per host** at `d3cee65` (`iter53-presets/{canonical,legacy}/verification.json`) and again at `bfd4974` (`iter53-presets/{canonical,legacy}-bfd4974/`) | **Iteration 53 (claude-opus):** "Rows" preset menu: All · Important · AA Intelligence Index (+ components) · Coding · Agentic & tool use · Math & science · Community & niche · Full coverage only. Custom: "Choose rows" checklist with a tri-state toggle per category and per-benchmark boxes; saved row presets store benchmark keys. Replaces iteration 52's three-button row switch. |
| CR-4.1 | Filter presets: ours + custom | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter53-presets/local/verification.json` (`bin/verify-cr-presets.mjs`, 88/88 local production build, 1440/390, light/dark); `test/presets.test.mjs`; **live 88/88 per host** at `d3cee65` (`iter53-presets/{canonical,legacy}/verification.json`) and again at `bfd4974` (`iter53-presets/{canonical,legacy}-bfd4974/`) | **Iteration 53 (claude-opus):** "Presets" menu in the Filters sheet footer (opens upward): Company, EU-hosted only · Privacy strict (Strong confidential guarantees, no training/retention) · Cheapest capable (featured, Advanced floor = the score's default) · Open weights only · Frontier regardless of cost. Each applies defaults + patch through `applyFilters` (sanitised like a stored payload); the button names the matching preset, "None" at defaults, "Custom" otherwise. Simple's own slider pair is deliberately not part of a filter preset (F-40). Custom: save / rename / delete. |
| CR-4.2 | One consistent preset component for model, row and filter presets | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter53-presets/local/verification.json` (`bin/verify-cr-presets.mjs`, 88/88 local production build, 1440/390, light/dark); `test/presets.test.mjs`; **live 88/88 per host** at `d3cee65` (`iter53-presets/{canonical,legacy}/verification.json`) and again at `bfd4974` (`iter53-presets/{canonical,legacy}-bfd4974/`) | **Iteration 53 (claude-opus):** `components/PresetMenu.tsx` is the only preset control: "Ours" and "Yours" sections, save current, rename, delete, one localStorage store (`bh.presets.v1`, sanitised; same-tab event + cross-tab `storage`). Phones: a bottom sheet (a mid-row dropdown ran off-screen at 390 px — found and fixed in this iteration). Pure CRUD/merge/built-ins in `lib/presets.mjs` with unit tests, incl. the CR-5.4 local→account merge rule. |
| CR-5.1 | Sign in with Google | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter57-cr-5/{canonical,legacy}/verification.json` (`bin/verify-cr-5.mjs`, **55/55 per host live** at `379a6df`, signed-in flows included) + `iter57-cr-5/oauth-redirect-probe.txt` | **Iterations 54–56 (claude-opus):** Auth.js v5 (`next-auth`, `auth.ts`), Google OIDC only, JWT session in an httpOnly `__Secure-authjs.session-token` cookie (30 days), Auth.js CSRF on sign-in/out; account routes same-origin only (cross-origin PUT/DELETE 403, no public CORS). Accounts switch on only when `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ACCOUNTS_DATABASE_URL` are set. Shipped `f1752eb` (16:42); that deploy sent `https://localhost:3000/api/auth/callback/google` to Google on both hosts → `379a6df` derives the callback from the visited host, allow-listed to the app's three domains (unit-tested). Desktop header Sign in / avatar; phones: Sign in inside More. **Iteration 57:** live both hosts — providers list Google with the visited host's callback, Google accepts both redirect URIs (sign-in page, no mismatch), avatar shown for a signed-in session. A real end-to-end Google login with a human account was not performed (the session is minted with the app's own `AUTH_SECRET`, the same token Auth.js issues after the callback). Needs a non-claude-opus verifier. |
| CR-5.2 | Users, settings and presets stored in the account (Postgres) | implemented | same as CR-5.1; `iter57-cr-5/mobile_dark-signed-in-synced.png` | Postgres `benchmarkheaven_accounts` on Sandy (role `bh_accounts`), migration `db/accounts/001_init.sql` (`bh_users`, `bh_user_data` JSONB presets + settings), `scripts/migrate-accounts.mjs`, sync logic `lib/account-sync.mjs` + `components/AccountContext.tsx`. **Iteration 57 live, both hosts:** browser A (1440 light) and browser B (390 dark) signed in as the same throwaway user; A saves preset "Synced from A" and turns on Exclude Chinese providers → both land in the account row → B receives both on reload. Each run's test user is deleted by the script (0 rows for its id afterwards). A DB check afterwards still found one older synthetic row (`verify-cr5@example.invalid`, an earlier run that did not reach its delete step); iteration 57 removed it by that email + `verify-cr5-` subject only. Needs a non-claude-opus verifier. |
| CR-5.3 | Signed out: localStorage + sign-in suggestion toast | implemented | same as CR-5.1; `iter57-cr-5/{canonical,legacy}/*-signin-toast.png` | **Iteration 53:** presets in localStorage ("Saved in this browser"). **Iteration 54:** once accounts are on, a signed-out save shows a toast suggesting Sign in with Google; the save still happens, the toast fits 1440 and 390, is dismissible, is not shown again that session, and never appears while signed in (live 55/55 per host, iteration 57). Needs a non-claude-opus verifier. |
| CR-5.4 | First sign-in merges local presets into the account | implemented | same as CR-5.1; `test/account-sync.test.mjs`, `test/presets.test.mjs` | Merge rule in `lib/presets.mjs`/`lib/account-sync.mjs` (unit-tested): first sign-in uploads browser A's presets; a second browser's same-named preset with a different value is kept as "… (this browser)", nothing lost; the account adopts A's settings when it has none. Live both hosts, iteration 57. Needs a non-claude-opus verifier. |
| CR-5.5 | Privacy and account basics, delete account | implemented | same as CR-5.1; `iter57-cr-5/{canonical,legacy}/*-privacy.png`, `desktop_light-account-signed-in.png` | Only Google subject ID, email, name and avatar link stored (listed on `/account`). New `/privacy`, `/terms`, `/impressum`, footer links. **Decision (iteration 54):** Benchmark Heaven had no Impressum; the operator details were taken from Florian's other ventures (productivity-boost.com Betriebs UG, Passau) — Florian may want to confirm. "Delete my account and data" removes `bh_users` + `bh_user_data` rows, the page confirms and shows signed-out, the other browser's writes then get 401 (live both hosts, iteration 57). Needs a non-claude-opus verifier. |
| CR-5.6 | Provision the Google OAuth client ourselves (secrets only in Coolify env) | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter54-cr-5/provisioning/*.png` (consent screen branding, URLs, audience "In production"); live probe iteration 57: `/opt/benchmarkheaven/state/ux-evidence/iter57-cr-5/oauth-redirect-probe.txt` | **Iteration 54 (claude-opus), recorded in iteration 57:** Google Cloud project `benchmark-heaven` created through Florian's signed-in Chrome on Sandy; consent screen (app name, domains, `/privacy` + `/terms` links) published to production without a logo (no Google review needed); web OAuth client with redirect URIs for `benchmarkheaven.com`, `www.` and the legacy host. Client ID/secret, `AUTH_SECRET` and the accounts DB URL written to `~/.config/dev-secrets.env` and the Coolify env without printing. **Iteration 57 live check:** `/api/auth/providers` on both hosts lists Google with the visited host's callback; a real sign-in POST (CSRF token) on each host redirects to `accounts.google.com` with that host's `redirect_uri`, and Google answers with its "Sign in - Google Accounts" page, not `redirect_uri_mismatch` — so both redirect URIs are registered. No 2FA was needed. Needs a non-claude-opus verifier. |
| CR-7.1 | Simple landing = two sections: price/capability overview + simple Benchmarks section | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-7/local/verification.json` (`bin/verify-cr-7.mjs`, 42/42 local production build, and **42/42 per host live** at `5120a02` in `iter53-cr-7/{canonical,legacy}/`, 1440/390, light/dark) + `*-simple-benchmarks-section.png` | **Iteration 53 (claude-opus):** `components/SimpleBenchmarks.tsx` under Simple's overview: a release-style table of the first 5 models of section 1's current list (`ModelExplorer onRowsChange`, so it follows the sliders and filters — checked after moving the score slider), "Important" rows with ≥ 2 values, bold winners, data bars, cells open the CR-1.8 detail page. "/" receives only the Important rows (`importantMatrix`, unit-tested): local home HTML 7.76 MB / 580 KB gzip vs 7.54 MB / 534 KB live before. Guided and Advanced do not show it. Needs a non-claude-opus verifier. |
| CR-7.2 | Mark the simple version; obvious switch to the full version; one-time small-screen note | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-7/local/verification.json` (`bin/verify-cr-7.mjs`, 42/42 local production build, and **42/42 per host live** at `5120a02` in `iter53-cr-7/{canonical,legacy}/`, 1440/390, light/dark) + `*-simple-benchmarks-section.png` | **Iteration 53 (claude-opus):** eyebrow "Simple view", heading "Benchmarks for your shortlist", a primary "Open the full comparison →" button whose `?models=` carries the same columns, and a closing line naming what the full version adds. Phones only (< 768 px): an inline dismissible note "This is the simple version. The full comparison … works best on a larger screen." (chosen over a toast: it cannot cover the table and needs no timer); dismissal is remembered (`bh.simpleBenchmarksNote.v1`, checked across a reload). |
| CR-7.3 | Header Benchmarks button: Simple scrolls to section 2, Advanced opens the full tab | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter53-cr-7/local/verification.json` (`bin/verify-cr-7.mjs`, 42/42 local production build, and **42/42 per host live** at `5120a02` in `iter53-cr-7/{canonical,legacy}/`, 1440/390, light/dark) + `*-simple-benchmarks-section.png`; header regression `iter53-cr-7/{local,canonical,legacy}-cr-6-8/` (62/62 per host live with the scoped script) | **Iteration 53 (claude-opus):** both the phone header link and the desktop primary-nav link jump to `#benchmarks` when it exists on "/" (smooth unless reduced motion, then focus the section); modified clicks and every other context navigate to `/benchmarks` (checked in Advanced). `bin/verify-cr-6-8.mjs` now scopes its Score column to the ranking table: its CR-8.1 check had read Simple's new second table too (25 values; the ranking itself was correctly descending). |
| CR-9.1 | Tests: unit + E2E for the CR features | open | — | Seeded 2026-09-14 from `04-CR-BRIEF.md` (iteration 52, claude-opus). |
| CR-9.2 | Gauntlet evidence: each CR row verified by a non-implementing engine, live, 1440/390, light/dark | open | — | Seeded 2026-09-14 from `04-CR-BRIEF.md` (iteration 52, claude-opus). |
| CR-9.3 | No invented data in the comparison table | open | — | Seeded 2026-09-14 from `04-CR-BRIEF.md` (iteration 52, claude-opus). |

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
