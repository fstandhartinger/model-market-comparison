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

# An iteration is still running?
if [ -f "$STATE/running" ]; then
  pid=$(awk '{print $4}' "$STATE/running")
  if kill -0 "$pid" 2>/dev/null; then exit 0; fi
  echo "$(date -u +%FT%TZ) stale running marker (pid $pid gone) — clearing"; rm -f "$STATE/running"
fi

# Finished?
if grep -q '^ALL-ACCEPTED' "$WS/PROGRESS.md" 2>/dev/null; then
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
elif [ "${works_since_design:-0}" -ge 2 ] && [ "$last_role" != design ]; then role=design
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
