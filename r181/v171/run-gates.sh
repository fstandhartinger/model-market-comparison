#!/bin/bash
# Reproducible candidate gates; never modifies the real review status.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
WT=${WT:-$(cd "$J/../.." && pwd)}
export WT
mkdir -p "$J/receipts"
if [ "${1:-all}" = all ]; then
 python3 "$J/check_repro_v171.py" > "$J/receipts/repro.log" 2>&1
 python3 "$J/final_sanity_v171.py" > "$J/receipts/final-sanity.log" 2>&1
 (cd "$WT" && timeout 180 ~/bin/heavy node --test test/jevbench-v171-release.test.mjs) > "$J/receipts/release-tests.log" 2>&1
 (cd "$WT" && timeout 180 ~/bin/heavy npx tsc --noEmit) > "$J/receipts/tsc.log" 2>&1
fi
(cd "$WT" && timeout 1800 ~/bin/heavy npm run build) > "$J/receipts/build.log" 2>&1
if [ "${1:-all}" = all ]; then
 (cd "$WT" && timeout 1800 ~/bin/heavy npm test) > "$J/receipts/fulltest.log" 2>&1
fi
