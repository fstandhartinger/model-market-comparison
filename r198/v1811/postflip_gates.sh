#!/bin/bash
set -euo pipefail
W=$PWD
J=r198/v1811
R=$J/receipts
export NODE_OPTIONS=--max-old-space-size=6144
TESTS=(test/jevbench-v1811-*.test.mjs test/cr-257-v1811-min-samples.test.mjs test/jevbench-v1810-*.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v170-release.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-alldata-fetch.test.mjs test/cr-257-category-radars.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs test/sitemap-releases-redirects.test.mjs test/cr-205-jev-page-structure.test.mjs)
python3 -B "$J/make_passtree_v1811.py" ${RESUME_COPY:+--resume} > "$R/simulation.log"
P=$W/$J/.pass
cd "$P"
python3 -B "$J/add_topics_exception_v1811.py" >> "$W/$R/simulation.log"
NEXT_PHASE=phase-production-build node scripts/build-jevbench-v1811-alldata.mjs > "$W/$R/alldata-pass.log" 2>&1
exec bash "$W/$J/verify_pass.sh" "$W"
