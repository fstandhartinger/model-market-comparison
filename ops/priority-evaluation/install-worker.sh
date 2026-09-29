#!/usr/bin/env bash
# The single merged-main installer for the worker, isolated autopilot and persistent timers.
set -Eeuo pipefail
exec "$(cd "$(dirname "$0")" && pwd)/install-autopickup.sh" "$@"
