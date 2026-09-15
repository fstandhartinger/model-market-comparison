# Change-request brief — executable checklist for `03-CHANGE-REQUESTS-VERBATIM.md`

Written 2026-09-14 by Claude Code (Florian's laptop session, supervisor). The verbatim text wins
every conflict. Row IDs below go into the `PROGRESS.md` ledger with the same status vocabulary
(`open` · `in-progress` · `implemented` · `verified`) and the same rule: **only an engine other
than the implementer may set `verified`**, checked live at 1440 px and 390 px, light and dark,
evidence under `/opt/benchmarkheaven/state/ux-evidence/`.

## 0. How this fits the running workstream (read before touching code)

- **Same loop, not a second agent.** These rows run through the existing tick → work → review
  gate (different engine, every 3 work iterations) → design gate. One writer at a time; the
  owner lease and `bin/tick.sh` stay authoritative. Do **not** start a parallel writer.
- **Seed the ledger first.** The first work iteration that reads this file adds every `CR-…`
  row below to the `PROGRESS.md` ledger table as `open` (plus a dated seeding note), commits and
  pushes that **alone and immediately**, before any code — this keeps rebase conflicts small.
- **`ALL-ACCEPTED` now also requires every `CR-` row to be `verified`.** `bin/tick.sh` refuses
  to finish otherwise; a review gate must not append `ALL-ACCEPTED` while any `CR-` row is open.
- **Priority.** Florian-visible CR rows come first, in the order of section 2 below. Keep
  finishing the pre-existing open items (R9.1 stale sources, E2/E3, F-72 and the collectors'
  non-implementer verification, P2/P3, X2–X4, X6/X7, F1, C1) — interleave them when a CR row is
  blocked or when a review gate lists them; do not abandon them.
- **Engines (Florian 2026-09-14).** Implementation with **Claude Code Opus 5** (already the
  `work` default in `bin/pick-engine.sh`). **Fable 5.1 sparingly**: design gate now only after
  every 6 work iterations (was 2), plus at most **one** targeted Fable pass on the new Benchmarks
  page once CR-1 to CR-3 are implemented. Bulk mechanical work (row metadata, tag
  classification drafts, copy for benchmark descriptions, test fixtures) goes to free models via
  `bin/delegate.sh` — verify their output, never ship an unverified number or tag.
- **Model-economy and secret rules stay as they are** (`/home/flori/.hermes/model-economy-policy.md`,
  `RELAYMODELS.md`): no secrets, env values, cookies or OAuth client secrets in any prompt, log
  or commit.

## 1. Conflict resolved

- **CR-8.1 vs `00-REQUIREMENTS-VERBATIM.md` item 5.** On 2026-09-12 Florian wrote that the
  Simple-mode model list is "über den Preis absteigend sortiert (der adjusted preis)". On
  2026-09-14 he wrote "the default sorting of the overview table of models should be: descending
  by score." **The newer instruction wins.** Default sort is score descending in Simple *and*
  Advanced. Update any R5.x ledger note that records price sorting; do not flip it back in review.

## 2. The checklist

### CR-6 / CR-8 — quick wins (do first)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-6.1 | Simple mode, mobile portrait header: show **Benchmarks** next to Filters; rename **Menu → More**; Benchmarks sits left of More | 360 px and 390 px: all three labels visible, no overflow or truncation, tap targets ≥ 44 px, correct accessible names; desktop header unaffected or consistently renamed |
| CR-8.1 | Overview table default sort: **score descending** (Simple and Advanced) | Fresh load, no stored sort: `aria-sort=descending` on Score in both modes; a user-chosen sort still persists as before |

### CR-1 — Benchmarks tab: release-style comparison table + bar chart

| ID | Requirement | Acceptance |
|---|---|---|
| CR-1.1 | Opening the Benchmarks tab shows a **model-release-style comparison table** (reference image): models as columns (vendor small above, model name large), benchmarks as rows (name + one-line description underneath), generous whitespace, a highlighted lead column | Matches the reference's idea in the app's own design system; light and dark; no horizontal page scroll at 390 px (table scrolls inside its own container with a sticky first column) |
| CR-1.2 | Default columns: **top 5 models of the current filter selection** by the active score | Changing filters re-selects unless the user pinned models (visible pin state); count adjustable (e.g. 2–10) |
| CR-1.3 | Rows **grouped by category** with group headers: e.g. Composite indices · Coding · Agentic & tool use · General reasoning & knowledge · Math · Science · Long context · Instruction following · Multimodal / vision · Design / UI (DesignArena) · Safety & honesty · other | Every benchmark in the dataset lands in exactly one category; category comes from dataset/registry metadata (not hard-coded in the component); groups collapsible |
| CR-1.4 | **Extensive rows — show off the collection.** Include the **Artificial Analysis Intelligence Index and every individual AA component result**, the AA sub-indices and their components, DesignArena, all community and niche benchmarks — every benchmark with at least one value among the selected models, not a sample | The "All" preset renders every benchmark present in `data/dataset.json` for the selected models; a visible count ("N benchmarks across K categories"); a test asserts the AA index components are rows of their own |
| CR-1.5 | Cells: value plus a **subtle Excel-style data bar** background | Bar length normalised per row over the visible models; direction-aware (lower-is-better rows invert); ELO / points / % each handled; missing value = "—" without a bar; bar contrast subtle in light and dark and never reduces text contrast below WCAG AA |
| CR-1.6 | **Row winner in bold** | Direction-aware; ties bold all tied cells; a row with fewer than 2 values has no winner; unit tests for ties, lower-is-better and missing values |
| CR-1.7 | **Tags in the benchmark-name column**: top/headline (AA Index components, DesignArena, very well-known) vs niche vs community-owned | Tag set defined once in data with a short tooltip per tag (e.g. `AA Index`, `Arena`, `Headline`, `Niche`, `Community`); classification reviewed by an engine other than the one that drafted it; methodology note on `/about` |
| CR-1.8 | **Every cell clickable → detail comparison page** | Deep-linkable route (model × benchmark, with the compared models) showing the number, source URL, source date, benchmark version/basis and provenance, the same benchmark for the other compared models, and that model's other results; back navigation restores table state |
| CR-1.9 | **Bar chart** with all selected models and the **most important benchmark scores** | Grouped bars, model colours identical to the table's column accents, legend, values on hover/tap, readable at 390 px (horizontal layout or per-benchmark small multiples), follows the design-system rule that ranges > ~20× are never plain linear bars; benchmark set follows the "Important" preset by default |
| CR-1.10 | "Must look excellent and very intuitive" | The one targeted Fable design pass (section 0) judges the page at 1440/390, light/dark; its directives are implemented and verified |
| CR-1.11 | Performance | Full "All" table with 10 models renders without jank (virtualise rows if needed), no layout shift on load, Lighthouse CLS < 0.1 |

### CR-2 — Choosing the compared models (multiple convenient ways)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-2.1 | Direct editing: remove a column (×), add a column (+) with **type-ahead model search** | Keyboard operable; works on mobile |
| CR-2.2 | **Pick from chart**: combine the filter panel with the Simple-mode **Pareto diagram and its min-score / max-price sliders**; sliders narrow the candidates, clicking/tapping points adds/removes models | Selected models visibly marked in the Pareto; changes reflect in the table immediately |
| CR-2.3 | **Auto top-N** from filters (CR-1.2) and a one-click "reset to top 5" | — |
| CR-2.4 | **Model-list presets**: ours + custom | Ours at least: Frontier top 5 · Best open-weight · Best value (score per adjusted $) · Coding leaders · Flagships by lab (OpenAI / Anthropic / Google / DeepSeek / …) · EU-hostable. Custom: save, rename, delete |
| CR-2.5 | Shareable URL | Selected models, row preset and filters encoded in the URL; opening it reproduces the view |

### CR-3 — Choosing the benchmark rows

| ID | Requirement | Acceptance |
|---|---|---|
| CR-3.1 | **Row presets**: ours + custom | Ours at least: All · Important (headline) · AA Intelligence Index (+ components) · Coding · Agentic & tool use · Math & science · Community & niche · Full coverage only (rows where every selected model has a value). Custom: checklist with per-category toggles, save / rename / delete |

### CR-4 — Filter presets

| ID | Requirement | Acceptance |
|---|---|---|
| CR-4.1 | **Filter presets**: ours + custom | Ours at least: Company, EU-hosted only · Privacy strict (Strong confidential guarantees + no training / retention) · Cheapest capable · Open weights only · Frontier regardless of cost. Custom: save / rename / delete |
| CR-4.2 | **One consistent preset component** for model, row and filter presets | Same interaction pattern everywhere; "ours" and "yours" visibly separated |

### CR-5 — Accounts, settings and preset persistence

| ID | Requirement | Acceptance |
|---|---|---|
| CR-5.1 | **Sign in with Google** | Auth.js (or equivalent maintained library) on Next 15; secure httpOnly cookies, CSRF protection; works on `benchmarkheaven.com` and the legacy host |
| CR-5.2 | **Users, settings and presets stored in the user account** (app Postgres via `DATABASE_URL`) | Migration committed; presets and settings sync across two browsers (evidence) |
| CR-5.3 | Signed out: **localStorage**, plus a **toast suggesting sign-in** so presets aren't lost and sync across browsers | Toast appears when a signed-out user saves a custom preset or setting; dismissible; not shown again that session; never blocks the action |
| CR-5.4 | First sign-in **merges** local presets into the account | No preset lost; duplicates by name resolved sensibly; tested |
| CR-5.5 | Privacy and account basics | Only email, name, avatar stored; privacy/Impressum text updated (Rechtsträger as already on the site); "delete my account and data" works |
| CR-5.6 | **Provision the Google OAuth client yourself** (skill `self-service-provisioning`; Florian's Google account is signed in in Chrome on Sandy, `gui-control-sandy`) with redirect URIs for both hosts | Client ID/secret only in the Coolify env of the app, never in prompts, logs, evidence or git. On 2FA: send a Telegram pre-warning first; if it cannot be completed, `/notify-telegram-urgent` with crystal-clear steps for Florian — and ship CR-5.3 fully in the meantime. Start this early; it can take time |

### CR-7 — Simple mode: two landing sections

| ID | Requirement | Acceptance |
|---|---|---|
| CR-7.1 | Simple-mode landing = **two sections**: (1) the existing Price/Capability overview (sliders, Pareto, overview table), (2) a **Benchmarks section** with a simple version of the comparison table | Section 2 uses the "Important" row preset and the top models of section 1's current selection |
| CR-7.2 | Make clear it is the **simple version**, with an obvious switch to the full version | On small screens a brief toast (or inline note) says the full version is best on desktop; not repeated on every visit |
| CR-7.3 | The header's **Benchmarks** button (CR-6.1) leads to the right place | Simple mode: scrolls to / focuses section 2; Advanced: opens the full tab |

### CR-9 — Quality gates for this change request

| ID | Requirement | Acceptance |
|---|---|---|
| CR-9.1 | Tests | Unit: data-bar normalisation and direction, winner logic, category assignment, preset CRUD and local→account merge, auth routes. E2E: open tab → default top 5; change selection three ways; save a preset signed out → toast; share URL round trip |
| CR-9.2 | Gauntlet evidence | Each CR row verified by a non-implementing engine, live, 1440/390, light/dark, with screenshots and a short verification JSON |
| CR-9.3 | No invented data | Every cell traces to a dataset value with source, date and basis (CR-1.8 proves it); a missing value is shown as missing, never estimated in this table |

## 3. Suggested order

CR-8.1, CR-6.1 → CR-5.6 provisioning started in the background → CR-1.1–1.7 (table, grouping,
bars, winners, tags) + CR-2.1/2.3 → CR-1.8 detail page → CR-1.9 chart → CR-3.1, CR-2.4, CR-4.1
with CR-4.2 → CR-2.2 pick-from-chart → CR-7.x simple sections → CR-5.1–5.5 accounts →
one Fable pass (CR-1.10) → CR-1.11, CR-9.x close-out.

## 4. CR-20260915 checklist

Detailed task briefs already exist under `/home/flori/benchmarkheaven-*-20260915/REQUEST.md`
(linked from `03-CHANGE-REQUESTS-VERBATIM.md`); the rows below are the short checklist form,
same convention as section 2.

### CR-10 — Landing tagline

| ID | Requirement | Acceptance |
|---|---|---|
| CR-10.1 | New header copy: "The most detailed cost–capability analysis in AI." / "Every model. Every Benchmark. Actual Costs." | Exact copy live (capitalization as Florian wrote it, see note in `03-CHANGE-REQUESTS-VERBATIM.md`); no unsubstantiated added claim; accessible, responsive |

### CR-11 — Pareto chart: desirable-region emphasis + wider comparison set

| ID | Requirement | Acceptance |
|---|---|---|
| CR-11.1 | Invert the Pareto chart's X axis so the most attractive cost–capability region is top-right | Axis labels/direction re-checked for no misleading reversal; light/dark verified |
| CR-11.2 | Diagonal green gradient in the top-right quarter only, transparent at that quarter's bottom-left edge to opaque green at the chart's top-right corner, behind the data | Contrast/readability preserved in light and dark; doesn't obscure points |
| CR-11.3 | Small "most attractive quadrant" annotation top-right | No overlap with data/controls/legend/tooltips at desktop or mobile widths |
| CR-11.4 | Chart and overview table include up to 30 models (was up to 15), selected by top score (AA Intelligence Index or ECI), relaxing only the "featured models" restriction, all other filters preserved, including Simple mode | Test: 30-model selection with filters preserved |
| CR-11.5 | At most 15 models get a visible name label on the chart; the rest stay selectable/visible via existing interactions (table, tooltip) without crowding | Test: 15-label cap, no overlapping labels |

### CR-12 — Benchmark table: Benchmark Heaven Score row, category composites, richer Coding

| ID | Requirement | Acceptance |
|---|---|---|
| CR-12.1 | New highlighted first row above all benchmarks, in Simple, Advanced and the Benchmarks tab, showing the current selected score, labeled "Benchmark Heaven Score" with a smaller second line "(Main Composite Score)" | Value matches the live selected composite exactly and updates with filters/settings; visually distinct from third-party benchmark rows |
| CR-12.2 | Category headers (Composite indices, Coding, Agentic & tool use, …) visually emphasized (color and/or bolder/larger font) | Design pass reviewed; contrast requirements met in light/dark |
| CR-12.3 | Each category header doubles as a composite score for that category, filled into the relevant score cells | Updates with filters; honestly excludes missing/incompatible data rather than fabricating an average |
| CR-12.4 | Coding category broadened well beyond SciCode: add FrontierCode, CursorBench 4.0, DeepSWE v1.1, Terminal-Bench 4.0, SWE-Atlas-QnA, SWE-bench variants (Verified/Pro/Live), SWE-Lancer LiveCode, Codeforces, BigCodeBench and other credible sources found | New data-intake recipes added where justified; every value keeps source/date/basis; nothing invented where evidence is thin |

### CR-13 — Cost-cell modal simplification

| ID | Requirement | Acceptance |
|---|---|---|
| CR-13.1 | Modal explains plainly that it combines AA tokens-per-task, OpenRouter cache-efficiency data, the cheapest filter-surviving provider, and the strongest benchmarked reasoning variant — shorter than today | Reviewed for length/readability; no loss of the true calculation basis |
| CR-13.2 | Remove the "Assumptions and limitations" wall of text completely; do not replace with similar alarming boilerplate | Section absent; Sources section stays compact and present |
| CR-13.3 | Use source-backed cache-hit rates/prices where available; fall back to a documented industry-typical baseline instead of assuming 0% cache-hit | Baseline is inspectable from Sources; deterministic |
| CR-13.4 | Replace the linked text "Chutes LLM usage statistics" with "Proxied from public available LLM usage statistics from a inference provider [link]" (see wording note in `03-CHANGE-REQUESTS-VERBATIM.md` re: the grammar-corrected variant in the REQUEST.md brief) — only "[link]" is the interactive/underlined element | Visual check: surrounding text reads as ordinary body copy |

### CR-14 — Compare tab defaults + Benchmark Radar

| ID | Requirement | Acceptance |
|---|---|---|
| CR-14.1 | Compare tab pre-populates with the two currently most capable models (currently Fable 5.1 and GPT-6 Astra) instead of a random pair | Not hard-coded as an eternal rule; follows current capability data; degrades gracefully if a model is unavailable |
| CR-14.2 | Radar axis scaling fixed to be metric-aware (a 0–100 benchmark score of ~55 renders at ~half, not near-full) | Regression test using GPT-5.6 Sol / AA Coding Index (~55) as the case |
| CR-14.3 | Hover/tap shows the exact score value | Keyboard-accessible tooltips |
| CR-14.4 | Replace the current 6-axis default (drop saturated axes like GPQA Diamond) with a current, well-balanced set from AA Indices, ECI, important DesignArena measures, etc. | Selection documented; degrades gracefully when a model lacks a metric |
| CR-14.5 | Toggle between the new simple radar and the Benchmaxxing screen's detailed/complex radar | Both work with filters, accessibility and performance intact |

### CR-15 — Cost-cell value signal, Benchmaxxing defaults, signal-score styling, master-detail compare

| ID | Requirement | Acceptance |
|---|---|---|
| CR-15.1 | Overview table Cost cell highlights notably cheap or expensive models relative to their capability score (color and/or small tag) | Based on a transparent cost-vs-capability calculation respecting current filters; colour-blind-safe (text/icon redundancy) |
| CR-15.2 | Benchmaxxing screen default model selection replaced with up-to-date top/featured models, as a named, changeable preset | Degrades gracefully if a featured model becomes unavailable |
| CR-15.3 | Signal score becomes an expressive warning-style pill/tag when the score is above 25 (Florian's wording "Signal coli" — confirm exact product term before implementing) | Accessible (not colour-only); explains threshold on hover/focus/tap |
| CR-15.4 | Per-model report loses its own model selector and instead reacts to the model selected in the table (master-detail); optional two-model side-by-side compare mode for that chart | Deep-link behaviour preserved; single-model report still works |

### CR-16 — Subscription-cost modeling (ChatGPT Plus/Pro, Claude subscriptions)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-16.1 | ChatGPT Plus/Pro and Claude Pro/Max are never presented as universally business-safe API equivalents; commercial-use eligibility is provider/plan/region/contract-dependent (09:34 UTC wording is the product rule; supersedes the 09:11 UTC pass where they differ) | Copy reviewed against both quoted messages in `03-CHANGE-REQUESTS-VERBATIM.md` |
| CR-16.2 | API pricing stays the default comparison everywhere; a small "Subscription costs may differ" note with a collapsible explanation is added, not the opening question in guided mode | Note is visually quiet; collapsible explanation covers utilization-dependence and account-sharing/resale/automation/rate-limit restrictions |
| CR-16.3 | Optional assumption-based estimate: effective cost/task = monthly subscription cost ÷ completed tasks per month, editable, explicitly labeled as an assumption, never invented allowances | Only offered for explicitly supported subscription workflows; visibly distinct from API costs everywhere it appears |

**Suggested order:** CR-10, CR-11 → CR-12 → CR-13 → CR-14 → CR-15 → CR-16, interleaved with the
still-open rows from section 2 per the priority rule in section 0.


## 5. CR-20260915b checklist — EU-hosted filter

| ID | Requirement | Acceptance |
|---|---|---|
| CR-17.1 | The EU-hosted filter includes Claude models available via AWS Bedrock with EU in-region processing (per exact model; Fable 5/5.1 only if officially offered in an EU region) | Each included model cites the official AWS doc/region list with date; no model included on provider name alone |
| CR-17.2 | The EU-hosted filter includes OpenAI models available via Azure AI Foundry EU deployments (data zone EU / EU regions) | Per model and deployment type, cited with date; global-only deployments are not counted as EU-hosted |
| CR-17.3 | The filter's definition of 'EU-hosted' is stated plainly (in-region inference/data processing, not just an EU control plane or billing entity) and applied consistently to all providers | Tooltip/help text reviewed; existing EU providers re-checked against the same rule |


## 6. CR-20260915c checklist — data-driven default for Simple's minimum score (PRIORITY: next work iteration)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-18.1 | While the user hasn't touched the slider (`minScoreTouched=false`), Simple's minimum-score default is derived from the data instead of the fixed 86 (`lib/cost.ts defaultMinFor`): take the models Simple's value map would plot under the current filters *before* the minimum-score cut (same pool, price mode, offer scope, collapse; points with a positive price on the log axis), find the cheapest one (rightmost; if several share the lowest cost, the one with the highest score), and set the default to its score rounded down to the slider step, so that model passes and is on the green Pareto line | Unit test with a fixture: default equals the rightmost-top model's score; that model is in `paretoFrontier` of passing points; the line reaches the right edge of the plotted cloud |
| CR-18.2 | Floor: the derived default is never below 65 (for the 0–100 composite/index scores). Elo-style scores (Design Arena) keep their own existing default logic | Test: a cheapest model scoring 50 yields default 65 |
| CR-18.3 | Table and value map use the same derived value (no mismatch between rows shown and points passing); the slider shows it; 'reset' returns to the derived default; a value the user set by hand still wins and is still persisted; the model pool itself does not shrink/grow in a loop when the default changes (compute from the pre-cut pool) | Live check on both hosts, desktop + 390 px, light/dark: line reaches the rightmost top model in Simple; touching the slider still overrides; Advanced/Guided unchanged |


## 7. CR-20260915d checklist — Compare, Benchmaxxing, report, More menu, cost cell, Options, Charts map, providers, benchmark list

| ID | Requirement | Acceptance |
|---|---|---|
| CR-19.1 | Compare radar tooltips get an opaque, theme-aware background (no see-through text) in light and dark | Screenshot check on both themes; contrast ≥ 4.5:1 |
| CR-19.2 | Compare radar scaling makes differences between two strong models visible: axis range adapts to the two selected models' values (e.g. no 0–25 dead zone; a sensible per-axis or shared window around the pair's values), with the scale shown honestly (ring labels reflect the window) | Fable 5.1 vs GPT-6 Astra shows visibly different shapes; test for window computation; no misleading zero; single-model and missing-value cases handled |
| CR-19.3 | Default compare radar axes: replace DesignArena Frontend with DesignArena Full-Stack (Fable 5.1 must have a value on every default axis where data exists); no duplicate DesignArena axes | Default axis list test; Fable 5.1 and GPT-6 Astra both have points on all default axes (or a documented gap) |
| CR-20.1 | Full benchmark comparison: model columns have equal widths | Visual check desktop/mobile; table-layout fixed or equivalent |
| CR-21.1 | Benchmaxxing tab shows one row per model (weights/training run), not multiple reasoning variants; the benchmaxxing verdict is computed/displayed per model so variants can't disagree | Test: variants collapse to one row; chosen representative documented |
| CR-21.2 | Benchmaxxing signal bar (yellow) scales to the actual maximum value present in the list (not a fixed max), so differences are clearly visible | Bar width = value / max(list); max shown; test |
| CR-22.1 | Per-model report: fix AA Coding Agent Index value for Muse Spark 1.3 (raw fraction 0.64 shown as percentile 0.0 / zero). Values must be converted to the axis's scale consistently; tooltip formats numbers (no 15-digit raw fractions) | Regression test with this model; tooltip shows a formatted value; no zero plotted for a real value |
| CR-22.2 | Per-model report: add one plain sentence near the radar: 'The more jagged the shape, the more benchmaxxed the model looks.' (wording may be polished) | Copy present, accessible |
| CR-22.3 | Radar charts with many axes: remove the radial spoke lines or make them much subtler (low-contrast on dark mode) | Design check light/dark |
| CR-23.1 | Mobile header 'More' menu opens anchored to its button (currently pops up in the wrong spot) | Check 390 px and tablet widths, both themes; no overflow |
| CR-24.1 | Overview table cost cells: the '↓ 11× cheaper' (and 'pricier') tag sits left of the price on the same line, not below it, so the cost bar stays aligned | Visual check desktop/mobile; row height unchanged |
| CR-25.1 | Rename 'Filters' to 'Options' everywhere (button, dialog title, docs) since it also holds choices like the score | Copy check; no stale 'Filters' labels |
| CR-25.2 | Remove the 'Strong confidential guarantees' filter | Absent in UI, state migrated, no dead code paths |
| CR-25.3 | Move 'I'm buying for a company' out of the 'Data Confidentiality' section to a better-fitting place | Design pass decides placement; documented |
| CR-25.4 | Regional settings harmonized and positively expressed: 'Hosted in: China / EU / US / Other' (all checked by default); plus 'Inference provider company based in: China / EU / US / Other' and 'Model lab based in: China / EU / US / Other'; remove the (i) on EU-hosted. Existing EU-hosted/non-US/exclude-Chinese behaviour maps onto these without changing results for default users | Tests for mapping + defaults; data for provider/lab country present or documented as Other |
| CR-25.5 | New Options section 'Models and Providers' holding the Models dropdown, the Providers dropdown and a new Labs dropdown (lab = company that trained the model; provider = inference company) | UI check; Labs filter works with collapse/variants |
| CR-25.6 | Score dropdown includes the category composite scores (e.g. Coding) as selectable scores | Selecting a category score updates table, map and sort consistently |
| CR-26.1 | Charts tab cost-vs-capability diagram gets all the Overview value-map improvements (reversed cost axis, attractive quadrant, Pareto line, in-chart labels with collision handling, 30-model logic where it applies) plus more convenience: easy score selection directly on the chart, and other sensible controls (e.g. min score/max cost, label toggle, hover details) | Parity checklist vs Overview map; design gate review |
| CR-27.1 | Research and, if it qualifies, add trustedtokens.eu as a provider (models, prices, hosting region, company country) with provenance | Evidence in data-verification job or own intake; no invented numbers |
| CR-28.1 | Overview start page benchmark list shows all benchmarks we have (not only 22) | Count equals catalog count; grouping/perf acceptable |
| CR-28.2 | DesignArena Frontend and Full-Stack values for GPT-6 Astra (and any other missing models present on DesignArena) are ingested; the data-verification job's corrections are applied with provenance | Values present with source/date; verification report linked |


## 8. CR-20260915e checklist — slider branding, outlier tags

| ID | Requirement | Acceptance |
|---|---|---|
| CR-29.1 | Simple mode minimum-score slider label reads 'Minimum Capability Score' with '(Benchmark Heaven Main Composite Score)' on a second line (instead of 'Minimum Capability Score (Composite)'); its (i) tooltip is rebranded the same way | Copy check desktop/390 px, light/dark; label wraps as two lines, no overflow |
| CR-29.2 | The slider filters on exactly the same score shown in the top 'Benchmark Heaven Score' row of the Simple benchmark results table (same key, same value per model); when another score is selected, label/tooltip name that score consistently | Test: slider score key == score row key; values match for sample models |
| CR-29.3 | Simple benchmark results table: in each benchmark row, a small tag marks scores that are outstandingly good or bad compared with the other models in that row (e.g. 'top' / 'low'), one tag per cell at most, based on a transparent rule (e.g. clear gap vs the row's other values, not just the max/min), accessible (not colour-only), not cluttering rows with few models | Unit test for the rule; visual check; tooltip explains the rule |


## 9. CR-20260915f checklist — self-reported scores and more benchmarks (after the research job's RESULT.md exists)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-30.1 | Ingest the verified self-reported scores from `/home/flori/jobs/bh-self-reported-scout-20260915/self-reported-scores.jsonl` with full provenance (source URL, page/table, date, setting), clearly labelled 'self-reported' in the product and never averaged into independent measurements without that label | Registry/dataset gates pass; every value has source+date+basis; UI shows the self-reported label; test |
| CR-30.2 | Add the top new benchmarks from `BENCHMARK-CANDIDATES.md` (prefer ones with an independent leaderboard) to the taxonomy and category composites, in the job's recommended order | Each new benchmark: description, official URL, category, saturation note; composites documented |
| CR-30.3 | Benchmark lists/tables show the new benchmarks (Overview all-benchmarks list, Benchmarks tab, compare) with self-reported vs independent distinguishable | Visual check; counts match catalog |


## 10. CR-20260915g checklist — simplified-list hint, benchmark (i) tooltips

| ID | Requirement | Acceptance |
|---|---|---|
| CR-31.1 | Simple mode: when the benchmark table comes into view — via the header 'Benchmarks' link scroll or by manual scrolling — a brief, attention-seeking note 'This is a simplified list' pops up next to the 'Open the full comparison' button, stays a short moment (~3–4 s) and disappears; at most once per page visit (don't nag on every scroll) | IntersectionObserver-based; works for header link and manual scroll; respects prefers-reduced-motion (no animation, still shown); not covering the button; mobile 390 px + desktop, light/dark; test |
| CR-31.2 | Simple benchmark table: an (i) next to every benchmark name, with a tooltip that briefly explains what the benchmark measures and what type of score it delivers (e.g. % solved, Elo, index 0–100, fraction), sourced from the taxonomy descriptions | Every row has an (i) with non-empty text; tooltip opaque, above sticky headers/columns and the table (correct z-index), keyboard- and tap-accessible; no clipping at table edges |
