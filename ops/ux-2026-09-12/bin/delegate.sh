#!/usr/bin/env bash
# Run only a small mechanical subtask through the health-selected free OpenCode route.
set -Eeuo pipefail
OUT=
DIR=$(git rev-parse --show-toplevel)
while [ "$#" -gt 0 ]; do
  case "$1" in
    --out) OUT=$2; shift 2 ;;
    --dir) DIR=$2; shift 2 ;;
    --help|-h)
      echo 'delegate.sh [--out file] [--dir worktree] "mechanical task"'
      exit 0
      ;;
    *) break ;;
  esac
done
TASK=$1
[ -n "$TASK" ] || { echo "delegate.sh: no task supplied" >&2; exit 64; }
[ -d "$DIR" ] || { echo "delegate.sh: directory not found: $DIR" >&2; exit 66; }
DIR=$(realpath "$DIR")
case "$DIR/" in
  /opt/*) echo "delegate.sh: working directory must stay outside /opt" >&2; exit 70 ;;
esac
if [ -n "$OUT" ]; then OUT=$(realpath -m "$OUT"); fi
case "$OUT" in
  /opt/*) echo "delegate.sh: output must stay outside /opt" >&2; exit 70 ;;
esac

if [ -r "$HOME/.config/dev-secrets.env" ]; then
  set -a
  . "$HOME/.config/dev-secrets.env"
  set +a
fi
OPENROUTER_API_KEY=$(printenv OPENROUTER_API_KEY 2>/dev/null || true)
if [ -z "$OPENROUTER_API_KEY" ]; then
  OPENROUTER_API_KEY=$(printenv OPEN_ROUTER_API_KEY 2>/dev/null || true)
fi
export OPENROUTER_API_KEY
unset OPENAI_API_KEY OPENAI_BASE_URL ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN
MODEL=$("$HOME/bin/opencode-best" 2>/dev/null || true)
[ -n "$MODEL" ] || { echo "delegate.sh: no healthy free route" >&2; exit 75; }

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
set +e
(cd "$DIR" && timeout 5400 opencode run -m "$MODEL" "$TASK
Treat your answer as a draft. Do mechanical work only; do not make product, benchmark, security, or publication decisions.") > "$TMP" 2>&1
rc=$?
set -e
if [ -n "$OUT" ]; then cp "$TMP" "$OUT"; fi
cat "$TMP"
exit "$rc"\n