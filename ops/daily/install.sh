#!/usr/bin/env bash
# Idempotent runtime synchronization; the existing cron keeps working.
set -euo pipefail
if [[ $(id -u) != 0 ]]; then exec sudo -n bash "$(readlink -f "$0")" "$@"; fi
cd "$(dirname "$0")/../.."
BH_DAILY_HOME=/opt/benchmarkheaven-daily
BH_LEGACY_HOME=/opt/mmc-daily
if [[ ! -e "$BH_DAILY_HOME" && -d "$BH_LEGACY_HOME" && ! -L "$BH_LEGACY_HOME" ]]; then mv "$BH_LEGACY_HOME" "$BH_DAILY_HOME"; fi
mkdir -p "$BH_DAILY_HOME/state" "$BH_DAILY_HOME/runs"
if [[ -e "$BH_LEGACY_HOME" && ! -L "$BH_LEGACY_HOME" ]]; then echo 'Refusing to replace an independent legacy directory'; exit 1; fi
if [[ -L "$BH_LEGACY_HOME" && $(readlink -f "$BH_LEGACY_HOME") != "$BH_DAILY_HOME" ]]; then echo 'Legacy symlink points elsewhere'; exit 1; fi
if [[ ! -e "$BH_LEGACY_HOME" ]]; then ln -s "$BH_DAILY_HOME" "$BH_LEGACY_HOME"; fi
for state_file in top5-state.json failure-alert.stamp; do
  if [[ -f "$BH_DAILY_HOME/$state_file" && ! -e "$BH_DAILY_HOME/state/$state_file" ]]; then cp -p "$BH_DAILY_HOME/$state_file" "$BH_DAILY_HOME/state/$state_file"; fi
done
for script in run.sh prompt.md README.md; do
  install -m 644 "ops/daily/$script" "$BH_DAILY_HOME/$script.new"
  mv "$BH_DAILY_HOME/$script.new" "$BH_DAILY_HOME/$script"
done
chmod 755 "$BH_DAILY_HOME/run.sh"
chown -R flori:flori "$BH_DAILY_HOME"
printf 'Runtime synchronized: %s (legacy symlink %s); cron schedule unchanged.\n' "$BH_DAILY_HOME" "$BH_LEGACY_HOME"
