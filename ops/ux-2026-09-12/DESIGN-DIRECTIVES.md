# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 3: 2026-09-13 10:00 UTC**, against live revision `75534f5` (https://benchmarkheaven.com).
Evidence: `/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass3/` — 64 screenshots +
`metrics.json`, desktop 1440×1000 and mobile 390×844, light and dark: Simple, Advanced (incl.
expanded row), Guided steps 1–4, Benchmaxxing, model page, Benchmarks, Charts. Pass 2 is in
`…/fable-20260913-pass2/`, pass 1 in `…/fable-20260913/`.

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

## Verdict on the live site — pass 3 (2026-09-13)

Pass 2's fold work landed and holds: Simple shows six recommended rows on the first desktop
screen (first row 669 px), the phone table is Model · Score · Cost with no horizontal scroll,
the header is one calm row, Advanced opens on 118 rows, the value map has round ticks and no
label collisions, Charts and Compare are quiet. The Guided wizard remains the reference for
tone. The site is now *close*; what is left is one big page and a handful of honesty and
density defects.

**What still fails the bar, in order of damage:**

1. **The Simple value map and the Simple list disagree.** The map plots seven passing points
   and halos "Fable 5 (high)" as a Pareto member; the list beneath it ranks six models and
   refuses that one because its task tokens are not measured. A reader sees a recommended
   dot that is not in the recommendation. → fixed in this pass (**F-22**, Fable, surgical).
2. **The model page is still a 6,308 px scroll** (10,112 px on a phone) of provenance boxes,
   with a provider table that overflows 390 px and a "Composite definition" disclosure that
   F-08 asked to remove. → **F-08a** (mechanical, delegated this pass) and **F-08b** (judgment).
3. **A one-benchmark model ranks 4th in Advanced.** "Fable 5 (high)" shows Composite 92.9 with
   `# benchmarks = 1` and an "assumed task" cost. The number is honest but *looks* like the
   others; a reader cannot tell a 7-input score from a 1-input one without reading the
   sixth column. → **F-25**.
4. **Advanced on a phone opens with a 250 px, five-row toolbar** (search, org select, max $,
   comparison, evidence) before the first model. → **F-23**.
5. **Benchmaxxing:** the H1 rendered at 16 px (fixed this pass), the signal table spends
   100 px per row because every row repeats the "Benchmaxxing signal" badge on a page whose
   title already says so, the Signal column has no magnitude bar, and the summary box says
   "18 tagged models / 18 with the strongest signals" twice. → **F-24**.
6. **Phone value map has no scale.** At 390 px the compact map hides all tick text, so it is
   a box of dots with no axis — decoration, not a chart. → **F-26**.
7. **Benchmarks page:** 7,215 px on desktop; its ranking table overflows to 498 px at 390 px
   (`table.bh-table` right edge 498). → **F-27**.
8. **Micro-defects:** Simple slider histograms are near-invisible light grey in light mode and
   carry no end labels; the "Evidence · relaxed" button in Advanced is accent-filled as if it
   were an active user filter although it is the mode's default; the Benchmaxxing selector's
   orange dot marker is a text bullet and not visibly orange.

## Decisions on the pass-3 questions

1. **F-08 is split.** F-08a is the mechanical half (drop raw columns below `md`, rename and
   move the anomaly panel, remove the disclosure, hide the description column on phones) and
   was delegated to Kimi K3 in this pass. F-08b is the release-post sheet and the mini radar;
   it needs a judgment engine. The page-height acceptance moves to F-08b.
2. **Thin evidence stays ranked but must look thin (F-25).** Removing one-input models from
   Advanced would hide data Florian asked to keep; instead the score cell carries the input
   count and a hatched bar below three inputs. Simple is unaffected (it requires measured
   task tokens, which excludes these rows).
3. **P4 hero line 2 — no change from pass 2.** The "only place" wording rests on pricing the
   route the reader's own filters leave open; the record for X7 is in the pass-2 decision.
   Nothing in the pass-3 evidence weakens that.
4. **R5.2 literal cost-descending sort in Simple — keep.** With six rows it reads as "the
   premium option first, the bargain last", and the Score column stays sortable for anyone
   who wants the other order. Note it in X7 as decided.

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

> **Status 2026-09-13 pass 3 (Fable):** F-13 … F-21 are done (see the Done log). F-19 is
> live-checked by Fable in this pass: H1 text, ten default rows, "Show all 18 tagged", ring
> labels with an "Other" legend, and `scrollWidth` 390 on phones all hold; the 16 px title was
> a CSS omission and is fixed in this pass. Its table density is re-specified in F-24. The
> open list below is the complete remaining design backlog, ordered by value.

### F-08a `[mechanical]` Model page trims — DONE in pass 3 (Fable; the Kimi delegation produced no edits in 12 min and was stopped)
*Where:* `components/ModelDetailOffers.tsx`, `components/BenchmarkEvidence.tsx`,
`components/BenchmarkSheet.tsx`.
*What:*
- Provider tables (top-5 and per-platform): "Raw input $/1M" and "Raw output $/1M" columns get
  `hidden md:table-cell`; "Platform" in the top-5 table gets `hidden sm:table-cell`.
- `AnomalySummary`: heading "Profile signals" → **"Unusual results"**; render `null` when there
  are no flags.
- The anomaly panel moves *after* the per-category sheet, before "Missing coverage".
- The "Evaluation group" column (cohort + description) is `hidden md:table-cell`.
- The "Composite definition" disclosure is gone from the model page (done by Fable, this pass).
*Accept:* at 390 px `/models/claude-opus-5%3A%3Ahigh` has `scrollWidth` = 390 and the top-5
table shows `#`, `Provider`, `Adjusted $/task`; the body text contains no "Composite
definition"; for a model with zero flags the text "Unusual results" is absent.

### F-08b `[judgment]` Model page: release-post benchmark sheet and mini radar
*Where:* `app/models/[id]/page.tsx`, `components/BenchmarkSheet.tsx`, `components/BenchmarkEvidence.tsx`.
*What:*
- **Header:** title on one line; badges under the title on `< md`, never inline. The muted line
  `Anthropic · released 2026-07-24 · 16 offers` stays.
- **Top row, right card:** replace the two-column number list with a **six-axis mini radar**
  of the Composite inputs (AA Coding, AA Coding Agent, AA Intelligence, Epoch ECI, Epoch
  Software ECI, DesignArena; each normalised to the catalog percentile, missing = gap), 220 px
  tall, and a **caption strip** beneath it with the native numbers (`76.5 · — · 48.2 · 162.6 ·
  163.8 · 1278/1330`). The Composite number and its `6/7` evidence count sit above the radar
  as the card's headline. The two ⓘ attachment paragraphs become one (i) icon next to the
  affected axis labels.
- **Benchmark sheet:** per category one **horizontal bar list**, one row per benchmark
  version: name (link) · a bar of the model's *catalog percentile* on that benchmark (accent,
  0–100, `tabular-nums` percentile at its end) · the native value with unit · the observed
  date. Row height ≤ 40 px. The `SourceScore` provenance block (source link, measured badge,
  Evidence disclosure) moves into a per-row expand (chevron). "Missing coverage" stays a
  disclosure.
- **Variants** and **Token offers by platform** stay, but the per-platform offer tables reuse
  the top-5 column set.
*Accept:* `/models/claude-opus-5%3A%3Ahigh` full-page height ≤ 2,600 px at 1440 px and
≤ 4,500 px at 390 px; the mini radar renders in both themes; each sheet row shows a bar
and a percentile; no `<table>` in the sheet wider than the viewport at 390 px.

### F-25 `[mechanical]` Thin evidence must look thin
*Where:* `components/ModelExplorer.tsx` (Score cell, `MagnitudeBar`), `app/globals.css`.
*What:* in the Score cell, when the model's `composite_coverage` (inputs present out of 7) is
below **3**, render the score number in the muted colour, the magnitude bar with a diagonal
hatch (`repeating-linear-gradient`, 4 px), and an 11 px muted sub-label `1/7 inputs` under
the number. From 3 to 6 inputs, only the sub-label `5/7 inputs`. At 7/7 nothing extra. Applies
to the Composite score only (the other scores are single sources). The Score (i) text gains
one sentence: *"Scores built on fewer than three of the seven inputs are shown hatched."*
*Accept:* in Advanced, the row "Fable 5 (high)" shows a hatched bar and "1/7 inputs"; rows
with 7/7 show no sub-label; Simple is unchanged (six rows, no hatching).

### F-23 `[judgment]` Advanced toolbar on phones: search plus one Refine button
*Where:* `components/ModelExplorer.tsx` (toolbar block), `components/ui.tsx`.
*What:* below `md` the toolbar is **one row**: the search field (flex-1) and a `Refine ▾`
button (40 px, `bh-nav-button` style). Refine opens the same bottom-sheet pattern as F-18
containing, in this order: All orgs (select), Max $/task (input), Better than a model (the
H3 popover content inline), Evidence (the three toggles). Sticky footer `Show 118 models`
and `Reset`. When any of those is non-default the button reads `Refine · 2 ▾` in accent.
The `118 models` count moves under the row as 12 px muted text. `md` and up: unchanged.
*Accept:* at 390 px the Advanced toolbar is ≤ 56 px tall and the first model row starts at
≤ 480 px; the sheet opens and closes; the desktop toolbar is still one row at 1440 px.

### F-24 `[mechanical]` Benchmaxxing table: dense rows, a bar for the signal
*Where:* `components/BenchmaxxingOverview.tsx`, `components/BenchmaxxingReport.tsx`.
*What:*
- Remove the per-row "Benchmaxxing signal" badge (every row in this table is tagged; the
  heading says so). Row height ≤ 56 px: model name, org as an 11 px muted second line.
- **Signal** column: number + a 4 px accent-orange magnitude bar scaled to the strongest
  signal in the table (same `MagnitudeBar` as the overview, tone "warn").
- The summary box becomes one line: `18 tagged models · coverage floor: 6 comparisons in
  2 topics` (drop the duplicate second line); the floor sentence under the table goes away.
- "Related comparisons" and "Measured" stay; "Domain specialisation" keeps its (i).
- In the per-model selector, tagged models get a real orange dot (`●` styled `text-warn`),
  not a plain text bullet; if a `<select>` cannot colour options, prefix `▲ ` instead and say
  so in the label (`▲ = tagged`).
*Accept:* the default table's ten rows fit in ≤ 620 px at 1440 px; every Signal cell has a
bar; the string "Benchmaxxing signal" occurs at most once in the table region.

### F-26 `[mechanical]` Phone value map gets a scale
*Where:* `components/CostCapabilityScatter.tsx` (compact branch), `app/globals.css` (the
639 px rule that hides tick text).
*What:* on phones show the X ticks `$3 · $1 · $0.3 · $0.1` and two Y ticks (the floor and 100)
at 10 px muted; keep labels for frontier members only (as now). The map keeps 200 px height.
Ticks must not overlap the plot area: reserve 18 px bottom, 24 px left.
*Accept:* at 390 px the compact map contains ≥ 4 `text` tick elements; no tick overlaps a dot.

### F-27 `[mechanical]` Benchmarks page: phone table and length
*Where:* `components/BenchmarkRanking.tsx`, `app/benchmarks/page.tsx`.
*What:* the ranking table drops "Explore" and the provenance details below `md`: columns
`Rank · Model · Result` only, with the provenance (source link, observed date, Evidence
disclosure) in a per-row expand. Default page size 25 rows with `Show more`. The eyebrow
"BENCHMARK EXPLORER" goes; the intro is one sentence. The `CompositeNote` disclosure at the
end of the page goes (F-21 rule).
*Accept:* at 390 px `document.documentElement.scrollWidth === 390` and no `table` wider than
390; at 1440 px full-page height ≤ 3,500 px for AA Intelligence Index; body text has no
"Composite definition".

### F-28 `[mechanical]` Micro-defects
*Where:* `components/ShortlistControls.tsx`, `components/ModelExplorer.tsx`, `app/globals.css`.
*What:*
- Slider histograms: bars in `accent/35` (light) and `accent/45` (dark) for both sliders — the
  score histogram is currently a barely visible grey in light mode; add the range end labels
  (`60 … 100`, `$0.02 … $7`) at 10 px muted under each track.
- The "Evidence ▾" button is accent-filled only when the user changed a toggle away from the
  mode default; the default state renders like the other toolbar buttons and reads
  `Evidence ▾` (drop "· relaxed" from the label; the popover explains the state).
*Accept:* in a fresh Advanced session no toolbar button is accent-filled; each slider shows
two end labels.

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
| F-22 Simple value map plots exactly the ranked pool (`measuredOnly` prop) | pass 3 (Fable, surgical) | `ux-evidence/fable-20260913-pass3/after-local/verification.json` (6 rows = 6 full dots at both widths) | needs a non-Fable verifier live |
| F-08a model page trims: raw columns and Evaluation-group column hidden below `md`, "Unusual results" only when flagged and after the sheet, no Composite disclosure | pass 3 (Fable) | same file: phone top-5 shows `# · Provider · Adjusted $/task`, no "Composite definition", height 10,112 → 7,978 px at 390 | needs a non-Fable verifier live; the Variants table still reaches 486 px at 390 → F-08b |

