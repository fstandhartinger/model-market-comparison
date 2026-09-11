# Phase 09 gauntlet — critic rounds 1–3 and residue

Producer (phase-09 artifacts): `deepseek/deepseek-v4.1-flash` (family deepseek).
Critic (all rounds): `z-ai/glm-5.3-flash` (family z-ai, AA Intelligence Index 41.9),
selected by `bin/worker.sh --critic` under the AA >= 34 rule; critic family differs
from the producer family. Two rounds were needed to fix worker-selection errors before
a review could complete:

- The first attempts failed with `Scheduled model meta/muse-spark-1.3 not in Florian's
  authorized scheduled-worker set`: `worker-runner.mjs` marks all non-agent calls
  `scheduled: true`, and meta models are not in `FLORIAN_ALLOWED_SCHEDULED_WORKERS`.
- A run at 8192 output tokens returned `WORKER_ERROR: Incomplete completion (length)`.
  All completed rounds therefore used `--max-tokens 32768` and
  `BH_WORKER_REASONING_EFFORT=low`.

Round limit per `GAUNTLET.md` is three. All three rounds were used. The artifacts and
the review are frozen here; residue is recorded rather than re-reviewed.

## Round 1

- Packet: `critic-round1-packet.md`, sha256 `9d4a52fec8701f26f97ce47cd89b449b96ffb7befae4259398689ed7dc429d85`
- Review: `critic-round1-review.json` (model `z-ai/glm-5.3-flash`, cost $0.0034013925)
- Verdict: `revise`, `errors_found: 7` (E1–E7)
- Resolved: E1 W28 opencode status; E2 767 derived; E3 UTF-8 byte counts; E4 skill
  trigger clauses; E5 /api/health db:false; E6 mixed source dates; E7 W3/W8 citations.

## Round 2

- Packet: `critic-round2-packet.md`, sha256 `09bc28e1d1564181cf057b701450b18be286c95f8c15fed233717a96a0b52511`
- Review: `critic-round2-review.json` (cost $0.0042834825)
- Verdict: `revise`, `errors_found: 4` (R2-1..R2-4), all minor
- Resolved: R2-1 CHANGELOG copy wording; R2-2 aa_coding_agents v1.4 dated 2026-09-09;
  R2-3 brief cites the run report and states the AA rule is pick-time enforced;
  R2-4 both skills say "all Sandy runtimes; WSL remains a documented gap".

## Round 3 (final)

- Packet: `critic-round3-packet.md`, sha256 `9539534e7f6828cc857c2486bc19681f399e9b2af2f44367f8e782128b87c230`
- Review: `critic-round3-review.json` (cost $0.0043079355)
- Verdict: `revise`, `errors_found: 1` (R3-1, minor); R2-1..R2-4 verified fixed.
- R3-1: W8's "33 calls, all AA >= 34 and under the $4/M ceiling" could not be verified
  from the round-3 packet because per-model AA/price evidence for
  `deepseek/deepseek-v4-pro-0813` and `google/gemini-3.7-flash` was not embedded.

### R3-1 resolution (evidence, not a re-review)

The claim is substantiated by the pick-time catalog already produced by the daily run:
`/opt/benchmarkheaven-daily/runs/2026-09-11T06-32-03-542Z-839690/reports/worker-catalog.json`
(`min_index: 34`, `generated_at: 2026-09-11T06:32:12.506Z`). The four models the run
actually used all clear the gate, and the highest used output price is below $4/M:

| model | AA index | input $/1M | output $/1M |
|---|---|---|---|
| deepseek/deepseek-v4-flash-0731 | 34.5 | 0.065 | 0.18 |
| z-ai/glm-5.3-flash | 41.9 | 0.15 | 0.5 |
| deepseek/deepseek-v4-pro-0813 | 36.3 | 1.0494 | 3.1482 |
| google/gemini-3.7-flash | 36.9 | 0.75 | 3.75 |

`reports/workers.json` records the producer/critic pair for the same run. W8 in
`COVERAGE.md` now cites this catalog. Because the round limit was reached, this
resolution was applied by the owner and is recorded here rather than sent to a fourth
critic round.

## Frozen packet digests (sidecar)

The review contract asks for one `artifact_sha256` per artifact set. Because a digest
cannot be embedded in the file it hashes, each packet's digest is recorded in a
`.sha256` sidecar next to it:

- `critic-round1-packet.md.sha256`
- `critic-round2-packet.md.sha256`
- `critic-round3-packet.md.sha256`

## Open items at freeze (not delivered)

- Explainer video: W27 **incomplete** — brief written, local Claude handoff outstanding.
- Florian's WSL machine unreachable: skills installed on the three Sandy runtimes only.
- Skill runtime discovery/invocation not tested; file presence + SHA-256 only.
  **Resolved after freeze (owner, attempt 3):** `bin/verify-skills-discovery.mjs` re-hashes
  all six installed files on all three Sandy runtimes (all match canonical) and records a
  real discovery test for the running opencode session, which enumerated the six skills
  from `/home/flori/.config/opencode/skills`. Claude Code (2.1.265, `/skill-name`) and
  Codex (0.154.0, no list command) remain path-/frontmatter-verified only; a Claude
  model-invocation test was skipped to conserve quota. Evidence:
  `evidence/phase-09/runtime-discovery.json`. The WSL installation stays incomplete
  (`flo-nitro` offline; `tailscale ping` times out).
- Byte-identity of the four copied skills to their phase-02/04/08 originals is asserted
  in the packet header; the originals live in phase directories and were verified with
  `diff -q` at copy time.
