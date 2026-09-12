#!/bin/bash
# Run ONE Benchmark Heaven UX-workstream iteration with a given engine and role.
#   iterate.sh <engine> <role>
#   engine: claude-opus | claude-fable | codex-astra | opencode-kimi | opencode-nex
#   role:   work | review | design
set -uo pipefail
ENGINE="${1:?engine}"; ROLE="${2:-work}"
REPO=/opt/model-market-comparison
WS=$REPO/ops/ux-2026-09-12
STATE=/opt/benchmarkheaven/state/ux
LOGS=/opt/benchmarkheaven/logs/ux
mkdir -p "$STATE" "$LOGS" /opt/benchmarkheaven/state/ux-evidence
TS=$(date -u +%Y%m%dT%H%M%SZ)
LOG="$LOGS/$TS-$ROLE-$ENGINE.log"

for f in "$HOME/.config/dev-secrets.env" /root/.config/dev-secrets.env; do [ -r "$f" ] && { set -a; . "$f"; set +a; break; }; done
[ -f /etc/profile.d/telegram.sh ] && . /etc/profile.d/telegram.sh
export ARTIFICIAL_ANALYSIS_API_KEY="${ARTIFICIAL_ANALYSIS_API_KEY:-${ARTIF_ANALYSIS_API_KEY:-}}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-${OPEN_ROUTER_API_KEY:-}}"
export PATH="$HOME/.local/bin:$HOME/.opencode/bin:$HOME/.npm-global/bin:/usr/local/bin:/usr/bin:/bin"
# Billing guards: subscriptions only. Both keys would silently switch a CLI to API billing.
unset OPENAI_API_KEY OPENAI_BASE_URL ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN

cd "$REPO" || exit 1
git pull --rebase --autostash -q origin main >> "$LOG" 2>&1 || echo "warn: pull failed" >> "$LOG"

ROLE_TEXT=""
case "$ROLE" in
  work) ROLE_TEXT="You are a WORK iteration. Follow section 3 of the brief: seed or read PROGRESS.md, pick the highest-value open items, implement, verify live, record evidence, commit, push, exit." ;;
  review) ROLE_TEXT="You are a REVIEW GATE — quality assurance of our own product before users see it. Review everything changed since the last REVIEW-*.md (git log), against 00-REQUIREMENTS-VERBATIM.md and PROGRESS.md. Re-verify every 'implemented'/'verified' claim yourself on the live site (desktop + mobile, light + dark) and in the code/tests. You may set 'verified' only on items you did not implement. Flip anything unproven back to 'open' with a one-line reason. Fix small defects directly; list larger ones as open items. Write ops/ux-2026-09-12/REVIEW-$TS.md, commit, push. If — and only if — every item is verified live and X6's line-by-line audit passes, append the line ALL-ACCEPTED to PROGRESS.md." ;;
  design) ROLE_TEXT="You are the DESIGN AUTHORITY (Fable 5.1). Florian's bar: minimalistic and simple, very expressive, not overloaded, key messages first, graphical with many charts. Take fresh screenshots of https://benchmarkheaven.com (Simple, Advanced, wizard, Benchmaxxing, a model page; desktop 1440px and mobile 390px; light and dark). Judge them. Write concrete, implementable directives into ops/ux-2026-09-12/DESIGN-DIRECTIVES.md (replace directives that are done, keep a short 'done' log), and pick the hero claim (R3.1) if not yet decided. Delegate implementation — do not build large UI changes yourself; small, surgical fixes are fine. Commit, push, exit." ;;
esac

PROMPT="You are part of the autonomous Benchmark Heaven workstream on the Sandy server (user flori, repo $REPO). Florian's laptop is off; nobody will answer questions — decide carefully, document decisions, keep going.

Read first, in this order:
  ops/ux-2026-09-12/00-REQUIREMENTS-VERBATIM.md   (authoritative, verbatim — it wins every conflict)
  ops/ux-2026-09-12/01-BRIEF.md                   (checklist R1.1…X7, engine rules, ground rules)
  ops/ux-2026-09-12/PROGRESS.md                   (ledger; create it from the brief + /opt/benchmarkheaven/state/USER-UX-CORRECTION-ACCEPTANCE.md if missing)
  ops/ux-2026-09-12/DESIGN-DIRECTIVES.md and the newest ops/ux-2026-09-12/REVIEW-*.md (if present)

Your engine: $ENGINE. $ROLE_TEXT

Delegation: bulk and mechanical work goes to free models via
  bash ops/ux-2026-09-12/bin/delegate.sh --help
(OpenCode with nex-agi/nex-n2.5-pro:free via OpenRouter, or Kimi K3 via Chutes). Verify their output; never let an unverified number ship.

Hard rules: keep main green (build-dataset, npm test, tsc) before pushing; no invented data; respect robots.txt/rate limits; never use API-key billing for codex or claude; do not disturb other services on this server; keep the iteration under ~3 hours and exit cleanly. Evidence goes to /opt/benchmarkheaven/state/ux-evidence/."

echo "=== $TS $ROLE $ENGINE start ===" >> "$LOG"
echo "$ENGINE $ROLE $TS $$" > "$STATE/running"

run_with_codex_cap() {
  "$@" >> "$LOG" 2>&1 &
  local pid=$!
  while kill -0 "$pid" 2>/dev/null; do
    sleep 300
    local w
    w=$(python3 "$HOME/.claude/skills/agent-limits/limits.py" --json 2>/dev/null | python3 -c 'import json,sys; print((json.load(sys.stdin).get("codex") or {}).get("week_percent") or 0)' 2>/dev/null || echo 0)
    if python3 -c "import sys; sys.exit(0 if float(sys.argv[1])>=80 else 1)" "$w"; then
      echo "=== codex weekly window at ${w}% >= 80% — stopping run to keep the 20% reserve ===" >> "$LOG"
      pkill -TERM -P "$pid" 2>/dev/null; kill -TERM "$pid" 2>/dev/null
      echo "$(( $(date +%s) + 21600 ))" > "$STATE/codex-cooldown-until"
      break
    fi
  done
  wait "$pid"; return $?
}

rc=0
case "$ENGINE" in
  claude-opus|claude-fable)
    MODEL=claude-opus-5; [ "$ENGINE" = claude-fable ] && MODEL=claude-fable-5-1
    timeout 10800 claude -p --model "$MODEL" --permission-mode bypassPermissions "$PROMPT" >> "$LOG" 2>&1; rc=$?
    if grep -qiE "hit your (session|weekly)? ?limit|usage limit reached|limit will reset" "$LOG"; then
      echo "$(( $(date +%s) + 3600 ))" > "$STATE/claude-cooldown-until"
      echo "=== claude limit detected — cooling down Claude for 1h ===" >> "$LOG"
    fi ;;
  codex-astra)
    case "$(codex login status 2>&1 | head -1)" in *ChatGPT*) ;; *) echo "ABORT: codex not on ChatGPT subscription" >> "$LOG"; rm -f "$STATE/running"; exit 1;; esac
    EFFORT=high; [ "$ROLE" = review ] && EFFORT=xhigh
    run_with_codex_cap timeout 10800 codex exec --dangerously-bypass-approvals-and-sandbox \
      -m gpt-6-astra -c model_reasoning_effort="$EFFORT" -c tools.web_search=true -C "$REPO" "$PROMPT"; rc=$? ;;
  opencode-kimi)
    timeout 10800 opencode run -m chutes/moonshotai/Kimi-K3-TEE "$PROMPT" >> "$LOG" 2>&1; rc=$?
    if [ $rc -ne 0 ] && [ "$(stat -c%s "$LOG")" -lt 20000 ]; then echo "$(( $(date +%s) + 1800 ))" > "$STATE/kimi-cooldown-until"; fi ;;
  opencode-nex)
    timeout 10800 opencode run -m "${BH_NEX_MODEL:-openrouter/nex-agi/nex-n2.5-pro:free}" "$PROMPT" >> "$LOG" 2>&1; rc=$? ;;
esac

echo "=== $(date -u +%FT%TZ) $ROLE $ENGINE end rc=$rc ===" >> "$LOG"
echo "$TS $ROLE $ENGINE rc=$rc" >> "$STATE/history.log"
rm -f "$STATE/running"
find "$LOGS" -name '*.log' -size +40M -exec truncate -s 20M {} \;
find "$LOGS" -name '*.log' -mtime +14 -delete
exit $rc
