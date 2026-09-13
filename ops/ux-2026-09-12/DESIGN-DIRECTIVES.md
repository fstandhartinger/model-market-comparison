# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

First pass: 2026-09-13, against live revision `3d4573a` (https://benchmarkheaven.com).
Evidence: `/opt/benchmarkheaven/state/ux-evidence/fable-20260913/` — 89 screenshots, desktop
1440×1000 and mobile 390×844, light and dark: Simple, Advanced (+ filters open), Guided steps
1–5, Benchmaxxing, model page, Compare, Charts, Benchmarks, Radar, Scatter, Providers, About.

**The bar (Florian):** minimalistic and simple, very expressive, not overloaded, key messages
first, graphical with many charts.

**How to use this file.** Directives are numbered `F-nn`, ordered by value. Each has *Where*
(files), *What* (implementable spec), *Accept* (what the reviewer checks live). Implementers
take the top open directive, ship it, move its row to the *Done log* at the bottom with the
commit hash and evidence path. Do not re-interpret a directive; if it cannot be done as
written, leave it open and write why under it. Fable decides, others implement.

**Delegation hint.** Directives tagged `[mechanical]` are safe for `bin/delegate.sh --kimi`
(clear spec, no numbers to invent); `[judgment]` ones need Claude Opus 5 or Codex Luna. Every
delegated diff is reviewed before it lands.

---

## Verdict on the live site (2026-09-13)

**What already works and must be kept:** the Guided wizard (steps 1–5) is the best-designed
part of the site — calm, one question per page, "1 mo … 6 mo" chips instead of abstract
scores, honest footnotes; keep it as the reference for tone. The filter panel grouping
(Ranking / Price basis / Regional / Data confidentiality / More settings) is right. The
Compare page's 6-axis radar and "Where each model is strongest" category cards are close to
the release-post look Florian asked for. Dark mode is consistent and readable everywhere.

**What fails the bar, in order of damage:**

1. **The key message is below the fold.** Desktop 1440×1000: the hero, subline and five stat
   boxes fill the first screen; not one model row is visible. Mobile 390×844: two rows of
   nav, a "Filters & settings" bar, eyebrow, headline, paragraph, five chips — the first model
   name appears at ~1,500 px. A recommendation site whose first screen recommends nothing.
2. **The recommendation list is not a picture.** Simple mode is two histograms and a
   six-row table. The one chart that carries the whole thesis — score against real cost — is
   hidden on `/scatter` and plots 9 points over an empty 0–100 axis.
3. **Jargon leaks to the surface.** "Composite (coverage-neutral, dominance-safe percentiles,
   0–100) · 7 fixed inputs; Epoch ECI 2026-09-12; Coding Agent v1.4" is printed above the
   table, in the filter select, as the Charts title and as the scatter's Y label. Three
   paragraphs of small print sit *between* the sliders and the list.
4. **The Benchmaxxing radar is unreadable.** 214 hairline spokes converge into a black blob;
   eleven yellow dots float in a grey disc; the topic labels are a left-hand list with no
   visual link to sectors. The default model (A.X-K2, 5 % coverage) shows nothing.
5. **Advanced opens on six rows of an 839-model catalog** because it inherits Simple's
   score ≥ 85 default. Advanced must open on the full ranked catalog.
6. **Micro-defects** that read as broken: the Adjusted-Cost cell's bar sits beside the number
   (looks misaligned), the score bar is tinted by organisation (reads as a category, not a
   magnitude), "clear both limits" as a button, an orange warning line in Advanced, the
   `featured` badge wrapping the model title on mobile, the model page's provider table
   cut off at 390 px.

---

## R3.1 — Hero claim (decided)

Florian asked for two statements: the most complete collection of benchmark results anywhere,
and the only site that shows realistically what a model will actually cost you. The live line
"Every benchmark result for every model" over-reaches (P4: 6 of 75 registry benchmarks have no
result; AA/ECI indices sit outside the registry). Decision:

> **The most complete collection of AI model benchmarks.**
> **And the only place that shows what each model really costs you.**

Line 2 is the accent-coloured line. Below it, one sentence carries the proof and stays
generated from the dataset: *"13,924 results · 75 benchmarks · 839 models — every one with its
source and date. Cost counts the provider you would actually use, its cache prices and hit
rates, and the tokens the model burns per task."* "Most complete" is comparative and is backed
by the numbers underneath; "every benchmark result" is not used anywhere any more (hero, meta
description, OG image, footer). Rejected: Florian's draft ("All benchmark results for every
model, in one place. The most realistic cost estimate for each model.") — "all" has the same
P4 problem and "most realistic" is weaker than "only", which he explicitly asked for.

---

## Directives

### F-01 `[judgment]` ✅ done (pass 1) — Compact hero — the list must be visible on the first screen
*Status:* hero part done; the "≥ 3 rows on the first screen" acceptance still depends on F-03/F-04 removing the blocks between hero and list — re-check after F-03.
*Where:* `app/page.tsx` (hero section), `app/globals.css` (`.bh-display`, `.bh-hero`).
*What:*
- Drop the eyebrow "BENCHMARK HEAVEN / MODEL INTELLIGENCE".
- Headline: the two lines from R3.1, `clamp(26px, 2.6vw, 38px)`, line-height 1.1.
- Replace the paragraph + five stat boxes with **one muted line** (14 px):
  `13,924 results · 75 benchmarks · 839 models · updated 2026-09-12` (numbers generated;
  the date is the dataset's `generated_at`). No "Featured" and no "Provider channels" here.
- Hero bottom margin 16 px, no divider line. Hero height target: ≤ 150 px desktop,
  ≤ 190 px mobile.
- The mode switcher (Simple / Guided / Advanced) and the first three rows of the Simple
  list must be visible at 1440×1000 without scrolling; at 390×844 the first model row must
  start above 700 px.
*Accept:* screenshot at both sizes shows ≥ 3 model rows (desktop) / ≥ 1 row (mobile) on the
first screen. `bh-eyebrow` absent on `/`.

### F-02 `[judgment]` Nav and filter bar: one row on mobile, no second header on desktop
*Where:* `components/Nav.tsx`, `components/GlobalFilters.tsx` (the "Filters & settings ·
adjusted costs" summary bar), `app/layout.tsx`.
*What:*
- Desktop: remove the full-width "Filters & settings" bar. Put a **"Filters"** button at the
  right end of the nav (icon + label, `modified` shown as a 6 px accent dot on the icon, not
  a badge). Clicking opens the same panel as a sheet below the nav.
- Mobile: nav is one row — logo, theme toggle, a "Menu" button that opens the page links; the
  "Filters" button sits in the same row. No wrapping to two or three rows.
- Nav order: Overview · Benchmarks · Compare · Charts · Benchmaxxing · More. **Remove "Radar"
  from the top nav** (the route stays; it is the Compare page under another name — link it
  from Compare's "View radar" only).
*Accept:* at 390 px the nav's bounding box is ≤ 60 px tall; at 1440 px there is exactly one
header row above the content.

### F-03 `[judgment]` Simple mode leads with a value map, not histograms
*Where:* `components/ShortlistControls.tsx`, `components/ModelExplorer.tsx`,
`components/CostCapabilityScatter.tsx` (make it embeddable: `compact` prop).
*What:* Simple = three stacked blocks, in this order:
1. **Two sliders in one row** ("Minimum score" default 85; "Max cost per task" default no
   limit), 44 px tall, value shown right-aligned in accent. The histograms move *into* the
   slider tracks as a 24 px sparkline behind the track (one colour, bars outside the current
   limit at 30 % opacity). No separate chart blocks, no explanatory sentences under the
   sliders ("Best model in view scores…", "The priciest model in view costs 6×…") — those
   two facts become the tooltip of the slider thumb.
2. **Value map:** the Cost-vs-Capability scatter of the featured pool, 320 px tall, X = adjusted
   cost (log, cheaper to the right), Y = score with a data-driven domain (`min(score)−3 →
   100`, never 0–100 when all points sit above 70). Points that fail the current limits are
   drawn at 25 % opacity; passing points carry a short label (model name). Pareto frontier on.
   One colour for points; organisation colour only on hover/tooltip. Clicking a point opens
   the model page.
3. **The list** (unchanged columns), summary line above it: `6 models pass · 8 below your
   score line` with a text link "show all 14", not a "clear both limits" button.
*Accept:* Simple at 1440 px shows sliders, scatter and ≥ 3 rows inside 1,400 px of page
height; no `<p>` between sliders and table except the summary line.

### F-04 `[mechanical]` ✅ done (pass 1) — Small print goes under the table, jargon goes into the (i)
*Where:* `components/ModelExplorer.tsx`, `components/CompositeNote.tsx`, `components/InfoTip.tsx`
callers, `components/ChartsBoard.tsx`, `components/CostCapabilityScatter.tsx`,
`components/GlobalFilters.tsx` (score `<select>` option labels).
*What:*
- The three paragraphs ("Click any underlined price…", "The Benchmaxxing signal flags…",
  "Only models whose task-token usage…") move **below** the table as one 12 px muted
  footnote, joined with " · ". The Benchmaxxing sentence is rendered only when at least one
  badge is visible in the current rows.
- The caption line "Composite (coverage-neutral, dominance-safe percentiles, 0–100) · 7 fixed
  inputs; Epoch ECI …" above the table is removed; its content becomes the last paragraph of
  the Score (i) tooltip/modal.
- Everywhere the long definition is printed as a label — score `<select>` options, Charts card
  titles, Charts "Score:" line, scatter "Capability (Y):" line and Y-axis label — use the short
  name (`Composite`, `AA Intelligence`, `AA Coding`, …). Keep the long definition in `/about#score`
  and the (i).
- The orange line in Advanced ("Models without AA task-token measurements are excluded…")
  becomes part of the same muted footnote, not a warning colour.
*Accept:* `/` body text does not contain "dominance-safe" outside a tooltip/dialog; the DOM
between the slider card and `table.dtable` contains only the summary line.

### F-05 `[mechanical]` Table cells: one magnitude language
*Where:* `components/ModelExplorer.tsx` (score and cost cells), `components/PriceValue.tsx`,
`app/globals.css`.
*What:*
- Score cell: number right-aligned, tabular; a 4 px bar *below* the number, full cell width =
  100, fill `var(--accent)` at 55 % opacity. **No organisation tint** on the bar.
- Adjusted cost cell: number right-aligned with its `est.` marker; a 4 px bar below it whose
  length is `log(cost / min)/log(max / min)` of the rows in view, fill a neutral grey.
  Remove the pale-green block that currently sits beside the number.
- Organisation colour lives only in the 8 px dot before the org name.
- Row height 48 px; the ▸ disclosure triangle before the model name becomes a 12 px chevron
  at 50 % opacity that turns accent on hover.
*Accept:* screenshot of the table shows bars aligned under numbers in both columns, no
coloured block to the left of any cost.

### F-06 `[judgment]` Advanced opens on the full catalog
*Where:* `components/SettingsContext.tsx`, `components/HomeMode.tsx`, `components/GlobalFilters.tsx`.
*What:* the score minimum is **mode-scoped**: Simple keeps 85 (R5.3); Advanced defaults to
none. Featured stays on in both (the toggle is one click away). "Measured task tokens only"
stays on in Simple, off in Advanced (Advanced must be able to show every priced model).
The header count reads `70 models` (no "· filtered" when no user filter is active). Switching
mode never silently rewrites a value the user set by hand — only the untouched defaults differ.
*Accept:* fresh session → Advanced shows ≥ 50 rows; Simple still shows the ≥ 85 default.
*Status (claude-opus, iteration 7, `a36fcc6`):* implemented as written — the score minimum and
"Measured task tokens only" are mode-scoped, hand-set values apply everywhere. Live fresh
session: Advanced **16 rows** (was 6), Simple slider still 85 before and after visiting
Advanced. **The "≥ 50 rows" acceptance cannot be met while "Featured stays on"**: since R4.4
the featured set is the top 20 AA families, i.e. ≤ 20 rows with one variant per family. Left
for Fable pass 2 to decide: accept ~16–20 rows, or start Advanced with Featured off (then
~70+ rows). Not re-interpreted here.

### F-07 `[judgment]` Benchmaxxing radar that can be read
*Where:* `components/BenchmaxxingReport.tsx`, `components/BenchmarkRadar.tsx`, `lib/benchmax.mjs`
(radar profile only — the scoring changes belong to B3 in `PROGRESS.md`).
*What:*
- **Topic sectors** drawn as arcs: a 10 px ring segment per topic at the outer radius, each
  in a muted categorical colour (use the same 8-colour set as the Charts page, at 35 %
  opacity), with the topic name placed at the sector's angular midpoint outside the ring,
  rotated to read horizontally. Remove the left-hand vertical topic list.
- **Spokes:** draw a spoke only for measured axes (full opacity, 1 px). Unmeasured axes become
  1 px ticks on the outer ring at 25 % opacity. Spokes start at 18 % of the radius, never at
  the centre (this removes the black convergence blob).
- **Series:** measured points connected *within a topic* by a 2 px accent line; between topics
  no line. Points 5 px, accent fill. Hovering a point shows benchmark name, value, percentile.
- **Default model:** the highest-Composite model that has ≥ 40 measured axes (today that is a
  frontier model, not A.X-K2). The select sorts by measured coverage descending and prints
  the coverage next to each name.
- Signal panel: the big number stays; the two descriptive sentences under it shrink to one.
- Overview table on the same page: replace the repeated sentence in "Topic-local
  interpretation" with two numeric columns "Domain specialization" and "Measured", and a
  20×12 px sparkline of the model's per-topic mean. Default view hides models with < 10 %
  coverage behind a "show low-coverage models" toggle (design stop-gap until B3 lands the
  statistical floor).
*Accept:* screenshot at 1440 px: sectors labelled around the ring, no dark centre, default
model shows ≥ 40 points; at 390 px the radar is ≥ 320 px wide without horizontal scroll.

### F-08 `[judgment]` Model page: release-post benchmark sheet
*Where:* `app/models/[id]/page.tsx`, `components/BenchmarkSheet.tsx`, `components/BenchmarkEvidence.tsx`.
*What:*
- Header: title on one line (badges go *under* the title on mobile, never inline), then one
  muted line `Anthropic · released 2026-07-24 · 16 offers`.
- Top row: left "Cheapest providers" (keep, but on mobile drop the two raw-price columns and
  show them in the row's expansion); right a **six-axis mini radar** (the Composite inputs)
  instead of the two-column number list, with the numbers as a caption strip beneath it.
- Benchmark sheet: per category one **horizontal bar list** — benchmark name (link), a bar of
  the model's *catalog percentile* on that benchmark (0–100, accent), the native value with
  unit, the observed date. The evaluation-group description and the Evidence disclosure move
  into a per-row expand (chevron). Target: the whole sheet for a 15-benchmark model fits in
  ≤ 2,200 px instead of 6,700 px.
- "Profile signals" panel → renamed "Unusual results", placed *after* the sheet, and only
  rendered when a flag exists.
- "Composite definition" disclosure at the top of model, Compare and Radar pages is removed
  (it is in the Score (i) and `/about#score`).
*Accept:* `/models/claude-opus-5%3A%3Ahigh` full-page height ≤ 2,600 px at 1440 px; at 390 px
`scrollWidth` = 390; the mini radar renders in both themes.

### F-09 `[mechanical]` Charts page: quieter colour, denser information
*Where:* `components/ChartsBoard.tsx`.
*What:*
- Card titles use the short score name (see F-04).
- Bars use one accent colour; organisation is shown as the 8 px dot before the label. Value
  labels 11 px muted.
- "Open weights vs closed" — replace the two bar charts with one **dot-strip** per metric:
  every model as a small dot on a horizontal axis, open/closed as two rows, the mean as a
  vertical tick with its value. This shows the spread instead of two blocks.
- Add one card **"Score vs cost"**: the same compact scatter as F-03 with the current filter
  pool (so `/charts` is the graphical home of the thesis in Advanced).
*Accept:* four cards, none using per-organisation bar colours; the scatter card present.

### F-10 `[mechanical]` Guided wizard polish (keep the design)
*Where:* `components/Wizard.tsx`.
*What:* results step: show the F-03 value map above the list with the answer chips as the
chart's caption; the "Open in Advanced" button becomes secondary, "Change answers" primary.
Step 1's long footnote ("Today this site prices API and platform routes only…") shortens to
one line: *"Subscriptions are not priced yet; the answer is saved for when they are."*
*Accept:* step 5 renders the scatter; step 1 footnote ≤ 120 characters.

### F-11 `[mechanical]` Scatter page axis and empty space
*Where:* `components/CostCapabilityScatter.tsx`, `app/scatter/page.tsx`.
*What:* Y domain from the data (`floor(min−3) → 100`, minimum span 20). Intro paragraph
shortened to one sentence: *"Every model by real cost per task (cheaper to the right) and
score. Upper-right is best value; the green line is the Pareto frontier."* The "9 models"
count links to the filter panel.
*Accept:* with the default filters the points occupy ≥ 50 % of the plot height.

### F-12 `[mechanical]` Footer and legal text: three lines, not six
*Where:* `app/layout.tsx`.
*What:* footer = wordmark, the R3.1 line, one data-sources sentence, the three links. Remove
"Independent project. Not affiliated…" into `/about#identity`. Remove "Every result has a
source; every estimate has assumptions." (it is on `/about`).
*Accept:* footer height ≤ 120 px at 1440 px.

---

## Design system notes (apply while touching any file above)

- **Type:** display serif (`--brand-serif`) only for the H1 on `/` and page titles; everything
  else the system sans. No serif in cards.
- **Colour:** accent blue for interactive and for magnitude bars; categorical colours only
  for organisation dots and Benchmaxxing topic sectors; green reserved for "passes / cheaper",
  orange reserved for Benchmaxxing tag. Never tint a table bar by organisation.
- **Density:** one explanatory sentence per block, at most; everything else is an (i) or a
  disclosure. Numbers in tables are `tabular-nums` and right-aligned.
- **Charts** follow the dataviz rules: data-driven axis domains, labels on the marks when ≤ 20
  marks, muted gridlines, the same palette in light and dark (already the case).
- **Mobile:** no element wider than 390 px; tables collapse columns (hide raw prices, hide
  `#providers`) before they scroll.

---

## Done log

| Directive | Commit | Evidence | Verified by |
|---|---|---|---|
| R3.1 hero claim + meta/OG/footer text | `76d8f86` (Fable) | `ux-evidence/fable-20260913/local/`, `…/after/` | pending non-Claude verifier |
| F-01 compact hero (eyebrow and stat boxes gone, one counts line, smaller display) | `76d8f86` (Fable) | `ux-evidence/fable-20260913/local/desktop_light-simple.png` | pending non-Claude verifier |
| F-04 small print under the table, caption into the Score (i), short score labels in Charts/Scatter/select | `76d8f86` (Kimi K3 via delegate.sh, reviewed by Fable) | `ux-evidence/fable-20260913/after/` | pending non-Claude verifier |
| F-02 one-row responsive nav, Filters button and sheet | `e573ef6` (Codex Luna) | `ux-evidence/iter8-final/verification-e573.json` + live screenshots | pending independent verifier |
| F-03 Simple value map: sliders, compact score/cost scatter, concise pass summary | `e573ef6` (Codex Luna) | `ux-evidence/iter8-final/verification-e573.json` + live screenshots | pending independent verifier; mobile map is intentionally compact to meet F-01 fold target |
| F-12 concise footer (identity note remains on /about) | `4d4783c` (Codex Luna) | `ux-evidence/iter8-final/verification-final.json` | pending independent verifier |
