# DESIGN DIRECTIVES — Benchmark Heaven (design authority: Claude Fable 5.1)

**Pass 37: 2026-09-26 ~15:30 UTC**, the "what changed since pass 36" pass (Florian: Fable sparingly). Since pass 36 the changed surface is the
**JevBench hub after F-197/F-199/F-200** (guides folded at every width, the phone's Composite controls folded, the Capability ⓘ as a list and a
phone modal), **CR-176.1–.6** (the 2× label left of the dashed line with ← → hints on both bubble charts, median-latency speed, "$/1k decisions"
with est./ann. pills in both tables, three axis names and top-five labels in the 3D view), **/image-jev-bench after F-198**, CR-170's rename,
and the **hidden CR-172 v1.5 preview** (`/wip-oiifi41ouv1f/jevbench-v15`, noindex, not linked). Judged on the canonical host (revision
`ee204f34`, dataset 14:46 UTC) at 1440/390 × light/dark: 136 shots + `metrics-<ctx>.json` (guides state, bubble separator texts and sizes,
points left of the line with the checkbox off/on, label-group overlaps, cost-cell geometry, preset-row scroll, weights disclosure, the ⓘ panel
or dialog, 3D axis and model label boxes, the image page's F-198 markers, the v1.5 preview's outline) in
`/opt/benchmarkheaven/state/ux-evidence/fable-20260926-pass37/canonical/`; the quick views (Simple, Advanced, wizard, Benchmaxxing, a model
page, Benchmarks) were shot on today's data, 0 page errors, min text 10 px, and are at the bar. Scripts: `bin/shoot-fable-pass37.mjs`;
source pin: `test/fable-pass37.test.mjs`; live verifier for non-Fable engines: `bin/verify-fable-pass37-design.mjs <base> <outDir>` (groups
per directive; `ONLY=F-201` and `ONLY=F-202` for the parts Fable shipped; it launches its own Chromium). Local receipts at the fix revision:
`…/fable-20260926-pass37/local-F-20x/verification.json` (dev server); before-receipts for the directed groups: `…/local-before/`.

**Pass 36: 2026-09-26 ~06:20 UTC**, the "what changed since pass 35" pass (Florian: Fable sparingly). Since pass 35 the changed surface is
the **Capability-first JevBench hub** (CR-158: the Jev-class Capability ranking as the headline, two bubble charts, the Composite chart with
weight sliders above and below, View-by pills; CR-163/CR-164 the phone headline and row rhythm; CR-169/CR-169.1 the presentation polish and the
ⓘ trigger beside truncated names), the **fast-lane banner** on every JevBench route (CR-167, compact teaser on phones since CR-167.2), the
**published `/image-jev-bench`** (CR-166: composite bars first, radar compare, clean split), and today's daily data (revision `e6f729a0`, dataset
05:39 UTC — the first unattended publish since D210). Judged on the canonical host at 1440/390 × light/dark: 95 shots + `metrics-<ctx>.json`
(page geometry, Capability rows, bubble labels, sliders, banner, first-screen text, min font, "1 <plural>", field names) and the supplement
`metrics-b-<ctx>.json` (toast-versus-banner boxes at 7 s and 17 s, bubble label overlaps, a keyboard-driven slider re-score, the expanded
teaser) in `/opt/benchmarkheaven/state/ux-evidence/fable-20260926-pass36/canonical/`; the quick views (Simple, Advanced, wizard,
Benchmaxxing, a model page, Benchmarks) were shot on today's data and are at the bar. Scripts: `bin/shoot-fable-pass36.mjs`,
`bin/shoot-fable-pass36b.mjs`; source pin: `test/fable-pass36.test.mjs`; live verifier for non-Fable engines:
`bin/verify-fable-pass36-design.mjs <base> <outDir>` (groups per directive; `ONLY=F-194`, `ONLY=F-195`, `ONLY=F-196` for the parts Fable
shipped; it launches its own Chromium). Before-receipt at the pre-fix revision: `…/fable-20260926-pass36/before/verification.json`.

**Pass 35: 2026-09-25 ~04:00 UTC**, the "what changed since pass 34" pass (Florian: Fable sparingly). Since pass 34 the changed surface is
**CR-152, the JevBench v1.4.2 board** (PR #15, `c0075f10`): a new #1 (decider-4b v2, 64.1) above Jev 1.13.0 (63.3), 93 systems / 89 ranked,
Florian's fairness sentence with a "Sort by Intelligence" disclosure next to the top five, the pinned `/jev-models/v1.4.2` page, the leaf pages
re-read from v1.4.2, and a class the artifact introduces (`system-one-open`, five systems including #1 and #4). Also D195 (the model page's
payload diet, nothing rendered changed) and the D193 registry repairs (data, no UI). Judged against the live site (revision `5c9ef1e7`, dataset
03:32 UTC) on the canonical host at 1440/390 × light/dark: 125 shots + `metrics.json` (pass 34's matrix, re-run) and `{desktop,mobile}_light-v142*.png`
+ `metrics-v142.json` in `/opt/benchmarkheaven/state/ux-evidence/fable-20260925-pass35/canonical/`. Scripts: `bin/shoot-fable-pass34.mjs`
(unchanged, new out dir) and `/tmp/shoot-v142.mjs` (copied to `bin/shoot-fable-pass35-v142.mjs`); source pin: `test/fable-pass35.test.mjs`; live
verifier for non-Fable engines: `bin/verify-fable-pass35-design.mjs <base> <outDir>` (groups per directive; `ONLY=F-191` and `ONLY=F-183` for the
parts Fable shipped). Earlier passes: `…/fable-20260924-pass34/` … `…/fable-20260913/`.

**Pass 34: 2026-09-24 ~18:30 UTC** (condensed):, the "what changed since pass 33" pass (Florian: Fable sparingly). Since pass 33 the changed surface is
the **JevBench hub** after F-171–F-175 and F-179 (iterations 198–206) and after CR-142 (the cost log axis, dark-mode SVG fills, the seven
input-length buckets, the context-limit chart and its table), the **per-system pages** at v1.4.1 (F-171), the **CR-136 pages** now live
(alternatives, chooser, four Jev-vs pages), the CR-141 multimodal preview, the CR-140 request-evaluation page and the CR-139.2 cost modal.
Judged against the live site (revision `29809bf9`, dataset 08:11 UTC) on the canonical host at 1440/390 × light/dark: 138 shots +
`metrics-<ctx>.json` in `/opt/benchmarkheaven/state/ux-evidence/fable-20260924-pass34/canonical/` (per page: heading outline with y positions,
tables, svg counts, disclosures, first-screen text at 390, word count, min font, overflow, "1 <plural>", field names in copy; hub: capability
suite text, cost axis, scatter points and top-five labels, SVG text fills per theme, context headings, Credit text, the licence sentence, head
size count, first bar y, row links, radar dashes, history state; the Vertex cost modal). Script: `bin/shoot-fable-pass34.mjs`; source pin:
`test/fable-pass34.test.mjs`; live verifier for non-Fable engines: `bin/verify-fable-pass34-design.mjs` (groups per directive; `ONLY=F-176`,
`ONLY=F-181`, `ONLY=F-186` for the parts Fable shipped). Earlier passes: `…/fable-20260923-pass33/` … `…/fable-20260913/`.

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

## Verdict on the live site — pass 37 (2026-09-26), the hub after F-197–F-200 and CR-176, the image page after F-198, the v1.5 preview

**Pass 36's directives hold on the live site.** F-197: the ten guide links are in the HTML and none is visible, the "Explore JevBench guides ↓"
toggle (44 px) sits after `#jev-class-method`, the head keeps six links, and the first Capability row is at y **561** at 1440 (was 633; budget
590) and **654** at 390 (was 714; budget 660) — the row clears the 55 px teaser (top edge 789). F-198: `/image-jev-bench` runs Composite →
Full ranking → Compare → Examples → Split → Method, the candidate table is a closed disclosure, eight gated sub-lines name Cost or Calibration,
no bare "0.00", no bold parenthetical, no Penalty column, "Earlier split" present, **11,036 px** at 1440 (was 14,890). F-199: the phone's
preset row is one 28 px line that scrolls (978 px in 306), "Adjust weights ↓" is closed on load and open with `?w=40-20-20-20`, no "Sort by"
button anywhere, the first bar is inside the first viewport of the figure. F-200: hovering the first ⓘ at 1440 shows a `dl` with 7 rows; a
tap at 390 opens a `[role=dialog]` with ✕ and the same 7 rows, no floating panel, the row's `title` is gone. F-194/F-195/F-196 hold
(official count 1; no bubble text under 10 px at 1440). **CR-176 as Florian asked:** the "2× Jev cost" / "2× Jev latency" caption sits left of
the dashed line, "← pricier · cheaper →" and "← slower · faster →" stand across the top of each plot, **0 of 50** points are left of either
line with the checkbox off (27 and 25 of 91 with it on), both tables read "$/1k decisions" with est./ann. pills left of a right-aligned
number and no green shading (60 cells, one right edge at 1440), and the 3D view names its three axes. 0 page errors in all four contexts.

**Six things are not at the bar; two fixed in this pass, four directed.**

1. **The 3D top-five labels are drawn off the left edge.** CR-176.6 anchors five DOM labels to the projected sphere positions, but only the
   axis labels get `position:absolute`; the model labels are block-flow children of the label layer, so each spans the whole box (**1,324 px**
   wide at 1440, 322 at 390) and its `translate(-50%)` pushes the text to x **−10 … −23**. What a reader sees is ".3.0", "-4b v2", "v0.2.0",
   "er" clipped at the left border (`desktop_light-hub-3d-settled.png`, `metrics-*.json` `hub-3d.modelL`), in all four contexts; the y
   positions are right, so the labels hover at sphere height but nowhere near their spheres. The CR-176.6 harness (42/42) read each label's
   `style.transform` string, never its rendered box. → **F-201**, fixed by Fable (one CSS rule) and the verifier reads boxes.
2. **9 px on phones, again.** The new separator caption and the four direction hints render at `fontSize={narrow ? 9 : 10}`: at 390 "2× Jev",
   "← pricier", "cheaper →", "← slower", "faster →" are the page's smallest text, under the 10 px floor (F-147/F-181/F-195). → **F-202**,
   fixed by Fable.
3. **9.5 px was hiding behind 9.5 px.** With F-195 shipped, the hub's minimum text is now the input-length chart's bucket ticks ("0–499" …)
   at `fontSize="9.5"` in `components/JevContextLength.tsx` — pass 36's min-font probe reported the first 9.5 px element it met, which was the
   bubble tick, so this one was never seen. → **F-203**.
4. **Each 3D axis is named three times, in two vocabularies.** The plot now carries "Capability 0–100", "Cost · $/1k decisions · cheaper →",
   "Speed · faster →" (CR-176.6); the pre-existing legend box top-left still says "Capability ↑ · 0–100 / Cost · $/1k **tasks** (log), cheaper → /
   Speed · 0–100, faster →", and a caption under the top-five list says it a third time ("Vertical: Capability · Right: cheaper · Toward you:
   faster"). The same split runs through the hub: the Capability ranking's column head is "$/1k tasks" and its ⓘ says "Cost per 1,000 tasks",
   the Composite and axes tables say "$/1k decisions" (Florian's word, CR-176), the ranking marks estimates with "*" and the tables with an
   "est." pill. On the flat charts the arrow Florian asked for at the top ("cheaper →") is repeated by the axis title at the bottom ("$ per
   1,000 decisions (log) · cheaper →"), and "faster →" likewise. → **F-204**.
5. **On a phone the bubble leaders cross.** At 390 the five labels of each chart are pushed into the top-right of a 324 px plot; "1. Jev 1.13.0"
   sits across the leaders of "4. decider-4b v2" and "5. JevK5 v0.2.0", and in the cost chart two leaders cross each other
   (`mobile_light-hub-scatter-vp.png`; `local-before/F-205`: 2 crossings at 390 in light and dark, 0 in the speed chart; label-group boxes
   overlap 6 and 7 times at 390, 2 at 1440, `hub-bubbles.charts[].overlaps`; the text boxes themselves do not overlap). Readable, but a diagram whose pointers cross
   is not "very expressive". → **F-205**.
6. **The v1.5 preview carries three habits the site has already dropped.** (a) Every cost prints as "~$0.028 est." in mono text; 94 of 97
   systems are estimates, so the tag is on nearly every row and says nothing, and CR-176.4's pill-left / number-right convention is not
   applied. (b) 76 of 89 ranked rows carry "≈" — "adjacent pairs whose 95% interval includes zero" (76 of the 88 pairs) — so the marker marks most of the board; the data
   has a 95% interval for every system (`composite_ci95.B`) and the bars do not draw it. (c) The axes table's cost head is "$/1k". (d) The
   headline line is the bold fragment "joint leaders (statistical tie)" with no names. The Penalty column is right to keep here: 15 of 97
   rows are below ×1.000, unlike the image page's all-×1.000 column F-198 removed. → **F-206** for the CR-172 job, before the page is linked.

Not defects: the hatched "classifier.dev — not ranked (honorable mention)" row inside the ranking (the rule says so); the Composite
figure's four sliders open at 1440 (CR-158); the phone's Capability rows at 43/52 px (names wrap to two lines; one row at 67); the hub's
length (22,207 px at 1440, 28,460 at 390 — every section is Florian's, and each folds what it can); the amber preview banner on the v1.5 page.

## Decisions in pass 37

1. **A verifier reads rendered boxes, not style strings (F-201):** a label check that passes on `style.transform` while the text is clipped
   off-screen verified the wrong thing. Position checks compare `getBoundingClientRect()` against the container and against each other.
2. **One vocabulary per quantity on a page (F-204):** JevBench prices are per 1,000 **decisions** (Florian, CR-176) — the word "tasks" for
   the same number leaves the hub. One estimate marker convention per page: the pill (CR-176.4) wherever a cell has room; where a column is
   too narrow for a pill, the "*" stays but its legend uses the same word ("est.").
3. **A fact is stated once per figure (F-204):** with axis names on the plot, a legend box and a caption that repeat them are ink; with a
   direction hint at the top of a flat chart, the axis title keeps its name and drops its arrow.
4. **Leaders never cross (F-205):** on a narrow plot the labels form a column ordered like their points, and each leader runs to its own
   bubble without crossing another; if that is impossible for five, the chart labels fewer.
5. **A marker that is on most rows marks little (F-206)** — pass 36 decision 2 applied to data: draw the interval (a whisker) and
   drop the per-row ≈; tag the three tariff prices and say once that the rest are estimates.

## Verdict on the live site — pass 36 (2026-09-26), the Capability-first hub, the banner and the published image benchmark

**Pass 35's directives hold on the live site** (F-189 the View-by control, F-190 the pinned page at 12,210 px, F-191/F-183 the leaf reference,
F-192 the `system-one-open` swatch, F-188 the alternatives header, F-193 the phone first-row budget at 714 px): 0 page errors in all four
contexts, no "1 <plural>". **The Capability ranking is the best headline the hub has had**: at 1440 the first row sits at y 633 under one
sentence that names the leader, the bar plus the thin log-scale cost line say two things per row without a second table, the 91 rows share one
height, the ⓘ sits beside the truncated name (CR-169.1 holds: 10 visible triggers of 16 px with a 44 px hit area), and the two bubble charts are
the strongest new figure on the site — 50 points each, five labelled leaders with leader lines and zero label overlaps at 1440 and 390, the cost
axis reversed so "cheaper →" reads left to right, the Jev limits drawn as dashed lines. The banner is Florian's copy in Florian's colour,
73 px at 1440 and a 55 px teaser on a phone that expands to 145 px with the two buttons. The keyboard re-score works (six ArrowRight presses
on Intelligence → 55/25/25/25, "Custom weights" everywhere it matters, the official preset resets it). The image page opens with the bars.

**Seven things are not at the bar; three fixed in this pass, four directed.**

1. **Two promotions fight for the bottom edge of the phone.** The custom-evaluation toast (CR-102/106, opens 6 s after load, lands into the
   eyebrow badge at 17 s) is `position: fixed; bottom: 1rem; z-index: 45`; the fast-lane banner is `bottom: 0; z-index: 70`. Measured 7 s
   after load: at 1440 the toast's lower **57 px** are under the banner (`metrics-b-desktop_light.json`, `overlapPx`); at 390 only its first
   two lines show above the teaser, the "See your options" link and "Don't show again" are under it (`mobile_light-overlay-7s.png`,
   `mobile_dark-hub-caprows-vp.png`). Both are Florian's; neither may hide the other. → **F-194**, fixed by Fable (one CSS rule: while the
   banner reserves the bottom edge the toast sits above its height).
2. **9.5 px again.** The speed bubble chart prints its five latency sub-ticks ("≈10 s … ≈100 ms") at `fontSize="9.5"` — the page's smallest
   text, under the 10 px floor (F-147, F-181). → **F-195**, fixed by Fable.
3. **"Official" three times in 110 px.** The Composite figure says Official as the badge under its h2, as the pressed preset "Official
   25:25:25:25", and again as a green status pill at the end of the preset row — in both slider groups (`desktop_light-hub-chart-vp.png`; the
   figure's `.bh-jevc-official` count is 3). The status pill earns its place only in the custom state. → **F-196**, fixed by Fable.
4. **The hub head is a link farm before the message.** At 1440 the head is the h1, one sentence, the image link, **eleven guide links in two
   rows**, a provenance line and "Share this version" — 400 px before the eyebrow "HEADLINE RANKING"; the phone already folds the eleven links
   behind "Explore JevBench guides ↓" (`components/JevBoardGuides.tsx`, `sm:hidden`), the desktop does not. Pass 34 accepted a three-link
   guides row; CR-136's four Jev-vs pages and CR-153's guides grew it to eleven. → **F-197**.
5. **The image page keeps its review paperwork on the public page.** After the bars and the radar it says its top five a second time in a
   grey-green panel ("Top five by composite score" — the same five names the bars drew 1,300 px higher; pass 35 decision 3), then a bold
   emerald alert "Clean split — meets the approved one-third / two-thirds target" (governance wording — approved by whom, for the reader?),
   then 4,000 px of "Candidate coverage and review status" (a 37-row table of "requested, not yet evaluated" with 40-character source hashes)
   **before** the Full ranking table, which the Composite intro promises ("The four axes and Jev-class gates are in the table below") but
   which sits at y 10,585 of 14,890. Two systems print **"0.00"** as a score with no reason — Gemini 3.8 Flash is gated by its Cost axis
   (0.58; USD 2.06 per 1,000 decisions), OpenJev 4B NLI v2 by Calibration 0.00 (it reports no probabilities); a reader sees "useless", the data
   says "gated". Names carry configuration notes in bold ("Reflex 4B (released stable configuration)", "OpenJev 4B NLI v2 (official
   image-premise path)"), wrapping bars and cards to two lines. The table has 14 columns and scrolls sideways at 1440; its "Penalty" column is
   ×1.000 on all twelve rows. → **F-198**.
6. **On a phone the Composite figure is 1,000 px of controls before its first bar.** The preset pills wrap to five lines, the four sliders take
   two more rows, then View-by (two rows), the fairness sentence, search and Filters, the legend line — from the h2 to the first bar is more
   than a viewport (`mobile_light-hub-chart-vp.png`). Florian asked for the sliders above and below the chart and the sorting and filters
   next to it (CR-158); on a phone that wish is honoured by folding, not by stacking. The inline "Sort by Intelligence ↓" button after the
   fairness sentence duplicates the "Intelligence" View-by pill 30 px above it (pass 35 decision 2: one control per sort). → **F-199**.
7. **The Capability ⓘ is a 300-character sentence, and on a phone it covers the next two rows.** "Jev 1.13.0 (TypeSafe AI). Capability 64.7.
   Intelligence Score 53.1. Calibration 76.3. Cost Score 52.0. Cost $0.040 per 1,000 tasks, 1.00× Jev. Median latency 0.65 s. Capability rank
   1; official rank #2." is seven label/value pairs set as prose, in a hover panel that a tap on a phone drops over rows 2 and 3 with no close
   (`mobile_light-hub-rownote-open.png`); the same sentence is the `<li>`'s native `title`. R1.8 already decided this: hover panel on desktop,
   a small modal with ✕ on phones (`components/InfoTip.tsx`). → **F-200**.

Not defects: the serif h1 (the brand rule for page heads); the hatched "classifier.dev — not ranked (honorable mention)" row inside the
numbered top ten (the rule says so, the note says so); the weight sliders on the pinned `/jev-models/v1.4.2` (the # stays the official rank, the
page still says frozen); the amber caveat on the image page (honest, above the bars, one paragraph); the 11 legend swatches under the
Capability ranking (11 classes are present).

## Decisions in pass 36

1. **Fixed overlays stack; they never hide each other (F-194):** every fixed element at the bottom edge reads the banner's reserved height
   (`--bh-fastlane-height`) and sits above it. A second promotion on the same edge is a smell the loop should keep in mind, but two of
   Florian's features on one page are stacked, not arbitrated.
2. **A state label names the exception, not the default (F-196):** when the control already shows the default (a pressed preset, a badge),
   a status pill that repeats "Official" is noise; it appears only when the state is not the default.
3. **The head is the message; navigation folds (F-197)** — extends pass 24's "first screen" rule: a guides row longer than one line is a
   disclosure at every width and sits after the headline figure, not before it.
4. **A public benchmark page carries results, not its review trail (F-198)** — extends pass 35 decision 3: the top five once (the bars),
   governance wording ("approved", "target", "review status") off the page, candidate bookkeeping behind a disclosure, and a zero that a gate
   produced says which gate produced it.
5. **A phone folds a control row it cannot fit; it does not stack it (F-199):** presets scroll sideways in one line, sliders open on request
   (and open by themselves when the state is custom), desktop stays as Florian asked.
6. **Seven values are a list, and on a phone a list is a modal (F-200)** — R1.8 applies to every ⓘ on the site, not only the Overview table.

## Verdict on the live site — pass 35 (2026-09-25), the JevBench board at v1.4.2, its pinned page and its leaf pages

**Pass 34's shipped directives hold on the live site** (F-180 the context table behind one disclosure, F-181 ticks at 10 px, F-182 words for keys,
F-184 one row height, F-185 the input-length axis, F-186 the wrapped locator, F-176(b) the licence in Credit): the hub's minimum text is 10 px in
all four contexts, 0 page errors, no "1 <plural>", no underscore key outside the formula, the author handle and the quoted module paths. The
v1.4.2 board itself reads as the v1.4.1 board did: 89 bars, "Show all" after 20, the table with the pinned name cell, four radars for the
default pair, the capability suite with its cost axis, the context chart.

**Five things are not at the bar; one is a wrong number and is fixed in this pass, four are directed.**

1. **A leaf page contradicts itself about the system it measures against.** Under "Rank #3 of 89 ranked systems." the JevK5 page said "2.1
   points behind Jev 1.13.0's 64.1" while the strip's caption two lines lower said "The marked tick is Jev 1.13.0 (63.3)" — the sentence took
   the first-ranked row (decider-4b v2, 64.1) and named it Jev. On decider-4b v2's own page it read "0.0 points ahead of Jev 1.13.0's 64.1". The
   radar pair on the right compared against decider-4b v2 ("B: decider-4b v2 — system-one-open · Score 64.1 (#1)") while the strip and the axis
   bands compared against Jev (`desktop_light-sys-jevk5-v02.png`). Three references on one page, one of them misnamed. → **F-191**, fixed by
   Fable; **F-183** (the head sub-line, the "Against ⟨reference⟩" heading, the release sentence in Availability) shipped with it, as the
   release cut that blocked it has merged.
2. **The chart's "Sort by Intelligence" is a table, not a sort.** CR-152 put the fairness sentence in a box between the chart's subtitle and
   its bars (`border-white/10`: a visible frame in dark, an invisible one in light) with a closed disclosure "Sort by Intelligence ↓" that opens
   an 89-row, six-column table of the same systems — the chart's data a second time, in the form pass 34's decision 1 retired (F-180). The box
   moves the first bar from y 662 to 852 on a phone (`mobile_light-hub.png`; the hub's `firstBarY` in `metrics.json`) and to 638 at 1440.
   "sort by Intelligence for raw reasoning" promises a control. → **F-189**.
3. **The pinned page says its top five twice and carries a live-dated panel.** `/jev-models/v1.4.2` opens with a five-line provenance head
   (SHA line, decisions line, two links), then a "Frozen top five" list (decider-4b v2 — 64.1 … Hopper — 59.4), then the board whose first
   five bars are those five rows again, 250 px lower (`desktop_light-v142.png`, first bar at y 861 against the hub's 638); after the board and
   the capability suite it repeats the context-length section, whose head says "sources checked 24 Sept 2026" — a panel that changes with the
   daily run, on a page whose whole point is that it does not change. 17,417 px at 1440, 22,466 at 390 (`metrics-v142.json`). → **F-190**.
4. **The #1 system is coloured as an "Instruction model, JSON schema".** v1.4.2 introduces the class `system-one-open` (decider-4b v2 #1,
   Cygnet #4, swanOne #34, typecastlm #51, CLM-8B #78). `components/jevTypes.ts` has no label or colour for it, so `typeColour` falls back to
   the llm-baseline green: the two green bars in the top five read, by the legend, as instruction models; the compare legend prints the raw key
   ("— system-one-open"); the legend under the chart lists ten classes and not this one. The class is not described in the repo's README,
   METHOD-v1.4 or RELEASE-v1.4.2 either (checked at tag v1.4.2) — the label is a data-owner decision, the colour is not. → **F-192**.
5. **The alternatives bars still have no header** — F-188 as directed in pass 34, now unblocked (`desktop_light-alt.png`: five bars, five
   number columns, no "Intel. Calib. Speed Cost $/1k dec." line). Left open, priority unchanged.

Not defects: the row named "system-one-open" (#14) — a system's own name, not the class key; "What changed in v1.4 ↓" on a v1.4.2 board (the
anchor names the scoring change, which is v1.4's); the fairness sentence itself (Florian's words, CR-152; F-189 keeps it, unboxed); the
"Frozen top five" in the pinned page's `<meta description>` (the share card needs it; the page does not).

## Decisions in pass 35

1. **A leaf measures itself against one row, and names it (F-191):** Jev 1.13.0 — the benchmark's namesake, which the SEO pages and the axis
   bands already use as the reference — or, on Jev's own page, the best-ranked other system. The tick, the points sentence, the radar pair and
   its heading use that one row. "Against #1" was rejected: it changes every release and is empty on #1's own page.
2. **A sort is a control, not a second table (F-189)** — extends pass 34's decision 1: when the chart already draws every row, another ordering
   is the same bars reordered, never a table of the same numbers.
3. **A pinned page carries nothing dated after its release (F-190):** the board and what is derived from the artifact; not a panel the daily run
   refreshes, not a list of the rows the board draws five lines lower.
4. **A class key is never coloured as another class (F-192):** an unlabelled class gets its own swatch and, until the data owner names it, its
   key in code font — not the fallback class's colour and label.

## Verdict on the live site — pass 34 (2026-09-24), the hub after CR-142, the leaf pages at v1.4.1, the CR-136 pages, the multimodal preview, the priority-evaluation page and the cost modal

**Pass 33's seven findings are closed on the live site.** The hub says its size once ("534 public" once in the head), the first bar sits at
y = 662 on a phone, all 82 rows and bars link to their pages (130 links in the table), the default pair draws both series on every radar with
no "· —" label, the page reads chart → table → compare → "What changed", the 3D status is silent once the view is up, and `/jev-models` is
1,366,324 bytes served. The leaf pages read the v1.4.1 artifact (JevK5 v0.2.0: 62.0 · rank #2 of 77 · 1.2 behind 63.3; Hopper: 59.4 · #3)
with the strip, four bands and four radars. The CR-136 pages landed as F-178 directed: five bars on the alternatives list with the reference in
blue, a three-link guides row with no self-link, four radars above the Jev-vs FAQ, no field name in copy, one back-link wording. CR-142 is at
the bar where it draws: the cost axis under the capability list ("$0.0010 … $1.00", lower is better, free at the left edge), SVG labels in the
theme's ink in both themes (light `rgb(24,38,57)`/`(76,94,117)`, dark `(237,242,248)`/`(173,185,202)`), the top five named on both scatters,
and the context-limit chart — 82 log-scale bars coloured by API cap / trained length / hard limit, with training markers — is the strongest
new chart on the site. The request-evaluation page is one eyebrow, one h1, two sentences, two fee tiles and a list. The cost modal states its
method in three bullets, four rows and five dated sources. Light and dark match everywhere; 0 page errors in all four contexts; no "1 <plural>".

**Nine things are not at the bar; three fixed in this pass, six directed.**

1. **A second table of the chart's data, 82 disclosures long.** "Context limits by system" repeats the 82 limits the chart above just drew, as a
   four-column table where every row carries its own closed "Basis, training and serving notes" disclosure and its own "Source date … ·
   checked …" line: 7,200 px at 1440 (y 21,530 → 28,736, `desktop_light-hub-ctxsys-vp.png`), about 14,000 px at 390, where the table also
   scrolls sideways with the name column unpinned. The chart is the message; the table is the disclosure (F-152, F-140, F-144). → **F-180**.
2. **9 px ticks.** The cost axis and the context axis print their tick labels at 9 px (`minFont` = `SPAN $0.0010`, the page's smallest text) —
   under the 10 px floor (F-147). → **F-181**, fixed by Fable.
3. **Field names as copy, again.** "scored 31.6% on long_policy", "Show long_policy results for all 14 matched systems", "Training configuration:
   max_seq_len 2,048 tokens.", "existing usage.input_tokens telemetry" — data keys where a reader expects words (F-54, F-170). → **F-182**.
4. **The leaf page opens with a provenance note and names a column after one of its radars.** Under the h1: "This detail uses the public,
   hash-checked v1.4.1 aggregate. Scores and ranks can change when a new release is published; the page preview remains name-only." —
   provenance above the hero and an OG-image implementation note as copy (pass 24, F-54). The right column's H2 is "Accuracy per tier, incl.
   sealed", which is also the second radar's H3 under it (`desktop_light-sys-jevk5-v02.png`). → **F-183**.
5. **Ranked rows of two heights.** In "Capability with cost alongside" the inputs column wraps ("$0.27 est. · I 71.6 · C 87.8" → two lines), so
   rows 5–20 are 50 px and rows 1–4 are 38 px (`desktop_light-hub-cap-vp.png`). → **F-184**.
6. **Half an axis of nothing, and a point made of three.** "Public accuracy by actual input length" draws seven buckets; 64–256k, 256k–1M and
   ≥1M are empty for every plotted system, and the one line that reaches the right half is Qwen3-Reranker-4B's 100 % at 16–64k — three items
   (3/3, from the point's own tooltip). Before the chart, five paragraphs (271 words) explain, list exclusions and give an example
   (`desktop_light-hub-context-vp.png`). → **F-185**.
7. **A horizontal scrollbar across the cost modal on a phone.** The 64-character SHA-256 locator in the cache-read source line cannot break, so
   the modal's scroll container grows to the hash's width at 390 and the whole sheet scrolls sideways (`mobile_light-cost-modal.png`).
   → **F-186**, fixed by Fable (`break-all`; the full hash stays, as CR-139.2 asks and its verifier pins).
8. **The multimodal preview ranks in a 14-column table with no bar.** "Whole-candidate ranking" lists 11 systems as numbers only; at 390 the
   table scrolls sideways with the name column unpinned; the page is 2,343 words (`desktop_light-mm-ranking-vp.png`). It is noindex and
   unlinked — Florian's review copy — and is judged for the day it becomes `/image-jev-bench`. → **F-187**, before publication.
9. **Bars without their header, and a stray slash.** The alternatives page reuses the hub's bar rows (63.3 · 53 76 83 52 · $0.040) without the
   "Intel. Calib. Speed Cost $/1k dec." line that names the numbers (`desktop_light-alt.png`); the chooser prints "94.0/ 100 benchmark
   score". → **F-188**.

Plus **F-176(b)**: with `app/jev-models/page.tsx` uncontested in this checkout (the two unmerged branches that touch it add one line each,
elsewhere), the licence sentence moved into Credit. Fixed by Fable.

Not defects: the four-card FAQ block CR-136 put on the hub under "What the run says" (four questions of 40–80 words, in the explain part of the
page); the custom-evaluation toast in every shot (CR-102/CR-106, judged in pass 27); the two links "Compare Jev alternatives · Choose a
Jev-class model by use case" under the head sentence (the CR-136 entry points); the formula "I_sealed = 100 × max(0, (acc_sealed − 0.293) /
(1 − 0.293))" in "What changed" (a formula in code font, not copy); quoted module paths in the refusal notes (quotations).

## Decisions in pass 34

1. **A chart's table is a disclosure (F-180, extends F-152/F-159):** when a chart draws every row, the same rows as a table sit behind a closed
   "All N … as a table"; per-row notes are one disclosure with a generated count; per-row dates go into the source link's title and the checked
   date is said once.
2. **A ranked list's rows have one height (F-184):** a trailing value column never wraps; below the width where it fits, the values move under
   the bar as the ranking's own rows do at 390.
3. **An axis shows the range the data occupies (F-185):** a bucketed axis drops buckets that are empty for every plotted series and says so in
   one generated sentence that names them; the bucket set stays in the data, the table and the tooltips. Recorded for Florian (X7): CR-142.4
   named the seven buckets; the chart keeps all seven in its data and its sentence, and draws the four that hold items.
4. **A point from fewer than 20 items is hollow and carries its n (F-185):** a percentage of three is a count, not a rate; the series' line
   stops before it.
5. **Provenance never opens a page (F-183, re-states pass 24):** "hash-checked", "aggregate" and "preview" are Method/Availability words; the
   line under a leaf's h1 is the board's own sub-line for that row.
6. **A section heading is not one of its children's titles (F-183).**
7. **Fable shipped F-176(b), F-181 and F-186** — three files no other writer holds (`components/JevCapabilityChart.tsx`,
   `components/JevContextLength.tsx`, `components/PriceValue.tsx`) plus one line in `app/jev-models/page.tsx` outside the hunks PR #8 and PR #9
   carry — pinned in `test/fable-pass34.test.mjs`; a non-Fable engine verifies with `ONLY=F-176`, `ONLY=F-181`, `ONLY=F-186`.
8. **X4 still met for the default views.** The hub's context section and the leaf head are not at the bar until F-180, F-182, F-183 and F-185
   land; F-184 and F-188 are small; F-187 is for the image benchmark's publication day.

## Verdict on the live site — pass 33 (2026-09-23), condensed

The JevBench hub at v1.4.1, its pinned pages and the per-system pages after CR-132/CR-134/CR-135 and F-167/F-169 (revision `fb07266f`, 82 shots
in `…/fable-20260923-pass33/canonical/`): the bar chart, pinned-name table, four-radar compare and frozen pages at the bar. Seven findings, all
closed since: F-171 the leaf pages a release behind the board and two top-three systems without a page; F-172 board rows leading nowhere;
F-173 the size said four times and the first bar below the fold; F-174 a one-series radar with nine dashes; F-175 the explanation between
chart and table; F-176 "ready" and a licence line as copy ((a) fixed by Fable, (b) in pass 34); F-179 6.8 MB of HTML for a closed disclosure.
F-178 judged the CR-136 draft early (bars, guides row, four radars, field names, back link, no second leaf design). F-171–F-175 verified by the
Kimi K3 gate (iteration 202), F-178 by review gate 20260923T235002Z (216/216), F-179 by iteration 206. Rules recorded: a leaf shows the board's
release; a ranking's names lead to their pages; the size of a benchmark is said once; a missing series is one sentence; chart, table, explore,
explain; status lines end with the state they announce; a closed disclosure does not ship its content when it outweighs the page. Full text:
`git show 20ee66be:ops/ux-2026-09-12/DESIGN-DIRECTIVES.md`.

## Verdict on the live site — pass 32 (2026-09-23), condensed

The Compare page after F-163/F-164/F-165(b), the launch-day model pages after CR-128, and the per-system JevBench pages (CR-129, another job):
Compare and the model pages at the bar (3-line status and claims lines at 390, five muted "No measured result" lines and no empty track, six
same-name pairs each with a distinguishing sub-line). Six things on the CR-129 leaf pages: no chart (F-167), raw class keys and a status said
three times (F-168, fixed by Fable), a comparison the board withholds (F-168), a dash for a label-only calibration (F-168), a 52-link "Browse
every JevBench system" farm (F-169); plus two data strings on Compare (F-170). All four are **verified** since (iteration 181, `d388663e`;
review gate 20260923T150004Z). Rules recorded: a leaf page speaks the board's words; a page never prints a comparison its board withholds; a
leaf page draws its number; a leaf is reached from its row. Full text: `git show fb07266f:ops/ux-2026-09-12/DESIGN-DIRECTIVES.md`.

## Verdict on the live site — pass 31 (2026-09-22), condensed

CR-122 and CR-127 read as specified on the Compare page and the launch-day model pages (26 vendor values marked † and "developer's claim", 65
measured cells tinted and barred, the unknown id kept as a dashed "Coming soon" chip). Six things not at the bar: F-161 a Composite of 100.0 built
on one input and 50.0 on none (fixed by Fable), F-162 "Top 0 cheapest providers" (fixed), F-166 a 101-word panel repeating the head (fixed),
F-163 "No measured result" 44 times in the snapshot cards and F-164 vendor claims counted as evaluation rows (both shipped by claude-opus in
`ee6c2748`, verified by codex-luna 87/87 per host), F-165 two same-name rows with nothing saying whose run each is (label half live, `135a3098`;
data half → CR-128.1). Rules added: a page never prints a score its own table withholds; a heading never counts to zero; a panel says what its
head does not.

## Verdict on the live site — pass 30 (2026-09-22), condensed

JevBench v1.3.0, the multimodal preview, MiMo-V2.6-Pro and the new ranking boards (revision `00aa281f`, 109 shots in `…/fable-20260922-pass30/canonical/`):
CR-118, CR-119 and CR-117.3 landed as specified. Four fixes by Fable (`b385107a`), verified by iteration 169: **F-157** the "What changed in the
score" note follows the board; **F-158** no column of "Not measured", the preview banner is the one sentence; **F-159** the preview ranking draws
its share as a bar; **F-160** the JevBench eyebrow is a `<div>`. Rules recorded: a column whose every cell says the same thing is a sentence; every
ranking draws its headline number; an explanatory note follows what it explains. Full text: `git show 857d96cc:ops/ux-2026-09-12/DESIGN-DIRECTIVES.md`.

## Verdict on the live site — pass 29 (2026-09-21), condensed

The Benchmarks page after CR-63.21/63.22, CR-50.2, CR-83.1 and iterations 154/155 (revision `866f591`, 64 shots in `…/fable-20260921-pass29/canonical/`):
the phone chip cap "+N" (15 of 99 rows), the "Free route" pill as decided in iteration 149, the glyph audit clean, Blueprint-Bench 2 with no bar on
its 0-point rows, Context Arena "8-needle", JevBench v1.2.14. Two fixes by Fable (`4d57b17`), verified since by iteration 157: **F-155** the
"+N / less" toggle follows the chips it reveals; **F-156** a partly matched board opens with "N of M published results are matched" and the unmatched
checkbox carries its count. Iteration 155's proposal to widen thin boards to unmatched rows was declined (mixed rows can list one model twice,
36 axes would change silently, the regional filters cannot act on non-catalog rows). Rules recorded: a toggle follows what it reveals; a thin board
says how big it is.

## Verdict on the live site — pass 28 (2026-09-21), condensed

The JevBench page after CR-105–CR-107 and F-149–F-151, the custom-evaluation page and the Benchmarks table after iterations 143/144 (revision
`b7b939d`, 78 shots in `…/fable-20260921-pass28/canonical/`): F-149–F-151 landed as written (44 px actions under the title, table head 66/58 px,
2 × 2 scope buttons at 390, the tinted toast open 6–17 s), jqv as "partial run · not ranked", `/benchmarks` at 78 rows across 12 categories with
ProgramBench, MCP Atlas, VulcanBench, LiveBench and the re-versioned GDPval/Briefcase as rows. Three fixes by Fable, all verified since by a
non-Fable gate: **F-152** the table's 17 † notes (33 lines at 1440, 91 on a phone) became a closed `<details>` the row's † opens, with the note's
first sentence as the †'s and the tag's title; **F-153** the custom page's email action became the one solid `bh-button-primary`; **F-154** the
Simple shortlist ticks (9/9.5 px) and Advanced route badges (9 px) rose to the 10 px floor. Two rules recorded: notes under a table are a
disclosure; one solid button per page. The pass also recovered iteration 145's uncommitted work (`873bcb0`) because the tree was dirty.

## Verdict on the live site — pass 27 (2026-09-20), condensed

The JevBench page after F-141–F-146 and CR-99–CR-104, the custom-evaluation page, CR-68.5 and CR-85.2 (revision `16e8a10`, 129 shots in
`…/fable-20260920-pass27/canonical/`). Right: honorable card 237/411 px, one unit note, the pinned Task cell, the visible vendor-claim words, the
toast's flight into the pill, "Hard only" flipping eyebrow/title/badge/URL, the one-line runner-disagreement finding. Seven findings: F-147 the
phone pill was 8 px beside a two-line eyebrow → eyebrow "JevBench v1.2" below `sm`, pill at the 10 px floor; F-148 the runner note was 9 lines →
two sentences, harness in each runner's `title`; F-146/F-142/F-141 follow-ups (one status per row, one unit sentence, first sentence in the
table row); F-149 the custom page's actions under the title; F-150 the table head back in budget; F-151 the scope buttons 2 × 2 on a phone. All
seven are in the Done log. Rules added: the type floor is 10 px; one status per row. Full text: `git show b7b939d:ops/ux-2026-09-12/DESIGN-DIRECTIVES.md`.

## Verdict on the live site — pass 26 (2026-09-20), condensed

JevBench after CR-96/CR-97 and F-139/F-140, plus the Step 5 Preview page (revision `48bceea`, 93 shots in `…/fable-20260920-pass26/canonical/`).
Right: Jev 1.13.0 #1 with classifier.dev hatched below as "honorable mention"; "Easy only" flips eyebrow, title, badge, deltas and URL together;
the cost unit "per 1,000 decisions, not tokens" first and everywhere; the task grid's head pinned through 231 rows; the Step 5 Overview row honest
(◔ Thin data · 1/7, "No public API price"). Six findings: F-141 the honorable card was a 537/1,235 px wall of text → headline, two-sentence reason,
one disclosure; F-142 the unit said five times in five lengths → one message, one length; F-143 the desktop Task column absorbed 650 px; F-144
the phone Task cell left with the first horizontal scroll → pinned in a phone-length form; F-145 "Top 0 cheapest providers" on a model with no
offer → one sentence (fixed by Fable); F-146 forty vendor values whose only status was a superscript → a generated count line and visible words per
row. Decisions: CR-96/CR-97 rows seeded; F-142 adjusts a CR-96.3 presentation detail on purpose; two rules added (a pinned label has a
phone-length form; a card never announces an empty count). All six are in the Done log.

## Verdict on the live site — pass 25 (2026-09-20), condensed

The JevBench page after CR-90/93/94/95: the two "Compare two systems" radars judged at the bar; F-136–F-138 shipped by Fable (ring labels off
the spoke, two-sentence topic caption, compact phone Swap) and verified by non-implementers (50/50 per host); F-139 (a view control changes the
hero's state wherever the hero is) and F-140 (a heatmap is dense) specified, shipped by codex-luna in iteration 129 and verified by opencode-kimi
and two review gates (`f509927`, `fcaf334`). Rules added: a view control changes the hero's state everywhere; a heatmap is dense; ring labels never
sit on a spoke, on every radar. Full text: `git show 48bceea:ops/ux-2026-09-12/DESIGN-DIRECTIVES.md`.

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

## Directives (pass 37)

### F-201 — The 3D top-five labels sit beside their spheres `[mechanical]` — **shipped by Fable (pass 37)**

*Where:* `app/globals.css` (`.bh-jev-3d-labels`), `components/JevCapability3D.tsx` (unchanged), `test/fable-pass37.test.mjs`.
*What:* every child of the label layer is absolutely positioned and `white-space: nowrap`, so the transform CR-176.6 writes
(`translate(px, py) translate(-50%, -115%)`) places the pill's centre on the projected sphere; nothing else changes (the axis labels already
carried the inline style, the SVG fallback path is untouched).
*Accept:* hub at 1440/390 × light/dark, 3D view loaded: five `[data-bh-jev14-3d-model-label]`, each 20–260 px wide, none starting left of
the 3D box, at ≥ 3 distinct x positions; three `[data-bh-jev14-3d-axis-label]`; group F-201.

### F-202 — Bubble hint text at the 10 px floor on phones `[mechanical]` — **shipped by Fable (pass 37)**

*Where:* `components/JevBubbleChart.tsx` (`separator`), `test/fable-pass37.test.mjs`.
*What:* the 2× caption and the four direction hints are `fontSize="10"` at every width (was 9 under 640 px); the existing width fallbacks
(short "2× Jev", glyph-only "←"/"→") keep them inside the plot.
*Accept:* hub at 390 × light/dark: no `svg text` under 10 px inside either `[data-bh-jev-bubble]`; the 2× label and both hints present in
each chart; group F-202.

### F-203 — The input-length chart's bucket ticks at 10 px `[mechanical]`

*Where:* `components/JevContextLength.tsx` (the `active.map` tick text, `fontSize="9.5"`), its test.
*What:* the six bucket labels ("0–499" … "16,000–63,999") print at 10 px. If at 390 two neighbours would touch, the chart drops every second label on
narrow widths (the vertical gridline stays; the `<desc>` still lists all buckets) rather than shrinking the text. Do not shorten the ranges.
*Accept:* hub at 1440/390 × light/dark: no `svg text` under 10 px in the chart titled "JevBench public accuracy across input-length buckets";
no two tick labels overlap; ≥ 3 tick labels visible at 390, all 6 at 1440; group F-203.

### F-204 — One name per axis, one word per unit, one arrow per direction `[mechanical]`

*Where:* `components/JevCapability3D.tsx` (the `data-bh-jev14-3d-axes` legend box and the "Vertical: Capability · Right: cheaper · Toward
you: faster" paragraph), `components/JevCapabilityRanking.tsx` (column head "$/1k tasks", the legend line "Thin red line = cost per 1,000
tasks", the ⓘ row "Cost per 1,000 tasks"), `components/JevBubbleChart.tsx` (axis titles), `lib/jevbench-jev-class.mjs` /
`components/JevCapabilityTip.tsx` if the word lives there; the tests that pin those strings (`test/jevbench-capability.test.mjs`,
`test/cr-169*.test.mjs`, `test/fable-pass36.test.mjs` — extract and re-evaluate, do not swap spellings blindly).
*What:* (a) the 3D legend box and the caption paragraph go; the three on-plot axis labels are the only axis names (the intro sentence
above the figure stays). (b) Everywhere on the hub the unit is **decisions**: "$/1k decisions" in the Capability ranking head, "Cost per
1,000 decisions" in the ⓘ, "cost per 1,000 decisions" in the ranking legend; "tasks" does not appear next to a JevBench price on the page.
(c) The ranking's "*" estimate marker stays (the column has no room for a pill) but its legend reads "* = est. (estimated cost)" so the
word matches the tables' pill. (d) The flat charts' axis titles lose their arrow: "$ per 1,000 decisions (log)" and "Median-latency speed";
Florian's top hints "← pricier · cheaper →" / "← slower · faster →" are the direction statement.
*Accept:* hub at 1440/390 × light/dark: no `[data-bh-jev14-3d-axes]`; "Toward you" absent; "$/1k tasks" and "per 1,000 tasks" absent from
`main`; the two bubble axis titles contain no "→"; the top hints still present (group F-202's check); `verify-cr-176-6-live.mjs`,
`verify-cr-169*` and `verify-fable-pass36-design.mjs` still green; group F-204.

### F-205 — Phone bubble labels whose leaders do not cross `[mechanical]`

*Where:* `components/JevBubbleChart.tsx` (the `labels` layout for the top five, the `narrow` branch).
*What:* under 640 px the five labels form a single column at the right edge of the plot's upper half (right-aligned text, one label per
row of 13 px, ordered top-to-bottom by their point's y), each with a straight leader to its bubble's edge; leaders may not intersect each
other or another label's text box (place the column from the top down and, if a leader would cross, swap the two labels' rows — five
labels, at most ten swaps). If no crossing-free placement exists, label the top three. Above 640 px the current placement stays (2 group
overlaps at 1440 are leader lines passing under a neighbour's text, acceptable; text boxes do not overlap).
*Accept:* hub at 390 × light/dark, both charts: five `[data-bh-jev-bubble-label]` (or three with the fallback), zero text-box overlaps,
zero leader-line intersections (segment test on the label groups' `line`s); at 1440 zero text-box overlaps; group F-205.

### F-206 — The v1.5 preview drops "~", ≈-on-every-row and "$/1k" before it is linked `[mechanical + data]` — for the CR-172 job

*Where:* `components/JevBenchV15Preview.tsx` (`costCell`, `HeadlineBars`, `AxesTable`, `Tags`), `lib/jevbench-v15-preview.mjs` (nothing
numeric changes), its tests.
*What:* (a) **Cost cells** follow CR-176.4: right-aligned tabular number, no "~"; because 94 of the 97 systems are estimates, the pill marks
the exception — `tariff` on the three rows whose `cost.kind` is `tariff` (left of the number, `bh-thin-tag`), and one legend sentence under
the bars and under the axes table: "Costs are estimates (est.) unless marked tariff." Cells carry `data-bh-jev15-cost-cell`. (b) **The
interval is drawn, the ≈ goes:** each ranked bar gets a thin whisker (`data-bh-jev15-ci`, the `composite_ci95.B` range on the same 0–100
scale, 1 px, `var(--muted)`, with 2 px end caps) and the per-row "≈" is removed; the note under the h2 says how many adjacent pairs are
statistical ties, computed from `board.B.markers` (76 of 88 today), e.g. "Whiskers are 95% bootstrap intervals. 76 of the 88 adjacent pairs
are statistical ties — read the order as a ranking, not the gaps as significant." (c) **The axes table's cost head** reads "$/1k decisions"
with the same cell treatment. (d) **The leader line names the systems:** `data-bh-jev15-leader` reads "Cygnet and Winnow-12B Q8 are joint
leaders (statistical tie)" — the names come from the tie markers at ranks 1–2 (extend to three if rank 3 is tied with rank 2), the
artifact's `leader_wording` is appended only if it adds words. (e) **Keep the Penalty column** (15 rows differ from ×1.000). No score, rank,
interval or hash changes; the page stays noindex and unlinked.
*Accept:* `/wip-oiifi41ouv1f/jevbench-v15` at 1440/390 × light/dark: no `[data-bh-jev15-bar]` text containing "~$" or "≈"; ≥ 89
`[data-bh-jev15-ci]`; every `th` matching `$/1k` contains "decisions"; no pill right of its number; the leader element does not start with
"joint leaders" and names ≥ 2 systems; a "Penalty" `th` present; group F-206.

## Directives (pass 36) — F-194/195/196 shipped by Fable; F-197/198/199/200 implemented (iteration 235) and verified live in pass 37 (see the Done log)

### F-194 — The custom-evaluation toast stacks above the fast-lane banner `[mechanical]` — **shipped by Fable (pass 36)**

*Where:* `app/globals.css` (one rule after `.bh-custom-evaluation-toast`). *What:* `body.bh-fastlane-visible .bh-custom-evaluation-toast {
bottom: calc(var(--bh-fastlane-height, 0px) + 1rem + env(safe-area-inset-bottom, 0px)); }` — the banner already publishes its height on
`body` and toggles the class (`components/FastlaneBanner.tsx`, `reserve()`), so the toast follows the teaser (55 px), the expanded banner
(145 px) and the desktop banner (73 px) without JavaScript. *Accept:* `/jev-models` at 1440/390 × light/dark, 7 s after load: banner and toast
both visible, **0 px overlap**, the toast inside the viewport; by 18 s the toast has landed into the badge (no `.bh-custom-evaluation-toast`);
group F-194 (`before/`: 57 px overlap at 1440). Implemented by Fable — a non-Fable engine flips it to verified.

### F-195 — Bubble-chart text at the 10 px floor `[mechanical]` — **shipped by Fable (pass 36)**

*Where:* `components/JevBubbleChart.tsx` (the latency sub-tick `<text>`; was `fontSize="9.5"`). *Accept:* both `[data-bh-jev-bubble]` figures
in all four contexts: no visible SVG text under 10 px, five labels, zero overlaps; `test/fable-pass36.test.mjs` pins every `fontSize` in the
file ≥ 10; group F-195. Implemented by Fable — a non-Fable engine flips it to verified.

### F-196 — One "Official" per Composite figure `[mechanical]` — **shipped by Fable (pass 36)**

*Where:* `components/JevBoardInteractive.tsx` (`JevWeightSliders`). *What:* the status pill after the presets renders only in the custom
state ("Custom — not the official ranking"); the official state is said by the pressed preset and the badge under the h2. *Accept:* inside
`[data-bh-jev14-chart]`: `.bh-jevc-official` visible once and `.bh-jevc-notdefault` zero times on load; after six ArrowRight presses on the
Intelligence slider `.bh-jevc-notdefault` × 3 (badge + both groups), no preset pressed; after clicking "Official 25:25:25:25" back to 1/0; group
F-196. Implemented by Fable — a non-Fable engine flips it to verified.

### F-197 — The hub head is the message; the guides fold at every width and follow the headline `[mechanical]`

*Where:* `app/jev-models/page.tsx` (the head block and `<JevBoardIntentLinks />`), `components/JevBoardGuides.tsx`,
`components/JevBenchSeoBlocks.tsx` (`JevBoardIntentLinks`), `test/jev-models-v14-page-fixes.test.mjs` or `test/jevbench-seo.test.mjs`
(whichever pins the row).
*What:* (a) The guides toggle ("Explore JevBench guides ↓" / "Hide … ↑") works at all widths: drop `sm:hidden` on the button and the
`sm:flex …` expansion on the list; closed by default; the eleven links stay in the HTML (crawlers and screen readers keep them). (b) The
`<JevBoardIntentLinks />` block moves out of the page head to directly after the Jev-class method panel (`#jev-class-method`), before the
bubble section, at all widths — the head keeps eyebrow, h1, the one sentence, the Image JevBench line, the provenance line and "Share this
version". (c) Nothing else in the head changes; the eleven link targets and labels are unchanged.
*Accept:* hub at 1440/390 × light/dark on a fresh load with the banner up: `[data-bh-jev-board-guides]` has ≥ 11 links, none visible, its
toggle visible; the guides nav is after `#jev-class-method` in document order and not inside `main .bh-page-head`; the first
`[data-bh-jev14-capability-row]` at y ≤ **590** at 1440 (now 633) and ≤ **660** at 390 (now 714); `verify-fable-pass35-design.mjs` F-189
and `verify-cr-163*` still green (the first-row budget only tightens); group F-197.

*Implementation note (iter235, claude-opus — checker repair, recorded so pass 37 does not re-litigate it):* the guides row carries
**ten** links, not eleven — three decision guides plus `JEV_COMPARISONS` (6 top-five + 1 more = 7) in `lib/jevbench-seo.mjs`. The verdict's
"eleven guide links in two rows" and the `≥ 11` accept threshold were an off-by-one against the code, so the check pinned the real set size
(`≥ 10`). Nothing was removed from the row; the eleven-link claim above is the only wrong number in the pass.

### F-198 — The image benchmark page is its results; the review trail leaves the page `[mechanical]`

*Where:* `app/jev-models/multimodal-preview/page.tsx` (`MultimodalPreviewContent`, shared by `/image-jev-bench`), `components/ImageJevRadar.tsx`
(unchanged), `lib/jevbench-multimodal-preview.mjs` (read the gate factors that are already in `tracks.all.composite.gates`), the page's tests
(`test/*image*`, `test/*multimodal*`).
*What:* (a) **Order:** head (eyebrow, h1, sentence, size line, the amber caveat) → **Composite score** (the bars) → **Full ranking** (the table,
moved up from y 10,585) → **Compare two systems** (the radar) → **Examples from public items** → **Results by track** → **Split** → **Computer
Use and Browser Use tracks (preview)** → **Method and limitations** → a closed `<details>` "Requested and excluded candidates (37)" holding the
candidate table. (b) **The "Top five by composite score" panel goes**; its one fact that the bars do not carry — "Earlier split: #n · score" —
becomes a muted column **"Earlier split"** in the Full ranking table (rank and score; "—" for systems without one). The `<meta description>`
keeps whatever it says. (c) **The "Clean split — meets the approved …" alert goes**; its numbers become the first paragraph of Split in the
section's ordinary panel style (no emerald border, no `border-2`, no "approved", "target" or "review status" in the copy); the four stat tiles
stay under it. (d) **A gated row says so:** a row whose composite is below 1 because a gate factor is below 0.5 prints, under its name in the
bars and in the table's System cell, a muted sub-line `data-bh-mm-gated="<axis>"` — "0.0 · gated by Cost (USD 2.06 per 1,000 decisions)" and
"0.0 · gated by Calibration (no probabilities reported)"; the Composite intro's last sentence names the gates in words ("A system whose Cost or
Calibration axis falls under the gate scores 0"). (e) **Names:** in the bars, the top cards and the tables, a parenthetical configuration
("released stable configuration", "official image-premise path", "low reasoning effort", "Autoloops") leaves the bold name and becomes a muted
sub-line; quantisation keys such as `PQ2_0` stay the artifact's spelling but inside `<code>`. (f) **Columns:** the Full ranking table drops
"Penalty" (×1.000 on every row; the intro already says no system exceeds the allowance — keep that sentence) and folds "Cost coverage" into the
row's note where it is under 100%; the "Source revision" cells of the candidate table print 12 characters in `<code>` with the full hash in
`title`. No score, rank, gate, split count or hash changes.
*Accept:* `/image-jev-bench` at 1440/390 × light/dark: h2 order Composite score < Full ranking < Compare two systems < Examples < Split <
Method; no h2 "Top five by composite score"; no h2 starting "Clean split"; "approved" absent from `main`'s text; two `[data-bh-mm-gated]`
elements naming Cost and Calibration; no `li`/`tr` containing "0.00" without "gated"; the candidate table inside a closed `<details>`; no
`<b>`/`<strong>` in a row containing "("; the ranking table without a "Penalty" column and with "Earlier split"; page height at 1440 under
13,000 px (now 14,890); group F-198.

### F-199 — On a phone the Composite figure folds its controls; one control per sort `[mechanical]`

*Where:* `components/JevBoardInteractive.tsx` (`JevWeightSliders`, `JevScoreChart` — the fairness sentence's inline button around line 247),
`app/globals.css`, `test/cr-151-jev-board-views.test.mjs` / `test/jev-page-restructure.test.mjs` (whichever pins the button).
*What:* (a) Under 640 px the preset row is **one line that scrolls sideways** (`flex-nowrap; overflow-x: auto; scroll-snap-type: x
proximity`, each pill `scroll-snap-align: start`, the row's right edge fading so the overflow is visible), not five wrapped lines. (b) Under
640 px the four sliders of each group live in a `<details data-bh-jev-weights-more>` whose summary reads "Adjust weights ↓"; it is closed by
default and **open when the weights are custom** (`?w=…` on load or a non-official preset pressed), so a reader who changed something sees the
sliders. Above 640 px nothing changes — sliders above and below the chart, as CR-158 asks. (c) The inline "Sort by Intelligence ↓" button after
the fairness sentence goes; Florian's sentence (`artifact.top_five_note`) keeps its words, the "Intelligence" View-by pill is the control.
*Accept:* hub and `/jev-models/v1.4.2` at 390 × light/dark: the presets row ≤ 44 px tall with `scrollWidth > clientWidth`; the sliders' details
closed on load and no slider visible; the weights box ≤ 120 px closed; with `?w=40-20-20-20` the details open; the distance from the figure's
h2 to the first `[data-bh-jev14-row]` ≤ 700 px (now over 1,000); no button whose text starts "Sort by" in the figure at any width; at 1440
the four sliders visible without a click; `verify-fable-pass35-design.mjs` F-189 still green; group F-199.

*Implementation note (iter235, claude-opus — checker repair):* the h2-to-first-row budget named `[data-bh-jev14-row]`, which the Composite
figure does not contain: that marker is the **table**'s `<tr>` (`JevBoardInteractive`), and the table is a sibling of `[data-bh-jev14-chart]`,
not a child. Pass 36's own shoot script recorded `firstRowY: null` for every context for this reason (`metrics-b-*.json`, `*-chart-before`),
so the check could not pass as written and the "now over 1,000" figure is a reading of the screenshots, not of that selector. The figure's
first data row **is** its first bar, so the check measures `[data-bh-jev14-bar]`. It was deliberately *not* fixed by tagging the bars with
`data-bh-jev14-row`: `verify-cr-131-live.mjs`, `verify-fable-pass33-design.mjs` and `shoot-fable-pass34.mjs` map every `[data-bh-jev14-row]`
to table semantics (`ranked`, `[data-bh-jev14-score]`, `th a`), which the extra bar `<li>`s would corrupt. The accept list's second half
("`?w=40-20-20-20` opens the details") had no check at all and now has one.

### F-200 — The Capability ⓘ is a list, and a modal on a phone `[mechanical]`

*Where:* `components/JevCapabilityRanking.tsx` (`RankingRow`: the `title` on the `<li>`, the `<button>` and the `role="tooltip"` panel),
`components/InfoTip.tsx` (the R1.8 pattern: hover/focus panel on desktop, `<dialog>` with ✕ on touch), `test/cr-169*.test.mjs` if it pins the
trigger.
*What:* (a) The panel's content is a `<dl>` of seven rows — Capability · Intelligence · Calibration · Cost Score · Cost per 1,000 tasks (with
"× Jev") · Median latency (or the Speed-axis note) · Rank (Capability #n · official #m) — with the system's display name and class as its
heading, not one sentence. (b) The ⓘ uses `InfoTip` (or the same behaviour): desktop keeps the hover/focus panel; on touch the tap opens the
site's small modal with a Close button, so the panel never covers the next rows. (c) The 300-character native `title` on the `<li>` goes (the
ⓘ is the way in; the name cell keeps its own short `title`). (d) CR-169.1's trigger placement and CR-167.2's 16 px glyph with the 44 px hit
area stay as they are.
*Accept:* hub at 1440 × light/dark: hovering the first row's ⓘ shows a panel with ≥ 7 `dt`; at 390 × light/dark: tapping it opens a visible
`[role=dialog]` with `button[aria-label="Close"]` and the same `dl`, and no `[data-bh-jev-capability-tooltip]` is visible; the row's `title`
shorter than 80 characters; `verify-cr-167-2.mjs` and `verify-cr-169*` still green; group F-200.

### F-187, F-165, D211 — unchanged (F-187 verified; F-165 data half and D211 for the JevBench release job)

## Directives (pass 35)

### F-189 — "Rank by" is a control on the chart; the fairness sentence is its caption `[judgment]`

**25 Sep 2026 supersession for the live hub:** Florian's later CR-151 `View by` switch and
CR-158 Capability-first page order replaced the two-button `Rank by` control and moved the
Composite chart below the bubble charts. The old selector and the Composite bar's 720 px
position are historical. F-189 now checks the `View by` switch and the approved fairness
sentence; F-193 applies the 720 px first-row budget to the new Capability headline. CR-163
records the repair and acceptance checks. Frozen version pages keep their own F-190 contract.

*Where:* `components/JevModelsV14.tsx` — `TopFiveNote` (delete) and `ScoreChart` (the eyebrow/h2/subtitle line, `header`, the `<ol
data-bh-jev14-bars>` and its "Show all" disclosure); a new client component (`components/JevRankBy.tsx`, `"use client"`) that owns the bar list;
`app/jev-models/page.tsx` and `app/jev-models/v1.4.2/page.tsx` render it through `JevModelsV14Board` unchanged; `test/jevbench-v142.test.mjs`
(the top-five-note pin moves to the caption).
*What:* (a) The subtitle line "Official · four axes 0–100, equal-weight harmonic mean · What changed in v1.4 ↓" gains, at its end, a segmented
control `data-bh-jev14-rank-by` with two buttons "JevBench Score" (pressed on load, `aria-pressed`) and "Intelligence"; no `<details>`, no
box. (b) Pressing "Intelligence" reorders the same bar rows by the Intelligence axis (ties by rank), draws each bar's length from Intelligence
(0–100), prints Intelligence as the row's big number with the JevBench Score in the muted small columns' place, and the header line's bar
label reads "Intelligence" instead of "JevBench Score"; "Show all N systems" keeps working in both orders; the rank numerals stay the official
ranks (the row's `#`), so a reader sees "2 · Jev 1.13.0" first under Intelligence. (c) The fairness sentence (`artifact.top_five_note`,
Florian's words, unchanged) is one muted `<p>` (`data-bh-jev14-top-five-note`, `text-sm`, no border, no background) directly under the subtitle
line, before the header; no table, no disclosure. (d) The rows are serialised once on the server (key, display, rank, class, score, axes,
api_flag, cost label — the fields `JevScoreBar` prints) and passed as props; no fetch. (e) No URL state; the pressed state resets on reload.
*Accept:* hub and `/jev-models/v1.4.2` at 1440/390 × light/dark: `[data-bh-jev14-rank-by]` with two buttons, one `aria-pressed="true"`;
zero `<table>` and zero `<details>` between `#jev14-chart-title` and the first `[data-bh-jev14-bar]`; the fairness sentence present exactly
once, not inside a bordered box (computed `border-style: none` on its element and parent); at 390 the first bar's y ≤ 720 (pass 34: 662, pass
35: 852); after clicking "Intelligence" the first row's name is the artifact's highest-Intelligence ranked system and the row's big number is
that axis value to one decimal; after clicking "JevBench Score" the order is back to rank; `verify-fable-pass35-design.mjs` group F-189.

### F-193 — Raised by the implementer (iteration 214), for pass 36: the 720 px first-bar budget cannot hold the fairness sentence

F-189's accept criterion "at 390 the first bar's y ≤ 720" and its requirement to keep Florian's fairness sentence above the bars are not
satisfiable together. Measured on the finished F-189 implementation at 390 (`/opt/benchmarkheaven/state/ux-evidence/iter214-pass35/`):
**804 px shipped · 718 px with the sentence hidden · 662 px with the sentence and the control hidden**. 720 is the pass-34 layout plus the
control and nothing else; the sentence costs 92 px on its own and is CR-152, Florian's words, which F-189 explicitly keeps.

The implementer did not trim copy to reach the number. Where the space actually is, if the design authority wants it back: the page head above
the figure is 394 px at 390 (h1, a 112 px paragraph, a two-link block, a 78 px provenance paragraph, a "Share this version" line), and the
figure's own eyebrow repeats the version — "JevBench v1.4.2" — that the page head states 430 px higher. Both are outside F-189's scope.
Resolution: iteration 220 (`e9485569`) added an explicit live-board compact-mobile treatment that tightens those gaps and hides only the duplicate chart eyebrow; it keeps the provenance, fairness sentence and rank control. The 720 check remains in `verify-fable-pass35-design.mjs` and now passes at 659 px on both configured live hosts, in light and dark mobile modes. Receipts: `/opt/benchmarkheaven/state/ux-evidence/iter220-codex-f193/post-deploy/{canonical,legacy}-F-189/`.

### F-190 — The pinned page is the board `[mechanical]`

*Where:* `app/jev-models/v1.4.2/page.tsx` (and the same shape for every later `v1.x.y/page.tsx`); `test/jevbench-v142.test.mjs`.
*What:* (a) The head is the eyebrow "Frozen JevBench release v1.4.2", the h1, one sentence ("Pinned to the v1.4.2 artifact; the live board moves
on when a later release is published."), one meta line ("534 public + 308 sealed decisions · only system-level sealed aggregates are
published · artifact SHA-256 ⟨full hash in a `<code className="break-all">`⟩") and the links line ("Share this version · View live board") —
five blocks, no more. (b) The "Frozen top five" panel goes; the first five bars are the top five. The `<meta description>` keeps its top-five
sentence. (c) `<JevContextLength>` goes from the pinned page: its data carries "sources checked ⟨date⟩" from the daily run and is not part of
the artifact. `<JevCapabilityChart>` stays (derived from the artifact). (d) The board's "What changed in v1.4 ↓" anchor and the compare tool
keep working on the pinned page.
*Accept:* `/jev-models/v1.4.2` at 1440/390 × light/dark: no h2 "Frozen top five", no h2 "Context length", at most 5 blocks before the board
section; the first bar's y within 60 px of the hub's first bar at the same width; page height at 1440 < 14,000 px (now 17,417); group F-190.

### F-191 — A leaf names the one row it measures against `[mechanical]` — **shipped by Fable (pass 35)**

*Where:* `components/JevV141SystemDetail.tsx` (`referenceFor`, `ScoreStrip`, the points sentence `data-bh-jev-system-delta`, the compare pair
and its heading), `components/JevCompareV14.tsx` (a fixed pair keeps the caller's order: A is the page's system, B its reference — the strip's
dot and tick; the Jev-vs pages pass Jev first and are unchanged), `app/jev-models/[system]/page.tsx` (passes the row note). *What:* one
`referenceFor(row, ranked)`: Jev 1.13.0, or on Jev's own page the best-ranked other system; the strip's tick, the sentence ("1.2 points behind
Jev 1.13.0's 63.3"; on Jev's page "0.8 points behind decider-4b v2's 64.1"), the radar pair and the heading "Against Jev 1.13.0" all use it. *Accept:* `/jev-models/jevk5-v02`, `/jev-models/jev-1.13.0`,
`/jev-models/decider-4b-v2` at 1440/390 × light/dark: the sentence's name and number equal the strip caption's "(N)" and the compare legend's B
row; `verify-fable-pass35-design.mjs` group F-191 on both hosts; `test/fable-pass35.test.mjs`. Implemented by Fable — a non-Fable engine flips
it to verified.

### F-192 — The `system-one-open` class has its own swatch; its label is the data owner's `[mechanical + data]`

*Where:* `components/jevTypes.ts` (`JEV_TYPE_VAR`, `JEV_TYPE_LABEL`), `app/globals.css:471-472,563-564` (the `--jev-t-*` pairs),
`components/JevCompareV14.tsx:126` (the `?? r.cls` fallback), `components/JevModelsV14.tsx:157` (the legend); a CR for the JevBench release
job (the data half).
*What:* (a) `JEV_TYPE_VAR['system-one-open'] = '--jev-t-sysone'` with a light and a dark triple that no other class uses, ≥ 3:1 against the panel
in both themes and distinguishable from the rebuild orange and the llm green next to it in the top five (check in the shot, not by eye alone:
compute the contrast). (b) The label: the artifact and the repo do not describe the class, so the loop does not invent one. File it to the
release job as **CR-152.1**: "name the class `system-one-open` in RELEASE-v1.4.2.md or an artifact `classes` map, in the words the other ten
labels use". Until that lands, `JEV_TYPE_LABEL['system-one-open']` is absent on purpose and every place that prints a class label falls back to
the key in `<code>` (legend, compare legend, the leaf sub-line — F-191 omits an unlabelled class from the sub-line already) with `title="Class
named in the v1.4.2 artifact; description pending"`; the compare legend's bare `?? r.cls` becomes that `<code>`. (c) The legend under the chart
lists the class (the existing loop over `JEV_TYPE_LABEL` keys becomes a loop over the classes present, labelled through one helper).
*Accept:* hub at 1440/390 × light/dark: the #1 bar's computed background ≠ the llm-baseline swatch's; the legend has 11 entries when 11 classes
are present, one of them `<code>system-one-open</code>` until CR-152.1 lands and the label text after; `/jev-models/decider-4b-v2`: the compare
legend's B row shows no bare key outside `<code>`; group F-192.

### F-188 — The alternatives bars carry their header; the chooser's slash `[mechanical]` — unchanged from pass 34, unblocked

*Where/What/Accept:* as in pass 34 below. The release cut that owned `components/JevModelsV14.tsx` has merged; nothing blocks it now.

### F-187 — The image benchmark's page draws its ranking before it publishes `[judgment]` — unchanged from pass 34

### F-165 — Same-name rows say whose run they are `[judgment]` — data part open, unchanged (the v1.4.2 compare selects list "GPT-6 Luna" twice, "djev" twice, "OpenJev" twice, "NInfer Qwen3.8-27B NVFP4" twice: the identity half, CR-128.1)

## Directives (pass 34) — F-180/181/182/184/185/186 shipped (see the Done log); F-183 shipped in pass 35 with F-191; F-187/F-188 still open

### F-180 — The context table is a disclosure; its 82 notes are one `[mechanical]`

*Where:* `components/JevContextLength.tsx` — the "Context limits by system" panel (`<table className="min-w-[720px] …">`, `CapacityDetails`,
the "Source date … · checked …" span at ~295, the instruction paragraph at ~278) and the chart's `<ol aria-label="Published context limits by
system">`; `ops/ux-2026-09-12/bin/verify-cr-142.mjs` (opens what it reads, the F-179 lesson).
*What:* (a) The panel keeps its title line ("Context limits by system · 82 systems · sources checked 24 Sept 2026" — count and checked date
once) and puts the table behind a closed `<details>` whose summary reads "All 82 limits as a table" (the compare panel's pattern). (b) The
instruction sentence ("Sort by selecting a column heading. Source links open …") goes; sortable headings carry `title="Sort"`; the source
link's `title` carries "Source date 2 Mar 2026 · checked 23 Sept 2026" and the visible per-row date line goes. (c) The per-row `CapacityDetails`
disclosure goes: a row with notes gets a † after its name (F-152: the †'s `title` is the note's first sentence, its href the one "Notes for N
systems" disclosure under the table, generated from the rows that have notes, one `<li>` per system with today's four fields). (d) Rows ≤ 44 px
at 1440; at 390 the name cell is pinned (`position: sticky`, F-144) and the limit column shows the number only — the qualifier ("total request;
32,000 state + longest question") moves to the cell's `title` and the notes disclosure. (e) The chart lists 25 bars and a "Show all 82 systems
(57 more)" control, as the ranking does (`data-bh-jev14-bars-more` pattern).
*Accept:* hub at 1440/390 × light/dark: zero "Basis, training and serving notes" summaries and at most one notes disclosure; the table's
`<details>` closed on load with 82 rows inside; the panel < 1,200 px tall closed at 1440; opened at 390, the name cell's computed `position`
is `sticky` and there is no page overflow; `verify-fable-pass34-design.mjs` group F-180; `verify-cr-142.mjs` passes with the click added.

### F-181 — Log-axis ticks at the 10 px floor `[mechanical]` — **shipped by Fable (pass 34)**

*Where:* `components/JevCapabilityChart.tsx:219`, `components/JevContextLength.tsx:191`. *What:* `text-[9px]` → `text-[10px]` on both tick rows.
*Accept:* `verify-fable-pass34-design.mjs` group F-181 (no rendered text under 10 px inside `[data-bh-jev14-cost-axis]` and the context axis
row) on both hosts; `test/fable-pass34.test.mjs`. Implemented by Fable — a non-Fable engine flips it to verified.

### F-182 — Words, not keys, in the context section `[mechanical]`

*Where:* `components/JevContextLength.tsx` lines ~109, ~182, ~204, ~216 (`max_seq_len`), ~312, ~320, ~354 (`long_policy`), ~358
(`usage.input_tokens`, with its `<code>`).
*What:* "long_policy" → "long-policy" (the panel's own heading already spells it: "Long-policy tasks show a separate stress point"); "Show
long_policy results for all 14 matched systems" → "All 14 matched systems on long-policy tasks"; "Training max_seq_len:" → "Trained sequence
length:"; the legend entry "Training max_seq_len" → "Trained length"; the marker `title` → "Trained sequence length 2,048 tokens"; "existing
usage.input_tokens telemetry" → "the input-token counts each run already recorded". The formula in "What changed" and quoted module paths in
the refusal notes stay.
*Accept:* group F-182 (no `long_policy`, `max_seq_len`, `usage.input_tokens` in the hub's visible text outside `<code>`) on both hosts;
`verify-cr-142.mjs` unchanged or amended for the label only.

### F-183 — The leaf opens with the board's sub-line; the right column is "Against the reference" `[mechanical]` — **shipped by Fable (pass 35, with F-191)**

*Where:* `components/JevV141SystemDetail.tsx:65` (the paragraph), `:90` (`heading=`); `app/jev-models/[system]/page.tsx` if it prints the
same sentence for v1.3.0-only pages; `test/jevbench-system-pages.test.mjs`.
*What:* (a) The paragraph under the h1 becomes the row's sub-line in the board's words — class and author, the string the compare legend
already prints ("Jev rebuild", "Jev (TypeSafe, closed)") plus the author — followed by the API flag and the † note's first sentence as F-171(f)
specified. (b) "Scores and ranks can change when a new release is published" becomes the last line of "Availability and evidence"; "the page
preview remains name-only" is deleted. (c) The right column's `heading` → "Against Jev 1.13.0" (on Jev's own page "Against ⟨rank-2 system⟩",
derived from `ranked`); the caption "Four radars compare this fixed pair …" stays.
*Accept:* `/jev-models/jevk5-v02`, `/jev-models/hopper`, `/jev-models/jev-1.13.0` at 1440/390 × light/dark: no "hash-checked" / "name-only" in
`main`; no H2 equal to a radar's H3; the sub-line's class words match the compare legend's for the same row; group F-183; the system-pages
test amended.

### F-184 — Capability rows share one height `[mechanical]`

*Where:* `components/JevCapabilityChart.tsx` — the "Capability with cost alongside" row grid (`sm:grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_11rem]`
and the row's twin) and the column that prints "$0.14 · I 97.4 · C 93.5".
*What:* at `sm+` the inputs column is `whitespace-nowrap` on a track wide enough for the longest string the data produces ("$0.0033 est. · I
51.6 · C 72.4" — measure, do not guess; ~15 rem in the row's `font-mono` at 11 px), the bar track gives the difference; below `sm` the string
moves under the bar in the ranking's own 390 form. The header "I · C inputs" reads "$/1k · I · C".
*Accept:* hub at 1440, light and dark: all `[data-bh-jev14-capability-row]` heights within 2 px of each other (group F-184); at 390 no row
wider than the viewport; the axis under the list still aligns with the bar track (CR-142.2's verifier).

### F-185 — The input-length chart shows the range the data has; thin points say so; one explainer `[judgment]`

*Where:* `components/JevContextLength.tsx` — the accuracy-by-length chart, the section head paragraphs (~340–360: the "Coverage:" paragraph
at ~351, the "For example" paragraph at ~354, the telemetry paragraph at ~358); `verify-cr-142.mjs` (the seven-label pin moves off the axis).
*What:* (a) The x axis lists the buckets that hold at least one plotted item (today `<2k`, `2–8k`, `8–16k`, `16–64k`); one muted sentence
under the chart, generated from the data: "No public item exceeds 64k input tokens; the 64–256k, 256k–1M and ≥1M buckets are empty." The
seven buckets stay in the data, the tooltips and CR-142.4's evidence. (b) A point whose bucket holds fewer than 20 items is drawn hollow (`fill`
= panel background, 2 px stroke) with `data-bh-thin` and "n = 3" appended to its label and tooltip; the series' line stops at the last solid
point (a hollow point is plotted, not connected). (c) The section head is the eyebrow, the h2, one sentence ("Context length is how much input
a system accepts in one request; a smaller window forces truncation or chunking.") and one meta line ("82 rows · published limits 512 to
1,050,000 tokens · 8 without a published maximum · sources checked 24 Sept 2026"). The "Coverage: 13 of the top 15 …" paragraph becomes one
sentence under the accuracy chart's title ("13 of the top 15 systems; ⟨names⟩ have no per-item record."); the "For example, metask-jev-4b …"
paragraph moves under the long-policy panel, which is what it is about; the telemetry paragraph's first clause becomes the chart's one
caption line ("From each run's recorded input-token counts; no new runs.") and the rest goes.
*Accept:* hub at 1440/390 × light/dark: every x-axis label is a bucket some plotted point uses; every point with n < 20 carries `data-bh-thin`
(group F-185); the section head is ≤ 4 blocks before the first chart panel; `verify-cr-142.mjs` amended so the seven labels are pinned in the
data test and the empty-bucket sentence, not on the drawn axis.

### F-186 — The cost modal's locator wraps `[mechanical]` — **shipped by Fable (pass 34)**

*Where:* `components/PriceValue.tsx:33`. *What:* the source-note span is `break-all`, so the 64-character SHA-256 locator wraps at 390 instead
of widening the modal's scroll container; the full hash stays (CR-139.2). *Accept:* group F-186 at 390, both themes: no horizontal scroll
container inside `[role=dialog]`, `SHA-256 <64 hex>` still in the text; `test/fable-pass34.test.mjs`. Implemented by Fable — a non-Fable engine
flips it to verified.

### F-187 — The image benchmark's page draws its ranking before it publishes `[judgment]` — before `/image-jev-bench`

*Where:* `app/jev-models/multimodal-preview/page.tsx` (and the route it becomes), `components/ImageJevExamples.tsx`.
*What:* the page takes the hub's shape: (a) after the head and the four tiles, the ranking as bar rows (composite as the bar, "I · C · S · K ·
$/1k" as the small numbers, the hub's `Bar`), "Current top five by candidate composite" folded into it (it is the chart's first five rows), then
"Whole-candidate ranking" as the closed "All values as a table" (14 columns, name cell pinned at 390); (b) "Split" keeps its first sentence
and puts the rest and the family table behind "How the split was made"; (c) "Results by track" are two bar lists, not two 11-column tables;
(d) the examples gallery stays; (e) under 900 words outside disclosures.
*Accept:* the published route at 1440/390 × light/dark: ≥ 11 bar rows before any table; every table with more than 6 columns inside a closed
disclosure; no page overflow; no unpinned name cell in a scrolling table at 390; the CR-141.4 sealed-content scan re-run on the new HTML.

### F-188 — The alternatives bars carry their header; the chooser's slash `[mechanical]`

*Where:* `app/jev-models/alternatives/page.tsx:60` (`<ol data-bh-jev-alternatives-bars>`), `components/JevModelsV14.tsx:113` (the header
span — export it, or the bars' header block), `app/jev-models/how-to-choose/page.tsx:66,73`.
*What:* (a) the hub's header line ("Intel. Calib. Speed Cost $/1k dec." over the value columns, the 0–100 axis over the bar track) renders
above the alternatives list from the same component, so the two never drift; the 390 form ("I 53 · C 76 · S 83 · K 52 · $0.040" under the
bar) is already shared. (b) "94.0/ 100 benchmark score" → "94.0" with the muted suffix "/ 100" only (the tile's eyebrow already says which
axis).
*Accept:* `/jev-models/alternatives` at 1440/390 × light/dark: the element before `[data-bh-jev-alternatives-bars]` contains "Intel." and
"$/1k dec." (group F-188); `/jev-models/how-to-choose` has no "/ 100 benchmark score"; CR-136's verifier still passes.

### F-176 — No implementation note as copy under the 3D view `[mechanical]` — **(a) verified (iteration 189); (b) shipped by Fable (pass 34)**

*(b) Where:* `components/JevCapabilityChart.tsx:246`, `app/jev-models/page.tsx` (Credit). *What:* the caption keeps "79 systems plotted; systems
missing cost or Speed are omitted."; Credit gains one line "3D view: three.js r128 (MIT)." (`data-bh-jev-credit-3d`). *Accept:*
`verify-fable-pass34-design.mjs` group F-176 (no licence sentence inside `[data-bh-jev14-capability-suite]`; "3D view: three.js" inside
`#credit`) on both hosts, and `verify-fable-pass33-design.mjs` group F-176 now reads 82/82; `test/fable-pass34.test.mjs`. Implemented by Fable
— a non-Fable engine flips it to verified.

### F-165 — Same-name rows say whose run they are `[judgment]` — data part open (→ CR-128.1, F-165(a) decided in iteration 187)

The label half is live and verified (`135a3098`, `4a9dd523`). Open: the identity half — rows joining the board's identity with basis
`self_reported`; the rekey decision per vendor launch row is recorded (iteration 187). Accept as in pass 31.

## Design system notes (apply while touching any file above)

- **A chart's table is a disclosure (pass 34, F-180, extends F-152/F-159):** when a chart draws every row, the same rows as a table sit behind a
  closed "All N … as a table"; per-row notes are one disclosure with a generated count; per-row dates go into the source link's title.
- **A ranked list's rows have one height (pass 34, F-184):** a trailing value column never wraps; below the width where it fits, the values
  move under the bar as the ranking's rows do at 390.
- **An axis shows the range the data occupies (pass 34, F-185):** a bucketed axis drops buckets empty for every plotted series and names them in
  one generated sentence; the bucket set stays in the data and the tooltips.
- **A point from fewer than 20 items is hollow and carries its n (pass 34, F-185):** the series' line stops before it.
- **Provenance never opens a page; a section heading is not one of its children's titles (pass 34, F-183).**
- **A leaf shows the board's release (pass 33, F-171):** a system page reads the artifact the current board reads and names it once; an older
  run's data appears only under a heading that names the run.
- **A ranking's names lead to their pages wherever the ranking is drawn (pass 33, F-172, re-states F-169):** table rows and chart rows alike.
- **The size of a benchmark is said once before its first number (pass 33, F-173):** one head sentence, one meta line, the panel eyebrow.
- **A missing series is one sentence (pass 33, F-174, extends F-158 to radars):** labels carry only the values that exist.
- **Chart, table, explore, explain (pass 33, F-175):** a board page reads in that order.
- **A status line ends with the state it announces (pass 33, F-176):** "loading" and failures are copy, "ready" is not; library credits go to Credit.
- **A closed disclosure does not ship its content when it outweighs the page (pass 33, F-179).**
- **A toggle follows what it reveals (pass 29, F-155):** a "+N / less" control renders after the items it shows, never between or before
  them; an opened group reads items → control.
- **A thin board says how big it is (pass 29, F-156):** a ranking that opens on a few matched rows states "N of M published results are matched"
  in its one status sentence, and the control that widens it says how many rows it adds. The default view stays the matched rows; F-65 widens
  only when nothing is matched. "N of 845 catalog configurations" is the sentence for a fully matched board only.
- **Notes under a table are a disclosure, like under the chart (pass 28, F-152):** row notes never print open under a table; they are a
  closed `<details>` with a generated count, each row's mark links into it, and the mark's `title` carries the note's first sentence. A row tag
  that states a status carries a `title` even when the artifact has none (fallback: the note's first sentence).
- **One solid button per page (pass 28, F-153):** the page's one primary action is `bh-button-primary` (solid accent, ink text); every other
  action is the outline `bh-button`. A text colour alone does not make a primary.
- **The type floor is 10 px (pass 27, F-147):** no rendered text below 10 px anywhere, at any width — a label that does not fit is shortened by a
  written rule (drop what a neighbour already says), never shrunk past the floor.
- **One status per row (pass 27, F-146 follow-up):** a row states a value's status in one place — where the measured row shows its percentile — and
  never twice ("no percentile … developer's claim" is two).
- **A pinned label has a phone-length form (pass 26, F-144):** a pinned row label that cannot fit a third of the phone scrollport is shortened
  by a written rule (drop what the group row already says, wrap at its separators, ≤ 2 lines) and the dropped words go into the cell's title;
  it is never unpinned. The full form stays at `sm+`.
- **A card never announces an empty count (pass 26, F-145):** "Top 0 …", "0 of …", and "no … matches the filters" when nothing was filtered
  are defects; an empty state is one sentence saying what is missing and why, in the same words the Overview row uses.
- **A vendor's number says so where the number is (pass 26, F-146):** a self-reported value carries its status in visible words on its row
  and one generated count line at the top of its sheet; a superscript and a legend are not a status.
- **One message, one length (pass 26, F-142):** when a unit or caveat must appear in several places, it appears in one wording, and only the
  first occurrence may carry the arithmetic; the others are one line.
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

- **A column whose every cell says the same thing is a sentence** (pass 30, F-158). When a measure is absent for every row, say so once above
  or below the table and drop the column; keep a per-row label only where rows differ (F-146).
- **Every ranking draws its headline number** (pass 30, F-159). A table that orders systems by one figure carries that figure as a bar in the
  row — the JevBench board, the one-benchmark ranking, the model sheet and the preview all do.
- **An explanatory note follows what it explains** (pass 30, F-157). A "what changed" or method note sits after the chart or table it
  qualifies, never between the page head and the key message.
- **A page never prints a score its own table withholds** (pass 31, F-161). The Overview's evidence rules (`hasScoreEvidence`,
  `isThinComposite`) are the site's rules: a detail page uses the same helpers and the same tag, and prints no number where the table shows a dash.
- **A heading never counts to zero** (pass 31, F-162, extends F-145). "Top 0 …", "0 of …" and a filter excuse when nothing was filtered are
  defects wherever a count is computed at render time; take the count from the list actually rendered.
- **A panel says what its head does not** (pass 31, F-166, extends F-142). When the page head already states the one-line status, the panel
  under it carries only the consequences; the same sentence is never printed twice on one screen.
- **A leaf page speaks the board's words** (pass 32, F-168, extends F-54). A type, listing or basis key never reaches the reader raw; a leaf
  uses the board's label map, states a not-ranked status in one sentence with the artifact's reason once, and words a missing axis as the row does.
- **A page never prints a comparison its board withholds** (pass 32, F-168, extends F-161). An unranked or display-only entry gets no "ahead
  of / behind" clause against the ranked ones.
- **A leaf page draws its number** (pass 32, F-167, extends F-159). A page for one ranked entry shows where the number sits among its peers and
  against the reference in a chart, above any table of numbers; the board's radar is reused with the pair fixed, never redrawn.
- **A leaf is reached from its row** (pass 32, F-169). The board's name cell links to the entry's page; a list of every leaf under a board is a
  link farm, not a section.

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
| F-194 the custom-evaluation toast stacks above the fast-lane banner (`body.bh-fastlane-visible .bh-custom-evaluation-toast { bottom: calc(var(--bh-fastlane-height) + 1rem …) }`) | pass 36 (Fable, surgical: `app/globals.css`) + `test/fable-pass36.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/fable-20260926-pass36/{before,after}/` (group F-194) | **implemented** — needs a non-Fable engine |
| F-195 the bubble charts' latency sub-ticks at 10 px (were 9.5) | pass 36 (Fable, surgical: `components/JevBubbleChart.tsx`) | same (group F-195) | **implemented** — needs a non-Fable engine |
| F-196 the weight-slider status pill only in the custom state; one "Official" per figure | pass 36 (Fable, surgical: `components/JevBoardInteractive.tsx`) | same (group F-196) | **implemented** — needs a non-Fable engine |
| F-189 a sort is a control: the fairness sentence unboxed under the subtitle, a two-button `Rank by` (JevBench Score / Intelligence) at the subtitle's end, the active metric owning the bar length, the big number and the header labels, the rank numeral staying the board's | `97ede31a` (claude-opus, iteration 214); `components/JevRankBy.tsx`, `components/JevScoreBar.tsx`, `components/JevModelsV14.tsx`; `test/jevbench-v142.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/iter214-pass35/F-189-{canonical,legacy}/`; `…/local-shots/desktop_light-hub-{score,intelligence}.png` | **verified** — review gate 20260925T112003Z (opencode-kimi, not the implementer): 32/34 per host at the live deploy `0a87cb00`, canonical and legacy; the 2 failures per host are the 720 px budget → **F-193**. `/opt/benchmarkheaven/state/ux-evidence/review-20260925T112003Z/F-189-{canonical,legacy}/`. (Earlier **implemented** state — 32/34 per host; the two check corrections: the expected Intelligence order derived from the board instead of the hard-coded "Jev 1.13.0 / 53.1" (the artifact's highest Intelligence is GPT-6 Luna at 97.4), and "unboxed" read as a drawn frame anywhere between the sentence and the panel instead of `border-style`.) |
| F-190 a pinned page carries nothing dated after its release: no "Frozen top five" list above the board that draws it, no live-dated context section; the share preview keeps the top five | `97ede31a` (claude-opus, iteration 214); `app/jev-models/v1.4{,.1,.2}/page.tsx`; `test/jevbench-v141.test.mjs` | `…/iter214-pass35/F-190-{canonical,legacy}/` | **verified** — review gate 20260925T112003Z (opencode-kimi, not the implementer): 14/14 per host at `0a87cb00`, canonical and legacy. `/opt/benchmarkheaven/state/ux-evidence/review-20260925T112003Z/F-190-{canonical,legacy}/`. (Earlier **implemented** state — applied to all three pinned pages, not only v1.4.2: v1.4.1 carried both defects and v1.4 the list; the `<meta description>`'s top-five sentence (CR-134.2) is unchanged and pinned by the test in place of the on-page list.) |
| F-192 the `system-one-open` class has its own swatch (`--jev-t-sysone`) and, until CR-152.1 names it, its key in `<code title="Class named in the v1.4.2 artifact; description pending">` in all three legends and the leaf sub-line | `97ede31a` (claude-opus, iteration 214); `app/globals.css`, `components/jevTypes.ts` (`jevTypeVarName`, `jevLegendTypes`), `JevModelsV14`, `JevCapabilityChart`, `JevCompareV14`, `JevV141SystemDetail` | `…/iter214-pass35/F-192-{canonical,legacy}/`; `…/iter214-pass35/f192-colour-contrast.json` | **verified** — review gate 20260925T112003Z (opencode-kimi, not the implementer): 16/16 per host at `0a87cb00`, canonical and legacy. `/opt/benchmarkheaven/state/ux-evidence/review-20260925T112003Z/F-192-{canonical,legacy}/`. (Earlier **implemented** state — 16/16 per host; needs an engine other than claude-opus.) Contrast computed, not eyed: 5.15:1 dark / 6.15:1 light against the panel (floor 3:1), ΔE76 109–147 from the rebuild orange and llm green it sits beside in the top five, nearest neighbour `small-tool-model` at ΔE 35.3. The unlabelled fallback is a separate `--jev-t-unnamed`, so no future class borrows the llm green either. The group's third check ("no bare `— system-one-open` in visible text") was corrected: it is unsatisfiable beside "its key in `<code>`" and blind to the board's *system* named `system-one-open` (#14); it now targets the elements that render a class (`data-bh-jev14-class`). This closes F-183's recorded deviation (2). |
| F-188 the alternatives bars carry the header line that names their five numbers; the chooser's "94.0/ 100 benchmark score" loses the stray slash | `97ede31a` (claude-opus, iteration 214); `app/jev-models/alternatives/page.tsx`, `app/jev-models/how-to-choose/page.tsx`, the shared `JevScoreBarHeader` | `…/iter214-pass35/F-188-{canonical,legacy}/` (pass-34 verifier, `ONLY=F-188`) | **verified** — review gate 20260925T112003Z (opencode-kimi, not the implementer): 12/12 per host at `0a87cb00`, canonical and legacy, pass-34 verifier `ONLY=F-188`. `/opt/benchmarkheaven/state/ux-evidence/review-20260925T112003Z/F-188-{canonical,legacy}/verification-F-188.json`. (Earlier **implemented** state — needs an engine other than claude-opus. The tiles now read "94.0 of 100", matching the sealed-accuracy tile beside them; each tile's eyebrow already names its axis.) |
| F-191 a leaf names the one row it measures against: the tick, the points sentence, the radar pair and its heading use `referenceFor` (Jev 1.13.0; on Jev's page the best other system) | pass 35 (Fable, surgical: `components/JevV141SystemDetail.tsx`, `app/jev-models/[system]/page.tsx`) + `test/fable-pass35.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/fable-20260925-pass35/canonical/` (`desktop_light-sys-jevk5-v02.png`: "2.1 points behind Jev 1.13.0's 64.1" beside "The marked tick is Jev 1.13.0 (63.3)"), `…/local/` after the fix | implemented by Fable; the live number was wrong on every ranked leaf page since CR-152 (the sentence read `ranked[0]` and called it Jev). **verified** — iteration 214 (claude-opus, non-Fable): `ONLY=F-191` **60/60 on canonical and legacy** at `6ec7fee0`. `/opt/benchmarkheaven/state/ux-evidence/iter214-pass35/F-191-{canonical,legacy}/verification.json`. **Re-confirmed 20260925T112003Z (opencode-kimi):** 60/60 per host at `0a87cb00`. `…/review-20260925T112003Z/F-191-{canonical,legacy}/`. |
| F-183 the leaf opens with the board's sub-line (class label · by author · API flag), the right column is "Against ⟨reference⟩", the release sentence closes "Availability and evidence", no "hash-checked" / "name-only", the method link follows the revision | pass 35 (Fable, same commit) | same; `…/local-F-183/` 48/48 on the dev server | implemented by Fable with F-191. Two recorded deviations from the pass-34 text: (1) the row note is not in the sub-line — decider-4b v2's note opens with a PyPI wheel hash and a weights revision, which is not a head line — it is a "Note on this row" entry under "Availability and evidence" (`data-bh-jev-system-note`), full text; (2) an unlabelled class (F-192) is omitted from the sub-line rather than printed as a key. **verified** — iteration 214 (claude-opus, non-Fable): `ONLY=F-183` **48/48 on canonical and legacy** at `6ec7fee0`. `…/iter214-pass35/F-183-{canonical,legacy}/verification.json`. Deviation (2) is closed by F-192: the unlabelled class now prints as its key in `<code>` in the sub-line. **Re-confirmed 20260925T112003Z (opencode-kimi):** 48/48 per host at `0a87cb00`. `…/review-20260925T112003Z/F-183-{canonical,legacy}/`. |
| F-180 the context table is a disclosure ("All 82 limits as a table"), its 82 note disclosures are one ("Notes for 82 systems", † on the 36 rows that need it), no per-row date line, 25 bars + "Show all 82 systems", pinned name cell at 390 | `2d91c303` (claude-opus, iteration 208) | `/opt/benchmarkheaven/state/ux-evidence/iter208-pass34/{canonical,legacy}-F-180/`; panel 242 px closed and rows 37 px at 1440 | **implemented** — 12/12 per host; needs an engine other than claude-opus. The directive's own group check was corrected first (it looked for the panel's `<h3>` inside a `<details>`, which the directive keeps outside; and read a closed `<details>` through `innerText`). |
| F-182 words, not keys, in the context section | `2d91c303` (claude-opus, iteration 208) | `…/iter208-pass34/{canonical,legacy}-F-182/` | **implemented** — 8/8 per host. Two recorded deviations: the marker legend says "Trained sequence length", not "Trained length" (that label already names a bar colour in the same legend); one `max_seq_len` inside a sourced model-card note is set in `<code>` rather than reworded. |
| F-184 the capability rows share one height; the header names the value columns | `2d91c303` (claude-opus, iteration 208) | `…/iter208-pass34/{canonical,legacy}-F-184/`; 79 rows all 28 px at 1440 (were 28 px and 40 px) | **implemented** — 6/6 per host. 15 rem track measured against the longest live string, `$0.0033 est. · I 51.6 · C 72.4`. |
| F-185 the input-length axis draws only the buckets that hold an item, names the empty ones in one generated sentence, draws a point from n < 20 hollow and unjoined, and the section head is one sentence + one meta line | `2d91c303` (claude-opus, iteration 208) | `…/iter208-pass34/{canonical,legacy}-F-185/`; `…/cr142-{canonical,legacy}/` 108/108 | **implemented** — 12/12 per host. The coverage sentence names each exclusion's own recorded reason instead of the directive's "have no per-item record" template, because only one of the two is that. |
| F-176(b) the licence sentence lives in Credit ("3D view: three.js r128 (MIT).") and not beside the chart | pass 34 (Fable, surgical: `components/JevCapabilityChart.tsx`, `app/jev-models/page.tsx`) | `/opt/benchmarkheaven/state/ux-evidence/fable-20260924-pass34/canonical/` (`*-hub-3d-vp.png`, `metrics-*.json` → `licence`) | **verified** — iteration 208 (claude-opus, non-Fable): `ONLY=F-176` **16/16 on canonical and legacy** at `8b69a160`, repeated at `2d91c303`; the pass-33 gate went **78/82 → 82/82**, so these four failures are closed. Corroborated outside the verifier: the served HTML has only "3D view: three.js r128 (MIT).". `/opt/benchmarkheaven/state/ux-evidence/iter208-pass34-signoff/`. |
| F-181 the cost-axis and context-axis tick labels sit on the 10 px floor | pass 34 (Fable, surgical: two `text-[9px]` → `text-[10px]`) | same (`metrics-*.json` → `minFont` was `9 · SPAN $0.0010` in all four contexts) | **verified** — iteration 208 (claude-opus, non-Fable): `ONLY=F-181` **12/12 per host**, and the served hub contains zero `text-[9px]`. `/opt/benchmarkheaven/state/ux-evidence/iter208-pass34-signoff/`. |
| F-186 the cost modal's SHA-256 locator wraps at 390 instead of widening the sheet | pass 34 (Fable, surgical: `components/PriceValue.tsx`) | same (`mobile_light-cost-modal.png`: the scrollbar across the sheet) | **verified** — iteration 208 (claude-opus, non-Fable): `ONLY=F-186` **16/16 per host** at `8b69a160` and again at `2d91c303`. `/opt/benchmarkheaven/state/ux-evidence/iter208-pass34-signoff/`. |
| F-178 the CR-136 pages at the bar (bars on the alternatives list, a three-link guides row, four radars on a Jev-vs page, no field names, one back-link wording, no second leaf design) | codex (CR-136 author, `jevbench-seo-hn-push-20260923`) | review gate 20260923T235002Z (216/216, six routes, both hosts); re-seen live in pass 34 (`desktop_light-alt.png`, `desktop_light-vs-radars-vp.png`, `metrics-*.json` → `guides`, `bars`, `underscore`) | **verified** |
| F-171 the per-system page shows the board's release; every ranked row has a page | `35291e3e` (codex-luna, iteration 198) | `…/iter202-f171-f175-kimi/*/verification-F-171.json` | **verified** — Kimi K3 gate, iteration 202 (40/40 per host); re-seen in pass 34 (JevK5 62.0 · #2 of 77, Hopper 59.4 · #3, strip + 4 bands + 4 radars) |
| F-172 table and chart names link to `/jev-models/<key>` | `1238cc8c` (claude-opus, iteration 200) | `…/iter202-f171-f175-kimi/*/verification-F-172.json` | **verified** — iteration 202 (8/8 per host); pass 34: 130 links in the table, 82 rows |
| F-173 the size said once; the first bar inside the first screen at 390 | `1238cc8c` | `…/verification-F-173.json` | **verified** — iteration 202 (10/10 per host); pass 34: "534 public" once, first bar y = 662 |
| F-174 a missing series on a pair radar is one sentence | `1238cc8c` | `…/verification-F-174.json` | **verified** — iteration 202 (4/4 per host); pass 34: 0 dash labels, both series drawn on the default pair |
| F-175 chart → table → compare → "What changed" | `1238cc8c` | `…/verification-F-175.json` | **verified** — iteration 202 (4/4 per host); pass 34: y 430 → 1,531 → 7,926 → 9,437 at 1440 |
| F-168 the per-system JevBench page speaks the board's words (type label, one status sentence, comparison only when ranked, "none (label only)") | pass 32 (Fable, surgical: `app/jev-models/[system]/page.tsx`) + `test/fable-pass32.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/fable-20260923-pass32/` (`canonical/` before, `local/` 84/84 on the dev server, `live-*/` after the deploy; `verify-fable-pass32-design.mjs`) | **verified** — iteration 181 (claude-opus, non-Fable) ran `bin/verify-fable-pass32-design.mjs` on both hosts (84/84 each; `/opt/benchmarkheaven/state/ux-evidence/iter181-pass32/`) |
| F-167 the per-system page draws its number (score strip among the ranked, 22 px axis bands with the reference tick, the pair radar, two columns at `lg+`) | `d388663e` (claude-opus, iteration 181) | `/opt/benchmarkheaven/state/ux-evidence/review-20260923T150004Z/post-deploy/f167-f170-{main,mintapis}/` (`verify-fable-pass32-f167-f170.mjs`) | **verified** — review gate 20260923T150004Z (codex-luna, non-implementer), 287/287 per host at `eff2b4a9`; pass 33 notes the page still reads the v1.3.0 artifact → F-171 |
| F-169 every board row's name and the honorable card link to `/jev-models/<key>`; the 52-link block is gone | `d388663e` (claude-opus, iteration 181) | same | **verified** — same gate; pass 33: undone on the v1.4.1 board (names plain, chart names → repos) → F-172 |
| F-170 no registry id or fallback string as a sub-line; sheet names wrap | `d388663e` (claude-opus, iteration 181) | same | **verified** — same gate |
| F-179 the historical v1.3 board mounts only when its disclosure is opened; a link that names a view inside it still lands on that view | `0176b7cc` (PR #7) + `166cbe7e` (claude-opus, iteration 206) | `/opt/benchmarkheaven/state/ux-evidence/iter206-f179/` (`f179-*`, `deeplink-*`, `cr-90-*`, `cr-94-*`, `cr-97-*`, `pass33-*`) | **verified** — iteration 206 (claude-opus, non-implementer): `/jev-models` **1,366,324 bytes** on canonical, www and legacy (from 7,384,601, −81.5 %), 173,373 gzipped; `verify-f179.mjs` **22/22 per host**; the deep-link half **26/26 per host**; `verify-cr-90` **122/122**, `verify-cr-94` **112/112**, `verify-cr-97` **115/115** per host once the directive's missing click was added; `pass33` **78/82** on both hosts, unchanged, the four failures being the open F-176(b) |
| F-176(a) the 3D view announces nothing once it is up (live region kept for loading and failure states) | pass 33 (Fable, surgical: `components/JevCapability3D.tsx`) + `test/fable-pass33.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/iter189-f176/{canonical,mintapis}/verification-F-176.json` | **verified** — iteration 189 (claude-opus, non-Fable): `ONLY=F-176` on both hosts at `6714f8d4`, 1440/390 × light/dark. The (a) checks are **8/8 per host** (status empty after the panel scrolls in, no "ready" announcement). The same run holds (b) red 4/4 per host, quoting the live sentence — see D189: the gate could not see it before |
| F-163 a model with no measured result leaves the snapshot cards; one status per card line | `ee6c2748` (claude-opus, iteration 177) + `lib/compare-claims.mjs`, `test/fable-pass31-compare.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/review-20260923T031003Z/f163-f164-{canonical,legacy}/verification.json` | **verified** — codex-luna (review gate 20260923T031003Z, non-implementer): `verify-f163-f164.mjs` 87/87 per host; re-judged in pass 32: 5 muted lines, no empty track |
| F-164 the Compare status line says how many values are the developers' own | same | same | **verified** — same gate; pass 32: status 3 lines and claims 3 lines at 390, generated from the rendered rows |
| F-161 A thin Composite wears its tag beside the number; no input, no number | `8937dcbb` (Fable, pass 31) | `/opt/benchmarkheaven/state/ux-evidence/fable-20260922-pass31/{canonical,local,live-canonical,live-legacy}/` | **verified** — claude-opus (iteration 180, non-Fable, non-implementer): `verify-fable-pass31-design.mjs` 44/44 per host at `d8a821ab`, 1440/390 × light/dark; see the F-161/F-162/F-166 rows in `PROGRESS.md` |
| F-162 The offers card never counts to zero | `8937dcbb` (Fable, pass 31) | same | **verified** — claude-opus (iteration 180, non-Fable, non-implementer): `verify-fable-pass31-design.mjs` 44/44 per host at `d8a821ab`, 1440/390 × light/dark; see the F-161/F-162/F-166 rows in `PROGRESS.md` |
| F-166 The "not measured yet" panel says what the head does not | `8937dcbb` (Fable, pass 31) | same | **verified** — claude-opus (iteration 180, non-Fable, non-implementer): `verify-fable-pass31-design.mjs` 44/44 per host at `d8a821ab`, 1440/390 × light/dark; see the F-161/F-162/F-166 rows in `PROGRESS.md` |
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
| F-139 task scope other than All makes the chart, table, controls and URL explicitly non-default, with reload/reset and combined-weight wording | `f509927` (codex-luna, iteration 129) | `/opt/benchmarkheaven/state/ux-evidence/iter129-codex-f139-f140/{canonical-deployed,legacy-deployed,cr87-current-canonical,cr87-current-legacy}/` + independent Kimi output | **verified by opencode-kimi (different engine, 2026-09-20):** `verify-cr-90.mjs` **66/66 on both hosts**, 1440/390 × light/dark; Easy + Medium and Easy scope labels, `?scope=` persistence, reload restoration, official reset, chart/table state and no errors all pass. The current v1.2 companion `verify-cr-87.mjs` also passes **84/84 per host**. | **Review gate 20260920T043003Z (claude-opus):** the directive's own acceptance — "with scope = all nothing on the page differs from the pass-25 shots" — was **not** met: the default hero read `231 decisions per system` instead of 534, because the scoped view counted public tasks, and the verifier asserted nothing about the default view although the directive's test spec asked for exactly that. Fixed by the gate (`scopeDecisions()`); the strengthened verifier now checks 534/231/168/72 and passes 74/74 per host. **Sign-off done (opencode-kimi, iteration 141, 2026-09-20 ~21:00 UTC, non-claude):** `verify-cr-90.mjs` re-run live at `165714a` on both hosts — **122/122 per host** (the verifier now covers the scoped decision counts 534/231/168/72, the pinned grid head and the tier summaries), so the CR-90.1 `scopeDecisions` sign-off debt is closed. Evidence `/opt/benchmarkheaven/state/ux-evidence/iter141-kimi-signoff/{cr90-canonical,cr90-legacy}/`.
| F-140 JevBench public-task grid is a dense heatmap with 32 px symbol cells, compact rows, rotated headers and per-system tier totals | `f509927` (codex-luna, iteration 129) | same | **verified by opencode-kimi (different engine, 2026-09-20):** same **66/66 per host**; 231 task rows, 21 system columns, 3 × 21 `correct/attempted` summary cells, rotated headers, no hidden payload, no mobile overflow and no page/console errors | | **Review gate 20260920T055002Z (claude-opus):** the directive's "rotated headers" were the only thing naming the 21 system columns, and the head was `position: static` — scrolled to the bottom of the 231 rows it sat 6,185 px above the scrollport, so on desktop as much as on a phone every cell below the first screenful belonged to an unnamed column. The Task cells' `bh-jev-sticky` is defined only under `.bh-jev-table` and this grid is a `.bh-table`, so the class resolved to nothing. Fixed by the gate (`fcaf334`, `[data-bh-jev12-task-table] thead th { position: sticky; top: 0 }`); unchanged at scroll-top, pinned at offset 1 px in all four contexts, live **114/114 per host**. The **horizontal** half is left open for Fable: at 390 px the Task cell needs 291 px of a 324 px scrollport (451 px at 1.3× text), so pinning it as-is leaves one outcome cell and the 170 px phone cap of the main table would clip the question type. |
| F-145 A model with no provider offer shows a one-sentence Providers card, never "Top 0 cheapest providers" or an empty offers disclosure | `b9c688f` + `3c8be7b` (Fable, pass 26) | `/opt/benchmarkheaven/state/ux-evidence/fable-20260920-pass26/{canonical,legacy}-verify/`; independent close-out `/opt/benchmarkheaven/state/ux-evidence/iter136-fable27/{independent-canonical,independent-legacy}/` | Fable's own run at live `3c8be7b`: **16/16 on both hosts** (`*-verify/verify-fable-pass26.log`, 1440/390 × light/dark); the first cut (`b9c688f`) was 14/16 because the one-sentence card stretched to the Composite card's 412 px in the desktop grid — fixed with `self-start`. **Independent Kimi K3, iteration 136:** `verify-fable-pass27.mjs` passed 48/48 on both hosts at revision `7752df33…`, including the no-offer card and no empty offers disclosure. |
| F-141 honorable card: headline, two-sentence reason, one closed disclosure (`data-bh-jev12-honorable-details`) | `16c65c9` … `7752df3` (codex-luna, iteration 136) | `/opt/benchmarkheaven/state/ux-evidence/iter136-fable27/` (`verify-fable-pass27.mjs` 48/48 per host, Kimi K3); re-judged in pass 27: article 237 px at 1440 / 411 px at 390 | **verified** — opencode-kimi (iteration 136) + codex gate 138 `48/48`; **pass-27 follow-up signed off by opencode-kimi (iteration 141, non-Fable):** the 56/56-per-host re-run asserts the table group row carries the rule's first sentence only |
| F-142 one unit message, one length (two-sentence panel, one-line note under the table, two-line header cell, one disclosure style) | `16c65c9` (codex-luna, iteration 136) | same; pass 27: `cu[0].lines = 1` at 1440, `$ / 1,000 decisions` cell 2 lines | **verified** — same gates; **pass-27 follow-up signed off by opencode-kimi (iteration 141, non-Fable):** no unit note repeats its sentence (56/56 per host) |
| F-143 desktop task grid hugs its labels (Task column 208 px, table `w-auto`) | `6b5b8ce` (codex-luna, iteration 136) | same; pass 27: `grid.firstTh.w = 208`, `headTop = 1` after 900 px | **verified** — same gates |
| F-144 phone Task cell pinned in a phone-length form (120 px, tier prefix dropped, `<wbr>` at separators, full id + type in title) | `db1c76e` + `6b5b8ce` (codex-luna, iteration 136) | same; pass 27: `firstCellW = 120`, `firstCellLeftInWrap = 1`, six outcome columns beside it (`mobile_light-jev-grid-scrolled-vp.png`) | **verified** — same gates |
| F-146 a vendor's numbers say so where the number is (generated "{n} of {m} values are {org}'s own claims (†)…" line, visible "developer's claim" per row) | `7752df3` (codex-luna, iteration 136) | same; pass 27: Step 5 `claimVisible 41 / daggers 40`, DeepSeek `20 / 19` | **verified** — same gates; **pass-27 follow-up signed off by opencode-kimi (iteration 141, non-Fable):** no vendor row carries two status phrases, every claim row says it once (56/56 per host) |
| F-147 below `sm` the JevBench eyebrow reads "JevBench v1.2" and the custom-evaluation pill keeps 10 px / 14 px (was 8 px beside a two-line eyebrow) | pass 27 (Fable, surgical: `app/jev-models/page.tsx`, `app/globals.css`) + `test/fable-pass27.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/fable-20260920-pass27/canonical/mobile_light-jev-head.png` (before), `…/verify/` (after) | **verified by opencode-kimi (iteration 141, non-Fable):** `verify-fable-pass27-design.mjs` **56/56 per host** live at `9832546` on benchmarkheaven.com and the Sandy mirror (`/opt/benchmarkheaven/state/ux-evidence/iter141-kimi-signoff/pass27-{canonical,legacy}/`); cr103/cr-104 regressions kept green in the same run. |
| F-148 runner-disagreement footnote is two sentences; each runner's name carries its harness in its `title` (`data-bmx-runner-a/b`) | pass 27 (Fable, surgical: `components/BenchmaxxingReport.tsx`, `verify-cr-68-5.mjs` updated) + test | `…/desktop_light-report-runner-vp.png` (before: 9-line note), `…/verify/` (after) | **verified by opencode-kimi (iteration 141, non-Fable):** same 56/56-per-host run — both runner titles carry their harness, the note is two sentences and ≤ 4 lines in all four contexts on both hosts. |
| F-149 the custom-evaluation page's two actions sit under the title; the email section's closing sentence is the short form; the code block wraps instead of scrolling sideways | `8042d7a` + `6410cbb` (opencode-kimi, iteration 141, work engine per pass 27) + `test/fable-f149-f151.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/review-20260920T234002Z/f149-f151/{canonical,legacy}/` (`bin/verify-f149-f151.mjs`) | **Verified by codex-luna, non-implementer:** **40/40 per host**, 1440/390 × light/dark — actions in the first viewport, one mailto target, `pre.scrollWidth === pre.clientWidth` at 390, no text under 10 px, no page errors or overflow. |
| F-150 the JevBench table head back inside the pass-22 budget (68 px at 1440, ≤ 70 px at 390) | `8042d7a` + `6410cbb` + `a1642fa` (opencode-kimi, iteration 141) + test | same verifier | **Verified by codex-luna, non-implementer:** live 40/40 per host; head within 68/70 px, every th ≤ 3 lines, pinned name column unchanged. The recorded `min-w-[10.5rem]` deviation remains the smallest value meeting the directive's own acceptance text. |
| F-151 the four scope buttons are a 2 × 2 grid below `sm`, one row at `sm+` | `8042d7a` (opencode-kimi, iteration 141) + test | same | **Verified by codex-luna, non-implementer:** live 40/40 per host; two rows of two at 390 and one row at 1440, with no page errors or overflow. |
| F-152 the JevBench table's † notes are a closed disclosure the row's † opens; jqv's tag and † carry the reason as titles | pass-28 commit (Fable, 2026-09-21 ~04:45, "Fable pass 28") + `test/fable-pass28.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/fable-20260921-pass28/` (`canonical/` before, `live-*/` after the deploy, `verify-fable-pass28-design.mjs`) | **Verified by review gate 20260921T100004Z (claude-opus, non-Fable, non-implementer):** live 30/30 per host at `d1864ba` (`/opt/benchmarkheaven/state/ux-evidence/review-20260921T100004Z/fable28-{canonical,legacy}/`); the notes are a closed 2-line `<details>`, the jqv † carries the reason and opens its entry. jqv is ranked since CR-108, so no "not ranked" tag renders; iteration 146's "untitled jqv tag" was the cost column's `est.` pill (titled by its parent span) — the verifier now selects the not-ranked tag only. |
| F-153 the custom-evaluation page's email action is the solid primary button | same commit + test | same | **Verified by review gate 20260921T100004Z (non-Fable):** solid accent email button, outline GitHub, both hosts, light/dark, 1440/390 (`/opt/benchmarkheaven/state/ux-evidence/review-20260921T100004Z/fable28-{canonical,legacy}/`). |
| F-154 no text below the 10 px floor on the Simple and Advanced pages (shortlist ticks, route badges) | same commit + test | same | **Verified by review gate 20260921T100004Z (non-Fable):** minimum text 10 px on Simple and Advanced (one row expanded), both hosts, all four contexts, after iteration 146 restored the outlier tag's 10 px (`/opt/benchmarkheaven/state/ux-evidence/review-20260921T100004Z/fable28-{canonical,legacy}/`).  |
| CR-50.2 decision (Fable 5.1 one-shot, 2026-09-21 ~12:02 UTC, asked by iteration 149): "Free route" pill — muted outline (`.bh-free-tag`, light-Benchmaxxing weight), under the price in the Adjusted Cost cell, "Free" below 1024 px, links to the model page's route list; no pill in the name cell or on the Benchmarks tab; model-page free rows name provider + limits in their title; one legend line | `c1f0a0d`, `10cd203` (claude-opus, iteration 149) + `test/cr-50-2-free-route-tag.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/iter149-cr50-2/` (`fable-decision.txt`, `verify-cr-50-2.mjs` results) | Implemented as specified; the as-of date in the title reads "listed live on <date>". Owes a non-claude live sign-off. |
| F-155 the "+N / less" toggle follows the chips it reveals (phone matrix rows) | `4d57b17` (Fable, 2026-09-21 ~19:50, "Fable pass 29") + `test/fable-pass29.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/fable-20260921-pass29/` (`canonical/` before, `local/` 26/26 on the dev server, `live-*/` after the deploy; `verify-fable-pass29-design.mjs`) | implemented by Fable; live at `4d57b17` on both hosts, `verify-fable-pass29-design.mjs` **26/26 per host** (`live-canonical/`, `live-legacy/`, 20:0x UTC); needs a non-Fable engine to re-run it before `verified`; **verified** — iteration 157 (claude-opus, non-Fable) re-ran `verify-fable-pass29-design.mjs` at `df6c2ba`: **26/26 per host** (`/opt/benchmarkheaven/state/ux-evidence/iter157/fable29-signoff/{canonical,legacy}/`); the widened Blueprint-Bench view lists 25 of "26 results" because the page size is 25 — the 26th (Grok 4.3, 0 points) sits behind "Show more (1 remaining)", checked live |
| F-156 a partly matched ranking board opens with "N of M published results are matched"; the unmatched checkbox carries its count | same commit + test | same | implemented by Fable; the iteration-155 widening proposal is declined (Decisions in pass 29, item 1); live at `4d57b17` on both hosts, 26/26 per host (same runs); needs a non-Fable engine to re-run it before `verified`; **verified** — iteration 157 (claude-opus, non-Fable) re-ran `verify-fable-pass29-design.mjs` at `df6c2ba`: **26/26 per host** (`/opt/benchmarkheaven/state/ux-evidence/iter157/fable29-signoff/{canonical,legacy}/`); the widened Blueprint-Bench view lists 25 of "26 results" because the page size is 25 — the 26th (Grok 4.3, 0 points) sits behind "Show more (1 remaining)", checked live |
| F-157 the CR-118.4 "What changed in the score" note follows the JevBench board (first child of the board, before "What the run says") | `b385107a` (Fable, 2026-09-22 10:48, "Fable pass 30") + `test/fable-pass30.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/fable-20260922-pass30/` (`canonical/` before, `local/` 40/40 on the dev server, `live-*/` after the deploy; `verify-fable-pass30-design.mjs`) | implemented by Fable; live at `b385107a` on both hosts, `verify-fable-pass30-design.mjs` **40/40 per host** (`live-canonical/`, `live-legacy/`, 10:5x UTC); needs a non-Fable engine to re-run it before `verified`; **verified by iteration 169 (claude-opus, non-Fable):** `verify-fable-pass30-design.mjs` **40/40 per host** at `1fc85b11`, rc 0, screenshots read (`/opt/benchmarkheaven/state/ux-evidence/iter169-fable30-verify/{canonical,legacy}/`) |
| F-158 the multimodal preview has no all-"Not measured" Calibration column and its banner is the one required sentence | same commit + test | same | implemented by Fable; live at `b385107a` on both hosts, `verify-fable-pass30-design.mjs` **40/40 per host** (`live-canonical/`, `live-legacy/`, 10:5x UTC); needs a non-Fable engine to re-run it before `verified`; **verified by iteration 169 (claude-opus, non-Fable):** `verify-fable-pass30-design.mjs` **40/40 per host** at `1fc85b11`, rc 0, screenshots read (`/opt/benchmarkheaven/state/ux-evidence/iter169-fable30-verify/{canonical,legacy}/`) |
| F-159 the preview's overall ranking draws each system's real-item share as a bar in the "All real" cell | same commit + test | same | implemented by Fable; live at `b385107a` on both hosts, `verify-fable-pass30-design.mjs` **40/40 per host** (`live-canonical/`, `live-legacy/`, 10:5x UTC); needs a non-Fable engine to re-run it before `verified`; **verified by iteration 169 (claude-opus, non-Fable):** `verify-fable-pass30-design.mjs` **40/40 per host** at `1fc85b11`, rc 0, screenshots read (`/opt/benchmarkheaven/state/ux-evidence/iter169-fable30-verify/{canonical,legacy}/`) |
| F-160 the JevBench eyebrow hosting CustomEvaluationOffer is a `<div>` (the toast is a `<div>`; no nested-`<p>` console error on dev builds) | same commit + test | same (`local/` 40/40 includes the console check after the toast opened) | implemented by Fable; live at `b385107a` on both hosts, `verify-fable-pass30-design.mjs` **40/40 per host** (`live-canonical/`, `live-legacy/`, 10:5x UTC); needs a non-Fable engine to re-run it before `verified`; **verified by iteration 169 (claude-opus, non-Fable):** `verify-fable-pass30-design.mjs` **40/40 per host** at `1fc85b11`, rc 0, screenshots read (`/opt/benchmarkheaven/state/ux-evidence/iter169-fable30-verify/{canonical,legacy}/`) |
| F-197 the hub head is the message; the guides fold at every width and follow the Jev-class method panel | iteration 235 (opencode-kimi + claude-opus), `verify-fable-pass36-design.mjs` F-197 | `/opt/benchmarkheaven/state/ux-evidence/iter235-pass36/`; pass 37 `…/fable-20260926-pass37/canonical/metrics-*.json` (`hub-guides`, `hub-extra.firstCapY`) | **Verified by Fable (pass 37, non-implementer):** 10 links hidden, toggle visible after `#jev-class-method`, head 6 links; first Capability row y 561 at 1440 / 654 at 390, all four contexts. The "eleven" in the verdict was an off-by-one (10 links). |
| F-198 the image benchmark page is its results; the review trail leaves the page | iteration 235, `verify-fable-pass36-design.mjs` F-198 | same; pass 37 `img-f198` | **Verified by Fable (pass 37):** order Composite → Full ranking → Compare → Examples → Split → Method, candidates in a closed `<details>`, 8 gated sub-lines (Cost / Calibration), no bare 0.00, no bold parenthetical, no Penalty column, "Earlier split" present, 11,036 px at 1440. |
| F-199 on a phone the Composite figure folds its controls; one control per sort | iteration 235, `verify-fable-pass36-design.mjs` F-199 | same; pass 37 `hub-table.presetRow/weightsMore`, `mobile_*-hub-chart-vp.png`, `hubw-table` | **Verified by Fable (pass 37):** preset row 28 px scrolling (978 > 306), weights closed on load and open with `?w=40-20-20-20`, no "Sort by" button, first bar inside the figure's first viewport; 1440 unchanged (8 sliders visible). |
| F-200 the Capability ⓘ is a list, and a modal on a phone | iteration 235, `verify-fable-pass36-design.mjs` F-200 | same; pass 37 `hub-rownote`, `*-hub-rownote-open.png` | **Verified by Fable (pass 37):** 1440 hover panel with 7 `dt`; 390 tap opens `[role=dialog]` with ✕ and 7 `dt`, no floating panel, `li` title empty. |
| F-201 the 3D top-five labels sit beside their spheres (CR-176.6 drew them off the left edge) | pass-37 commit (Fable, 2026-09-26) + `test/fable-pass37.test.mjs` | `/opt/benchmarkheaven/state/ux-evidence/fable-20260926-pass37/` (`canonical/` before: labels at x −10…−23, 1,324 px wide; `local-F-201/` 24/24 on the dev server; `verify-fable-pass37-design.mjs`) | implemented by Fable; needs a non-Fable engine to run `ONLY=F-201` on both hosts after the deploy before `verified` |
| F-202 the bubble charts' 2× caption and direction hints are 10 px on phones (were 9) | same commit + test | same (`local-F-202/` 20/20) | implemented by Fable; needs a non-Fable engine to run `ONLY=F-202` on both hosts after the deploy before `verified` |
