# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 5: 2026-09-13 15:30 UTC**, against live revision `3d7af32` (https://benchmarkheaven.com).
Evidence: `/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass5/` — 80 screenshots +
`metrics.json` (desktop 1440×1000 and mobile 390×844, light and dark: Simple incl. moved slider,
Advanced incl. expanded row and a fresh session, Guided steps 1–4, Benchmaxxing, model page,
Compare, Benchmarks, Charts), `verify-f31-f38/verification.json` (independent live acceptance of
the Codex-implemented F-31 … F-38, 0 fails at both widths) and `/tmp/fable5-checks.mjs` output
(tick-label overlap counts, Advanced row counts). Pass 4 is in `…/fable-20260913-pass4/`,
pass 3 in `…/fable-20260913-pass3/`, pass 2 in `…/fable-20260913-pass2/`, pass 1 in `…/fable-20260913/`.

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

## Verdict on the live site — pass 5 (2026-09-13)

Everything from pass 4 shipped and holds: coverage pips instead of `n/7 inputs`, no `est.` in
any cell, the Compare table is a release-post table with one expand per row, the Benchmaxxing
signal card is 326 px, the Benchmarks page opens with one coverage sentence and a bar per
result, the model page reads like a release post at 2,443 px / 4,089 px. F-31 … F-38 are
**verified** in this pass (Fable ≠ Codex, `verify-f31-f38/verification.json`, 0 fails).
Advanced opens on 101 rows sorted by score in a fresh session. The Guided wizard remains the
best-written surface on the site. Hero, logo, nav and footer need nothing.

**What fails the bar now, in order of damage:**

1. **The Simple value map is unreadable on its cost axis.** Iteration 26 switched Simple to a
   *linear* cost axis (R5.10 "every model displayed"). Result: 10 of the 16 shortlist models sit
   in the left 15 % of the plot and the axis prints a tick per data value — 46 overlapping tick
   labels at 1440 px, 138 at 390 px, a black smear under the phone map. The one chart Florian
   asked for in Simple ("how much more expensive is the priciest model than one 10 % worse")
   cannot be read. → fixed in this pass (**F-39**, Fable, surgical): log axis back, free routes
   pinned at the left edge instead of dropped, round money ticks.
2. **Simple's slider leaks into Advanced.** Touching the Simple score slider — even returning it
   to 85 — sets `minScoreTouched`, and Advanced then opens on "7 models · filtered" with no
   visible control that explains or removes the floor (`minScoreApplied = touched ? minScore : 0`).
   F-16 promised a full-catalog Advanced; it only holds for users who never touch Simple. → **F-40**.
3. **Five of seven Simple rows are hatched as "thin evidence", including the #1 model.** Since
   F-32 separated exact from family-attached inputs, the hatch (`composite_coverage < 3`) fires
   on Claude Fable 5.1, Opus 5, Kimi K3, Grok 4.6 and GLM-5.3 — models with 17–22 benchmarks
   and 6 of 7 Composite inputs (2 exact + 4 attached, as the Opus 5 page itself says). Simple
   shows the stripes with no pips, no legend and no title. A stripe that hits most of the
   flagship set discriminates nothing and reads as "don't trust this table". → **F-41**.
4. **Phone Simple: the two slider captions collide.** With the R5.7 wording the side-by-side
   sliders at 390 px wrap to three lines each ("Max adjusted cost / task" + "no limit" stacked),
   the values no longer align with their tracks. → **F-42**.
5. **Benchmaxxing radar draws 214 spokes for 29 measured axes.** The default plot is a grey
   sea of unmeasured spokes with blue slivers; three sectors are named (Writing, Agentic,
   Coding) and 13 topics are lumped into an unlabeled grey "Other" that covers half the circle.
   The jaggedness Florian wants to *see* is invisible. → **F-43**.
6. **Compare is still 5,576 px at 1440 px (9,541 px at 390 px)** with two models: the F-35 table
   is fine (2,403 px); the rest is a 4-card "Build your comparison" sidebar, a six-axis radar with
   a three-line caption and an axis table. → **F-44**.
7. **Micro-defects:** the Advanced toolbar's "Better than a model ▾" and "Evidence ▾" popovers
   and the Filters overlay are three places for filters; Charts' Score vs cost card repeats the
   Simple map (fine) but its "16 models" is not a link on `/charts` at 390 px; the Benchmarks
   "Explore → Compare ↗" column is dead weight on desktop. Folded into **F-44** and **F-45**.

## Decisions in pass 5

1. **R5.10 / F-39 — log axis stays, free routes are pinned, not dropped.** Florian asked for
   "cheaper left, every model displayed"; Codex read the second half as "linear axis". A linear
   axis over $0.19–$17 is a chart of the three most expensive models. The pinned-free-route log
   axis satisfies both halves; recorded for X7 so he can overrule.
2. **F-41 hatch rule — count exact + attached inputs.** Attached values (same product family,
   labelled "attached" on the model page) are used in the Composite and are legitimate evidence
   for it. The hatch is for a Composite built on fewer than three inputs *in total*; the pips
   distinguish exact (filled) from attached (half-filled) so the honesty F-32 added is kept.
3. **F-38's "Minimum score" label is superseded by R5.7** ("Minimum Capability Score (Composite)",
   Florian's wording). F-38 is verified on its other two points.
4. **F-31 … F-38 promoted to `verified`** by this pass (evidence above). The pass-4 Done-log
   rows are updated below.

## Verdict on the live site — pass 4 (2026-09-13, kept for the record)

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

> **Status 2026-09-13 pass 5 (Fable):** F-31 … F-38 verified and moved to the Done log. F-39 was
> fixed by Fable in this pass and is live (`64063b5`, Done log). The list below is the complete
> remaining design backlog, ordered by value. F-40 and F-41 are `[judgment]` (state model and
> evidence rule) and go to Codex Luna or Claude Opus 5; F-42 is `[mechanical]`; F-43 and F-44 are
> `[judgment]` layout work. The Kimi/Nex UI delegations have produced no usable diff in the last
> seven attempts — delegate only `[mechanical]` CSS to them, with a 20-minute cap, and implement
> directly when they return nothing.

### F-40 `[judgment]` Simple's sliders belong to Simple
*Where:* `components/SettingsContext.tsx` (`minScore`, `minScoreTouched`, `maxCost`, the
`minScoreApplied` / `minScoreSimple` selectors), `components/ShortlistControls.tsx`,
`components/ModelExplorer.tsx` (Advanced toolbar), `components/CostCapabilityScatter.tsx`,
`components/CompareView.tsx`, `components/EuSotaTable.tsx`, tests in `test/settings*.test.mjs`.
*What:* split the floor and the cap by mode. `simpleMinScore` (default 85, or `defaultMinFor(score)`)
and `simpleMaxCost` (default null) are written **only** by the two Simple sliders and read only
by Simple's list and map. `advancedMinScore` (default 0) and `advancedMaxCost` (default null)
are written only by Advanced controls (the Max $/task field, "Better than a model", the Guided
results hand-off) and read by Advanced, Charts, Compare and the EU table. Guided writes the
Advanced pair (it lands in an Advanced-style results view) and never the Simple pair (F-30 rule
kept). When `advancedMinScore > 0`, the Advanced toolbar shows a removable chip **`Score ≥ 85 ×`**
next to the count, so a floor is never invisible. Persisted settings migrate: an existing
`minScoreTouched` payload becomes `simpleMinScore` only. Reproduction of the defect: fresh
session → Simple → press ← then → on the score slider (value 85 again) → Advanced tab → live
today shows "7 models · filtered".
*Accept:* after the reproduction above, Advanced shows the same row count as a fresh Advanced
(101 today); Simple still shows 85 / 7 rows afterwards; setting Max $/task = 5 in Advanced does
not move Simple's cost slider; Guided with a "3 mo" floor lands on a results view whose toolbar
shows the `Score ≥ …` chip and clicking × restores the full catalog; the settings tests cover
the split and the migration.

### F-41 `[judgment]` One evidence rule: hatch on total inputs, pips tell exact from attached
*Where:* `lib/client-model.ts` (expose `composite_inputs_exact` and `composite_inputs_attached`
alongside `composite_coverage`), `components/ModelExplorer.tsx` (Score cell, small print),
`components/BenchmarkSheet.tsx` (Composite headline "2/7 exact inputs · 4 attached" stays).
*What:*
- **Hatch** (`thin`) when `exact + attached < 3`, not when `exact < 3`. Muted value text follows
  the same rule.
- **Pips** (Advanced only, as F-31): exact input = filled accent square; attached input =
  accent outline with a 50 % fill (`bg-accent/40 border-accent`); missing = hollow `border-line`.
  `title`/`aria-label` = "2 exact + 4 attached of 7 Composite inputs". Nothing at 7/7 exact.
- **Simple:** no pips (unchanged). When at least one visible row is hatched, the small print
  gains one clause at the end: *"· Striped score = built on fewer than 3 of 7 inputs"*. A hatched
  Simple bar gets `title="Composite built on n of 7 inputs"`.
- The Score (i) text gains one sentence: *"Attached values come from the same model family
  when a configuration was not measured itself; the model page marks them."*
*Accept:* in a fresh Simple no flagship row (Fable 5.1, Opus 5, Kimi K3, Grok 4.6, GLM-5.3) is
hatched; Advanced rows with fewer than 3 total inputs are still hatched (count > 0 today);
`[aria-label*="attached of 7"]` exists on the Fable 5.1 row; the small-print clause appears only
when a hatched row is on screen; `npm test` has a case for a model with 2 exact + 4 attached
(not thin) and one with 2 exact + 0 attached (thin).

### F-42 `[mechanical]` Phone Simple: sliders stacked, caption on one line
*Where:* `components/ShortlistControls.tsx` (and the F-13 grid in `ModelExplorer.tsx`).
*What:* below `sm` the two sliders stack vertically, each full width (the map keeps its 200 px
below them). Each caption is one line: label + `(Composite)` + (i) on the left, the value
right-aligned on the same baseline, in `whitespace-nowrap`; if the label still cannot fit at
390 px, the phone label reads **"Min. capability score"** / **"Max cost / task"** and the full
R5.7 wording stays in `aria-label` and in the (i). Histogram height and end labels unchanged.
*Accept:* at 390 px each slider caption is ≤ 24 px tall and its value sits on the caption line;
the shortlist card is ≤ 900 px tall including the map; desktop is unchanged.

### F-43 `[judgment]` Benchmaxxing radar: show the measured shape, not the missing one
*Where:* `components/BenchmaxxingReport.tsx` (radar, sector labels, legend line).
*What:*
- **Default = measured axes only.** The radar's axes are the benchmarks this model has a result
  for (29 for Gemini 3.1 Pro Preview today), ordered clockwise by topic; the 214-axis view stays
  behind a toggle **"Show all 214 axes"** (off by default).
- **Every topic with ≥ 2 measured axes is its own sector** with its own label and a light tint
  from the topic palette; topics with one measured axis are grouped as "Other" *and* listed in
  the legend line as now. No sector may cover more than 50 % of the ring unless it has more than
  half of the axes.
- **Line:** one closed polygon through the measured axes of each topic (topic-local, as F-07),
  sectors separated by a 2° gap; within a topic the polygon is filled `accent/15`. Dots stay.
- **Signal card** unchanged. Under the radar, replace the two-line note with one sentence:
  *"Axes are the n benchmarks this model has results for, grouped clockwise by topic; a jagged
  outline inside one topic is the Benchmaxxing pattern."*
*Accept:* `/benchmaxxing` default radar has exactly as many spokes as "measured" in the selector
(29/214 → 29); ≥ 5 labelled sectors for that model; the toggle shows 214; at 390 px labels stay
≥ 10 px (F-33 holds); the topic-local polygons render for each sector with ≥ 2 axes.

### F-44 `[judgment]` Compare: one picker row, one radar caption, ≤ 4,000 px
*Where:* `components/CompareView.tsx`.
*What:* the "Build your comparison" sidebar becomes a single **picker row** above the content:
up to four compact model chips (colour dot · name · ×) plus one "Add a model" combobox that
searches; the "Benchmark sheet ↗" link moves into each chip's hover/expand. The radar's
three-line caption ("Each version uses its measured catalog minimum → 0 …") becomes an (i) next to
the "Benchmark radar" title; the axis table under the radar stays a closed disclosure (F-35).
"Where each model is strongest" stays first after the radar. The "View radar ↓ / Full benchmark
table ↓" jump links go.
*Accept:* `/compare` with the default two models is ≤ 4,000 px at 1440 px and ≤ 7,000 px at
390 px; the picker is one row at 1440 px; removing and adding a model works by keyboard;
no regression in `bin/verify-f35.mjs`.

### F-45 `[mechanical]` Small cuts
*Where:* `components/BenchmarkRanking.tsx`, `components/ModelExplorer.tsx` (Advanced toolbar).
*What:* (a) `/benchmarks`: drop the "Explore" column; the row's model name becomes the link to
the model page and "Compare ↗" moves into the per-row expand. (b) Advanced toolbar: "Better than
a model ▾" and "Evidence ▾" keep their popovers but get the same 36 px height, border and font
as the search field and the org select, so the toolbar is one visual row of equal controls.
*Accept:* `/benchmarks` table has 3 columns at 1440 px (Rank · Model · Result); the Advanced
toolbar controls all measure 36 px tall.

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
| F-35 Compare release-post table: compact native values, percentile bars and one evidence expand per benchmark row | `085207b` (Codex Luna) | `ux-evidence/iter25-f35-live/{canonical,legacy}/verification.json`; `ux-evidence/fable-20260913-pass5/verify-f31-f38/` | **verified by Fable (pass 5):** 0 "observed 2026-" outside expands, 23 rows each with bars and a bold best value, both widths |
| F-36 Model page: suppress empty protocol-divergence copy; label Copilot card | `085207b` (Codex Luna) | `ux-evidence/fable-20260913-pass5/verify-f31-f38/` | **verified by Fable (pass 5):** no "Protocol-compatible", Copilot eyebrow above token offers, both widths |
| F-37 Subscription list: neutral verdict chips and one uncollected-plan footnote | `085207b` (Codex Luna) | `ux-evidence/fable-20260913-pass5/verify-f31-f38/` | **verified by Fable (pass 5):** no `text-warn` in the disclosure, "not collected" once, both widths |
| F-38 Simple score caption and one-line explanatory small print | `085207b` (Codex Luna) | `ux-evidence/fable-20260913-pass5/verify-f31-f38/` | **verified by Fable (pass 5):** small print 167 chars with the methodology link; caption wording superseded by R5.7 ("Minimum Capability Score (Composite)") |
| F-31 coverage pips, "est." out of the cells, "(modeled $/task)" header | `e57fa3a` (Codex Luna) | `ux-evidence/fable-20260913-pass5/verify-f31-f38/` | **verified by Fable (pass 5):** 101/101 Advanced rows carry a pip row, 0 cells with `est.` or `/7 inputs`, header sub-label present, both widths; rule refined by F-41 |
| F-32 exact vs attached Composite inputs, benchmark-count invariant | `e57fa3a` (Codex Luna) | same | **verified by Fable (pass 5):** `# benchmarks ≥ exact inputs` on all 101 rows; Opus 5 page says "2/7 exact inputs · 4 attached"; the hatch consequence is F-41 |
| F-33 Benchmaxxing card self-height, HTML sector labels | `efa17f9` (Codex Luna) | same | **verified by Fable (pass 5):** card 326 px at 1440; labels 16 px tall at 390; no overflow |
| F-34 Benchmarks page: one coverage line, a bar per result | `efa17f9` (Codex Luna) | same | **verified by Fable (pass 5):** coverage sentence present, no stat boxes, 25 bars, both widths |
| F-39 Simple value map: log cost axis restored, free routes pinned at the left edge, round money ticks | `64063b5` (Fable, pass 5) | `ux-evidence/fable-20260913-pass5/after-F39/verification-F39.json` + screenshots | live on both hosts: 0 overlapping tick labels at 1440/390, light/dark (was 46/138); needs a non-Fable verifier |
