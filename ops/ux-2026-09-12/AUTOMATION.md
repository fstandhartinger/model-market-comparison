# Benchmark Heaven UX automation

## Paths and ownership

The coordinator worktree is /home/flori/wt/bh-ux-workstream. Its Git metadata is held by the
isolated local repository /home/flori/wt/.bh-ux-workstream-repo. Each work unit gets a separate
worktree at /home/flori/wt/<job> and a jobs/<job> branch based on origin/main.

The coordinator runs the tick script. Each unit receives an allocated CR, commits through the
wrapper, pushes its own branch, and opens a PR without the merge-ready label. After owner review,
the normal Benchmark Heaven merge queue runs its gates, merges, and waits for the existing
deployment webhook. The UX runner never edits the deploy checkout.

State, logs, prompts, outputs, and evidence belong under
/home/flori/.local/state/benchmarkheaven/ux-workstream. The old state and logs under /opt are
historical and are not modified.

## Cron entries

After this automation PR is merged, install these home-local entries while preserving the
independent rebuild and daily refresh crons:

    */10 * * * * mkdir -p /home/flori/.local/state/benchmarkheaven/ux-workstream/logs && BH_UX_STATE=/home/flori/.local/state/benchmarkheaven/ux-workstream /home/flori/wt/bh-ux-workstream/ops/ux-2026-09-12/bin/tick.sh >> /home/flori/.local/state/benchmarkheaven/ux-workstream/logs/tick.log 2>&1 # benchmarkheaven-ux-workstream
    */5 * * * * BH_UX_STATE=/home/flori/.local/state/benchmarkheaven/ux-workstream /home/flori/wt/bh-ux-workstream/ops/ux-2026-09-12/bin/owner-lease.sh ensure # benchmarkheaven-ux-owner-lease

The owner lease process runs with the coordinator as its working directory and exits when the
home-local state contains finished.

## Engine routing

Before each unit, the selector checks quota-pace. Design and review use the selected judgement
engine: Claude Opus 5.5 medium or Codex GPT-6 Luna xhigh. Work uses the selected work engine.
When all paid engines are over pace, a free OpenCode work unit is admitted only for a
mechanically specified change. Claude-backed UX work is capped at one unit per rolling 24 hours.
A free route cannot perform design, review, benchmark-integrity, security, or publication
decisions.

The sandbox mounts /opt read-only for model processes. The wrapper owns branch creation, CR
allocation, staging, commits, push, and PR creation. Review stays pending until the owner applies
the ready label and the queue processes the PR.

## Supervised operation

A bounded one-time recovery tick is available after this PR merges:

    BH_UX_STATE=/home/flori/.local/state/benchmarkheaven/ux-workstream /home/flori/wt/bh-ux-workstream/ops/ux-2026-09-12/bin/tick.sh --supervised --recover-pass43

That path imports the six reviewed product files from saved Pass 43 and leaves out its obsolete
Fable screenshot helper. The normal cron remains one unit at a time and stops while a previous
unit or PR needs attention.\n