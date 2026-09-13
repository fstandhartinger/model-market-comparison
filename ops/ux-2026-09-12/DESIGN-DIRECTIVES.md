# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 4: 2026-09-13 12:00 UTC**, against live revision `1b17731` (https://benchmarkheaven.com).
Evidence: `/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass4/` — 73 screenshots +
`metrics.json` (desktop 1440×1000 and mobile 390×844, light and dark: Simple, Advanced incl.
expanded row, Guided steps 1–4, Filters, Benchmaxxing, model page, Benchmarks, Charts), plus
`desktop_light-compare*.png`, `desktop_light-subscriptions-open.png` and the DOM checks in
`/tmp/fable-checks.mjs` / `/tmp/fable-leak.mjs` (copied to `…/pass4/checks/`). Pass 3 is in
`…/fable-20260913-pass3/`, pass 2 in `…/fable-20260913-pass2/`, pass 1 in `…/fable-20260913/`.

**The bar (Florian):** minimalistic and simple, very expressive, not overloaded, key messages
first, graphical with many charts.

**How to use this file.** Directives are numbered `F-nn`, ordered by value. Each has *Where*
(files), *What* (implementable spec), *Accept* (what the reviewer checks live). Implementers
take the top open directive, ship it, move its row to the *Done log* at the bottom with the
commit hash and evidence path. Do not re-interpret a directive; if it cannot be done as
written, leave it open and write why under it. Fable decides, others implement.

**Delegation hint.** `[mechanical]` directives are safe for `bin/delegate.sh --kimi` (clear
spec, no numbers to invent); `[judgment]` ones need Claude Opus 5 or Codex Luna. Every
delegated diff is reviewed before it lands.

---

## Verdict on the live site — pass 4 (2026-09-13)

The pass-3 backlog shipped and holds live: model page 2,433 px / 4,062 px, phone Advanced
toolbar 54 px with a Refine sheet, Benchmaxxing rows 53 px with orange signal bars, phone
value map with a scale, Benchmarks page contained at 390 px, slider histograms visible with
end labels, no accent-filled toolbar button in a fresh Advanced session. The Simple view now
answers Florian's question on one screen: two sliders, a value map, six recommended rows.
The Guided wizard is the reference for tone. The model page reads like a release post.

**What still fails the bar, in order of damage:**

1. **Dark mode value map had invisible labels.** The point labels were filled with
   `rgb(var(--text))`, but `--text` is a hex colour, so every label fell back to black —
   unreadable on the dark card in Simple, Advanced and the Guided results. → fixed in this
   pass (**F-29**, Fable, surgical, commit `2e4abce`).
2. **Guided leaked into Simple.** Visiting the wizard called `setMinScore(0)`, which marked
   the floor as user-touched; Simple afterwards opened at 70 with 14 rows instead of 85 with
   6. Every user who tries Guided and returns gets a different Simple than the one the page
   promises. → fixed in this pass (**F-30**, Fable, surgical, `2e4abce` + `9840328`).
3. **A model with "# benchmarks = 1" has a Composite built from 5 inputs.** "Fable 5 (high)"
   ranks 4th in Advanced with `1` in the benchmarks column while its model page shows AA
   Coding 76.5, Coding Agent 65.1, AA Intelligence 49.7, both ECIs and DesignArena as
   Composite inputs and "1 of 75 registered benchmark versions" in the sheet. The two counts
   contradict each other on the same screen. → **F-32** (judgment; data identity, not CSS).
4. **Advanced repeats two labels on every row.** `5/7 inputs` under every score and `est.`
   after every cost: 236 small labels on 118 rows that carry no per-row information, because
   almost no model has 7/7 and every adjusted cost is modeled. → **F-31**.
5. **Compare is 6,743 px** at 1440 px with two models: the full benchmark table repeats
   "measured", the source link, the observed date and an Evidence disclosure in every cell.
   This is the R8.1 release-post surface and it is the least release-post-like page. → **F-35**.
6. **Benchmaxxing:** the signal card is 640 px tall for 300 px of content; on phones the
   radar's sector labels render at 7 px (SVG text inside a scaled viewBox). → **F-33**
   (delegated this pass to Kimi K3 in `.worktrees/f33`).
7. **Benchmarks page** opens with three stat boxes of which one is a unit ("points") styled
   as a number and one is a maintenance counter ("0 source identities not yet matched"), a
   checkbox for that empty set, and the sentence "Coverage above uses the evidence filter
   before model filters." The ranking is a table of numbers without a single bar. → **F-34**
   (delegated this pass to Kimi K3 in `.worktrees/f34`).
8. **Micro-defects:** "Personal use only" in the subscription list is orange (orange is
   reserved for the Benchmaxxing tag); the model page prints "Protocol-compatible
   measured/vendor divergences — No verified … pair is available" when there is nothing to
   say; the Simple slider is labelled "Minimum Composite" while the table header says
   "Score (Composite)". → **F-36**, **F-37**, **F-38**.

## Decisions on the pass-4 questions

1. **P4 / hero line 2 — keep the wording, record the fallback.** Artificial Analysis shows a
   list-price cost per task; it does not price the provider route a reader's own filters
   leave open, with that route's cache prices, nor a subscription break-even. "What each model
   really costs *you*" is the claim, and the Adjusted Cost (i) and the methodology page must
   say exactly that distinction (they do). If Florian wants an exclusivity-free line, the
   fallback is: *"And the only place that prices each model the way you would actually buy
   it."* Put both in X7; do not change the live line without him.
2. **R5.2 cost-descending Simple — keep** (pass 3 decision stands; six rows read as
   "premium first, bargain last", Score stays sortable).
3. **F-25 sub-label rule is revised by F-31.** Coverage pips replace the text; the hatch for
   fewer than three inputs stays.
4. **"est." moves from the cell to the header** (F-31): the column already says "Adjusted"
   and carries an (i); a per-row suffix repeated 118 times is noise, while the orange
   "assumed task" flag is real per-row information and stays.

---

## R3.1 — Hero claim (decided in pass 1, confirmed in pass 2)

> **The most complete collection of AI model benchmarks.**
> **And the only place that shows what each model really costs you.**

Line 2 accent-coloured. The muted counts line underneath is generated from the dataset.
"Every benchmark result" is not used anywhere (hero, meta, OG, footer). Rejected: Florian's
draft ("All benchmark results for every model, in one place. The most realistic cost estimate
for each model.") — "all" over-reaches (P4) and "most realistic" is weaker than the "only" he
asked for.

---

## Directives (open)

> **Status 2026-09-13 pass 5 (Codex implementation):** F-08a/F-08b and F-22 … F-30 are done and live;
> F-35 … F-38 are now implemented and live on `085207b` (see the Done log), pending a non-Codex
> verifier. The remaining open directives below are ordered by value.
> **Previous status, pass 4 (Fable):** F-08a/F-08b and F-22 … F-28 were done and live
> (Done log). F-29 and F-30 were fixed by Fable in this pass. The list below is the complete
> remaining design backlog, ordered by value. F-33 and F-34 were delegated to Kimi K3 in this
> pass; their diffs are reviewed by Fable before they land (see the Done log for the outcome).

### F-32 `[judgment]` One model, one benchmark count
*Where:* `lib/client-model.ts` (`benchmark_count` = `benchmark_results.coverage.by_model[id].available`),
`scripts/build-dataset.mjs` (benchmark_results coverage and Composite input attachment),
`components/BenchmarkSheet.tsx`.
*What:* the "# benchmarks" column and the model-page sheet count must include every
benchmark result the Composite consumed for that configuration. Live contradiction:
`/models/claude-fable-5%3A%3Ahigh` shows Composite 92.9 from AA Coding 76.5, Coding Agent
65.1, AA Intelligence 49.7, Epoch ECI 163.4 (attached), Software ECI 165.9 (attached) and
DesignArena 1274/1281, yet "1 of 75 registered benchmark versions" and `# benchmarks = 1`
in Advanced. Either the AA Coding, Coding Agent, AA Intelligence and DesignArena rows are
registered results for this configuration (then the sheet and the count must show them), or
they are variant/family-attached values (then the model page must label them "attached
from <configuration>" with the (i), exactly as it already does for the ECIs, and they must
not count as this configuration's own evidence in the Composite coverage `5/7`). Find the
cause in the build (most likely: the AA snapshot rows are keyed by a different
configuration name than the registry rows), fix it at the source, and add a test that for
every model `benchmark_count ≥ number of non-attached Composite inputs`.
*Accept:* for every row in Advanced, `# benchmarks` ≥ the number of Composite inputs that are
not marked attached; the Fable 5 (high) page lists its AA index rows in the sheet or marks
them attached; the new test passes; no Composite value changes for models whose inputs are
all registered.

### F-31 `[mechanical]` Advanced rows: coverage pips, "est." in the header
*Where:* `components/ModelExplorer.tsx` (Score cell, cost cell, `Th` for Adjusted Cost),
`components/BenchmarkSheet.tsx` / model page top-5 table (same "est." rule).
*What:*
- **Score cell:** replace the `n/7 inputs` text sub-label with seven **coverage pips**: a
  right-aligned row of 7 squares, 4×4 px, 2 px gap, filled `accent` for a present input,
  `border-line` hollow for a missing one; rendered only when the Composite is the active
  score and coverage < 7; `title` and `aria-label` = "5 of 7 Composite inputs". The hatch
  rule for < 3 inputs is unchanged. Nothing is rendered at 7/7.
- **Cost header:** "Adjusted Cost" gets the same sub-label pattern as Score: a muted 11 px
  `(modeled $/task)` on the second header line. Remove the `est.` suffix from every cost
  cell in the overview (both modes) and from the model page's top-5 and per-platform
  tables (`/task est.` → `/task`). The orange **`assumed task`** flag stays exactly as it is.
- **Cost (i):** first sentence becomes *"Every adjusted cost is a modeled estimate: …"* so
  the word "estimate" is still on the page.
*Accept:* in Advanced no cell contains the string `est.` and no cell contains `/7 inputs`;
rows with coverage < 7 show a 7-pip row (`[aria-label$="Composite inputs"]`); the Adjusted
Cost header contains "(modeled $/task)"; the "assumed task" flag is still present on the
Fable 5 (high) row; Simple is unchanged apart from the header sub-label and the missing
`est.`; the model page top-5 table shows `$4.378 /task` for Claude Opus 5 (high).

### F-35 `[judgment]` Compare: a release-post table, not a provenance dump
*Where:* `components/CompareView.tsx` (full benchmark table, radar axis table),
`components/BenchmarkSheet.tsx` (reuse the F-08b row pattern).
*What:*
- **Full benchmark table:** one row per benchmark version, one column per model. A cell is
  the native value (bold if best in row, cell tinted `accent/8` as the green tint is today
  — use the accent, not green, unless "best" means "cheaper") plus a 4 px percentile bar
  beneath it (catalog percentile, same as the model page sheet). "measured" badges, source
  links, observed dates and the Evidence disclosure move into a **per-row expand** (chevron
  at the row start, F-08b pattern). "Unknown / no published match" cells render `—`.
- **Radar axis table** under the Benchmark radar becomes a disclosure "Axis values and
  normalisation" (closed by default).
- **"Where each model is strongest"** stays as it is — it is the best block on the page.
- Category headings stay; the "Find a benchmark" search and category select stay.
- Unusual-results panels at the end: render only for models that have a flag; drop the
  "Protocol-compatible …" paragraph (F-36 rule).
*Accept:* `/compare` with GPT-5.6 Sol (high) vs Claude Sonnet 5 (high) is ≤ 3,500 px at
1440 px and ≤ 6,000 px at 390 px; the string "observed 2026-" appears 0 times outside an
open expand; each row shows one bar per model with a value; the best value per row is bold.

### F-33 `[mechanical]` Benchmaxxing: card self-height, readable phone sector labels — delegated (Kimi K3, `.worktrees/f33`)
*Where:* `components/BenchmaxxingReport.tsx`.
*What:* the `<aside>` signal card gets `self-start`; the radar's topic labels leave the SVG
and become absolutely positioned HTML spans (11 px) over a `relative` wrapper, positioned by
`x/size`, `y/size` percentages, so they keep 11 px at 316 px as well as at 640 px.
*Accept:* at 1440 px the signal card is ≤ 360 px tall; at 390 px the labels "Writing",
"Agentic", "Coding" have a rendered height ≥ 10 px; no label overlaps the plot.

### F-34 `[mechanical]` Benchmarks page: one coverage line, a bar per result — delegated (Kimi K3, `.worktrees/f34`)
*Where:* `components/BenchmarkRanking.tsx`.
*What:* the three stat boxes become one sentence (`636 of 839 catalog configurations have a
result · unit: points · higher is better`), with "· n source identities not yet matched"
only when n > 0; the "Include unmatched source identities" checkbox appears only when n > 0;
the status line is `636 results`; each Result cell gets a 4 px accent bar relative to the
top value (omitted for Elo units, where a bar from zero says nothing); the first row's model
name is semibold.
*Accept:* `/benchmarks` shows no "Source identities not yet matched" box for AA Intelligence
Index, no "Coverage above uses" sentence, ≥ 25 bars in the ranking; page height at 1440 px
≤ 2,700 px.

### F-36 `[mechanical]` Model page: say nothing when there is nothing to say
*Where:* `components/BenchmarkEvidence.tsx` (AnomalySummary), `components/ModelDetailOffers.tsx`
(GitHub Copilot card).
*What:* the "Protocol-compatible measured/vendor divergences" heading and its "No verified
protocol-compatible vendor/measured pair is available for this model; agreement cannot be
assessed." sentence render only when at least one pair exists (then keep the wording). The
lone "GitHub Copilot" card gets the eyebrow **Subscription plan** above its title and moves
directly above "Token offers by platform".
*Accept:* `/models/claude-opus-5%3A%3Ahigh` body text does not contain "Protocol-compatible";
the Copilot card has the eyebrow and sits above the token offers disclosure.

### F-37 `[mechanical]` Subscriptions list: neutral badges, footnote for uncollected plans
*Where:* the "Would a subscription be cheaper?" component on `/` (`components/Subscription*.tsx`).
*What:* "Personal use only" and "Company use unclear" become neutral `bh-badge` chips (muted
text, `border-line`), not orange text. Plans whose price and quota were not collected
(ChatGPT Plus / Pro, SuperGrok) leave the table and become one muted footnote line under it:
*"Not collected: ChatGPT Plus / Pro, SuperGrok — the vendor sites refuse automated reads."*
When "I'm buying for a company" is on, plans that companies may not use are hidden (as now)
and the header count says so (`9 plans · 5 hidden for company use`).
*Accept:* no orange (`text-warn`) text inside the disclosure; the words "not collected" occur
once, in a footnote; the row count drops by two.

### F-38 `[mechanical]` Simple: label and small print
*Where:* `components/ShortlistControls.tsx`, `components/ModelExplorer.tsx` (small print).
*What:* slider label "Minimum Composite" → **"Minimum score"** with `(Composite)` in 11 px
muted after it (same pattern as the table header; follows the score selector). Small print
under the Simple table becomes one line: *"Underlined prices open their inputs and sources ·
How we calculate adjusted cost · Only models with measured task-token usage are ranked here;
Advanced can relax that."*
*Accept:* the Simple card shows "Minimum score"; the small print is a single paragraph ≤ 200
characters with the methodology link intact.

---

## Design system notes (apply while touching any file above)

- **Type:** display serif (`--brand-serif`) only for the H1 on `/` and page titles; everything
  else the system sans. No serif in cards.
- **Colour:** accent blue for interactive and for magnitude bars; categorical colours only
  for organisation dots and Benchmaxxing topic sectors; green reserved for "passes / cheaper /
  Pareto", orange reserved for the Benchmaxxing tag. Never tint a table bar by organisation.
- **Density:** one explanatory sentence per block, at most; everything else is an (i) or a
  disclosure. Numbers in tables are `tabular-nums` and right-aligned.
- **Charts** follow the dataviz rules: data-driven axis domains with *round* ticks, labels on
  the marks when ≤ 12 marks and never overlapping, muted gridlines, the same palette in light
  and dark.
- **Mobile:** no element wider than 390 px; tables drop columns (F-14 order) before they
  scroll; charts are ≥ 200 px tall or not rendered.
- **Controls:** icon-only buttons are 40×40 with `aria-label` and `title`; popovers, not
  inline `<details>` boxes, for secondary filters.

---

## Independent verification 2026-09-13 (claude-opus, iteration 14) — kept for the record

Live revision `0e7380c`, script `ops/ux-2026-09-12/bin/verify-directives-indep.mjs`, evidence
`/opt/benchmarkheaven/state/ux-evidence/iter14-indep-review/verification.json`.

| Directive | Implementer | Result |
|---|---|---|
| F-02 | Codex Luna | **verified** — nav 59 px at both widths, Filters button in the nav, no second filter bar, no "Radar" in the top nav |
| F-03 | Codex Luna | **verified** — 2 sliders, compact value map, summary "6 models pass", third row ends at 1,099 px |
| F-05 | Codex Luna | **verified** — score and cost bars 4 px under every row, one colour for all score bars |
| F-12 | Codex Luna | failed as shipped (185 px), fixed in iteration 14 — needs a non-Claude re-check |
| F-01 | Fable | desktop fold fails (first row 958 px) — **superseded by F-13** |
| F-06 | Claude Opus | 16 rows because Featured stays on — **superseded by F-16** |

## Done log

| Directive | Commit | Evidence | Verified by |
|---|---|---|---|
| R3.1 hero claim + meta/OG/footer text | `76d8f86` (Fable) | `ux-evidence/fable-20260913/local/`, `…/after/` | Fable pass 2 re-checked live (`b3a1453`): hero text and counts line correct at both widths |
| F-01 compact hero (eyebrow and stat boxes gone, one counts line, smaller display) | `76d8f86` (Fable) | `ux-evidence/fable-20260913-pass2/desktop_light-simple.png` | hero part done; the fold acceptance moved to F-13 |
| F-04 small print under the table, caption into the Score (i), short score labels in Charts/Scatter/select | `76d8f86` (Kimi K3, reviewed by Fable) | `ux-evidence/fable-20260913/after/` | pass 2: done on `/`; residual jargon on `/charts` → F-20 |
| F-02 one-row responsive nav, Filters button and sheet | `e573ef6` (Codex Luna) | `ux-evidence/iter14-indep-review/` | verified (claude-opus) |
| F-03 Simple value map: sliders, compact scatter, pass summary | `e573ef6` (Codex Luna) | `ux-evidence/iter14-indep-review/` | verified (claude-opus); layout superseded by F-13, labels by F-17 |
| F-05 ranking magnitude bars | `649804a` (Codex Luna) | `ux-evidence/iter12-f05-live/` | verified (claude-opus) |
| F-06 mode-scoped score minimum | `a36fcc6` (Claude Opus) | live: Advanced 16 rows | superseded by F-16 |
| F-07 many-axis radar: sectors, measured spokes, topic-local lines, coverage-aware default | `a21eec3` (Codex Luna) | `ux-evidence/iter11-f07/` | pass 2: geometry good; label overprint and table → F-19 |
| F-09 Charts: short names, one accent colour, dot-strips, "Score vs cost" card | `3eef2f0` (Claude Opus) | `ux-evidence/iter14-f09/` | pass 2 live check OK (4 cards, one bar colour); control-bar jargon → F-20 |
| F-10 wizard polish | `0e7380c` + `638f047` (Claude Opus) | `ux-evidence/iter14-f11/` | pass 2 live check OK: step 1 footnote one line, results step shows the map, "Change answers" primary |
| F-11 scatter axis and intro | `638f047` (Claude Opus) | `ux-evidence/iter14-f11/` | pass 2: done except the "N models → filters" link, folded into F-18 |
| F-12 concise footer | `4d4783c`, `ad59d65` (Codex Luna / Claude Opus) | `ux-evidence/iter8-final/` | pass 2 live: footer is wordmark + claim line + one sources sentence + three links |
| F-13 one shortlist card (sliders + 240 px map side by side at lg; sliders side by side, 200 px map on phones) | `21ff9e8` (Kimi K3, reviewed) + `939b278` (Claude Opus: phone trims) | `ux-evidence/review-20260913T075003Z-fable-postfix-canonical/`, `…-legacy/` | **verified by codex-luna:** first row 669 px / 6 rows at 1440×1000, 757 px at 390×844; 0 label overlaps |
| F-14 phone table Model · Score · Cost | `21ff9e8` (Kimi K3) + `939b278` (col widths fixed: hidden cells had shifted Score onto a 0-width column) | same | **verified by codex-luna:** exactly 3 header cells at 390 and 6 at 1440, `scrollWidth` = viewport |
| F-15 header: icon-only theme toggle, Filters · Menu · theme, underline active item | `afa8d26` (Fable) + `21ff9e8` (Kimi K3) | same | **verified by codex-luna:** theme button 40×40 with no text, header 59 px, both themes and widths |
| F-16 Advanced opens on the full catalog; H3 popover; honest "· filtered" | `a0a7703` (Claude Opus) | `ux-evidence/review-20260913T075003Z-f16-postfix-canonical/`, `…-legacy/` | **verified by codex-luna:** Advanced 118 rows, one desktop toolbar row, Simple remains 85+ and featured-only after Advanced, no ★ in Simple |
| F-17 value map: collision-free labels, round ticks, frontier over passing points, 200 px phone map | `939b278` (Claude Opus; the Kimi delegation produced nothing in 50 min and was stopped) | `ux-evidence/review-20260913T075003Z-f18-postfix-canonical/`, `…-legacy/` | **verified by codex-luna:** 0 overlaps/clipped labels, round ticks 60…100, 240 px desktop / 200 px phone map |
| F-18 Filters overlay (desktop popover, phone bottom sheet), `openFilters()`, count links | `939b278` (Claude Opus) + `8d950fb` (Codex Luna header layering correction) | same | implemented; live acceptance passes, but this gate changed the header layering and does not mark its own fix verified |
| F-20 Charts control bar and one-sentence intro | `21ff9e8` (Kimi K3, reviewed) | `ux-evidence/review-20260913T075003Z-fable-postfix-canonical/`, `…-legacy/` | **verified by codex-luna:** no "fixed inputs" / "Coding Agent v1", intro 102 chars on both hosts |
| F-19 Benchmaxxing title, ring labels, signal table and tagged selector markers | `0c37a18` (Codex Luna) | `/opt/benchmarkheaven/state/ux-evidence/iter18-f19-live/` | implemented; needs a different engine to verify |
| F-19 Benchmaxxing title, ring labels, signal table | `0c37a18` (Codex Luna) + title size fix (Fable, pass 3) | `ux-evidence/fable-20260913-pass3/*-benchmaxxing*.png` | **verified by Fable (pass 3):** H1 "Benchmaxxing", 10 default rows, "Show all 18 tagged", Other-legend, 390 px contained; density re-specified in F-24 |
| F-21 Compare/Radar definition disclosure removed | `299efad` (Codex Luna) | `ux-evidence/review-20260913T085002Z/` | verified by Fable (pass 3): no "Composite definition" on `/compare`, `/radar`; model page copy removed in pass 3, `/benchmarks` copy → F-27 |
| F-22 Simple value map plots exactly the ranked pool (`measuredOnly` prop) | pass 3 (Fable, surgical) | `ux-evidence/fable-20260913-pass3/after-live/verification.json` (live `3a32a27`: 6 rows = 6 full dots at both widths) | needs a non-Fable verifier |
| F-08a model page trims: raw columns and Evaluation-group column hidden below `md`, "Unusual results" only when flagged and after the sheet, no Composite disclosure | pass 3 (Fable) | same file (live `3a32a27`): phone top-5 shows `# · Provider · Adjusted $/task`, no "Composite definition", height 10,112 → 7,978 px at 390 | needs a non-Fable verifier; the Variants table still reaches 486 px at 390 → F-08b |
| F-08b model page: Composite headline + six-axis percentile mini radar + native caption strip; per-category bar-row sheet with provenance in a row expand; token offers folded | `74b5a2d` (Claude Opus, iterations 20–21) | `/opt/benchmarkheaven/state/ux-evidence/iter21/live-canonical/`, `…/live-legacy/` (`bin/verify-iter20.mjs`) | live: 2,433 px at 1440 / 4,062 px at 390, rows 32 px, 19/19 rows with bar + percentile, radar 220 px, no table wider than viewport; needs a non-Claude verifier |
| F-23 phone Advanced: search + Refine bottom sheet | `74b5a2d` (Claude Opus) | same | live: toolbar 54 px, first row 430 px, sheet opens/closes, desktop has no Refine; needs a non-Claude verifier |
| F-24 Benchmaxxing table: no per-row badge, orange signal bars, one-line summary, ▲ tagged marker | `74b5a2d` (Claude Opus) | same | live: 10 rows ≤ 56 px (53), 10 bars, badge once; needs a non-Claude verifier |
| F-25 thin evidence hatched (< 3 of 7 inputs), input count in Advanced | `74b5a2d` (Claude Opus) | same | live: 58 hatched rows, all labelled 0–2/7; Simple unhatched. The example "Fable 5 (high) = 1/7" was `# benchmarks`, its Composite has 5/7 inputs; needs a non-Claude verifier |
| F-26 phone value-map scale | `74b5a2d` (Claude Opus) | same | live: 5 tick labels at 390, 8 at 1440; needs a non-Claude verifier |
| F-27 Benchmarks page: Rank · Model · Result on phones, provenance in a per-row expand, 25 rows + Show more, no eyebrow, no Composite definition | `8fb9e6f` (Claude Opus, iteration 21) | `/opt/benchmarkheaven/state/ux-evidence/iter21/f27-live-canonical/`, `…/f27-live-legacy/` (`bin/verify-f27.mjs`) | live: 2,814 px at 1440 (AA Intelligence Index), 3 columns and 352 px table at 390, no overflow; needs a non-Claude verifier |
| F-28 slider histograms visible + range end labels; Evidence button neutral by default | `74b5a2d` (Claude Opus) | same | live: 4 end labels, no accent-filled button in a fresh Advanced session; needs a non-Claude verifier |
| F-29 dark-mode value-map labels (`fill="var(--text)"`) | `2e4abce` (Fable, pass 4) | `ux-evidence/fable-20260913-pass4/checks/` | needs a non-Fable verifier: label fill ≠ rgb(0,0,0) in dark |
| F-30 Guided no longer resets Simple's floor (`resetMinScore` on mount) | `2e4abce` + `9840328` (Fable, pass 4) | same | needs a non-Fable verifier: Simple shows 85 / 6 rows after Guided → Simple |
| F-35 Compare release-post table: compact native values, percentile bars and one evidence expand per benchmark row | `085207b` (Codex Luna) | `ux-evidence/iter25-f35-live/{canonical,legacy}/verification.json` and `iter25-f36-f38-live/verification.json` | implemented; needs a non-Codex verifier |
| F-36 Model page: suppress empty protocol-divergence copy; label Copilot card | `085207b` (Codex Luna) | `ux-evidence/iter25-f36-f38-live/verification.json` | implemented; needs a non-Codex verifier |
| F-37 Subscription list: neutral verdict chips and one uncollected-plan footnote | `085207b` (Codex Luna) | `ux-evidence/iter25-f36-f38-live/verification.json` | implemented; needs a non-Codex verifier |
| F-38 Simple score caption and one-line explanatory small print | `085207b` (Codex Luna) | `ux-evidence/iter25-f36-f38-live/verification.json` | implemented; needs a non-Codex verifier |
