# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 2: 2026-09-13**, against live revision `b3a1453` (https://benchmarkheaven.com).
Evidence: `/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass2/` — 85 screenshots +
`metrics.json`, desktop 1440×1000 and mobile 390×844, light and dark: Simple, Advanced,
Filters sheet, Guided steps 1–5 and results, Benchmaxxing, model page, Charts, Compare,
Benchmarks. Pass 1 (2026-09-13, revision `3d4573a`) is in `…/fable-20260913/`.

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

## Verdict on the live site — pass 2 (2026-09-13)

Pass 1 moved the site a long way: the hero is two lines and a counts line, the small print is
under the table, the table bars read as one magnitude language, the nav is one row, Charts is
quiet, the Benchmaxxing radar has sectors and no black centre. The Guided wizard is still the
best-designed part of the site and stays the reference for tone.

**What still fails the bar, in order of damage:**

1. **Desktop first screen still recommends nothing.** 1440×1000: first model row at 958 px,
   zero rows visible (`metrics.json` → `desktop_light.simple.firstRowTop`). The cause is
   structural: mode-switch card (60 px) + slider card (165 px) + value-map card (390 px)
   stacked before the table. → **F-13** (this resolves the F-01/F-03 conflict).
2. **On a phone the two numbers that matter are invisible.** The ranking table has
   `min-w-[900px]`; at 390 px it shows *Model* and *Org* and hides *Score* and *Adjusted
   Cost* behind a horizontal scroll nobody discovers. → **F-14**.
3. **The mobile value map is an 80 px strip** (`h-[80px] sm:h-[320px]`): a black smear of
   overlapping labels that reads as a rendering bug. → **F-13 / F-17**.
4. **Advanced opens on the 16 featured rows**, every one marked ★. "Full catalog" must mean
   the catalog. → **F-16** (decides the F-06 question).
5. **The model page is a 6,561 px scroll of provenance boxes** and its provider table is cut
   off at 390 px. F-08 was never taken up; it is now the first item after the fold fixes.
6. **Micro-defects:** the boxed "◐ Dark" button is the heaviest element in the header;
   value-map labels collide ("Muse Spark 1.2 / Gemini 3.8 Flash / GPT-5.6 Sol" overprint at
   the 80-score band, "GLM-" clipped at the right edge) and the Y axis ticks at 68/77/86/100;
   the Pareto line runs through greyed-out points; the Filters panel pushes the whole page
   down instead of overlaying; the Charts control bar still prints "7 fixed inputs; Epoch
   ECI 2026-09-12; Coding Agent v1.4 · min 0"; the Benchmaxxing table prints "not scored"
   25 times and its sector labels overprint on the left ("truction-following").

## Decisions on the pass-2 questions

1. **F-01 vs F-03 (desktop fold).** Neither is withdrawn; the layout changes. On `lg` and up
   the sliders and the value map share **one card, side by side**; the mode switch loses its
   card frame. Spec in **F-13**. Target: first row ≤ 720 px, ≥ 4 rows on the first screen.
2. **Hero line 2 (P4-CLAIM-01) — keep as decided.** "The only place that shows what each
   model really costs *you*" is defensible because of *you*: Artificial Analysis prices a
   task at one list price; we price it on the provider route the reader's own region,
   confidentiality and data-policy filters leave open, with that route's cache prices and
   hit rates and the model's measured token burn. Nobody else does that. No wording change;
   the Adjusted-Cost (i) and `/about#adjusted-cost` carry the proof. Carry to X7 as a note.
3. **F-06 — Advanced starts with Featured off** (full ranked catalog). Spec in **F-16**.
4. **F-11 remainder — yes, still wanted**, but as part of **F-18** (the Filters sheet gets a
   programmatic opener); do not do it as a one-off.

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

> **Status 2026-09-13, iteration 15 (claude-opus):** F-13, F-14, F-15, F-16, F-17, F-18 and
> F-20 are implemented (see the Done log; specs kept below for the verifier). Still open:
> **F-08, F-19, F-21.** Two notes for the verifier: F-16 applies "Advanced starts with
> Featured off" to the Advanced home view only; Charts, Compare, Providers and Scatter keep
> the Featured default (on), which the directive does not mention. F-17's "labels never
> extend past the plot's right edge" is met by keeping labels inside the plot (they flip
> to above/below/left) instead of a 72 px margin.

### F-13 `[judgment]` Simple first screen: one shortlist card, list above the fold
*Where:* `components/ModelExplorer.tsx` (the `simple && <>…</>` block, lines ~191–201),
`components/ShortlistControls.tsx`, `components/HomeMode.tsx`, `app/globals.css`.
*What:*
- **Mode switch without a card.** `HomeMode`: replace the bordered `bh-mode-switch` card with
  a plain row: a segmented control (three tabs, 36 px tall, active tab accent-filled, the
  others text-only, one 1 px `--line` border around the group) on the left, the hint text on
  the right at 12 px muted (desktop only). Row height ≤ 44 px, margin-bottom 12 px.
- **One card "Your shortlist"** replaces the slider card + the value-map card. Grid:
  `lg:grid-cols-[2fr_3fr]`, gap 24 px; below `lg` one column.
  - Left column: the two sliders **stacked** (score above cost), each with its sparkline as
    today, then the summary line (`6 models pass · 8 below your score line · show all 14`).
    No card title needed on the left; the slider labels are the titles.
  - Right column: the compact value map at **240 px** height on `lg`, header row "Value
    map · cheaper → right · green = Pareto" at 11 px muted.
  - Card padding 16 px. Total card height on `lg` ≤ 300 px.
- Below `lg` (phones/tablets): sliders first, then the map at **200 px** (never 80 px), then
  the summary line, then the table.
- Hero: `.bh-hero` bottom padding 8 px; the counts line 13 px.
*Accept:* `desktop_*.simple.firstRowTop ≤ 720` and `rowsVisible ≥ 4` at 1440×1000;
`mobile_*.simple.firstRowTop ≤ 760` at 390×844; the compact map's rendered height is 200 px
at 390 px and 240 px at 1440 px; no `<p>` between the card and `table.dtable` except the
summary line (which now lives inside the card).

### F-14 `[mechanical]` Ranking table on phones: Model · Score · Cost, nothing hidden
*Where:* `components/ModelExplorer.tsx` (table + `colgroup` + `Th`), `app/globals.css`.
*What:* the same table in Simple, Advanced and the wizard results.
- Remove `min-w-[900px]`. Use `table-fixed` with responsive columns:
  - `< md` (phones): three columns — Model 46 %, Score 27 %, Adjusted Cost 27 %. `Org`,
    `# benchmarks`, `# providers` get `hidden md:table-cell`. The org name renders as an
    11 px muted second line under the model name (with its 6 px colour dot), only `< md`.
  - `md`–`lg`: add Org and `# benchmarks`. `lg` and up: today's six columns.
- The `Score` header keeps the small "(Composite)" sub-label; on `< md` the (i) icons stay
  (they open the modal, R1.8).
- Badges (`open`, `deprecated`, `Benchmaxxing signal`) wrap under the model name on `< md`
  instead of pushing the name off the cell; the row may grow to two lines.
- The expanded row (`colSpan`) becomes `colSpan={visibleColumns}` so it never overflows.
- The card wrapper keeps `overflow-x-auto` only as a safety net; at 390 px
  `table.scrollWidth` must equal the card width.
*Accept:* at 390 px `table.dtable` shows exactly three header cells: Model, Score, Adjusted
Cost; `document.documentElement.scrollWidth === 390`; the first row shows a number in both
Score and Adjusted Cost; at 1440 px all six columns are present.

### F-08 `[judgment]` Model page: release-post benchmark sheet (carried from pass 1, now priority 3)
*Where:* `app/models/[id]/page.tsx`, `components/BenchmarkSheet.tsx`, `components/BenchmarkEvidence.tsx`,
`components/ModelDetailOffers.tsx`.
*What (unchanged from pass 1, plus the mobile fix):*
- Header: title on one line (badges go *under* the title on mobile, never inline), then one
  muted line `Anthropic · released 2026-07-24 · 16 offers`.
- Top row: left "Cheapest providers" — **on `< md` drop the Raw input / Raw output columns**
  (they are what cuts the table off at 390 px today) and show them in the row's expansion;
  right a **six-axis mini radar** (the Composite inputs) instead of the two-column number
  list, with the numbers as a caption strip beneath it. The two ⓘ paragraphs about
  family-scope attachment become one (i) tooltip on the affected rows.
- Benchmark sheet: per category one **horizontal bar list** — benchmark name (link), a bar of
  the model's *catalog percentile* on that benchmark (0–100, accent), the native value with
  unit, the observed date. The evaluation-group description and the Evidence disclosure move
  into a per-row expand (chevron). Target: the whole sheet for a 15-benchmark model fits in
  ≤ 2,200 px instead of 6,500 px.
- "Profile signals" panel → renamed "Unusual results", placed *after* the sheet, and only
  rendered when a flag exists.
- The "Composite definition" disclosure at the top of the model, Compare and Radar pages is
  removed (it is in the Score (i) and `/about#score`).
*Accept:* `/models/claude-opus-5%3A%3Ahigh` full-page height ≤ 2,600 px at 1440 px; at 390 px
`scrollWidth` = 390 and the provider table shows the Adjusted $/task column; the mini radar
renders in both themes.

### F-16 `[judgment]` Advanced opens on the full catalog
*Where:* `components/SettingsContext.tsx`, `components/HomeMode.tsx`, `components/ModelExplorer.tsx`.
*What:*
- `featured` becomes mode-scoped like `minScore` (F-06 pattern): Simple applies `true`
  until touched; Advanced applies `false` until touched. A hand-set value applies everywhere.
  Bump the settings payload version so old payloads load as untouched.
- The ★ marker in the Model cell renders **only in Advanced** (in Simple every row is
  featured, so the star is noise). Keep `★ featured` on the model page.
- The Advanced toolbar becomes one row: `[Search] [All orgs] [Max $/task] [Better than a
  model ▾] [Evidence ▾] … 70 models`. "Better than a model" changes from the full-width
  `<details>` box to the same popover pattern as "Evidence" (button + absolutely positioned
  panel, `w-[min(28rem,calc(100vw-3rem))]`); when a comparison is active the button reads
  `Better than GPT-5.6 Sol · AA Coding ▾` in accent.
- The count reads `70 models`; append `· filtered` only when a user-set filter is active.
*Accept:* fresh session → Advanced shows ≥ 50 rows and no ★ in Simple; Simple still shows
the ≥ 85 default and featured-only after visiting Advanced; the toolbar is one row at 1440 px.

### F-17 `[mechanical]` Value map: readable labels, round ticks, honest frontier
*Where:* `components/CostCapabilityScatter.tsx` (compact branch and the full `/scatter` chart).
*What:*
- **Y ticks** at round numbers: compute `niceTicks(min, 100, step ∈ {5, 10})` — never
  68/77/86/100. X ticks stay at $0.03 / $0.10 / $0.30 / $1 / $3 / $10.
- **Label collision:** label at most 12 points. Priority: Pareto members, then passing points
  by score. Greedy placement: try right-of-point, then above, then below; if every slot
  overlaps an already-placed label (12 px line-height box), drop the label and keep the
  dot. Labels never extend past the plot's right edge — add a 72 px right margin or flip the
  label to the left of the point.
- **Frontier over passing points only.** Points that fail the current limits are drawn at
  25 % opacity, get no halo and are not frontier candidates. (Today the green line runs
  through greyed points, which contradicts the dimming.)
- Mobile height (`< sm`) **200 px**, not 80; at that height label only frontier members.
- Hover/tap tooltip: `name · score · $cost/task · org`.
*Accept:* at 1440 px no two labels overlap (check bounding boxes in a script); Y tick labels
are multiples of 5; every haloed point passes the current limits; the compact map is 200 px
tall at 390 px.

### F-15 `[mechanical]` Header: icon-only theme toggle, calmer controls
*Where:* `components/ThemeToggle.tsx`, `components/Nav.tsx`, `app/globals.css`.
*What:*
- Theme toggle is a **40×40 icon button** (sun/moon glyph, `aria-label="Switch to light
  theme"` / `"…dark theme"`, `title` the same), no text, no bordered box; hover background
  `accent/10`. It sits last in the header.
- Mobile header order: logo · (spacer) · Filters · Menu · theme. All three controls the same
  height (40 px) and style (`bh-nav-button`). Header height stays 58 px.
- Active nav item: accent text with a 2 px accent underline instead of the filled pill.
*Accept:* no "Dark"/"Light" text in the header at either width; the theme button's
bounding box is ≤ 44×44; the header contains exactly one row at 390 px.

### F-18 `[judgment]` Filters as an overlay sheet, not a page push
*Where:* `components/GlobalFilters.tsx`, `components/Nav.tsx`, `components/SettingsContext.tsx`,
`components/CostCapabilityScatter.tsx` (the "N models" link, F-11 remainder).
*What:*
- Desktop (`lg`+): the panel is a **popover anchored under the header**, right-aligned,
  `max-w-[960px]`, shadow-xl, `z-40`; the page behind does not move. Closes on Escape,
  outside click and the Filters button. Focus moves into the panel on open and back on close.
- Mobile: a **bottom sheet** (`fixed inset-x-0 bottom-0`, `max-h-[85vh]`, scrollable,
  rounded top corners) with a sticky footer `Show 16 models` (primary) and `Reset`.
- Expose `openFilters()` / `closeFilters()` on `SettingsContext` (replace the window event);
  the scatter's "N models" count and the Simple summary's pool count call `openFilters()`.
- The "Min score" number input gets `w-20` and placeholder `any` (today it shows a truncated
  "any · Simp…").
- Keep the section grouping and labels exactly as they are (R4.x are verified wording).
*Accept:* opening the panel at 1440 px leaves the hero's `getBoundingClientRect().top`
unchanged; at 390 px the sheet's bottom edge is the viewport bottom and its footer button is
visible without scrolling the sheet; Escape closes it.

### F-19 `[judgment]` Benchmaxxing page: title, ring labels, table
*Where:* `app/benchmaxxing/page.tsx`, `components/BenchmaxxExplorer.tsx`,
`components/BenchmaxxingReport.tsx`, `components/BenchmarkRadar.tsx`.
*What:*
- **Title block:** `h1` "Benchmaxxing" (page-title size, serif like the other pages), sub-line
  *"Which models are uneven inside a topic — strong on one coding benchmark, weak on the next?"*
  Drop the eyebrow "ADVANCED · BENCHMAXXING" and the second paragraph.
- **Ring labels:** label a sector only when it holds ≥ 6 measured-or-not axes **and** its arc
  is ≥ 14°; smaller sectors merge visually into one "Other" arc (grey) with their names in a
  one-line legend under the chart. Left/right plot margins ≥ 110 px so no label is clipped;
  labels on the left half are right-anchored. Never let two labels overlap — if they would,
  push the lower one down by one line height.
- **Overview table:** columns `Model · Signal · Related comparisons · Measured · Domain
  specialisation`; the badge sits under the model name; delete the per-cell "not scored"
  text and put "disclosed, not part of the score" in the column's (i). Default shows the 10
  strongest signals with `show all 18 tagged`; below that a muted line with the coverage
  floor. On `< md` show `Model · Signal · Measured` only.
- **Per-model panel:** keep the big number; the select lists models by measured coverage
  descending with the coverage in the label (done) — add the tag as an orange dot before
  tagged names.
*Accept:* `h1` text is "Benchmaxxing"; at 1440 px no ring label bounding box intersects
another or the SVG edge; the table shows 10 rows by default; at 390 px `scrollWidth` = 390.

### F-20 `[mechanical]` Charts control bar and intro: short names only
*Where:* `components/ChartsBoard.tsx`, `app/charts/page.tsx`.
*What:* the control bar reads `Score [Composite ▾] · Cost [Adjusted $/task] · Max $/task [ ]
… 20 models`. Remove "7 fixed inputs; Epoch ECI 2026-09-12; Coding Agent v1.4 · min 0" (it is
in the Score (i) and `/about#score`). The intro paragraph becomes one sentence: *"Leaderboard,
cheapest models, open vs closed, and score against cost — all under your current filters."*
The "Score vs cost" card's right margin follows F-17 so no label is clipped.
*Accept:* `/charts` body text does not contain "fixed inputs" or "Coding Agent v1"; intro
≤ 120 characters.

### F-21 `[mechanical]` Compare and Radar pages: drop the definition disclosure, tighten intros
*Where:* `components/CompareView.tsx`, `app/compare/page.tsx`, `app/radar/page.tsx`.
*What:* remove the "Composite definition · 7 slots · ECI + Coding Agent v1.4" disclosure at
the top (F-08 bullet 5 applies to all three pages); the Compare intro is one sentence; the
"Radar values are normalized…" paragraph under the radar becomes the chart's (i).
*Accept:* `/compare` and `/radar` body text does not contain "Composite definition".

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
| F-13 one shortlist card (sliders + 240 px map side by side at lg; sliders side by side, 200 px map on phones) | `21ff9e8` (Kimi K3, reviewed) + `939b278` (Claude Opus: phone trims) | `ux-evidence/iter15/local4/`, `…/iter15/live-{canonical,legacy}-p2/` | needs a non-Claude verifier. Local: first row 669 px / 6 rows at 1440×1000, 757 px at 390×844 |
| F-14 phone table Model · Score · Cost | `21ff9e8` (Kimi K3) + `939b278` (col widths fixed: hidden cells had shifted Score onto a 0-width column) | same | needs a non-Claude verifier. Local: 3 header cells at 390, 6 at 1440, `scrollWidth` = viewport |
| F-15 header: icon-only theme toggle, Filters · Menu · theme, underline active item | `afa8d26` (Fable) + `21ff9e8` (Kimi K3) | same | needs a non-Claude verifier. Local: theme button 40×40, no text, header 59 px |
| F-16 Advanced opens on the full catalog; H3 popover; honest "· filtered" | `a0a7703` (Claude Opus) | `ux-evidence/iter15/f16-local4/`, `…/live-{canonical,legacy}-f16/` | needs a non-Claude verifier. Local: Advanced 118 rows, toolbar one row, Simple still ≥ 85 and featured-only after Advanced, no ★ in Simple |
| F-17 value map: collision-free labels, round ticks, frontier over passing points, 200 px phone map | `939b278` (Claude Opus; the Kimi delegation produced nothing in 50 min and was stopped) | `ux-evidence/iter15/f18-local4/`, `…/live-{canonical,legacy}-f18/` | needs a non-Claude verifier. Local: 0 overlaps, 0 clipped, ticks 60…100 |
| F-18 Filters overlay (desktop popover, phone bottom sheet), `openFilters()`, count links | `939b278` (Claude Opus) | same | needs a non-Claude verifier. Local: hero does not move, sheet bottom = viewport bottom, "Show 6 models" visible, Escape/outside click close, focus in and back |
| F-20 Charts control bar and one-sentence intro | `21ff9e8` (Kimi K3, reviewed) | `ux-evidence/iter15/local4/` | needs a non-Claude verifier. Local: no "fixed inputs" / "Coding Agent v1", intro 102 chars; same on both live hosts |
