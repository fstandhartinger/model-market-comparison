#!/bin/bash
# Post-flip simulation: release, merged-board, roster and breakdown suites with v1.7.16 synthetic PASS, then restore byte-equal.
set -uo pipefail
source "$(dirname "$0")/postflip_common_v1716.sh"; LOG="$J/receipts/postflip-tests.log"; trap restore EXIT
~/bin/suite-slot --max-wait 1800 -- timeout 1500 ~/bin/heavy node --test --test-concurrency=2 test/jevbench-v1716-release.test.mjs test/jevbench-v1715-release.test.mjs test/jevbench-v1714-release.test.mjs test/jevbench-v1712-release.test.mjs test/jevbench-merged-board.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/cr-303-feed-split.test.mjs test/sitemap-releases-redirects.test.mjs test/jevbench-v163-fresh-source.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs > "$LOG" 2>&1; rc=$?
echo "postflip tests rc $rc"; grep -E "^# (tests|pass|fail)" "$LOG"; exit $rc
