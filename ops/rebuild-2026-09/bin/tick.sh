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
PHASES="01 02 03 04 05 06 07 08 09 10"
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
    # Phasen mit Qualitaetstor duerfen erst weiterziehen, wenn das Tor haelt.
    # Sonst ueberholt der 10-Minuten-Tick die Wache und die naechste Phase
    # arbeitet, waehrend das Tor noch Tests faehrt. Die Tor-Datei setzt die
    # Nachtwache (bh-nachtwache) bzw. der Qualitaetslauf watch.sh --gate.
    case "$cur" in
      09|10)
        gate_ok="$STATE/.watch/gate-$cur.ok"
        if [ ! -f "$gate_ok" ]; then
          # Notausgang: Wenn seit ueber 90 Minuten ein PASS-Ergebnis vorliegt und
          # niemand die Tor-Datei gesetzt hat, ziehen wir weiter, damit der Umbau
          # nicht an einer vergessenen Datei haengt — mit Logeintrag.
          res="$STATE/.watch/gate-$cur.result"
          if [ -f "$res" ] && grep -q 'GATE_MACHINE=PASS' "$res" && [ -n "$(find "$res" -mmin +90 2>/dev/null)" ]; then
            echo "tick: $cur DONE, Tor-PASS liegt seit >90 Min vor, setze Tor-Datei selbst"
            date -u +%FT%TZ > "$gate_ok"
          else
            echo "tick: $cur DONE, warte auf das Qualitaetstor (Wache setzt $gate_ok)"
            exit 0
          fi
        fi;;
    esac
    nxt=""
    for p in $PHASES; do [ "$p" = "$cur" ] && take=1 && continue; [ "${take:-}" = 1 ] && nxt=$p && break; done
    if [ -z "$nxt" ]; then
      if [ ! -f "$STATE/all-done" ]; then
        date -u +%FT%TZ > "$STATE/all-done"
        bash "$BIN/notify.sh" "🏁 Benchmark Heaven: alle 10 Phasen abgeschlossen. Report: $REPO/ops/rebuild-2026-09/REPORT.md"
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
    # Sonderfall, der am 11.09. Versuche verbrannt hat: der Agent beendet den
    # Lauf sauber (rc=0), laesst die Statusdatei aber auf RUNNING, weil der
    # Phasenauftrag sagt, der Runner verwalte den Status. Der alte Runner
    # schrieb nur CRASHED, nie DONE. Deshalb: endet der letzte Lauf dieses
    # Phaselogs mit "end rc=0" und liegen Belege vor (Evidence-Dateien), gilt
    # die Phase als geliefert — das Qualitaetstor prueft danach unabhaengig.
    lastlog=$(ls -t "$BH/logs"/phase-$cur-*.log 2>/dev/null | head -1)
    if [ -n "$lastlog" ] && tail -3 "$lastlog" | grep -q "phase $cur end rc=0"; then
      evid="$REPO/ops/rebuild-2026-09/evidence/phase-$cur"
      n=$(find "$evid" -type f 2>/dev/null | wc -l | tr -d ' ')
      if [ "${n:-0}" -ge 3 ]; then
        echo "tick: $cur Lauf endete rc=0 mit $n Belegdateien, aber Status blieb RUNNING -> setze DONE (Tor entscheidet)"
        echo "DONE (runner-erkannt: rc=0, $n Belegdateien, Status vom Agenten nicht gesetzt)" > "$STATE/phase-$cur.status"
        exit 0
      fi
      echo "tick: $cur Lauf endete rc=0, aber nur ${n:-0} Belegdateien -> Neustart statt DONE"
    fi
    echo "tick: phase $cur status RUNNING but no owner process; stale run, restarting free"
    restart free;;
  CRASHED*|"")
    restart;;
esac
