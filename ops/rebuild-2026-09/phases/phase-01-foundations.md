# Phase 1 — Clean slate, tooling, and the gauntlet method

**Goal:** a green repo, working cheap-worker delegation, and written-down method.

1. **Clean up the repo state on Sandy.** `/opt/model-market-comparison` was handed over
   with an uncommitted worktree from a failed daily run and a reportedly red test suite.
   Inspect each modified file (`data/dataset.json`, four `data/raw/*.json`,
   `lib/aa-metadata.mjs`, `scripts/fetch-live.mjs`), keep what is a legitimate data
   refresh, discard what is broken, get `npm test` green, commit, push, verify the live
   site serves the result. Also reconcile with `origin/main` (local dev machine was one
   commit behind at handover).
2. **Fix the daily cron's failure** while you are in there: the last run reported an
   incomplete AA Coding-Agent scrape. Make the scrape robust (it must fail loudly rather
   than write a partial file) and re-run it once by hand to prove it.
3. **Get the workers running.** Verify `bin/worker.sh` end-to-end against all three
   backends (opencode/Kimi K3 via Chutes, an OpenRouter `:free` model, DeepSeek V4.1 Flash
   via OpenRouter). Install opencode on Sandy if it is missing. Verify
   `bin/pick-worker-models.mjs` returns a sane, AA-index-filtered candidate list.
4. **Research the gauntlet loop technique** (web search) and write
   `ops/rebuild-2026-09/GAUNTLET.md`: what the technique is, why a separate critic model
   matters, how rounds terminate, how to phrase critic prompts **defensively** (quality
   assurance of our own product — never adversarial/attack framing), and the concrete
   prompt templates this project will use for (a) data rows, (b) code, (c) UI/design.
5. Sanity-check the whole brief against §11 of the master brief and write a coverage
   checklist to `ops/rebuild-2026-09/COVERAGE.md` — every wish in the original request
   mapped to a phase. Anything unmapped gets added to a phase now.


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
   `/opt/benchmarkheaven/state/phase-01.status`. The tick job starts the next phase only
   when it sees `DONE`.

Commit trailer for every commit in this project:

    Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>
