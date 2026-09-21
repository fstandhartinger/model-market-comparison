# Benchmark Heaven daily refresh

The maintained entry point is `ops/daily/run.sh`, installed under
`/opt/benchmarkheaven-daily`. `/opt/mmc-daily` remains a compatibility link. The
existing job runs at **05:17 UTC**. Installation preserves logs and notification
state; it does not create another recurring agent session.

```bash
bash ops/daily/run.sh --dry-run
```

Publication goes through the out-of-repo publish gate (`$BH_DAILY_HOME/gate/gate.mjs`, CR-66.2): stage 1 before the commit,
the critic stage before the push, each with its own 7 min timeout; only a PASS bound to the committed dataset hash and commit
publishes, and the verdict is stored in `run-report.json` (`gate`). OpenRouter ids or endpoints that are still absent after a
60 s re-check are recorded as dated withdrawals in `data/raw/openrouter.json` (`withdrawals`, never priced) and listed in the
summary; only more than max(10 models, 2 %) or 5 % of endpoints fails the run (CR-66.1).

`--scope prices` (CR-66.7) is the partial run for price changes: OpenRouter models/endpoints (without the usage/cache
pages) and the provider catalogs only; no workers, no source review, no benchmark refresh. Build, tests, typecheck,
prerender and the publish gate run as usual. OpenRouter must be today's capture and every benchmark and efficiency source
must keep the date it had (`sourceFreshnessErrors`); a commit that touches a benchmark or efficiency file is refused
(`pricesScopeViolations`). The price watch starts it as `gated-run.sh --price-drift --scope prices` (`run.sh` passes the
flag through).

**Concurrency (CR-73.3).** The independent review units of a run — the seven live source contracts, the
score batches, the vendor sources and the AA field chunks — run with at most `BH_DAILY_CONCURRENCY`
worker calls in flight (default **4**, range 1–8; `1` is the old strictly sequential behaviour).
Each unit owns its packet, its gauntlet directory and its retry budget, so a slow, timed-out or
malformed worker delays nothing but itself. Every decision — acceptance, withheld snapshots, the
deterministic fallback, a stage failure — is applied afterwards in manifest/batch order, so the
published candidate and the run report do not depend on which call returned first. The run report
records both the configured limit (`profile.configured_concurrency`) and the concurrency the run
actually achieved (`profile.worker_concurrency`).

A dry run performs collection, source review, dataset generation, production build,
unit tests, typecheck and prerender checks in an isolated work directory. It suppresses
Git publication and Telegram sends. Inspect the printed run directory and summary.
The normal scheduled run additionally commits only accepted data/evidence, pushes a
green revision, and checks the webhook deployment against the expected dataset.
It reads its base from fetched `origin/main` and publishes from the disposable staging
clone. The primary checkout is deliberately writer-owned: uncommitted work there is
reported in the run record but is never copied, cleaned, committed or used as a reason
to block publication. If another completed commit reaches `origin/main` during collection,
the staging push fails non-fast-forward and preserves both candidates for reconciliation.

The pipeline collects AA and DesignArena, OpenRouter models/provider endpoints, AA
Coding Agent v1.5, AA token efficiency, rotated OpenRouter usage/cache pages, Chutes
usage, and supported public/vendor benchmark sources. Coding Agent v1.4 remains the
original dated Composite input. Curated provider catalogs remain curated. Unsupported
collection recipes and inaccessible sources retain their original observations/dates
and produce explicit collection records; a source check does not imply a fresh score.

The live OpenRouter model catalog is joined to our accepted AA dataset each run.
The AA Intelligence Index gate is **>=34**, using the conservative minimum among
matched published variants. Unknown models cannot qualify through smoke tests.
Routine completion calls are capped at **$4 per million input and output tokens**,
with low reasoning effort where the current catalog supports it. Reasoning remains enabled for daily data work, with a 16,384-token total completion bound (raised from 8,192 on 2026-09-13, when reasoning alone exhausted 8,192 tokens on the largest contract packet) and 180-second request deadline. Actual model identity, reasoning configuration, returned usage and
review coverage are recorded. Producer and critic must belong to different families.
Model responses, source pages and candidate data are untrusted inputs.

Every live numeric row is checked programmatically against complete captured primary bodies. The producer/critic model pair reviews each adapter contract, verifier code, execution report and explicitly listed primary examples. Reports distinguish full programmatic coverage from model example coverage; they do not claim every live row was manually inspected by an LLM. Changed benchmark observations and vendor claims receive individual row reviews. Review packets contain actual primary evidence and immutable candidate identities.
API schema-constrained output proved unreliable in live transport checks. Daily producers request simple JSON-object output; critics request ordinary JSON. Local parsers enforce the required field types, exact artifact/hash binding and complete flat coverage. Expected response schemas remain in the evidence folder. A critic transport retry reuses the original hash-verified producer audit only while its artifact and evidence remain unchanged; the receipt records reuse without claiming a new call or date. The gauntlet is bounded to three rounds; missing evidence, incomplete coverage or a
malformed verdict cannot become acceptance. A producer/critic source disagreement quarantines the disputed row; a careful producer is not globally excluded for reporting missing evidence. Transport and invalid-output exclusions are shared by vendor extraction and all other daily model calls. Retain the previously accepted snapshot
or quarantine the affected candidate when a disagreement cannot be resolved. The
owner-reviewed code is the unattended acceptance gate; a model's self-rating is not.

Failures in a required live snapshot cannot publish from staging. A failed benchmark candidate is quarantined while its prior accepted observation remains dated and unchanged. Empty/malformed responses, missing
previous identities or measurements, and endpoint request failures are loud errors.
HTTP 401/403/429 and detected human-verification pages stop new requests to that source host; already-dispatched requests may finish. An explicit endpoint HTTP 404 is permitted only if it would lose no previously known
providers; router aliases then carry a dated `endpoint_status`. Exact unique public model/configuration identities survive ordinary leaderboard reordering; duplicate or missing identities fail closed. Changed values still require row review. Source withdrawals and
methodology/version changes require review. An owner-approved source-list exception expires and binds both complete identity sets; it cannot excuse another missing row or malformed response. Atomic individual writes are supplemented
by staging the entire daily transaction before publication.

Notifications are quiet by default and go only through `~/bin/notify now` (CR-66.6; no direct Telegram
request): a new top-five family, a new major family with AA >=55, or a newly comparable self-report divergence
of >=10 percentage points. Fraction scores are converted to percentage points; arbitrary units are not. First-run
state is seeded quietly. Failed sends remain pending and are retried; dedup keys are written only after a send.
Failures are not reported from here: the publish gate's `finalize` sends `notify now` on the second consecutive
failure. Three consecutive run failures still create an escalation request. An operator may then use `escalate.sh`;
that path checks ChatGPT subscription authentication and unsets API-key overrides.
Astra is absent from ordinary daily runs.

The reusable selection skill is staged at
`../rebuild-2026-09/skills/select-benchmarkheaven-workers/SKILL.md`.
Full source/approval contracts are in `../../docs/benchmark-ingestion.md` and
`../rebuild-2026-09/GAUNTLET.md`.

After a normal run publishes and verifies both public hosts, it removes the duplicate staging checkout, prior-raw copy and temporary candidates. Before/after dataset exports are compressed and byte-verified. Primary captures, gauntlet packets, full-row verification records, model receipts and reports remain. Failed and dry runs retain their full staging trees for investigation; they need periodic owner review if failures persist.

**Source health (CR-38.5, 2026-09-16).** After the benchmarks step, `ops/daily/source-health.mjs` writes
`reports/source-health.{json,md}` into the run directory: for every benchmark source, its status in the newest run,
the last run it refreshed or was confirmed unchanged, and — when failing — since when and for how many consecutive
runs, across every run still held under `runs/` plus the committed `daily-evidence/*/checks.json`. A retained failure
keeps the previous values on the site (correct), so this is where a stuck source becomes visible. Run it by hand with
`node ops/daily/source-health.mjs` (prints the failing table). Writing it can never fail the step.
