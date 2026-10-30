#!/bin/bash
# Lead (run 201): release suites on the REAL flipped manifest (review PASS, approval bound to card 18950). No builds, no seals.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Disposable heavy snapshot required';exit 3; }
W=$PWD;J=r198/v180;R=$J/receipts/postflip-real
mkdir -p "$R"
npm ci --ignore-scripts > "$R/npm-ci.log" 2>&1
node "$J/validate_v180.mjs" > "$R/validator.log" 2>&1
node "$J/check_alldata_v180.mjs" > "$R/alldata.log" 2>&1
npx --no-install tsc --noEmit > "$R/tsc.log" 2>&1
TESTS=(test/jevbench-v180-release.test.mjs test/jevbench-v1723-release.test.mjs test/jevbench-v1722-release.test.mjs test/jevbench-v1721-release.test.mjs test/jevbench-v1720-release.test.mjs test/jevbench-v1719-release.test.mjs test/jevbench-v1718-release.test.mjs test/jevbench-v1717-release.test.mjs test/jevbench-v1716-release.test.mjs test/jevbench-v1715-release.test.mjs test/jevbench-v1714-release.test.mjs test/jevbench-v1713-release.test.mjs test/jevbench-v1712-release.test.mjs test/cr-303-feed-split.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/jevbench-merged-board.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs test/sitemap-releases-redirects.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs test/jevbench-alldata-fetch.test.mjs test/jevbench-v163-fresh-source.test.mjs)
A=();for f in "${TESTS[@]}";do [[ -f $f ]] && A+=("$f");done
node --test --test-concurrency=2 "${A[@]}" > "$R/suites.log" 2>&1
printf '%s\n' '{"status":"PASS"}' > "$R/POSTFLIP-REAL.json"
rm -rf .next tsconfig.tsbuildinfo
