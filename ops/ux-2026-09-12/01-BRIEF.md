# Benchmark Heaven — UX, data & analysis workstream (commissioned 2026-09-12)

**Authoritative sources:** `00-REQUIREMENTS-VERBATIM.md` and `02-ADDENDUM-HERMES-CHAT.md`
(requirements Florian sent only to Hermes: ECI in the Composite, eight extra benchmarks, PRD
review, one-writer coordination). This brief turns it into a checklist.
Where they disagree, the verbatim text wins. Where the verbatim text is ambiguous, this brief
records the decision taken, so a reviewer can challenge it.

**Where:** Sandy Hetzner (`65.109.49.103`), user `flori`, repo `/opt/model-market-comparison`,
live at **https://benchmarkheaven.com** (and the legacy host
`https://model-market-comparison.app.mintapis.com`, which must keep working). Pushes to
`main` auto-deploy through the Coolify webhook; `/opt/mmc-daily/redeploy.sh` is the fallback.

**Who:** fully autonomous agent iterations started by `bin/tick.sh` (cron, every 10 min).
Florian's laptop is shut down. Nobody will answer questions — decide like a careful
colleague, write the decision down, keep going.

---

## 0. Ground rules

1. **Nothing is done until it is verified live.** "Implemented" means: code merged, tests
   green, deployed, and checked on https://benchmarkheaven.com in a real browser at desktop
   *and* mobile width, with a screenshot or DOM check saved under
   `/opt/benchmarkheaven/state/ux-evidence/`. A claim without evidence stays open.
2. **`PROGRESS.md` in this folder is the single ledger.** Every item below has a row:
   `ID | status (open / in-progress / implemented / verified) | evidence path | notes`.
   Only a *different engine than the implementer* may set `verified`.
3. **Hermes already recovered these requirements** into
   `/opt/benchmarkheaven/state/USER-UX-CORRECTION-ACCEPTANCE.md` and shipped parts of them
   (commits `f59c021` "Deliver simple UX and topic-local Benchmaxxing signal", `4c363b6`,
   `53e8ad7`, `9caf5f3`, and phase 10's historical retention `573ea60`). The first iteration
   seeds `PROGRESS.md` from both that record and this brief, **re-checks every "shipped"
   claim against the live site**, and marks as open whatever is not demonstrably live.
   On 2026-09-12 19:20 UTC the live page still showed the old hero claim, no 30:1 blend, no
   "Strong confidential guarantees", no "Trains or keeps your data", no `#benchmarks`
   column and no "Are you a company" — so a lot is still open.
4. **Keep `main` green:** `node scripts/build-dataset.mjs`, `npm test`,
   `npx tsc --noEmit -p .` before every push. Small, reviewable commits.
5. **Data honesty:** every number has provenance; estimates and bridged/approximated values
   are labelled as such in data *and* UI. Never invent a score, a price, a quota or a policy.
6. **Respect robots.txt, rate limits and bot protection.** Never circumvent access control.
7. **Billing:** Codex only via Florian's ChatGPT Pro subscription (never an API key); Claude
   Code only via the subscription login (never `ANTHROPIC_API_KEY`). The runner enforces
   both; if you ever see API-key auth, stop and report.
8. **Do not disturb other workloads on Sandy.** Postgres, the tao-trader stack, mosquitto,
   bookstack tenants and other crons share this box. Disk is ~90 % full: clean up after
   yourself, keep logs bounded, no big downloads without checking `df -h /`.
9. **Commit trailer:** name the engine that did the work, e.g.
   `Co-Authored-By: Claude Opus 5 (Sandy UX workstream) <noreply@anthropic.com>` or
   `Co-Authored-By: Codex GPT-6 Astra (Sandy UX workstream) <noreply@openai.com>`.

---

## 1. Engines, limits and delegation (verbatim rule, made operational)

> **Update 2026-09-12 ~20:00 UTC (Florian):** "Ich fürchte wir müssen GPT-6 Astra etwas
> sparsamer einsetzen, das Limit ist bei 63% und der Rest bis 100 muss noch 6d 12h reichen …
> lass uns lieber auf GPT 5.6 Luna ausweichen wenn wir codex einsetzen." → Wherever this
> workstream uses Codex (fallback work engine and review gates), the model is
> **GPT-5.6 Luna** (`gpt-5.6-luna`), not GPT-6 Astra. Engine id `codex-luna`. Do not call
> `gpt-6-astra` from this workstream at all. The 75 % start / 80 % hard cap still applies.

Every iteration, `bin/pick-engine.sh` measures the real limits with
`~/.claude/skills/agent-limits/limits.py --json` and chooses **in this order**:

1. **Claude Code Opus 5** — while the Claude session *and* weekly windows are both below
   70 % and no hard limit hit is recent. (Florian's shared `QUOTA-CONTINUITY.md` of
   2026-09-12 is stricter than this message and binds all agents on Sandy: prepare a durable
   handoff at 60 %, start no new Claude unit at 70 %. The stricter gate wins.)
2. **Codex GPT-5.6 Luna** (was GPT-6 Astra until 2026-09-12 20:00 UTC) — if Claude is near its limit, and Codex's weekly window is below
   75 %. **Hard cap: Codex must never exceed 80 % of the weekly limit** (Florian: keep 20 %
   in reserve; QUOTA-CONTINUITY: prepare handoff at 70 %, admit no new unit at 75 %). `iterate.sh` re-measures every 5 minutes during a Codex run and stops the
   run at 80 %.
3. **OpenCode + Kimi K3 via Chutes** (`chutes/moonshotai/Kimi-K3-TEE`, free for us).
4. **OpenCode + `nex-agi/nex-n2.5-pro:free` via OpenRouter** — last fallback.

The goal is that work never stops because one quota ran out. Unknown or unmeasurable quota
counts as *no headroom* for that engine (fall through to the next one, never guess).
Before a long Claude unit reaches 60 %, leave a durable handoff in `PROGRESS.md` (what is
half-done, which files, next step) so the next engine can continue without loss. Fable 5.1
is used only for design passes, never as a fallback work engine.

**Inside a Claude Opus 5 iteration, delegate as much as possible** — to OpenCode with
`nex-agi/nex-n2.5-pro:free` and OpenCode with Kimi K3 via Chutes (see `bin/delegate.sh`):
scraping, bulk extraction, first drafts, tests, mechanical refactors, research digests.
Opus decides, integrates and verifies. Treat free-model output as a draft: check numbers
against primary sources before they land.

**Codex review gate (GPT-5.6 Luna)** runs "immer wieder mal zwischendurch": `tick.sh` schedules
it after every 3rd work iteration and before anything is declared finished — only while
Codex is below 75 %. It reviews the diff since the last gate against the verbatim
requirements, re-verifies claims live, and flips unproven `verified`/`implemented` rows back
to `open` with a one-line reason. If Codex has no headroom, the gate falls back to Claude
Opus 5, then Kimi K3 — but never to the engine that implemented the reviewed work.

**Fable 5.1 is the design authority** ("hat den besten User-Interface-Geschmack").
`tick.sh` schedules a Fable 5.1 design pass after every 2nd work iteration that touched the
UI, while Claude has headroom. Fable reviews live screenshots (desktop + mobile, light +
dark) and writes concrete, implementable directives into `DESIGN-DIRECTIVES.md` — Fable
decides, others implement. The design bar, from Florian: **minimalistic and simple, very
expressive, not overloaded. Key messages first. Graphical — many charts.**

Framing for every review prompt: this is quality assurance of *our own* product before
users see it. Never phrase a review as attacking or breaking something.

---

## 2. The checklist

Every ID becomes a row in `PROGRESS.md`.

### 1 — Overview table: score, cost, info icons
- **R1.1** Default sort: descending by the score column (currently Composite).
- **R1.2** Header reads **"Score"**, with the active score name small underneath in
  parentheses, e.g. "(Composite)"; it follows the score selector.
- **R1.3** Rename "Cheapest Adjusted $/Task" → **"Adjusted Cost"**.
- **R1.4** An (i) icon next to Adjusted Cost with a short, plain explanation: the cost
  accounts for the chosen providers and their prices, their caching efficiency and cache
  prices, and the model's token efficiency.
- **R1.5** Remove the inline text "Adjusted costs are modeled USD per task: AA output tokens
  × OpenRouter usage I/O (Chutes global fallback)…" from the page. (Florian finds the
  "Chutes global fallback" wording confusing — do not reuse it anywhere.)
- **R1.6** Add a fuller methodology section explaining the whole approach, reachable but
  not prominent (e.g. footer link / "How we calculate" page).
- **R1.7** An (i) icon next to Score explaining how the score is composed.
- **R1.8** (i) icons: hover tooltip on desktop; small modal with an ✕ close button on mobile.
  Keyboard and screen-reader accessible.

### 2 — Overview table columns
- **R2.1** Remove the "Channels" and "Top provider channels" columns.
- **R2.2** Add **#benchmarks** and **#providers** columns (sortable, respecting filters).

### 3 — Hero claim
- **R3.1** Replace "Benchmarks in perspective. Costs in context." with a claim that says
  (a) this is the most complete collection of benchmark results for models anywhere, and
  (b) the only place that shows realistically what a model will actually cost you.
  Florian's naive draft: "All benchmark results for every model, in one place. The most
  realistic cost estimate for each model." — propose better; Fable 5.1 picks. Keep the claim
  truthful: it must hold up against the actual coverage numbers shown on the page.

### 4 — Filters and settings
- **R4.1** Redesign "Price & provider filters · adjusted costs" to be elegant and uncluttered.
- **R4.2** Fixed I/O blend: add **20:1 (new default)** and **30:1**.
- **R4.3** Move "One variant for Reasoning models" further back — into a separate
  detail/extra settings area for rarely-used options.
- **R4.4** Featured set audit: roughly the **top 20 of the AA Intelligence Index** should be
  featured; **DeepSeek V4.1 Flash** must be included if not already. Document which models
  are featured and why. (The existing house rule that Gemini is not featured came from
  Florian earlier; the new top-20 rule is more recent — apply the top-20 rule and note the
  change explicitly in `PROGRESS.md` and the final Telegram so Florian can object.)
- **R4.5** "Hide deprecated" → extra settings area.
- **R4.6** "Exclude Chinese providers" **unchecked by default**.
- **R4.7** Rename "EU-hosted / approved equivalent only" → **"EU-hosted only"** (same logic).
- **R4.8** Group the Chinese / EU / US options into a **"Regional settings"** section.
- **R4.9** Rename "TEE / confidential only" → **"Strong confidential guarantees"**, same logic.
- **R4.10** New filter **"Trains or keeps your data"**, sourced from
  https://openrouter.ai/providers with the two checkboxes "Does not train" and "Zero
  retention" both set: a provider that remains in that filtered list is unproblematic and is
  always kept. A provider that does *not* remain in that list is removed from all Benchmark
  Heaven evaluations **while "Trains or keeps your data" is not checked**. **Chutes is an
  explicit exception** — treat it as guaranteeing both, because OpenRouter miscategorises it.
  Interpretation recorded: the checkbox acts as an opt-in to *include* providers that train
  or retain data; it is unchecked by default, so by default such providers are filtered out.
  Snapshot the OpenRouter provider policy list with provenance, refresh it daily, and
  document how it was collected (public page/payload only).
- **R4.11** Move "Has benchmark evidence", "Has provider" and "Measured task tokens only" to
  a better, less prominent place (extra settings). The page must stop feeling overloaded.

### 5 — Simple mode, Advanced mode, wizard
- **R5.1** Two modes; **Simple is the start view**; Advanced holds today's full experience.
- **R5.2** Simple shows the **top 15 recommended models**: same table content as the
  overview, **featured models only**, sorted by adjusted cost **descending** ("über den Preis
  absteigend sortiert" — implement literally; if Fable 5.1 judges ascending clearly better,
  make it a one-click toggle but keep the literal default and note the question in the final
  Telegram).
- **R5.3** Above the table, a settings strip: **score slider, default > 85**.
- **R5.4** **Max adjusted cost per task slider**, default unlimited/maximum.
- **R5.5** While a slider is moved, show a histogram/distribution chart so the user sees how
  much more expensive the priciest model is compared to one only 10 % worse, or to a
  mid-range model.
- **R5.6** A **wizard** (multi-page questionnaire), as an alternative entry:
  1. "Are you a company?"
  2. privacy / regional preferences → maps to the regional and data-confidentiality filters
  3. minimum requirements — intelligence and coding sliders, plus the option "at least the
     level of the best models that existed 1, 2, 3 … 6 months ago" (needs H1/H2)
  4. maximum spend, with an explicit "no limit / don't know yet" choice
  5. results: the evaluations and the recommended models.

### 6 — Companies and subscriptions
- **R6.1** An **"Are you a company"** checkbox (in settings and the wizard).
- **R6.2** Research whether companies may use consumer subscriptions (ChatGPT Plus/Pro,
  Claude Pro/Max, Gemini, Copilot, Cursor, …) versus business plans or API access. Read the
  actual terms of service; cite them. **Send Florian the research result via Telegram**
  (German, concise, with the key citations).
- **R6.3** Research subscription prices and — where published or credibly measured — their
  included quota; fold them into the cost view as clearly labelled estimates. When "Are you
  a company" is checked, subscriptions that companies may not use are excluded. Florian's
  note: quotas are often not officially published — say so openly instead of guessing.

### 7 — Logo
- **R7.1** Use the new logo (`ops/ux-2026-09-12/assets/benchmark-heaven-logo-light.jpg`) in
  the page. Produce clean web assets from it (trimmed, optimised, crisp at small sizes).
- **R7.2** Favicon (and apple-touch/og variants) from the new logo.
- **R7.3** Build a **dark-mode variant** yourselves and switch it with the theme.

### 8 — Benchmark visualisations
- **R8.1** Better visual comparisons and listings of all benchmark results, in the style of
  model release posts and tech reports (grouped bar charts per benchmark, highlighted
  best-in-row comparison tables, category panels, etc.).

### 9 — Data
- **R9.1** Refresh all data; prove a full successful fresh run with every live source dated
  today, deployed.

### H — Historical snapshots and bridged comparison
- **H1** Retain historical snapshots of **all** benchmark scores, so models that a source
  stops reporting (e.g. Opus 4.7 dropping out of the AA index) stay in the data.
- **H2** A **bridged comparison** mechanism for all benchmark scores: never compare a
  historical number directly with a fresh one when the source may have been re-based
  (AA index version changes such as v4.3; Elo boards that drift). Instead relate them through
  anchor models present in both snapshots, over one or several hops, with uncertainty
  reported. Specify it, implement it, test it (including multi-hop and re-based sources).
  Check what phase 10 (`573ea60`) already built before building anew.
- **H3** UI filter: "models that score better than model X in category Y", where Y can be a
  single benchmark or a category aggregate (e.g. the median of all coding benchmarks), using
  bridged scores and labelling them as approximated.

### B — Benchmaxxing
- **B1** A **Benchmaxxing** tab in the Advanced section.
- **B2** A method that identifies models that are very strong on some benchmarks and very
  weak on others. Florian's leave-one-out gradient-boosting idea is a baseline, not a
  requirement; a better, justified method is welcome. Hermes replaced an earlier OLS version
  with topic-local percentile-jump scoring — evaluate it critically against the requirements.
- **B3** **Missing scores must not bias the result.** Coverage-aware scoring, explicit
  suppression when coverage is too thin, no fake zeros.
- **B4** A special **Benchmaxxing tag** for the worst models, shown in the overview table and
  in the Benchmaxxing tab.
- **B5** Small-print explanation of the method on the page.
- **B6** Per-model report with a **many-axis radar** (as many benchmarks as we have), axes
  ordered clockwise so similar topics sit next to each other (e.g. coding in one sector,
  writing in another, math in another).
- **B7** Scoring matches the visual intuition: **jaggedness within a topic** weighs heavily;
  **domain specialisation** (consistently strong in coding/math, weak in writing) is *not*
  Benchmaxxing and must not be penalised.

### X — Delivery
- **X1** Everything runs autonomously on Sandy with the engine fallback in §1.
- **X2** Codex never above 80 % of its weekly limit.
- **X3** Fable 5.1 design passes happened and their directives were implemented.
- **X4** The whole UI meets Florian's design bar (§1).
- **X5** `CHANGELOG.md`, `API.md` and the fork-sync prompt reflect any data or URL changes;
  downstream consumers can still find everything.
- **X6** Final completeness audit: re-read `00-REQUIREMENTS-VERBATIM.md` line by line against
  `PROGRESS.md` and the live site. Only then write `ALL-ACCEPTED` at the end of `PROGRESS.md`.
- **X7** Final Telegram to Florian (German, short): what shipped, what to look at first,
  the recorded interpretations (R4.4, R4.10, R5.2) he may want to overrule, anything open.

---

## 3. How one iteration works

1. `git pull --rebase`, read the verbatim requirements, this brief, `PROGRESS.md`,
   `DESIGN-DIRECTIVES.md` and the latest `REVIEW-*.md`.
2. Pick the highest-value open items that fit the iteration (dependencies first: data and
   logic before the UI that shows them). Mark them `in-progress`.
3. Delegate the bulk work; implement and integrate the rest.
4. Build, test, typecheck; commit; push; wait for the deploy; verify live at desktop and
   mobile width; save evidence.
5. Update `PROGRESS.md` (status + evidence path), commit and push that too.
6. Exit cleanly. The next tick continues. A single iteration should stay under ~3 hours.
