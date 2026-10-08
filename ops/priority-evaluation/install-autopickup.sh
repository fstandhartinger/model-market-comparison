#!/usr/bin/env bash
# Install the fast-lane autopickup from a checkout of merged origin/main.
# Usage: install-autopickup.sh [--enable]
#   Without --enable: copy files, record the cutover and reload systemd (nothing runs).
#   With --enable:    additionally verify the units, enable/start both timers and register them in
#                     ~/.agent-desired-state.json.
# The cutover (only orders whose signed payment webhook arrives after it are picked up) is
# written once and never moved by a reinstall.
set -Eeuo pipefail

ENABLE=0
if [[ "${1:-}" == "--enable" ]]; then ENABLE=1; elif [[ $# -gt 0 ]]; then
  echo "usage: install-autopickup.sh [--enable]" >&2; exit 64
fi

SRC="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SRC" rev-parse --show-toplevel)"
# Read-only check (no fetch): the checkout may be the Coolify deploy tree.
HEAD_SHA="$(git -C "$REPO_ROOT" rev-parse HEAD)"
MAIN_SHA="$(git -C "$REPO_ROOT" ls-remote origin refs/heads/main | cut -f1)"
if [[ "$HEAD_SHA" != "$MAIN_SHA" ]]; then
  echo "install-autopickup: checkout is at $HEAD_SHA, not merged origin/main $MAIN_SHA" >&2; exit 1
fi
if [[ -n "$(git -C "$REPO_ROOT" status --porcelain -- ops/priority-evaluation)" ]]; then
  echo "install-autopickup: ops/priority-evaluation has uncommitted changes" >&2; exit 1
fi

BIN="$HOME/bin"
SHARE="$HOME/.local/share/priority-evaluation"
STATE="$HOME/.local/state/fastlane-autopickup"
UNITS="$HOME/.config/systemd/user"
install -d -m 700 "$SHARE" "$STATE" "$STATE/requests" "$HOME/jobs/fastlane-evaluations"
REPLY_GUARD="$HOME/jobs/fastlane-refusal-reply-guard-20260929"
install -d -m 700 "$REPLY_GUARD"
install -m 600 "$SRC/refusal-reply-prompt-template.md" "$REPLY_GUARD/PROMPT.md"
install -d -m 700 "$SHARE/runtime" "$HOME/wt" "$HOME/.local/state/bh" \
  "$HOME/.local/state/telegram-reply-broker/callback-status.d"
for f in autopickup.py hf_git_credential.py refusal_approval.py refund_approval.py sla_decision.py pod_runner.py execution_source.py source_metadata.py native_admission.py PREP-OPEN-WEIGHTS-PROMPT.txt official_scoring.py official_score.py official-profiles.json release_render.py host_github.py public_artifacts.py measurement_dispatch.py measurement_driver.py measurement-profiles.json static_agent.py MEASUREMENT-CONTRACT.md METHOD-v1.5-ADDENDUM-PRICING.md METHOD-v1.5-ADDENDUM-PRICING-INTERPRETATION-1.md; do
  install -m 600 "$SRC/$f" "$SHARE/runtime/$f"
done
install -d -m 700 "$SHARE/runtime/pod_drivers"
for f in pod_driver.py pod_entry.sh pod_order_driver.py native_image.py aplomb_loader.py scored_marker.py; do
  install -m 600 "$SRC/pod_drivers/$f" "$SHARE/runtime/pod_drivers/$f"
done
python3 - "$SHARE/runtime" <<'VERIFY_PROFILES'
import sys
sys.path.insert(0, sys.argv[1])
import official_scoring
for benchmark in ('jevbench', 'imagejevbench'):
    official_scoring.profile(benchmark)
print('Official scorer/reference pins verified')
VERIFY_PROFILES
# Apply the repository's idempotent schema before either worker can see new columns.
psql -X -q --single-transaction -v ON_ERROR_STOP=1 -d benchmarkheaven_accounts -f "$REPO_ROOT/db/accounts/001_init.sql" >/dev/null
install -m 700 "$SRC/worker.py" "$BIN/jevbench-priority-worker.py"
ln -sfn "$SHARE/runtime/autopickup.py" "$BIN/jevbench-autopickup.py"
install -m 644 "$SRC/jevbench-priority-worker.service" "$UNITS/jevbench-priority-worker.service"
install -m 644 "$SRC/jevbench-priority-worker.timer" "$UNITS/jevbench-priority-worker.timer"
install -m 755 "$SRC/jevbench-autopickup" "$BIN/jevbench-autopickup"
# Tracked mail watcher: keep the previous copy for rollback, install mode 0700, prove the binding by hash.
WATCH="$BIN/jevbench-priority-mail-watch.py"
if [ -f "$WATCH" ] && ! cmp -s "$SRC/jevbench-priority-mail-watch.py" "$WATCH"; then
  install -m 600 "$WATCH" "$WATCH.rollback-$(date -u +%Y%m%dT%H%M%SZ)"
fi
install -m 700 "$SRC/jevbench-priority-mail-watch.py" "$WATCH"
[ "$(sha256sum < "$SRC/jevbench-priority-mail-watch.py")" = "$(sha256sum < "$WATCH")" ] \
  || { echo "mail watcher install binding mismatch" >&2; exit 1; }
for f in autopickup-prompt-template.md autopickup-review-prompt-template.md autopickup-confirmation-template.txt \
         autopickup-result-public-template.txt autopickup-result-private-template.txt autopickup-refund-template.txt autopickup-refusal-template.txt autopickup-review-passed-template.txt autopickup-change-request-template.txt autopickup-delay-template.txt; do
  install -m 600 "$SRC/$f" "$SHARE/$f"
done
for u in jevbench-priority-autopickup.service jevbench-priority-autopickup.timer \
         jevbench-priority-autopickup-health.service jevbench-priority-autopickup-health.timer \
         jevbench-priority-autopickup-evaluation@.service jevbench-priority-autopickup-xpost@.service; do
  install -m 644 "$SRC/$u" "$UNITS/$u"
done

python3 - "$STATE/config.json" "$HEAD_SHA" <<'PY'
import json, os, sys, tempfile
from datetime import datetime, timezone
path, sha = sys.argv[1], sys.argv[2]
try:
    config = json.load(open(path, encoding="utf-8"))
except FileNotFoundError:
    config = {}
config.setdefault("cutover", datetime.now(timezone.utc).isoformat(timespec="seconds"))
config["installed_revision"] = sha
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path))
with os.fdopen(fd, "w") as handle:
    json.dump(config, handle, indent=2)
    handle.write("\n")
os.chmod(tmp, 0o600)
os.replace(tmp, path)
print("cutover:", config["cutover"])
PY

register_desired_state() {
python3 - "$HOME/.agent-desired-state.json" "$HEAD_SHA" <<'PY'
import json, os, shutil, sys, tempfile
from datetime import datetime, timezone
path, sha = sys.argv[1], sys.argv[2]
state = json.load(open(path, encoding="utf-8"))
now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
state.setdefault("jobs", {})["fastlane-autopickup"] = {
    "want": True,
    "why": ("Florian 29 Sep 2026: new paid fast-lane orders run fully autonomously (payment time, "
            "confirmation, owner handoff, evaluation, PR + bh-merge-queue release, result mail, "
            "@airesearch12 post only on a top-five change). 5-minute pickup + 4 daily sweeps; "
            "24/36 h alerts; at 48 h a refund decision card for Florian (no automatic refund). Kill switch: "
            "~/.local/state/fastlane-autopickup/KILL."),
    "unit": "jevbench-priority-autopickup.timer + jevbench-priority-autopickup-health.timer",
    "cwd": os.path.expanduser("~/jobs/fastlane-evaluations"),
    "source": f"model-market-comparison ops/priority-evaluation @ {sha}",
    "changed_at": now,
}
state["_changed"] = now
shutil.copy2(path, path + ".bak-fastlane-autopickup")
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path))
with os.fdopen(fd, "w", encoding="utf-8") as handle:
    json.dump(state, handle, indent=1, ensure_ascii=False)
    handle.write("\n")
os.chmod(tmp, os.stat(path).st_mode & 0o777)
os.replace(tmp, path)
print("desired state: fastlane-autopickup registered")
PY
}

systemctl --user daemon-reload
if [[ "$ENABLE" == 1 ]]; then
  systemd-analyze --user verify "$UNITS/jevbench-priority-autopickup.service" \
    "$UNITS/jevbench-priority-autopickup-health.service" "$UNITS/jevbench-priority-autopickup.timer" \
    "$UNITS/jevbench-priority-autopickup-health.timer"
  systemctl --user enable --now jevbench-priority-worker.timer jevbench-priority-mail-watcher.timer \
    jevbench-priority-autopickup.timer jevbench-priority-autopickup-health.timer
  register_desired_state
  systemctl --user list-timers 'jevbench-priority-autopickup*' --no-pager
else
  echo "Installed but not enabled. Rerun with --enable after review and merge."
fi
