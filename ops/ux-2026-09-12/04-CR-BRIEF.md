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


## CR-20260917i checklist — visible model-list headers on phone (CR-79)
| ID | Requirement | Acceptance |
|---|---|---|
| CR-79.1 | Repair the header row of the “Most capable models and what they really cost” model table so its Model/provider, Benchmark Heaven Score/main composite score, and adjusted cost-per-task/modelling-basis labels are visibly present and aligned on phones. Use compact, readable wording where needed; retain semantic table headers and current sorting. | Fresh live checks on canonical and legacy hosts at 360, 390 and 430 px, light + dark: every displayed column header has non-empty visible primary text, a non-zero box, adequate contrast, no clipping/overlap and correct data-column alignment. The labels remain understandable without relying on a tooltip. |
| CR-79.2 | Prevent regression across responsive variants and interaction methods without hiding the row. | Automated geometry/text regression covers the phone widths; touch and keyboard sorting work, screen-reader header association remains correct, desktop/tablet layouts and the scroll container remain functional. A separate engine records independent live evidence. |

**CR-71 addendum (Florian, Claude Code chat, 17 Sep ~17:15 UTC):** threshold wording is now "light >= +5 and strong >= +10" → weak/light tag at **score ≥ +5.0** (not > +5), strong at **≥ +10.0**; regression edges: +4.9 none, +5.0 light, +9.9 light, +10.0 strong. **CR-71.3 explicitly includes the Overview model cost/capability table:** it must show both levels with visibly different pills (e.g. "⚠ Benchmaxxing" strong vs a lighter "Benchmaxxing?" / muted pill for light), legend entry for both, same function as the Benchmaxxing tab; verify live on the Overview after deploy. Priority: CR-71.1–71.3 first (launch), then 71.4, then CR-70.


## CR-20260917h checklist — launch sprint (CR-74), lead: Claude Code launch-sprint job, 17 Sep ~17:40 UTC
- **CR-74.1** Benchmaxxing tags in three levels on the CR-69 signed score — **light ≥ +3.0, medium ≥ +6.0, very strong ≥ +12.0** (supersedes CR-71.3 and its addendum). Honesty guards unchanged (n ≥ BENCHMAXX_TAG_MIN_COMPARISONS, bootstrap 80 % lower bound > 0), stated in legend/methodology. One function for Overview, Benchmaxxing table, report, Compare, /about. Overview capability/cost table: three visibly distinct pills + legend. Edge tests 2.9/3.0/5.9/6.0/11.9/12.0.
- **CR-74.2** Benchmaxxing modes: Featured models (default, all rows shown, no "Show all N") · Top 50 (top 50 by the Main Composite exactly as on the Overview, incl. the CR-74.4 toggle) · All scored. "Strongest signals" gone (CR-71.1). "Show all axes" checkbox removed. Several rows expandable at once (CR-71.4).
- **CR-74.3** = CR-70: no "Insufficient evidence" section in the capability/cost table or any sorted table; thin models sorted in place with an accessible uncertainty badge + tooltip (benchmark count); 390 px.
- **CR-74.4** Main Composite − w·max(0, Benchmaxxing signal) with the smallest round w that makes GPT-6 Astra #1 over Claude Fable 5.1 (capped small; document all top-20 rank changes). Options checkbox "Include Benchmaxxing signal in the score" (default on, persisted), applied everywhere the composite is used; /about explains it.
- **CR-74.5** Overview advanced mode: opening "Better than a model ▾" / "Evidence ▾" does not shift the row; advanced mode shows all header Options inline.
- Gauntlet for this sprint (Florian allowed, a few hours): one independent Claude review per deploy + tests/typecheck/build + live Playwright screenshots (1440/390, light/dark).


## CR-20260917i checklist — home page explainers (CR-75), Claude Code homepage-explainers job, 17 Sep ~18:20 UTC
- **CR-75.1** Section headers: "The most capable model at every price" (+ one-line caption "Set a minimum score and a budget — see who wins.") above the slider/value-map card in Simple and Guided; "Most capable models and what they really cost" above the model table in Simple, Guided and Advanced. ≤ 2 lines at 390 px.
- **CR-75.2** Directly under the home value map: "Models on the green line are the most capable in their price range." (only while the Pareto line is shown); the small top line no longer repeats "green line = Pareto"; data attribution (Artificial Analysis, Epoch AI CC BY) stays visible. Charts page wording unchanged.
- **CR-75.3** Table column "Score (Composite)" → "Capability Score" with subline "(Main Composite Score)" (other selected scores keep their short name); (i) tooltip title names "Benchmark Heaven Main Composite Score". Header ≤ 2 label lines at 390 px, no overflow. og:title unchanged.


## CR-20260917i checklist — value map axis labels (CR-76) — next after the tag/Pareto fix
- **CR-76.1** Small, subtle axis labels on the Overview value map: y = "Capability" (the main composite score; the scale already shows the numbers), x = "Adjusted cost per task" with the direction that is already implied ("cheaper →" stays where it is, no duplicate wording). Muted token colour, small caps or 11–12 px, never competing with the model labels; in both themes, at 1440 px and 390 px (drop to abbreviations or the (i) tooltip on the narrowest width if space is tight, but don't hide both). Keep the chart's current padding — labels must not clip or push the plot area.
- **CR-76.2** Same treatment wherever this chart is reused (Guided/Advanced mode, per-model cost charts) if the axes are unlabelled there too; screenshot evidence at both widths and both themes.


## CR-20260917j checklist — tags follow the score, Pareto grace band (CR-77) — PRIORITY, shipped 2026-09-17
- **CR-77.1** The Benchmaxxing tag level is decided by the published score alone — light ≥ +3.0, medium ≥ +6.0, very strong ≥ +12.0 — on every surface (Benchmaxxing table in all three presets, Overview capability/cost table, model report, model page, /about). A model must still be *scored* (n ≥ 6 in ≥ 2 topics); nothing is tagged without a score. Decision (CR-21.1 stands): the verdict belongs to the model family — a variant row shows its family's score, so it shows the tag that score implies; "nothing is tagged without a score" means no family without a scored representative is ever tagged. Raised by the independent review (codex-luna, gpt-5.6-luna, 17 Sep) and decided this way so no row can show a score without the level it earns.
- **CR-77.2** The old guards stay as information, never as suppression: a tag whose model has fewer than 10 comparisons, or whose 80 % bootstrap interval reaches below zero, carries a small "◔ uncertain" marker and says why in its tooltip/report ("Based on 7 comparisons, and the 80 % interval reaches below zero — treat this tag as uncertain"), in the wording pattern of the thin-data badge. Legend, table summary, methodology and /about no longer claim "each needs ≥ 10 comparisons and an interval above zero".
- **CR-77.3** Homepage value map: the green line accepts a documented grace band on the capability axis (0.5 % of the capability scale — 0.5 points on the 0–100 scores, 0.5 % of the plotted range on Elo boards), so a model only marginally behind the frontier at its cost joins the line. Claude Fable 5.1 (0.13 behind GPT-6 Astra) is on the line; the line stays readable and the caption/tooltip mentions the small tolerance.


## CR-20260917j checklist — Benchmaxxing score = signed gap + a light jaggedness term (CR-78) — high priority, after CR-77/CR-76
- **CR-78.1** Final signal = `signedGap + BENCHMAXX_JAGGED_WEIGHT × (jaggedness − catalogMeanJaggedness)`, with **BENCHMAXX_JAGGED_WEIGHT = 0.3** (an exported constant with the reasoning: 0.5 and above lets the old mid-table bias back in, see CR-65.5's null simulation; re-run that simulation at 0.3 and record the share of "most uneven" models that are mid-pack). `jaggedness` = the pre-CR-69 within-topic measure (mean absolute common-cohort percentile difference over all comparable pairs per topic, weighted by that topic's degrees of freedom), catalog mean over all scored models; models without a jaggedness value keep their signed gap unchanged. Shrinkage and the level thresholds (light ≥ +3, medium ≥ +6, very strong ≥ +12) apply to the blended score exactly as now.
- **CR-78.2** The per-model report shows both parts ("headline vs held-out gap" and "unevenness within a topic") with one plain sentence each, so a reader can see where the score comes from; /about and the methodology text say the score combines both, with the weight named.
- **CR-78.3** Tests: the blend arithmetic on fixtures; a model with a high gap and low jaggedness and vice versa; the three expected level changes above appear on the current data (Muse Spark 1.1 severe, Qwen3.7 Max medium, Gemini 3.6 Flash light) and no frontier model is tagged; snapshot the new top-50 tag list into the ledger evidence, plus the null-simulation result at weight 0.3.


## CR-20260918a checklist — frontier models without a public price must still appear (CR-80) — HIGH PRIORITY (a top-3 model is invisible)
- **CR-80.1** Find a real price for Muse Spark 1.3 (and 1.1/1.2) from a first-party or major provider source (Meta API / Llama API / cloud marketplaces / OpenRouter); if one exists, ingest it through the normal registry path with provenance (maintain-benchmarkheaven-registry skill) so the model gets an offer and an adjusted cost per task.
- **CR-80.2** Independently of .1: models with a capability score but **no priced offer** are shown in the homepage table (and Simple/Guided/Advanced) sorted by score like everyone else, with the cost cell reading "No public API price" (muted, tooltip why), excluded only from cost-based charts/filters (value map, max-cost slider — the chart gets a small note "N models without a public price not plotted"). Never silently hide a top model. Tests: a no-offer model with a high score appears in the table at its rank; the max-cost filter doesn't drop it unless the user sets a cost limit (then it is excluded with the note).
- **CR-80.3** Live check: Muse Spark 1.3 visible on benchmarkheaven.com in Simple mode at its score position, at 1440 px and 390 px.


## CR-20260918b checklist — WeirdML v3 (CR-81) — after CR-80
- **CR-81.1** Read the whole thread (fxtwitter: `https://api.fxtwitter.com/htihle/status/<id>` for each self-reply; the results image) and the author's primary results source (WeirdML page on htihle.github.io or the linked repo/data files — prefer machine-readable data over reading the chart). Record per model: WeirdML v3 score (and cost per run if published), date, model identity incl. reasoning effort as stated by the source.
- **CR-81.2** Register WeirdML v3 as its **own versioned benchmark** (the `maintain-benchmarkheaven-registry` skill: source, date, basis, provenance, no mixing with v2 — keep v2 if present, mark it superseded for defaults), taxonomy: agentic / data-science tier "held-out" only if the tasks are private or new (check the post: hand-made, new tasks → likely held-out for the Benchmaxxing signal; state the reason in `benchmark-tiers.json`). Map models to catalog ids carefully (effort variants).
- **CR-81.3** Ingest with the gauntlet check (producer/critic, the `run-benchmarkheaven-gauntlet` skill), benchmarks page entry with description + link to the source + attribution, live check that the scores show on the model pages and in the benchmarks list.


## CR-20260918c checklist — new benchmarks from the X bookmark folder (CR-82)
Source: the daily bookmark intake. Every item below is a *candidate* read off an X post — the post is the pointer, never the measurement. Treat a benchmark as real only after the primary source is read.

- **CR-82.1** **BrokenArXiv** — bookmarked post https://x.com/j_dekoninck/status/2100180792601420138. Read the whole thread (fxtwitter: `https://api.fxtwitter.com/j_dekoninck/status/<id>` for each self-reply; read the results image) and the author's primary results source (the linked page, repo or data file — prefer machine-readable data over reading a chart). Record per model: score, cost per run if published, date, model identity including reasoning effort as the source states it. The registry has 2026-06 of `matharena-brokenarxiv` (matharena-brokenarxiv::2026-06). The post announces a release but names no version — establish the version from the primary source first. If it is the version already registered, close this row as covered; if it is newer, it needs its own identity and must never be ranked against the old one. Then register it as its **own versioned benchmark** (the `maintain-benchmarkheaven-registry` skill: source, date, basis, provenance, pinned version, English one-sentence description), give it a taxonomy and a tier in `benchmark-tiers.json` with the reason stated (held-out only if the tasks are private or new — check what the post says), map models to catalog ids carefully (effort variants), and ingest it through the gauntlet (`run-benchmarkheaven-gauntlet`) with a benchmarks-page entry, description, link to the source and attribution. Live check that the scores show on the model pages and in the benchmarks list. If the primary source does not hold up, drop the candidate and say so in the row — a bookmark is not evidence.
- **CR-82.2** **ArXivMath** — bookmarked post https://x.com/j_dekoninck/status/2100180792601420138. Read the whole thread (fxtwitter: `https://api.fxtwitter.com/j_dekoninck/status/<id>` for each self-reply; read the results image) and the author's primary results source (the linked page, repo or data file — prefer machine-readable data over reading a chart). Record per model: score, cost per run if published, date, model identity including reasoning effort as the source states it. The registry has 2026-06 of `matharena-arxivmath` (matharena-arxivmath::2026-06). The post announces a release but names no version — establish the version from the primary source first. If it is the version already registered, close this row as covered; if it is newer, it needs its own identity and must never be ranked against the old one. Then register it as its **own versioned benchmark** (the `maintain-benchmarkheaven-registry` skill: source, date, basis, provenance, pinned version, English one-sentence description), give it a taxonomy and a tier in `benchmark-tiers.json` with the reason stated (held-out only if the tasks are private or new — check what the post says), map models to catalog ids carefully (effort variants), and ingest it through the gauntlet (`run-benchmarkheaven-gauntlet`) with a benchmarks-page entry, description, link to the source and attribution. Live check that the scores show on the model pages and in the benchmarks list. If the primary source does not hold up, drop the candidate and say so in the row — a bookmark is not evidence.
- **CR-82.3** **VulcanBench-SWE v4** — bookmarked post https://x.com/morganlinton/status/2098909653149401222. Read the whole thread (fxtwitter: `https://api.fxtwitter.com/morganlinton/status/<id>` for each self-reply; read the results image) and the author's primary results source (the linked page, repo or data file — prefer machine-readable data over reading a chart). Record per model: score, cost per run if published, date, model identity including reasoning effort as the source states it. Nothing of this family is in the registry yet. Then register it as its **own versioned benchmark** (the `maintain-benchmarkheaven-registry` skill: source, date, basis, provenance, pinned version, English one-sentence description), give it a taxonomy and a tier in `benchmark-tiers.json` with the reason stated (held-out only if the tasks are private or new — check what the post says), map models to catalog ids carefully (effort variants), and ingest it through the gauntlet (`run-benchmarkheaven-gauntlet`) with a benchmarks-page entry, description, link to the source and attribution. Live check that the scores show on the model pages and in the benchmarks list. If the primary source does not hold up, drop the candidate and say so in the row — a bookmark is not evidence.
- **CR-82.4** **KernelBench-CUDA** — bookmarked post https://x.com/elliotarledge/status/2098577337407484408. Read the whole thread (fxtwitter: `https://api.fxtwitter.com/elliotarledge/status/<id>` for each self-reply; read the results image) and the author's primary results source (the linked page, repo or data file — prefer machine-readable data over reading a chart). Record per model: score, cost per run if published, date, model identity including reasoning effort as the source states it. Nothing of this family is in the registry yet. Then register it as its **own versioned benchmark** (the `maintain-benchmarkheaven-registry` skill: source, date, basis, provenance, pinned version, English one-sentence description), give it a taxonomy and a tier in `benchmark-tiers.json` with the reason stated (held-out only if the tasks are private or new — check what the post says), map models to catalog ids carefully (effort variants), and ingest it through the gauntlet (`run-benchmarkheaven-gauntlet`) with a benchmarks-page entry, description, link to the source and attribution. Live check that the scores show on the model pages and in the benchmarks list. If the primary source does not hold up, drop the candidate and say so in the row — a bookmark is not evidence.
- **CR-82.5** If any candidate above turns out to be something Benchmark Heaven already carries under another name, close its row with that finding and add the alias to the registry entry so the bookmark intake stops re-filing it.

## CR-20260919a checklist — new benchmarks from the X bookmark folder (CR-83)
Source: the daily bookmark intake. Every item below is a *candidate* read off an X post — the post is the pointer, never the measurement. Treat a benchmark as real only after the primary source is read.

- **CR-83.1** **RSI-Exam** — bookmarked post https://x.com/HuaxiuYaoML/status/2100959310624825688. Read the whole thread (fxtwitter: `https://api.fxtwitter.com/HuaxiuYaoML/status/<id>` for each self-reply; read the results image) and the author's primary results source (the linked page, repo or data file — prefer machine-readable data over reading a chart). Record per model: score, cost per run if published, date, model identity including reasoning effort as the source states it. Nothing of this family is in the registry yet. Then register it as its **own versioned benchmark** (the `maintain-benchmarkheaven-registry` skill: source, date, basis, provenance, pinned version, English one-sentence description), give it a taxonomy and a tier in `benchmark-tiers.json` with the reason stated (held-out only if the tasks are private or new — check what the post says), map models to catalog ids carefully (effort variants), and ingest it through the gauntlet (`run-benchmarkheaven-gauntlet`) with a benchmarks-page entry, description, link to the source and attribution. Live check that the scores show on the model pages and in the benchmarks list. If the primary source does not hold up, drop the candidate and say so in the row — a bookmark is not evidence.
- **CR-83.2** If any candidate above turns out to be something Benchmark Heaven already carries under another name, close its row with that finding and add the alias to the registry entry so the bookmark intake stops re-filing it.

## CR-20260919a (JevBench) checklist — "Jev-class models" section (CR-84)
Source: `jevbench/CR-20260919a.md` (verbatim in `03`), spec `jevbench/SPEC.md`, copy `jevbench/PAGE-COPY.md`, data `jevbench/jevbench-v1-results.json`, proposed registry entry `jevbench/registry-entry.json`. The measurement is done; this is page, data and registry. Renumbered from the file's "CR-83" (already taken by RSI-Exam).

- **CR-84.1** **Data + registry.** Commit the publication-safe artifact at `data/raw/benchmarks/jevbench/v1/jevbench-v1-results.json` (sha256 recorded), add a schema validator/test that enforces null for unsupported metrics and fails on any item text/label/per-item prediction, and register `jevbench::v1` (maintainer Benchmark Heaven, `basis=measured` for our runs, `derived` for usage × tariff) passing the existing registry validator. No fabricated source URL.
- **CR-84.2** **Page `/jev-models`**, nav label **Jev-class models**, title per SPEC. Lead says it is our own benchmark. Five independent sortable axes (smart, cheap, fast, reliable, open), no combined winner; null price renders "no per-token tariff", never `$0.00`; unrunnable systems as availability rows outside the ranking; quality/cost scatter and calibration plot drawn from the JSON (reference PNGs are layout only); method and limits copy from PAGE-COPY.md; row expansion with per-family coverage and receipts.
- **CR-84.3** **Live check** at 1440/390 px, light/dark, keyboard access to table and scatter, number/label parity against the committed artifact hash on both hosts. Launch post stays gated (SPEC acceptance: numbers-review draft for Florian first) — this loop does not post.


## CR-20260919a checklist — fill DeepSeek V4.1 Flash (and similar new models) from other primary sources (CR-85) — high priority (a popular free model looks unmeasured)
- **CR-85.1** Check AA's public model page for DeepSeek V4.1 Flash (the website often shows evaluations before the API fields are filled — the data & math gauntlet found AA per-benchmark results lagging the headline indices by ~6 days) and ingest what is published there with provenance, or wait for the API and re-check daily. Add a daily "new model with ≤ 1 composite input" check that lists such models in the digest.
- **CR-85.2** Other primary sources for V4.1 Flash: DeepSeek's release notes/model card (self-reported, mark as vendor-reported), OpenRouter Benchmarks API, Epoch (ECI), DesignArena, LiveBench/SWE-bench/Terminal-Bench leaderboards, Lumina, the benchmarks already in our registry — ingest each with provenance so the category scores (coding, agentic, science, long context) can be computed.
- **CR-85.3** UI honesty: a model whose composite rests on 1 input must show the thin-data marker (CR-70) — verify it does for V4.1 Flash; the Benchmaxxing tag must show "based on N comparisons — uncertain" (CR-77) — verify. Live check.


## CR-20260919 (JevBench v1.1) checklist — Main Score, three sub-benchmarks, easy tier, Needle 3 (CR-86) — supersedes CR-84's "no combined winner"
Source: `jevbench/v1.1/CR-20260919-jevbench-v1.1.md` (verbatim in `03`), copy `jevbench/v1.1/PAGE-COPY-v1.1.md`, data `jevbench/v1.1/jevbench-v1.1-results.json` (byte-identical to `results/v1.1/` at tag `v1.1` of github.com/fstandhartinger/jevbench), proposed registry entry `jevbench/v1.1/registry-entry-v1.1.json`. Florian's newer decision wins over CR-84.2's "no combined score"; everything else in CR-84 still holds.
- **CR-86.1** **Data + registry.** Commit the artifact at `data/raw/benchmarks/jevbench/v1.1/`, validator/test: publication-safe (no item-level keys), every ranked Main Score recomputes from `capability/speed/cost.score` with the published weights, `cost.kind` ∈ measured/estimate/unknown with null for unknown (never 0), `has_distribution == false` ⇒ null calibration with a note. Register `jevbench::v1.1` (v1 kept as published; `superseded_by` v1.1). Found on intake: `capability.pooled_accuracy` is > 1 for every system (e.g. 1.713 for Jev) — an artifact defect; the page must not show it until the harness fixes it (reported to the supervisor in the ledger row).
- **CR-86.2** **Page.** `/jev-models` shows v1.1 by default and links v1.0 (never mixed in one column): lead per PAGE-COPY-v1.1, Main Score first (default sort `main_score` desc), columns Main · Capability · Speed · Cost · Easy / Standard / Judge · p50 / p95 · $/1k, all sortable, nulls last both ways; the formula and normalisation in words next to the table (from `scoring.*`); sensitivity table (rank and score under the six weightings, cells whose rank differs from the headline highlighted); estimated costs "~ … est." with `cost.basis`; unknown cost "no tariff"; Needle rows "no calibrated distribution" and the asterisked tools row with its note; partial runs below, greyed, no rank number, with reason; system column pinned on mobile.
- **CR-86.3** **Live check** both hosts 1440/390 light/dark: every row's Main Score recomputes from its sub-scores, no `$0.00`, no blank calibration cell, sensitivity table = `rank_under`, JSON hash parity; v1.0 page still reachable.

## CR-20260919b checklist — /jev-models: Main Score as hero + adjustable weights (CR-87) — HIGH PRIORITY, do before other open CRs
Florian's text is in 03 (CR-20260919b). The v1.1 launch tweet links https://benchmarkheaven.com/jev-models, so this page is the landing page.

- **CR-87.1** **Main Score is the hero.** Main Score is the first data column after the system name, the default sort (desc), visually dominant (largest type in the table, bold; on the ranking card/lead the big number). Capability, Speed and Cost follow as clearly secondary columns (smaller/lighter), then tiers, latency, $/1k. No "Smart" wording anywhere; names match the benchmark (Main Score, Capability, Speed, Cost). The lead sentence names the Main Score leader first.
- **CR-87.2** **Weight controls, client-side.** Above the ranking: the four named presets of CR-87.8 (default = Emphasis on Accuracy 60:20:20), plus **Custom** with three sliders (Capability / Speed / Cost, 0–100, normalised to sum 1, the effective % shown). Changing them recomputes every ranked system's score as Σ wᵢ·subscoreᵢ from the published per-system `capability.score` / `speed.score` / `cost.score` and re-ranks the table and the bar chart live (no reload, no server call). Estimated costs keep their "est." label; partial/unranked rows stay out of the ranking. Rank changes vs. the official ranking are indicated (e.g. ▲2 / ▼1).
- **CR-87.3** **Honesty note.** Next to the controls: "The official JevBench Main Score uses 60 % Capability, 20 % Speed, 20 % Cost. Other weights are your view, not the published score." When non-default weights are active, the column header reads "Your score" and the official Main Score stays visible (e.g. smaller, beside it) and a "Reset to official" control appears.
- **CR-87.4** **Shareable URL.** Weights live in the URL (e.g. `?w=60-20-20` or `?cap=..&spd=..&cost=..`, validated, clamped, default when absent/invalid); loading such a URL restores the view; the canonical/OG tags stay on the plain page.
- **CR-87.5** **Mobile + a11y.** Works at 390 px (controls stack, sliders touch-friendly, system column pinned as today), keyboard-operable, labelled inputs, light + dark.
- **CR-87.6** **Tests.** Unit test: the recompute with default weights reproduces every published Main Score to 0.1 and the published `rank_under` for each sensitivity weighting; URL parsing edge cases (missing, zero sum, negatives, >100). E2E/verify script (`bin/verify-cr-87.mjs`): default ranking = official; preset "Cheapest" re-ranks; URL restore works.
- **CR-87.7** **Live check** on both hosts (benchmarkheaven.com + the Sandy mirror), 1440/390, light/dark: default view = official ranking; each preset re-ranks correctly; a shared URL restores; no console errors. Evidence to /opt/benchmarkheaven/state/ux-evidence/.
- **CR-87.8** **Named presets (addendum, exact names).** "JevBench Main Composite Score – Emphasis on Accuracy (60:20:20)" = default and the official score; "… – Emphasis on Speed (20:60:20)"; "… – Emphasis on Cost (20:20:60)"; "… – Balanced (33:33:33)" (1/3 each); plus Custom sliders. These replace the preset list in CR-87.2.
- **CR-87.9** **Main Score bar chart on the page.** Native (SVG/HTML, not an image) horizontal bar chart like the Telegram chart "JevBench v1.1 – Main Score": one bar per ranked system sorted by score, bar colour by type (Jev closed / open rebuild / instruction model / small tool-calling model; partial runs hatched and unranked), value label on each bar, Capability / Speed / Cost figures beside each bar with "est." marks on estimated costs, the formula line and footnotes below. Responsive (390 px), light + dark, accessible (text alternative/table). Recomputes and re-sorts live with the chosen weights.
- **CR-87.10** **Clearly "not the default".** Whenever weights ≠ 60:20:20: the chart title/subtitle and the table's score header switch to the preset name (e.g. "JevBench Main Composite Score – Emphasis on Cost (20:20:60)") or "Custom weights (x:y:z) — not the official JevBench Main Composite Score"; a visible badge ("Not the default weighting"); the official Main Score stays visible; a one-click "Reset to default". The default state says "Official".
- **CR-87.11** **Links to every benchmarked project.** Each system name links to its repo / Hugging Face / vendor page, with author credit (e.g. "by @handle"), rel="noopener", from the benchmark's own metadata (no invented URLs).
- **CR-87.12** **URL parameter** for shared settings covers the named presets too (e.g. `?w=20-20-60` resolves to "Emphasis on Cost"); covered by the CR-87.6 tests and CR-87.7 live check.
- **CR-87.13** **Cost for every system (addendum 2).** Public tariff where one exists; otherwise a hosted-provider price (OpenRouter/DeepInfra list prices for the same weights or size class, never per-minute GPU rental or our own CPU time), marked "est." with a tooltip, and a "How costs are estimated" section with the method and reference models. Artifact = JevBench v1.1.1+.
- **CR-87.14** **Balanced is the Main Score (addendum 3).** Default preset "JevBench Main Composite Score – (Balanced 33:33:33)"; the others "JevBench Composite Score – Emphasis on Accuracy (60:20:20)", "… – Emphasis on Speed (20:60:20)", "… – Emphasis on Cost (20:20:60)"; "not the default" = anything ≠ 33:33:33; formula text and reset button follow. Artifact = JevBench v1.1.2.
- **CR-87.15** **Cost score does not saturate (addendum 3).** Cost scale $0.001–$10 per 1,000 decisions (log), so DeBERTa and Needle get different scores; $ per 1,000 decisions shown next to every score in the chart.

## CR-20260919d checklist — "Support Benchmark Heaven" link (CR-89)

Link (exact, do not change): https://donate.stripe.com/fZu00i9ro0wmdF88sg1Jm01. Wording "Support", never "donation"/"Spende". Unobtrusive — this is a quiet footer link and one paragraph, not a banner, modal or nag.
- **CR-89.1** **Footer link.** A small "Support Benchmark Heaven" link (optional small heart icon) in the site footer on every page, same style as the other footer links, `rel="noopener"`, opens the Stripe page. Readable and not wrapping awkwardly at 390 px; light + dark.
- **CR-89.2** **About-page paragraph.** A short "Support" paragraph on the About page (2–3 sentences): Benchmark Heaven is a one-person hobby project, data collection and hosting cost real money, support with whatever amount you like (link), plus the line "Payments go to productivity-boost.com Betriebs UG (haftungsbeschränkt) & Co. KG, the one-person company behind these projects." No effect on rankings or data — say so if natural.
- **CR-89.3** **Repo.** `.github/FUNDING.yml` with `custom: ["https://donate.stripe.com/fZu00i9ro0wmdF88sg1Jm01"]` (makes GitHub show the Sponsor button) and a "Support" section in README.md (2–3 lines + link, same wording).
- **CR-89.4** **Live check** on both hosts (benchmarkheaven.com + the Sandy mirror), 1440/390, light/dark: footer link present on home and one deep page, About paragraph present, link returns the Stripe Checkout page (HTTP 200), no console errors; GitHub shows the Sponsor button. Evidence to /opt/benchmarkheaven/state/ux-evidence/.



## CR-20260919c checklist — /jev-models difficulty filter, per-task view, topic radar (CR-90) — after the v1.2 hard-tier results land (job `jevbench-v1-2-hard-20260919`); page stays behind the WIP banner until Florian releases it
- **CR-90.1 Difficulty scope control**: a segmented control (better than a slider for 3 discrete, nested choices): **"All tasks (default)" · "Easy + Medium" · "Easy only"** (JevBench tiers: easy / standard=medium / judge+hard=hard — use the benchmark's own tier names, mapped clearly). Capability (and therefore the composite) is recomputed client-side from per-tier results for the chosen scope; the Main Score chart, table and ranking update. When scope ≠ All **or** weights ≠ default, show the same prominent "Not the default JevBench setting" state (title/subtitle change, badge, one-click reset), combined wording when both differ. URL parameter for sharing.
- **CR-90.2 Per-task view** further down: a compact heatmap/grid (rows = systems, columns = tasks grouped by tier, cell = right/wrong/abstained, colour-blind safe) with tier totals — "which tasks each model got right"; only public-split tasks are shown individually (held-out tasks aggregated as counts, never their text). Tooltip: task id, tier, topic, short description (public items only).
- **CR-90.3 Topic radar (if the task set carries topic labels)**: per-topic accuracy (e.g. routing/classification, judging, extraction, temporal reasoning, long-policy, multi-hop, probability/calibration, …) as a radar per system, 2–3 systems selectable for overlay; skip topics with < 8 items. If topic labels aren't in the data yet, request them from the JevBench job (data contract below) instead of inventing them.
- **Data contract** (from the JevBench results artifact): per system × per public task: correct / wrong / abstain + latency; per system × tier and × topic: n and accuracy for held-out (aggregates only); task metadata (id, tier, topic). Tests for the recompute (scope + weights), the default-state detection, and that no held-out item text is ever shipped to the client.

## CR-20260919i checklist — /jev-models two-system radars + latency limitation (CR-94); completes CR-90.3
- **CR-94.1 Axis radar**: two systems (default Jev 1.13 vs the #2), four axes Intelligence / Calibration / Speed / Cost (0–100, the table's exact values), two dropdowns + swap, legend with each JevBench Score; accessible (aria + value table), 390 px, light + dark, page colours (Jev blue, rebuild orange, LLM green).
- **CR-94.2 Topic radar**: per-topic accuracy (all tiers) for the same two systems, from `data/raw/benchmarks/jevbench/v1.2/jevbench-v1.2-topics.json` (= jevbench repo results/v1.2/jevbench-v1.2-topics.json, sha pinned, validated); n per topic shown; topics with < 15 attempted items for a system greyed (partial runs); aggregates only — no held-out text or id on the page.
- **CR-94.3 Limits text**: the latency-adjustment sentence becomes a short paragraph: parallelism 1 vs. a loaded production API (official Jev API presumably under high load); SemiAnalysis link — the NVIDIA chart's throughput-maximising setting cuts per-user tokens/s far more than 2×, but it is a 1.8T MoE on GPU clusters (direction and size, not our factor; never "about half"); +0.15 s = auth, load balancing, logging, billing, API gateway; both are assumptions, raw p50/p95 in table + repo, measurement under load planned.
- **CR-94.4 Checks**: unit tests (topic artifact validates and matches the per-task tier counts; radar values = table values), browser check desktop + phone, light + dark, both hosts, radars included.

## CR-20260919j checklist — /jev-models on JevBench v1.2.2: the five requested systems (CR-95)
- **CR-95.1 Artifact**: `data/raw/benchmarks/jevbench/v1.2/jevbench-v1.2-{results,topics}.json` = jevbench repo `results/v1.2/` at tag `v1.2.2`, both SHA-pinned in `lib/` and validated as before (every axis and score recomputed, prices never 100). New rows: classifier.dev (fast tier) #1 84.8, Laya #5 70.1, jeff #9 66.9, openJev Verdict #11 66.1, GLiNER2 #18 52.9; no earlier row's score changed.
- **CR-95.2 Types**: `jev-service` ("Service built on Jev") and `classifier` ("Zero-shot classifier (not a Jev rebuild)") with their own CSS colour in light and dark, in the table legend, the bar chart and both radars; † footnote per new row (weights source for openJev Verdict, the fixed GLiNER2 mapping, jeff on our CPU, Laya's 512-token budget, classifier.dev's plan price).
- **CR-95.3 Headline**: when a `jev-service` row leads, one bullet says why, from the row data only (Intelligence vs Jev, Speed p50, the plan price vs Jev's tariff, lower Calibration).
- **CR-95.4 Revision**: v1.2.2 in the chart eyebrow and Method; the topic radars include the new systems.
- Verification: `ops/ux-2026-09-12/bin/verify-cr-95.mjs` + `verify-cr-92.mjs` on both hosts (desktop + phone, light + dark).

## CR-20260920a checklist — /jev-models on JevBench v1.2.3: the cost correction and an unmistakable Cost unit (CR-96)
- **CR-96.1 Artifact**: `data/raw/benchmarks/jevbench/v1.2/jevbench-v1.2-results.json` = jevbench repo `results/v1.2/` at tag `v1.2.3`, SHA-pinned in `lib/jevbench-v12.mjs`; per-task re-pinned to `ops/ux-2026-09-12/jevbench/v1.2.3/jevbench-v1.2-per-task.json` (only its revision field changed). Every price recomputed with each of the 534 decisions counted once and priced once: 15 rows 1.5–11 % cheaper, DeepSeek V4.1 Flash 2.6 % dearer, scores move ≤ 0.3 points, **no rank changed** (Jev 1.13.0 $0.0406 → $0.0399, 75.3 → 75.4).
- **CR-96.2 The unit is part of the contract**: the artifact carries `cost_unit` (unit, what it is **not**, one-liner, short note, worked example from Jev's own numbers) and `validateJevbenchV12` **fails** without it or if the Cost scoring text drops "not per 1,000 tokens". A revision can never again ship a price without its unit.
- **CR-96.3 Visible everywhere a price is**: table header "$ per 1,000 — decisions, not tokens"; a `CostUnitNote` line under the table and inside the Cost bullet of "How the score works"; a panel opening the cost section with the worked example; "per 1,000 decisions" in the estimated-cost list. The repo's charts carry the same line in their footer.
- **CR-96.4 The correction is disclosed**: a details block in the cost section names all three arithmetic mistakes and lists every before/after price, from `cost_correction` / `cost_correction_table` in the artifact.
- Verification: `ops/ux-2026-09-12/bin/verify-cr-96.mjs` + `verify-cr-92.mjs` + `verify-cr-95.mjs` on both hosts (desktop + phone, light + dark).

## CR-20260920b checklist — /jev-models on JevBench v1.2.4: classifier.dev as an honorable mention (CR-97)
- **CR-97.1 Artifact**: `data/raw/benchmarks/jevbench/v1.2/jevbench-v1.2-results.json` = jevbench repo `results/v1.2/` at tag `v1.2.4`, SHA-pinned in `lib/jevbench-v12.mjs`; per-task re-pinned to `ops/ux-2026-09-12/jevbench/v1.2.4/jevbench-v1.2-per-task.json` (only its revision field changed). Every row carries a `listing` (`ranked` / `honorable_mention` / `partial`); **only a ranked row carries a rank**, and `validateJevbenchV12` fails if `ranked`/`partial` disagree with `listing`, if an unranked row has a rank, or if an honorable mention does not name a *ranked* system whose model it runs. Jev 1.13.0 #1 at 75.4; classifier.dev keeps 84.8 with no rank; every row below it moves up one.
- **CR-97.2 The rule, not the row**: `honorable_mentions.rule`, repeated in `scoring.ranked` and in the method section — *a service that runs another entrant's model is listed with all of its scores and axes, but is not ranked against the models.*
- **CR-97.3 New section under the ranking** (`#jev12-honorable`, "Honorable mentions — services built on another entrant's model"): score, all four axes, price, no rank number, "Runs on Jev (TypeSafe)", and three short paragraphs — why it is not ranked (quoting classifier.dev's own pages; smart tier = escalation on low confidence, a model cascade, never run by us), the price with the flat-rate caveat ($0.0033 at full use of the $20/month 200,000-a-day plan, $0.033 at a tenth), and the honest finding (97.3 % vs 94.5 % judge, 70.5 % vs 74.1 % hard). Credit the service; no swipe. **No guess about a waitlist or Vercel quota** — their pages do not state one.
- **CR-97.4 Headline** replaces CR-95.3's "why a Jev service leads" with the reason it no longer leads; the table gets its own labelled honorable-mention block; the radar picker keeps it under "Honorable mentions (not ranked)"; the per-task grid and the topic aggregates keep its column and row.
- Verification: `ops/ux-2026-09-12/bin/verify-cr-97.mjs` (new) + `verify-cr-92/93/94/95/96.mjs` on both hosts (desktop + phone, light + dark). The earlier verifiers were made revision-aware wherever they pinned a rank this CR legitimately shifts by one.

## CR-20260920c checklist — Step-5 preview (StepFun) launch data (CR-98)

- **CR-98.1 Source facts.** Capture StepFun's 2026-09-20 announcement and first-party launch page, plus any linked first-party docs/model card. Record architecture/parameters, context, modalities, API and weight availability, licence, published price, and every benchmark claim using the source's exact benchmark/version label. Unknown stays unknown; no value is inferred from a chart or secondary summary.
- **CR-98.2 Provenance-first ingestion.** Add the model and only source-supported scores. Every StepFun number has `basis: self_reported`, the exact HTTPS source URL, retrieval/publication date, immutable capture/hash and locator. Register new benchmark/version identities fully where necessary; never mix them with independent observations or another version. Use the unverified/vendor-reported UI state. Bind Florian's 2026-09-20 acceptance to each final canonical observation hash and obtain a different-family critic pass before publishing.
- **CR-98.3 Replacement rule.** The model/page and this ledger state explicitly say independently measured scores replace the self-reported values as soon as matching-version results exist; no silent merge or averaging.
- **CR-98.4 Publish and verify.** Registry/data/build tests, full test suite, typecheck and build pass; deploy the exact pushed revision. Verify the Step-5 preview model page and comparison/benchmark views live on both canonical and Sandy hosts at desktop and phone widths, including visible vendor-reported status and source links.
- **CR-98.5 Harold once.** Through `@benchmarkheaven`'s normal guarded publication path, publish exactly one original post signed “- Harold”: Step-5 preview is on Benchmark Heaven, headline figures, clearly vendor figures not independently checked, and the live link. Respect the bot cooldown and all checks; on any X 429 or warning, stop without retrying or posting elsewhere and leave it pending for the next run. No replies or DMs.

## CR-20260920d checklist — /jev-models hard-only view + custom evaluation offer (CR-99)

- **CR-99.1 Hard only.** Add a shareable `?scope=hard` option to Explore by task difficulty. Recompute Intelligence, Calibration, Speed and Cost from the 220 hard-tier decisions and the artifact's hard-tier inputs, then apply the unchanged four-axis geometric mean. The default view and its numbers do not change. A system without a hard run is partial and unranked. The existing non-default badge, ranking deltas and reset apply.
- **CR-99.2 Offer.** After about 6 seconds, show a quiet two-line custom-evaluation offer for about 8 seconds, then visibly converge on one permanent Custom evaluation link. It is keyboard accessible, closes with Escape or ×, offers Don't show again through guarded localStorage, stays dismissed for the session, fades under reduced motion and does not cover the chart on a phone.
- **CR-99.3 Detail page.** `/jev-models/custom-evaluation` states the work, inputs, deliverables, $1,000 flat fee and individual-quote exception, optional consulting, data treatment and a pre-addressed email link. It makes no turnaround promise and links the legal pages. Link it from the offer, permanent badge and shared footer.
- **CR-99.4 Verify.** Full tests, typecheck and production build; both live hosts at 1440/390 in light/dark; hard-only URL/reset/ranking, toast timing/landing/no-overlap, Escape/× and Don't show again persistence, detail page and mailto.

## CR-20260920g checklist — custom-evaluation pill label (CR-103)

- **CR-103.1 Copy.** Rename the permanent pill to “You need a custom eval” and keep the badge, footer, toast, offer page and accessible labels consistent.
- **CR-103.2 Phone layout.** At 320 px portrait the pill remains beside the JevBench eyebrow with horizontal padding; reduce pill type and padding before allowing the eyebrow to wrap.
- **CR-103.3 Motion.** The toast flight still lands on the resized pill; preserve the fixed-bottom toast, opaque slow exit, wiggle and reduced-motion path.
- **CR-103.4 Verify.** Full tests, production build, both live hosts, and 320 px phone-portrait screenshots in light and dark.

## CR-20260920h checklist — responsive custom-eval pill wording (CR-104)

- **CR-104.1 Copy.** Use “Need custom eval on your data?” for desktop and wider phones and “Need a custom eval?” on narrow screens; keep the footer, toast, offer page and accessible labels consistent.
- **CR-104.2 Responsive accessibility.** Switch labels with CSS/container width, not user-agent sniffing, and expose exactly one accessible name.
- **CR-104.3 Phone layout and motion.** At 320 px portrait the pill remains beside the JevBench eyebrow with horizontal padding, and the toast flight still lands on it without changing the fixed-bottom, opaque exit, wiggle or reduced-motion paths.
- **CR-104.4 Verify.** Full tests, typecheck and production build; both live hosts with 320 px phone-portrait screenshots in light and dark.


## CR-20260920i checklist — publish JevBench v1.2.6 (CR-105)

- **CR-105.1 Artifacts pinned.** Results, public-task and topic artifacts from the public JevBench tag `v1.2.6` are pinned by SHA-256 in the repo; the availability audit is refreshed without altering any prior measurement.
- **CR-105.2 New systems live.** openJev Verdict 1.4 at 72.5 (#4), SimpleJev Qwen3.8-27B at 67.3 (#9), SimpleJev Qwen3.6-35B-A3B at 63.8 (#16); Verdict 1.4 links to the author's Hugging Face model; the earlier Verdict row is unchanged.
- **CR-105.3 Availability audit refreshed.** The current concrete reason for every remaining unmeasured candidate is published; djev-spark stays out of the table (a serving wrapper around the already represented DiffusionGemma system, not new weights).
- **CR-105.4 Nothing else moved.** Hard-only view, custom-evaluation offer/toast, labels, prior rows and scoring rules preserved.
- **CR-105.5 Host verification.** Both production hosts verified after deployment at 1440 px and 390 px, light and dark, with evidence; the engine attribution for the shipping commits is closed by a review gate before the rows read `verified`.

## CR-20260920j checklist — longer custom-evaluation toast and subtle tint (CR-106)

- **CR-106.1 Timing.** Keep the 6-second appearance delay, then leave the toast open for 10 seconds before its unchanged 0.9-second landing flight and badge wiggle.
- **CR-106.2 Tint.** Distinguish the toast from normal cards with a calm, low-opacity accent overlay on `var(--surface)` and a slightly stronger accent border, explicitly tuned for light and dark.
- **CR-106.3 Contrast.** The computed toast text/background contrast is at least 4.5:1 in light and dark; `--surface` and `--text` remain consumed as hex tokens with `var(...)`, never `rgb(var(...))`.
- **CR-106.4 Verify.** Full tests, typecheck and production build; both live hosts at desktop and phone widths in light and dark, with one screenshot per theme and the timing/motion path preserved.

## CR-20260920k checklist — publish JevBench v1.2.7 (CR-107)

- **CR-107.1 Pin.** Results, public-task and topic artifacts from public JevBench tag `v1.2.7`, each by SHA-256; the per-task artifact gets its own `v1.2.7` ops folder.
- **CR-107.2 Ranked rows.** GLiNER2.5 multi at 63.1 (#19) and GLiNER2.5 small at 62.1 (#21), each linked to its Hugging Face checkpoint.
- **CR-107.3 Partial row.** jqv at 67.2 with no rank, listed as a partial run, with "425 of 534" and the reason (submitter-hosted endpoint, held-out hard items never sent) readable on the page.
- **CR-107.4 Nothing else moved.** The earlier GLiNER2 row stays at 53.0; hard-only view, custom-evaluation offer/toast (including CR-106's timing and tint), labels, prior rows and scoring rules preserved.
- **CR-107.5 Availability.** OpenDecision joins "Who could not be measured, and why" with its current reason.
- **CR-107.6 Verify.** Full tests, typecheck and production build; `verify-cr-107.mjs` on both live hosts.

## CR-20260921a checklist — publish JevBench v1.2.8 (CR-108)

Seeded by review gate 20260921T100004Z from the verbatim CR-108 acceptance list (the publishing job added no checklist).

- **CR-108.1 Pinned release.** Results, public-task and topic artifacts from public JevBench tag `v1.2.8`, pinned by SHA-256.
- **CR-108.2 New rows.** Every run-4 entrant shown with its artifact score and rank, each name linked to its project.
- **CR-108.3 Own class.** decision-machine-1 in the class "Closed decision model (API only, not Jev)" with its own legend entry and colour, light and dark.
- **CR-108.4 jqv complete.** jqv ranked with hard coverage 1.0; the "425 of 534" partial note gone.
- **CR-108.5 Nothing else moved.** Every earlier row's score untouched; hard-only view, custom-evaluation offer/toast, labels and scoring rules preserved.
- **CR-108.6 Availability.** "Who could not be measured" drops Decider 2B, Reflex, OpenDecision, LitJev and adds Werr and DIY Jev with concrete reasons.
- **CR-108.7 Verify.** Both production hosts after deployment, desktop and phone, light and dark.

## CR-20260921b checklist — held-out hard-tier detail and split policy (CR-109)

- **CR-109.1 Derived diagnostic.** Repository code derives hard public and held-out correct/attempted counts, accuracies, public-minus-held-out gaps, unpooled normal 95% intervals and the complete-field mean from the frozen v1.2.8 per-task artifact; no displayed result is hand-entered.
- **CR-109.2 Detail only.** Put the per-system table in a collapsed methodology/detail disclosure, never in the main ranking table. Show both item counts, the interval and field mean on every row; partial systems are visible but excluded from the baseline.
- **CR-109.3 Neutral reading.** One short paragraph says about 110 items means roughly ±9 points of noise, only a field outlier is meaningful, and hosted APIs received held-out items. No accusation and no contaminated label.
- **CR-109.4 Policy.** Page and README say training on the public split is allowed and should be declared, held-out results are separate, held-out is not guaranteed unseen, and fresh tasks are issued periodically.
- **CR-109.5 Verify.** Full tests, typecheck and production build; both live hosts at desktop and phone widths, diagnostic data and policy visible, no horizontal page overflow or browser errors.
## CR-20260921c checklist — Certo v1 entrant (CR-110)

- **CR-110.1 Pinned release.** Pin the three public artifacts from JevBench tag `v1.2.9` by SHA-256.
- **CR-110.2 Entrant row.** Certo v1 is linked to its model repository and shown at 68.2, rank #12.
- **CR-110.3 Honest conditions.** Keep its local-GPU endpoint, MIT licence, measured speed and non-zero estimated cost basis.
- **CR-110.4 No collateral changes.** Earlier scores, rules, hard view, CR-109 held-out diagnostic and split policy stay intact.
- **CR-110.5 Verify.** Full tests, typecheck and production build; both live hosts verified before the entrant DM.
## CR-111 — smalljev semantic-v9 entrant

- **CR-111.1:** Pin the public JevBench v1.2.10 results, per-task and topic artifacts by SHA-256.
- **CR-111.2:** Publish smalljev semantic-v9 at 62.4 / #29 with its repository link.
- **CR-111.3:** Record Apache-2.0, the GPU endpoint, non-zero estimated cost and public-benchmark-directed training disclosure.
- **CR-111.4:** Preserve every earlier score, the held-out diagnostic, hard-only view, custom-evaluation offer and scoring rules.
- **CR-111.5:** Verify both production hosts after deployment.

## CR-112 — djev openness correction

- **CR-112.1:** Pin JevBench v1.2.11 results, per-task and topic artifacts by SHA-256.
- **CR-112.2:** Correct djev to open/self-hostable: Apache-2.0 code, Google's Apache-2.0 DiffusionGemma weights, no djev-specific weights.
- **CR-112.3:** Describe djev as an inference method on DiffusionGemma, not a separately trained model; treat djev-spark as an alternate structured-read runtime, not a separate checkpoint.
- **CR-112.4:** Preserve every score, rank, outcome and other system field.
- **CR-112.5:** Verify the correction on both production hosts after deployment.

## CR-113 — Winnow-12B Q8 entrant

- **CR-113.1:** Pin JevBench v1.2.14 results, per-task and topic artifacts by SHA-256.
- **CR-113.2:** Publish Winnow-12B Q8 at 72.5 / #5 with its Hugging Face link.
- **CR-113.3:** Record Apache-2.0 Gemma 4 terms, the remote-GPU endpoint, measured latency, non-zero estimated cost and the private-training audit limitation.
- **CR-113.4:** Preserve the upstream v1.2.12/v1.2.13 thinking rows, every prior score, the held-out diagnostic, hard-only view and scoring rules.
- **CR-113.5:** Verify both production hosts after deployment.

## CR-115 — JevBench reranker class

- **CR-115.1:** Pin JevBench v1.2.16 results, per-task and topic artifacts by SHA-256.
- **CR-115.2:** Publish five full open reranker rows, led by zerank-2 at 68.9 / #12.
- **CR-115.3:** Preserve the preregistered neutral mapping and public-only calibration curves.
- **CR-115.4:** Record non-zero measured GPU cost and preserve every prior row and rule.
- **CR-115.5:** Verify both production hosts before replying to Ghita.

## CR-116 — Open-Jev 2B and 9B (Zefan Cai) entrants

- **CR-116.1:** The rows arrived in JevBench v1.2.15 and are carried unchanged by the v1.2.16 artifacts pinned in CR-115 (path fixed in `55436b0`); assert them: Open-Jev 9B (Zefan Cai) 56.7 / #44 and Open-Jev 2B (Zefan Cai) 53.8 / #46, linked to github.com/Zefan-Cai/Open-Jev.
- **CR-116.2:** Record MIT loader / Apache-2.0 adapters and bases, the remote-GPU endpoint and non-zero estimated cost; the zero-overlap training-data audit is in the JevBench release notes.
- **CR-116.3:** Both rows appear in the held-out diagnostic under its existing convention (2B 46/111 public vs 48/109 held-out; 9B 66/111 vs 68/109; field of 49 complete systems).
- **CR-116.4:** Preserve every score, rule and view.
- **CR-116.5:** Verify both production hosts (`ops/ux-2026-09-12/bin/verify-cr-116.mjs`).

## CR-117 — Xiaomi MiMo-V2.6-Pro release

- **CR-117.1 Source-backed identity.** Publish MiMo-V2.6-Pro as Xiaomi's MIT-licensed open-weight 1.02T-total / 42B-active multimodal MoE, with its official Hugging Face checkpoint, 1M context, release date, and exact standard OpenRouter product.
- **CR-117.2 Independent data.** Carry the existing-pipeline Artificial Analysis measurements with their source date and basis; do not infer absent LMArena, SWE-bench or Epoch results.
- **CR-117.3 Vendor results.** Ingest all 17 Xiaomi launch-appendix results as `self_reported`, retain printed versions, date unversioned snapshots, exclude them from Composite, and disclose the MiMo Cyber Bench 81.7-versus-80.2 source conflict.
- **CR-117.4 Benchmaxxing.** Run the published same-topic, measured-only method. With zero qualifying vendor-versus-independent same-benchmark overlaps, report “not enough independent data yet”; do not issue a tag or infer intent.
- **CR-117.5 Exact prices.** Join only `xiaomi/mimo-v2.6-pro` to the AA model row. Keep Pro UltraSpeed and Flash separate; publish each exact endpoint price with OpenRouter provenance.
- **CR-117.6 Verify.** Registry and score-evidence validation, full tests, typecheck and production build; model, comparisons, Pareto and Benchmaxxing views on both production hosts, with phone-readable screenshots.

## CR-118 — JevBench v1.3.0 scoring release

- **CR-118.1 Exact Intelligence.** Chance-correct each tier as `(accuracy - chance) / (1 - chance)`, clipped at zero; chance is averaged from `1 / options` (or score levels) over the actual frozen items. Keep hard at 30% and split the rest 1:2:2 over easy, standard and judge.
- **CR-118.2 Near-chance penalty.** Below 50 chance-corrected Intelligence, multiply every composite/preset by `(Intelligence / 50)^2`; at or above 50, no penalty. Calibration, Speed and Cost are unchanged.
- **CR-118.3 Eligibility unchanged.** Keep systems, services and small tool models in their existing ranked/unranked classes.
- **CR-118.4 Explain it.** Add the short page note: a cheap and fast system barely better than guessing could rank high; Intelligence is now above chance and systems below half-way get a growing penalty.
- **CR-118.5 Publish and verify.** Pin the public v1.3.0 artifacts, recompute default, hard-only and every preset, run tests/build, then verify both hosts at desktop and phone widths before drafting posts. No X post is part of this change request.

## CR-119 — multimodal JevBench preview

- **CR-119.1 Isolated preview.** Publish `/jev-models/multimodal-preview` with the exact prominent preview warning, `noindex, nofollow`, no navigation link and no sitemap entry.
- **CR-119.2 Artifact-derived results.** Repository code derives the 128-public-real-item overall and skill rankings, latency axes, available cost estimates and separate eight-item synthetic summary from committed run artifacts; no held-out item is published.
- **CR-119.3 Honest eligibility and axes.** Image-capable completed systems are ranked; text-only systems are “not eligible,” never zero. Calibration and unavailable prices remain explicitly unmeasured. This is not the JevBench Score.
- **CR-119.4 Content and examples.** Explain image reasoning, computer use and browser use, methodology and limitations. Show only public licensed examples with source attribution; keep synthetic results separate and non-rank-worthy.
- **CR-119.5 Verify and deliver.** Focused tests, typecheck and production build; both production hosts at 1440×1200 and 390×844, light and dark, without page overflow or browser errors; send Florian the URL with a live screenshot.

## CR-120 — Jev models SEO and link previews

- **CR-120.1 Metadata and indexability.** Give `/jev-models` a concise search title/description, canonical, complete Open Graph and X large-card tags; keep `/jev-models/multimodal-preview` noindex, unlinked and out of the sitemap.
- **CR-120.2 Generated preview.** A dedicated 1200×630 image shows the current top five, JevBench version/date, system and decision counts, and regenerates from the current results artifact during every board publish/build.
- **CR-120.3 Structured data.** Publish honest WebPage, Dataset and visible FAQ structured data with current artifact values and the JSON distribution.
- **CR-120.4 Search intent.** Concisely answer open alternatives, self-hosting/EU/GDPR, scoring and submission questions; never claim another service is GDPR-compliant. Describe jev-router.com only as “self-hosted open decision models” with the authors' neutrality disclosure.
- **CR-120.5 Verify.** Focused tests, complete tests/typecheck/production build, live metadata/image/schema and browser checks on both production hosts; record Serper rankings, Lighthouse baseline and sitemap submission status. No X post.

## CR-122 — launch links: Compare with a not-yet-ingested model

- **CR-122.1 Keep unknown ids.** `/compare?model=<id>&model=<id>` keeps an id the catalog does not have as a "Coming soon" entry (readable name from the id, e.g. `gpt-6-sol` → "GPT-6 Sol"; organisation guessed only for text), keeps it in the shared URL, and never shows or implies a value for it. Known models render exactly as before.
- **CR-122.2 Alias tolerance.** Ids resolve by exact variant/family id first, then by a normalised key (case, dots/dashes/spaces/underscores, `vendor/` prefix, 8-digit date suffix, `-latest/-preview/-beta`), then without the vendor word (`opus-5.5` → `claude-opus-5.5`). Bare family keys (`claude-opus-5`) resolve too. One implementation (`lib/compare-ids.mjs`) for page, metadata and image.
- **CR-122.3 Link previews.** Title, description, canonical, Open Graph and X large-card tags name every model of the URL (AA Intelligence Index only for measured models); `og:image` is `/api/og/compare?…`, a 1200×630 PNG with both models and a "Coming soon" card for the unknown one. `/compare` becomes a dynamic route by design (documented exception in `test/production/prerender.mjs`); the catalog data still arrives via `/api/page-data/compare`.
- **CR-122.4 Verify.** Unit tests for resolution/names/aliases/description; full suite, typecheck, production build; live check on both hosts (HTML tags, image, browser screenshots desktop/mobile, light/dark).

## CR-123 — Claude Opus 5.5 launch: Anthropic's own numbers, on launch day

- **CR-123.1 Catalog identity.** Publish Claude Opus 5.5 (announced 2026-09-22) as `claude-opus-5.5::max` — Anthropic's own standard evaluation configuration, matching the existing `claude-opus-5::max` convention and resolving the bare `claude-opus-5.5` id that launch replies link to. The hand-curated row disappears by itself once a live source carries the family.
- **CR-123.2 Official price.** Carry Anthropic's published API price from the launch post's pricing table: USD 4 input, 20 output, 0.20 cache read, 5 cache write per 1M tokens. Fast mode (USD 8 / 40) is a separate product and is not published as this model's price.
- **CR-123.3 Vendor results.** Ingest the 16 numbers Anthropic publishes for Opus 5.5 — nine from the launch post's benchmark table, seven more from the system card's Table 8.1.A — as `basis: self_reported` under their own `anthropic-…` identities, each with source URL, retrieval date, printed row and column, and the capture's hash. They never enter the Composite or a category score.
- **CR-123.4 Disclose what the vendor discloses.** Each row records the effort setting it was measured at (Terminal-Bench 4.0 at xhigh, everything else at max), who ran it (AutomationBench by Zapier, GDPval-AA and AA-Briefcase independently by Artificial Analysis), the tool configuration (HLE with/without tools), partial versus strict OSWorld scoring, that HealthBench Professional's table value is the length-adjusted score, and that safeguards could hand a task to a fallback model.
- **CR-123.5 Verify.** Registry and score-evidence validation, an independent critic round from a different model family, full tests, typecheck and production build; both production hosts must list the model and show the numbers marked as reported by the developer.

## CR-126 — GPT-6 Sol and GPT-6 Luna launch: OpenAI's own numbers, on launch day

- **CR-126.1 Exact configurations, no effort alias.** OpenAI names the reasoning effort for every number it publishes,
  and Artificial Analysis published the same families' effort configurations the same day (CR-125), so each claim joins
  the configuration it was measured at: `gpt-6-sol::xhigh`, `gpt-6-sol::max`, `gpt-6-luna::max`. Nothing is attached to
  a neighbouring effort. The bare `gpt-6-sol` / `gpt-6-luna` ids that launch replies link to resolve to these families.
- **CR-126.2 Vendor results.** Ingest the six numbers OpenAI prints as text about its own two new models as
  `basis: self_reported` under their own `openai-…` identities, each with source URL, retrieval date, the printed
  sentence or table cell, and the capture's hash: Sol (xhigh) AutomationBench 1.0.6 33.2 % at USD 0.27 per task,
  Sol (max) Agents' Last Exam V1 56.4 %, Sol (max) DeepSWE v1.1 68.8 %, Luna (max) DeepSWE v1.1 66.6 %, Sol (xhigh)
  OSWorld 2.0 offline (v2026.08.08 release, partial reward) 60.5 %. A lab's own run of a public benchmark is a different
  implementation from the board's, so these five identities are separate from `osworld-2::v2026.08.08`,
  `aa-automationbench::1.0.6` and every other operator's run, and none of them enters the Composite or a category score.
- **CR-126.3 Refuse what the post does not measure.** Every competitor cell of the same post stays out and is logged
  with its reason: OpenAI's closing note says competitor scores were taken from publicly available reports, which makes
  them secondary quotes. Also refused: GPT-6 Luna's AutomationBench and OSWorld figures (only a percentage-point change
  and a cost ratio are printed), and FrontierCode, the factuality evaluation and the alignment evaluations (charts with
  no printed datapoint values). A graph estimate is not a claim.
- **CR-126.4 Evidence access.** `scripts/capture-vendor-documents.py` gets HTTP 403 from openai.com although
  `https://openai.com/robots.txt` allows the path. The post was therefore loaded once in the shared desktop Chrome and
  the bytes the server returned for the document request were retained unchanged; the run manifest records the method
  next to the tool's own 403 receipt. No challenge was solved, bypassed or replayed. The two model cards and the
  pricing page were captured by the normal tool, and they confirm the price and context window the live sources carry
  (Sol USD 2 / 10, Luna USD 0.10 / 0.50 per 1M tokens, 1,050,000-token context, 128,000 max output tokens).
- **CR-126.5 Verify.** Registry and score-evidence validation, an independent critic round from a different model
  family, full tests, typecheck and production build; both production hosts must list the two models and show the
  numbers marked as reported by the developer.

## CR-128 — 2026-09-22: selectively ingest independent frontier scores

- **CR-128.1 Scope and identity.** Re-check the rows in `/home/flori/jobs/bh-frontier-update-20260922/third-party-scores.json` and its accompanying `THIRD-PARTY-SCORES.md` and `RESULT.md`; include only Claude Opus 5.5 and GPT-6 Astra, Sol and Luna. Prioritise a row only when its source and protocol genuinely match one of the seven existing Composite inputs. Join a score to an effort variant only when the source names that configuration; otherwise retain the source label unjoined. Deduplicate exact live observations and keep different operators, versions and protocols separate.
- **CR-128.2 Evidence and basis.** Every published number must be found in its primary-source page or data file and have its URL, retrieval date, hash-bound capture, exact locator/quote, protocol and units retained. A board-run evaluation is `measured`; a vendor submission stays `self_reported` and is never described as an independent run. Preserve caveats, including Vals' note that 30 of Opus 5.5's 198 Terminal-Bench attempts fell back to older models. Do not infer values, effort settings, rank or a Composite slot from a similar benchmark name.
- **CR-128.3 Registry and selective build.** Reuse a registry identity only when its protocol matches; give every distinct manual snapshot a versioned registry identity and collection-plan entry. Use the normal evidence validator and deterministic benchmark ingest. Do not run the full daily pipeline or re-review unrelated protocols.
- **CR-128.4 Batch publication.** Publish in small, reviewable batches. After each batch, verify every new observation on both production hosts for exact benchmark, model/configuration, value, unit, basis, source and caveat; verify the published source marker on score surfaces.
- **CR-128.5 Release and report.** Obtain an independent different-family review of the frozen data/evidence, run the full test suite, typecheck and production build, and verify both hosts at the final revision. Report each target family's Composite value, exact inputs used out of seven, rank, Pareto position and cost per task. Count only actual Composite inputs; if this source set supplies no valid value for a missing slot, preserve the formula and state the coverage limit.

## CR-130 — Jev-models link preview visual fix

- **CR-130.1 Public data only.** Keep the preview pinned to the public JevBench v1.3.0 artifact: 52 systems, 534 decisions, and the exact public top five with one-decimal scores — Jev 1.13.0 74.4, SemIf 73.1, djev 73.0, Winnow-12B Q8 71.2, reflex 4B 70.3. Do not read private or held-out JevBench data.
- **CR-130.2 Readable branded card.** Render a 1200×630 PNG with the JevBench Score, top five and scores, counts, Benchmark Heaven branding and `benchmarkheaven.com`. Make the names and scores readable at 320–420 px card widths, with no clipping or overflow. Keep the current cached build-prerendered route unless new evidence shows it is unreliable.
- **CR-130.3 Social metadata.** Preserve the fuller page search description, but use a concise social description of at most 80 characters for Open Graph and X. Emit an absolute HTTPS `og:image`, `og:image:type=image/png`, `og:image:secure_url`, width, height and useful alt text; retain `twitter:card=summary_large_image` and add Twitter image alt text. Change the `v=` cache token independently of the JevBench data revision when the card art changes.
- **CR-130.4 Regression gates.** Add focused checks for the exact public v1.3.0 counts and top five, the social metadata fields and cache token. Run the full test suite, typecheck and production build.
- **CR-130.5 Live and visual verification.** Verify the canonical and legacy hosts with Twitterbot, TelegramBot, WhatsApp, Facebook, LinkedIn, Slack and Discord user agents. Check early head tags, robots/noindex, compressed HTML size, response headers, PNG dimensions, file size and fetch speed. Save before/after X-, Telegram-, WhatsApp-, LinkedIn-, Slack- and Discord-style card screenshots. Send Florian the requested after screenshot by Telegram with a plain-English summary and cache note; record any official checker restrictions and keep the result report in the job folder.

## CR-131 — JevBench v1.4 release on Benchmark Heaven

Source: CR-20260923b in `03-CHANGE-REQUESTS-VERBATIM.md` and the release job's `PROMPT.md`. This release uses the approved v1.4.0 artifact and the private-lab scoring decision recorded there. The separate evergreen-preview request at `/home/flori/jobs/jev-models-evergreen-preview-20260923/PROMPT.md` is later and queued after CR-131; comply with its live-preview rule in this CR.

- **CR-131.1 Pinned result and API.** Copy only `results/v1.4/jevbench-v1.4-results.json` from the public JevBench v1.4.0 release into the site. Serve the exact aggregate artifact from `/api/jevbench/v1.4`, with its SHA-256 response header. Include all approved rows, exclude private djev results, and add no entrant. Do not include item IDs, text, golds, predictions or per-item results. Preserve existing API versions.
- **CR-131.2 Default board.** Make `/jev-models` render the v1.4.0 board with all 76 systems and 71 ranked systems. Show the official rank/score, four axes, public/sealed accuracy and gap, speed/cost evidence, visible `API` exposure flag and existing row disclosures. Clearly label any historical v1.3 material retained on this page.
- **CR-131.3 What changed.** Add a clear “What changed in v1.4” section with the 20% sealed Intelligence blend, moderated Calibration blend, k=1 public-to-sealed gap penalty above 25 percentage points, equal-weight harmonic mean, low-Intelligence penalty, separate Speed and Cost Jev-class gates, unchanged Speed/Cost axes, and API exposure disclosure. Formulas and language must match the approved JevBench method. Keep Hopper's public-half development and JevK5's public-set selection notes.
- **CR-131.4 Live-page social metadata.** Keep Open Graph/X metadata and artwork on the changing `/jev-models` URL evergreen: no ranks, scores, “leads at”, or frequently changing system counts. Use “JevBench by Benchmark Heaven” and describe the four axes. The branded card has no numbers. Dynamic model-detail previews omit ranks and scores. This release does not add the separately queued pinned-version route.
- **CR-131.5 Regression and build gates.** Add tests for the v1.4 revision, pinned artifact hash, exact approved top five, API exposure flag, retained disclosures, “What changed” section, and evergreen metadata. Run the full test suite, typecheck and production build.
- **CR-131.6 Publish and verify.** Use the normal main-branch change-request flow. Verify page and API on `benchmarkheaven.com` and `model-market-comparison.app.mintapis.com`, with the exact approved top five before publication (from the pinned artifact) and after publication. Publish the Hugging Face Space only after the v1.4 API is live; it must read the live API and show revision v1.4.0 and the same top five.
- **CR-131.7 Integrity and evidence.** Repeat the local-only sealed-ID/text scan against the final repo, API, page and Space source/output. Record zero matches without printing sealed strings. Record commit, API hash, test/build logs and both-host/Space checks in the release job.

## CR-132 — /jev-models v1.4 page fixes

Source: CR-20260923c in `03-CHANGE-REQUESTS-VERBATIM.md`. Ordered by Florian before the evergreen-preview CR and the SEO push.

- **CR-132.1 Compare view.** Restore the two-system compare on the v1.4 board with four radars: the four axes, accuracy per tier including sealed, v1.2 hard-tier accuracy by family, sealed accuracy by family (published aggregates only). Default Jev 1.13.0 vs #2; selectable pair; pair kept in the URL.
- **CR-132.2 Row notes.** A † marker only where a row has a row-specific note (not the shared provenance every row carries); note reachable by tap/click and tooltip; marker never wraps alone.
- **CR-132.3 v1.3 sections.** Restore the v1.3 hero bar chart with v1.4 scores, and move findings, alternatives/FAQ, costs, availability, method/tiers, limits and credit out of the collapsed history, reading v1.4 data. v1.3-only material (weightings, per-task grid, topic radars, held-out diagnostic) stays in the labelled history.
- **CR-132.4 Mobile/desktop QA.** 390×844, 360×800 and 1440 px, light and dark, both hosts: no page overflow, table usable (sticky name column), radars legible, no orphaned markers; screenshots saved. OG/X metadata stays evergreen.

## CR-133 — multimodal JevBench v0.1 review preview

Source: CR-20260923d in `03-CHANGE-REQUESTS-VERBATIM.md`; candidate artifacts and full methodology are in `/home/flori/jobs/image-jev-bench-continue-20260923/`.

- **CR-133.1 Aggregate-only results.** Use the frozen candidate artifacts for full, core and everyday-photo rankings, public/sealed aggregate accuracy, coverage, API exposure and method. No sealed item-level content, IDs, golds, prompts, images, or predictions may appear in the repository's public site data or rendered page.
- **CR-133.2 Honest tracks and exposure.** Report licensed real core and synthetic everyday-photo track separately; disclose 444 total items (265 public / 179 sealed), 294 core (176 / 118), 150 everyday-photo (89 / 61), 33.78% synthetic overall, and that the entire everyday track is synthetic. Explain that djev-spark saw the 100 public promo images during inference-only video evaluation and show its new sealed-photo result separately.
- **CR-133.3 Review-only route.** Preserve the route as a prominent noindex preview, with no navigation links and no sitemap entry. This work does not approve or announce a public JevBench release; the top five remain subject to Florian's decision.
- **CR-133.4 Validation and delivery.** Focused and full tests, typecheck, production build, local browser checks, then both-host live verification after `jevbench-v14-release2` is inactive. Provide a private review artifact and a plain-English Telegram with current ranking and unresolved decisions. Record commit, tests/build, live checks, and message receipt in the job result.

## CR-134 — evergreen live Jev-models preview and frozen version sharing

Source: CR-20260923e in `03-CHANGE-REQUESTS-VERBATIM.md`.

- **CR-134.1 Live preview stays evergreen.** Preserve the stable SEO title/description and branded image for the changing `/jev-models` URL. Open Graph and X title, description, image and image alt must contain no rank, score, “leads at” claim, or volatile system count.
- **CR-134.2 Frozen version pin.** Add a static exact-version route, `/jev-models/v1.4` for this CR, that renders only that public release's hash-checked frozen data while keeping the changing `/jev-models` page static. Its Open Graph/X preview may name its frozen top five and scores. Add a visible **Share this version** link using the exact pinned URL. Unknown versions return not found rather than silently showing another release.
- **CR-134.3 Model details.** Keep `/jev-models/<system>` previews free of changing ranks and scores. Any score-bearing model-detail preview must select and render an exact frozen version; the live detail metadata remains stable and name-only.
- **CR-134.4 Regression and production verification.** Test evergreen and pinned metadata, the sharing link, invalid pins, stable detail metadata and branded image/alt. Fetch the live board, pinned board and a detail URL from both `benchmarkheaven.com` and `model-market-comparison.app.mintapis.com` with `Twitterbot`, `WhatsApp` and `facebookexternalhit` user agents; verify status and tags. Run focused tests, full suite, typecheck, build and desktop/mobile page checks.
- **CR-134.5 Cache note and delivery.** In `OUTPUT.md`, explain that old X/WhatsApp cards cannot be purged from our side, X's Card Validator is unavailable, and give Florian the Meta Sharing Debugger steps without logging in. Send exactly one plain-English Telegram after both hosts are live and verified; record its receipt.

## CR-135 — JevBench v1.4.1 public board and API

Source: CR-20260923f in `03-CHANGE-REQUESTS-VERBATIM.md`; final aggregate and receipts are in `/home/flori/jobs/jevbench-v141-additions-20260923/`. GitHub release/tag v1.4.1 and the Benchmark Heaven site are live. CR-135 application commit `918c820d63b290027f927c1c4087224b279472d9` is deployed on all three configured hostnames; full receipt: `/home/flori/jobs/jevbench-v141-additions-20260923/SITE-PUBLISH-RECEIPT.json`.

- **CR-135.1 Exact aggregate artifact.** Publish only `jevbench-v1.4.1-results.json` (82 systems, 77 ranked) with SHA-256 `e6754863056503fe2b010410fc7111df884ac1f9ce4449aa369aab61d98092cd`. Preserve all 76 v1.4.0 axes and scores unchanged. Include the six new rows; their `api_flag` values are false. Do not add per-item outputs or sealed IDs/text/golds/predictions.
- **CR-135.2 Versioned API.** Add `/api/jevbench/v1.4.1` serving the exact frozen aggregate artifact and SHA-256 response header. Preserve `/api/jevbench/v1.4` byte-for-byte as the v1.4.0 API.
- **CR-135.3 Current and pinned pages.** Make the changing `/jev-models` board show v1.4.1 (82 systems, 77 ranked) with its public score/rank/axes and existing disclosures, while keeping its Open Graph/X title, description, image and alt evergreen. Add `/jev-models/v1.4.1` as an exact version pin using only the hash-checked v1.4.1 artifact, with its frozen preview and a visible “Share this version” link. Preserve `/jev-models/v1.4` as the v1.4.0 pin; unknown versions return not found.
- **CR-135.4 Top-five gate.** Compare the new rows with the approved v1.4.0 top five before publishing. Current verification has zero additions entering the top five and no reordering; publish normally without a preview hold. If any new row enters or the top-five order changes, stop before site publication, make a screenshot/ranking preview, notify Florian, and wait.
- **CR-135.5 Release and API verification.** Keep the GitHub tag/release live and verify its commit and artifact hash. Run focused tests, full suite, typecheck, dataset build and production build as required by the main brief. Verify `/jev-models`, `/jev-models/v1.4.1`, the preserved `/jev-models/v1.4`, and both API routes on `benchmarkheaven.com` and `model-market-comparison.app.mintapis.com`; confirm identical v1.4.1 API bytes/hash, 82 systems, 77 ranked and unchanged top-five order.
- **CR-135.6 Integrity and delivery.** Scan the final source, public page and both API responses for all 308 sealed IDs and 308 distinctive phrases; record zero matches without printing matched values. Preserve the one-message-per-author drafts in `AUTHOR-MESSAGES.md` and do not send authors. Send Florian the result table, top-five impact and publication status in plain English; retain the Telegram receipt.

The approved Capability/cost charts, two scatterplots, and lazy 3D view were included in CR-135 below the existing page content. The ImageJev example cards and updated noindex WIP preview remain outside CR-135 in the page-image job; the context-length table/chart remains queued for its own follow-on CR. Coordinate the next page slot through the agent board.


## CR-136 — JevBench alternatives, chooser and top-five comparisons

Source: CR-20260923g in `03-CHANGE-REQUESTS-VERBATIM.md`; full user request is preserved in
`/home/flori/jobs/jevbench-seo-hn-push-20260923/PROMPT.md`. The latest published public
artifact at seeding is JevBench v1.4.1, SHA-256
`e6754863056503fe2b010410fc7111df884ac1f9ce4449aa369aab61d98092cd` (82 systems, 77
ranked). Recheck the latest public artifact before implementation. Build all claims and
FAQ answers from the hash-checked published artifact; do not invent numbers or availability.

- **CR-136.1 Alternatives.** Add indexable `/jev-models/alternatives` covering “Jev alternatives”,
  “best Jev alternative” and “open source Jev alternative”, using fair comparisons derived
  from live released rows.
- **CR-136.2 Chooser.** Add `/jev-models/how-to-choose` by use case: most accurate from
  `sealed_accuracy`; fastest from the Speed axis, described as a benchmark score rather
  than universal wall-clock latency; cheapest from the Cost axis with each row's measured,
  estimated or announced basis disclosed; self-hostable from explicit public license/weights
  evidence only, leaving unknown evidence unknown. Never call the composite raw accuracy.
- **CR-136.3 Pair comparisons.** Add `/jev-models/jev-vs-jevk5`,
  `/jev-models/jev-vs-hopper`, `/jev-models/jev-vs-winnow-12b-q8` and
  `/jev-models/jev-vs-reflex-4b`, one Jev comparison per other member of the published top
  five. Read rank and metrics from the latest hash-checked artifact; do not infer a result
  from rounded display values.
- **CR-136.4 Metadata and navigation.** Use “JevBench by Benchmark Heaven” in titles and
  Open Graph metadata; add accurate descriptions, canonical URLs, evergreen live-page
  previews, Dataset and page-specific FAQ JSON-LD, sitemap entries and internal links from
  the board and relevant model pages. Provide v1.4.1-backed detail handling for top-five
  keys missing from the older v1.2 detail reader, including JevK5 and Hopper.
- **CR-136.5 Hugging Face and repository links.** The Space app already reads the v1.4.1
  API and its aggregate-only snapshot; its running revision, card metadata and reciprocal
  board/GitHub links are recorded in
  `/home/flori/jobs/jevbench-seo-hn-push-20260923/HF-PUBLISH-RECEIPT.json`. Keep the JevBench
  GitHub README, HF Space and any necessary owned post linking to the board. Check for an
  existing official v1.4 announcement before publishing through Harold's normal account
  checks; no duplicate. No HN posts/comments, spam, fake accounts or reviews.
- **CR-136.6 Verify and sustain.** Run focused validation, full tests, typecheck, dataset
  build and production build as required by the main brief. Verify content, canonical/meta/OG,
  JSON-LD, sitemap, artifact-backed values and mobile layout on both production hosts (plus
  the configured www alias). Run Serper after deployment for the 14 intent/brand/comparison
  queries in US and Germany; append board and Space positions to the SEO loop CSVs and add
  a dated explanation to its ledger. Keep `SEO-CR-RESERVED` until site deployment, results
  and ledgers are recorded, then remove it. Send Florian one requested plain-English done
  message; the plan message was already sent.

## CR-139 — Benchmark Heaven number-audit remediation (2026-09-24)

Source: `/home/flori/jobs/bh-numbers-audit-swarm-20260923/final/PROMPT.md`, Phase 4. Work only from `CONFIRMED.jsonl` and its linked receipts in that job folder. Refresh volatile sources before changing values. Keep Artificial Analysis-derived rows unchanged until written permission is resolved; do not convert the 57 unclear findings into fixes or read/publish sealed JevBench item-level data.

| ID | Requirement | Acceptance |
|---|---|---|
| CR-139.1 | Refresh confirmed, non-AA provider prices, availability/status, source dates, currency conversions, catalog counts, and subscription values from current primary sources; rebuild the dataset from retained source captures rather than hand-transposing the prior snapshot. | Every changed value has a primary URL, retrieval/publication date, immutable receipt hash, locator, native unit, and conversion formula where relevant. Withdrawn/unavailable routes remain dated and explicitly identified. No unconfirmed or AA-derived value is changed. |
| CR-139.2 | Preserve conditional and cache pricing in the offer model: OpenRouter prompt-length tiers and UTC schedules, plus AWS Bedrock, Azure AI Foundry, and Vertex AI cache-read rates. Propagate route identity, conditions, unit conversions, and adjusted-cost calculations to the displayed offer details. | Regression tests cover condition matching, route identity, units, cache-read and adjusted-cost arithmetic. Each mapped value traces to its exact source capture. |
| CR-139.3 | Correct source-to-score transforms, including calculating the Coding Agent v1.4 median from full-precision inputs before rounding; recompute affected outputs from retained source rows and correct stale method dates. | Tests reproduce the source-derived result and protect the rounding order. Recomputed output is bound to the retained snapshot and provenance. |
| CR-139.4 | Make Composite evidence eligibility consistent across detail, API, filter, chart, and shortlist consumers; repair confirmed missing or stale catalog counts and source-to-identity mappings. | The same exact-evidence rule is tested at each consumer surface. Counts and identities reconcile to the rebuilt dataset and current primary sources. |
| CR-139.5 | Fix confirmed display and documentation findings: Judged and HealthBench Professional labels/scales, preliminary-result disclosure, per-row lower-bound Real-SWE costs, stale source/collection notes, and subscription metadata. | Each qualification appears where the value is shown; source notes and plan/catalog fields have current captures and dates. No unsupported positioning or certainty claim is added. |
| CR-139.6 | Correct the historical JevBench v1.1.2 pooled-accuracy fields using official tier counts; for the five unsupported v1.2 reranker rows, add primary-source support or remove unsupported cells, and update the stale source-tag comment. | Exact affected API bytes and version boundaries are verified. Produce a before/after leaderboard preview for Florian and do not publish ranking-related corrections until he approves the preview. No sealed item-level content is read or exposed. |
| CR-139.7 | Run dataset build, focused regression tests, full test suite, typecheck, and production build; verify the same revision and source snapshot on both production hosts; retain receipts and an independent non-implementer review. | All gates pass, both hosts agree, the independent reviewer verifies every CR-139 row live at desktop/mobile widths in light/dark, and no AA-held or unclear row was silently changed. Keep CR-139 open until the historical-ranking preview receives approval and the accepted release is live. |

## CR-140 — JevBench priority evaluation checkout (2026-09-24)

Source: Florian's approved request in `/home/flori/jobs/jevbench-paid-eval-20260924/PROMPT.md` and follow-up instruction. Implement in an isolated worktree and merge through the site's queue. Keep `/jev-models/request-evaluation` unlinked from the JevBench page until the preview is approved.

| ID | Requirement | Acceptance |
|---|---|---|
| CR-140.1 | Add an English request page explaining the independent, volunteer-run project, free normal re-scoring, $49/$99 per-benchmark fees, code review, team discretion, identical method/sealed set/rules, public-interest scheduling, full-refund cases, the 48-hour result window, public priority marker and private-report choice. Include the research/non-profit fee-waiver route, terms and imprint links. | Page is modestly placed, noindex until linked, states payment changes scheduling only, and does not promise evaluation before review. |
| CR-140.2 | Collect email, model name, HF/GitHub links, access method/instructions, benchmark selection, visibility and notes. Refuse common plaintext token/key patterns and show the supplied age recipient for encrypted handover. Add server-created Stripe Checkout Sessions with per-benchmark pricing, USD tax calculation, receipt email and request metadata; provide success/cancel pages. | Checkout amount is computed server-side, only TEST keys are configured before approval, and no credential enters the repository or logs. |
| CR-140.3 | Verify Stripe webhook signatures and idempotently store paid requests in a dedicated Sandy Postgres table. Send Harold's requested payment notice with submitter, model, benchmark, amount and Stripe link. Provide `~/bin/jevbench-review` and `~/bin/jevbench-refund <request_id>`; automatically full-refund unsafe/non-evaluable requests and requests still undelivered 48 hours after review passes. | Stripe events and notification/refund transitions are retry-safe; private request data stays out of application logs; a completed result stops the deadline refund. |
| CR-140.4 | Update privacy and terms; render a “priority run” label for a published data row explicitly carrying `priority_run: true`. | Frozen JevBench artifacts and scores are not edited as part of the feature; private requests never become public without consent. |
| CR-140.5 | Run automated checks and a TEST-mode end-to-end payment, signed webhook, notification and full refund. Capture desktop/mobile screenshots in light/dark mode and send them to Florian for approval. | Do not switch to LIVE or add the JevBench page link until Florian approves the preview. Record test receipts, hashes, logs, disk cleanup and any remaining gates in `OUTPUT.md` and `RESULT.md`. |

## CR-141 — ImageJevBench v0.1 final split, sealed-weighted score and overfit penalty (2026-09-24)

Owner: `claude:imagejevbench-final` (job `/home/flori/jobs/imagejevbench-final-20260924`). Method: that job's `METHOD.md`.

| ID | Item |
|---|---|
| CR-141.1 | Serve the frozen final split: 444 = 228 public / 216 sealed (core 139 / 155, photos 89 / 61); family table; honest note that 1/3 public is not reachable without new items. |
| CR-141.2 | 35/65 weighting and 15-point matched-family overfit penalty in the artifact and page; 11 systems incl. Bonsai-2-27B v2. |
| CR-141.3 | Computer Use / Browser Use preview-track section (counts, decision types, cross-track sealing rule, Kev flag, "not measured yet"). |
| CR-141.4 | Validator, tests, build, both-host live verification and sealed-content scan; `/image-jev-bench` prepared on an unpushed branch only. |

## CR-142 — Jev-models capability and context charts (2026-09-24)

Source: Florian's request preserved verbatim as `CR-20260924jev-page-fixes` in
`03-CHANGE-REQUESTS-VERBATIM.md`; detailed working notes and receipts are in
`/home/flori/jobs/jev-page-fixes-20260924/`.

| ID | Requirement | Acceptance |
|---|---|---|
| CR-142.1 | Measure the seven ranked systems missing v1.2 hard-tier family breakdowns, using the official protocol and public plus held-out hard items. Publish only aggregate family counts and accuracy. | Each family row reconciles to the 220 hard-tier decisions; all other artifact fields, scores and ranks are unchanged. No per-item content is added. If any score or rank would change, stop and prepare a preview for Florian. |
| CR-142.2 | Distinguish the GPT-6 Luna medium and low-reasoning rows in “Capability with cost alongside”. Make the cost series visible on its secondary logarithmic scale and state that lower cost is better. | Both presets have distinct visible labels; cost bars, scale ticks, values and legend are present. |
| CR-142.3 | Fix light/dark chart labels, ticks and legends in Capability vs cost, Capability vs speed, the 3D view, and public accuracy by actual input length. Add system/value hover or focus tooltips and permanent labels for the top five systems. | Theme tokens provide readable SVG text in both themes; all four views identify systems and values; desktop and 390 px mobile screenshots verify light and dark. |
| CR-142.4 | Replace the coarse input-length buckets with `<2k`, `2–8k`, `8–16k`, `16–64k`, `64–256k`, `256k–1M`, `≥1M`; add a logarithmic exact published context-limit chart with training and serving limits shown separately where known. | Public aggregate buckets reconcile for each included system. All 82 exact source-backed context rows are represented; unknowns and training markers are clear, and the existing source links and notes remain. |
| CR-142.5 | Write `PROPOSAL-LONG-CONTEXT.md` for a possible Jev-class track at 16k/64k/256k/1M, including item design, running cost, and qualifying systems. | Proposal only; no benchmark track or items are built. |
| CR-142.6 | Verify the deployed page on `benchmarkheaven.com`, `www.benchmarkheaven.com`, and `model-market-comparison.app.mintapis.com`; retain screenshots and results, then notify Florian as requested. | Hosts serve the merged revision and matching aggregates; light/dark desktop and 390 px screenshots are retained; deployment and notification receipts are recorded. |

## CR-145 — Privacy-friendly Benchmark Heaven analytics (2026-09-24)

Source: Florian's approved request preserved as `CR-20260924-bh-analytics` in
`03-CHANGE-REQUESTS-VERBATIM.md`.

| ID | Requirement | Acceptance |
|---|---|---|
| CR-145.1 | Run official Umami `v3.4.0` on Sandy PaaS with a new dedicated PostgreSQL database and role through PgBouncer. Use a unique app secret, daily salt rotation, disabled Umami telemetry, and no default admin password after initial setup. | PaaS app is healthy, PostgreSQL migrations work through the direct migration URL, runtime connects through PgBouncer, and the authenticated dashboard is reachable at the recorded URL. Secret values stay in mode-600 files / write-only PaaS settings. |
| CR-145.2 | Track page views, daily unique visitors, referring host, country, browser, OS, and device. Use Umami's default bot filtering and honor Do Not Track. Serve both the tracker and collection endpoint through the site's own `/analytics` path. Retain only validated compare model IDs in compare URLs; strip all other query strings, URL fragments, referrer paths, screen dimensions, language and page titles. | Browser tracker sends no cookie or local-storage write, only posts through the site origin, omits arbitrary URL/referrer detail, distinguishes compare pairs, scopes to production hosts, and skips DNT requests. Live reports show the required path/referrer/country/device dimensions. |
| CR-145.3 | Publish a short factual privacy notice and run automatic retention for the analytics database. Keep daily aggregate counters separate and accurately disclosed. | Privacy page lists the data, daily pseudonymous identifier inputs, DNT, processing location and 13-month retention without claiming that raw IP is never processed; automated cleanup removes expired event/session data. |
| CR-145.4 | Add a daily English digest line with yesterday's page views and top referrers, using an authenticated Umami API key stored outside the repository. | Berlin-day boundaries are DST-safe; the job queues one line via `~/bin/notify digest` before the evening digest, and no credential appears in output or logs. |
| CR-145.5 | Use an isolated worktree, pull request and merge queue. Verify a real event arrives from each production site host after deployment, and retain receipts. | The queue's typecheck/build/tests and both-host deployment checks pass; a live tracker event appears in the Umami report; smoke data is removed or clearly marked; PR and deployment revisions are recorded. |
| CR-145.6 | Check disk/watchdog status before builds, deployment and any large downloads; keep required artifacts and report job-created deletions. Write English `RESULT.md` and the requested German `OUTPUT.md`; send the requested Telegram receipt in the standard format. | No heavy step starts while the disk watchdog is critical; `RESULT.md` lists deleted job-created intermediates (or says none), and Telegram contains the dashboard URL and credentials-file path but no secret. |
