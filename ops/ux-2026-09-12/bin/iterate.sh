#!/usr/bin/env bash
# One bounded UX unit, isolated to a per-unit worktree and surfaced as an unready PR.
set -Eeuo pipefail

ENGINE=$1
ROLE=$2
STATE=$3
JOB=$4
BIN=$(cd "$(dirname "$0")" && pwd)
ROOT=$(git -C "$BIN/../../.." rev-parse --show-toplevel)
WT_ROOT=/home/flori/wt
WT=$WT_ROOT/$JOB
BRANCH=jobs/$JOB
RUN_DIR=$STATE/runs/$JOB
REPO=fstandhartinger/model-market-comparison
TS=$(date -u +%Y%m%dT%H%M%SZ)

case "$JOB" in
  *[!A-Za-z0-9._-]*|'') echo "iterate: invalid job slug" >&2; exit 64 ;;
esac
case "$ROLE" in work|review|design) ;; *) echo "iterate: invalid role" >&2; exit 64 ;; esac
case "$ROOT/" in /opt/*) echo "iterate: refusing deploy checkout" >&2; exit 70 ;; esac
case "$STATE/" in /opt/*) echo "iterate: state must stay outside /opt" >&2; exit 70 ;; esac
[ -d "$WT_ROOT" ] || { echo "iterate: worktree root missing" >&2; exit 66; }
[ ! -e "$WT" ] || { echo "iterate: unit worktree already exists; inspect $WT" >&2; exit 73; }
[ ! -e "$STATE/pending-unit.json" ] || { echo "iterate: another unit is pending" >&2; exit 73; }

case "$ENGINE" in
  claude-opus-medium) QENGINE=claude; if [ "$ROLE" = work ]; then QKIND=work; else QKIND=judgement; fi ;;
  codex-luna-xhigh) QENGINE=codex ;;
  devin-opus-medium) QENGINE=devin; QKIND=judgement; [ "$ROLE" != work ] || { echo "iterate: Devin Opus is judgement-only" >&2; exit 64; } ;;
  devin-sonnet-high) QENGINE=devin; QKIND=work; [ "$ROLE" = work ] || { echo "iterate: Devin Sonnet is a work engine" >&2; exit 64; } ;;
  opencode-free) QENGINE=free; QKIND=work ;;
  *) echo "iterate: unsupported engine $ENGINE" >&2; exit 64 ;;
esac
if [ "$ENGINE" = codex-luna-xhigh ]; then
  if [ "$ROLE" = work ]; then QKIND=work; else QKIND=judgement; fi
fi
if [ "$QENGINE" != free ]; then
  QUOTA_PACE_CALLER="bh-ux:$ROLE" "$HOME/bin/quota-pace" allow "$QENGINE" --kind "$QKIND" || {
    echo "iterate: $QENGINE is no longer eligible for $QKIND" >&2
    exit 75
  }
fi
if [ "$QENGINE" = free ]; then
  [ "$ROLE" = work ] || { echo "iterate: free route cannot design or review" >&2; exit 75; }
  [ "$(printenv BH_UX_MECHANICAL 2>/dev/null || true)" = 1 ] || {
    echo "iterate: free OpenCode requires an explicitly mechanical work unit" >&2
    exit 75
  }
fi
case "$ENGINE" in
  claude-*) BOARD_ENGINE=claude ;;
  codex-*) BOARD_ENGINE=codex ;;
  devin-*) BOARD_ENGINE=devin ;;
  *) BOARD_ENGINE=opencode ;;
esac

mkdir -p "$RUN_DIR" "$STATE/history"
git -C "$ROOT" fetch --quiet origin main
git -C "$ROOT" worktree add -b "$BRANCH" "$WT" origin/main
BASE=$(git -C "$WT" rev-parse HEAD)
CR_JSON=$(~/bin/bh-allocate-cr --owner "$JOB" --title "Benchmark Heaven UX $ROLE unit")
CR=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["cr"])' <<< "$CR_JSON")
python3 - "$STATE/pending-unit.json" "$JOB" "$BRANCH" "$WT" "$CR" "$ENGINE" "$ROLE" "$BASE" <<'PY_PENDING'
import datetime, json, os, sys, tempfile
path, job, branch, wt, cr, engine, role, base = sys.argv[1:]
row = {
    "job": job, "branch": branch, "worktree": wt, "cr": cr,
    "engine": engine, "role": role, "base": base,
    "started_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
}
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix=".pending-unit.")
with os.fdopen(fd, "w") as f:
    json.dump(row, f, sort_keys=True)
    f.write("\n")
os.replace(tmp, path)
PY_PENDING
echo "$$ $ROLE $ENGINE $TS" > "$STATE/running"
printf "%s %s %s started\n" "$TS" "$ROLE" "$ENGINE" >> "$STATE/history.log"
printf "%s %s %s started\n" "$TS" "$ROLE" "$ENGINE" >> "$STATE/history.log"
cleanup() {
  if [ -f "$STATE/running" ] && [ "$(awk '{print $1}' "$STATE/running")" = "$$" ]; then
    rm -f "$STATE/running"
  fi
}
trap cleanup EXIT
cat > "$RUN_DIR/PROMPT.md" <<EOF_PROMPT
You are continuing Benchmark Heaven's UX workstream in a disposable per-unit worktree.

Read these repository files first:
- ops/ux-2026-09-12/00-REQUIREMENTS-VERBATIM.md
- ops/ux-2026-09-12/01-BRIEF.md
- ops/ux-2026-09-12/02-ADDENDUM-HERMES-CHAT.md
- ops/ux-2026-09-12/03-CHANGE-REQUESTS-VERBATIM.md
- ops/ux-2026-09-12/04-CR-BRIEF.md
- ops/ux-2026-09-12/PROGRESS.md
- ops/ux-2026-09-12/DESIGN-DIRECTIVES.md, if present

Current role: $ROLE
Engine: $ENGINE
Allocated change request: $CR
Worktree: $WT
Branch: $BRANCH

Keep the complete /jev-models page structure required by /home/flori/AGENTS.md: capability bar chart; synced capability-vs-speed and capability-vs-cost charts with 3D toggle; composite score chart; direct comparison; full table; method notes, presets, What-If and revision history. Keep wrappers and subsidised entries in a separately labelled section below rankings.

Role instructions:
- work: choose one small, well-specified open requirement and implement it. If the only next item requires a product/design/data decision, stop with no edits and explain that in OUTPUT.md. When using free OpenCode, work only on the first explicit MECHANICAL-OPEN line in ops/ux-2026-09-12/MECHANICAL-QUEUE.md; if none exists, make no edits. Do not make product, design, benchmark, security or publication decisions. Mark a completed queue line MECHANICAL-DONE with a concise result.
- design: make concise, actionable changes to DESIGN-DIRECTIVES.md based on the written requirements and current evidence. Do not write factual or policy claims without provenance.
- review: perform quality assurance of our own product. Inspect recent relevant changes against the requirements and record concrete findings in a dated REVIEW file. Mark nothing verified without evidence from an engine different from the implementer and a live deployed check.
- Do not set an item to implemented until its code is merged and deployed. Do not set verified without independent live verification.

Hard rules:
- Work only in this branch and worktree. Do not read or write /opt/model-market-comparison or any other deploy checkout. The process mount denies writes to /opt.
- Do not create commits, push branches, open PRs, deploy, change crontabs, send messages, or edit files outside this worktree. The wrapper owns those steps.
- Do not run tests or download dependencies. The serialized merge queue runs required gates after owner review.
- Do not read secrets, credentials, customer data or held-out evaluation data. Do not write them into files or output.
- Keep the change small and explain the files changed and any evidence or limitations in OUTPUT.md.

The worktree starts from origin/main at $BASE. There are no local commits to preserve.
EOF_PROMPT
cp "$RUN_DIR/PROMPT.md" "$WT/PROMPT.md"

run_sandbox() {
  bwrap --bind / / --ro-bind /opt /opt --proc /proc --dev /dev --clearenv \
    --setenv HOME "$HOME" \
    --setenv USER flori \
    --setenv LOGNAME flori \
    --setenv LANG C.UTF-8 \
    --setenv TERM dumb \
    --setenv PATH "$HOME/.local/bin:$HOME/.npm-global/bin:$HOME/.opencode/bin:/usr/local/bin:/usr/bin:/bin" \
    --setenv OPENAI_API_KEY "" \
    --setenv AGENT_BOARD_JOBDIR "$RUN_DIR" \
    --setenv AGENT_BOARD_NAME "$BOARD_ENGINE:$JOB" \
    --chdir "$WT" "$@"
}
KIND=$QKIND
set +e
case "$ENGINE" in
  codex-luna-xhigh)
    run_sandbox --setenv AGENT_PAID_ONLY 1 --setenv AGENT_SKIP_CLAUDE_FALLBACK 1 -- \
      "$HOME/bin/run-codex.sh" "$WT" gpt-6-luna xhigh "$KIND" \
      >"$RUN_DIR/runner.log" 2>&1
    RUN_RC=$?
    ;;
  claude-opus-medium)
    run_sandbox -- /bin/bash -c '
      QUOTA_PACE_CALLER=bh-ux-claude "$HOME/bin/quota-pace" allow claude --kind "$1" || exit 75
      printf "%s\n" "claude-opus-5-5 medium" > .engine
      prompt="$(cat /home/flori/bin/job-preamble.txt "$2/PROMPT.md")"
      env -u ANTHROPIC_API_KEY timeout --signal=INT --kill-after=30 10800 \
        /home/flori/.local/bin/claude -p "$prompt" --model opus --effort medium \
        --dangerously-skip-permissions --output-format text > OUTPUT.md
    ' ux-claude "$KIND" "$WT" >"$RUN_DIR/runner.log" 2>&1
    RUN_RC=$?
    ;;
  devin-opus-medium)
    run_sandbox --setenv DEVIN_MODEL claude-opus-5-5-medium \
      --setenv DEVIN_TIMEOUT_SEC 10800 -- \
      "$HOME/bin/run-devin.sh" "$WT" judgement >"$RUN_DIR/runner.log" 2>&1
    RUN_RC=$?
    ;;
  devin-sonnet-high)
    run_sandbox --setenv DEVIN_MODEL claude-sonnet-5-5-high \
      --setenv DEVIN_TIMEOUT_SEC 10800 -- \
      "$HOME/bin/run-devin.sh" "$WT" work >"$RUN_DIR/runner.log" 2>&1
    RUN_RC=$?
    ;;
  opencode-free)
    run_sandbox --setenv AGENT_RUNNER opencode --setenv AGENT_KIND work \
      --setenv AGENT_PAID_ONLY 1 -- \
      "$HOME/bin/agent-run.sh" --prompt-file "$WT/PROMPT.md" --out "$WT/OUTPUT.md" \
        --dir "$WT" --timeout 10800 >"$RUN_DIR/runner.log" 2>&1
    RUN_RC=$?
    ;;
esac
set -e

ENGINE_USED=$(cat "$WT/.engine" 2>/dev/null || printf '%s' "$ENGINE")
for file in PROMPT.md OUTPUT.md .engine .codex-attempt.log .devin-attempt.log; do
  if [ -e "$WT/$file" ]; then mv "$WT/$file" "$RUN_DIR/$file"; fi
done
[ -f "$RUN_DIR/.engine" ] && ENGINE_USED=$(cat "$RUN_DIR/.engine")
printf '%s %s %s rc=%s\n' "$TS" "$ROLE" "$ENGINE_USED" "$RUN_RC" >> "$STATE/history.log"
if [ "$RUN_RC" -ne 0 ]; then
  echo "iterate: engine exited $RUN_RC; unit retained at $WT; see $RUN_DIR/runner.log" >&2
  exit "$RUN_RC"
fi
[ -s "$RUN_DIR/OUTPUT.md" ] || {
  echo "iterate: runner produced no OUTPUT.md; retained $WT and $RUN_DIR" >&2
  exit 65
}
[ "$(git -C "$WT" rev-parse HEAD)" = "$BASE" ] || {
  echo "iterate: agent committed; refusing an agent-created commit" >&2
  exit 65
}
git -C "$WT" diff --check
git -C "$WT" add -A
[ -n "$(git -C "$WT" diff --cached --name-only)" ] || {
  rm -f "$STATE/pending-unit.json"
  echo "iterate: no code or documentation change; no PR opened" >&2
  exit 65
}
if git -C "$WT" diff --cached --name-only | rg -q '(^|/)(\.env|.*credentials|.*secret)|jevbench-sealed'; then
  echo "iterate: staged paths include a forbidden secret or held-out-data name" >&2
  exit 65
fi
git -C "$WT" diff --cached --stat > "$RUN_DIR/staged-stat.txt"
case "$ENGINE_USED" in
  *claude*|*opus*) COAUTHOR="Co-Authored-By: Claude Opus 5.5 (Benchmark Heaven UX workstream) <noreply@anthropic.com>" ;;
  *sonnet*) COAUTHOR="Co-Authored-By: Claude Sonnet 5.5 (Devin, Benchmark Heaven UX workstream) <noreply@anthropic.com>" ;;
  *codex*) COAUTHOR="Co-Authored-By: Codex GPT-6 Luna (Benchmark Heaven UX workstream) <noreply@openai.com>" ;;
  *) COAUTHOR="Co-Authored-By: OpenCode (Benchmark Heaven UX workstream) <noreply@openai.com>" ;;
esac
git -C "$WT" commit -m "$CR: Benchmark Heaven UX $ROLE unit" -m "$COAUTHOR"
git -C "$WT" push -u origin "$BRANCH"
cat > "$RUN_DIR/PR-BODY.md" <<EOF_BODY
## Change

$CR — Benchmark Heaven UX $ROLE unit, created from the isolated UX workstream.

$(cat "$RUN_DIR/OUTPUT.md")

## Review and release

- Work is isolated in branch $BRANCH and was prepared by the supervised UX workstream.
- No tests were run by the unit; the serialized Benchmark Heaven merge queue runs the required gates.
- This PR has not been marked merge-ready. Owner review is required first.
EOF_BODY
~/bin/bh-pr open --head "$BRANCH" --title "$CR: Benchmark Heaven UX $ROLE unit" \
  --body-file "$RUN_DIR/PR-BODY.md" > "$RUN_DIR/pr-open.log"
PR_JSON=$(gh pr view "$BRANCH" --repo "$REPO" --json number,url,state)
python3 - "$STATE/pending-pr.json" "$PR_JSON" "$JOB" "$BRANCH" "$CR" "$WT" "$ENGINE_USED" <<'PY_PR'
import datetime, json, os, sys, tempfile
path, pr_text, job, branch, cr, wt, engine = sys.argv[1:]
pr = json.loads(pr_text)
row = {
    "number": pr["number"], "url": pr["url"], "state": pr["state"],
    "job": job, "branch": branch, "cr": cr, "worktree": wt, "engine": engine,
    "opened_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
}
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix=".pending-pr.")
with os.fdopen(fd, "w") as f:
    json.dump(row, f, sort_keys=True)
    f.write("\n")
os.replace(tmp, path)
PY_PR
rm -f "$STATE/pending-unit.json"
echo "PR $PR_JSON"\n\n\n\n
