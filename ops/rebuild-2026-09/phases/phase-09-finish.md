# Phase 9 — Verification, skills everywhere, final report

**Goal:** everything verified, documented, installed, reported.

1. **Full verification pass**: build, tests, typecheck, live site on both hosts, live data
   freshness, the daily cron armed and proven, every feature from the master brief
   exercised by hand at least once. List what you checked and how.
2. **Re-read master brief §11 (the verbatim original request) line by line** against
   `COVERAGE.md` and the shipped app. Anything missing gets built now or is explicitly
   listed as not-done with a reason in the report. This is the completeness check Florian
   explicitly asked for.
3. **Install the skills everywhere**, both machines (Sandy and Florian's WSL machine at
   `/home/flori/`, reachable only if you can — otherwise put them in the repo under
   `ops/skills/` and say so, so the local session installs them):
   Claude Code `~/.claude/skills/<name>/SKILL.md`, Codex `~/.codex/`, opencode config.
   Skills to write: AA token-efficiency collection, OpenRouter caching-stats collection,
   benchmark registry maintenance, cheap-worker selection, and the gauntlet loop.
   Each skill must be usable by an agent that knows nothing about this project.
4. **Docs**: `CHANGELOG.md`, `README.md`, `API.md`, `DEPLOYMENT.md`, the fork-sync prompt.
   Downstream apps that sync from this repo must be able to find every piece of data after
   the rebrand — spell out what changed (URLs, endpoints, paths, schema) and what did not.
5. **Final report** `ops/rebuild-2026-09/REPORT.md`: what was built, what was verified and
   how, what was deliberately left out, what is uncertain, what the next person should
   pick up. Include the material an explainer video would need: the story of the change,
   the before/after, the numbers worth showing, and 5–10 screenshot-worthy moments.
6. **Telegram** to Florian (German, concise, no wall of text): what shipped, the new URL,
   what to look at first, and anything that needs his hand (e.g. DNS).


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
   `/opt/benchmarkheaven/state/phase-09.status`. The tick job starts the next phase only
   when it sees `DONE`.

Commit trailer for every commit in this project:

    Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>
