#!/usr/bin/env bash
# Install the /submit intake bridge (user units, CLI symlink). Run by the lead AFTER the PR is merged and the site
# schema (bh_model_submissions) is deployed. Idempotent. Does not generate the key pair (see README: keygen).
set -Eeuo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
SHARE="$HOME/.local/share/bh-submissions"
UNITS="$HOME/.config/systemd/user"
install -d -m 700 "$SHARE" "$HOME/.local/state/bh-submissions" "$HOME/.locks" "$HOME/bin"
install -d -m 755 "$UNITS"
for f in submissions_lib.py intake_bridge.py bh-submission submission-confirmation-template.txt; do
  install -m 755 "$SRC/$f" "$SHARE/$f"
done
ln -sfn "$SHARE/bh-submission" "$HOME/bin/bh-submission"
install -m 644 "$SRC/bh-submission-intake.service" "$SRC/bh-submission-intake.timer" "$UNITS/"
systemctl --user daemon-reload
systemctl --user enable --now bh-submission-intake.timer
systemctl --user list-timers bh-submission-intake.timer --no-pager || true
echo "installed. Next: bh-submission keygen (once) and put the printed public PEM into the site env SUBMISSION_SECRET_PUBLIC_KEY."
