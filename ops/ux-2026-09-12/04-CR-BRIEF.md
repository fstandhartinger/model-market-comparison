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
