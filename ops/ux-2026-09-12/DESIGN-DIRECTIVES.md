# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 7: 2026-09-13 ~20:10 UTC**, against live revision `dea90cb` (https://benchmarkheaven.com).
Evidence: `/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass7/` — 80 screenshots +
`metrics.json` (desktop 1440×1000 and mobile 390×844, light and dark: Simple incl. moved slider,
Advanced incl. expanded row, Guided 1–4, Benchmaxxing, model page, Compare, Benchmarks, Charts),
`checks/` (Filters overlay at both widths incl. "More settings", `verification-F43-F44.json`),
`delegate-f51.{log,md}` (the Kimi delegation record for F-51).
Earlier passes: `…/fable-20260913-pass6/`, `-pass5/`, `-pass4/`, `-pass3/`, `-pass2/`, `…/fable-20260913/`.

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

## Verdict on the live site — pass 7 (2026-09-13)

**The site meets the bar on every surface.** Nothing on the first screen of any page fails
Florian's four tests any more; what is left is polish, and all of it is small.

What pass 7 confirmed live (both widths, both themes):

- **Simple** answers the question on the first screen: two sliders with histograms, the value
  map with 7 labelled points for the 7 ranked rows, the table right below (1,243 px total at
  1440; 1,606 px at 390). Dark mode is clean.
- **Advanced** opens on 101 rows, one toolbar row, pips on every row; the phone version has
  search + Refine and three columns with the (i) inside the card (F-46 holds).
- **Filters overlay** is four titled groups (Ranking · Price basis · Regional settings · Data
  confidentiality) with the rare options behind "More settings"; 20:1 is the default blend;
  Chinese-provider exclusion is off; the phone sheet is the same content stacked.
- **Guided** is the calmest surface on the site; step 3's "No floor · 1 mo … 6 mo" chips are
  exactly the "best model that existed n months ago" idea, made tangible.
- **Benchmaxxing (F-43 ✔ verified):** the radar now draws exactly the 29 measured spokes for
  Gemini 3.1 Pro Preview, with seven labelled topic sectors and topic-local polygons; the
  Agentic sector visibly saw-tooths, which is the whole point. 29 spokes at both widths, the
  "Show all 217 axes" toggle is off by default (`checks/verification-F43-F44.json`).
- **Compare (F-44 ✔ verified):** one picker row (two chips + combobox on one line at 1440,
  chips stacked and ≤ 160 px at 390), no jump links, 3,967 px / 5,233 px, first chart at 555 /
  858 px. All inside the F-44 bounds.
- **Model page** is a release post: headline Composite + mini radar, nine category panels of
  bar rows, one "Unusual results" panel, the rest folded. 2,443 / 4,089 px.
- **Benchmarks (F-48 ✔ verified):** one head panel, Category + Benchmark selectors on one row,
  text "Primary source ↗", one description paragraph, first ranked row inside the first screen
  at 1440.

**What still falls short, in order of damage (all small):**

1. **Cost precision was noise.** The table printed `$0.89512` next to `$17.308` and the model
   page `$4.378 /task`; five significant figures on a modeled estimate over-promise and make the
   column ragged. → fixed in this pass (**F-49**, Fable, surgical: `priceNumber` now prints two
   decimals from $1 up and three significant figures below $1: `$17.31`, `$6.87`, `$0.895`,
   `$0.186`). The sort stays exact; the underline still opens the full inputs.
2. **Compare's head was the odd one out.** An eyebrow, a serif slogan and a three-line
   description before the picker, while Charts, Benchmarks and Benchmaxxing are title + one
   line. → fixed in this pass (**F-52**, Fable, surgical: "Compare" + one line).
3. **"Radar axes · 6 / 8 selected" is a stray card** between the radar and the "strongest"
   section; it belongs inside the radar card next to "Show exact radar values". → **F-51**
   `[mechanical]`, delegated to Kimi K3 in this pass (see the Done log / ledger for the result).
4. **Benchmaxxing per-model report: the right column is a 300 px card over ~400 px of nothing**
   at 1440 (`desktop_light-benchmaxxing-full.png`). → **F-50** `[mechanical]`.
5. **One spelling split:** the table said "Domain specialisation", the card "Domain
   specialization". → fixed in this pass (American spelling, matching the rest of the site).

## Decisions in pass 7

1. **R5.2 stays literal (cost-descending Simple).** Looking at the fresh Simple screen, row 1
   is the dearest model (Claude Fable 5, 94.0, $17.31) above a cheaper and stronger row 2 (Claude
   Fable 5.1, 99.8, $14.17). That is what "über den Preis absteigend sortiert" says; the value map
   beside the table makes the trade-off visible, and one click on the Adjusted Cost header flips
   it. Recorded for X7 so Florian can overrule.
2. **R3.1 stands** as decided in pass 1 and defended in pass 6; nothing in pass 7 changes it.
3. **F-22 stands** as re-specified in pass 6: 7 labelled full-opacity points = 7 ranked rows, the
   other 13 points of the pool dimmed below the line (`desktop_light-simple.png`).
4. **No new [judgment] work is opened.** The remaining open directives (F-50, F-51) are
   mechanical; if Kimi returns nothing usable, the next Codex Luna iteration takes them (Codex at
   72 % at 18:07, below the 75 % warn line).

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

> **Status 2026-09-13 pass 7 (Fable):** F-43 and F-44 (Codex, `6508c5f`) and F-48 (Codex,
> `7c275c4`) verified live in this pass and moved to the Done log. F-49 and F-52 were fixed by
> Fable in this pass (surgical). Two `[mechanical]` items remain.

### F-51 `[mechanical]` Compare: fold "Radar axes" into the radar card
*Where:* `components/BenchmarkCompare.tsx` (the `<details className="bh-panel …">Radar axes · n / 8
selected</details>` block right after `<BenchmarkRadar …/>`), `components/BenchmarkRadar.tsx`.
*What:* remove the standalone panel; render the same `<details>` (same summary text, same
"Choose 3–8 axes…" paragraph, same checkbox grid and handlers) *inside* the radar card, directly
after "Show exact radar values" and before "How to read this chart", styled like those two
(`mt-4 text-sm`, no `bh-panel`). Pass it in as a prop/slot; no behavioural change.
*Accept:* `/compare` shows exactly one `bh-panel` between the picker and "Where each model is
strongest" (the radar card); the summary "Radar axes · 6 / 8 selected" is inside it; toggling an
axis checkbox still re-draws the radar; page height ≤ 3,900 px at 1440 and ≤ 5,200 px at 390;
`bin/verify-f44.mjs` and `bin/verify-f35.mjs` still pass.

### F-50 `[mechanical]` Benchmaxxing report: fill the right column
*Where:* `components/BenchmaxxingReport.tsx` (the `lg:grid-cols-[minmax(0,1fr)_300px]` grid and the
"Advanced details: topic groups and method" `<details>` below it).
*What:* at `lg` and up, move the "Advanced details: topic groups and method" disclosure into the
right column, directly under the Benchmaxxing-signal card (`aside`), so the column reads: signal
card → topic-groups disclosure. Its body switches to a single column there (`grid-cols-1`, not
`md:grid-cols-2`). Below `lg` nothing changes (card, then disclosure, stacked as today).
*Accept:* at 1440 the right column's bottom edge is within 120 px of the radar's bottom edge
(today the gap is ~400 px); at 390 the order is radar → caption → signal card → disclosure, as
today; no text change.

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
| F-43 Benchmaxxing radar defaults to measured axes, labelled topic sectors, "Show all n axes" toggle | `6508c5f` (Codex Luna) | `ux-evidence/fable-20260913-pass7/checks/verification-F43-F44.json`, `…/desktop_light-benchmaxxing-full.png` | **verified by Fable (pass 7):** 29 spokes = 29 measured at 1440 and 390, toggle present and off, 7 sector labels |
| F-44 Compare picker row, radar (i), no jump links | `6508c5f` (Codex Luna) | same | **verified by Fable (pass 7):** 3,967 px / 5,233 px; combobox on the chip line at 1440, chips ≤ 160 px at 390; first chart 555 / 858 px; 0 jump links; keyboard remove buttons present |
| F-48 Benchmarks head card merged | `7c275c4` (Codex Luna) | `ux-evidence/fable-20260913-pass7/desktop_light-benchmarks.png`, `mobile_light-benchmarks.png` | **verified by Fable (pass 7):** one panel, selectors on one row at 1440, text Primary-source link, one paragraph, first ranked row at ~560 px desktop |
| F-49 cost precision: 2 decimals ≥ $1, 3 significant figures < $1 | pass 7 (Fable, surgical, `components/PriceValue.tsx`) | `ux-evidence/fable-20260913-pass7/after/` once live | needs a non-Fable verifier: no `$` value in Simple/Advanced/model page shows > 3 decimals |
| F-52 Compare head: "Compare" + one line, no eyebrow | pass 7 (Fable, surgical, `app/compare/page.tsx`) | same | needs a non-Fable verifier |
| F-49 + F-52 independent check | — | `ux-evidence/iter34-f49-f52/live-{canonical,legacy}/verification.json` (`bin/verify-f49-f52.mjs`) | **verified by claude-opus (iteration 34):** 18/18 per host at 1440/390; Simple `$17.31`/`$14.17`/`$0.895`, 606 Advanced price cells and 25 model-page prices with no over-precise figure; Compare H1 "Compare", no eyebrow, one line, no overflow |
| F-51 radar axes inside the radar card | `2d9c834` (Kimi K3 → Nex fallback draft in `.worktrees/f51`, reviewed, typed and integrated by Claude Opus 5) | `ux-evidence/iter34-f50-f51/live-{canonical,legacy}/verification.json` (`bin/verify-f50-f51.mjs`); `f44-*`, `f35-*` regressions | live both hosts, 1440/390, light/dark: exactly one panel between picker and "strongest", summary inside it, order exact values → axes → how to read, axis toggle re-draws, heights within bounds; `verify-f44`/`verify-f35` 0 fails. Needs a non-Claude-Opus verifier |
| F-50 topic-groups disclosure in the right column | `3d32e8c` (Codex Luna) | `/opt/benchmarkheaven/state/ux-evidence/iter36-f50-live-{canonical,legacy}/verification.json` (`bin/verify-f50-f51.mjs`) | **implemented; pending independent verification:** at 1440 the right column stretches with the radar grid row and the collapsed disclosure fills the remaining height (radar bottom 1,761, column bottom 1,801; 40 px gap); at 390 the radar → signal → disclosure order remains stacked, with no overflow. Both hosts pass 42/42 in light/dark. |
