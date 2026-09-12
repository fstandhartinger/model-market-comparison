#!/usr/bin/env bash
# Operator escalation, never invoked by cron or a cheap worker.
set -euo pipefail
[[ ${1:-} = --operator ]] || { echo 'Usage: bash ops/daily/escalate.sh --operator'; exit 2; }
[[ $(id -un) = flori ]] || { echo 'Escalation must use the subscription-authenticated flori account'; exit 1; }
unset OPENAI_API_KEY OPENAI_BASE_URL OPENAI_API_BASE CODEX_API_KEY
case "$(codex login status 2>&1)" in *ChatGPT*) ;; *) echo 'ABORT: Codex is not on ChatGPT subscription auth'; exit 1;; esac
BH_DAILY_HOME=${BH_DAILY_HOME:-/opt/benchmarkheaven-daily}
[[ -s "$BH_DAILY_HOME/state/escalation-request.json" ]] || { echo 'No repeated-failure escalation is pending'; exit 1; }
cd /opt/model-market-comparison
exec codex exec -m gpt-5.6-luna -c 'model_reasoning_effort="xhigh"' --dangerously-bypass-approvals-and-sandbox 'Investigate the repeated Benchmark Heaven daily failures under /opt/benchmarkheaven-daily. Read ops/daily/README.md and the latest run report. Preserve the last good snapshot. Never weaken AA>=34, source evidence, different-family review or subscription authentication. Repair and test the smallest verified cause. Follow repository gauntlet and commit requirements. Do not change schedules or publish unsupported data.' < /dev/null
