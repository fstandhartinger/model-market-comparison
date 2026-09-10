# Phase 8 — Daily automation with gauntlet loops on cheap models

**Goal:** all of the above stays fresh daily, cheaply, and self-critically.

1. Rebuild `/opt/mmc-daily/` (rename it to match the new brand) so a daily run refreshes:
   the existing four live sources, the token-efficiency data, the caching statistics, the
   benchmark registry and scores, and the self-reported values.
2. Structure each run as a gauntlet loop: cheap worker collects → different-model critic
   verifies against primary sources → disagreements resolved or the row dropped. Astra is
   *not* in the daily loop except as an escalation path for repeated failures — the daily
   job must be cheap.
3. **Dynamic worker selection**: re-discover currently free/near-free OpenRouter models
   each run, filter by AA Intelligence Index ≥ 34 using our own dataset, prefer the
   cheapest viable one, and log which model did what.
4. Keep the Telegram policy quiet (master brief §6): top-5 entrant, failure at most weekly,
   plus genuinely notable data events. No daily "all good" messages.
5. Prove it: run the whole daily job once by hand, end to end, and show the output. A
   script that has never run is not done.
6. Make failure loud in the log and safe in the data: a partial scrape must never
   overwrite a good snapshot.


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
   `/opt/benchmarkheaven/state/phase-08.status`. The tick job starts the next phase only
   when it sees `DONE`.

Commit trailer for every commit in this project:

    Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>
