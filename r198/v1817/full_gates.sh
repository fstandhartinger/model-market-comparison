#!/bin/bash
set -euo pipefail
W=$PWD
J=r198/v1817
R=$J/receipts
export PATH=/usr/bin:/bin:$PATH
export NODE_OPTIONS=--max-old-space-size=6144
if [ ! -x node_modules/.bin/tsc ]; then npm ci --ignore-scripts --no-audit --no-fund > "$R/npm-ci.log" 2>&1; fi
node "$J/validate_v1817.mjs" > "$R/validator-final.log" 2>&1
NEXT_PHASE=phase-production-build node scripts/build-jevbench-v1817-alldata.mjs > "$R/alldata-final.log" 2>&1
set +e
N30_BASELINE=1 node --test test/cr-257-v1817-min-samples.test.mjs > "$R/n30-red-final.log" 2>&1
red=$?
set -e
[ "$red" = 1 ]
node --test test/cr-257-v1817-min-samples.test.mjs > "$R/n30-green-final.log" 2>&1
node node_modules/typescript/bin/tsc --noEmit > "$R/tsc-final.log" 2>&1
TESTS=(test/jevbench-v1817-*.test.mjs test/cr-257-v1817-min-samples.test.mjs test/jevbench-v1816-*.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v170-release.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-alldata-fetch.test.mjs test/cr-257-category-radars.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs test/sitemap-releases-redirects.test.mjs test/cr-205-jev-page-structure.test.mjs)
node --test --test-concurrency=4 "${TESTS[@]}" > "$R/pending-tests.log" 2>&1
exec bash "$J/postflip_gates.sh"
