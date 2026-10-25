#!/bin/bash
# Reproducible candidate gates; never modifies the real review status.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
WT=${WT:-$(cd "$J/../.." && pwd)}
export WT
mkdir -p "$J/receipts"
if [ "${1:-all}" = all ]; then
 python3 "$J/check_repro_v172.py" > "$J/receipts/repro.log" 2>&1
 python3 "$J/final_sanity_v172.py" > "$J/receipts/final-sanity.log" 2>&1
 python3 "$J/check_helpers_v172.py" > "$J/receipts/helpers.log" 2>&1
 (cd "$WT" && timeout 600 ~/bin/heavy node --test --test-concurrency=2 test/jevbench-v172-release.test.mjs test/jevbench-v171-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/cr-303-feed-split.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs) > "$J/receipts/release-tests.log" 2>&1
 (cd "$WT" && timeout 600 ~/bin/heavy npx --no-install tsc --noEmit) > "$J/receipts/tsc.log" 2>&1
fi
(cd "$WT" && timeout 1800 ~/bin/heavy npm run build) > "$J/receipts/build.log" 2>&1
if [ "${1:-all}" = all ]; then
 timeout 600 bash "$J/synthetic_gates_v172.sh" > "$J/receipts/synthetic-tests.log" 2>&1
 (cd "$WT" && timeout 1800 ~/bin/heavy npm test) > "$J/receipts/fulltest.log" 2>&1
fi
