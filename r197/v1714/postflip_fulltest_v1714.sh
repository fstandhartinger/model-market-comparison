#!/bin/bash
# Full test suite once in the simulated post-flip state (synthetic PASS files from .pass; no authority), then restore.
set -uo pipefail
source "$(dirname "$0")/postflip_common_v1714.sh"; LOG="$J/receipts/fulltest-postflip.log"; trap restore EXIT
~/bin/suite-slot --max-wait 1800 -- timeout 5400 ~/bin/heavy npm test > "$LOG" 2>&1; rc=$?
echo "{\"exit_code\":$rc,\"command\":\"suite-slot npm test (simulated post-flip state, .next from the post-flip build)\"}" > "$J/receipts/FULLTEST-POSTFLIP-EXIT.json"
echo "postflip full test rc $rc"; grep -E "^# (tests|pass|fail)" "$LOG"; exit $rc
