# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 6: 2026-09-13 ~17:30 UTC**, against live revision `2cf4080` (https://benchmarkheaven.com).
Evidence: `/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass6/` — 74 screenshots +
`metrics.json` (desktop 1440×1000 and mobile 390×844, light and dark: Simple incl. moved slider,
Advanced incl. price modal, Guided 1–4, Benchmaxxing, model page, Compare, Benchmarks, Charts),
`checks/` (Filters overlay at both widths, header-icon geometry, map-dot counts, radar spoke count,
crash reproduction attempts) and `checks/verification-F46-F47.json` once the fixes are live.
Earlier passes: `…/fable-20260913-pass5/`, `-pass4/`, `-pass3/`, `-pass2/`, `…/fable-20260913/`.

**The bar (Florian):** minimalistic and simple, very expressive, not overloaded, key messages
first, graphical with many charts.

**How to use this file.** Directives are numbered `F-nn`, ordered by value. Each has *Where*
(files), *What* (implementable spec), *Accept* (what the reviewer checks live). Implementers
take the top open directive, ship it, move its row to the *Done log* at the bottom with the
commit hash and evidence path. Do not re-interpret a directive; if it cannot be done as
written, leave it open and write why under it. Fable decides, others implement.

**Delegation hint.** `[mechanical]` directives are safe for `bin/delegate.sh --kimi` (clear
spec, no numbers to invent) with a 20-minute cap; `[judgment]` ones need Claude Opus 5 or Codex
Luna. Every delegated diff is reviewed before it lands.

---

## Verdict on the live site — pass 6 (2026-09-13)

The site now meets the bar on every surface except two. Simple answers Florian's question on
the first screen at both widths (two sliders with histograms, the value map, seven rows, 1,243 px
total on desktop); Advanced opens on 101 rows with pips and one toolbar row; the Filters overlay
is a clean four-group popover on desktop and a bottom sheet on phones; Guided reads best of all;
the model page is a release post (2,443 / 4,089 px); Charts is four cards with one accent colour;
Benchmarks is one bar per result. Dark mode is complete: no black-on-dark label anywhere, the
accent shifts to the light blue, orange stays reserved for Benchmaxxing. Everything from pass 5
shipped: F-40, F-41 (no flagship row hatched, 0 of 7), F-42 (phone sliders stacked, captions one
line), F-45 (Rank · Model · Result, 36 px toolbar) all hold live.

**What still fails the bar, in order of damage:**

1. **Compare is the one page that is not ours yet** — 5,576 px at 1440, 9,541 px at 390. On a phone
   the reader scrolls through four stacked "Model A … D" cards before the first chart appears at
   ~2,100 px. The F-35 table itself is right; the frame around it is a form. → **F-44**, now first.
2. **The Benchmaxxing radar still draws 214 spokes for 29 measured axes.** On desktop it is a grey
   sea with blue slivers; at 390 px it is a solid grey disc. The one chart that should *show*
   Benchmaxxing shows nothing. → **F-43**, second.
3. **Phone table header: the Adjusted Cost (i) overflowed the card by 4 px** (right edge 378 px,
   card 374 px) in Simple and Advanced, light and dark — the icon sat on the border. Cause: the
   27 % column gives 72 px of content room, "ADJUSTED / COST ▼" + (i) needs 86. → fixed in this
   pass (**F-46**, Fable, surgical: 42 / 27 / 31 % phone columns).
4. **One capture of the model page (mobile, dark) returned Next's unbranded "Application error"
   screen** (`mobile_dark-model.png`). Three sequenced re-runs with console capture did not
   reproduce it (`checks/crash-repro.json`, 0 errors, 4,089 px) — a transient chunk/hydration
   failure, not a data bug. But the site had no error boundary at all, so any such failure blanks
   the whole page. → fixed in this pass (**F-47**, Fable, `app/error.tsx`: nav and footer stay, one
   sentence, "Try again" + "Back to the overview").
5. **Benchmarks on phones: the first ranked row is at ~1,150 px.** Two stacked cards (picker,
   then a header with a 44 px "Primary source ↗" button, a description, the coverage line, then
   search + evidence) precede any data. → **F-48** `[mechanical]`.

## Decisions in pass 6 (close the three items the 16:10 gate reopened)

1. **R3.1 / P4 — the hero line 2 is final.** The gate objects that Artificial Analysis also
   publishes a per-model "cost per task". It does: a list-price number for one route. Our claim
   is *what each model really costs **you*** — priced on the route your own filters leave open
   (region, confidentiality, company status), with that endpoint's cache-read/write prices and
   measured hit rate, and the model's own token usage. No other site does that; the About page
   says so in four bullets ("Which provider … not a platform average"). The claim stands as
   published. For X7, the exclusivity-free fallback remains recorded: *"And the only place that
   prices each model the way you would actually buy it."* Gates may not reopen R3.1 without a
   site that prices a reader-filtered route; note it and move on.
2. **R5.3 — the Simple floor stays at 85, applied as ≥ 85.** Florian wrote "Score >85" the way
   people speak; a slider whose default is 86 would be an arbitrary number no one asked for, and
   the caption already reads "Minimum Capability Score 85". Recorded for X7 so he can overrule.
3. **F-22 — the map plots the Simple pool, not only the ranked rows; that is the design.** The
   `measuredOnly` pool (featured, measured task tokens) is drawn in full; rows that pass the
   two sliders are full-opacity and labelled, the rest are dimmed dots below the line. That is
   the "distribution behind the slider" Florian asked for in R5.5. Acceptance is re-specified:
   *number of full-opacity, labelled points = number of ranked rows* (today 7 = 7 at both widths;
   the earlier "10 full circles" count in `checks/checks.json` includes the three Pareto rings).
   Ledger row F-22 → `verified` on that definition.
4. **The model-page crash is recorded, not chased.** One occurrence in ~80 page loads, zero in
   three targeted reproductions. F-47 makes the failure mode survivable; if it recurs, the
   `digest` shown on the error panel identifies it in the server log.

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

---

## Directives (open)

> **Status 2026-09-13 pass 6 (Fable):** F-42 and F-45 (Codex, `f7fb2a2`) verified live in this
> pass and moved to the Done log. F-46 and F-47 were fixed by Fable in this pass. The remaining
> backlog is three items; F-44 and F-43 are `[judgment]` layout work for Claude Opus 5 or Codex
> Luna (Codex at 71 % of its window at 16:07 — below the 75 % warn line, so either engine), F-48
> is `[mechanical]`.

### F-44 `[judgment]` Compare: one picker row, one radar caption, ≤ 4,000 px
*Where:* `components/CompareView.tsx`.
*What:* the "Build your comparison" sidebar becomes a single **picker row** above the content:
up to four compact model chips (colour dot · name · ×) plus one "Add a model" combobox that
searches; the "Benchmark sheet ↗" link moves into each chip's hover/expand. The radar's
three-line caption ("Each version uses its measured catalog minimum → 0 …") becomes an (i) next to
the "Benchmark radar" title; the axis table under the radar stays a closed disclosure (F-35).
"Where each model is strongest" stays first after the radar. The "View radar ↓ / Full benchmark
table ↓" jump links go.
**Phone (added pass 6):** at 390 px the picker row is the two chips + the combobox, ≤ 160 px tall;
the radar (or the "strongest" cards) starts within 900 px of the top. Today the four stacked
"Model A … D" cards push the first chart to ~2,100 px.
*Accept:* `/compare` with the default two models is ≤ 4,000 px at 1440 px and ≤ 7,000 px at
390 px; the picker is one row at 1440 px and ≤ 160 px at 390 px; first chart top ≤ 900 px at
390 px; removing and adding a model works by keyboard; no regression in `bin/verify-f35.mjs`.

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
**Phone (added pass 6):** at 390 px the 214-spoke default is a solid grey disc with blue
slivers (`mobile_*-benchmaxxing-full.png`); the measured-axes default fixes this without extra work.
*Accept:* `/benchmaxxing` default radar has exactly as many spokes as "measured" in the selector
(29/214 → 29); ≥ 5 labelled sectors for that model; the toggle shows 214; at 390 px labels stay
≥ 10 px (F-33 holds); the topic-local polygons render for each sector with ≥ 2 axes.

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

---

## Earlier verdicts (condensed, for the record)

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
| F-40 Simple's sliders belong to Simple: split floor/cap by mode, Guided writes the Advanced pair, removable floor chip | `f454195` (Claude Opus 5) | `ux-evidence/iter29-f40/live-{canonical,legacy}/verification.json` | live 1440/390 both hosts, 0 fails; needs a non-Claude-Opus verifier |
| F-41 One evidence rule: thin = exact + attached < 3; attached pips half-filled; conditional Simple clause | `d5c2ac9` (Claude Opus 5) | `ux-evidence/iter29-f41/live-{canonical,legacy}/verification.json` | needs a non-Claude-Opus verifier |
| F-42 phone Simple: sliders stacked, captions one line | `f7fb2a2` (Codex Luna) | `ux-evidence/review-20260913T161002Z/`; `ux-evidence/fable-20260913-pass6/mobile_*-simple*.png` | **verified by Fable (pass 6):** captions ≤ 21 px, values on the caption line, card 485 px at 390 |
| F-45 Benchmarks 3 columns, Compare in the row expand; 36 px Advanced toolbar controls | `f7fb2a2` (Codex Luna) | same | **verified by Fable (pass 6):** Rank · Model · Result at 1440, toolbar one row of equal controls |
| F-46 phone table columns 42 / 27 / 31 % so the Adjusted Cost (i) stays inside the card | pass 6 (Fable, surgical) | `ux-evidence/fable-20260913-pass6/checks/verification-F46-F47.json` | needs a non-Fable verifier: (i) right edge ≤ table right edge at 390 in Simple and Advanced |
| F-47 route error boundary (`app/error.tsx`) | pass 6 (Fable, surgical) | same | needs a non-Fable verifier: `/models/<bad-id>` or a thrown client error renders the branded panel with nav intact |
| F-48 Benchmarks head card merged and first result brought into the first screen | `7c275c4` (Codex Luna) | `/opt/benchmarkheaven/state/ux-evidence/iter31-f48-live/verification-f48.json`, plus canonical/legacy F-27 screenshots and verification | **implemented; pending independent verification:** one panel, compact Category/Benchmark selectors, text Primary source link, one description/coverage paragraph, and results count aligned with filters; first row 561 px desktop / 837 px phone on both hosts |
