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
- **Model-economy and secret rules stay as they are** (`/home/flori/.hermes/model-economy-policy.md`):
  no secrets, env values, cookies or OAuth client secrets in any prompt, log or commit.
  RelayModels removed 15 Sep 2026 (Florian: not trusted) — don't use it.

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


## 11. CR-20260915h checklist — score/cost pickers, shorter tooltips, value-map axis + settings

| ID | Requirement | Acceptance |
|---|---|---|
| CR-32.1 | Simple view: the 'Minimum Capability Score' label gets a small downward triangle; clicking opens a compact popup to pick the score: Benchmark Heaven Main Composite (default), the category composites (same as the category rows in the Simple benchmark table, e.g. Coding), and selected scores: AA Intelligence Index, AA Coding Index, Epoch ECI, Epoch Software ECI, the most important DesignArena scores. The choice drives the slider, table sort/score row, value map and label (CR-29 wording adapts) | Keyboard/tap accessible popup, opaque, correct z-index; selection persists like other settings; slider range/default adapt to the score's scale (CR-18 rule applies per score); test |
| CR-32.2 | Simple view: the 'Max adjusted cost / task' label gets the same triangle picker to choose the cost measure: adjusted cost per task (default), plain blended cost per million tokens, input and output price per million tokens (and any other existing price modes). Choice drives the cap slider, table cost column and value-map X axis consistently | Units/labels correct everywhere; test for each mode |
| CR-32.3 | Rewrite the (i) tooltips next to 'Max adjusted cost' and 'Minimum Capability Score' to be much shorter and simpler, as 2–4 short bullet points in plain language (details can link to the methodology/Sources) | Each tooltip ≤ ~50 words; reviewed for clarity; opaque, correct z-index |
| CR-32.4 | Value map Y axis: don't always run to 100 — fit the range to the plotted scores (sensible padding, rounded ticks) when the highest value is well below 100; scale-aware for Elo-style scores | Test with a score whose max is ~70: axis top < 100; points never clipped |
| CR-32.5 | Small cogwheel button on the value map opening chart settings, e.g. Y axis: fit to data / full 0–100 scale, labels on/off, Pareto line on/off (reuse existing toggles where present) | Settings persist; accessible; design gate review |


## 12. CR-20260915i checklist — shortlist column chart, Main Composite row first

| ID | Requirement | Acceptance |
|---|---|---|
| CR-33.1 | 'Benchmarks for your shortlist' section: a column chart above the table showing all shortlist models' Benchmark Heaven Score (Main Composite Score), sorted high→low, values labelled, same model order/colours as the table where sensible | Renders desktop + 390 px (horizontal scroll or compact labels), light/dark, accessible (aria/table fallback); updates with filters |
| CR-33.2 | The column chart has its own small score dropdown (same score list as CR-32.1: Main Composite default, category composites, AA Intelligence/Coding, Epoch ECI + Software ECI, key DesignArena scores); models without a value for that score are shown as 'no data', not zero | Test per score; Elo-style axis handled; no fake zeros |
| CR-33.3 | Simple benchmark table: the top row is ALWAYS the Benchmark Heaven Score (Main Composite Score), independent of the score selected in Filters/Options. If a different score is selected there, a second highlighted row with that selected score appears directly below it. (Supersedes CR-12.1's 'current selected score' subtitle behaviour.) | Test: composite selected → 1 row; other score selected → composite row + selected row; labels correct; same in Benchmarks tab and Advanced details where CR-12.1 applied |


## 13. CR-20260915j checklist — OpenRouter Benchmarks API

| ID | Requirement | Acceptance |
|---|---|---|
| CR-34.1 | Add a collector for `GET https://openrouter.ai/api/v1/benchmarks` to the data pipeline (raw capture with as_of, source, permaslug), checking OpenRouter's API terms for display/attribution first and attributing 'OpenRouter Benchmarks' with links | Raw file in data/raw with provenance; terms note in SCRAPING.md; daily refresh gate passes |
| CR-34.2 | New independent benchmarks from OpenRouter's own runs: GPQA Diamond (OpenRouter run), τ²-Bench Verified Airline, and the search benchmarks (BrowseComp, DSQA, HLE, WideSearch — note their search engine/surface configuration) added to taxonomy + categories; show accuracy ± stddev and task count; keep separate from other-source GPQA values (basis differs) | Taxonomy entries with descriptions; identity joins via model_permaslug reviewed; values match API |
| CR-34.3 | Use OpenRouter's measured `avg_cost_per_task` as an additional, clearly labelled cost signal (e.g. in cost modal/Sources or as a selectable cost measure per CR-32.2) — never silently replacing the adjusted cost model | Labelled 'measured by OpenRouter on <benchmark>'; test |
| CR-34.4 | Add Artificial Analysis Agentic Index (from this API or AA directly) to the taxonomy, category composites (Agentic & tool use) and the score pickers | Values for ≥100 models; source/date shown |
| CR-34.5 | Use the API's DesignArena rows to fill gaps and cross-check existing DesignArena values (categories: website, codecategories, uicomponent, dataviz, gamedev, 3d, svg, …); DesignArena's own site stays primary where they differ; GPT-6 Astra is also missing here — keep investigating via the data-verification job | Gap count before/after; conflicts listed, not silently overwritten |
| CR-34.6 | Evaluate OpenRouter's media benchmarks (Image, Video) and whether they fit the product; document the decision | Decision note in the ledger |


## 14. CR-20260915k checklist — AA attribution, BETA tag (PRIORITY: next work iteration)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-35.1 | Attribute Artificial Analysis wherever AA data is shown: a visible 'Data: Artificial Analysis' (linked to https://artificialanalysis.ai/) next to every AA-derived value/composite source — score rows and tooltips (AA Intelligence/Coding/Coding Agent Index, AA-based composite contributions), value map/charts using AA scores, cost model parts using AA tokens-per-task, the Sources/methodology page, and a site-wide footer credit. Logo only from AA's official brand kit, if used at all | Every UI surface showing AA-derived numbers has a visible linked credit (checklist of surfaces in the ledger); footer credit on all pages; light/dark, mobile |
| CR-35.2 | A prominent 'BETA — Work in progress' tag in the site header (next to the logo/name) on all pages, plus a short one-line explanation on hover/tap ('This site is under construction; data and features change daily') | Visible on desktop and 390 px without crowding the header; accessible |
| CR-35.3 | ~~Hold on new AA metrics~~ — lifted by Florian 16 Sep 21:45 UTC (CR-20260916g): add the AA Agentic Index (CR-34.4) and all other AA metrics available, with attribution | CR-34.4 done; hold references removed |
| CR-35.4 | Epoch AI attribution (CC-BY): wherever Epoch data is shown (Epoch ECI, Epoch Software ECI, other Epoch-run benchmark results, composites using them, radar/compare/tooltips, Sources page, footer) show a visible linked credit 'Data: Epoch AI (CC BY)' linking to https://epoch.ai/eci (or the specific dataset page) and a licence link; the Sources page carries Epoch's recommended citation with access date | Checklist of surfaces in the ledger, same as CR-35.1; licence link present |
| CR-35.5 | For benchmark rows taken from Epoch's hub that Epoch sourced from external projects, record and display the original source and respect its licence (flag any with unclear/restrictive terms in the ledger instead of showing them silently) | Provenance field per row distinguishes Epoch-run vs external; unclear ones listed |


## 15. CR-20260915l checklist — Compare model picker, best-of-variants, Options dropdowns

| ID | Requirement | Acceptance |
|---|---|---|
| CR-36.1 | Compare tab 'Add models' search: redesign the dropdown — clean list with lab logo/name, model name, release date and main score, keyboard navigation (↑↓ Enter Esc), highlighted match text, grouping by lab or relevance, recent/top suggestions when empty, clear selected state, no overflow/clipping, opaque with correct z-index, good on mobile (full-width sheet) | Design gate review; keyboard + screen reader check; 390 px and desktop, light/dark |
| CR-36.2 | Compare picker lists one entry per model (weights/training run), not every reasoning variant. For each benchmark the compared value is the highest score among that model's reasoning variants; the tooltip/cell names the variant and setting that produced it (e.g. 'best of variants: xhigh'), so best-of is never hidden. Cost uses a clearly stated variant (e.g. the one behind the main composite) — never mixes best-of scores with a cheaper variant's cost silently | Test: variants collapse; per-benchmark max chosen; variant label shown; consistent with CR-21.1 (Benchmaxxing one row per model) |
| CR-36.3 | Options panel: revamp the Models and Providers dropdowns (and the new Labs one from CR-25.5) — they are too big and get cut off. Use a compact, searchable multi-select (combobox/popover with max height and internal scroll, chips for selected items with '+N more', select all/none, grouped lists), sized to the panel, fully visible on desktop and mobile | Nothing clipped at any viewport; long lists scroll inside the popover; keyboard accessible; design gate review |


## 16. CR-20260915m checklist — Lumina Bench benchmarks (after the intake job's RESULT.md exists)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-37.1 | Add every Lumina Bench benchmark family we don't have yet (from the intake job's verified `NEW-BENCHMARKS.md` / staged data) to the taxonomy, categories and composites, with description, official URL and source | Count of added benchmarks documented; each with primary source + licence status; no duplicates of existing ones under other names |
| CR-37.2 | Scraper/updater: add a daily collector for Lumina's data ledger as a discovery + provenance feed (manifest hash change → diff new benchmarks/results), and collectors for the primary sources behind the new benchmarks; values reach the dataset only with source, date, basis and a licence that allows display (credit Lumina where its data is used directly) | Collector in the daily refresh with fail-closed gates; SCRAPING.md documents sources + licences; attribution shown |
| CR-37.3 | Results for the new benchmarks shown across the site (full benchmark list, Benchmarks tab, compare, category scores) with self-reported vs independent distinction (as CR-30) | Live check; counts match |


## 17. CR-20260915n checklist — further benchmark sources (after the source-intake job's RESULT.md exists)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-38.1 | For every source in CR-20260915n: a collector in the scraper/updater (API > official download > leaderboard page) for the benchmarks we don't have, or a documented decision why not (terms forbid reuse, no model-level results, duplicate of an existing source, stale/saturated, research-only runner); use `/home/flori/jobs/bh-source-intake-20260915/SOURCES.md` + `collectors-plan.md` | One row per source in the ledger with collector id or decision; SCRAPING.md lists each source, access method, licence/terms, cadence |
| CR-38.2 | Saturation/freshness metadata per benchmark: test version, task/question date window, contamination notes, and a 'saturated' flag when top models are near ceiling; surfaced in the benchmark (i) tooltip and used to down-weight saturated benchmarks in composites (documented) | Fields present for all benchmarks with data; composite weighting documented and tested |
| CR-38.3 | Human-preference arenas (Arena, DesignArena, EQ-Bench-style judged scores) are labelled as preference/judged scores and kept separate from objective task accuracy in categories and composites | Labels + category mapping reviewed |
| CR-38.4 | Aggregators (Lumina, BenchLM, The Aggregate, LLM Stats, Vellum, LM Council, CodeSOTA, BenchmarkList, HF find-a-leaderboard) are used for discovery and cross-checks; values come from primary sources unless the aggregator's terms allow reuse with attribution — never double-count the same result from two aggregators | Provenance shows primary source; dedupe test |
| CR-38.5 | Daily/weekly refresh schedule per source with fail-closed gates and a source-health view in ops (which collectors succeeded, stale sources) | Refresh report lists every source's status |

## 18. CR-20260916 — DesignArena documented-risk guard

| ID | Requirement | Acceptance |
|---|---|---|
| CR-39.1 | Keep only the two current DesignArena boards (Frontend and Full-Stack Elo) under Florian’s documented-risk decision. No endpoint, board, or collection expansion without a new explicit decision or documented permission/licence. | A committed machine-readable/source-policy guard names the two permitted boards; a test rejects any added DesignArena endpoint/board by default. |
| CR-39.2 | Make the restriction and evidence durable in operational/source documentation, while preserving exact provenance/date and avoiding any false official-API/licensed-feed claim in user-facing methodology. | Evidence path `/opt/benchmarkheaven/state/ux-evidence/iter78-designarena-terms/` is recorded; methodology/source wording is reviewed live; tests remain green. |

## 19. CR-20260916b–g — chart readability, variant merging, stronger signals, panes/radar, sort-aware tags, social preview (seeded 2026-09-16 by review gate 20260916T121002Z)

### CR-20260916b — Simple shortlist benchmark-chart readability

| ID | Requirement | Acceptance |
|---|---|---|
| CR-40.1 | "Simple view — Benchmarks for your shortlist" bar chart: model names on the x-axis rendered **diagonally** instead of vertically | Readable at desktop and 390 px; no clipping/overlap; light and dark |
| CR-40.2 | Y-axis defaults to a **data-driven (non-zero) range** so score differences are visible; the displayed range must be visibly stated on the chart so the missing zero baseline cannot mislead | Range label visible; default sensible when values span 65–100 |
| CR-40.3 | A **cogwheel** offers a clearly named **zero-baseline** option (and back); the choice persists; works desktop/mobile, light/dark | Persisted across reload; keyboard accessible; tests + independent live verification |

### CR-20260916c — Merge agent/version variants in benchmark-table display

| ID | Requirement | Acceptance |
|---|---|---|
| CR-41.1 | Benchmark-table display merges agent/version variants of one board into a **single row per model**, showing each model's **best recorded result**: ApprenticeBench API (no more separate Claude Code / Codex rows) and AA Coding Agent Index (one row, best across v1.4/v1.5 and across agents) | Raw results preserved untouched (version, agent/harness, date, source); merge only compatible metric/unit/direction |
| CR-41.2 | The unified row states that it shows the model's best recorded result; its detail/provenance view names the selected version and agent/harness | Wording + provenance live; applied consistently in Simple, Advanced and the Benchmarks tab; tests + independent live verification |

### CR-20260916d — Stronger table signals and provider links

| ID | Requirement | Acceptance |
|---|---|---|
| CR-42.1 | Value signals ("pricier"/"cheaper") shown **more often and in two intensity levels** (weak/strong), derived from documented data thresholds — not hard-coded per model (Fable 5.1 weak-pricier and GLM-5.3 weak-cheaper are acceptance examples only when current data meets the thresholds) | Threshold rule documented in the ledger; text/icon + accessible explanation, not colour alone |
| CR-42.2 | **Benchmaxxing signal tag** in a weak and a strong form (strong = today's form); clicking it deep-links to `/benchmaxxing` with the model selected and the **radar section** scrolled/focused, with understandable back navigation | Keyboard-accessible deep link; target section focused; live on desktop/mobile, light/dark |
| CR-42.3 | In an expanded model row's provider list, each provider links to its **in-app provider detail page** when available, otherwise to the verified official provider website; no manufactured URLs; provenance preserved | Links live and correct for a sampled set; tests + independent live verification, desktop/mobile, light/dark |

### CR-20260916e — Data revalidation, matched expansion panes, Benchmaxxing quick radar

| ID | Requirement | Acceptance |
|---|---|---|
| CR-43.1 | **Full independent revalidation round** of every published scraped number against its retained primary-source capture/contract (every collected source group); coverage, mismatches, exclusions and remedies recorded; fail closed on any unverified or mismatched value | Revalidation report accounts for **every** published scraped number; no unaccounted value; report path in the ledger |
| CR-43.2 | In each expanded overview row the provider/offers pane and the benchmarks pane share the **same visible height** at applicable desktop widths; deliberate matched-height layout with internal scroll where needed, no clipped content | No stray page-level scrollbar on one pane; both panes equal height; desktop widths + 390 px, light/dark |
| CR-43.3 | Benchmaxxing tab: an accessible **expandable per-model row** exposing a compact radar, the signal score and a plain-language jaggedness interpretation, plus a link/anchor to the existing full radar/report section (model selected, focus/scroll moved); the master-detail flow stays | Expand/collapse keyboard accessible; compact radar correct; anchor keeps context; live desktop/mobile, light/dark |

### CR-20260916f — Sort-aware value-signal framing

| ID | Requirement | Acceptance |
|---|---|---|
| CR-44.1 | When the table is sorted by **score descending** (default), cost-relative "pricier/cheaper" badges render in the adjusted-cost column; when the user actively sorts by **adjusted cost descending**, the equivalent same-model value signal renders instead in the **capability** column with capability-relative wording | Mutually exclusive per sort state; thresholds/levels (weak/strong) preserved; changed context announced accessibly; keyboard sorting, desktop/mobile, light/dark tested |

### CR-20260916g — Correct the social link-preview slogan

| ID | Requirement | Acceptance |
|---|---|---|
| CR-45.1 | Replace the retired social description ("Every AI model benchmark we can find, in one place. And what each model really costs you.") with the accepted brand copy — "The most detailed cost–capability analysis in AI." / "Every Benchmark. Actual Costs." — in **canonical Open Graph, Twitter, standard description and any wording embedded in the share image**; canonical and www must agree | Scraper-style fetches of both hosts show the new copy; Telegram cache limitation explained, not claimed fixable retroactively |

### CR-20260916h — Regression: restore overview-table value badges (priority)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-46.1 | **Priority regression.** Restore the data-derived cost-relative value badges ("cheaper" / "pricier") in the default score-descending Overview table; find the real cause in the live data/threshold/filter path, no static labels, no hard-coded models; lands **before** the CR-44.1 sort-aware reframing | Regression test over current (fixture or live-equivalent) data proves qualifying expensive and cheap rows render, including strong-tier examples when their inputs meet the documented thresholds; independently live-verified after deploy in the default table, desktop/mobile, light/dark; later price-sort framing (CR-44.1) moves/rewords without suppressing the signal |

## 20. CR-20260916i–j — strong value tag visibly stronger; Benchmaxxing tag navigates (seeded 2026-09-16 by Fable pass 19)

### CR-20260916i — Make the strong value-tag level visibly stronger

| ID | Requirement | Acceptance |
|---|---|---|
| CR-47.1 | The **strong** pricier/cheaper level has plainly greater visual emphasis than **weak** at a glance (both colours, light and dark); the semantic strong/weak classification stays as it is; arrow/text cues stay distinct; sufficient non-colour contrast | Live weak vs strong examples compared side by side at 1440 and 390 px, light/dark, by an engine other than the implementer; visual-regression coverage of both levels |

### CR-20260916j — Benchmaxxing tag must navigate instead of expanding the row

| ID | Requirement | Acceptance |
|---|---|---|
| CR-48.1 | The Overview-table Benchmaxxing signal is a real keyboard-accessible link to the corresponding model's Benchmaxxing report (model identity encoded safely); click and keyboard activation never expand/collapse the row; lands on the selected-model section; direct load and back/forward behave predictably; clicking any non-link part of the row still expands it | Automated interaction coverage plus independent live checks for mouse, Enter/Space, mobile tap and browser back; shares the deep-link target with CR-42.2 |

## 21. CR-20260916k — Directly curate the Simple-view chart and benchmark table (seeded 2026-09-16 by Fable pass 19)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-49.1 | One coherent, low-clutter **"Edit shortlist"** interaction shared by the Simple-view score chart and benchmark table: remove any displayed model; add another eligible model by type-ahead; set the table/chart order explicitly with accessible move controls and keyboard operation; both chart and table visibly reflect one shared selection and order; documented cap with a clear "full" state; one-click reset to the automatic shortlist; local persistence of the curation without changing global filters; links to the model and the full comparison kept. Drag-and-drop only as a robust desktop enhancement, never the sole route. **The design authority chooses the interaction before implementation (F-106 in `DESIGN-DIRECTIVES.md`).** | Mouse, touch, keyboard and screen-reader labels tested; 320/390 px and 1440 px, light/dark; reload persistence; reset; independent live verification by an engine other than the implementer |

## 22. CR-20260916l — A free route is a status, not a $0 paid price (seeded 2026-09-16 by iteration 85)

Split in two: the pricing rule (CR-50.1) is unambiguous data correctness and can be built at once; the tag (CR-50.2)
waits for the design authority's choice, as Florian's clarification asks.

| ID | Requirement | Acceptance |
|---|---|---|
| CR-50.1 | A zero-price API route is volatile availability/promotion evidence, never the ordinary paid price. Every refresh revalidates it; it is excluded when absent from the current source, stale, quota-bound, invitation-only or not usable through the normal paid API. Every cost ranking, chart (incl. **Cheapest models — Adjusted $/task**), table and value map uses the cheapest current **paid** route; historic raw provenance is kept but never shown as current pricing. Provider, privacy and region filters keep working. | Regression tests: a vanished free endpoint; a verified current free endpoint next to a paid chart value; a model with only a valid zero-price route. GLM-5.2 no longer shows $0 live; the expanded price table exposes paid/free provenance accessibly |
| CR-50.2 | Where a zero-price route is current and broadly usable, a compact **"Free route currently available"** tag beside the model names the provider, says limits and availability may apply and never implies the model is universally free; no tag when expired/unconfirmed. **The design authority chooses the least noisy form before implementation.** | Live on both hosts, 1440/390, light/dark; tag absent for expired routes; independent verification by an engine other than the implementer |

## 23. CR-20260916a — Make the open-source claim true: add a licence (seeded 2026-09-16 by review gate 20260916T153003Z)

Florian (launch-ad brief, Laptop Claude Code chat, 16 Sep 2026 ~15:45 UTC): "lets make clear this
is open source and a hobby project, to give the world better tools to decide which LLM to choose
best for the job". Supervisor check in the same message: the public GitHub repo has **no LICENSE**
(GitHub licenseInfo null) — legally source-available, not open source. Default choice: **MIT**
(Florian may overrule). Third-party data keeps its own terms (Artificial Analysis, Epoch AI CC BY,
DesignArena, OpenRouter …) — the licence covers our code, not their data.

| ID | Requirement | Acceptance |
|---|---|---|
| CR-51.1 | The repo carries a **licence** (MIT unless Florian overrules) that is visible to GitHub's licence banner: LICENSE file at the repo root, `license` field in package.json, README section | GitHub shows the licence; the licence text names the project's copyright holder consistently with the site's existing Impressum; third-party benchmark data explicitly NOT relicensed (its own terms named, linking the existing attribution/attributions page) |
| CR-51.2 | Product copy states plainly that Benchmark Heaven is **open source and a hobby project** ("to give the world better tools to decide which LLM to choose best for the job" as the spirit), placed where users read it (footer and/or /about), consistent with the existing BETA tag and the AA/Epoch attribution obligations (CR-35) | Live on both hosts, desktop/mobile, light/dark; links to the GitHub repo and the licence file work; no claim stronger than the repo reality; `npm test`/`tsc` stay green |

## 24. CR-20260916m — Include LisanBench (seeded 2026-09-16)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-52.1 | Establish whether LisanBench can be collected and republished from an official source: independently record the benchmark methodology, version, score definition/direction, model-identity mapping, result date, official results endpoint/download, and licence/terms. Use the LisanBench site and its first-party project/repository; third-party aggregators are discovery/cross-check only. | A dated source-policy/intake record names the exact primary source and permitted method, or documents a fail-closed no-ingestion decision. No invented/relabelled scores. |
| CR-52.2 | Where source reuse is permitted, add LisanBench through the normal data pipeline, preserving raw captures, per-result source URL/date/version/basis and model mapping; include only verifiable official model-level results and show gaps as missing. | Dataset values trace to retained raw source evidence; source/date/version appear in the benchmark tooltip/detail view; automated tests cover parsing, score direction/scale and rejected malformed/unprovenanced records. |
| CR-52.3 | Present LisanBench under a methodology-appropriate category selected only after the audit, with concise, accurate benchmark information and freshness/staleness metadata. Add its refresh recipe to source operations with a fail-closed collector health result. | It appears correctly in Simple, Advanced and full Benchmarks lists for models with verified values; filters/composites use the documented category/weighting rules; a non-implementing engine independently verifies it live at desktop/mobile, light/dark. |

## 25. CR-20260916n — Information popovers must keep links usable (priority user-reported regression)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-53.1 | Any information panel that contains a link, button, or other interactive element stays open while pointer/focus is on either its trigger or panel. In particular, the Overview **Score** and **Adjusted Cost** information controls must let a pointer travel into the panel and activate **How we calculate** and source links. | Mouse regression test crosses trigger → panel and clicks each link without dismissal; no hover-gap race; links lead to the intended route/source; row/table interactions remain usable. |
| CR-53.2 | Interactive information panels are keyboard and touch usable: trigger has a correct accessible name/expanded state, keyboard can Tab into and activate panel content, Escape/outside action closes predictably and returns focus sensibly; touch has an explicit open/close route. Non-interactive brief tooltips need not become dialogs. | Automated accessibility/interaction coverage; manual keyboard and narrow touch-emulation checks; no focus trap or hover-only function. |
| CR-53.3 | Audit all shared information-panel instances, fixing the primitive rather than only the pictured Score tooltip where appropriate. | Independent live verification of Score and Adjusted Cost plus a sampled additional interactive info panel at desktop/mobile, light/dark; evidence records all audited panel types and any intentional non-interactive exception. |

## 26. CR-20260916o — Individual Epoch benchmark results, not only ECI

| ID | Requirement | Acceptance |
|---|---|---|
| CR-54.1 | Audit the complete current Epoch AI Benchmarking Hub/catalog and ECI input/evaluation records against Benchmark Heaven’s registry. Build a one-row-per-board inventory with inclusion state, official version, methodology/metric/direction, source/capture date, Epoch-run vs external-origin status, and original-project reuse terms where relevant. | Dated inventory accounts for every discovered official Epoch board/result set; existing selected coverage (DeepSWE, FrontierMath v2 tiers, SimpleQA Verified) is distinguished from uncollected boards; no claim that ECI alone covers raw results. |
| CR-54.2 | Ingest each additional verifiable and reusable individual benchmark from official Epoch results through the standard provenance-preserving pipeline, with separate benchmark identities, raw capture, source/version/date/basis and model mapping. Never conflate a board score with ECI or estimate missing scores. | Dataset/registry values trace to retained official evidence; parsing/direction/version/provenance tests pass; denied/uncertain external-origin rows are fail-closed and documented instead of published. |
| CR-54.3 | Make every verified individual Epoch board discoverable in the benchmark lists/tables and its detail/provenance UI, with accurate attribution and a taxonomy/category/composite decision based on methodology. Add source health and refresh procedures. | Simple, Advanced and full tables show qualifying data with correct metadata; source operations report current/stale/blocked state; a non-implementing engine independently verifies representative values and UI at desktop/mobile, light/dark. |

## 27. CR-20260916p — View switcher must not shift the page horizontally

| ID | Requirement | Acceptance |
|---|---|---|
| CR-55.1 | Switching Overview modes (**Simple**, **Guided**, **Advanced**) never moves the page shell, header, controls, or main content horizontally. Diagnose and correct the underlying layout/scrollbar/reflow cause, not a cosmetic transform. | Automated test captures identical horizontal positions before/after Simple → Guided → Advanced → Simple; both short/long mode content and scrollbar-reserving desktop configurations covered; no horizontal page overflow. |
| CR-55.2 | The correction is responsive and preserves scrolling, selected mode/focus behavior and reduced-motion expectations. | Independent live verification at desktop with classic scrollbar and at 390 px/mobile width, light/dark; no jump or compensating animation; keyboard mode selection remains correct. |

## 28. CR-20260916q — Read-only WebMCP tools for browser agents

| ID | Requirement | Acceptance |
|---|---|---|
| CR-56.1 | Feature-detect and register read-only, bounded WebMCP tools: `search_benchmarks`, `get_benchmark_results`, and `get_model_benchmark_summary`. Use explicit JSON Schemas, canonical identities, strict caps/cursors and structured errors. | Compatible browser inspector/agent discovers all three tools and invokes valid/invalid/boundary inputs; result payloads meet schemas and limits; unsupported browser has no error, fake shim, or broken visual UI. |
| CR-56.2 | Tool results use the same published projection semantics as the site and retain benchmark/model identity, value/unit/direction, version/as-of/source/methodology and material configuration. Null means unavailable, never estimated. Expose no secret, raw/unreviewed/private data, write action or identity tracking. | Contract tests compare representative tool output with public site/API data; security review demonstrates read-only behavior, input validation, no credentials in bundles/responses and bounded payloads. |
| CR-56.3 | Satisfy the supported WebMCP origin-isolation and `tools` permissions-policy model explicitly; only intended top-level/same-origin contexts expose tools. | Deployed headers/context test and cross-origin iframe denial/allowance test pass; no regression to normal pages/APIs. |
| CR-56.4 | Publish concise “For agents” documentation distinguishing WebMCP’s open-browser-tab requirement from the existing headless HTTP APIs, with schemas/examples, limits, sources/freshness/privacy and agent integration guidance. | Docs links work and accurately describe the deployed behavior; independent live review exercises every tool, unsupported fallback, desktop/mobile and light/dark. |


## CR-20260916a/b/c checklist — licence (CR-59), Union Alpha (CR-60), removal-on-request note (CR-61) — PRIORITY before launch
(Verbatim requests: sections CR-20260916a/b/c in 03-CHANGE-REQUESTS-VERBATIM.md.)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-59.1 | Add an MIT `LICENSE` (copyright productivity-boost.com Betriebs UG (haftungsbeschränkt) & Co. KG / Florian Standhartinger, 2026) and a README section 'Open source & data sources' (code licence; third-party benchmark data stays under its providers' terms with attribution) | GitHub shows the licence; README section present |
| CR-59.2 | Site footer and /about: 'Open source (MIT) · hobby project' with a link to the GitHub repository | Visible on all pages, light/dark, mobile (already live on 16 Sep — verify and mark) |
| CR-60.1 | Add Union Alpha to the model catalog (org Union Alpha / stealth, closed weights, 256K context, released 2026-09-16) with the OpenRouter offer `stealth/union-alpha` (free) and its providers; include it everywhere like any model | Model visible; identity map documented |
| CR-60.2 | Ingest the announced scores with provenance and a 'preliminary / chart-read / anticipated pricing' label: DeepSWE 73 % (OpenRouter run, via Cline + Alex Atallah posts, 16 Sep), Terminal-Bench v4.0 ≈ 52 % (Artificial Analysis chart via @opencode post); prefer exact values from the OpenRouter Benchmarks API / AA when available; never show anticipated cost as measured adjusted cost | Rows carry source URL, date, basis, preliminary flag; tooltip says chart-read |
| CR-60.3 | Price 0 on OpenRouter: show 'free (stealth preview)'; $0 must not break the value map/Pareto (pin as free per the existing rule) | Value map renders; free label |
| CR-61.1 | 'Data sources & removal on request' note on /about (short section) and one footer line linking to it: "Benchmark Heaven is a free, open-source, non-commercial hobby project. Benchmark results are shown with attribution and links to their original publishers (Artificial Analysis, Epoch AI, DesignArena, OpenRouter, …). If you publish benchmark data and would like your numbers removed or shown differently, email info@productivity-boost.com and we will act promptly." | Visible on /about and in the footer on all pages, light/dark, mobile; mail link works |


## CR-20260916d checklist — link previews (CR-62) — PRIORITY before launch

| ID | Requirement | Acceptance |
|---|---|---|
| CR-62.1 | Make the homepage (and every public page) small enough for link-preview crawlers: initial HTML ≤ 300 KB. Move the inlined dataset out of the server-rendered payload (fetch the JSON client-side / stream / cache in the browser), keep server-rendered head + hero for SEO. Same for /benchmarks, /compare, /charts etc. | curl size of / ≤ 300 KB with a WhatsApp/Twitterbot user agent; page still renders and works; Lighthouse not worse |
| CR-62.2 | Complete the preview tags: og:url (canonical), twitter:site @benchmarkheaven, twitter:creator @benchmarkheaven, og:locale; per-page og:title/description/image for /benchmarks, /compare, /benchmaxxing, /charts, /eu and model pages | Tags present per page; a proper /robots.txt (allow all, sitemap link) and /sitemap.xml exist |
| CR-62.3 | A better share image for launch: 1200×630 with the real product look (dark UI screenshot of the value map + ranking with the logo and tagline), plus a 1:1 variant; keep the existing text-only image as fallback | Image ≤ 1 MB, looks good in an X card and WhatsApp preview |
| CR-62.4 | Verify previews end to end after deploy: fetch with the Twitterbot, WhatsApp, TelegramBot and facebookexternalhit user agents (size + tags), then send https://benchmarkheaven.com/?v=<date> to Florian via `notify now` so he can confirm the card in X chat and WhatsApp | Report shows sizes per UA; Florian sees the card |


## CR-20260916r checklist — pre-release UI/UX gauntlet (CR-63) — PRIORITY before launch (17 Sep ~17:00 UTC)
(Verbatim: section CR-20260916r in `03-CHANGE-REQUESTS-VERBATIM.md`. Screenshots: `/home/flori/jobs/bh-ux-gauntlet-20260916/shots/`,
reviews: `…/reviews/`. Every row is small; no redesigns. **"optional"** = do only if cheap and safe; skip freely before launch.
Order = priority. Acceptance for every row: live on both hosts, 1440 and 390 px, light and dark, verified by a non-implementer.)

| ID | Requirement | Acceptance |
|---|---|---|
| CR-63.1 | **Move Benchmaxxing up in the main navigation**: second position after Overview on desktop (`Overview · Benchmaxxing · Benchmarks · Compare · Charts · More▾`) and on mobile (More menu order `Overview · Benchmaxxing · Compare · Charts · …`; additionally show it in the phone header next to Benchmarks where it fits without truncation, e.g. ≥ 375 px). **Plus a short teaser on the Overview page**, directly under the model table (above "Subscription costs may differ"), in the style of that row, e.g.: "⚠ **Benchmaxxing check.** Some models score high on one benchmark and slump on its siblings. We flag uneven results so you don't trust a single headline number. **See which models are flagged →**" (link to /benchmaxxing). | Nav order as specified on both breakpoints; phone header at 360/390 px still passes CR-6.1 (no overflow, targets ≥ 44 px, accessible names); at 320 px it may stay in More only; teaser visible in Simple (and Guided/Advanced if the table is there), link works, light/dark |
| CR-63.2 | **EU page: the main table is empty with default settings.** /eu shows "No SOTA model family matches the active global model filters" on a fresh visit (desktop and phone, still empty after 8 s). Likely cause (`components/EuSotaTable.tsx`): its model list (`entries`: GLM 5.1+, Kimi K2.6+, DeepSeek V4 Pro, MiniMax M2.7+) points at deprecated or non-featured models, and the defaults `Featured ✓` / `Hide deprecated ✓` remove every row. Fix the cause: update the list to the current top open models and/or don't apply the Featured filter on this page. If the table is legitimately empty, show a one-click "Reset filters" link. | Fresh visitor (no local storage) sees ≥ 1 row with EU prices; test for the default-filter case; the empty state has a working reset link |
| CR-63.3 | **Desktop "More ▾" menu doesn't close**: the `<details>` dropdown stays open after Escape, a click outside, or a click on Simple/Guided/Advanced (`components/Nav.tsx:101`) and covers page content | Closes on outside click, Escape (focus returns to the summary) and route change; keyboard operable |
| CR-63.4 | **Benchmaxxing page: make it clear in 5 seconds.** (a) Default tab **Strongest signals**, so the first rows carry ⚠ flags (the Featured tab currently shows only unflagged models, so a newcomer sees numbers with no meaning); (b) shorten the intro under the h1 to about: "The more jagged a model's results across related benchmarks, the more benchmaxxed it looks. A high signal is a screening flag, not proof of leakage." Move the reasoning-variant sentence into Advanced details; (c) state the weak/strong flag thresholds in the Signal (i) | Fresh load shows flagged models first; URL/tab state still works; intro ≤ 2 lines on desktop; thresholds match the Overview tags |
| CR-63.5 | Benchmaxxing table polish: (a) one bar scale for all tabs (now "scaled to 23.9" on Featured vs "37.8" on Strongest, so one model's bar changes length between tabs); move the caption into the (i). On phone the caption alone makes the header five lines tall; (b) model column: base name first, variant in muted small text (e.g. "Claude Fable 5.1" + "Adaptive Reasoning · Max Effort") instead of a truncated or six-line name; (c) the lone blue "A" before the selected row reads like a typo: explain it or drop it; (d) "17 tagged models" next to "Show all 19": label what each counts | 390 px: no row taller than 3 lines of name; same bar length for the same model in every tab; no unexplained letter |
| CR-63.6 | **Benchmark value formats on the model page** match the Benchmarks page: "0.88 fraction" → "88.0%", "46.1 percent" → "46.1%", "11.4 USD" → "$11.40", "77 points" → "77.0", Elo as "1625 Elo"; one decimal count per column (not "0.8" next to "0.58") | Same model × benchmark shows the same formatted string on /models/… and /benchmarks; unit test for the formatter |
| CR-63.7 | **Overview tags explained**: the table footnote ("Underlined prices … Striped score = …") also explains the two Benchmaxxing tag styles ("△ weak / ⚠ strong Benchmaxxing signal → what it means") and the ↗/↑ pricier and ↘/↓ cheaper badges (weak vs strong), with a link to /benchmaxxing; the Benchmaxxing tag gets a tooltip/aria description | Footnote present at 1440/390; tag tooltip reachable by keyboard and touch |
| CR-63.8 | **Same model, different "× pricier" in Simple and Advanced**: Claude Fable 5.1 shows "3.0× pricier" in Simple but "4.3×" in Advanced; Claude Fable 5 shows "8.2×" vs "12×". Say in the badge tooltip what the ratio compares against (e.g. "vs the median of models with a similar score in this list"), or use one reference set in both modes | The tooltip names the reference; if the numbers differ, the reason is visible |
| CR-63.9 | **Page titles**: every page except /benchmaxxing has the same `<title>` "Benchmark Heaven — Model benchmarks & costs" (/benchmarks, /compare, /charts, /eu, /about, model pages). Give each page its own title (model page: "Claude Opus 5 — benchmarks & cost \| Benchmark Heaven"). Coordinate with CR-62.2 (per-page og tags) | Distinct titles on all listed routes (curl check) |
| CR-63.10 | **Branded 404**: /models/does-not-exist shows Next's default unstyled "404 — This page could not be found." on white under the site header (the header was dark on that page while the body was white) | Themed 404 page in light/dark with links to Overview and the model search; HTTP status stays 404 |
| CR-63.11 | Value map (Overview Simple + Charts) cost axis ticks: "$10.00 · $3.00 · $1.00 · $0.3 · $0.1 · $0.03" → "$10 · $3 · $1 · $0.30 · $0.10 · $0.03" | Tick labels use one rule on both charts |
| CR-63.12 | Small copy fixes: (a) chart captions "Data: Artificial Analysis · Data: Epoch AI (CC BY)" → "Data: Artificial Analysis · Epoch AI (CC BY)" (value map and shortlist bar chart); (b) "25 models pass of 30 · 5 below your score line" → "25 of 30 models pass · 5 below your score line"; (c) phone hero: "updated 2026-09-16" breaks at a hyphen → no-wrap; (d) /about "see Sources above", but Sources comes below → "below"; (e) /eu "Azure Direct Globaloffers" missing space; (f) "Compare this model ↗" on model pages is an internal link → "→" | Each string fixed live |
| CR-63.13 | **One name for the composite score**: now "Benchmark Heaven Main Composite Score", "Benchmark Heaven Score (Main Composite Score)", "SCORE (Composite)", "Composite", "by Composite". Use "Benchmark Heaven Score" as the label, with "main composite" only as a subtitle where needed | grep of rendered pages shows one primary label; column header may stay short ("Score") with the (i) naming it |
| CR-63.14 | **Model page**: (a) add a compact Benchmaxxing line/badge near the Composite card for models with a signal ("Benchmaxxing signal 27.4 · strong → report"), linking to `/benchmaxxing?model=…#radar`; (b) the Composite card says "7 of 7 inputs", but the radar has 6 axes: label the missing one or explain it; (c) one line under "Top 5 cheapest providers": "Same list price can give a different adjusted $/task (caching, token efficiency) — click a price for its inputs." (identical $5/$25 rows show $5.74, $5.93, $10.69 with no hint) | Visible for a flagged model (e.g. GLM-5.2) and absent for an unflagged one; the input count matches the axes or is explained |
| CR-63.15 | **EU page copy and style** (CTO view): (a) the "catch" box names outdated leaders ("GLM 5.1+, Kimi K2.6+ … Claude Opus, GPT-5.x"); update to the current catalog wording or phrase it without version numbers; (b) the 12-line bold provider paragraph → one bullet per provider (TensorX, Inceptron, Scaleway, Nebius, NextBit) + one "policy exceptions" bullet, text only; (c) h1 matches the other pages' title size; (d) phone: the table header "EU-hosted / approved-equivalent offers (A…" is cut off → wrap or shorten; optional: replace ✅ 🟡 ⛔ heading emoji with the site's normal heading style | No outdated model names in the intro; paragraph scannable at 390 px; no clipped header |
| CR-63.16 | Benchmarks table: (a) the † on values (FrontierCode, CursorBench, Terminal-Bench …) gets a tooltip and a legend line under the table; (b) data-bar ends currently cut through digits (e.g. "3\|5.4", "4\|2.4%", "5\|2.0%"): keep the number fully readable (bar below text contrast or a text halo); (c) the Epoch ECI rows are the only rows without a tag chip: give them the same chip logic; (d) group subtitle "COMPOSITE INDICES 7 · composite of 2" → "7 benchmarks · 2 feed the group score" | Readable numbers at 1440/390 light/dark; † explained |
| CR-63.17 | Compare page: (a) the "Where each model is strongest" cards draw model B's bars in model A's blue; use each model's accent colour (as in the chips and radar legend); (b) "Simple · 7 axes" vs "Radar axes · 7 / 8 selected": make the wording consistent; (c) the model search's no-match state still shows the footer "Score: AA Intelligence Index of the strongest variant": hide it when there are no matches, and say "Benchmark Heaven Score" if the score shown is the composite | Colours match per model; no stray footer on no match |
| CR-63.18 | Phone value map (Overview Simple + Charts, 390 px): the labels "Claude Fable 5.1 / GPT-6 Astra / Kimi K3" and "Most attractive quadrant" overlap. Label only non-colliding Pareto points on narrow widths; the rest on tap | No overlapping labels at 360/390 px |
| CR-63.19 | /about: add a short "Benchmaxxing signal" paragraph (what it is, that it's a screening flag, link) next to the adjusted-cost and score explanations | Section with anchor `#benchmaxxing`; linked from the /benchmaxxing (i) |
| CR-63.20 | *optional* — Charts intro: "cheapest models" and "open vs closed" become anchor links like "Leaderboard" and "score against cost" | Links jump to the sections |
| CR-63.21 | *optional* — Benchmarks page on phone: rows with 3–4 tag chips are very tall; show at most two chips + "+N" (or chips only when expanded) | Row height reduced at 390 px, all chips still reachable |
| CR-63.22 | *optional* — naming consistency: benchmark names mix "AA-Omniscience", "…(AA)", "MLCR-AA", "Artificial Analysis Coding Agent Index" vs "AA Coding Agent Index"; hero line 1 sentence case vs line 2 title case; "BETA — Work in progress" pill → "BETA" on launch day; one glyph per meaning (→ internal link, ↗ external, › / ▸ expand). Display-only renames, never identity keys | Consistent display names; no identity or URL change |
| CR-63.23 | *optional* — reliability note: one headless load of /compare (dark, desktop) took 32 s and returned **"Gateway Timeout"** at ~21:50 UTC on 16 Sep; six immediate retries were 200 in < 0.1 s. Check the proxy/app logs for 504s around then (possibly a deploy or the 8 MB pages, see CR-62.1) | Cause noted in the ledger, or "not reproducible" with the log excerpt |

**After implementing (required by Florian):** send Florian **one `~/bin/notify now --photo` per 3–5 improved screens**, before/after where possible
(the before shots are in `/home/flori/jobs/bh-ux-gauntlet-20260916/shots/`, e.g. `d-light-home-1.png`, `m-light-moremenu.png`,
`d-light-eu-1.png`, `d-light-benchmaxxing-1.png`, `d-light-model-2.png`), plain English caption naming what changed. No other messages.


## CR-20260916h checklist — no cost metrics in Benchmaxxing (CR-64) — PRIORITY before launch

| ID | Requirement | Acceptance |
|---|---|---|
| CR-64.1 | Benchmaxxing analysis (signal score, per-model report, radar, cohort comparisons) uses CAPABILITY metrics only: exclude every cost-, price-, tokens-per-task-, latency-, speed-, throughput- and efficiency-type metric (e.g. 'Vals Index v2 cost per test', tokens per task, cost per task) — including the whole 'Efficiency' category — from the signal computation and from the radar axes. Add an explicit `kind: cost|efficiency|capability` flag per benchmark in the taxonomy so the exclusion is data-driven, not by name matching | Unit test: no cost/efficiency metric contributes to any signal or radar; taxonomy flag present for all benchmarks; the Fable 5.1 report no longer shows the Vals cost spike |
| CR-64.2 | Cost/efficiency metrics stay visible elsewhere (adjusted cost, cost modal, model pages) with their own labelling; the Benchmaxxing page states in one line that cost/efficiency metrics are excluded by design | Copy present; nothing else lost |
| CR-64.3 | Recompute the Benchmaxxing signals/cohorts after the exclusion and check that the ranking and the 'featured' set still make sense (before/after diff in the ledger) | Diff recorded; no model flagged only because of a cost metric |


## CR-20260916s checklist — pre-release data & math gauntlet (CR-65) — PRIORITY: math/data rows before launch, radar rows next
(Verbatim: section CR-20260916s in `03-CHANGE-REQUESTS-VERBATIM.md`. Evidence and worked examples: `/home/flori/jobs/bh-data-math-gauntlet-20260916/{MATH-AUDIT.md,DATA-AUDIT.md,CORRECTIONS.json,shots/}`.
Each row: what is wrong · the fix · the regression test to add. **P0 before launch: 65.1, 65.2, 65.5, 65.8, 65.12. P1 before launch where possible, else first thing after: 65.3, 65.4, 65.6, 65.7, 65.9–65.11, 65.13, 65.14. P2 and the radar rows 65.17–65.18 next.** CR-65.10 must land before CR-60.2. Every row that changes a published number records a before/after diff in the ledger.)

| ID | Kind | What is wrong → fix | Regression test / acceptance |
|---|---|---|---|
| CR-65.1 | P0 math | **Composite family backfill copies effort-specific results and takes the family maximum** (MATH-AUDIT C1, N1, N2). `claude-opus-5::non-reasoning` shows AA Intelligence 50.7 / AA Coding 78.0 of `::max` and composite 90.15; `kimi-k3::default` = `::max` 91.02; 74 rows borrow an AA index, ≥15 from deprecated donors; `/about#identity` says the opposite of the code. Fix: backfill only family-scope sources (Epoch ECI, DesignArena), never AA Coding / AA Intelligence / Coding Agent across efforts; no `max`, no deprecated donors unless noted; align `/about#score` and `#identity`. | Fixture test: `::max` AA II 50 + `::non-reasoning` with only Coding Agent → non-reasoning `aa_intelligence_index` null and composite independent of 50; test that no current row takes a value from a deprecated sibling without a note; value map re-verified. |
| CR-65.2 | P0 math | **Composite percentiles use different populations per slot ("cohort bias")** (C2, C3). Same models: DesignArena percentile −22.6, Coding Agent ≈ −28 vs AA Intelligence; deleting a model's DesignArena result raises its composite +7.7 on average (Grok 4.20 +23.6); one DesignArena rank step is worth 6.6× an AA Intelligence step. `/about` claims hard and easy boards "count equally". Fix: impute missing slots by cross-slot linking (fit on models with both slots, or equipercentile-link each slot to the AA Intelligence scale) instead of own-mean; percentiles with mid-rank ties over rows; say the composite is rank-based. | Property test: synthetic catalog where slot B exists only for the top 30 % of slot A with identical order — deleting a model's B value changes its composite by < 2 points; recompute and diff the top 40 in the ledger. |
| CR-65.3 | P1 math | **Dominance projection moves well-measured models because of thin rows** (C4): `gpt-5.2-codex::openrouter` 26.4 → 52.7, `claude-opus-5::low` 86.0 → 90.15 (four-way tie). Fix: one-sided projection (only lower the less-covered row); show "adjusted from X" when the change > 1 point. | Test: adding a thin dominated row never changes the dominator's final score; all projection constraints still hold. |
| CR-65.4 | P1 math | **Thin composites rank among leaders** (C5): `gpt-5.5-pro::xhigh` (0 exact inputs, 1 attached ECI) ranks 27 of 839 at 90.05; 293 rows rest on one slot. Fix: default sort puts composites with < 3 inputs in an "insufficient evidence" band below measured rows; show "n/7 inputs" next to the number. | Test: a 1-slot row never sorts above a ≥ 3-slot row in the default Overview sort; live check of the first 30 rows. |
| CR-65.5 | P0 math | **Benchmaxxing signal is biased towards mid-table models** (B1). Null simulation without any benchmaxxing: 97 % of the top-10 % "uneven" models are mid-pack (spread 18.6 mid vs 5.4 top); real data corr(score, abs(mean pct − 50)) = −0.61; all 16 strong tags have mean percentiles 39–70, no frontier model can be tagged. A level adjustment changes 7 of 16 named tags. Fix: divide by (or regress out) the spread expected at the model's mean percentile, fitted on the catalog (or residual spreads on a logit scale); re-publish the tag list with a before/after diff. | Release test: simulated catalog without benchmaxxing → tagged share within ±10 pp across level bands; unit test for the expected-spread fit; ledger diff of tags. |
| CR-65.6 | P1 math | **Tag boundary is noise-level; ⚠ pill contradicts the tag** (B3, B4). Strong cut 27.02 vs first weak 26.94; Kimi K2-0905 strong on 7 comparisons; shrinkage k sits at its floor 2; `SIGNAL_WARN = 25` puts the same ⚠ on all 16 weak rows and the InfoTip claims 25 "is where today's tag starts". Fix: bootstrap interval per model, strong/weak only when the interval clears the cut; ≥ 10 comparisons for a named tag; k floor ≈ 6; pill and copy driven by `level`, never a fixed number. | Tests: a 6–9-comparison model at the cut is untagged; pill renders only for strong/weak with distinct styles; InfoTip text contains no fixed threshold. |
| CR-65.7 | P1 math | **"Related benchmarks" include non-capability and judged topics and very broad topics** (B2 remainder, B5). After CR-64: Uncensored (UGI willingness), Writing/Roleplay (judged taste) still enter (they move Kimi K2-0905's tag); "Agentic" mixes 42 unrelated boards; frontier-only vs all-comers boards differ by ~25 percentile points for the same model. Fix: exclude judged/preference and Uncensored axes; compare within skill-aligned pairs (same test via different publishers, e.g. AA ↔ official Terminal-Bench, SciCode, CritPt, GPQA via OpenRouter) or use common-cohort percentiles per pair. | Test: the signal is unchanged when a judged axis is added; percentile of a model on two boards with identical order but different cohorts is equal. |
| CR-65.8 | P0 math | **Adjusted cost multiplies each model's own usage mix** (E1). Input tokens = AA output tokens × the model's OpenRouter I/O ratio (3 → 115). Same $10/$50 price: Fable 5.1 max 78k × 88.8 = 6.9 M input tokens → $73.29/task; GPT-6 Astra (fallback 22.4) $7.45; with one common ratio Fable is $21.38 — 70 % of the gap is who uses the model. Fix: compare on one common workload (fixed input tokens per task or output × one ratio, user-selectable, default the documented global ratio); per-model usage only as an optional "as used on OpenRouter" view. | Invariance test: two models with identical prices and tokens/task get identical adjusted cost regardless of usage mix; value tags and Pareto re-verified and diffed. |
| CR-65.9 | P1 math | **Cache assumptions contradict the docs** (E2, D7). `/about` says unknown cache-hit = 0 %; code applies the 72.6 % OpenRouter median to every route without an observation, including direct routes ("direct routes never borrow OR data"); cache writes always 0; Fable 5.1 cache-read $0.25 = 2.5 % of input (all other Claude models 10 %). Fix: correct `/about`; apply the baseline only where read and write prices are published, model write premiums; verify Fable 5.1's read price at Anthropic/Vertex. | Test: a direct route without its own observation gets no OpenRouter-derived rate unless documented; build warning when read/input is outside the provider's usual band. |
| CR-65.10 | P1 data | **Preliminary/self-reported values can enter category scores** (K1, N3) — must be fixed before CR-60.2 ingests Union Alpha's DeepSWE 73 % / Terminal-Bench ≈52 % (both Coding anchors). `buildBenchmarkMatrix` uses basis `all`; best-of merge is basis-blind. Fix: new `preliminary` basis, display-only; category scores, composite, percentiles, saturation, Benchmaxxing and value tags use measured values only; best-of prefers measured. | Fixture: a model with a preliminary anchor has no category score and other models' percentiles/saturation are unchanged; best-of picks measured over a higher self-reported value. |
| CR-65.11 | P1 data | **Coding Agent Index: versions mixed and unlabelled** (K4, D4). Table best-of takes max(v1.4, v1.5) per model; Overview/score picker show v1.4 as "Coding Agent" while AA shows v1.5 (Fable 5.1 70.4 vs 62.2, Qwen3.8 Max 61.3 vs 43.3, Gemini 3.8 Flash 60.2 vs 41.9 — the order changes). Fix: best-of only within one version; label the pinned value "v1.4 (snapshot 9 Sep, retired by AA)" everywhere; plan composite v3 on v1.5. | Test: a merged row never holds values of two versions; rendered label contains the version wherever the pinned value appears. |
| CR-65.12 | P0 data | **Nova Micro GPQA Diamond 89.1 % is another model's result** (D1): OpenRouter row equals Claude Opus 4.7's accuracy and cost/task to 3–4 digits; AA measures Nova Micro at 35.8 %. Fix: withhold the value and its cost twin; add a cross-source guard (OpenRouter run > 25 pp above the family's AA result, or cost/task that the list price cannot explain → withheld for review). | Test: fixture with such a row is withheld with a reason; live: Nova Micro shows no OpenRouter GPQA value. |
| CR-65.13 | P1 data | **OpenRouter reasoning-mode runs attached to non-reasoning rows** (D2): `deepseek-v4-flash::non-reasoning` holds GPQA 0.866 (= AA `::high` 0.867; AA non-reasoning 0.716) and τ²-Airline 0.751, because the representative prefers the only active row; same path for `gemini-2.5-flash` and `qwen3.5-35b-a3b`. Fix: choose the variant from `include_run_config` effort; never fall back from a reasoning run to a non-reasoning row (attach to the deprecated matching row or withhold). | Test: a reasoning run never lands on a non-reasoning variant; live check of the three families. |
| CR-65.14 | P1 data | **AA component results are 6 days behind the AA headline indices** (D3): all ~25 AA per-benchmark boards retrieved 10 Sep, headline 16 Sep; Elo boards drifted (GLM-5.3 GDPval 1667.3 vs live 1655.2); 6 models with 16 Sep headline values have no component rows (no category score, no Benchmaxxing, no table rows). Fix: refresh the component snapshot in the daily run under a new dated identity. | Build check: fail when a model's AA headline index is > 3 days newer than its component snapshot without component rows; live: Qwen3.8 Max 0902 has component rows. |
| CR-65.15 | P2 data | **Small data fixes** (D5, D6, D8, D9, D10): rename "DesignArena Frontend" → "DesignArena Web Apps (agentic)" and link that board (values verified correct; the site's own Frontend page is a different board, +60–80 Elo); Elimination Game lists "Gemini 2.5 Pro" twice → withhold or map to snapshots; round float price artefacts (0.9552599999999999); tooltip "as published on <date>" and a note where a source removed a point (Cursor Terra, AA Coding Index chart, LiveBench re-scored); disambiguate "Harvey LAB-AA" vs Vals "HLAB". | Build checks: two source rows of one board may not map to one model with different values; prices have ≤ 6 significant digits; label test for the DesignArena rename. |
| CR-65.16 | P2 docs | **Method texts out of step with code** (C6, C7, K2, K3): `/about#category-scores` says "plain average" (saturated anchors weigh ½); anchors note says "widest coverage" (code: newest version); Elo→expected-score is explained as normalisation but has no effect after ranking; percentile populations include deprecated rows; category scores are not comparable across categories. Fix: update `/about`, anchors note and the category (i). | Test: `/about` snapshot contains the weighting sentence; copy review by a second engine. |
| CR-65.17 | UI radar | **Compare radar mixes scale conventions on one polygon** (R1): AA Intelligence/HLE/Terminal-Bench on their native 0–100 scale, ECI/DesignArena on peer min–max; the #1 family on AA Intelligence (Fable 5.1 `::high` 51.2) is drawn near the centre (zoom floor 40) while ECI sits on the rim — the shape says "weak at AA Intelligence", which is false. Detailed mode calls itself "the Benchmaxxing view" but uses these mixed scales, not Benchmaxxing percentiles. Fix: default Simple and Detailed radar to one convention (percentile among current models, as on /benchmaxxing), native scale as a toggle; state the convention under the chart. | Test: for any axis set, the model with the highest value on an axis is plotted at the largest radius on that axis; screenshot check 1440/390 light/dark. |
| CR-65.18 | UI radar | **Benchmaxxing radar tells the story only partly** (R2, B6; screenshots in `~/jobs/bh-data-math-gauntlet-20260916/shots/`). (a) No reference: add a faint band for the spread expected at the model's level (or the catalog median outline) so "jagged" has a baseline; (b) percentile-0 points collapse into the centre and read as spikes — start radius at a small inner ring and draw 0 there; (c) ring labels (0/50/100 percentile) missing; (d) 390 px clips the "Long-context" topic label; (e) copy "The more jagged the shape, the more benchmaxxed the model looks" overstates — use "Jumps between neighbouring benchmarks of one topic are what the signal measures; they are common for mid-table models and can come from different test populations. A screening flag, not proof." (coordinate with CR-63.4's intro); (f) frontier models look smooth because they sit at the rim — say so in the method note. | Screenshot verification 1440/390 light/dark for a strong-tag model and a frontier model; text test for the copy; label bounding boxes inside the SVG at 390 px. |


## CR-20260916t checklist — daily data pipeline reliability (CR-66) — PRIORITY: 66.1 and 66.2 next after the launch P0 rows
(Verbatim: section CR-20260916t in `03-CHANGE-REQUESTS-VERBATIM.md`. Evidence: `/home/flori/jobs/bh-pipeline-reliability-20260916/PIPELINE-AUDIT.md`;
the out-of-repo gate and its 32 tests: `/opt/benchmarkheaven-daily/gate/` (README.md). Do not remove or bypass the gate hooks; `gated-run.sh` and
`gate/` are not installed by `ops/daily/install.sh` on purpose. Every row: a test, and one scheduled 05:17 run that publishes on its own.)

| ID | Kind | What is wrong → fix | Regression test / acceptance |
|---|---|---|---|
| CR-66.1 | P0 reliability | **The OpenRouter removal gate stops the whole daily run almost every day.** 14 of 41 runs 11–16 Sep died in `assertIdentityCoverage` because OpenRouter removed a `:batch` variant, a preview model or one provider endpoint (e.g. `openai/gpt-4-turbo-preview`, `z-ai/glm-5.3-flash` Makora/CoreWeave endpoints). Fix: a bounded removal is a dated withdrawal, not an error — re-fetch once after ≥ 60 s; still absent → keep the identity as `withdrawn_at: <date>` (deprecated/hidden, not priced) and list it in the run report; fail only above max(10 models, 2 %) or 5 % of endpoints per run (same bounds as the publish gate). | Fixture: 5 removed catalog ids + 2 removed endpoints → run publishes, withdrawals listed with date; 60 removed → run fails; a withdrawn id that returns is restored. Then one unattended 05:17 run publishes. |
| CR-66.2 | P0 reliability | **The publish gate hangs off git hooks with a 120 s git timeout** and is skipped by manual `bash ops/daily/run.sh` runs. Fix: `daily.mjs` calls `node $BH_DAILY_HOME/gate/gate.mjs precommit` / `prepush`-equivalent explicitly before `commit-data` / `push-data` with its own timeout (≥ 6 min), stores `gate/verdict.json` in `run-report.json`, and refuses to publish when `BH_GATE_REQUIRED=1` and the verdict is missing or not PASS. Keep the hooks as a second line. | Test with a stub gate: FAIL or missing verdict → no commit/push, exit ≠ 0; PASS → publishes; verdict hash bound to the committed `data/dataset.json`. |
| CR-66.3 | P1 cost | **The in-repo gauntlet uses paid OpenRouter models** (DeepSeek V4 Flash 0731 at AA 34.5 — 0.5 above the line —, GLM-5.3 Flash, DeepSeek V4.1 Flash; $0.02–0.17 per published run, ≈ $0.53 over 44 runs) and they caused 12 run aborts (timeouts, `length`, malformed JSON). No free model can qualify: the rule takes the AA *minimum over variants* and only looks at the OpenRouter catalog. Fix: add the free chain as candidates — Chutes Kimi K3 / Qwen3.8 27B through the LiteLLM direct groups (`fw-kimi-k3`, `fw-qwen3.8-27b`, `127.0.0.1:4010`) and Union Alpha (`ua-openrouter`) while free — qualified by the AA score of the variant/effort actually requested; paid models stay as fallback; health order from `~/.llm-health.json`. | Selection test: with healthy free models the producer and critic are free and of different families; with all free models unhealthy the paid pair is chosen; receipts show $0 for free calls. One scheduled run with 0 paid calls. |
| CR-66.4 | P1 evidence | **`npm test` writes test fixtures into the production evidence folder**: the 16 Sep `sources/live-manifest.jsonl` contains 18 `openrouter.ai/api/v1/models/fixture/other-N/endpoints` captures because build/test steps inherit `BH_EVIDENCE_DIR`/`BH_STATE`. Fix: unset both for `npm-build`, `npm-test`, `typecheck`, `prerender`. | After a daily dry run the live manifest has no `/fixture/` URL; unit test on the step environment. |
| CR-66.5 | P1 data | **Two OpenRouter endpoints share one tag** for some BaseTen routes (16 offers on 16 Sep: `glm-5.2` baseten/fp8 + baseten/fast, `deepseek-v4-pro(-0813)` baseten/fp4, `deepseek-v4-flash-0731` baseten/fp8, `kimi-k2.6` baseten/fp4, `inkling` baseten/fp8, `nemotron-3-ultra-550b-a55b` baseten/fp4); which one we publish is undefined. Fix: offer identity = tag + endpoint name (or quantization + context), both kept, or a documented rule (e.g. cheapest) with the other recorded. | Fixture with duplicate tags → deterministic, documented result; the publish gate can locate every OpenRouter offer (0 ambiguous). |
| CR-66.6 | P1 ops | **`ops/daily/notify.mjs` posts to Telegram directly** (`TG_BOT_TOKEN`), against the house rule (`~/bin/notify` only). Fix: top-5 entrants / major new family / divergence events → `notify now`; drop the weekly failure alert (the gate's `finalize` now sends `notify now` on the second consecutive failure); keep dedup state. | Test with a stub `notify` binary: events call `notify now` once; no direct `api.telegram.org` request remains in `ops/daily`. |
| CR-66.7 | P2 freshness | **No partial (prices-only) run.** `daily.mjs` requires all core sources dated today and a full build (35–45 min), so the 6-hourly price watch can only start a full refresh (at most once a day). Fix: `daily.mjs --scope prices`: OpenRouter + provider catalogs only, benchmark/efficiency snapshots kept with their own dates, build/tests/gate as usual; `gate/price-watch.mjs` then calls `gated-run.sh --price-drift --scope prices`. | Test: in prices scope benchmark sources keep their dates and the freshness check passes; a price change publishes in < 15 min. |
| CR-66.8 | P2 reliability | **A critic PASS that cannot be bound to rows aborts the run** ("pass without a bounded row-level revision", `ops/daily/gauntlet.mjs:423`; runs 14 Sep 05:02, 16 Sep 05:45) instead of retrying the round with the next critic. Fix: treat it like a transport failure for that round (next critic, bounded by the existing 3 rounds). | Fixture critic returning PASS with an unbound finding → next round with another model, not an abort. |
| CR-66.9 | P2 ops | **Stale secondary sources are invisible**: 17 non-fatal collectors keep old snapshots silently. Fix: include `ops/daily/source-health.mjs` output (sources older than 3 days) in `reports/summary.txt` and the run report, so the gate's digest line can name them. | Test: a collector failing 3 days in a row appears in the summary with its last good date. |


## CR-20260917 checklist — failed refresh recovery and visitor analytics (CR-67)
**Priority:** CR-67.1–67.3 first. This is a continuation of CR-66, not a second pipeline or writer. The verbatim request in `03-CHANGE-REQUESTS-VERBATIM.md` wins. Existing gate rules remain fail-closed for values without a primary-source basis.

| ID | Requirement | Acceptance |
|---|---|---|
| CR-67.1 | Diagnose the `aa_coding_v15` producer/critic disagreement from the retained primary-source capture. Correct a demonstrably wrong parser/value, or quarantine the sole unproven row with its source/decision recorded. Never suppress evidence or make a critic overrule producer uncertainty. | A focused regression fixture reproduces the exact disputed-row class; it proves the selected resolution. The run report names the withheld/corrected record and source basis without secrets. |
| CR-67.2 | One disputed row must not block otherwise source-verified independent updates. Make the daily merge isolate a bounded, documented quarantine from unrelated accepted rows while preserving existing blast-radius, source-contract, and gate checks. | Test fixture: one disputed row + accepted changes → a candidate dataset containing only the accepted changes reaches the gate; an unbounded/multi-row dispute still fails closed. |
| CR-67.3 | Publish a fresh daily dataset after CR-67.1/67.2, through the normal gate; independently check live canonical and legacy hosts for the published date/commit and the corrected/withheld record. | Evidence shows a PASS verdict bound to the committed dataset, published=true, live source/date confirmation on both hosts, and no gate bypass. |
| CR-67.4 | Select and implement privacy-preserving visitor analytics for aggregate operator insight: visits, lawful unique-visit count if available, top pages and referrers; first-party where practical, EU processing, no ads, cross-site tracking, fingerprinting, visitor profiles, or Google-account identity reuse; minimal documented retention. | Independent code/network review proves no ad/tracker calls, identity linkage, fingerprinting or visitor-level export. Operator dashboard/API returns only aggregate metrics. Analytics credentials never enter source, logs, prompts or evidence. |
| CR-67.5 | Make the consent decision from the actual implementation, not marketing language. Audit device access/storage, identifiers, fingerprinting, third-party transfers, processing roles and retention against current TDDDG §25/GDPR guidance. | A concise cited decision record identifies the implementation and says either (a) no consent is required, with a technical test proving no non-essential device access/identifier; or (b) consent is required, with the reason. It is reviewed independently before deployment. |
| CR-67.6 | If CR-67.5 says consent is required, add an accessible prior-consent flow: analytics does not load before opt-in; Accept and Reject are equally easy; details, withdrawal and documented consent are present. If consent is not required, do not add a banner. | Desktop/mobile keyboard/touch tests confirm the selected branch. In consent-required mode, network tests show zero analytics requests before consent and after rejection; withdrawal stops it. |
| CR-67.7 | Replace the current privacy-page statement that the site has no analytics with an exact, readable disclosure: provider/controller/processor, data categories, purpose, legal basis, device access/consent status, EU location/transfer status, retention, contact/objection or withdrawal method. | Live `/privacy` agrees with the deployed configuration, has no generic or false claims, and is independently reviewed. |


## CR-20260917b checklist — Benchmaxxing: fair topics, no self-pairs, explain the drivers (CR-68) — PRIORITY: 68.1–68.4 BEFORE the launch today (17:00 UTC); a named model must not carry a ⚠ tag that these rows remove
- **CR-68.1** Vertical-domain boards (legal, finance, spreadsheet/Excel, medical, tax, etc. — e.g. Vals Finance Agent v2, HLAB, Legal Research Bench, Excel Modeling, CorpFin, TaxEval, MedQA-type) are not compared within-topic with general boards. Give each domain its own topic (compared only with boards of the same domain) or mark them `domain` in the taxonomy and exclude them from the signal pairs. Document the rule on /about and the Benchmaxxing page. Regression test: GPT-6 Astra's spread with/without these boards; publish before/after tag list in the ledger evidence.
- **CR-68.2** Never pair an aggregate index with its own components (Vals Index v2 ↔ its component boards; AA Intelligence/Coding/Agentic indices ↔ their components; any composite ↔ inputs). Taxonomy field `componentsOf`/`aggregate`; test.
- **CR-68.3** Per-model report "What drives this score": the 3 benchmark pairs contributing most (both percentiles, topic), raw spread, level factor, shrinkage, and one plain sentence that differences *between* topics (specialisation) are not counted — so a radar that is jagged between topics is not a flag. Show domain specialisation next to it with that explanation.
- **CR-68.4** Tag honesty given shrinkage at its cap: after 68.1/68.2, re-run the data-math critic's null simulation and the bootstrap. Tag a model only when the evidence survives (lower interval bound above the band below it, or an equivalent test the critic accepts); if nothing survives, show "no model is credibly flagged" instead of tagging a fixed share. Wording of the pill stays "screen, not proof".
- **CR-68.5** (after launch) Same benchmark measured by two runners (e.g. Terminal-Bench 2.1 by Vals vs by AA): once harness/version equality is verified, show a large disagreement as its own "runner disagreement" evidence line; if the versions differ, don't pair them at all.
- NOTE 17 Sep ~11:10 UTC: CR-68.1–68.4 wait for the calibration job `~/jobs/bh-benchmaxxing-calibration-20260917/` (result by 14:30 UTC, filed as a new CR). CR-68.3 ("What drives this score") may proceed; don't implement 68.1/68.2/68.4 on your own design meanwhile.


## CR-20260917c checklist — Benchmaxxing = headline-vs-held-out direction (CR-69) — PRIORITY BEFORE the launch today (17:00 UTC). Supersedes CR-68.1, CR-68.2 and CR-68.4 (close them as "superseded by CR-69"); CR-68.3 stays but shows the new drivers (69.4); CR-68.5 unchanged. **Launch rule: if CR-69.1–69.5 are not live and live-verified by 16:00 UTC, launch with every Benchmaxxing ⚠ tag hidden (scores/page may stay, no model named as flagged). Do not launch with the current tags** — the calibration shows they flag the wrong models (GPT-6 Astra, GPT-5.6 Terra, GLM-5.3 …).
Evidence and reference implementation (Python, reproduces the live view): `~/jobs/bh-benchmaxxing-calibration-20260917/` — `RESULT.md`, `EXPERIMENTS.md`, `harness.py` (`raw()` with `measure='signed'`), `final.py` (bootstrap + tags), `final.json` (expected scores on the 17 Sep ~11:00 UTC view), `benchmark-tiers.json`.

| Row | Work | Acceptance |
|---|---|---|
| CR-69.1 | **Tier table.** Copy `~/jobs/bh-benchmaxxing-calibration-20260917/benchmark-tiers.json` to `data/benchmaxxing-tiers.json` (keyed by registry family; `aa-terminal-bench@4.0` is a version-specific override: v4.0 = heldout, v2.1 = headline). Tiers: `headline`, `heldout`, `domain`, `secondary`, `aggregate`, `judged`; each entry keeps its one-line reason. A signal board without an entry is `secondary` (not used) and a unit test lists untiered boards with ≥10 models so new boards get a deliberate tier. | JSON loads; test fails when a board with ≥10 measured models has no tier; /about shows the table (board, tier, reason). |
| CR-69.2 | **Score.** Replace the within-topic unevenness in `lib/benchmax.mjs` (`rawBenchmaxxing`) by: axes = `isSignalAxis` ∧ tier ∈ {headline, heldout}; for every pair (H headline, X held-out) with the **same registry category** that both carry a result for the model and whose common cohort qualifies (existing `BENCHMAXX_PAIR_MIN_MODELS` = 10 models from ≥3 families), gap = common-cohort percentile on H − on X (signed; existing `commonCohortRanks`). Raw score = plain mean of all gaps. n = distinct H boards + distinct X boards used − 1. Eligible: n ≥ 6 and pairs from ≥ 2 categories. No level adjustment (drop `fitLevelCurve` use). Shrink toward **0**: score = n·raw/(n+k), k by the existing empirical-Bayes estimate (squared deviation from the eligible mean regressed on 1/n), clamped 6…50 (17 Sep: k = 6). Domain, aggregate, judged and secondary boards never enter a pair (this is what CR-68.1/68.2 asked for). | On the 17 Sep snapshot the JS scores equal `final.json` `pool` within ±0.2 for all 130 scored representatives (e.g. GPT-6 Astra max −7.0, Claude Opus 5 max −7.8, MiMo-V2.5-Pro +9.2, Hy3 +5.8, Qwen3.5 122B +18.0). Unit tests: no aggregate/judged/domain/secondary axis appears in any pair; a model with pairs in one category only is not eligible; sign convention (better on headline ⇒ positive). |
| CR-69.3 | **Tags.** Family representatives as today (CR-21.1). Pool = representatives with n ≥ 10. Strong band = top 10 % of the pool, weak band = next up to 20 %. Bootstrap per banded model: 400 seeded replicates (seed = model id), resample the model's headline boards and its held-out boards separately with replacement, each pair weighted by (draws of H × draws of X), same shrinkage; 80 % interval. A banded model is tagged **only if the interval's lower end is > 0** (replaces "above catalog average"). If no model passes, show "no model is credibly flagged". | 17 Sep snapshot: strong = Qwen3.5 122B A10B, Qwen3.5 397B A17B, Qwen3.6 35B A3B, MiniMax-M2.7, Qwen3.6 27B, Nemotron 3 Ultra 550B, Qwen3 Coder Next, MiMo-V2.5-Pro; weak = Kimi K2.6, Mistral Medium 3.5, Gemini 3.1 Pro Preview, Qwen3.7 Max (small differences acceptable only where an interval bound is within 0.3 of 0 — list them in evidence). **Regression tests (fixture = 17 Sep view):** GPT-6 Astra, Claude Opus 5, GPT-5.6 Sol, Claude Fable 5.1, Kimi K3 untagged; pair accuracy LOW{Astra, Opus 5, K3, Fable 5.1, Sol} < HIGH{GLM-5.2, MiniMax-M3, MiMo-V2.5, Ling 3.0 Flash, DeepSeek V4.1 Flash, Nex-N2-Pro, Ring-2.6-1T, Hy3, MiMo-V2.5-Pro} ≥ 0.85; mean score of LOW < 0 < mean score of HIGH. Test must never use model names/labs as algorithm input — names only in the fixture. |
| CR-69.4 | **Texts and "What drives this score" (CR-68.3 adapted).** Benchmaxxing page and /about: the three sentences from CR-20260917c verbatim-in-spirit, the plus/minus reading ("plus = better on famous public tests than on tests nobody can train for; zero = no sign"), "screen, not proof", and the caveat that a gap can also mean weaker long agent work. Per model: the 3 pairs with the largest positive gaps and the 3 largest negative (both percentiles, category, cohort size), raw mean, n, k, interval. Radar: mark each axis headline/held-out (e.g. filled vs hollow dot); boards not used are greyed. Remove level-adjustment wording. | Live page and /about show the rule, the tier table link and drivers; no text mentions "unevenness"/"level factor" as the score any more. |
| CR-69.5 | **Verify before launch.** Rebuild, run tests, compare with `final.json`, live-check /benchmaxxing, the Overview tag column and one model page (GPT-6 Astra: no tag, score ≈ −7; MiMo-V2.5-Pro: strong tag). Ledger evidence: before/after tag list. If not verified by 16:00 UTC → hide all ⚠ Benchmaxxing tags for launch (config flag), keep CR-69 open, finish after launch. | Evidence file under `/opt/benchmarkheaven/state/ux-evidence/`; decision (live vs hidden) recorded in PROGRESS by 16:00 UTC. |


## CR-20260917d checklist — thin evidence: in-place sorting with a visible uncertainty marker (CR-70) — PRIORITY: before launch if it fits; it reverses the separate "zu wenig Belege"/thin-evidence group
- **CR-70.1** Remove the separate thin-evidence section/group in every sorted table (Overview/ranking, shortlist, presets, mobile cards). Thin models are sorted by their score together with all other models (same sort key, no demotion), in every sort direction and filter.
- **CR-70.2** A clear, compact marker on those rows: e.g. muted/striped score with a "thin data" badge (icon + short label such as "Few benchmarks"), tooltip/(i) with the number of benchmark results behind the score and the plain sentence "Based on few benchmarks — this position is uncertain". Where an uncertainty range exists, show it (e.g. ± or a light range bar). Accessible (not colour only), works at 390 px, legend entry.
- **CR-70.3** Keep the existing definition of "thin" (same threshold as today's group); column charts and Compare/radar use the same marker. Regression tests: a thin model with a high score sorts above a well-covered model with a lower score and carries the marker; no separate group header renders.


## CR-20260917e checklist — Benchmaxxing tab changes (CR-71) — PRIORITY: before launch (17:00 UTC), together with CR-69
- **CR-71.1** Remove the "Strongest signals" preset/mode everywhere (Benchmaxxing table presets, URLs/deep links → fall back to Featured, tests, copy). No view that ranks models by signal as a "worst offenders" list by default. Sorting a column by score stays possible only if it already exists as a normal column sort — no dedicated preset.
- **CR-71.2** Default view when /benchmaxxing opens = **Featured models** (replaces CR-63.4's strongest-signal default); the report panel opens on the first Featured row by the table's normal default order, not the highest signal.
- **CR-71.3** Tag levels by absolute signed-gap score (CR-69 scale, percentile points after shrinkage): **> +5 → weak warning**, **≥ +10 → strong warning**; replaces the rank-band shares (BENCHMAXX_TAG_SHARE / WEAK_SHARE). Keep the honesty guards from CR-69: minimum comparisons for a named tag and the bootstrap interval lower bound above 0 (a model over the threshold whose interval crosses 0 gets no tag) — state both in the methodology text and legend ("weak: above +5", "strong: +10 or more"). Overview tags, Benchmaxxing table, per-model report and /about use the same function. Regression tests at +5.0 (no tag), +5.1 (weak), +9.9 (weak), +10.0 (strong). Record the resulting tag list in the ledger evidence.
- **CR-71.4** Expand/collapse: several rows can be open at the same time (independent toggles, not an accordion); each open row shows its own radar and report; state per row survives sorting/filtering where the row is still visible; performance ok with 3–4 open rows; works at 390 px (stacked) and with keyboard (aria-expanded per row). Optional small "collapse all".


## CR-20260917f checklist — mobile hero typography (CR-72)
| ID | Requirement | Acceptance |
|---|---|---|
| CR-72.1 | In mobile portrait, adapt the type sizing and/or line balancing of the two approved hero sentences so a single final word is never left on a line by itself. Keep their exact wording and semantic heading/subheading roles; do not insert manual `<br>` layout hacks tied to a particular handset width. | Fresh canonical and legacy-host checks at 360 px, 390 px and 430 px portrait, normal text scale: each sentence has either one line or multiword final line; no clipping, horizontal page overflow, overlap or materially undersized text. Desktop/tablet copy and layout unchanged. Keyboard zoom/reflow and screen-reader heading order remain correct. Independent live screenshots/evidence are recorded. |


## CR-20260917g checklist — efficient, equally safe daily updates (CR-73)
| ID | Requirement | Acceptance |
|---|---|---|
| CR-73.1 | Profile the current full and prices-only daily paths end-to-end, identifying the critical path by stage/source, source hash, retries, worker model/cost and whether work was necessary because a source changed. Set a documented, evidence-based full-run and prices-run target before altering scheduling. | A machine-readable timing report from the successful 17 Sep baseline and the new runs; it accounts for all wall time, not only subprocess time, and names the target plus its rationale. |
| CR-73.2 | Reuse prior verified outcomes for unchanged, hash-identical source units; regenerate and independently review only changed units and their dependent derived rows. Preserve deterministic output and invalidate the reuse cache on parser/config/contract/version changes. | Fixture: unchanged capture produces the same dataset/gate decision with no new worker call; a changed capture, parser/version change or missing/corrupt cache forces fresh parse/review; cached hashes/decision provenance are recorded. |
| CR-73.3 | Safely parallelise independent I/O and review units, with bounded concurrency, deterministic aggregation and no concurrent writes to the staging checkout. A slow, malformed or timed-out worker may exhaust only its own bounded retry budget; unrelated verified units proceed. | Race/retry fixtures; repeated run has byte-identical candidate and ordered report. No lock conflict, source mix-up, unbounded queue or hidden error. |
| CR-73.4 | Reduce paid calls where a qualified, healthy approved free route is available, but retain a qualified different-family critic and preserve the existing health/eligibility fallback policy. | Receipts expose requested/actual model, route, attempts and cost; fixture proves unhealthy/unqualified free routes do not get treated as valid. |
| CR-73.5 | Demonstrate the improvement honestly: two consecutive unattended full runs and one changed-source run meet the documented target while passing the normal hash-bound gate and live readback. Compare their datasets/gate outcomes against an uncached baseline; keep the prices-only path independently timed. A non-implementing engine verifies both the output equivalence and the timing evidence. | Evidence includes command/run IDs, source hashes, dataset hashes, gate verdicts, source-date readback on both hosts, wall-time breakdown and independent verification. Any failed/withheld source remains visibly withheld, never silently reused as fresh. |

**CR-71 addendum (Florian, Claude Code chat, 17 Sep ~17:15 UTC):** threshold wording is now "light >= +5 and strong >= +10" → weak/light tag at **score ≥ +5.0** (not > +5), strong at **≥ +10.0**; regression edges: +4.9 none, +5.0 light, +9.9 light, +10.0 strong. **CR-71.3 explicitly includes the Overview model cost/capability table:** it must show both levels with visibly different pills (e.g. "⚠ Benchmaxxing" strong vs a lighter "Benchmaxxing?" / muted pill for light), legend entry for both, same function as the Benchmaxxing tab; verify live on the Overview after deploy. Priority: CR-71.1–71.3 first (launch), then 71.4, then CR-70.


## CR-20260917h checklist — launch sprint (CR-74), lead: Claude Code launch-sprint job, 17 Sep ~17:40 UTC
- **CR-74.1** Benchmaxxing tags in three levels on the CR-69 signed score — **light ≥ +3.0, medium ≥ +6.0, very strong ≥ +12.0** (supersedes CR-71.3 and its addendum). Honesty guards unchanged (n ≥ BENCHMAXX_TAG_MIN_COMPARISONS, bootstrap 80 % lower bound > 0), stated in legend/methodology. One function for Overview, Benchmaxxing table, report, Compare, /about. Overview capability/cost table: three visibly distinct pills + legend. Edge tests 2.9/3.0/5.9/6.0/11.9/12.0.
- **CR-74.2** Benchmaxxing modes: Featured models (default, all rows shown, no "Show all N") · Top 50 (top 50 by the Main Composite exactly as on the Overview, incl. the CR-74.4 toggle) · All scored. "Strongest signals" gone (CR-71.1). "Show all axes" checkbox removed. Several rows expandable at once (CR-71.4).
- **CR-74.3** = CR-70: no "Insufficient evidence" section in the capability/cost table or any sorted table; thin models sorted in place with an accessible uncertainty badge + tooltip (benchmark count); 390 px.
- **CR-74.4** Main Composite − w·max(0, Benchmaxxing signal) with the smallest round w that makes GPT-6 Astra #1 over Claude Fable 5.1 (capped small; document all top-20 rank changes). Options checkbox "Include Benchmaxxing signal in the score" (default on, persisted), applied everywhere the composite is used; /about explains it.
- **CR-74.5** Overview advanced mode: opening "Better than a model ▾" / "Evidence ▾" does not shift the row; advanced mode shows all header Options inline.
- Gauntlet for this sprint (Florian allowed, a few hours): one independent Claude review per deploy + tests/typecheck/build + live Playwright screenshots (1440/390, light/dark).
