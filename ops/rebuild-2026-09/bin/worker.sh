#!/bin/bash
# Delegate bulk / mechanical work to a cheap or free model.
#
#   worker.sh "<task>"                 one-shot completion on the cheapest viable model
#   worker.sh --critic "<task>"        same, but forced onto a different model family than
#                                      the last producer (gauntlet rule: critic != author)
#   worker.sh --agent "<task>"         agentic run that may edit files (opencode, Kimi K3)
#   worker.sh --model <id> "<task>"    pin a specific OpenRouter model id
#   worker.sh --file <path> "<task>"   prepend a file's contents to the task
#   worker.sh --out <path> "<task>"    write the answer to a file instead of stdout
#   worker.sh --list                   show currently viable worker models
#
# Backends: OpenRouter (OPEN_ROUTER_API_KEY) and Chutes (CHUTES_API_KEY, free for us).
# Never uses a model below AA Intelligence Index 34 — see pick-worker-models.mjs.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
STATE="${BH_STATE:-/opt/benchmarkheaven/state}"
[ -w "$(dirname "$STATE")" ] 2>/dev/null || STATE="${TMPDIR:-/tmp}/benchmarkheaven-state"
mkdir -p "$STATE"
for f in "$HOME/.config/dev-secrets.env" /root/.config/dev-secrets.env; do
  [ -r "$f" ] && . "$f" && break
done
OR_KEY="${OPEN_ROUTER_API_KEY:-${OPENROUTER_API_KEY:-}}"

MODE=oneshot; MODEL=""; FILE=""; OUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --critic) MODE=critic; shift;;
    --agent)  MODE=agent; shift;;
    --model)  MODEL="$2"; shift 2;;
    --file)   FILE="$2"; shift 2;;
    --out)    OUT="$2"; shift 2;;
    --list)   node "$HERE/pick-worker-models.mjs"; exit 0;;
    --help|-h) sed -n '2,20p' "$0"; exit 0;;
    *) break;;
  esac
done
TASK="${1:-}"
[ -n "$TASK" ] || { echo "worker.sh: no task given (see --help)" >&2; exit 2; }
[ -n "$FILE" ] && TASK="$(printf '%s\n\n--- file: %s ---\n%s\n' "$TASK" "$FILE" "$(cat "$FILE")")"

pick() {  # $1 = model id to avoid (gauntlet rule: critic != author)
  node "$HERE/pick-worker-models.mjs" --json --limit 12 2>/dev/null \
    | python3 -c '
import json, sys
avoid = (sys.argv[1] if len(sys.argv) > 1 else "").split("/")[-1].split(":")[0]
b = json.load(sys.stdin)
# Free-and-competent first, then cheap-and-competent. Never the unscored free models:
# those must be smoke-tested by a human-supervised run before they touch real data.
for row in b["free_verified"] + b["cheap_verified"]:
    if avoid and avoid in row["id"]: continue
    print(row["id"]); break
' "${1:-}"
}

if [ "$MODE" = agent ]; then
  OC="$(command -v opencode || echo "$HOME/.opencode/bin/opencode")"
  if [ ! -x "$OC" ]; then echo "worker.sh: opencode not installed (phase 1 installs it)" >&2; exit 3; fi
  cd "$REPO" && "$OC" run -m chutes/moonshotai/Kimi-K3-TEE "$TASK"
  exit $?
fi

LAST_FILE="$STATE/last-worker-model"
if [ -z "$MODEL" ]; then
  if [ "$MODE" = critic ]; then MODEL="$(pick "$(cat "$LAST_FILE" 2>/dev/null)")"; else MODEL="$(pick)"; fi
fi
[ -n "$MODEL" ] || { echo "worker.sh: no viable worker model found" >&2; exit 4; }
[ "$MODE" = critic ] || echo "$MODEL" > "$LAST_FILE"

SYS="You are a careful data-and-code assistant working on Benchmark Heaven, a public LLM
comparison site owned by the operator who is asking you. Be precise and literal. Never
invent a number, a URL or a benchmark result: if you cannot verify something from the
material you were given or from a primary source, say so explicitly instead of guessing.
Prefer structured output. Keep prose short."
[ "$MODE" = critic ] && SYS="$SYS
You are reviewing work that was produced by a different model, as a quality check of our
own product before it reaches users. Verify each claim against primary sources. Report
findings as: errors_found (count), then one line per finding with the evidence (a URL or a
command output). If you find nothing wrong, say so plainly — do not manufacture findings."

echo "worker.sh: model=$MODEL mode=$MODE" >&2
RESP=$(python3 - "$MODEL" "$SYS" "$TASK" << 'PY'
import json, os, sys, urllib.request, urllib.error
model, system, task = sys.argv[1], sys.argv[2], sys.argv[3]
key = os.environ.get("OPEN_ROUTER_API_KEY") or os.environ.get("OPENROUTER_API_KEY") or ""
body = json.dumps({"model": model, "messages": [
    {"role": "system", "content": system}, {"role": "user", "content": task}]}).encode()
req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=body, headers={
    "Authorization": f"Bearer {key}", "Content-Type": "application/json",
    "HTTP-Referer": "https://benchmarkheaven.com", "X-Title": "Benchmark Heaven data refresh"})
try:
    with urllib.request.urlopen(req, timeout=600) as r:
        print(json.load(r)["choices"][0]["message"]["content"])
except urllib.error.HTTPError as e:
    print(f"WORKER_ERROR {e.code}: {e.read().decode()[:400]}", file=sys.stderr); sys.exit(5)
PY
) || exit $?
if [ -n "$OUT" ]; then printf '%s\n' "$RESP" > "$OUT"; echo "worker.sh: wrote $OUT" >&2; else printf '%s\n' "$RESP"; fi
