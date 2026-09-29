# Benchmark Heaven — UX, data & analysis workstream (commissioned 2026-09-12)

The product requirements in 00-REQUIREMENTS-VERBATIM.md and 02-ADDENDUM-HERMES-CHAT.md remain
authoritative, with newer change requests in 03-CHANGE-REQUESTS-VERBATIM.md. This brief turns
them into a checklist; the operations below were updated on 2026-09-29.

Where: Benchmark Heaven runs live at https://benchmarkheaven.com and
https://model-market-comparison.app.mintapis.com. The UX coordinator is the isolated worktree
/home/flori/wt/bh-ux-workstream. Each unit gets a separate /home/flori/wt/<job> worktree and
jobs/<job> branch. Each unit opens a PR; the serialized merge queue runs release gates, merges,
and deploys. Jobs never write to /opt/model-market-comparison.

Who: autonomous iterations start from the home-local coordinator every 10 minutes. State, logs,
prompts, outputs, and evidence live under
/home/flori/.local/state/benchmarkheaven/ux-workstream.

---

## 0. Ground rules

1. Nothing is done until it is verified live. Implemented means code merged, required
   merge-queue gates passed, deployed, and checked at desktop and mobile widths, with evidence
   saved under /home/flori/.local/state/benchmarkheaven/ux-workstream/evidence/. A claim without
   evidence stays open.
2. PROGRESS.md in this folder is the single ledger. Every requirement has an open, in-progress,
   implemented, or verified status. Only an engine different from the implementer may set
   verified.
3. Historical note: Hermes recovered additional requirements and earlier implementation
   evidence on 2026-09-12. PROGRESS.md is the current ledger. Do not seed from or write evidence
   to files under /opt; verify current claims against the live site and keep them open when
   evidence is unavailable.
4. Release gates: open an isolated PR without running the test suite locally. After owner review,
   the serialized merge queue runs the dataset build, typecheck, production build, and full tests
   before merge. Keep commits small and reviewable.
5. Data honesty: every number has provenance; estimates and bridged or approximated values are
   labelled as such in data and UI. Never invent a score, price, quota, or policy.
6. Respect robots.txt, rate limits, and bot protection. Never circumvent access control.
7. Billing: Codex uses Florian's ChatGPT subscription, never an API key; Claude Code uses the
   signed-in subscription, never ANTHROPIC_API_KEY.
8. Do not disturb other workloads on Sandy. Disk is limited: remove only job-owned temporary
   data, keep logs bounded, and check df -h / before downloads above 10 GB.
9. Commit trailers name the engine that did the work: Claude Opus 5.5, Codex GPT-6 Luna, Devin
   Sonnet 5.5, or the selected OpenCode engine.

---

## 1. Engines, limits and delegation

Current operating rules, updated 2026-09-29:

- Before each unit, check quota-pace status and select with quota-pace pick for that role.
  Recheck admission with quota-pace allow immediately before starting a paid engine. If status
  is over pace, only judgement work is allowed; new work uses a free engine only for mechanical
  tasks. Unknown or stale measurements fail closed.
- Design and review use the selected judgement engine: Claude Opus 5.5 at medium effort
  (run-devin.sh with DEVIN_MODEL=claude-opus-5-5-medium when quota-pace selects Devin, or the
  signed-in Claude runner) or Codex GPT-6 Luna at xhigh. A review must use an engine different
  from the implementer. Do not route design or review to OpenCode.
- Work uses the engine selected by quota-pace. Devin work uses Claude Sonnet 5.5 at high effort;
  Codex uses GPT-6 Luna at xhigh; Claude uses Opus 5.5 at medium effort. If the selected route
  is free OpenCode, perform only a small, mechanically specified task; do not make product,
  design, benchmark, security, or publication decisions.
- Fable is retired. Cap Claude-backed UX units, including Devin-hosted Opus units, at one per
  rolling 24 hours. Save Claude for a genuinely necessary design or review pass rather than
  routine work.
- Each unit runs in its own home-local worktree on a jobs/<job> branch. It may not commit, push,
  deploy, change crontabs, message Florian, or write outside its worktree. The wrapper creates
  the commit and PR. After owner review, use the serialized merge queue.
- Keep the full /jev-models page structure. Keep wrappers and subsidised entries in their
  separately labelled section below rankings. Treat free-engine output as a draft and verify
  claims before they ship.
- Frame reviews as quality assurance of our own product before users see it. Never describe
  review work as attacking or breaking the service.

The original commissioning request named Fable as design authority. That engine has been retired;
the design bar still applies: minimal and simple, expressive, not overloaded, key messages first,
graphical, and complete.

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

---

## 4. Standing sources — Florian's X bookmark folder "evals" (added 2026-09-18)

**New rule, Florian, 18 Sep 2026, verbatim:**

> new rule for benchmark heaven: it should look into
> https://x.com/i/history/bookmarks/2098158441952907558 once a day and check if there are new
> evals/benchmarks it doesn't have in its list yet, and then add them

That bookmark folder (@airesearch12, named **"evals"**) is now a **standing source** of
benchmark candidates, on the same footing as the leaderboards in
`data/raw/benchmarks/collection-plan.json`. Nobody has to ask for those benchmarks again:
a post in that folder is Florian asking for it.

**The intake is automated and does not belong to this loop.**
`/opt/benchmarkheaven/bin/bookmarks_intake.py` runs daily at 06:40 UTC
(`systemctl --user status bh-bookmark-intake.timer`): it reads the folder in the agent
Chrome (read-only, behind the shared `~/.locks/chrome-9333.lock`, @airesearch12 stays the
active account), triages each new post with a small model, checks the benchmark **and its
version** against `data/raw/benchmarks/registry.json` and against the open CRs in
`03-CHANGE-REQUESTS-VERBATIM.md` / `04-CR-BRIEF.md` / `PROGRESS.md`, and appends a CR here
for whatever is genuinely missing. State lives in `/opt/benchmarkheaven/state/bookmarks/`
(`seen.jsonl`, `triage.jsonl`, `queued.jsonl`, `last-run.json`), tests in
`/opt/benchmarkheaven/bin/test_bookmarks_intake.py`.

**What the loop does with it:**

1. A CR headed "new benchmarks from Florian's X bookmark folder" is an ordinary CR — work it
   in priority order like any other. The first one is CR-82 (18 Sep 2026).
2. **The X post is a pointer, never a measurement.** Read the whole thread and the author's
   primary source before any number enters the dataset; the usual provenance rules
   (`maintain-benchmarkheaven-registry`) and the gauntlet apply unchanged.
3. **A candidate may be wrong.** The name is read off a post by a small model. If it turns
   out to be something already carried under another name, close the row with that finding
   and add the alias to the registry entry — that stops the intake re-filing it. If the
   primary source does not hold up, close the row saying so and ingest nothing.
4. **Never edit the intake's state files to silence it.** Filing a benchmark twice is a bug
   in the matcher; fix the matcher or add the alias.
5. The loop stays the single writer of the repository. The intake only appends to these
   three ops files and never commits — the loop commits them with its own work.
