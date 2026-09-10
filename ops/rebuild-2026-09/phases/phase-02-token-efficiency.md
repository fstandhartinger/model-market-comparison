# Phase 2 — Token & caching efficiency data pipeline

**Goal:** the three new data dimensions land in `data/dataset.json`, with provenance.

1. **Tokens per task + I/O ratio.** Extend the AA ingest to capture
   `intelligenceIndexOutputTokensPerTask` and `canonicalIntelligenceIndexTokenCount`
   (recon §1 has the exact shape and the coverage caveat). Solve the coverage problem for
   as many of the 645 models as politely possible; record coverage explicitly.
2. **Caching statistics per model × provider.** Crack the OpenRouter model-page payload
   (recon §3), capture cache-hit rate plus cache read/write pricing per endpoint, and
   store it keyed by `(or_model_id, endpoint_tag)` so it joins with the offers we already
   build. Design for partial coverage — most pairs will have no data at first.
3. **Chutes fallback** for a global typical I/O ratio where per-model data is missing.
4. **Schema.** Add the new fields to the dataset with explicit provenance
   (`source`, `url`, `collected_at`, `basis: measured|self_reported|derived|assumed`).
   Update `API.md` and `CHANGELOG.md` — downstream consumers must be able to find the new
   fields, and nothing existing may move or change meaning.
5. **Tests** for the parsers, including malformed/missing payloads.
6. Write the reusable **skills** for these three collection recipes now, while the
   knowledge is fresh (they get installed everywhere in phase 9): exact URLs, exact field
   names, the parsing snippet, the failure modes, and how to verify a fetch was complete.


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
   `/opt/benchmarkheaven/state/phase-02.status`. The tick job starts the next phase only
   when it sees `DONE`.

Commit trailer for every commit in this project:

    Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>
