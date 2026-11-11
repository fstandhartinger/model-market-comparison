#!/bin/bash
set -euo pipefail
LOG=$1
J=r198/v189
# The outer heavy unit owns the whole run. timeout bounds this known child to the required 2,400 seconds.
timeout 2400 npm run build > "$LOG" 2>&1 &
BUILD_CHILD=$!
CLEANED=0
while kill -0 "$BUILD_CHILD" 2>/dev/null; do
  if [[ "$CLEANED" = 0 ]] && grep -q 'Collecting page data' "$LOG"; then
    python3 -B "$J/clear_owned_webpack_cache.py" > r198/v189/receipts/webpack-cache-cleanup.log
    CLEANED=1
  fi
  sleep 2
done
wait "$BUILD_CHILD"
