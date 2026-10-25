#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
cd "$J/../.."
python3 -B "$J/final_sanity_v171.py" > "$J/receipts/fix-final-sanity.log" 2>&1
node --test test/cr-205-jev-page-structure.test.mjs test/jevbench-v171-release.test.mjs > "$J/receipts/fix-targeted-tests.log" 2>&1
bash "$J/synthetic_gates_v171.sh" > "$J/receipts/fix-synthetic-tests.log" 2>&1
~/bin/heavy npx tsc --noEmit > "$J/receipts/fix-tsc.log" 2>&1
~/bin/heavy npm run build > "$J/receipts/fix-build.log" 2>&1
~/bin/heavy npm test > "$J/receipts/fix-fulltest.log" 2>&1
