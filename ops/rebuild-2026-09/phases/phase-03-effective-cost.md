# Phase 3 — The effective-cost engine and its UI default

**Goal:** adjusted prices computed, explained, and ON by default.

1. Implement the effective-cost model from master brief §2 A4 in `lib/`, pure and unit
   tested, with documented, flagged fallbacks for every missing input.
2. Wire it into every view that shows a price: model explorer, compare, scatter, provider
   views, EU views. **Default: adjusted.** A clearly labelled toggle returns the raw list
   price. Persist the choice (bump the settings storage key).
3. Every adjusted number must be explainable in the UI: a hover/expand that shows the
   inputs (tokens per task, I/O ratio, cache-hit rate, which values were assumed).
4. Make the core question answerable in one screen: *"cheapest model at ≥ X benchmark
   score"* — a min-score filter combined with adjusted cost, sorted, with the assumptions
   visible.
5. Sanity-check the results against reality: pick five well-known models and verify the
   adjusted ordering is defensible; if the model says something surprising, find out
   whether it is a bug or an insight before shipping it. Document the five checks.


## How to work this phase

1. `cd /opt/model-market-comparison`. Read `ops/rebuild-2026-09/00-MASTER-BRIEF.md` and
   `10-RECON-FINDINGS.md` if you have not in this session (they are short and they save you
   a lot of tokens).
2. Delegate the bulk/mechanical parts to cheap workers via
   `bash ops/rebuild-2026-09/bin/worker.sh "<task>"` (see `--help`). You review everything.
3. Run a **gauntlet round** on this phase's artifacts before finishing: a critic model that
   did not produce the artifact checks it against primary sources
   (`bash ops/rebuild-2026-09/bin/worker.sh --critic "<what to verify>"`). Fix findings.
   Repeat until a round is clean or you have done 3 rounds; write the residue down.
4. Finish with: `node scripts/build-dataset.mjs`, `npm test`, `npx tsc --noEmit -p .`,
   then commit and push. Keep `main` green at all times.
5. Append your phase report to `ops/rebuild-2026-09/REPORT.md`: what you built, what the
   critic found, what you verified and how, what is still uncertain.
6. Write `DONE` (or `BLOCKED: <one line>`) as the last line of
   `/opt/benchmarkheaven/state/phase-03.status`. The tick job starts the next phase only
   when it sees `DONE`.

Commit trailer for every commit in this project:

    Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>
