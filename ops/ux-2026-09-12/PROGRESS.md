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
| R3.1 | New hero claim (most complete collection + realistic cost) | verified | `ux-evidence/review-20260913T075003Z-fable-postfix-canonical/`, `…-legacy/` | **Fable 5.1 decided 2026-09-13:** "The most complete collection of AI model benchmarks. And the only place that shows what each model really costs you." — fresh Codex live check at both hosts, 1440/390, light/dark; generated counts line is present and no "every benchmark result" claim was found |
| R4.1 | Redesign the filter bar, elegant and uncluttered | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png`, `broad-fixed-{canonical,legacy}/verification.json` | Current live filter sheet is grouped into Ranking / Price basis / Regional settings / Data confidentiality / More settings |
| R4.2 | Fixed I/O blend: add 20:1 (default) and 30:1 | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live options include 20:1 and 30:1; selected value is 20 |
| R4.3 | "One variant for Reasoning models" → extra settings | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png` | Current live sheet places the setting under More settings |
| R4.4 | Featured audit ≈ AA top 20; DeepSeek V4.1 Flash included | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current `/about` renders the derived top-20 rule and ranks DeepSeek V4.1 Flash 18; build code retains deprecated exclusion and pin |
| R4.5 | "Hide deprecated" → extra settings | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png` | Current live sheet places the setting under More settings |
| R4.6 | "Exclude Chinese providers" unchecked by default | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live toggle reads `aria-pressed=false` on load |
| R4.7 | Rename → "EU-hosted only" | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png` | Current live label is EU-hosted only |
| R4.8 | Regional settings section (Chinese / EU / US) | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png` | Current live sheet has the Regional settings heading and three controls |
| R4.9 | Rename → "Strong confidential guarantees" | verified | `ux-evidence/review-20260913T110002Z/agent-browser-filters.png` | Current live label is Strong confidential guarantees |
| R4.10 | "Trains or keeps your data" filter from OpenRouter policy list; Chutes exception | implemented | `ux-evidence/iter1-live/`, `ux-evidence/review-20260913T075003Z-policy-postfix/`, `data/raw/openrouter-data-policy.json` | collector + parser + tests; 85 providers, 48 pass; unknown providers are retained and labelled. The Codex gate fixed the omitted private-data scope in every cost/offer view (`8d950fb`); fresh live toggle changes rows/costs at both hosts and both widths. Not marked verified because this gate implemented the propagation fix |
| R4.11 | Evidence/provider/task-token toggles → extra settings | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Current live Advanced controls show Evidence and Better than a model as the compact evidence popovers |
| R5.1 | Simple (start) + Advanced mode | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live loads Simple selected and exposes all three modes |
| R5.2 | Simple: top 15 featured, sorted by adjusted cost descending | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Current live has the six rows surviving the documented score/token limits, with the ranked-pool map and adjusted-cost descending header |
| R5.3 | Score slider, default > 85 | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live score slider is 85 and the limits copy is present |
| R5.4 | Max adjusted cost slider, default unlimited | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Current live cost slider starts at no limit and shares SettingsContext with the modes |
| R5.5 | Distribution histogram while a slider moves | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Current live Simple map/histogram evidence has 48 bars in the two themes and both widths; range end labels are present |
| R5.6 | Wizard (company → privacy/region → minimums → budget → results) | verified | `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json`, `fable-canonical-fixed2/metrics.json` | Current live wizard starts with the company step and the full Fable walkthrough remains error-free; source/tests cover the five pages |
| R5.7 | Score slider caption "Minimum Composite" must become "Minimum Capability Score (Composite)" and the parenthetical must switch with the active score selector | implemented | `ux-evidence/iter26-r57-r511/verification.json` | Live canonical/legacy checks at 1440/390: caption and ARIA name switch from Composite to AA Coding with the selector; the score (i) explains seven equal slots and ECI. Implemented by codex-luna, so not independently verified. |
| R5.8 | (i) tooltip on the adjusted cost slider explaining the cost model and why it is superior (real token efficiency, caching efficiency, exact prices) | implemented | `ux-evidence/iter26-r57-r511/verification.json` | Live mobile modal names provider selection/prices, model tokens, caching and cache read/write prices; desktop table tooltip is the same portal component. Implemented by codex-luna, so not independently verified. |
| R5.9 | Table columns '#Benchmarks' and '#Providers' must be the same width; current visual looks like providers is wider | implemented | `ux-evidence/iter26-r57-r511/verification.json` | Live desktop widths are 191.234375 and 191.265625 px (0.031 px difference) on both hosts; mobile remains contained. Implemented by codex-luna, so not independently verified. |
| R5.10 | Pareto chart next to the value map in Simple mode: invert x-axis so low costs left, high costs right; every model displayed | implemented | `ux-evidence/iter26-r57-r511/verification.json` | Compact map copy and axis now put cheaper left/more expensive right; Simple uses a linear x-axis so zero-cost priced routes are not dropped, and all filtered priced points remain in the pool. Implemented by codex-luna, so not independently verified. |
| R5.11 | Tooltip z-index issue in table header score and adjusted cost columns | implemented | `ux-evidence/iter26-r57-r511/verification.json` | Live headed desktop score tooltip is a fixed portal at z-index 1000 and flips above the header to stay within 1000 px viewport; mobile dialogs close cleanly. Implemented by codex-luna, so not independently verified. |
| R6.1 | "Are you a company" checkbox | verified | `ux-evidence/review-20260913T075003Z-r63-postfix-canonical/verification.json`, `…-legacy/verification.json` | **Codex independent gate:** filters toggle changes the live subscription panel from 14 personal plans to 12 plans open to companies; Claude Pro disappears, Claude Team appears, the hidden-plan explanation remains, and `scrollWidth` equals the viewport at both widths |
| R6.2 | Research: may companies use consumer subscriptions? + Telegram | implemented | `ops/ux-2026-09-12/research/R6.2-subscriptions.md` | delegated to Kimi K3, then independently re-fetched. Anthropic and Google forbid company use in their own words; Cursor allows entity use; GitHub steers to Business/Enterprise without forbidding; OpenAI and xAI return HTTP 403 to automated clients and were **not** worked around. Telegram sent — see the iteration log |
| R6.3 | Subscription prices/quotas folded into the cost view, labelled | verified | `data/raw/subscriptions.json`, `test/subscriptions.test.mjs`, `ux-evidence/review-20260913T075003Z-r63-postfix-canonical/verification.json`, `…-legacy/verification.json` | **Codex independent gate:** the subscription panel is present on desktop/mobile and both hosts, with 14 personal plans, 2 break-even lines, dated vendor pricing copy, unknown quotas rather than invented task counts, and `/about#subscriptions`; company mode is covered by R6.1 |
| R7.1 | New logo in the page | verified | `ux-evidence/review-20260913T110002Z/fable-canonical-fixed2/desktop_light-simple.png` | Current live nav shows the new mark and wordmark |
| R7.2 | Favicon / apple-touch / og from the new logo | verified | `ux-evidence/review-20260913T110002Z/asset-status.txt` | Current canonical and legacy hosts return HTTP 200 for manifest, icon, Apple touch icon and OG PNG; generator/assets remain in source |
| R7.3 | Dark-mode logo variant, switched with the theme | verified | `ux-evidence/review-20260913T110002Z/fable-canonical-fixed2/{desktop_light-simple,desktop_dark-simple}.png` | Current live light/dark screenshots show the theme-switched mark; BrandMark reads theme CSS variables |
| R8.1 | Release-post-style benchmark comparisons and listings | verified | `/opt/benchmarkheaven/state/ux-evidence/review-20260913T075003Z-r81-postfix-canonical/verification.json`, `…-legacy/verification.json` | **Codex independent gate:** both hosts show seven measured-only category snapshot cards, a full comparison table and 14 best cells; mobile has a dedicated table scroll region but no page-level horizontal overflow. Missing/low-sample values remain gaps in the rendered table |
| R9.1 | Full fresh data run, every live source dated today | implemented | `ux-evidence/iter27-r9-final/source-refresh-owner-verification.json`, `/opt/benchmarkheaven/state/ux-evidence/iter27-r9-{aa-1,da-1,openrouter-4}/` | **Codex iteration 27:** AA (646 models), DesignArena (43 frontend / 45 fullstack), and OpenRouter (445 models plus all per-provider endpoints) fetched successfully on 2026-09-13 after three exact endpoint reviews. The build remained fail-closed: the withdrawn AA Astra non-reasoning UUID's 14 historical scores were preserved as unmatched, never aliased; new InferenceNet metadata was sourced from its primary terms/privacy pages. Local build, 267 tests and TypeScript pass. Awaiting production deployment/live readback; this iteration cannot mark it verified. |
| H1 | Historical snapshots of all benchmark scores | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` plus `iter20/h1h2-indep/verification.json` | Claude's independent verification remains valid; Codex rechecked the current live hosts, retained state/API shape and current six headline IDs. |
| H2 | Bridged comparison via anchor models, uncertainty reported | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` plus `iter20/h1h2-indep/verification.json` | Claude's independent verification remains valid; Codex rechecked current live uncertainty labels and the 266/266 chain/headline tests. |
| H3 | UI filter "better than model X in category Y" | verified | `ux-evidence/iter14-indep-review/h3-functional.json`, `h3-1440.png`, `h3-390.png` — **independent verification (claude-opus, iteration 14; implementer codex-luna):** live `0e7380c`, Advanced 16 rows → reference GLM-5.3-Flash + "Coding median · 13 benchmarks" → 9 rows, status names "measured" and "Missing values stay unknown and are excluded", no overflow at 1440/390. Original evidence: | `/opt/benchmarkheaven/state/ux-evidence/iter10-h3/verification.json` | Advanced-only folded filter supports exact benchmarks and category medians; measured values win, explicit bridge estimates are marked approximate, and missing values stay unknown. Live on both hosts in desktop/mobile light/dark; independent-engine verification remains required. |
| B1 | Benchmaxxing tab in Advanced | verified | `ux-evidence/review-20260913T002002Z/*-benchmaxxing.png` | review (claude-opus, Hermes-built): 200 at desktop+mobile, light+dark; nav tab; method anchor |
| B2 | Method identifying strong-on-some / weak-on-others | implemented | `REVIEW-20260913T002002Z.md` #3–4 | topic-local percentile jump; tag quality blocked by B3 |
| B3 | Missing scores must not bias the result | verified | `ux-evidence/iter11-f07/b3-live/verification.json` + `ux-evidence/iter7-b3/bm-audit-after.txt` | **Iteration 7 (`004f8dc`):** score = within-topic mean absolute percentile difference over *all* measured pairs (order-independent), weighted by n−1; published only with ≥ 6 related comparisons over ≥ 2 topics; shrunk toward the catalog mean by n/(n+k), k by empirical Bayes (min 2). Real data: 174 scored / 18 tagged (was 574 / 58); tagged 3/21 at 6–7 comparisons, 5/74 at 8–10, 0/36 at 11–13, 10/43 at ≥ 14 — no longer falling with coverage; minimum comparisons among tagged = 6. Tests: floor, order invariance, synthetic equal-noise catalog, real-data "rate must not collapse with coverage". Codex independently re-checked both widths live: 174 qualified / 18 tagged, floor note present, no overflow. |
| B4 | Benchmaxxing tag in overview table + tab | verified | `ux-evidence/iter11-f07/b3-live/verification.json` | one shared `benchmaxxingSignals()` feeds the overview badge and `/benchmaxxing`; Codex independently re-checked 18 badges in the top-25 table at desktop and mobile, both without overflow. |
| B5 | Small-print method explanation | verified | `ux-evidence/iter4-live/verification.json` | Advanced Overview carries a restrained explanation and link to `/benchmaxxing#method`; the dedicated method disclosure is now addressable by that anchor. |
| B6 | Many-axis radar, similar topics clockwise-adjacent | verified | `ux-evidence/review-20260913T002002Z/desktop_light-benchmaxxing-full.png` | review: 214-axis radar live in all 4 combos, topic-grouped, gaps for missing; mobile overflow fixed in the review commit |
| B7 | Jaggedness weighs heavily; specialisation not penalised | implemented | `REVIEW-20260913T002002Z.md` #4, `test/benchmax-jagged.test.mjs` | zig-zag > smooth specialisation still proven. Iteration 7 removed the alphabetical-order critique (all-pairs spread, order-invariance test). **Remaining, documented on `/benchmaxxing#method`:** percentiles are bounded, so a model at the top of most boards has less room to vary than a mid-field one |
| X1 | Autonomous on Sandy with engine fallback | implemented | — | `bin/tick.sh` cron |
| X2 | Codex never above 80 % weekly | open | `/opt/benchmarkheaven/state/ux-evidence/review-20260913T110002Z-limits.json` | `limits.py --json` at 11:41 UTC: codex 69% weekly, Claude 54% session / 29% week; below the 80% ceiling. X2 remains open because the final completeness gate X6 is not complete. |
| X3 | Fable 5.1 design passes happened and were implemented | in-progress | `ops/ux-2026-09-12/DESIGN-DIRECTIVES.md` (pass 3), `ux-evidence/review-20260913T110002Z/{fable-canonical-fixed2,iter20-canonical,iter20-legacy,f27-canonical,f27-legacy}/` | Codex independently verified the non-Codex F-08a/F-08b and F-22–F-28 implementations live on both hosts, 1440/390, light/dark. F-19 is live but was implemented by codex-luna (`0c37a18`), so this gate cannot set it verified. X3 therefore remains in-progress under the one-engine rule. **Fable pass 4 (2026-09-13 12:00 UTC):** fresh 73-shot matrix judged; F-29/F-30 fixed by Fable and live-verified; F-31…F-38 written; F-33/F-34 delegated. |
| X4 | UI meets the design bar | open | `DESIGN-DIRECTIVES.md` "Verdict — pass 3"; `ux-evidence/review-20260913T110002Z/fable-canonical-fixed2/metrics.json` | Current non-Codex pass-3 matrix has no product overflow or former F-08/F-23–F-28 dimension failures: model 2,433/4,062 px, phone toolbar 54 px, Benchmaxxing rows 53 px, five map ticks, Benchmarks table 352 px. F-19 remains same-engine `implemented`, and X6 still fails on data/PRD/community-benchmark gates. **Fable pass 4 verdict:** pass-3 backlog holds live; remaining damage in order: F-32 (benchmark-count contradiction), F-31 (row-label noise), F-35 (Compare 6,743 px), F-33, F-34, F-36–F-38. |
| X5 | CHANGELOG / API.md / fork-sync prompt updated | verified | `API.md`, `CHANGELOG.md`, `MSG-UPSTREAM-SYNC-PROMPT.md`, current live `/about` and API evidence | Codex checked the H2 fields, six headline boards, `data/raw/*.json` sync, ECI/featured/Compare changelog entries and the matching build-diagnostic field paths. |
| X6 | Final line-by-line completeness audit | open | — | |
| X7 | Final Telegram to Florian | open | — | |
| D1 | Blend default 20 is not a selectable option | implemented | `ux-evidence/iter1-live/verification.json` | blend 20 is a real option; settings key bumped to v7 to discard the broken payload |
| D2 | Reset restores `excludeChinese = true` against its default | implemented | `components/GlobalFilters.tsx` | Reset restores every documented default; `defaultMinFor("composite")` is now 85 so a clean page is not reported as modified |
| D3 | `#benchmarks` shows composite slots, not benchmark count | implemented | `ux-evidence/iter1-live/verification.json` | see R2.2 |
| E1 | ECI (general + software engineering) into the Composite, with scraping recipe in the update mechanism | implemented | `ux-evidence/iter3-live/eci-verification.json` | Epoch AI source collected 264 general / 101 software rows; 130 families mapped conservatively, 134 source models retained unmatched. Composite is now seven equal native/percentile-normalized slots; source and H2 recompute provenance are documented. Reopened because the existing note says independent-engine verification is still required; this gate did not implement or independently close that claim. |
| E2 | Secondary/community benchmarks (Vals AI, CursorBench, Apprentice Bench, DeepSWE, FrontierBench, RealSWE, 2 X threads) — NOT in the Composite | open | `ux-evidence/iter14-e2/SUMMARY.md` | **Iteration 14:** registry re-checked — only RealSWE (score + cost) is ingested. Delegated source research returned no report and no scores (not accepted), but its verbatim robots.txt reads are recorded: Vals AI, neocognition.io and cognition.ai allow; cursor.com allows `/cursorbench` but not `/api/`; realswe disallows `/api/`; **DeepSWE disallows ClaudeBot/GPTBot/CCBot/PerplexityBot** → treated as not permitted for automated collection by this workstream. Next: capture → registry identity → gauntlet → ingest, per source. **Direct probes by claude-opus (same iteration, ≤ 3 requests per host):** four sources are machine-readable without any API or login — **Vals AI** (Vals Index v2, 56 models × 8 tasks in the page's Astro props), **CursorBench 4.0** (43-row HTML table), **ApprenticeBench** (15-run table on apprenticebench.com), **FrontierCode** = the addendum's "FrontierBench" (Cognition's own `data.json`, v1.1 36 models / 98 runs, cross-checked against the rendered table). Captures, hashes, verbatim rows and suggested identities are in `SUMMARY.md`. No score has been ingested yet. Earlier: | check `data/raw/benchmarks/` and `bfeada7` first; Real-SWE looks already ingested |
| E3 | Collection method order: official API/export → structured page data → static HTML → the page's own network calls | open | — | recipes go into the skills and the daily refresh. The R4.10 collector added this iteration already follows it (SSR HTML, robots-allowed, one request, self-verifying) |
| P1 | Requirements from both Telegram chats structured as a PRD, independently reviewed before the ledger is declared complete | in-progress | `ops/ux-2026-09-12/PRD.md`, `/opt/benchmarkheaven/state/ux-evidence/iter13-prd/verification.json`, **`ux-evidence/iter14-prd-review/review-claude-opus.json`** | **Iteration 14: independent review by claude-opus (author codex-luna) of digest `b9ee6ddc…f0bf` → `revise`, 6 findings** (P2-GAP-01 speed/latency/context missing from the AA matrix; P4-CLAIM-01 AA also shows cost per task; TRACE-02 no F1/C1 rows; TRACE-03 E2 sources unnamed; TRACE-04 R1.5/R5.5/R5.6/R6.2 specifics; STALE-01). AA claims re-fetched and confirmed. Repairs applied additively by claude-opus in the same iteration (repaired digest `57d164a2…6f5a`) → a **non-Claude engine must confirm that digest** before P1 closes. Earlier: | PRD drafted with exact R/H/B/E/P/X/C traceability, local digest and AA citations. Round 1 Nex review found TRACE-01/PROV-01/AA-CITE-01; repaired. Round 2 timed out without receipt; Kimi fallback is pending. |
| P2 | Cited capability comparison against Artificial Analysis; close the gaps that matter | in-progress | `ops/ux-2026-09-12/PRD.md`, `/opt/benchmarkheaven/state/ux-evidence/iter13-prd/verification.json` | Capability matrix now cites the allowed AA leaderboard, comparison, methodology and current-index URLs row by row; material gaps are prioritized, not claimed closed. |
| P3 | Do not stop before P2 is achieved | open | — | |
| P4 | Positioning claims only in a form the live coverage numbers support | open | `DESIGN-DIRECTIVES.md` §R3.1, `ux-evidence/iter14-prd-review/review-claude-opus.json` (P4-CLAIM-01) | Reopened by this gate: Artificial Analysis' comparison page also shows a per-model "Cost per Task" with cache-hit prices, so "the only place that shows what each model really costs you" is not independently supported as an exclusive claim. The live page's provider-route choice under user filters and measured token efficiency may support a narrower distinction, but X7/product review must resolve wording. |
| F1 | Gauntlet-loop quality: simple, elegant, intuitive, perfect UI, yet complete | in-progress | `DESIGN-DIRECTIVES.md`, `ux-evidence/iter12-f05-live/verification.json` | Fable pass judged against exactly this bar; F-05 now uses aligned score/cost magnitude bars and was live-checked by Codex, but independent verification and the remaining open directives are still required. |
| C1 | One writer only until `ALL-ACCEPTED`; do not race another agent in this repo | open | — | iteration 1 saw only expected ops commits from the workstream's own setup and rebased cleanly. Iteration 15: no foreign commits; the only other process in the repo was the design pass's own orphaned Kimi delegate (stopped, see the log) |
| F-19 | Benchmaxxing title, sector labels and signal table | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter18-f19-live/verification.json`, `ux-evidence/review-20260913T110002Z/broad-fixed-{canonical,legacy}/verification.json` | Current live page has the concise H1, 10-row default table, 18 tagged models, qualified radar labels and no overflow. It remains `implemented` because the implementation commit `0c37a18` is codex-luna's own work. |
| F-08a | Model page phone hierarchy and conditional unusual-results panel | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json`, `fable-canonical-fixed2/metrics.json` | Codex verified the non-Codex implementation: compact phone offer table, 2,433/4,062 px page heights, and flagged unusual results after the benchmark sheet at both hosts and themes. |
| F-08b | Model page Composite mini-radar and compact benchmark sheet | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified five-dot mini-radar plus 19 bar/percentile benchmark rows, 32 px maximum row height and no page overflow at both widths/themes. |
| F-22 | Simple value map equals the ranked pool | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified six ranked rows and six full map dots with identical mobile/desktop containment. |
| F-23 | Phone Advanced toolbar and Refine sheet | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified 54 px phone toolbar, Refine visibility, open/close sheet and no desktop Refine control. |
| F-24 | Benchmaxxing table density and signal bars | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified 10 rows, 53 px maximum row height and 10 magnitude bars at both widths/themes. |
| F-25 | Thin evidence remains ranked but is visibly hatched | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified 58 hatched Advanced rows and 112 visible input labels; evidence remains neutral rather than changing sort. |
| F-26 | Phone value-map scale | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified five phone ticks and eight desktop ticks with no overflow. |
| F-27 | Benchmarks page phone table | verified | `ux-evidence/review-20260913T110002Z/f27-{canonical,legacy}/verification.json` | Codex verified 25 rows, per-row provenance expand, three phone columns, 352 px table and no overflow. |
| F-28 | Micro-defect cleanup | verified | `ux-evidence/review-20260913T110002Z/iter20-{canonical,legacy}/verification.json` | Codex verified neutral evidence button state and histogram end labels in all four viewports/themes. |
| F-29 | Dark-mode value-map point labels theme-aware | verified | `ux-evidence/iter24-f31-f32/fable-canonical/verification.json` | Fable implemented the theme fix; Codex independently verified label fill `rgb(237,242,248)` at 1440/390 in dark mode. |
| F-30 | Guided must not reset Simple's 85 floor | verified | `ux-evidence/iter24-f31-f32/fable-canonical/verification.json` | Fable implemented the reset fix; Codex independently verified Guided → Simple retains 85 and the result count at desktop/mobile. |
| F-31 | Advanced rows: coverage pips instead of `n/7 inputs`, `est.` into the header | implemented | `ux-evidence/iter24-f31-f32/verification.json` | Codex added seven accessible 4px coverage pips, the modeled-cost header sublabel, and removed `est.` from overview/model cost cells while retaining `assumed task`. Needs non-Codex verification. |
| F-32 | One model, one benchmark count (`# benchmarks` vs Composite inputs contradiction, Fable 5 (high)) | implemented | `ux-evidence/iter24-f31-f32/verification.json`, `test/cost.test.mjs` | Codex made exact-vs-attached Composite provenance explicit: attached family/product values contribute to the score but not exact coverage; benchmark count includes exact headline observations and is covered by an invariant. Needs non-Codex verification. |
| F-33 | Benchmaxxing: signal card self-height, phone sector labels in HTML | implemented | `ux-evidence/iter24-f31-f32/fable-{canonical,legacy}-after/verification.json` | Kimi delegation produced no diff; Codex moved topic labels to 11px HTML overlays and added `self-start` to the signal card. Independent live receipt: signal card 326px desktop, Writing/Agentic/Coding labels 16px mobile, no overflow on either host. Needs non-Codex verification. |
| F-34 | Benchmarks page: one coverage line, bar per result | implemented | `ux-evidence/iter24-f31-f32/fable-{canonical,legacy}-after/verification.json` | Kimi delegation produced no diff; Codex replaced stat boxes with one coverage sentence, made unmatched controls conditional, added per-result bars and semibold first row, then tightened row padding to meet the page-height cap. Independent live receipt: 25 bars and 2,648px desktop height on both hosts. Needs non-Codex verification. |
| F-35 | Compare: release-post table with per-row provenance expand, ≤ 3,500 px | implemented | `ux-evidence/iter25-f35-live/{canonical,legacy}/verification.json`, `ux-evidence/iter25-f36-f38-live/verification.json` | `085207b` is live on both hosts. Compact comparison section is 2,403 px desktop / 3,143 px mobile; closed rows contain native values and percentile bars, evidence/date/source details are in one row expand. Needs a non-Codex verifier. |
| F-36 | Model page: no empty "Protocol-compatible" paragraph; Copilot card labelled | implemented | `ux-evidence/iter25-f36-f38-live/verification.json` | `085207b` live matrix: no empty protocol copy on the checked Copilot model; Subscription plan eyebrow is present above GitHub Copilot. Needs a non-Codex verifier. |
| F-37 | Subscriptions list: neutral badges, uncollected plans as a footnote | implemented | `ux-evidence/iter25-f36-f38-live/verification.json`, `ux-evidence/iter25-f36-f38-live/f37-final.json` | `2c3692c` live on both hosts: ChatGPT Plus / Pro and SuperGrok are absent from rows, appear once in the exact muted Not collected footnote, and no warning-colour text remains inside the disclosure. Needs a non-Codex verifier. |
| F-38 | Simple: "Minimum score (Composite)" label, one-line small print | implemented | `ux-evidence/iter25-f36-f38-live/verification.json` | `085207b` live matrix: active label is Minimum score (Composite), the measured-task-token note and methodology link are one 167-character paragraph. Needs a non-Codex verifier. |

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
