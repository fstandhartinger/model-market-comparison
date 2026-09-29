#!/usr/bin/env bash
# Run a small mechanical subtask through the health-selected free OpenCode route.
set -Eeuo pipefail

OUT=
DIR=$(git rev-parse --show-toplevel)
while [ "$#" -gt 0 ]; do
  case "$1" in
    --out)
      [ "$#" -ge 2 ] || { echo "delegate.sh: --out needs a path" >&2; exit 64; }
      OUT=$2
      shift 2
      ;;
    --dir)
      [ "$#" -ge 2 ] || { echo "delegate.sh: --dir needs a path" >&2; exit 64; }
      DIR=$2
      shift 2
      ;;
    --help|-h)
      echo 'delegate.sh [--out file] [--dir worktree] "mechanical task"'
      exit 0
      ;;
    *) break ;;
  esac
done
TASK=${1:-}
[ -n "$TASK" ] || { echo "delegate.sh: no task supplied" >&2; exit 64; }
TASK+=$'\n\nTreat your answer as a draft. Make mechanical edits only; do not make product, benchmark, security, or publication decisions.'
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
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-${OPEN_ROUTER_API_KEY:-}}
export OPENROUTER_API_KEY
export PATH="$HOME/.local/bin:$HOME/.opencode/bin:$HOME/.npm-global/bin:/usr/local/bin:/usr/bin:/bin"
unset OPENAI_API_KEY OPENAI_BASE_URL ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN

MODEL=$("$HOME/bin/opencode-best" 2>/dev/null || true)
[ -n "$MODEL" ] || { echo "delegate.sh: no healthy free route" >&2; exit 75; }
ALT_MODEL=$("$HOME/bin/opencode-best" --fast 2>/dev/null || true)

TMP=$(mktemp "${TMPDIR:-/tmp}/bh-ux-delegate.XXXXXX")
ALT=$(mktemp "${TMPDIR:-/tmp}/bh-ux-delegate-alt.XXXXXX")
trap 'rm -f "$TMP" "$ALT"' EXIT
run() { (cd "$DIR" && timeout 5400 opencode run -m "$1" "$TASK") > "$2" 2>&1; }
# Inspect OpenCode's own error line only; task output can contain quoted provider errors or HTTP statuses.
failed() { [ ! -s "$1" ] || grep -qE $'^[[:space:]]*(\x1b\[[0-9;]*m)*Error:' "$1"; }
echo "delegate.sh: model=$MODEL dir=$DIR" >&2
run "$MODEL" "$TMP" || true
if failed "$TMP"; then
  if [ -n "$ALT_MODEL" ] && [ "$ALT_MODEL" != "$MODEL" ]; then
    echo "delegate.sh: $MODEL failed, trying the separately health-selected fast route $ALT_MODEL" >&2
    run "$ALT_MODEL" "$ALT" || true
    # A failing fallback never destroys the primary's answer; it is appended as diagnosis.
    if failed "$ALT"; then cat "$ALT" >> "$TMP"; else cp "$ALT" "$TMP"; fi
  fi
fi
if [ -n "$OUT" ]; then cp "$TMP" "$OUT"; fi
cat "$TMP"
