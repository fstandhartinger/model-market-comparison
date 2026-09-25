#!/bin/bash
# Cron watchdog for the Benchmark Heaven UX workstream (every 10 min, user flori).
#   */10 * * * * /opt/model-market-comparison/ops/ux-2026-09-12/bin/tick.sh >> /opt/benchmarkheaven/logs/ux/tick.log 2>&1
# Starts at most one iteration at a time, schedules review and design gates, and stops by
# itself once PROGRESS.md says ALL-ACCEPTED after a review by a non-implementing engine.
set -uo pipefail
REPO=/opt/model-market-comparison
WS=$REPO/ops/ux-2026-09-12
BIN=$WS/bin
STATE=/opt/benchmarkheaven/state/ux
mkdir -p "$STATE" /opt/benchmarkheaven/logs/ux
exec 9>"$STATE/tick.lock"; flock -n 9 || exit 0
[ -f "$STATE/finished" ] && exit 0

# D194 (2026-09-25): an iteration log is 6-21 MB of text and nothing ever compressed them, so this
# directory reached 2.0 GB while the box's disk watchdog was refusing every agent's build at 91 %.
# gzip is lossless and ~10:1 here; three days keeps the recent ones readable with plain grep/tail,
# and the hung-iteration check below only ever looks at the newest `*-*.log`, which is never touched.
find /opt/benchmarkheaven/logs/ux -maxdepth 1 -name '*-*.log' ! -name tick.log -mtime +3 -print0 \
  | xargs -0 -r -P 2 gzip -9 2>/dev/null || true

# Launch sprint pause (Claude Code, 17 Sep 2026): a separate sprint job owns the repo until this time.
if [ -f "$STATE/paused-until" ] && [ "$(date +%s)" -lt "$(cat "$STATE/paused-until")" ]; then
  echo "$(date -u +%FT%TZ) paused for launch sprint until $(date -u -d @$(cat "$STATE/paused-until") +%H:%MZ)"; exit 0
fi
# 2026-09-22: a running iteration (and any other writer) is stopped at push time while the daily
# transaction holds its lock; installed before every early return so a running iteration is covered too.
if [ ! -e "$REPO/.git/hooks/pre-push" ]; then
  ln -s "$WS/bin/pre-push-daily-guard.sh" "$REPO/.git/hooks/pre-push" 2>/dev/null || true
fi
# An iteration is still running?
if [ -f "$STATE/running" ]; then
  pid=$(awk '{print $4}' "$STATE/running")
  if kill -0 "$pid" 2>/dev/null; then
    newest=$(ls -t /opt/benchmarkheaven/logs/ux/*-*.log 2>/dev/null | grep -v tick.log | head -1)
    # Only judge logs that stream progress (they grow past the start line). Older-style runs
    # print only at the end, so their silence means nothing; the 3 h timeout caps those.
    if [ -n "$newest" ] && [ "$(stat -c %s "$newest")" -gt 2000 ] \
       && [ $(( $(date +%s) - $(stat -c %Y "$newest") )) -gt 5400 ]; then
      echo "$(date -u +%FT%TZ) iteration pid $pid silent for >90 min ($newest) — stopping it"
      pkill -TERM -P "$pid" 2>/dev/null; kill -TERM "$pid" 2>/dev/null
      echo "$(date -u +%Y%m%dT%H%M%SZ) work hung-killed rc=124" >> "$STATE/history.log"
      rm -f "$STATE/running"
    fi
    exit 0
  fi
  echo "$(date -u +%FT%TZ) stale running marker (pid $pid gone) — clearing"; rm -f "$STATE/running"
fi

# 2026-09-17: the daily refresh publishes from this checkout and aborts if main moves or the tree is dirty
# during its run (05:17 → up to 3 h, plus manual recovery runs). Start nothing while it holds its lock.
DAILY_LOCK=/opt/benchmarkheaven-daily/state/run.lock
if [ -e "$DAILY_LOCK" ] && ! flock -n "$DAILY_LOCK" true 2>/dev/null; then
  echo "$(date -u +%FT%TZ) daily refresh running (run.lock held) — not starting an iteration"
  exit 0
fi

# Idle: pick up newer versions of these scripts and the brief, but only fast-forward and
# only on a clean worktree, so an interrupted iteration's work is never clobbered.
if [ -z "$(git -C "$REPO" status --porcelain 2>/dev/null)" ]; then
  git -C "$REPO" pull --ff-only -q origin main 2>/dev/null || echo "$(date -u +%FT%TZ) note: ff-only pull skipped"
fi

# Finished? Since CR-20260914 every CR- ledger row must exist and be verified as well; a premature
# ALL-ACCEPTED line does not end the workstream while change requests are outstanding.
cr_total=0; cr_unverified=0
if [ -f "$WS/04-CR-BRIEF.md" ]; then
  read -r cr_total cr_unverified < <(awk -F'|' '/^\| *CR-[0-9]/ {t++; st=""; for (i=2;i<=NF;i++) {f=$i; gsub(/[ *`]/,"",f); if (f ~ /^(open|in-progress|implemented|verified)$/) {st=f; break}} if (st != "verified") u++} END {print t+0, u+0}' "$WS/PROGRESS.md" 2>/dev/null || echo "0 0")
fi
if grep -q '^ALL-ACCEPTED' "$WS/PROGRESS.md" 2>/dev/null && [ -f "$WS/04-CR-BRIEF.md" ] && { [ "$cr_total" -eq 0 ] || [ "$cr_unverified" -gt 0 ]; }; then
  echo "$(date -u +%FT%TZ) ALL-ACCEPTED present but CR rows total=$cr_total unverified=$cr_unverified — not finishing"
elif grep -q '^ALL-ACCEPTED' "$WS/PROGRESS.md" 2>/dev/null; then
  date -u +%FT%TZ > "$STATE/finished"
  bash /opt/benchmarkheaven/bin/notify.sh "🏁 Benchmark Heaven UX-Workstream: alle Anforderungen live verifiziert (ALL-ACCEPTED). Details: $WS/PROGRESS.md" || true
  exit 0
fi

last_role=$(tail -1 "$STATE/history.log" 2>/dev/null | awk '{print $2}')
last_engine=$(tail -1 "$STATE/history.log" 2>/dev/null | awk '{print $3}')
works_since_review=$(awk '/ review /{n=0; next} / work /{n++} END{print n+0}' "$STATE/history.log" 2>/dev/null)
works_since_design=$(awk '/ design /{n=0; next} / work /{n++} END{print n+0}' "$STATE/history.log" 2>/dev/null)
impl_engine=$(awk '/ work /{e=$3} END{print e}' "$STATE/history.log" 2>/dev/null)

role=work
# Something claims to be complete, or 3 work iterations since the last gate -> review gate.
if grep -q 'CLAIM-ALL-DONE' "$WS/PROGRESS.md" 2>/dev/null && [ "$last_role" != review ]; then role=review
elif [ "${works_since_review:-0}" -ge 3 ]; then role=review
# Florian 2026-09-14: Fable 5.1 sparingly — design gate after 6 work iterations (was 2).
elif [ "${works_since_design:-0}" -ge 6 ] && [ "$last_role" != design ]; then role=design
fi

case "$role" in
  review) engine=$(bash "$BIN/pick-engine.sh" review "$impl_engine") ;;
  design) engine=$(bash "$BIN/pick-engine.sh" design)
          if [ "$engine" = none ]; then
            # No Claude headroom: skip the design pass this round, record it, keep working.
            echo "$(date -u +%Y%m%dT%H%M%SZ) design skipped-no-claude-headroom rc=0" >> "$STATE/history.log"
            role=work; engine=$(bash "$BIN/pick-engine.sh" work)
          fi ;;
  *) engine=$(bash "$BIN/pick-engine.sh" work) ;;
esac

echo "$(date -u +%FT%TZ) starting role=$role engine=$engine (works_since_review=$works_since_review works_since_design=$works_since_design)"
setsid nohup bash "$BIN/iterate.sh" "$engine" "$role" > /dev/null 2>&1 &
