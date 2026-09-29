#!/usr/bin/env bash
# Select a current engine for one bounded UX unit using the shared measured quota picker.
set -Eeuo pipefail
MODE=$1
AVOID=$2
STATE=$(printenv BH_UX_STATE 2>/dev/null || true)
if [ -z "$STATE" ]; then STATE=$HOME/.local/state/benchmarkheaven/ux-workstream; fi
HISTORY=$STATE/history.log
QP=$HOME/bin/quota-pace

case "$MODE" in
  work) KIND=work ;;
  review|design) KIND=judgement ;;
  *) echo "pick-engine: expected work, review, or design" >&2; exit 64 ;;
esac

engine_family() {
  case "$1" in
    claude|claude-*) echo claude ;;
    codex|codex-*|gpt-6-*) echo codex ;;
    devin|devin-*) echo devin ;;
    *) echo "" ;;
  esac
}

claude_recent=0
if [ -r "$HISTORY" ]; then
  claude_recent=$(python3 - "$HISTORY" <<'PY_INNER'
import datetime, sys
cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=24)
used = set()
for line in open(sys.argv[1], errors="replace"):
    fields = line.split()
    if len(fields) < 3:
        continue
    try:
        stamp = datetime.datetime.strptime(fields[0], "%Y%m%dT%H%M%SZ").replace(tzinfo=datetime.timezone.utc)
    except ValueError:
        continue
    engine = next((field.split("=", 1)[1] for field in fields[3:] if field.startswith("actual=")), fields[2])
    engine = engine.split(":", 1)[0]
    if stamp >= cutoff and fields[1] in ("work", "review", "design") and (engine.startswith("claude") or engine.startswith("devin-opus")):
        used.add(fields[0])
print(len(used))
PY_INNER
)
fi

avoid_family=$(engine_family "$AVOID")
picked=$(QUOTA_PACE_CALLER="bh-ux:$MODE" "$QP" pick --kind "$KIND")

# Reviews must use a different engine family from the implementation.
if [ "$MODE" = review ] && [ -n "$avoid_family" ] && [ "$(engine_family "$picked")" = "$avoid_family" ]; then
  picked=none
fi

# Cap Claude-backed UX units. Devin Opus is included for design/review; Devin Sonnet work is not.
if [ "$claude_recent" -ge 1 ]; then
  case "$MODE:$picked" in
    work:claude|design:claude|review:claude|design:devin|review:devin)
      if [ "$MODE" = work ]; then picked=free; else picked=none; fi
      ;;
  esac
fi

# quota-pace status can impose a stricter pace line than the paid-engine hard-stop admission.
if [ "$MODE" = work ] && [[ "$picked" =~ ^(claude|codex|devin)$ ]]; then
  pace_status=$("$QP" status 2>&1 || true)
  pace_line=$(printf '%s\n' "$pace_status" | awk -v engine="$picked" 'tolower($1) == engine { print; exit }')
  case "$pace_line" in
    *"OVER PACE"*|'') picked=free ;;
  esac
fi
if [[ "$picked" =~ ^(claude|codex|devin)$ ]] && ! QUOTA_PACE_CALLER="bh-ux:$MODE-allow" "$QP" allow "$picked" --kind "$KIND" >/dev/null 2>&1; then
  if [ "$MODE" = work ]; then picked=free; else picked=none; fi
fi
case "$MODE:$picked" in
  work:claude) echo claude-opus-medium ;;
  work:codex) echo codex-luna-xhigh ;;
  work:devin) echo devin-sonnet-high ;;
  work:free) echo opencode-free ;;
  review:claude|design:claude) echo claude-opus-medium ;;
  review:codex|design:codex) echo codex-luna-xhigh ;;
  review:devin|design:devin) echo devin-opus-medium ;;
  review:free|design:free) echo none ;;
  *) echo none ;;
esac
