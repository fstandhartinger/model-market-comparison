# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 17: 2026-09-15 ~18:00 UTC**, the "what changed since pass 16" pass (Florian: Fable sparingly), against live
revision `4e126b6` (https://benchmarkheaven.com) — iteration 71's batch: CR-18 (derived slider default), CR-19…25
(compare radar, equal columns, one Benchmaxxing row per model, signal bar, report copy, spokes, More menu, cost tag,
Options rename), CR-28.1, CR-29 (two-line label, outlier tags), CR-31 (hint, (i) per benchmark), CR-32 (pickers,
shorter tips, fitted Y, cogwheel), CR-33 (shortlist column chart, Main Composite row first), CR-35 (AA/Epoch credits,
BETA tag). Evidence: `/opt/benchmarkheaven/state/ux-evidence/fable-20260915-pass17/` — 96 shots + `metrics.json`
(Simple with pickers/menus/cost modal/section 2, Options, More menu, Advanced, Compare + radar, Benchmaxxing overview /
report / side-by-side, model page; 1440/390 × light/dark) plus `*-section2-top.png`, `*-beta-focus.png`,
`desktop_light-benchmaxxing-compare.png`, `desktop_light-compare-top.png`. Script: `bin/shoot-fable-pass17.mjs`.
Pass-17 fixes live-checked in `after/` (`bin/verify-f87-f93.mjs`). Earlier passes: `…/fable-20260915-pass16/` …
`…/fable-20260913/`.

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

## Verdict on the live site — pass 17 (2026-09-15), what changed since pass 16

**Iteration 71 landed a large batch and the site is still at the bar in substance: every page is clean at both widths and
both themes (0 page errors in 96 shots), the Simple card reads as one sentence — "how good, how cheap" — with the
derived default (69) putting the cheapest top model on the Pareto line, the compare radar now shows two strong models as
two different shapes (zoom window 40–100 with an honest sentence), Benchmaxxing is one row per model with a
master-detail report and a clean side-by-side mode, and the BETA tag and the AA/Epoch credits sit where they must
without shouting.** The tagline stands. What was not yet right was small and mostly at the edges — seven findings,
all fixed surgically in this pass (`cadbe88`, `992fa97`):

1. **The desktop More menu was 63 px wide.** CR-23.1 anchored it to its button, and `max-w-full` then clamped the
   256 px menu to the summary's width: "Cost vs / Capability", "Providers / per Model" wrapped inside a sliver. →
   **F-87**: the clamp is gone; the menu is 256 px, anchored, inside the viewport.
2. **"BETA— Work in progress".** The space before the dash lived at the start of an inline-flex item and was
   collapsed. → **F-88**: a non-breaking space, so the text carries the space for eyes and readers alike.
3. **The Simple score picker spoke registry ("ArtificialAnalysis — Coding Agent Index v1.4 (median harness)")** while
   the radar, tables and Options say "AA Coding Agent Index"; on the phone the menu ran 42 px past the viewport. →
   **F-89**: one naming for pickers (`SCORE_PICKER_LABELS`: AA Intelligence Index · AA Coding Index · AA Coding
   Agent Index v1.4 · Epoch ECI · Epoch Software ECI · DesignArena Full-Stack (Elo) · DesignArena Frontend (Elo)),
   used by the slider picker and the shortlist chart's select; the menu never exceeds the phone width.
4. **The phone value map had two Y ticks (50, 100)** after CR-32.4 fitted the axis — a 200 px chart with no middle
   reference. → **F-90**: floor, the round tick nearest the middle, top.
5. **The desktop compare radar was a thumbnail** (R = 150 in a 1368 px card, most of the card empty). → **F-91**:
   R 205, 900×600 viewBox, container 820 px; labels to 30 characters; the phone radar unchanged.
6. **In the Simple benchmark table on phones the (i) dropped to its own line** under every wrapped name (the stub is
   a wrapping flex row), adding a line to most rows; the footnote also repeated the intro sentence word for word. →
   **F-92**: the (i) follows the last word (`.bh-matrix-bench-inline`); the footnote starts with the rule; the sr-only
   caption no longer says "Headline" (CR-28.1 made it every benchmark).
7. **The shortlist column chart (CR-33.1) panned horizontally on phones** — 8 of 25 columns visible, the rest behind
   a scroll — against the pass-9 rule; on desktop the 25 rotated names read top-to-bottom and were cut at 6.5 rem
   ("DeepSeek V4 Flash 0…"). → **F-93**: below `md` the same data as bar rows (name · bar · value, all models in
   view, no panning); at `md` and above the columns stay, names read bottom-to-top (the plotting convention) with room
   for the longest name. Florian asked for "a column chart"; the phone re-layout is the standing design-system rule,
   recorded for X7.

Not findings, checked: the cost modal is now four plain bullets and a compact Sources block — right; "↑ 14× pricier"
sits left of the price on one line (CR-24.1); the derived slider default is explained by the "25 models pass of 30 ·
5 below your score line" line; the outlier tags (TOP/LOW) are text-first and rare (two in 49 rows); the Benchmaxxing
side-by-side report keeps both signal cards under one radar; the model page and Advanced are unchanged and at the
bar; the hint "This is a simplified list" appears once beside the button and leaves.

What the next work items must get right the first time — design given up front, not after: the Options panel's
regional and models/providers/labs sections (CR-25.4, CR-25.5, CR-36.3 → **F-94**), the Compare model picker
(CR-36.1/36.2 → **F-95**), the Charts value map (CR-26.1 → **F-96**), and one line of Benchmaxxing copy (**F-97**).

## Decisions in pass 17

1. **R3.1 / CR-10.1 stands.** No change to the tagline.
2. **Pickers use the site's short names** (F-89); the registry labels ("ArtificialAnalysis — …", "Epoch AI —
   Capabilities Index (ECI)") appear only inside the Score (i) and on the Sources page. Rule added below.
3. **The shortlist chart is bar rows below `md`** (F-93) — the pass-9 rule ("no chart requires horizontal panning")
   wins over the literal "column chart" on phones; at `md`+ it is the column chart Florian asked for. Recorded for X7.
4. **A zoomed radar says so** (already CR-19.2's sentence) and is drawn at chart size, not thumbnail size (F-91): on
   desktop a radar's outer ring spans ≥ 40 % of its card width.
5. **Fable landed F-87…F-93 itself** (surgical; Kimi stalls on TSX per the record) — they need a **non-Fable verifier**:
   `BH_RUNNER=<engine> node ops/ux-2026-09-12/bin/verify-f87-f93.mjs <base> <out>` (both hosts, 1440/390, light/dark).
6. **X4 (UI meets the design bar): judged met at pass 17** for the iteration-71 batch, pending that verification; the
   ledger row stays with its owner until X6.
7. **Next Fable pass:** only after CR-25.4/25.5/36 land (they change the Options panel and the Compare picker), and
   only one — F-94/F-95 give the design in advance so that pass is a check, not a redesign.

## R3.1 — Hero claim (decided in pass 1, re-decided in pass 8, confirmed passes 9–16)

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

> **Status 2026-09-15 pass 17 (Fable), end of pass:** open for implementers: **F-94, F-95, F-96, F-98** (design for the
> pending CR-25.4/25.5/36.3, CR-36.1/36.2, CR-26.1 and CR-38.2/38.3 — take them together with those rows) and **F-97**, **F-99** (surgical copy/placement).
> **Verification review gate 20260916T010002Z (opencode-kimi ≠ implementers):** F-97 re-run live **53/53 per host** (verify-cr-19-25), F-99 **52/52 per host** (verify-cr-29-31); F-95 **65/65 per host** (verify-cr-36-1-2); all at `958f207`, 1440/390, light/dark.
> **Iteration 74 (claude-opus):** **F-97** (Signal sub-label "bars scaled to N, the list's highest") and
> **F-99** (phone: the simplified-list hint is a full-width line under the button, never over the intro) **landed**
> in `aa46183`, live 53/53 and 52/52 per host. **F-95 implemented** with CR-36.1/36.2 (`verify-cr-36-1-2` 65/65 per
> host) — one deviation: the empty-query list is headed **"Top by AA Intelligence Index"**, not "Top by Composite"
> (the Composite exists only client-side; see iteration 74's note in `PROGRESS.md`). Still open: **F-98**.
>
> **Iteration 73 (claude-opus):** F-94 landed (`808ef9e`; one deviation: the provider quick-pick links were dropped, they squeezed the list) and F-96 landed (`95fd086`), both live-checked by the implementer (`verify-cr-25-36` 76/76, `verify-cr-26-1` 56/56 per host) — they need a non-claude verifier and the next Fable pass. F-95, F-97, F-98, F-99 stay open.
> F-87…F-93 landed (`cadbe88`, `992fa97`) and were live-checked by Fable (`fable-20260915-pass17/after/`); they need a
> non-Fable verifier (`verify-f87-f93.mjs`). F-86 was landed by iteration 66 and verified by claude-opus.

### F-94 `[judgment → claude-opus, with CR-25.4 / CR-25.5 / CR-36.3]` Options panel: regional rows and the models · providers · labs comboboxes
*Where:* `components/GlobalFilters.tsx`, `lib/regions.mjs` (tested groundwork), `app/globals.css`, the presets in
`lib/presets.mjs`.
*What:*
1. **Section order:** Ranking · Price basis (keeps "I'm buying for a company", CR-25.3) · **Models, providers and
   labs** · **Regional** · Data confidentiality · More settings. The footer (Show N models · Presets) and the sentence
   "Applies to price views & model offers; benchmark evidence stays unfiltered." stay as they are.
2. **Regional = three rows of the same shape**, one per axis, positively worded (CR-25.4): a label at the left —
   "Hosted in", "Provider company based in", "Model lab based in" — and four toggle chips **China · EU · US · Other**,
   all pressed by default, the existing `aria-pressed` chip style, **no (i)** and no checkboxes. One muted line under the
   three rows: "Hosting = where inference runs; company = where the provider or lab is registered." A stored
   `euHostedOnly` / `excludeChinese` / `nonUsOnly` maps onto the chips (`regionStateFromLegacy`); default users see
   identical results before and after.
3. **Models, providers and labs = three identical compact comboboxes** in one row at `md`+ (stacked at 390): a
   trigger button reading "Models: All" / "Providers: 3 of 91" / "Labs: All"; it opens a popover **as wide as the
   trigger (min 280 px), max-height 320 px with internal scroll**, a search field on top, "All · None" links, the list
   grouped alphabetically with the selected items first; selected items are chips **inside the popover**, never in the
   panel — the panel shows only the count. On phones the popover is a bottom sheet like the Options sheet. Keyboard:
   Tab to the trigger, Enter opens, typing filters, Space toggles, Escape closes and returns focus.
4. Nothing else moves; the old Models/Providers dropdown markup is removed, not hidden.
*Accept (both hosts, 1440 popover and 390 sheet, light/dark):* the Options popover is ≤ 600 px tall at 1440 with the
comboboxes closed; nothing wider than the sheet at 390; the three regional rows have four chips each, all pressed on a
fresh load; a combobox popover never exceeds 320 px in height and scrolls inside; the CR-25.4 mapping test and
`verify-cr-6-8` / `verify-cr-presets` pass; screenshots of the panel and one open combobox in every context.

### F-95 `[judgment → claude-opus, with CR-36.1 / CR-36.2]` Compare "Add a model" picker
*Where:* `components/BenchmarkCompare.tsx` (or the picker component it uses), `lib/benchmark-view.mjs` for the one-entry-per-model
collapse, `app/globals.css`.
*What:* the input stays where it is; the results are a **listbox directly under the input** (same width as the input
+ Add button, min 360 px, max-height 380 px, internal scroll, opaque, above everything). Each option is one entry per
model family (CR-36.2): line 1 — org dot, model name with the matched characters bold, the main score right-aligned in
tabular figures; line 2, muted — lab · released YYYY-MM · "best of N variants" when variants were collapsed. With an
empty query the list shows **"Top by Composite" (8 entries)**; while typing, "Matches" alphabetically; keyboard ↑ ↓
Enter Esc, `aria-activedescendant`; on phones the listbox becomes a full-width sheet under the header with the input at
its top. The A–D chips above keep their style; a chip's tooltip names the variant behind each best-of value.
*Accept:* no clipping or overflow at 1440/390, light/dark; options are ≤ 2 lines; Fable 5.1 and GPT-6 Astra appear
once each; keyboard-only selection works; `verify-cr-14` and `verify-cr-19-25` pass.

### F-96 `[judgment → claude-opus, with CR-26.1]` Charts cost-vs-capability = the Simple value map, full width
*Where:* `components/ChartsBoard.tsx`, `components/CostCapabilityScatter.tsx` (compact mode already has everything).
*What:* the Charts card renders the **compact value map's pieces at full width** — reversed cost axis, green quadrant
with its note, Pareto line, in-chart labels with halos and collision handling, fitted Y axis, cogwheel — at 420 px
height on desktop and 240 px on phones (bar rows are not needed: it is a scatter). In the card header: a score select
(`SCORE_PICKER_LABELS`) and the two sliders (min score, max cost) from `ShortlistControls` in one row; the 30-model
rule applies when Featured is on. One card, one caption line, no second explanatory paragraph.
*Accept:* a parity checklist against the Simple map (axis, quadrant, line, labels, ticks, cogwheel, credits) all
present; sliders and select change the map; 1440/390, light/dark; no page errors.

### F-97 `[surgical, claude-opus]` Benchmaxxing Signal header sub-label
*Where:* `components/BenchmaxxingOverview.tsx`.
*What:* the Signal column's sub-label "bar 0–21.2" reads **"bars scaled to 21.2, the list's highest"** (value from the
same `max`). Nothing else changes; the page intro keeps "One row per model …" (asserted by `verify-cr-19-2-21-1`).
*Accept:* header text matches `/bars scaled to [\d.]+, the list's highest/`; CR-21.2 check in `verify-cr-32-33` passes.

### F-86 `[judgment → claude-opus]` "Better than a model": only offer comparisons the reference can answer
*Where:* `components/ModelExplorer.tsx` (`comparisonMetrics`, `comparisonPanel`), `lib/benchmark-comparison.mjs`
(labels), `test/benchmark-comparison.test.mjs` (or the nearest existing test file).
*What:*
1. **Disable what cannot work.** Once a reference model is chosen, every option in "Benchmark or category"
   whose `values[comparisonTarget]` is missing renders `disabled` with the suffix " · no result for this model";
   options with a bridged (approximate) value get the suffix " · bridged". The enabled options come first, in the
   existing order (category medians, then benchmarks); disabled ones follow. With no reference chosen the list is
   unchanged. If the currently selected metric becomes unavailable after a reference change, keep it selected
   (the existing "no comparable result" status line stays as the fallback) — do not silently clear it.
2. **No two options with the same label.** Where two axes share `name · category · unit`, append the registry
   version (`axis.version`, e.g. " · v1.4") to both; if the versions are equal too, append the cohort. Today 5 of
   70 labels collide. Unit test: `buildBenchmarkComparison` output has unique labels for a fixture with two
   versions of one benchmark.
3. **Reference list, cheap win:** the "Reference model" select keeps every catalog model (retained references
   like Opus 4.7 must stay choosable), but models with **no** value in any metric go last under a disabled
   separator option "— no comparable results —". No other change to that select.
4. Nothing else moves: the popover width, the Refine sheet block, the status sentence, "Clear comparison".
5. **Naming, while there:** the retained reference is labelled "Opus 4.7 (medium)" beside "Claude Opus 4.7 (Adaptive
   Reasoning, Max Effort)" — the harness-only catalog entry should carry the catalog convention ("Claude Opus 4.7
   (Adaptive Reasoning, Medium Effort)"), which is the P2 row's "duplicate harness-only catalog ids" follow-up; fix it
   there, not in the component.
*Accept (both hosts, 1440 popover and 390 Refine sheet, light/dark; `verify-p2-history.mjs` gains the assertions):*
after choosing the retained reference `claude-opus-4.7::medium` (today labelled "Opus 4.7 (medium)") the metric select has ≥ 1 enabled and ≥ 1
disabled option; every disabled option's text ends with "no result for this model"; the enabled option whose
label starts with "AA Coding Agent Index v1.5" (or the registry name) selects and the status line shows a value
with the bridge disclosure; all option labels are unique; `npm test` and `tsc` green; `verify-cr-1` 92/92 per
host unchanged.

### F-84 `[surgical, Fable — landed ec80831]` No data bar on a single-value row
*Where:* `lib/benchmark-matrix.mjs` (`rowBars`: `present.length < 2` → all `null`), `test/benchmark-matrix.test.mjs`.
*Accept:* on `/benchmarks` (All preset, top 5) every row with exactly one value shows the number without a
`.bh-matrix-bar`; rows with ≥ 2 values keep their bars; `verify-cr-1` CR-1.5 check (bars > 0, none on missing
cells, alpha ≤ .25) still passes at 1440/390, light/dark, both hosts.

### F-85 `[surgical, Fable — landed ec80831]` Status line without the second total
*Where:* `components/BenchmarkMatrix.tsx` (status `<p role="status">`), `ops/ux-2026-09-12/bin/verify-cr-1.mjs`.
*Accept:* the status line matches `/^\d+ benchmarks across \d+ categories · /` and contains no "rows"; the
rendered table has ≥ as many rows as the benchmark count; the rows chooser still reads "(N of N)" with N equal
to the status line's benchmark count; F-83's four assertions unchanged.

### F-98 `[judgment → claude-opus, with CR-38.2 / CR-38.3]` Saturated and judged benchmarks: one tag each, no new colour
*Where:* `lib/benchmark-matrix.mjs` (tag set of CR-1.7), `data/benchmark-taxonomy.json` (metadata), `components/BenchmarkMatrix.tsx`,
`components/SimpleBenchmarks.tsx`, the benchmark (i) copy.
*What:* the metadata CR-38.2/38.3 adds becomes **two more tags in the existing tag set**, drawn exactly like `Niche` /
`Community` (outlined pill, muted, `cursor: help`, one tooltip sentence): **`Saturated`** — "Top models sit near this
benchmark's ceiling; it separates weaker models, not the best." — and **`Judged`** — "A preference or judge score,
not task accuracy." The (i) tooltip's second line gains "Version X · tasks from YYYY-MM to YYYY-MM" when known. No
new colours, no icons, no extra column; a saturated row keeps its data bars. Category composites that down-weight
saturated rows say so in the category (i) in one clause ("saturated benchmarks weigh half").
*Accept:* the tag legend on `/about` lists both with the same sentences; every row with `saturated: true` or a
preference basis carries the tag in the Benchmarks page and the Simple table; tooltips opaque, correct z-index;
1440/390, light/dark.

### F-99 `[surgical, claude-opus]` Phone: the "This is a simplified list" hint must not cover the intro
*Where:* `components/SimpleBenchmarks.tsx` (CR-31.1 hint).
*What:* below `md` the hint renders as a full-width line directly under the "Open the full comparison" button (same
words, same accent style, same timing) instead of a bubble above it — on a 390 px screen the bubble hides the intro
sentence while it is shown (`fable-20260915-pass17/after/canonical/mobile_light-section2.png`). Desktop unchanged.
*Accept:* at 390 the hint's box does not intersect the intro paragraph's box; `verify-cr-29-31` CR-31.1 checks pass.

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
- **A data bar needs two values** (F-84): a row with a single result shows the number only; a lone band is
  "best of one" and misleads.
- **One total per line** (F-85): a status line counts one thing; secondary totals (rows, cohorts) live where the
  thing itself is shown.
- **The content starts within the first screen** (F-83): on a phone the first data cell of a page's main table
  is inside the 844 px viewport; controls collapse into two rows before they push it out.
- **Pickers speak the site's names** (F-89): every score picker, select and chart legend uses
  `SCORE_PICKER_LABELS` (AA Intelligence Index, Epoch ECI, DesignArena Full-Stack (Elo)); source-prefixed registry
  labels live only in the Score (i) and on the Sources page.
- **A radar is drawn at chart size** (F-91): on desktop the outer ring spans ≥ 40 % of its card width; a zoom window
  is always named in one sentence under the chart.
- **A phone axis has three ticks** (F-90): floor, a round middle, top — never two.
- **An (i) hugs its word** (F-92): the info button follows the last word of the name it explains; it never starts a
  line of its own.

---

---

---

## Earlier verdicts (condensed, for the record)

- **Pass 16 (2026-09-15 04:30 UTC, live `3dac13e`):** the Benchmarks page at the bar after F-83; fixed F-84 (no
  data bar on a single-value row) and F-85 (status line without the second total), Fable `ec80831`, verified by
  claude-opus (iteration 66); opened F-86 ("Better than a model" offers only answerable comparisons), landed by
  claude-opus `6d775aa`. Rules added: a data bar needs two values; one total per line.
- **Pass 15 (2026-09-15 00:30 UTC, live `15d1a78`), the CR-1.10 pass on the Benchmarks page:** right in substance,
  not yet excellent — the table started too far down and the bars were blocks. Fixed F-79 (22 px band, phone stub
  without description), F-80 ("AA " prefix), F-81 (comparable rows first), F-82 (collapsed names in the Simple
  section), Fable `313e24c`, verified by claude-opus (iteration 61, `4dbd631`); opened F-83 (status + presets on
  row 1, boxless controls on row 2, header sentence without a count), landed by claude-opus `5f8dd9e`/`962cc48`/
  `c650bdd`, verified by gate 012002Z (opencode-kimi). Decisions: "All" stays the default row preset; the phone stub
  carries name, tags and cohort only; CR-1.10 verified once F-83 was checked. Rules added: a data bar is a band;
  comparable rows first; content starts within the first screen.
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
| F-79 matrix data bar as a 22 px band; phone stub without the clamped description | `313e24c` (Fable, pass 15) | `ux-evidence/fable-20260915-pass15/after/{canonical,legacy}/verification.json` (40/40 per host); `ux-evidence/iter61-verify-962cc48/` | **verified by claude-opus (iteration 61, `4dbd631`)** |
| F-80 matrix row labels "AA Coding Agent Index v1.4/v1.5" (short vendor prefix) | `313e24c` (Fable, pass 15) | same | **verified by claude-opus (iteration 61, `4dbd631`)** |
| F-81 comparable rows first inside a category | `313e24c` (Fable, pass 15) | same | **verified by claude-opus (iteration 61, `4dbd631`)** |
| F-82 Simple-mode Benchmarks section: collapsed model names in the column headers | `313e24c` (Fable, pass 15) | same | **verified by claude-opus (iteration 61, `4dbd631`)** |
| F-83 Benchmarks page: status + presets on row 1, boxless column/row controls on row 2, header sentence without a count | `5f8dd9e` + `962cc48` + `c650bdd` (claude-opus, iterations 60–61) | `ux-evidence/review-20260915T012002Z/verify-cr-1/` (108/108 per host incl. the four F-83 assertions); pass 16 re-shot: first value y = 516 at 1440, thead y = 522 at 390 | **verified by review gate 012002Z (opencode-kimi)**; re-checked by Fable in pass 16 |
| F-84 no data bar on a single-value matrix row | `ec80831` (Fable, pass 16) | `ux-evidence/fable-20260915-pass16/after/{canonical,legacy}/verification.json` | live-checked by Fable; needs a non-Fable verifier |
| F-85 matrix status line without the second "in N rows" total | `ec80831` (Fable, pass 16) | same | live-checked by Fable; needs a non-Fable verifier |
| F-87 desktop More menu 256 px, anchored (was clamped to 63 px) | `cadbe88` (Fable, pass 17) | `ux-evidence/fable-20260915-pass17/after/{canonical,legacy}/verification.json` | live-checked by Fable; needs a non-Fable verifier (`verify-f87-f93.mjs`) |
| F-88 BETA tag with a real space before the dash | `cadbe88` + `992fa97` (Fable, pass 17) | same | same |
| F-89 score pickers use the short names; menu inside the phone | `cadbe88` (Fable, pass 17) | same | same |
| F-90 phone value map: three Y ticks | `cadbe88` (Fable, pass 17) | same | same |
| F-91 desktop compare radar at chart size (R 205, 900×600) | `cadbe88` (Fable, pass 17) | same | same |
| F-92 Simple table: (i) after the last word; footnote without the repeated intro | `cadbe88` (Fable, pass 17) | same | same |
| F-93 shortlist chart: bar rows below md, bottom-to-top names at md+ | `cadbe88` (Fable, pass 17) | same | same |
