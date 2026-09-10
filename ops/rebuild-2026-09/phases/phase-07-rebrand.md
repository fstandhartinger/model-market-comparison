# Phase 7 — Benchmark Heaven rebrand and benchmarkheaven.com

**Goal:** the product is called Benchmark Heaven and lives at benchmarkheaven.com.

1. Develop the brand: name usage, logo/mark, favicon, colour system, typography, tone,
   og-image, README header. It must look designed, not renamed. Show variants, pick one,
   justify the pick in the report.
2. Apply it everywhere: `app/layout.tsx` metadata, nav, footer, README, API docs, the
   fork-sync prompt, the Telegram message templates.
3. **Domain:** DNS A record `benchmarkheaven.com` → `65.109.49.103` (plus `www`). There are
   no Namecheap API credentials — try the Namecheap web UI in Sandy's logged-in Chrome
   (`self-service-provisioning` skill). If that is gated, do everything else and send
   Florian the exact records to paste.
4. Add the domain to Coolify app `ggbs6upie6tqsousmrkw0vja`, issue TLS, verify HTTPS.
   **Keep `model-market-comparison.app.mintapis.com` working** (serve both or redirect) —
   downstream consumers use it.
5. Document the move loudly in `CHANGELOG.md` and `API.md`: new base URL, old one still
   valid, nothing else moved.


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
   `/opt/benchmarkheaven/state/phase-07.status`. The tick job starts the next phase only
   when it sees `DONE`.

Commit trailer for every commit in this project:

    Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>
