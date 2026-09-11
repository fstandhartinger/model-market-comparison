#!/usr/bin/env bash
# Cron entry: cheap daily workers; Codex is only an operator escalation.
set -euo pipefail
if [[ $(id -u) = 0 ]]; then exec runuser -u flori -- bash "$0" "$@"; fi
BH_DAILY_HOME=${BH_DAILY_HOME:-/opt/benchmarkheaven-daily}
BH_REPO=${BH_REPO:-/opt/model-market-comparison}
mkdir -p "$BH_DAILY_HOME/state" "$BH_DAILY_HOME/runs"
exec 9>"$BH_DAILY_HOME/state/run.lock"
if ! flock -n 9; then echo 'DAILY SKIPPED: another daily transaction owns the lock'; exit 0; fi
exec > >(tee -a "$BH_DAILY_HOME/cron.log") 2>&1
for secrets_file in "$HOME/.config/dev-secrets.env" /root/.config/dev-secrets.env; do
  if [[ -r "$secrets_file" ]]; then set +u; source "$secrets_file"; set -u; break; fi
done
if [[ -r /etc/profile.d/telegram.sh ]]; then set +u; source /etc/profile.d/telegram.sh; set -u; fi
export ARTIFICIAL_ANALYSIS_API_KEY="${ARTIFICIAL_ANALYSIS_API_KEY:-${ARTIF_ANALYSIS_API_KEY:-}}"
export OPEN_ROUTER_API_KEY="${OPEN_ROUTER_API_KEY:-${OPENROUTER_API_KEY:-}}"
export TG_BOT_TOKEN TG_CHAT_ID
export PATH="$HOME/.hermes/node/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
unset OPENAI_API_KEY OPENAI_BASE_URL OPENAI_API_BASE CODEX_API_KEY
started_at=$(date -u +%FT%TZ)
printf 'DAILY START %s\n' "$started_at"
cd "$BH_REPO"
set +e
timeout --signal=TERM --kill-after=30s 3h node ops/daily/daily.mjs --repo "$BH_REPO" --home "$BH_DAILY_HOME" "$@"
result=$?
set -e
if [[ $result != 0 && " $* " != *' --dry-run '* ]]; then
  node ops/daily/notify.mjs --home "$BH_DAILY_HOME" --rc "$result" --fallback --started-at "$started_at" || true
fi
printf 'DAILY END %s rc=%s\n' "$(date -u +%FT%TZ)" "$result"
exit "$result"
