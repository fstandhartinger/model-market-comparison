# Phase 4 — Benchmark universe: discovery and registry

**Goal:** the registry from master brief §3, filled as completely as we can.

1. **Free wins first:** ingest the benchmark fields already present in the AA payload that
   we currently discard (recon §2), each as a properly versioned registry entry.
2. **Public leaderboards:** systematically work the list in master brief §3 B2. Delegate
   the fetching and first-pass extraction to workers; you verify.
3. **X/Twitter sweep — use the `xplainervideo` account, never airesearch12.** Sandy's
   desktop Chrome is logged in (`gui-control-sandy` skill; xdotool over the RDP session).
   Behave like a human: modest pace, no parallel sessions, no scripted scroll storms.
   Start with `https://x.com/search?q=benchmark&src=typed_query`, then use Grok at
   `https://x.com/i/grok` with this prompt (and variations you think of):

   > List a lot of LLM evals that show up in X/Discord/HF feeds when a new model drops.
   > Include official launch-card benchmarks and especially indie/personal ones:
   > EQ-Bench-style suites, SimpleBench, UGI, Fiction.liveBench, WeirdML, Vending-Bench,
   > self-run Aider/OTIS harnesses, writing/slop/RP boards, long-context homebrew,
   > uncensored willingness boards. Group by mainstream vs maintainer-owned. Note how each
   > is scored and who runs it.

   For every benchmark, capture **where its results actually get published** (leaderboard
   URL, the X account that posts them, HF space, GitHub repo) — that recipe is the asset.
4. **Curate.** One-sentence English description, category, version, maintainer, scoring
   semantics, cadence. Mark saturated/superseded benchmarks and record *why* they were
   excluded. Never merge versions (Terminal-Bench 4.0 ≠ 3.0).
5. **Gauntlet the registry hard.** A critic checks that each entry exists, that the URL
   resolves, that the description is accurate and that the version is current. Entries that
   fail verification are dropped, not guessed.


## Phase 01 coverage amendments (binding)

Register AA Coding Agent Index v1.4 and v1.5 separately. `data/raw/aa-coding-agents.json` is the retained dated v1.4 snapshot feeding the existing Composite; `data/raw/aa-coding-agents-v1.5.json` is the current, separately validated source. Do not merge them or refresh the legacy collection date. The current collector is `node scripts/fetch-aa-coding-agents.mjs`.

## How to work this phase

1. `cd /opt/model-market-comparison`. Read `ops/rebuild-2026-09/00-MASTER-BRIEF.md` and
   `10-RECON-FINDINGS.md` if you have not in this session (they are short and they save you
   a lot of tokens).
2. Delegate the bulk/mechanical parts to cheap workers via
   `bash ops/rebuild-2026-09/bin/worker.sh "<task>"` (see `--help`). You review everything.
3. Run a **gauntlet round** on this phase's artifacts before finishing: a critic model that
   did not produce the artifact checks it against primary sources
   (`bash ops/rebuild-2026-09/bin/worker.sh --critic --producer "<all producer model IDs, comma-separated>" --file <frozen evidence packet> "<what to verify>"`). Follow `GAUNTLET.md`; supply actual sources and record review coverage. Fix findings.
   Repeat until a round is clean or you have done 3 rounds; write the residue down.
4. Finish with: `node scripts/build-dataset.mjs`, `npm test`, `npx tsc --noEmit -p .`,
   then commit and push. Keep `main` green at all times.
5. Append your phase report to `ops/rebuild-2026-09/REPORT.md`: what you built, what the
   critic found, what you verified and how, what is still uncertain.
6. Write `DONE` (or `BLOCKED: <one line>`) as the last line of
   `/opt/benchmarkheaven/state/phase-04.status`. The tick job starts the next phase only
   when it sees `DONE`.

Commit trailer for every commit in this project:

    Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>
