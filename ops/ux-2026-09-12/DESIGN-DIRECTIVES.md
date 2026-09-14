# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 10: 2026-09-14 ~06:25 UTC**, against live revision `4b0d250` (https://benchmarkheaven.com).
Evidence: `/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass10/` — 80 screenshots +
`metrics.json` (desktop 1440×1000 and mobile 390×844, light and dark: Simple incl. moved slider,
Advanced incl. the cost-inputs modal, Guided 1–5, Benchmaxxing, model page, Compare, Benchmarks,
Charts; no overflow and no page errors in any of the 80), `verify-21aa63f-{canonical,legacy}/`
(`bin/verify-f63-f64.mjs`). The Filters overlay was not re-shot: no filter or settings component
changed since pass 9's `checks/`.
Earlier passes: `…/fable-20260914-pass9/` … `…/fable-20260913/`.

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

## Verdict on the live site — pass 10 (2026-09-14)

**At the bar, at both widths and in both themes.** Everything pass 9 opened is live: the phone
Compare radar fits (316 px, six numbered axes, legend list, no panning), the phone Charts bars carry
the value (longest 323 px, shortest 2.7 px), the phone model page leads with the Composite, no
version token prints twice, the desktop radar is 640 px. Fable re-checked F-58/F-59 on both hosts
at 06:22 after the review gate's a11y fix (`4b0d250`, rows are `listitem`s). The first screen of `/`
is still the two-line claim, the counts line, two sliders with their histograms, the value map with
its Pareto line and seven ranked rows; Guided is five questions that read as one gesture each;
Benchmaxxing leads with the signal table; the model page leads with the Composite and its radar;
Benchmarks and Charts hold. Dark mode is the same design in other colours — with one exception,
below.

What pass 10 measured that is *not* at the bar:

1. **Light mode drops the bar tracks on phone Charts.** `MobileBars` drew its track with
   `bg-white/[0.06]` and the open-vs-closed strip with `bg-white/[0.03]` — visible on dark, invisible
   on light (`mobile_light-charts.png` vs `mobile_dark-charts.png`), so in light the bars float and the
   remainder of the scale is gone. Also flagged by the 06:10 gate. → **F-63**, surgical (Fable).
2. **The model page's key-message spot speaks jargon.** Next to "Composite" the card said
   "2/7 exact inputs · 4 attached"; "attached" is a data-provenance term the reader meets only in the
   sheet below. → **F-64**, surgical (Fable).

Not opened, on purpose:

- Score bars in the tables run 0–100, so 89.1 and 99.4 look alike. A zero baseline is the honest
  encoding for a magnitude bar; the tabular number beside it carries the precision. Leave.
- Simple lists the priciest model first (R5.2) — literal, as decided in passes 4–9.
- Guided step 3 leaves the right half of the card empty at 1440. Two columns of pill rows would
  break the "one question, one gesture" rhythm on phones; the empty space costs nothing.
- The Simple value map at 390 suppresses two of seven point labels (F-17 collision rule); the ranked
  rows directly below name them.
- The cost-inputs modal stays dense (pass 8 decision); the Benchmaxxing signal bars stay nearly
  equal because the top-10 signals are (26.2–28.8).

## Decisions in pass 10

1. **R3.1 stands** (pass 8 wording; verified by claude-opus iteration 44, the codex-luna gate 02:00
   and the claude-opus gate 06:10, which set P4 `verified`). No change.
2. **R5.2 stays literal** (cost-descending Simple).
3. **F-63 and F-64 fixed by Fable, not delegated**: two class tokens and one wording line — a
   delegation round would cost more than the change (`21aa63f`).
4. **X4 (UI meets the design bar):** in the design authority's judgment the live UI meets Florian's
   bar at 1440 and 390, light and dark. The ledger row stays `open` only because the one-writer
   rule requires a non-Fable, non-Kimi engine to verify F-58, F-59, F-62, F-63 and F-64 live
   (`bin/verify-f58-f61.mjs`, `bin/verify-review-0610.mjs`, `bin/verify-f63-f64.mjs`).

---

## R3.1 — Hero claim (decided in pass 1, re-decided in pass 8, confirmed passes 9–10)

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

> **Status 2026-09-14 pass 10 (Fable), end of pass:** nothing open for implementers. F-63/F-64
> landed in `21aa63f` and were live-checked by Fable on both hosts (`bin/verify-f63-f64.mjs`,
> evidence `…/fable-20260914-pass10/verify-21aa63f-{canonical,legacy}/`). The specs below are kept
> for the independent verifier; F-58, F-59, F-62, F-63 and F-64 need a non-Fable, non-Kimi engine to
> set `verified`.

### F-63 `[mechanical]` Theme-aware tracks on Charts
*Where:* `components/ChartsBoard.tsx` (`MobileBars` track `div`, and the open-vs-closed strip
`div[role=img]`).
*What:* the track behind each phone bar uses the design-system line token (`bg-line`) instead of
`bg-white/[0.06]`; the open-vs-closed strip uses `bg-line/40` instead of `bg-white/[0.03]`. Nothing
else changes (bar colour `bg-accent/80`, heights, radii).
*Accept:* at 390 (`/charts`), light and dark, every visible bar-row track has a background that
differs from the page background by ≥ 12 RGB units after alpha blending; at 1440 and 390 the
open/closed strips likewise; no overflow; `npm test`, `tsc` green.

### F-64 `[mechanical]` Composite coverage in plain language
*Where:* `app/models/[id]/page.tsx` (the `<span>` beside the "Composite" heading).
*What:* `"{coverage + attached} of 7 inputs"`, followed by `" · {attached} from the model family"`
only when `composite_attached > 0` (`composite_attached` is already bounded so the total never
exceeds 7). The sheet's "Composite attachments" note with its (i) explanations is unchanged and
stays the place where "attached" is defined.
*Accept:* on `/models/claude-opus-5%3A%3Ahigh` at 1440 and 390 the line reads "6 of 7 inputs · 4
from the model family"; the string "exact inputs" no longer appears on the page.

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

---

---

## Earlier verdicts (condensed, for the record)

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
| F-60 phone model page: Composite card before the provider table (`order-first lg:order-none`) | `9240da5` (Fable, surgical) | `ux-evidence/fable-20260914-pass9/verify-1dc6b69-{canonical,legacy}/verification.json`, re-run on `7b5320d` | live both hosts: Composite h2 at 260 px vs providers at 703 px at 390; side by side (212/212) at 1440; needs a non-Fable verifier |
| F-61 no doubled version tokens (`versionSuffix()` in `lib/version-label.ts`; BenchmarkSheet, BenchmarkRadar, BenchmarkEvidence, BenchmarkCompare) | `9240da5` + `97e50a4` (Fable, surgical) | `ux-evidence/fable-20260914-pass9/verify-7b5320d-{canonical,legacy}/verification.json` | live both hosts: no `vX vX` on the model page or `/compare` at 1440/390, light/dark; needs a non-Fable verifier |
| F-58 compact phone radar (numbered axes, legend list, no horizontal scroll) | `7b5320d` (Kimi K3 draft via `bin/delegate.sh --kimi`, reviewed/adjusted by Fable) | same + `mobile_*-compare-radar.png` | live both hosts: SVG 316×316 in a 316 px region, 6 numbered axes + 6-entry list, scroll hint gone, desktop SVG keeps named labels; needs a non-Fable, non-Kimi verifier |
| F-59 HTML bar rows on Charts below `md` (`MobileBars`) | `7b5320d` (Kimi K3 draft, reviewed by Fable) | same + `mobile_*-charts.png` | live both hosts: recharts hidden at 390, two lists of 16 rows, longest bar 323 px, shortest 2.7 px; desktop recharts unchanged (32 bars, first 368 px); needs a non-Fable, non-Kimi verifier |
| F-62 desktop Compare radar `max-w-[640px]` | `7b5320d` (Fable) | same + `desktop_*-compare-radar.png` | live: SVG 640 px wide, "Where each model is strongest" at 1,221 px (was ~1,400); needs a non-Fable verifier |
| F-63 theme-aware tracks on Charts (`bg-line`, `bg-line/40`) | `21aa63f` (Fable, surgical) | `ux-evidence/fable-20260914-pass10/verify-21aa63f-{canonical,legacy}/verification.json` (`bin/verify-f63-f64.mjs`) + `mobile_light-charts.png` | live both hosts, 1440/390, light/dark; needs a non-Fable engine to set `verified` |
| F-64 Composite coverage line "6 of 7 inputs · 4 from the model family" | `21aa63f` (Fable, surgical) | same + `*-model.png` | live both hosts; "exact inputs" gone; needs a non-Fable engine to set `verified` |
