#!/bin/bash
set -euo pipefail
R=r198/v1813/receipts
export NODE_OPTIONS=--max-old-space-size=6144 NEXT_PHASE=phase-production-build
node r198/v1813/validate_v1813.mjs > "$R/validator.log" 2>&1
set +e
N30_BASELINE=1 node --test test/cr-257-v1813-min-samples.test.mjs > "$R/n30-red.log" 2>&1
red=$?
set -e
[ "$red" = 1 ] || { echo "expected red exit 1, got $red"; exit 1; }
node --test test/cr-257-v1813-min-samples.test.mjs > "$R/n30-green.log" 2>&1
node scripts/build-jevbench-v1813-alldata.mjs > "$R/alldata.log" 2>&1
npx --no-install tsc --noEmit > "$R/tsc.log" 2>&1
node --test --test-concurrency=2 test/jevbench-v1813-release.test.mjs test/jevbench-v1812-release.test.mjs test/cr-257-category-radars.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs > "$R/precheck-tests.log" 2>&1
echo PASS
