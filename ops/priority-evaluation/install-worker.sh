#!/usr/bin/env bash
set -euo pipefail

source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(git -C "$source_dir" rev-parse --show-toplevel)"
if ! git -C "$repo_root" merge-base --is-ancestor HEAD origin/main; then
  printf '%s\n' "Refusing to install: this worktree commit is not merged into origin/main." >&2
  exit 1
fi

bin_dir="$HOME/bin"
share_dir="$HOME/.local/share/priority-evaluation"
unit_dir="$HOME/.config/systemd/user"
install -d -m 700 "$share_dir" "$unit_dir"
install -m 755 "$source_dir/worker.py" "$bin_dir/jevbench-priority-worker.py"
install -m 755 "$source_dir/agent_runner.py" "$bin_dir/jevbench-priority-agent-runner.py"
install -m 755 "$source_dir/gmail_email_access.py" "$bin_dir/jevbench-priority-email.py"
install -m 755 "$source_dir/gmail_imap_watch.py" "$bin_dir/jevbench-priority-mail-watch.py"
install -m 755 "$source_dir/review.py" "$bin_dir/jevbench-review.py"
install -m 755 "$source_dir/approval.py" "$bin_dir/jevbench-priority-approval.py"
install -m 644 "$source_dir/prompt-template.md" "$share_dir/prompt-template.md"
install -m 644 "$source_dir/release-prompt-template.md" "$share_dir/release-prompt-template.md"
install -m 644 "$source_dir/jevbench-priority-worker.service" "$unit_dir/jevbench-priority-worker.service"
install -m 644 "$source_dir/jevbench-priority-worker.timer" "$unit_dir/jevbench-priority-worker.timer"
install -m 644 "$source_dir/jevbench-priority-evaluation@.service" "$unit_dir/jevbench-priority-evaluation@.service"
install -m 644 "$source_dir/jevbench-priority-release@.service" "$unit_dir/jevbench-priority-release@.service"
install -m 644 "$source_dir/fastlane-refusal-approval@.service" "$unit_dir/fastlane-refusal-approval@.service"
install -m 644 "$source_dir/jevbench-priority-mail-watcher.service" "$unit_dir/jevbench-priority-mail-watcher.service"
install -m 644 "$source_dir/jevbench-priority-mail-watcher.timer" "$unit_dir/jevbench-priority-mail-watcher.timer"
systemctl --user daemon-reload
systemctl --user restart jevbench-priority-worker.timer
systemctl --user enable --now jevbench-priority-mail-watcher.timer
systemctl --user is-active --quiet jevbench-priority-worker.timer
systemctl --user is-active --quiet jevbench-priority-mail-watcher.timer
printf '%s\n' "Fast-lane worker, agent templates, mail watcher and refusal-approval watcher installed."
