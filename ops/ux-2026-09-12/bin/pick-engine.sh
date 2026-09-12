#!/bin/bash
# Choose the engine for the next Benchmark Heaven iteration from MEASURED limits.
#   pick-engine.sh work     -> claude-opus | codex-astra | opencode-kimi | opencode-nex
#   pick-engine.sh review <implementer-engine>
#   pick-engine.sh design   -> claude-fable | none
# Rule (Florian, 2026-09-12): Opus 5 while Claude has headroom; then Codex GPT-6 Astra while
# Codex has headroom (never above 80 % of the weekly window); then OpenCode Kimi K3 via
# Chutes; then OpenCode nex-n2.5-pro:free via OpenRouter. Work must never stop on a quota.
set -uo pipefail
MODE="${1:-work}"; AVOID="${2:-}"
STATE=/opt/benchmarkheaven/state/ux
mkdir -p "$STATE"
CLAUDE_MAX=80      # switch away from Claude when session or week reaches this
CODEX_START_MAX=75 # do not START a Codex run above this (a run consumes several %)

J="$(python3 "$HOME/.claude/skills/agent-limits/limits.py" --json 2>/dev/null || echo '{}')"
read -r C_SESS C_WEEK C_ERR X_WEEK X_AUTH < <(python3 -c '
import json,sys
d=json.loads(sys.argv[1] or "{}"); c=d.get("claude") or {}; x=d.get("codex") or {}
f=lambda v: "nan" if v is None else str(v)
print(f(c.get("session_percent")), f(c.get("week_percent")), "err" if c.get("error") else "ok",
      f(x.get("week_percent")), x.get("auth_mode") or "unknown")
' "$J")

# A hard "limit reached" in a recent Claude log blocks Claude until its cooldown expires.
cool="$STATE/claude-cooldown-until"
now=$(date +%s)
claude_ok=1
[ -f "$cool" ] && [ "$now" -lt "$(cat "$cool")" ] && claude_ok=0
python3 -c "import sys; s,w=float(sys.argv[1]),float(sys.argv[2]); sys.exit(0 if s==s and w==w and s<$CLAUDE_MAX and w<$CLAUDE_MAX else 1)" "$C_SESS" "$C_WEEK" || claude_ok=0
[ "$C_ERR" = ok ] || claude_ok=0

codex_ok=1
[ "$X_AUTH" = chatgpt ] || codex_ok=0
python3 -c "import sys; w=float(sys.argv[1]); sys.exit(0 if w==w and w<$CODEX_START_MAX else 1)" "$X_WEEK" || codex_ok=0

kimi_ok=1
if [ -f "$STATE/kimi-cooldown-until" ] && [ "$now" -lt "$(cat "$STATE/kimi-cooldown-until")" ]; then kimi_ok=0; fi

echo "limits: claude session=$C_SESS week=$C_WEEK ($C_ERR) | codex week=$X_WEEK auth=$X_AUTH | claude_ok=$claude_ok codex_ok=$codex_ok kimi_ok=$kimi_ok" >&2

case "$MODE" in
  design)
    [ "$claude_ok" = 1 ] && echo claude-fable || echo none ;;
  review)
    for e in codex-astra claude-opus opencode-kimi opencode-nex; do
      [ "$e" = "$AVOID" ] && continue
      case "$e" in
        codex-astra)  [ "$codex_ok" = 1 ] && { echo "$e"; exit 0; } ;;
        claude-opus)  [ "$claude_ok" = 1 ] && { echo "$e"; exit 0; } ;;
        opencode-kimi) [ "$kimi_ok" = 1 ] && { echo "$e"; exit 0; } ;;
        opencode-nex) echo "$e"; exit 0 ;;
      esac
    done ;;
  *)
    if   [ "$claude_ok" = 1 ]; then echo claude-opus
    elif [ "$codex_ok" = 1 ];  then echo codex-astra
    elif [ "$kimi_ok" = 1 ];   then echo opencode-kimi
    else echo opencode-nex; fi ;;
esac
