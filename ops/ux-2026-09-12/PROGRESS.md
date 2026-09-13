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
| R1.1 | Default sort: score descending | implemented | `ux-evidence/iter1-live/verification.json` | `aria-sort=descending`, first scores 99.2→89.5 |
| R1.2 | Header "Score" + small "(active score)" underneath, follows selector | implemented | `ux-evidence/iter1-live/verification.json` | header renders `SCORE ▼ (Composite)`; follows the selector via `SCORE_SHORT_LABELS` |
| R1.3 | Rename → "Adjusted Cost" | implemented | `ux-evidence/iter1-live/verification.json` | live string check |
| R1.4 | (i) next to Adjusted Cost, plain explanation | implemented | `ux-evidence/iter1-live/verification.json` | `InfoTip` next to Adjusted Cost; tooltip text verified |
| R1.5 | Remove the "Chutes global fallback" inline text | implemented | `ux-evidence/iter1-live/verification.json` | phrase gone from the whole source tree; `PriceAssumptions` now one line + method link |
| R1.6 | Fuller methodology section, reachable but not prominent | implemented | `app/about/page.tsx` | `/about` rewritten into anchored sections: #adjusted-cost, #score, #data-policy, #identity |
| R1.7 | (i) next to Score explaining composition | implemented | `ux-evidence/iter1-live/verification.json` | per-score explanation via `scoreTip()` |
| R1.8 | (i): desktop hover tooltip, mobile modal with ✕; a11y | implemented | `ux-evidence/iter1-live/verification.json` | desktop: 1 tooltip / 0 dialogs; mobile: dialog with ✕, closes. Branches on `(hover:hover) and (pointer:fine)`, not width |
| R2.1 | Remove Channels / Top provider channels columns | verified | `ux-evidence/iter1-live/verification.json` | from `f59c021`; re-checked live — neither column string is rendered |
| R2.2 | Add #benchmarks and #providers columns | implemented | `ux-evidence/iter1-live/verification.json` | now `benchmark_count` from `benchmark_results.coverage.by_model[].available` — observed 14–20, i.e. no longer the 0–5 composite slots |
| R3.1 | New hero claim (most complete collection + realistic cost) | implemented | `ux-evidence/fable-20260913/` (before) · `DESIGN-DIRECTIVES.md` §R3.1 | **Fable 5.1 decided 2026-09-13:** "The most complete collection of AI model benchmarks. And the only place that shows what each model really costs you." — hero, meta, OG image, footer all changed; "every benchmark result" no longer used anywhere. Needs non-Claude live verification after deploy |
| R4.1 | Redesign the filter bar, elegant and uncluttered | implemented | `ux-evidence/iter1-live/desktop-filters.png` | grouped into Ranking / Price basis / Regional settings / Data confidentiality / More settings |
| R4.2 | Fixed I/O blend: add 20:1 (default) and 30:1 | implemented | `ux-evidence/iter1-live/verification.json` | blend list now has 20:1 and 30:1; default reads back as 20 |
| R4.3 | "One variant for Reasoning models" → extra settings | implemented | `ux-evidence/iter1-live/desktop-filters.png` | moved into "More settings" |
| R4.4 | Featured audit ≈ AA top 20; DeepSeek V4.1 Flash included | implemented | `ux-evidence/iter2-live/verification-iter2.json`, `desktop-about-featured.png` | featured is now **derived**: top 20 families by best AA Intelligence Index across variants, deprecated excluded, plus pins. 20 families / 58 rows (was 35 / 101). DeepSeek V4.1 Flash ranks 18 **and** is pinned. Rule + list published in `build_diagnostics.featured_selection` and rendered on /about |
| R4.5 | "Hide deprecated" → extra settings | implemented | `ux-evidence/iter1-live/desktop-filters.png` | moved into "More settings" |
| R4.6 | "Exclude Chinese providers" unchecked by default | implemented | `ux-evidence/iter1-live/verification.json` | `aria-pressed=false` on load; Reset now restores false (D2) |
| R4.7 | Rename → "EU-hosted only" | implemented | `ux-evidence/iter1-live/verification.json` | label changed, EU eligibility logic untouched |
| R4.8 | Regional settings section (Chinese / EU / US) | implemented | `ux-evidence/iter1-live/desktop-filters.png` | the three options now sit under a "Regional settings" heading |
| R4.9 | Rename → "Strong confidential guarantees" | implemented | `ux-evidence/iter1-live/verification.json` | label changed, TEE logic untouched |
| R4.10 | "Trains or keeps your data" filter from OpenRouter policy list; Chutes exception | implemented | `ux-evidence/iter1-live/`, `data/raw/openrouter-data-policy.json` | collector + parser + 7 tests; 85 providers, 48 pass; parse cross-checked against OpenRouter's own facet counts (47/81 exact). Off by default and the cheapest route demonstrably changes when toggled |
| R4.11 | Evidence/provider/task-token toggles → extra settings | implemented | `ux-evidence/iter1-live/desktop-overview-tooltip.png` | folded into an "Evidence ▾" popover above the table |
| R5.1 | Simple (start) + Advanced mode | implemented | `ux-evidence/iter1-live/verification.json` | `aria-selected=true` on Simple at first load |
| R5.2 | Simple: top 15 featured, sorted by adjusted cost descending | implemented | `ux-evidence/iter1-live/verification.json` | featured-only, limit 15, cost descending (17.40 → 1.83). Only 6 rows survive the score≥85 + measured-token filters today |
| R5.3 | Score slider, default > 85 | implemented | `ux-evidence/iter2-live/verification-iter2.json` | range slider, default 85, range taken from the pool; value and "10 % below the best model" stated next to it |
| R5.4 | Max adjusted cost slider, default unlimited | implemented | `ux-evidence/iter2-live/verification-iter2.json` | log-scaled slider, default "no limit"; the limit now lives in SettingsContext so Simple, Advanced and the wizard share it |
| R5.5 | Distribution histogram while a slider moves | implemented | `ux-evidence/iter2-live/desktop-simple-sliders.png`, `mobile-simple-sliders.png` | both histograms are shown permanently rather than only on drag — the score limit is already active at 85 on first paint, so an interaction-only chart would hide exactly the fact that the default is cutting the field. Cost bins are log-scaled (costs span 3 orders of magnitude). Kept vs excluded bars are colour-separated |
| R5.6 | Wizard (company → privacy/region → minimums → budget → results) | implemented | `ux-evidence/iter2-live/desktop-wizard-*.png`, `mobile-wizard-step1.png` | five pages in Florian's order, every page skippable. Capability page offers "at least the best model available N months ago" for intelligence and coding separately, computed from release dates + today's scores (never an old published number against a fresh one). Budget page offers real p25/p50/p75 of the shortlist plus "no limit yet" |
| R6.1 | "Are you a company" checkbox | partial | `components/GlobalFilters.tsx`, `components/Wizard.tsx` | the checkbox exists in the filters **and** as the wizard's first question. It has no pricing effect yet because the site prices API/platform routes only — the tooltip now says exactly that instead of claiming a filter that does not run. Closes fully with R6.3 |
| R6.2 | Research: may companies use consumer subscriptions? + Telegram | implemented | `ops/ux-2026-09-12/research/R6.2-subscriptions.md` | delegated to Kimi K3, then independently re-fetched. Anthropic and Google forbid company use in their own words; Cursor allows entity use; GitHub steers to Business/Enterprise without forbidding; OpenAI and xAI return HTTP 403 to automated clients and were **not** worked around. Telegram sent — see the iteration log |
| R6.3 | Subscription prices/quotas folded into the cost view, labelled | open | — | |
| R7.1 | New logo in the page | implemented | `ux-evidence/iter2-live/logo-light.png`, `logo-dark.png` | re-drawn as SVG from geometry measured off the JPEG (cloud = 3 circles cut at a flat bottom, 7 treads, 7 measured ray endpoints). Nav wordmark now splits Benchmark / Heaven in ink and brand blue like the artwork |
| R7.2 | Favicon / apple-touch / og from the new logo | implemented | `ux-evidence/iter2-live/verification-iter2.json` | one generator writes favicon, 180 px touch icon, 192/512 PWA icons (now in the manifest), both wordmarks, OG SVG+PNG and two 512 px marks. Checked rendered at 16/32/48 px |
| R7.3 | Dark-mode logo variant, switched with the theme | implemented | `ux-evidence/iter2-live/logo-dark.png` + `verification-iter2.json` | the artwork is a light-background logo; the dark variant is ours (lifted luminance). BrandMark reads CSS variables, so it follows the theme toggle with no second component. Hermes' claimed `public/benchmark-heaven-logo-dark.svg` did **not** exist |
| R8.1 | Release-post-style benchmark comparisons and listings | implemented | `/opt/benchmarkheaven/state/ux-evidence/iter5-live/verification.json`, `/opt/benchmarkheaven/state/ux-evidence/iter5-legacy/verification.json` | **Review 2026-09-13:** default (no selection) `/compare` overflowed a 390 px phone (cards 429 px) — fixed in the review commit, needs re-verify by a non-implementer. `/compare` now adds measured-only topic cards with relative 0–100 positions, preserves missing/low-sample gaps, and highlights best measured relative positions in the exact comparison table. `/charts` links to the report. Both hosts pass desktop/mobile evidence. |
| R9.1 | Full fresh data run, every live source dated today | open | `ux-evidence/iter6-refresh-failure/` | Iteration 6 collected all seven live sources successfully in two clean transactions, but both were correctly held before publication because the free live-review workers timed out/incompletely returned on the AA contract in all three bounded rounds. No fresh dataset or deployment claim is accepted. Retry after worker transport recovers. |
| H1 | Historical snapshots of all benchmark scores | open | `REVIEW-20260913T002002Z.md` #1 | review: retained states cover only the 75-entry registry; AA Intelligence/Coding Index, ECI, DesignArena Elo are not retained (the approved AA withdrawal in `716a2b0` dropped a row with no history) |
| H2 | Bridged comparison via anchor models, uncertainty reported | implemented (multi-hop) | `test/benchmark-history-chain.test.mjs` (8 tests), commits `7d077b0` + `9628f6e`, `ux-evidence/iter7-b3/live-2/` | **Iteration 7:** chains over intermediate retained snapshots *and* re-based versions (S0→S1→current, v1→v2→v3), ≤ 3 hops, each hop passes the single-hop gate, summed relative IQR ≤ 50 %, direct hop preferred; Elo chains rank shifts (fixed `rankIn` sending off-board values to the bottom). Estimates publish `hops`, `path`, `chain_iqr_relative`. All 567 existing estimates unchanged. Real data has 0 multi-hop cases today (only 2 retained states). Live on `9628f6e`: `/api/benchmark-view?axis=aa-automationbench::1.0.6@@Published%20board@@fraction` still serves its 2 historical estimates (`ux-evidence/iter7-b3/live-2/h2-api.json`). **Gap found live:** the view projection flattens estimates (`bridgeCount`, `aggregate`, `spread`, `reason`, `note`) and does not carry `hops` / `path` / `chain_iqr_relative`; they exist in `dataset.json` only, and a multi-hop estimate would be recognisable in the API only by its `note`. Next: add them to the projection in `lib/benchmark-view.mjs` and to `API.md`. **Still open inside H2:** headline scores (AA indices, ECI, Elo boards outside the registry) are not bridgeable until H1 retains them |
| H3 | UI filter "better than model X in category Y" | open | — | |
| B1 | Benchmaxxing tab in Advanced | verified | `ux-evidence/review-20260913T002002Z/*-benchmaxxing.png` | review (claude-opus, Hermes-built): 200 at desktop+mobile, light+dark; nav tab; method anchor |
| B2 | Method identifying strong-on-some / weak-on-others | implemented | `REVIEW-20260913T002002Z.md` #3–4 | topic-local percentile jump; tag quality blocked by B3 |
| B3 | Missing scores must not bias the result | implemented | `ux-evidence/iter7-b3/bm-audit-after.txt`, `ux-evidence/iter7-b3/live/verification.json` | **Iteration 7 (`004f8dc`):** score = within-topic mean absolute percentile difference over *all* measured pairs (order-independent), weighted by n−1; published only with ≥ 6 related comparisons over ≥ 2 topics; shrunk toward the catalog mean by n/(n+k), k by empirical Bayes (min 2). Real data: 174 scored / 18 tagged (was 574 / 58); tagged 3/21 at 6–7 comparisons, 5/74 at 8–10, 0/36 at 11–13, 10/43 at ≥ 14 — no longer falling with coverage; minimum comparisons among tagged = 6. Tests: floor, order invariance, synthetic equal-noise catalog, real-data "rate must not collapse with coverage". Live 174/18 at desktop + mobile |
| B4 | Benchmaxxing tag in overview table + tab | implemented | `ux-evidence/iter7-b3/live/verification.json` | one shared `benchmaxxingSignals()` feeds the overview badge and `/benchmaxxing` (18 badges in the top-25 table live, both widths, no overflow). Needs a non-Claude verifier |
| B5 | Small-print method explanation | verified | `ux-evidence/iter4-live/verification.json` | Advanced Overview carries a restrained explanation and link to `/benchmaxxing#method`; the dedicated method disclosure is now addressable by that anchor. |
| B6 | Many-axis radar, similar topics clockwise-adjacent | verified | `ux-evidence/review-20260913T002002Z/desktop_light-benchmaxxing-full.png` | review: 214-axis radar live in all 4 combos, topic-grouped, gaps for missing; mobile overflow fixed in the review commit |
| B7 | Jaggedness weighs heavily; specialisation not penalised | implemented | `REVIEW-20260913T002002Z.md` #4, `test/benchmax-jagged.test.mjs` | zig-zag > smooth specialisation still proven. Iteration 7 removed the alphabetical-order critique (all-pairs spread, order-invariance test). **Remaining, documented on `/benchmaxxing#method`:** percentiles are bounded, so a model at the top of most boards has less room to vary than a mid-field one |
| X1 | Autonomous on Sandy with engine fallback | implemented | — | `bin/tick.sh` cron |
| X2 | Codex never above 80 % weekly | open | — | enforced by `iterate.sh`; recorded check 2026-09-13 00:07 UTC: codex 65 % weekly (`~/.agent-budget.json`); needs a final record |
| X3 | Fable 5.1 design passes happened and were implemented | in-progress | `ops/ux-2026-09-12/DESIGN-DIRECTIVES.md`, `ux-evidence/fable-20260913/` | first Fable 5.1 pass 2026-09-13: 12 directives F-01…F-12 with acceptance checks; F-01 (compact hero) + R3.1 done by Fable, F-04 delegated to Kimi K3 and reviewed; F-02…F-12 open for implementers |
| X4 | UI meets the design bar | open | `DESIGN-DIRECTIVES.md` "Verdict" | fails today on: key message below the fold, no chart in Simple, jargon on the surface, unreadable 214-axis radar, Advanced opening on 6 rows — each has a directive |
| X5 | CHANGELOG / API.md / fork-sync prompt updated | open | — | |
| X6 | Final line-by-line completeness audit | open | — | |
| X7 | Final Telegram to Florian | open | — | |
| D1 | Blend default 20 is not a selectable option | implemented | `ux-evidence/iter1-live/verification.json` | blend 20 is a real option; settings key bumped to v7 to discard the broken payload |
| D2 | Reset restores `excludeChinese = true` against its default | implemented | `components/GlobalFilters.tsx` | Reset restores every documented default; `defaultMinFor("composite")` is now 85 so a clean page is not reported as modified |
| D3 | `#benchmarks` shows composite slots, not benchmark count | implemented | `ux-evidence/iter1-live/verification.json` | see R2.2 |
| E1 | ECI (general + software engineering) into the Composite, with scraping recipe in the update mechanism | verified | `ux-evidence/iter3-live/eci-verification.json` | Epoch AI source collected 264 general / 101 software rows; 130 families mapped conservatively, 134 source models retained unmatched. Composite is now seven equal native/percentile-normalized slots; source and H2 recompute provenance are documented. Awaiting independent-engine verification. |
| E2 | Secondary/community benchmarks (Vals AI, CursorBench, Apprentice Bench, DeepSWE, FrontierBench, RealSWE, 2 X threads) — NOT in the Composite | open | — | check `data/raw/benchmarks/` and `bfeada7` first; Real-SWE looks already ingested |
| E3 | Collection method order: official API/export → structured page data → static HTML → the page's own network calls | open | — | recipes go into the skills and the daily refresh. The R4.10 collector added this iteration already follows it (SSR HTML, robots-allowed, one request, self-verifying) |
| P1 | Requirements from both Telegram chats structured as a PRD, independently reviewed before the ledger is declared complete | open | — | reviewer must be a different engine than the author |
| P2 | Cited capability comparison against Artificial Analysis; close the gaps that matter | open | — | AA is the named reference comparator |
| P3 | Do not stop before P2 is achieved | open | — | |
| P4 | Positioning claims only in a form the live coverage numbers support | implemented | `DESIGN-DIRECTIVES.md` §R3.1 | superlative "every benchmark result" removed; "most complete" is backed by the generated counts line under the H1; "only place … really costs you" is Florian's explicit ask — carry to X7 |
| F1 | Gauntlet-loop quality: simple, elegant, intuitive, perfect UI, yet complete | in-progress | `DESIGN-DIRECTIVES.md` | Fable pass judged against exactly this bar; see Verdict section |
| C1 | One writer only until `ALL-ACCEPTED`; do not race another agent in this repo | open | — | iteration 1 saw only expected ops commits from the workstream's own setup and rebased cleanly |

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
