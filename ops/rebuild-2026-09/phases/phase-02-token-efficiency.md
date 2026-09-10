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


## Phase 01 coverage amendments (binding)

Follow §11 source priority: first attempt OpenRouter per-model empirical input/output usage; if unavailable, obtain typical LLM usage from Chutes as the documented global fallback. AA canonical benchmark token ratios are cross-checks or explicitly labelled benchmark proxies if actual usage is unavailable, never claimed as observed user workloads. Record failed attempts and basis per model. Keep AA tokens-per-task collection independent of that priority. Store provider name alongside exact OpenRouter model ID and endpoint tag; identical provider labels do not establish endpoint equivalence.

Phase 01 restored historical OpenRouter/HF metadata with per-field provenance in `metadata.retained_fields` and `aa_metadata.retained_fields`; preserve dates and do not relabel retained fields as newly measured. AA Coding Agent v1.5 exposes per-agent token/caching telemetry, useful supplementary evidence but not a claim about typical user workloads.

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
   `/opt/benchmarkheaven/state/phase-02.status`. The tick job starts the next phase only
   when it sees `DONE`.

Commit trailer for every commit in this project:

    Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>
