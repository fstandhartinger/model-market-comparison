#!/bin/bash
# notify.sh "<text>"  — Telegram to Florian. Quiet-by-default policy applies: only send
# when something is genuinely worth his attention (see master brief §6).
set -u
[ -f /etc/profile.d/telegram.sh ] && . /etc/profile.d/telegram.sh
[ -f /root/.config/dev-secrets.env ] && . /root/.config/dev-secrets.env
python3 - "$1" << 'PY'
import json, os, sys, urllib.request
t, c = os.environ.get("TG_BOT_TOKEN"), os.environ.get("TG_CHAT_ID")
if not (t and c): sys.exit("no telegram credentials")
req = urllib.request.Request(f"https://api.telegram.org/bot{t}/sendMessage",
    data=json.dumps({"chat_id": c, "text": sys.argv[1][:4000]}).encode(),
    headers={"Content-Type": "application/json"})
print("telegram ok:", json.load(urllib.request.urlopen(req, timeout=30))["ok"])
PY
