#!/usr/bin/env bash
# Cron coordinator for Benchmark Heaven UX.
# Install from the isolated copy under /home/flori/wt/bh-ux-workstream; it never writes to /opt.
set -Eeuo pipefail
export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$HOME/.opencode/bin:/usr/local/bin:/usr/bin:/bin"
BIN=$(cd "$(dirname "$0")" && pwd)
ROOT=$(git -C "$BIN/../../.." rev-parse --show-toplevel)
WS=$ROOT/ops/ux-2026-09-12
STATE=$(printenv BH_UX_STATE 2>/dev/null || true)
if [ -z "$STATE" ]; then STATE=$HOME/.local/state/benchmarkheaven/ux-workstream; fi
LOGS=$STATE/logs
LOG=$LOGS/tick.log
SUPERVISED=0
RECOVER=0
MECHANICAL=0
if grep -q '^MECHANICAL-OPEN: ' "$WS/MECHANICAL-QUEUE.md" 2>/dev/null; then MECHANICAL=1; fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    --supervised) SUPERVISED=1 ;;
    --recover-pass43) RECOVER=1 ;;
    *) echo "tick: unknown option $1" >&2; exit 64 ;;
  esac
  shift
done

case "$ROOT/" in
  /opt/*) echo "tick: refusing to run from the deploy checkout" >&2; exit 70 ;;
esac
case "$STATE/" in
  /opt/*) echo "tick: state directory must be outside /opt" >&2; exit 70 ;;
esac

mkdir -p "$LOGS" "$STATE/history"
log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >> "$LOG"; }

if [ "$RECOVER" = 1 ] && [ "$SUPERVISED" != 1 ]; then
  echo "tick: --recover-pass43 requires --supervised" >&2
  exit 64
fi

exec 9>"$STATE/tick.lock"
if ! flock -n 9; then
  log "another UX tick owns the lock; skipping"
  exit 0
fi

if [ -f "$STATE/finished" ]; then
  log "workstream is marked finished"
  exit 0
fi

if [ -f "$STATE/running" ]; then
  pid=$(awk '{print $1}' "$STATE/running")
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
    log "iteration pid $pid is still active"
    exit 0
  fi
  mv "$STATE/running" "$STATE/history/stale-running-$(date -u +%Y%m%dT%H%M%SZ)"
fi

if [ -f "$STATE/pending-unit.json" ]; then
  log "a prior UX unit needs recovery from $STATE/pending-unit.json; not starting another"
  exit 0
fi

if [ -f "$STATE/pending-pr.json" ]; then
  pr=$(python3 - "$STATE/pending-pr.json" <<'PY_INNER'
import json, sys
try:
    print(int(json.load(open(sys.argv[1]))["number"]))
except Exception:
    raise SystemExit(2)
PY_INNER
) || { log "pending PR receipt is invalid; failing closed"; exit 0; }
  pr_state=$(python3 "$BIN/pr-state.py" "$pr" 2>/dev/null) || {
    log "cannot read pending PR #$pr; failing closed"
    exit 0
  }
  pr_state_name=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["state"])' <<< "$pr_state") || {
    log "pending PR #$pr status is invalid; failing closed"
    exit 0
  }
  case "$pr_state_name" in
    open)
      log "PR #$pr is still open; waiting for owner review and the merge queue"
      exit 0
      ;;
    closed)
      merged_at=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("merged_at") or "")' <<< "$pr_state") || {
        log "pending PR #$pr status is invalid; failing closed"
        exit 0
      }
      if [ -z "$merged_at" ]; then
        log "PR #$pr was closed without merge; manual review required"
        exit 0
      fi
      ;;
    *)
      log "unexpected state for PR #$pr; failing closed"
      exit 0
      ;;
  esac
  mv "$STATE/pending-pr.json" "$STATE/history/pr-$pr.json"
  log "PR #$pr is merged; coordinator may continue"
fi

if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  log "coordinator worktree is dirty; refusing to start"
  exit 0
fi
git -C "$ROOT" fetch --quiet origin main || { log "cannot fetch origin/main"; exit 0; }
if ! git -C "$ROOT" merge --ff-only --quiet origin/main; then
  unmerged=$(git -C "$ROOT" cherry origin/main HEAD 2>/dev/null | awk '$1 == "+"')
  if [ -n "$unmerged" ]; then
    log "coordinator branch contains changes not yet merged to main; waiting"
    exit 0
  fi
  # Every coordinator commit is patch-equivalent to main, and this owned worktree is clean.
  git -C "$ROOT" reset --hard origin/main >/dev/null || {
    log "coordinator could not fast-forward to origin/main"
    exit 0
  }
fi

if grep -q '^ALL-ACCEPTED' "$WS/PROGRESS.md" 2>/dev/null; then
  read -r cr_total cr_unverified < <(python3 - "$WS/PROGRESS.md" <<'PY_INNER'
import re, sys
statuses = {"open", "in-progress", "implemented", "verified"}
total = unverified = 0
for line in open(sys.argv[1], errors="replace"):
    if not re.match(r"^\|\s*CR-[0-9]", line):
        continue
    total += 1
    cells = [part.replace("*", "").replace(chr(96), "").strip().lower() for part in line.split("|")[1:]]
    state = next((part for part in cells if part in statuses), "")
    if state != "verified":
        unverified += 1
print(total, unverified)
PY_INNER
)
  if [ "$cr_total" -eq 0 ] || [ "$cr_unverified" -gt 0 ]; then
    log "ALL-ACCEPTED is present but CR rows total=$cr_total unverified=$cr_unverified"
  else
    date -u +%FT%TZ > "$STATE/finished"
    log "all accepted items and CR rows are verified; stopping"
    exit 0
  fi
fi

if [ "$RECOVER" = 1 ]; then
  log "starting supervised pass-43 recovery unit"
  BH_UX_STATE="$STATE" bash "$BIN/recover-pass43.sh" "$STATE"
  exit $?
fi

last_role=$(tail -1 "$STATE/history.log" 2>/dev/null | awk '{print $2}')
works_since_review=$(awk '$2 == "review" { n=0; next } $2 == "work" { n++ } END { print n+0 }' "$STATE/history.log" 2>/dev/null)
works_since_design=$(awk '$2 == "design" { n=0; next } $2 == "work" { n++ } END { print n+0 }' "$STATE/history.log" 2>/dev/null)
impl_engine=$(awk '$2 == "work" { e=$3 } END { print e }' "$STATE/history.log" 2>/dev/null)

role=work
if grep -q 'CLAIM-ALL-DONE' "$WS/PROGRESS.md" 2>/dev/null && [ "$last_role" != review ]; then
  role=review
elif [ "$works_since_review" -ge 3 ]; then
  role=review
elif [ "$works_since_design" -ge 6 ] && [ "$last_role" != design ]; then
  role=design
fi

engine=$(BH_UX_STATE="$STATE" bash "$BIN/pick-engine.sh" "$role" "$impl_engine")
if [ "$engine" = none ]; then
  log "no eligible independent engine for $role; waiting for quota headroom"
  exit 0
fi
if [ "$engine" = opencode-free ] && [ "$MECHANICAL" != 1 ]; then
  log "quota picker returned free; this UX unit is not marked mechanical, so no agent was started"
  exit 0
fi

job=$(printf 'bh-ux-%s-%s' "$role" "$(date -u +%Y%m%dT%H%M%SZ)")
log "starting role=$role engine=$engine job=$job works_since_review=$works_since_review works_since_design=$works_since_design"
if [ "$SUPERVISED" = 1 ]; then
  if BH_UX_STATE="$STATE" BH_UX_MECHANICAL="$MECHANICAL" bash "$BIN/iterate.sh" "$engine" "$role" "$STATE" "$job"; then
    rc=0
  else
    rc=$?
  fi
  log "supervised unit $job ended rc=$rc"
  exit "$rc"
fi

setsid nohup env BH_UX_STATE="$STATE" BH_UX_MECHANICAL="$MECHANICAL" \
  bash "$BIN/iterate.sh" "$engine" "$role" "$STATE" "$job" \
  9>&- >> "$LOGS/$job.log" 2>&1 < /dev/null &
pid=$!
log "launched pid=$pid role=$role engine=$engine job=$job"\n
