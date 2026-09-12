# PROGRESS — Benchmark Heaven UX / data / Benchmaxxing workstream

Single ledger for the checklist in `01-BRIEF.md` (authoritative text: `00-REQUIREMENTS-VERBATIM.md`).

**Status vocabulary:** `open` · `in-progress` · `implemented` (code merged + green + deployed)
· `verified` (checked live at desktop *and* mobile width, evidence saved).
**Only an engine other than the implementer may set `verified`.**

Evidence root: `/opt/benchmarkheaven/state/ux-evidence/`

---

## Seeding note (iteration 1, 2026-09-12, claude-opus)

Seeded from `01-BRIEF.md` + `/opt/benchmarkheaven/state/USER-UX-CORRECTION-ACCEPTANCE.md`.
Every "shipped" claim in the acceptance record was re-checked against the **source tree** and
against a live fetch of https://benchmarkheaven.com. Nothing is carried over as done on trust.

Live fetch 2026-09-12 (HTTP 200, 5.7 MB): still contains "Benchmarks in perspective"; contains
no "Strong confidential", no "Trains or keeps", no "Are you a company", no "30:1", no
"EU-hosted only", no "#benchmarks". Hermes' commits `f59c021`/`4c363b6` did land a Simple /
Advanced switch, the `#benchmarks`/`#providers` columns and a Benchmaxxing tab — those are
credited below, the rest is marked open.

### Defects found while seeding (not in the original checklist)

- **D1** `SettingsContext.DEFAULTS.inputWeight = 20`, but `FIXED_BLENDS` has no 20 entry, so the
  default is not a selectable option and `setInputWeight(20)` is rejected by the guard. The
  blend `<select>` therefore renders a value that does not exist. Fixed together with R4.2.
- **D2** `GlobalFilters` Reset sets `excludeChinese` to **true**, while the default is `false`
  (R4.6). Reset must restore the documented default.
- **D3** The `# benchmarks` column shows `composite_coverage` — the number of filled *composite
  slots* (0–5), not the number of benchmarks the model has a result for (the dataset knows
  `benchmark_results.coverage.by_model[id].available`, out of 75 registry benchmarks). The
  column as shipped is misleading. Fixed with R2.2.

---

## Ledger

| ID | Requirement (short) | Status | Evidence | Notes |
|---|---|---|---|---|
| R1.1 | Default sort: score descending | implemented | `ux-evidence/iter1/verification.json` | `aria-sort=descending`, first scores 99.2→89.5 |
| R1.2 | Header "Score" + small "(active score)" underneath, follows selector | implemented | `ux-evidence/iter1/verification.json` | header renders `SCORE ▼ (Composite)`; follows the selector via `SCORE_SHORT_LABELS` |
| R1.3 | Rename → "Adjusted Cost" | implemented | `ux-evidence/iter1/verification.json` | live string check |
| R1.4 | (i) next to Adjusted Cost, plain explanation | implemented | `ux-evidence/iter1/verification.json` | `InfoTip` next to Adjusted Cost; tooltip text verified |
| R1.5 | Remove the "Chutes global fallback" inline text | implemented | `ux-evidence/iter1/verification.json` | phrase gone from the whole source tree; `PriceAssumptions` now one line + method link |
| R1.6 | Fuller methodology section, reachable but not prominent | implemented | `app/about/page.tsx` | `/about` rewritten into anchored sections: #adjusted-cost, #score, #data-policy, #identity |
| R1.7 | (i) next to Score explaining composition | implemented | `ux-evidence/iter1/verification.json` | per-score explanation via `scoreTip()` |
| R1.8 | (i): desktop hover tooltip, mobile modal with ✕; a11y | implemented | `ux-evidence/iter1/verification.json` | desktop: 1 tooltip / 0 dialogs; mobile: dialog with ✕, closes. Branches on `(hover:hover) and (pointer:fine)`, not width |
| R2.1 | Remove Channels / Top provider channels columns | implemented | `ux-evidence/iter1/verification.json` | from `f59c021`; re-checked live — neither column string is rendered |
| R2.2 | Add #benchmarks and #providers columns | implemented | `ux-evidence/iter1/verification.json` | now `benchmark_count` from `benchmark_results.coverage.by_model[].available` — observed 14–20, i.e. no longer the 0–5 composite slots |
| R3.1 | New hero claim (most complete collection + realistic cost) | implemented | `ux-evidence/iter1/verification.json` | claim is generated from the dataset (13,924 results · 75 benchmarks · 839 models) so it cannot drift; also in metadata, OG, footer, README, brand SVGs. **Pending Fable 5.1 final wording (X3).** |
| R4.1 | Redesign the filter bar, elegant and uncluttered | implemented | `ux-evidence/iter1/desktop-filters.png` | grouped into Ranking / Price basis / Regional settings / Data confidentiality / More settings |
| R4.2 | Fixed I/O blend: add 20:1 (default) and 30:1 | implemented | `ux-evidence/iter1/verification.json` | blend list now has 20:1 and 30:1; default reads back as 20 |
| R4.3 | "One variant for Reasoning models" → extra settings | implemented | `ux-evidence/iter1/desktop-filters.png` | moved into "More settings" |
| R4.4 | Featured audit ≈ AA top 20; DeepSeek V4.1 Flash included | open | — | 101 models currently featured — far more than 20 |
| R4.5 | "Hide deprecated" → extra settings | implemented | `ux-evidence/iter1/desktop-filters.png` | moved into "More settings" |
| R4.6 | "Exclude Chinese providers" unchecked by default | implemented | `ux-evidence/iter1/verification.json` | `aria-pressed=false` on load; Reset now restores false (D2) |
| R4.7 | Rename → "EU-hosted only" | implemented | `ux-evidence/iter1/verification.json` | label changed, EU eligibility logic untouched |
| R4.8 | Regional settings section (Chinese / EU / US) | implemented | `ux-evidence/iter1/desktop-filters.png` | the three options now sit under a "Regional settings" heading |
| R4.9 | Rename → "Strong confidential guarantees" | implemented | `ux-evidence/iter1/verification.json` | label changed, TEE logic untouched |
| R4.10 | "Trains or keeps your data" filter from OpenRouter policy list; Chutes exception | implemented | `ux-evidence/iter1/`, `data/raw/openrouter-data-policy.json` | collector + parser + 7 tests; 85 providers, 48 pass; parse cross-checked against OpenRouter's own facet counts (47/81 exact). Off by default and the cheapest route demonstrably changes when toggled |
| R4.11 | Evidence/provider/task-token toggles → extra settings | implemented | `ux-evidence/iter1/desktop-overview-tooltip.png` | folded into an "Evidence ▾" popover above the table |
| R5.1 | Simple (start) + Advanced mode | implemented | `ux-evidence/iter1/verification.json` | `aria-selected=true` on Simple at first load |
| R5.2 | Simple: top 15 featured, sorted by adjusted cost descending | implemented | `ux-evidence/iter1/verification.json` | featured-only, limit 15, cost descending (17.40 → 1.83). Only 6 rows survive the score≥85 + measured-token filters today |
| R5.3 | Score slider, default > 85 | open | — | currently a text `NumFilter` |
| R5.4 | Max adjusted cost slider, default unlimited | open | — | currently a text `NumFilter` |
| R5.5 | Distribution histogram while a slider moves | open | — | |
| R5.6 | Wizard (company → privacy/region → minimums → budget → results) | open | — | |
| R6.1 | "Are you a company" checkbox | open | — | |
| R6.2 | Research: may companies use consumer subscriptions? + Telegram | open | — | |
| R6.3 | Subscription prices/quotas folded into the cost view, labelled | open | — | |
| R7.1 | New logo in the page | open | — | asset at `ops/ux-2026-09-12/assets/benchmark-heaven-logo-light.jpg` |
| R7.2 | Favicon / apple-touch / og from the new logo | open | — | |
| R7.3 | Dark-mode logo variant, switched with the theme | open | — | |
| R8.1 | Release-post-style benchmark comparisons and listings | open | — | `ChartsBoard`/`BenchmarkCompare` exist; not yet to the bar |
| R9.1 | Full fresh data run, every live source dated today | open | — | |
| H1 | Historical snapshots of all benchmark scores | implemented | — | `573ea60`; `benchmark_results.historical` present — needs audit |
| H2 | Bridged comparison via anchor models, uncertainty reported | implemented | — | `573ea60`; needs multi-hop + re-basing tests |
| H3 | UI filter "better than model X in category Y" | open | — | |
| B1 | Benchmaxxing tab in Advanced | implemented | — | `BenchmaxxExplorer`; needs live verify |
| B2 | Method identifying strong-on-some / weak-on-others | implemented | — | topic-local percentile jump; critique pending |
| B3 | Missing scores must not bias the result | implemented | — | coverage suppression; needs test audit |
| B4 | Benchmaxxing tag in overview table + tab | open | — | tab only, not in the overview table |
| B5 | Small-print method explanation | open | — | |
| B6 | Many-axis radar, similar topics clockwise-adjacent | implemented | — | `BenchmaxxingReport`; needs live verify |
| B7 | Jaggedness weighs heavily; specialisation not penalised | implemented | — | `test/benchmax-jagged.test.mjs`; needs critique |
| X1 | Autonomous on Sandy with engine fallback | implemented | — | `bin/tick.sh` cron |
| X2 | Codex never above 80 % weekly | open | — | enforced by `iterate.sh`; needs a recorded check |
| X3 | Fable 5.1 design passes happened and were implemented | open | — | no `DESIGN-DIRECTIVES.md` yet |
| X4 | UI meets the design bar | open | — | |
| X5 | CHANGELOG / API.md / fork-sync prompt updated | open | — | |
| X6 | Final line-by-line completeness audit | open | — | |
| X7 | Final Telegram to Florian | open | — | |
| D1 | Blend default 20 is not a selectable option | implemented | `ux-evidence/iter1/verification.json` | blend 20 is a real option; settings key bumped to v7 to discard the broken payload |
| D2 | Reset restores `excludeChinese = true` against its default | implemented | `components/GlobalFilters.tsx` | Reset restores every documented default; `defaultMinFor("composite")` is now 85 so a clean page is not reported as modified |
| D3 | `#benchmarks` shows composite slots, not benchmark count | implemented | `ux-evidence/iter1/verification.json` | see R2.2 |

---

## Recorded interpretations (Florian may overrule — carry into X7)

- **R4.4** The new "roughly the AA top 20 are featured" rule supersedes the older house rule
  that Gemini is not featured. 101 models are featured today; that is not "roughly 20".
- **R4.10** The checkbox is an **opt-in to include** providers that train or retain data. It is
  unchecked by default, so such providers are filtered out by default. Chutes is always
  treated as satisfying both guarantees.
- **R4.10 (second interpretation, the consequential one)** Read literally, "a provider not in
  the OpenRouter list is filtered out" would also remove every provider OpenRouter does not
  list at all — today: T-Systems, TensorX, Scaleway, OVHcloud, IONOS, STACKIT and
  TrustedRouter, i.e. exactly the European sovereign hosts the `/eu` view exists for.
  Removing them would assert that they train on or retain your data, which we have not read
  anywhere and would be an invented policy (ground rule 5). **Decision: known-fail is
  filtered out, known-pass is kept, and unknown is kept and labelled as unknown** in the
  filter's own (i) text and on `/about#data-policy`. Numbers: 48 providers pass, 37 fail,
  7 are unknown. Florian can overrule this to "unknown is filtered out too" — carry to X7.
- **R5.2** "über den Preis absteigend sortiert" is implemented **literally** (most expensive
  first) in Simple mode.

---

## Iteration log

- **2026-09-12 · iteration 1 · claude-opus** — seeded this ledger; re-checked every prior claim
  against source + live; located the R4.10 source; recorded defects D1–D3.
  Then implemented and locally verified: R1.1–R1.8, R2.2, R3.1, R4.1–R4.3, R4.5–R4.11,
  R5.1, R5.2, D1–D3.
  - New data source: `scripts/fetch-openrouter-data-policy.mjs` → `data/raw/openrouter-data-policy.json`.
    Robots-allowed public page, one request per run, parse validated against the page's own
    facet counts (47 zero-retention / 81 does-not-train — both matched exactly). Refreshed
    daily from `ops/daily/daily.mjs`, deliberately **non-fatal** there so a layout change in a
    secondary table cannot block price and benchmark publication.
  - Routes resolve to an OpenRouter provider slug through `endpoint_tag`, which is
    OpenRouter's own identifier — 1995 of 1996 OpenRouter routes resolve, no name matching.
    Non-OpenRouter platforms use a small documented alias table; anything unmapped stays
    `null`, never a guessed verdict.
  - Gate: `build-dataset` ✓, `npm test` 238/238 ✓, `tsc --noEmit` ✓, `npm run build` ✓.
  - Verification harness committed as `bin/verify-live.mjs`; evidence in
    `/opt/benchmarkheaven/state/ux-evidence/iter1/` (verification.json + 4 screenshots,
    desktop 1440×950 and mobile 390×844).
  - Two defects the browser check caught and that are now fixed: Advanced inherited
    Simple's sort because `defaultSort` only seeds `useState` (fixed with a remount key),
    and the score sub-label printed the full 60-character label instead of the name.
  - **R6.2 delegation failed** — the free OpenCode model aborted on a sandbox permission
    prompt (`/home/flori/.agent-budget.json`) before doing any research. R6.2 stays open;
    retry with a prompt that does not leave the repo directory.
