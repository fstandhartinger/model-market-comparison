# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 20: 2026-09-16 ~23:00 UTC**, the "what changed since pass 19" pass (Florian: Fable sparingly), against live
revision `4b3c2a6` (canonical) / `bd02d48` (legacy; same code, ledger-only commits after `1a0c256`) — iterations 86–89:
CR-63 pre-release UI gauntlet (Benchmaxxing second in the nav + Overview teaser, Benchmaxxing page first five seconds
and table polish, model-page value formats and Benchmaxxing line, /eu filled and rewritten, Benchmarks data bars and
chips, Compare accent colours, 404, footnote legend, one score name), CR-64 (capability-only Benchmaxxing), CR-51–55
(licence, provider homepages, info panels, scrollbar gutter, LisanBench) — plus the two **radar rows of the data & math
gauntlet (CR-65.17, CR-65.18)**, which ask the design authority to choose before anyone builds. Evidence:
`/opt/benchmarkheaven/state/ux-evidence/fable-20260916-pass20/` — 95 shots + `metrics.json` (Overview with nav, teaser
and footnote; Advanced; Benchmaxxing page and per-model radar for the strongest tag and for a frontier model; Compare
radar and strength cards; Benchmarks table; model page; /eu; 404; Guided; 1440/390 × light/dark), `check.json`
(deep-link focus, radar label boxes at 390, phone More menu), `check-error.json` (React #185 reproduction matrix).
Scripts: `bin/shoot-fable-pass20.mjs`, `bin/check-fable-pass20.mjs`, `bin/check-fable-pass20-error.mjs`. Earlier
passes: `…/fable-20260916-pass19/` … `…/fable-20260913/`.

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

## Verdict on the live site — pass 20 (2026-09-16), what changed since pass 19

**Iteration 89's gauntlet batch is at the bar; the site is ready to launch on its UI.** Benchmaxxing sits second in the
desktop nav and in the phone More menu (`check.json`: Overview · Benchmaxxing · Compare · Charts · …); the Overview
teaser under the table is one quiet card in the footnote's own style with a single link; the Benchmaxxing page opens on
"Strongest signals" with flagged rows, a two-line intro, the capability-only sentence and base name + muted variant;
the Benchmarks table's data bars no longer cut through digits, ECI rows carry chips, and the group subtitle says what it
counts; /eu shows 21 rows on a fresh visit; the 404 is themed with three ways back; the Compare strength cards use each
model's own colour; the model page shows one format per unit. 0 page errors in 95 shots on a plain load at any width
(`check-error.json`: 11 width × route cases, all 0).

**What is not at the bar — the two radars, exactly as the math gauntlet said, and one footnote that grew into a wall.**

1. **The Compare radar lies with its shape (CR-65.17).** `desktop_light-compare-radar.png`: Claude Fable 5.1 and GPT-6
   Astra, the two best models on the AA Intelligence Index, are drawn at ~55 on that axis (zoom floor 40, so a fifth of
   the radius) while Epoch ECI sits on the rim — because fixed-range axes are plotted on their published 0–100 scale
   and open-ended axes on the peer min–max. A reader sees "weak at AA Intelligence". The model page already plots its
   own radar as *percentile among measured models*, and the Benchmaxxing radar does too; Compare is the odd one out.
   Decision: **one convention site-wide — percentile among current models — with the native scale as the toggle** (F-107).
2. **The Benchmaxxing radar shows the data but not the story (CR-65.18).** `desktop_light-bmx-radar.png` (Qwen3.6 Plus,
   the strongest tag, 37.8): 24 measured axes of 271, most of the disc empty, a cluster of points at the exact centre
   (percentile 0 collapsed onto one pixel — they read as spikes from nowhere), no ring labels, no baseline to judge
   "jagged" against, and a grey "Other" arc that spans half the circle because the singleton topics are scattered
   alphabetically between the real sectors. At 390 px the "Long-context" label of a 38-axis model (MiniMax-M2.7) starts
   8 px left of the clipped wrapper (`check.json`: l 29 < wrap 37). The sentence above the chart — "The more jagged the
   shape, the more benchmaxxed the model looks" — overstates what the signal measures (CR-65.5: mid-table models are
   jagged by construction; rim models look smooth). Decision: **inner zero ring, three ring labels, the model's own
   average as a dashed reference ring, singleton topics gathered at the end, the label kept inside the wrapper, and
   honest copy** (F-108). The expected-spread band waits for CR-65.5's fit.
3. **The Overview footnote is twelve lines on a phone** (`mobile_light-simple-footnote.png`). CR-63.7 asked the footnote
   to explain the tags; it now explains everything in one paragraph — underlined prices, the ranking rule, striped
   scores, both Benchmaxxing levels, four cost arrows, and the ratio reference. On a phone that is a wall between the
   table and the teaser; on desktop four lines of 11 px. Decision: **two visible sentences and a collapsed "Legend"
   with one line per mark** (F-109).
4. **The Benchmarks table's group header collides at 390 px** (`mobile_light-benchmarks-table.png`): "COMPOSITE
   INDICES" and "7 BENCHMARKS" are laid out side by side and the count wraps into the name. Stack them on narrow
   widths (F-110).
5. **One fragile listener.** `metrics.json` records a "Minified React error #185" (maximum update depth) on `/` at
   390 px, light and dark. It reproduces only when a full-page screenshot is taken on the phone emulation
   (`bin/check-fable-pass20-error.mjs`, which the pass-19 sweep did not do at this size), never on a plain load, a
   resize or the desktop; the stack enters through a `MediaQueryList` listener in the layout chunk. Real phones do not
   flip their hover/pointer capability, so users are unlikely to hit it — but a setState loop behind a media listener
   is a hardening item before launch (F-111, low).

Checked, not findings: the "Skip to main content" box in `mobile_light-bmx-radar.png` is a screenshot artefact — on the
real deep link `#radar` holds focus and the skip link stays translated off-screen (`check.json` deepLink). The "BETA —
Work in progress" pill stays as it is: CR-35.2 is Florian's own wording of 2026-09-15; the gauntlet's "BETA alone"
was an engine's taste, not his (recorded under CR-63.22 in the ledger). The Compare strength cards still list an
"Efficiency" topic — CR-64.2 keeps cost metrics visible outside Benchmaxxing, and the card names the scale, so it stays.
Guided is unchanged since pass 18 and at the bar.

## Decisions in pass 20

1. **One radar convention for the whole site: percentile among current models** (mid-rank ties, the `percentileFor`
   cohort rule from `lib/benchmax.mjs`), with the published native scale as an explicit toggle. The model page and the
   Benchmaxxing radar already do this; Compare joins them (F-107). Rationale: the tooltip carries the exact number, so
   the shape's only job is comparison — and comparison across axes needs one scale.
2. **Zero is a ring, not a point.** Every TopicRadar plot starts at the inner ring (18 % of the radius, already drawn for
   the spokes); a percentile-0 result sits on that ring, visibly, with its own hit target (F-108 b).
3. **The reference for "jagged" is the model's own average percentile**, drawn as a dashed ring in the series colour.
   A band of expected within-topic spread is the right second step but depends on CR-65.5's level fit; it is specified
   in F-108 as a follow-up, not built ahead of the math.
4. **Copy about the signal says what it measures and where it is common.** No "the more jagged, the more benchmaxxed"
   as a rule; "jumps between neighbouring benchmarks of one topic" plus the two caveats (mid-table models, rim models).
5. **Footnotes explain one thing per line, behind a disclosure when longer than two sentences** (rule added to the
   design system notes).
6. **No code change by Fable in this pass** — every item is a directive with a live check; the two radar directives are
   the launch-relevant ones and go to Claude Opus 5 (judgment); F-109 to F-111 are mechanical.
7. **X4 (UI meets the design bar): judged met at pass 20** for the gauntlet batch, with the radar rows (F-107, F-108) as
   the remaining gap that CR-65 already tracks.

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

> **Status 2026-09-16 ~23:30 UTC (pass 20):** five open directives, in order of value. F-107 and F-108 are the design
> decisions for CR-65.17 and CR-65.18 (Florian: "the benchmaxxing radar chart should be also doublechecked to make sure
> this is really looking great and tells the story perfectly"). Verification of each by a non-implementer, both hosts,
> 1440/390, light/dark.

### F-107 [judgment] — Compare radar: one convention, percentile among current models; native scale as the toggle (CR-65.17)

*Status 2026-09-17 (iteration 93, Claude Opus 5): implemented in `9671d17`, live on both hosts, `bin/verify-iter93-fable20.mjs` 62/62 per host (`/opt/benchmarkheaven/state/ux-evidence/iter93/live/`). Kept the "Full scale" unzoom checkbox beside the new control; sentence says "models measured on that benchmark". Needs a non-implementer verifier.*

*Where:* `lib/radar.mjs` (`radarScale`, `scaleNote`, `radarWindow`), `components/BenchmarkRadar.tsx` (`seriesFor`,
`SimpleRadar` ring labels, the "Full 0–100 scale" checkbox, the InfoTip and "How to read this chart" copy, the exact-values
table), `lib/benchmax.mjs` (`percentileFor` — reuse, do not copy), tests in `test/radar*.test.mjs`.

*What:*
- `radarScale(value, axis, convention = 'percentile')`. **`percentile`** (default): the position is
  `percentileFor(axis, modelId)` — the same mid-rank percentile among current, non-low-sample rows that /benchmaxxing and
  the model page use, with the same `PERCENTILE_MIN_FAMILIES` cohort rule; when the cohort is too small the point is not
  plotted and the tooltip says "too few models measured to place it" (never a zero). `scale: 'percentile'`. **`native`**:
  today's behaviour (published range where one exists, else peer min–max), unchanged.
- Both radar modes (Simple and Detailed) follow the convention; Detailed with percentiles is then the same picture as the
  Benchmaxxing radar for the same models (and gets F-108's rings for free through `TopicRadar`).
- The "Full 0–100 scale" checkbox becomes a two-option segmented control **"Scale: Percentile · Native"** (aria-pressed,
  same style as the Simple/Detailed control). The zoom stays and applies to either scale; the zoom note reads
  "Zoomed to these models: the centre is the 40th percentile, not the bottom." under Percentile and keeps today's wording
  under Native. Ring labels read `p40 · p55 · p70 · p85 · p100` under Percentile (numbers under Native).
- One sentence under the chart, always visible: "Each axis: percentile among current models on that benchmark
  (p100 = best measured); hover for the published number." Under Native: "Each axis on its published scale; open-ended
  axes (Elo, ECI) span the measured range."
- `scaleNote` for percentiles: "p62 among 84 current models". The exact-values table shows native value and percentile
  side by side. The InfoTip and "How to read this chart" describe both conventions in two sentences each; drop the
  per-formula prose.
- The preference is not persisted (a URL param `?scale=native` is fine; default stays percentile).

*Accept:* for any axis set, the compared model with the highest native value on an axis (direction-aware) sits at the
largest radius on that axis under both conventions (unit test); on the default pair Claude Fable 5.1 ::high is plotted
at p ≥ 95 on AA Intelligence Index (live DOM check); a screenshot at 1440/390 light/dark shows ring labels with the `p`
prefix; the "Show exact radar values" table lists both numbers; `npm test` and `tsc` green.

### F-108 [judgment] — Benchmaxxing radar tells the story: zero ring, labels, the model's average as reference, honest copy (CR-65.18)

*Status 2026-09-17 (iteration 93): implemented in `9671d17`; in Compare's two-series Detailed radar the average labels sit in one line under the chart instead of on the spoke. Needs a non-implementer verifier.*

*Where:* `components/TopicRadar.tsx` (geometry, rings, labels, the `Other` sector), `components/BenchmaxxingReport.tsx`
(the `data-jagged-note` line, the axes sentence, series average), `lib/benchmax.mjs` `groupedRadarProfile` (axis order of
singleton topics), `app/benchmaxxing/page.tsx` (intro stays as CR-63.4 wrote it), `app/about/page.tsx#benchmaxxing`
(one sentence), tests.

*What:*
- **(a) Reference ring.** For each series draw a dashed circle (1 px, series colour, opacity .55) at the series'
  **mean percentile over its measured axes**, with a tiny label on the 12-o'clock spoke: "avg p68" (compare mode: "A avg
  p68", "B avg p41"). Accessible name of the chart mentions it. *Follow-up when CR-65.5 lands:* a faint filled band
  (series colour at 8 %) between avg − s and avg + s where s is the expected within-topic spread at that level; the
  caption then says "band = spread expected at this level".
- **(b) Zero is a ring.** Plot radius `inner + (r − inner) · v / 100` with `inner = 0.18 r` (already the spoke start);
  the grid circles at 0, 25, 50, 75, 100 use the same mapping, so percentile 0 sits on a visible ring, keeps its own hit
  target and never stacks in the centre. Missing results stay gaps.
- **(c) Ring labels.** Three muted 10 px labels on the 12-o'clock spoke: "0", "50", "100" and one word "percentile" under
  the "100" (compact mode: none).
- **(d) Labels inside the wrapper at 390 px.** Topic labels anchor by side (left half: right-aligned, `translateX(-100%)`
  from the anchor; right half: left-aligned) and clamp so that every label's bounding box stays inside the chart wrapper;
  drop the `px-14` on compact and give the wrapper `px-2` on narrow widths. Test with MiniMax-M2.7 (38 axes, has
  Long-context) and Qwen3.6 Plus at 390 px.
- **(e) Copy.** The line above the chart (`data-jagged-note`) becomes: "Jumps between neighbouring benchmarks of one topic
  are what the signal measures. Mid-table models jump more often, and models at the rim look smooth — a flag is a screen,
  not proof." The sentence under the chart: "Axes: the N benchmarks this model has results for, grouped clockwise by
  topic. Dashed ring = this model's average percentile." The page intro (CR-63.4) stays. `/about#benchmaxxing` gets the
  same two caveats in one sentence. `BenchmaxxingOverview` (quick look) keeps its caveat sentence but drops "The more
  jagged the shape inside one topic, the stronger the pattern." in favour of "Jumps inside one topic are the pattern."
- **(f) Frontier note** — covered by (e); no extra line.
- **(g) One "Other" arc.** Singleton topics are ordered *after* the last multi-axis topic (in `groupedRadarProfile` and
  `detailedRadarAxes`: sort key = (topic has ≥ 2 axes among the plotted ? 0 : 1, topic, name)), so the grey arc is one
  contiguous sector at the end of the clock and the coloured sectors never overlap it. The "Other: …" line under the chart
  stays.

*Accept:* screenshots 1440/390 light/dark for Qwen3.6 Plus (strong tag) and Claude Fable 5.1 ::high (frontier) show the
zero ring with points on it, three ring labels, a dashed average ring with its label, one contiguous grey arc; every
topic label's bounding box is inside the wrapper at 390 px (DOM check, both models); text tests for the three copy
strings; the signal values themselves are unchanged (this directive touches presentation only — a diff of
`/api/benchmaxxing` before/after is empty); `npm test` and `tsc` green.

### F-109 [mechanical] — Overview footnote: two sentences visible, the legend behind a disclosure

*Status 2026-09-17 (iteration 93): implemented in `39416bd` (legend rows use the marks' own classes; Benchmaxxing definitions say "among the most uneven" instead of "top 10 %", since CR-65.6 tags need a bootstrap interval, not a rank). Needs a non-implementer verifier.*

*Where:* `components/ModelExplorer.tsx` (the footnote paragraph under the table, CR-63.7/63.8 text), `app/globals.css`.

*What:* Visible, one short paragraph: "Underlined prices open their inputs and sources · How we calculate adjusted cost.
Only models with measured task-token usage are ranked here; Advanced can relax that." Then a `<details class="bh-muted
text-xs">` with the summary **"Legend: marks and tags"** (collapsed on every width) containing a `<dl>` with one row per
mark, term in the mark's own rendering, definition ≤ 12 words:
- striped score bar → built on fewer than 3 of 7 inputs
- ⚠ Benchmaxxing (solid) → top 10 % most uneven across related benchmarks; opens the model's radar
- △ Benchmaxxing (tint) → the next 10 %; a screening flag, not proof
- ↓ cheaper / ↑ pricier (filled) → cost well below / above models with a similar score in this list
- ↘ cheaper / ↗ pricier (outlined) → somewhat below / above
- a last line: "Ratios compare against the models in the current view, so Simple and Advanced can differ." plus the
  "What Benchmaxxing means →" link.
The badge tooltips (CR-63.8) keep the ratio reference; nothing is lost, only moved.

*Accept:* at 390 px the collapsed footnote is ≤ 3 lines; opened, one `<dt>/<dd>` per mark; both links present; the same
at 1440; light/dark.

### F-110 [mechanical] — Benchmarks table group header stacks on narrow widths

*Status 2026-09-17 (iteration 93): implemented in `39416bd`. Needs a non-implementer verifier.*

*Where:* `components/ScoreRows.tsx` (`bh-cat-head`, `bh-cat-basis`, the count span), `app/globals.css`.

*What:* Below 640 px the group row's stub renders three stacked lines: the group name (uppercase, as now), then "7
benchmarks · 2 feed the group score" as one muted line (merge the count into the basis line on narrow widths; keep the
inline count beside the name at ≥ 640 px). No element may overlap; the sticky first column keeps its width.

*Accept:* at 360/390 px no two text boxes in a group header intersect (DOM check on the first three groups); the count
and the basis text are both present; desktop unchanged.

### F-111 [mechanical, low] — Media-query listener must not loop

*Status 2026-09-17 (iteration 93): implemented in `963881e` — InfoTip was the listener (every (i) subscribed on its own); now one shared `useSyncExternalStore` subscription coalesced per animation frame. Full-page phone screenshot: 1 error per width before (`/opt/benchmarkheaven/state/ux-evidence/iter93/f111-before/`), 0 after on both hosts. Needs a non-implementer verifier.*

*Where:* the `MediaQueryList` listener that the stack in `check-error.json` enters through in the layout chunk — find it
with a non-minified build: `next dev`, then `node ops/ux-2026-09-12/bin/check-fable-pass20-error.mjs http://127.0.0.1:3000 <out>`
(the `fullPage` case reproduces it). Candidates from `grep matchMedia`: `InfoTip.tsx` (`hover/pointer`),
`ShortlistColumns.tsx`, `ComparePicker.tsx`, `CostCapabilityScatter.tsx`, `MultiCombobox.tsx`.

*What:* the offending effect updates state only when the value changes and never from a render path; add a Playwright
check (existing verifier style) that a full-page screenshot of `/` at 390 px on the phone emulation records 0 page
errors, and keep that check in the pass-20 script.

*Accept:* `check-fable-pass20-error.mjs` shows `fullPage.errors: 0` for 390 and 360 px on both hosts.

## Design system notes (apply while touching any file above)

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
