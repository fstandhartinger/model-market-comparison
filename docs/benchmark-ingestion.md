# Versioned benchmark ingestion

Phase 05 adds `benchmark_results` to the dataset and two read-only APIs. The five
Composite slots and their existing inputs are unchanged. Coding Agent v1.4 remains
its dated source; v1.5 appears only under its separate registry identity.

## Acceptance contract

`family::version` is the join key, including dated identities where no release version
is known. Scores retain native units. Each observation contains exact source identity,
optional catalog model ID, source effort/harness, numeric value, basis, protocol and an
HTTPS source URL, original retrieval/publication dates, immutable file/hash and locator.
An unmatched source identity is retained with `model_id: null`; it does not count toward
catalog model coverage. Exact checkpoint URLs or a unique exact default display name
can join; fuzzy names and reasoning aliases cannot. A null source effort remains unknown.

`measured` means a result reported by the evaluator. Vendor claims and submission
boards whose independence is unestablished use `self_reported`. A scale conversion or
source-defined reconstruction uses `derived`, `source_basis`, formula and original
inputs. Supporting method/category files have their own hashes. No derived number is
presented as a literal published score. LiveBench uses the captured category definition
and published overrides. EQ-Bench Slop retains the captured normalization formula.

All self-reports require an owner acceptance in `score-approvals.json`, bound to the
entire observation's canonical SHA-256 and a hashed different-family critic output.
Editing a value, identity, source or protocol invalidates that approval. Captured source
bytes are checked on ingestion and build. No source or missing source file fails the
build; no network access is necessary to rebuild the accepted dataset.

Divergence is `self_reported − measured`, in the benchmark's native unit, plus a relative
percentage using `abs(measured)` as denominator (zero denominator gives null). Both
observations must have the same exact model, registry ID, unit, effort, harness and
explicitly reviewed `comparison_key`. Merely sharing a benchmark name is insufficient.
Different source URLs are also required. The initial eight direct vendor claims have
no verified compatible independent pair; the initial divergence list is empty. Synthetic
tests exercise positive/negative differences, zero and version/configuration isolation.

Absent cells are `unknown`. `not_tested` and `not_published` require an explicit source
statement about that model; an omitted/null leaderboard cell proves neither.
`source_unreachable` records failed access and `contested` records conflicting evidence
or unresolved protocol. A collection failure does not erase a retained dated score.
Collection status and model-cell status are separate. Coverage counts exact catalog
configurations, once per benchmark; measured/self-reported counts may overlap.

## Daily workflow

Run `bash ops/daily/run.sh --dry-run` to rehearse the complete pipeline. The runtime is
`/opt/benchmarkheaven-daily/`; `/opt/mmc-daily/` remains a compatibility symlink.
[Daily operations](../ops/daily/README.md) documents model qualification, isolated
publication, quiet notifications and escalation. `daily-checks.json` records current
checks without redating retained observations. New source bytes and review artifacts
live in `data/raw/benchmarks/daily-evidence/`; score-approval fingerprints bind the
final, exactly joined observation. The following collection contract remains binding.

1. Reuse AA's already captured model page, recording URL, response status, retrieval
   time and SHA-256. Run `scripts/extract-aa-benchmark-fields.mjs` as documented in the
   registry README. The reviewed `ingestion-lock.json` binds its exact source and field
   snapshot. Update the lock only after field/version/source review. LiveCodeBench
   remains withheld until its exact task window is verified. Run the existing v1.5
   coding collector, archive a new immutable copy, review it, then update only its lock.
   Never overwrite the retained v1.4 file or date.
2. For public sources, copy `collection-plan.json` to a candidate plan. Its exact raw
   URLs, parser selectors, fields, scales, split filters, minimum counts and version
   guards specify each supported board. Deduplicate URLs, including supporting method,
   category and frontend sources. Write them as a JSON array to `URL_LIST.json`.
   Capture once per host/source with `python3 scripts/capture-benchmark-sources.py
   URL_LIST.json CAPTURE_DIR`. This observes robots/crawl delay, bounds time/size, hashes
   bytes, and stops on restrictions. It never executes downloaded JavaScript.
3. Replace candidate plan source receipts with successful capture receipts. Compare
   task set, split, harness, judge and metric against the registry evidence. A changed
   protocol needs a new registry identity, not a silent update of the old version. A
   dated unversioned identity is not permission to assume later protocols match.
   Parse with `python3 scripts/collect-public-benchmarks.py --plan CANDIDATE_PLAN.json
   CANDIDATE_RESULTS.json`. Empty, malformed, out-of-range, changed-hash or missing-field
   inputs fail. Replacing an existing output also rejects lost result IDs. Review any
   legitimate deletion/reordering in a separate candidate; never weaken the guard.
4. Source-specific details: ARC uses displayed non-human Semi-Private rows for the exact
   generation; SWE submissions keep their split/harness; Terminal-Bench uses the exact
   `4-0-0` embedded query (the HTML table is a placeholder); LongBench records both CoT
   settings separately; MMMU separates validation/test and excludes Pro/humans. UGI
   preserves all four headline columns, including genuinely missing Writing cells.
   SlopBench uses a read-only POST, not the shell HTML: put this object in URL_LIST:
   `{"url":"https://uncommon-sandpiper-321.convex.cloud/api/query","method":"POST",
   "body":{"path":"runs:getLeaderboard","args":{},"format":"json"}}`.
   Only complete rows' `pure_slop_rate` is the displayed Slop Rate; `slop_score` differs.
5. For release claims, use the vendor's actual release post, HF card, or linked technical
   report. Preserve the literal score, checkpoint, date, table row/column, benchmark
   version, split, sampling/effort, harness and source URL. PDF evidence retains original
   bytes plus a text extract and page/table locator. Do not turn a graph estimate,
   missing cell, secondary quote or README example into a claim. Put candidates in the
   vendor contract, `basis: self_reported`, `comparison_key: null` until verified.
   Every X interaction uses the existing `xplainervideo` account and shared locks; no
   other account, anonymous alternate or automated scraper is permitted.
6. Freeze candidates with actual primary content and hashes; run `worker.sh --critic
   --producer ALL_PRODUCER_IDS --file PACKET --out REVIEW`. Follow `GAUNTLET.md`, at most
   three rounds. Owner verifies exact row coverage, typed verdict, actual model identity,
   hashes and every finding. Drop and log unverifiable values. Record accepted full-row
   fingerprints in `score-approvals.json`. A worker's unsupported "pass" is not approval.
7. Copy accepted public/vendor candidates into their raw input files, then run
   `node scripts/ingest-benchmark-scores.mjs --draft` to inspect joins before binding final
   approval fingerprints. Run `npm run data:benchmarks`, `node scripts/build-dataset.mjs`,
   `npm test`, `npx tsc --noEmit -p .`, `npm run build`, and the production prerender
   checks. Commit/push only green artifacts with the project trailer; verify the webhook
   deployment and full live dataset. Preserve original dates for retained sources.

## Five sources requiring a collection recipe

Each task starts by capturing its registered primary URL with the bounded capture tool.
Write an attempt receipt even if no result is accepted. Do not infer per-model absence
from a board-level failure. The plan links these instructions by exact registry ID.

- **HELMET** (`helmet::snapshot-2026-09-10`): read the Princeton README's Results & Analysis
  link to the public results Google Sheet. Follow that actual link, list sheet tabs and
  export each public tab as CSV if offered. Retain model, task/category, context length,
  prompt setting, metric name and raw metric. Capture `.json.score` files only where the
  README links actual published outputs. The registry is a suite with task-specific
  units and no single headline: first define reviewed task/metric identities or typed
  component observations. Do not average heterogeneous metrics into the suite slot.
  If the sheet needs login or omits these dimensions, record manual_required/unreachable.
- **HLE** (`hle::snapshot-2026-09-10`): follow the README's benchmark/site link to a named
  leaderboard or published model report. Require a model/checkpoint, dataset revision,
  modality subset, question count, tool setting and accuracy column. The README's
  sample output `3.07%`, `n=2700` has no attributable model and is not the current
  2,500-question result: explicitly reject it. Keep calibration error separate.
  Without a primary attributable result, retain unknown cells and log no published
  result captured; do not substitute AA's text-only implementation.
- **IFBench** (`ifbench::snapshot-2026-09-10`): follow the Ai2 README's paper/release links
  for its IFBench_test results table. Require the exact checkpoint, test revision and
  prompt-level **loose** accuracy. Keep instruction-level, strict, training and IFEval
  values separate. The evaluation command and input dataset are recipes, not results;
  do not launch paid model evaluations. A later vendor table is a self-report and needs
  its own primary capture and critic check. Convert percent to fraction only explicitly.
- **OTIS** (`otis-mock-aime::2024-2025`): on Epoch's page locate the exact model section,
  the row named OTIS Mock AIME 2024-2025, its run ID and linked evaluation log. Verify
  45 problems and the final-answer extractor plus exact-match grader introduced in
  September 2025. The captured Grok `grok-4-0709` July-2025 row (84% ±5%, run
  `cvTPRDCM38zSTn9Y3MUb9d`) uses the earlier grading context and is withheld. Its adjacent
  GPQA and FrontierMath rows are different benchmarks. Accept later results only with
  the current grading evidence, or create a separately reviewed historical-grader ID.
- **Towards AI editorial writing** (`towards-ai-editorial-writing::snapshot-2026-09-10`):
  read the installed X account skill; acquire its browser/display locks and respect its
  cooldown. Verify `xplainervideo`, open the exact registered @Whats_AI post and genuine
  follow-ups, capture text plus screenshot. Transcribe only legible named-model Elo
  cells; retain the exact post URL/date and the private-protocol uncertainty. A critic
  must receive actual readable primary evidence. No private task/judge details are
  inferred; no comparison_key is assigned. Record missing visual evidence and withhold
  the number if the critic cannot verify it. No X session was needed in phase 05.

## Real-SWE (Specific Labs): what this source does differently

Real-SWE (`https://realswe.withspecific.com/`, canonical
`https://withspecific.com/benchmarks/real-swe`) is captured like any other public source
— bounded fetch, HTTP status, retrieval time and SHA-256 into
`data/raw/benchmarks/daily-evidence/<ISO>/`, then a reviewed `ingestion-lock.json`
binding the page and its embedded chunk — but its shape differs from the boards above in
ways the parser must preserve:

- **Model and harness are one evaluated unit.** `subject.harness` (Claude Code, Codex
  CLI, Gemini CLI, Grok Build, Muse Code, Kimi Code) is part of the identity, not a
  footnote. Two configurations of the same model must never be merged into one value:
  `lib/benchmark-view.mjs` groups one axis per `[benchmark_id, cohort, unit]`, where the
  cohort is the harness. A later run that finds the same model under a second harness is
  therefore a separate axis and row, proven by `test/benchmark-view.test.mjs`.
- **Native percent, no fraction conversion.** The source publishes percent, so the
  registry unit is `percent`. The 95 % confidence interval (`confidence_interval`) and
  the per-rollout cost are retained as published; the cost is a **separate observation**
  with unit `USD` (`realswe-cost::snapshot-2026-09-12`, difference-cost category), never
  a silent conversion into a score.
- **Independent evaluator ⇒ `basis: measured`.** Specific Labs runs the evaluations on
  private, licensed corporate codebases; it is the evaluator, not the vendor whose model
  is scored. This is measured, not `self_reported`, so no owner approval in
  `score-approvals.json` is required for the basis.
- **Public sample is a hard limit.** Only 10 tasks are publicly evaluable (more only on
  request). The published model values are the source headline; the task level is the
  sample. `details.publication_scope` records `{tasks: 10, runs: 8, configurations: 8,
  rollouts: 640}`, the 640-rollout count is asserted by extraction, and the UI prints a
  "Public sample" note. Nothing is described as "all tasks".
- **Task level and failure taxonomy live in `details`, not in invented scores.**
  `benchmark_results.details['realswe::snapshot-2026-09-12']` keeps the 10 tasks with
  passes/8 per configuration plus the summed failure taxonomy; the cost axis keeps
  `cost_provenance` (per-configuration displayed cost, runs, basis and a lower-bound flag
  for the two incomplete-usage configurations). Collections carry only the
  `{benchmark_id, status, source_url, reason}` contract.
- **Unknown identity stays unmatched.** The source publishes no catalog model IDs, so
  every row is `model_id: null` and counts toward no catalog coverage. The rows surface as
  unmatched source identities, hidden behind the "Include unmatched source identities"
  toggle, until a human mapping is reviewed.
- **Historically comparable from day one.** The first Real-SWE state is retained as the
  dated history state `20260912-35c64794` (with `realswe::snapshot-2026-09-12` among its
  benchmark ids) so later states can bridge against it via the phase-10 machinery.

The collector is deterministic and offline once the bytes exist:
`node scripts/collect-realswe.mjs` rebuilds the snapshot from
`data/raw/benchmarks/daily-evidence/2026-09-12T08-31-06-000Z/` and refuses to run if the
source hash no longer matches `ingestion-lock.json`. Parser: `lib/realswe.mjs`. Tests:
`test/realswe.test.mjs`.
