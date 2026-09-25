#!/bin/bash
# Choose the engine for the next Benchmark Heaven iteration from MEASURED limits.
#   pick-engine.sh work     -> claude-opus | codex-luna | opencode-kimi | opencode-nex
#   pick-engine.sh review <implementer-engine>
#   pick-engine.sh design   -> claude-fable | none
# Rules: Florian 2026-09-12; weekly pacing since 19 Sep 2026 (Florian: "so it lasts until the end of the 7-day
# window"): the fixed Claude caps (70 %, temporary 85 %) are replaced by ~/bin/quota-pace, the shared helper every
# engine picker calls. A subscription may take new WORK while its weekly use is below the pace line (elapsed share of
# the week + 7 points); above it only judgement units (review, design gate) may use it; at the hard stop (Claude 90 %,
# Codex 75 %, Claude 5-hour window 90 %) nothing new starts. Order for work: Opus 5, GPT-5.6 Luna, then the free
# chain (Union Alpha / best healthy free model via llm-health), so work never stops on a quota.
set -uo pipefail
MODE="${1:-work}"; AVOID="${2:-}"
STATE=/opt/benchmarkheaven/state/ux
mkdir -p "$STATE"
QP="$HOME/bin/quota-pace"
export QUOTA_PACE_CALLER="bh-pick-engine:$MODE"

J="${QUOTA_PACE_LIMITS_JSON:-$(python3 "$HOME/.claude/skills/agent-limits/limits.py" --json 2>/dev/null || echo "{}")}"  # override: tests only
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
kind=work; [ "$MODE" = review ] || [ "$MODE" = design ] && kind=judgement
claude_ok=1
[ -f "$cool" ] && [ "$now" -lt "$(cat "$cool")" ] && claude_ok=0
[ "$C_ERR" = ok ] || claude_ok=0
"$QP" allow claude --kind "$kind" >/dev/null 2>&1 || claude_ok=0

codex_ok=1
[ "$X_AUTH" = chatgpt ] || codex_ok=0
"$QP" allow codex --kind "$kind" >/dev/null 2>&1 || codex_ok=0

# Free workers (15 Sep 2026): ~/bin/llm-health ranks Chutes Kimi K3, Chutes Qwen3.8 27B, OpenRouter GLM-5.3-Flash,
# OpenRouter DeepSeek-V4.1-Flash and OpenRouter Nex free (Chutes only below 75% utilization). The engine names stay:
# opencode-kimi runs the best healthy free model, opencode-nex the second best (iterate.sh).
# 16 Sep 2026: Union Alpha (premium-level, free) on top — opencode-kimi uses it while any route is healthy.
kimi_ok=1
"$HOME/bin/llm-health" best --premium --rank 0 >/dev/null 2>&1; fw_rc=$?
if [ "$fw_rc" = 2 ]; then kimi_ok=0   # health file fresh and no free model healthy
elif [ ! -s "$HOME/.llm-health.json" ] && [ -f "$STATE/kimi-cooldown-until" ] && [ "$now" -lt "$(cat "$STATE/kimi-cooldown-until")" ]; then kimi_ok=0; fi

echo "limits: claude session=$C_SESS week=$C_WEEK ($C_ERR) | codex week=$X_WEEK auth=$X_AUTH | pace($kind): $("$QP" status 2>/dev/null | cut -d' ' -f1-6 | tr '\n' ' ')| claude_ok=$claude_ok codex_ok=$codex_ok kimi_ok=$kimi_ok" >&2

case "$MODE" in
  design)
    [ "$claude_ok" = 1 ] && echo claude-fable || echo none ;;
  review)
    for e in codex-luna claude-opus opencode-kimi opencode-nex; do
      [ "$e" = "$AVOID" ] && continue
      case "$e" in
        codex-luna)  [ "$codex_ok" = 1 ] && { echo "$e"; exit 0; } ;;
        claude-opus)  [ "$claude_ok" = 1 ] && { echo "$e"; exit 0; } ;;
        opencode-kimi) [ "$kimi_ok" = 1 ] && { echo "$e"; exit 0; } ;;
        opencode-nex) echo "$e"; exit 0 ;;
      esac
    done ;;
  *)
    # Florian 25.09.2026, binding (~/AGENTS.md §6 "Limit awareness", same text in
    # ~/.hermes/model-economy-policy.md, announced on agent-board #1822 at 19:53 UTC):
    # "Claude Code with Opus 5.5 is our best model. While Claude is under its pace line, use it
    # for real work too, not only judgement: unused weekly Claude allowance expires at the reset."
    # This supersedes the 16:08 UTC commit b92b3126 ("Codex GPT-6 Sol xhigh first"), which named
    # no source document. The `quota-pace allow` gates above already stop each engine at its line.
    if   [ "$claude_ok" = 1 ]; then echo claude-opus
    elif [ "$codex_ok" = 1 ];  then echo codex-luna
    elif [ "$kimi_ok" = 1 ];   then echo opencode-kimi
    else echo opencode-nex; fi ;;
esac
