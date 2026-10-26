#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
WT=${WT:-$(cd "$J/../.." && pwd)}
export WT
python3 -B "$J/check_repro_v176.py" > "$J/receipts/repro.log" 2>&1
(cd "$WT" && node "$J/validate_v176.mjs") > "$J/receipts/validator.log" 2>&1
python3 -B "$J/check_helpers_v176.py" > "$J/receipts/helpers.log" 2>&1
(cd "$WT" && timeout 600 ~/bin/heavy node --test --test-concurrency=2 test/release-page-seo.test.mjs test/jevbench-architecture-data.test.mjs test/jevbench-v176-release.test.mjs test/jevbench-v175-release.test.mjs test/jevbench-v174-release.test.mjs test/jevbench-v173-release.test.mjs test/jevbench-v172-release.test.mjs test/jevbench-v171-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/cr-303-feed-split.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs) > "$J/receipts/release-tests.log" 2>&1
(cd "$WT" && timeout 600 ~/bin/heavy npx --no-install tsc --noEmit) > "$J/receipts/tsc.log" 2>&1
(cd "$WT" && timeout 1800 ~/bin/heavy npm run build) > "$J/receipts/build.log" 2>&1
timeout 600 bash "$J/synthetic_gates_v176.sh" > "$J/receipts/synthetic-tests.log" 2>&1
(cd "$WT" && timeout 1800 ~/bin/heavy npm test) > "$J/receipts/fulltest.log" 2>&1
