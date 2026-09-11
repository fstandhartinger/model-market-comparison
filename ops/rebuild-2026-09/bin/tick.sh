#!/bin/bash
# Cron watchdog: advance the Benchmark Heaven rebuild one phase at a time.
# No long-running agent session waits for anything; this job does the waiting.
# crontab:  */10 * * * * /opt/benchmarkheaven/bin/tick.sh >> /opt/benchmarkheaven/tick.log 2>&1
set -uo pipefail
REPO=/opt/model-market-comparison
BH=/opt/benchmarkheaven
STATE=$BH/state
BIN=$REPO/ops/rebuild-2026-09/bin
LOCK=$BH/tick.lock
PHASES="01 02 03 04 05 06 07 08 09"
MAX_RETRIES=2

exec 9>"$LOCK"; flock -n 9 || exit 0
pgrep -f "codex exec.*model-market-comparison" > /dev/null && exit 0   # codex owner still active
pgrep -f "opencode run.*model-market-comparison" > /dev/null && exit 0   # opencode owner still active

mkdir -p "$STATE"
cur=$(cat "$STATE/current-phase" 2>/dev/null || echo "")
[ -n "$cur" ] || cur=01
st=$(tail -1 "$STATE/phase-$cur.status" 2>/dev/null || echo "")

owner_alive() {
  pgrep -f "opencode run.*model-market-comparison" > /dev/null && return 0
  pgrep -f "codex exec.*model-market-comparison" > /dev/null && return 0
  return 1
}

restart() {
  n=$(cat "$STATE/retries-$cur" 2>/dev/null || echo 0)
  if [ "${1:-}" != "free" ] && [ "$n" -ge "$MAX_RETRIES" ]; then
    if [ ! -f "$STATE/blocked-notified-$cur" ]; then
      touch "$STATE/blocked-notified-$cur"
      bash "$BIN/notify.sh" "⚠️ Benchmark Heaven Phase $cur ist nach $n Versuchen gescheitert. Log: $BH/logs/"
    fi
    exit 0
  fi
  [ "${1:-}" = "free" ] && n=0
  echo $((n + 1)) > "$STATE/retries-$cur"
  echo "tick: starting phase $cur (attempt $((n + 1)))"
  exec bash "$BIN/run-phase.sh" "$cur"
}

case "$st" in
  DONE*)
    nxt=""
    for p in $PHASES; do [ "$p" = "$cur" ] && take=1 && continue; [ "${take:-}" = 1 ] && nxt=$p && break; done
    if [ -z "$nxt" ]; then
      if [ ! -f "$STATE/all-done" ]; then
        date -u +%FT%TZ > "$STATE/all-done"
        bash "$BIN/notify.sh" "🏁 Benchmark Heaven: alle 9 Phasen abgeschlossen. Report: $REPO/ops/rebuild-2026-09/REPORT.md"
      fi
      exit 0
    fi
    echo "tick: $cur done -> starting $nxt"; exec bash "$BIN/run-phase.sh" "$nxt";;
  BLOCKED*)
    if [ ! -f "$STATE/blocked-notified-$cur" ]; then
      touch "$STATE/blocked-notified-$cur"
      bash "$BIN/notify.sh" "⚠️ Benchmark Heaven Phase $cur ist blockiert: $st"
    fi; exit 0;;
  RUNNING*)
    # A live owner process means the phase is genuinely running. If no owner
    # process exists the runner died without writing CRASHED (external kill,
    # session teardown, OOM) and the status is stale — restart instead of
    # waiting forever. A stale run is an infrastructure death, not a phase
    # failure, so it does not consume the retry budget.
    owner_alive && exit 0
    echo "tick: phase $cur status RUNNING but no owner process; stale run, restarting free"
    restart free;;
  CRASHED*|"")
    restart;;
esac
