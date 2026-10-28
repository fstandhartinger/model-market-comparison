#!/bin/bash
# Production build in the simulated post-flip state (synthetic PASS files from .pass; no authority), then restore.
set -uo pipefail
source "$(dirname "$0")/postflip_common_v1715.sh"; LOG="$J/receipts/build-postflip.log"; trap restore EXIT
~/bin/suite-slot --max-wait 1800 -- timeout 2400 ~/bin/heavy npm run build > "$LOG" 2>&1; rc=$?
echo "{\"exit_code\":$rc,\"command\":\"suite-slot npm run build (simulated post-flip state)\"}" > "$J/receipts/BUILD-POSTFLIP-EXIT.json"
if [ $rc -eq 0 ]; then node "$J/check_built_links_v1715.mjs" >> "$LOG" 2>&1 || { echo "built-route check failed" >> "$LOG"; rc=5; }; fi
echo "postflip build rc $rc"; exit $rc
