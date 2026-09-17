# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 21: 2026-09-17 ~10:00 UTC**, the "what changed since pass 20" pass (Florian: Fable sparingly), against live revision
`facc759` on both hosts — iterations 90–95: the pass-20 directives F-107–F-111 (Compare radar percentile convention, Benchmaxxing
radar rings and copy, Overview legend disclosure, Benchmarks group header, InfoTip listener), the data & math gauntlet's visible
outcomes (CR-65.4 "Insufficient evidence" band, CR-65.5–65.7 level-adjusted signal and the tag turnover onto frontier models,
CR-65.15 D9 "Changed at source" chips), CR-67.7 (privacy: visitor statistics), CR-56.4 ("For agents"). Evidence:
`/opt/benchmarkheaven/state/ux-evidence/fable-20260917-pass21/` — 112 shots + `metrics.json` (0 page errors in all four
contexts; radar label geometry; tag lists), `verify-iter93/{canonical,legacy}/verification.json` (the iteration-93 verifier re-run
by a non-implementer: **59/62 per host**; the 3 misses are the "report unchanged since the pre-change capture" checks, which
CR-65.7 `41cfbcf` legitimately changed after that capture — the 59 presentational checks all pass). Scripts:
`bin/shoot-fable-pass21.mjs`, `bin/verify-iter93-fable20.mjs`. Earlier passes: `…/fable-20260916-pass20/` … `…/fable-20260913/`.

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

## Verdict on the live site — pass 21 (2026-09-17), what changed since pass 20

**Iterations 90–95 are at the bar; F-107 to F-111 are verified.** The Compare radar now plots Claude Fable 5.1 at p100 on
AA Intelligence (`desktop_light-compare-radar.png`), with a "Scale: Percentile · Native" control, `p50 … p100` ring labels and
the one-sentence zoom note; Native is unchanged. The Benchmaxxing radar has the zero ring with points on it, the dashed
"avg p73" reference ring, three ring labels, one contiguous grey "Other" arc at the end of the clock, and the honest copy
above and below (`desktop_light-bmx-radar.png`, GLM-5.3 max, the strongest tag); at 390 px every topic label of MiniMax-M2.7
(31 axes, "Long-context" wraps) sits inside the wrapper (`metrics.json`: `outside: []` for all six radar geometries). The
Overview footnote is one collapsed "Legend: marks and tags" line on a phone and opens to one `<dt>/<dd>` per mark, drawn in
the mark's own rendering. The Benchmarks group header stacks at 390 without overlap ("COMPOSITE INDICES / 5 benchmarks · 3
feed the group score"). The "Insufficient evidence" band in Advanced is one quiet uppercase row with a one-clause reason,
hatched bars and "n/7 inputs" under the score — right. "Changed at source" is one chip on the AA Coding Index row, in the
Headline/Niche chip style. The privacy page's "Visitor statistics" section is long but exact, which is what a disclosure
must be; "For agents" on /about is one dense paragraph that says the two ways in and the limits. 0 page errors in 112 shots.

**What is not at the bar — three things the level-adjusted signal exposed, all on the Benchmaxxing page.**

1. **The Signal bars say nothing on the tab that matters.** CR-65.5's level adjustment compressed the strong signals into
   14.5–15.5, so on "Strongest signals" all eight bars are the same length (`desktop_light-benchmaxxing.png`) — a bar
   column that never varies is decoration. The reference the reader needs is the catalog average that CR-65.6 made the tag
   depend on. Decision: **one bar scale for the whole page (0 to the catalog's highest signal), with a tick at the catalog
   average** (F-112).
2. **The ring labels collide with the 12-o'clock spoke.** "100", "percentile" and the "avg p73" label all sit on the
   12-o'clock spoke, which is a real benchmark axis: the "100" is drawn under the sector arc band, "percentile" is struck
   through by the topmost point (`desktop_light-bmx-radar.png`, `…-frontier.png`, and both at 390 px). Decision: **the
   ring numbers move to the half-step angle between spoke 0 and spoke 1, inside the ring, with the F-70 halo; the word
   "percentile" leaves the SVG for the caption** (F-113).
3. **The page explains the flag twice before the first row.** The page intro (CR-63.4) and the card's paragraph both say
   "screening flag, not proof"; on a phone the first table row lands at ~810 px of an 844 px viewport
   (`mobile_light-benchmaxxing.png`), just inside the F-83 rule. The status box reads "8 models carry the strong tag ·
   scored from 6 comparisons in 2 topics; a tag needs 10", which a reader parses as eight models scored from six
   comparisons. And the strong pill in the table is a pale tint while the same tag on the Overview is a solid pill (pass-19
   vocabulary: strong = solid). Decision: **one explainer line in the card, a status line that names the rule in the reader's
   order, and the table pill follows the Overview's two-level vocabulary** (F-114).

One low item: on Compare the "Full scale" checkbox floats alone on its own row under the two segmented controls
(`desktop_light-compare-radar.png`); it belongs on the control row (F-115).

**Recorded for Florian (X7), not a directive:** after CR-65.5–65.7, 7 of the 24 rows that pass Simple's default carry the
solid ⚠ Benchmaxxing tag (GPT-6 Astra, Grok 4.6, GLM-5.3, Gemini 3.7 Flash, GPT-5.6 Terra, DeepSeek V4 Pro, Gemini 3.5
Flash — signals 14.5–15.5, `metrics.json` `simple-tags`), and 7 of the catalog's 8 strong tags are frontier models. The
rendering is as B4 asks (the tag on the worst models, in the overview table) and the numbers are the gauntlet's (iteration 94
recorded the turnover as launch-day visible); the design authority keeps the solid pill and flags only that a third of the
front-page rows now carry orange. If Florian wants the front page quieter, the lever is the tag threshold (CR-65.6), not the
pill.

Checked, not findings: Simple's score floor shows 75, not R5.3's 86 — that is CR-18/CR-29.1 (`07b65fd`: the untouched default
derives from the cheapest plotted model, floor 65), Florian's newer rule. The "Skip to main content" box in the phone radar
shots is the known screenshot artefact (pass 20 `check.json`). Guided is unchanged since pass 18.

## Decisions in pass 21

1. **A bar column must vary or go.** When a ranked list's bars would differ by less than ~10 % of their length, the scale is
   wrong for that list: use one page-wide scale and mark the reference the reader compares against (rule added to the design
   system notes).
2. **Ring labels never sit on a spoke.** On any radar whose spokes are data axes, ring labels sit at the half-step angle
   between two spokes, inside the ring, with the F-70 halo; unit words go into the caption (rule added).
3. **One explainer per page, not per card.** A card under a page intro gets an instruction line, not a second explanation
   (extends the pass-20 footnote rule).
4. **F-107–F-111 verified** by the design authority as a non-implementer (claude-opus implemented them): both hosts, 59/62
   with the 3 expected data-diff checks explained above; CR-65.17 and CR-65.18 set to verified in the ledger.
5. **No code change by Fable in this pass** beyond the screenshot script; F-112 is judgment (Claude Opus 5), F-113–F-115 are
   mechanical.
6. **X4 (UI meets the design bar): still met at pass 21**; F-112–F-114 are the remaining polish on the Benchmaxxing page.

## R3.1 / CR-10.1 — Hero claim (Florian's own copy since 2026-09-15; earlier Fable wording retired)

> **The most detailed cost–capability analysis in AI.**
> **Every model. Every Benchmark. Actual Costs.**

Line 2 accent-coloured, capitalisation exactly as Florian wrote it (CR-10.1); the muted counts line underneath is
generated from the dataset. Re-confirmed live in passes 17–20. History, for the record: pass 1 chose
"Every AI model benchmark we can find, in one place. / And what each model really costs you." (re-decided in pass 8,
held through pass 16) after rejecting Florian's 2026-09-12 draft ("All … every" over-reaches, P4) and the
"most complete … only place" form ("only" not provable against Artificial Analysis' cost per task, review gate
2026-09-13). CR-10.1 (2026-09-15) replaced it with the copy above; it is a positioning claim in Florian's own words,
and the counts line under it keeps the page honest (P4).

---

## Directives (open)

> **Status 2026-09-17 ~10:30 UTC (pass 21):** four open directives, in order of value. Verification of each by a
> non-implementer, both hosts, 1440/390, light/dark.

### F-112 [judgment] — Benchmaxxing Signal bars: one page-wide scale with a tick at the catalog average

*Where:* `components/BenchmaxxingOverview.tsx` (the Signal cell: pill + bar, the "bars scaled to N" sub-label from F-97),
`components/BenchmaxxingWorkbench.tsx` (already carries the CR-65.6 catalog average), `lib/benchmax.mjs` (expose the catalog's
highest signal next to the average if it is not already in the summary), tests.

*What:*
- The bar domain is **0 → the highest signal among all scored models in the catalog**, the same on Strongest, Featured and
  All scored, so one model's bar has one length everywhere (this is also what CR-63.5 asked for).
- A **1 px tick in `var(--text)` at 60 % opacity at the catalog average** on every bar, with `title="catalog average ⟨avg⟩"`
  (⟨avg⟩ = the CR-65.6 catalog average from the summary, one decimal — never a literal). The bar itself keeps the orange band for tagged rows and the muted band for untagged rows.
- The column sub-label reads "0 to ⟨max⟩, the catalog's highest · tick = catalog average ⟨avg⟩" (both numbers from the data, one line,
  `bh-muted text-xs`). Drop "bars scaled to N, the list's highest".
- No change to values, ranking or tags.

*Accept:* the same model (e.g. GLM-5.3 max) has an identical bar width on all three tabs (DOM check); every bar has one tick
element with a title containing "catalog average"; on Strongest the tick sits left of the bar end for every tagged row;
screenshots 1440/390 light/dark; `npm test` and `tsc` green.

### F-113 [mechanical] — Radar ring labels off the 12-o'clock spoke, unit word into the caption

*Where:* `components/TopicRadar.tsx` (the three ring `<text>` elements and the "percentile"/"position" word near line 116,
the `avg pNN` label, `fullLabel`), the caption line in `components/BenchmaxxingReport.tsx` ("Axes: … Dashed ring = …"),
`components/BenchmarkRadar.tsx` only if it reuses the same ring-label code, tests in `test/fable-pass20-directives.test.mjs`.

*What:*
- Remove the `percentile` / `position` `<text>` from the SVG. The caption under the chart becomes "Axes: the N benchmarks this
  model has results for, grouped clockwise by topic. Rings: 0 · 50 · 100 percentile. Dashed ring = this model's average
  percentile." (Compare's two-series legend line says "average percentile" already and stays.)
- The three ring numbers sit at the **half-step angle between spoke 0 and spoke 1** (angle = −90° + 180°/n), each placed
  **inside its ring** (radius − 4 px, `dominant-baseline: text-after-edge`, anchor `start`), 10 px, muted, with the F-70 halo
  (`paint-order: stroke; stroke: var(--surface); stroke-width: 3px`). The "100" therefore sits inside the rim, never under
  the sector arc band.
- The `avg pNN` label (and Compare's "A avg …") sits at the half-step angle on the **other** side of spoke 0
  (−90° − 180°/n), inside its dashed ring, same halo, series colour, so it can never share a pixel with a ring number.
- Compact mode (phone Compare) keeps no ring labels, as before.

*Accept:* DOM check on GLM-5.3 (max), Claude Fable 5.1 ::high and MiniMax-M2.7 at 1440 and 390: no ring-number or average
label bounding box intersects any data-point circle or the sector arc path; no `percentile` text node inside the SVG; the
caption contains "Rings: 0 · 50 · 100 percentile"; screenshots light/dark; `npm test` and `tsc` green.

### F-114 [mechanical] — Benchmaxxing page: one explainer, a status line in the reader's order, table pills like the Overview

*Where:* `components/BenchmaxxingOverview.tsx` (the card paragraph at ~line 127, the status box at ~line 129, the Signal cell
pill), `app/globals.css` if the pill classes need a variant; the Overview's tag pill classes in `components/ModelExplorer.tsx`
(reuse, do not copy).

*What:*
- **Card paragraph** → one instruction line: "Select a row to open its report below, or ▸ for a quick look." The
  "screening flag — not proof of leakage, contamination, or intent" sentence stays only in the page intro (CR-63.4).
- **Status box** → "**8** models carry the strong tag · a tag needs 10 related comparisons and an interval above the catalog
  average" (counts from the data; one line at 1440, two at 390). The "scored from 6 comparisons in 2 topics" clause moves
  into the Signal (i).
- **Signal pill** in the table follows the Overview's two-level vocabulary (pass 19, F-103): strong tag = solid orange pill
  with surface-coloured bold number, weak tag = pale tint with the number in the signal colour, untagged = the number only
  (no pill). The ⚠ / △ glyphs match the Overview's.

*Accept:* text checks for the two strings; on Strongest every row's pill has the solid class and on All scored untagged rows
have no pill element; the first table row's top is ≤ 780 px at 390×844 on a fresh load (F-83); 1440/390 light/dark;
`npm test` and `tsc` green.

### F-115 [mechanical, low] — Compare: the "Full scale" checkbox joins the control row

*Where:* `components/BenchmarkRadar.tsx` (the checkbox rendered under the Scale/axes controls).

*What:* render the checkbox as the last item of the control row (after the "Simple · Detailed" group), same 36 px height,
label "Full scale"; on phones it wraps under the groups as the last control, not as a lone right-aligned row. Nothing else
changes.

*Accept:* at 1440 the checkbox's top edge is within 4 px of the segmented controls' top edge; at 390 it is the last control
above the legend; light/dark.

## Design system notes (apply while touching any file above)

- **A bar column must vary or go (pass 21):** when a ranked list's bars would differ by less than ~10 % of their length,
  use one page-wide scale and mark the reference the reader compares against (a tick with a title); never scale to the
  visible list.
- **Ring labels never sit on a spoke (pass 21):** on a radar whose spokes are data axes, ring labels sit at the half-step angle
  between two spokes, inside the ring, with the F-70 halo; unit words ("percentile") go into the caption.
- **One explainer per page (pass 21):** a card under a page intro gets an instruction line, not a second explanation.
- **Footnotes (pass 20):** two visible sentences at most; anything longer is a collapsed "Legend" disclosure with one
  line per mark. A legend never repeats what a tooltip already says at the mark itself, beyond one line.
- **Type:** display serif (`--brand-serif`) only for the H1 on `/` and page titles; everything
  else the system sans. No serif in cards.
- **Signal pills in tables (pass 19):** one emphasis vocabulary — **strong = solid pill** in the signal colour with
  surface-coloured bold text, **weak = pale tint** (≤ 20 % alpha) with medium text in the signal colour. Outlines are not
  used for levels (an outline reads as stronger than a tint). Arrows/words differ per level so colour is never the only cue.
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
- **Data strings are not copy (F-54, re-stated in pass 18).** A registry identity (`snapshot-2026-09-14 (unversioned)`),
  a harness key (`claude-code`) or a source id never reaches a reader raw: every string a reader sees goes through one
  labelling helper (`versionLine`, `cohortLabel`, `SCORE_PICKER_LABELS`).
- **A visible sub-line under a benchmark name carries only what changes the reading of the number:** a harness (on the
  name line), a stated task window, a version the name lacks. Version and read date are hover / (i) / result-page facts.
- **Dashes mean "no result" and appear only in value cells.** A header or summary row with nothing to say shows nothing.

## Earlier verdicts (condensed, for the record)

- **Pass 20 (2026-09-16 23:00 UTC, live `4b3c2a6`):** iterations 86–89 (CR-63 UI gauntlet, CR-64, CR-51–55) at the bar;
  designed F-107 (Compare radar: percentile convention, native as toggle) and F-108 (Benchmaxxing radar: zero ring, ring
  labels, average ring, one Other arc, honest copy) for CR-65.17/65.18; specified F-109 (Overview legend disclosure), F-110
  (Benchmarks group header stacks at 390), F-111 (InfoTip media listener loop). All five landed by claude-opus (iteration 93,
  `9671d17`/`39416bd`/`963881e`) and were verified by Fable in pass 21. Rules added: footnotes ≤ 2 visible sentences.

- **Pass 19 (2026-09-16 14:00 UTC, live `472a0bf`):** iteration 83 at the bar (shortlist chart, best-of rows, link
  preview) except the inverted value-tag emphasis Florian reported (CR-47.1) — fixed by Fable as F-103 (solid = strong,
  tint = weak) with F-105 (best-of rows lose two sub-lines); specified F-104 (Benchmaxxing tag as a two-level link) and
  F-106 (chart-as-picker shortlist editing); all four verified by review gate 20260916T153003Z.

- **Pass 17 (2026-09-15 18:00 UTC, live `4e126b6`):** iteration 71's batch at the bar in substance; fixed F-87 (More
  menu 256 px), F-88 (BETA non-breaking space), F-89 (short picker names), F-90 (phone map ticks), F-91 (desktop radar
  R 205), F-92 (inline (i), footnote), F-93 (shortlist chart as bar rows below `md`), Fable `cadbe88`/`992fa97`,
  verified by opencode-kimi (iteration 72); gave F-94/F-95/F-96 (designs for CR-25/36/26) and F-97/F-98/F-99 in
  advance, all landed by claude-opus (iterations 73–77). Rules added: pickers use the site's short names; a zoomed
  radar says so and is drawn at chart size.
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
| **F-112 re-judged** (claude-opus, iteration 101) — Signal bars: one catalog-wide scale with a visible reference mark, but the mark is the **zero line**, not the catalog average, and the bar **diverges** around it | `d1023a0` (claude-opus, iteration 101) | `/opt/benchmarkheaven/state/ux-evidence/f112-f114/` (`bin/verify-f112-f114.mjs`, 1440/390 × light/dark, both hosts) | **open** — needs a non-implementer pass. Judgment recorded: F-112 was written for the pre-CR-69 unevenness score. CR-69 made the score signed (zero = no sign) and CR-74.2 made Featured the default list, so on the live 17 Sep view **9 of the 17 default rows drew no bar at all** and −0.1 was indistinguishable from −7.3. A tick at the catalog average would name a reference that is no longer neutral; zero is. The domain still spans every scored model, so F-112's actual ask (one bar per model on all three presets) holds — checked in the verifier |
| **F-114 re-judged** (claude-opus, iteration 101) — one explainer above the table, one status line in the reader's order, table pills like the Overview | `d1023a0` (claude-opus, iteration 101) | same | **open** — needs a non-implementer pass. Three parts as written (card paragraph → one instruction line; "scored from n = …" → Signal (i); pills already followed the Overview since CR-74.1). Two parts re-judged: the status box and the CR-74.1 level legend were two stacked rows saying the same three words, so they are now **one** line (counts · thresholds · CR-77.2 marker · rule), and F-114's acceptance rule — first table row ≤ 780 px at 390×844 — was unreachable until the page intro was cut back to **CR-63.4(b)'s two desktop lines**, which CR-69.4's rewrite had grown to seven. First row 1,064 px live → 730 px |
| **For the design authority — two-line header at large text** (CR-79 follow-up, not a Fable directive) | `c7c3d22` | `/opt/benchmarkheaven/state/ux-evidence/cr79/live/{canonical,legacy}/` (360/390/430 px × light/dark × 1.0×/1.3× text) | **judgment needed** — at the phone's larger-text setting the header row now wraps to two lines instead of pushing the page sideways (it was a 61 px horizontal page scroll). Nothing changes at the default text size, and every label stays visible so CR-6.1 holds. If Fable prefers a different trade at large text (collapse "Benchmarks" into More, a smaller nav type ramp), that is a directive to write — but the page must not scroll sideways. |
| F-113 Radar ring labels off the 12-o'clock spoke, unit word in the caption | `a5e8359` (claude-opus, iteration 98) | `/opt/benchmarkheaven/state/ux-evidence/f113/{local,live/canonical,live/legacy}/verification.json` + radar screenshots (/benchmaxxing report and /compare detailed, 1440/390, light/dark) | **open** — needs a non-implementer pass. Two measured deviations, both in the commit message: the glyphs hang inward (text-after-edge pushed "100" 9 px past the rim into the sector band) and the acceptance rule "no label box touches a data point" is unreachable at 38 axes (4.7° step), so the verifier checks inside-the-rim, off-every-spoke and painted-above-the-points instead |
| F-115 Compare: the "Full scale" checkbox joins the control row | `526f4d9` (claude-opus, iteration 98) | `/opt/benchmarkheaven/state/ux-evidence/f115/` (Compare at 1440/390, light/dark) | **open** — needs a non-implementer pass |
| F-111 one shared, frame-coalesced hover/pointer subscription for every InfoTip | `963881e` (claude-opus, iteration 93) | `ux-evidence/iter93/f111-before/`, `ux-evidence/fable-20260917-pass21/verify-iter93/{canonical,legacy}/f111-fullpage-{390,360}.png` | **verified by Fable (pass 21, non-implementer):** full-page phone screenshot of `/` at 390 and 360 → 0 page errors on both hosts at `facc759`; 0 errors in the 112-shot pass-21 matrix |
| F-110 Benchmarks group header stacks below 640 px | `39416bd` (claude-opus, iteration 93) | `ux-evidence/fable-20260917-pass21/{mobile,desktop}_{light,dark}-benchmarks-group.png`, `verify-iter93/` | **verified by Fable (pass 21):** name / "5 benchmarks · 3 feed the group score" stacked without overlap at 390, inline count at 1440, both hosts, light/dark |
| F-109 Overview footnote: two sentences visible, legend behind a disclosure | `39416bd` (claude-opus, iteration 93) | `ux-evidence/fable-20260917-pass21/*-simple-legend-open.png`, `verify-iter93/f109-*` | **verified by Fable (pass 21):** collapsed footnote ≤ 3 lines with the adjusted-cost link; opened legend one `<dt>/<dd>` per mark in the mark's own rendering, Benchmaxxing link present; both hosts, 1440/390, light/dark |
| F-108 Benchmaxxing radar: zero ring, ring labels, average ring, one Other arc, honest copy (CR-65.18) | `9671d17` (claude-opus, iteration 93) | `ux-evidence/fable-20260917-pass21/*-bmx-radar{,-frontier,-wide,-strong}.png`, `metrics.json` (radar geometry: `outside: []`, `dashed: 1`, rings 0/50/100 + avg), `verify-iter93/f108-*` | **verified by Fable (pass 21):** zero ring with points on it, dashed average ring with label, three ring labels, one contiguous grey arc at the end, `data-jagged-note` and caption copy exact, every topic label inside the wrapper at 390 (MiniMax-M2.7, GLM-5.3, Fable 5.1); both hosts, light/dark. The "report unchanged" checks differ only because CR-65.7 changed the signal after the capture. Residual: ring labels collide with the 12-o'clock spoke → F-113 |
| F-107 Compare radar: percentile among current models, native scale as the toggle (CR-65.17) | `9671d17` (claude-opus, iteration 93) | `ux-evidence/fable-20260917-pass21/*-compare-radar{,-native}.png`, `verify-iter93/f107-*` | **verified by Fable (pass 21):** Claude Fable 5.1 ::high at p100 on AA Intelligence, "Scale: Percentile · Native" control, `p50 … p100` ring labels, zoom sentence per convention, exact-values table with both numbers; Native unchanged; both hosts, 1440/390, light/dark. Residual: lone "Full scale" checkbox → F-115 |
| F-106 "Edit shortlist": the chart is the picker, the table shows and edits the order (CR-49.1) | `467a5c6` (claude-opus, iterations 84–85) | `ux-evidence/iter85/cr-49/` | **verified by review gate 20260916T153003Z (opencode-kimi, non-claude):** `verify-cr-49` **86/86 per host** both hosts at `3eab0aa`, 1440/390/320, light/dark (`ux-evidence/review-20260916T153003Z/{canonical,legacy}/verify-cr-49/`) |
| F-104 Benchmaxxing tag is a link to the model's radar in two levels (CR-42.2, CR-48.1) | `830d384` (claude-opus, iteration 84) | `ux-evidence/iter85/cr-42-2/` | **verified by review gate 20260916T153003Z (opencode-kimi, non-claude):** `verify-cr-42-2` **77/77 per host** both hosts at `3eab0aa` (`ux-evidence/review-20260916T153003Z/{canonical,legacy}/verify-cr-42-2/`) |
| F-105 Benchmarks page best-of rows: no "Version …" sub-line, the note sentence on the hover (two lines, not five) | `5e01468` (Fable, pass 19) | `ux-evidence/fable-20260916-pass19/verify-cr-47/{canonical,legacy}/` | **verified by review gate 20260916T153003Z (opencode-kimi, non-Fable):** `verify-cr-47` 33/33 + `verify-iter83` 102/102 per host, both hosts at `3eab0aa` (`ux-evidence/review-20260916T153003Z/`) |
| F-103 value tags: strong = solid pill, weak = pale tint (CR-47.1) | `5e01468` (Fable, pass 19) | `ux-evidence/fable-20260916-pass19/verify-cr-47/{canonical,legacy}/`, `test/value-tag-emphasis.test.mjs` | **verified by review gate 20260916T153003Z (opencode-kimi, non-Fable):** `verify-cr-47` **33/33 per host** both hosts at `3eab0aa` (`ux-evidence/review-20260916T153003Z/{canonical,legacy}/verify-cr-47/`) |
| F-102 one counting rule for "benchmarks": a benchmark is a board (family + version), harness cohorts and cost twins are its rows | `e6c17ff` (claude-opus, iter 78) | `ux-evidence/iter78/{canonical,legacy}/verify-f101-f102/` (52/52 per host), `…/verify-cr-28-1/` (14/14), `…/verify-cr-7/` (42/42) | **verified by review gate 20260916T081003Z (opencode-kimi, non-claude-opus):** `bin/verify-f101-f102.mjs` **52/52 per host** and `bin/verify-cr-28-1.mjs` **14/14** and `bin/verify-cr-7.mjs` **42/42 per host**, live on both hosts at `ec686c8`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260916T081003Z/{canonical,legacy}/verify-f101-f102/`, `…/verify-cr-28-1/`, `…/verify-cr-7/`). Recorded deviation: the hero now reads **77 benchmarks**, not the registry's 111 (12 of those are cost twins, 28 more are boards whose observations are not joined to a catalog model yet); F-102 foresees this ("the hero shows the boards with at least one current result"), and /about states the rule. No "· N rows" second total was added (F-85 keeps one total per line) |
| F-101 Providers combobox: one row per company, routes named, mixed state for a partly excluded company | `ae4f8a5` (claude-opus, iter 78) | `ux-evidence/iter78/{canonical,legacy}/verify-f101-f102/` (52/52 per host), `…/verify-cr-25-36/`, `…/verify-cr-presets/` | **verified by review gate 20260916T081003Z (opencode-kimi, non-claude-opus):** `bin/verify-f101-f102.mjs` **52/52 per host** live on both hosts at `ec686c8`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260916T081003Z/{canonical,legacy}/verify-f101-f102/`). Recorded decision: only routes to the *same product* fold (direct + gateway, incl. the gateway's own spelling); two different products of one company stay two rows (Google AI Studio ≠ Vertex AI, "Claude Platform on AWS" ≠ Bedrock), because their policies, regions and prices differ |
| F-100 Benchmarks page: version line as copy ("Published …"), harness on the name line, quiet no-composite headers, one "not stated" sentence | `aa0e23e` (Fable) | `ux-evidence/fable-20260916-pass18/{after,verify-cr-38}/`; **non-Fable re-run: `ux-evidence/iter78/{canonical,legacy}/verify-cr-38/` (81/81 per host)** | **verified by claude-opus (iteration 78, non-Fable), live on both hosts at `e6c17ff`, 1440/390, light/dark** |
| F-99 phone: simplified-list hint under the button | `aa46183` (claude-opus, iter 74) | `ux-evidence/review-20260916T010002Z/` | verified by opencode-kimi (gate 20260916T010002Z, verify-cr-29-31 52/52 per host) |
| F-98 Saturated / Judged tags, no new colour | `0033b25` (claude-opus, iter 77) | `ux-evidence/iter77-cr-38-final/` (81/81 per host, implementer) | **verified by review gate 20260916T081003Z (opencode-kimi, non-claude):** `bin/verify-cr-38.mjs` **81/81 per host** live on both hosts at `ec686c8`, 1440/390, light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260916T081003Z/{canonical,legacy}/verify-cr-38/`); pass 18 re-checked the tags live: drawn like Niche, one sentence each |
| F-97 Benchmaxxing Signal sub-label "bars scaled to N, the list's highest" | `aa46183` (claude-opus, iter 74) | `ux-evidence/review-20260916T010002Z/` | verified by opencode-kimi (verify-cr-19-25 53/53 per host) |
| F-96 Charts cost-vs-capability = the Simple value map at full width | `95fd086` (claude-opus, iter 73) | `ux-evidence/review-20260915T212002Z/` | verified by opencode-kimi (gate 20260915T212002Z, verify-cr-26-1 56/56 per host); pass 18 re-checked: parity with Simple |
| F-95 Compare "Add a model" picker | `aa46183` (claude-opus, iter 74) | `ux-evidence/review-20260916T010002Z/` | verified by opencode-kimi (verify-cr-36-1-2 65/65 per host); one recorded deviation: empty query heading "Top by AA Intelligence Index"; pass 18 re-checked at 1440/390 |
| F-94 Options panel: regional chips, Models · Providers · Labs comboboxes | `808ef9e` (claude-opus, iter 73) | `ux-evidence/review-20260915T212002Z/` | verified by opencode-kimi (verify-cr-25-36 76/76 per host); one recorded deviation: provider quick-pick links dropped; pass 18 re-checked: 589 px panel, 320 px popover, phone sheet |
| F-86 "Better than a model": only answerable comparisons offered | `6d775aa` (claude-opus, iter 66) | `ux-evidence/review-20260915T051001Z/` (verify-p2-history 54/54 per host) | verified by opencode-kimi (gate 20260915T051001Z) |
| F-85 status line without the second total | `ec80831` (Fable) | `ux-evidence/review-20260915T051001Z/` (verify-f84-f85 20/20 per host) | verified by opencode-kimi |
| F-84 no data bar on a single-value row | `ec80831` (Fable) | `ux-evidence/review-20260915T051001Z/` (verify-f84-f85 20/20 per host) | verified by opencode-kimi |
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
