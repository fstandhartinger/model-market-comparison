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
| R2.1 | Remove Channels / Top provider channels columns | implemented | `ux-evidence/iter1-live/verification.json` | from `f59c021`; re-checked live — neither column string is rendered |
| R2.2 | Add #benchmarks and #providers columns | implemented | `ux-evidence/iter1-live/verification.json` | now `benchmark_count` from `benchmark_results.coverage.by_model[].available` — observed 14–20, i.e. no longer the 0–5 composite slots |
| R3.1 | New hero claim (most complete collection + realistic cost) | implemented | `ux-evidence/iter1-live/verification.json` | claim is generated from the dataset (13,924 results · 75 benchmarks · 839 models) so it cannot drift; also in metadata, OG, footer, README, brand SVGs. **Pending Fable 5.1 final wording (X3).** |
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
| R8.1 | Release-post-style benchmark comparisons and listings | open | — | `ChartsBoard`/`BenchmarkCompare` exist; not yet to the bar |
| R9.1 | Full fresh data run, every live source dated today | open | — | |
| H1 | Historical snapshots of all benchmark scores | implemented | — | `573ea60`; `benchmark_results.historical` present — needs audit |
| H2 | Bridged comparison via anchor models, uncertainty reported | implemented | — | `573ea60`; needs multi-hop + re-basing tests |
| H3 | UI filter "better than model X in category Y" | open | — | |
| B1 | Benchmaxxing tab in Advanced | implemented | — | `BenchmaxxExplorer`; needs live verify |
| B2 | Method identifying strong-on-some / weak-on-others | implemented | — | topic-local percentile jump; critique pending |
| B3 | Missing scores must not bias the result | implemented | — | coverage suppression; needs test audit |
| B4 | Benchmaxxing tag in overview table + tab | open | — | tab only, not in the overview table |
| B5 | Small-print method explanation | open | — | |
| B6 | Many-axis radar, similar topics clockwise-adjacent | implemented | — | `BenchmaxxingReport`; needs live verify |
| B7 | Jaggedness weighs heavily; specialisation not penalised | implemented | — | `test/benchmax-jagged.test.mjs`; needs critique |
| X1 | Autonomous on Sandy with engine fallback | implemented | — | `bin/tick.sh` cron |
| X2 | Codex never above 80 % weekly | open | — | enforced by `iterate.sh`; needs a recorded check |
| X3 | Fable 5.1 design passes happened and were implemented | open | — | no `DESIGN-DIRECTIVES.md` yet |
| X4 | UI meets the design bar | open | — | |
| X5 | CHANGELOG / API.md / fork-sync prompt updated | open | — | |
| X6 | Final line-by-line completeness audit | open | — | |
| X7 | Final Telegram to Florian | open | — | |
| D1 | Blend default 20 is not a selectable option | implemented | `ux-evidence/iter1-live/verification.json` | blend 20 is a real option; settings key bumped to v7 to discard the broken payload |
| D2 | Reset restores `excludeChinese = true` against its default | implemented | `components/GlobalFilters.tsx` | Reset restores every documented default; `defaultMinFor("composite")` is now 85 so a clean page is not reported as modified |
| D3 | `#benchmarks` shows composite slots, not benchmark count | implemented | `ux-evidence/iter1-live/verification.json` | see R2.2 |
| E1 | ECI (general + software engineering) into the Composite, with scraping recipe in the update mechanism | implemented | `ux-evidence/iter3-live/eci-verification.json` | Epoch AI source collected 264 general / 101 software rows; 130 families mapped conservatively, 134 source models retained unmatched. Composite is now seven equal native/percentile-normalized slots; source and H2 recompute provenance are documented. Awaiting independent-engine verification. |
| E2 | Secondary/community benchmarks (Vals AI, CursorBench, Apprentice Bench, DeepSWE, FrontierBench, RealSWE, 2 X threads) — NOT in the Composite | open | — | check `data/raw/benchmarks/` and `bfeada7` first; Real-SWE looks already ingested |
| E3 | Collection method order: official API/export → structured page data → static HTML → the page's own network calls | open | — | recipes go into the skills and the daily refresh. The R4.10 collector added this iteration already follows it (SSR HTML, robots-allowed, one request, self-verifying) |
| P1 | Requirements from both Telegram chats structured as a PRD, independently reviewed before the ledger is declared complete | open | — | reviewer must be a different engine than the author |
| P2 | Cited capability comparison against Artificial Analysis; close the gaps that matter | open | — | AA is the named reference comparator |
| P3 | Do not stop before P2 is achieved | open | — | |
| P4 | Positioning claims only in a form the live coverage numbers support | implemented | `app/layout.tsx`, `app/page.tsx` | hero counts are generated from the dataset; the meta description's "most complete … anywhere" superlative was removed this iteration |
| F1 | Gauntlet-loop quality: simple, elegant, intuitive, perfect UI, yet complete | open | — | Fable 5.1 design passes judge against exactly this |
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
