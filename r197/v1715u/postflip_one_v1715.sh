#!/bin/bash
# Re-run named test files once in the simulated post-flip state (synthetic PASS; no authority), then restore byte-equal.
# usage: postflip_one_v1715.sh <log-name> <test files...>
set -uo pipefail
N=$1; shift
source "$(dirname "$0")/postflip_common_v1715.sh"; LOG="$J/receipts/$N"; trap restore EXIT
~/bin/suite-slot --max-wait 1800 -- timeout 900 ~/bin/heavy node --test "$@" > "$LOG" 2>&1; rc=$?
echo "rc $rc"; grep -E "^# (tests|pass|fail|cancelled)" "$LOG"; exit $rc
