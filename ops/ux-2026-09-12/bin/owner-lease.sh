#!/usr/bin/env bash
# Keep the UX workstream visible to owner scanners from its isolated home worktree.
set -Eeuo pipefail
BIN=$(cd "$(dirname "$0")" && pwd)
ROOT=$(git -C "$BIN/../../.." rev-parse --show-toplevel)
STATE=$(printenv BH_UX_STATE 2>/dev/null || true)
if [ -z "$STATE" ]; then STATE=$HOME/.local/state/benchmarkheaven/ux-workstream; fi
FIN=$STATE/finished
LEASE_NAME=bh-ux-workstream-owner-lease
export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$HOME/.opencode/bin:/usr/local/bin:/usr/bin:/bin"

case "$ROOT/" in /opt/*) echo "owner-lease: refusing deploy checkout" >&2; exit 70 ;; esac
case "$STATE/" in /opt/*) echo "owner-lease: state must stay outside /opt" >&2; exit 70 ;; esac
case "$1" in
  ensure)
    [ -f "$FIN" ] && exit 0
    pgrep -f "^$LEASE_NAME( |$)" >/dev/null && exit 0
    setsid nohup bash -c 'cd "$1" || exit 1; exec -a "$2" bash "$3" hold "$4"' \
      owner-lease "$ROOT" "$LEASE_NAME" "$BIN/owner-lease.sh" "$STATE" \
      >/dev/null 2>&1 </dev/null &
    ;;
  hold)
    [ -f "$FIN" ] && exit 0
    while [ ! -f "$FIN" ]; do sleep 60; done
    ;;
  *)
    echo "usage: owner-lease.sh ensure|hold" >&2
    exit 64
    ;;
esac
