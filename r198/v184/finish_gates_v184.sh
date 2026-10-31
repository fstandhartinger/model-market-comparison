#!/bin/bash
set -euo pipefail
W=$PWD;J=r198/v184;R=$J/receipts
[[ -d node_modules/next ]] || npm ci --ignore-scripts > "$R/npm-ci.log" 2>&1
python3 -B "$J/make_passtree_v184.py" > "$R/fixture.log" 2>&1
TESTS=(test/jevbench-tariff-label.test.mjs test/jevbench-v184-release.test.mjs test/jevbench-v183-release.test.mjs test/jevbench-v182-release.test.mjs test/jevbench-v181-release.test.mjs test/cr-254-base-model-display.test.mjs test/jevbench-v180-release.test.mjs test/jevbench-v1723-release.test.mjs test/jevbench-v1722-release.test.mjs test/jevbench-v1721-release.test.mjs test/jevbench-v1720-release.test.mjs test/jevbench-v1719-release.test.mjs test/jevbench-v1718-release.test.mjs test/jevbench-v1717-release.test.mjs test/jevbench-v1716-release.test.mjs test/jevbench-v1715-release.test.mjs test/jevbench-v1714-release.test.mjs test/jevbench-v1713-release.test.mjs test/jevbench-v1712-release.test.mjs test/cr-303-feed-split.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/jevbench-merged-board.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs test/sitemap-releases-redirects.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs test/jevbench-alldata-fetch.test.mjs)
# Both the PENDING and isolated synthetic PASS suites must pass.
node --test --test-concurrency=4 "${TESTS[@]}" > "$R/release-tests.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/PENDING-EXIT.json"
python3 -B "$J/make_passtree_v184.py" >> "$R/fixture.log" 2>&1
cd "$J/.pass"
node --test --test-concurrency=4 "${TESTS[@]}" > "$W/$R/postflip-tests.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$W/$R/POSTFLIP-EXIT.json"
node "$J/validate_v184.mjs" > "$W/$R/validator-pass.log" 2>&1
python3 -B "$J/freeze_v184.py" --wt "$PWD" --output "$PWD/$R/FREEZE-SYNTHETIC.json" > "$W/$R/freeze-synthetic.log" 2>&1
cp "$R/FREEZE-SYNTHETIC.json" "$W/$R/FREEZE-SYNTHETIC.json"
npm run build > "$W/$R/build-postflip.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$W/$R/BUILD-POSTFLIP-EXIT.json"
node "$J/check_built_v184.mjs" > "$W/$R/built-check.log" 2>&1
cp "$R/BUILT-LINKS.json" "$W/$R/BUILT-LINKS.json"
python3 -B "$J/check_archive_kickers.py" > "$W/$R/archive-kickers.log" 2>&1
cp "$R/ARCHIVE-KICKERS.json" "$W/$R/ARCHIVE-KICKERS.json"
python3 -B "$J/browser_v184.py" > "$W/$R/browser-preflight.log" 2>&1
python3 -B "$J/capture_v184.py" --out "$W/$J/preview" > "$W/$R/capture.log" 2>&1
cd "$W"
rm -rf "$J/.pass" .next tsconfig.tsbuildinfo
