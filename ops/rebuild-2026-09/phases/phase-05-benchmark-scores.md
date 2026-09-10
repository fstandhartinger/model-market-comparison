# Phase 5 — Benchmark scores, self-reported values, ingestion

**Goal:** scores flowing in, provenance-tagged, with the self-reported-vs-measured delta.

1. Build the ingestion pipelines for the registry entries whose results are machine-
   readable. For the rest, define the collection recipe precisely enough that a cheap
   worker can execute it daily.
2. **Self-reported scores:** collect vendor-claimed numbers from release posts, HF model
   cards and tech reports. Store with `basis: self_reported` and the source URL. A critic
   verifies every captured number against the primary source before it ships — an
   unverifiable number is dropped and logged, never rounded into existence.
3. Compute and store the **divergence** between self-reported and independently measured
   values for the same (model, benchmark, version).
4. Model the sparse matrix properly: distinguish *not tested*, *not published*,
   *source unreachable*, *contested*. Coverage per model and per benchmark is queryable.
5. Do **not** change the existing Composite's inputs (master brief §3 B4).
6. Tests: schema validation, version isolation, provenance completeness, and a guard that
   fails the build if any score lacks a source.


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
   `/opt/benchmarkheaven/state/phase-05.status`. The tick job starts the next phase only
   when it sees `DONE`.

Commit trailer for every commit in this project:

    Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>
