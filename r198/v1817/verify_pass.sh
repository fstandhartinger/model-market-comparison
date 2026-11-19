#!/bin/bash
set -euo pipefail
W=$(realpath "$1")
J=r198/v1817
R=$J/receipts
export NODE_OPTIONS=--max-old-space-size=6144
TESTS=(test/jevbench-v1817-*.test.mjs test/cr-257-v1817-min-samples.test.mjs test/jevbench-v1816-*.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v170-release.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-alldata-fetch.test.mjs test/cr-257-category-radars.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs test/sitemap-releases-redirects.test.mjs test/cr-205-jev-page-structure.test.mjs)
cd "$W/$J/.pass"
node --test --test-concurrency=4 "${TESTS[@]}" > "$W/$R/postflip-tests.log" 2>&1
unset NEXT_PHASE
export NEXT_BUILD_CPUS=4
set +e
timeout 2400 npm run build > "$W/$R/build.log" 2>&1
rc=$?
set -e
echo "$rc" > "$W/$R/build.exit"
[ "$rc" = 0 ] || exit "$rc"
node "$J/check_built_v1817.mjs" > "$W/$R/built-check.log" 2>&1
cp "$R/BUILT-CHECK.json" "$W/$R/BUILT-CHECK.json"
set +e
node --test --test-concurrency=4 test/ > "$W/$R/full-suite.log" 2>&1
rc=$?
set -e
echo "$rc" > "$W/$R/full-suite.exit"
[ "$rc" = 0 ] || exit "$rc"
echo PASS full production build and full suite
