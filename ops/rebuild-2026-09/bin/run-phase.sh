#!/bin/bash
# Run one phase of the Benchmark Heaven rebuild with a high-effort owner model.
# Usage: run-phase.sh <NN>      (NN = 01..09)
# Model selection (Florian 2026-09-11, updated): default owner runs on OpenCode
# with deepseek/deepseek-v4.1-flash via OpenRouter (very cheap, qualified
# AA ≥ 34, allowed by Florian). Codex is at 100% of its weekly quota until the
# next confirmed reset — no Codex calls by default. If Codex is used again,
# only GPT 5.6 Terra or Luna, never Astra/Sol:
#   BH_RUNNER=codex bash run-phase.sh <NN>
# gpt-5.3-codex-spark carries its own quota and is allowed during the episode;
# the codex-reset watcher restores gpt-6-astra at the confirmed reset.
# BH_OPENCODE_MODEL overrides the default opencode model.
set -uo pipefail
REPO=/opt/model-market-comparison
BH=/opt/benchmarkheaven
STATE=$BH/state
LOGS=$BH/logs
mkdir -p "$STATE" "$LOGS"
NN="${1:?usage: run-phase.sh <NN>}"
PHASE_FILE=$(ls "$REPO"/ops/rebuild-2026-09/phases/phase-"$NN"-*.md 2>/dev/null | head -1)
[ -f "$PHASE_FILE" ] || { echo "no phase file for $NN"; exit 2; }

set -a
for f in "$HOME/.config/dev-secrets.env" /root/.config/dev-secrets.env; do
  [ -r "$f" ] && . "$f" && break
done
set +a
[ -f /etc/profile.d/telegram.sh ] && . /etc/profile.d/telegram.sh
export ARTIFICIAL_ANALYSIS_API_KEY="${ARTIFICIAL_ANALYSIS_API_KEY:-${ARTIF_ANALYSIS_API_KEY:-}}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-${OPEN_ROUTER_API_KEY:-}}"
export OPEN_ROUTER_API_KEY CHUTES_API_KEY TG_BOT_TOKEN TG_CHAT_ID ELEVENLABS_API_KEY
export PATH="$HOME/.local/bin:$HOME/.opencode/bin:/usr/local/bin:/usr/bin:/bin"

# Codex MUST run on Florian's ChatGPT Pro subscription, never on API-key billing.
# A stray OPENAI_API_KEY in the environment is enough to flip codex to API mode, and the
# dev-secrets file sets one, so it is removed here before codex is ever invoked.
unset OPENAI_API_KEY OPENAI_BASE_URL
# Until the confirmed Codex reset: only Terra/Luna on Codex; Spark has separate quota.
# BH_RUNNER default is OpenCode on deepseek/deepseek-v4.1-flash via OpenRouter
# (Florian 2026-09-11 ~22:45: Kimi K3 progress felt too slow; DeepSeek V4.1 Flash
#  via OpenRouter is qualified AA ≥ 34 and very cheap). No Astra.
RUNNER="${BH_RUNNER:-opencode}"
OPENCODE_MODEL="${BH_OPENCODE_MODEL:-openrouter/deepseek/deepseek-v4.1-flash}"
AUTHORIZED_CODEX_MODELS="gpt-5.6-terra gpt-5.6-luna gpt-5.3-codex-spark"
AUTH="$(codex login status 2>&1 | head -1)"
case "$AUTH" in
  *ChatGPT*) echo "auth ok: $AUTH" ;;
  *) AUTH_WARNING="codex auth is '$AUTH', expected ChatGPT subscription" ;;
esac

LOG="$LOGS/phase-$NN-$(date -u +%Y%m%dT%H%M%SZ).log"
echo "$NN" > "$STATE/current-phase"
echo "RUNNING $(date -u +%FT%TZ)" > "$STATE/phase-$NN.status"

PROMPT=$(cat <<PREAMBLE
You are the owner and quality gate of the "Benchmark Heaven" rebuild, running on the
Sandy server in $REPO. Check the "runner=" line at the top of your log for the model
you are running as (currently OpenCode with deepseek/deepseek-v4.1-flash via
OpenRouter while Codex is out of quota).

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

When this phase is invoked through run-phase.sh, the runner script itself owns the
status-file lifecycle for phase $NN (RUNNING at start, DONE/CRASHED on exit). You do
NOT need direct write access to /opt/benchmarkheaven/state — finish with the repo green
(commits + tests + typecheck + report), and the runner will advance or retry on its own.
PREAMBLE
)

# Laufzeitmarke: dient der Erkennung, ob der Agent in DIESEM Lauf Belege
# (Bericht/Evidence) erzeugt hat, auch wenn er den Status nicht gesetzt hat.
T0=$(date +%s)

{
  echo "=== phase $NN start $(date -u +%FT%TZ) ==="
  CODEX_MODEL="${BH_CODEX_MODEL:-gpt-5.6-terra}"
  case " $AUTHORIZED_CODEX_MODELS " in
    *" $CODEX_MODEL "*) ;;
    *) echo "ABORT: CODEX model '$CODEX_MODEL' is not in Florian's allowed set ($AUTHORIZED_CODEX_MODELS)"
       echo "BLOCKED: unauthorized codex model '$CODEX_MODEL'" > "$STATE/phase-$NN.status"
       exit 1 ;;
  esac
  case "$RUNNER:AUTH_WARNING" in
    codex:*) echo "ABORT: $AUTH_WARNING"; exit 1 ;;
  esac
  # Spark has separate quota and is allowed in the episode; the codex-reset watcher
  # restores astra at the confirmed reset. Default stays OpenCode (Codex-free).
  echo "runner=$RUNNER model=$([ "$RUNNER" = codex ] && echo "$CODEX_MODEL" || echo "$OPENCODE_MODEL") openrouter_key=$([ -n "${OPENROUTER_API_KEY:-}" ] && echo present || echo MISSING)"
  if [ "$RUNNER" = "codex" ]; then
    timeout 21600 codex exec --dangerously-bypass-approvals-and-sandbox \
      -m "$CODEX_MODEL" -c model_reasoning_effort="xhigh" -c tools.web_search=true \
      -C "$REPO" "$PROMPT"
  else
    # --auto is the documented flag for approving non-denied permissions.
    # (There is no --permission flag in this opencode version; passing one made
    # opencode print its help and exit rc=1, which stalled phase 09 for hours.)
    # Fail fast and honestly if the OpenRouter credential did not survive the
    # environment: opencode otherwise reports a bare "UnknownError" and we would
    # burn retries on a credential problem instead of seeing it.
    if [ -z "${OPENROUTER_API_KEY:-}" ]; then
      echo "ABORT: OPENROUTER_API_KEY is empty in the runner environment"
      echo "BLOCKED: OPENROUTER_API_KEY missing in runner environment" > "$STATE/phase-$NN.status"
      exit 1
    fi
    OPENROUTER_API_KEY="$OPENROUTER_API_KEY" timeout 21600 opencode run --model "$OPENCODE_MODEL" \
      --agent build --auto \
      --dir "$REPO" "$PROMPT"
  fi
  rc=$?
  echo "=== phase $NN end rc=$rc $(date -u +%FT%TZ) ==="
  if [ $rc -ne 0 ] && ! grep -q '^DONE' "$STATE/phase-$NN.status" 2>/dev/null; then
    echo "CRASHED rc=$rc $(date -u +%FT%TZ)" > "$STATE/phase-$NN.status"
  fi
  # Selbstheilung: Phase 09 hat den Status am 11.09. trotz fertiger Arbeit auf
  # RUNNING gelassen ("runner-managed"), worauf der Tick den Lauf neu startete und
  # Versuche verbrannte. Wenn der Agent sauber endet (rc=0) und in diesem Lauf
  # tatsaechlich Belege entstanden sind, setzt der Runner DONE. Das Qualitaetstor
  # (Nachtwache, watch.sh --gate) prueft danach unabhaengig, ob DONE berechtigt ist.
  status_now=$(head -1 "$STATE/phase-$NN.status" 2>/dev/null)
  case "$status_now" in
    DONE*|BLOCKED*) ;;
    *)
      if [ $rc -eq 0 ]; then
        report_new=$(find "$REPO/ops/rebuild-2026-09/REPORT.md" -newermt "@$T0" 2>/dev/null | wc -l | tr -d ' ')
        evid_root="$REPO/ops/rebuild-2026-09/evidence/phase-$NN"
        evid_new=$(find "$evid_root" -type f -newermt "@$T0" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$report_new" -gt 0 ] && [ "$evid_new" -ge 1 ]; then
          echo "DONE (runner-erkannt: rc=0, Bericht und $evid_new Evidence-Datei(en) neu; Agent liess den Status offen)" > "$STATE/phase-$NN.status"
          echo "runner: Status auf DONE gesetzt (Agent liess ihn offen)"
        else
          echo "runner: rc=0, aber keine neuen Belege (report_new=$report_new evid_new=$evid_new) — Status bleibt, Tick entscheidet"
        fi
      fi;;
  esac
} >> "$LOG" 2>&1

# Keep logs bounded — the disk on Sandy is at ~90%.
find "$LOGS" -name 'phase-*.log' -size +50M -exec truncate -s 20M {} \;
tail -c 2000 "$LOG"
