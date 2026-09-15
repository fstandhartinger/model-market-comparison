# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 15: 2026-09-15 ~00:30 UTC**, the one targeted CR-1.10 pass on the new Benchmarks page, against live
revision `15d1a78` (https://benchmarkheaven.com). Evidence: `/opt/benchmarkheaven/state/ux-evidence/fable-20260915-pass15/`
— 64 shots + `metrics.json` (`/benchmarks` default, `?rows=important`, Rows and Models menus, Pick from chart,
Choose rows, the bar chart, a cell detail page, Simple landing with its Benchmarks section; 1440/390 × light/dark;
`crop-*.png` are enlargements). Script: `bin/shoot-fable-pass15.mjs`. Pass-15 fixes live-checked in `after/`.
Earlier passes: `…/fable-20260914-pass14/` … `…/fable-20260913/`.

**The bar (Florian):** minimalistic and simple, very expressive, not overloaded, key messages
first, graphical with many charts.

**How to use this file.** Directives are numbered `F-nn`, ordered by value. Each has *Where*
(files), *What* (implementable spec), *Accept* (what the reviewer checks live). Implementers
take the top open directive, ship it, move its row to the *Done log* at the bottom with the
commit hash and evidence path. Do not re-interpret a directive; if it cannot be done as
written, leave it open and write why under it. Fable decides, others implement.

**Delegation hint.** `[mechanical]` directives are safe for `bin/delegate.sh --kimi` (clear
spec, no numbers to invent) with a 20-minute cap; `[judgment]` ones need Claude Opus 5 or Codex
Luna. Every delegated diff is reviewed before it lands. Record from passes 8, 11, 12 and iterations
17/50: Kimi K3 stalls on one-file TSX edits (reads, no diff); surgical TSX changes are faster done by
the reviewing engine directly.

---

## Verdict on the live site — pass 15 (2026-09-15), the CR-1.10 pass on the Benchmarks page

**The page is right in substance and close to the bar; it is not yet "excellent" because the table — the key
message — starts too far down and its bars read as blocks, not as subtle data bars.** What is right: the
release-style layout (vendor small, model large, lettered colour swatches that the chart reuses, a faintly tinted
lead column), the grouped rows with collapsible category headers, bold winners, direction-aware bars, the tag
pills, every cell a link to a provenance page that shows the number, basis, date, source and the same benchmark
for the other compared models, the Rows/Models preset menus ("ours" and "yours" separated, saved-in-this-browser
note), the Pick-from-chart panel (the value map with two sliders, lettered points), and the headline bar chart —
twelve small multiples then "Show all 20", each with the row's own scale (0–100 %, points ceiling, Elo as a
position between padded min and max, exactly the F-72 rule), readable at 390 as stacked panels. Dark mode is the
same design in other colours. No page is wider than 390 px on phones; the table scrolls inside its own container
with a sticky stub. No page or console errors in 64 shots.

Findings, ordered by value:

1. **At 390 the first screen shows no number at all.** H1, sentence, view tabs, status line, a count select, two
   preset buttons, an "Add a model" input and two full-width bordered disclosure boxes fill 690 px before the
   table header appears (`mobile_light-benchmarks.png`); at 1440 the first value sits at y ≈ 650
   (`desktop_light-benchmarks.png`). Six control rows before the content is the opposite of "key messages first".
   → **F-83** `[judgment]` (open, for the work loop): one status row, one control row, table.
2. **The data bars were blocks.** `.bh-matrix-bar` stretched from 11 px below the top to 11 px above the bottom
   of the cell, and a phone stub with a three-line name, tags, cohort and a two-line description makes a 160 px
   row — so every value sat in a 140 px grey slab (`crop-mobile-table.png`). Excel's data bar is a band behind
   the number. → **F-79**, surgical (Fable, `313e24c`): a fixed 22 px band, vertically centred; below `md` the
   stub drops the clamped description (at 9.5 rem it read "Artificial Analysis' h…"), the name and tags carry
   the row and the detail page has the full text.
3. **Two composite rows were labelled "Artificial Analysis Coding Agent Index v1.4/v1.5"** beside "AA Intelligence
   Index" and "AA Coding Index" — three lines on a phone for the same vendor prefix. → **F-80**, surgical
   (Fable, `313e24c`): row labels shorten the prefix to "AA "; the registry name is untouched.
4. **Single-result rows sat among the comparable ones.** Under "Composite indices" the order was AA Intelligence,
   AA Coding, Codex v1.4 (one value), Codex v1.5 (one value), AA-Omniscience, ECI (one), Software ECI (one): four
   rows of dashes between the rows the five models can actually be compared on. Florian wants the extensive
   "All" list (it stays the default); the eye should still land on comparisons first. → **F-81**, surgical
   (Fable, `313e24c`): inside a category, rows with ≥ 2 values among the compared models come first, then the
   single-result rows, build order otherwise (stable).
5. **The Simple-mode Benchmarks section named its columns with the full variant string** — "Claude Fable 5.1
   (Adaptive Reasoning, Max Effort, Default Fallback)" over three lines at 1440 and six at 390
   (`crop-desktop-simple-s2.png`, `crop-mobile-simple-s2.png`) — because it stripped only "(max|high|…)" suffixes
   while the full table uses `collapsedName()`. → **F-82**, surgical (Fable, `313e24c`): same helper, same
   names, full name in `title`.
6. **The header sentence counts "up to 59 benchmarks in 13 categories" while the status line right under it says
   "29 benchmarks across 9 categories"** — two different totals on one screen (matrix size vs. rows with a value
   for the compared models). Folded into **F-83**: the sentence loses its count; the status line is the count.

Not findings, checked: the lead column's tint is deliberately faint (accent at 5.5 %) — the reference's solid
blue column would fight the data bars, and the bold winner already marks the leader; stays. Bars are 0-based for
percentages and points (the standing rule: a truncated baseline turns a 3-point gap into a doubling) and
min–max with a floor for Elo, which the chart's "position between lowest and highest" makes explicit; stays.
The chart follows the table (the table is the deliverable; the chart is "additionally"); stays. Tags: "AA" +
"Headline" on the index rows are two pills, not three; stays. The cell detail page is plain and complete —
number, unit, direction, basis chip, observed date, source link, Evidence disclosure, the compared models with
the same fields — nothing to add.

**Harness, recorded honestly:** `?rows=important` via URL rendered the same 40 rows as the default in the
matrix count (`metrics.json`, `*-benchmarks-important`); the preset is applied client-side after hydration and
the screenshot was taken 800 ms after `networkidle`, so this is most likely timing in my script, not a product
defect — the Rows menu opened by click shows "Important · indices and headline benchmarks" and CR-3.1 was
verified live by gate 230002Z with `verify-cr-e2e`. Not re-run; if the work loop touches the row presets, add a
URL round-trip assertion for `?rows=important` to `verify-cr-1.mjs`.

## Decisions in pass 15

1. **R3.1 stands.** No change.
2. **"All" stays the default row preset** (Florian: "make sure this table is extensive … show off how many
   benchmarks we have"); readability comes from order (F-81) and compactness (F-79, F-83), not from hiding rows.
3. **Below `md` a matrix stub carries name, tags and cohort only** (F-79). The one-line description is a desktop
   affordance; on a 9.5 rem stub it is noise. CR-1.1's "name + one-line description underneath" is met at ≥ 768 px.
4. **Row labels use the site's short vendor prefix** ("AA …") everywhere in the matrix (F-80); the registry
   keeps the official full name and the detail page shows it.
5. **CR-1.10 status:** the design pass has run; F-79–F-82 are live and Fable-checked (`after/`), they need a
   non-Fable verifier; **F-83 is open for the work loop** (claude-opus). CR-1.10 becomes `verified` when F-83 is
   implemented and a non-implementing engine has checked F-79–F-83 live at 1440/390, light/dark.
6. **Next Fable pass:** none scheduled. Florian asked for one targeted pass on this page; the work loop
   verifies F-83 against the *Accept* line below, no further Fable round is needed for it.

---

## R3.1 — Hero claim (decided in pass 1, re-decided in pass 8, confirmed passes 9–14)

> **Every AI model benchmark we can find, in one place.**
> **And what each model really costs you.**

Line 2 accent-coloured. The muted counts line underneath is generated from the dataset.
Rejected: Florian's draft ("All benchmark results for every model, in one place. The most
realistic cost estimate for each model.") — "all … every" over-reaches (P4); the pass-1 wording
("The most complete collection … the only place …") — "only" is not provable against Artificial
Analysis' cost per task (review gate 2026-09-13 20:50); the iteration-35 wording ("A complete,
source-linked collection … grounded in provider prices, caching, and token efficiency.") — a
methodology sentence, three lines, repeated in the footer. If Florian wants the superlative back,
the honest form is "The most complete collection of AI model benchmarks we know of."

---

## Directives (open)

> **Status 2026-09-15 pass 15 (Fable), end of pass:** **one directive open for implementers: F-83.** F-79–F-82
> landed in `313e24c` and were live-checked by Fable (`fable-20260915-pass15/after/`); they need a **non-Fable
> verifier** to set `verified`.

### F-83 `[judgment → claude-opus]` Benchmarks page: the table starts within the first screen
*Where:* `components/BenchmarkMatrix.tsx` (the two blocks above the table), `app/benchmarks/page.tsx` (header
sentence), `app/globals.css` (`.bh-pickpanel`, `.bh-rowpicker`).
*What:*
1. **Header sentence without a count:** "The strongest models under your filters, side by side on every benchmark
   with a published result — each value with its source." The status line keeps the live count (CR-1.4).
2. **Row 1 = status + presets.** The count select moves *into* the status sentence: "29 benchmarks across 9
   categories · top **[5 ▾]** by Composite under your filters" (the `<select>` styled inline, `aria-label="Number
   of models"`); the separate "Models 5" label disappears. When models are pinned the sentence reads "… · your
   selection" and the "Reset to top 5" button stays where it is. `Models: Frontier top 5 ▾` and `Rows: All ▾` stay
   on the right of this row.
3. **Row 2 = the three ways to change columns and rows, as one wrapping line, no boxes:** `[+ Add a model]`
   (the search input, `max-w-[13rem]`), `▸ Pick from chart`, `▸ Choose rows (29 of 29)`. The two `<details>`
   render their `summary` as plain text buttons (min-height 44 px, no border, no background, same 14 px as the
   status line, chevron rotates when open); the "· score against cost, narrowed by two sliders" hint moves inside
   the open panel as its first muted line. When a `details` is open it takes the full row width
   (`details[open] { flex-basis: 100%; }`) and its panel keeps the current bordered-card look; only the closed
   state loses the box. Only one of the two panels may be open at a time (opening one closes the other).
4. Nothing else moves: view tabs, table, chart, small print unchanged.
*Accept (`bin/verify-cr-1.mjs` gains these assertions; both hosts, 1440/390, light/dark):* at 390 the table's
`thead` top is ≤ 560 px from the page top and the first value cell is inside the 844 px viewport without
scrolling; at 1440 the first value cell's top is ≤ 520 px; the header sentence contains no digit; the status line
contains the `<select>` and no other element on the page reads "Models" followed by a select; the closed
disclosures have no border (computed `border-width: 0`); opening "Pick from chart" closes "Choose rows" and vice
versa; all existing `verify-cr-1` checks still pass (92/92 per host).

### F-79 `[surgical, Fable — landed 313e24c]` Data bar as a band; phone stub without description
*Where:* `app/globals.css` (`.bh-matrix-bar`: `top: 50%; height: 22px; transform: translateY(-50%)`; below
`md`: `.bh-matrix-desc { display: none }`).
*Accept:* at 390 every `.bh-matrix-bar` is 22 px tall and no `.bh-matrix-desc` is rendered; at 1440 the
description is one line as before; bars stay behind the number, text contrast unchanged.

### F-80 `[surgical, Fable — landed 313e24c]` "AA " prefix on the Coding Agent Index rows
*Where:* `lib/benchmark-matrix.mjs` (`name: axis.name.replace(/^Artificial Analysis /, 'AA ')`).
*Accept:* no matrix row label starts with "Artificial Analysis"; the detail page and registry still carry the
full name; `test/benchmark-matrix.test.mjs` green.

### F-81 `[surgical, Fable — landed 313e24c]` Comparable rows first inside a category
*Where:* `components/BenchmarkMatrix.tsx` (`groups` memo: stable sort by "≥ 2 values among the compared
models" first).
*Accept:* with the default top 5, in every category no single-value row precedes a row with two or more values;
the "Full coverage only" preset is unaffected; row count unchanged.

### F-82 `[surgical, Fable — landed 313e24c]` Simple-mode Benchmarks section uses the collapsed model names
*Where:* `components/SimpleBenchmarks.tsx` (`collapsedName(m, true, preferredVariantIds(data.models, score))`,
full name in `title`).
*Accept:* on `/` (Simple) no column header of the Benchmarks section contains "(Adaptive" or "Effort"; the
header row is ≤ 110 px tall at 1440 and ≤ 150 px at 390.

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
  scroll; charts are ≥ 200 px tall or not rendered; **no chart requires horizontal panning** —
  re-lay it out to fit 358 px or replace it with HTML bar rows (pass 9).
- **Controls:** icon-only buttons are 40×40 with `aria-label` and `title`; popovers, not
  inline `<details>` boxes, for secondary filters.
- **Names never truncate below `md`** (F-14, F-56, F-68, F-69): identifying text wraps; an ellipsis is
  acceptable only for secondary text. On charts, a ranked point's label is dropped only after all
  eight slots fail (F-67), and every SVG point label carries a 3 px `paint-order: stroke` halo in
  `var(--surface)` (F-70) so lines pass under names, never through them.
- **Quantities spanning > ~20× are never linear bars** (F-72): use a log-position mark (dot on a
  track) with round money ticks, as the value map does.
- **A cap never decides by the display order** (F-74): when a ranked list is truncated, the kept set is
  chosen by value (Pareto line first, then score) and the visible order is applied afterwards.
- **A data bar is a band, not a fill** (F-79): behind the number, fixed height (22 px), never the row height.
- **Comparison tables: comparable rows first** (F-81): inside a group, rows with two or more values among the
  compared columns precede single-value rows; the "show everything" default stays.
- **The content starts within the first screen** (F-83): on a phone the first data cell of a page's main table
  is inside the 844 px viewport; controls collapse into two rows before they push it out.

---

---

---

## Earlier verdicts (condensed, for the record)

- **Pass 14 (2026-09-14 14:00 UTC, live `42da12c`):** at the bar on every page, both widths and themes; fixed F-74
  (shortlist cap keeps the Pareto line, then score), F-75 (Guided actions wrap between buttons), F-76 (no zero-peer
  option text), Fable `e33635b`; verified F-72/F-73 (claude-opus). Rule added: a cap never decides by the display
  order. Decisions: R3.1 and R5.2 unchanged; X4 judged met pending independent verification.
- **Pass 13 (2026-09-14 12:30 UTC, live `bf5b821`):** at the bar at 1440 and, after the pass, at 390; fixed F-69
  phone benchmark-sheet names wrap, F-70 value-map label halo, F-71 integer token counts (Fable, `f23f5f9`; verified
  by claude-opus gate 130002Z); opened F-72 (log-position dot plot, landed by claude-opus `26a709c`) and F-73
  (landed by claude-opus `4dffc1d`). Rules added: label halo; quantities spanning > ~20× are never linear bars.
- **Pass 12 (2026-09-14 11:20 UTC, live `975334b`):** at the bar on every page, both widths and themes; fixed F-67
  (eight label slots + headroom so the frontier's top point keeps its name on phones) and F-68 (Benchmaxxing names
  wrap at 390), Fable surgical `5e974fe`, verified by claude-opus (iteration 49). Rule added: names never truncate
  below `md`. Decisions: R3.1 and R5.2 unchanged.
- **Pass 11 (2026-09-14 09:10 UTC, live `4f8b690`):** core pages at the bar; the E2 boards opened on "No results"
  → F-65 automatic widening with one notice line and F-66 error-boundary Details (Fable, `72da684`; Kimi delegation
  produced no diff), live 168/168 per host. Rule: screenshot runs start ≥ 3 min after the revision flips.
- **Pass 10 (2026-09-14 06:25 UTC, live `4b0d250`):** at the bar at both widths and themes; fixed F-63 light-mode
  Charts tracks and F-64 Composite coverage wording (Fable surgical, `21aa63f`); both verified by claude-opus
  (iteration 47). Decisions: R3.1 and R5.2 unchanged; X4 judged met pending independent verification.
- **Pass 9 (2026-09-14 03:40 UTC, live `4374f29`):** desktop at the bar; opened F-58 phone Compare radar, F-59
  phone Charts bar rows, F-62 desktop radar 640 px (Kimi K3 draft + Fable, `7b5320d`); fixed F-60 Composite-first
  phone model page and F-61 doubled version tokens (Fable, `9240da5`/`97e50a4`). New rule: no chart may require
  horizontal panning below `md`. Decisions: R3.1 and R5.2 unchanged; R5.3 default 86 documented.
- **Pass 8 (2026-09-14 01:30 UTC, live `54872fc`):** re-decided the hero (F-53, Fable surgical); opened
  F-54 version labels, F-55 one (i) style, F-56 phone name wrapping, F-57 phone title — all landed in
  `84cdff7` and verified by claude-opus / codex-luna. Decisions: R5.2 literal, cost-inputs modal stays dense.
- **Pass 7 (2026-09-13 20:10 UTC, live `dea90cb`):** verified F-43, F-44, F-48 (Codex); fixed F-49 cost
  precision and F-52 Compare head; opened F-50, F-51. Decisions: R5.2 literal, R3.1 pass-1 wording stood
  (superseded in pass 8 after the 20:50 review gate), F-22 map = pool.
- **Pass 6 (17:30 UTC, live `2cf4080`):** verified F-42, F-45 (Codex); fixed F-46 phone (i) overflow
  and F-47 error boundary; opened F-48. Decisions: R3.1 line 2 final (fallback recorded for X7),
  R5.3 floor 85 applied as ≥ 85, F-22 map = pool with ranked rows full-opacity.
- **Pass 5 (15:30 UTC, live `3d7af32`):** verified F-31 … F-38 (Codex); fixed F-39 (log axis, 46/138
  overlapping ticks → 0); opened F-40 slider leak, F-41 hatch rule, F-42 phone captions, F-43 radar,
  F-44 Compare, F-45 small cuts. Decisions: log axis with pinned free routes stays (R5.10); hatch
  counts exact + attached; F-38 label superseded by R5.7.
- **Pass 4 (live `0a1…`):** fixed F-29 dark-map labels and F-30 Guided→Simple leak; opened F-31 … F-38.
  Decisions: hero line 2 kept with fallback for X7; R5.2 cost-descending Simple kept; "est." moved
  from cells to header.
- **Pass 3:** model page as release post (F-08b), phone Advanced Refine sheet (F-23), Benchmaxxing
  table density (F-24), thin-evidence hatch (F-25), Benchmarks page (F-27), slider histograms (F-28).
- **Passes 1–2:** hero claim R3.1, compact hero F-01, one-row nav F-02, Simple value map F-03,
  ranking bars F-05, many-axis radar F-07, Charts F-09, wizard polish F-10, footer F-12, one
  shortlist card F-13, phone table F-14, header F-15, full-catalog Advanced F-16, collision-free
  map labels F-17, Filters overlay F-18.
- **Independent verification (claude-opus, iteration 14, live `0e7380c`):** F-02, F-03, F-05 verified;
  F-12 fixed there; F-01 → F-13, F-06 → F-16. Evidence `ux-evidence/iter14-indep-review/`.

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
| F-19 Benchmaxxing title, ring labels, signal table and tagged selector markers | `0c37a18` (Codex Luna) | `/opt/benchmarkheaven/state/ux-evidence/iter18-f19-live/`; `ux-evidence/iter45-indep/f19-{canonical,legacy}/` (`bin/verify-r410-r58-r511-f19.mjs`) | **verified by claude-opus (iteration 45, non-implementer):** independent verifier re-run on live `de54827`, both hosts, 0 failures |
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
| F-35 Compare release-post table: compact native values, percentile bars and one evidence expand per benchmark row | `085207b` (Codex Luna) | `ux-evidence/iter25-f35-live/{canonical,legacy}/verification.json`; `ux-evidence/fable-20260913-pass5/verify-f31-f38/` | **verified by Fable (pass 5):** 0 "observed 2026-" outside expands, 23 rows each with bars and a bold best value, both widths |
| F-36 Model page: suppress empty protocol-divergence copy; label Copilot card | `085207b` (Codex Luna) | `ux-evidence/fable-20260913-pass5/verify-f31-f38/` | **verified by Fable (pass 5):** no "Protocol-compatible", Copilot eyebrow above token offers, both widths |
| F-37 Subscription list: neutral verdict chips and one uncollected-plan footnote | `085207b` (Codex Luna) | `ux-evidence/fable-20260913-pass5/verify-f31-f38/` | **verified by Fable (pass 5):** no `text-warn` in the disclosure, "not collected" once, both widths |
| F-38 Simple score caption and one-line explanatory small print | `085207b` (Codex Luna) | `ux-evidence/fable-20260913-pass5/verify-f31-f38/` | **verified by Fable (pass 5):** small print 167 chars with the methodology link; caption wording superseded by R5.7 ("Minimum Capability Score (Composite)") |
| F-31 coverage pips, "est." out of the cells, "(modeled $/task)" header | `e57fa3a` (Codex Luna) | `ux-evidence/fable-20260913-pass5/verify-f31-f38/` | **verified by Fable (pass 5):** 101/101 Advanced rows carry a pip row, 0 cells with `est.` or `/7 inputs`, header sub-label present, both widths; rule refined by F-41 |
| F-32 exact vs attached Composite inputs, benchmark-count invariant | `e57fa3a` (Codex Luna) | same | **verified by Fable (pass 5):** `# benchmarks ≥ exact inputs` on all 101 rows; Opus 5 page says "2/7 exact inputs · 4 attached"; the hatch consequence is F-41 |
| F-33 Benchmaxxing card self-height, HTML sector labels | `efa17f9` (Codex Luna) | same | **verified by Fable (pass 5):** card 326 px at 1440; labels 16 px tall at 390; no overflow |
| F-34 Benchmarks page: one coverage line, a bar per result | `efa17f9` (Codex Luna) | same | **verified by Fable (pass 5):** coverage sentence present, no stat boxes, 25 bars, both widths |
| F-39 Simple value map: log cost axis restored, free routes pinned at the left edge, round money ticks | `64063b5` (Fable, pass 5) | `ux-evidence/fable-20260913-pass5/after-F39/verification-F39.json` + screenshots | live on both hosts: 0 overlapping tick labels at 1440/390, light/dark (was 46/138); needs a non-Fable verifier |
| F-40 Simple's sliders belong to Simple: split floor/cap by mode, Guided writes the Advanced pair, removable floor chip | `f454195` (Claude Opus 5) | `ux-evidence/iter29-f40/live-{canonical,legacy}/verification.json` | live 1440/390 both hosts, 0 fails; needs a non-Claude-Opus verifier |
| F-41 One evidence rule: thin = exact + attached < 3; attached pips half-filled; conditional Simple clause | `d5c2ac9` (Claude Opus 5) | `ux-evidence/iter29-f41/live-{canonical,legacy}/verification.json` | needs a non-Claude-Opus verifier |
| F-42 phone Simple: sliders stacked, captions one line | `f7fb2a2` (Codex Luna) | `ux-evidence/review-20260913T161002Z/`; `ux-evidence/fable-20260913-pass6/mobile_*-simple*.png` | **verified by Fable (pass 6):** captions ≤ 21 px, values on the caption line, card 485 px at 390 |
| F-45 Benchmarks 3 columns, Compare in the row expand; 36 px Advanced toolbar controls | `f7fb2a2` (Codex Luna) | same | **verified by Fable (pass 6):** Rank · Model · Result at 1440, toolbar one row of equal controls |
| F-46 phone table columns 42 / 27 / 31 % so the Adjusted Cost (i) stays inside the card | pass 6 (Fable, surgical) | `ux-evidence/fable-20260913-pass6/checks/verification-F46-F47.json` | needs a non-Fable verifier: (i) right edge ≤ table right edge at 390 in Simple and Advanced |
| F-47 route error boundary (`app/error.tsx`) | pass 6 (Fable, surgical) | same | needs a non-Fable verifier: `/models/<bad-id>` or a thrown client error renders the branded panel with nav intact |
| F-48 Benchmarks head card merged and first result brought into the first screen | `7c275c4` (Codex Luna) | `/opt/benchmarkheaven/state/ux-evidence/iter31-f48-live/verification-f48.json`, plus canonical/legacy F-27 screenshots and verification | **verified** (Fable pass 7, row below; re-checked by claude-opus iteration 45 in `ux-evidence/iter45-indep/r53-f48-{canonical,legacy}/`, `bin/verify-r53-f48.mjs`): one picker panel, both selectors, text Primary source link, no page-head eyebrow, first row within the first screen, no overflow at 1440/390 light/dark on both hosts. The small category label above the benchmark name inside the panel was kept deliberately in `7c275c4` |
| F-43 Benchmaxxing radar defaults to measured axes, labelled topic sectors, "Show all n axes" toggle | `6508c5f` (Codex Luna) | `ux-evidence/fable-20260913-pass7/checks/verification-F43-F44.json`, `…/desktop_light-benchmaxxing-full.png` | **verified by Fable (pass 7):** 29 spokes = 29 measured at 1440 and 390, toggle present and off, 7 sector labels |
| F-44 Compare picker row, radar (i), no jump links | `6508c5f` (Codex Luna) | same | **verified by Fable (pass 7):** 3,967 px / 5,233 px; combobox on the chip line at 1440, chips ≤ 160 px at 390; first chart 555 / 858 px; 0 jump links; keyboard remove buttons present |
| F-48 Benchmarks head card merged | `7c275c4` (Codex Luna) | `ux-evidence/fable-20260913-pass7/desktop_light-benchmarks.png`, `mobile_light-benchmarks.png` | **verified by Fable (pass 7):** one panel, selectors on one row at 1440, text Primary-source link, one paragraph, first ranked row at ~560 px desktop |
| F-49 cost precision: 2 decimals ≥ $1, 3 significant figures < $1 | pass 7 (Fable, surgical, `components/PriceValue.tsx`) | `ux-evidence/fable-20260913-pass7/after/` once live | needs a non-Fable verifier: no `$` value in Simple/Advanced/model page shows > 3 decimals |
| F-52 Compare head: "Compare" + one line, no eyebrow | pass 7 (Fable, surgical, `app/compare/page.tsx`) | same | needs a non-Fable verifier |
| F-49 + F-52 independent check | — | `ux-evidence/iter34-f49-f52/live-{canonical,legacy}/verification.json` (`bin/verify-f49-f52.mjs`) | **verified by claude-opus (iteration 34):** 18/18 per host at 1440/390; Simple `$17.31`/`$14.17`/`$0.895`, 606 Advanced price cells and 25 model-page prices with no over-precise figure; Compare H1 "Compare", no eyebrow, one line, no overflow |
| F-51 radar axes inside the radar card | `2d9c834` (Kimi K3 → Nex fallback draft in `.worktrees/f51`, reviewed, typed and integrated by Claude Opus 5) | `ux-evidence/iter34-f50-f51/live-{canonical,legacy}/verification.json` (`bin/verify-f50-f51.mjs`); `f44-*`, `f35-*` regressions | live both hosts, 1440/390, light/dark: exactly one panel between picker and "strongest", summary inside it, order exact values → axes → how to read, axis toggle re-draws, heights within bounds; `verify-f44`/`verify-f35` 0 fails. Needs a non-Claude-Opus verifier |
| F-50 topic-groups disclosure in the right column | `3d32e8c` (Codex Luna) | `/opt/benchmarkheaven/state/ux-evidence/iter36-f50-live-{canonical,legacy}/verification.json` (`bin/verify-f50-f51.mjs`) | **verified by claude-opus (iteration 45, non-implementer):** `bin/verify-f50-f51.mjs` re-run on live `de54827`, both hosts, 1440/390, light/dark, 42/42, evidence `ux-evidence/iter45-indep/f50-{canonical,legacy}/`. Implementer note: at 1440 the right column stretches with the radar grid row and the collapsed disclosure fills the remaining height (radar bottom 1,761, column bottom 1,801; 40 px gap); at 390 the radar → signal → disclosure order remains stacked, with no overflow. Both hosts pass 42/42 in light/dark. |
| F-53 hero claim re-decided (R3.1): "Every AI model benchmark we can find, in one place. / And what each model really costs you." in `app/page.tsx`, metadata + footer in `app/layout.tsx`, OG artwork regenerated via `scripts/build-brand-assets.mjs --png` | pass 8 (Fable, surgical) | `ux-evidence/fable-20260914-pass8/after/` once live | **verified by claude-opus (iteration 44):** live `fd4a907` and again on `84cdff7`, both hosts, 1440/390, light/dark — H1 exact, 2 lines desktop / 3 phone, footer does not repeat it, `og:description` matches (`ux-evidence/iter44-f53-verify/live-{benchmarkheaven,model-market-comparison}/verification.json`)
| F-55 one (i) style: transparent trigger in both themes | pass 8 (Fable edit, committed in `84cdff7` by Claude Opus) | `ux-evidence/iter44-f53-verify/live-*/verification.json` | **verified by claude-opus (iteration 44):** `getComputedStyle` background `rgba(0, 0, 0, 0)` at 1440/390, light and dark, both hosts |
| F-54 human version labels (`lib/version-label.ts`; also BenchmaxxExplorer, BenchmaxxingReport and Compare rows, which the spec did not list) | `84cdff7` (Claude Opus; the Kimi K3 delegation produced no diff) | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T020001Z/f53-f57-{canonical,legacy}/`, `/opt/benchmarkheaven/state/ux-evidence/review-20260914T020001Z/f54-f56-{canonical,legacy}/` | **verified by codex-luna (non-implementer):** both hosts, 1440/390, light/dark; no `snapshot-`/`(unversioned)`/"No verified semantic version" on `/`, model page, `/compare`, `/benchmarks`; published and semantic labels render correctly. |
| F-56 phone names wrap only at spaces, badges on the org line | `84cdff7` (Claude Opus) | same | **verified by codex-luna (non-implementer):** both hosts, 390/1440, light/dark; no name token spans line boxes, badges are on the org line on phones and inline on desktop, and there is no overflow. |
| F-57 model page title wraps on phones | `84cdff7` (Claude Opus) | `/opt/benchmarkheaven/state/ux-evidence/review-20260914T020001Z/f53-f57-{canonical,legacy}/` | **verified by codex-luna (non-implementer):** both hosts, 390/1440, light/dark; the full Claude Opus 5 title is readable on the phone model page and the page remains contained. |
| F-60 phone model page: Composite card before the provider table (`order-first lg:order-none`) | `9240da5` (Fable, surgical) | `ux-evidence/fable-20260914-pass9/verify-1dc6b69-{canonical,legacy}/verification.json`, re-run on `7b5320d` | live both hosts: Composite h2 at 260 px vs providers at 703 px at 390; side by side (212/212) at 1440; **verified by claude-opus (iteration 47, non-Fable, non-Kimi):** live `21aa63f`, both hosts, 1440/390, light/dark — `verify-f58-f61` 36/36, `verify-f63-f64` 22/22, `verify-review-0610` 68/68 per host (`ux-evidence/iter47-indep/`) |
| F-61 no doubled version tokens (`versionSuffix()` in `lib/version-label.ts`; BenchmarkSheet, BenchmarkRadar, BenchmarkEvidence, BenchmarkCompare) | `9240da5` + `97e50a4` (Fable, surgical) | `ux-evidence/fable-20260914-pass9/verify-7b5320d-{canonical,legacy}/verification.json` | live both hosts: no `vX vX` on the model page or `/compare` at 1440/390, light/dark; **verified by claude-opus (iteration 47, non-Fable, non-Kimi):** live `21aa63f`, both hosts, 1440/390, light/dark — `verify-f58-f61` 36/36, `verify-f63-f64` 22/22, `verify-review-0610` 68/68 per host (`ux-evidence/iter47-indep/`) |
| F-58 compact phone radar (numbered axes, legend list, no horizontal scroll) | `7b5320d` (Kimi K3 draft via `bin/delegate.sh --kimi`, reviewed/adjusted by Fable) | same + `mobile_*-compare-radar.png` | live both hosts: SVG 316×316 in a 316 px region, 6 numbered axes + 6-entry list, scroll hint gone, desktop SVG keeps named labels; **verified by claude-opus (iteration 47, non-Fable, non-Kimi):** live `21aa63f`, both hosts, 1440/390, light/dark — `verify-f58-f61` 36/36, `verify-f63-f64` 22/22, `verify-review-0610` 68/68 per host (`ux-evidence/iter47-indep/`) |
| F-59 HTML bar rows on Charts below `md` (`MobileBars`) | `7b5320d` (Kimi K3 draft, reviewed by Fable) | same + `mobile_*-charts.png` | live both hosts: recharts hidden at 390, two lists of 16 rows, longest bar 323 px, shortest 2.7 px; desktop recharts unchanged (32 bars, first 368 px); **verified by claude-opus (iteration 47, non-Fable, non-Kimi):** live `21aa63f`, both hosts, 1440/390, light/dark — `verify-f58-f61` 36/36, `verify-f63-f64` 22/22, `verify-review-0610` 68/68 per host (`ux-evidence/iter47-indep/`) |
| F-62 desktop Compare radar `max-w-[640px]` | `7b5320d` (Fable) | same + `desktop_*-compare-radar.png` | live: SVG 640 px wide, "Where each model is strongest" at 1,221 px (was ~1,400); **verified by claude-opus (iteration 47, non-Fable, non-Kimi):** live `21aa63f`, both hosts, 1440/390, light/dark — `verify-f58-f61` 36/36, `verify-f63-f64` 22/22, `verify-review-0610` 68/68 per host (`ux-evidence/iter47-indep/`) |
| F-63 theme-aware tracks on Charts (`bg-line`, `bg-line/40`) | `21aa63f` (Fable, surgical) | `ux-evidence/fable-20260914-pass10/verify-21aa63f-{canonical,legacy}/verification.json` (`bin/verify-f63-f64.mjs`) + `mobile_light-charts.png` | live both hosts, 1440/390, light/dark; **verified by claude-opus (iteration 47, non-Fable, non-Kimi):** live `21aa63f`, both hosts, 1440/390, light/dark — `verify-f58-f61` 36/36, `verify-f63-f64` 22/22, `verify-review-0610` 68/68 per host (`ux-evidence/iter47-indep/`) |
| F-64 Composite coverage line "6 of 7 inputs · 4 from the model family" | `21aa63f` (Fable, surgical) | same + `*-model.png` | live both hosts; "exact inputs" gone; **verified by claude-opus (iteration 47, non-Fable, non-Kimi):** live `21aa63f`, both hosts, 1440/390, light/dark — `verify-f58-f61` 36/36, `verify-f63-f64` 22/22, `verify-review-0610` 68/68 per host (`ux-evidence/iter47-indep/`) |
| F-65 boards never open empty: automatic widening (measured+matched → all+matched → all as named by the source), one notice line, honest coverage sentence, plain-language labels | `72da684` (Fable; Kimi K3 delegation produced no diff in 21 min) | `ux-evidence/fable-20260914-pass11/verify-f65-{canonical,legacy}/verification.json` (`bin/verify-f65.mjs`, 168/168 per host) + `*-{vals-code-migration,cursorbench,apprentice-cua,frontiercode}.png` | live both hosts, 1440/390, light/dark: 4 E2 boards open with rows, one notice line, Evidence = All, box ticked; AA index unchanged (Measured only, 641, no notice); needs a non-Fable verifier |
| F-66 error boundary Details disclosure (`app/error.tsx`); page-error capture in `bin/shoot-fable-pass11.mjs` | `72da684` (Fable) | deployed chunk `/_next/static/chunks/app/error-0301bee61d33e4e4.js` contains the summary and message expression; `/models/<bad-id>` is a 404, not the boundary | needs a non-Fable verifier (force a client error in a dev build and read the Details text) |
| F-67 value-map labels: four corner-aligned slots + 20 px headroom in the compact chart's top margin (`PointLabels`, `CostCapabilityScatter.tsx`) | `5e974fe` (Fable, surgical) | `ux-evidence/fable-20260914-pass12/verify-f67-f68-{canonical,legacy}/verification.json` (`bin/verify-f67-f68.mjs`, 32/32 per host) + `*-simple.png` | live both hosts, 1440/390, light/dark: the highest-scoring Simple row (Claude Fable 5.1) is named on the map, no label overlap, all labels inside the SVG, no overflow; needs a non-Fable verifier |
| F-68 Benchmaxxing name cell wraps below `md` (`truncate` → `md:truncate`) | `5e974fe` (Fable, surgical) | same + `*-benchmaxxing.png` | live both hosts: 0 of 10 name cells clipped at 390, single line at 1440, no overflow; needs a non-Fable verifier |
| F-67 value map: eight label slots + 20 px headroom | `5e974fe` (Fable, pass 12) | `ux-evidence/fable-20260914-pass12/verify-f67-f68/`; `ux-evidence/iter49-indep/` | **verified by claude-opus (iteration 49)** |
| F-68 Benchmaxxing names wrap below `md` | `5e974fe` (Fable, pass 12) | same | **verified by claude-opus (iteration 49)** |
| F-69 phone benchmark sheet: two-line rows, names wrap | `f23f5f9` (Fable, pass 13) | `ux-evidence/fable-20260914-pass13/verify-f69-f71/verification.json` | live-checked by Fable (see ledger); needs a non-Fable verifier |
| F-70 value-map label halo | `f23f5f9` (Fable, pass 13) | same | live-checked by Fable; needs a non-Fable verifier |
| F-71 cost modal: integer tokens, one-decimal ratio and hit rate | `f23f5f9` (Fable, pass 13) | same | live-checked by Fable; needs a non-Fable verifier |
| F-72 Charts "Cheapest models" as a log-position dot plot at both widths | `26a709c` (claude-opus, iteration 51) | `ux-evidence/iter51-f72/`; `ux-evidence/fable-20260914-pass14/verify-f72/{canonical,legacy}/verification.json` + `desktop_{light,dark}-charts*.png`, `mobile_light-charts-full.png` | **verified by Fable (pass 14, non-implementer):** 34/34 per host, 1440/390, light/dark; judged right by eye at both widths and themes |
| F-73 all-unmatched E2 boards say "not matched" once | `4dffc1d` (claude-opus, gate 130002Z) | `ux-evidence/fable-20260914-pass14/{desktop,mobile}_light-benchmarks-{vals,cursorbench,realswe}.png` | **verified by Fable (pass 14, non-implementer):** the phrase appears once (notice line) on Vals, CursorBench and Real-SWE at 1440 and 390 |
| F-74 shortlist cap keeps the Pareto line, then the highest scores; caption renamed | `e33635b` (Fable, pass 14) | `ux-evidence/fable-20260914-pass14/verify-f74-f76/{canonical,legacy}/verification.json` (36/36 per host), `…/pre-deploy/` (old build: GLM-5.3-Flash missing) | live-checked by Fable; needs a non-Fable verifier |
| F-75 Guided result actions wrap between buttons, never inside one | `e33635b` (Fable, pass 14) | same | live-checked by Fable; needs a non-Fable verifier |
| F-76 evaluation-group option without a zero-peer count | `e33635b` (Fable, pass 14) | same | live-checked by Fable; needs a non-Fable verifier |
| F-79 matrix data bar as a 22 px band; phone stub without the clamped description | `313e24c` (Fable, pass 15) | `ux-evidence/fable-20260915-pass15/after/{canonical,legacy}/verification.json` (40/40 per host) | live-checked by Fable; needs a non-Fable verifier |
| F-80 matrix row labels "AA Coding Agent Index v1.4/v1.5" (short vendor prefix) | `313e24c` (Fable, pass 15) | same | live-checked by Fable; needs a non-Fable verifier |
| F-81 comparable rows first inside a category | `313e24c` (Fable, pass 15) | same | live-checked by Fable; needs a non-Fable verifier |
| F-82 Simple-mode Benchmarks section: collapsed model names in the column headers | `313e24c` (Fable, pass 15) | same | live-checked by Fable; needs a non-Fable verifier |

