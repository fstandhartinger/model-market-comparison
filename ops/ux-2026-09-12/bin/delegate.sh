#!/bin/bash
# Hand bulk / mechanical work to a free model, so the expensive engines only decide,
# integrate and verify.
#
#   delegate.sh "<task>"                 OpenCode + nex-agi/nex-n2.5-pro:free (OpenRouter)
#   delegate.sh --kimi "<task>"          OpenCode + Kimi K3 via Chutes (free for us)
#   delegate.sh --out <file> "<task>"    also save the final answer to a file
#   delegate.sh --dir <path> "<task>"    run in another working directory (default: repo)
#
# OpenCode can read and edit files in the working directory. Treat everything a free model
# produces as a DRAFT: review the diff, re-check any number against its primary source.
# If the nex free model is unavailable, this falls back to Kimi K3 automatically, and vice
# versa, so a delegation never silently does nothing.
set -uo pipefail
REPO=/opt/model-market-comparison
MODEL_NEX="${BH_NEX_MODEL:-openrouter/nex-agi/nex-n2.5-pro:free}"
MODEL_KIMI="chutes/moonshotai/Kimi-K3-TEE"
PRIMARY="$MODEL_NEX"; SECONDARY="$MODEL_KIMI"; OUT=""; DIR="$REPO"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --kimi) PRIMARY="$MODEL_KIMI"; SECONDARY="$MODEL_NEX"; shift;;
    --out)  OUT="$2"; shift 2;;
    --dir)  DIR="$2"; shift 2;;
    --help|-h) sed -n '2,16p' "$0"; exit 0;;
    *) break;;
  esac
done
TASK="${1:-}"; [ -n "$TASK" ] || { echo "delegate.sh: no task (see --help)" >&2; exit 2; }

for f in "$HOME/.config/dev-secrets.env" /root/.config/dev-secrets.env; do [ -r "$f" ] && { set -a; . "$f"; set +a; break; }; done
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-${OPEN_ROUTER_API_KEY:-}}"
export PATH="$HOME/.local/bin:$HOME/.opencode/bin:$HOME/.npm-global/bin:/usr/local/bin:/usr/bin:/bin"
unset OPENAI_API_KEY ANTHROPIC_API_KEY

TMP=$(mktemp)
run() { (cd "$DIR" && timeout 5400 opencode run -m "$1" "$TASK") > "$TMP" 2>&1; }
echo "delegate.sh: model=$PRIMARY dir=$DIR" >&2
if ! run "$PRIMARY" || [ ! -s "$TMP" ] || grep -qiE "model not found|ProviderModelNotFound|rate.?limit|No endpoints found|401|402|429" "$TMP"; then
  echo "delegate.sh: $PRIMARY failed, falling back to $SECONDARY" >&2
  run "$SECONDARY"
fi
[ -n "$OUT" ] && cp "$TMP" "$OUT"
cat "$TMP"; rm -f "$TMP"
