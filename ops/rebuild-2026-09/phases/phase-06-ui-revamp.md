# Phase 6 — UI revamp, radar charts, anomaly detection

**Goal:** master brief §4, at "absolutely perfect standards".

1. **Radar charts**: on `/compare` and as their own tab; up to 4 models; axes are the
   benchmarks we collect; per-axis normalization (state the method); axis selection;
   honest handling of missing axes; readable in light and dark; keyboard accessible.
2. **Per-model benchmark sheet**, grouped by category, with version, source, date,
   self-reported flag, links, and the divergence markers from phase 5.
3. **Per-benchmark view**: pick a benchmark → ranked models, filterable, with coverage.
4. **Model-vs-model** comparison across the full benchmark set.
5. **Anomaly highlighting**: per model, surface unusually strong/weak results relative to
   that model's own profile and to the peer distribution, plus self-reported-vs-measured
   divergences. It must be explainable — show why something is flagged, and let the user
   see the underlying numbers. Guard against flagging noise from tiny samples.
6. **General revamp**: information hierarchy, navigation, responsive layout, empty and
   loading states, accessibility (contrast, focus order, keyboard, reduced motion),
   performance (first paint, no layout jank).
7. Gauntlet the UI too: a critic reviews the built pages against a written usability and
   accessibility checklist and against the actual rendered output (screenshots), not
   against your description of it.


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
   `/opt/benchmarkheaven/state/phase-06.status`. The tick job starts the next phase only
   when it sees `DONE`.

Commit trailer for every commit in this project:

    Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>
