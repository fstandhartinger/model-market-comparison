#!/bin/bash
# Daily Benchmark Heaven refresh driven by Codex CLI (headless). Cron-safe:
# loads secrets itself, runs fully non-interactive, no windows, logs to cron.log.
set -u
# The root cron delegates to the subscription-authenticated account before loading secrets.
if [ "$(id -u)" = 0 ]; then exec runuser -u flori -- bash "$0"; fi
LOG=/opt/mmc-daily/cron.log
exec >> "$LOG" 2>&1
echo "=== $(date -u '+%F %T') UTC start ==="
for f in "$HOME/.config/dev-secrets.env" /root/.config/dev-secrets.env; do
  [ -r "$f" ] && . "$f" && break
done
[ -f /etc/profile.d/telegram.sh ] && . /etc/profile.d/telegram.sh
export ARTIFICIAL_ANALYSIS_API_KEY="${ARTIFICIAL_ANALYSIS_API_KEY:-${ARTIF_ANALYSIS_API_KEY:-}}"
export RENDER_API_KEY TG_BOT_TOKEN TG_CHAT_ID
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
# Codex must bill against the ChatGPT Pro subscription, not an API key.
unset OPENAI_API_KEY OPENAI_BASE_URL
case "$(codex login status 2>&1 | head -1)" in
  *ChatGPT*) : ;;
  *) echo "ABORT: codex not on ChatGPT subscription"; exit 1 ;;
esac
cd /opt/model-market-comparison || exit 1
AUTH="$(codex login status 2>&1)"
case "$AUTH" in
  *ChatGPT*) ;;
  *) printf 'STATUS: problem\nCodex auth is not ChatGPT; refusing API billing.\n' > /opt/mmc-daily/last-summary.txt; exit 1 ;;
esac
timeout 45m codex exec -m gpt-5.6-sol --dangerously-bypass-approvals-and-sandbox -C /opt/model-market-comparison "$(cat /opt/mmc-daily/prompt.md)"
rc=$?
echo "=== $(date -u '+%F %T') UTC end rc=$rc ==="
# --- Notification policy: quiet by default. Telegram only when
#  (a) a new family enters the top 5 by Composite (state in top5-state.json), or
#  (b) the refresh failed — at most once per 7 days (failure-alert.stamp).
python3 - "$rc" << 'PY'
import os, sys, json, subprocess, time, urllib.request
rc = int(sys.argv[1]); D = '/opt/mmc-daily'
def tg(text):
    t, c = os.environ.get('TG_BOT_TOKEN'), os.environ.get('TG_CHAT_ID')
    if not (t and c): return
    req = urllib.request.Request(f'https://api.telegram.org/bot{t}/sendMessage', data=json.dumps({'chat_id': c, 'text': text}).encode(), headers={'Content-Type': 'application/json'})
    urllib.request.urlopen(req, timeout=30).read()
summary = open(f'{D}/last-summary.txt').read().strip() if os.path.exists(f'{D}/last-summary.txt') else ''
problem = rc != 0 or not summary.startswith('STATUS: ok')
# (a) top-5 entrants
try:
    top = json.loads(subprocess.check_output(['node', 'scripts/top5.mjs', '5'], cwd='/opt/model-market-comparison', timeout=120))
    sp = f'{D}/top5-state.json'
    prev = json.load(open(sp)) if os.path.exists(sp) else None
    if prev is not None:
        old = {r['family_key'] for r in prev}
        new = [r for r in top if r['family_key'] not in old]
        if new:
            lines = [f"🏆 Benchmark Heaven: Neu in den Top 5 (Composite): " + ", ".join(f"{r['name']} ({r['composite']})" for r in new), ""]
            lines += [f"{i+1}. {r['name']} — {r['composite']}" for i, r in enumerate(top)]
            lines.append("https://benchmarkheaven.com")
            tg("\n".join(lines)); print('telegram: top5 entrant sent')
        else: print('top5 unchanged: ' + ', '.join(r['family_key'] for r in top))
    else: print('top5 state initialised')
    json.dump(top, open(sp, 'w'), indent=1)
except Exception as e:
    print('top5 check failed:', e); problem = True
# (b) rate-limited failure alert
if problem:
    st = f'{D}/failure-alert.stamp'
    last = os.path.getmtime(st) if os.path.exists(st) else 0
    if time.time() - last > 7 * 86400:
        tg(f"⚠️ Benchmark Heaven Daily-Refresh (Sandy) hat Probleme (rc={rc}). Nächste Warnung frühestens in 7 Tagen. Log: /opt/mmc-daily/cron.log\n\n{summary[:1500]}")
        open(st, 'w').close(); print('telegram: failure alert sent')
    else: print('failure alert suppressed (rate limit)')
PY
# keep log bounded (~2MB)
if [ "$(stat -c%s "$LOG")" -gt 2000000 ]; then
  tail -c 1000000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
exit "$rc"
