# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 25: 2026-09-20 ~03:30 UTC**, the "what changed since pass 24" pass (Florian: Fable sparingly). Since pass 24 the changed surface is
**`/jev-models`** again — CR-90 (difficulty scope + per-task grid), CR-93 (djev), CR-94 (the two "Compare two systems" radars and the longer
latency paragraph in Limits), CR-95 (JevBench v1.2.2: five systems, two new system types, the "why a service built on Jev leads" bullet), F-134/F-135
landed — plus the CR-89 "Support" line in the footer and the About paragraph, two new boards on `/benchmarks` (RSI-Exam 0.1, CR-83.1;
Toolathlon-Verified, CR-30.2), the harness-cohort label fix of gate 20260920T014003Z, and the Benchmaxxing tag Kimi K3 now carries (CR-78.3).
Judged against live revision `c1161c7` on the canonical host at 1440/390 × light/dark: 96 shots in
`/opt/benchmarkheaven/state/ux-evidence/fable-20260920-pass25/canonical/` (`metrics.json`: 0 page errors in all four contexts, no horizontal overflow on
any page; radar geometry, ring-label boxes, caption lines and sentences, the picker/swap states, the Support link) and 46 in `…/boards/` (the two board
rows, the Kimi K3 tag on the Overview and the model page, the CR-90 scope control in its default and "Easy only" states, the task grid closed, open and
scrolled). Scripts: `bin/shoot-fable-pass25.mjs`, `bin/shoot-fable-pass25b.mjs`; verifier for the fixes shipped in this pass: `bin/verify-fable-pass25.mjs`.
The Simple, Advanced, Guided, Benchmaxxing, Benchmarks and model pages were re-shot as quick views and are unchanged since pass 24. Earlier passes:
`…/fable-20260919-pass24/` … `…/fable-20260913/`.

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

## Verdict on the live site — pass 25 (2026-09-20), the JevBench page after CR-90/93/94/95, the Support link, two boards

**The radars are the right answer to Florian's question and they say it with the table's numbers.** Two systems, the four score axes on one radar
and accuracy by subject topic on the other, both values printed under every spoke in the series' colour, a legend line per system with its JevBench
Score and rank, a values table behind a disclosure, the partial-run treatment (grey "n=4", no point) and the same-family treatment (a dashed, mixed,
square-marked B when Jev meets a service built on Jev) — at 1440 and 390, light and dark, 0 page errors, no overflow
(`desktop_light-jev-compare.png`, `*-pickB.png`, `*-pickLast.png`, `mobile_*-jev-compare-vp*.png`). The v1.2.2 chart carries its two new types in the
legend and the bars, the headline says in one bullet why classifier.dev leads from the row data alone, the Support line is one quiet footer sentence
and one About paragraph, RSI-Exam renders as the 0–1 index it is (0.46 · **0.51** · 0.40, best in row bold) and Toolathlon-Verified's lone value has
no bar (F-84). The Kimi K3 tag is disclosed everywhere it appears (◔, the interval sentence, the −3.0 line on the model page); that is a data decision
for Florian, not a design finding.

**What is not at the bar — five things, three fixed in this pass, two for the implementer.**

1. **Both radars print "50" and "100" on the 12-o'clock spoke, and the top spoke's own point strikes "100"** (`metrics.json` `ringlabels` x = 382 =
   the spoke; Intelligence 90.4/90.1 and Math 87.6 sit under the label in every context; at 390 the 9 px labels render 7 px tall). The pass-21/22
   rule for both other radars (F-113, F-117) was not applied to the new ones. → **F-136, fixed** (half-step angle, inside the ring on the apothem,
   F-70 halo, 11 px, `data-radar-ring`).
2. **The topic radar's caption is five sentences — 9 rendered lines on a phone** (`figSentences: 5`, `figLines: 9` at 390): the definition, the
   tier-mix explanation, "not part of the score", the topic method with its link, the held-out note. The pass-20 rule caps a visible footnote at two
   sentences. → **F-137, fixed** (one sentence plus the conditional "grey n=…" line; "not part of the score" moves into the heading; the tier mix,
   method link and held-out note become the first lines of the disclosure, now "Values and notes").
3. **On a phone the ⇄ Swap button is a third full-width 44 px input between System A and System B** (`swap w 324 = the selects`,
   `mobile_light-jev-compare-vp.png`): it reads as a picker. → **F-138, fixed** (content-wide, right-aligned under System A below `sm`; unchanged
   on the picker row at `sm+`).
4. **Choose "Easy only" and the chart above still says "Official"** (`boards/*-jev-chart-easy.png`, `easy-state` in `boards/metrics.json`): the
   scores are recomputed (classifier.dev 87.1, Laya moves to #2), but the chart's badge reads "Official default", its eyebrow still says "534
   decisions per system", the table header still says "official", and the URL carries nothing. The only warning is a line inside the difficulty panel
   700 px below the chart — and it reads "showing easy only only". CR-90.1 asked for exactly the CR-87.10 state ("title/subtitle change, badge, one-click
   reset, combined wording when both differ, URL parameter"). A recomputed score labelled "Official" is the one presentational defect in this pass that
   changes what a reader concludes from a number. → **F-139** (implementer, judgment). CR-90.1 goes back to `open` in the ledger for this reason.
5. **The per-task grid is not compact**: 67 px rows for a ✓, 107 px cells, a 101 px header, a 1,953 px table in a 1,334 px wrap at 1440 and one system
   column visible at 390 (`boards/*-jev-grid-open.png`, `grid-geom`); 231 rows become 15,000 px of inner scroll, and the per-system tier totals CR-90.2
   asked for are not there (the group row says "Easy · 48 public tasks" and nothing per system). → **F-140** (implementer, mechanical).

Also noted, not a defect: at 390 the radar ring spans 46 % of the SVG width and the spoke labels render at ~10.5 px — small but legible with the values on
their own line; the axis caption is two sentences (kept); the B-series value colour in dark is the text-mixed blue (near-white), distinct from A's blue —
accepted, that is what the gate's same-family rule intends. `components/JevModelsV11.tsx` is still unimported (pass-24 note stands).

## Decisions in pass 25

1. **X4 (UI meets the design bar) still met at pass 25** for what a reader sees by default; F-139 is a state-labelling defect behind a control and is
   the one item that must land before the next gate calls CR-90 done. CR-90.1 is set back to `open` in `PROGRESS.md` with F-139 as the reason (the gate
   rule: a reviewer flips a row whose acceptance the live site does not meet).
2. **Fable shipped F-136–F-138 itself** (one file, `components/JevRadars.tsx`, plus `test/fable-pass25.test.mjs`) — each fix is a line or a copy move,
   and the record since pass 8 says Kimi stalls on one-file TSX edits. They need a **non-Fable live pass**: `bin/verify-fable-pass25.mjs` on both hosts,
   1440/390 × light/dark, expect **50/50 per host** (12 checks per desktop context, 13 per phone context; Fable's own run before the fix: 26/50).
3. **F-139 and F-140 go to the work engine.** F-139 touches the chart, controls and table state and the URL — a judgment item; F-140 is CSS and a
   count per tier — mechanical.
4. **A view control changes the hero's state wherever the hero is (rule added, extends CR-87.10):** any control that recomputes the ranked score —
   weights, task scope, a future filter — flips the chart badge, eyebrow, table header and URL into the same "not the default" state; a warning line
   next to the control alone is not enough, because the chart is read without it.
5. **A heatmap is dense (rule added):** an outcome grid has symbol-only cells ≤ 32 px wide, rows ≤ 28 px, a rotated or numbered system header, and
   fits the desktop wrap without a horizontal scroll; the row's metadata lives in the pinned first cell's title and the group row carries the totals.

## Verdict on the live site — pass 24 (2026-09-19), condensed

The JevBench page said the right things in the right order with the chart as the message; nine layout/copy findings (F-126–F-134) plus F-135, all
verified live by non-implementers (review gates 20260919T165003Z and 20260919T192003Z, iteration 123). Rules added: column order follows the headline;
one one-liner per page. Full text: `git show c1161c7:ops/ux-2026-09-12/DESIGN-DIRECTIVES.md`.

## Verdict on the live site — pass 23 (2026-09-18), condensed

The changed Benchmarks-page pieces (Retired tag, ‡ chart-read mark) at the bar in the cells; four footnote/label findings: F-122 (three
footnotes → two sentences + generated `TableLegend`), F-123 (no bar behind a chart-read value; shipped by Fable), F-124 (a pin is not a
version), F-125 (org line dropped when it repeats the name). All four verified live by non-implementers (iterations 109/110, review gate
20260919T032002Z). Full text: `git show 3910cf3:ops/ux-2026-09-12/DESIGN-DIRECTIVES.md`.

## Verdict on the live site — pass 22 (2026-09-18), condensed

Iterations 96–101 judged at the bar; F-112–F-115 verified by Fable as a non-implementer with claude-opus's two re-judgements accepted (zero-line
divergence; ring labels inside the rim, collision rule relaxed at 30+ axes); the two-line header at the phone's larger-text setting accepted;
F-116–F-119 (header (i) on the label's last line, Compare ring labels off the spoke, four-line Signal (i), "Open the full report ↓") shipped by
Fable in `61c5fcd` and verified by claude-opus in iteration 103 (62/62 both hosts). Recorded for Florian (X7): after CR-77/CR-78 the CR-74.4 penalty
is zero for both GPT-6 Astra (−5.8) and Claude Fable 5.1 (−0.1), so Fable 5.1 is #1 again (99.0 vs 97.9); if he still wants Astra first that is a
data/method decision, not a design one. Full text: `git show 7914c52:ops/ux-2026-09-12/DESIGN-DIRECTIVES.md`.

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

## Design system notes (apply while touching any file above)

- **A view control changes the hero's state wherever the hero is (pass 25, F-139, extends CR-87.10):** any control that recomputes the
  ranked score flips the chart badge, eyebrow, table header and URL into the same "not the default" state; a warning next to the control alone is
  not enough.
- **A heatmap is dense (pass 25, F-140):** symbol-only cells ≤ 32 px wide, rows ≤ 28 px, rotated or numbered column headers, fits the desktop
  wrap without a horizontal scroll; row metadata in the pinned cell's title, totals in the group row.
- **Ring labels never sit on a spoke — on every radar (pass 25, F-136 re-states F-113/F-117):** a new radar inherits the rule on day one:
  half-step angle, inside the ring, halo.
- **Column order follows the headline, not the data type (pass 24):** in a results table the raw quantity behind a headline axis ($ per
  1,000 behind Cost) sits beside that axis; per-tier detail, latency detail and endpoint come after and are the columns allowed to scroll.
- **One one-liner per page (pass 24, extends "one explainer per page"):** the score's one-sentence definition is printed where the score
  is drawn (the chart subtitle); the head names the score and stops. Provenance ("Revision …") lives in Method, never above the hero.
- **A control grid never stretches to a sibling's open panel (pass 24, F-126):** preset/choice buttons in a grid are `items-start`; an
  open disclosure in the same row keeps its own height.
- **A dimmed row is dimmed by colour, not opacity, wherever a cell is pinned (pass 24, F-128):** an opacity on a sticky cell makes its
  background translucent and the scrolled cells show through.
- **A legend covers every tag the table can show, generated from the tag set (pass 23):** the visible footnote is two sentences; the
  collapsed Legend lists marks first, then every entry of the tag set with its one-line tip. A hand-written tag sentence is a defect waiting
  for the next tag.
- **A pin is not a version (pass 23):** a hash-like identity is never printed as "Version …"; the row shows the read date, the detail page
  "Pinned revision ⟨hash⟩".
- **A display-only value gets no ranking cue (pass 23, F-121 + F-123):** no bar, no bold, no tag, no percentile, no tint — in every table that
  shows it, from one masked row.
- **A header cell's (i) sits on the label's last line (pass 22):** the label wraps inside its own control; the (i) is a
  non-shrinking sibling aligned to that last line and the sort caret is glued to the last word. An (i) or a caret on a line of its
  own is a defect (extends F-92).
- **An (i) is at most four short lines (pass 22):** ~70 words, one idea per line, the method behind its link (extends CR-32.3 to
  every (i)).
- **A signed score diverges around zero (pass 22, F-112 as re-judged):** when a bar column shows a signed quantity, the shared
  reference is the zero line, drawn on every bar, positive to the right, negative to the left in the muted token; a one-sided
  bar with a tick is for unsigned quantities only.
- **A bar column must vary or go (pass 21):** when a ranked list's bars would differ by less than ~10 % of their length,
  use one page-wide scale and mark the reference the reader compares against (a tick with a title); never scale to the
  visible list.
- **Ring labels never sit on a spoke (pass 21, both radars since pass 22):** on a radar whose spokes are data axes, ring labels sit
  at the half-step angle between two spokes, inside the ring, with the F-70 halo; unit words ("percentile") go into the caption.
  At 30+ axes a label box may touch a point; the halo keeps it legible and that is the accepted state (F-113 as re-judged).
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

- **Pass 21 (2026-09-17 10:00 UTC, live `facc759`):** iterations 90–95 at the bar; F-107–F-111 verified (CR-65.17/65.18 set to
  verified); designed F-112 (Signal bars on one page-wide scale — re-judged by claude-opus in iteration 101 to a zero-line
  divergence once CR-69 made the score signed), F-113 (ring labels off the spoke), F-114 (one explainer, one status line, Overview
  pill vocabulary), F-115 ("Full scale" on the control row); all four landed by claude-opus (iterations 98/101) and were verified
  by Fable in pass 22. Rules added: a bar column must vary or go; ring labels never sit on a spoke; one explainer per page.
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
| F-116 Table headers: the (i) and the sort caret never take a line of their own | `61c5fcd` (Fable, pass 22) | `/opt/benchmarkheaven/state/ux-evidence/iter103-nonimpl/pass22-{canonical,legacy}/` + `pass22-*.log` | **verified** by claude-opus (iteration 103, non-implementer) at live `7914c52` on **both hosts**: `bin/verify-fable-pass22.mjs` **62/62 each**, no header (i) on a line of its own, every (i) on its label's last line, caret glued, header row ≤ 68/80 px at 1440/390, light and dark |
| F-117 Compare radar: ring labels off the 12-o'clock spoke | `61c5fcd` (Fable, pass 22) | same | **verified** by claude-opus (iteration 103, non-implementer), both hosts: ring labels off the spoke, touching no point, halo present, on both the Percentile and the Native scale |
| F-118 The Signal (i) is four short lines | `61c5fcd` (Fable, pass 22) | same | **verified** by claude-opus (iteration 103, non-implementer), both hosts: the (i) panel is within the word budget and fits the phone viewport with its link |
| F-119 Quick look: "Open the full report ↓"; one-line variant sub-line | `61c5fcd` (Fable, pass 22) | same | **verified** by claude-opus (iteration 103, non-implementer), both hosts: the link no longer repeats the row name (name in `aria-label`), the variant sub-line is one line with a title |
| **F-112 re-judged** (claude-opus, iteration 101) — Signal bars: one catalog-wide scale with a visible reference mark, but the mark is the **zero line**, not the catalog average, and the bar **diverges** around it | `d1023a0` (claude-opus, iteration 101) | `/opt/benchmarkheaven/state/ux-evidence/f112-f114/` (`bin/verify-f112-f114.mjs`, 1440/390 × light/dark, both hosts) | **verified by Fable (pass 22, non-implementer):** the bar diverges around a shared zero line on one catalog-wide scale on Featured, Top 50 and All scored, both hosts, 1440/390, light/dark (`fable-20260918-pass22/*/desktop_light-benchmaxxing.png`, `*-bmx-top50.png`, `*-bmx-allscored.png`); the re-judgement (zero line, no catalog-average tick) is accepted and written into the design-system notes |
| **F-114 re-judged** (claude-opus, iteration 101) — one explainer above the table, one status line in the reader's order, table pills like the Overview | `d1023a0` (claude-opus, iteration 101) | same | **verified by Fable (pass 22):** one instruction line under the card title, one status line in the reader's order, first table row 686 px at 390×844 (≤ 780), pills in the Overview's vocabulary; both hosts, light/dark. Residual: the Signal (i) grew into a 170-word paragraph → F-118 (fixed in pass 22) |
| **For the design authority — two-line header at large text** (CR-79 follow-up, not a Fable directive) | `c7c3d22` | `/opt/benchmarkheaven/state/ux-evidence/cr79/live/{canonical,legacy}/` (360/390/430 px × light/dark × 1.0×/1.3× text) | **judged by Fable (pass 22): accepted, no change** — two lines beat a sideways scroll and beat hiding "Benchmarks" or shrinking the nav type for readers who chose larger text; `scrollWidth == clientWidth` at 390 × 1.3× on both hosts (`mobile_*-simple-largetext-header.png`) |
| F-113 Radar ring labels off the 12-o'clock spoke, unit word in the caption | `a5e8359` (claude-opus, iteration 98) | `/opt/benchmarkheaven/state/ux-evidence/f113/{local,live/canonical,live/legacy}/verification.json` + radar screenshots (/benchmaxxing report and /compare detailed, 1440/390, light/dark) | **verified by Fable (pass 22):** ring numbers at the half-step inside their rings with the halo, "avg pNN" on the other side, no "percentile" text node in the SVG, caption carries "Rings: 0 · 50 · 100 percentile"; `metrics.json` ring geometry on three models at 1440 (no label box touches a point) and 390 (two boxes touch a point over the halo — accepted as re-judged). Residual: the Compare radar's own ring labels → F-117 (fixed in pass 22) |
| F-115 Compare: the "Full scale" checkbox joins the control row | `526f4d9` (claude-opus, iteration 98) | `/opt/benchmarkheaven/state/ux-evidence/f115/` (Compare at 1440/390, light/dark) | **verified by Fable (pass 22):** at 1440 the checkbox's label box top is 425 px, the same row as the two segmented controls (h 36); at 390 it is the last control above the legend; both hosts, light/dark (`*-compare-radar.png`) |
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
| F-123 no data bar behind a chart-read value in `/benchmarks` and the Simple section (`rowBars`/`rowOutliers` get the masked row that `rowWinners` already had) | pass 23 (Fable, surgical) + `test/cr-60-union-alpha-preliminary.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/fable-20260918-pass23/` (before-state: `bm-prelim-row.bars: ["100%","99.96%"]`), `ux-evidence/fable-20260918-pass23/verify-{canonical,legacy}/verification.json` (`bin/verify-fable-pass23.mjs`) | **verified** — claude-opus (non-implementer) re-ran `verify-fable-pass23.mjs` at live `3387982`: **8/8 on both hosts**, 1440/390 × light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter109/f123-indep/{canonical,legacy}/verification.json`). Fable's own run at `26acb99` was also 8/8, before-state 4/8 |
| F-122 three table footnotes become two sentences plus one collapsed `TableLegend` whose tag lines are generated from the tag set (`components/TableLegend.tsx`, used by `BenchmarkMatrix`, `SimpleBenchmarks` and `BenchmarkCompare`) | `4bf2c3d` (claude-opus, iteration 109) + `test/cr-60-union-alpha-preliminary.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/iter109/pass23b-{canonical,legacy}/verification.json` (`bin/verify-fable-pass23b.mjs`) | live at `4bf2c3d`, **64/64 on both hosts**: visible footnote 16 px at 1440, 32/48 px at 390 (was 18–20 lines); legend collapsed on load, one line per mark and per tag, Retired and Changed at source among them; `verify-cr-1.mjs` 108/108 and `verify-cr-65-14.mjs` 27/27 per host kept green. **verified** — opencode-kimi (non-implementer, iteration 110) re-ran `verify-fable-pass23b.mjs` at live `b3492e5`: **64/64 per host**, 1440/390 × light/dark (`/opt/benchmarkheaven/state/ux-evidence/iter110-kimi-verify/pass23b-{canonical,legacy}/verification.json`) |
| F-124 a pin is not a version (`lib/version-pin.mjs` `isPin`, `humanVersion` gains a `pin` kind, `versionLine(row, showPin)`) | `4bf2c3d` (claude-opus, iteration 109) + `test/f124-pin-not-version.test.mjs` | same `verification.json` | live at `4bf2c3d`, both hosts: the `/benchmarks` row prints only the read date (checked on the pinned board's own model selection, after asserting the row is on the page), the eyebrow only the category, the detail card "Pinned revision 74221fb" once. A pure-digit string is deliberately not a pin (≈1 short hash in 20 has no letter; `20260918` would be misread). **verified** — opencode-kimi (non-implementer, iteration 110), same `verify-fable-pass23b.mjs` run at live `b3492e5`: **64/64 per host** (`/opt/benchmarkheaven/state/ux-evidence/iter110-kimi-verify/pass23b-{canonical,legacy}/verification.json`) |
| F-125 the org line is dropped when it only repeats the model name (`sameAsName` on the result page's two cards and two compared-model tables) | `4bf2c3d` (claude-opus, iteration 109) + `test/f124-pin-not-version.test.mjs` | same `verification.json` | live at `4bf2c3d`, both hosts: Union Alpha's card reads "Union Alpha" once; a named org (Claude Fable 5.1 · Anthropic) unchanged. **verified** — opencode-kimi (non-implementer, iteration 110), same `verify-fable-pass23b.mjs` run at live `b3492e5`: **64/64 per host** (`/opt/benchmarkheaven/state/ux-evidence/iter110-kimi-verify/pass23b-{canonical,legacy}/verification.json`) |
| F-126 preset buttons no longer stretch to the open Custom panel (`lg:items-start` on the preset grid) | pass 24 (Fable, surgical) + `test/jevbench-v12.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/fable-20260919-pass24/canonical/desktop_light-jev-custom-controls.png` (before: 345 px buttons) | **verified** — claude-opus (review gate 20260919T165003Z, non-implementer) re-ran `verify-fable-pass24.mjs` at live `fad2ccd`: **42/42 on both hosts**, 1440/390 × light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260919T165003Z/pass24-{canonical,legacy}/verification.json`) |
| F-127 phone chart: the I/C/S/K line wraps below `sm` (`min-w-0`, `sm:whitespace-nowrap`) so the bold score stays inside the panel | pass 24 (Fable, surgical) + test | `…/mobile_light-jev-chart.png` (before: "74.6" cut), `metrics.json` name widths 252–258 px in a 235 px column | **verified** — claude-opus (review gate 20260919T165003Z, non-implementer) re-ran `verify-fable-pass24.mjs` at live `fad2ccd`: **42/42 on both hosts**, 1440/390 × light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260919T165003Z/pass24-{canonical,legacy}/verification.json`) |
| F-128 partial rows' pinned name cell is opaque (dimmed by colour, `app/globals.css`) | pass 24 (Fable, surgical) + test | `…/mobile_light-jev-table-scrolled.png` (before: "39.5" showing through "by Cactus Compute") | **verified** — claude-opus (review gate 20260919T165003Z, non-implementer) re-ran `verify-fable-pass24.mjs` at live `fad2ccd`: **42/42 on both hosts**, 1440/390 × light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260919T165003Z/pass24-{canonical,legacy}/verification.json`) |
| F-129 `$ per 1,000` moves beside the Cost score, before the tiers; hero header sub is "official" | pass 24 (Fable, surgical) + test | `metrics.json` `tableW 1561 / wrapW 1366` (the column was off-screen at 1440); header wrapped to 4 lines | **verified** — claude-opus (review gate 20260919T165003Z, non-implementer) re-ran `verify-fable-pass24.mjs` at live `fad2ccd`: **42/42 on both hosts**, 1440/390 × light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260919T165003Z/pass24-{canonical,legacy}/verification.json`) |
| F-130 the config line under a system name is dropped when it only repeats the author | pass 24 (Fable, surgical) + test | `…/desktop_light-jev-table.png` ("by TypeSafe AI / Jev 1.13.0 / TypeSafe AI") | **verified** — claude-opus (review gate 20260919T165003Z, non-implementer) re-ran `verify-fable-pass24.mjs` at live `fad2ccd`: **42/42 on both hosts**, 1440/390 × light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260919T165003Z/pass24-{canonical,legacy}/verification.json`) |
| F-131 findings: "Needle 3, options as tools (options as tools)" → once | pass 24 (Fable, surgical) + test | `…/desktop_light-jev-findings.png` | **verified** — claude-opus (review gate 20260919T165003Z, non-implementer) re-ran `verify-fable-pass24.mjs` at live `fad2ccd`: **42/42 on both hosts**, 1440/390 × light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260919T165003Z/pass24-{canonical,legacy}/verification.json`) |
| F-132 the head names the score and stops (one-liner only in the chart); "Revision v1.2." moves into Method and tiers | pass 24 (Fable, surgical) + test | `…/mobile_light-jev.png` (head 600 px, chart at 707 px), `desktop_light-jev.png` (sentence twice within 300 px) | **verified** — claude-opus (review gate 20260919T165003Z, non-implementer) re-ran `verify-fable-pass24.mjs` at live `fad2ccd`: **42/42 on both hosts**, 1440/390 × light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260919T165003Z/pass24-{canonical,legacy}/verification.json`) |
| F-133 the razorback16 run is "OpenJev (razorback16)" in the chart, not "OpenJev" | pass 24 (Fable, surgical) + test | `…/desktop_light-jev-chart.png` | **verified** — claude-opus (review gate 20260919T165003Z, non-implementer) re-ran `verify-fable-pass24.mjs` at live `fad2ccd`: **42/42 on both hosts**, 1440/390 × light/dark (`/opt/benchmarkheaven/state/ux-evidence/review-20260919T165003Z/pass24-{canonical,legacy}/verification.json`) |
| F-134 visible JevBench caption keeps the mandatory speed note plus a short I/C/S/K + est./ann. legend within six rendered lines at 390; full definitions and footnotes stay in the closed legend disclosure | `2ea4bcc` (claude-opus, iteration 123) | `/opt/benchmarkheaven/state/ux-evidence/review-20260919T192003Z/f134-f135-{canonical,legacy}/` | **verified** — codex-luna (review gate `20260919T192003Z`, non-implementer) re-ran `verify-f134-f135.mjs`: **52/52 on both hosts**, 1440/390 × light/dark; the visible caption is ≤6 rendered lines, the disclosure contains the moved definitions/notes, and no overflow/page errors were reported. |
| F-136 both JevBench radars: ring labels at the half-step between spoke 0 and 1, inside the ring on the apothem, F-70 halo, 11 px, `data-radar-ring` | pass 25 (Fable, surgical, `components/JevRadars.tsx`) + `test/fable-pass25.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/fable-20260920-pass25/canonical/metrics.json` (before: `ringlabels` x = 382 = the spoke, 9 px), `…/verify-before-canonical/` (26/50), `…/verify-{canonical,legacy}/` once live; independent live evidence `/opt/benchmarkheaven/state/ux-evidence/iter130-codex-independent/fable25-canonical/verification.json`, `/opt/benchmarkheaven/state/ux-evidence/iter130-codex-independent/fable25-legacy/verification.json` | **verified by Codex-Luna (iteration 130, non-Fable):** `verify-fable-pass25.mjs` passed 50/50 on both hosts at 1440/390, light/dark, with no page errors or overflow. |
| F-137 topic radar caption: one sentence plus the conditional "grey n=…" line; "not part of the score" in the heading; tier mix, method link and held-out note as the first lines of the "Values and notes" disclosure | pass 25 (Fable, surgical) + test | same (before: 5 sentences, 9 lines at 390); independent live evidence `/opt/benchmarkheaven/state/ux-evidence/iter130-codex-independent/fable25-canonical/verification.json`, `/opt/benchmarkheaven/state/ux-evidence/iter130-codex-independent/fable25-legacy/verification.json` | **verified by Codex-Luna (iteration 130, non-Fable):** `verify-fable-pass25.mjs` passed 50/50 on both hosts at 1440/390, light/dark, including the caption/disclosure assertions. |
| F-138 phone ⇄ Swap is content-wide and right-aligned under System A below `sm` | pass 25 (Fable, surgical) + test | same (before: 324 px, the width of the selects); independent live evidence `/opt/benchmarkheaven/state/ux-evidence/iter130-codex-independent/fable25-canonical/verification.json`, `/opt/benchmarkheaven/state/ux-evidence/iter130-codex-independent/fable25-legacy/verification.json` | **verified by Codex-Luna (iteration 130, non-Fable):** `verify-fable-pass25.mjs` passed 50/50 on both hosts at 1440/390, light/dark, including the mobile Swap geometry. |
| F-135 "How costs are estimated" is a closed `<details id="jev-costs">` with a one-line summary outside; chart/Method links and a `#jev-costs` load open it and scroll to it | `5945e08` (codex-luna, iteration 119) | `/opt/benchmarkheaven/state/ux-evidence/review-20260919T165003Z/f134-f135-{canonical,legacy}/` | **verified** — claude-opus (review gate 20260919T165003Z, non-implementer) at live `f0de1a6`, both hosts, 1440/390 × light/dark: closed on load, 90 px at 390 (cap 160), first cost row in view after the chart-link click, a second in-page link opens it, direct hash load opens it in view, cost rows + reference prices inside, no overflow, 0 page errors (46/48 per host; the 2 misses are F-134's line cap) |
| F-139 task scope other than All makes the chart, table, controls and URL explicitly non-default, with reload/reset and combined-weight wording | `f509927` (codex-luna, iteration 129) | `/opt/benchmarkheaven/state/ux-evidence/iter129-codex-f139-f140/{canonical-deployed,legacy-deployed,cr87-current-canonical,cr87-current-legacy}/` + independent Kimi output | **verified by opencode-kimi (different engine, 2026-09-20):** `verify-cr-90.mjs` **66/66 on both hosts**, 1440/390 × light/dark; Easy + Medium and Easy scope labels, `?scope=` persistence, reload restoration, official reset, chart/table state and no errors all pass. The current v1.2 companion `verify-cr-87.mjs` also passes **84/84 per host**. | **Review gate 20260920T043003Z (claude-opus):** the directive's own acceptance — "with scope = all nothing on the page differs from the pass-25 shots" — was **not** met: the default hero read `231 decisions per system` instead of 534, because the scoped view counted public tasks, and the verifier asserted nothing about the default view although the directive's test spec asked for exactly that. Fixed by the gate (`scopeDecisions()`); the strengthened verifier now checks 534/231/168/72 and passes 74/74 per host. Needs a non-claude re-run.
| F-140 JevBench public-task grid is a dense heatmap with 32 px symbol cells, compact rows, rotated headers and per-system tier totals | `f509927` (codex-luna, iteration 129) | same | **verified by opencode-kimi (different engine, 2026-09-20):** same **66/66 per host**; 231 task rows, 21 system columns, 3 × 21 `correct/attempted` summary cells, rotated headers, no hidden payload, no mobile overflow and no page/console errors | | **Review gate 20260920T055002Z (claude-opus):** the directive's "rotated headers" were the only thing naming the 21 system columns, and the head was `position: static` — scrolled to the bottom of the 231 rows it sat 6,185 px above the scrollport, so on desktop as much as on a phone every cell below the first screenful belonged to an unnamed column. The Task cells' `bh-jev-sticky` is defined only under `.bh-jev-table` and this grid is a `.bh-table`, so the class resolved to nothing. Fixed by the gate (`fcaf334`, `[data-bh-jev12-task-table] thead th { position: sticky; top: 0 }`); unchanged at scroll-top, pinned at offset 1 px in all four contexts, live **114/114 per host**. The **horizontal** half is left open for Fable: at 390 px the Task cell needs 291 px of a 324 px scrollport (451 px at 1.3× text), so pinning it as-is leaves one outcome cell and the 170 px phone cap of the main table would clip the question type. |
