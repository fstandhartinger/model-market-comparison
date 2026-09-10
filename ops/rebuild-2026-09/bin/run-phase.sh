#!/bin/bash
# Run one phase of the Benchmark Heaven rebuild with Codex / gpt-6-astra at xhigh effort.
# Usage: run-phase.sh <NN>      (NN = 01..09)
set -uo pipefail
REPO=/opt/model-market-comparison
BH=/opt/benchmarkheaven
STATE=$BH/state
LOGS=$BH/logs
mkdir -p "$STATE" "$LOGS"
NN="${1:?usage: run-phase.sh <NN>}"
PHASE_FILE=$(ls "$REPO"/ops/rebuild-2026-09/phases/phase-"$NN"-*.md 2>/dev/null | head -1)
[ -f "$PHASE_FILE" ] || { echo "no phase file for $NN"; exit 2; }

for f in "$HOME/.config/dev-secrets.env" /root/.config/dev-secrets.env; do
  [ -r "$f" ] && . "$f" && break
done
[ -f /etc/profile.d/telegram.sh ] && . /etc/profile.d/telegram.sh
export ARTIFICIAL_ANALYSIS_API_KEY="${ARTIFICIAL_ANALYSIS_API_KEY:-${ARTIF_ANALYSIS_API_KEY:-}}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-${OPEN_ROUTER_API_KEY:-}}"
export OPEN_ROUTER_API_KEY CHUTES_API_KEY TG_BOT_TOKEN TG_CHAT_ID ELEVENLABS_API_KEY
export PATH="$HOME/.local/bin:$HOME/.opencode/bin:/usr/local/bin:/usr/bin:/bin"

# Codex MUST run on Florian's ChatGPT Pro subscription, never on API-key billing.
# A stray OPENAI_API_KEY in the environment is enough to flip codex to API mode, and the
# dev-secrets file sets one, so it is removed here before codex is ever invoked.
unset OPENAI_API_KEY OPENAI_BASE_URL
AUTH="$(codex login status 2>&1 | head -1)"
case "$AUTH" in
  *ChatGPT*) echo "auth ok: $AUTH" ;;
  *) echo "ABORT: codex is not on the ChatGPT subscription ($AUTH)"
     echo "BLOCKED: codex auth is '$AUTH', expected ChatGPT subscription" > "$STATE/phase-$NN.status"
     bash "$(dirname "${BASH_SOURCE[0]}")/notify.sh" "⛔ Benchmark Heaven Phase $NN nicht gestartet: Codex läuft nicht über die ChatGPT-Subscription ($AUTH). Kein API-Key-Verbrauch."
     exit 1 ;;
esac

LOG="$LOGS/phase-$NN-$(date -u +%Y%m%dT%H%M%SZ).log"
echo "$NN" > "$STATE/current-phase"
echo "RUNNING $(date -u +%FT%TZ)" > "$STATE/phase-$NN.status"

PROMPT=$(cat <<PREAMBLE
You are the owner and quality gate of the "Benchmark Heaven" rebuild, running as Codex
with gpt-6-astra at xhigh reasoning effort on the Sandy server, in $REPO.

Read these first (they are short and they save you tokens):
  ops/rebuild-2026-09/00-MASTER-BRIEF.md   — the whole commission, incl. the verbatim
                                             original request from Florian in section 11
  ops/rebuild-2026-09/10-RECON-FINDINGS.md — solved research, exact field names, gotchas

Delegate bulk and mechanical work to cheap/free models via
  bash ops/rebuild-2026-09/bin/worker.sh --help
You review and are accountable for everything that lands in the repo. Never invent a
number or a source. Keep main green: build, tests and typecheck must pass before you push.

This is phase $NN. Its instructions follow.

$(cat "$PHASE_FILE")
PREAMBLE
)

{
  echo "=== phase $NN start $(date -u +%FT%TZ) ==="
  timeout 21600 codex exec --dangerously-bypass-approvals-and-sandbox \
    -m gpt-6-astra -c model_reasoning_effort="xhigh" -c tools.web_search=true \
    -C "$REPO" "$PROMPT"
  rc=$?
  echo "=== phase $NN end rc=$rc $(date -u +%FT%TZ) ==="
  if [ $rc -ne 0 ] && ! grep -q '^DONE' "$STATE/phase-$NN.status" 2>/dev/null; then
    echo "CRASHED rc=$rc $(date -u +%FT%TZ)" > "$STATE/phase-$NN.status"
  fi
} >> "$LOG" 2>&1

# Keep logs bounded — the disk on Sandy is at ~90%.
find "$LOGS" -name 'phase-*.log' -size +50M -exec truncate -s 20M {} \;
tail -c 2000 "$LOG"
